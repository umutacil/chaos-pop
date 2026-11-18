export type GameId = 'sticks_and_stones' | 'smash_brawler' | 'bomb_tag';

export type TeamMode = 'ffa' | 'teams';
export type TeamSetting = 'random' | 'ffa' | 'teams';
export type DurationPreset = 'quick' | 'standard' | 'marathon';
export type AccessoryId = 'none' | 'crown' | 'shades' | 'horns' | 'mustache' | 'halo';

export type RoomPhase = 'lobby' | 'intro' | 'playing' | 'round_end' | 'podium';

export interface GameMeta {
  id: GameId;
  title: string;
  dimension: '2D' | '3D';
  tagline: string;
  controlsPC: string;
  controlsMobile: string;
  accent: string;
  allowedTeamModes: TeamMode[];
}

export const GAME_CATALOG: Record<GameId, GameMeta> = {
  sticks_and_stones: {
    id: 'sticks_and_stones',
    title: 'STICKS & STONES',
    dimension: '3D',
    tagline: 'Explosive Crossbow, Ballistic Knife & Score-Bankrupting Tomahawk!',
    controlsPC: 'WASD Move • Mouse Look • L-Click Crossbow • R-Click/E Knife • Q Tomahawk • F Melee • Space Jump',
    controlsMobile: 'Left Stick Move • Drag Look • Crossbow / Knife / Tomahawk / Jump Buttons',
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  smash_brawler: {
    id: 'smash_brawler',
    title: 'SUPER CHAOS SMASH',
    dimension: '2D',
    tagline: 'Rack up % damage and launch your friends into the blast zone!',
    controlsPC: 'A/D Move • W/Space Double Jump • S Drop • J/Z Light • K/X Heavy Smash • L/C Special • Shift Dash',
    controlsMobile: 'Left Pad Move • Jump / Light / Heavy / Special / Dash Buttons',
    accent: '#FFD600',
    allowedTeamModes: ['ffa', 'teams'],
  },
  bomb_tag: {
    id: 'bomb_tag',
    title: 'BOMB SQUAD POTATO',
    dimension: '3D',
    tagline: 'Pass the ticking mega-bomb and shove rivals off the shrinking sky-pad!',
    controlsPC: 'WASD Move • Mouse/Q/E Turn • Space Jump • Shift Sprint • Click/F Shove & Pass',
    controlsMobile: 'Left Stick Move • Drag Turn • Jump / Sprint / Shove Buttons',
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
};

export interface PlayerProfile {
  id: string;
  name: string;
  color: string;
  accessory: AccessoryId;
  isBot: boolean;
  isHost: boolean;
  team: 'red' | 'blue' | null;
  totalPoints: number;
  roundPoints: number;
  stats: {
    kos: number;
    bankrupts: number;
    wins: number;
  };
}

export interface RoomSettings {
  totalRounds: number;
  durationPreset: DurationPreset;
  teamSetting: TeamSetting;
  enabledGames: GameId[];
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  players: PlayerProfile[];
  settings: RoomSettings;
  currentRound: number;
  currentGame: GameId | null;
  currentTeamMode: TeamMode;
  phaseEndsAt: number;
  roundWinnerText: string;
}

export interface GameEvent {
  id: string;
  type: 'ko' | 'bankrupt' | 'explosion' | 'smash' | 'bomb_pass' | 'bomb_boom' | 'announce';
  text: string;
  subtext?: string;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
  targetId?: string;
  attackerId?: string;
}

// ---- STICKS & STONES (3D) ----
export interface SticksPlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  alive: boolean;
  score: number;
  kills: number;
  deaths: number;
  bankrupts: number;
  crossbowCd: number;
  knifeCd: number;
  tomahawkCd: number;
  meleeCd: number;
}

export interface SticksProjectile {
  id: string;
  kind: 'bolt' | 'knife' | 'tomahawk';
  ownerId: string;
  team: 'red' | 'blue' | null;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  stuck: boolean;
  fuse: number;
}

export interface SticksSnapshot {
  timeRemaining: number;
  players: Record<string, SticksPlayerState>;
  projectiles: SticksProjectile[];
  teamScores: { red: number; blue: number };
}

export interface SticksInput {
  moveX: number; // -1..1 (strafe)
  moveZ: number; // -1..1 (forward)
  yaw: number;
  pitch: number;
  jump: boolean;
  fireCrossbow: boolean;
  fireKnife: boolean;
  fireTomahawk: boolean;
  melee: boolean;
}

// ---- SMASH BRAWLER (2D) ----
export interface SmashPlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  damage: number;
  stocks: number;
  kos: number;
  alive: boolean;
  respawnTimer: number;
  jumpsLeft: number;
  attackState: 'none' | 'light' | 'heavy' | 'special' | 'dash';
  attackTimer: number;
  hitstun: number;
  invuln: number;
}

export interface SmashProjectile {
  id: string;
  ownerId: string;
  team: 'red' | 'blue' | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export interface SmashSnapshot {
  timeRemaining: number;
  players: Record<string, SmashPlayerState>;
  projectiles: SmashProjectile[];
  platformOffset: number;
  teamScores: { red: number; blue: number };
}

export interface SmashInput {
  moveX: number; // -1..1
  down: boolean;
  jump: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
  dash: boolean;
}

// ---- BOMB TAG (3D) ----
export interface BombPlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  alive: boolean;
  hasBomb: boolean;
  shoveCd: number;
  score: number;
  stamina: number;
}

export interface BombSnapshot {
  timeRemaining: number;
  bombFuse: number;
  bombMaxFuse: number;
  arenaRadius: number;
  players: Record<string, BombPlayerState>;
  teamScores: { red: number; blue: number };
}

export interface BombInput {
  moveX: number;
  moveZ: number;
  yaw: number;
  jump: boolean;
  sprint: boolean;
  shove: boolean;
}
