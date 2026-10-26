import { describe, expect, it } from 'vitest';
import { activeDailyStreak, averageGuesses, emptyStats, recordDailyGame, recordGame, winRate } from './stats';

describe('daily stats', () => {
  it('extends the streak on consecutive daily wins', () => {
    let s = emptyStats();
    s = recordDailyGame(s, '2026-10-25', true, 3);
    s = recordDailyGame(s, '2026-10-26', true, 4);
    s = recordDailyGame(s, '2026-10-27', true, 2);
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(3);
    expect(s.distribution.slice(0, 4)).toEqual([0, 1, 1, 1]);
  });

  it('resets the streak after a loss or a missed day', () => {
    let s = recordDailyGame(emptyStats(), '2026-10-20', true, 3);
    s = recordDailyGame(s, '2026-10-21', false, 6);
    expect(s.currentStreak).toBe(0);
    s = recordDailyGame(s, '2026-10-22', true, 3);
    s = recordDailyGame(s, '2026-10-24', true, 3); // skipped the 23rd
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
  });

  it('records only one result per date', () => {
    let s = recordDailyGame(emptyStats(), '2026-10-27', true, 3);
    s = recordDailyGame(s, '2026-10-27', true, 1);
    expect(s.played).toBe(1);
  });

  it('shows a lapsed streak as zero', () => {
    const s = recordDailyGame(emptyStats(), '2026-10-25', true, 3);
    expect(activeDailyStreak(s, '2026-10-25')).toBe(1);
    expect(activeDailyStreak(s, '2026-10-26')).toBe(1); // today not played yet
    expect(activeDailyStreak(s, '2026-10-27')).toBe(0);
  });
});

describe('unlimited stats', () => {
  it('computes win rate and average guesses', () => {
    let s = emptyStats();
    s = recordGame(s, true, 3);
    s = recordGame(s, true, 5);
    s = recordGame(s, false, 6);
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(winRate(s)).toBe(67);
    expect(averageGuesses(s)).toBe(4);
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(2);
  });

  it('handles empty stats', () => {
    expect(winRate(emptyStats())).toBe(0);
    expect(averageGuesses(emptyStats())).toBeNull();
  });
});
