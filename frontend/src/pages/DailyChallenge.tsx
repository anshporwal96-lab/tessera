import { useCallback, useEffect, useRef, useState } from 'react';
import { Countdown } from '../components/Countdown';
import { GameBoard } from '../components/GameBoard';
import { GameHeader } from '../components/GameHeader';
import { Icon } from '../components/Icon';
import { Keyboard } from '../components/Keyboard';
import { ResultsModal } from '../components/ResultsModal';
import { GuessDistribution, StatsSummary } from '../components/StatsSummary';
import { createGame, type GameState } from '../engine/game';
import { buildShareText } from '../engine/share';
import { activeDailyStreak, recordDailyGame } from '../engine/stats';
import { DIFFICULTY_LABELS } from '../engine/types';
import { useSettings } from '../hooks/settings';
import { useGameController } from '../hooks/useGameController';
import { dailyService, type DailyPuzzleInfo, type DailySummary } from '../services/dailyService';
import { resolveProgress, syncStats } from '../services/dailySync';
import { ApiError } from '../services/httpDailyService';
import { loadDailyStats, saveDailyProgress, saveDailyStats, type DailyProgress } from '../services/progress';
import { showToast } from '../services/toast';
import type { PageProps } from './types';

export async function shareText(text: string): Promise<void> {
  try {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast('Results copied to clipboard');
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return;
    showToast('Could not share — your browser blocked clipboard access', 2500);
  }
}

