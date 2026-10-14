import './desktop.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { availableMonitors, getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import type { Chime } from '../chime';
import { saveMuted, type StorageLike } from '../storage';
import type { Timer } from '../timer';
import { restorePosition } from './placement';
import {
  loadDesktopPrefs, loadWindowPosition, saveDesktopPrefs, saveWindowPosition, type DesktopPrefs,
} from './prefs';
import { onStoredSettingsChange } from './sync';
import { createTray } from './tray';

export interface DesktopContext {
  timer: Timer;
  chime: Chime;
  store: StorageLike;
  toggle(): void;
  onPhaseEnd(listener: (line: string) => void): void;
  /** Re-read a group of settings from storage and apply it (after the settings window saves). */
  reload: { settings(): void; look(): void; sound(): void };
}

export async function startDesktop(ctx: DesktopContext): Promise<void> {
  const win = getCurrentWindow();
  let prefs = loadDesktopPrefs(ctx.store);

  const apply = async (p: DesktopPrefs) => {
    await invoke('set_dock_visible', { visible: p.showInDock });
    await win.setIgnoreCursorEvents(p.clickThrough);
    if (p.showBuddy) await win.show();
    else await win.hide();
  };
  const update = (change: Partial<DesktopPrefs>) => {
    prefs = { ...prefs, ...change };
    saveDesktopPrefs(ctx.store, prefs);
    warnOnError(apply(prefs));
    tray.refresh();
  };

  // The menu bar item comes first: it's the way back if anything else goes wrong.
  const tray = await createTray({
    timer: ctx.timer,
    toggle: ctx.toggle,
    prefs: () => prefs,
    muted: () => ctx.chime.muted,
    setPref: update,
    toggleMute: () => {
      ctx.chime.muted = !ctx.chime.muted;
      saveMuted(ctx.store, ctx.chime.muted);
    },
  });

  enableDragging(() => warnOnError(win.startDragging()));
  await placeWindow(ctx.store);
  warnOnError(win.onMoved(debounce(({ payload }) => saveWindowPosition(ctx.store, payload), 300)));
  await apply(prefs); // the window starts hidden; this shows it (unless "Show buddy" is off)

  // Clicking the Dock icon re-shows a hidden buddy (handled natively); keep the menu in step.
  warnOnError(listen('buddy-shown', () => {
    if (!prefs.showBuddy) update({ showBuddy: true });
  }));

  // The settings window saves to shared storage; pick its changes up here.
  window.addEventListener('storage', (e) =>
    onStoredSettingsChange(e, {
      settings: ctx.reload.settings,
      look: ctx.reload.look,
      sound: ctx.reload.sound,
      desktop: () => {
        prefs = loadDesktopPrefs(ctx.store);
        warnOnError(apply(prefs));
        tray.refresh();
      },
    }),
  );

  ctx.onPhaseEnd((line) => warnOnError(notify(line)));
}

/**
 * Last resort if startup fails: make sure the app can still be reached and quit
 * (visible window, Dock icon, clicks not passing through).
 */
export async function recoverDesktop(error: unknown): Promise<void> {
  console.error('Tiny Coworker desktop startup failed', error);
  const win = getCurrentWindow();
  await Promise.allSettled([
    invoke('set_dock_visible', { visible: true }),
    win.setIgnoreCursorEvents(false),
    win.show(),
  ]);
}

/** Fire-and-forget Tauri calls: log failures instead of leaving unhandled rejections. */
function warnOnError(p: Promise<unknown>): void {
  p.catch((e) => console.warn('Tiny Coworker:', e));
}

/** Drag the window by the buddy or the time; buttons and inputs keep working. */
function enableDragging(start: () => void): void {
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a')) return;
    if (target.closest('.buddy-slot, .readout')) start();
  });
}

/** Reopen where the buddy was left, unless that spot is no longer on a screen. */
async function placeWindow(store: StorageLike): Promise<void> {
  const win = getCurrentWindow();
  try {
    const size = await win.outerSize();
    const monitors = (await availableMonitors()).map((m) => ({
      x: m.position.x, y: m.position.y, width: m.size.width, height: m.size.height,
    }));
    const pos = restorePosition(loadWindowPosition(store), monitors, size);
    if (pos) {
      await win.setPosition(new PhysicalPosition(pos.x, pos.y));
      return;
    }
  } catch (e) {
    console.warn('Tiny Coworker: could not restore the window position', e);
  }
  await win.center();
}

async function notify(body: string): Promise<void> {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === 'granted';
  if (granted) sendNotification({ title: 'Tiny Coworker', body });
}

function debounce<T>(fn: (arg: T) => void, ms: number): (arg: T) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (arg) => {
    clearTimeout(t);
    t = setTimeout(() => fn(arg), ms);
  };
}
