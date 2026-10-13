import { describe, it, expect } from 'vitest';
import { Timer, type TimerEvent } from '../src/timer';

const D = { focus: 1000, shortBreak: 300, longBreak: 600 };

function make(every = 3, cycleCount = 0) {
  let t = 0;
  const timer = new Timer({ now: () => t, durations: D, longBreakEvery: every, cycleCount });
  const events: TimerEvent[] = [];
  timer.on((e) => events.push(e));
  return {
    timer,
    events,
    advance(ms: number) {
      t += ms;
      timer.tick();
    },
  };
}

describe('Timer', () => {
  it('starts ready in focus at full length', () => {
    const { timer } = make();
    expect(timer.snapshot()).toEqual({
      phase: 'focus', status: 'ready', remainingMs: 1000, durationMs: 1000, cycleCount: 0,
    });
  });

  it('counts down after start', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(400);
    expect(events[0]).toEqual({ type: 'started', phase: 'focus' });
    expect(timer.snapshot().remainingMs).toBe(600);
    expect(timer.snapshot().status).toBe('running');
  });

  it('pause freezes the countdown and resume continues it', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(400);
    timer.pause();
    advance(5000);
    expect(timer.snapshot()).toMatchObject({ status: 'paused', remainingMs: 600 });
    timer.start();
    expect(events.at(-1)).toEqual({ type: 'resumed' });
    advance(599);
    expect(timer.snapshot().status).toBe('running');
    advance(1);
    expect(events.at(-1)).toMatchObject({ type: 'completed', phase: 'focus' });
  });

  it('toggle starts and pauses', () => {
    const { timer } = make();
    timer.toggle();
    expect(timer.snapshot().status).toBe('running');
    timer.toggle();
    expect(timer.snapshot().status).toBe('paused');
  });

  it('completing focus prepares a short break and counts the session', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(1000);
    expect(events.at(-1)).toEqual({ type: 'completed', phase: 'focus', next: 'shortBreak', cycleComplete: false });
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'ready', remainingMs: 300, cycleCount: 1 });
  });

  it('gives a long break after N focus sessions, then resets the cycle', () => {
    const { timer, events, advance } = make(2);
    timer.start(); advance(1000); // focus 1
    timer.start(); advance(300);  // short break
    timer.start(); advance(1000); // focus 2
    expect(events.at(-1)).toEqual({ type: 'completed', phase: 'focus', next: 'longBreak', cycleComplete: true });
    expect(timer.snapshot()).toMatchObject({ phase: 'longBreak', cycleCount: 2 });
    timer.start(); advance(600);
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', cycleCount: 0 });
  });

  it('skipping focus does not count it', () => {
    const { timer, events } = make();
    timer.start();
    timer.skip();
    expect(events.at(-1)).toEqual({ type: 'skipped', from: 'focus', next: 'shortBreak' });
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'ready', cycleCount: 0 });
  });

  it('skipping a long break resets the cycle', () => {
    const { timer, advance } = make(2, 1);
    timer.start(); advance(1000);
    expect(timer.snapshot().phase).toBe('longBreak');
    timer.skip();
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', cycleCount: 0 });
  });

  it('reset returns the current phase to full length', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(300);
    timer.reset();
    expect(events.at(-1)).toEqual({ type: 'reset', phase: 'focus' });
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', status: 'ready', remainingMs: 1000 });
  });

  it('completes exactly once after a large clock jump', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(999);
    expect(timer.snapshot().remainingMs).toBe(1);
    advance(10_000);
    advance(10_000);
    expect(events.filter((e) => e.type === 'completed')).toHaveLength(1);
  });

  it('applies new settings from the next phase while running', () => {
    const { timer, advance } = make();
    timer.start();
    timer.setConfig({ focus: 5000, shortBreak: 2000, longBreak: 3000 }, 3);
    expect(timer.snapshot().remainingMs).toBe(1000);
    advance(1000);
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', remainingMs: 2000 });
  });

  it('applies new settings immediately when the phase has not started', () => {
    const { timer } = make();
    timer.setConfig({ focus: 5000, shortBreak: 2000, longBreak: 3000 }, 3);
    expect(timer.snapshot().remainingMs).toBe(5000);
  });

  it('unsubscribes listeners', () => {
    const { timer } = make();
    const seen: TimerEvent[] = [];
    const off = timer.on((e) => seen.push(e));
    off();
    timer.start();
    expect(seen).toHaveLength(0);
  });
});
