import { Server, Socket } from 'socket.io';
import {
  AccessoryId,
  GAME_CATALOG,
  GameId,
  PlayerProfile,
  RoomSettings,
  RoomState,
  TeamMode,
} from '../../shared/types.js';
import { BaseGame, getDurationSeconds, uid } from './games/BaseGame.js';
import { Arena3DGame } from './games/Arena3DGame.js';
import { BombTagGame } from './games/BombTagGame.js';
import { Platform2DGame } from './games/Platform2DGame.js';
import { Shooter3DGame } from './games/Shooter3DGame.js';
import { SmashBrawlerGame } from './games/SmashBrawlerGame.js';
import { SticksAndStonesGame } from './games/SticksAndStonesGame.js';
import { TopDown2DGame } from './games/TopDown2DGame.js';

const BOT_NAMES = ['WarioBot', 'BonkBot', 'YeetBot', 'SplatBot', 'KaboomBot', 'TurboBot', 'GremlinBot'];
const BOT_COLORS = ['#FF3B5C', '#00E5FF', '#FFD600', '#A855F7', '#22C55E', '#FF6B00', '#EC4899'];
const BOT_ACCESSORIES: AccessoryId[] = ['shades', 'horns', 'mustache', 'halo', 'crown'];

interface RoomInternal {
  state: RoomState;
  activeGame: BaseGame | null;
  interval: NodeJS.Timeout | null;
  lastTick: number;
  lastGameId: GameId | null;
}

export class RoomManager {
  private io: Server;
  private rooms: Map<string, RoomInternal> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    do {
      code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  private broadcastRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.io.to(code).emit('room:state', room.state);
  }

  createRoom(socket: Socket, profile: { name: string; color: string; accessory: AccessoryId }): void {
    this.leaveCurrentRoom(socket);
    const code = this.generateCode();
    const player: PlayerProfile = {
      id: socket.id,
      name: profile.name.trim().slice(0, 14) || 'Player 1',
      color: profile.color || '#FF3B5C',
      accessory: profile.accessory || 'shades',
      isBot: false,
      isHost: true,
      team: null,
      totalPoints: 0,
      roundPoints: 0,
      stats: { kos: 0, bankrupts: 0, wins: 0 },
    };

    const state: RoomState = {
      code,
      phase: 'lobby',
      players: [player],
      settings: {
        totalRounds: 3,
        durationPreset: 'quick',
        teamSetting: 'random',
        enabledGames: ['sticks_and_stones', 'smash_brawler', 'bomb_tag'],
      },
      currentRound: 0,
      currentGame: null,
      currentTeamMode: 'ffa',
      phaseEndsAt: 0,
      roundWinnerText: '',
    };

    this.rooms.set(code, {
      state,
      activeGame: null,
      interval: null,
      lastTick: Date.now(),
      lastGameId: null,
    });
    socket.join(code);
    this.socketToRoom.set(socket.id, code);
    this.broadcastRoom(code);
  }

  joinRoom(socket: Socket, codeRaw: string, profile: { name: string; color: string; accessory: AccessoryId }): void {
    const code = codeRaw.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      socket.emit('room:error', `Room "${code}" not found!`);
      return;
    }
    if (room.state.players.length >= 12) {
      socket.emit('room:error', 'Room is full (max 12 players)!');
      return;
    }

    this.leaveCurrentRoom(socket);
    const player: PlayerProfile = {
      id: socket.id,
      name: profile.name.trim().slice(0, 14) || `Player ${room.state.players.length + 1}`,
      color: profile.color || '#00E5FF',
      accessory: profile.accessory || 'none',
      isBot: false,
      isHost: false,
      team: null,
      totalPoints: 0,
      roundPoints: 0,
      stats: { kos: 0, bankrupts: 0, wins: 0 },
    };

