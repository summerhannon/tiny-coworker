# Desk Buddy (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser Pomodoro timer with an animated SVG coworking buddy (idle, working, break, wave, sleeping) that speaks in speech bubbles at phase changes.

**Architecture:** Small single-purpose TypeScript modules. `Timer` is a pure state machine driven by `tick()` calls and an injected clock. `Controller` maps timer events to a `Buddy` interface (`setState` / `setPaused` / `say`), chime, storage, and an `IdleWatcher`. `SvgBuddy` is the Phase 1 buddy; a Rive buddy will implement the same interface in Phase 2. The UI is plain DOM rendered every animation frame from a timer snapshot.

**Tech Stack:** Vite, TypeScript (strict), Vitest + jsdom, no UI framework, no backend, `localStorage`.

**Spec:** `docs/superpowers/specs/2026-10-13-desk-buddy-design.md`

## Global Constraints

- No UI framework, no backend. Dev dependencies only: `vite`, `typescript`, `vitest`, `jsdom`.
- Node 24 / npm 11 (installed on this machine).
- Timer defaults: focus 25 min, short break 5 min, long break 15 min, long break every 4 focus sessions.
- Settings ranges (whole numbers): focus 1–90, short break 1–30, long break 1–60, long break every 2–8.
- Settings changes apply from the next phase; a running or paused countdown never jumps. (A phase that is ready but not started takes the new length immediately — nothing is counting yet.)
- Skipped focus sessions never count. Reset returns the current phase to full length.
- Buddy states: `idle`, `working`, `break`, `wave`, `sleeping`; plus paused flag and big (milestone) wave.
- Wave lasts 5 s then idle. Doze delay 10 min (demo: 20 s). Bubble holds 3.5 s.
- Bubbles only at phase changes: focus start, phase end, break start, milestone. Never on pause/resume/skip/reset/wake.
- Demo mode `?demo`: focus 10 s, short break 5 s, long break 8 s, doze 20 s, in-memory storage (never touches real counts).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`. All controls keyboard-reachable; Space toggles start/pause.
- UI copy: sentence case, no exclamation marks in system UI (buddy lines may use them).

## File Structure

```
package.json, tsconfig.json, vite.config.ts, .gitignore, index.html, preview.html
.claude/launch.json                  dev server config for the in-app browser
src/config.ts         constants, types (PhaseKind, Settings, Durations), labels
src/format.ts         formatTime(ms) → "mm:ss"
src/timer.ts          Timer state machine
src/storage.ts        settings / progress / mute persistence, validation, day rollover
src/messages.ts       line pools + no-repeat picker
src/idle.ts           IdleWatcher (doze / wake)
src/chime.ts          Web Audio chime
src/controller.ts     wires timer events → buddy, chime, storage, idle
src/buddy/types.ts    Buddy interface + BuddyState
src/buddy/bubble.ts   speech bubble element
src/buddy/buddy-markup.ts  SVG markup string
src/buddy/buddy.css   buddy + bubble styles and animations
src/buddy/svg-buddy.ts     SvgBuddy (implements Buddy)
src/ui/icons.ts       inline SVG icons
src/ui/view.ts        main screen DOM + render()
src/ui/settings-panel.ts   settings <dialog>
src/styles.css        app tokens, layout (full + compact), dialog
src/main.ts           app entry
src/preview.ts        buddy playground entry (dev only)
tests/*.test.ts       one test file per logic module
```

---

### Task 1: Project scaffold, config, and time formatting

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`, `.claude/launch.json`
- Create: `src/config.ts`, `src/format.ts`, `src/main.ts` (temporary stub)
- Test: `tests/format.test.ts`

**Interfaces:**
- Produces:
  - `type PhaseKind = 'focus' | 'shortBreak' | 'longBreak'`
  - `interface Settings { focusMin: number; shortBreakMin: number; longBreakMin: number; longBreakEvery: number }`
  - `type Durations = Record<PhaseKind, number>` (milliseconds)
  - `DEFAULT_SETTINGS`, `SETTING_LIMITS`, `MINUTE`, `DEMO_DURATIONS`, `DOZE_MS`, `DEMO_DOZE_MS`, `WAVE_MS`, `BUBBLE_HOLD_MS`, `PHASE_LABELS`
  - `durationsFromSettings(s: Settings): Durations`
  - `formatTime(ms: number): string`

- [ ] **Step 1: Create project files**

`package.json`:
```json
{
  "name": "desk-buddy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: { environment: 'jsdom' },
});
```

`.gitignore`:
```
node_modules
dist
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Desk Buddy</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "desk-buddy", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--", "--port", "5173", "--strictPort"], "port": 5173 }
  ]
}
```

`src/main.ts` (stub, replaced in Task 10):
```ts
document.getElementById('app')!.textContent = 'Desk Buddy';
```

- [ ] **Step 2: Install dev dependencies**

Run: `npm install -D vite typescript vitest jsdom`
Expected: installs without errors; `package.json` gains `devDependencies`.

- [ ] **Step 3: Write `src/config.ts`**

```ts
export type PhaseKind = 'focus' | 'shortBreak' | 'longBreak';

export interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
}

export type Durations = Record<PhaseKind, number>;

export const MINUTE = 60_000;

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
};

export const SETTING_LIMITS: Record<keyof Settings, { min: number; max: number }> = {
  focusMin: { min: 1, max: 90 },
  shortBreakMin: { min: 1, max: 30 },
  longBreakMin: { min: 1, max: 60 },
  longBreakEvery: { min: 2, max: 8 },
};

export function durationsFromSettings(s: Settings): Durations {
  return {
    focus: s.focusMin * MINUTE,
    shortBreak: s.shortBreakMin * MINUTE,
    longBreak: s.longBreakMin * MINUTE,
  };
}

export const DEMO_DURATIONS: Durations = { focus: 10_000, shortBreak: 5_000, longBreak: 8_000 };
export const DOZE_MS = 10 * MINUTE;
export const DEMO_DOZE_MS = 20_000;
export const WAVE_MS = 5_000;
export const BUBBLE_HOLD_MS = 3_500;

export const PHASE_LABELS: Record<PhaseKind, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};
```

- [ ] **Step 4: Write the failing test**

`tests/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatTime } from '../src/format';

describe('formatTime', () => {
  it('formats whole minutes', () => {
    expect(formatTime(25 * 60_000)).toBe('25:00');
  });
  it('rounds partial seconds up so 00:00 only shows at the end', () => {
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(59_001)).toBe('01:00');
  });
  it('shows zero', () => {
    expect(formatTime(0)).toBe('00:00');
  });
  it('handles long phases', () => {
    expect(formatTime(90 * 60_000)).toBe('90:00');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL — cannot find module `../src/format`.

- [ ] **Step 6: Implement `src/format.ts`**

```ts
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 7: Run tests and type check**

Run: `npx vitest run tests/format.test.ts && npx tsc`
Expected: 4 tests PASS; `tsc` prints nothing.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .gitignore index.html .claude/launch.json src tests
git commit -m "feat: scaffold project with config and time formatting"
```

---

### Task 2: Timer state machine

**Files:**
- Create: `src/timer.ts`
- Test: `tests/timer.test.ts`

**Interfaces:**
- Consumes: `PhaseKind`, `Durations` from `src/config.ts`
- Produces:
  - `type TimerStatus = 'ready' | 'running' | 'paused'`
  - `type TimerEvent = { type: 'started'; phase: PhaseKind } | { type: 'paused' } | { type: 'resumed' } | { type: 'reset'; phase: PhaseKind } | { type: 'skipped'; from: PhaseKind; next: PhaseKind } | { type: 'completed'; phase: PhaseKind; next: PhaseKind; cycleComplete: boolean }`
  - `interface TimerSnapshot { phase: PhaseKind; status: TimerStatus; remainingMs: number; durationMs: number; cycleCount: number }`
  - `class Timer` — `constructor({ now, durations, longBreakEvery, cycleCount? })`, `on(listener): () => void`, `snapshot()`, `start()`, `pause()`, `toggle()`, `skip()`, `reset()`, `tick()`, `setConfig(durations, longBreakEvery)`, `setCycleCount(n)`
- Event ordering: state is updated **before** an event is emitted, so listeners calling `snapshot()` see the new phase.

- [ ] **Step 1: Write the failing tests**

`tests/timer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { Timer, type TimerEvent } from '../src/timer';

const D = { focus: 1000, shortBreak: 300, longBreak: 600 };

function make(every = 3, cycleCount = 0) {
  let t = 0;
  const timer = new Timer({ now: () => t, durations: D, longBreakEvery: every, cycleCount });
  const events: TimerEvent[] = [];
  timer.on((e) => events.push(e));
  return {
    timer,
    events,
    advance(ms: number) {
      t += ms;
      timer.tick();
    },
  };
}

describe('Timer', () => {
  it('starts ready in focus at full length', () => {
    const { timer } = make();
    expect(timer.snapshot()).toEqual({
      phase: 'focus', status: 'ready', remainingMs: 1000, durationMs: 1000, cycleCount: 0,
    });
  });

  it('counts down after start', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(400);
    expect(events[0]).toEqual({ type: 'started', phase: 'focus' });
    expect(timer.snapshot().remainingMs).toBe(600);
    expect(timer.snapshot().status).toBe('running');
  });

  it('pause freezes the countdown and resume continues it', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(400);
    timer.pause();
    advance(5000);
    expect(timer.snapshot()).toMatchObject({ status: 'paused', remainingMs: 600 });
    timer.start();
    expect(events.at(-1)).toEqual({ type: 'resumed' });
    advance(599);
    expect(timer.snapshot().status).toBe('running');
    advance(1);
    expect(events.at(-1)).toMatchObject({ type: 'completed', phase: 'focus' });
  });

  it('toggle starts and pauses', () => {
    const { timer } = make();
    timer.toggle();
    expect(timer.snapshot().status).toBe('running');
    timer.toggle();
    expect(timer.snapshot().status).toBe('paused');
  });

  it('completing focus prepares a short break and counts the session', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(1000);
    expect(events.at(-1)).toEqual({ type: 'completed', phase: 'focus', next: 'shortBreak', cycleComplete: false });
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'ready', remainingMs: 300, cycleCount: 1 });
  });

  it('gives a long break after N focus sessions, then resets the cycle', () => {
    const { timer, events, advance } = make(2);
    timer.start(); advance(1000); // focus 1
    timer.start(); advance(300);  // short break
    timer.start(); advance(1000); // focus 2
    expect(events.at(-1)).toEqual({ type: 'completed', phase: 'focus', next: 'longBreak', cycleComplete: true });
    expect(timer.snapshot()).toMatchObject({ phase: 'longBreak', cycleCount: 2 });
    timer.start(); advance(600);
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', cycleCount: 0 });
  });

  it('skipping focus does not count it', () => {
    const { timer, events } = make();
    timer.start();
    timer.skip();
    expect(events.at(-1)).toEqual({ type: 'skipped', from: 'focus', next: 'shortBreak' });
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', status: 'ready', cycleCount: 0 });
  });

  it('skipping a long break resets the cycle', () => {
    const { timer, advance } = make(2, 1);
    timer.start(); advance(1000);
    expect(timer.snapshot().phase).toBe('longBreak');
    timer.skip();
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', cycleCount: 0 });
  });

  it('reset returns the current phase to full length', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(300);
    timer.reset();
    expect(events.at(-1)).toEqual({ type: 'reset', phase: 'focus' });
    expect(timer.snapshot()).toMatchObject({ phase: 'focus', status: 'ready', remainingMs: 1000 });
  });

  it('completes exactly once after a large clock jump', () => {
    const { timer, events, advance } = make();
    timer.start();
    advance(999);
    expect(timer.snapshot().remainingMs).toBe(1);
    advance(10_000);
    advance(10_000);
    expect(events.filter((e) => e.type === 'completed')).toHaveLength(1);
  });

  it('applies new settings from the next phase while running', () => {
    const { timer, advance } = make();
    timer.start();
    timer.setConfig({ focus: 5000, shortBreak: 2000, longBreak: 3000 }, 3);
    expect(timer.snapshot().remainingMs).toBe(1000);
    advance(1000);
    expect(timer.snapshot()).toMatchObject({ phase: 'shortBreak', remainingMs: 2000 });
  });

  it('applies new settings immediately when the phase has not started', () => {
    const { timer } = make();
    timer.setConfig({ focus: 5000, shortBreak: 2000, longBreak: 3000 }, 3);
    expect(timer.snapshot().remainingMs).toBe(5000);
  });

  it('unsubscribes listeners', () => {
    const { timer } = make();
    const seen: TimerEvent[] = [];
    const off = timer.on((e) => seen.push(e));
    off();
    timer.start();
    expect(seen).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/timer.test.ts`
Expected: FAIL — cannot find module `../src/timer`.

- [ ] **Step 3: Implement `src/timer.ts`**

```ts
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
    this.phaseDuration = o.durations.focus;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/timer.test.ts`
Expected: 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/timer.ts tests/timer.test.ts
git commit -m "feat: add timer state machine"
```

---

### Task 3: Storage, validation, and daily rollover

**Files:**
- Create: `src/storage.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `Settings`, `DEFAULT_SETTINGS`, `SETTING_LIMITS` from `src/config.ts`
- Produces:
  - `interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `interface DayProgress { date: string; todayCount: number; cycleCount: number }`
  - `type ValidationResult = { ok: true; settings: Settings } | { ok: false; errors: Partial<Record<keyof Settings, string>> }`
  - `memoryStore(): StorageLike`, `safeLocalStorage(): StorageLike`
  - `localDateKey(ms: number): string` → `"YYYY-MM-DD"` in local time
  - `validateSettings(input: Record<keyof Settings, number>): ValidationResult`
  - `loadSettings(store): Settings`, `saveSettings(store, s): void`
  - `loadProgress(store, nowMs): DayProgress` — zeros if missing or a different day
  - `recordFocus(store, nowMs, cycleCount): DayProgress` — same day: `todayCount + 1` with the given `cycleCount`; new day: `{ todayCount: 1, cycleCount: 1 }`
  - `resetCycle(store, nowMs): DayProgress` — today's progress with `cycleCount: 0`
  - `loadMuted(store): boolean`, `saveMuted(store, muted): void`

- [ ] **Step 1: Write the failing tests**

`tests/storage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/config';
import {
  memoryStore, localDateKey, validateSettings, loadSettings, saveSettings,
  loadProgress, recordFocus, resetCycle, loadMuted, saveMuted,
} from '../src/storage';

const DAY1 = new Date(2026, 9, 13, 23, 58).getTime();
const DAY2 = new Date(2026, 9, 14, 0, 5).getTime();

describe('localDateKey', () => {
  it('uses local calendar date', () => {
    expect(localDateKey(DAY1)).toBe('2026-10-13');
    expect(localDateKey(DAY2)).toBe('2026-10-14');
  });
});

describe('validateSettings', () => {
  it('accepts values in range', () => {
    expect(validateSettings({ focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 }))
      .toEqual({ ok: true, settings: { focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 } });
  });
  it('rejects out-of-range, fractional, and empty values per field', () => {
    const r = validateSettings({ focusMin: 0, shortBreakMin: 2.5, longBreakMin: NaN, longBreakEvery: 4 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.focusMin).toBe('Enter a whole number from 1 to 90');
    expect(r.errors.shortBreakMin).toBe('Enter a whole number from 1 to 30');
    expect(r.errors.longBreakMin).toBe('Enter a whole number from 1 to 60');
    expect(r.errors.longBreakEvery).toBeUndefined();
  });
});

describe('settings persistence', () => {
  it('returns defaults when nothing is saved', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips saved settings', () => {
    const store = memoryStore();
    const s = { focusMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 };
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });
  it('falls back to defaults for corrupt or invalid data', () => {
    const store = memoryStore();
    store.setItem('deskBuddy.settings', '{not json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.setItem('deskBuddy.settings', JSON.stringify({ focusMin: 999 }));
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('progress', () => {
  it('starts at zero', () => {
    expect(loadProgress(memoryStore(), DAY1)).toEqual({ date: '2026-10-13', todayCount: 0, cycleCount: 0 });
  });
  it('records focus sessions on the same day', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 1);
    const p = recordFocus(store, DAY1, 2);
    expect(p).toEqual({ date: '2026-10-13', todayCount: 2, cycleCount: 2 });
    expect(loadProgress(store, DAY1)).toEqual(p);
  });
  it('rolls over to a new day on load', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 3);
    expect(loadProgress(store, DAY2)).toEqual({ date: '2026-10-14', todayCount: 0, cycleCount: 0 });
  });
  it('counts a session that finishes after midnight toward the new day', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 3);
    expect(recordFocus(store, DAY2, 4)).toEqual({ date: '2026-10-14', todayCount: 1, cycleCount: 1 });
  });
  it('resets the cycle but keeps the day total', () => {
    const store = memoryStore();
    recordFocus(store, DAY1, 4);
    expect(resetCycle(store, DAY1)).toEqual({ date: '2026-10-13', todayCount: 1, cycleCount: 0 });
  });
});

describe('mute', () => {
  it('defaults to unmuted and round-trips', () => {
    const store = memoryStore();
    expect(loadMuted(store)).toBe(false);
    saveMuted(store, true);
    expect(loadMuted(store)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — cannot find module `../src/storage`.

- [ ] **Step 3: Implement `src/storage.ts`**

```ts
import { DEFAULT_SETTINGS, SETTING_LIMITS, type Settings } from './config';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DayProgress {
  date: string;
  todayCount: number;
  cycleCount: number;
}

export type ValidationResult =
  | { ok: true; settings: Settings }
  | { ok: false; errors: Partial<Record<keyof Settings, string>> };

const KEYS = {
  settings: 'deskBuddy.settings',
  progress: 'deskBuddy.progress',
  muted: 'deskBuddy.muted',
};

export function memoryStore(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

/** localStorage when available (it can throw in private windows), otherwise memory. */
export function safeLocalStorage(): StorageLike {
  try {
    const probe = '__deskBuddyProbe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memoryStore();
  }
}

