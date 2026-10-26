import { describe, expect, it } from 'vitest';
import { isValidWord, loadDictionary } from './dictionary';
import { buildWordBank, WORD_BANK, WORD_BANK_SOURCE } from './wordBank';

describe('word bank', () => {
  it('stores each word under the right length', () => {
    for (const entry of WORD_BANK) {
      expect(entry.word, `${entry.word} listed under length ${entry.length}`).toHaveLength(entry.length);
      expect(entry.word).toMatch(/^[A-Z]+$/);
    }
  });

  it('has no word listed twice', () => {
    const all = Object.values(WORD_BANK_SOURCE).flatMap((tiers) =>
      Object.values(tiers).flatMap((cats) => Object.values(cats).flatMap((list) => list.split(/\s+/))),
    );
    const dupes = all.filter((w, i) => all.indexOf(w) !== i);
    expect(dupes).toEqual([]);
  });

  it('has enough words in every pool used by the game', () => {
    for (const length of [4, 5, 6, 7, 8]) {
      for (const tier of ['easy', 'medium', 'hard'] as const) {
        const n = WORD_BANK.filter((w) => w.length === length && w.difficulty === tier).length;
        expect(n, `${length}-letter ${tier}`).toBeGreaterThanOrEqual(10);
      }
    }
    // Daily pools (five letters) need to be deep enough to avoid frequent repeats.
    const daily = (tier: string) => WORD_BANK.filter((w) => w.length === 5 && w.difficulty === tier).length;
    expect(daily('easy')).toBeGreaterThanOrEqual(100);
    expect(daily('medium')).toBeGreaterThanOrEqual(50);
    expect(daily('hard')).toBeGreaterThanOrEqual(40);
    expect(daily('veryhard')).toBeGreaterThanOrEqual(30);
  });

  it('carries familiarity metadata that drops with difficulty', () => {
    const avg = (tier: string) => {
      const xs = WORD_BANK.filter((w) => w.difficulty === tier).map((w) => w.commonness);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(avg('easy')).toBeGreaterThan(avg('medium'));
    expect(avg('medium')).toBeGreaterThan(avg('hard'));
    expect(avg('hard')).toBeGreaterThan(avg('veryhard'));
  });

  it('builds an empty bank from empty data without crashing', () => {
    expect(buildWordBank({})).toEqual([]);
  });
});

describe('dictionary', () => {
  it('accepts every answer and common words, rejects gibberish', async () => {
    for (const length of [4, 5, 6, 7, 8]) await loadDictionary(length);
    for (const entry of WORD_BANK) expect(isValidWord(entry.word), entry.word).toBe(true);
    expect(isValidWord('ABOUT')).toBe(true);
    expect(isValidWord('crane')).toBe(true);
    expect(isValidWord('XQZVK')).toBe(false);
    expect(isValidWord('ABCDEFGHIJ')).toBe(false);
  });
});
