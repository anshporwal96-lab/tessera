import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '../services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  sound: boolean;
  animations: boolean;
  highContrast: boolean;
}

const DEFAULTS: Settings = { theme: 'system', sound: true, animations: true, highContrast: false };

function isSettings(v: unknown): v is Partial<Settings> {
  return !!v && typeof v === 'object';
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = readJson(STORAGE_KEYS.settings, isSettings);
    if (stored) return { ...DEFAULTS, ...stored };
    return { ...DEFAULTS, animations: !prefersReducedMotion() };
  });

  useEffect(() => {
    writeJson(STORAGE_KEYS.settings, settings);
    const root = document.documentElement;
    if (settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.motion = settings.animations ? 'full' : 'reduced';
  }, [settings]);

  const value = useMemo(
    () => ({ settings, update: (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })) }),
    [settings],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
