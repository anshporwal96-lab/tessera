import { averageGuesses, winRate, type GameStats } from '../engine/stats';

interface SummaryProps {
  stats: GameStats;
  /** Streak to display (daily streaks lapse after a missed day). */
  streak?: number;
  showStreak?: boolean;
}

export function StatsSummary({ stats, streak, showStreak = true }: SummaryProps) {
  const avg = averageGuesses(stats);
  const items: [string, string | number][] = [
    ['Played', stats.played],
    ['Win %', winRate(stats)],
  ];
  if (showStreak) {
    items.push(['Streak', streak ?? stats.currentStreak]);
    items.push(['Best streak', stats.maxStreak]);
  } else {
    items.push(['Wins', stats.wins]);
  }
  items.push(['Avg tries', avg === null ? '–' : avg]);

  return (
    <dl className="stats-summary">
      {items.map(([label, value]) => (
        <div className="stat" key={label}>
          <dt className="stat-label">{label}</dt>
          <dd className="stat-value">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface DistributionProps {
  stats: GameStats;
  maxGuesses: number;
  /** Highlight the bar for this game's guess count. */
  highlight?: number;
}

export function GuessDistribution({ stats, maxGuesses, highlight }: DistributionProps) {
  const counts = Array.from({ length: maxGuesses }, (_, i) => stats.distribution[i] ?? 0);
  const max = Math.max(1, ...counts);
  return (
    <div className="distribution" role="list" aria-label="Guess distribution">
      {counts.map((count, i) => (
        <div className="dist-row" role="listitem" key={i} aria-label={`${i + 1} guesses: ${count} wins`}>
          <span className="dist-index">{i + 1}</span>
          <div className="dist-track">
            <div
              className={`dist-bar${highlight === i + 1 ? ' dist-bar-active' : ''}`}
              style={{ width: `${Math.max(7, (count / max) * 100)}%` }}
            >
              {count}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
