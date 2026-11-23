import {
  AudioCooldownManager,
  VocalizationKind,
  VoiceGender,
  resolveSelectionVoiceConfig,
} from './characterAudioLibrary';

/**
 * Selection-screen announcer voice ONLY.
 * Uses a single consistent, deep, mature, masculine voice across the entire roster
 * to announce ONLY the clicked character's name. Never speaks during gameplay.
 */
export class CharacterSelectionVoicePlayer {
  private static readonly ANNOUNCER_PITCH = 0.74;
  private static readonly ANNOUNCER_RATE = 0.91;
  private static readonly ANNOUNCER_VOLUME_SCALE = 0.9;

  private cachedVoices: SpeechSynthesisVoice[] = [];
  private cachedAnnouncerVoice: SpeechSynthesisVoice | null = null;
  private voicesListenerBound = false;
  private lastSpokenKey: string | null = null;
  private lastTriggerAtMs = 0;
  private volumeNorm = 0.75;
  private disposed = false;
  private speakGeneration = 0;
  private pendingTimerId: number | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.bindVoicesListener();
  }

  private bindVoicesListener(): void {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      this.voicesListenerBound
    ) {
      return;
    }
    this.voicesListenerBound = true;
    const synth = window.speechSynthesis;
    const refresh = () => {
      try {
        this.cachedVoices = synth.getVoices();
        this.cachedAnnouncerVoice = this.resolveAnnouncerVoice();
      } catch {
        this.cachedVoices = [];
        this.cachedAnnouncerVoice = null;
      }
    };
    refresh();
    synth.addEventListener?.('voiceschanged', refresh);
  }

  public setVolume(norm0to1: number): void {
    this.volumeNorm = Math.min(1, Math.max(0, norm0to1));
  }

  private resolveAnnouncerVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    if (this.cachedVoices.length === 0) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
      } catch {
        return null;
      }
    }
    if (this.cachedVoices.length === 0) return null;

    const englishVoices = this.cachedVoices.filter((v) =>
      /^en([-_]|$)/i.test(v.lang),
    );
    const pool = englishVoices.length > 0 ? englishVoices : this.cachedVoices;

    const deepMaleTier1Rx =
      /(guy|christopher|eric|steffan|roger|davis|andrew|brian|ryan|arthur|daniel|george|tony|jason)/i;
    const maleTier2Rx =
      /(male|man|david|mark|matthew|alex|aaron|oliver|tom|fred|baritone|narrator|announcer)/i;
    const femaleRx =
      /(female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|aria|jenny|zira|hazel|susan|catherine|allison|ava|nicky|kate|joanna|kimberly|salli|kendra|libby|sonia|natasha|michelle|emma|claire|emily)/i;
    const youthfulRx = /(boy|kid|child|junior|justin|kevin)/i;
    const noveltyRx =
      /(whisper|zarvox|trinoids|boing|bubbles|cellos|bad news|good news|albert|bahh|bells|deranged|hysterical|organ|princess|superstar)/i;

    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -Infinity;

    for (const v of pool) {
      const name = v.name;
      if (noveltyRx.test(name)) continue;

      let score = 0;
      if (/^en-US/i.test(v.lang)) score += 6;
      else if (/^en-GB/i.test(v.lang)) score += 5;
      else if (/^en/i.test(v.lang)) score += 3;

      if (/natural|neural|online|premium|enhanced/i.test(name)) score += 5;
      if (/google|microsoft|apple/i.test(name)) score += 2;
      if (v.localService) score += 1;

      if (deepMaleTier1Rx.test(name)) score += 18;
      else if (maleTier2Rx.test(name)) score += 13;

      if (femaleRx.test(name)) score -= 24;
      if (youthfulRx.test(name)) score -= 12;

      if (score > bestScore) {
        bestScore = score;
        bestVoice = v;
      }
    }

    return bestVoice;
  }

  private getAnnouncerVoice(): SpeechSynthesisVoice | null {
    if (this.cachedAnnouncerVoice) {
      return this.cachedAnnouncerVoice;
    }
    this.cachedAnnouncerVoice = this.resolveAnnouncerVoice();
    return this.cachedAnnouncerVoice;
  }

  private clearPendingTimer(): void {
    if (this.pendingTimerId !== null) {
      window.clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
  }

  private dispatchAnnouncement(synth: SpeechSynthesis, characterName: string): void {
    const utter = new SpeechSynthesisUtterance(characterName);
    const voice = this.getAnnouncerVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'en-US';
    }

    utter.pitch = CharacterSelectionVoicePlayer.ANNOUNCER_PITCH;
    utter.rate = CharacterSelectionVoicePlayer.ANNOUNCER_RATE;
    utter.volume = Math.min(
      1,
      Math.max(0, this.volumeNorm * CharacterSelectionVoicePlayer.ANNOUNCER_VOLUME_SCALE),
    );

    this.activeUtterance = utter;
    const clearIfCurrent = () => {
      if (this.activeUtterance === utter) {
        this.activeUtterance = null;
      }
    };
    utter.onend = clearIfCurrent;
    utter.onerror = clearIfCurrent;

    synth.speak(utter);
  }

  public playSelectionLine(characterId: string, skinId?: string | null): void {
    if (this.disposed) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const config = resolveSelectionVoiceConfig(characterId, skinId);
    const characterName = config.characterName;
    if (!characterName) return;

    const now = performance.now();
    const synth = window.speechSynthesis;

    // Prevent hardware double-tap stutter on the exact same button within 180ms,
    // while ALWAYS allowing immediate interruption when clicking any other character.
    if (
      this.lastSpokenKey === config.key &&
      (synth.speaking || synth.pending) &&
      now - this.lastTriggerAtMs < 180
    ) {
      return;
    }

    this.lastSpokenKey = config.key;
    this.lastTriggerAtMs = now;
    this.speakGeneration += 1;
    this.clearPendingTimer();

    if (this.volumeNorm <= 0.01) {
      this.stop();
      return;
    }

    try {
      const wasActive = synth.speaking || synth.pending;
      this.activeUtterance = null;
      synth.cancel();

      if (wasActive) {
        const gen = this.speakGeneration;
        this.pendingTimerId = window.setTimeout(() => {
          this.pendingTimerId = null;
          if (!this.disposed && gen === this.speakGeneration) {
            this.dispatchAnnouncement(synth, characterName);
          }
        }, 20);
      } else {
        this.dispatchAnnouncement(synth, characterName);
      }
    } catch {
      // Ignore browser speech synthesis restriction errors
    }
  }

  public stop(): void {
    this.speakGeneration += 1;
    this.clearPendingTimer();
    this.activeUtterance = null;
    this.lastSpokenKey = null;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cleanup errors
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.stop();
  }
}

