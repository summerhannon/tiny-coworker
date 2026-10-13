import { describe, it, expect, vi } from 'vitest';
import { onStoredSettingsChange } from '../../src/desktop/sync';

function handlers() {
  return { settings: vi.fn(), look: vi.fn(), sound: vi.fn(), desktop: vi.fn() };
}

describe('onStoredSettingsChange', () => {
  it.each([
    ['deskBuddy.settings', 'settings'],
    ['deskBuddy.color', 'look'],
    ['deskBuddy.appearance', 'look'],
    ['deskBuddy.sound', 'sound'],
    ['deskBuddy.desktop', 'desktop'],
  ] as const)('%s reapplies %s', (key, which) => {
    const h = handlers();
    onStoredSettingsChange({ key }, h);
    expect(h[which]).toHaveBeenCalledOnce();
    const others = (Object.keys(h) as (keyof typeof h)[]).filter((k) => k !== which);
    for (const k of others) expect(h[k]).not.toHaveBeenCalled();
  });

  it('reapplies everything when storage is cleared', () => {
    const h = handlers();
    onStoredSettingsChange({ key: null }, h);
    for (const fn of Object.values(h)) expect(fn).toHaveBeenCalledOnce();
  });

  it('ignores unrelated keys like progress', () => {
    const h = handlers();
    onStoredSettingsChange({ key: 'deskBuddy.progress' }, h);
    for (const fn of Object.values(h)) expect(fn).not.toHaveBeenCalled();
  });
});
