# Desk Buddy — Design Spec

**Date:** 2026-10-13
**Status:** Draft for review

## Summary

A Pomodoro timer with an animated coworking buddy that keeps you company. The buddy's pose follows the timer (working, sipping coffee on break, waving when a phase ends, dozing when forgotten) and offers short encouragement in speech bubbles at phase changes.

**Goals**
- A charming, instantly playable piece for a portfolio "play gallery" (brief description, no case study).
- A learning project: motion design (later in Rive) and packaging a web app as a desktop app.

**Delivery plan**
1. **Phase 1 (this spec):** browser app with a code-drawn SVG buddy. Fully working end to end.
2. **Phase 2 (later, separate spec):** a Rive buddy swapped in behind the same interface, plus packaging as an always-on-top desktop app (Tauri).

## Tech

- Vite + plain TypeScript, no UI framework. Small, easy to embed in the portfolio site, packages cleanly with Tauri later.
- Vitest for unit tests.
- No backend. All state lives in the browser (`localStorage`).

## Architecture

Each unit has one job and talks to the others through small interfaces.

| Unit | File | Responsibility |
|---|---|---|
| Timer | `src/timer.ts` | Pure phase logic: focus / short break / long break; start, pause, resume, skip, reset; emits events. Accepts an injectable clock. |
| Buddy interface | `src/buddy/types.ts` | `setState(state)`, `setPaused(bool)`, `say(text)`. The only thing the app knows about the buddy. |
| SVG buddy | `src/buddy/svg-buddy.ts` | Phase 1 implementation: smooth-vector SVG character animated with CSS. |
| Bubble | `src/buddy/bubble.ts` | Speech bubble that grows from the buddy's mouth (used by `SvgBuddy.say`). |
| Messages | `src/messages.ts` | Line pools per moment; picks randomly without repeating the previous line. |
| Storage | `src/storage.ts` | Settings, today's count, cycle position; daily rollover. |
| Chime | `src/chime.ts` | Soft tone via Web Audio; mute flag. |
| Idle watcher | `src/idle.ts` | Tracks inactivity; fires "doze" after 10 min and "wake" on activity. |
| UI | `src/ui/*.ts` | Timer display, controls, session dots, settings panel, mute toggle, layout switching. |
| Controller | `src/controller.ts` | Wires timer events → buddy state, bubbles, chime, storage, UI. |

Phase 2 adds `src/buddy/rive-buddy.ts` implementing the same interface; nothing else changes.

### Timer accuracy

The timer stores an **end timestamp**, not a tick count. The display recomputes remaining time from the clock each frame, so it stays correct when the tab is backgrounded or the laptop sleeps. When the app regains focus and the end time has passed, the phase-end sequence runs then.

## Timer behavior

**Defaults:** focus 25 min, short break 5 min, long break 15 min, long break after every 4 focus sessions.

- Phases follow: focus → short break → focus → … → after the Nth focus, long break → focus.
- When a phase ends, the next phase is **prepared but not started**; the user clicks Start.
- **Pause / resume:** freezes and continues the current phase.
- **Skip:** ends the current phase immediately and prepares the next one. A skipped focus session **does not count** toward the session total or cycle.
- **Reset:** stops the current phase and returns it to its full length (same phase, not running).
- A focus session counts when it runs to completion.

### Session counter

- **Dots** show progress through the current cycle (e.g., 2 of 4 filled). They clear after the long break.
- **"N today"** label shows total completed focus sessions today.
- Both reset on the first load or completed session on a new calendar day (local time). A session counts toward the day it finished.

### Settings panel

Opened from a gear icon. Fields:

| Setting | Default | Range |
|---|---|---|
| Focus length | 25 min | 1–90 |
| Short break | 5 min | 1–30 |
| Long break | 15 min | 1–60 |
| Long break every | 4 sessions | 2–8 |

Invalid input shows an inline error and is not saved. Changes apply **from the next phase**; the running countdown never jumps. Settings persist in `localStorage`.

Mute is a separate speaker icon beside the gear, also persisted.

## Buddy

### Visual style

Smooth-vector character (rounded body, cheeks, expressive eyes), with poses that ease into each other using springy easing (slight overshoot). Two states borrow staging from the code-drawn sample, which read better:

- **Working:** buddy sits *behind* a laptop seen from the back of the lid; eyes look down at the screen; subtle typing bob.
- **Break:** mug lifts to the mouth and tilts to sip, with steam; it must not spin with the arm.

### States

