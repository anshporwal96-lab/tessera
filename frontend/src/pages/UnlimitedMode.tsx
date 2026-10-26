import { useCallback, useRef, useState } from 'react';
import { GameBoard } from '../components/GameBoard';
import { GameHeader } from '../components/GameHeader';
import { Icon } from '../components/Icon';
import { Keyboard } from '../components/Keyboard';
import { Modal } from '../components/Modal';
import { ResultsModal } from '../components/ResultsModal';
import { StatsSummary } from '../components/StatsSummary';
import { WORD_BANK } from '../data/wordBank';
import { evaluateGuess } from '../engine/evaluate';
import type { GameState } from '../engine/game';
import { createMatch, isMatchOver, matchScore, recordRound, startNextRound, type MatchState, type UnlimitedConfig } from '../engine/rounds';
import { recordGame } from '../engine/stats';
import { DIFFICULTY_LABELS } from '../engine/types';
import { useSettings } from '../hooks/settings';
import { useGameController } from '../hooks/useGameController';
import {
  loadMatch,
  loadRecentAnswers,
  loadSessionStats,
  loadUnlimitedConfig,
  loadUnlimitedStats,
  rememberAnswer,
  saveMatch,
  saveSessionStats,
  saveUnlimitedStats,
} from '../services/progress';
import { showToast } from '../services/toast';
import type { PageProps } from './types';

function newMatch(config: UnlimitedConfig): MatchState {
  const match = createMatch(WORD_BANK, config, loadRecentAnswers());
  rememberAnswer(match.answer);
  saveMatch(match);
  return match;
}

function initialMatch(): { match: MatchState | null; error: string | null } {
  try {
    return { match: loadMatch() ?? newMatch(loadUnlimitedConfig()), error: null };
  } catch (err) {
    return { match: null, error: err instanceof Error ? err.message : 'Could not start a game.' };
  }
}

/** Records a finished game in lifetime and session stats. */
function recordStats(won: boolean, guesses: number) {
  saveUnlimitedStats(recordGame(loadUnlimitedStats(), won, guesses));
  saveSessionStats(recordGame(loadSessionStats(), won, guesses));
}

