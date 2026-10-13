import { describe, it, expect, vi } from 'vitest';
import { IdleWatcher } from '../src/idle';

function make() {
  let t = 0;
  const onDoze = vi.fn();
  const onWake = vi.fn();
  const w = new IdleWatcher({ now: () => t, delayMs: 1000, onDoze, onWake });
  return { w, onDoze, onWake, advance(ms: number) { t += ms; w.tick(); } };
}

describe('IdleWatcher', () => {
  it('dozes after the delay while eligible', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(true);
    advance(999);
    expect(onDoze).not.toHaveBeenCalled();
    advance(1);
    expect(onDoze).toHaveBeenCalledOnce();
    expect(w.asleep).toBe(true);
    advance(5000);
    expect(onDoze).toHaveBeenCalledOnce();
  });

  it('never dozes while not eligible', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(false);
    advance(10_000);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('restarts the wait when becoming eligible', () => {
    const { w, onDoze, advance } = make();
    advance(5000);
    w.setEligible(true);
    advance(500);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('activity resets the wait', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(true);
    advance(800);
    w.activity();
    advance(800);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('activity wakes it up once', () => {
    const { w, onWake, advance } = make();
    w.setEligible(true);
    advance(1000);
    w.activity();
    w.activity();
    expect(onWake).toHaveBeenCalledOnce();
    expect(w.asleep).toBe(false);
  });
});
