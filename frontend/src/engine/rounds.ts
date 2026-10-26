import { createGame, isValidGameState, type GameState } from './game';
import type { UnlimitedDifficulty, WordEntry } from './types';
import { maxGuessesFor, pickRandomWord } from './wordSelection';

export interface UnlimitedConfig {
  length: number;
  difficulty: UnlimitedDifficulty;
  /** 0 = endless. */
  rounds: number;
}

export interface RoundResult {
  answer: string;
  won: boolean;
  guesses: number;
}

/** A multi-round Unlimited session. Answers live client-side in this mode by design. */
export interface MatchState {
  config: UnlimitedConfig;
  /** 1-based number of the round being played. */
  round: number;
  results: RoundResult[];
  answer: string;
  category: string;
  game: GameState;
  hintUsed: boolean;
}

export const DEFAULT_CONFIG: UnlimitedConfig = { length: 5, difficulty: 'easy', rounds: 5 };

function freshRound(bank: readonly WordEntry[], config: UnlimitedConfig, recent: readonly string[], rand?: () => number) {
  const entry = pickRandomWord(bank, config.length, config.difficulty, recent, rand);
  return {
    answer: entry.word,
    category: entry.category,
    game: createGame(config.length, maxGuessesFor(config.length)),
    hintUsed: false,
  };
}

export function createMatch(
  bank: readonly WordEntry[],
  config: UnlimitedConfig,
  recent: readonly string[] = [],
  rand?: () => number,
): MatchState {
  return { config, round: 1, results: [], ...freshRound(bank, config, recent, rand) };
}

/** Stores the finished round's outcome. Idempotent for a round already recorded. */
export function recordRound(match: MatchState): MatchState {
  if (match.game.status === 'playing' || match.results.length >= match.round) return match;
  const result: RoundResult = {
    answer: match.answer,
    won: match.game.status === 'won',
    guesses: match.game.guesses.length,
  };
  return { ...match, results: [...match.results, result] };
}

export function isMatchOver(match: MatchState): boolean {
  return match.config.rounds > 0 && match.results.length >= match.config.rounds;
}

export function startNextRound(
  bank: readonly WordEntry[],
  match: MatchState,
  recent: readonly string[] = [],
  rand?: () => number,
): MatchState {
  if (match.results.length < match.round) throw new Error('Current round has not finished');
  if (isMatchOver(match)) throw new Error('Match is over');
  return { ...match, round: match.round + 1, ...freshRound(bank, match.config, recent, rand) };
}

export function matchScore(match: MatchState): { wins: number; played: number } {
  return { wins: match.results.filter((r) => r.won).length, played: match.results.length };
}

export function isValidMatch(value: unknown): value is MatchState {
  if (!value || typeof value !== 'object') return false;
  const m = value as MatchState;
  return (
    !!m.config &&
    Number.isInteger(m.config.length) &&
    ['easy', 'medium', 'hard'].includes(m.config.difficulty) &&
    Number.isInteger(m.round) &&
    Array.isArray(m.results) &&
    typeof m.answer === 'string' &&
    m.answer.length === m.config.length &&
    isValidGameState(m.game) &&
    m.game.wordLength === m.answer.length
  );
}
