import { useEffect, useState } from 'react';
import { GameHeader } from '../components/GameHeader';
import { syncStats } from '../services/dailySync';
import { GuessDistribution, StatsSummary } from '../components/StatsSummary';
import { DAILY_MAX_GUESSES, WEEKLY_SCHEDULE } from '../engine/daily';
import { activeDailyStreak } from '../engine/stats';
import { DIFFICULTY_LABELS } from '../engine/types';
import { loadDailyStats, loadSessionStats, loadUnlimitedStats } from '../services/progress';
import type { PageProps } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function StatisticsPage({ navigate, openRules, openSettings, todayKey }: PageProps) {
  const [daily, setDaily] = useState(loadDailyStats);
  useEffect(() => {
    let alive = true;
    void syncStats().then((s) => alive && s && setDaily(s));
    return () => {
      alive = false;
    };
  }, []);
  const unlimited = loadUnlimitedStats();
  const session = loadSessionStats();
  const todayWeekday = new Date(`${todayKey}T00:00:00Z`).getUTCDay();

  return (
    <div className="stats-page">
      <GameHeader onHome={() => navigate('home')} onRules={openRules} onStats={() => navigate('stats')} onSettings={openSettings} subtitle="Statistics" title="Statistics" />
      <main className="stats-main">
        <section className="panel">
          <h2 className="panel-title">Daily Challenge</h2>
          <StatsSummary stats={daily} streak={activeDailyStreak(daily, todayKey)} />
          <h3 className="section-title">Guess distribution</h3>
          {daily.wins > 0 ? (
            <GuessDistribution stats={daily} maxGuesses={DAILY_MAX_GUESSES} />
          ) : (
            <p className="muted small">Solve a daily puzzle to see your distribution.</p>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-title">Unlimited</h2>
          <h3 className="section-title">This session</h3>
          <StatsSummary stats={session} showStreak={false} />
          <h3 className="section-title">All time</h3>
          <StatsSummary stats={unlimited} />
        </section>

        <section className="panel">
          <h2 className="panel-title">Daily difficulty schedule</h2>
          <p className="muted small">
            Weekdays use everyday words; weekends use less familiar vocabulary and trickier letter patterns. All puzzles are five letters.
          </p>
          <ul className="schedule-list">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <li key={d} className={d === todayWeekday ? 'schedule-today' : undefined}>
                <span>
                  {DAYS[d]}
                  {d === todayWeekday && <span className="today-pill">Today</span>}
                </span>
                <span className={`badge badge-${WEEKLY_SCHEDULE[d]}`}>{DIFFICULTY_LABELS[WEEKLY_SCHEDULE[d]]}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
