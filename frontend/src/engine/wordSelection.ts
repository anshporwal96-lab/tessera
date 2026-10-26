import type { Difficulty, UnlimitedDifficulty, WordEntry } from './types';

export class EmptyWordPoolError extends Error {
  constructor(length: number, difficulty: string) {
    super(`No ${difficulty} words of length ${length} are available in the word bank.`);
    this.name = 'EmptyWordPoolError';
  }
}

/** Which bank tiers feed each Unlimited difficulty. */
export const UNLIMITED_TIERS: Record<UnlimitedDifficulty, Difficulty[]> = {
  easy: ['easy'],
  medium: ['medium'],
  hard: ['hard', 'veryhard'],
};

export function getPool(
  bank: readonly WordEntry[],
  length: number,
  tiers: readonly Difficulty[],
): WordEntry[] {
  return bank.filter((w) => w.length === length && tiers.includes(w.difficulty));
}

export function supportedLengths(bank: readonly WordEntry[]): number[] {
  return [...new Set(bank.map((w) => w.length))].sort((a, b) => a - b);
}

/**
 * Picks a random answer for Unlimited play, avoiding recently used words when
 * the pool is large enough to do so.
 */
export function pickRandomWord(
  bank: readonly WordEntry[],
  length: number,
  difficulty: UnlimitedDifficulty,
  recent: readonly string[] = [],
  rand: () => number = Math.random,
): WordEntry {
  const pool = getPool(bank, length, UNLIMITED_TIERS[difficulty]);
  if (pool.length === 0) throw new EmptyWordPoolError(length, difficulty);
  const recentSet = new Set(recent.map((w) => w.toUpperCase()));
  const fresh = pool.filter((w) => !recentSet.has(w.word));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(rand() * candidates.length) % candidates.length];
}

/** Maximum guesses allowed for a given word length. */
export function maxGuessesFor(length: number): number {
  return length <= 5 ? 6 : 7;
}
