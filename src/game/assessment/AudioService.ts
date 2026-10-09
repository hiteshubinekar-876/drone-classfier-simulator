export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private windOsc: OscillatorNode | null = null;
  private isMuted: boolean = false;

  init(masterVol = 0.8, ambientVol = 0.5, sfxVol = 0.9): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = masterVol;
      this.ambientGain.gain.value = ambientVol;
      this.sfxGain.gain.value = sfxVol;

      this.ambientGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[AudioService] Web Audio API init failed:', e);
    }
  }

  private ensureRunning(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTargetAcquired(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  playClassificationSubmit(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, this.ctx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  playZoomClick(isZoomIn: boolean): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = isZoomIn ? 1200 : 700;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  playWarningBeep(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {}
  }

  startAmbientWind(): void {
    if (!this.ctx || !this.ambientGain || this.windOsc || this.isMuted) return;
    this.ensureRunning();

    try {
      this.windOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;

      this.windOsc.type = 'sawtooth';
      this.windOsc.frequency.value = 55; // Low air rumble

      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;

      this.windOsc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      this.windOsc.start();
    } catch {}
  }

  stopAmbientWind(): void {
    if (this.windOsc) {
      try {
        this.windOsc.stop();
        this.windOsc.disconnect();
      } catch {}
      this.windOsc = null;
    }
  }

  setVolumes(master: number, ambient: number, sfx: number): void {
    if (this.masterGain) this.masterGain.gain.value = master;
    if (this.ambientGain) this.ambientGain.gain.value = ambient;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.value = muted ? 0 : 0.8;
    }
  }
}

export const audio = new AudioService();
