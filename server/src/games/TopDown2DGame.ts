import {
  GAME_CATALOG,
  GameEvent,
  GameId,
  PlayerProfile,
  TeamMode,
  TopDownInput,
  TopDownPlayerState,
  TopDownSnapshot,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface ItemEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'coin' | 'crate' | 'bomb' | 'spike' | 'proj';
  r: number;
  color: string;
  fuse?: number;
  ownerId?: string;
  bounces?: number;
}

const ARENA_W = 420;
const ARENA_H = 300;

export class TopDown2DGame implements BaseGame {
  private mode: GameId;
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, TopDownPlayerState> = new Map();
  private inputs: Map<string, TopDownInput> = new Map();
  private items: ItemEntity[] = [];
  private teamMode: TeamMode;
  private timeRemaining: number;
  private arenaRadius = 310;
  private teamScores = { red: 0, blue: 0 };
  private paintCols = 14;
  private paintRows = 10;
  private paintCells: (string | null)[] = [];
  private respawnTimers: Map<string, number> = new Map();
  private botTimers: Map<string, number> = new Map();

  constructor(mode: GameId, ctx: GameInitContext) {
    this.mode = mode;
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    if (mode === '2d_paint_splat') {
      this.paintCells = Array(this.paintCols * this.paintRows).fill(null);
    }

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const angle = (idx / Math.max(1, ctx.players.length)) * Math.PI * 2;
      const dist = mode === '2d_sumo_push' ? 140 : 200;
      this.players.set(p.id, {
        id: p.id,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        angle: angle + Math.PI,
        alive: true,
        frozen: false,
        infected: mode === '2d_zombie_tag' && idx === 0,
        score: mode === '2d_spike_ball' ? 100 : 0,
        coins: 0,
        cd: 0,
        dashCd: 0,
      });
      this.inputs.set(p.id, { moveX: 0, moveY: 0, action: false, dash: false });
      this.botTimers.set(p.id, Math.random() * 0.6);
    });

    if (mode === '2d_coin_rush') {
      for (let i = 0; i < 14; i++) this.spawnCoin();
    } else if (mode === '2d_spike_ball') {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        this.items.push({
          id: uid(),
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 300,
          vx: Math.cos(a) * 230,
          vy: Math.sin(a) * 230,
          kind: 'spike',
          r: 22,
          color: '#A855F7',
        });
      }
    } else if (mode === '2d_bomber_chaos') {
      for (let i = 0; i < 14; i++) {
        this.items.push({
          id: uid(),
          x: (Math.random() - 0.5) * 650,
          y: (Math.random() - 0.5) * 420,
          vx: 0,
          vy: 0,
          kind: 'crate',
          r: 22,
          color: '#FF6B00',
        });
      }
    }
  }

  private spawnCoin() {
    this.items.push({
      id: uid(),
      x: (Math.random() - 0.5) * 680,
      y: (Math.random() - 0.5) * 460,
      vx: 0,
      vy: 0,
      kind: 'coin',
      r: 14,
      color: '#FFD600',
    });
  }

  handleInput(playerId: string, input: TopDownInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      moveY: Math.max(-1, Math.min(1, Number(input.moveY) || 0)),
      action: Boolean(input.action),
      dash: Boolean(input.dash),
    });
  }

  private updateBotInput(p: TopDownPlayerState, dt: number) {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive || p.frozen) return;

    let timer = (this.botTimers.get(p.id) || 0) - dt;
    let tx = 0;
    let ty = 0;
    let action = false;
    let dash = false;

    if (this.mode === '2d_coin_rush') {
      const coin = this.items.find((i) => i.kind === 'coin');
      if (coin) {
        tx = coin.x - p.x;
        ty = coin.y - p.y;
      }
    } else {
      let nearest: TopDownPlayerState | null = null;
      let best = Infinity;
      for (const other of this.players.values()) {
        if (other.id === p.id || !other.alive) continue;
        if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === prof.team) continue;
        const d = Math.hypot(other.x - p.x, other.y - p.y);
        if (d < best) {
          best = d;
          nearest = other;
        }
      }
      if (nearest) {
        if (this.mode === '2d_zombie_tag' && !p.infected && nearest.infected) {
          tx = p.x - nearest.x;
          ty = p.y - nearest.y;
        } else {
          tx = nearest.x - p.x;
          ty = nearest.y - p.y;
        }
        if (timer <= 0) {
          timer = 0.6 + Math.random() * 0.7;
          if (best < 260) action = true;
          if (best < 120 && Math.random() < 0.4) dash = true;
        }
      }
    }

    if (this.mode === '2d_sumo_push' && Math.hypot(p.x, p.y) > this.arenaRadius - 50) {
      tx = -p.x;
      ty = -p.y;
    }

    const len = Math.hypot(tx, ty) || 1;
    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, {
      moveX: tx / len,
      moveY: ty / len,
      action,
      dash,
    });
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    if (this.mode === '2d_sumo_push') {
      this.arenaRadius = Math.max(150, 310 - (1 - Math.min(1, this.timeRemaining / 90)) * 120);
    }

    if (this.mode === '2d_coin_rush' && this.items.filter((i) => i.kind === 'coin').length < 12) {
      this.spawnCoin();
    }

    // Update players
    for (const p of this.players.values()) {
      if (!p.alive) {
        const rt = (this.respawnTimers.get(p.id) || 0) - dt;
        if (rt <= 0) {
          p.alive = true;
          p.x = (Math.random() - 0.5) * 300;
          p.y = (Math.random() - 0.5) * 200;
          p.vx = 0;
          p.vy = 0;
        } else {
          this.respawnTimers.set(p.id, rt);
        }
        continue;
      }

      if (p.frozen) continue;

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;
      p.cd = Math.max(0, p.cd - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);

      const speed = p.infected ? 290 : 250;
      const friction = this.mode === '2d_sumo_push' ? 3.5 : 10;
      p.vx += (inp.moveX * speed - p.vx) * Math.min(1, dt * friction);
      p.vy += (inp.moveY * speed - p.vy) * Math.min(1, dt * friction);

      if (Math.hypot(inp.moveX, inp.moveY) > 0.15) {
        p.angle = Math.atan2(inp.moveY, inp.moveX);
      }

      if (inp.dash && p.dashCd <= 0) {
        p.dashCd = 1.2;
        p.vx += Math.cos(p.angle) * 460;
        p.vy += Math.sin(p.angle) * 460;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Arena bounds
      if (this.mode === '2d_sumo_push') {
        if (Math.hypot(p.x, p.y) > this.arenaRadius) {
          p.alive = false;
          this.respawnTimers.set(p.id, 1.8);
          p.score = Math.max(0, p.score - 20);
          events.push({
            id: uid(),
            type: 'ko',
            text: 'RING OUT!',
            subtext: `${this.profiles.get(p.id)?.name} fell out of the ring!`,
            color: '#EC4899',
          });
        }
      } else {
        p.x = Math.max(-ARENA_W, Math.min(ARENA_W, p.x));
        p.y = Math.max(-ARENA_H, Math.min(ARENA_H, p.y));
      }

      // Paint splat trail
      if (this.mode === '2d_paint_splat') {
        this.paintAt(p.x, p.y, p.id);
      }

      // Action button
      if (inp.action && p.cd <= 0) {
        if (this.mode === '2d_bomber_chaos') {
          p.cd = 1.1;
          this.items.push({
            id: uid(),
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            kind: 'bomb',
            r: 18,
            color: '#FF3B5C',
            fuse: 1.7,
            ownerId: p.id,
          });
        } else if (this.mode === '2d_tank_mayhem' || this.mode === '2d_freeze_tag' || this.mode === '2d_paint_splat') {
          p.cd = this.mode === '2d_paint_splat' ? 0.35 : 0.65;
          const prof = this.profiles.get(p.id);
          this.items.push({
            id: uid(),
            x: p.x + Math.cos(p.angle) * 24,
            y: p.y + Math.sin(p.angle) * 24,
            vx: Math.cos(p.angle) * 520,
            vy: Math.sin(p.angle) * 520,
            kind: 'proj',
            r: 9,
            color: prof?.color || '#00E5FF',
            ownerId: p.id,
            bounces: this.mode === '2d_tank_mayhem' ? 2 : 0,
          });
        } else {
          // Bump / Shove
          p.cd = 0.7;
          for (const other of this.players.values()) {
            if (other.id === p.id || !other.alive) continue;
            if (Math.hypot(other.x - p.x, other.y - p.y) < 58) {
              const ang = Math.atan2(other.y - p.y, other.x - p.x);
              other.vx += Math.cos(ang) * 650;
              other.vy += Math.sin(ang) * 650;
              p.score += 10;
              if (this.mode === '2d_coin_rush' && other.coins > 0) {
                const stolen = Math.min(3, other.coins);
                other.coins -= stolen;
                other.score = Math.max(0, other.score - stolen * 10);
                p.coins += stolen;
                p.score += stolen * 10;
              }
            }
          }
        }
      }

      // Zombie / Freeze touch
      if (this.mode === '2d_zombie_tag' && p.infected) {
        for (const other of this.players.values()) {
          if (other.id !== p.id && other.alive && !other.infected && Math.hypot(other.x - p.x, other.y - p.y) < 34) {
            other.infected = true;
            p.score += 50;
            events.push({
              id: uid(),
              type: 'ko',
              text: 'INFECTED!',
              subtext: `${this.profiles.get(other.id)?.name} turned into a Zombie!`,
              color: '#22C55E',
            });
          }
        }
      }
      if (this.mode === '2d_freeze_tag' && !p.frozen) {
        for (const other of this.players.values()) {
          if (other.id !== p.id && other.frozen && this.profiles.get(other.id)?.team === this.profiles.get(p.id)?.team) {
            if (Math.hypot(other.x - p.x, other.y - p.y) < 34) {
              other.frozen = false;
              p.score += 25;
            }
          }
        }
      }
    }

    // Update items
    const nextItems: ItemEntity[] = [];
    for (const it of this.items) {
      if (it.kind === 'bomb') {
        it.fuse = (it.fuse || 0) - dt;
        if (it.fuse <= 0) {
          events.push({ id: uid(), type: 'explosion', text: 'BOOM!', color: '#FF6B00' });
          for (const target of this.players.values()) {
            if (!target.alive) continue;
            if (Math.hypot(target.x - it.x, target.y - it.y) < 120) {
              target.alive = false;
              this.respawnTimers.set(target.id, 2.0);
              if (it.ownerId && it.ownerId !== target.id) {
                const att = this.players.get(it.ownerId);
                if (att) att.score += 50;
              }
            }
          }
          continue;
        }
        nextItems.push(it);
      } else if (it.kind === 'spike') {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        if (Math.abs(it.x) > ARENA_W - it.r) it.vx *= -1;
        if (Math.abs(it.y) > ARENA_H - it.r) it.vy *= -1;
        for (const p of this.players.values()) {
          if (p.alive && Math.hypot(p.x - it.x, p.y - it.y) < it.r + 16) {
            p.alive = false;
            p.score = Math.max(0, p.score - 25);
            this.respawnTimers.set(p.id, 2.0);
            events.push({ id: uid(), type: 'ko', text: 'SPIKED!', color: '#A855F7' });
          }
        }
        nextItems.push(it);
      } else if (it.kind === 'coin') {
        let taken = false;
        for (const p of this.players.values()) {
          if (p.alive && Math.hypot(p.x - it.x, p.y - it.y) < 30) {
            p.coins += 1;
            p.score += 15;
            const prof = this.profiles.get(p.id);
            if (this.teamMode === 'teams' && prof?.team) this.teamScores[prof.team] += 15;
            taken = true;
            break;
          }
        }
        if (!taken) nextItems.push(it);
      } else if (it.kind === 'proj') {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        if (this.mode === '2d_paint_splat') {
          this.paintAt(it.x, it.y, it.ownerId || '');
        }
        if (Math.abs(it.x) > ARENA_W || Math.abs(it.y) > ARENA_H) {
          if ((it.bounces || 0) > 0) {
            it.bounces!--;
            if (Math.abs(it.x) > ARENA_W) it.vx *= -1;
            if (Math.abs(it.y) > ARENA_H) it.vy *= -1;
            nextItems.push(it);
          }
          continue;
        }
        let hit = false;
        for (const target of this.players.values()) {
          if (target.id === it.ownerId || !target.alive) continue;
          if (this.teamMode === 'teams' && this.profiles.get(target.id)?.team === this.profiles.get(it.ownerId || '')?.team) continue;
          if (Math.hypot(target.x - it.x, target.y - it.y) < 26) {
            hit = true;
            const att = it.ownerId ? this.players.get(it.ownerId) : undefined;
            if (this.mode === '2d_freeze_tag') {
              target.frozen = true;
              if (att) att.score += 40;
            } else {
              target.alive = false;
              this.respawnTimers.set(target.id, 1.8);
              if (att) att.score += 50;
            }
            events.push({ id: uid(), type: 'ko', text: 'DIRECT HIT!', color: '#00E5FF' });
            break;
          }
        }
        if (!hit) nextItems.push(it);
      } else {
        nextItems.push(it);
      }
    }
    this.items = nextItems;

    // Survivor points per second in survival modes
    if (this.mode === '2d_zombie_tag') {
      for (const p of this.players.values()) {
        if (!p.infected) p.score += dt * 5;
      }
    }

    return events;
  }

  private paintAt(wx: number, wy: number, playerId: string) {
    const col = Math.floor(((wx + ARENA_W) / (ARENA_W * 2)) * this.paintCols);
    const row = Math.floor(((wy + ARENA_H) / (ARENA_H * 2)) * this.paintRows);
    if (col >= 0 && col < this.paintCols && row >= 0 && row < this.paintRows) {
      const idx = row * this.paintCols + col;
      const prof = this.profiles.get(playerId);
      const val = this.teamMode === 'teams' ? (prof?.team === 'red' ? '#FF2E4C' : '#00E5FF') : prof?.color || '#FFD600';
      if (this.paintCells[idx] !== val) {
        this.paintCells[idx] = val;
        const p = this.players.get(playerId);
        if (p) p.score += 3;
      }
    }
  }

  getSnapshot(): TopDownSnapshot {
    const playersObj: Record<string, TopDownPlayerState> = {};
    for (const [id, p] of this.players.entries()) playersObj[id] = p;
    return {
      mode: this.mode,
      timeRemaining: Math.ceil(this.timeRemaining),
      arenaRadius: this.arenaRadius,
      players: playersObj,
      items: this.items.map((i) => ({
        id: i.id,
        x: i.x,
        y: i.y,
        kind: i.kind,
        r: i.r,
        color: i.color,
        fuse: i.fuse,
      })),
      paintGrid:
        this.mode === '2d_paint_splat'
          ? { cols: this.paintCols, rows: this.paintRows, cells: this.paintCells }
          : undefined,
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
    const title = GAME_CATALOG[this.mode].title;
    const winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} WINS ${title}!`;
    const winnerIds = [top.id];

    sorted.forEach((p, idx) => {
      playerScores[p.id] = Math.max(25, 120 - idx * 20);
      kos[p.id] = 0;
      bankrupts[p.id] = 0;
    });

    return { playerScores, winnerText, kos, bankrupts, winnerIds };
  }
}
