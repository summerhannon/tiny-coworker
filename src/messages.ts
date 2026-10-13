export type Moment = 'focusStart' | 'focusEnd' | 'breakEnd' | 'breakStart' | 'milestone';

/** Placeholder copy — the designer will rewrite these in their own voice. */
export const LINES: Record<Moment, string[]> = {
  focusStart: ["Let's do this.", 'One thing at a time.', "I'll be right here."],
  focusEnd: ["Time's up! Coffee?", 'Nice focus. Break time.'],
  breakEnd: ["Break's over. Ready?", 'Feeling fresh?'],
  breakStart: ['Nice work, take five.', 'Stretch those legs.'],
  milestone: ['Four down! Long break earned.', 'Look at you go.'],
};

export function createPicker(
  lines: Record<Moment, string[]> = LINES,
  random: () => number = Math.random,
): (m: Moment) => string {
  const last = new Map<Moment, string>();
  return (m) => {
    const pool = lines[m];
    const options = pool.length > 1 ? pool.filter((l) => l !== last.get(m)) : pool;
    const line = options[Math.floor(random() * options.length)];
    last.set(m, line);
    return line;
  };
}
