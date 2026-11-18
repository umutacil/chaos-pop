import {
  BombInput,
  BombPlayerState,
  BombSnapshot,
  GameEvent,
  PlayerProfile,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

const TRAMPOLINES = [
  { x: -9, z: 0 },
  { x: 9, z: 0 },
  { x: 0, z: -9 },
  { x: 0, z: 9 },
];

export class BombTagGame implements BaseGame {
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, BombPlayerState> = new Map();
  private inputs: Map<string, BombInput> = new Map();
  private teamMode: TeamMode;
  private timeRemaining: number;
  private bombMaxFuse = 12;
  private bombFuse = 12;
  private arenaRadius = 20;
  private teamScores = { red: 0, blue: 0 };
  private passImmunity = 0;
  private botTimers: Map<string, number> = new Map();

  constructor(ctx: GameInitContext) {
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    const count = ctx.players.length;
    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const angle = (idx / Math.max(1, count)) * Math.PI * 2;
      this.players.set(p.id, {
        id: p.id,
        x: Math.cos(angle) * 10,
        y: 1,
        z: Math.sin(angle) * 10,
        yaw: angle + Math.PI,
        vx: 0,
        vy: 0,
        vz: 0,
        alive: true,
        hasBomb: false,
        shoveCd: 0,
        score: 0,
        stamina: 100,
      });
      this.inputs.set(p.id, {
        moveX: 0,
        moveZ: 0,
        yaw: 0,
        jump: false,
        sprint: false,
        shove: false,
      });
      this.botTimers.set(p.id, Math.random() * 0.5);
    });

    this.assignRandomBomb();
  }

  private assignRandomBomb(): void {
    const alive = Array.from(this.players.values()).filter((p) => p.alive);
    if (alive.length === 0) return;
    for (const p of this.players.values()) p.hasBomb = false;
    const chosen = alive[Math.floor(Math.random() * alive.length)];
    chosen.hasBomb = true;
    this.bombFuse = this.bombMaxFuse;
  }

  handleInput(playerId: string, input: BombInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      moveZ: Math.max(-1, Math.min(1, Number(input.moveZ) || 0)),
      yaw: Number(input.yaw) || 0,
      jump: Boolean(input.jump),
      sprint: Boolean(input.sprint),
      shove: Boolean(input.shove),
    });
  }

  private updateBotInput(p: BombPlayerState, dt: number): void {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive) return;

    let timer = (this.botTimers.get(p.id) || 0) - dt;
    let target: BombPlayerState | null = null;
    let bestDist = Infinity;

    for (const other of this.players.values()) {
      if (other.id === p.id || !other.alive) continue;
      if (p.hasBomb && this.teamMode === 'teams' && this.profiles.get(other.id)?.team === prof.team) continue;
      const d = Math.hypot(other.x - p.x, other.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        target = other;
      }
    }

    const inp: BombInput = {
      moveX: 0,
      moveZ: 1,
      yaw: p.yaw,
      jump: Math.random() < 0.03,
      sprint: p.hasBomb || bestDist < 5,
      shove: false,
    };

    const distFromCenter = Math.hypot(p.x, p.z);
    if (distFromCenter > this.arenaRadius - 3.5) {
      // Run back toward center!
      inp.yaw = Math.atan2(p.x, p.z);
    } else if (p.hasBomb && target) {
      // Chase target!
      inp.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
      if (bestDist < 2.6 && timer <= 0) {
        inp.shove = true;
        timer = 0.5;
      }
    } else if (target) {
      // Run away from bomb holder if nearby!
      const holder = Array.from(this.players.values()).find((x) => x.hasBomb && x.alive);
      if (holder && holder.id !== p.id) {
        inp.yaw = Math.atan2(holder.x - p.x, holder.z - p.z);
      } else {
        inp.yaw = p.yaw + Math.sin(this.timeRemaining) * 0.05;
      }
    }

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, inp);
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    this.passImmunity = Math.max(0, this.passImmunity - dt);

    // Arena gently pulses/shrinks down to min radius 11
    this.arenaRadius = Math.max(11, 20 - (1 - Math.min(1, this.timeRemaining / 90)) * 7);

    // Bomb fuse tick
    this.bombFuse -= dt;
    if (this.bombFuse <= 0) {
      const holder = Array.from(this.players.values()).find((p) => p.hasBomb && p.alive);
      if (holder) {
        holder.hasBomb = false;
        holder.vy = 26; // Blast sky-high!
        holder.vx = (Math.random() - 0.5) * 14;
        holder.vz = (Math.random() - 0.5) * 14;
        holder.score = Math.max(0, holder.score - 30);

        const holderProf = this.profiles.get(holder.id);
        events.push({
          id: uid(),
          type: 'bomb_boom',
          text: 'KABOOM!!',
          subtext: `${holderProf?.name} got blasted by the Hot Potato!`,
          color: '#FF3B5C',
          x: holder.x,
          y: holder.y,
          z: holder.z,
          targetId: holder.id,
        });

        // Award points to survivors!
        for (const p of this.players.values()) {
          if (p.id !== holder.id && p.alive) {
            p.score += 50;
            const prof = this.profiles.get(p.id);
            if (this.teamMode === 'teams' && prof?.team && prof.team !== holderProf?.team) {
              this.teamScores[prof.team] += 50;
            }
          }
        }
      }
      this.assignRandomBomb();
    }

    // Update players
    for (const p of this.players.values()) {
      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;

      p.shoveCd = Math.max(0, p.shoveCd - dt);
      p.yaw = inp.yaw;

      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const forwardX = -sin;
      const forwardZ = -cos;
      const rightX = cos;
      const rightZ = -sin;

      let wishX = forwardX * inp.moveZ + rightX * inp.moveX;
      let wishZ = forwardZ * inp.moveZ + rightZ * inp.moveX;
      const len = Math.hypot(wishX, wishZ);
      if (len > 1) {
        wishX /= len;
        wishZ /= len;
      }

      const sprinting = inp.sprint && p.stamina > 5;
      if (sprinting && len > 0.1) {
        p.stamina = Math.max(0, p.stamina - 32 * dt);
      } else {
        p.stamina = Math.min(100, p.stamina + 22 * dt);
      }

      const speed = (p.hasBomb ? 12.2 : 10.2) * (sprinting ? 1.38 : 1.0);
      p.vx += (wishX * speed - p.vx) * Math.min(1, dt * 8);
      p.vz += (wishZ * speed - p.vz) * Math.min(1, dt * 8);
      p.vy -= 26 * dt;

      const onPlatform = Math.hypot(p.x, p.z) <= this.arenaRadius;
      if (onPlatform && p.y <= 0.05 && p.vy <= 0) {
        p.y = 0;
        p.vy = 0;
        if (inp.jump) p.vy = 11.5;
      }

      // Trampolines
      for (const tr of TRAMPOLINES) {
        if (p.y < 1.2 && Math.hypot(p.x - tr.x, p.z - tr.z) < 2.1) {
          p.vy = 19;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Fall off edge -> respawn at center with slight score penalty
      if (p.y < -14) {
        p.x = (Math.random() - 0.5) * 6;
        p.y = 8;
        p.z = (Math.random() - 0.5) * 6;
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.score = Math.max(0, p.score - 20);
        if (p.hasBomb) {
          p.hasBomb = false;
          this.assignRandomBomb();
        }
      }

      // Shove & Bomb Pass
      if (inp.shove && p.shoveCd <= 0) {
        p.shoveCd = 0.75;
        for (const other of this.players.values()) {
          if (other.id === p.id || !other.alive) continue;
          const dist = Math.hypot(other.x - p.x, other.y - p.y, other.z - p.z);
          if (dist < 2.9) {
            const dx = other.x - p.x;
            const dz = other.z - p.z;
            const d = Math.max(0.1, Math.hypot(dx, dz));
            other.vx += (dx / d) * 18;
            other.vz += (dz / d) * 18;
            other.vy = Math.max(other.vy, 7);

            if (p.hasBomb && this.passImmunity <= 0) {
              p.hasBomb = false;
              other.hasBomb = true;
              this.passImmunity = 0.6;
              events.push({
                id: uid(),
                type: 'bomb_pass',
                text: 'HOT POTATO!',
                subtext: `${this.profiles.get(p.id)?.name} passed the bomb to ${this.profiles.get(other.id)?.name}!`,
                color: '#00E5FF',
                targetId: other.id,
                attackerId: p.id,
              });
            }
          }
        }
      }

      // Passive touch pass if bomb holder runs right into someone
      if (p.hasBomb && this.passImmunity <= 0) {
        for (const other of this.players.values()) {
          if (other.id === p.id || !other.alive) continue;
          if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === this.profiles.get(p.id)?.team) continue;
          if (Math.hypot(other.x - p.x, other.y - p.y, other.z - p.z) < 1.35) {
            p.hasBomb = false;
            other.hasBomb = true;
            this.passImmunity = 0.75;
            events.push({
              id: uid(),
              type: 'bomb_pass',
              text: 'TAGGED!',
              subtext: `${this.profiles.get(other.id)?.name} has the BOMB!`,
              color: '#FFD600',
              targetId: other.id,
              attackerId: p.id,
            });
            break;
          }
        }
      }
    }

    return events;
  }

  getSnapshot(): BombSnapshot {
    const playersObj: Record<string, BombPlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }
    return {
      timeRemaining: Math.ceil(this.timeRemaining),
      bombFuse: Number(this.bombFuse.toFixed(1)),
      bombMaxFuse: this.bombMaxFuse,
      arenaRadius: Number(this.arenaRadius.toFixed(2)),
      players: playersObj,
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
    const winnerIds: string[] = [];
    let winnerText = '';

    for (const p of this.players.values()) {
      kos[p.id] = 0;
      bankrupts[p.id] = 0;
    }

    if (this.teamMode === 'teams') {
      const winTeam = this.teamScores.red >= this.teamScores.blue ? 'red' : 'blue';
      winnerText = winTeam === 'red' ? 'RED TEAM SURVIVED THE BOMBS!' : 'BLUE TEAM SURVIVED THE BOMBS!';
      for (const p of this.players.values()) {
        const isWin = this.profiles.get(p.id)?.team === winTeam;
        playerScores[p.id] = (isWin ? 100 : 30) + Math.round(p.score / 5);
        if (isWin) winnerIds.push(p.id);
      }
    } else {
      const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
      const top = sorted[0];
      winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} IS THE BOMB DODGER!`;
      sorted.forEach((p, idx) => {
        playerScores[p.id] = Math.max(25, 120 - idx * 25);
        if (idx === 0) winnerIds.push(p.id);
      });
    }

    return { playerScores, winnerText, kos, bankrupts, winnerIds };
  }
}
