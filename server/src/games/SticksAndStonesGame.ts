import {
  GameEvent,
  PlayerProfile,
  SticksInput,
  SticksPlayerState,
  SticksProjectile,
  SticksSnapshot,
  TeamMode,
} from '../../../shared/types.js';
import { BaseGame, GameInitContext, GameResult, uid } from './BaseGame.js';

interface BoxObstacle {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

interface JumpPad {
  x: number;
  z: number;
  radius: number;
  boost: number;
}

const ARENA_HALF = 26;

const OBSTACLES: BoxObstacle[] = [
  // Center raised platform
  { x: 0, y: 1.0, z: 0, w: 7, h: 2, d: 7 },
  // Four symmetrical cover pillars
  { x: -11, y: 2.0, z: -11, w: 3, h: 4, d: 3 },
  { x: 11, y: 2.0, z: -11, w: 3, h: 4, d: 3 },
  { x: -11, y: 2.0, z: 11, w: 3, h: 4, d: 3 },
  { x: 11, y: 2.0, z: 11, w: 3, h: 4, d: 3 },
  // Side crates
  { x: -16, y: 1.0, z: 0, w: 3, h: 2, d: 5 },
  { x: 16, y: 1.0, z: 0, w: 3, h: 2, d: 5 },
  { x: 0, y: 1.0, z: -16, w: 5, h: 2, d: 3 },
  { x: 0, y: 1.0, z: 16, w: 5, h: 2, d: 3 },
];

const JUMP_PADS: JumpPad[] = [
  { x: -18, z: -18, radius: 2.2, boost: 18 },
  { x: 18, z: -18, radius: 2.2, boost: 18 },
  { x: -18, z: 18, radius: 2.2, boost: 18 },
  { x: 18, z: 18, radius: 2.2, boost: 18 },
];

const SPAWN_POINTS = [
  { x: -20, z: 0 },
  { x: 20, z: 0 },
  { x: 0, z: -20 },
  { x: 0, z: 20 },
  { x: -15, z: -15 },
  { x: 15, z: 15 },
  { x: -15, z: 15 },
  { x: 15, z: -15 },
];

export class SticksAndStonesGame implements BaseGame {
  private profiles: Map<string, PlayerProfile> = new Map();
  private players: Map<string, SticksPlayerState> = new Map();
  private inputs: Map<string, SticksInput> = new Map();
  private projectiles: SticksProjectile[] = [];
  private respawnTimers: Map<string, number> = new Map();
  private teamMode: TeamMode;
  private timeRemaining: number;
  private teamScores = { red: 0, blue: 0 };
  private botTimers: Map<string, number> = new Map();

  constructor(ctx: GameInitContext) {
    this.teamMode = ctx.teamMode;
    this.timeRemaining = ctx.durationSeconds;

    ctx.players.forEach((p, idx) => {
      this.profiles.set(p.id, p);
      const sp = SPAWN_POINTS[idx % SPAWN_POINTS.length];
      this.players.set(p.id, {
        id: p.id,
        x: sp.x,
        y: 1.5,
        z: sp.z,
        yaw: Math.atan2(-sp.x, -sp.z),
        pitch: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: 100,
        alive: true,
        score: 0,
        kills: 0,
        deaths: 0,
        bankrupts: 0,
        crossbowCd: 0,
        knifeCd: 0,
        tomahawkCd: 0,
        meleeCd: 0,
      });
      this.inputs.set(p.id, {
        moveX: 0,
        moveZ: 0,
        yaw: 0,
        pitch: 0,
        jump: false,
        fireCrossbow: false,
        fireKnife: false,
        fireTomahawk: false,
        melee: false,
      });
      this.botTimers.set(p.id, Math.random() * 1.5);
    });
  }

