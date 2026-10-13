import { PHASE_LABELS } from '../config';
import { formatTime } from '../format';
import type { TimerSnapshot } from '../timer';
import { SETTINGS_ICON, SOUND_ICON } from './icons';

export interface ViewHandlers {
  onToggle(): void;
  onSkip(): void;
  onReset(): void;
  onOpenSettings(): void;
  onToggleMute(): void;
}

export interface ViewModel {
  snapshot: TimerSnapshot;
  todayCount: number;
  longBreakEvery: number;
  muted: boolean;
}

const MARKUP = `
<main class="app">
  <div class="app-top">
    <span class="phase-label"></span>
    <div class="icon-row">
      <button class="icon-btn" data-action="settings" aria-label="Settings">${SETTINGS_ICON}</button>
      <button class="icon-btn" data-action="mute" aria-label="Mute chime" aria-pressed="false">${SOUND_ICON}</button>
    </div>
  </div>
  <div class="buddy-slot"></div>
  <div class="readout">
    <div class="time" role="timer"></div>
    <div class="dots-row"><span class="dots" aria-hidden="true"></span><span class="today"></span><span class="sr-only cycle-text"></span></div>
  <span class="sr-only phase-live" aria-live="polite"></span>
  </div>
  <div class="controls">
    <button class="primary" data-action="toggle"></button>
    <button data-action="skip">Skip</button>
    <button data-action="reset">Reset</button>
  </div>
</main>`;

export function createView(root: HTMLElement, buddyEl: HTMLElement, h: ViewHandlers) {
  root.innerHTML = MARKUP;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  q('.buddy-slot').append(buddyEl);
  const phaseEl = q('.phase-label');
  const timeEl = q('.time');
  const dotsEl = q('.dots');
  const todayEl = q('.today');
  const cycleEl = q('.cycle-text');
  const liveEl = q('.phase-live');
  const toggleBtn = q<HTMLButtonElement>('[data-action="toggle"]');
  const muteBtn = q<HTMLButtonElement>('[data-action="mute"]');

  const actions: Record<string, () => void> = {
    toggle: h.onToggle,
    skip: h.onSkip,
    reset: h.onReset,
    settings: h.onOpenSettings,
    mute: h.onToggleMute,
  };
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (btn) actions[btn.dataset.action!]?.();
  });

  const setText = (el: HTMLElement, text: string) => {
    if (el.textContent !== text) el.textContent = text;
  };
  let dotsKey = '';
  let liveKey = '';

  return {
    render(m: ViewModel): void {
      const { phase, status, remainingMs, cycleCount } = m.snapshot;
      const label = PHASE_LABELS[phase];
      const time = formatTime(remainingMs);
      setText(phaseEl, label);
      setText(timeEl, time);
      setText(toggleBtn, status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start');
      setText(todayEl, `${m.todayCount} today`);
      const title = status === 'ready' ? 'Desk Buddy' : `${time} · ${label}`;
      if (document.title !== title) document.title = title;
      const nextLive = `${phase}/${status}`;
      if (nextLive !== liveKey) {
        const first = liveKey === '';
        liveKey = nextLive;
        if (!first) {
          liveEl.textContent = status === 'ready' ? `${label} ready`
            : status === 'running' ? `${label} started` : `${label} paused`;
        }
      }
      muteBtn.setAttribute('aria-pressed', String(m.muted));

      const filled = Math.min(cycleCount, m.longBreakEvery);
      const key = `${filled}/${m.longBreakEvery}`;
      if (key !== dotsKey) {
        dotsKey = key;
        cycleEl.textContent = `${filled} of ${m.longBreakEvery} this cycle`;
        dotsEl.innerHTML = Array.from({ length: m.longBreakEvery }, (_, i) =>
          `<span class="dot${i < filled ? ' filled' : ''}"></span>`).join('');
      }
    },
  };
}
