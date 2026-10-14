import { STORAGE_KEYS } from '../storage';
import { DESKTOP_KEYS } from './prefs';

export interface SyncHandlers {
  settings(): void;
  look(): void;
  sound(): void;
  desktop(): void;
}

/**
 * Called for `storage` events, which fire in the floating window when the settings window saves.
 * Reapplies only what changed; a null key means storage was cleared, so everything is reapplied.
 */
export function onStoredSettingsChange(e: { key: string | null }, h: SyncHandlers): void {
  switch (e.key) {
    case null:
      h.settings(); h.look(); h.sound(); h.desktop();
      break;
    case STORAGE_KEYS.settings:
      h.settings();
      break;
    case STORAGE_KEYS.color:
    case STORAGE_KEYS.appearance:
      h.look();
      break;
    case STORAGE_KEYS.sound:
      h.sound();
      break;
    case DESKTOP_KEYS.prefs:
      h.desktop();
      break;
  }
}
