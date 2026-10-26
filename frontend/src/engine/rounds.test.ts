import { describe, expect, it } from 'vitest';
import { WORD_BANK } from '../data/wordBank';
import { evaluateGuess } from './evaluate';
import { addLetter, applyEvaluation } from './game';
import { createMatch, isMatchOver, isValidMatch, matchScore, recordRound, startNextRound, type MatchState } from './rounds';
import { buildShareText } from './share';
import { EmptyWordPoolError, pickRandomWord, UNLIMITED_TIERS } from './wordSelection';

function solve(match: MatchState, guess = match.answer): MatchState {
  const typed = [...guess].reduce(addLetter, match.game);
  return { ...match, game: applyEvaluation(typed, guess, evaluateGuess(guess, match.answer)) };
}

describe('word selection', () => {
  it('picks words of the requested length and tier', () => {
    for (const length of [4, 5, 6, 7, 8]) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const w = pickRandomWord(WORD_BANK, length, difficulty);
        expect(w.length).toBe(length);
        expect(w.word).toHaveLength(length);
        expect(UNLIMITED_TIERS[difficulty]).toContain(w.difficulty);
      }
    }
  });

  it('avoids recently used words when possible', () => {
    const pool = WORD_BANK.filter((w) => w.length === 4 && w.difficulty === 'easy').map((w) => w.word);
    const recent = pool.slice(1);
    for (let i = 0; i < 20; i++) {
      expect(pickRandomWord(WORD_BANK, 4, 'easy', recent).word).toBe(pool[0]);
    }
  });

  it('throws a clear error for an empty or missing pool', () => {
    expect(() => pickRandomWord([], 5, 'easy')).toThrow(EmptyWordPoolError);
    expect(() => pickRandomWord(WORD_BANK, 12, 'easy')).toThrow(/length 12/);
  });
});

describe('unlimited rounds', () => {
  it('plays through a fixed number of rounds', () => {
    let m = createMatch(WORD_BANK, { length: 5, difficulty: 'easy', rounds: 3 });
    for (let round = 1; round <= 3; round++) {
      expect(m.round).toBe(round);
      m = recordRound(solve(m));
      if (round < 3) {
        expect(isMatchOver(m)).toBe(false);
        m = startNextRound(WORD_BANK, m, [m.answer]);
      }
    }
    expect(isMatchOver(m)).toBe(true);
    expect(matchScore(m)).toEqual({ wins: 3, played: 3 });
    expect(() => startNextRound(WORD_BANK, m)).toThrow();
  });

  it('gives a new word each round', () => {
    let m = createMatch(WORD_BANK, { length: 6, difficulty: 'medium', rounds: 0 });
    const seen = new Set([m.answer]);
    for (let i = 0; i < 10; i++) {
      m = startNextRound(WORD_BANK, recordRound(solve(m)), [...seen]);
      seen.add(m.answer);
    }
    expect(seen.size).toBe(11);
    expect(isMatchOver(m)).toBe(false); // endless
  });

  it('cannot advance before the round is finished, and records a round once', () => {
    const m = createMatch(WORD_BANK, { length: 5, difficulty: 'easy', rounds: 3 });
    expect(() => startNextRound(WORD_BANK, m)).toThrow();
    const done = recordRound(solve(m));
    expect(recordRound(done)).toBe(done);
  });

  it('restarting creates a fresh match from round 1', () => {
    const m = recordRound(solve(createMatch(WORD_BANK, { length: 5, difficulty: 'hard', rounds: 5 })));
    const restarted = createMatch(WORD_BANK, m.config, [m.answer]);
    expect(restarted.round).toBe(1);
    expect(restarted.results).toEqual([]);
    expect(restarted.answer).not.toBe(m.answer);
    expect(restarted.game.guesses).toEqual([]);
  });

  it('survives a JSON round trip (refresh mid-match)', () => {
    const m = createMatch(WORD_BANK, { length: 7, difficulty: 'easy', rounds: 5 });
    const restored: unknown = JSON.parse(JSON.stringify(m));
    expect(isValidMatch(restored)).toBe(true);
    expect(isValidMatch({ ...m, answer: 'XY' })).toBe(false);
  });
});

describe('share text', () => {
  it('builds a spoiler-free emoji grid', () => {
    const evaluations = [evaluateGuess('SLATE', 'CRANE'), evaluateGuess('CRANE', 'CRANE')];
    const text = buildShareText({ title: 'Tessera #1', evaluations, won: true, maxGuesses: 6 });
    expect(text).toBe('Tessera #1 2/6\n\n⬛⬛🟩⬛🟩\n🟩🟩🟩🟩🟩');
    expect(text).not.toContain('CRANE');
    expect(buildShareText({ title: 'T', evaluations, won: false, maxGuesses: 6 })).toContain('X/6');
  });
});
