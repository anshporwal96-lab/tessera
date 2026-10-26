import { daysBetween, parseDateKey, utcWeekday } from './dates';
import { seededShuffle } from './rng';
import type { Difficulty, WordEntry } from './types';
import { EmptyWordPoolError, getPool } from './wordSelection';

/** Puzzle #1 is on this UTC date. */
export const DAILY_EPOCH = '2025-01-01';
export const DAILY_WORD_LENGTH = 5;
export const DAILY_MAX_GUESSES = 6;
/** Changing the salt reshuffles every future answer — treat it as a schedule version. */
const SCHEDULE_SALT = 'tessera-daily-v1';
/** Minimum number of same-tier puzzles between two uses of the same word. */
const RECENT_GAP = 20;

/** Indexed by UTC weekday (0 = Sunday). */
export const WEEKLY_SCHEDULE: readonly Difficulty[] = [
  'veryhard', // Sunday
  'easy', // Monday
  'easy', // Tuesday
  'medium', // Wednesday
  'easy', // Thursday
  'medium', // Friday
  'hard', // Saturday
];

const TIER_FALLBACK: Record<Difficulty, Difficulty[]> = {
  easy: ['easy', 'medium', 'hard', 'veryhard'],
  medium: ['medium', 'easy', 'hard', 'veryhard'],
  hard: ['hard', 'veryhard', 'medium', 'easy'],
  veryhard: ['veryhard', 'hard', 'medium', 'easy'],
};

export interface DailyAnswer {
  dateKey: string;
  puzzleNumber: number;
  /** The tier the schedule asked for. */
  difficulty: Difficulty;
  word: string;
  category: string;
}

export function getDailyDifficulty(dateKey: string): Difficulty {
  return WEEKLY_SCHEDULE[utcWeekday(dateKey)];
}

export function getPuzzleNumber(dateKey: string): number {
  return daysBetween(DAILY_EPOCH, dateKey) + 1;
}

/** How many puzzles of `difficulty` were scheduled strictly before `dayIndex` (0 = epoch). */
export function countPriorDays(dayIndex: number, difficulty: Difficulty): number {
  const epochWeekday = utcWeekday(DAILY_EPOCH);
  const perWeek = WEEKLY_SCHEDULE.filter((d) => d === difficulty).length;
  const fullWeeks = Math.floor(dayIndex / 7);
  let count = fullWeeks * perWeek;
  for (let r = 0; r < dayIndex % 7; r++) {
    if (WEEKLY_SCHEDULE[(epochWeekday + r) % 7] === difficulty) count++;
  }
  return count;
}

/**
 * The order in which a pool's words are used during one pass ("cycle") through
 * it. Each cycle is a fresh seeded shuffle, with the words used at the end of
 * the previous cycle pushed to the back so answers never repeat close together.
 */
function cycleOrder(pool: string[], difficulty: Difficulty, cycle: number): string[] {
  let order = seededShuffle(pool, `${SCHEDULE_SALT}:${difficulty}:0`);
  const gap = Math.min(RECENT_GAP, Math.floor(pool.length / 2));
  for (let c = 1; c <= cycle; c++) {
    const recent = new Set(order.slice(order.length - gap));
    const next = seededShuffle(pool, `${SCHEDULE_SALT}:${difficulty}:${c}`);
    order = [...next.filter((w) => !recent.has(w)), ...next.filter((w) => recent.has(w))];
  }
  return order;
}

/**
 * Deterministic answer for a UTC date. Same input → same word on every device,
 * and the word depends only on the date and the bank, never on load time.
 */
export function getDailyAnswer(dateKey: string, bank: readonly WordEntry[]): DailyAnswer {
  parseDateKey(dateKey); // validates format
  const dayIndex = daysBetween(DAILY_EPOCH, dateKey);
  if (dayIndex < 0) throw new Error(`No daily puzzle before ${DAILY_EPOCH}`);

  const difficulty = getDailyDifficulty(dateKey);
  const tier = TIER_FALLBACK[difficulty].find(
    (t) => getPool(bank, DAILY_WORD_LENGTH, [t]).length > 0,
  );
  if (!tier) throw new EmptyWordPoolError(DAILY_WORD_LENGTH, difficulty);

  const entries = getPool(bank, DAILY_WORD_LENGTH, [tier]);
  // Sort so the schedule does not depend on the order words appear in the source.
  const pool = entries.map((e) => e.word).sort();
  const nth = countPriorDays(dayIndex, difficulty);
  const cycle = Math.floor(nth / pool.length);
  const word = cycleOrder(pool, difficulty, cycle)[nth % pool.length];
  const entry = entries.find((e) => e.word === word)!;

  return {
    dateKey,
    puzzleNumber: dayIndex + 1,
    difficulty,
    word,
    category: entry.category,
  };
}
