import {
  GameEvent,
  PlayerProfile,
  SmashInput,
  SmashPlayerState,
  SmashProjectile,
  SmashSnapshot,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface Platform {
  x1: number;
  x2: number;
  y: number;
  solid: boolean;
}

const BLAST_X = 820;
const BLAST_TOP = 580;
const BLAST_BOTTOM = -480;

export class SmashBrawlerGame implements BaseGame {
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, SmashPlayerState> = new Map();
  private inputs: Map<string, SmashInput> = new Map();
  private prevJump: Map<string, boolean> = new Map();
  private lastHitBy: Map<string, { id: string; time: number }> = new Map();
  private projectiles: SmashProjectile[] = [];
  private teamMode: TeamMode;
  private timeRemaining: number;
  private elapsed = 0;
  private teamScores = { red: 0, blue: 0 };
  private botTimers: Map<string, number> = new Map();
  private finishedEarly = false;

  constructor(ctx: GameInitContext) {
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;
    const startStocks = ctx.durationSeconds <= 100 ? 3 : ctx.durationSeconds <= 240 ? 5 : 8;

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const spawnX = -260 + (idx % 6) * 100;
      this.players.set(p.id, {
        id: p.id,
        x: spawnX,
        y: 160,
        vx: 0,
        vy: 0,
        facing: spawnX < 0 ? 1 : -1,
        damage: 0,
        stocks: startStocks,
        kos: 0,
        alive: true,
        respawnTimer: 0,
        jumpsLeft: 2,
        attackState: 'none',
        attackTimer: 0,
        hitstun: 0,
        invuln: 1.5,
      });
      this.inputs.set(p.id, {
        moveX: 0,
        down: false,
        jump: false,
        light: false,
        heavy: false,
        special: false,
        dash: false,
      });
      this.prevJump.set(p.id, false);
      this.botTimers.set(p.id, Math.random() * 0.6);
    });
  }

  private getPlatforms(): Platform[] {
    const offset = Math.sin(this.elapsed * 1.3) * 110;
    return [
      { x1: -360, x2: 360, y: -40, solid: true },
      { x1: -300, x2: -130, y: 95, solid: false },
      { x1: 130, x2: 300, y: 95, solid: false },
      { x1: -85 + offset, x2: 85 + offset, y: 215, solid: false },
    ];
  }

  handleInput(playerId: string, input: SmashInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      down: Boolean(input.down),
      jump: Boolean(input.jump),
      light: Boolean(input.light),
      heavy: Boolean(input.heavy),
      special: Boolean(input.special),
      dash: Boolean(input.dash),
    });
  }

  private updateBotInput(p: SmashPlayerState, dt: number): void {
    const prof = this.profiles.get(p.id);
    if (!prof?.isBot || !p.alive) return;

    let timer = (this.botTimers.get(p.id) || 0) - dt;
    let nearest: SmashPlayerState | null = null;
    let bestDist = Infinity;

    for (const other of this.players.values()) {
      if (other.id === p.id || !other.alive) continue;
      if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === prof.team) continue;
      const d = Math.hypot(other.x - p.x, other.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = other;
      }
    }

    const inp: SmashInput = {
      moveX: 0,
      down: false,
      jump: false,
      light: false,
      heavy: false,
      special: false,
      dash: false,
    };

    // Recover if off-stage!
    if (Math.abs(p.x) > 330 || p.y < -60) {
      inp.moveX = p.x > 0 ? -1 : 1;
      if (p.vy < 80 && Math.random() < 0.25) inp.jump = true;
      if (p.y < -120 && p.jumpsLeft === 0) inp.special = true;
    } else if (nearest) {
      const dx = nearest.x - p.x;
      const dy = nearest.y - p.y;
      inp.moveX = dx > 25 ? 1 : dx < -25 ? -1 : 0;
      if (dy > 60 && Math.random() < 0.1) inp.jump = true;
      if (dy < -70 && Math.random() < 0.08) inp.down = true;

      if (timer <= 0) {
        timer = 0.28 + Math.random() * 0.4;
        if (bestDist < 85) {
          if (nearest.damage > 85 || Math.random() < 0.35) inp.heavy = true;
          else inp.light = true;
        } else if (bestDist < 320 && Math.abs(dy) < 60 && Math.random() < 0.4) {
          inp.special = true;
        }
      }
    }

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, inp);
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    const platforms = this.getPlatforms();

    for (const p of this.players.values()) {
      if (!p.alive) {
        if (p.stocks <= 0) continue;
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.alive = true;
          p.x = (Math.random() - 0.5) * 200;
          p.y = 280;
          p.vx = 0;
          p.vy = 0;
          p.damage = 0;
          p.jumpsLeft = 2;
          p.hitstun = 0;
          p.invuln = 2.0;
          p.attackState = 'none';
        }
        continue;
      }

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;
      const wasJump = this.prevJump.get(p.id) || false;
      const jumpPressed = inp.jump && !wasJump;
      this.prevJump.set(p.id, inp.jump);

      p.invuln = Math.max(0, p.invuln - dt);
      p.hitstun = Math.max(0, p.hitstun - dt);
      if (p.attackTimer > 0) {
        p.attackTimer -= dt;
        if (p.attackTimer <= 0) p.attackState = 'none';
      }

      const canAct = p.hitstun <= 0 && p.attackState === 'none';

      if (p.hitstun <= 0) {
        if (inp.moveX !== 0) {
          p.facing = inp.moveX > 0 ? 1 : -1;
        }
        const targetVx = inp.moveX * 340;
        p.vx += (targetVx - p.vx) * Math.min(1, dt * 14);
      } else {
        p.vx *= Math.pow(0.85, dt * 10);
      }

      // Gravity & fast fall
      const grav = inp.down && p.vy < 120 ? 2200 : 1450;
      p.vy -= grav * dt;
      p.vy = Math.max(-900, p.vy);

      // Jump / Double jump
      if (jumpPressed && p.hitstun <= 0 && p.jumpsLeft > 0) {
        p.vy = 560;
        p.jumpsLeft -= 1;
      }

      // Attacks
      if (canAct) {
        if (inp.dash) {
          p.attackState = 'dash';
          p.attackTimer = 0.2;
          p.vx = p.facing * 680;
          p.invuln = Math.max(p.invuln, 0.22);
        } else if (inp.heavy) {
          p.attackState = 'heavy';
          p.attackTimer = 0.36;
          this.performMeleeHit(p, 85, 26, 460, 380, events);
        } else if (inp.light) {
          p.attackState = 'light';
          p.attackTimer = 0.22;
          this.performMeleeHit(p, 68, 13, 250, 220, events);
        } else if (inp.special) {
          p.attackState = 'special';
          p.attackTimer = 0.34;
          p.vy = Math.max(p.vy, 490); // Up-B style recovery boost!
          const prof = this.profiles.get(p.id);
          this.projectiles.push({
            id: uid(),
            ownerId: p.id,
            team: prof?.team ?? null,
            x: p.x + p.facing * 35,
            y: p.y + 24,
            vx: p.facing * 620,
            vy: 0,
            color: prof?.color || '#FFD600',
          });
        }
      }

      const prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Platform collisions (feet at p.y)
      if (p.vy <= 0) {
        for (const plat of platforms) {
          if (p.x >= plat.x1 - 16 && p.x <= plat.x2 + 16) {
            if (!plat.solid && inp.down) continue;
            if (prevY >= plat.y - 6 && p.y <= plat.y + 4) {
              p.y = plat.y;
              p.vy = 0;
              p.jumpsLeft = 2;
              break;
            }
          }
        }
      }

      // Blast zones check!
      if (Math.abs(p.x) > BLAST_X || p.y < BLAST_BOTTOM || p.y > BLAST_TOP) {
        p.alive = false;
        p.stocks -= 1;
        p.respawnTimer = 1.6;

        const last = this.lastHitBy.get(p.id);
        let killerProf: PlayerProfile | undefined;
        if (last && this.elapsed - last.time < 6.0) {
          const killer = this.players.get(last.id);
          if (killer) {
            killer.kos += 1;
            killerProf = this.profiles.get(killer.id);
            if (this.teamMode === 'teams' && killerProf?.team) {
              this.teamScores[killerProf.team] += 1;
            }
          }
        }
        const vicProf = this.profiles.get(p.id);
        events.push({
          id: uid(),
          type: 'ko',
          text: p.stocks <= 0 ? 'ELIMINATED!' : 'RING OUT!!',
          subtext: killerProf
            ? `${killerProf.name} launched ${vicProf?.name}!`
            : `${vicProf?.name} fell into the abyss!`,
          color: '#FF3B5C',
          targetId: p.id,
          attackerId: killerProf?.id,
        });
      }
    }

    // Update projectiles
    const nextProj: SmashProjectile[] = [];
    for (const proj of this.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      let hit = false;
      for (const target of this.players.values()) {
        if (target.id === proj.ownerId || !target.alive || target.invuln > 0) continue;
        if (this.teamMode === 'teams' && this.profiles.get(target.id)?.team === proj.team) continue;
        if (Math.abs(target.x - proj.x) < 34 && Math.abs(target.y + 24 - proj.y) < 36) {
          const attacker = this.players.get(proj.ownerId);
          if (attacker) {
            this.applyHit(target, attacker, 14, Math.sign(proj.vx) * 280, 260, events);
          }
          hit = true;
          break;
        }
      }
      if (!hit && Math.abs(proj.x) < BLAST_X) {
        nextProj.push(proj);
      }
    }
    this.projectiles = nextProj;

    // Check early finish (1 player or 1 team remaining)
    if (this.teamMode === 'teams') {
      const redAlive = Array.from(this.players.values()).some(
        (p) => this.profiles.get(p.id)?.team === 'red' && (p.stocks > 0 || p.alive)
      );
      const blueAlive = Array.from(this.players.values()).some(
        (p) => this.profiles.get(p.id)?.team === 'blue' && (p.stocks > 0 || p.alive)
      );
      if (!redAlive || !blueAlive) this.finishedEarly = true;
    } else {
      const aliveCount = Array.from(this.players.values()).filter((p) => p.stocks > 0 || p.alive).length;
      if (this.players.size > 1 && aliveCount <= 1) this.finishedEarly = true;
    }

    return events;
  }

  private performMeleeHit(
    attacker: SmashPlayerState,
    reach: number,
    dmg: number,
    kbX: number,
    kbY: number,
    events: GameEvent[]
  ): void {
    const prof = this.profiles.get(attacker.id);
    for (const target of this.players.values()) {
      if (target.id === attacker.id || !target.alive || target.invuln > 0) continue;
      if (this.teamMode === 'teams' && this.profiles.get(target.id)?.team === prof?.team) continue;
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      if (dx * attacker.facing >= -15 && Math.abs(dx) <= reach && Math.abs(dy) <= 64) {
        this.applyHit(target, attacker, dmg, attacker.facing * kbX, kbY, events);
      }
    }
  }

  private applyHit(
    target: SmashPlayerState,
    attacker: SmashPlayerState,
    dmg: number,
    baseKbX: number,
    baseKbY: number,
    events: GameEvent[]
  ): void {
    target.damage += dmg;
    const scale = 1 + target.damage / 75;
    target.vx = baseKbX * scale;
    target.vy = baseKbY * scale;
    target.hitstun = Math.min(0.85, 0.22 + target.damage / 350);
    this.lastHitBy.set(target.id, { id: attacker.id, time: this.elapsed });

    if (dmg >= 22 || target.damage >= 110) {
      events.push({
        id: uid(),
        type: 'smash',
        text: target.damage >= 120 ? 'SMASH!!' : 'WHACK!',
        color: '#FFD600',
        x: target.x,
        y: target.y,
        targetId: target.id,
        attackerId: attacker.id,
      });
    }
  }

  getSnapshot(): SmashSnapshot {
    const playersObj: Record<string, SmashPlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }
    return {
      timeRemaining: Math.ceil(this.timeRemaining),
      players: playersObj,
      projectiles: this.projectiles,
      platformOffset: Math.sin(this.elapsed * 1.3) * 110,
      teamScores: this.teamScores,
    };
  }

  isFinished(): boolean {
    return this.timeRemaining <= 0 || this.finishedEarly;
  }

  getResults(): GameResult {
    const playerScores: Record<string, number> = {};
    const kos: Record<string, number> = {};
    const bankrupts: Record<string, number> = {};
    const winnerIds: string[] = [];
    let winnerText = '';

    for (const p of this.players.values()) {
      kos[p.id] = p.kos;
      bankrupts[p.id] = 0;
    }

    if (this.teamMode === 'teams') {
      const redStocks = Array.from(this.players.values())
        .filter((p) => this.profiles.get(p.id)?.team === 'red')
        .reduce((acc, p) => acc + p.stocks, 0);
      const blueStocks = Array.from(this.players.values())
        .filter((p) => this.profiles.get(p.id)?.team === 'blue')
        .reduce((acc, p) => acc + p.stocks, 0);
      const winTeam =
        redStocks !== blueStocks
          ? redStocks > blueStocks
            ? 'red'
            : 'blue'
          : this.teamScores.red >= this.teamScores.blue
            ? 'red'
            : 'blue';
      winnerText = winTeam === 'red' ? 'RED TEAM SMASHES THE STAGE!' : 'BLUE TEAM SMASHES THE STAGE!';
      for (const p of this.players.values()) {
        const isWin = this.profiles.get(p.id)?.team === winTeam;
        playerScores[p.id] = (isWin ? 100 : 30) + p.kos * 20;
        if (isWin) winnerIds.push(p.id);
      }
    } else {
      const sorted = Array.from(this.players.values()).sort((a, b) => {
        if (b.stocks !== a.stocks) return b.stocks - a.stocks;
        if (b.kos !== a.kos) return b.kos - a.kos;
        return a.damage - b.damage;
      });
      const top = sorted[0];
      winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} IS THE SMASH CHAMPION!`;
      sorted.forEach((p, idx) => {
        playerScores[p.id] = Math.max(25, 120 - idx * 25) + p.kos * 15;
        if (idx === 0) winnerIds.push(p.id);
      });
    }

    return { playerScores, winnerText, kos, bankrupts, winnerIds };
  }
}
