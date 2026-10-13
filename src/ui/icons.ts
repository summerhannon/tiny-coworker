const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const SETTINGS_ICON = svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>');

/** Shows sound waves normally and an × when the button is aria-pressed (muted). */
export const SOUND_ICON = svg(
  '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="snd-wave" d="M16.5 8.5a5 5 0 0 1 0 7"/><path class="snd-x" d="M17 9.5l5 5M22 9.5l-5 5"/>',
);
