import { describe, it, expect } from 'vitest';
import { memoryStore } from '../../src/storage';
import { loadDesktopPrefs, saveDesktopPrefs, loadWindowPosition, saveWindowPosition } from '../../src/desktop/prefs';

describe('desktop prefs', () => {
  it('defaults to dock on, buddy shown, click-through off', () => {
    expect(loadDesktopPrefs(memoryStore())).toEqual({ clickThrough: false, showInDock: true, showBuddy: true });
  });
  it('round-trips', () => {
    const store = memoryStore();
    const p = { clickThrough: true, showInDock: false, showBuddy: false };
    saveDesktopPrefs(store, p);
    expect(loadDesktopPrefs(store)).toEqual(p);
  });
  it('falls back to defaults for corrupt data', () => {
    const store = memoryStore();
    store.setItem('deskBuddy.desktop', '{nope');
    expect(loadDesktopPrefs(store).showInDock).toBe(true);
    store.setItem('deskBuddy.desktop', JSON.stringify({ clickThrough: 'yes' }));
    expect(loadDesktopPrefs(store)).toEqual({ clickThrough: false, showInDock: true, showBuddy: true });
  });
});

describe('window position', () => {
  it('is null when missing and round-trips', () => {
    const store = memoryStore();
    expect(loadWindowPosition(store)).toBeNull();
    saveWindowPosition(store, { x: 120, y: 40 });
    expect(loadWindowPosition(store)).toEqual({ x: 120, y: 40 });
  });
  it('is null when not numeric', () => {
    const store = memoryStore();
    store.setItem('deskBuddy.windowPos', JSON.stringify({ x: 'a', y: 2 }));
    expect(loadWindowPosition(store)).toBeNull();
  });
});
