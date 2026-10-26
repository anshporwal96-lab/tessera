import { useEffect, useRef, useState } from 'react';
import { Announcer } from './components/Announcer';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { Toaster } from './components/Toaster';
import { useHashRoute } from './hooks/useHashRoute';
import { useUtcClock } from './hooks/useUtcClock';
import { DailyChallenge } from './pages/DailyChallenge';
import { HomePage } from './pages/HomePage';
import { StatisticsPage } from './pages/StatisticsPage';
import type { PageProps } from './pages/types';
import { UnlimitedMode } from './pages/UnlimitedMode';
import { readJson, STORAGE_KEYS, writeJson } from './services/storage';

const isTrue = (v: unknown): v is boolean => v === true;

export default function App() {
  const [route, navigate] = useHashRoute();
  const { todayKey, msToNext } = useUtcClock();
  const [rulesOpen, setRulesOpen] = useState(() => !readJson(STORAGE_KEYS.seenRules, isTrue));
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Single-page navigation: move focus to the new page's heading so screen
  // readers announce it and keyboard users start from the top. Skipped on first load.
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    document.querySelector<HTMLElement>('#root h1')?.focus();
  }, [route]);

  const closeRules = () => {
    setRulesOpen(false);
    writeJson(STORAGE_KEYS.seenRules, true);
  };

  const pageProps: PageProps = {
    navigate,
    openRules: () => setRulesOpen(true),
    openSettings: () => setSettingsOpen(true),
    overlayOpen: rulesOpen || settingsOpen,
    todayKey,
    msToNext,
  };

  return (
    <div className="app">
      {route === 'home' && <HomePage {...pageProps} />}
      {route === 'daily' && <DailyChallenge {...pageProps} />}
      {route === 'play' && <UnlimitedMode {...pageProps} />}
      {route === 'stats' && <StatisticsPage {...pageProps} />}
      <RulesModal open={rulesOpen} onClose={closeRules} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster />
      <Announcer />
    </div>
  );
}