interface FormantPreset {
  f0Start: number;
  f0End: number;
  f1: number;
  f2: number;
  f3: number;
  dur: number;
  breath: number;
  gain: number;
}

const MALE_PAIN_LIGHT: ReadonlyArray<FormantPreset> = [
  { f0Start: 138, f0End: 102, f1: 520, f2: 1180, f3: 2450, dur: 0.145, breath: 0.42, gain: 0.105 },
  { f0Start: 126, f0End: 94, f1: 480, f2: 1100, f3: 2380, dur: 0.16, breath: 0.36, gain: 0.11 },
  { f0Start: 148, f0End: 108, f1: 560, f2: 1240, f3: 2520, dur: 0.135, breath: 0.45, gain: 0.1 },
  { f0Start: 132, f0End: 90, f1: 450, f2: 1060, f3: 2320, dur: 0.17, breath: 0.38, gain: 0.108 },
];

const MALE_PAIN_HEAVY: ReadonlyArray<FormantPreset> = [
  { f0Start: 158, f0End: 88, f1: 680, f2: 1260, f3: 2480, dur: 0.27, breath: 0.62, gain: 0.14 },
  { f0Start: 142, f0End: 82, f1: 620, f2: 1150, f3: 2420, dur: 0.3, breath: 0.56, gain: 0.145 },
  { f0Start: 168, f0End: 96, f1: 710, f2: 1320, f3: 2560, dur: 0.25, breath: 0.68, gain: 0.135 },
  { f0Start: 150, f0End: 84, f1: 650, f2: 1200, f3: 2460, dur: 0.28, breath: 0.6, gain: 0.142 },
];

