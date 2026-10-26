import { formatCountdown } from '../engine/dates';

export function Countdown({ ms, label = 'Next puzzle in' }: { ms: number; label?: string }) {
  return (
    <div className="countdown">
      <span className="countdown-label">{label}</span>
      <span className="countdown-time" aria-live="off">
        {formatCountdown(ms)}
      </span>
      <span className="countdown-zone">resets 00:00 UTC</span>
    </div>
  );
}