    room.state.players.push(player);
    socket.join(code);
    this.socketToRoom.set(socket.id, code);
    this.broadcastRoom(code);
  }

  leaveCurrentRoom(socket: Socket): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    this.socketToRoom.delete(socket.id);
    socket.leave(code);

    const room = this.rooms.get(code);
    if (!room) return;
    room.state.players = room.state.players.filter((p) => p.id !== socket.id);

    const humans = room.state.players.filter((p) => !p.isBot);
    if (humans.length === 0) {
      if (room.interval) clearInterval(room.interval);
      this.rooms.delete(code);
      return;
    }

    if (!humans.some((p) => p.isHost)) {
      humans[0].isHost = true;
    }
    this.broadcastRoom(code);
  }

  updateProfile(socket: Socket, profile: { name: string; color: string; accessory: AccessoryId }): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const p = room.state.players.find((x) => x.id === socket.id);
    if (!p) return;
    p.name = profile.name.trim().slice(0, 14) || p.name;
    p.color = profile.color || p.color;
    p.accessory = profile.accessory || p.accessory;
    this.broadcastRoom(code);
  }

  updateSettings(socket: Socket, settings: Partial<RoomSettings>): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    room.state.settings = {
      ...room.state.settings,
      ...settings,
    };
    if (room.state.settings.enabledGames.length === 0) {
      room.state.settings.enabledGames = ['sticks_and_stones'];
    }
    this.broadcastRoom(code);
  }

  addBot(socket: Socket): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || room.state.phase !== 'lobby') return;
    const player = room.state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;
    if (room.state.players.length >= 10) return;

    const botIdx = room.state.players.filter((p) => p.isBot).length;
    room.state.players.push({
      id: `bot_${uid()}`,
      name: BOT_NAMES[botIdx % BOT_NAMES.length],
      color: BOT_COLORS[botIdx % BOT_COLORS.length],
      accessory: BOT_ACCESSORIES[botIdx % BOT_ACCESSORIES.length],
      isBot: true,
      isHost: false,
      team: null,
      totalPoints: 0,
      roundPoints: 0,
      stats: { kos: 0, bankrupts: 0, wins: 0 },
    });
    this.broadcastRoom(code);
  }

  removeBot(socket: Socket, botId?: string): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || room.state.phase !== 'lobby') return;
    const player = room.state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    if (botId) {
      room.state.players = room.state.players.filter((p) => p.id !== botId);
    } else {
      const idx = room.state.players.map((p) => p.isBot).lastIndexOf(true);
      if (idx !== -1) room.state.players.splice(idx, 1);
    }
    this.broadcastRoom(code);
  }

  startParty(socket: Socket, forcedGameId?: GameId): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    if (room.state.players.length < 2) {
      // Auto-add 2 fun bots if solo testing!
      this.addBot(socket);
      this.addBot(socket);
    }

    for (const p of room.state.players) {
      p.totalPoints = 0;
      p.roundPoints = 0;
      p.stats = { kos: 0, bankrupts: 0, wins: 0 };
    }
    room.state.currentRound = 0;
    this.startNextRound(code, forcedGameId);
  }

  returnToLobby(socket: Socket): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
    }
    room.activeGame = null;
    room.state.phase = 'lobby';
    room.state.currentGame = null;
    room.state.currentRound = 0;
    this.broadcastRoom(code);
  }

  handleGameInput(socket: Socket, input: any): void {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room?.activeGame || room.state.phase !== 'playing') return;
    room.activeGame.handleInput(socket.id, input);
  }

  private startNextRound(code: string, forcedGameId?: GameId): void {
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
    }

    room.state.currentRound += 1;
    if (!forcedGameId && room.state.currentRound > room.state.settings.totalRounds) {
      room.state.phase = 'podium';
      room.state.currentGame = null;
      this.broadcastRoom(code);
      return;
    }

    // Pick game (avoid repeating back-to-back if multiple enabled)
    const pool = room.state.settings.enabledGames;
    let gameId: GameId = forcedGameId || pool[Math.floor(Math.random() * pool.length)];
    if (!forcedGameId && pool.length > 1 && gameId === room.lastGameId) {
      const others = pool.filter((g) => g !== room.lastGameId);
      gameId = others[Math.floor(Math.random() * others.length)];
    }
    room.lastGameId = gameId;

    // Pick FFA or Teams (randomized or setting-based)
    let teamMode: TeamMode = 'ffa';
    const meta = GAME_CATALOG[gameId];
    if (room.state.settings.teamSetting === 'teams' && meta.allowedTeamModes.includes('teams')) {
      teamMode = 'teams';
    } else if (room.state.settings.teamSetting === 'random' && room.state.players.length >= 2) {
      teamMode = Math.random() < 0.45 ? 'teams' : 'ffa';
    }

    // Assign teams randomly if teams mode
    if (teamMode === 'teams') {
      const shuffled = [...room.state.players].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, idx) => {
        p.team = idx % 2 === 0 ? 'red' : 'blue';
      });
    } else {
      room.state.players.forEach((p) => {
        p.team = null;
      });
    }

    room.state.currentGame = gameId;
    room.state.currentTeamMode = teamMode;
    room.state.phase = 'intro';
    room.state.phaseEndsAt = Date.now() + 3600;
    this.broadcastRoom(code);

    setTimeout(() => {
      this.beginPlayingRound(code, gameId, teamMode);
    }, 3600);
  }

  private beginPlayingRound(code: string, gameId: GameId, teamMode: TeamMode): void {
    const room = this.rooms.get(code);
    if (!room || room.state.phase !== 'intro') return;

    const preset = room.state.settings.durationPreset;
    const engine = GAME_CATALOG[gameId].engine;
    let duration = 90;
    const ctx = {
      players: room.state.players,
      teamMode,
      durationSeconds: duration,
    };

    if (gameId === 'sticks_and_stones') {
      duration = getDurationSeconds(preset, 'sticks');
      ctx.durationSeconds = duration;
      room.activeGame = new SticksAndStonesGame(ctx);
    } else if (gameId === 'smash_brawler') {
      duration = getDurationSeconds(preset, 'smash');
      ctx.durationSeconds = duration;
      room.activeGame = new SmashBrawlerGame(ctx);
    } else if (gameId === 'bomb_tag') {
      duration = getDurationSeconds(preset, 'bomb');
      ctx.durationSeconds = duration;
      room.activeGame = new BombTagGame(ctx);
    } else if (engine === 'topdown2d') {
      duration = getDurationSeconds(preset, 'bomb');
      ctx.durationSeconds = duration;
      room.activeGame = new TopDown2DGame(gameId, ctx);
    } else if (engine === 'platform2d') {
      duration = getDurationSeconds(preset, 'smash');
      ctx.durationSeconds = duration;
      room.activeGame = new Platform2DGame(gameId, ctx);
    } else if (engine === 'arena3d') {
      duration = getDurationSeconds(preset, 'bomb');
      ctx.durationSeconds = duration;
      room.activeGame = new Arena3DGame(gameId, ctx);
    } else {
      duration = getDurationSeconds(preset, 'sticks');
      ctx.durationSeconds = duration;
      room.activeGame = new Shooter3DGame(gameId, ctx);
    }

    room.state.phase = 'playing';
    room.state.phaseEndsAt = Date.now() + duration * 1000;
    room.lastTick = Date.now();
    this.broadcastRoom(code);

    room.interval = setInterval(() => {
      const r = this.rooms.get(code);
      if (!r || !r.activeGame || r.state.phase !== 'playing') return;

      const now = Date.now();
      const dt = Math.min(0.1, (now - r.lastTick) / 1000);
      r.lastTick = now;

      const events = r.activeGame.tick(dt);
      if (events.length > 0) {
        this.io.to(code).emit('game:events', events);
      }
      this.io.to(code).emit('game:snapshot', r.activeGame.getSnapshot());

      if (r.activeGame.isFinished()) {
        this.finishRound(code);
      }
    }, 33); // 30 Hz
  }

  private finishRound(code: string): void {
    const room = this.rooms.get(code);
    if (!room || !room.activeGame) return;

    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
    }

    const res = room.activeGame.getResults();
    room.activeGame = null;

    for (const p of room.state.players) {
      const pts = res.playerScores[p.id] || 0;
      p.roundPoints = pts;
      p.totalPoints += pts;
      p.stats.kos += res.kos[p.id] || 0;
      p.stats.bankrupts += res.bankrupts[p.id] || 0;
      if (res.winnerIds.includes(p.id)) {
        p.stats.wins += 1;
      }
    }

    room.state.roundWinnerText = res.winnerText;
    room.state.phase = 'round_end';
    room.state.phaseEndsAt = Date.now() + 5500;
    this.broadcastRoom(code);

    setTimeout(() => {
      const r = this.rooms.get(code);
      if (!r || r.state.phase !== 'round_end') return;
      this.startNextRound(code);
    }, 5500);
  }
}
