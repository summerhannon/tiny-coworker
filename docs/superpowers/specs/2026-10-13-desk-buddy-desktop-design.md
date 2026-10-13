# Desk Buddy Desktop — Design Spec

**Date:** 2026-10-13
**Status:** Draft for review
**Builds on:** `2026-10-13-desk-buddy-design.md` (Phase 1, web app — merged to `main`)

## Summary

Package Desk Buddy as a macOS desktop app with Tauri. The buddy floats in a small transparent, always-on-top window on the desktop; a menu bar item shows the time and holds the controls. The web app stays unchanged and keeps working in the browser (portfolio gallery); desktop behavior switches on only when running inside Tauri.

## Goals

- A buddy that lives on the desktop all day without getting in the way.
- Light on memory and battery (Tauri uses the system WebKit view).
- One codebase: the same timer, buddy, controller and settings logic as the web app.

## Out of scope

- Code signing and notarization for public distribution (local builds run on the developer's Mac; others would see a Gatekeeper warning).
- Windows and Linux builds.
- Launch at login and global keyboard shortcuts (considered, not chosen for this version).
- The Rive buddy (separate future phase).

## Tech

- Tauri 2 (Rust shell + system WebKit), configured in `src-tauri/`.
- Rust toolchain installed once by the user via the official `rustup` installer (the assistant does not install toolchains).
- New npm dependencies: `@tauri-apps/cli` (dev), `@tauri-apps/api`, `@tauri-apps/plugin-notification`. Rust crates: `tauri`, `tauri-plugin-notification`, plus whatever `tauri init` scaffolds.
- Commands: `npm run tauri dev` (run), `npm run tauri build` (produce `Desk Buddy.app`).
- The browser build (`npm run build`) must not change behavior or require Tauri.

## Desktop detection

A single helper, `isDesktop()`, reports whether the app runs inside Tauri. When true, `main.ts` sets `data-desktop` on `<html>` and starts the desktop modules. All desktop-only code lives in `src/desktop/` and is loaded only when `isDesktop()` is true (dynamic import), so the web bundle never executes it.

## The floating buddy window

- Window `main`: about 260×220, `transparent`, no decorations, no shadow, `alwaysOnTop`, not resizable.
- Page background is transparent in desktop mode; only the buddy, its speech bubble, the phase label and the time are visible. The phase label and time get a soft halo (text shadow in the page background color) so they stay readable on any wallpaper.
- Start/Pause, Skip and Reset fade in when the pointer is over the window (existing compact-layout hover behavior). The settings and mute icons are hidden in the window — Settings… and Mute chime live in the menu bar.
- Dragging anywhere on the buddy moves the window (`data-tauri-drag-region`); buttons stay clickable.
- The window position is saved when it moves and restored at launch (stored with the other settings). If the saved position is off-screen (e.g. a monitor was unplugged), the window opens centered instead.
- Speech bubbles must fit inside the window (no clipping at the top).

## Menu bar item

- A monochrome template icon of the buddy face plus a title showing the time during a running or paused phase (e.g. `18:42`), and no title when ready.
- Menu:
  - **Start / Pause / Resume** (label follows the timer state)
  - **Skip**
  - **Reset**
  - separator
  - **Show buddy** (checkmark) — hides/shows the floating window
  - **Click-through** (checkmark)
  - **Mute chime** (checkmark)
  - **Show in Dock** (checkmark)
  - separator
  - **Settings…**
  - **Quit Desk Buddy**

## Click-through

- Off by default. When on, the floating window ignores all mouse events (clicks and hover pass to whatever is behind it). The buddy is purely visual; controls are in the menu bar.
- Toggled from the menu bar; the choice is remembered.

## Dock

- **Show in Dock** is on by default and remembered. When off, the app runs as a menu-bar-only utility (not in the Dock or ⌘-Tab).
- Clicking the Dock icon shows the buddy if it was hidden.

## Settings window

- **Settings…** opens a separate, normal (decorated) window titled "Desk Buddy Settings", about 400×520, centered. Opening it again focuses the existing one.
- It shows the same settings panel as the web app (timer lengths, buddy color, appearance, sound) as page content rather than a modal dialog. Save applies and closes the window; Cancel closes without saving.
- Live preview of color and appearance applies to the settings window itself (its mini buddy), and to the floating buddy only after Save.
- Both windows share storage. After Save, the floating window picks up the new values without a restart (it listens for storage changes and reapplies settings, look and sound).

## Notifications

- When a phase ends, the desktop app posts a macOS notification: title "Desk Buddy", body = the buddy's bubble line for that moment (e.g. "Nice focus. Break time.").
- Permission is requested the first time a notification is about to be sent. If denied, nothing breaks; the chime and wave still happen.
- Muting the chime does not mute notifications (they're the system's to manage).

## Assets

- **App icon:** generated from `assets/app-icon.svg` with `tauri icon` into `src-tauri/icons/`.
- **Menu bar icon:** a new monochrome `assets/tray-icon.svg` (buddy face silhouette with eye cut-outs) rendered to PNG at 1x/2x and used as a template image.
- **Inter font:** bundled locally (woff2 under `src/fonts/`, `@font-face` in CSS) instead of loading from Google Fonts, so the desktop app works offline. The web build uses the same local font.

## Accessibility

- Menu bar items have clear labels; checkmark items reflect state.
- The floating window keeps its existing keyboard access when focused (Space toggles, Tab reaches controls).
- Notifications carry the same text as the speech bubble and the live region.

## Testing

**Automated (Vitest):**
- `isDesktop()` true/false detection.
- Window position: saving, restoring, and falling back to centered when off-screen (pure function over screen bounds).
- Tray title and menu labels derived from timer state (pure functions).
- Storage round-trips for click-through, show in Dock, and window position.
- Settings sync: a storage change event reapplies settings in the main window (logic extracted into a testable function).
- Existing 68 tests keep passing; the web build is unchanged.

**Manual checklist (run together with the user, since the desktop window can't be clicked from automation):**
transparent window over wallpaper; drag and reopen in the same spot; hover controls; menu bar time updates; every menu item; click-through on/off; Show in Dock on/off and Dock click re-shows the buddy; Settings window save/cancel and live update of the buddy; notification on phase end (and graceful denial); offline font; app icon in Dock and Finder; `npm run tauri build` produces a launchable `.app`.
