import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SvgBuddy, WAKE_MS } from '../src/buddy/svg-buddy';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const svgOf = (b: SvgBuddy) => b.element.querySelector('svg')!;

describe('SvgBuddy', () => {
  it('renders the bubble and svg, starting idle', () => {
    const b = new SvgBuddy();
    expect(b.element.querySelector('.bubble')).not.toBeNull();
    expect(svgOf(b).getAttribute('data-state')).toBe('idle');
    expect(b.current).toBe('idle');
  });

  it('sets state and big flag', () => {
    const b = new SvgBuddy();
    b.setState('wave', { big: true });
    expect(svgOf(b).getAttribute('data-state')).toBe('wave');
    expect(svgOf(b).getAttribute('data-big')).toBe('true');
    b.setState('idle');
    expect(svgOf(b).getAttribute('data-big')).toBe('false');
  });

  it('sets paused flag', () => {
    const b = new SvgBuddy();
    b.setPaused(true);
    expect(svgOf(b).getAttribute('data-paused')).toBe('true');
  });

  it('keeps the laptop when falling asleep from working', () => {
    const b = new SvgBuddy();
    b.setState('working');
    b.setState('sleeping');
    expect(svgOf(b).getAttribute('data-laptop')).toBe('true');
    b.setState('idle');
    b.setState('sleeping');
    expect(svgOf(b).getAttribute('data-laptop')).toBe('false');
  });

  it('plays the wake animation when leaving sleep', () => {
    const b = new SvgBuddy();
    b.setState('sleeping');
    b.setState('idle');
    expect(svgOf(b).classList.contains('b-waking')).toBe(true);
    vi.advanceTimersByTime(WAKE_MS);
    expect(svgOf(b).classList.contains('b-waking')).toBe(false);
  });

  it('says text through the bubble and pops the mouth', () => {
    const b = new SvgBuddy({ holdMs: 1000 });
    b.say('Hi');
    expect(b.element.querySelector('.bubble-box')!.textContent).toBe('Hi');
    expect(svgOf(b).classList.contains('b-talking')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(svgOf(b).classList.contains('b-talking')).toBe(false);
  });
});
