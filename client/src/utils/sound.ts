class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.14,
    delay = 0
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  click() {
    this.tone(520, 780, 0.06, 'triangle', 0.12);
  }

  intro() {
    this.tone(330, 330, 0.1, 'square', 0.12, 0);
    this.tone(440, 440, 0.1, 'square', 0.12, 0.1);
    this.tone(554, 554, 0.1, 'square', 0.12, 0.2);
    this.tone(659, 880, 0.25, 'sawtooth', 0.14, 0.3);
  }

  shoot() {
    this.tone(620, 180, 0.12, 'sawtooth', 0.1);
  }

  explosion() {
    this.tone(140, 35, 0.35, 'sawtooth', 0.22);
    this.tone(90, 28, 0.4, 'square', 0.16, 0.03);
  }

  whack() {
    this.tone(280, 90, 0.11, 'square', 0.18);
  }

  ko() {
    this.tone(520, 140, 0.28, 'sawtooth', 0.18);
    this.tone(880, 1200, 0.16, 'triangle', 0.14, 0.12);
  }

  bankrupt() {
    // Hilarious sad trombone wah-wah-waaaah!
    this.tone(311, 293, 0.22, 'sawtooth', 0.16, 0);
    this.tone(293, 277, 0.22, 'sawtooth', 0.16, 0.24);
    this.tone(277, 261, 0.22, 'sawtooth', 0.16, 0.48);
    this.tone(261, 180, 0.55, 'sawtooth', 0.18, 0.72);
  }

  pass() {
    this.tone(440, 880, 0.12, 'sine', 0.15);
  }

  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(f, f, 0.18, 'triangle', 0.16, i * 0.11);
    });
  }
}

export const sfx = new SoundEngine();
