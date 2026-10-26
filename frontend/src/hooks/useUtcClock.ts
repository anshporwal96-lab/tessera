import { useEffect, useState } from 'react';
import { msUntilNextUtcMidnight, toUtcDateKey } from '../engine/dates';

/** Ticks once a second; gives today's UTC date key and time left until the next puzzle. */
export function useUtcClock(): { todayKey: string; msToNext: number } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return { todayKey: toUtcDateKey(now), msToNext: msUntilNextUtcMidnight(now) };
}
