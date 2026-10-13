import type { Moment } from './messages';

export const BREAK_ACTIVITIES = ['coffee', 'music', 'meditate', 'stretch'] as const;
export type BreakActivity = (typeof BREAK_ACTIVITIES)[number];

/** The speech-bubble moment that announces each activity. */
export const ACTIVITY_MOMENTS: Record<BreakActivity, Moment> = {
  coffee: 'coffeeBreak',
  music: 'musicBreak',
  meditate: 'meditateBreak',
  stretch: 'stretchBreak',
};

/** Picks a random break activity, never the same one twice in a row. */
export function createActivityPicker(random: () => number = Math.random): () => BreakActivity {
  let last: BreakActivity | undefined;
  return () => {
    const options = BREAK_ACTIVITIES.filter((a) => a !== last);
    last = options[Math.floor(random() * options.length)];
    return last;
  };
}
