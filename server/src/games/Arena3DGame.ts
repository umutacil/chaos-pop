import {
  Arena3DInput,
  Arena3DPlayerState,
  Arena3DSnapshot,
  GAME_CATALOG,
  GameEvent,
  GameId,
  PlayerProfile,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface Tile {
  id: string;
  x: number;
  z: number;
  color: string;
  alive: boolean;
  steppedAt: number | null;
}

interface Hazard3D {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  kind: 'boulder' | 'meteor' | 'warning';
  timer: number;
}

const TILE_COLORS = ['#FF3B5C', '#00E5FF', '#FFD600', '#22C55E'];

export class Arena3DGame implements BaseGame {
  private mode: GameId;
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, Arena3DPlayerState> = new Map();
  private inputs: Map<string, Arena3DInput> = new Map();
  private tiles: Tile[] = [];
  private hazards: Hazard3D[] = [];
  private crownPos: { x: number; y: number; z: number } | null = null;
  private sweeperAngle = 0;
  private arenaRadius = 18;
  private targetColor: string | null = null;
  private dropPhase = 0;
  private dropTimer = 4.0;
  private elapsed = 0;
  private spawnTimer = 1.2;
  private teamMode: TeamMode;
  private timeRemaining: number;
  private teamScores = { red: 0, blue: 0 };
  private respawnTimers: Map<string, number> = new Map();
  private botTimers: Map<string, number> = new Map();

  constructor(mode: GameId, ctx: GameInitContext) {
    this.mode = mode;
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    if (mode === '3d_hex_fall') {
      for (let gx = -3; gx <= 3; gx++) {
        for (let gz = -3; gz <= 3; gz++) {
          this.tiles.push({
            id: `${gx}_${gz}`,
            x: gx * 4.2,
            z: gz * 4.2,
            color: TILE_COLORS[(Math.abs(gx) + Math.abs(gz)) % TILE_COLORS.length],
            alive: true,
            steppedAt: null,
          });
        }
      }
    } else if (mode === '3d_color_drop') {
      for (let gx = -2; gx <= 2; gx++) {
        for (let gz = -2; gz <= 2; gz++) {
          this.tiles.push({
            id: `${gx}_${gz}`,
            x: gx * 5.2,
            z: gz * 5.2,
            color: TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)],
            alive: true,
            steppedAt: null,
          });
        }
      }
      this.targetColor = TILE_COLORS[0];
    } else if (mode === '3d_gold_heist') {
      this.crownPos = { x: 0, y: 1.2, z: 0 };
    }

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const angle = (idx / Math.max(1, ctx.players.length)) * Math.PI * 2;
      const dist = mode === '3d_sumo_3d' ? 8 : 10;
      this.players.set(p.id, {
        id: p.id,
        x: Math.cos(angle) * dist,
        y: 1.0,
        z: Math.sin(angle) * dist,
        yaw: angle + Math.PI,
        vx: 0,
        vy: 0,
        vz: 0,
        alive: true,
        hasCrown: false,
        score: mode === '3d_hex_fall' || mode === '3d_sweeper' ? 50 : 0,
        cd: 0,
      });
      this.inputs.set(p.id, { moveX: 0, moveZ: 0, yaw: 0, jump: false, sprint: false, action: false });
      this.botTimers.set(p.id, Math.random() * 0.6);
    });
  }

  handleInput(playerId: string, input: Arena3DInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      moveZ: Math.max(-1, Math.min(1, Number(input.moveZ) || 0)),
      yaw: Number(input.yaw) || 0,
      jump: Boolean(input.jump),
      sprint: Boolean(input.sprint),
      action: Boolean(input.action),
    });
  }

  private updateBotInput(p: Arena3DPlayerState, dt: number) {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive) return;
    let timer = (this.botTimers.get(p.id) || 0) - dt;

    let yaw = p.yaw;
    let jump = Math.random() < 0.03;
    let action = false;

    if (this.mode === '3d_color_drop' && this.targetColor) {
      const safe = this.tiles.find((t) => t.alive && t.color === this.targetColor);
      if (safe) yaw = Math.atan2(-(safe.x - p.x), -(safe.z - p.z));
    } else if (this.mode === '3d_gold_heist' && this.crownPos && !p.hasCrown) {
      yaw = Math.atan2(-(this.crownPos.x - p.x), -(this.crownPos.z - p.z));
    } else if (Math.hypot(p.x, p.z) > this.arenaRadius - 4) {
      yaw = Math.atan2(p.x, p.z);
    } else {
      const other = Array.from(this.players.values()).find((x) => x.id !== p.id && x.alive);
      if (other) {
        yaw = Math.atan2(-(other.x - p.x), -(other.z - p.z));
        if (timer <= 0 && Math.hypot(other.x - p.x, other.z - p.z) < 3.5) {
          timer = 0.7;
          action = true;
        }
      }
    }

    if (this.mode === '3d_sweeper') jump = Math.random() < 0.08;

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, {
      moveX: 0,
      moveZ: 1,
      yaw,
      jump,
      sprint: this.mode === '3d_turbo_tag' || this.mode === '3d_bumper_cars',
      action,
    });
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    if (this.mode === '3d_ice_slip' || this.mode === '3d_sumo_3d') {
      this.arenaRadius = Math.max(9, 18 - (1 - Math.min(1, this.timeRemaining / 90)) * 7);
    }

    // Sweeper rotation
    if (this.mode === '3d_sweeper') {
      this.sweeperAngle += dt * (1.8 + Math.min(2.5, this.elapsed * 0.04));
    }

    // Color Drop cycle
    if (this.mode === '3d_color_drop') {
      this.dropTimer -= dt;
      if (this.dropPhase === 0 && this.dropTimer <= 1.2) {
        this.dropPhase = 1;
      } else if (this.dropPhase === 1 && this.dropTimer <= 0) {
        this.dropPhase = 2;
        this.dropTimer = 2.2;
        for (const t of this.tiles) {
          if (t.color !== this.targetColor) t.alive = false;
        }
      } else if (this.dropPhase === 2 && this.dropTimer <= 0) {
        this.dropPhase = 0;
        this.dropTimer = 4.2;
        for (const t of this.tiles) {
          t.alive = true;
          t.color = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
        }
        this.targetColor = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
        events.push({ id: uid(), type: 'announce', text: 'NEW COLOR!', color: this.targetColor });
      }
    }

    // Hex-a-fall tile timers
    if (this.mode === '3d_hex_fall') {
      for (const t of this.tiles) {
        if (t.alive && t.steppedAt !== null && this.elapsed - t.steppedAt > 0.65) {
          t.alive = false;
        }
      }
    }

    // Boulders & Meteors
    this.spawnTimer -= dt;
    if (this.mode === '3d_boulder_run' && this.spawnTimer <= 0) {
      this.spawnTimer = 1.1;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.hazards.push({
        id: uid(),
        x: side * 20,
        y: 1.5,
        z: (Math.random() - 0.5) * 24,
        vx: -side * (10 + Math.random() * 6),
        vy: 0,
        vz: 0,
        r: 1.8,
        kind: 'boulder',
        timer: 5,
      });
    }
    if (this.mode === '3d_meteor_arena' && this.spawnTimer <= 0) {
      this.spawnTimer = 0.9;
      this.hazards.push({
        id: uid(),
        x: (Math.random() - 0.5) * 24,
        y: 0.1,
        z: (Math.random() - 0.5) * 24,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 3.2,
        kind: 'warning',
        timer: 1.3,
      });
    }

    // Update hazards
    const nextHaz: Hazard3D[] = [];
    for (const h of this.hazards) {
      h.timer -= dt;
      h.x += h.vx * dt;
      h.z += h.vz * dt;
      if (h.kind === 'warning' && h.timer <= 0) {
        events.push({ id: uid(), type: 'explosion', text: 'METEOR!', color: '#FF3B5C' });
        for (const p of this.players.values()) {
          if (p.alive && Math.hypot(p.x - h.x, p.z - h.z) < h.r) {
            p.vy = 18;
            p.vx += (p.x - h.x) * 5;
            p.vz += (p.z - h.z) * 5;
          }
        }
        continue;
      }
      if (h.kind === 'boulder') {
        for (const p of this.players.values()) {
          if (p.alive && Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) < h.r + 0.8) {
            p.vx += h.vx * 1.4;
            p.vy = 12;
          }
        }
      }
      if (h.timer > 0) nextHaz.push(h);
    }
    this.hazards = nextHaz;

    // Players
    for (const p of this.players.values()) {
      if (!p.alive) {
        const rt = (this.respawnTimers.get(p.id) || 0) - dt;
        if (rt <= 0) {
          p.alive = true;
          p.x = (Math.random() - 0.5) * 8;
          p.y = 4;
          p.z = (Math.random() - 0.5) * 8;
          p.vx = 0;
          p.vy = 0;
          p.vz = 0;
          if (this.mode === '3d_hex_fall') {
            const safe = this.tiles.find((t) => t.alive);
            if (safe) {
              p.x = safe.x;
              p.z = safe.z;
            }
          }
        } else {
          this.respawnTimers.set(p.id, rt);
        }
        continue;
      }

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;
      p.cd = Math.max(0, p.cd - dt);
      p.yaw = inp.yaw;

      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      let wx = -sin * inp.moveZ + cos * inp.moveX;
      let wz = -cos * inp.moveZ - sin * inp.moveX;
      const len = Math.hypot(wx, wz);
      if (len > 1) {
        wx /= len;
        wz /= len;
      }

      const baseSpeed = this.mode === '3d_turbo_tag' || this.mode === '3d_bumper_cars' ? 15 : 10.5;
      const speed = baseSpeed * (inp.sprint ? 1.35 : 1.0);
      const accel = this.mode === '3d_ice_slip' ? 1.8 : 9.0;

      p.vx += (wx * speed - p.vx) * Math.min(1, dt * accel);
      p.vz += (wz * speed - p.vz) * Math.min(1, dt * accel);
      p.vy -= 26 * dt;

      // Ground check
      let hasGround = false;
      if (this.mode === '3d_hex_fall' || this.mode === '3d_color_drop') {
        for (const t of this.tiles) {
          if (t.alive && Math.abs(p.x - t.x) < 2.2 && Math.abs(p.z - t.z) < 2.2) {
            hasGround = true;
            if (this.mode === '3d_hex_fall' && p.y <= 0.3 && t.steppedAt === null) {
              t.steppedAt = this.elapsed;
            }
            break;
          }
        }
      } else {
        hasGround = Math.hypot(p.x, p.z) <= this.arenaRadius;
      }

      if (hasGround && p.y <= 0.05 && p.vy <= 0) {
        p.y = 0;
        p.vy = 0;
        if (inp.jump) p.vy = 11.5;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Sweeper collision
      if (this.mode === '3d_sweeper' && p.y < 1.3) {
        const dist = Math.hypot(p.x, p.z);
        if (dist > 1.5 && dist < this.arenaRadius) {
          const pAng = Math.atan2(p.z, p.x);
          const diff = Math.abs(Math.atan2(Math.sin(pAng - this.sweeperAngle), Math.cos(pAng - this.sweeperAngle)));
          if (diff < 0.14 || Math.abs(diff - Math.PI) < 0.14) {
            p.vy = 12;
            p.vx += Math.cos(pAng + Math.PI / 2) * 18;
            p.vz += Math.sin(pAng + Math.PI / 2) * 18;
          }
        }
      }

      // Crown pickup
      if (this.mode === '3d_gold_heist') {
        if (this.crownPos && Math.hypot(p.x - this.crownPos.x, p.z - this.crownPos.z) < 2.0) {
          p.hasCrown = true;
          this.crownPos = null;
          events.push({ id: uid(), type: 'announce', text: 'CROWN TAKEN!', color: '#FFD600' });
        }
        if (p.hasCrown) {
          p.score += dt * 18;
        }
      }

      // Action: Shove / Ram / Tag
      if (inp.action && p.cd <= 0) {
        p.cd = 0.7;
        for (const other of this.players.values()) {
          if (other.id === p.id || !other.alive) continue;
          if (Math.hypot(other.x - p.x, other.z - p.z) < 2.9) {
            const dx = other.x - p.x;
            const dz = other.z - p.z;
            const d = Math.max(0.1, Math.hypot(dx, dz));
            const force = this.mode === '3d_bumper_cars' || this.mode === '3d_sumo_3d' ? 24 : 16;
            other.vx += (dx / d) * force;
            other.vz += (dz / d) * force;
            other.vy = 8;
            p.score += 15;
            if (other.hasCrown) {
              other.hasCrown = false;
              p.hasCrown = true;
              events.push({ id: uid(), type: 'announce', text: 'CROWN STOLEN!', color: '#FFD600' });
            }
          }
        }
      }

      // Fall out
      if (p.y < -12) {
        p.alive = false;
        p.score = Math.max(0, p.score - 20);
        this.respawnTimers.set(p.id, 1.8);
        if (p.hasCrown) {
          p.hasCrown = false;
          this.crownPos = { x: 0, y: 1.2, z: 0 };
        }
        events.push({ id: uid(), type: 'ko', text: 'WIPEOUT!', color: '#FF3B5C' });
      }
    }

    return events;
  }

  getSnapshot(): Arena3DSnapshot {
    const playersObj: Record<string, Arena3DPlayerState> = {};
    for (const [id, p] of this.players.entries()) playersObj[id] = p;
    return {
      mode: this.mode,
      timeRemaining: Math.ceil(this.timeRemaining),
      arenaRadius: this.arenaRadius,
      sweeperAngle: this.sweeperAngle,
      targetColor: this.targetColor,
      dropPhase: this.dropPhase,
      tiles: this.tiles.map((t) => ({ id: t.id, x: t.x, z: t.z, color: t.color, alive: t.alive })),
      hazards: this.hazards.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        z: h.z,
        r: h.r,
        kind: h.kind,
      })),
      crownPos: this.crownPos,
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
    const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} WINS ${GAME_CATALOG[this.mode].title}!`;

    sorted.forEach((p, idx) => {
      playerScores[p.id] = Math.max(25, 120 - idx * 20);
      kos[p.id] = 0;
      bankrupts[p.id] = 0;
    });

    return { playerScores, winnerText, kos, bankrupts, winnerIds: [top.id] };
  }
}
