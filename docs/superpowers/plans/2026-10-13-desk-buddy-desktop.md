# Desk Buddy Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Desk Buddy as a macOS Tauri app: a transparent always-on-top floating buddy, a menu bar item with controls, a separate settings window, and phase-end notifications — without changing the web app.

**Architecture:** The existing Vite app is the frontend for Tauri. `isDesktop()` gates everything desktop-specific; desktop modules live in `src/desktop/` and are loaded by dynamic import only inside Tauri. Pure logic (window placement, tray labels, desktop prefs, settings sync) is unit-tested; Tauri glue is verified with a manual checklist run together with the user.

**Tech Stack:** Tauri 2 (Rust, system WebKit), `@tauri-apps/api`, `@tauri-apps/plugin-notification`, `@fontsource/inter`, existing Vite + TypeScript + Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-desk-buddy-desktop-design.md`

## Global Constraints

- The browser build (`npm run build`, `npm run dev`) must behave exactly as before and never import Tauri code at startup.
- All 68 existing tests keep passing.
- Floating window: ~260×220, transparent, undecorated, no shadow, always on top, not resizable; bubble fits inside.
- Menu bar menu order: Start/Pause/Resume, Skip, Reset, —, Show buddy ✓, Click-through ✓, Mute chime ✓, Show in Dock ✓, —, Settings…, Quit Desk Buddy.
- Defaults: Show in Dock on, click-through off, Show buddy on.
- Notifications: title "Desk Buddy", body = the bubble line; permission requested on first use; denial is harmless.
- Settings window: decorated, "Desk Buddy Settings", ~400×520; Save applies to the floating buddy without restart.
- No signing/notarization. No launch-at-login, no global shortcuts.
- Tauri APIs: use the versions `npm`/`cargo` install; where a call in this plan differs from the installed version's types/docs, follow the installed version and note it in the report.

## File Structure

```
src/fonts.ts                      @font-face via @fontsource/inter (weight 200)
src/desktop/detect.ts             isDesktop()
src/desktop/prefs.ts              click-through, show-in-dock, show-buddy, window position storage
src/desktop/placement.ts          restorePosition(saved, monitors, size) → position or null (center)
src/desktop/tray-labels.ts        trayTitle(snapshot), toggleLabel(status)
src/desktop/sync.ts               onStoredSettingsChange(event, handlers)
src/desktop/index.ts              startDesktop(app): window, tray, notifications, sync wiring
src/desktop/settings-window.ts    settings page entry for the settings window
src/desktop/desktop.css           transparent page, halo, hidden icons, bubble fit
settings.html                     page loaded by the settings window
src-tauri/                        Tauri project (tauri init), icons, capabilities, Rust commands
assets/tray-icon.svg              monochrome menu bar icon source
tests/desktop/*.test.ts           tests for the pure modules
```

---

### Task 1: Bundle the Inter font locally

**Files:** Create `src/fonts.ts`; Modify `index.html`, `src/main.ts`, `src/preview.ts`; `package.json` (dependency).

- [ ] Run `npm install @fontsource/inter`.
- [ ] Create `src/fonts.ts`:
  ```ts
  // Inter Extra Light for the timer, bundled so the app works offline (desktop) and needs no Google request.
  import '@fontsource/inter/200.css';
  ```
- [ ] Import `./fonts` first in `src/main.ts` and `src/preview.ts`; remove the three Google Fonts `<link>` tags from `index.html`.
- [ ] Verify: `npm run build` succeeds and `dist/assets` contains an `inter-*-200-normal.woff2`; in the browser, `document.fonts.check('200 36px Inter')` is true with the network tab showing no fonts.googleapis.com request.
- [ ] Run `npm test && npx tsc`; commit "bundle Inter locally".

### Task 2: Desktop prefs and pure helpers (TDD)

**Files:** Create `src/desktop/detect.ts`, `src/desktop/prefs.ts`, `src/desktop/placement.ts`, `src/desktop/tray-labels.ts`; Tests `tests/desktop/prefs.test.ts`, `tests/desktop/placement.test.ts`, `tests/desktop/tray-labels.test.ts`, `tests/desktop/detect.test.ts`.

**Interfaces produced:**
- `isDesktop(): boolean` — true when `'__TAURI_INTERNALS__' in window`.
- `interface DesktopPrefs { clickThrough: boolean; showInDock: boolean; showBuddy: boolean }`, `loadDesktopPrefs(store)`, `saveDesktopPrefs(store, p)` — defaults `{ clickThrough: false, showInDock: true, showBuddy: true }`; corrupt JSON → defaults.
- `interface Point { x: number; y: number }`, `loadWindowPosition(store): Point | null`, `saveWindowPosition(store, p)`.
- `interface Rect { x: number; y: number; width: number; height: number }`; `restorePosition(saved: Point | null, monitors: Rect[], size: { width: number; height: number }): Point | null` — returns `saved` if at least 60% of the window rect lies within one monitor, else `null` (caller centers).
- `trayTitle(s: TimerSnapshot): string` — `''` when `status === 'ready'`, else `formatTime(remainingMs)`.
- `toggleLabel(status: TimerStatus): string` — `'Start' | 'Pause' | 'Resume'`.

- [ ] Write tests first:
  - prefs: defaults; round-trip; corrupt JSON → defaults; window position round-trip; missing → null; non-numeric → null.
  - placement: fully on-screen → saved; off all monitors → null; 70% on a second monitor → saved; 30% on → null; `saved === null` → null.
  - tray-labels: ready → `''`; running 25:00 → `'25:00'`; paused 1 ms → `'00:01'`; toggleLabel for each status.
  - detect: false in jsdom; true after `(window as any).__TAURI_INTERNALS__ = {}` (delete afterwards).
- [ ] Run tests → fail (modules missing). Implement. Run → pass. `npx tsc`. Commit "desktop prefs and pure helpers".

### Task 3: Settings sync between windows (TDD)

**Files:** Create `src/desktop/sync.ts`; Test `tests/desktop/sync.test.ts`; Modify `src/storage.ts` (export the key names as `STORAGE_KEYS`).

**Interface:** `onStoredSettingsChange(e: { key: string | null }, h: { settings(): void; look(): void; sound(): void; desktop(): void }): void` — maps `deskBuddy.settings` → `settings`, `deskBuddy.color` / `deskBuddy.appearance` → `look`, `deskBuddy.sound` → `sound`, `deskBuddy.desktop` → `desktop`, `null` (storage cleared) → all four; other keys ignored.

- [ ] Tests for each mapping, the null case, and an unrelated key. Fail → implement → pass. Commit "settings sync helper".

### Task 4: Tauri scaffold and app icon

**Files:** `src-tauri/**` (generated), `package.json` scripts, `.gitignore`.

- [ ] `npm install -D @tauri-apps/cli` and `npm install @tauri-apps/api @tauri-apps/plugin-notification`.
- [ ] `npx tauri init` non-interactively: app name "Desk Buddy", window title "Desk Buddy", frontend dist `../dist`, dev URL `http://localhost:5173`, before-dev `npm run dev`, before-build `npm run build`. Add `"tauri": "tauri"` to scripts.
- [ ] Add `src-tauri/target` and `src-tauri/gen/schemas` to `.gitignore`.
- [ ] Generate icons: `npx tauri icon assets/app-icon.svg` (if SVG input isn't accepted, render a 1024 px PNG with `qlmanage -t -s 1024 -o /tmp assets/app-icon.svg` and pass that).
- [ ] Configure `tauri.conf.json`: identifier `com.summerhannon.deskbuddy`; `app.macOSPrivateApi: true` (needed for transparency); window `main`: `width 260, height 220, transparent true, decorations false, shadow false, alwaysOnTop true, resizable false, skipTaskbar false, visible true`; bundle targets `app`.
- [ ] Register `tauri-plugin-notification` in `src-tauri/src/lib.rs`; capabilities file granting `core:default`, `core:window:allow-start-dragging`, `core:window:allow-set-ignore-cursor-events`, `core:window:allow-show`, `core:window:allow-hide`, `core:window:allow-set-focus`, `core:window:allow-set-position`, `core:window:allow-outer-position`, `core:window:allow-center`, `core:webview:allow-create-webview-window`, `core:tray:default`, `core:menu:default`, `core:app:default`, `notification:default` (adjust names to the installed version's schema).
- [ ] Rust command `set_dock_visible(app, visible: bool)` calling `app.set_activation_policy(Regular | Accessory)` on macOS; handle `RunEvent::Reopen` by showing and focusing the `main` window.
- [ ] Verify `npm run tauri dev` opens a window showing the app (it will still look like the web app). Commit "tauri scaffold and icons".

### Task 5: Desktop mode in the floating window

**Files:** Create `src/desktop/desktop.css`, `src/desktop/index.ts`; Modify `src/main.ts`.

- [ ] In `main.ts`, after the app is wired: `if (isDesktop()) { document.documentElement.dataset.desktop = ''; import('./desktop').then((m) => m.startDesktop(ctx)); }` where `ctx` exposes `{ timer, chime, store, getSettings, applySettings, applyLook, applySound, controllerEvents }` (pass what later tasks need; keep the web path untouched).
- [ ] `desktop.css` (imported by `desktop/index.ts`): `html[data-desktop], html[data-desktop] body { background: transparent }`; hide `.app-top` icons; halo on `.phase-label`, `.time`, `.dots-row` (`text-shadow: 0 0 6px var(--bg), 0 0 2px var(--bg)`); keep the compact layout; ensure the bubble fits (top padding on `.buddy-slot`).
- [ ] Add `data-tauri-drag-region` to `.buddy-slot` and `.readout` at startup in `startDesktop`.
- [ ] Verify in `npm run tauri dev`: transparent window, drag works, buttons click, hover reveals controls, bubble not clipped. Commit "desktop floating window".

### Task 6: Window position, Dock, show/hide

- [ ] On start: `restorePosition(loadWindowPosition(store), monitors, size)` → `setPosition` or `center()`.
- [ ] Listen to the window's moved event (debounced 300 ms) → `saveWindowPosition`.
- [ ] Apply `showInDock` via `invoke('set_dock_visible', { visible })` at start and on toggle.
- [ ] Verify: move, quit, relaunch → same spot. Commit "remember position; dock visibility".

### Task 7: Menu bar item

- [ ] Create `assets/tray-icon.svg` (black silhouette of the buddy face with transparent eye cut-outs, 44×44 viewBox) and render `src-tauri/icons/tray@2x.png` (44 px) and `tray.png` (22 px) with `qlmanage`/`sips`.
- [ ] Build the tray with `@tauri-apps/api/tray` + `menu`: items per the Global Constraints; `iconAsTemplate: true`.
- [ ] Every second: `tray.setTitle(trayTitle(snapshot))`; update the toggle item text with `toggleLabel` when status changes; checkmarks reflect `DesktopPrefs` and mute.
- [ ] Item actions: toggle/skip/reset call the timer; Show buddy shows/hides `main`; Click-through calls `setIgnoreCursorEvents`; Mute flips `chime.muted` + `saveMuted`; Show in Dock flips + invoke; Settings… opens the settings window (Task 8); Quit exits.
- [ ] Persist the three desktop prefs; apply them at launch.
- [ ] Verify each item. Commit "menu bar item".

### Task 8: Settings window

**Files:** Create `settings.html`, `src/desktop/settings-window.ts`; Modify `src/ui/settings-panel.ts` (add `mode: 'dialog' | 'page'`), `vite.config.ts` (multi-page input: `index.html`, `settings.html`).

- [ ] `createSettingsPanel` gains `mode`; in `page` mode it renders the form into a container (no `<dialog>`), Cancel and Save call `onClose()` after their work, and live look preview applies to that page only.
- [ ] `settings-window.ts`: loads settings/prefs from storage, renders the panel in page mode, saves to storage on Save, then `getCurrentWindow().close()`.
- [ ] Menu "Settings…": if a window labeled `settings` exists, focus it; else `new WebviewWindow('settings', { url: 'settings.html', title: 'Desk Buddy Settings', width: 400, height: 520, center: true, resizable: false })`.
- [ ] Main window: `window.addEventListener('storage', (e) => onStoredSettingsChange(e, handlers))` with handlers that reload from storage and apply (timer.setConfig, showLook, chime.sound, desktop prefs).
- [ ] Verify: change color + length in the settings window → Save → floating buddy updates. Cancel changes nothing. Commit "settings window".

### Task 9: Notifications

- [ ] Expose phase-end lines from the controller to desktop code: add optional `onPhaseEnd?: (line: string) => void` to `ControllerDeps`, called in `complete()` with the line passed to `buddy.say`. Add a controller test asserting it's called with `line:focusEnd` after a focus completes.
- [ ] In desktop: on phase end → `isPermissionGranted()` → if not, `requestPermission()` → if granted, `sendNotification({ title: 'Desk Buddy', body: line })`.
- [ ] Verify with a 1-minute focus. Commit "phase-end notifications".

### Task 10: Build the app and run the manual checklist

- [ ] `npm test && npx tsc && npm run build` (web) — all pass.
- [ ] `npm run tauri build` → `src-tauri/target/release/bundle/macos/Desk Buddy.app`.
- [ ] Launch the built app and run the spec's manual checklist with the user, item by item.
- [ ] Commit any fixes; summarize results honestly (what passed, what couldn't be checked).
