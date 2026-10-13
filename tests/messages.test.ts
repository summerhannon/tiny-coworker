import { describe, it, expect } from 'vitest';
import { LINES, createPicker, type Moment } from '../src/messages';

describe('LINES', () => {
  it('has at least one line for every moment', () => {
    const moments: Moment[] = ['focusStart', 'focusEnd', 'breakEnd', 'breakStart', 'milestone'];
    for (const m of moments) expect(LINES[m].length).toBeGreaterThan(0);
  });
});

describe('createPicker', () => {
  it('never repeats the previous line for a moment', () => {
    const pick = createPicker();
    let prev = pick('focusStart');
    for (let i = 0; i < 50; i++) {
      const next = pick('focusStart');
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('tracks moments independently', () => {
    const lines = { focusStart: ['a', 'b'], focusEnd: ['a', 'b'], breakEnd: ['x'], breakStart: ['y'], milestone: ['z'] };
    const pick = createPicker(lines, () => 0);
    expect(pick('focusStart')).toBe('a');
    expect(pick('focusEnd')).toBe('a');
    expect(pick('focusStart')).toBe('b');
  });

  it('repeats when a pool has a single line', () => {
    const lines = { focusStart: ['only'], focusEnd: ['a'], breakEnd: ['x'], breakStart: ['y'], milestone: ['z'] };
    const pick = createPicker(lines);
    expect(pick('focusStart')).toBe('only');
    expect(pick('focusStart')).toBe('only');
  });
});
