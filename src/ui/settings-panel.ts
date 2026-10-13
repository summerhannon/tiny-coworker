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
