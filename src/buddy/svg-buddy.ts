import { Bubble, type BubbleOptions } from './bubble';
import { BUDDY_SVG } from './buddy-markup';
import type { Buddy, BuddyState, BuddyStateOptions } from './types';

export const WAKE_MS = 700;
const TALK_MS = 300;

export class SvgBuddy implements Buddy {
  readonly element: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly bubble: Bubble;
  private state: BuddyState = 'idle';
  private wakeTimer?: ReturnType<typeof setTimeout>;
  private talkTimer?: ReturnType<typeof setTimeout>;

  constructor(bubbleOptions?: Partial<BubbleOptions>) {
    this.element = document.createElement('div');
    this.element.className = 'buddy';
    this.bubble = new Bubble(bubbleOptions);
    this.element.append(this.bubble.element);
    this.element.insertAdjacentHTML('beforeend', BUDDY_SVG);
    this.svg = this.element.querySelector('svg')!;
  }

  get current(): BuddyState {
    return this.state;
  }

  setState(next: BuddyState, opts: BuddyStateOptions = {}): void {
    const prev = this.state;
    if (next === 'sleeping') this.svg.setAttribute('data-laptop', String(prev === 'working'));
    if (prev === 'sleeping' && next !== 'sleeping') this.playWake();
    this.state = next;
    this.svg.setAttribute('data-state', next);
    this.svg.setAttribute('data-big', String(opts.big ?? false));
  }

  setPaused(paused: boolean): void {
    this.svg.setAttribute('data-paused', String(paused));
  }

  say(text: string): void {
    this.bubble.show(text);
    clearTimeout(this.talkTimer);
    this.svg.classList.remove('b-talking');
    void this.svg.getBoundingClientRect(); // restart the pop animation
    this.svg.classList.add('b-talking');
    this.talkTimer = setTimeout(() => this.svg.classList.remove('b-talking'), TALK_MS);
  }

  private playWake(): void {
    clearTimeout(this.wakeTimer);
    this.svg.classList.add('b-waking');
    this.wakeTimer = setTimeout(() => this.svg.classList.remove('b-waking'), WAKE_MS);
  }
}