export function UnlimitedMode({ navigate, openRules, openSettings, overlayOpen }: PageProps) {
  const { settings } = useSettings();
  const [{ match, error }, setState] = useState(initialMatch);
  const [showResults, setShowResults] = useState(() => !!match && match.game.status !== 'playing');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [sessionStats, setSessionStats] = useState(loadSessionStats);
  const matchRef = useRef(match);
  matchRef.current = match;

  const setMatch = useCallback((next: MatchState) => {
    matchRef.current = next;
    saveMatch(next);
    setState({ match: next, error: null });
  }, []);

  const onChange = useCallback((game: GameState) => setMatch({ ...matchRef.current!, game }), [setMatch]);

  const evaluate = useCallback(async (guess: string) => {
    const m = matchRef.current!;
    return { evaluation: evaluateGuess(guess, m.answer), answer: m.answer };
  }, []);

  const onFinished = useCallback(
    (game: GameState) => {
      const current = matchRef.current!;
      const recorded = recordRound({ ...current, game });
      if (recorded !== current && recorded.results.length > current.results.length) {
        recordStats(game.status === 'won', game.guesses.length);
        setSessionStats(loadSessionStats());
      }
      setMatch(recorded);
      if (game.status === 'lost') showToast(current.answer, 2500);
      window.setTimeout(() => setShowResults(true), settings.animations ? 1300 : 300);
    },
    [setMatch, settings.animations],
  );

  const controller = useGameController({
    game: match?.game ?? { wordLength: 5, maxGuesses: 6, guesses: [], evaluations: [], current: '', status: 'lost' },
    onChange,
    evaluate,
    onFinished,
    inputEnabled: !!match && !overlayOpen && !showResults && !confirmRestart,
  });

  const nextRound = () => {
    if (!match) return;
    try {
      const next = startNextRound(WORD_BANK, match, loadRecentAnswers());
      rememberAnswer(next.answer);
      setMatch(next);
      setShowResults(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start the next round', 2500);
    }
  };

  const restart = () => {
    if (!match) return;
    // Abandoning a game that has guesses counts as a loss, so restarting can't hide a bad game.
    if (match.game.status === 'playing' && match.game.guesses.length > 0) {
      recordStats(false, match.game.guesses.length);
      setSessionStats(loadSessionStats());
    }
    try {
      setMatch(newMatch(match.config));
      setShowResults(false);
      setConfirmRestart(false);
    } catch (err) {
      setState({ match: null, error: err instanceof Error ? err.message : 'Could not start a game.' });
    }
  };

  const showHint = () => {
    if (!match) return;
    if (!match.hintUsed) setMatch({ ...match, hintUsed: true });
  };

  if (error || !match) {
    return (
      <div className="game-page">
        <GameHeader onHome={() => navigate('home')} onRules={openRules} onStats={() => navigate('stats')} onSettings={openSettings} title="Unlimited" />
        <main className="page-error" role="alert">
          <p>{error ?? 'Could not start a game.'}</p>
          <button type="button" className="button" onClick={() => navigate('home')}>
            Back to home
          </button>
        </main>
      </div>
    );
  }

  const { config } = match;
  const roundsLabel = config.rounds === 0 ? `Round ${match.round}` : `Round ${match.round} of ${config.rounds}`;
  const over = isMatchOver(match);
  const score = matchScore(match);
  const finished = match.game.status !== 'playing';

  return (
    <div className="game-page">
      <GameHeader
        onHome={() => navigate('home')}
        onRules={openRules}
        onStats={() => navigate('stats')}
        onSettings={openSettings}
        title="Unlimited"
        subtitle={
          <>
            {config.length} letters · <span className={`badge badge-${config.difficulty}`}>{DIFFICULTY_LABELS[config.difficulty]}</span>
          </>
        }
      />

      <main className="game-main">
        <div className="game-toolbar">
          <span className="toolbar-note">
            {roundsLabel} · {score.wins}/{score.played} won
          </span>
          <div className="toolbar-actions">
            {finished ? (
              <button type="button" className="chip chip-primary" onClick={() => setShowResults(true)}>
                {over ? 'Match results' : 'Next round →'}
              </button>
            ) : match.hintUsed ? (
              <span className="chip chip-static" aria-live="polite">
                <Icon name="hint" size={16} /> {match.category}
              </span>
            ) : (
              <button type="button" className="chip" onClick={showHint}>
                <Icon name="hint" size={16} /> Hint
              </button>
            )}
            <button type="button" className="chip" onClick={() => (finished || match.game.guesses.length === 0 ? restart() : setConfirmRestart(true))}>
              <Icon name="restart" size={16} /> Restart
            </button>
          </div>
        </div>

        <GameBoard game={match.game} revealingRow={controller.revealingRow} shakeRow={controller.shakeRow} bounceRow={controller.bounceRow} />
        <Keyboard keyStates={controller.keyStates} onKey={controller.onKey} disabled={finished} />
      </main>

      {finished && (
        <ResultsModal
          open={showResults}
          onClose={() => setShowResults(false)}
          won={match.game.status === 'won'}
          answer={match.answer}
          guesses={match.game.guesses.length}
          maxGuesses={match.game.maxGuesses}
          context={`${roundsLabel} · ${DIFFICULTY_LABELS[config.difficulty]}`}
        >
          {over && (
            <div className="match-summary">
              <h3 className="section-title">Match complete</h3>
              <p className="match-score">
                {score.wins} / {score.played} words solved
              </p>
              <ol className="match-rounds">
                {match.results.map((r, i) => (
                  <li key={i} className={r.won ? 'round-won' : 'round-lost'}>
                    <span>Round {i + 1}</span>
                    <span className="round-word">{r.answer}</span>
                    <span>{r.won ? `${r.guesses} guesses` : 'missed'}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <h3 className="section-title">This session</h3>
          <StatsSummary stats={sessionStats} showStreak={false} />
          <div className="result-actions">
            {over ? (
              <button type="button" className="button button-primary" onClick={restart} autoFocus>
                Play again
              </button>
            ) : (
              <button type="button" className="button button-primary" onClick={nextRound} autoFocus>
                Next round
              </button>
            )}
            <button type="button" className="button" onClick={() => navigate('home')}>
              Change settings
            </button>
          </div>
        </ResultsModal>
      )}

      <Modal open={confirmRestart} title="Restart match?" onClose={() => setConfirmRestart(false)}>
        <p>You'll get a fresh set of words starting from round 1. The word you're on will count as a loss.</p>
        <div className="result-actions">
          <button type="button" className="button button-primary" onClick={restart}>
            Restart
          </button>
          <button type="button" className="button" onClick={() => setConfirmRestart(false)}>
            Keep playing
          </button>
        </div>
      </Modal>
    </div>
  );
}
