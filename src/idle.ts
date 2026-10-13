export interface IdleWatcherOptions {
  now: () => number;
  delayMs: number;
  onDoze: () => void;
  onWake: () => void;
}

export class IdleWatcher {
  private last: number;
  private eligible = false;
  private sleeping = false;

  constructor(private readonly o: IdleWatcherOptions) {
    this.last = o.now();
  }

  get asleep(): boolean {
    return this.sleeping;
  }

  setEligible(eligible: boolean): void {
    if (eligible && !this.eligible) this.last = this.o.now();
    this.eligible = eligible;
  }

  activity(): void {
    this.last = this.o.now();
    if (this.sleeping) {
      this.sleeping = false;
      this.o.onWake();
    }
  }

  tick(): void {
    if (this.eligible && !this.sleeping && this.o.now() - this.last >= this.o.delayMs) {
      this.sleeping = true;
      this.o.onDoze();
    }
  }
}
