import { ACTIVITY_MOMENTS, type BreakActivity } from './activities';
import type { Buddy, BuddyState, BuddyStateOptions } from './buddy/types';
import { IdleWatcher } from './idle';
import type { Moment } from './messages';
import type { DayProgress } from './storage';
import type { Timer, TimerEvent } from './timer';

export interface ControllerDeps {
  timer: Timer;
  buddy: Buddy;
  chime: { play(): void };
  pickLine: (m: Moment) => string;
  pickActivity: () => BreakActivity;
  recordFocus: (cycleCount: number) => DayProgress;
  resetCycle: () => DayProgress;
  onProgress: (p: DayProgress) => void;
  /** Optional: told the buddy's line whenever a phase ends (desktop notifications use it). */
  onPhaseEnd?: (line: string) => void;
  now: () => number;
  dozeMs: number;
  waveMs: number;
}

export class Controller {
  private state: BuddyState = 'idle';
  private opts: BuddyStateOptions | undefined;
  private beforeSleep: { state: BuddyState; opts?: BuddyStateOptions } = { state: 'idle' };
  private waveTimer?: ReturnType<typeof setTimeout>;
  private readonly idle: IdleWatcher;

  constructor(private readonly d: ControllerDeps) {
    this.idle = new IdleWatcher({
      now: d.now,
      delayMs: d.dozeMs,
      onDoze: () => this.doze(),
      onWake: () => this.show(this.beforeSleep.state, this.beforeSleep.opts),
    });
    d.timer.on((e) => this.handle(e));
    this.show('idle');
    this.idle.setEligible(true);
  }

  get buddyState(): BuddyState {
    return this.state;
  }

  tick(): void {
    this.d.timer.tick();
    this.idle.tick();
  }

  userActivity(): void {
    this.idle.activity();
  }

  private show(s: BuddyState, opts?: BuddyStateOptions): void {
    this.state = s;
    this.opts = opts;
    this.d.buddy.setState(s, opts);
  }

  private handle(e: TimerEvent): void {
    clearTimeout(this.waveTimer);
    const { buddy, pickLine } = this.d;
    switch (e.type) {
      case 'started':
        buddy.setPaused(false);
        if (e.phase === 'focus') {
          this.show('working');
          buddy.say(pickLine('focusStart'));
        } else {
          const activity = this.d.pickActivity();
          this.show('break', { activity });
          buddy.say(pickLine(ACTIVITY_MOMENTS[activity]));
        }
        this.idle.setEligible(false);
        break;
      case 'paused':
        buddy.setPaused(true);
        this.idle.setEligible(true);
        break;
      case 'resumed':
        buddy.setPaused(false);
        this.idle.setEligible(false);
        break;
      case 'reset':
      case 'skipped':
        buddy.setPaused(false);
        this.show('idle');
        this.idle.setEligible(true);
        if (e.type === 'skipped' && e.from === 'longBreak') this.d.onProgress(this.d.resetCycle());
        break;
      case 'completed':
        this.complete(e);
        break;
    }
  }

  private complete(e: Extract<TimerEvent, { type: 'completed' }>): void {
    const { timer, buddy, pickLine } = this.d;
    this.d.chime.play();
    if (e.phase === 'focus') {
      const timerCycle = timer.snapshot().cycleCount;
      const p = this.d.recordFocus(timerCycle);
      if (p.cycleCount !== timerCycle) timer.setCycleCount(p.cycleCount); // new day restarted the cycle
      this.d.onProgress(p);
    } else if (e.phase === 'longBreak') {
      this.d.onProgress(this.d.resetCycle());
    }
    const moment: Moment = e.cycleComplete ? 'milestone' : e.phase === 'focus' ? 'focusEnd' : 'breakEnd';
    buddy.setPaused(false);
    this.show('wave', { big: e.cycleComplete });
    const line = pickLine(moment);
    buddy.say(line);
    this.d.onPhaseEnd?.(line);
    this.idle.setEligible(true);
    this.waveTimer = setTimeout(() => {
      if (this.state === 'wave') this.show('idle');
    }, this.d.waveMs);
  }

  private doze(): void {
    clearTimeout(this.waveTimer);
    this.beforeSleep = this.state === 'wave' ? { state: 'idle' } : { state: this.state, opts: this.opts };
    this.show('sleeping');
  }
}
