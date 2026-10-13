import type { SoundName } from './config';

interface Tone {
  freq: number;
  /** Optional end frequency for a pitch glide. */
  to?: number;
  delay: number;
  decay: number;
  gain: number;
  type?: OscillatorType;
}

/** Each sound is a few synthesized tones, so there are no audio files to load. */
const SOUNDS: Record<SoundName, Tone[]> = {
  // two rising notes
  chime: [
    { freq: 660, delay: 0, decay: 0.9, gain: 0.2 },
    { freq: 880, delay: 0.18, decay: 0.9, gain: 0.2 },
  ],
  // one warm ring with soft overtones and a long fade
  bell: [
    { freq: 784, delay: 0, decay: 2.2, gain: 0.18 },
    { freq: 1568, delay: 0, decay: 1.4, gain: 0.06 },
    { freq: 2360, delay: 0, decay: 0.8, gain: 0.03 },
  ],
  // quick wooden "ba-dum"
  marimba: [
    { freq: 523, delay: 0, decay: 0.35, gain: 0.25, type: 'triangle' },
    { freq: 2092, delay: 0, decay: 0.08, gain: 0.05 },
    { freq: 784, delay: 0.14, decay: 0.45, gain: 0.25, type: 'triangle' },
    { freq: 3136, delay: 0.14, decay: 0.08, gain: 0.05 },
  ],
  // two playful upward pops
  bubble: [
    { freq: 320, to: 900, delay: 0, decay: 0.16, gain: 0.22 },
    { freq: 420, to: 1150, delay: 0.17, decay: 0.18, gain: 0.22 },
  ],
};

export class Chime {
  private ctx?: AudioContext;

  constructor(
    public muted: boolean,
    public sound: SoundName = 'chime',
  ) {}

  /** Browsers only allow audio after a user gesture; call this from a click or key handler. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Plays the chosen sound when a phase ends (silent when muted). */
  play(): void {
    if (!this.muted) this.playSound(this.sound);
  }

  /** Plays any sound on request (from the settings preview), even when muted. */
  preview(sound: SoundName): void {
    this.unlock();
    this.playSound(sound);
  }

  private playSound(sound: SoundName): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const tone of SOUNDS[sound]) {
      const start = t + tone.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.decay * 0.6);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.decay);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + tone.decay + 0.05);
    }
  }
}
