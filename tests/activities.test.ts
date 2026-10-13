import { describe, it, expect } from 'vitest';
import { BREAK_ACTIVITIES, createActivityPicker } from '../src/activities';

describe('createActivityPicker', () => {
  it('only picks known activities and never repeats the previous one', () => {
    const pick = createActivityPicker();
    let prev = pick();
    for (let i = 0; i < 100; i++) {
      const next = pick();
      expect(BREAK_ACTIVITIES).toContain(next);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('uses the injected random source', () => {
    const pick = createActivityPicker(() => 0);
    expect(pick()).toBe(BREAK_ACTIVITIES[0]);
    expect(pick()).toBe(BREAK_ACTIVITIES[1]);
    expect(pick()).toBe(BREAK_ACTIVITIES[0]);
  });
});
