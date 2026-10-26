import type { Route } from '../hooks/useHashRoute';

/** Shared props every page gets from the App shell. */
export interface PageProps {
  navigate: (route: Route) => void;
  openRules: () => void;
  openSettings: () => void;
  /** True while an app-level modal (rules/settings) is open — pages pause keyboard input. */
  overlayOpen: boolean;
  todayKey: string;
  msToNext: number;
}
