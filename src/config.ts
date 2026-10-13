export type PhaseKind = 'focus' | 'shortBreak' | 'longBreak';

export interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
}

export type Durations = Record<PhaseKind, number>;

export const MINUTE = 60_000;

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
};

export const SETTING_LIMITS: Record<keyof Settings, { min: number; max: number }> = {
  focusMin: { min: 1, max: 90 },
  shortBreakMin: { min: 1, max: 30 },
  longBreakMin: { min: 1, max: 60 },
  longBreakEvery: { min: 2, max: 8 },
};

export function durationsFromSettings(s: Settings): Durations {
  return {
    focus: s.focusMin * MINUTE,
    shortBreak: s.shortBreakMin * MINUTE,
    longBreak: s.longBreakMin * MINUTE,
  };
}

export const DEMO_DURATIONS: Durations = { focus: 10_000, shortBreak: 5_000, longBreak: 8_000 };
export const DOZE_MS = 10 * MINUTE;
export const DEMO_DOZE_MS = 60_000;
export const WAVE_MS = 5_000;
export const BUBBLE_HOLD_MS = 3_500;

export const PHASE_LABELS: Record<PhaseKind, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};
