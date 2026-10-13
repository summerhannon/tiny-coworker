export type BuddyState = 'idle' | 'working' | 'break' | 'wave' | 'sleeping';

export interface BuddyStateOptions {
  /** Milestone wave: bigger celebration. */
  big?: boolean;
}

/** Everything the app knows about the buddy. SvgBuddy now, RiveBuddy in Phase 2. */
export interface Buddy {
  readonly element: HTMLElement;
  setState(state: BuddyState, opts?: BuddyStateOptions): void;
  setPaused(paused: boolean): void;
  say(text: string): void;
}
