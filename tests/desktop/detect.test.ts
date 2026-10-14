import { describe, it, expect, afterEach } from 'vitest';
import { isDesktop } from '../../src/desktop/detect';

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe('isDesktop', () => {
  it('is false in a plain browser', () => {
    expect(isDesktop()).toBe(false);
  });
  it('is true inside Tauri', () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    expect(isDesktop()).toBe(true);
  });
});
