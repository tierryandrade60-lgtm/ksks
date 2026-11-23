import {
  AudioCooldownManager,
  VocalizationKind,
  VoiceGender,
} from './characterAudioLibrary';
import {
  CharacterSelectionVoicePlayer,
  VocalizationSynth,
} from './voiceSystem';

type AudioContextCtor = typeof AudioContext;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private masterVolumeNorm = 0.75;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientStarted = false;
  private disposed = false;

  private flightGain: GainNode | null = null;
  private flightOscA: OscillatorNode | null = null;
  private flightOscB: OscillatorNode | null = null;
  private flightLfo: OscillatorNode | null = null;
  private flightActive = false;

  private painGain: GainNode | null = null;
  private painOscA: OscillatorNode | null = null;
  private painOscB: OscillatorNode | null = null;
  private painLfo: OscillatorNode | null = null;
  private painActive = false;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  private readonly cooldowns = new AudioCooldownManager();
  private readonly selectionVoice = new CharacterSelectionVoicePlayer();
  private readonly vocalSynth = new VocalizationSynth();

  public setMasterVolume(percent0to100: number): void {
    const norm = Math.min(1, Math.max(0, percent0to100 / 100));
    this.masterVolumeNorm = norm;
    this.selectionVoice.setVolume(norm);
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(norm * 0.85, now, 0.025);
    }
  }

  public unlock(): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // Browser may still require another direct gesture
      });
    }

    if (!this.ambientStarted) {
      this.startAmbientWind(ctx);
    }
  }

  /**
   * Selection-screen ONLY spoken voice line.
   * Never call during gameplay or combat.
   */
  public playSelectionVoice(characterId: string, skinId?: string | null): void {
    if (this.disposed) return;
    this.selectionVoice.playSelectionLine(characterId, skinId);
  }

  public stopSelectionVoice(): void {
    this.selectionVoice.stop();
  }

  /**
   * Gameplay-only nonverbal vocalizations (pain grunts, heavy gasps, effort exhales).
   */
  public playVocalization(gender: VoiceGender, kind: VocalizationKind): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const noise = this.getWhiteNoiseBuffer(ctx);
    this.vocalSynth.trigger(ctx, this.getBusNode(), noise, gender, kind);
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = this.masterVolumeNorm * 0.85;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.14;

      limiter.connect(master);
      master.connect(ctx.destination);

      this.ctx = ctx;
      this.limiterNode = limiter;
      this.masterGain = master;
      return ctx;
    } catch {
      return null;
    }
  }

  private getBusNode(): AudioNode {
    return this.limiterNode ?? this.masterGain!;
  }

  private jitter(base: number, spread = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * spread);
  }

  private pickVariant(key: string, count: number): number {
    return this.cooldowns.pickVariant(key, count);
  }

  private canPlaySfx(key: string, minCooldownMs: number): boolean {
    return this.cooldowns.canPlay(`sfx:${key}`, minCooldownMs);
  }

  private startAmbientWind(ctx: AudioContext): void {
    if (!this.masterGain || this.ambientStarted) return;
    this.ambientStarted = true;

    const durationSec = 4;
    const sampleCount = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    for (let i = 0; i < sampleCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      b3 = 0.85 * b3 + white * 0.07;
      data[i] = (b0 + b1 + b2 + b3) * 0.25;
    }

    const fadeLen = Math.min(2048, Math.floor(sampleCount / 8));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const tailIdx = sampleCount - fadeLen + i;
      const mixed = data[i] * t + data[tailIdx] * (1 - t);
      data[i] = mixed;
      data[tailIdx] = mixed;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 340;
    lowpass.Q.value = 0.7;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 95;
    highpass.Q.value = 0.5;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.026, now + 1.8);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.value = 110;
    lfo.connect(lfoFilterGain);
    lfoFilterGain.connect(lowpass.frequency);

    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    lfo.start(now);

    this.ambientSource = src;
    this.ambientLfo = lfo;
    this.ambientGain = gain;
  }

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.whiteNoiseBuffer;
    }
    const durationSec = 2.5;
    const count = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, count, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < count; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buf;
    return buf;
  }

  private playFilteredWhoosh(
    ctx: AudioContext,
    durationSec: number,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    q = 2.4,
    startDelay = 0,
  ): void {
    const dest = this.getBusNode();
    if (!dest) return;
    const buf = this.getWhiteNoiseBuffer(ctx);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;

    const now = ctx.currentTime + startDelay;
    filter.frequency.setValueAtTime(Math.max(40, startFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + durationSec * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    const offset = Math.random() * Math.max(0.1, buf.duration - 0.1);
    src.start(now, offset, durationSec + 0.02);
  }

  private playToneLayer(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    durationSec: number,
    peakGain: number,
    startDelay = 0,
    attackFrac = 0.08,
  ): void {
    const dest = this.getBusNode();
    if (!dest) return;
    const now = ctx.currentTime + startDelay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, startFreq), now);
    if (Math.abs(endFreq - startFreq) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + durationSec);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.max(0.004, durationSec * attackFrac));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + durationSec + 0.025);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('jump', 90)) return;

    const v = this.pickVariant('jump', 3);
    const basePitch = v === 0 ? 190 : v === 1 ? 210 : 178;
    const f0 = this.jitter(basePitch, 0.05);
    this.playFilteredWhoosh(ctx, 0.11, f0 * 2.2, f0 * 6.4, 0.032, 1.5);
    this.playToneLayer(ctx, 'sine', f0, f0 * 1.96, 0.115, 0.064, 0, 0.12);
    this.playToneLayer(ctx, 'triangle', f0 * 0.72, f0 * 1.25, 0.08, 0.028, 0, 0.12);
  }

  public playAbilityActivate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(410, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.055);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playAbilityToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (active) {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
      this.playFilteredWhoosh(ctx, 0.22, 420, 1450, 0.04, 1.8);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(270, now + 0.12);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(active ? 0.06 : 0.048, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSprintToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (active) {
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.065);
    } else {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.065);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(active ? 0.052 : 0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const notes = [440, 587.3, 740];
    notes.forEach((freq, i) => {
      const start = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.056, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  public playDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.25);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.072, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playRespawn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.062, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playRevival(isPhoenix: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // 1. Rising charge swell (0..0.38s)
    this.playFilteredWhoosh(ctx, 0.38, 280, 1750, 0.056, 2.0);
    const rise = ctx.createOscillator();
    const riseGain = ctx.createGain();
    rise.type = 'sine';
    rise.frequency.setValueAtTime(isPhoenix ? 261.63 : 220, now);
    rise.frequency.exponentialRampToValueAtTime(isPhoenix ? 587.33 : 493.88, now + 0.36);

    riseGain.gain.setValueAtTime(0.0001, now);
    riseGain.gain.linearRampToValueAtTime(0.056, now + 0.08);
    riseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.39);
    rise.connect(riseGain);
    riseGain.connect(this.masterGain);
    rise.start(now);
    rise.stop(now + 0.41);

    // 2. Synchronized rebirth eruption at +0.36s
    const burstAt = now + 0.36;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(195, burstAt);
    sub.frequency.exponentialRampToValueAtTime(52, burstAt + 0.38);

    subGain.gain.setValueAtTime(0.0001, burstAt);
    subGain.gain.linearRampToValueAtTime(0.095, burstAt + 0.018);
    subGain.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.42);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(burstAt);
    sub.stop(burstAt + 0.44);

    const chord = isPhoenix ? [523.25, 783.99, 1046.5] : [392, 587.33, 783.99];
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(chord[i], burstAt);
      g.gain.setValueAtTime(0.0001, burstAt);
      g.gain.linearRampToValueAtTime(0.038 - i * 0.007, burstAt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.48);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(burstAt);
      osc.stop(burstAt + 0.5);
    }
  }

  public setFlightAmbience(active: boolean): void {
    if (this.disposed || this.flightActive === active) return;
    this.flightActive = active;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (active && ctx.state === 'running') {
      if (!this.flightGain) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, now);
        filter.Q.value = 2.2;

        const oscA = ctx.createOscillator();
        oscA.type = 'sine';
        oscA.frequency.setValueAtTime(164.8, now);

        const oscB = ctx.createOscillator();
        oscB.type = 'triangle';
        oscB.frequency.setValueAtTime(247.2, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(2.6, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(90, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        oscA.connect(filter);
        oscB.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscA.start(now);
        oscB.start(now);
        lfo.start(now);

        this.flightGain = gain;
        this.flightOscA = oscA;
        this.flightOscB = oscB;
        this.flightLfo = lfo;
      }

      this.flightGain.gain.cancelScheduledValues(now);
      this.flightGain.gain.setValueAtTime(
        Math.max(0.0001, this.flightGain.gain.value),
        now,
      );
      this.flightGain.gain.linearRampToValueAtTime(0.024, now + 0.32);
    } else if (this.flightGain) {
      this.flightGain.gain.cancelScheduledValues(now);
      this.flightGain.gain.setValueAtTime(
        Math.max(0.0001, this.flightGain.gain.value),
        now,
      );
      this.flightGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }
  }

  public playChaosBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('chaos-bolt', 45)) return;

    const variant = this.pickVariant('chaos-bolt', 4);
    const pitches = [620, 675, 585, 650];
    const p = this.jitter(pitches[variant], 0.045);

    this.playFilteredWhoosh(ctx, 0.16, p * 3.1, p * 0.84, 0.048, 2.2);
    this.playToneLayer(ctx, 'sine', p, p * 0.42, 0.15, 0.056, 0, 0.08);
    this.playToneLayer(ctx, 'triangle', p * 1.56, p * 0.82, 0.095, 0.026, 0.004, 0.08);
  }

  public playTeleportStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(285, 0.06);
    this.playFilteredWhoosh(ctx, 0.42, p * 1.45, p * 7.6, 0.048, 2.0);
    this.playToneLayer(ctx, 'sine', p, p * 2.55, 0.42, 0.05, 0, 0.16);
    this.playToneLayer(ctx, 'triangle', p * 1.5, p * 3.1, 0.34, 0.024, 0.04, 0.2);
  }

  public playTeleportArrive(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(760, 0.06);
    this.playFilteredWhoosh(ctx, 0.21, p * 2.1, p * 0.48, 0.048, 1.9);
    this.playToneLayer(ctx, 'triangle', p, p * 0.44, 0.2, 0.054, 0, 0.06);
    this.playToneLayer(ctx, 'sine', p * 0.32, p * 0.14, 0.16, 0.042, 0, 0.06);
  }

  public playChaosImplosionCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(178, 0.06);
    this.playFilteredWhoosh(ctx, 0.23, p * 1.8, p * 7.2, 0.054, 2.5);
    this.playToneLayer(ctx, 'triangle', p, p * 2.05, 0.2, 0.058, 0, 0.12);
  }

  public playChaosImplosionAbsorb(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(190, 0.06);
    this.playFilteredWhoosh(ctx, 0.38, 1020, 220, 0.072, 1.7);
    this.playToneLayer(ctx, 'sine', p, 54, 0.36, 0.092, 0, 0.07);
    this.playToneLayer(ctx, 'triangle', p * 2.2, p * 1.1, 0.26, 0.038, 0, 0.08);
  }

  public playMagicHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('magic-hit', 42)) return;

    const v = this.pickVariant('magic-hit', 4);
    const highFreqs = [840, 910, 790, 960];
    const f = this.jitter(highFreqs[v], 0.05);
    this.playToneLayer(ctx, 'sine', f, f * 0.48, 0.068, 0.052, 0, 0.07);
    this.playToneLayer(ctx, 'triangle', f * 0.23, f * 0.11, 0.078, 0.042, 0, 0.08);
  }

  public playPhoenixWaveCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.28, 380, 1680, 0.052, 2.1);

    const freqs = [392, 587.33];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.48, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.044 : 0.024, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  public playPhoenixWaveExplosion(stepIdx = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const pitchScale = stepIdx === 2 ? 0.88 : 1 + stepIdx * 0.07;
    this.playFilteredWhoosh(ctx, 0.38, 760 * pitchScale, 175, 0.082, 1.5);
    this.playFilteredWhoosh(ctx, 0.24, 1850 * pitchScale, 720, 0.036, 2.8);

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(178 * pitchScale, now);
    boom.frequency.exponentialRampToValueAtTime(54, now + 0.3);

    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.linearRampToValueAtTime(0.088, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.35);

    // Radiant Phoenix harmonic flare
    const cry = ctx.createOscillator();
    const cryGain = ctx.createGain();
    cry.type = 'sine';
    cry.frequency.setValueAtTime(620 * pitchScale, now);
    cry.frequency.exponentialRampToValueAtTime(980 * pitchScale, now + 0.09);
    cry.frequency.exponentialRampToValueAtTime(480 * pitchScale, now + 0.28);

    cryGain.gain.setValueAtTime(0.0001, now);
    cryGain.gain.linearRampToValueAtTime(0.034, now + 0.025);
    cryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    cry.connect(cryGain);
    cryGain.connect(this.masterGain);
    cry.start(now);
    cry.stop(now + 0.32);
  }

  public playPhoenixFireballCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('phoenix-fireball', 45)) return;

    const v = this.pickVariant('phoenix-fireball', 4);
    const bases = [580, 630, 545, 610];
    const p = this.jitter(bases[v], 0.045);

    this.playFilteredWhoosh(ctx, 0.16, p * 2.8, p * 0.88, 0.052, 2.0);
    this.playToneLayer(ctx, 'sine', p, p * 0.48, 0.145, 0.052, 0, 0.07);
    this.playToneLayer(ctx, 'triangle', p * 2.0, p * 1.05, 0.085, 0.025, 0, 0.07);
  }

  public playPhoenixFireballImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('phoenix-fb-hit', 45)) return;

    const p = this.jitter(240, 0.08);
    this.playFilteredWhoosh(ctx, 0.19, 1320, 290, 0.05, 2.1);
    this.playToneLayer(ctx, 'triangle', p, 78, 0.14, 0.06, 0, 0.06);
  }

  public playBurnTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.1, 2500, 920, 0.03, 3.1);
  }

  public setPainChannelAmbience(active: boolean): void {
    if (this.disposed || this.painActive === active) return;
    this.painActive = active;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (active && ctx.state === 'running') {
      if (!this.painGain) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(520, now);
        bandpass.Q.value = 1.6;

        const oscA = ctx.createOscillator();
        oscA.type = 'sine';
        oscA.frequency.setValueAtTime(220, now);

        const oscB = ctx.createOscillator();
        oscB.type = 'sine';
        oscB.frequency.setValueAtTime(330, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.2, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(140, now);
        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);

        oscA.connect(bandpass);
        oscB.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.masterGain);

        oscA.start(now);
        oscB.start(now);
        lfo.start(now);

        this.painGain = gain;
        this.painOscA = oscA;
        this.painOscB = oscB;
        this.painLfo = lfo;
      }

      this.painGain.gain.cancelScheduledValues(now);
      this.painGain.gain.setValueAtTime(
        Math.max(0.0001, this.painGain.gain.value),
        now,
      );
      this.painGain.gain.linearRampToValueAtTime(0.026, now + 0.22);
    } else if (this.painGain) {
      this.painGain.gain.cancelScheduledValues(now);
      this.painGain.gain.setValueAtTime(
        Math.max(0.0001, this.painGain.gain.value),
        now,
      );
      this.painGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    }
  }

  public playPainInflictionStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.28, 360, 1480, 0.048, 2.4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.24);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playPainInflictionTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playPainInflictionExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Telekinetic wave air-distortion sweep + deep radial shockwave
    this.playFilteredWhoosh(ctx, 0.48, 1280, 160, 0.088, 1.4);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(210, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.38);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.095, now + 0.016);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.42);

    const shimmer = ctx.createOscillator();
    const shGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(880, now);
    shimmer.frequency.exponentialRampToValueAtTime(340, now + 0.28);
    shGain.gain.setValueAtTime(0.0001, now);
    shGain.gain.linearRampToValueAtTime(0.036, now + 0.015);
    shGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    shimmer.connect(shGain);
    shGain.connect(this.masterGain);
    shimmer.start(now);
    shimmer.stop(now + 0.32);
  }

  public playPhoenixFlightSpin(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    if (active) {
      this.playFilteredWhoosh(ctx, 0.34, 360, 1850, 0.06, 1.8);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.056, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.31);
    } else {
      this.playAbilityToggle(false);
    }
  }

  public playWingsToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(
      ctx,
      0.22,
      active ? 420 : 1020,
      active ? 1420 : 360,
      0.048,
      1.8,
    );
  }

  public playScarletFlightCancelShockwave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Crimson chaos burst shockwave + downward snap resonance
    this.playFilteredWhoosh(ctx, 0.42, 1380, 180, 0.085, 1.6);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(220, now);
    sub.frequency.exponentialRampToValueAtTime(52, now + 0.34);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.092, now + 0.014);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.37);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.39);

    const hex = ctx.createOscillator();
    const hGain = ctx.createGain();
    hex.type = 'triangle';
    hex.frequency.setValueAtTime(640, now);
    hex.frequency.exponentialRampToValueAtTime(195, now + 0.22);

    hGain.gain.setValueAtTime(0.0001, now);
    hGain.gain.linearRampToValueAtTime(0.045, now + 0.01);
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    hex.connect(hGain);
    hGain.connect(this.masterGain);
    hex.start(now);
    hex.stop(now + 0.25);
  }

  public playDarkholdOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Deep eldritch summon resonance + mystic page-unfurl sweep
    this.playFilteredWhoosh(ctx, 0.34, 240, 1420, 0.056, 2.2);

    const base = ctx.createOscillator();
    const baseGain = ctx.createGain();
    base.type = 'sine';
    base.frequency.setValueAtTime(146.83, now);
    base.frequency.exponentialRampToValueAtTime(220, now + 0.28);
    baseGain.gain.setValueAtTime(0.0001, now);
    baseGain.gain.linearRampToValueAtTime(0.068, now + 0.04);
    baseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    base.connect(baseGain);
    baseGain.connect(this.masterGain);
    base.start(now);
    base.stop(now + 0.38);

    const chord = [293.66, 349.23, 440];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.04 + i * 0.03);
      g.gain.setValueAtTime(0.0001, now + 0.04 + i * 0.03);
      g.gain.linearRampToValueAtTime(0.028, now + 0.07 + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now + 0.04 + i * 0.03);
      osc.stop(now + 0.36);
    });
  }

  public playDarkholdClose(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.18, 920, 220, 0.044, 1.8);
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(210, now);
    thud.frequency.exponentialRampToValueAtTime(82, now + 0.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.062, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.19);
  }

  public playTelekineticExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.44, 1520, 150, 0.09, 1.5);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(235, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.38);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.098, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.44);

    const psi = ctx.createOscillator();
    const pGain = ctx.createGain();
    psi.type = 'triangle';
    psi.frequency.setValueAtTime(760, now);
    psi.frequency.exponentialRampToValueAtTime(210, now + 0.25);
    pGain.gain.setValueAtTime(0.0001, now);
    pGain.gain.linearRampToValueAtTime(0.048, now + 0.012);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);
    psi.connect(pGain);
    pGain.connect(this.masterGain);
    psi.start(now);
    psi.stop(now + 0.29);
  }

  public playAutoShieldActivate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.24, 380, 1650, 0.045, 2.2);
    const notes = [392, 523.25, 659.25];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playAutoShieldDeflect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.18, 1200, 420, 0.052, 2.0);
    const ping = ctx.createOscillator();
    const g = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(580, now);
    ping.frequency.exponentialRampToValueAtTime(240, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    ping.connect(g);
    g.connect(this.masterGain);
    ping.start(now);
    ping.stop(now + 0.18);
  }

  public playCoinCollect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const notes = [880, 1174.66];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.052, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    });
  }

  public playSkinPurchase(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.19);
    });
  }

  public playPurchaseDenied(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(145, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playLandDust(intensity = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('land-dust', 95)) return;
    const amp = Math.min(1.3, Math.max(0.4, intensity));
    const cutoff = this.jitter(320, 0.12);
    this.playFilteredWhoosh(ctx, 0.13, cutoff, 88, 0.04 * amp, 1.3);
    if (amp > 0.78) {
      this.playToneLayer(ctx, 'sine', this.jitter(120, 0.08), 46, 0.11, 0.038 * amp, 0, 0.08);
    }
  }

  public playPhoenixSpecialRise(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.95, 220, 1650, 0.065, 1.9);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.95);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.02);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.05);
  }

  public playPhoenixSpecialManifest(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.68, 1600, 180, 0.09, 1.4);

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.55);
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.linearRampToValueAtTime(0.1, now + 0.025);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.6);

    const chord = [523.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.04 - idx * 0.006, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.88);
    });
  }

  public playMindControlLink(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.28, 520, 1850, 0.044, 2.4);
    const notes = [523.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.035;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.042, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playMindControlSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, 1520, 560, 0.046, 2.6);
    const notes = [880, 1174.66];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.03;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.046, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  public playMentalAttack(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.16, 2400, 740, 0.044, 2.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playMentalImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1240, now);
    chime.frequency.exponentialRampToValueAtTime(420, now + 0.13);
    cGain.gain.setValueAtTime(0.0001, now);
    cGain.gain.linearRampToValueAtTime(0.062, now + 0.008);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    chime.connect(cGain);
    cGain.connect(this.masterGain);
    chime.start(now);
    chime.stop(now + 0.16);
  }

  public playDiamondForm(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const chord = active ? [987.77, 1318.51, 1760.0] : [1318.51, 987.77];
    chord.forEach((f, idx) => {
      const t0 = now + idx * 0.03;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  public playDiamondShard(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('diamond-shard', 50)) return;
    const v = this.pickVariant('diamond-shard', 4);
    const bases = [1480, 1580, 1390, 1660];
    const p = this.jitter(bases[v], 0.045);
    this.playFilteredWhoosh(ctx, 0.14, 2600, 920, 0.042, 3.0);
    this.playToneLayer(ctx, 'triangle', p, p * 0.46, 0.12, 0.05, 0, 0.06);
    this.playToneLayer(ctx, 'sine', p * 1.48, p * 0.9, 0.085, 0.024, 0, 0.06);
  }

  public playDiamondShardImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('diamond-impact', 45)) return;
    const p = this.jitter(1720, 0.08);
    this.playFilteredWhoosh(ctx, 0.13, 3100, 1100, 0.045, 2.8);
    this.playToneLayer(ctx, 'triangle', p, p * 0.55, 0.09, 0.045, 0, 0.05);
    this.playToneLayer(ctx, 'sine', p * 1.32, p * 0.85, 0.11, 0.028, 0.014, 0.05);
  }

  public playTelepathicWave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.45, 480, 1750, 0.05, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.jitter(520, 0.04), now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.32);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.6);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.056, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    osc.connect(g);
    g.connect(this.getBusNode());
    osc.start(now);
    osc.stop(now + 0.66);
  }

  public playCrownForm(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.34, active ? 220 : 980, active ? 1320 : 240, 0.056, 1.9);
    const notes = active ? [196, 293.66, 392] : [293.66, 196];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.052, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(g);
      g.connect(this.getBusNode());
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playSwordSummon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(880, 0.05);
    this.playFilteredWhoosh(ctx, 0.22, 620, 2400, 0.05, 2.5);
    this.playToneLayer(ctx, 'triangle', p, p * 1.5, 0.22, 0.054, 0, 0.06);
    this.playToneLayer(ctx, 'sine', p * 2.0, p * 2.4, 0.18, 0.024, 0.02, 0.06);
  }

  public playSwordThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const v = this.pickVariant('sword-throw', 3);
    const p = this.jitter([640, 695, 595][v], 0.05);
    this.playFilteredWhoosh(ctx, 0.18, 2100, 440, 0.056, 1.9);
    this.playToneLayer(ctx, 'triangle', p, p * 0.34, 0.145, 0.055, 0, 0.06);
  }

  public playSwordSlash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('sword-slash', 45)) return;
    const v = this.pickVariant('sword-slash', 4);
    const p = this.jitter([780, 860, 710, 920][v], 0.05);
    this.playFilteredWhoosh(ctx, 0.17, 2750, 480, 0.072, 2.1);
    this.playToneLayer(ctx, 'sawtooth', p, p * 0.3, 0.13, 0.044, 0, 0.06);
    this.playToneLayer(ctx, 'triangle', p * 1.85, p * 0.72, 0.09, 0.028, 0, 0.06);
  }

  public playNpcStrike(kind: 'weapon' | 'punch' | 'pistol'): void {
    if (kind === 'pistol') {
      this.playPistolShot();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx(`npc-strike:${kind}`, 45)) return;

    const v = this.pickVariant(`npc-strike:${kind}`, 4);
    if (kind === 'weapon') {
      const f = this.jitter([210, 232, 195, 248][v], 0.06);
      this.playFilteredWhoosh(ctx, 0.15, 1650, 320, 0.048, 1.6);
      this.playToneLayer(ctx, 'triangle', f, 48, 0.125, 0.064, 0, 0.06);
      this.playToneLayer(ctx, 'sawtooth', f * 3.1, f * 1.2, 0.07, 0.026, 0, 0.06);
    } else {
      const f = this.jitter([145, 162, 132, 155][v], 0.07);
      this.playFilteredWhoosh(ctx, 0.085, 860, 210, 0.036, 1.4);
      this.playToneLayer(ctx, 'sine', f, 44, 0.12, 0.068, 0, 0.06);
      this.playToneLayer(ctx, 'triangle', f * 1.8, 65, 0.075, 0.034, 0, 0.06);
    }
  }

  public playPlayerHurtImpact(heavy: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('player-hurt', 90)) return;
    const f = this.jitter(heavy ? 168 : 138, 0.08);
    this.playFilteredWhoosh(ctx, heavy ? 0.16 : 0.09, heavy ? 1150 : 760, 140, heavy ? 0.056 : 0.034, 1.3);
    this.playToneLayer(ctx, 'triangle', f, 42, heavy ? 0.18 : 0.11, heavy ? 0.075 : 0.048, 0, 0.06);
  }

  public playSwordEmbed(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(260, now);
    thud.frequency.exponentialRampToValueAtTime(75, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.072, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.15);
  }

  public playGreenCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.36, 240, 1280, 0.052, 2.2);
    this.playToneLayer(ctx, 'sine', this.jitter(165, 0.05), 410, 0.4, 0.056, 0, 0.06);
  }

  public playGreenExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.56, 1480, 110, 0.095, 1.3);
    this.playToneLayer(ctx, 'sine', this.jitter(215, 0.06), 42, 0.52, 0.105, 0, 0.04);
    this.playToneLayer(ctx, 'triangle', this.jitter(310, 0.07), 78, 0.24, 0.046, 0, 0.05);
  }

  public playSpinningLeap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.34, 340, 1720, 0.058, 1.8);
    this.playToneLayer(ctx, 'sine', this.jitter(280, 0.06), 640, 0.28, 0.055, 0, 0.07);
  }

  public playHeroLanding(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.22, 620, 95, 0.068, 1.4);
    this.playToneLayer(ctx, 'sine', this.jitter(160, 0.06), 48, 0.24, 0.088, 0, 0.04);
  }

  public playGroundSword(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.44, 960, 130, 0.085, 1.4);
    this.playToneLayer(ctx, 'triangle', this.jitter(185, 0.06), 44, 0.44, 0.095, 0, 0.04);
    this.playToneLayer(ctx, 'sawtooth', this.jitter(520, 0.07), 160, 0.18, 0.032, 0, 0.04);
  }

  public playMagnetoThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const v = this.pickVariant('magneto-throw', 3);
    const f = this.jitter([340, 375, 310][v], 0.05);
    this.playFilteredWhoosh(ctx, 0.22, 980, 240, 0.064, 2.1);
    this.playToneLayer(ctx, 'sawtooth', f, f * 0.32, 0.17, 0.048, 0, 0.06);
    this.playToneLayer(ctx, 'triangle', f * 2.1, f * 1.15, 0.11, 0.028, 0, 0.06);
  }

  public playMagnetoMeteorCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.72, 160, 720, 0.064, 2.4);
    this.playToneLayer(ctx, 'sawtooth', 98, 220, 0.78, 0.052, 0, 0.15);
    this.playToneLayer(ctx, 'sine', 62, 115, 0.78, 0.046, 0, 0.18);
  }

  public playMagnetoMeteorImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.62, 1250, 90, 0.102, 1.3);
    this.playToneLayer(ctx, 'triangle', this.jitter(155, 0.06), 36, 0.58, 0.118, 0, 0.04);
    this.playToneLayer(ctx, 'sawtooth', 260, 68, 0.26, 0.048, 0, 0.04);
  }

  public playMagnetoShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.2, active ? 320 : 880, active ? 920 : 280, 0.044, 2.0);
    this.playToneLayer(ctx, 'sine', active ? 220 : 480, active ? 540 : 180, 0.25, 0.058, 0, 0.08);
  }

  public playMagnetoTornado(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.58, 180, 1450, 0.074, 2.0);
    this.playToneLayer(ctx, 'sawtooth', 120, 360, 0.52, 0.05, 0, 0.12);
    this.playToneLayer(ctx, 'triangle', 240, 520, 0.44, 0.032, 0.04, 0.12);
  }

  public playQuicksilverSpeed(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.22, active ? 320 : 2200, active ? 2800 : 380, 0.064, 2.6);
    this.playToneLayer(ctx, 'triangle', active ? 440 : 1120, active ? 1480 : 320, 0.17, 0.048, 0, 0.07);
  }

  public playWindTornado(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playFilteredWhoosh(ctx, 0.54, 260, 2100, 0.078, 1.7);
      this.playFilteredWhoosh(ctx, 0.44, 920, 1550, 0.042, 2.5, 0.06);
      this.playToneLayer(ctx, 'sine', 180, 520, 0.45, 0.046, 0, 0.12);
    } else {
      this.playFilteredWhoosh(ctx, 0.26, 1380, 260, 0.052, 1.8);
      this.playToneLayer(ctx, 'sine', 420, 160, 0.24, 0.04, 0, 0.08);
    }
  }

  public playSpeedBlitz(stage: 'dash' | 'hit' | 'end'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (stage === 'dash') {
      const f = this.jitter(540, 0.08);
      this.playFilteredWhoosh(ctx, 0.16, 480, 2900, 0.064, 2.4);
      this.playToneLayer(ctx, 'triangle', f, f * 2.2, 0.13, 0.048, 0, 0.06);
    } else if (stage === 'hit') {
      this.playQuicksilverPunch(false);
    } else {
      this.playFilteredWhoosh(ctx, 0.24, 1950, 320, 0.058, 1.9);
      this.playToneLayer(ctx, 'sine', 680, 190, 0.2, 0.05, 0, 0.08);
    }
  }

  public playQuicksilverPunch(finisher = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!finisher && !this.canPlaySfx('qs-punch', 45)) return;

    const v = this.pickVariant('qs-punch', 4);
    const punchFreq = this.jitter(finisher ? 220 : [170, 192, 158, 206][v], 0.06);
    this.playFilteredWhoosh(
      ctx,
      finisher ? 0.28 : 0.09,
      finisher ? 2100 : this.jitter(1900, 0.12),
      260,
      finisher ? 0.09 : 0.048,
      1.8,
    );
    this.playToneLayer(
      ctx,
      'sine',
      punchFreq,
      finisher ? 38 : 56,
      finisher ? 0.29 : 0.085,
      finisher ? 0.105 : 0.06,
      0,
      0.06,
    );
    if (finisher) {
      this.playToneLayer(ctx, 'triangle', 520, 95, 0.19, 0.055, 0, 0.06);
    }
  }

  public playTimeStop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.55, 1600, 75, 0.082, 1.4);
    this.playToneLayer(ctx, 'sine', 240, 42, 0.6, 0.092, 0, 0.05);
    this.playToneLayer(ctx, 'triangle', 1046.5, 523.25, 0.35, 0.032, 0.02, 0.05);
  }

  public playStrangeShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const notes = active ? [392.0, 587.33, 880.0] : [587.33, 392.0];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.025;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.27);
    });
  }

  public playStrangeClones(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.42, 420, 1950, 0.06, 2.4);
    const notes = [440, 659.25, 880, 1174.66];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playEldritchDiscCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('eldritch-disc', 45)) return;
    const v = this.pickVariant('eldritch-disc', 3);
    const f = this.jitter([740, 790, 690][v], 0.05);
    this.playFilteredWhoosh(ctx, 0.18, 1950, 720, 0.055, 2.5);
    this.playToneLayer(ctx, 'triangle', f, f * 0.56, 0.17, 0.052, 0, 0.06);
    this.playToneLayer(ctx, 'sine', f * 1.5, f * 0.9, 0.12, 0.022, 0.006, 0.08);
  }

  public playEldritchDiscImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('eldritch-impact', 40)) return;
    const f = this.jitter(920, 0.07);
    this.playFilteredWhoosh(ctx, 0.16, 2400, 480, 0.06, 2.0);
    this.playToneLayer(ctx, 'triangle', f, 280, 0.15, 0.055, 0, 0.05);
  }

  public playAstralExtraction(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.34, 360, 2100, 0.072, 2.2);
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now + 0.1);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.55);
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.linearRampToValueAtTime(0.095, now + 0.14);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    sub.connect(sg);
    sg.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.62);

    [659.25, 987.77, 1318.5].forEach((freq, idx) => {
      const t0 = now + 0.12 + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.038, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.44);
    });
  }

  public playPhoenixDiveLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.38, 440, 2300, 0.078, 2.0);
    this.playToneLayer(ctx, 'sawtooth', 220, 660, 0.34, 0.052, 0, 0.07);
    this.playToneLayer(ctx, 'sine', 440, 920, 0.28, 0.036, 0.02, 0.08);
  }

  public playPhoenixDiveDive(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.36, 2200, 420, 0.076, 1.7);
    this.playToneLayer(ctx, 'triangle', 740, 210, 0.34, 0.048, 0, 0.06);
  }

  public playPhoenixDiveImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.48, 1900, 180, 0.096, 1.5);
    this.playToneLayer(ctx, 'triangle', 195, 40, 0.46, 0.112, 0, 0.04);
    this.playToneLayer(ctx, 'sine', 580, 145, 0.28, 0.044, 0, 0.04);
  }

  public playVisionBoltSmall(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.11);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.036, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playVisionPhase(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(active ? 540 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 1040 : 480, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playVisionLaser(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.52, 880, 1860, 0.052, 3.0);
    const beam = ctx.createOscillator();
    const g = ctx.createGain();
    beam.type = 'sawtooth';
    beam.frequency.setValueAtTime(420, now);
    beam.frequency.linearRampToValueAtTime(520, now + 0.35);
    beam.frequency.exponentialRampToValueAtTime(240, now + 0.72);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.044, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.76);
    beam.connect(g);
    g.connect(this.masterGain);
    beam.start(now);
    beam.stop(now + 0.78);
  }

  public playVisionBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.058, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playVisionHeadGrip(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.3, 420, 1450, 0.056, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.36);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.056, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playAstralToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(
      ctx,
      0.28,
      active ? 640 : 1280,
      active ? 1680 : 540,
      0.048,
      2.4,
    );
    const notes = active ? [587.33, 880, 1174.66] : [880, 587.33];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  public playVisionBoltCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.44, 380, 1950, 0.044, 2.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.48);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.046, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playVisionBoltExplode(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 1800, 260, 0.08, 1.8);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(210, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.34);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.095, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.38);
  }

  public playKillHeal(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.036, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playAgathaBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('agatha-bolt', 45)) return;
    const f = this.jitter(320, 0.08);
    this.playFilteredWhoosh(ctx, 0.22, 1300, 280, 0.065, 2.2);
    this.playToneLayer(ctx, 'sawtooth', f, 110, 0.22, 0.055, 0, 0.07);
  }

  public playAgathaExplosionCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.48, 220, 1200, 0.045, 2.0);
    this.playToneLayer(ctx, 'triangle', 115, 420, 0.54, 0.07, 0, 0.22);
  }

  public playAgathaExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.48, 1600, 140, 0.11, 1.5);
    this.playToneLayer(ctx, 'sine', this.jitter(160, 0.06), 38, 0.48, 0.12, 0, 0.03);
    this.playToneLayer(ctx, 'sawtooth', this.jitter(240, 0.06), 62, 0.24, 0.044, 0, 0.04);
  }

  public playAgathaDrainStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.35);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.47);
  }

  public playAgathaShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(active ? 190 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 380 : 150, now + 0.24);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playAgathaShieldExplode(): void {
    this.playAgathaExplosion();
  }

  public playChaosDrainStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.28, 950, 420, 0.055, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playChaosDrainBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, 1500, 260, 0.08, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.075, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playZombieBeam(): void {
    this.playChaosDrainStart();
  }

  public playZombieStoneCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(82, now);
    sub.frequency.exponentialRampToValueAtTime(240, now + 1.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.28);
  }

  public playZombieStoneExplode(): void {
    this.playAgathaExplosion();
  }

  public playPistolShot(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('pistol-shot', 50)) return;
    const v = this.pickVariant('pistol', 3);
    const f = this.jitter([340, 365, 320][v], 0.06);
    this.playFilteredWhoosh(ctx, 0.09, 2600, 400, 0.078, 1.5);
    this.playToneLayer(ctx, 'sawtooth', f, 70, 0.09, 0.072, 0, 0.05);
    this.playToneLayer(ctx, 'triangle', f * 3.8, f * 1.4, 0.045, 0.032, 0, 0.05);
  }

  public playShieldBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('shield-break', 120)) return;
    this.playFilteredWhoosh(ctx, 0.3, 2500, 290, 0.088, 1.8);
    this.playToneLayer(ctx, 'sine', 165, 48, 0.24, 0.075, 0, 0.05);
    const notes = [this.jitter(920, 0.05), this.jitter(610, 0.05), this.jitter(340, 0.05)];
    notes.forEach((f, idx) => {
      this.playToneLayer(ctx, 'triangle', f, f * 0.62, 0.16, 0.058, idx * 0.025, 0.05);
    });
  }

  public playRockBreak(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('rock-break', 110)) return;
    const amp = Math.min(1.4, Math.max(0.6, intensity));
    const v = this.pickVariant('rock-break', 3);
    const crackFreq = this.jitter([960, 1120, 840][v], 0.08);
    const subFreq = this.jitter([145, 160, 132][v], 0.07);
    this.playFilteredWhoosh(ctx, 0.25, crackFreq, 110, 0.068 * amp, 1.4);
    this.playFilteredWhoosh(ctx, 0.14, crackFreq * 1.8, 320, 0.042 * amp, 2.2, 0.03);
    this.playToneLayer(ctx, 'triangle', subFreq, 40, 0.24, 0.082 * amp, 0, 0.05);
  }

  public playPurgatoryGrasp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 1750, 220, 0.085, 2.4);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.34);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playInvisibilityToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(
      ctx,
      0.34,
      active ? 1850 : 620,
      active ? 540 : 1720,
      0.068,
      2.2,
    );
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(active ? 740 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 380 : 780, now + 0.32);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playForcefieldShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, active ? 680 : 1200, active ? 1320 : 460, 0.062, 1.9);
    const notes = active ? [392, 523.25] : [493.88, 329.63];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.052, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  }

  public playForcefieldTransfer(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.3, 1400, 620, 0.072, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playForcefieldProtection(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.048, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.28);
    });
  }

  public playForcefieldSuffocation(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 980, 260, 0.075, 2.6);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(98, now + 0.32);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playForcefieldBarrierCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.26, 1700, 420, 0.078, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.24);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playForcefieldBarrierHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('ff-barrier-hit', 45)) return;
    this.playFilteredWhoosh(ctx, 0.22, 2100, 320, 0.088, 1.8);
    this.playToneLayer(ctx, 'triangle', this.jitter(195, 0.07), 58, 0.24, 0.095, 0, 0.04);
  }

  public playVampireBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('vampire-bolt', 45)) return;
    const v = this.pickVariant('vampire-bolt', 3);
    const p = this.jitter([680, 735, 635][v], 0.05);
    this.playFilteredWhoosh(ctx, 0.18, 1600, 480, 0.058, 1.8);
    this.playToneLayer(ctx, 'triangle', p, p * 0.42, 0.15, 0.066, 0, 0.06);
    this.playToneLayer(ctx, 'sine', p * 1.45, p * 0.72, 0.1, 0.026, 0.006, 0.06);
  }

  public playVampireGroundStomp(stage: 'dive' | 'impact'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (stage === 'dive') {
      this.playFilteredWhoosh(ctx, 0.28, 1900, 320, 0.074, 1.5);
      this.playToneLayer(ctx, 'triangle', 420, 155, 0.26, 0.048, 0, 0.08);
    } else {
      this.playFilteredWhoosh(ctx, 0.45, 980, 95, 0.098, 1.2);
      this.playToneLayer(ctx, 'triangle', this.jitter(165, 0.06), 42, 0.42, 0.115, 0, 0.04);
      this.playToneLayer(ctx, 'sawtooth', 220, 56, 0.2, 0.042, 0, 0.04);
    }
  }

  public playVampireAbsorbStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.34, 380, 1420, 0.052, 2.2);
    this.playToneLayer(ctx, 'sine', 260, 520, 0.36, 0.06, 0, 0.08);
  }

  public playVampireAbsorbComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.056, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.getBusNode());
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playVampireDiscard(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 420, 210, 0.16, 0.042, 0, 0.06);
  }

  public playCapShieldThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('cap-throw', 120)) return;
    const p = this.jitter(1, 0.07);
    this.playFilteredWhoosh(ctx, 0.28, 520 * p, 1680 * p, 0.062, 3.2);
    this.playToneLayer(ctx, 'triangle', 480 * p, 920 * p, 0.16, 0.048, 0, 0.05);
  }

  public playCapShieldRicochet(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('cap-ricochet', 65)) return;
    const base = [980, 1140, 1260][this.pickVariant('cap-ricochet', 3)];
    this.playToneLayer(ctx, 'triangle', base, base * 1.48, 0.14, 0.082, 0, 0.04);
    this.playToneLayer(ctx, 'sine', base * 1.85, base * 0.72, 0.18, 0.056, 0.015, 0.04);
    this.playFilteredWhoosh(ctx, 0.12, 1100, 420, 0.048, 2.2);
  }

  public playCapShieldCatch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'triangle', 260, 115, 0.12, 0.065, 0, 0.06);
    this.playToneLayer(ctx, 'sine', 740, 520, 0.09, 0.036, 0.01, 0.05);
  }

  public playCapShieldDefense(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playToneLayer(ctx, 'triangle', 280, 640, 0.22, 0.058, 0, 0.06);
      this.playFilteredWhoosh(ctx, 0.2, 380, 1020, 0.044, 2.4);
    } else {
      this.playToneLayer(ctx, 'sine', 520, 220, 0.18, 0.044, 0, 0.06);
    }
  }

  public playCapComboStrike(step: 1 | 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('cap-combo', 70)) return;
    const p = this.jitter(1, 0.06);
    if (step === 1) {
      this.playFilteredWhoosh(ctx, 0.16, 460 * p, 1280 * p, 0.056, 2.5);
      this.playToneLayer(ctx, 'triangle', 340 * p, 120, 0.14, 0.068, 0.02, 0.05);
    } else if (step === 2) {
      this.playFilteredWhoosh(ctx, 0.15, 320 * p, 960 * p, 0.052, 2.1);
      this.playToneLayer(ctx, 'sine', 210 * p, 72, 0.15, 0.082, 0.02, 0.05);
    } else {
      this.playFilteredWhoosh(ctx, 0.26, 420 * p, 1740 * p, 0.072, 2.8);
      this.playToneLayer(ctx, 'triangle', 560 * p, 110, 0.26, 0.095, 0.02, 0.04);
      this.playToneLayer(ctx, 'sine', 165, 54, 0.28, 0.088, 0.02, 0.04);
    }
  }

  public playCapShieldCharge(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playFilteredWhoosh(ctx, 0.42, 240, 1340, 0.076, 1.9);
      this.playToneLayer(ctx, 'sawtooth', 120, 280, 0.34, 0.045, 0, 0.08);
      this.playToneLayer(ctx, 'triangle', 440, 680, 0.24, 0.05, 0.03, 0.06);
    } else {
      this.playFilteredWhoosh(ctx, 0.2, 680, 220, 0.042, 1.8);
    }
  }

  public playCapChargeBump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('cap-charge-bump', 95)) return;
    const p = this.jitter(1, 0.08);
    this.playToneLayer(ctx, 'triangle', 480 * p, 98, 0.18, 0.085, 0, 0.04);
    this.playToneLayer(ctx, 'sine', 190 * p, 62, 0.2, 0.078, 0, 0.04);
  }

  public playThorMjolnirSwing(step: 1 | 2 | 3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (!this.canPlaySfx('thor-combo', 75)) return;
    const p = this.jitter(1, 0.06);
    if (step === 1) {
      this.playFilteredWhoosh(ctx, 0.2, 340 * p, 1180 * p, 0.06, 2.2);
      this.playToneLayer(ctx, 'sawtooth', 260 * p, 84, 0.16, 0.046, 0.02, 0.06);
    } else if (step === 2) {
      this.playFilteredWhoosh(ctx, 0.22, 420 * p, 1480 * p, 0.065, 2.4);
      this.playToneLayer(ctx, 'triangle', 320 * p, 96, 0.18, 0.068, 0.02, 0.05);
      this.playToneLayer(ctx, 'sawtooth', 620 * p, 240, 0.12, 0.032, 0.03, 0.05);
    } else {
      this.playFilteredWhoosh(ctx, 0.34, 300 * p, 1920 * p, 0.082, 2.6);
      this.playToneLayer(ctx, 'sine', 180, 48, 0.36, 0.11, 0.02, 0.04);
      this.playToneLayer(ctx, 'sawtooth', 780 * p, 160, 0.28, 0.052, 0.03, 0.04);
    }
  }

  public playThorMjolnirThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(1, 0.07);
    this.playFilteredWhoosh(ctx, 0.36, 280 * p, 1540 * p, 0.074, 2.3);
    this.playToneLayer(ctx, 'triangle', 220 * p, 460 * p, 0.24, 0.058, 0, 0.06);
  }

  public playThorMjolnirImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(1, 0.06);
    this.playToneLayer(ctx, 'sine', 190 * p, 46, 0.42, 0.115, 0, 0.03);
    this.playToneLayer(ctx, 'sawtooth', 860 * p, 140, 0.32, 0.056, 0.01, 0.03);
    this.playFilteredWhoosh(ctx, 0.34, 1800, 180, 0.075, 1.8);
  }

  public playThorMjolnirSummon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.32, 320, 1240, 0.05, 2.8);
    this.playToneLayer(ctx, 'sine', 240, 620, 0.3, 0.046, 0, 0.08);
  }

  public playThorMjolnirCatch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'triangle', 310, 92, 0.16, 0.078, 0, 0.04);
    this.playToneLayer(ctx, 'sine', 580, 320, 0.12, 0.042, 0.01, 0.05);
  }

  public playThorLightningSlamLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.48, 220, 1680, 0.078, 2.0);
    this.playToneLayer(ctx, 'sawtooth', 180, 620, 0.44, 0.052, 0, 0.06);
  }

  public playThorLightningSlamImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 160, 38, 0.56, 0.135, 0, 0.03);
    this.playToneLayer(ctx, 'sawtooth', 980, 110, 0.44, 0.068, 0, 0.03);
    this.playFilteredWhoosh(ctx, 0.52, 2200, 120, 0.095, 1.6);
  }

  public playThorStormChannel(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.92, 280, 1840, 0.068, 2.4);
    this.playToneLayer(ctx, 'sawtooth', 140, 520, 0.88, 0.048, 0, 0.15);
    this.playToneLayer(ctx, 'sine', 280, 780, 0.88, 0.055, 0.04, 0.14);
  }

  public playThorStormBeam(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.72, 1950, 420, 0.092, 2.0);
    this.playToneLayer(ctx, 'sawtooth', 640, 220, 0.68, 0.064, 0, 0.04);
    this.playToneLayer(ctx, 'sine', 240, 110, 0.72, 0.088, 0, 0.05);
  }

  public playCosmicFlight(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playToneLayer(ctx, 'sine', 260, 740, 0.36, 0.062, 0, 0.06);
      this.playToneLayer(ctx, 'triangle', 520, 1180, 0.3, 0.04, 0.04, 0.05);
      this.playFilteredWhoosh(ctx, 0.36, 420, 1950, 0.06, 2.4);
    } else {
      this.playToneLayer(ctx, 'sine', 620, 210, 0.24, 0.048, 0, 0.04);
      this.playFilteredWhoosh(ctx, 0.24, 1400, 320, 0.042, 1.8);
    }
  }

  public playDamageAbsorption(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playToneLayer(ctx, 'sine', 340, 680, 0.26, 0.052, 0, 0.05);
      this.playToneLayer(ctx, 'triangle', 680, 1020, 0.22, 0.03, 0.03, 0.05);
    } else {
      this.playToneLayer(ctx, 'sine', 540, 260, 0.2, 0.04, 0, 0.04);
    }
  }

  public playAbsorptionHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const p = this.jitter(1, 0.07);
    this.playToneLayer(ctx, 'sine', 820 * p, 1480 * p, 0.18, 0.055, 0, 0.03);
    this.playToneLayer(ctx, 'triangle', 320 * p, 640 * p, 0.16, 0.042, 0.01, 0.03);
  }

  public playSonicBlast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sawtooth', 160, 48, 0.42, 0.115, 0, 0.03);
    this.playToneLayer(ctx, 'sine', 740, 150, 0.34, 0.095, 0, 0.03);
    this.playFilteredWhoosh(ctx, 0.46, 2600, 260, 0.105, 2.1);
  }

  public playCosmicBlastCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 280, 760, 0.32, 0.05, 0, 0.08);
    this.playToneLayer(ctx, 'triangle', 440, 1140, 0.3, 0.032, 0.03, 0.07);
  }

  public playCosmicBlastCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.26, 620, 2200, 0.068, 2.0);
    this.playToneLayer(ctx, 'sine', 780, 320, 0.22, 0.062, 0, 0.03);
  }

  public playCosmicBlastExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 180, 42, 0.48, 0.125, 0, 0.03);
    this.playToneLayer(ctx, 'triangle', 540, 110, 0.34, 0.068, 0, 0.03);
    this.playFilteredWhoosh(ctx, 0.44, 2100, 140, 0.092, 1.5);
  }

  public playDualCosmicBeam(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sawtooth', 260, 620, 0.72, 0.058, 0, 0.08);
    this.playToneLayer(ctx, 'sine', 520, 1080, 0.68, 0.072, 0.02, 0.08);
    this.playFilteredWhoosh(ctx, 0.64, 600, 2300, 0.078, 2.2);
  }

  public playStormFlight(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playFilteredWhoosh(ctx, 0.4, 340, 1520, 0.062, 2.2);
      this.playToneLayer(ctx, 'sine', 300, 560, 0.3, 0.042, 0, 0.08);
    } else {
      this.playFilteredWhoosh(ctx, 0.26, 1200, 280, 0.045, 1.8);
    }
  }

  public playLightningStrikeRise(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.32, 300, 1800, 0.06, 2.5);
    this.playToneLayer(ctx, 'sawtooth', 260, 740, 0.28, 0.042, 0, 0.06);
  }

  public playLightningStrikeImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 150, 36, 0.56, 0.14, 0, 0.02);
    this.playToneLayer(ctx, 'sawtooth', 1050, 95, 0.42, 0.072, 0, 0.02);
    this.playFilteredWhoosh(ctx, 0.48, 2500, 130, 0.098, 1.5);
  }

  public playStormTornado(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playFilteredWhoosh(ctx, 0.62, 240, 1460, 0.082, 2.1);
      this.playToneLayer(ctx, 'sine', 190, 420, 0.5, 0.06, 0, 0.08);
    } else {
      this.playFilteredWhoosh(ctx, 0.26, 980, 220, 0.042, 1.7);
    }
  }

  public playIceSpearCreate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'sine', 920, 1680, 0.38, 0.052, 0, 0.06);
    this.playToneLayer(ctx, 'triangle', 1280, 2100, 0.32, 0.034, 0.04, 0.06);
  }

  public playIceSpearLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.24, 900, 2400, 0.065, 2.2);
    this.playToneLayer(ctx, 'sine', 1400, 520, 0.2, 0.048, 0, 0.03);
  }

  public playIceSpearShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playToneLayer(ctx, 'triangle', 1800, 360, 0.28, 0.072, 0, 0.02);
    this.playToneLayer(ctx, 'sine', 2400, 720, 0.22, 0.052, 0.02, 0.02);
    this.playFilteredWhoosh(ctx, 0.32, 2600, 380, 0.08, 1.9);
  }

  public playWindBlast(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    if (active) {
      this.playFilteredWhoosh(ctx, 0.45, 380, 1720, 0.072, 2.2);
    } else {
      this.playFilteredWhoosh(ctx, 0.22, 1100, 280, 0.038, 1.6);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.selectionVoice.dispose();
    this.vocalSynth.reset();
    this.cooldowns.reset();
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.flightGain && this.ctx) {
        this.flightGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.painGain && this.ctx) {
        this.painGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      this.ambientSource?.stop();
      this.ambientLfo?.stop();
      this.flightOscA?.stop();
      this.flightOscB?.stop();
      this.flightLfo?.stop();
      this.painOscA?.stop();
      this.painOscB?.stop();
      this.painLfo?.stop();
    } catch {
      // Ignore already stopped audio nodes
    }
    this.ambientSource = null;
    this.ambientLfo = null;
    this.ambientGain = null;
    this.flightOscA = null;
    this.flightOscB = null;
    this.flightLfo = null;
    this.flightGain = null;
    this.painOscA = null;
    this.painOscB = null;
    this.painLfo = null;
    this.painGain = null;

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.limiterNode = null;
    this.masterGain = null;
    this.whiteNoiseBuffer = null;
  }
}
