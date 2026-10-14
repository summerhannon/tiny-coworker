import {
  APPEARANCES, APPEARANCE_LABELS, BUDDY_COLORS, BUDDY_COLOR_LABELS, SETTING_LIMITS, SOUNDS, SOUND_LABELS,
  type Appearance, type BuddyColor, type Settings, type SoundName,
} from '../config';
import { validateSettings } from '../storage';
import { BUDDY_SVG } from '../buddy/buddy-markup';
import { PLAY_ICON } from './icons';

const FIELDS: { key: keyof Settings; label: string; unit: string }[] = [
  { key: 'focusMin', label: 'Focus length', unit: 'min' },
  { key: 'shortBreakMin', label: 'Short break', unit: 'min' },
  { key: 'longBreakMin', label: 'Long break', unit: 'min' },
  { key: 'longBreakEvery', label: 'Long break every', unit: 'sessions' },
];

/** Look-and-sound choices, saved together with the timer settings. */
export interface Prefs {
  color: BuddyColor;
  appearance: Appearance;
  sound: SoundName;
}

export interface SettingsPanelOptions {
  getSettings(): Settings;
  getPrefs(): Prefs;
  onSave(s: Settings, prefs: Prefs): void;
  onPreviewSound(sound: SoundName): void;
  /** Shows look choices live while choosing; called with the saved prefs again on cancel. */
  onPreviewLook(prefs: Prefs): void;
  /** Page mode (desktop settings window): the panel fills the page instead of opening as a modal. */
  page?: boolean;
  /** Called after Save or Cancel closes the panel. */
  onClose?(): void;
}

const radios = <T extends string>(name: string, values: readonly T[], labels: Record<T, string>, cls: string) =>
  values.map((v) => `
    <label class="${cls}" data-${cls}="${v}" title="${labels[v]}">
      <input type="radio" name="${name}" value="${v}" />
      <span class="${cls === 'swatch' ? 'sr-only' : 'segment-label'}">${labels[v]}</span>
    </label>`).join('');

export function createSettingsPanel(o: SettingsPanelOptions) {
  const dialog = document.createElement('dialog');
  dialog.className = o.page ? 'settings settings--page' : 'settings';
  dialog.setAttribute('aria-labelledby', 'settings-title');
  dialog.innerHTML = `
    <form novalidate>
      <h2 id="settings-title">Settings</h2>

      <h3 class="settings-section">Timer</h3>
      <p class="hint">If a timer is running, new lengths start with the next session.</p>
      <div class="field-grid">
        ${FIELDS.map(({ key, label, unit }) => `
          <div class="field">
            <label class="field-label" for="f-${key}">${label}</label>
            <span class="field-input">
              <input type="number" id="f-${key}" name="${key}" min="${SETTING_LIMITS[key].min}"
                max="${SETTING_LIMITS[key].max}" step="1" inputmode="numeric" aria-describedby="err-${key}" />
              <span class="unit">${unit}</span>
            </span>
            <span class="field-error" id="err-${key}"></span>
          </div>`).join('')}
      </div>

      <hr class="settings-divider" />
      <div class="settings-section-row">
        <h3 class="settings-section">Look and sound</h3>
        <span class="swatch-preview" aria-hidden="true">${BUDDY_SVG}</span>
      </div>
      <fieldset class="field">
        <legend class="field-label">Buddy color</legend>
        <span class="field-input swatch-row">${radios('color', BUDDY_COLORS, BUDDY_COLOR_LABELS, 'swatch')}</span>
      </fieldset>
      <fieldset class="field">
        <legend class="field-label">Appearance</legend>
        <span class="field-input segmented">${radios('appearance', APPEARANCES, APPEARANCE_LABELS, 'segment')}</span>
      </fieldset>
      <div class="field">
        <label class="field-label" for="f-sound">Sound</label>
        <span class="field-input">
          <select id="f-sound" name="sound">
            ${SOUNDS.map((s) => `<option value="${s}">${SOUND_LABELS[s]}</option>`).join('')}
          </select>
          <button type="button" class="icon-btn" data-action="preview" aria-label="Play sound">${PLAY_ICON}</button>
        </span>
      </div>

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
  const checked = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]:checked`)!.value;
  const soundSelect = form.querySelector<HTMLSelectElement>('[name="sound"]')!;
  const selectedPrefs = (): Prefs => ({
    color: checked('color') as BuddyColor,
    appearance: checked('appearance') as Appearance,
    sound: soundSelect.value as SoundName,
  });
  let saved = false;

  form.addEventListener('input', (e) => {
    const key = (e.target as HTMLInputElement).name as keyof Settings;
    if (!FIELDS.some((f) => f.key === key)) return;
    errorEl(key).textContent = '';
    input(key).removeAttribute('aria-invalid');
  });

  form.addEventListener('change', (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (name === 'color' || name === 'appearance') o.onPreviewLook(selectedPrefs());
  });
  // Escape, Cancel, or closing without saving puts the saved look back.
  dialog.addEventListener('close', () => {
    if (!saved) o.onPreviewLook(o.getPrefs());
    o.onClose?.();
  });

  dialog.querySelector('[data-action="cancel"]')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-action="preview"]')!
    .addEventListener('click', () => o.onPreviewSound(soundSelect.value as SoundName));

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
    saved = true;
    o.onSave(result.settings, selectedPrefs());
    dialog.close();
  });

  return {
    element: dialog,
    open(): void {
      const s = o.getSettings();
      const p = o.getPrefs();
      FIELDS.forEach(({ key }) => (input(key).value = String(s[key])));
      form.querySelector<HTMLInputElement>(`[name="color"][value="${p.color}"]`)!.checked = true;
      form.querySelector<HTMLInputElement>(`[name="appearance"][value="${p.appearance}"]`)!.checked = true;
      soundSelect.value = p.sound;
      saved = false;
      clearErrors();
      if (o.page) dialog.show();
      else dialog.showModal();
    },
  };
}
