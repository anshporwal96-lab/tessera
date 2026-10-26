import { describe, expect, it } from 'vitest';
import { evaluateGuess, isSolved, keyboardStates } from './evaluate';

const short = (s: ReturnType<typeof evaluateGuess>) => s.map((x) => (x === 'correct' ? 'G' : x === 'present' ? 'Y' : '-')).join('');

describe('evaluateGuess', () => {
  it('marks an exact match all correct', () => {
    expect(short(evaluateGuess('CRANE', 'CRANE'))).toBe('GGGGG');
    expect(isSolved(evaluateGuess('crane', 'CRANE'))).toBe(true);
  });

  it('marks letters not in the answer absent', () => {
    expect(short(evaluateGuess('PUDGY', 'CRANE'))).toBe('-----');
  });

  it('marks misplaced letters present', () => {
    expect(short(evaluateGuess('NACRE', 'CRANE'))).toBe('YYYYG');
  });

  it('only marks as many duplicates as the answer contains', () => {
    // Answer has one E; the guess has two. Only the first E is present.
    expect(short(evaluateGuess('EERIE', 'CRANE'))).toBe('--Y-G');
    // Answer has one L; correct position wins over earlier misplaced copy.
    expect(short(evaluateGuess('LLAMA', 'HELLO'))).toBe('YY---');
    expect(short(evaluateGuess('HOTEL', 'HELLO'))).toBe('GY-YY');
  });

  it('prefers the exact match when a duplicate guess letter is both right and wrong', () => {
    // Answer ABBEY has two Bs; guess has three → one green, one yellow, one grey.
    expect(short(evaluateGuess('BABBY', 'ABBEY'))).toBe('YYG-G');
    expect(short(evaluateGuess('SPEED', 'ABIDE'))).toBe('--Y-Y');
    expect(short(evaluateGuess('ERASE', 'SPEED'))).toBe('Y--YY');
  });

  it('handles repeated letters in the answer', () => {
    // SPEED has two Es: the first two guessed Es light up, the third does not.
    expect(short(evaluateGuess('EERIE', 'SPEED'))).toBe('YY---');
    expect(short(evaluateGuess('KAYAK', 'KAYAK'))).toBe('GGGGG');
    expect(short(evaluateGuess('KNACK', 'KAYAK'))).toBe('G-Y-G');
  });

  it('works for other word lengths', () => {
    expect(short(evaluateGuess('BEAR', 'BEAD'))).toBe('GGG-');
    expect(short(evaluateGuess('ELEPHANT', 'ELEPHANT'))).toBe('GGGGGGGG');
    expect(short(evaluateGuess('PLANET', 'PENCIL'))).toBe('GY-YY-');
  });

  it('rejects mismatched lengths', () => {
    expect(() => evaluateGuess('CAT', 'CRANE')).toThrow();
  });
});

describe('keyboardStates', () => {
  it('keeps the best state seen for each letter', () => {
    const guesses = ['NACRE', 'CRANE'];
    const evals = guesses.map((g) => evaluateGuess(g, 'CRANE'));
    const states = keyboardStates(guesses, evals);
    expect(states.C).toBe('correct');
    expect(states.N).toBe('correct');
    expect(states.E).toBe('correct');
  });

  it('does not downgrade a correct letter to present or absent', () => {
    const guesses = ['HOTEL', 'LLAMA'];
    const states = keyboardStates(guesses, guesses.map((g) => evaluateGuess(g, 'HELLO')));
    expect(states.H).toBe('correct');
    expect(states.L).toBe('present');
    expect(states.M).toBe('absent');
  });
});
