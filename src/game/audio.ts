export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private cityGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  private initialized = false;
  private muted = false;
  private volume = 0.65;
  private lastFootstepTime = 0;

  public init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      // Engine multi-oscillator synth
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineFilter.Q.value = 2.2;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 55;

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.value = 110;

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();

      // White noise buffer for tire screech, rain & city wind ambience
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // Tire screech loop
      const tireNoise = this.ctx.createBufferSource();
      tireNoise.buffer = noiseBuffer;
      tireNoise.loop = true;

      this.tireFilter = this.ctx.createBiquadFilter();
      this.tireFilter.type = 'bandpass';
      this.tireFilter.frequency.value = 1350;
      this.tireFilter.Q.value = 5.5;

      this.tireGain = this.ctx.createGain();
      this.tireGain.gain.value = 0;

      tireNoise.connect(this.tireFilter);
      this.tireFilter.connect(this.tireGain);
      this.tireGain.connect(this.masterGain);
      tireNoise.start();

      // Rain ambience loop
      const rainNoise = this.ctx.createBufferSource();
      rainNoise.buffer = noiseBuffer;
      rainNoise.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1600;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;

      rainNoise.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      rainNoise.start();

      // Subtle urban ambience loop
      const cityNoise = this.ctx.createBufferSource();
      cityNoise.buffer = noiseBuffer;
      cityNoise.loop = true;
      const cityFilter = this.ctx.createBiquadFilter();
      cityFilter.type = 'lowpass';
      cityFilter.frequency.value = 260;
      this.cityGain = this.ctx.createGain();
      this.cityGain.gain.value = 0.015;
      cityNoise.connect(cityFilter);
      cityFilter.connect(this.cityGain);
      this.cityGain.connect(this.masterGain);
      cityNoise.start();

      // Police pursuit siren loop
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 680;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      this.initialized = true;
    } catch {
      // AudioContext blocked or unavailable
    }
  }

  public setVolume(vol: number, muted: boolean) {
    this.volume = vol;
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : vol, this.ctx.currentTime, 0.05);
    }
  }

  public updateDrivingAudio(
    inVehicle: boolean,
    rpm: number,
    throttle: number,
    pitchBase: number,
    engineType: 'i6' | 'v8' | 'i4',
    driftIntensity: number,
    isRaining: boolean,
    rainIntensity = 0.06,
    sirenActive = false,
    elapsed = 0,
  ) {
    if (
      !this.initialized ||
      !this.ctx ||
      !this.engineGain ||
      !this.engineOsc1 ||
      !this.engineOsc2 ||
      !this.engineFilter ||
      !this.tireGain ||
      !this.tireFilter ||
      !this.rainGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;

    if (inVehicle) {
      const rpmNorm = Math.max(0, Math.min(1, (rpm - 800) / 7200));
      const freq = pitchBase * (0.75 + rpmNorm * 2.6);
      const subHarmonic = engineType === 'v8' ? 0.5 : engineType === 'i6' ? 1.5 : 2.0;

      this.engineOsc1.frequency.setTargetAtTime(freq, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(freq * subHarmonic, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(220 + rpmNorm * 1450 + throttle * 450, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.08 + throttle * 0.09 + rpmNorm * 0.06, now, 0.05);

      const screech = Math.max(0, Math.min(1, driftIntensity));
      this.tireGain.gain.setTargetAtTime(screech * 0.14, now, 0.04);
      this.tireFilter.frequency.setTargetAtTime(1100 + screech * 650, now, 0.05);
    } else {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.tireGain.gain.setTargetAtTime(0, now, 0.05);
    }

    this.rainGain.gain.setTargetAtTime(isRaining ? rainIntensity : 0, now, 0.3);

    if (this.sirenOsc && this.sirenGain) {
      if (sirenActive) {
        const wail = 660 + Math.sin(elapsed * 5.2) * 240;
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
        this.sirenGain.gain.setTargetAtTime(0.045, now, 0.1);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.12);
      }
    }
  }

  public playGearShift(hasTurbo = false) {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = hasTurbo ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(hasTurbo ? 1800 : 190, t);
    osc.frequency.exponentialRampToValueAtTime(hasTurbo ? 750 : 95, t + 0.09);
    gain.gain.setValueAtTime(hasTurbo ? 0.05 : 0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  public playDoorLatch() {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playThunder() {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(82, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.6);
  }

  public playFootstep(sprinting: boolean) {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = performance.now();
    const interval = sprinting ? 290 : 440;
    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.07);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playHorn() {
    this.init();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = 392;
    osc2.frequency.value = 493.88;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
    gain.gain.setValueAtTime(0.14, t + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.33);
    osc2.stop(t + 0.33);
  }

  public playIgnition() {
    this.init();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, t);
    osc.frequency.linearRampToValueAtTime(130, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.45);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playImpact(strength = 1) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);
    gain.gain.setValueAtTime(Math.min(0.3, 0.12 * strength), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playChime(freq = 660) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.14);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public dispose() {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.sirenOsc?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.initialized = false;
  }
}
