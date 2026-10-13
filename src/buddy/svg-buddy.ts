import { Bubble, type BubbleOptions } from './bubble';
import { BUDDY_SVG } from './buddy-markup';
import type { Buddy, BuddyState, BuddyStateOptions } from './types';

export const WAKE_MS = 700;
const TALK_MS = 300;

type Side = 'l' | 'r';
/** Shoulder pivots in the body's coordinates (they match the arm pivots in buddy.css). */
const SHOULDERS: Record<Side, { x: number; y: number }> = { l: { x: 64, y: 118 }, r: { x: 136, y: 118 } };

interface Arm {
  side: Side;
  elbow: SVGCircleElement;
  hand: SVGCircleElement;
  paths: SVGPathElement[];
}

export class SvgBuddy implements Buddy {
  readonly element: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly bubble: Bubble;
  private state: BuddyState = 'idle';
  private wakeTimer?: ReturnType<typeof setTimeout>;
  private talkTimer?: ReturnType<typeof setTimeout>;
  private readonly bodyLoop: SVGGElement;
  private readonly arms: Arm[];

  constructor(bubbleOptions?: Partial<BubbleOptions>) {
    this.element = document.createElement('div');
    this.element.className = 'buddy';
    this.bubble = new Bubble(bubbleOptions);
    this.element.append(this.bubble.element);
    this.element.insertAdjacentHTML('beforeend', BUDDY_SVG);
    this.svg = this.element.querySelector('svg')!;
    this.bodyLoop = this.svg.querySelector<SVGGElement>('.b-body-loop')!;
    this.arms = (['l', 'r'] as const).map((side) => ({
      side,
      elbow: this.svg.querySelector<SVGCircleElement>(`[data-joint="${side}-elbow"]`)!,
      hand: this.svg.querySelector<SVGCircleElement>(`[data-joint="${side}-hand"]`)!,
      paths: [...this.svg.querySelectorAll<SVGPathElement>(`.b-arm-${side}`)],
    }));
    this.startArmLoop();
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
    if (next === 'break') this.svg.setAttribute('data-activity', opts.activity ?? 'coffee');
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

  /** CSS animates the invisible arm rigs; this redraws the visible arms to follow them every frame. */
  private startArmLoop(): void {
    // jsdom (tests) has no geometry; the static arms in the markup are used there.
    if (typeof requestAnimationFrame !== 'function' || typeof this.bodyLoop.getCTM !== 'function') return;
    const frame = () => {
      this.drawArms();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Draws each arm as one smooth curve from the shoulder through the elbow to the hand. */
  private drawArms(): void {
    const body = this.bodyLoop.getCTM();
    if (!body) return;
    const toBody = body.inverse();
    for (const arm of this.arms) {
      const s = SHOULDERS[arm.side];
      const e = jointPoint(arm.elbow, toBody);
      const h = jointPoint(arm.hand, toBody);
      if (!e || !h) continue;
      // Quadratic control point chosen so the curve passes through the elbow.
      const cx = 2 * e.x - (s.x + h.x) / 2;
      const cy = 2 * e.y - (s.y + h.y) / 2;
      const d = `M${s.x} ${s.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${h.x.toFixed(1)} ${h.y.toFixed(1)}`;
      for (const p of arm.paths) if (p.getAttribute('d') !== d) p.setAttribute('d', d);
    }
  }
}

/** Current position of a joint marker in the body's coordinates. */
function jointPoint(marker: SVGCircleElement, toBody: DOMMatrix): DOMPoint | null {
  const m = marker.getCTM();
  if (!m) return null;
  return new DOMPoint(marker.cx.baseVal.value, marker.cy.baseVal.value).matrixTransform(toBody.multiply(m));
}
