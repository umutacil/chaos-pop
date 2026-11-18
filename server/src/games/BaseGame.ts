import { GameEvent, PlayerProfile, TeamMode } from '../../../shared/types.js';

export interface GameResult {
  playerScores: Record<string, number>; // round points earned
  winnerText: string;
  kos: Record<string, number>;
  bankrupts: Record<string, number>;
  winnerIds: string[];
}

export interface BaseGame {
  tick(dt: number): GameEvent[];
  handleInput(playerId: string, input: any): void;
  getSnapshot(): any;
  isFinished(): boolean;
  getResults(): GameResult;
}

export function getDurationSeconds(preset: 'quick' | 'standard' | 'marathon', game: 'sticks' | 'smash' | 'bomb'): number {
  if (preset === 'quick') {
    return game === 'bomb' ? 75 : 90;
  }
  if (preset === 'standard') {
    return game === 'bomb' ? 150 : 210; // 2.5 - 3.5 min
  }
  // marathon: up to ~8-10 min
  return game === 'bomb' ? 420 : 540; // 7 - 9 min
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type EmitEventFn = (ev: GameEvent) => void;

export interface GameInitContext {
  players: PlayerProfile[];
  teamMode: TeamMode;
  durationSeconds: number;
}
