import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bubble } from '../src/buddy/bubble';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Bubble', () => {
  it('opens with the text and announces it', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('Hello');
    expect(b.isOpen).toBe(true);
    expect(b.text).toBe('Hello');
    expect(b.element.querySelector('[aria-live="polite"]')!.textContent).toBe('Hello');
  });

  it('closes after the hold time', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('Hello');
    vi.advanceTimersByTime(999);
    expect(b.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(b.isOpen).toBe(false);
  });

  it('closes the current line before opening a new one', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('First');
    vi.advanceTimersByTime(500);
    b.show('Second');
    expect(b.isOpen).toBe(false);
    vi.advanceTimersByTime(100);
    expect(b.isOpen).toBe(true);
    expect(b.text).toBe('Second');
    vi.advanceTimersByTime(999);
    expect(b.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(b.isOpen).toBe(false);
  });
});
