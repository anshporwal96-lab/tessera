import { addDays } from './dates';

export interface GameStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = wins that took i + 1 guesses. */
  distribution: number[];
  /** Sum of guesses over won games, for the average. */
  winningGuessTotal: number;
  /** Daily only: last date a result was recorded, and last date won. */
  lastPlayedDate?: string;
  lastWinDate?: string;
}

export const DISTRIBUTION_SIZE = 7;

export function emptyStats(): GameStats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array(DISTRIBUTION_SIZE).fill(0),
    winningGuessTotal: 0,
  };
}

function withResult(stats: GameStats, won: boolean, guesses: number): GameStats {
  const distribution = stats.distribution.slice();
  while (distribution.length < DISTRIBUTION_SIZE) distribution.push(0);
  if (won) {
    const idx = Math.min(Math.max(guesses, 1), DISTRIBUTION_SIZE) - 1;
    distribution[idx] += 1;
  }
  return {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    winningGuessTotal: stats.winningGuessTotal + (won ? guesses : 0),
    distribution,
  };
}

/** Unlimited mode: the streak is simply consecutive wins. */
export function recordGame(stats: GameStats, won: boolean, guesses: number): GameStats {
  const next = withResult(stats, won, guesses);
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  return { ...next, currentStreak, maxStreak: Math.max(stats.maxStreak, currentStreak) };
}

/**
 * Daily mode: one result per date. A win extends the streak only if the
 * previous day was also won; any missed day or loss resets it.
 */
export function recordDailyGame(
  stats: GameStats,
  dateKey: string,
  won: boolean,
  guesses: number,
): GameStats {
  if (stats.lastPlayedDate === dateKey) return stats;
  const next = withResult(stats, won, guesses);
  const continues = stats.lastWinDate === addDays(dateKey, -1);
  const currentStreak = won ? (continues ? stats.currentStreak + 1 : 1) : 0;
  return {
    ...next,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastPlayedDate: dateKey,
    lastWinDate: won ? dateKey : stats.lastWinDate,
  };
}

/** The streak as it stands today — a streak lapses once a whole day is missed. */
export function activeDailyStreak(stats: GameStats, todayKey: string): number {
  if (!stats.lastWinDate) return 0;
  if (stats.lastWinDate === todayKey || stats.lastWinDate === addDays(todayKey, -1)) {
    return stats.currentStreak;
  }
  return 0;
}

export function winRate(stats: GameStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

export function averageGuesses(stats: GameStats): number | null {
  return stats.wins === 0 ? null : Math.round((stats.winningGuessTotal / stats.wins) * 10) / 10;
}

export function isValidStats(value: unknown): value is GameStats {
  if (!value || typeof value !== 'object') return false;
  const s = value as GameStats;
  return (
    Number.isFinite(s.played) &&
    Number.isFinite(s.wins) &&
    Number.isFinite(s.currentStreak) &&
    Number.isFinite(s.maxStreak) &&
    Number.isFinite(s.winningGuessTotal) &&
    Array.isArray(s.distribution)
  );
}
