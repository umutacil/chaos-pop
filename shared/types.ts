export type GameId =
  | 'sticks_and_stones'
  | 'smash_brawler'
  | 'bomb_tag'
  // 15 new 2D games
  | '2d_laser_dodge'
  | '2d_bomber_chaos'
  | '2d_king_hill'
  | '2d_meteor_shower'
  | '2d_sniper_duel'
  | '2d_sumo_push'
  | '2d_coin_rush'
  | '2d_floor_lava'
  | '2d_spike_ball'
  | '2d_zombie_tag'
  | '2d_rocket_soccer'
  | '2d_tank_mayhem'
  | '2d_grapple_race'
  | '2d_freeze_tag'
  | '2d_paint_splat'
  // 15 new 3D games
  | '3d_hex_fall'
  | '3d_sweeper'
  | '3d_sniper_towers'
  | '3d_bumper_cars'
  | '3d_gold_heist'
  | '3d_boulder_run'
  | '3d_pistolero'
  | '3d_ice_slip'
  | '3d_meteor_arena'
  | '3d_prop_hunt'
  | '3d_laser_tag'
  | '3d_sumo_3d'
  | '3d_rocket_arena'
  | '3d_color_drop'
  | '3d_turbo_tag';

export type TeamMode = 'ffa' | 'teams';
export type TeamSetting = 'random' | 'ffa' | 'teams';
export type DurationPreset = 'quick' | 'standard' | 'marathon';
export type AccessoryId = 'none' | 'crown' | 'shades' | 'horns' | 'mustache' | 'halo';
export type RoomPhase = 'lobby' | 'intro' | 'playing' | 'round_end' | 'podium';

export interface GameMeta {
  id: GameId;
  title: string;
  dimension: '2D' | '3D';
  engine: 'custom' | 'topdown2d' | 'platform2d' | 'arena3d' | 'shooter3d';
  tagline: string;
  controlsPC: string;
  controlsMobile: string;
  accent: string;
  allowedTeamModes: TeamMode[];
}

const PC_TD = 'WASD/Arrows Move • Space/Click Action • Shift Dash';
const MOB_TD = 'Left Stick Move • Action & Dash Buttons';
const PC_PL = 'A/D Move • W/Space Jump • S Drop • J/Click Action • Shift Dash';
const MOB_PL = 'Left Pad Move • Jump / Action / Dash Buttons';
const PC_A3 = 'WASD Move • Mouse/Q/E Turn • Space Jump • Shift Sprint • Click/F Action';
const MOB_A3 = 'Left Stick Move • Drag Turn • Jump / Action Buttons';
const PC_S3 = 'WASD Move • Mouse Look • Space Jump • L-Click Shoot • Shift Dash';
const MOB_S3 = 'Left Stick Move • Drag Look • Shoot / Jump / Dash Buttons';