export function localDateKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function validateSettings(input: Record<keyof Settings, number>): ValidationResult {
  const errors: Partial<Record<keyof Settings, string>> = {};
  for (const key of Object.keys(SETTING_LIMITS) as (keyof Settings)[]) {
    const { min, max } = SETTING_LIMITS[key];
    const v = input[key];
    if (!Number.isInteger(v) || v < min || v > max) {
      errors[key] = `Enter a whole number from ${min} to ${max}`;
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    settings: {
      focusMin: input.focusMin,
      shortBreakMin: input.shortBreakMin,
      longBreakMin: input.longBreakMin,
      longBreakEvery: input.longBreakEvery,
    },
  };
}

function readJson(store: StorageLike, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSettings(store: StorageLike): Settings {
  const raw = readJson(store, KEYS.settings);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const result = validateSettings({ ...DEFAULT_SETTINGS, ...(raw as Partial<Settings>) });
  return result.ok ? result.settings : { ...DEFAULT_SETTINGS };
}

export function saveSettings(store: StorageLike, s: Settings): void {
  store.setItem(KEYS.settings, JSON.stringify(s));
}

function readProgress(store: StorageLike): DayProgress | null {
  const raw = readJson(store, KEYS.progress) as DayProgress | null;
  if (!raw || typeof raw.date !== 'string') return null;
  return raw;
}

function writeProgress(store: StorageLike, p: DayProgress): DayProgress {
  store.setItem(KEYS.progress, JSON.stringify(p));
  return p;
}

export function loadProgress(store: StorageLike, nowMs: number): DayProgress {
  const today = localDateKey(nowMs);
  const p = readProgress(store);
  if (!p || p.date !== today) return { date: today, todayCount: 0, cycleCount: 0 };
  return p;
}

export function recordFocus(store: StorageLike, nowMs: number, cycleCount: number): DayProgress {
  const today = localDateKey(nowMs);
  const p = readProgress(store);
  if (!p || p.date !== today) return writeProgress(store, { date: today, todayCount: 1, cycleCount: 1 });
  return writeProgress(store, { date: today, todayCount: p.todayCount + 1, cycleCount });
}

export function resetCycle(store: StorageLike, nowMs: number): DayProgress {
  return writeProgress(store, { ...loadProgress(store, nowMs), cycleCount: 0 });
}

export function loadMuted(store: StorageLike): boolean {
  return store.getItem(KEYS.muted) === 'true';
}

export function saveMuted(store: StorageLike, muted: boolean): void {
  store.setItem(KEYS.muted, String(muted));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/storage.test.ts`
Expected: 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts tests/storage.test.ts
git commit -m "feat: add settings and progress storage with daily rollover"
```

---

### Task 4: Message pools and picker

**Files:**
- Create: `src/messages.ts`
- Test: `tests/messages.test.ts`

**Interfaces:**
- Produces:
  - `type Moment = 'focusStart' | 'focusEnd' | 'breakEnd' | 'breakStart' | 'milestone'`
  - `LINES: Record<Moment, string[]>`
  - `createPicker(lines?: Record<Moment, string[]>, random?: () => number): (m: Moment) => string`

- [ ] **Step 1: Write the failing tests**

`tests/messages.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { LINES, createPicker, type Moment } from '../src/messages';

describe('LINES', () => {
  it('has at least one line for every moment', () => {
    const moments: Moment[] = ['focusStart', 'focusEnd', 'breakEnd', 'breakStart', 'milestone'];
    for (const m of moments) expect(LINES[m].length).toBeGreaterThan(0);
  });
});

describe('createPicker', () => {
  it('never repeats the previous line for a moment', () => {
    const pick = createPicker();
    let prev = pick('focusStart');
    for (let i = 0; i < 50; i++) {
      const next = pick('focusStart');
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('tracks moments independently', () => {
    const lines = { focusStart: ['a', 'b'], focusEnd: ['a', 'b'], breakEnd: ['x'], breakStart: ['y'], milestone: ['z'] };
    const pick = createPicker(lines, () => 0);
    expect(pick('focusStart')).toBe('a');
    expect(pick('focusEnd')).toBe('a');
    expect(pick('focusStart')).toBe('b');
  });

  it('repeats when a pool has a single line', () => {
    const lines = { focusStart: ['only'], focusEnd: ['a'], breakEnd: ['x'], breakStart: ['y'], milestone: ['z'] };
    const pick = createPicker(lines);
    expect(pick('focusStart')).toBe('only');
    expect(pick('focusStart')).toBe('only');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/messages.test.ts`
Expected: FAIL — cannot find module `../src/messages`.

- [ ] **Step 3: Implement `src/messages.ts`**

```ts
export type Moment = 'focusStart' | 'focusEnd' | 'breakEnd' | 'breakStart' | 'milestone';

/** Placeholder copy — the designer will rewrite these in their own voice. */
export const LINES: Record<Moment, string[]> = {
  focusStart: ["Let's do this.", 'One thing at a time.', "I'll be right here."],
  focusEnd: ["Time's up! Coffee?", 'Nice focus. Break time.'],
  breakEnd: ["Break's over. Ready?", 'Feeling fresh?'],
  breakStart: ['Nice work, take five.', 'Stretch those legs.'],
  milestone: ['Four down! Long break earned.', 'Look at you go.'],
};

export function createPicker(
  lines: Record<Moment, string[]> = LINES,
  random: () => number = Math.random,
): (m: Moment) => string {
  const last = new Map<Moment, string>();
  return (m) => {
    const pool = lines[m];
    const options = pool.length > 1 ? pool.filter((l) => l !== last.get(m)) : pool;
    const line = options[Math.floor(random() * options.length)];
    last.set(m, line);
    return line;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/messages.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/messages.ts tests/messages.test.ts
git commit -m "feat: add encouragement lines and no-repeat picker"
```

---

### Task 5: Idle watcher (doze and wake)

**Files:**
- Create: `src/idle.ts`
- Test: `tests/idle.test.ts`

**Interfaces:**
- Produces: `class IdleWatcher` — `constructor({ now, delayMs, onDoze, onWake })`, `get asleep(): boolean`, `setEligible(eligible: boolean): void`, `activity(): void`, `tick(): void`
- Rules: dozes only while eligible (timer not running) after `delayMs` with no activity. Becoming eligible restarts the wait. `activity()` restarts the wait and wakes if asleep.

- [ ] **Step 1: Write the failing tests**

`tests/idle.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { IdleWatcher } from '../src/idle';

function make() {
  let t = 0;
  const onDoze = vi.fn();
  const onWake = vi.fn();
  const w = new IdleWatcher({ now: () => t, delayMs: 1000, onDoze, onWake });
  return { w, onDoze, onWake, advance(ms: number) { t += ms; w.tick(); } };
}

describe('IdleWatcher', () => {
  it('dozes after the delay while eligible', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(true);
    advance(999);
    expect(onDoze).not.toHaveBeenCalled();
    advance(1);
    expect(onDoze).toHaveBeenCalledOnce();
    expect(w.asleep).toBe(true);
    advance(5000);
    expect(onDoze).toHaveBeenCalledOnce();
  });

  it('never dozes while not eligible', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(false);
    advance(10_000);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('restarts the wait when becoming eligible', () => {
    const { w, onDoze, advance } = make();
    advance(5000);
    w.setEligible(true);
    advance(500);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('activity resets the wait', () => {
    const { w, onDoze, advance } = make();
    w.setEligible(true);
    advance(800);
    w.activity();
    advance(800);
    expect(onDoze).not.toHaveBeenCalled();
  });

  it('activity wakes it up once', () => {
    const { w, onWake, advance } = make();
    w.setEligible(true);
    advance(1000);
    w.activity();
    w.activity();
    expect(onWake).toHaveBeenCalledOnce();
    expect(w.asleep).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/idle.test.ts`
Expected: FAIL — cannot find module `../src/idle`.

- [ ] **Step 3: Implement `src/idle.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/idle.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/idle.ts tests/idle.test.ts
git commit -m "feat: add idle watcher for dozing and waking"
```

---

### Task 6: Buddy interface and speech bubble

**Files:**
- Create: `src/buddy/types.ts`, `src/buddy/bubble.ts`
- Test: `tests/bubble.test.ts`

**Interfaces:**
- Consumes: `BUBBLE_HOLD_MS` from `src/config.ts`
- Produces:
  - `type BuddyState = 'idle' | 'working' | 'break' | 'wave' | 'sleeping'`
  - `interface BuddyStateOptions { big?: boolean }`
  - `interface Buddy { readonly element: HTMLElement; setState(state: BuddyState, opts?: BuddyStateOptions): void; setPaused(paused: boolean): void; say(text: string): void }`
  - `interface BubbleOptions { holdMs: number; swapMs: number }`
  - `class Bubble` — `constructor(opts?: Partial<BubbleOptions>)`, `readonly element: HTMLDivElement` (wrapper `.bubble`), `get isOpen(): boolean`, `get text(): string`, `show(text: string): void`
  - DOM: `.bubble > .bubble-box[aria-hidden=true]` (animated; `data-open` attribute present when open) and `.bubble > .sr-only[aria-live=polite]` (screen reader announcement)

- [ ] **Step 1: Write `src/buddy/types.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`tests/bubble.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bubble } from '../src/buddy/bubble';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Bubble', () => {
  it('opens with the text and announces it', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('Hello');
    expect(b.isOpen).toBe(true);
    expect(b.text).toBe('Hello');
    expect(b.element.querySelector('[aria-live="polite"]')!.textContent).toBe('Hello');
  });

  it('closes after the hold time', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('Hello');
    vi.advanceTimersByTime(999);
    expect(b.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(b.isOpen).toBe(false);
  });

  it('closes the current line before opening a new one', () => {
    const b = new Bubble({ holdMs: 1000, swapMs: 100 });
    b.show('First');
    vi.advanceTimersByTime(500);
    b.show('Second');
    expect(b.isOpen).toBe(false);
    vi.advanceTimersByTime(100);
    expect(b.isOpen).toBe(true);
    expect(b.text).toBe('Second');
    vi.advanceTimersByTime(999);
    expect(b.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(b.isOpen).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/bubble.test.ts`
Expected: FAIL — cannot find module `../src/buddy/bubble`.

- [ ] **Step 4: Implement `src/buddy/bubble.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/bubble.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/buddy/types.ts src/buddy/bubble.ts tests/bubble.test.ts
git commit -m "feat: add buddy interface and speech bubble"
```

---

### Task 7: SVG buddy, its animations, and the buddy playground

**Files:**
- Create: `src/buddy/buddy-markup.ts`, `src/buddy/buddy.css`, `src/buddy/svg-buddy.ts`
- Create: `src/styles.css` (base tokens; layout added in Task 10), `preview.html`, `src/preview.ts`
- Test: `tests/svg-buddy.test.ts`

**Interfaces:**
- Consumes: `Buddy`, `BuddyState`, `BuddyStateOptions` (Task 6), `Bubble`, `BubbleOptions` (Task 6)
- Produces: `class SvgBuddy implements Buddy` — `constructor(bubbleOptions?: Partial<BubbleOptions>)`, `get current(): BuddyState`, plus the `Buddy` methods; `WAKE_MS = 700`
- DOM contract (used by CSS and tests): `div.buddy > [div.bubble, svg.buddy-svg]`; the SVG carries `data-state`, `data-paused` (`"true"`/`"false"`), `data-big`, `data-laptop` (laptop shown while sleeping if the buddy was working), and classes `b-waking` (for `WAKE_MS` after leaving `sleeping`) and `b-talking` (300 ms after `say`).

**Animation structure:** every moving part is a *pose* group (CSS transition, springy easing) wrapping a *loop* group (CSS keyframe animation). This keeps looping motion from fighting pose changes. Staging for working and break comes from the code-drawn sample the designer preferred: laptop seen from the back of the lid with eyes dropping to the screen; mug lifted to the mouth and tilted (it does not spin with the arm), with steam.

- [ ] **Step 1: Write the failing tests**

`tests/svg-buddy.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SvgBuddy, WAKE_MS } from '../src/buddy/svg-buddy';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const svgOf = (b: SvgBuddy) => b.element.querySelector('svg')!;

describe('SvgBuddy', () => {
  it('renders the bubble and svg, starting idle', () => {
    const b = new SvgBuddy();
    expect(b.element.querySelector('.bubble')).not.toBeNull();
    expect(svgOf(b).getAttribute('data-state')).toBe('idle');
    expect(b.current).toBe('idle');
  });

  it('sets state and big flag', () => {
    const b = new SvgBuddy();
    b.setState('wave', { big: true });
    expect(svgOf(b).getAttribute('data-state')).toBe('wave');
    expect(svgOf(b).getAttribute('data-big')).toBe('true');
    b.setState('idle');
    expect(svgOf(b).getAttribute('data-big')).toBe('false');
  });

  it('sets paused flag', () => {
    const b = new SvgBuddy();
    b.setPaused(true);
    expect(svgOf(b).getAttribute('data-paused')).toBe('true');
  });

  it('keeps the laptop when falling asleep from working', () => {
    const b = new SvgBuddy();
    b.setState('working');
    b.setState('sleeping');
    expect(svgOf(b).getAttribute('data-laptop')).toBe('true');
    b.setState('idle');
    b.setState('sleeping');
    expect(svgOf(b).getAttribute('data-laptop')).toBe('false');
  });

  it('plays the wake animation when leaving sleep', () => {
    const b = new SvgBuddy();
    b.setState('sleeping');
    b.setState('idle');
    expect(svgOf(b).classList.contains('b-waking')).toBe(true);
    vi.advanceTimersByTime(WAKE_MS);
    expect(svgOf(b).classList.contains('b-waking')).toBe(false);
  });

  it('says text through the bubble and pops the mouth', () => {
    const b = new SvgBuddy({ holdMs: 1000 });
    b.say('Hi');
    expect(b.element.querySelector('.bubble-box')!.textContent).toBe('Hi');
    expect(svgOf(b).classList.contains('b-talking')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(svgOf(b).classList.contains('b-talking')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/svg-buddy.test.ts`
Expected: FAIL — cannot find module `../src/buddy/svg-buddy`.

- [ ] **Step 3: Write `src/buddy/buddy-markup.ts`**

```ts
/**
 * Smooth-vector buddy. viewBox 200×180; mouth at (100, 115); head top at y=64.
 * Each moving part = pose group (transition) > loop group (keyframes).
 */
export const BUDDY_SVG = `
<svg class="buddy-svg" viewBox="0 0 200 180" data-state="idle" data-paused="false" data-big="false" data-laptop="false" aria-hidden="true" focusable="false">
  <ellipse class="b-shadow" cx="100" cy="166" rx="50" ry="6" fill="var(--b-shadow)"/>
  <g class="b-body-pose b-move"><g class="b-body-loop">
    <g class="b-larm-pose b-move">
      <path d="M66 112 Q54 126 52 140" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
    </g>
    <rect x="60" y="64" width="80" height="96" rx="40" fill="var(--b-body)"/>
    <ellipse cx="100" cy="136" rx="24" ry="17" fill="var(--b-belly)"/>
    <g class="b-face b-move">
      <g class="b-eyes-open b-move">
        <ellipse cx="86" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
        <ellipse cx="114" cy="100" rx="4.5" ry="6" fill="var(--b-ink)"/>
      </g>
      <path class="b-eyes-closed b-move" d="M81 101 q5 4 10 0 M109 101 q5 4 10 0" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="77" cy="112" r="6" fill="var(--b-cheek)" opacity=".7"/>
      <circle cx="123" cy="112" r="6" fill="var(--b-cheek)" opacity=".7"/>
      <path class="b-mouth" d="M94 113 Q100 119 106 113" stroke="var(--b-ink)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g>
    <g class="b-rarm-pose b-move"><g class="b-rarm-loop">
      <path d="M134 112 Q146 126 148 140" stroke="var(--b-arm)" stroke-width="9" fill="none" stroke-linecap="round"/>
    </g></g>
    <g class="b-zzz b-move">
      <text class="b-z" x="132" y="62">z</text>
      <text class="b-z" x="142" y="50">z</text>
      <text class="b-z" x="152" y="38">z</text>
    </g>
  </g></g>
  <g class="b-laptop b-move">
    <rect x="66" y="124" width="68" height="36" rx="5" fill="var(--b-lid)"/>
    <circle cx="100" cy="142" r="4" fill="var(--b-logo)"/>
    <rect x="54" y="158" width="92" height="7" rx="3.5" fill="var(--b-base)"/>
  </g>
  <g class="b-mug-pose b-move"><g class="b-mug-loop">
    <rect x="146" y="140" width="18" height="20" rx="4" fill="var(--b-mug)"/>
    <path d="M164 145 q7 0 7 6 q0 6 -7 6" stroke="var(--b-mug-dark)" stroke-width="3" fill="none"/>
    <path class="b-steam" d="M151 135 q-3 -5 0 -10 M158 135 q3 -5 0 -10" stroke="var(--b-steam)" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g></g>
</svg>`;
```

- [ ] **Step 4: Write `src/buddy/buddy.css`**

```css
/* ---------- container + bubble ---------- */
.buddy {
  position: relative;
  display: grid;
  place-items: center;
  /* distance from bubble bottom down to the mouth; bubble grows from there */
  --mouth-drop: 59px;
}
.bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 56px);
  transform: translateX(-50%);
  width: max-content;
  max-width: 240px;
  pointer-events: none;
  z-index: 1;
}
.bubble-box {
  position: relative;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 6px 12px;
  font-size: 14px;
  line-height: 1.35;
  text-align: center;
  transform-origin: 50% calc(100% + var(--mouth-drop));
  transform: scale(0.04);
  opacity: 0;
  transition: transform 0.15s ease-in, opacity 0.12s ease-in;
}
.bubble-box::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 10px;
  height: 10px;
  background: inherit;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  transform: translateX(-50%) rotate(45deg);
}
.bubble-box[data-open] {
  transform: scale(1);
  opacity: 1;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease-out;
}

/* ---------- svg tokens ---------- */
.buddy-svg {
  width: 200px;
  height: 180px;
  overflow: visible;
  --b-body: #f0997b;
  --b-arm: #d85a30;
  --b-belly: #f5c4b3;
  --b-ink: #4a1b0c;
  --b-cheek: #ed93b1;
  --b-lid: #b4b2a9;
  --b-logo: #f1efe8;
  --b-base: #888780;
  --b-mug: #7f77dd;
  --b-mug-dark: #534ab7;
  --b-steam: #b4b2a9;
  --b-shadow: rgba(0, 0, 0, 0.12);
}
@media (prefers-color-scheme: dark) {
  .buddy-svg {
    --b-lid: #5f5e5a;
    --b-logo: #888780;
    --b-base: #444441;
    --b-steam: #888780;
    --b-shadow: rgba(0, 0, 0, 0.4);
  }
}
.buddy-svg * { transform-box: view-box; }
.buddy-svg .b-move {
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
}
.b-z { font: 600 13px system-ui, sans-serif; fill: var(--b-ink); }
.b-z:nth-child(2) { font-size: 15px; }
.b-z:nth-child(3) { font-size: 17px; }

/* ---------- pivots ---------- */
.b-body-pose, .b-body-loop { transform-origin: 100px 160px; }
.b-larm-pose { transform-origin: 66px 112px; }
.b-rarm-pose, .b-rarm-loop { transform-origin: 134px 112px; }
.b-eyes-open { transform-origin: 100px 100px; }
.b-mouth { transform-origin: 100px 116px; }
.b-mug-loop { transform-origin: 155px 160px; }

/* ---------- defaults (idle) ---------- */
.b-laptop { transform: translateY(24px); opacity: 0; }
.b-mug-pose { transform: translateY(6px); opacity: 0; }
.b-eyes-closed, .b-zzz { opacity: 0; }
.b-eyes-open { animation: b-blink 4.5s infinite; }
.b-steam { stroke-dasharray: 4 4; animation: b-steam 1s linear infinite; }
[data-state="idle"] .b-body-loop { animation: b-breathe 3.2s ease-in-out infinite; }

/* ---------- working: behind the laptop ---------- */
[data-state="working"] .b-laptop,
[data-state="sleeping"][data-laptop="true"] .b-laptop { transform: none; opacity: 1; }
[data-state="working"] .b-larm-pose { transform: rotate(-40deg); }
[data-state="working"] .b-rarm-pose { transform: rotate(40deg); }
[data-state="working"] .b-face { transform: translateY(5px); }
[data-state="working"] .b-body-loop { animation: b-type 0.36s steps(2) infinite; }
/* paused: stop typing, look up */
[data-state="working"][data-paused="true"] .b-face { transform: none; }
[data-state="working"][data-paused="true"] .b-body-loop { animation: b-breathe 3.2s ease-in-out infinite; }

/* ---------- break: sipping coffee ---------- */
[data-state="break"] .b-mug-pose { transform: none; opacity: 1; }
[data-state="break"] .b-mug-loop { animation: b-sip-mug 3.2s ease-in-out infinite; }
[data-state="break"] .b-rarm-loop { animation: b-sip-arm 3.2s ease-in-out infinite; }
[data-state="break"] .b-body-loop { animation: b-breathe 3.2s ease-in-out infinite; }
/* paused: mug rests on the table */
[data-state="break"][data-paused="true"] .b-mug-loop,
[data-state="break"][data-paused="true"] .b-rarm-loop { animation: none; }

/* ---------- wave: phase ended ---------- */
[data-state="wave"] .b-rarm-pose { transform: rotate(-150deg); }
[data-state="wave"] .b-rarm-loop { animation: b-wave 0.5s ease-in-out infinite alternate; }
[data-state="wave"] .b-body-loop { animation: b-hop 0.5s ease-in-out infinite alternate; }
[data-state="wave"][data-big="true"] .b-larm-pose { transform: rotate(150deg); }
[data-state="wave"][data-big="true"] .b-body-loop { animation: b-hop-big 0.45s ease-in-out infinite alternate; }

/* ---------- sleeping at the desk ---------- */
[data-state="sleeping"] .b-body-pose { transform: translateY(10px) rotate(-6deg); }
[data-state="sleeping"] .b-larm-pose { transform: rotate(-55deg); }
[data-state="sleeping"] .b-rarm-pose { transform: rotate(55deg); }
[data-state="sleeping"] .b-face { transform: translateY(6px); }
[data-state="sleeping"] .b-eyes-open { opacity: 0; animation: none; }
[data-state="sleeping"] .b-eyes-closed { opacity: 1; }
[data-state="sleeping"] .b-body-loop { animation: b-breathe 5s ease-in-out infinite; }
[data-state="sleeping"] .b-zzz { opacity: 1; }
[data-state="sleeping"] .b-z { animation: b-float 3s ease-in infinite; }
[data-state="sleeping"] .b-z:nth-child(2) { animation-delay: 1s; }
[data-state="sleeping"] .b-z:nth-child(3) { animation-delay: 2s; }

/* ---------- one-shots (keep last: they must win over state loops) ---------- */
.buddy-svg.b-waking .b-body-loop { animation: b-wake 0.7s ease-out; }
.buddy-svg.b-talking .b-mouth { animation: b-pop 0.3s ease-out; }

@keyframes b-breathe { 50% { transform: scale(1.025, 0.98); } }
@keyframes b-blink { 0%, 94%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes b-type { 50% { transform: translateY(2px); } }
@keyframes b-sip-mug {
  0%, 30%, 88%, 100% { transform: none; }
  48%, 72% { transform: translate(-38px, -30px) rotate(-25deg); }
}
@keyframes b-sip-arm {
  0%, 30%, 88%, 100% { transform: none; }
  48%, 72% { transform: rotate(55deg); }
}
@keyframes b-wave { from { transform: rotate(12deg); } to { transform: rotate(-15deg); } }
@keyframes b-hop { to { transform: translateY(-6px); } }
@keyframes b-hop-big { to { transform: translateY(-12px) scale(1.03); } }
@keyframes b-float {
  0% { opacity: 0; transform: translate(0, 0); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(10px, -24px); }
}
@keyframes b-fade { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
@keyframes b-steam { to { stroke-dashoffset: -16; } }
@keyframes b-wake {
  0% { transform: none; }
  25% { transform: translateY(-14px) scale(0.96, 1.06); }
  55% { transform: scale(1.04, 1.1); }
  100% { transform: none; }
}
@keyframes b-pop { 50% { transform: scale(1.4); } }

/* ---------- reduced motion: no springs, hops, or travel; fades only ---------- */
@media (prefers-reduced-motion: reduce) {
  .buddy-svg *, .bubble-box {
    animation: none !important;
    transition: opacity 0.4s ease !important;
  }
  .buddy-svg .b-z, .buddy-svg .b-steam { animation: b-fade 3s ease-in-out infinite !important; }
  .bubble-box { transform: none; }
}
```

- [ ] **Step 5: Implement `src/buddy/svg-buddy.ts`**

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/svg-buddy.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 7: Write base `src/styles.css`** (Task 10 appends layout rules)

```css
:root {
  color-scheme: light dark;
  --bg: #faf9f5;
  --surface: #ffffff;
  --text: #1f1e1c;
  --text-2: #6b6a65;
  --border: rgba(0, 0, 0, 0.12);
  --accent-fill: #993c1d;
  --accent-ink: #ffffff;
  --dot-fill: #d85a30;
  --dot-empty: rgba(0, 0, 0, 0.25);
  --danger: #a32d2d;
  --focus-ring: #378add;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1b19;
    --surface: #262522;
    --text: #f1efe8;
    --text-2: #b4b2a9;
    --border: rgba(255, 255, 255, 0.14);
    --accent-fill: #f0997b;
    --accent-ink: #2c2c2a;
    --dot-fill: #f0997b;
    --dot-empty: rgba(255, 255, 255, 0.3);
    --danger: #f09595;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); }
#app { min-height: 100%; display: grid; place-items: center; gap: 24px; padding: 16px; }
button { font: inherit; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.controls button {
  padding: 8px 16px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); cursor: pointer; font-size: 14px;
}
button.primary { background: var(--accent-fill); color: var(--accent-ink); border-color: transparent; min-width: 96px; }
```

- [ ] **Step 8: Write the buddy playground** (dev-only page for tuning animation now and the Rive buddy later)

`preview.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Buddy playground</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/preview.ts"></script>
  </body>
</html>
```

`src/preview.ts`:
```ts
import './styles.css';
import './buddy/buddy.css';
import { SvgBuddy } from './buddy/svg-buddy';
import type { BuddyState } from './buddy/types';

const buddy = new SvgBuddy();
const controls = document.createElement('div');
controls.className = 'controls';
let paused = false;

const states: BuddyState[] = ['idle', 'working', 'break', 'wave', 'sleeping'];
const actions: [string, () => void][] = [
  ...states.map((s): [string, () => void] => [s, () => buddy.setState(s)]),
  ['big wave', () => buddy.setState('wave', { big: true })],
  ['toggle paused', () => buddy.setPaused((paused = !paused))],
  ['say', () => buddy.say('Nice work, take five.')],
];
for (const [label, run] of actions) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', run);
  controls.append(b);
}
document.getElementById('app')!.append(buddy.element, controls);
```

- [ ] **Step 9: Check the buddy visually**

Start the dev server with the in-app browser (`preview_start` name `desk-buddy`), open `http://localhost:5173/preview.html`, and step through every button. Check:
- Working: laptop slides up in front, eyes drop to the screen, body bobs as if typing; "toggle paused" stops the bob and the eyes look up.
- Break: the mug lifts toward the mouth and tilts, steam rises; paused leaves the mug resting.
- Wave: right arm up, waving, small hop; big wave raises both arms with a bigger hop.
- Sleeping from idle: slumps, eyes closed, "z"s float; from working the laptop stays. Clicking another state plays the wake hop.
- Say: bubble springs out of the mouth area, tail points down, then shrinks back after 3.5 s.
- Repeat in dark mode (`resize_window` with `colorScheme: "dark"`).

If poses are visibly off (mug far from the mouth, arm detached), adjust only the numbers in `buddy.css` keyframes/transforms and re-check. Note anything that needs the designer's eye rather than tuning it at length — refinement is expected later.

- [ ] **Step 10: Run all tests and type check**

Run: `npm test && npx tsc`
Expected: all tests PASS; `tsc` prints nothing.

- [ ] **Step 11: Commit**

```bash
git add src/buddy src/styles.css src/preview.ts preview.html tests/svg-buddy.test.ts
git commit -m "feat: add animated SVG buddy and playground page"
```

---

### Task 8: Chime

**Files:**
- Create: `src/chime.ts`

**Interfaces:**
- Produces: `class Chime` — `constructor(muted: boolean)`, `muted: boolean` (public, writable), `unlock(): void` (call from a user gesture), `play(): void` (no-op when muted or not yet unlocked)

Web Audio is not available in jsdom, so this module is verified manually in Task 10; it is kept tiny for that reason.

- [ ] **Step 1: Implement `src/chime.ts`**

```ts
/** Soft two-note chime, synthesized so there's no audio file to load. */
export class Chime {
  private ctx?: AudioContext;

  constructor(public muted: boolean) {}

  /** Browsers only allow audio after a user gesture; call this from a click or key handler. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(): void {
    const ctx = this.ctx;
    if (this.muted || !ctx) return;
    const t = ctx.currentTime;
    for (const [freq, delay] of [[660, 0], [880, 0.18]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 1);
    }
  }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/chime.ts
git commit -m "feat: add synthesized chime"
```

---

### Task 9: Controller

**Files:**
- Create: `src/controller.ts`
- Test: `tests/controller.test.ts`

**Interfaces:**
- Consumes: `Timer`, `TimerEvent` (Task 2), `DayProgress` (Task 3), `Moment` (Task 4), `IdleWatcher` (Task 5), `Buddy`, `BuddyState`, `BuddyStateOptions` (Task 6)
- Produces:
  - `interface ControllerDeps { timer: Timer; buddy: Buddy; chime: { play(): void }; pickLine: (m: Moment) => string; recordFocus: (cycleCount: number) => DayProgress; resetCycle: () => DayProgress; onProgress: (p: DayProgress) => void; now: () => number; dozeMs: number; waveMs: number }`
  - `class Controller` — `constructor(deps)`, `get buddyState(): BuddyState`, `tick(): void` (call every frame), `userActivity(): void` (call on any pointer/key input, before handling it)

**Behavior table (from the spec):**

| Timer event | Buddy | Bubble | Other |
|---|---|---|---|
| `started` focus | `working`, unpaused | `focusStart` | idle watcher off |
| `started` break | `break`, unpaused | `breakStart` | idle watcher off |
| `paused` | same pose, paused | — | idle watcher on |
| `resumed` | same pose, unpaused | — | idle watcher off |
| `reset` / `skipped` | `idle`, unpaused | — | idle watcher on; skipping a long break resets stored cycle |
| `completed` | `wave` (big if `cycleComplete`), then `idle` after `waveMs` | `milestone` if cycle complete, else `focusEnd` / `breakEnd` | chime; focus → `recordFocus`; long break → `resetCycle`; idle watcher on |
| doze | `sleeping` (remembers prior pose; a wave counts as idle) | — | |
| wake | prior pose | — | |

- [ ] **Step 1: Write the failing tests**

`tests/controller.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controller } from '../src/controller';
import { Timer } from '../src/timer';
import { memoryStore, recordFocus, resetCycle, type DayProgress } from '../src/storage';
import type { Buddy, BuddyState, BuddyStateOptions } from '../src/buddy/types';

class FakeBuddy implements Buddy {
  element = document.createElement('div');
  state: BuddyState = 'idle';
  opts: BuddyStateOptions | undefined;
  paused = false;
  said: string[] = [];
  setState(s: BuddyState, o?: BuddyStateOptions) { this.state = s; this.opts = o; }
  setPaused(p: boolean) { this.paused = p; }
  say(t: string) { this.said.push(t); }
}

function setup() {
  const now = () => Date.now();
  const timer = new Timer({ now, durations: { focus: 1000, shortBreak: 500, longBreak: 800 }, longBreakEvery: 2 });
  const buddy = new FakeBuddy();
  const chime = { play: vi.fn() };
  const store = memoryStore();
  let progress: DayProgress | undefined;
  const c = new Controller({
    timer, buddy, chime,
    pickLine: (m) => `line:${m}`,
    recordFocus: (n) => recordFocus(store, now(), n),
    resetCycle: () => resetCycle(store, now()),
    onProgress: (p) => { progress = p; },
    now, dozeMs: 10_000, waveMs: 5_000,
  });
  const advance = (ms: number) => { vi.advanceTimersByTime(ms); c.tick(); };
  return { timer, buddy, chime, c, advance, progress: () => progress };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('Controller', () => {
  it('starts idle and silent', () => {
    const { buddy } = setup();
    expect(buddy.state).toBe('idle');
    expect(buddy.said).toEqual([]);
  });

  it('starting focus shows working and says a focus line', () => {
    const { timer, buddy } = setup();
    timer.start();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(false);
    expect(buddy.said).toEqual(['line:focusStart']);
  });

  it('pausing keeps the pose and says nothing', () => {
    const { timer, buddy } = setup();
    timer.start();
    timer.pause();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(true);
    timer.start();
    expect(buddy.paused).toBe(false);
    expect(buddy.said).toEqual(['line:focusStart']);
  });

  it('completing focus waves, chimes, records progress, then returns to idle', () => {
    const { timer, buddy, chime, advance, progress } = setup();
    timer.start();
    advance(1000);
    expect(buddy.state).toBe('wave');
    expect(buddy.opts).toEqual({ big: false });
    expect(chime.play).toHaveBeenCalledOnce();
    expect(buddy.said.at(-1)).toBe('line:focusEnd');
    expect(progress()).toMatchObject({ todayCount: 1, cycleCount: 1 });
    advance(5000);
    expect(buddy.state).toBe('idle');
  });

  it('starting a break sips coffee and ending it says a break-end line', () => {
    const { timer, buddy, advance } = setup();
    timer.start(); advance(1000);
    timer.start();
    expect(buddy.state).toBe('break');
    expect(buddy.said.at(-1)).toBe('line:breakStart');
    advance(500);
    expect(buddy.state).toBe('wave');
    expect(buddy.said.at(-1)).toBe('line:breakEnd');
  });

  it('the last focus of a cycle gets a big wave and a milestone line; long break resets the cycle', () => {
    const { timer, buddy, advance, progress } = setup();
    timer.start(); advance(1000);
    timer.start(); advance(500);
    timer.start(); advance(1000);
    expect(buddy.opts).toEqual({ big: true });
    expect(buddy.said.at(-1)).toBe('line:milestone');
    expect(progress()).toMatchObject({ todayCount: 2, cycleCount: 2 });
    timer.start(); advance(800);
    expect(progress()).toMatchObject({ todayCount: 2, cycleCount: 0 });
  });

  it('skip and reset go idle without a bubble', () => {
    const { timer, buddy } = setup();
    timer.start();
    timer.reset();
    expect(buddy.state).toBe('idle');
    timer.start();
    timer.skip();
    expect(buddy.state).toBe('idle');
    expect(buddy.said).toEqual(['line:focusStart', 'line:focusStart']);
  });

  it('dozes after the delay when idle and wakes on activity', () => {
    const { c, buddy, advance } = setup();
    advance(10_000);
    expect(buddy.state).toBe('sleeping');
    c.userActivity();
    expect(buddy.state).toBe('idle');
  });

  it('wakes back into a paused working pose', () => {
    const { c, timer, buddy, advance } = setup();
    timer.start();
    timer.pause();
    advance(10_000);
    expect(buddy.state).toBe('sleeping');
    c.userActivity();
    expect(buddy.state).toBe('working');
    expect(buddy.paused).toBe(true);
  });

  it('never dozes while the timer is running', () => {
    const { timer, buddy, advance } = setup();
    timer.setConfig({ focus: 60_000, shortBreak: 500, longBreak: 800 }, 2);
    timer.start();
    advance(30_000);
    expect(buddy.state).toBe('working');
  });

  it('a new event cancels the pending return to idle', () => {
    const { timer, buddy, advance } = setup();
    timer.start(); advance(1000);
    timer.start();
    timer.pause();
    advance(5000);
    expect(buddy.state).toBe('break');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/controller.test.ts`
Expected: FAIL — cannot find module `../src/controller`.

- [ ] **Step 3: Implement `src/controller.ts`**

```ts
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
  recordFocus: (cycleCount: number) => DayProgress;
  resetCycle: () => DayProgress;
  onProgress: (p: DayProgress) => void;
  now: () => number;
  dozeMs: number;
  waveMs: number;
}

export class Controller {
  private state: BuddyState = 'idle';
  private stateBeforeSleep: BuddyState = 'idle';
  private waveTimer?: ReturnType<typeof setTimeout>;
  private readonly idle: IdleWatcher;

  constructor(private readonly d: ControllerDeps) {
    this.idle = new IdleWatcher({
      now: d.now,
      delayMs: d.dozeMs,
      onDoze: () => this.doze(),
      onWake: () => this.show(this.stateBeforeSleep),
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
    this.d.buddy.setState(s, opts);
  }

  private handle(e: TimerEvent): void {
    clearTimeout(this.waveTimer);
    const { buddy, pickLine } = this.d;
    switch (e.type) {
      case 'started':
        buddy.setPaused(false);
        this.show(e.phase === 'focus' ? 'working' : 'break');
        buddy.say(pickLine(e.phase === 'focus' ? 'focusStart' : 'breakStart'));
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
    buddy.say(pickLine(moment));
    this.idle.setEligible(true);
    this.waveTimer = setTimeout(() => {
      if (this.state === 'wave') this.show('idle');
    }, this.d.waveMs);
  }

  private doze(): void {
    clearTimeout(this.waveTimer);
    this.stateBeforeSleep = this.state === 'wave' ? 'idle' : this.state;
    this.show('sleeping');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/controller.test.ts`
Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controller.ts tests/controller.test.ts
git commit -m "feat: add controller wiring timer to buddy, chime, and storage"
```

---

### Task 10: Screen, settings panel, and app entry

**Files:**
- Create: `src/ui/icons.ts`, `src/ui/view.ts`, `src/ui/settings-panel.ts`
- Modify: `src/styles.css` (append layout, compact, and dialog rules)
- Replace: `src/main.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `interface ViewHandlers { onToggle(): void; onSkip(): void; onReset(): void; onOpenSettings(): void; onToggleMute(): void }`
  - `interface ViewModel { snapshot: TimerSnapshot; todayCount: number; longBreakEvery: number; muted: boolean }`
  - `createView(root: HTMLElement, buddyEl: HTMLElement, h: ViewHandlers): { render(m: ViewModel): void }`
  - `createSettingsPanel(o: { getSettings(): Settings; onSave(s: Settings): void }): { element: HTMLDialogElement; open(): void }`

This task is DOM glue verified in the browser; the logic it calls is already unit-tested.

- [ ] **Step 1: Write `src/ui/icons.ts`**

```ts
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const SETTINGS_ICON = svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>');

/** Shows sound waves normally and an × when the button is aria-pressed (muted). */
export const SOUND_ICON = svg(
  '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="snd-wave" d="M16.5 8.5a5 5 0 0 1 0 7"/><path class="snd-x" d="M17 9.5l5 5M22 9.5l-5 5"/>',
);
```

- [ ] **Step 2: Write `src/ui/view.ts`**

```ts
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
    <div class="dots-row"><span class="dots" aria-hidden="true"></span><span class="today"></span></div>
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
      muteBtn.setAttribute('aria-pressed', String(m.muted));

      const filled = Math.min(cycleCount, m.longBreakEvery);
      const key = `${filled}/${m.longBreakEvery}`;
      if (key !== dotsKey) {
        dotsKey = key;
        dotsEl.innerHTML = Array.from({ length: m.longBreakEvery }, (_, i) =>
          `<span class="dot${i < filled ? ' filled' : ''}"></span>`).join('');
      }
    },
  };
}
```

- [ ] **Step 3: Write `src/ui/settings-panel.ts`**

```ts
import { SETTING_LIMITS, type Settings } from '../config';
import { validateSettings } from '../storage';

const FIELDS: { key: keyof Settings; label: string; unit: string }[] = [
  { key: 'focusMin', label: 'Focus length', unit: 'min' },
  { key: 'shortBreakMin', label: 'Short break', unit: 'min' },
  { key: 'longBreakMin', label: 'Long break', unit: 'min' },
  { key: 'longBreakEvery', label: 'Long break every', unit: 'sessions' },
];

export function createSettingsPanel(o: { getSettings(): Settings; onSave(s: Settings): void }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'settings';
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.innerHTML = `
    <form novalidate>
      <h2 id="settings-title">Settings</h2>
      ${FIELDS.map(({ key, label, unit }) => `
        <label class="field">
          <span class="field-label">${label}</span>
          <span class="field-input">
            <input type="number" name="${key}" min="${SETTING_LIMITS[key].min}" max="${SETTING_LIMITS[key].max}"
              step="1" inputmode="numeric" aria-describedby="err-${key}" />
            <span>${unit}</span>
          </span>
          <span class="field-error" id="err-${key}"></span>
        </label>`).join('')}
      <p class="hint">A running timer keeps its length. Changes apply from the next phase.</p>
      <div class="settings-actions controls">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="submit" class="primary">Save</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form')!;
  const input = (key: keyof Settings) => form.querySelector<HTMLInputElement>(`[name="${key}"]`)!;
  const errorEl = (key: keyof Settings) => form.querySelector<HTMLElement>(`#err-${key}`)!;
  const clearErrors = () => FIELDS.forEach(({ key }) => {
    errorEl(key).textContent = '';
    input(key).removeAttribute('aria-invalid');
  });

  form.addEventListener('input', (e) => {
    const key = (e.target as HTMLInputElement).name as keyof Settings;
    errorEl(key).textContent = '';
    input(key).removeAttribute('aria-invalid');
  });

  dialog.querySelector('[data-action="cancel"]')!.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = Object.fromEntries(
      FIELDS.map(({ key }) => [key, input(key).value === '' ? NaN : Number(input(key).value)]),
    ) as Record<keyof Settings, number>;
    const result = validateSettings(values);
    if (!result.ok) {
      clearErrors();
      for (const [key, msg] of Object.entries(result.errors) as [keyof Settings, string][]) {
        errorEl(key).textContent = msg;
        input(key).setAttribute('aria-invalid', 'true');
      }
      input(Object.keys(result.errors)[0] as keyof Settings).focus();
      return;
    }
    o.onSave(result.settings);
    dialog.close();
  });

  return {
    element: dialog,
    open(): void {
      const s = o.getSettings();
      FIELDS.forEach(({ key }) => (input(key).value = String(s[key])));
      clearErrors();
      dialog.showModal();
    },
  };
}
```

- [ ] **Step 4: Append layout rules to `src/styles.css`**

```css
/* ---------- full layout ---------- */
.app {
  width: min(100%, 360px);
  display: grid;
  justify-items: center;
  gap: 12px;
  grid-template-areas: "top" "buddy" "readout" "controls";
}
.app-top { grid-area: top; width: 100%; display: flex; justify-content: space-between; align-items: center; }
.phase-label { font-size: 14px; color: var(--text-2); }
.icon-row { display: flex; gap: 4px; }
.icon-btn {
  background: none; border: 0; color: var(--text-2); padding: 6px; border-radius: 8px;
  cursor: pointer; display: grid; place-items: center;
}
.icon-btn:hover { color: var(--text); background: var(--border); }
.icon-btn[aria-pressed="true"] .snd-wave,
.icon-btn:not([aria-pressed="true"]) .snd-x { display: none; }
.buddy-slot { grid-area: buddy; padding-top: 40px; }
.readout { grid-area: readout; display: grid; justify-items: center; gap: 8px; }
.time { font-size: 48px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.dots-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); }
.dots { display: flex; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--dot-empty); }
.dot.filled { background: var(--dot-fill); border-color: var(--dot-fill); }
.app .controls { grid-area: controls; }

/* ---------- compact layout (small windows / future desktop app) ---------- */
@media (max-width: 360px), (max-height: 420px) {
  #app { padding: 8px; }
  .app {
    position: relative;
    grid-template-areas: "buddy readout" "controls controls";
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    align-items: center;
    justify-items: start;
  }
  .app-top { position: absolute; top: 0; right: 0; width: auto; }
  .phase-label { display: none; }
  .buddy-slot { padding-top: 28px; }
  .buddy { --mouth-drop: 30px; }
  .buddy-svg { width: 100px; height: 90px; }
  .bubble { bottom: calc(100% - 28px); max-width: 160px; }
  .bubble-box { font-size: 12px; padding: 4px 9px; }
  .time { font-size: 28px; }
  .dot { width: 7px; height: 7px; border-width: 1px; }
  .app .controls, .icon-row { opacity: 0; transition: opacity 0.2s; }
  .app:hover .controls, .app:focus-within .controls,
  .app:hover .icon-row, .app:focus-within .icon-row { opacity: 1; }
  .app .controls button { padding: 4px 10px; font-size: 12px; }
  .app button.primary { min-width: 64px; }
}

/* ---------- settings dialog ---------- */
.settings {
  border: 1px solid var(--border); border-radius: 16px; padding: 20px;
  background: var(--surface); color: var(--text); width: min(92vw, 320px);
}
.settings::backdrop { background: rgba(0, 0, 0, 0.35); }
.settings h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
.field { display: grid; gap: 4px; margin-bottom: 12px; font-size: 14px; }
.field-input { display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.field-input input {
  width: 72px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font: inherit;
}
.field-input input[aria-invalid="true"] { border-color: var(--danger); }
.field-error { color: var(--danger); font-size: 13px; min-height: 1em; }
.hint { font-size: 13px; color: var(--text-2); margin: 4px 0 16px; }
.settings-actions { justify-content: flex-end; }
```

- [ ] **Step 5: Replace `src/main.ts`**

```ts
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
  frame();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
// rAF pauses in background tabs; this keeps phase ends (and the chime) firing there.
setInterval(frame, 1000);
```

- [ ] **Step 6: Type check and build**

Run: `npx tsc && npm run build`
Expected: no type errors; Vite writes `dist/`.

- [ ] **Step 7: Verify in the in-app browser (demo mode)**

Start `desk-buddy` with `preview_start`, open `http://localhost:5173/?demo`. Check each item and fix anything broken before committing:
1. Load: buddy idle, "Focus", `00:10`, 4 empty dots, "0 today", no bubble.
2. Start: bubble grows from the mouth with a focus-start line; buddy works behind the laptop; tab title shows the time.
3. Pause: button reads "Resume", buddy stops typing and looks up, no bubble. Resume continues.
4. Focus ends: chime, wave, focus-end line, 1 dot filled, "1 today"; ~5 s later idle; label "Short break".
5. Start break: coffee sipping, break-start line. Break ends: wave and break-end line.
6. Complete the 4th focus: big wave and milestone line; long break follows; after it the dots clear.
7. Skip during focus: idle, no bubble, count unchanged. Reset mid-phase: returns to full length.
8. Leave it idle 20 s: buddy dozes; click anywhere: wake hop, back to the prior pose. Pause mid-focus and wait 20 s: sleeps on the laptop, wakes back to paused working.
9. Settings: open, enter `0` for focus → inline error, not saved; enter valid values → saved. Mute: icon shows ×, next phase end is silent; reload keeps mute (non-demo).
10. Keyboard: Tab reaches every control with a visible focus ring; Space on the page toggles start/pause.
11. Resize to 320×240 (`resize_window`): compact layout, controls appear on hover/focus.
12. Dark mode (`resize_window` with `colorScheme: "dark"`): everything readable.
13. Open without `?demo`: 25:00 default; a reload keeps today's count.

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/styles.css src/main.ts
git commit -m "feat: add main screen, settings panel, and app entry"
```

---

### Task 11: Final verification

**Files:** none (fixes only if something fails)

- [ ] **Step 1: Full test, type check, and build**

Run: `npm test && npx tsc && npm run build`
Expected: all tests PASS, no type errors, build succeeds.

- [ ] **Step 2: Reduced motion check**

The in-app browser can't emulate reduced motion, so ask the designer to turn on System Settings → Accessibility → Display → Reduce motion and reload (don't change system settings yourself). Expected: no hops or springs; pose changes fade; "z"s and steam fade in place; bubble fades rather than scales.

- [ ] **Step 3: Background tab check (non-demo, short settings)**

Set focus to 1 minute, start, switch to another tab for over a minute, return. Expected: the phase has ended, the buddy waves with the bubble on return (or already did if the chime fired in the background), and the count increased by one.

- [ ] **Step 4: Report**

Summarize what works, anything that needed tuning, and animation details that need the designer's eye. Do not claim anything that wasn't observed.
