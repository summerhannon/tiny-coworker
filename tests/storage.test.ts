import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/config';
import {
  memoryStore, localDateKey, validateSettings, loadSettings, saveSettings,
  loadProgress, recordFocus, resetCycle, loadMuted, saveMuted, loadSound, saveSound,
} from '../src/storage';

const DAY1 = new Date(2026, 9, 13, 23, 58).getTime();
const DAY2 = new Date(2026, 9, 14, 0, 5).getTime();

describe('localDateKey', () => {
  it('uses local calendar date', () => {
    expect(localDateKey(DAY1)).toBe('2026-10-13');
    expect(localDateKey(DAY2)).toBe('2026-10-14');
  });
});

describe('validateSettings', () => {
  it('accepts values in range', () => {
    expect(validateSettings({ focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 }))
      .toEqual({ ok: true, settings: { focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 } });
  });
  it('rejects out-of-range, fractional, and empty values per field', () => {
    const r = validateSettings({ focusMin: 0, shortBreakMin: 2.5, longBreakMin: NaN, longBreakEvery: 4 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.focusMin).toBe('Enter a whole number from 1 to 90');
    expect(r.errors.shortBreakMin).toBe('Enter a whole number from 1 to 30');
    expect(r.errors.longBreakMin).toBe('Enter a whole number from 1 to 60');
    expect(r.errors.longBreakEvery).toBeUndefined();
  });
});

describe('settings persistence', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips saved settings', () => {
    const store = memoryStore();
    const s = { focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 };
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });
  it('falls back to defaults for corrupt or invalid data', () => {
    const store = memoryStore();
    store.setItem('deskBuddy.settings', '{not json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.setItem('deskBuddy.settings', JSON.stringify({ focusMin: 999 }));
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('progress', () => {
  it('starts at zero', () => {
    expect(loadProgress(memoryStore(), DAY1)).toEqual({ date: '2026-10-13', todayCount: 0, cycleCount: 0 });
  });
  it('records focus sessions on the same day', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 1);
    const p = recordFocus(store, DAY1, 2);
    expect(p).toEqual({ date: '2026-10-13', todayCount: 2, cycleCount: 2 });
    expect(loadProgress(store, DAY1)).toEqual(p);
  });
  it('rolls over to a new day on load', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 3);
    expect(loadProgress(store, DAY2)).toEqual({ date: '2026-10-14', todayCount: 0, cycleCount: 0 });
  });
  it('counts a session that finishes after midnight toward the new day', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 3);
    expect(recordFocus(store, DAY2, 4)).toEqual({ date: '2026-10-14', todayCount: 1, cycleCount: 1 });
  });
  it('treats corrupt same-day progress as missing', () => {
    const store = memoryStore();
    store.setItem('deskBuddy.progress', JSON.stringify({ date: '2026-10-13' }));
    expect(loadProgress(store, DAY1)).toEqual({ date: '2026-10-13', todayCount: 0, cycleCount: 0 });
    expect(recordFocus(store, DAY1, 1)).toEqual({ date: '2026-10-13', todayCount: 1, cycleCount: 1 });
  });
  it('resets the cycle but keeps the day total', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 4);
    expect(resetCycle(store, DAY1)).toEqual({ date: '2026-10-13', todayCount: 1, cycleCount: 0 });
  });
});

describe('mute', () => {
  it('defaults to unmuted and round-trips', () => {
    const store = memoryStore();
    expect(loadMuted(store)).toBe(false);
    saveMuted(store, true);
    expect(loadMuted(store)).toBe(true);
  });
});

describe('sound', () => {
  it('defaults to the chime, round-trips, and ignores unknown values', () => {
    const store = memoryStore();
    expect(loadSound(store)).toBe('chime');
    saveSound(store, 'marimba');
    expect(loadSound(store)).toBe('marimba');
    store.setItem('deskBuddy.sound', 'kazoo');
    expect(loadSound(store)).toBe('chime');
  });
});
