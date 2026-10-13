import type { Appearance } from './config';

const systemDark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
let current: Appearance = 'auto';

/** Sets data-scheme on <html> ("light" or "dark"); the CSS reads only that attribute. */
function render(): void {
  const dark = current === 'dark' || (current === 'auto' && !!systemDark?.matches);
  document.documentElement.dataset.scheme = dark ? 'dark' : 'light';
}

// Auto keeps following the system, e.g. when macOS switches at sunset.
systemDark?.addEventListener('change', render);

export function applyAppearance(appearance: Appearance): void {
  current = appearance;
  render();
}
