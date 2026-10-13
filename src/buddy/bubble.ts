import { BUBBLE_HOLD_MS } from '../config';

export interface BubbleOptions {
  holdMs: number;
  /** How long the old bubble takes to close before a new one opens. Matches the CSS close transition. */
  swapMs: number;
}

export class Bubble {
  readonly element: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private readonly live: HTMLSpanElement;
  private readonly opts: BubbleOptions;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private swapTimer?: ReturnType<typeof setTimeout>;

  constructor(opts: Partial<BubbleOptions> = {}) {
    this.opts = { holdMs: BUBBLE_HOLD_MS, swapMs: 150, ...opts };
    this.element = document.createElement('div');
    this.element.className = 'bubble';
    this.box = document.createElement('div');
    this.box.className = 'bubble-box';
    this.box.setAttribute('aria-hidden', 'true');
    this.live = document.createElement('span');
    this.live.className = 'sr-only';
    this.live.setAttribute('aria-live', 'polite');
    this.element.append(this.box, this.live);
  }

  get isOpen(): boolean {
    return this.box.hasAttribute('data-open');
  }

  get text(): string {
    return this.box.textContent ?? '';
  }

  show(text: string): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.swapTimer);
    if (this.isOpen) {
      this.close();
      this.swapTimer = setTimeout(() => this.open(text), this.opts.swapMs);
    } else {
      this.open(text);
    }
  }

  private open(text: string): void {
    this.box.textContent = text;
    this.live.textContent = text;
    this.box.setAttribute('data-open', '');
    this.hideTimer = setTimeout(() => this.close(), this.opts.holdMs);
  }

  private close(): void {
    this.box.removeAttribute('data-open');
  }
}
