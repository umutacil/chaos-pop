import {
  GAME_CATALOG,
  GameEvent,
  GameId,
  PlayerProfile,
  Shooter3DInput,
  Shooter3DPlayerState,
  Shooter3DSnapshot,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface Proj3D {
  id: string;
  ownerId: string;
  team: 'red' | 'blue' | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  r: number;
  fuse: number;
}

const PILLARS = [
  { x: -10, z: -10, w: 3, h: 5, d: 3 },
  { x: 10, z: -10, w: 3, h: 5, d: 3 },
  { x: -10, z: 10, w: 3, h: 5, d: 3 },
  { x: 10, z: 10, w: 3, h: 5, d: 3 },
  { x: 0, z: 0, w: 5, h: 3, d: 5 },
];

export class Shooter3DGame implements BaseGame {
  private mode: GameId;
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, Shooter3DPlayerState> = new Map();
  private inputs: Map<string, Shooter3DInput> = new Map();
  private velocities: Map<string, { vx: number; vy: number; vz: number }> = new Map();
  private projectiles: Proj3D[] = [];
  private teamMode: TeamMode;
  private timeRemaining: number;
  private teamScores = { red: 0, blue: 0 };
  private respawnTimers: Map<string, number> = new Map();
  private botTimers: Map<string, number> = new Map();

  constructor(mode: GameId, ctx: GameInitContext) {
    this.mode = mode;
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const angle = (idx / Math.max(1, ctx.players.length)) * Math.PI * 2;
      this.players.set(p.id, {
        id: p.id,
        x: Math.cos(angle) * 16,
        y: 1.5,
        z: Math.sin(angle) * 16,
        yaw: angle + Math.PI,
        pitch: 0,
        hp: 100,
        alive: true,
        score: 0,
        kills: 0,
        cd: 0,
      });
      this.velocities.set(p.id, { vx: 0, vy: 0, vz: 0 });
      this.inputs.set(p.id, { moveX: 0, moveZ: 0, yaw: 0, pitch: 0, jump: false, shoot: false, dash: false });
      this.botTimers.set(p.id, Math.random() * 0.8);
    });
  }

  handleInput(playerId: string, input: Shooter3DInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      moveZ: Math.max(-1, Math.min(1, Number(input.moveZ) || 0)),
      yaw: Number(input.yaw) || 0,
      pitch: Math.max(-1.4, Math.min(1.4, Number(input.pitch) || 0)),
      jump: Boolean(input.jump),
      shoot: Boolean(input.shoot),
      dash: Boolean(input.dash),
    });
  }

  private updateBotInput(p: Shooter3DPlayerState, dt: number) {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive) return;
    let timer = (this.botTimers.get(p.id) || 0) - dt;

    let nearest: Shooter3DPlayerState | null = null;
    let best = Infinity;
    for (const other of this.players.values()) {
      if (other.id === p.id || !other.alive) continue;
      if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === prof.team) continue;
      const d = Math.hypot(other.x - p.x, other.z - p.z);
      if (d < best) {
        best = d;
        nearest = other;
      }
    }

    let yaw = p.yaw;
    let pitch = 0;
    let shoot = false;
    if (nearest) {
      yaw = Math.atan2(-(nearest.x - p.x), -(nearest.z - p.z));
      pitch = Math.atan2(nearest.y - p.y, Math.max(1, best));
      if (timer <= 0 && p.cd <= 0) {
        timer = 0.7 + Math.random() * 0.6;
        shoot = true;
      }
    }

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, {
      moveX: Math.sin(this.elapsedOrTime() + p.x) > 0 ? 0.6 : -0.6,
      moveZ: best > 10 ? 1 : 0.2,
      yaw,
      pitch,
      jump: Math.random() < 0.02,
      shoot,
      dash: false,
    });
  }

  private elapsedOrTime() {
    return this.timeRemaining * 1.5;
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    for (const p of this.players.values()) {
      if (!p.alive) {
        const rt = (this.respawnTimers.get(p.id) || 0) - dt;
        if (rt <= 0) {
          p.alive = true;
          p.hp = 100;
          const a = Math.random() * Math.PI * 2;
          p.x = Math.cos(a) * 16;
          p.y = 2;
          p.z = Math.sin(a) * 16;
          this.velocities.set(p.id, { vx: 0, vy: 0, vz: 0 });
        } else {
          this.respawnTimers.set(p.id, rt);
        }
        continue;
      }

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;
      const vel = this.velocities.get(p.id)!;
      p.cd = Math.max(0, p.cd - dt);
      p.yaw = inp.yaw;
      p.pitch = inp.pitch;

      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      let wx = -sin * inp.moveZ + cos * inp.moveX;
      let wz = -cos * inp.moveZ - sin * inp.moveX;
      const len = Math.hypot(wx, wz);
      if (len > 1) {
        wx /= len;
        wz /= len;
      }

      const speed = this.mode === '3d_prop_hunt' ? 14 : 11;
      vel.vx = wx * speed;
      vel.vz = wz * speed;
      vel.vy -= 26 * dt;

      if (p.y <= 0.05 && vel.vy <= 0) {
        p.y = 0;
        vel.vy = 0;
        if (inp.jump) vel.vy = 12;
      }

      p.x = Math.max(-23, Math.min(23, p.x + vel.vx * dt));
      p.y += vel.vy * dt;
      p.z = Math.max(-23, Math.min(23, p.z + vel.vz * dt));

      for (const pil of PILLARS) {
        if (p.y < pil.h && Math.abs(p.x - pil.x) < pil.w / 2 + 0.5 && Math.abs(p.z - pil.z) < pil.d / 2 + 0.5) {
          const dx = p.x - pil.x;
          const dz = p.z - pil.z;
          if (Math.abs(dx) > Math.abs(dz)) p.x = pil.x + Math.sign(dx) * (pil.w / 2 + 0.5);
          else p.z = pil.z + Math.sign(dz) * (pil.d / 2 + 0.5);
        }
      }

      if (inp.shoot && p.cd <= 0) {
        const isRapid = this.mode === '3d_laser_tag';
        const isRocket = this.mode === '3d_rocket_arena';
        p.cd = isRapid ? 0.25 : isRocket ? 0.85 : 0.65;

        const dx = -Math.sin(p.yaw) * Math.cos(p.pitch);
        const dy = Math.sin(p.pitch);
        const dz = -Math.cos(p.yaw) * Math.cos(p.pitch);
        const spd = this.mode === '3d_sniper_towers' ? 75 : isRocket ? 34 : 52;
        const prof = this.profiles.get(p.id);

        this.projectiles.push({
          id: uid(),
          ownerId: p.id,
          team: prof?.team ?? null,
          x: p.x + dx * 0.9,
          y: p.y + 1.4 + dy * 0.9,
          z: p.z + dz * 0.9,
          vx: dx * spd,
          vy: dy * spd,
          vz: dz * spd,
          color: GAME_CATALOG[this.mode].accent,
          r: isRocket ? 0.35 : 0.2,
          fuse: 2.2,
        });
      }
    }

    const nextProj: Proj3D[] = [];
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.fuse -= dt;

      let hit = false;
      for (const target of this.players.values()) {
        if (target.id === pr.ownerId || !target.alive) continue;
        if (this.teamMode === 'teams' && this.profiles.get(target.id)?.team === pr.team) continue;
        if (Math.hypot(target.x - pr.x, target.y + 1.0 - pr.y, target.z - pr.z) < 1.1) {
          hit = true;
          const dmg = this.mode === '3d_laser_tag' ? 35 : 100;
          target.hp -= dmg;
          if (target.hp <= 0) {
            target.alive = false;
            this.respawnTimers.set(target.id, 1.8);
            const att = this.players.get(pr.ownerId);
            if (att) {
              att.kills += 1;
              att.score += 100;
              const attProf = this.profiles.get(att.id);
              if (this.teamMode === 'teams' && attProf?.team) this.teamScores[attProf.team] += 100;
            }
            events.push({ id: uid(), type: 'ko', text: 'BOOM HEADSHOT!', color: GAME_CATALOG[this.mode].accent });
          }
          break;
        }
      }

      if (!hit && pr.fuse > 0 && pr.y > 0 && Math.abs(pr.x) < 25 && Math.abs(pr.z) < 25) {
        nextProj.push(pr);
      }
    }
    this.projectiles = nextProj;

    return events;
  }

  getSnapshot(): Shooter3DSnapshot {
    const playersObj: Record<string, Shooter3DPlayerState> = {};
    for (const [id, p] of this.players.entries()) playersObj[id] = p;
    return {
      mode: this.mode,
      timeRemaining: Math.ceil(this.timeRemaining),
      players: playersObj,
      projectiles: this.projectiles.map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, color: p.color, r: p.r })),
      teamScores: this.teamScores,
    };
  }

  isFinished(): boolean {
    return this.timeRemaining <= 0;
  }

  getResults(): GameResult {
    const playerScores: Record<string, number> = {};
    const kos: Record<string, number> = {};
    const bankrupts: Record<string, number> = {};
    const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} WINS ${GAME_CATALOG[this.mode].title}!`;

    sorted.forEach((p, idx) => {
      playerScores[p.id] = Math.max(25, 120 - idx * 20);
      kos[p.id] = p.kills;
      bankrupts[p.id] = 0;
    });

    return { playerScores, winnerText, kos, bankrupts, winnerIds: [top.id] };
  }
}
