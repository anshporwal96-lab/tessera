import { createGame } from '../engine/game';
import type { GameStats } from '../engine/stats';
import { dailyService, type DailyPuzzleInfo } from './dailyService';
import { loadDailyProgress, saveDailyProgress, saveDailyStats, type DailyProgress } from './progress';

/**
 * Builds the board to show. With a server, its saved attempt is the truth
 * (and lets a player continue on another device); the local copy is a cache.
 */
export function resolveProgress(info: DailyPuzzleInfo): DailyProgress {
  const cached = loadDailyProgress(info.dateKey);
  const base = { dateKey: info.dateKey, puzzleNumber: info.puzzleNumber, difficulty: info.difficulty };
  if (!info.progress) {
    return cached ?? { ...base, game: createGame(info.wordLength, info.maxGuesses), recorded: false };
  }
  const p = info.progress;
  const sameBoard = cached && cached.game.guesses.length === p.guesses.length;
  return {
    ...base,
    game: {
      wordLength: info.wordLength,
      maxGuesses: info.maxGuesses,
      guesses: p.guesses,
      evaluations: p.evaluations,
      // Keep letters typed but not yet submitted before a refresh.
      current: sameBoard && p.status === 'playing' ? cached.game.current : '',
      status: p.status,
    },
    answer: p.answer,
    recorded: p.status !== 'playing',
  };
}

/** Pulls the server's stats into the local cache. Returns null offline or on failure. */
export async function syncStats(): Promise<GameStats | null> {
  if (!dailyService.getStats) return null;
  try {
    const stats = await dailyService.getStats();
    saveDailyStats(stats);
    return stats;
  } catch {
    return null;
  }
}

/** Refreshes today's progress and stats caches from the server (server mode only). */
export async function syncDailyCaches(todayKey: string): Promise<boolean> {
  if (dailyService.kind !== 'remote') return false;
  try {
    saveDailyProgress(resolveProgress(await dailyService.getPuzzle(todayKey)));
  } catch {
    return false;
  }
  await syncStats();
  return true;
}
