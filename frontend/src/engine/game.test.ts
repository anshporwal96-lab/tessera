import { describe, expect, it } from 'vitest';
import { evaluateGuess } from './evaluate';
import { addLetter, applyEvaluation, checkSubmission, createGame, isValidGameState, removeLetter, type GameState } from './game';

const DICT = new Set(['CRANE', 'SLATE', 'PLANT', 'TOAST', 'BRICK', 'MOUND', 'GHOST', 'BEAR', 'BEAD']);
const valid = (w: string) => DICT.has(w);

function type(state: GameState, word: string): GameState {
  return [...word].reduce(addLetter, state);
}

function play(state: GameState, guess: string, answer: string): GameState {
  const typed = type(state, guess);
  expect(checkSubmission(typed, valid)).toBeNull();
  return applyEvaluation(typed, guess, evaluateGuess(guess, answer));
}

describe('game state', () => {
  it('wins on a correct guess', () => {
    const g = play(createGame(5, 6), 'CRANE', 'CRANE');
    expect(g.status).toBe('won');
    expect(g.guesses).toEqual(['CRANE']);
  });

  it('keeps playing after an incorrect guess', () => {
    const g = play(createGame(5, 6), 'SLATE', 'CRANE');
    expect(g.status).toBe('playing');
    expect(g.current).toBe('');
  });

  it('rejects incomplete guesses', () => {
    const g = type(createGame(5, 6), 'CRA');
    expect(checkSubmission(g, valid)).toBe('incomplete');
  });

  it('rejects words not in the dictionary', () => {
    const g = type(createGame(5, 6), 'ZZZZZ');
    expect(checkSubmission(g, valid)).toBe('invalid-word');
  });

  it('caps input at the word length and ignores non-letters', () => {
    let g = type(createGame(4, 6), 'BEARS');
    expect(g.current).toBe('BEAR');
    g = addLetter(g, '1');
    expect(g.current).toBe('BEAR');
    g = removeLetter(removeLetter(g));
    expect(g.current).toBe('BE');
  });

  it('can win on the final attempt', () => {
    let g = createGame(5, 6);
    for (const guess of ['SLATE', 'PLANT', 'TOAST', 'BRICK', 'MOUND']) g = play(g, guess, 'GHOST');
    expect(g.status).toBe('playing');
    g = play(g, 'GHOST', 'GHOST');
    expect(g.status).toBe('won');
    expect(g.guesses).toHaveLength(6);
  });

  it('is lost after using every attempt', () => {
    let g = createGame(5, 6);
    for (const guess of ['SLATE', 'PLANT', 'TOAST', 'BRICK', 'MOUND', 'CRANE']) g = play(g, guess, 'GHOST');
    expect(g.status).toBe('lost');
    // No more input is accepted once the game is over.
    expect(addLetter(g, 'A')).toBe(g);
    expect(checkSubmission(g, valid)).toBe('not-playing');
  });

  it('supports other word lengths', () => {
    let g = play(createGame(4, 6), 'BEAR', 'BEAD');
    expect(g.status).toBe('playing');
    g = play(g, 'BEAD', 'BEAD');
    expect(g.status).toBe('won');
  });

  it('round-trips through JSON (refresh mid-game)', () => {
    const g = type(play(createGame(5, 6), 'SLATE', 'CRANE'), 'CR');
    const restored: unknown = JSON.parse(JSON.stringify(g));
    expect(isValidGameState(restored)).toBe(true);
    expect(restored).toEqual(g);
  });

  it('rejects corrupted saved state', () => {
    expect(isValidGameState(null)).toBe(false);
    expect(isValidGameState({ wordLength: 5 })).toBe(false);
    expect(isValidGameState({ ...createGame(5, 6), guesses: ['CRANE'], evaluations: [] })).toBe(false);
  });
});
