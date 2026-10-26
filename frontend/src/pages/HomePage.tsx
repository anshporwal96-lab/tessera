import { useEffect, useMemo, useState } from 'react';
import { syncDailyCaches } from '../services/dailySync';
import { Countdown } from '../components/Countdown';
import { GameHeader } from '../components/GameHeader';
import { Icon } from '../components/Icon';
import { DifficultySelector, RoundsSelector, WordLengthSelector } from '../components/Selectors';
import { WORD_BANK } from '../data/wordBank';
import { getDailyDifficulty, getPuzzleNumber } from '../engine/daily';
import { parseDateKey } from '../engine/dates';
import { isMatchOver, type UnlimitedConfig } from '../engine/rounds';
import { activeDailyStreak } from '../engine/stats';
import { DIFFICULTY_LABELS } from '../engine/types';
import { supportedLengths } from '../engine/wordSelection';
import { clearMatch, dailyStatus, loadDailyProgress, loadDailyStats, loadMatch, loadUnlimitedConfig, saveUnlimitedConfig } from '../services/progress';
import type { PageProps } from './types';

const STATUS_TEXT = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  won: 'Solved',
  lost: 'Missed',
} as const;

export function HomePage({ navigate, openRules, openSettings, todayKey, msToNext }: PageProps) {
  const [config, setConfig] = useState<UnlimitedConfig>(loadUnlimitedConfig);
  const lengths = useMemo(() => supportedLengths(WORD_BANK), []);
  const [, setSynced] = useState(0);

  // Server mode: refresh today's status and streak (e.g. played on another device), then re-render.
  useEffect(() => {
    let alive = true;
    void syncDailyCaches(todayKey).then((ok) => alive && ok && setSynced((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [todayKey]);

  const progress = loadDailyProgress(todayKey);
  const status = dailyStatus(progress);
  const streak = activeDailyStreak(loadDailyStats(), todayKey);
  const difficulty = getDailyDifficulty(todayKey);
  const puzzleNumber = getPuzzleNumber(todayKey);
  const dateLabel = parseDateKey(todayKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

  const savedMatch = loadMatch();
  const canResume = !!savedMatch && !isMatchOver(savedMatch) && (savedMatch.game.guesses.length > 0 || savedMatch.results.length > 0);

  const update = (patch: Partial<UnlimitedConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    saveUnlimitedConfig(next);
  };

  const startUnlimited = () => {
    saveUnlimitedConfig(config);
    clearMatch();
    navigate('play');
  };

  const dailyCta = status === 'not-started' ? 'Play today’s puzzle' : status === 'in-progress' ? 'Continue puzzle' : 'View results';

  return (
    <div className="home-page">
      <GameHeader onRules={openRules} onStats={() => navigate('stats')} onSettings={openSettings} />

      <main className="home-main">
        <section className="hero">
          <p className="eyebrow">A word puzzle, one tile at a time</p>
          <h2 className="hero-title">Find the hidden word.</h2>
        </section>

        <div className="mode-grid">
          <section className="mode-card mode-daily" aria-labelledby="daily-title">
            <div className="mode-card-head">
              <span className="mode-icon">
                <Icon name="calendar" />
              </span>
              <div>
                <h3 id="daily-title">Daily Challenge</h3>
                <p className="muted small">{dateLabel} · #{puzzleNumber}</p>
              </div>
            </div>

            <dl className="daily-facts">
              <div>
                <dt>Difficulty</dt>
                <dd>
                  <span className={`badge badge-${difficulty}`}>{DIFFICULTY_LABELS[difficulty]}</span>
                </dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd className="streak">
                  <Icon name="flame" size={16} /> {streak}
                </dd>
              </div>
              <div>
                <dt>Today</dt>
                <dd>
                  <span className={`status status-${status}`}>
                    {STATUS_TEXT[status]}
                    {status === 'in-progress' && progress && ` · ${progress.game.guesses.length}/${progress.game.maxGuesses}`}
                    {status === 'won' && progress && ` in ${progress.game.guesses.length}`}
                  </span>
                </dd>
              </div>
            </dl>

            <button type="button" className="button button-primary button-block" onClick={() => navigate('daily')}>
              {dailyCta}
            </button>
            <Countdown ms={msToNext} />
          </section>

          <section className="mode-card" aria-labelledby="unlimited-title">
            <div className="mode-card-head">
              <span className="mode-icon mode-icon-alt">
                <Icon name="infinity" />
              </span>
              <div>
                <h3 id="unlimited-title">Unlimited Play</h3>
                <p className="muted small">As many games as you like</p>
              </div>
            </div>

            <WordLengthSelector value={config.length} lengths={lengths} onChange={(length) => update({ length })} />
            <DifficultySelector value={config.difficulty} onChange={(difficulty) => update({ difficulty })} />
            <RoundsSelector value={config.rounds} onChange={(rounds) => update({ rounds })} />

            <button type="button" className="button button-primary button-block" onClick={startUnlimited}>
              Start game
            </button>
            {canResume && savedMatch && (
              <button type="button" className="button button-ghost button-block" onClick={() => navigate('play')}>
                Resume {savedMatch.config.length}-letter {DIFFICULTY_LABELS[savedMatch.config.difficulty].toLowerCase()} match · round {savedMatch.round}
              </button>
            )}
          </section>
        </div>
      </main>

      <footer className="home-footer muted small">
        Daily puzzles reset at 00:00 UTC · Progress is saved in this browser
      </footer>
    </div>
  );
}
