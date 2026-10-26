import type { GameStats } from '../engine/stats';
import type { Difficulty, GameStatus, LetterState } from '../engine/types';
import type { DailyPuzzleInfo, DailyService, DailySummary, GuessResult } from './dailyService';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from './storage';

/** An error returned by the Tessera API, with its stable machine-readable code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface DailyStateDto {
  dateKey: string;
  puzzleNumber: number;
  difficulty: Difficulty;
  wordLength: number;
  maxGuesses: number;
  guesses: string[];
  evaluations: LetterState[][];
  status: GameStatus;
  answer?: string;
}

interface GuessResultDto {
  evaluation: LetterState[];
  solved: boolean;
  gameOver: boolean;
  attempt: number;
  answer?: string;
}

const isString = (v: unknown): v is string => typeof v === 'string';

/**
 * Talks to the Spring Boot API. The server owns the daily answer and the
 * player's attempt; it only reveals the answer once the game is over.
 */
export class HttpDailyService implements DailyService {
  readonly kind = 'remote' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  private token(): string | null {
    return readJson(STORAGE_KEYS.playerToken, isString);
  }

  private registering: Promise<string> | null = null;

  /** Concurrent first requests share one registration instead of creating several players. */
  private register(): Promise<string> {
    this.registering ??= (async () => {
      try {
        const res = await this.fetchImpl(`${this.baseUrl}/players`, { method: 'POST' });
        if (!res.ok) throw await this.toError(res);
        const { token } = (await res.json()) as { token: string };
        writeJson(STORAGE_KEYS.playerToken, token);
        return token;
      } finally {
        this.registering = null;
      }
    })();
    return this.registering;
  }

  private async toError(res: Response): Promise<ApiError> {
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      return new ApiError(res.status, body.error ?? 'http-error', body.message ?? `Server error (${res.status})`);
    } catch {
      return new ApiError(res.status, 'http-error', `Server error (${res.status})`);
    }
  }

  /** Authenticated request; registers an anonymous player on first use and once more if the token is rejected. */
  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    let res: Response;
    try {
      const token = this.token() ?? (await this.register());
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, 'offline', 'Could not reach the Tessera server. Check your connection and try again.');
    }
    if (res.status === 401 && retry) {
      removeKey(STORAGE_KEYS.playerToken);
      return this.request<T>(path, init, false);
    }
    if (!res.ok) throw await this.toError(res);
    return (await res.json()) as T;
  }

  async getPuzzle(): Promise<DailyPuzzleInfo> {
    const s = await this.request<DailyStateDto>('/daily/today');
    return {
      dateKey: s.dateKey,
      puzzleNumber: s.puzzleNumber,
      difficulty: s.difficulty,
      wordLength: s.wordLength,
      maxGuesses: s.maxGuesses,
      progress: { guesses: s.guesses, evaluations: s.evaluations, status: s.status, answer: s.answer },
    };
  }

  async submitGuess(dateKey: string, guess: string): Promise<GuessResult> {
    const r = await this.request<GuessResultDto>(`/daily/${dateKey}/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guess }),
    });
    return { evaluation: r.evaluation, solved: r.solved, gameOver: r.gameOver, answer: r.answer };
  }

  async getStats(): Promise<GameStats> {
    const s = await this.request<GameStats & { lastPlayedDate?: string | null; lastWinDate?: string | null }>('/players/me/stats');
    return { ...s, lastPlayedDate: s.lastPlayedDate ?? undefined, lastWinDate: s.lastWinDate ?? undefined };
  }

  async getSummary(dateKey: string): Promise<DailySummary> {
    const res = await this.fetchImpl(`${this.baseUrl}/daily/${dateKey}/summary`);
    if (!res.ok) throw await this.toError(res);
    return (await res.json()) as DailySummary;
  }
}
