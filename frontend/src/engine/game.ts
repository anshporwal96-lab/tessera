import { isSolved } from './evaluate';
import type { GameStatus, LetterState } from './types';

/**
 * Board state for one puzzle. It deliberately does not contain the answer:
 * guesses are scored by an external evaluator (local engine or, later, the
 * server), so the same state works for both Unlimited and Daily play.
 */
export interface GameState {
  wordLength: number;
  maxGuesses: number;
  guesses: string[];
  evaluations: LetterState[][];
  current: string;
  status: GameStatus;
}

export type SubmitRejection = 'not-playing' | 'incomplete' | 'invalid-word';

export function createGame(wordLength: number, maxGuesses: number): GameState {
  if (wordLength < 2) throw new Error('Word length must be at least 2');
  if (maxGuesses < 1) throw new Error('At least one guess is required');
  return { wordLength, maxGuesses, guesses: [], evaluations: [], current: '', status: 'playing' };
}

export function addLetter(state: GameState, letter: string): GameState {
  if (state.status !== 'playing') return state;
  if (!/^[a-zA-Z]$/.test(letter)) return state;
  if (state.current.length >= state.wordLength) return state;
  return { ...state, current: state.current + letter.toUpperCase() };
}

export function removeLetter(state: GameState): GameState {
  if (state.status !== 'playing' || state.current.length === 0) return state;
  return { ...state, current: state.current.slice(0, -1) };
}

export function checkSubmission(
  state: GameState,
  isValidWord: (word: string) => boolean,
): SubmitRejection | null {
  if (state.status !== 'playing') return 'not-playing';
  if (state.current.length !== state.wordLength) return 'incomplete';
  if (!isValidWord(state.current)) return 'invalid-word';
  return null;
}

/** Records a scored guess and works out whether the game is now won or lost. */
export function applyEvaluation(state: GameState, guess: string, evaluation: LetterState[]): GameState {
  if (state.status !== 'playing') return state;
  if (evaluation.length !== state.wordLength || guess.length !== state.wordLength) {
    throw new Error('Evaluation does not match word length');
  }
  const guesses = [...state.guesses, guess.toUpperCase()];
  const evaluations = [...state.evaluations, evaluation];
  let status: GameStatus = 'playing';
  if (isSolved(evaluation)) status = 'won';
  else if (guesses.length >= state.maxGuesses) status = 'lost';
  return { ...state, guesses, evaluations, current: '', status };
}

/** Type guard for state loaded from storage, which may be stale or tampered with. */
export function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as GameState;
  return (
    Number.isInteger(s.wordLength) &&
    Number.isInteger(s.maxGuesses) &&
    Array.isArray(s.guesses) &&
    Array.isArray(s.evaluations) &&
    s.guesses.length === s.evaluations.length &&
    s.guesses.length <= s.maxGuesses &&
    typeof s.current === 'string' &&
    ['playing', 'won', 'lost'].includes(s.status)
  );
}
