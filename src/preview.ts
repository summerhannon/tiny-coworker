import './styles.css';
import './buddy/buddy.css';
import { SvgBuddy } from './buddy/svg-buddy';
import type { BuddyState } from './buddy/types';

const buddy = new SvgBuddy();
const controls = document.createElement('div');
controls.className = 'controls';
let paused = false;

const states: BuddyState[] = ['idle', 'working', 'break', 'wave', 'sleeping'];
const actions: [string, () => void][] = [
  ...states.map((s): [string, () => void] => [s, () => buddy.setState(s)]),
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
