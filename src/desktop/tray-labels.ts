import { formatTime } from '../format';
import type { TimerSnapshot, TimerStatus } from '../timer';

/** Menu bar text: the time while a phase runs or is paused, nothing when ready. */
export function trayTitle(s: TimerSnapshot): string {
  return s.status === 'ready' ? '' : formatTime(s.remainingMs);
}

export function toggleLabel(status: TimerStatus): string {
  return status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';
}
