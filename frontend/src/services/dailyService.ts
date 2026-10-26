import { WORD_BANK } from '../data/wordBank';
import { DAILY_MAX_GUESSES, DAILY_WORD_LENGTH, getDailyAnswer, getDailyDifficulty, getPuzzleNumber } from '../engine/daily';
import { evaluateGuess, isSolved } from '../engine/evaluate';
import type { GameStats } from '../engine/stats';
import type { Difficulty, GameStatus, LetterState } from '../engine/types';
import { HttpDailyService } from './httpDailyService';

/** Public, spoiler-free description of a day's puzzle. */
export interface DailyPuzzleInfo {
  dateKey: string;
  puzzleNumber: number;
  difficulty: Difficulty;
  wordLength: number;
  maxGuesses: number;
  /** The player's saved attempt, when the service stores it (server mode). */
  progress?: {
    guesses: string[];
    evaluations: LetterState[][];
    status: GameStatus;
    answer?: string;
  };
}

export interface GuessResult {
  evaluation: LetterState[];
  solved: boolean;
  gameOver: boolean;
  /** Only present once the game is over. */
  answer?: string;
}

export interface DailySummary {
  dateKey: string;
  players: number;
  solved: number;
  distribution: number[];
}

/**
 * Contract for daily-puzzle delivery. The UI only talks to this interface.
 * `remote` = Spring Boot API (answer kept on the server);
 * `local`  = browser-only fallback for offline/static builds.
 */
export interface DailyService {
  readonly kind: 'local' | 'remote';
  /** In remote mode the server decides what "today" is; `dateKey` is the client's guess. */
  getPuzzle(dateKey: string): Promise<DailyPuzzleInfo>;
  /** `attempt` is 1-based; the server tracks it itself, the local service trusts it. */
  submitGuess(dateKey: string, guess: string, attempt: number): Promise<GuessResult>;
  /** Server-side stats (remote only); local mode keeps stats in browser storage. */
  getStats?(): Promise<GameStats>;
  getSummary?(dateKey: string): Promise<DailySummary>;
}

/**
 * Browser-only implementation.
 *
 * LIMITATION: the schedule and word bank ship in the JavaScript bundle, so a
 * determined player can compute the answer. Use the server in production.
 */
export class LocalDailyService implements DailyService {
  readonly kind = 'local' as const;

  async getPuzzle(dateKey: string): Promise<DailyPuzzleInfo> {
    return {
      dateKey,
      puzzleNumber: getPuzzleNumber(dateKey),
      difficulty: getDailyDifficulty(dateKey),
      wordLength: DAILY_WORD_LENGTH,
      maxGuesses: DAILY_MAX_GUESSES,
    };
  }

  async submitGuess(dateKey: string, guess: string, attempt: number): Promise<GuessResult> {
    const { word } = getDailyAnswer(dateKey, WORD_BANK);
    const evaluation = evaluateGuess(guess, word);
    const solved = isSolved(evaluation);
    const gameOver = solved || attempt >= DAILY_MAX_GUESSES;
    return { evaluation, solved, gameOver, answer: gameOver ? word : undefined };
  }
}

/** Set VITE_API_URL (e.g. "/api") to use the server; leave it empty for the offline build. */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const dailyService: DailyService = API_URL ? new HttpDailyService(API_URL) : new LocalDailyService();
