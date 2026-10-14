import './fonts';
import './styles.css';
import './buddy/buddy.css';
import './themes.css';
import { SvgBuddy } from './buddy/svg-buddy';
import { createActivityPicker } from './activities';
import { applyAppearance } from './appearance';
import { Chime } from './chime';
import {
  DEMO_DOZE_MS, DEMO_DURATIONS, DOZE_MS, WAVE_MS, durationsFromSettings, type Settings,
} from './config';
import { Controller } from './controller';
import { createPicker } from './messages';
import {
  loadAppearance, loadBuddyColor, loadMuted, loadProgress, loadSettings, loadSound, memoryStore, recordFocus,
  resetCycle, safeLocalStorage, saveAppearance, saveBuddyColor, saveMuted, saveSettings, saveSound,
} from './storage';
import { Timer } from './timer';
import { createSettingsPanel, type Prefs } from './ui/settings-panel';
import { createView } from './ui/view';
import { isDesktop } from './desktop/detect';

const demo = new URLSearchParams(location.search).has('demo');
const store = demo ? memoryStore() : safeLocalStorage();
const now = () => Date.now();
const durationsFor = (s: Settings) => (demo ? DEMO_DURATIONS : durationsFromSettings(s));

let settings = loadSettings(store);
let prefs: Prefs = { color: loadBuddyColor(store), appearance: loadAppearance(store), sound: loadSound(store) };
const showLook = (p: Prefs) => {
  document.documentElement.dataset.color = p.color;
  applyAppearance(p.appearance);
};
showLook(prefs);
let progress = loadProgress(store, now());

const phaseEndListeners: ((line: string) => void)[] = [];

const timer = new Timer({
  now,
  durations: durationsFor(settings),
  longBreakEvery: settings.longBreakEvery,
  cycleCount: progress.cycleCount,
  phase: progress.cycleCount >= settings.longBreakEvery ? 'longBreak' : 'focus',
});
const buddy = new SvgBuddy();
const chime = new Chime(loadMuted(store), prefs.sound);

const controller = new Controller({
  timer,
  buddy,
  chime,
  pickLine: createPicker(),
  pickActivity: createActivityPicker(),
  recordFocus: (cycleCount) => recordFocus(store, now(), cycleCount),
  resetCycle: () => resetCycle(store, now()),
  onProgress: (p) => (progress = p),
  now,
  dozeMs: demo ? DEMO_DOZE_MS : DOZE_MS,
  waveMs: WAVE_MS,
  onPhaseEnd: (line) => phaseEndListeners.forEach((l) => l(line)),
});

const toggle = () => {
  chime.unlock();
  timer.toggle();
};

const panel = createSettingsPanel({
  getSettings: () => settings,
  getPrefs: () => prefs,
  onSave: (s, p) => {
    settings = s;
    saveSettings(store, s);
    timer.setConfig(durationsFor(s), s.longBreakEvery);
    prefs = p;
    saveBuddyColor(store, p.color);
    saveAppearance(store, p.appearance);
    saveSound(store, p.sound);
    chime.sound = p.sound;
    showLook(p);
  },
  onPreviewSound: (sound) => chime.preview(sound),
  onPreviewLook: showLook,
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

// Desktop app only: the floating window, menu bar item, settings window and notifications.
// Loaded lazily so the browser build never runs (or downloads) any of it.
if (isDesktop()) {
  document.documentElement.dataset.desktop = '';
  void import('./desktop').then((m) =>
    m.startDesktop({
      timer,
      chime,
      store,
      toggle,
      onPhaseEnd: (l) => phaseEndListeners.push(l),
      reload: {
        settings: () => {
          settings = loadSettings(store);
          timer.setConfig(durationsFor(settings), settings.longBreakEvery);
        },
        look: () => {
          prefs = { ...prefs, color: loadBuddyColor(store), appearance: loadAppearance(store) };
          showLook(prefs);
        },
        sound: () => {
          prefs = { ...prefs, sound: loadSound(store) };
          chime.sound = prefs.sound;
        },
      },
    }),
  );
}
