import { invoke } from '@tauri-apps/api/core';
import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { Timer } from '../timer';
import type { DesktopPrefs } from './prefs';
import { toggleLabel, trayTitle } from './tray-labels';

export interface TrayDeps {
  timer: Timer;
  toggle(): void;
  prefs(): DesktopPrefs;
  muted(): boolean;
  setPref(change: Partial<DesktopPrefs>): void;
  toggleMute(): void;
}

/** The menu bar item: a buddy-face icon, the time, and every control. */
export async function createTray(d: TrayDeps): Promise<{ refresh(): void }> {
  const toggleItem = await MenuItem.new({ id: 'toggle', text: 'Start', action: () => d.toggle() });
  const showBuddy = await CheckMenuItem.new({
    id: 'show', text: 'Show buddy', checked: d.prefs().showBuddy,
    action: () => d.setPref({ showBuddy: !d.prefs().showBuddy }),
  });
  const clickThrough = await CheckMenuItem.new({
    id: 'click-through', text: 'Click-through', checked: d.prefs().clickThrough,
    action: () => d.setPref({ clickThrough: !d.prefs().clickThrough }),
  });
  const mute = await CheckMenuItem.new({
    id: 'mute', text: 'Mute chime', checked: d.muted(),
    action: () => {
      d.toggleMute();
      void mute.setChecked(d.muted());
    },
  });
  const dock = await CheckMenuItem.new({
    id: 'dock', text: 'Show in Dock', checked: d.prefs().showInDock,
    action: () => d.setPref({ showInDock: !d.prefs().showInDock }),
  });
  const separator = () => PredefinedMenuItem.new({ item: 'Separator' });

  const menu = await Menu.new({
    items: [
      toggleItem,
      await MenuItem.new({ id: 'skip', text: 'Skip', action: () => d.timer.skip() }),
      await MenuItem.new({ id: 'reset', text: 'Reset', action: () => d.timer.reset() }),
      await separator(),
      showBuddy,
      clickThrough,
      mute,
      dock,
      await separator(),
      await MenuItem.new({ id: 'settings', text: 'Settings…', action: () => void openSettingsWindow() }),
      await MenuItem.new({ id: 'quit', text: 'Quit Desk Buddy', action: () => void invoke('quit_app') }),
    ],
  });

  // A dev reload re-runs this; remove the previous item instead of stacking a second one.
  await (await TrayIcon.getById('desk-buddy'))?.close();
  const tray = await TrayIcon.new({
    id: 'desk-buddy',
    icon: await trayIconPng(),
    iconAsTemplate: true,
    tooltip: 'Desk Buddy',
    menu,
    menuOnLeftClick: true,
  });

  // Keep the time and the Start/Pause/Resume label current.
  let lastTitle: string | null = null;
  let lastToggle = '';
  setInterval(() => {
    const snap = d.timer.snapshot();
    const title = trayTitle(snap);
    if (title !== lastTitle) tray.setTitle((lastTitle = title) || null).catch(console.warn);
    const label = toggleLabel(snap.status);
    if (label !== lastToggle) toggleItem.setText((lastToggle = label)).catch(console.warn);
  }, 500);

  return {
    refresh() {
      const p = d.prefs();
      void showBuddy.setChecked(p.showBuddy);
      void clickThrough.setChecked(p.clickThrough);
      void dock.setChecked(p.showInDock);
      void mute.setChecked(d.muted());
    },
  };
}

/** Opens the settings window, or brings it forward if it's already open. */
export async function openSettingsWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel('settings');
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }
  new WebviewWindow('settings', {
    url: 'settings.html',
    title: 'Desk Buddy Settings',
    width: 400,
    height: 540,
    center: true,
    resizable: false,
  });
}

/**
 * A black buddy-face silhouette with see-through eyes and smile, drawn at 2x for Retina.
 * Used as a template image, so macOS tints it to match the menu bar.
 */
async function trayIconPng(): Promise<Uint8Array> {
  const size = 36;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#000';
  g.beginPath();
  g.roundRect(7, 3, 22, 31, 11);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (const x of [14, 22]) {
    g.beginPath();
    g.ellipse(x, 16, 2.1, 2.8, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(18, 21, 3, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the menu bar icon'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}
