import {
  GAME_CATALOG,
  GameEvent,
  GameId,
  PlatformInput,
  PlatformPlayerState,
  PlatformSnapshot,
  PlayerProfile,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface Hazard {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: 'meteor' | 'star' | 'bolt' | 'checkpoint';
  color: string;
  ownerId?: string;
}

export class Platform2DGame implements BaseGame {
  private mode: GameId;
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, PlatformPlayerState> = new Map();
  private inputs: Map<string, PlatformInput> = new Map();
  private prevJump: Map<string, boolean> = new Map();
  private hazards: Hazard[] = [];
  private lasers: { y: number; x1: number; x2: number; active: boolean }[] = [];
  private zone: { x: number; y: number; r: number } | null = null;
  private ball: { x: number; y: number; vx: number; vy: number; r: number } | null = null;
  private lavaY = -320;
  private elapsed = 0;
  private spawnTimer = 0;
  private teamMode: TeamMode;
  private timeRemaining: number;
  private teamScores = { red: 0, blue: 0 };
  private respawnTimers: Map<string, number> = new Map();
  private botTimers: Map<string, number> = new Map();

  constructor(mode: GameId, ctx: GameInitContext) {
    this.mode = mode;
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    if (mode === '2d_king_hill') {
      this.zone = { x: 0, y: 120, r: 75 };
    } else if (mode === '2d_rocket_soccer') {
      this.ball = { x: 0, y: 140, vx: 0, vy: 0, r: 28 };
    } else if (mode === '2d_grapple_race') {
      this.spawnCheckpoint();
    }

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      this.players.set(p.id, {
        id: p.id,
        x: -240 + (idx % 6) * 95,
        y: 120,
        vx: 0,
        vy: 0,
        facing: idx % 2 === 0 ? 1 : -1,
        alive: true,
        score: mode === '2d_laser_dodge' || mode === '2d_floor_lava' ? 50 : 0,
        jumpsLeft: 2,
        cd: 0,
      });
      this.inputs.set(p.id, { moveX: 0, down: false, jump: false, action: false, dash: false });
      this.prevJump.set(p.id, false);
      this.botTimers.set(p.id, Math.random() * 0.6);
    });
  }

  private spawnCheckpoint() {
    this.hazards = this.hazards.filter((h) => h.kind !== 'checkpoint');
    this.hazards.push({
      id: uid(),
      x: (Math.random() - 0.5) * 620,
      y: -10 + Math.random() * 240,
      vx: 0,
      vy: 0,
      r: 24,
      kind: 'checkpoint',
      color: '#A855F7',
    });
  }

  handleInput(playerId: string, input: PlatformInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      down: Boolean(input.down),
      jump: Boolean(input.jump),
      action: Boolean(input.action),
      dash: Boolean(input.dash),
    });
  }

  private updateBotInput(p: PlatformPlayerState, dt: number) {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive) return;
    let timer = (this.botTimers.get(p.id) || 0) - dt;

    let targetX = 0;
    let jump = Math.random() < 0.04;
    let action = false;

    if (this.mode === '2d_king_hill' && this.zone) {
      targetX = this.zone.x - p.x;
      if (this.zone.y > p.y + 40 && Math.random() < 0.12) jump = true;
    } else if (this.mode === '2d_rocket_soccer' && this.ball) {
      targetX = this.ball.x - p.x;
      if (this.ball.y > p.y + 30 && Math.random() < 0.12) jump = true;
    } else if (this.mode === '2d_grapple_race') {
      const cp = this.hazards.find((h) => h.kind === 'checkpoint');
      if (cp) {
        targetX = cp.x - p.x;
        if (cp.y > p.y + 30 && Math.random() < 0.14) jump = true;
      }
    } else {
      const other = Array.from(this.players.values()).find((x) => x.id !== p.id && x.alive);
      if (other) {
        targetX = other.x - p.x;
        if (timer <= 0) {
          timer = 0.8 + Math.random() * 0.6;
          action = true;
        }
      }
    }

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, {
      moveX: targetX > 20 ? 1 : targetX < -20 ? -1 : 0,
      down: false,
      jump,
      action,
      dash: Math.random() < 0.015,
    });
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    this.spawnTimer -= dt;

    const platforms = [
      { x1: -380, x2: 380, y: -80, solid: true },
      { x1: -310, x2: -120, y: 55, solid: false },
      { x1: 120, x2: 310, y: 55, solid: false },
      { x1: -110, x2: 110, y: 175, solid: false },
    ];

    // Mode-specific world updates
    if (this.mode === '2d_king_hill' && this.zone) {
      this.zone.x = Math.sin(this.elapsed * 0.6) * 230;
      this.zone.y = 95 + Math.cos(this.elapsed * 0.8) * 70;
    }

    if (this.mode === '2d_floor_lava') {
      this.lavaY = -120 + Math.sin(this.elapsed * 1.1) * 110;
    }

    if (this.mode === '2d_laser_dodge') {
      const cycle = this.elapsed % 3.2;
      const ly = -50 + Math.floor(this.elapsed / 3.2) % 3 * 95;
      this.lasers = [{ y: ly, x1: -420, x2: 420, active: cycle > 1.3 && cycle < 2.2 }];
    }

    if (this.mode === '2d_meteor_shower' && this.spawnTimer <= 0) {
      this.spawnTimer = 0.45;
      const isStar = Math.random() < 0.3;
      this.hazards.push({
        id: uid(),
        x: (Math.random() - 0.5) * 720,
        y: 340,
        vx: (Math.random() - 0.5) * 60,
        vy: isStar ? -170 : -340,
        r: isStar ? 16 : 22,
        kind: isStar ? 'star' : 'meteor',
        color: isStar ? '#FFD600' : '#FF3B5C',
      });
    }

    // Ball physics for Chaos Soccer
    if (this.mode === '2d_rocket_soccer' && this.ball) {
      this.ball.vy -= 900 * dt;
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
      if (this.ball.y < -80 + this.ball.r) {
        this.ball.y = -80 + this.ball.r;
        this.ball.vy = Math.abs(this.ball.vy) * 0.78;
      }
      if (Math.abs(this.ball.x) > 380) {
        // Goal scored!
        const scoredBlueSide = this.ball.x > 0;
        const scoringTeam = scoredBlueSide ? 'red' : 'blue';
        this.teamScores[scoringTeam] += 1;
        for (const p of this.players.values()) {
          if (this.profiles.get(p.id)?.team === scoringTeam || this.teamMode === 'ffa') {
            p.score += 30;
          }
        }
        events.push({
          id: uid(),
          type: 'announce',
          text: 'GOAL!!',
          subtext: `${scoringTeam.toUpperCase()} SCORED!`,
          color: scoringTeam === 'red' ? '#FF3B5C' : '#00E5FF',
        });
        this.ball.x = 0;
        this.ball.y = 180;
        this.ball.vx = 0;
        this.ball.vy = 0;
      }
    }

    // Players
    for (const p of this.players.values()) {
      if (!p.alive) {
        const rt = (this.respawnTimers.get(p.id) || 0) - dt;
        if (rt <= 0) {
          p.alive = true;
          p.x = (Math.random() - 0.5) * 300;
          p.y = 220;
          p.vx = 0;
          p.vy = 0;
        } else {
          this.respawnTimers.set(p.id, rt);
        }
        continue;
      }

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;
      const wasJump = this.prevJump.get(p.id) || false;
      const jumpPressed = inp.jump && !wasJump;
      this.prevJump.set(p.id, inp.jump);

      p.cd = Math.max(0, p.cd - dt);
      if (inp.moveX !== 0) p.facing = inp.moveX > 0 ? 1 : -1;
      p.vx += (inp.moveX * 330 - p.vx) * Math.min(1, dt * 14);
      p.vy -= (inp.down ? 2100 : 1400) * dt;

      if (jumpPressed && p.jumpsLeft > 0) {
        p.vy = 560;
        p.jumpsLeft -= 1;
      }

      if (inp.dash && p.cd <= 0) {
        p.cd = 0.85;
        p.vx = p.facing * 680;
        p.vy = Math.max(p.vy, 160);
      }

      if (inp.action && p.cd <= 0) {
        if (this.mode === '2d_sniper_duel') {
          p.cd = 0.75;
          this.hazards.push({
            id: uid(),
            x: p.x + p.facing * 26,
            y: p.y + 20,
            vx: p.facing * 850,
            vy: 0,
            r: 8,
            kind: 'bolt',
            color: '#00E5FF',
            ownerId: p.id,
          });
        } else {
          p.cd = 0.55;
          // Shove nearby players or kick ball
          for (const other of this.players.values()) {
            if (other.id !== p.id && other.alive && Math.hypot(other.x - p.x, other.y - p.y) < 62) {
              other.vx += p.facing * 450;
              other.vy = 280;
            }
          }
          if (this.ball && Math.hypot(this.ball.x - p.x, this.ball.y - p.y) < 75) {
            this.ball.vx = p.facing * 600;
            this.ball.vy = 420;
          }
        }
      }

      const prevY = p.y;
      p.x = Math.max(-390, Math.min(390, p.x + p.vx * dt));
      p.y += p.vy * dt;

      if (p.vy <= 0) {
        for (const plat of platforms) {
          if (p.x >= plat.x1 && p.x <= plat.x2 && (!plat.solid ? !inp.down : true)) {
            if (prevY >= plat.y - 6 && p.y <= plat.y + 4) {
              p.y = plat.y;
              p.vy = 0;
              p.jumpsLeft = 2;
              break;
            }
          }
        }
      }

      // Ball bounce with player body
      if (this.ball && Math.hypot(this.ball.x - p.x, this.ball.y - (p.y + 20)) < this.ball.r + 22) {
        const ang = Math.atan2(this.ball.y - (p.y + 20), this.ball.x - p.x);
        this.ball.vx = Math.cos(ang) * 420 + p.vx * 0.6;
        this.ball.vy = Math.sin(ang) * 420 + 180;
      }

      // King of the Hill scoring
      if (this.mode === '2d_king_hill' && this.zone) {
        if (Math.hypot(p.x - this.zone.x, p.y - this.zone.y) < this.zone.r) {
          p.score += dt * 20;
        }
      }

      // Lava check
      if (this.mode === '2d_floor_lava' && p.y < this.lavaY) {
        p.alive = false;
        p.score = Math.max(0, p.score - 15);
        this.respawnTimers.set(p.id, 1.5);
        events.push({ id: uid(), type: 'ko', text: 'MELTED!', color: '#FF3B5C' });
      }

      // Laser check
      if (this.mode === '2d_laser_dodge') {
        for (const l of this.lasers) {
          if (l.active && Math.abs(p.y + 20 - l.y) < 22) {
            p.alive = false;
            p.score = Math.max(0, p.score - 15);
            this.respawnTimers.set(p.id, 1.5);
            events.push({ id: uid(), type: 'ko', text: 'ZAPPED!', color: '#FF3B5C' });
          }
        }
      }
    }

    // Hazards
    const nextHaz: Hazard[] = [];
    for (const h of this.hazards) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      if (h.kind === 'checkpoint') {
        let tagged = false;
        for (const p of this.players.values()) {
          if (p.alive && Math.hypot(p.x - h.x, p.y + 20 - h.y) < 38) {
            p.score += 35;
            tagged = true;
            events.push({ id: uid(), type: 'announce', text: '+35 PTS!', color: '#A855F7' });
            break;
          }
        }
        if (tagged) this.spawnCheckpoint();
        else nextHaz.push(h);
        continue;
      }

      if (h.kind === 'bolt') {
        let hit = false;
        for (const p of this.players.values()) {
          if (p.id !== h.ownerId && p.alive && Math.hypot(p.x - h.x, p.y + 20 - h.y) < 28) {
            p.alive = false;
            this.respawnTimers.set(p.id, 1.5);
            const att = h.ownerId ? this.players.get(h.ownerId) : undefined;
            if (att) att.score += 50;
            hit = true;
            events.push({ id: uid(), type: 'ko', text: 'SNIPED!', color: '#00E5FF' });
            break;
          }
        }
        if (!hit && Math.abs(h.x) < 430) nextHaz.push(h);
        continue;
      }

      // Meteor or Star
      let consumed = false;
      for (const p of this.players.values()) {
        if (p.alive && Math.hypot(p.x - h.x, p.y + 20 - h.y) < h.r + 18) {
          consumed = true;
          if (h.kind === 'star') {
            p.score += 25;
          } else {
            p.alive = false;
            p.score = Math.max(0, p.score - 20);
            this.respawnTimers.set(p.id, 1.6);
            events.push({ id: uid(), type: 'explosion', text: 'BONK!', color: '#FF3B5C' });
          }
          break;
        }
      }
      if (!consumed && h.y > -200) nextHaz.push(h);
    }
    this.hazards = nextHaz;

    return events;
  }

  getSnapshot(): PlatformSnapshot {
    const playersObj: Record<string, PlatformPlayerState> = {};
    for (const [id, p] of this.players.entries()) playersObj[id] = p;
    return {
      mode: this.mode,
      timeRemaining: Math.ceil(this.timeRemaining),
      lavaY: this.lavaY,
      zone: this.zone,
      ball: this.ball,
      lasers: this.lasers,
      hazards: this.hazards.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        r: h.r,
        kind: h.kind,
        color: h.color,
      })),
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
