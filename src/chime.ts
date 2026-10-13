/** Soft two-note chime, synthesized so there's no audio file to load. */
export class Chime {
  private ctx?: AudioContext;

  constructor(public muted: boolean) {}

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

  play(): void {
    const ctx = this.ctx;
    if (this.muted || !ctx) return;
    const t = ctx.currentTime;
    for (const [freq, delay] of [[660, 0], [880, 0.18]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 1);
    }
  }
}
