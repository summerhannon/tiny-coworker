import { DEFAULT_SETTINGS, SETTING_LIMITS, type Settings } from './config';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DayProgress {
  date: string;
  todayCount: number;
  cycleCount: number;
}

export type ValidationResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: Partial<Record<keyof Settings, string>> };

const KEYS = {
  settings: 'deskBuddy.settings',
  progress: 'deskBuddy.progress',
  muted: 'deskBuddy.muted',
};

export function memoryStore(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

/** localStorage when available (it can throw in private windows), otherwise memory. */
export function safeLocalStorage(): StorageLike {
  try {
    const probe = '__deskBuddyProbe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memoryStore();
  }
}

export function localDateKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function validateSettings(input: Record<keyof Settings, number>): ValidationResult {
  const errors: Partial<Record<keyof Settings, string>> = {};
  for (const key of Object.keys(SETTING_LIMITS) as (keyof Settings)[]) {
    const { min, max } = SETTING_LIMITS[key];
    const v = input[key];
    if (!Number.isInteger(v) || v < min || v > max) {
      errors[key] = `Enter a whole number from ${min} to ${max}`;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    settings: {
      focusMin: input.focusMin,
      shortBreakMin: input.shortBreakMin,
      longBreakMin: input.longBreakMin,
      longBreakEvery: input.longBreakEvery,
    },
  };
}

function readJson(store: StorageLike, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSettings(store: StorageLike): Settings {
  const raw = readJson(store, KEYS.settings);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const result = validateSettings({ ...DEFAULT_SETTINGS, ...(raw as Partial<Settings>) });
  return result.ok ? result.settings : { ...DEFAULT_SETTINGS };
}

export function saveSettings(store: StorageLike, s: Settings): void {
  store.setItem(KEYS.settings, JSON.stringify(s));
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function readProgress(store: StorageLike): DayProgress | null {
  const raw = readJson(store, KEYS.progress) as Partial<DayProgress> | null;
  if (!raw || typeof raw.date !== 'string') return null;
  if (!isCount(raw.todayCount) || !isCount(raw.cycleCount)) return null;
  return { date: raw.date, todayCount: raw.todayCount, cycleCount: raw.cycleCount };
}

function writeProgress(store: StorageLike, p: DayProgress): DayProgress {
  store.setItem(KEYS.progress, JSON.stringify(p));
  return p;
}

export function loadProgress(store: StorageLike, nowMs: number): DayProgress {
  const today = localDateKey(nowMs);
  const p = readProgress(store);
  if (!p || p.date !== today) return { date: today, todayCount: 0, cycleCount: 0 };
  return p;
}

export function recordFocus(store: StorageLike, nowMs: number, cycleCount: number): DayProgress {
  const today = localDateKey(nowMs);
  const p = readProgress(store);
  if (!p || p.date !== today) return writeProgress(store, { date: today, todayCount: 1, cycleCount: 1 });
  return writeProgress(store, { date: today, todayCount: p.todayCount + 1, cycleCount });
}

export function resetCycle(store: StorageLike, nowMs: number): DayProgress {
  return writeProgress(store, { ...loadProgress(store, nowMs), cycleCount: 0 });
}

export function loadMuted(store: StorageLike): boolean {
  return store.getItem(KEYS.muted) === 'true';
}

export function saveMuted(store: StorageLike, muted: boolean): void {
  store.setItem(KEYS.muted, String(muted));
}