export function DailyChallenge({ navigate, openRules, openSettings, overlayOpen, todayKey, msToNext }: PageProps) {
  const { settings } = useSettings();
  const [puzzle, setPuzzle] = useState<DailyPuzzleInfo | null>(null);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [stats, setStats] = useState(loadDailyStats);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const loadedKey = useRef<string | null>(null);

  // Load (or roll over to) today's puzzle.
  useEffect(() => {
    let alive = true;
    dailyService
      .getPuzzle(todayKey)
      .then((info) => {
        if (!alive) return;
        if (loadedKey.current && loadedKey.current !== info.dateKey) showToast('A new daily puzzle is ready!', 2500);
        loadedKey.current = info.dateKey;
        const next = resolveProgress(info);
        saveDailyProgress(next);
        setPuzzle(info);
        setProgress(next);
        setShowResults(next.game.status !== 'playing');
        setError(null);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (alive) setError(err instanceof Error ? err.message : 'Could not load today’s puzzle.');
      });
    void syncStats().then((s) => alive && s && setStats(s));
    return () => {
      alive = false;
    };
  }, [todayKey, reloadToken]);

  // Community results for the finished puzzle (server mode only).
  const finishedDate = progress && progress.game.status !== 'playing' ? progress.dateKey : null;
  useEffect(() => {
    if (!finishedDate || !dailyService.getSummary) return;
    let alive = true;
    dailyService
      .getSummary(finishedDate)
      .then((s) => alive && setSummary(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [finishedDate]);

  const onChange = useCallback((game: GameState) => {
    const current = progressRef.current;
    if (!current) return;
    const next = { ...current, game };
    progressRef.current = next;
    setProgress(next);
    saveDailyProgress(next);
  }, []);

  const evaluate = useCallback(
    (guess: string, attempt: number) => dailyService.submitGuess(progressRef.current!.dateKey, guess, attempt),
    [],
  );

  // The day ended or the game was finished elsewhere: reload the server's view.
  const onError = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.code === 'not-today' || err.code === 'game-over')) {
      setReloadToken((n) => n + 1);
    }
  }, []);

  const onFinished = useCallback(
    async (game: GameState, answer: string | undefined) => {
      const current = progressRef.current;
      if (!current) return;
      const next: DailyProgress = { ...current, game, answer, recorded: true };
      progressRef.current = next;
      setProgress(next);
      saveDailyProgress(next);
      if (game.status === 'lost' && answer) showToast(answer, 2500);

      if (dailyService.kind === 'remote') {
        const synced = await syncStats();
        if (synced) setStats(synced);
      } else if (!current.recorded) {
        const updated = recordDailyGame(loadDailyStats(), current.dateKey, game.status === 'won', game.guesses.length);
        saveDailyStats(updated);
        setStats(updated);
      }
      window.setTimeout(() => setShowResults(true), settings.animations ? 1400 : 300);
    },
    [settings.animations],
  );

  const placeholder = createGame(5, 6);
  const game = progress?.game ?? placeholder;
  const controller = useGameController({
    game,
    onChange,
    evaluate,
    onFinished: (g, a) => void onFinished(g, a),
    onError,
    inputEnabled: !!progress && !overlayOpen && !showResults,
  });

  const subtitle = puzzle ? (
    <>
      Daily #{puzzle.puzzleNumber} · <span className={`badge badge-${puzzle.difficulty}`}>{DIFFICULTY_LABELS[puzzle.difficulty]}</span>
    </>
  ) : (
    'Daily Challenge'
  );

  const finished = progress && progress.game.status !== 'playing';
  const streak = activeDailyStreak(stats, puzzle?.dateKey ?? todayKey);

  const share = () => {
    if (!progress || !puzzle) return;
    void shareText(
      buildShareText({
        title: `Tessera #${puzzle.puzzleNumber} · ${DIFFICULTY_LABELS[puzzle.difficulty]}`,
        evaluations: progress.game.evaluations,
        won: progress.game.status === 'won',
        maxGuesses: progress.game.maxGuesses,
        highContrast: settings.highContrast,
      }),
    );
  };

  return (
    <div className="game-page">
      <GameHeader onHome={() => navigate('home')} onRules={openRules} onStats={() => navigate('stats')} onSettings={openSettings} subtitle={subtitle} title="Daily Challenge" />

      <main className="game-main">
        {error ? (
          <div className="page-error" role="alert">
            <p>{error}</p>
            <div className="result-actions">
              <button type="button" className="button button-primary" onClick={() => setReloadToken((n) => n + 1)}>
                Try again
              </button>
              <button type="button" className="button" onClick={() => navigate('play')}>
                Play Unlimited
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="game-toolbar">
              {finished ? (
                <button type="button" className="chip" onClick={() => setShowResults(true)}>
                  <Icon name="check" size={16} /> Completed — view results
                </button>
              ) : (
                <span className="toolbar-note">
                  {!progress
                    ? 'Loading today’s puzzle…'
                    : progress.game.guesses.length > 0
                      ? `Guess ${progress.game.guesses.length + 1} of ${game.maxGuesses}`
                      : 'One attempt per day · progress saves automatically'}
                </span>
              )}
            </div>
            <GameBoard game={game} revealingRow={controller.revealingRow} shakeRow={controller.shakeRow} bounceRow={controller.bounceRow} />
            <Keyboard keyStates={controller.keyStates} onKey={controller.onKey} disabled={!progress || !!finished} />
          </>
        )}
      </main>

      {progress && finished && (
        <ResultsModal
          open={showResults}
          onClose={() => setShowResults(false)}
          won={progress.game.status === 'won'}
          answer={progress.answer}
          guesses={progress.game.guesses.length}
          maxGuesses={progress.game.maxGuesses}
          context={puzzle ? `Daily #${puzzle.puzzleNumber} · ${DIFFICULTY_LABELS[puzzle.difficulty]}` : undefined}
        >
          <h3 className="section-title">Your daily stats</h3>
          <StatsSummary stats={stats} streak={streak} />
          <GuessDistribution stats={stats} maxGuesses={progress.game.maxGuesses} highlight={progress.game.status === 'won' ? progress.game.guesses.length : undefined} />
          {summary && summary.players > 0 && (
            <p className="community-line">
              {summary.players === 1
                ? 'You’re the first to finish today.'
                : `${Math.round((summary.solved / summary.players) * 100)}% of ${summary.players} players solved today’s puzzle.`}
            </p>
          )}
          <div className="result-footer">
            <Countdown ms={msToNext} />
            <button type="button" className="button button-primary" onClick={share}>
              <Icon name="share" size={18} /> Share
            </button>
          </div>
          <button type="button" className="button button-ghost button-block" onClick={() => navigate('play')}>
            Keep playing in Unlimited
          </button>
        </ResultsModal>
      )}
    </div>
  );
}