| State | When | Animation |
|---|---|---|
| `idle` | Timer stopped, reset, or waiting for the next phase (after the wave) | Breathing, occasional blink |
| `working` | Focus phase running | Behind laptop, typing bob, eyes on screen |
| `break` | Short or long break running | Sipping coffee on a loop, steam |
| `wave` | A phase just ended | Waves and hops for ~5 s, then → `idle` |
| `sleeping` | 10 min with no activity while paused, idle, or waiting | Eases down to rest head on folded arms (on the laptop if it was working); eyes closed; slow breathing; floating "z"s |

**Milestone wave:** when the Nth focus session of a cycle completes, the wave is bigger (extra hop or a little cheer).

**Paused:** `setPaused(true)` keeps the current pose but calms it: in `working`, the typing stops and the buddy looks up from the screen; in `break`, the mug rests on the table. Resuming returns to the full animation.

**Sleeping and waking:**
- The 10-minute inactivity clock runs only when the timer is not actively counting (paused, idle, or waiting). Any click, key press, or control use resets it.
- Waking (any activity while asleep): a small startled hop and a stretch, then ease back into the pose held before sleeping (paused state included). No bubble.
- Demo mode (below) shortens the doze delay to 20 seconds.

### Speech bubbles

- Appear **only at phase changes**:
  - Focus starts
  - A phase ends (alongside the wave and chime)
  - A break starts
  - The cycle's last focus session completes (milestone line)
- Pause, resume, skip, reset, and waking produce **no** bubble.
- **Animation:** starts as a small dot at the buddy's mouth, springs open (scale with slight overshoot), tail points to the mouth. The mouth does a small "pop" as it appears. Holds ~3.5 s, then shrinks back into the mouth. If a new line arrives while one is visible, the current one closes quickly and the new one grows out.
- Lines are picked at random from the moment's pool, never repeating the previous line for that moment.

**Starter lines** (placeholders — final copy to be written by the designer):

| Moment | Examples |
|---|---|
| Focus starts | "Let's do this." · "One thing at a time." · "I'll be right here." |
| Phase ends (focus) | "Time's up! Coffee?" · "Nice focus. Break time." |
| Phase ends (break) | "Break's over. Ready?" · "Feeling fresh?" |
| Break starts | "Nice work, take five." · "Stretch those legs." |
| Milestone | "Four down! Long break earned." · "Look at you go." |

## Layout

One app, two layouts, chosen automatically by window size.

- **Full (browser / gallery demo):** phase label at top; bubble above the buddy; buddy centered; large timer below; Start/Pause, Skip, Reset buttons; session dots with "N today"; gear and speaker icons in the top-right corner.
- **Compact (small windows, future desktop app):** buddy and timer side by side, dots under the time, bubble above. Controls appear on hover or keyboard focus.

Light and dark themes follow the system setting.

## Sound

- A soft chime (synthesized with Web Audio, no audio file) when any phase ends.
- The audio context is created on the first Start click, since browsers block sound until the user interacts.
- Muted state is respected and persisted.

## Accessibility

- All controls reachable by keyboard; Space toggles start/pause.
- Phase changes and bubble text announced via an ARIA live region.
- `prefers-reduced-motion`: pose changes crossfade instead of spring; no hopping; "z"s and steam fade in place; bubble fades instead of scaling.
- Visible focus indicators; text and controls meet WCAG AA contrast in both themes.

## Demo mode

Enabled with `?demo` in the URL. Focus 10 s, short break 5 s, long break 8 s, doze delay 20 s. Does not write to the real daily count. Used for testing every state quickly and for recording the gallery GIF.

## Testing

**Unit tests (Vitest, fake clock):**
- Timer: phase order, long break every N, pause/resume, skip (doesn't count focus), reset, correct remaining time after a large clock jump, phase-end after returning from background.
- Settings changed mid-phase apply only from the next phase.
- Storage: daily rollover of count and cycle position; settings validation.
- Messages: no immediate repeats; every moment has at least one line.
- Idle watcher: dozes after 10 min only when the timer isn't running; any activity resets.
- Controller: timer events produce the right buddy state, bubble, and chime calls (using a fake buddy that records calls).

**Manual checks (in-app browser, demo mode):**
- Every buddy state and transition, paused variants, sleep and wake.
- Bubble grows from and returns to the mouth; interruption behavior.
- Full and compact layouts, light and dark themes, reduced motion.

## Out of scope (Phase 1)

- Rive buddy and desktop packaging (Phase 2).
- Session history beyond today, daily goals, stats.
- Auto-starting the next phase.
- System notifications.
- AI-generated messages.
