import type { Durations, PhaseKind } from './config';

export type TimerStatus = 'ready' | 'running' | 'paused';

export type TimerEvent =
  | { type: 'started'; phase: PhaseKind }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'reset'; phase: PhaseKind }
  | { type: 'skipped'; from: PhaseKind; next: PhaseKind }
  | { type: 'completed'; phase: PhaseKind; next: PhaseKind; cycleComplete: boolean };

export interface TimerSnapshot {
  phase: PhaseKind;
  status: TimerStatus;
  remainingMs: number;
  durationMs: number;
  cycleCount: number;
}

export interface TimerOptions {
  now: () => number;
  durations: Durations;
  longBreakEvery: number;
  cycleCount?: number;
  phase?: PhaseKind;
}

type Listener = (e: TimerEvent) => void;

export class Timer {
  private readonly now: () => number;
  private durations: Durations;
  private longBreakEvery: number;
  private phase: PhaseKind = 'focus';
  private status: TimerStatus = 'ready';
  private phaseDuration: number;
  private endAt = 0;
  private pausedRemaining = 0;
  private cycleCount: number;
  private readonly listeners = new Set<Listener>();

  constructor(o: TimerOptions) {
    this.now = o.now;
    this.durations = o.durations;
    this.longBreakEvery = o.longBreakEvery;
    this.cycleCount = o.cycleCount ?? 0;
    this.phase = o.phase ?? 'focus';
    this.phaseDuration = o.durations[this.phase];
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): TimerSnapshot {
    return {
      phase: this.phase,
      status: this.status,
      remainingMs: this.remaining(),
      durationMs: this.phaseDuration,
      cycleCount: this.cycleCount,
    };
  }

  start(): void {
    if (this.status === 'running') return;
    if (this.status === 'paused') {
      this.endAt = this.now() + this.pausedRemaining;
      this.status = 'running';
      this.emit({ type: 'resumed' });
      return;
    }
    this.endAt = this.now() + this.phaseDuration;
    this.status = 'running';
    this.emit({ type: 'started', phase: this.phase });
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.pausedRemaining = this.remaining();
    this.status = 'paused';
    this.emit({ type: 'paused' });
  }

  toggle(): void {
    if (this.status === 'running') this.pause();
    else this.start();
  }

  reset(): void {
    this.prepare(this.phase);
    this.emit({ type: 'reset', phase: this.phase });
  }

  skip(): void {
    const from = this.phase;
    const next = this.advancePhase(false);
    this.prepare(next);
    this.emit({ type: 'skipped', from, next });
  }

  tick(): void {
    if (this.status === 'running' && this.now() >= this.endAt) this.complete();
  }

  setConfig(durations: Durations, longBreakEvery: number): void {
    this.durations = durations;
    this.longBreakEvery = longBreakEvery;
    if (this.status === 'ready') this.phaseDuration = durations[this.phase];
  }

  setCycleCount(n: number): void {
    this.cycleCount = n;
  }

  private remaining(): number {
    if (this.status === 'running') return Math.max(0, this.endAt - this.now());
    if (this.status === 'paused') return this.pausedRemaining;
    return this.phaseDuration;
  }

  private complete(): void {
    const phase = this.phase;
    const next = this.advancePhase(true);
    const cycleComplete = phase === 'focus' && next === 'longBreak';
    this.prepare(next);
    this.emit({ type: 'completed', phase, next, cycleComplete });
  }

  /** Decides the phase after the current one, updating the cycle count. */
  private advancePhase(countFocus: boolean): PhaseKind {
    if (this.phase === 'focus') {
      if (!countFocus) return 'shortBreak';
      this.cycleCount += 1;
      return this.cycleCount >= this.longBreakEvery ? 'longBreak' : 'shortBreak';
    }
    if (this.phase === 'longBreak') this.cycleCount = 0;
    return 'focus';
  }

  private prepare(next: PhaseKind): void {
    this.phase = next;
    this.status = 'ready';
    this.phaseDuration = this.durations[next];
  }

  private emit(e: TimerEvent): void {
    for (const l of this.listeners) l(e);
  }
}