  handleInput(playerId: string, input: SticksInput): void {
    if (!this.players.has(playerId)) return;
    this.inputs.set(playerId, {
      moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
      moveZ: Math.max(-1, Math.min(1, Number(input.moveZ) || 0)),
      yaw: Number(input.yaw) || 0,
      pitch: Math.max(-1.4, Math.min(1.4, Number(input.pitch) || 0)),
      jump: Boolean(input.jump),
      fireCrossbow: Boolean(input.fireCrossbow),
      fireKnife: Boolean(input.fireKnife),
      fireTomahawk: Boolean(input.fireTomahawk),
      melee: Boolean(input.melee),
    });
  }

  private updateBotInput(p: SticksPlayerState, dt: number): void {
    const profile = this.profiles.get(p.id);
    if (!profile?.isBot || !p.alive) return;

    let timer = (this.botTimers.get(p.id) || 0) - dt;
    // Find nearest enemy
    let nearest: SticksPlayerState | null = null;
    let bestDist = Infinity;
    for (const other of this.players.values()) {
      if (other.id === p.id || !other.alive) continue;
      if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === profile.team) continue;
      const d = Math.hypot(other.x - p.x, other.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        nearest = other;
      }
    }

    const inp: SticksInput = {
      moveX: 0,
      moveZ: 0,
      yaw: p.yaw,
      pitch: 0,
      jump: Math.random() < 0.02,
      fireCrossbow: false,
      fireKnife: false,
      fireTomahawk: false,
      melee: false,
    };

    if (nearest) {
      const dx = nearest.x - p.x;
      const dz = nearest.z - p.z;
      const dy = nearest.y - p.y;
      const targetYaw = Math.atan2(-dx, -dz);
      inp.yaw = targetYaw + Math.sin(this.timeRemaining * 2 + p.x) * 0.08;
      inp.pitch = Math.atan2(dy, Math.max(1, bestDist));

      if (bestDist > 8) {
        inp.moveZ = 1;
        inp.moveX = Math.sin(this.timeRemaining * 1.7 + p.z) > 0 ? 0.6 : -0.6;
      } else {
        inp.moveX = Math.cos(this.timeRemaining * 2.2) > 0 ? 0.9 : -0.9;
        inp.moveZ = bestDist < 3 ? -0.5 : 0.2;
      }

      if (timer <= 0) {
        timer = 0.65 + Math.random() * 0.7;
        if (bestDist < 3.0 && p.meleeCd <= 0) {
          inp.melee = true;
        } else if (p.tomahawkCd <= 0 && Math.random() < 0.28) {
          inp.fireTomahawk = true;
        } else if (p.knifeCd <= 0 && Math.random() < 0.45) {
          inp.fireKnife = true;
        } else if (p.crossbowCd <= 0) {
          inp.fireCrossbow = true;
        }
      }
    }

    this.botTimers.set(p.id, timer);
    this.inputs.set(p.id, inp);
  }