export const GAME_CATALOG: Record<GameId, GameMeta> = {
  sticks_and_stones: {
    id: 'sticks_and_stones',
    title: 'STICKS & STONES',
    dimension: '3D',
    engine: 'custom',
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
    engine: 'custom',
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
    engine: 'custom',
    tagline: 'Pass the ticking mega-bomb and shove rivals off the shrinking sky-pad!',
    controlsPC: 'WASD Move • Mouse/Q/E Turn • Space Jump • Shift Sprint • Click/F Shove & Pass',
    controlsMobile: 'Left Stick Move • Drag Turn • Jump / Sprint / Shove Buttons',
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  // ---- 15 NEW 2D GAMES ----
  '2d_laser_dodge': {
    id: '2d_laser_dodge',
    title: 'LASER DODGE',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Jump and dash past sweeping death-lasers across the platforms!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_bomber_chaos': {
    id: '2d_bomber_chaos',
    title: 'BOMBER CHAOS',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Drop cartoon bombs, blast crates, and trap friends in chain explosions!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#FF6B00',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_king_hill': {
    id: '2d_king_hill',
    title: 'KING OF THE HILL',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Hold the moving golden zone and bonk rivals off the platform!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#FFD600',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_meteor_shower': {
    id: '2d_meteor_shower',
    title: 'METEOR SHOWER',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Dodge raining flaming meteors while snatching falling star points!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#FF6B00',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_sniper_duel': {
    id: '2d_sniper_duel',
    title: 'RICOCHET SNIPER',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Fire high-speed railgun bolts across platforms—1 hit = instant KO!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_sumo_push': {
    id: '2d_sumo_push',
    title: 'SUMO PUSH',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Bump and dash-slam your friends out of the slippery sumo ring!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#EC4899',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_coin_rush': {
    id: '2d_coin_rush',
    title: 'GREED COIN RUSH',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Grab spawning gold coins and bonk rivals to make them drop theirs!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#FFD600',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_floor_lava': {
    id: '2d_floor_lava',
    title: 'FLOOR IS LAVA',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Surging magma waves! Stay on the high platforms and shove rivals down!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_spike_ball': {
    id: '2d_spike_ball',
    title: 'SPIKE BALLS',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Survive bouncing giant spike balls—or dash-shove friends into them!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#A855F7',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_zombie_tag': {
    id: '2d_zombie_tag',
    title: 'ZOMBIE INFECT',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Run from the glowing green Zombie—or infect everyone before time runs out!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#22C55E',
    allowedTeamModes: ['ffa'],
  },
  '2d_rocket_soccer': {
    id: '2d_rocket_soccer',
    title: 'CHAOS SOCCER',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Side-view turbo soccer with a giant bouncy ball and explosive goals!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#22C55E',
    allowedTeamModes: ['teams', 'ffa'],
  },
  '2d_tank_mayhem': {
    id: '2d_tank_mayhem',
    title: 'TANK MAYHEM',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Top-down cartoon tanks firing bouncy ricochet shells!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_grapple_race': {
    id: '2d_grapple_race',
    title: 'SKY CHECKPOINTS',
    dimension: '2D',
    engine: 'platform2d',
    tagline: 'Dash and double-jump across sky islands to tag glowing checkpoints!',
    controlsPC: PC_PL,
    controlsMobile: MOB_PL,
    accent: '#A855F7',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '2d_freeze_tag': {
    id: '2d_freeze_tag',
    title: 'FREEZE TAG',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Freeze runners with frost blasts—touch frozen allies to thaw them!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#00E5FF',
    allowedTeamModes: ['teams', 'ffa'],
  },
  '2d_paint_splat': {
    id: '2d_paint_splat',
    title: 'PAINT SPLAT WAR',
    dimension: '2D',
    engine: 'topdown2d',
    tagline: 'Paint the arena in your color! Most painted turf wins!',
    controlsPC: PC_TD,
    controlsMobile: MOB_TD,
    accent: '#EC4899',
    allowedTeamModes: ['ffa', 'teams'],
  },
  // ---- 15 NEW 3D GAMES ----
  '3d_hex_fall': {
    id: '3d_hex_fall',
    title: 'HEX-A-FALL',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Tiles vanish under your feet! Keep moving and cut off your friends!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_sweeper': {
    id: '3d_sweeper',
    title: 'SWEEPER WIPEOUT',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Jump over spinning giant sweeper beams as they speed up!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_sniper_towers': {
    id: '3d_sniper_towers',
    title: 'SNIPER TOWERS',
    dimension: '3D',
    engine: 'shooter3d',
    tagline: '3D high-tower railgun duels—1 shot, 1 hilarious ragdoll launch!',
    controlsPC: PC_S3,
    controlsMobile: MOB_S3,
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_bumper_cars': {
    id: '3d_bumper_cars',
    title: 'TURBO BUMPER CARS',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'High-speed 3D bumper cars on a sky platform—ram rivals into orbit!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FFD600',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_gold_heist': {
    id: '3d_gold_heist',
    title: 'CROWN HEIST 3D',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Grab the Giant Crown to rack up points while everyone hunts you!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FFD600',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_boulder_run': {
    id: '3d_boulder_run',
    title: 'BOULDER CHAOS',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Giant boulders roll across the 3D arena—dodge or shove rivals in front!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FF6B00',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_pistolero': {
    id: '3d_pistolero',
    title: 'PISTOLERO DUEL',
    dimension: '3D',
    engine: 'shooter3d',
    tagline: 'Fast-draw 3D revolver showdown with high-noon damage & dodge dashes!',
    controlsPC: PC_S3,
    controlsMobile: MOB_S3,
    accent: '#FF6B00',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_ice_slip': {
    id: '3d_ice_slip',
    title: 'SLIPPERY ICE RINK',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Zero friction! Slide, jump, and shove friends off the shrinking ice!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#00E5FF',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_meteor_arena': {
    id: '3d_meteor_arena',
    title: 'METEOR ARENA 3D',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Red warning zones drop explosive meteors—stay on the platform!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_prop_hunt': {
    id: '3d_prop_hunt',
    title: 'RADAR BLITZ 3D',
    dimension: '3D',
    engine: 'shooter3d',
    tagline: 'Fast-paced 3D arena tag with shock-blasters & turbo speed dashes!',
    controlsPC: PC_S3,
    controlsMobile: MOB_S3,
    accent: '#A855F7',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_laser_tag': {
    id: '3d_laser_tag',
    title: 'NEON LASER TAG',
    dimension: '3D',
    engine: 'shooter3d',
    tagline: 'Rapid-fire neon laser blasters in a glowing 3D pillar arena!',
    controlsPC: PC_S3,
    controlsMobile: MOB_S3,
    accent: '#EC4899',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_sumo_3d': {
    id: '3d_sumo_3d',
    title: 'SUMO DOHYO 3D',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Heavyweight 3D sumo slam! Charge and knock everyone off the ring!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#FF3B5C',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_rocket_arena': {
    id: '3d_rocket_arena',
    title: 'ROCKET ARENA 3D',
    dimension: '3D',
    engine: 'shooter3d',
    tagline: 'Explosive rocket launchers with huge splash knockback & rocket jumps!',
    controlsPC: PC_S3,
    controlsMobile: MOB_S3,
    accent: '#FF6B00',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_color_drop': {
    id: '3d_color_drop',
    title: 'COLOR DROP 3D',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Stand on the announced color tile before the wrong tiles fall away!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#22C55E',
    allowedTeamModes: ['ffa', 'teams'],
  },
  '3d_turbo_tag': {
    id: '3d_turbo_tag',
    title: 'TURBO TAG 3D',
    dimension: '3D',
    engine: 'arena3d',
    tagline: 'Super-speed 3D dash arena—tag rivals to steal points & launch them!',
    controlsPC: PC_A3,
    controlsMobile: MOB_A3,
    accent: '#A855F7',
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
  moveX: number;
  moveZ: number;
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
  moveX: number;
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

// ---- GENERIC TOP-DOWN 2D ENGINE (8 games) ----
export interface TopDownPlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  alive: boolean;
  frozen: boolean;
  infected: boolean;
  score: number;
  coins: number;
  cd: number;
  dashCd: number;
}

export interface TopDownSnapshot {
  mode: GameId;
  timeRemaining: number;
  arenaRadius: number;
  players: Record<string, TopDownPlayerState>;
  items: { id: string; x: number; y: number; kind: 'coin' | 'crate' | 'bomb' | 'spike' | 'proj'; r: number; color: string; fuse?: number }[];
  paintGrid?: { cols: number; rows: number; cells: (string | null)[] };
  teamScores: { red: number; blue: number };
}

export interface TopDownInput {
  moveX: number;
  moveY: number;
  action: boolean;
  dash: boolean;
}

// ---- GENERIC PLATFORM 2D ENGINE (7 games) ----
export interface PlatformPlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  alive: boolean;
  score: number;
  jumpsLeft: number;
  cd: number;
}

export interface PlatformSnapshot {
  mode: GameId;
  timeRemaining: number;
  lavaY: number;
  zone: { x: number; y: number; r: number } | null;
  ball: { x: number; y: number; vx: number; vy: number; r: number } | null;
  lasers: { y: number; x1: number; x2: number; active: boolean }[];
  hazards: { id: string; x: number; y: number; r: number; kind: 'meteor' | 'star' | 'bolt' | 'checkpoint'; color: string }[];
  players: Record<string, PlatformPlayerState>;
  teamScores: { red: number; blue: number };
}

export interface PlatformInput {
  moveX: number;
  down: boolean;
  jump: boolean;
  action: boolean;
  dash: boolean;
}

// ---- GENERIC ARENA 3D ENGINE (10 games) ----
export interface Arena3DPlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  alive: boolean;
  hasCrown: boolean;
  score: number;
  cd: number;
}

export interface Arena3DSnapshot {
  mode: GameId;
  timeRemaining: number;
  arenaRadius: number;
  sweeperAngle: number;
  targetColor: string | null;
  dropPhase: number; // 0 = safe, 1 = warning, 2 = dropped
  tiles: { id: string; x: number; z: number; color: string; alive: boolean }[];
  hazards: { id: string; x: number; y: number; z: number; r: number; kind: 'boulder' | 'meteor' | 'warning' }[];
  crownPos: { x: number; y: number; z: number } | null;
  players: Record<string, Arena3DPlayerState>;
  teamScores: { red: number; blue: number };
}

export interface Arena3DInput {
  moveX: number;
  moveZ: number;
  yaw: number;
  jump: boolean;
  sprint: boolean;
  action: boolean;
}

// ---- GENERIC SHOOTER 3D ENGINE (5 games) ----
export interface Shooter3DPlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  alive: boolean;
  score: number;
  kills: number;
  cd: number;
}

export interface Shooter3DSnapshot {
  mode: GameId;
  timeRemaining: number;
  players: Record<string, Shooter3DPlayerState>;
  projectiles: { id: string; x: number; y: number; z: number; color: string; r: number }[];
  teamScores: { red: number; blue: number };
}

export interface Shooter3DInput {
  moveX: number;
  moveZ: number;
  yaw: number;
  pitch: number;
  jump: boolean;
  shoot: boolean;
  dash: boolean;
}
