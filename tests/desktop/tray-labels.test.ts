import { describe, it, expect } from 'vitest';
import { trayTitle, toggleLabel } from '../../src/desktop/tray-labels';
import type { TimerSnapshot } from '../../src/timer';

const snap = (status: TimerSnapshot['status'], remainingMs: number): TimerSnapshot =>
  ({ phase: 'focus', status, remainingMs, durationMs: 1500000, cycleCount: 0 });

describe('tray labels', () => {
  it('shows no title when ready', () => {
    expect(trayTitle(snap('ready', 1500000))).toBe('');
  });
  it('shows the time when running or paused', () => {
    expect(trayTitle(snap('running', 1500000))).toBe('25:00');
    expect(trayTitle(snap('paused', 1))).toBe('00:01');
  });
  it('names the toggle by status', () => {
    expect(toggleLabel('ready')).toBe('Start');
    expect(toggleLabel('running')).toBe('Pause');
    expect(toggleLabel('paused')).toBe('Resume');
  });
});
