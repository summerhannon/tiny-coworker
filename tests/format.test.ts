import { describe, it, expect } from 'vitest';
import { formatTime } from '../src/format';

describe('formatTime', () => {
  it('formats whole minutes', () => {
    expect(formatTime(25 * 60_000)).toBe('25:00');
  });
  it('rounds partial seconds up so 00:00 only shows at the end', () => {
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(59_001)).toBe('01:00');
  });
  it('shows zero', () => {
    expect(formatTime(0)).toBe('00:00');
  });
  it('handles long phases', () => {
    expect(formatTime(90 * 60_000)).toBe('90:00');
  });
});
