import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controller } from '../src/controller';
import { Timer } from '../src/timer';
import { memoryStore, recordFocus, resetCycle, type DayProgress } from '../src/storage';
import type { Buddy, BuddyState, BuddyStateOptions } from '../src/buddy/types';

class FakeBuddy implements Buddy {
  element = document.createElement('div');
  state: BuddyState = 'idle';
  opts: BuddyStateOptions | undefined;
  paused = false;
  said: string[] = [];
  setState(s: BuddyState, o?: BuddyStateOptions) { this.state = s; this.opts = o; }
  setPaused(p: boolean) { this.paused = p; }
  say(t: string) { this.said.push(t); }
}

function setup() {
  const now = () => Date.now();
  const timer = new Timer({ now, durations: { focus: 1000, shortBreak: 500, longBreak: 800 }, longBreakEvery: 2 });
  const buddy = new FakeBuddy();
  const chime = { play: vi.fn() };
  const store = memoryStore();
  let progress: DayProgress | undefined;
  const c = new Controller({
    timer, buddy, chime,
    pickLine: (m) => `line:${m}`,
    recordFocus: (n) => recordFocus(store, now(), n),
    resetCycle: () => resetCycle(store, now()),
    onProgress: (p) => { progress = p; },
    now, dozeMs: 10_000, waveMs: 5_000,
  });
  const advance = (ms: number) => { vi.advanceTimersByTime(ms); c.tick(); };
  return { timer, buddy, chime, c, advance, progress: () => progress };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('Controller', () => {
  it('starts idle and silent', () => {
    const { buddy } = setup();
    expect(buddy.state).toBe('idle');
    expect(buddy.said).toEqual([]);
  });

  it('starting focus shows working and says a focus line', () => {
    const { timer, buddy } = setup();
    timer.start();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(false);
    expect(buddy.said).toEqual(['line:focusStart']);
  });

  it('pausing keeps the pose and says nothing', () => {
    const { timer, buddy } = setup();
    timer.start();
    timer.pause();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(true);
    timer.start();
    expect(buddy.paused).toBe(false);
    expect(buddy.said).toEqual(['line:focusStart']);
  });

  it('completing focus waves, chimes, records progress, then returns to idle', () => {
    const { timer, buddy, chime, advance, progress } = setup();
    timer.start();
    advance(1000);
    expect(buddy.state).toBe('wave');
    expect(buddy.opts).toEqual({ big: false });
    expect(chime.play).toHaveBeenCalledOnce();
    expect(buddy.said.at(-1)).toBe('line:focusEnd');
    expect(progress()).toMatchObject({ todayCount: 1, cycleCount: 1 });
    advance(5000);
    expect(buddy.state).toBe('idle');
  });

  it('starting a break sips coffee and ending it says a break-end line', () => {
    const { timer, buddy, advance } = setup();
    timer.start(); advance(1000);
    timer.start();
    expect(buddy.state).toBe('break');
    expect(buddy.said.at(-1)).toBe('line:breakStart');
    advance(500);
    expect(buddy.state).toBe('wave');
    expect(buddy.said.at(-1)).toBe('line:breakEnd');
  });

  it('the last focus of a cycle gets a big wave and a milestone line; long break resets the cycle', () => {
    const { timer, buddy, advance, progress } = setup();
    timer.start(); advance(1000);
    timer.start(); advance(500);
    timer.start(); advance(1000);
    expect(buddy.opts).toEqual({ big: true });
    expect(buddy.said.at(-1)).toBe('line:milestone');
    expect(progress()).toMatchObject({ todayCount: 2, cycleCount: 2 });
    timer.start(); advance(800);
    expect(progress()).toMatchObject({ todayCount: 2, cycleCount: 0 });
  });

  it('skip and reset go idle without a bubble', () => {
    const { timer, buddy } = setup();
    timer.start();
    timer.reset();
    expect(buddy.state).toBe('idle');
    timer.start();
    timer.skip();
    expect(buddy.state).toBe('idle');
    expect(buddy.said).toEqual(['line:focusStart', 'line:focusStart']);
  });

  it('dozes after the delay when idle and wakes on activity', () => {
    const { c, buddy, advance } = setup();
    advance(10_000);
    expect(buddy.state).toBe('sleeping');
    c.userActivity();
    expect(buddy.state).toBe('idle');
  });

  it('wakes back into a paused working pose', () => {
    const { c, timer, buddy, advance } = setup();
    timer.start();
    timer.pause();
    advance(10_000);
    expect(buddy.state).toBe('sleeping');
    c.userActivity();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(true);
  });

  it('never dozes while the timer is running', () => {
    const { timer, buddy, advance } = setup();
    timer.setConfig({ focus: 60_000, shortBreak: 500, longBreak: 800 }, 2);
    timer.start();
    advance(30_000);
    expect(buddy.state).toBe('working');
  });

  it('a new event cancels the pending return to idle', () => {
    const { timer, buddy, advance } = setup();
    timer.start(); advance(1000);
    timer.start();
    timer.pause();
    advance(5000);
    expect(buddy.state).toBe('break');
  });
});