const MALE_PAIN_REPEATED: ReadonlyArray<FormantPreset> = [
  { f0Start: 146, f0End: 112, f1: 500, f2: 1340, f3: 2480, dur: 0.125, breath: 0.55, gain: 0.095 },
  { f0Start: 130, f0End: 98, f1: 460, f2: 1220, f3: 2400, dur: 0.14, breath: 0.48, gain: 0.098 },
  { f0Start: 154, f0End: 116, f1: 540, f2: 1400, f3: 2550, dur: 0.12, breath: 0.58, gain: 0.092 },
];

const MALE_EFFORT: ReadonlyArray<FormantPreset> = [
  { f0Start: 124, f0End: 142, f1: 540, f2: 1220, f3: 2420, dur: 0.115, breath: 0.52, gain: 0.072 },
  { f0Start: 132, f0End: 110, f1: 490, f2: 1160, f3: 2380, dur: 0.13, breath: 0.48, gain: 0.075 },
  { f0Start: 118, f0End: 136, f1: 520, f2: 1280, f3: 2460, dur: 0.11, breath: 0.58, gain: 0.068 },
  { f0Start: 136, f0End: 105, f1: 570, f2: 1190, f3: 2410, dur: 0.14, breath: 0.5, gain: 0.074 },
];

const FEMALE_PAIN_LIGHT: ReadonlyArray<FormantPreset> = [
  { f0Start: 242, f0End: 192, f1: 620, f2: 1460, f3: 2820, dur: 0.14, breath: 0.46, gain: 0.096 },
  { f0Start: 228, f0End: 180, f1: 580, f2: 1380, f3: 2740, dur: 0.155, breath: 0.42, gain: 0.1 },
  { f0Start: 256, f0End: 204, f1: 650, f2: 1540, f3: 2900, dur: 0.13, breath: 0.48, gain: 0.094 },
  { f0Start: 236, f0End: 186, f1: 600, f2: 1420, f3: 2780, dur: 0.16, breath: 0.44, gain: 0.098 },
];

const FEMALE_PAIN_HEAVY: ReadonlyArray<FormantPreset> = [
  { f0Start: 272, f0End: 174, f1: 790, f2: 1580, f3: 2920, dur: 0.26, breath: 0.68, gain: 0.128 },
  { f0Start: 258, f0End: 165, f1: 740, f2: 1480, f3: 2840, dur: 0.285, breath: 0.62, gain: 0.132 },
  { f0Start: 286, f0End: 184, f1: 820, f2: 1640, f3: 2980, dur: 0.245, breath: 0.72, gain: 0.125 },
  { f0Start: 264, f0End: 170, f1: 760, f2: 1520, f3: 2880, dur: 0.27, breath: 0.65, gain: 0.13 },
];

const FEMALE_PAIN_REPEATED: ReadonlyArray<FormantPreset> = [
  { f0Start: 254, f0End: 208, f1: 610, f2: 1620, f3: 2920, dur: 0.12, breath: 0.6, gain: 0.088 },
  { f0Start: 238, f0End: 192, f1: 570, f2: 1520, f3: 2820, dur: 0.135, breath: 0.54, gain: 0.09 },
  { f0Start: 266, f0End: 215, f1: 640, f2: 1680, f3: 2980, dur: 0.115, breath: 0.64, gain: 0.085 },
];

