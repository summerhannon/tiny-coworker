import { describe, it, expect } from 'vitest';
import { restorePosition } from '../../src/desktop/placement';

const size = { width: 100, height: 100 };
const main = { x: 0, y: 0, width: 1000, height: 800 };
const second = { x: 1000, y: 0, width: 800, height: 600 };

describe('restorePosition', () => {
  it('keeps a fully visible position', () => {
    expect(restorePosition({ x: 200, y: 300 }, [main], size)).toEqual({ x: 200, y: 300 });
  });
  it('drops a position that is off every monitor', () => {
    expect(restorePosition({ x: 3000, y: 300 }, [main, second], size)).toBeNull();
  });
  it('keeps a position mostly (70%) on a second monitor', () => {
    expect(restorePosition({ x: 970, y: 100 }, [main, second], size)).toEqual({ x: 970, y: 100 });
  });
  it('drops a position only 30% on any monitor', () => {
    expect(restorePosition({ x: 1770, y: 100 }, [main, second], size)).toBeNull();
  });
  it('returns null when nothing was saved', () => {
    expect(restorePosition(null, [main], size)).toBeNull();
  });
});
