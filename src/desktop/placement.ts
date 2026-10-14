import type { Point } from './prefs';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How much of the window must sit on one monitor for its saved position to be reused. */
const MIN_VISIBLE = 0.6;

/** The saved position if the window would still be mostly on a monitor, otherwise null (center it). */
export function restorePosition(
  saved: Point | null,
  monitors: Rect[],
  size: { width: number; height: number },
): Point | null {
  if (!saved) return null;
  const area = size.width * size.height;
  const visible = monitors.some((m) => {
    const w = Math.min(saved.x + size.width, m.x + m.width) - Math.max(saved.x, m.x);
    const h = Math.min(saved.y + size.height, m.y + m.height) - Math.max(saved.y, m.y);
    return w > 0 && h > 0 && (w * h) / area >= MIN_VISIBLE;
  });
  return visible ? saved : null;
}
