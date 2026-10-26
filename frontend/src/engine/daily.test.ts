import { describe, expect, it } from 'vitest';
import { WORD_BANK } from '../data/wordBank';
import { countPriorDays, DAILY_EPOCH, getDailyAnswer, getDailyDifficulty, getPuzzleNumber, WEEKLY_SCHEDULE } from './daily';
import { addDays, daysBetween, formatCountdown, msUntilNextUtcMidnight, toUtcDateKey } from './dates';
import type { WordEntry } from './types';

describe('dates', () => {
  it('uses UTC calendar days regardless of local offset', () => {
    // 23:59:59 UTC on 27 Oct is still the 27th, even where local time is the 28th.
    expect(toUtcDateKey(new Date('2026-10-27T23:59:59.999Z'))).toBe('2026-10-27');
    expect(toUtcDateKey(new Date('2026-10-28T00:00:00.000Z'))).toBe('2026-10-28');
    // A timestamp written with a +05:30 offset that is still the 27th in UTC.
    expect(toUtcDateKey(new Date('2026-10-28T05:00:00+05:30'))).toBe('2026-10-27');
  });

  it('counts down to the next UTC midnight', () => {
    expect(msUntilNextUtcMidnight(new Date('2026-10-27T23:59:59.000Z'))).toBe(1000);
    expect(msUntilNextUtcMidnight(new Date('2026-10-27T00:00:00.000Z'))).toBe(86_400_000);
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
  });

  it('handles month, year and leap-day boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2025-01-01', '2026-01-01')).toBe(365);
  });
});

describe('daily schedule', () => {
  it('follows the weekday difficulty schedule', () => {
    // 2026-10-26 is a Monday.
    const week = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
    expect(week.map(getDailyDifficulty)).toEqual(['easy', 'easy', 'medium', 'easy', 'medium', 'hard', 'veryhard']);
  });

  it('draws Saturday answers from the hard pool and Sunday answers from the very hard pool', () => {
    for (let i = 0; i < 52; i++) {
      const saturday = addDays('2026-10-31', i * 7);
      const sunday = addDays('2026-11-01', i * 7);
      const sat = getDailyAnswer(saturday, WORD_BANK);
      const sun = getDailyAnswer(sunday, WORD_BANK);
      expect(WORD_BANK.find((w) => w.word === sat.word)?.difficulty).toBe('hard');
      expect(WORD_BANK.find((w) => w.word === sun.word)?.difficulty).toBe('veryhard');
    }
  });

  it('keeps every daily answer five letters, even on hard days', () => {
    for (let i = 0; i < 400; i++) {
      expect(getDailyAnswer(addDays('2026-01-01', i), WORD_BANK).word).toHaveLength(5);
    }
  });

  it('is deterministic: the same date always gives the same answer', () => {
    const a = getDailyAnswer('2026-10-27', WORD_BANK);
    const b = getDailyAnswer('2026-10-27', WORD_BANK);
    expect(a).toEqual(b);
  });

  it('does not depend on the order of the word bank (same answer in every browser build)', () => {
    const shuffled = [...WORD_BANK].reverse();
    for (let i = 0; i < 60; i++) {
      const key = addDays('2026-10-01', i);
      expect(getDailyAnswer(key, shuffled).word).toBe(getDailyAnswer(key, WORD_BANK).word);
    }
  });

  it('numbers puzzles from the epoch', () => {
    expect(getPuzzleNumber(DAILY_EPOCH)).toBe(1);
    expect(getPuzzleNumber(addDays(DAILY_EPOCH, 1))).toBe(2);
    expect(getDailyAnswer('2026-10-27', WORD_BANK).puzzleNumber).toBe(daysBetween(DAILY_EPOCH, '2026-10-27') + 1);
  });

  it('changes the answer across midnight UTC', () => {
    const before = getDailyAnswer(toUtcDateKey(new Date('2026-10-27T23:59:59Z')), WORD_BANK);
    const after = getDailyAnswer(toUtcDateKey(new Date('2026-10-28T00:00:00Z')), WORD_BANK);
    expect(before.dateKey).toBe('2026-10-27');
    expect(after.dateKey).toBe('2026-10-28');
    expect(before.word).not.toBe(after.word);
  });

  it('counts prior same-difficulty days correctly', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'veryhard'] as const) {
      let brute = 0;
      for (let day = 0; day < 200; day++) {
        expect(countPriorDays(day, difficulty)).toBe(brute);
        if (getDailyDifficulty(addDays(DAILY_EPOCH, day)) === difficulty) brute++;
      }
    }
  });

  it('never repeats an answer within a pool cycle, and keeps repeats far apart across cycles', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'veryhard'] as const) {
      const poolSize = WORD_BANK.filter((w) => w.length === 5 && w.difficulty === difficulty).length;
      const perWeek = WEEKLY_SCHEDULE.filter((d) => d === difficulty).length;
      const lastSeen = new Map<string, number>();
      let nth = 0;
      // ~3 full cycles of this pool.
      const days = Math.ceil((poolSize * 3 * 7) / perWeek);
      for (let day = 0; day < days; day++) {
        const key = addDays(DAILY_EPOCH, day);
        if (getDailyDifficulty(key) !== difficulty) continue;
        const { word } = getDailyAnswer(key, WORD_BANK);
        const prev = lastSeen.get(word);
        if (prev !== undefined) {
          expect(nth - prev).toBeGreaterThanOrEqual(Math.min(20, Math.floor(poolSize / 2)));
        }
        lastSeen.set(word, nth);
        nth++;
      }
      // Within the first cycle every word appears exactly once.
      expect(lastSeen.size).toBe(poolSize);
    }
  });

  it('rejects dates before the first puzzle and malformed dates', () => {
    expect(() => getDailyAnswer(addDays(DAILY_EPOCH, -1), WORD_BANK)).toThrow();
    expect(() => getDailyAnswer('2026-13-01', WORD_BANK)).toThrow();
    expect(() => getDailyAnswer('not-a-date', WORD_BANK)).toThrow();
  });

  it('falls back to a neighbouring tier when a pool is empty', () => {
    const noVeryHard = WORD_BANK.filter((w) => w.difficulty !== 'veryhard');
    const sunday = getDailyAnswer('2026-11-01', noVeryHard);
    expect(sunday.difficulty).toBe('veryhard');
    expect(noVeryHard.find((w) => w.word === sunday.word)?.difficulty).toBe('hard');
  });

  it('throws a clear error when the bank has no five-letter words at all', () => {
    expect(() => getDailyAnswer('2026-10-27', [])).toThrow(/No .* words of length 5/);
    const onlySix: WordEntry[] = [{ word: 'GARDEN', length: 6, difficulty: 'easy', commonness: 5, category: 'x' }];
    expect(() => getDailyAnswer('2026-10-27', onlySix)).toThrow();
  });
});
