// Thin, failure-tolerant wrapper over Web Storage. Private browsing modes and
// blocked site data can make localStorage throw, so every access is guarded and
// falls back to an in-memory map for the lifetime of the page.

const PREFIX = 'tessera:v1:';
const memory = new Map<string, string>();

function backing(kind: 'local' | 'session'): Storage | null {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = `${PREFIX}__probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function readJson<T>(
  key: string,
  validate: (v: unknown) => v is T,
  kind: 'local' | 'session' = 'local',
): T | null {
  const fullKey = PREFIX + key;
  const store = backing(kind);
  let raw: string | null = null;
  try {
    // The in-memory copy stands in only when Web Storage is unavailable; otherwise
    // storage is authoritative (so data cleared by the browser stays cleared).
    raw = store ? store.getItem(fullKey) : (memory.get(`${kind}:${fullKey}`) ?? null);
  } catch {
    raw = memory.get(`${kind}:${fullKey}`) ?? null;
  }
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, kind: 'local' | 'session' = 'local'): void {
  const fullKey = PREFIX + key;
  const raw = JSON.stringify(value);
  memory.set(`${kind}:${fullKey}`, raw);
  try {
    backing(kind)?.setItem(fullKey, raw);
  } catch {
    // Quota exceeded or storage blocked: the in-memory copy still works this session.
  }
}

export function removeKey(key: string, kind: 'local' | 'session' = 'local'): void {
  const fullKey = PREFIX + key;
  memory.delete(`${kind}:${fullKey}`);
  try {
    backing(kind)?.removeItem(fullKey);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  settings: 'settings',
  dailyProgress: 'daily:progress',
  dailyStats: 'daily:stats',
  unlimitedMatch: 'unlimited:match',
  unlimitedConfig: 'unlimited:config',
  unlimitedStats: 'unlimited:stats',
  unlimitedSession: 'unlimited:session',
  unlimitedRecent: 'unlimited:recent',
  seenRules: 'rules:seen',
  playerToken: 'player:token',
} as const;
