import '../fonts';
import '../styles.css';
import '../buddy/buddy.css';
import '../themes.css';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { applyAppearance } from '../appearance';
import { Chime } from '../chime';
import {
  loadAppearance, loadBuddyColor, loadSettings, loadSound, safeLocalStorage,
  saveAppearance, saveBuddyColor, saveSettings, saveSound,
} from '../storage';
import { createSettingsPanel, type Prefs } from '../ui/settings-panel';
import { isDesktop } from './detect';

// The settings page only works inside the desktop app; in a browser, go to the app itself.
if (!isDesktop()) location.replace('./');

// Entry point for the desktop settings window. Saving writes to shared storage;
// the floating buddy's window hears the change and applies it.
const store = safeLocalStorage();
const prefs: Prefs = { color: loadBuddyColor(store), appearance: loadAppearance(store), sound: loadSound(store) };
const showLook = (p: Prefs) => {
  document.documentElement.dataset.color = p.color;
  applyAppearance(p.appearance);
};
showLook(prefs);
const chime = new Chime(false, prefs.sound);

const panel = createSettingsPanel({
  page: true,
  getSettings: () => loadSettings(store),
  getPrefs: () => prefs,
  onSave: (s, p) => {
    saveSettings(store, s);
    saveBuddyColor(store, p.color);
    saveAppearance(store, p.appearance);
    saveSound(store, p.sound);
  },
  onPreviewSound: (sound) => chime.preview(sound),
  onPreviewLook: showLook,
  onClose: () => void getCurrentWindow().close(),
});
document.body.append(panel.element);
panel.open();