  tick(dt: number): GameEvent[] {
    const events: GameEvent[] = [];
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    // 1. Update players & bots
    for (const p of this.players.values()) {
      if (!p.alive) {
        const rt = (this.respawnTimers.get(p.id) || 0) - dt;
        if (rt <= 0) {
          const sp = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
          p.x = sp.x + (Math.random() - 0.5) * 3;
          p.y = 2.0;
          p.z = sp.z + (Math.random() - 0.5) * 3;
          p.vx = 0;
          p.vy = 0;
          p.vz = 0;
          p.hp = 100;
          p.alive = true;
        } else {
          this.respawnTimers.set(p.id, rt);
        }
        continue;
      }

      this.updateBotInput(p, dt);
      const inp = this.inputs.get(p.id)!;

      p.crossbowCd = Math.max(0, p.crossbowCd - dt);
      p.knifeCd = Math.max(0, p.knifeCd - dt);
      p.tomahawkCd = Math.max(0, p.tomahawkCd - dt);
      p.meleeCd = Math.max(0, p.meleeCd - dt);

      p.yaw = inp.yaw;
      p.pitch = inp.pitch;

      // Movement relative to yaw
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const forwardX = -sin;
      const forwardZ = -cos;
      const rightX = cos;
      const rightZ = -sin;

      const speed = 11.5;
      let wishX = forwardX * inp.moveZ + rightX * inp.moveX;
      let wishZ = forwardZ * inp.moveZ + rightZ * inp.moveX;
      const len = Math.hypot(wishX, wishZ);
      if (len > 1) {
        wishX /= len;
        wishZ /= len;
      }

      p.vx = wishX * speed;
      p.vz = wishZ * speed;
      p.vy -= 28 * dt; // gravity

      // Check ground / obstacle top
      let groundY = 0;
      for (const ob of OBSTACLES) {
        if (
          Math.abs(p.x - ob.x) <= ob.w / 2 + 0.45 &&
          Math.abs(p.z - ob.z) <= ob.d / 2 + 0.45 &&
          p.y >= ob.y + ob.h / 2 - 0.3
        ) {
          groundY = Math.max(groundY, ob.y + ob.h / 2);
        }
      }

      const onGround = p.y <= groundY + 0.05 && p.vy <= 0;
      if (onGround && inp.jump) {
        p.vy = 11.5;
      }

      // Jump pads
      for (const jp of JUMP_PADS) {
        if (p.y < 1.0 && Math.hypot(p.x - jp.x, p.z - jp.z) < jp.radius) {
          p.vy = jp.boost;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.y < groundY) {
        p.y = groundY;
        p.vy = 0;
      }

      // Obstacle side collision
      for (const ob of OBSTACLES) {
        if (p.y < ob.y + ob.h / 2 - 0.25) {
          const halfW = ob.w / 2 + 0.55;
          const halfD = ob.d / 2 + 0.55;
          const dx = p.x - ob.x;
          const dz = p.z - ob.z;
          if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
            const penX = halfW - Math.abs(dx);
            const penZ = halfD - Math.abs(dz);
            if (penX < penZ) {
              p.x += dx > 0 ? penX : -penX;
            } else {
              p.z += dz > 0 ? penZ : -penZ;
            }
          }
        }
      }

      // Arena bounds
      p.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, p.x));
      p.z = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, p.z));

      // Weapons!
      const dirX = -Math.sin(p.yaw) * Math.cos(p.pitch);
      const dirY = Math.sin(p.pitch);
      const dirZ = -Math.cos(p.yaw) * Math.cos(p.pitch);
      const team = this.profiles.get(p.id)?.team ?? null;

      if (inp.fireCrossbow && p.crossbowCd <= 0) {
        p.crossbowCd = 0.9;
        this.projectiles.push({
          id: uid(),
          kind: 'bolt',
          ownerId: p.id,
          team,
          x: p.x + dirX * 0.9,
          y: p.y + 1.35 + dirY * 0.9,
          z: p.z + dirZ * 0.9,
          vx: dirX * 42,
          vy: dirY * 42 + 1.5,
          vz: dirZ * 42,
          stuck: false,
          fuse: 0.45,
        });
      }

      if (inp.fireKnife && p.knifeCd <= 0) {
        p.knifeCd = 0.7;
        this.projectiles.push({
          id: uid(),
          kind: 'knife',
          ownerId: p.id,
          team,
          x: p.x + dirX * 0.9,
          y: p.y + 1.35 + dirY * 0.9,
          z: p.z + dirZ * 0.9,
          vx: dirX * 36,
          vy: dirY * 36 + 1.0,
          vz: dirZ * 36,
          stuck: false,
          fuse: 2.0,
        });
      }

      if (inp.fireTomahawk && p.tomahawkCd <= 0) {
        p.tomahawkCd = 1.6;
        this.projectiles.push({
          id: uid(),
          kind: 'tomahawk',
          ownerId: p.id,
          team,
          x: p.x + dirX * 0.9,
          y: p.y + 1.45 + dirY * 0.9,
          z: p.z + dirZ * 0.9,
          vx: dirX * 26,
          vy: dirY * 26 + 5.5,
          vz: dirZ * 26,
          stuck: false,
          fuse: 3.0,
        });
      }

      if (inp.melee && p.meleeCd <= 0) {
        p.meleeCd = 0.65;
        for (const other of this.players.values()) {
          if (other.id === p.id || !other.alive) continue;
          if (this.teamMode === 'teams' && this.profiles.get(other.id)?.team === team) continue;
          const dist = Math.hypot(other.x - p.x, other.y - p.y, other.z - p.z);
          if (dist < 2.8) {
            this.damagePlayer(other, p, 100, 'knife', events);
          }
        }
      }
    }

    // 2. Update projectiles
    const nextProjectiles: SticksProjectile[] = [];
    for (const proj of this.projectiles) {
      if (proj.stuck) {
        proj.fuse -= dt;
        if (proj.fuse <= 0) {
          this.explodeBolt(proj, events);
          continue;
        }
        nextProjectiles.push(proj);
        continue;
      }

      // Gravity
      const grav = proj.kind === 'tomahawk' ? 22 : proj.kind === 'knife' ? 5 : 4;
      proj.vy -= grav * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.z += proj.vz * dt;
      proj.fuse -= dt;

      // Check player hit
      let hitPlayer: SticksPlayerState | null = null;
      for (const target of this.players.values()) {
        if (target.id === proj.ownerId || !target.alive) continue;
        if (this.teamMode === 'teams' && this.profiles.get(target.id)?.team === proj.team) continue;
        const dx = target.x - proj.x;
        const dy = (target.y + 1.0) - proj.y;
        const dz = target.z - proj.z;
        if (Math.hypot(dx, dz) < 0.85 && Math.abs(dy) < 1.1) {
          hitPlayer = target;
          break;
        }
      }

      const attacker = this.players.get(proj.ownerId);
      if (hitPlayer && attacker) {
        if (proj.kind === 'tomahawk') {
          this.damagePlayer(hitPlayer, attacker, 100, 'tomahawk', events);
          continue; // tomahawk consumed
        } else if (proj.kind === 'knife') {
          this.damagePlayer(hitPlayer, attacker, 100, 'knife', events);
          continue;
        } else {
          // Direct bolt hit -> instant boom!
          this.explodeBolt(proj, events, hitPlayer.id);
          continue;
        }
      }

      // Check world/obstacle hit
      let hitWorld = proj.y <= 0.1 || Math.abs(proj.x) > ARENA_HALF || Math.abs(proj.z) > ARENA_HALF;
      if (!hitWorld) {
        for (const ob of OBSTACLES) {
          if (
            Math.abs(proj.x - ob.x) <= ob.w / 2 &&
            Math.abs(proj.z - ob.z) <= ob.d / 2 &&
            proj.y >= ob.y - ob.h / 2 &&
            proj.y <= ob.y + ob.h / 2
          ) {
            hitWorld = true;
            break;
          }
        }
      }

      if (hitWorld) {
        if (proj.kind === 'bolt') {
          proj.stuck = true;
          proj.vx = 0;
          proj.vy = 0;
          proj.vz = 0;
          proj.fuse = 0.45;
          nextProjectiles.push(proj);
        }
        continue; // knives/tomahawks despawn on wall hit
      }

      if (proj.fuse > 0) {
        nextProjectiles.push(proj);
      }
    }
    this.projectiles = nextProjectiles;

    return events;
  }

  private explodeBolt(proj: SticksProjectile, events: GameEvent[], directHitId?: string): void {
    events.push({
      id: uid(),
      type: 'explosion',
      text: 'BOOM!',
      color: '#FF6B00',
      x: proj.x,
      y: proj.y,
      z: proj.z,
    });

    const attacker = this.players.get(proj.ownerId);
    for (const target of this.players.values()) {
      if (!target.alive) continue;
      if (
        target.id !== proj.ownerId &&
        this.teamMode === 'teams' &&
        this.profiles.get(target.id)?.team === proj.team
      ) {
        continue;
      }
      const dist = Math.hypot(target.x - proj.x, target.y + 0.9 - proj.y, target.z - proj.z);
      if (target.id === directHitId || dist < 4.2) {
        const dmg = target.id === directHitId ? 100 : Math.round(100 * (1 - dist / 4.8));
        if (attacker && dmg > 0) {
          this.damagePlayer(target, attacker, dmg, 'bolt', events);
        }
      }
    }
  }

  private damagePlayer(
    victim: SticksPlayerState,
    attacker: SticksPlayerState,
    dmg: number,
    weapon: 'bolt' | 'knife' | 'tomahawk',
    events: GameEvent[]
  ): void {
    victim.hp -= dmg;
    if (victim.hp > 0) return;

    victim.alive = false;
    victim.hp = 0;
    victim.deaths += 1;
    this.respawnTimers.set(victim.id, 2.2);

    const attackerProfile = this.profiles.get(attacker.id);
    const victimProfile = this.profiles.get(victim.id);

    if (victim.id !== attacker.id) {
      attacker.kills += 1;
      const pts = weapon === 'tomahawk' ? 150 : 100;
      attacker.score += pts;

      if (this.teamMode === 'teams' && attackerProfile?.team) {
        this.teamScores[attackerProfile.team] += pts;
      }

      if (weapon === 'tomahawk') {
        const lost = victim.score;
        victim.score = 0;
        attacker.bankrupts += 1;
        events.push({
          id: uid(),
          type: 'bankrupt',
          text: 'BANKRUPT!!',
          subtext: `${attackerProfile?.name} tomahawked ${victimProfile?.name} (-${lost} pts)!`,
          color: '#FF0055',
          targetId: victim.id,
          attackerId: attacker.id,
        });
      } else {
        events.push({
          id: uid(),
          type: 'ko',
          text: weapon === 'bolt' ? 'KABOOM!' : 'SLICED!',
          subtext: `${attackerProfile?.name} KO'd ${victimProfile?.name}`,
          color: '#FFD600',
          targetId: victim.id,
          attackerId: attacker.id,
        });
      }
    }
  }

  getSnapshot(): SticksSnapshot {
    const playersObj: Record<string, SticksPlayerState> = {};
    for (const [id, p] of this.players.entries()) {
      playersObj[id] = p;
    }
    return {
      timeRemaining: Math.ceil(this.timeRemaining),
      players: playersObj,
      projectiles: this.projectiles,
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
    let winnerIds: string[] = [];
    let winnerText = '';

    for (const p of this.players.values()) {
      kos[p.id] = p.kills;
      bankrupts[p.id] = p.bankrupts;
    }

    if (this.teamMode === 'teams') {
      const redWins = this.teamScores.red >= this.teamScores.blue;
      const winTeam = redWins ? 'red' : 'blue';
      winnerText = redWins ? 'RED TEAM DOMINATES!' : 'BLUE TEAM DOMINATES!';
      for (const p of this.players.values()) {
        const prof = this.profiles.get(p.id);
        const isWin = prof?.team === winTeam;
        playerScores[p.id] = isWin ? 100 + Math.round(p.score / 20) : Math.round(p.score / 25);
        if (isWin) winnerIds.push(p.id);
      }
    } else {
      const sorted = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
      const top = sorted[0];
      winnerText = `${this.profiles.get(top.id)?.name || 'Someone'} WINS STICKS & STONES!`;
      sorted.forEach((p, idx) => {
        playerScores[p.id] = Math.max(20, 120 - idx * 25);
        if (idx === 0) winnerIds.push(p.id);
      });
    }

    return { playerScores, winnerText, kos, bankrupts, winnerIds };
  }
}
