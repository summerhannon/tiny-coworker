import './styles.css';
import './buddy/buddy.css';
import { SvgBuddy } from './buddy/svg-buddy';
import { Chime } from './chime';
import {
  DEMO_DOZE_MS, DEMO_DURATIONS, DOZE_MS, WAVE_MS, durationsFromSettings, type Settings,
} from './config';
import { Controller } from './controller';
import { createPicker } from './messages';
import {
  loadMuted, loadProgress, loadSettings, memoryStore, recordFocus, resetCycle,
  safeLocalStorage, saveMuted, saveSettings,
} from './storage';
import { Timer } from './timer';
import { createSettingsPanel } from './ui/settings-panel';
import { createView } from './ui/view';

const demo = new URLSearchParams(location.search).has('demo');
const store = demo ? memoryStore() : safeLocalStorage();
const now = () => Date.now();
const durationsFor = (s: Settings) => (demo ? DEMO_DURATIONS : durationsFromSettings(s));

let settings = loadSettings(store);
let progress = loadProgress(store, now());

const timer = new Timer({
  now,
  durations: durationsFor(settings),
  longBreakEvery: settings.longBreakEvery,
  cycleCount: progress.cycleCount,
  phase: progress.cycleCount >= settings.longBreakEvery ? 'longBreak' : 'focus',
});
const buddy = new SvgBuddy();
const chime = new Chime(loadMuted(store));

const controller = new Controller({
  timer,
  buddy,
  chime,
  pickLine: createPicker(),
  recordFocus: (cycleCount) => recordFocus(store, now(), cycleCount),
  resetCycle: () => resetCycle(store, now()),
  onProgress: (p) => (progress = p),
  now,
  dozeMs: demo ? DEMO_DOZE_MS : DOZE_MS,
  waveMs: WAVE_MS,
});

const toggle = () => {
  chime.unlock();
  timer.toggle();
};

const panel = createSettingsPanel({
  getSettings: () => settings,
  onSave: (s) => {
    settings = s;
    saveSettings(store, s);
    timer.setConfig(durationsFor(s), s.longBreakEvery);
  },
});
document.body.append(panel.element);

const view = createView(document.getElementById('app')!, buddy.element, {
  onToggle: toggle,
  onSkip: () => timer.skip(),
  onReset: () => timer.reset(),
  onOpenSettings: () => panel.open(),
  onToggleMute: () => {
    chime.muted = !chime.muted;
    saveMuted(store, chime.muted);
  },
});

// Any input counts as activity (wakes a sleeping buddy) before it's handled.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, () => controller.userActivity(), { capture: true });
}

// Space toggles start/pause, unless focus is on something Space already operates.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  if ((e.target as HTMLElement).closest('button, input, textarea, select, dialog')) return;
  e.preventDefault();
  toggle();
});

function frame(): void {
  controller.tick();
  view.render({
    snapshot: timer.snapshot(),
    todayCount: progress.todayCount,
    longBreakEvery: settings.longBreakEvery,
    muted: chime.muted,
  });
}

const loop = () => {
  requestAnimationFrame(loop);
  frame();
};
requestAnimationFrame(loop);
// rAF pauses in background tabs; this keeps phase ends (and the chime) firing there.
setInterval(frame, 1000);
