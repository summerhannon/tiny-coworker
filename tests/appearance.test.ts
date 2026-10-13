import { describe, it, expect, vi, afterEach } from 'vitest';

function mockSystemDark(dark: boolean) {
  const listeners: (() => void)[] = [];
  const media = {
    matches: dark,
    addEventListener: (_: string, l: () => void) => listeners.push(l),
  };
  vi.stubGlobal('matchMedia', () => media);
  return {
    setDark(d: boolean) {
      media.matches = d;
      listeners.forEach((l) => l());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const scheme = () => document.documentElement.dataset.scheme;

describe('applyAppearance', () => {
  it('auto follows the system, including later changes', async () => {
    const system = mockSystemDark(false);
    const { applyAppearance } = await import('../src/appearance');
    applyAppearance('auto');
    expect(scheme()).toBe('light');
    system.setDark(true);
    expect(scheme()).toBe('dark');
  });

  it('light and dark ignore the system', async () => {
    const system = mockSystemDark(true);
    const { applyAppearance } = await import('../src/appearance');
    applyAppearance('light');
    expect(scheme()).toBe('light');
    applyAppearance('dark');
    system.setDark(false);
    expect(scheme()).toBe('dark');
  });
});
