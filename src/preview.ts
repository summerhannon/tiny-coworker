import './fonts';
import './styles.css';
import './buddy/buddy.css';
import './themes.css';
import { SvgBuddy } from './buddy/svg-buddy';
import { BREAK_ACTIVITIES } from './activities';
import { applyAppearance } from './appearance';
import type { BuddyState } from './buddy/types';

applyAppearance('auto');
const buddy = new SvgBuddy();
const controls = document.createElement('div');
controls.className = 'controls';
let paused = false;

const states: BuddyState[] = ['idle', 'working', 'break', 'wave', 'sleeping'];
const actions: [string, () => void][] = [
  ...states.map((s): [string, () => void] => [s, () => buddy.setState(s)]),
  ...BREAK_ACTIVITIES.map((a): [string, () => void] => [`break: ${a}`, () => buddy.setState('break', { activity: a })]),
  ['big wave', () => buddy.setState('wave', { big: true })],
  ['toggle paused', () => buddy.setPaused((paused = !paused))],
  ['say', () => buddy.say('Nice work, take five.')],
];
for (const [label, run] of actions) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', run);
  controls.append(b);
}
document.getElementById('app')!.append(buddy.element, controls);