const FEMALE_EFFORT: ReadonlyArray<FormantPreset> = [
  { f0Start: 222, f0End: 248, f1: 640, f2: 1520, f3: 2840, dur: 0.11, breath: 0.56, gain: 0.064 },
  { f0Start: 234, f0End: 198, f1: 590, f2: 1460, f3: 2780, dur: 0.125, breath: 0.52, gain: 0.068 },
  { f0Start: 215, f0End: 242, f1: 615, f2: 1580, f3: 2880, dur: 0.105, breath: 0.6, gain: 0.062 },
  { f0Start: 240, f0End: 202, f1: 660, f2: 1490, f3: 2820, dur: 0.132, breath: 0.54, gain: 0.066 },
];

const VOCAL_PRIORITY: Record<VocalizationKind, number> = {
  'pain-heavy': 4,
  'pain-repeated': 3,
  'pain-light': 2,
  'effort-heavy': 2,
  'effort-melee': 1,
  'effort-land': 1,
  'effort-jump': 1,
};

const VOCAL_COOLDOWN_MS: Record<VocalizationKind, number> = {
  'pain-light': 380,
  'pain-heavy': 460,
  'pain-repeated': 520,
  'effort-jump': 700,
  'effort-land': 720,
  'effort-melee': 560,
  'effort-heavy': 660,
};

/**
 * Purely nonverbal Web Audio formant synthesizer for pain grunts, gasps, and physical effort.
 * Never produces speech or dialogue.
 */
export class VocalizationSynth {
  private readonly cooldowns = new AudioCooldownManager();
  private lastVocalAtMs = 0;
  private lastVocalPriority = 0;
  private glottalCurve: Float32Array<ArrayBuffer> | null = null;

