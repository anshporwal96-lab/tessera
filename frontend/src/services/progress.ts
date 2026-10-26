import { isValidGameState, type GameState } from '../engine/game';
import { DEFAULT_CONFIG, isValidMatch, type MatchState, type UnlimitedConfig } from '../engine/rounds';
import { emptyStats, isValidStats, type GameStats } from '../engine/stats';
import type { Difficulty } from '../engine/types';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from './storage';

// ---- Daily -----------------------------------------------------------------

export interface DailyProgress {
  dateKey: string;
  puzzleNumber: number;
  difficulty: Difficulty;
  game: GameState;
  /** Known only once the game is over. */
  answer?: string;
  /** Whether this day's result has been added to the stats. */
  recorded: boolean;
}

function isDailyProgress(v: unknown): v is DailyProgress {
  if (!v || typeof v !== 'object') return false;
  const p = v as DailyProgress;
  return typeof p.dateKey === 'string' && isValidGameState(p.game) && typeof p.recorded === 'boolean';
}

/** Returns saved progress only if it belongs to `dateKey`; yesterday's board is discarded. */
export function loadDailyProgress(dateKey: string): DailyProgress | null {
  const p = readJson(STORAGE_KEYS.dailyProgress, isDailyProgress);
  return p && p.dateKey === dateKey ? p : null;
}

export function saveDailyProgress(progress: DailyProgress): void {
  writeJson(STORAGE_KEYS.dailyProgress, progress);
}

export function loadDailyStats(): GameStats {
  return readJson(STORAGE_KEYS.dailyStats, isValidStats) ?? emptyStats();
}

export function saveDailyStats(stats: GameStats): void {
  writeJson(STORAGE_KEYS.dailyStats, stats);
}

export type DailyStatus = 'not-started' | 'in-progress' | 'won' | 'lost';

export function dailyStatus(progress: DailyProgress | null): DailyStatus {
  if (!progress || progress.game.guesses.length === 0) return 'not-started';
  if (progress.game.status === 'playing') return 'in-progress';
  return progress.game.status;
}

// ---- Unlimited -------------------------------------------------------------

function isConfig(v: unknown): v is UnlimitedConfig {
  if (!v || typeof v !== 'object') return false;
  const c = v as UnlimitedConfig;
  return Number.isInteger(c.length) && ['easy', 'medium', 'hard'].includes(c.difficulty) && Number.isInteger(c.rounds);
}

export function loadUnlimitedConfig(): UnlimitedConfig {
  return readJson(STORAGE_KEYS.unlimitedConfig, isConfig) ?? DEFAULT_CONFIG;
}

export function saveUnlimitedConfig(config: UnlimitedConfig): void {
  writeJson(STORAGE_KEYS.unlimitedConfig, config);
}

export function loadMatch(): MatchState | null {
  return readJson(STORAGE_KEYS.unlimitedMatch, isValidMatch);
}

export function saveMatch(match: MatchState): void {
  writeJson(STORAGE_KEYS.unlimitedMatch, match);
}

export function clearMatch(): void {
  removeKey(STORAGE_KEYS.unlimitedMatch);
}

/** Lifetime Unlimited stats (localStorage). */
export function loadUnlimitedStats(): GameStats {
  return readJson(STORAGE_KEYS.unlimitedStats, isValidStats) ?? emptyStats();
}

export function saveUnlimitedStats(stats: GameStats): void {
  writeJson(STORAGE_KEYS.unlimitedStats, stats);
}

/** Stats for this browser session only (sessionStorage — cleared when the tab closes). */
export function loadSessionStats(): GameStats {
  return readJson(STORAGE_KEYS.unlimitedSession, isValidStats, 'session') ?? emptyStats();
}

export function saveSessionStats(stats: GameStats): void {
  writeJson(STORAGE_KEYS.unlimitedSession, stats, 'session');
}

const RECENT_LIMIT = 40;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

export function loadRecentAnswers(): string[] {
  return readJson(STORAGE_KEYS.unlimitedRecent, isStringArray) ?? [];
}

export function rememberAnswer(word: string): void {
  const recent = [word, ...loadRecentAnswers().filter((w) => w !== word)].slice(0, RECENT_LIMIT);
  writeJson(STORAGE_KEYS.unlimitedRecent, recent);
}
