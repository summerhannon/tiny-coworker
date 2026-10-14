import type { StorageLike } from '../storage';

export interface DesktopPrefs {
  clickThrough: boolean;
  showInDock: boolean;
  showBuddy: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export const DESKTOP_KEYS = { prefs: 'deskBuddy.desktop', windowPos: 'deskBuddy.windowPos' };
const DEFAULTS: DesktopPrefs = { clickThrough: false, showInDock: true, showBuddy: true };

function readJson(store: StorageLike, key: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(store.getItem(key) ?? 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

export function loadDesktopPrefs(store: StorageLike): DesktopPrefs {
  const raw = readJson(store, DESKTOP_KEYS.prefs);
  if (!raw) return { ...DEFAULTS };
  const bool = (k: keyof DesktopPrefs) => (typeof raw[k] === 'boolean' ? (raw[k] as boolean) : DEFAULTS[k]);
  return { clickThrough: bool('clickThrough'), showInDock: bool('showInDock'), showBuddy: bool('showBuddy') };
}

export function saveDesktopPrefs(store: StorageLike, p: DesktopPrefs): void {
  store.setItem(DESKTOP_KEYS.prefs, JSON.stringify(p));
}

export function loadWindowPosition(store: StorageLike): Point | null {
  const raw = readJson(store, DESKTOP_KEYS.windowPos);
  if (!raw || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
  return { x: raw.x as number, y: raw.y as number };
}

export function saveWindowPosition(store: StorageLike, p: Point): void {
  store.setItem(DESKTOP_KEYS.windowPos, JSON.stringify({ x: p.x, y: p.y }));
}