  private getGlottalCurve(): Float32Array<ArrayBuffer> {
    if (this.glottalCurve) return this.glottalCurve;
    const samples = 512;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 2.1) * 0.86 + x * 0.14;
    }
    this.glottalCurve = curve;
    return curve;
  }

  public trigger(
    ctx: AudioContext,
    dest: AudioNode,
    noiseBuffer: AudioBuffer,
    gender: VoiceGender,
    kind: VocalizationKind,
  ): void {
    const nowMs = performance.now();
    const priority = VOCAL_PRIORITY[kind];
    const minGlobalGap = priority >= 4 ? 190 : 280;

    if (
      nowMs - this.lastVocalAtMs < minGlobalGap &&
      priority <= this.lastVocalPriority
    ) {
      return;
    }

    if (!this.cooldowns.canPlay(`vocal:${kind}`, VOCAL_COOLDOWN_MS[kind], nowMs)) {
      return;
    }

    this.lastVocalAtMs = nowMs;
    this.lastVocalPriority = priority;

    const pool = this.pickPool(gender, kind);
    const variantIdx = this.cooldowns.pickVariant(`v:${gender}:${kind}`, pool.length);
    const preset = pool[variantIdx] ?? pool[0];

    const pitchScale = 0.94 + Math.random() * 0.12;
    const durScale =
      kind === 'effort-heavy' ? 1.24 : kind === 'effort-melee' ? 0.92 : 1.0;
    const dur = preset.dur * durScale * (0.93 + Math.random() * 0.14);
    const now = ctx.currentTime;

    // 1. Glottal vocal fold source (sawtooth + sub triangle + soft saturation)
    const f0 = preset.f0Start * pitchScale;
    const f0End = preset.f0End * pitchScale;

    const glottal = ctx.createOscillator();
    glottal.type = 'sawtooth';
    glottal.frequency.setValueAtTime(f0, now);
    glottal.frequency.exponentialRampToValueAtTime(Math.max(55, f0End), now + dur);

    const subFold = ctx.createOscillator();
    subFold.type = 'triangle';
    subFold.frequency.setValueAtTime(f0 * 0.5, now);
    subFold.frequency.exponentialRampToValueAtTime(Math.max(40, f0End * 0.5), now + dur);

    const glottalMix = ctx.createGain();
    glottalMix.gain.value = 0.72;

    const subMix = ctx.createGain();
    subMix.gain.value = gender === 'male' ? 0.28 : 0.16;

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getGlottalCurve();
    shaper.oversample = '2x';

    // Warm vocal lowpass roll-off before formants
    const sourceLp = ctx.createBiquadFilter();
    sourceLp.type = 'lowpass';
    sourceLp.frequency.setValueAtTime(gender === 'female' ? 3600 : 2800, now);
    sourceLp.Q.value = 0.7;

    glottal.connect(glottalMix);
    subFold.connect(subMix);
    glottalMix.connect(shaper);
    subMix.connect(shaper);
    shaper.connect(sourceLp);

    // 2. Parallel vocal tract formants (F1, F2, F3)
    const masterEnv = ctx.createGain();
    const attack = kind === 'pain-heavy' ? 0.012 : 0.016;
    const peakGain =
      preset.gain * (kind === 'effort-heavy' ? 1.15 : 1.0) * (0.9 + Math.random() * 0.16);
    masterEnv.gain.setValueAtTime(0.0001, now);
    masterEnv.gain.linearRampToValueAtTime(peakGain, now + attack);
    masterEnv.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain * 0.45), now + dur * 0.58);
    masterEnv.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const formants: Array<{ freq: number; q: number; weight: number }> = [
      { freq: preset.f1 * (0.96 + Math.random() * 0.08), q: 6.5, weight: 0.62 },
      { freq: preset.f2 * (0.95 + Math.random() * 0.1), q: 8.5, weight: 0.34 },
      { freq: preset.f3 * (0.96 + Math.random() * 0.08), q: 10.0, weight: 0.16 },
    ];

    for (const fm of formants) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fm.freq, now);
      if (kind === 'pain-heavy') {
        bp.frequency.exponentialRampToValueAtTime(fm.freq * 0.86, now + dur);
      }
      bp.Q.value = fm.q;

      const fg = ctx.createGain();
      fg.gain.value = fm.weight;

      sourceLp.connect(bp);
      bp.connect(fg);
      fg.connect(masterEnv);
    }

    // 3. Breathy aspiration / gasp air layer
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.setValueAtTime(gender === 'female' ? 1750 : 1250, now);
    breathFilter.Q.value = kind === 'pain-heavy' ? 1.4 : 2.1;

    const breathGain = ctx.createGain();
    const breathAmp = peakGain * preset.breath;
    breathGain.gain.setValueAtTime(0.0001, now);
    breathGain.gain.linearRampToValueAtTime(breathAmp, now + 0.012);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.95);

    noiseSrc.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(dest);

    masterEnv.connect(dest);

    const offset = Math.random() * Math.max(0.1, noiseBuffer.duration - 0.1);
    glottal.start(now);
    subFold.start(now);
    noiseSrc.start(now, offset, dur + 0.04);

    glottal.stop(now + dur + 0.03);
    subFold.stop(now + dur + 0.03);
  }

  private pickPool(
    gender: VoiceGender,
    kind: VocalizationKind,
  ): ReadonlyArray<FormantPreset> {
    if (gender === 'female') {
      switch (kind) {
        case 'pain-heavy':
          return FEMALE_PAIN_HEAVY;
        case 'pain-repeated':
          return FEMALE_PAIN_REPEATED;
        case 'pain-light':
          return FEMALE_PAIN_LIGHT;
        default:
          return FEMALE_EFFORT;
      }
    }
    switch (kind) {
      case 'pain-heavy':
        return MALE_PAIN_HEAVY;
      case 'pain-repeated':
        return MALE_PAIN_REPEATED;
      case 'pain-light':
        return MALE_PAIN_LIGHT;
      default:
        return MALE_EFFORT;
    }
  }

  public reset(): void {
    this.cooldowns.reset();
    this.lastVocalAtMs = 0;
    this.lastVocalPriority = 0;
  }
}
