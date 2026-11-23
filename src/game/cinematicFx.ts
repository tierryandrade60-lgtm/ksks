import * as THREE from 'three';
import { CharacterArchetype, PhoenixSkinVariant } from './characterConfig';

export type VisualIdentity =
  | 'scarlet-witch'
  | 'phoenix'
  | 'dark-phoenix'
  | 'white-phoenix'
  | 'emma-frost'
  | 'hela'
  | 'magneto'
  | 'quicksilver'
  | 'speed'
  | 'doctor-strange'
  | 'vision'
  | 'agatha-harkness'
  | 'invisible-woman'
  | 'vampire'
  | 'captain-america'
  | 'thor'
  | 'silver-surfer'
  | 'storm';

export type CinematicCueId =
  | 'chaos-bolt-cast'
  | 'chaos-bolt-impact'
  | 'teleport-vanish'
  | 'teleport-arrive'
  | 'chaos-implosion-cast'
  | 'chaos-implosion-detonate'
  | 'scarlet-flight-on'
  | 'scarlet-flight-off'
  | 'scarlet-flight-cancel'
  | 'phoenix-wave-cast'
  | 'phoenix-wave-step-0'
  | 'phoenix-wave-step-1'
  | 'phoenix-wave-step-2'
  | 'phoenix-fireball-cast'
  | 'phoenix-fireball-impact'
  | 'pain-start'
  | 'pain-tick'
  | 'pain-cancel'
  | 'pain-explosion'
  | 'phoenix-flight-on'
  | 'phoenix-flight-off'
  | 'wings-on'
  | 'wings-off'
  | 'death'
  | 'revival-charge'
  | 'revival-burst'
  | 'phoenix-special-rise'
  | 'phoenix-special-manifest'
  // Darkhold & sub-ability presets (Scarlet / Dark-Red Eldritch)
  | 'darkhold-open'
  | 'darkhold-close'
  | 'telekinetic-explosion'
  | 'auto-shield-on'
  | 'auto-shield-deflect'
  | 'darkhold-sub'
  // Emma Frost (Icy Cyan / Crystal White)
  | 'mind-control-link'
  | 'mind-control-select'
  | 'mental-attack'
  | 'mental-impact'
  | 'diamond-on'
  | 'diamond-off'
  | 'diamond-shard'
  | 'telepathic-wave'
  // Hela (Emerald Green / Obsidian Death)
  | 'crown-on'
  | 'crown-off'
  | 'sword-summon'
  | 'sword-throw'
  | 'sword-slash'
  | 'sword-embed'
  | 'green-charge'
  | 'green-explosion'
  | 'spinning-leap'
  | 'hero-landing'
  | 'ground-sword'
  // Magneto (Purple Magnetism / Metallic Lightning)
  | 'magneto-flight-on'
  | 'magneto-flight-off'
  | 'magneto-throw'
  | 'magneto-meteor-charge'
  | 'magneto-meteor-impact'
  | 'magneto-shield-on'
  | 'magneto-shield-off'
  | 'magneto-tornado'
  // Quicksilver (Neon Green Speed / Lightning)
  | 'qs-speed-on'
  | 'qs-speed-off'
  | 'qs-punch-hit'
  | 'qs-punch-finisher'
  | 'qs-tornado'
  | 'qs-time-stop'
  // Doctor Strange / Ancient One (Mystic Amber/Orange Eldritch)
  | 'strange-cloak-on'
  | 'strange-cloak-off'
  | 'strange-shield-on'
  | 'strange-shield-off'
  | 'strange-clones'
  | 'strange-disc'
  | 'astral-extract-strike'
  | 'phoenix-dive-launch'
  | 'phoenix-dive-impact'
  // Vision (Mind Stone Solar Gold)
  | 'vision-flight-on'
  | 'vision-flight-off'
  | 'vision-phase-on'
  | 'vision-phase-off'
  | 'vision-laser'
  | 'vision-bolt'
  | 'vision-bolt-small'
  | 'vision-bolt-charge'
  | 'vision-bolt-explode'
  | 'vision-head-grip'
  | 'vision-head-slam'
  // Emma Astral & Universal Kill Heal
  | 'astral-on'
  | 'astral-off'
  | 'kill-heal'
  // Agatha Harkness (Dark Purple Corrupted Witchcraft)
  | 'agatha-bolt'
  | 'agatha-drain-start'
  | 'agatha-shield-on'
  | 'agatha-shield-explode'
  // Scarlet Witch Supreme / Zombie & Purgatory's Grasp
  | 'chaos-drain-bolt'
  | 'zombie-beam'
  | 'zombie-stone-charge'
  | 'zombie-stone-explode'
  | 'purgatory-grasp'
  // Invisible Woman (Cobalt / Luminous Sky-Blue Forcefields)
  | 'invisible-flight-on'
  | 'invisible-flight-off'
  | 'invisibility-on'
  | 'invisibility-off'
  | 'forcefield-shield-on'
  | 'forcefield-shield-off'
  | 'forcefield-transfer'
  | 'forcefield-protection'
  | 'forcefield-suffocation'
  | 'forcefield-barrier-cast'
  | 'forcefield-barrier-hit'
  // Vampire / Rogue (Solar Gold & Emerald)
  | 'vampire-flight-on'
  | 'vampire-flight-off'
  | 'vampire-stomp-dive'
  | 'vampire-stomp-impact'
  | 'vampire-bolt'
  | 'vampire-absorb-start'
  | 'vampire-absorb-complete'
  // Captain America (Vibranium Kinetic Blue & Crimson-White)
  | 'cap-shield-throw'
  | 'cap-shield-hit'
  | 'cap-shield-catch'
  | 'cap-shield-defense-on'
  | 'cap-shield-defense-off'
  | 'cap-combo-hit'
  | 'cap-combo-finisher'
  | 'cap-charge-start'
  | 'cap-charge-hit'
  // Thor (Asgardian Storm Electric Blue & White)
  | 'thor-combo-hit'
  | 'thor-combo-finisher'
  | 'thor-hammer-throw'
  | 'thor-hammer-impact'
  | 'thor-hammer-catch'
  | 'thor-slam-launch'
  | 'thor-slam-impact'
  | 'thor-storm-channel'
  | 'thor-storm-beam'
  // Silver Surfer (Cosmic Chrome & Silver Lightning)
  | 'silver-flight-on'
  | 'silver-flight-off'
  | 'silver-absorb-on'
  | 'silver-absorb-off'
  | 'silver-absorb-hit'
  | 'sonic-blast'
  | 'cosmic-blast-charge'
  | 'cosmic-blast-cast'
  | 'cosmic-blast-impact'
  | 'dual-cosmic-beam'
  // Storm (Lightning Gold-White, Wind & Frost Ice)
  | 'storm-flight-on'
  | 'storm-flight-off'
  | 'lightning-strike-rise'
  | 'lightning-strike-impact'
  | 'storm-tornado-on'
  | 'storm-tornado-off'
  | 'ice-spear-create'
  | 'ice-spear-launch'
  | 'ice-spear-shatter'
  | 'wind-blast-on'
  | 'wind-blast-off';

export interface ScreenFxState {
  active: boolean;
  flashColor: string;
  flashOpacity: number;
  vignetteColor: string;
  vignetteOpacity: number;
  glowColor: string;
  glowOpacity: number;
  pulseColor: string;
  pulseOpacity: number;
  pulseProgress: number; // 0..1
  blurPx: number;
}

interface PaletteColors {
  flash: string;
  vignette: string;
  glow: string;
  pulse: string;
  lightHex: number;
}

const PALETTES: Record<VisualIdentity, PaletteColors> = {
  'scarlet-witch': {
    flash: 'rgba(255, 56, 88, 1)',
    vignette: 'rgba(130, 8, 28, 1)',
    glow: 'rgba(235, 24, 58, 1)',
    pulse: 'rgba(255, 78, 108, 1)',
    lightHex: 0xff284d,
  },
  phoenix: {
    flash: 'rgba(255, 212, 92, 1)',
    vignette: 'rgba(218, 88, 6, 1)',
    glow: 'rgba(255, 168, 32, 1)',
    pulse: 'rgba(255, 232, 132, 1)',
    lightHex: 0xffb32c,
  },
  'dark-phoenix': {
    flash: 'rgba(255, 86, 28, 1)',
    vignette: 'rgba(128, 10, 4, 1)',
    glow: 'rgba(235, 52, 12, 1)',
    pulse: 'rgba(255, 108, 42, 1)',
    lightHex: 0xff4412,
  },
  'white-phoenix': {
    flash: 'rgba(255, 255, 255, 1)',
    vignette: 'rgba(195, 224, 255, 1)',
    glow: 'rgba(235, 246, 255, 1)',
    pulse: 'rgba(255, 255, 255, 1)',
    lightHex: 0xf4f9ff,
  },
  'emma-frost': {
    flash: 'rgba(225, 248, 255, 1)',
    vignette: 'rgba(34, 108, 168, 1)',
    glow: 'rgba(135, 220, 255, 1)',
    pulse: 'rgba(212, 244, 255, 1)',
    lightHex: 0x9edbff,
  },
  hela: {
    flash: 'rgba(128, 255, 168, 1)',
    vignette: 'rgba(10, 82, 34, 1)',
    glow: 'rgba(38, 218, 98, 1)',
    pulse: 'rgba(92, 246, 142, 1)',
    lightHex: 0x3ce66b,
  },
  magneto: {
    flash: 'rgba(218, 142, 255, 1)',
    vignette: 'rgba(72, 18, 118, 1)',
    glow: 'rgba(182, 76, 255, 1)',
    pulse: 'rgba(210, 118, 255, 1)',
    lightHex: 0xb64eff,
  },
  quicksilver: {
    flash: 'rgba(150, 232, 255, 1)',
    vignette: 'rgba(14, 72, 138, 1)',
    glow: 'rgba(56, 189, 248, 1)',
    pulse: 'rgba(186, 230, 253, 1)',
    lightHex: 0x38bdf8,
  },
  speed: {
    flash: 'rgba(148, 255, 198, 1)',
    vignette: 'rgba(12, 92, 54, 1)',
    glow: 'rgba(56, 255, 148, 1)',
    pulse: 'rgba(116, 255, 186, 1)',
    lightHex: 0x3cff9a,
  },
  'doctor-strange': {
    flash: 'rgba(255, 206, 118, 1)',
    vignette: 'rgba(138, 52, 8, 1)',
    glow: 'rgba(255, 148, 38, 1)',
    pulse: 'rgba(255, 188, 78, 1)',
    lightHex: 0xff9a2e,
  },
  vision: {
    flash: 'rgba(255, 244, 152, 1)',
    vignette: 'rgba(148, 108, 10, 1)',
    glow: 'rgba(255, 214, 62, 1)',
    pulse: 'rgba(255, 234, 118, 1)',
    lightHex: 0xffd638,
  },
  'agatha-harkness': {
    flash: 'rgba(182, 88, 255, 1)',
    vignette: 'rgba(64, 10, 114, 1)',
    glow: 'rgba(142, 36, 232, 1)',
    pulse: 'rgba(196, 112, 255, 1)',
    lightHex: 0x8e24e8,
  },
  'invisible-woman': {
    flash: 'rgba(150, 232, 255, 1)',
    vignette: 'rgba(14, 72, 138, 1)',
    glow: 'rgba(56, 189, 248, 1)',
    pulse: 'rgba(186, 230, 253, 1)',
    lightHex: 0x38bdf8,
  },
  vampire: {
    flash: 'rgba(255, 224, 96, 1)',
    vignette: 'rgba(20, 96, 46, 1)',
    glow: 'rgba(244, 196, 48, 1)',
    pulse: 'rgba(255, 240, 148, 1)',
    lightHex: 0xf4c430,
  },
  'captain-america': {
    flash: 'rgba(186, 230, 253, 1)',
    vignette: 'rgba(18, 56, 128, 1)',
    glow: 'rgba(96, 165, 250, 1)',
    pulse: 'rgba(239, 68, 68, 1)',
    lightHex: 0x3b82f6,
  },
  thor: {
    flash: 'rgba(180, 244, 255, 1)',
    vignette: 'rgba(14, 72, 138, 1)',
    glow: 'rgba(56, 189, 248, 1)',
    pulse: 'rgba(124, 228, 255, 1)',
    lightHex: 0x6ce2ff,
  },
  'silver-surfer': {
    flash: 'rgba(226, 246, 255, 1)',
    vignette: 'rgba(38, 62, 92, 1)',
    glow: 'rgba(176, 224, 255, 1)',
    pulse: 'rgba(214, 240, 255, 1)',
    lightHex: 0xbfe8ff,
  },
  storm: {
    flash: 'rgba(255, 250, 196, 1)',
    vignette: 'rgba(22, 64, 114, 1)',
    glow: 'rgba(148, 226, 255, 1)',
    pulse: 'rgba(255, 236, 128, 1)',
    lightHex: 0x9ce2ff,
  },
};

interface ActiveZoomPulse {
  elapsed: number;
  inDuration: number;
  holdDuration: number;
  outDuration: number;
  peakDistanceOffset: number; // negative = zoom in, positive = pull out
  peakFovOffset: number;
  priority: number;
}

interface ActiveLightPulse {
  elapsed: number;
  duration: number;
  peakIntensity: number;
  colorHex: number;
  position: THREE.Vector3;
  followPlayer: boolean;
  peakExposure: number;
}

interface ActiveScreenLayer {
  elapsed: number;
  attack: number;
  decay: number;
  peakOpacity: number;
  color: string;
}

interface ActiveRingPulse {
  elapsed: number;
  duration: number;
  peakOpacity: number;
  color: string;
}

function easeOutCubic(t: number): number {
  const inv = 1 - THREE.MathUtils.clamp(t, 0, 1);
  return 1 - inv * inv * inv;
}

function easeInOutQuad(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function resolveVisualIdentity(
  archetype: CharacterArchetype,
  skinVariant: PhoenixSkinVariant,
  skinId?: string,
): VisualIdentity {
  if (archetype === 'phoenix-force') {
    if (skinVariant === 'dark-phoenix') return 'dark-phoenix';
    if (skinVariant === 'white-phoenix') return 'white-phoenix';
    return 'phoenix';
  }
  if (archetype === 'emma-frost') {
    return 'emma-frost';
  }
  if (archetype === 'hela') {
    return 'hela';
  }
  if (archetype === 'magneto') {
    return 'magneto';
  }
  if (archetype === 'quicksilver') {
    return skinId === 'speed' ? 'speed' : 'quicksilver';
  }
  if (archetype === 'doctor-strange') {
    return 'doctor-strange';
  }
  if (archetype === 'vision') {
    return 'vision';
  }
  if (archetype === 'agatha-harkness') {
    return 'agatha-harkness';
  }
  if (archetype === 'invisible-woman') {
    return 'invisible-woman';
  }
  if (archetype === 'vampire') {
    return 'vampire';
  }
  if (archetype === 'captain-america') {
    return 'captain-america';
  }
  if (archetype === 'thor') {
    return 'thor';
  }
  if (archetype === 'silver-surfer') {
    return 'silver-surfer';
  }
  if (archetype === 'storm') {
    return 'storm';
  }
  return 'scarlet-witch';
}

/**
 * Coordinates synchronized, ability-specific camera zoom, trauma shake,
 * dynamic 3D lighting, exposure flares, and GPU-friendly screen FX overlays.
 *
 * Strictly preserves player's base camera distance, yaw/pitch, and sensitivity:
 * all offsets decay cleanly to zero and reset immediately on cancel/death.
 */
export class CinematicFxController {
  private identity: VisualIdentity = 'scarlet-witch';
  private allowSubtleBlur = true;

  private time = 0;
  private trauma = 0;
  private shakeSeed = 0;

  // Zoom state
  private zoomPulse: ActiveZoomPulse | null = null;
  private sustainedZoomTarget = 0;
  private sustainedFovTarget = 0;
  private smoothZoomOffset = 0;
  private smoothFovOffset = 0;

  // Sustained screen vignette & optional subtle screen glow (e.g. Teleport vanish, Invisibility tint)
  private sustainedVignetteTarget = 0;
  private sustainedVignetteColor = PALETTES['scarlet-witch'].vignette;
  private smoothSustainedVignette = 0;
  private sustainedGlowTarget = 0;
  private sustainedGlowColor = PALETTES['invisible-woman'].glow;
  private smoothSustainedGlow = 0;

  // Transient screen layers (capped & blended to prevent flicker)
  private flashLayer: ActiveScreenLayer | null = null;
  private vignetteLayer: ActiveScreenLayer | null = null;
  private glowLayer: ActiveScreenLayer | null = null;
  private ringPulse: ActiveRingPulse | null = null;
  private blurTimer = 0;
  private blurDuration = 0.16;
  private blurPeak = 0;

  // Pre-allocated backing objects for zero-GC cue triggers
  private readonly _zoomPulseObj: ActiveZoomPulse = {
    elapsed: 0,
    inDuration: 0,
    holdDuration: 0,
    outDuration: 0,
    peakDistanceOffset: 0,
    peakFovOffset: 0,
    priority: 0,
  };
  private readonly _lightPulseObj: ActiveLightPulse = {
    elapsed: 0,
    duration: 0,
    peakIntensity: 0,
    colorHex: 0,
    position: new THREE.Vector3(),
    followPlayer: false,
    peakExposure: 0,
  };
  private readonly _flashLayerObj: ActiveScreenLayer = {
    elapsed: 0,
    attack: 0,
    decay: 0,
    peakOpacity: 0,
    color: '',
  };
  private readonly _vignetteLayerObj: ActiveScreenLayer = {
    elapsed: 0,
    attack: 0,
    decay: 0,
    peakOpacity: 0,
    color: '',
  };
  private readonly _glowLayerObj: ActiveScreenLayer = {
    elapsed: 0,
    attack: 0,
    decay: 0,
    peakOpacity: 0,
    color: '',
  };
  private readonly _ringPulseObj: ActiveRingPulse = {
    elapsed: 0,
    duration: 0,
    peakOpacity: 0,
    color: '',
  };

  // Dynamic 3D ability light & exposure
  private lightPulse: ActiveLightPulse | null = null;
  private smoothLightIntensity = 0;
  private smoothExposureBoost = 0;
  private readonly currentLightPos = new THREE.Vector3();
  private readonly currentLightColor = new THREE.Color(0xff284d);

  // Reusable output state (zero GC per frame)
  public readonly shakeLocalOffset = new THREE.Vector3();
  public shakeRollRad = 0;
  public zoomOffset = 0;
  public fovOffset = 0;
  public exposureBoost = 0;
  public lightIntensity = 0;
  public readonly lightPos = new THREE.Vector3();
  public readonly lightColor = new THREE.Color(0xff284d);

  public readonly screenFx: ScreenFxState = {
    active: false,
    flashColor: PALETTES['scarlet-witch'].flash,
    flashOpacity: 0,
    vignetteColor: PALETTES['scarlet-witch'].vignette,
    vignetteOpacity: 0,
    glowColor: PALETTES['scarlet-witch'].glow,
    glowOpacity: 0,
    pulseColor: PALETTES['scarlet-witch'].pulse,
    pulseOpacity: 0,
    pulseProgress: 0,
    blurPx: 0,
  };

  public setIdentity(
    archetype: CharacterArchetype,
    skinVariant: PhoenixSkinVariant,
    skinId?: string,
  ): void {
    this.identity = resolveVisualIdentity(archetype, skinVariant, skinId);
    this.sustainedVignetteColor = PALETTES[this.identity].vignette;
  }

  public setAllowSubtleBlur(allowed: boolean): void {
    this.allowSubtleBlur = allowed;
    if (!allowed) {
      this.blurTimer = 0;
      this.blurPeak = 0;
    }
  }

  public triggerCue(
    cue: CinematicCueId,
    worldPos?: THREE.Vector3,
  ): void {
    const pal = PALETTES[this.identity];
    const pos = worldPos ?? this.currentLightPos;

    switch (cue) {
      // ============================================================
      // SCARLET WITCH (Crimson & Dark-Red Chaos Magic)
      // ============================================================
      case 'chaos-bolt-cast': {
        this.addTrauma(0.14);
        this.pushZoomPulse(-0.32, -1.5, 0.08, 0.04, 0.24, 1);
        this.pushLightPulse(pos, pal.lightHex, 3.4, 0.22, true, 0.04);
        this.pushGlow(pal.glow, 0.14, 0.04, 0.2);
        this.pushVignette(pal.vignette, 0.14, 0.05, 0.22);
        break;
      }

      case 'chaos-bolt-impact': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.18, -0.9, 0.04, 0.02, 0.2, 2);
        this.pushLightPulse(pos, 0xff3b5c, 4.6, 0.24, false, 0.06);
        this.pushFlash(pal.flash, 0.14, 0.02, 0.14);
        this.pushRingPulse(pal.pulse, 0.24, 0.34);
        break;
      }

      case 'teleport-vanish': {
        this.addTrauma(0.12);
        this.sustainedZoomTarget = -0.78;
        this.sustainedFovTarget = -3.2;
        this.sustainedVignetteTarget = 0.36;
        this.sustainedVignetteColor = 'rgba(96, 4, 22, 1)';
        this.pushLightPulse(pos, 0xd81038, 4.2, 0.48, true, 0.04);
        this.pushGlow('rgba(195, 14, 48, 1)', 0.22, 0.08, 0.42);
        this.pushBlur(0.85, 0.42);
        break;
      }

      case 'teleport-arrive': {
        this.sustainedZoomTarget = 0;
        this.sustainedFovTarget = 0;
        this.sustainedVignetteTarget = 0;
        this.addTrauma(0.34);
        this.pushZoomPulse(0.42, 2.0, 0.05, 0.04, 0.36, 4);
        this.pushLightPulse(pos, 0xff3b62, 5.8, 0.32, true, 0.11);
        this.pushFlash('rgba(255, 76, 108, 1)', 0.26, 0.02, 0.24);
        this.pushVignette(pal.vignette, 0.28, 0.03, 0.3);
        this.pushRingPulse('rgba(255, 92, 124, 1)', 0.36, 0.45);
        break;
      }

      case 'chaos-implosion-cast': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.46, -2.1, 0.1, 0.06, 0.26, 3);
        this.pushLightPulse(pos, 0xd91236, 4.2, 0.3, true, 0.05);
        this.pushGlow(pal.glow, 0.2, 0.06, 0.28);
        this.pushVignette('rgba(110, 6, 24, 1)', 0.22, 0.06, 0.28);
        break;
      }

      case 'chaos-implosion-detonate': {
        this.addTrauma(0.68);
        this.pushZoomPulse(0.68, 3.4, 0.07, 0.08, 0.58, 6);
        this.pushLightPulse(pos, 0xff1e48, 7.2, 0.52, false, 0.15);
        this.pushFlash('rgba(255, 42, 78, 1)', 0.34, 0.025, 0.32);
        this.pushVignette('rgba(105, 4, 22, 1)', 0.4, 0.04, 0.48);
        this.pushGlow(pal.glow, 0.3, 0.04, 0.45);
        this.pushRingPulse('rgba(255, 64, 98, 1)', 0.48, 0.55);
        this.pushBlur(1.2, 0.22);
        break;
      }

      case 'scarlet-flight-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(0.32, 1.4, 0.12, 0.06, 0.34, 2);
        this.pushLightPulse(pos, 0xe81e46, 3.8, 0.38, true, 0.05);
        this.pushGlow(pal.glow, 0.18, 0.08, 0.32);
        this.pushVignette(pal.vignette, 0.2, 0.08, 0.32);
        break;
      }

      case 'scarlet-flight-off': {
        this.pushGlow(pal.glow, 0.1, 0.04, 0.18);
        break;
      }

      case 'scarlet-flight-cancel': {
        this.addTrauma(0.62);
        this.pushZoomPulse(0.58, 2.8, 0.06, 0.06, 0.46, 5);
        this.pushLightPulse(pos, 0xff224c, 6.6, 0.46, true, 0.13);
        this.pushFlash('rgba(255, 52, 86, 1)', 0.32, 0.02, 0.28);
        this.pushVignette('rgba(120, 6, 26, 1)', 0.36, 0.04, 0.42);
        this.pushRingPulse('rgba(255, 72, 102, 1)', 0.44, 0.54);
        this.pushBlur(1.0, 0.18);
        break;
      }

      // ============================================================
      // PHOENIX FORCE / DARK PHOENIX
      // ============================================================
      case 'phoenix-wave-cast': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.4, -1.8, 0.09, 0.05, 0.24, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.2, 0.26, true, 0.06);
        this.pushGlow(pal.glow, 0.18, 0.05, 0.24);
        break;
      }

      case 'phoenix-wave-step-0': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.24, 1.1, 0.05, 0.03, 0.24, 3);
        this.pushLightPulse(pos, pal.lightHex, 5.0, 0.28, false, 0.08);
        this.pushFlash(pal.flash, 0.18, 0.02, 0.18);
        this.pushVignette(pal.vignette, 0.2, 0.03, 0.22);
        this.pushRingPulse(pal.pulse, 0.32, 0.36);
        break;
      }

      case 'phoenix-wave-step-1': {
        this.addTrauma(0.42);
        this.pushZoomPulse(0.32, 1.5, 0.05, 0.03, 0.28, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.8, 0.32, false, 0.1);
        this.pushFlash(pal.flash, 0.24, 0.02, 0.22);
        this.pushVignette(pal.vignette, 0.26, 0.03, 0.26);
        this.pushRingPulse(pal.pulse, 0.36, 0.42);
        break;
      }

      case 'phoenix-wave-step-2': {
        this.addTrauma(0.66);
        this.pushZoomPulse(0.6, 3.0, 0.07, 0.08, 0.56, 6);
        this.pushLightPulse(pos, pal.lightHex, 7.6, 0.52, false, 0.16);
        this.pushFlash(pal.flash, 0.36, 0.025, 0.34);
        this.pushVignette(pal.vignette, 0.36, 0.04, 0.46);
        this.pushGlow(pal.glow, 0.32, 0.04, 0.44);
        this.pushRingPulse(pal.pulse, 0.5, 0.56);
        this.pushBlur(1.15, 0.2);
        break;
      }

      case 'phoenix-fireball-cast': {
        this.addTrauma(0.15);
        this.pushZoomPulse(-0.26, -1.2, 0.07, 0.03, 0.2, 1);
        this.pushLightPulse(pos, pal.lightHex, 3.4, 0.2, true, 0.04);
        this.pushGlow(pal.glow, 0.14, 0.03, 0.18);
        break;
      }

      case 'phoenix-fireball-impact': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.16, -0.8, 0.04, 0.02, 0.18, 2);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.24, false, 0.07);
        this.pushFlash(pal.flash, 0.15, 0.02, 0.15);
        this.pushRingPulse(pal.pulse, 0.24, 0.32);
        break;
      }

      case 'pain-start': {
        this.addTrauma(0.22);
        this.sustainedZoomTarget = -0.58;
        this.sustainedFovTarget = -2.4;
        this.sustainedVignetteTarget = 0.26;
        this.sustainedVignetteColor =
          this.identity === 'dark-phoenix'
            ? 'rgba(148, 18, 8, 1)'
            : this.identity === 'white-phoenix'
              ? 'rgba(180, 214, 255, 1)'
              : 'rgba(195, 110, 24, 1)';
        this.pushZoomPulse(-0.35, -1.6, 0.12, 0.08, 0.24, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.6, 0.42, true, 0.06);
        this.pushGlow(pal.glow, 0.22, 0.08, 0.34);
        break;
      }

      case 'pain-tick': {
        this.addTrauma(0.14);
        this.pushLightPulse(pos, pal.lightHex, 3.2, 0.22, true, 0.03);
        this.pushGlow(pal.glow, 0.16, 0.04, 0.2);
        break;
      }

      case 'pain-cancel': {
        this.sustainedZoomTarget = 0;
        this.sustainedFovTarget = 0;
        this.sustainedVignetteTarget = 0;
        break;
      }

      case 'pain-explosion': {
        this.sustainedZoomTarget = 0;
        this.sustainedFovTarget = 0;
        this.sustainedVignetteTarget = 0;
        this.addTrauma(0.72);
        this.pushZoomPulse(0.7, 3.6, 0.07, 0.09, 0.6, 7);
        this.pushLightPulse(pos, pal.lightHex, 7.8, 0.54, true, 0.17);
        this.pushFlash(pal.flash, 0.38, 0.025, 0.36);
        this.pushVignette(pal.vignette, 0.36, 0.04, 0.48);
        this.pushGlow(pal.glow, 0.34, 0.04, 0.46);
        this.pushRingPulse(pal.pulse, 0.52, 0.58);
        this.pushBlur(1.25, 0.22);
        break;
      }

      case 'phoenix-flight-on': {
        this.addTrauma(0.28);
        this.pushZoomPulse(-0.56, -2.5, 0.14, 0.12, 0.42, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.4, 0.5, true, 0.1);
        this.pushFlash(pal.flash, 0.22, 0.04, 0.28);
        this.pushGlow(pal.glow, 0.26, 0.08, 0.38);
        this.pushVignette(pal.vignette, 0.22, 0.08, 0.34);
        this.pushRingPulse(pal.pulse, 0.42, 0.42);
        break;
      }

      case 'phoenix-flight-off': {
        this.pushGlow(pal.glow, 0.1, 0.04, 0.18);
        break;
      }

      case 'wings-on': {
        this.addTrauma(0.12);
        this.pushZoomPulse(-0.22, -1.0, 0.09, 0.04, 0.24, 1);
        this.pushLightPulse(pos, pal.lightHex, 3.6, 0.3, true, 0.05);
        this.pushGlow(pal.glow, 0.18, 0.06, 0.26);
        break;
      }

      case 'wings-off': {
        this.pushGlow(pal.glow, 0.08, 0.03, 0.16);
        break;
      }

      // ============================================================
      // DEATH & REVIVAL SEQUENCE
      // ============================================================
      case 'death': {
        this.cancelSustainedCues();
        this.addTrauma(0.54);
        this.pushZoomPulse(0.45, 2.2, 0.06, 0.1, 0.45, 7);
        this.pushFlash('rgba(255, 50, 68, 1)', 0.24, 0.02, 0.26);
        this.pushVignette('rgba(80, 6, 18, 1)', 0.38, 0.06, 0.65);
        this.pushBlur(1.0, 0.2);
        break;
      }

      case 'revival-charge': {
        this.addTrauma(0.2);
        this.sustainedZoomTarget = -1.12;
        this.sustainedFovTarget = -4.0;
        this.sustainedVignetteTarget = 0.34;
        this.sustainedVignetteColor = pal.vignette;
        this.pushLightPulse(pos, pal.lightHex, 5.2, 0.42, true, 0.08);
        this.pushGlow(pal.glow, 0.28, 0.14, 0.35);
        break;
      }

      case 'revival-burst': {
        this.sustainedZoomTarget = 0;
        this.sustainedFovTarget = 0;
        this.sustainedVignetteTarget = 0;
        this.addTrauma(0.76);
        this.pushZoomPulse(0.65, 3.2, 0.06, 0.1, 0.66, 8);
        this.pushLightPulse(pos, pal.lightHex, 8.5, 0.65, true, 0.18);
        this.pushFlash(pal.flash, 0.4, 0.025, 0.42);
        this.pushVignette(pal.vignette, 0.38, 0.04, 0.55);
        this.pushGlow(pal.glow, 0.36, 0.04, 0.52);
        this.pushRingPulse(pal.pulse, 0.56, 0.62);
        this.pushBlur(1.3, 0.24);
        break;
      }

      // ============================================================
      // DARKHOLD & SUB-ABILITIES (Crimson / Eldritch Dark-Red)
      // ============================================================
      case 'darkhold-open': {
        this.addTrauma(0.06);
        this.pushZoomPulse(-0.32, -1.35, 0.18, 0.08, 0.36, 3);
        this.pushLightPulse(pos, 0xa80b24, 3.8, 0.5, true, 0.06);
        this.pushVignette('rgba(78, 4, 16, 1)', 0.24, 0.12, 0.48);
        this.pushGlow('rgba(195, 16, 40, 1)', 0.18, 0.12, 0.42);
        break;
      }

      case 'darkhold-close': {
        this.addTrauma(0.14);
        this.pushZoomPulse(0.24, 1.1, 0.06, 0.03, 0.26, 2);
        this.pushLightPulse(pos, 0x9e0a24, 3.2, 0.26, true, 0.04);
        this.pushVignette('rgba(64, 4, 14, 1)', 0.18, 0.04, 0.28);
        break;
      }

      case 'telekinetic-explosion': {
        this.addTrauma(0.74);
        this.pushZoomPulse(0.72, 3.5, 0.06, 0.08, 0.56, 7);
        this.pushLightPulse(pos, 0xff1640, 8.0, 0.54, true, 0.17);
        this.pushFlash('rgba(255, 36, 72, 1)', 0.36, 0.02, 0.34);
        this.pushVignette('rgba(96, 4, 20, 1)', 0.4, 0.04, 0.48);
        this.pushGlow('rgba(235, 22, 58, 1)', 0.34, 0.04, 0.46);
        this.pushRingPulse('rgba(255, 76, 108, 1)', 0.5, 0.58);
        this.pushBlur(1.25, 0.22);
        break;
      }

      case 'auto-shield-on': {
        this.addTrauma(0.26);
        this.pushZoomPulse(-0.44, -2.0, 0.1, 0.06, 0.32, 4);
        this.pushLightPulse(pos, 0xff2a58, 5.4, 0.4, true, 0.09);
        this.pushFlash('rgba(255, 64, 100, 1)', 0.2, 0.025, 0.2);
        this.pushVignette('rgba(105, 6, 26, 1)', 0.26, 0.05, 0.36);
        this.pushGlow('rgba(245, 34, 72, 1)', 0.26, 0.05, 0.34);
        this.pushRingPulse('rgba(255, 86, 118, 1)', 0.38, 0.44);
        break;
      }

      case 'auto-shield-deflect': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.28, 1.3, 0.04, 0.03, 0.24, 3);
        this.pushLightPulse(pos, 0xff3660, 5.6, 0.28, true, 0.08);
        this.pushFlash('rgba(255, 58, 92, 1)', 0.18, 0.015, 0.16);
        this.pushRingPulse('rgba(255, 92, 124, 1)', 0.28, 0.42);
        break;
      }

      case 'darkhold-sub': {
        this.addTrauma(0.46);
        this.pushZoomPulse(0.48, 2.4, 0.07, 0.06, 0.44, 5);
        this.pushLightPulse(pos, 0xe81438, 6.2, 0.42, false, 0.12);
        this.pushFlash('rgba(235, 28, 56, 1)', 0.26, 0.02, 0.28);
        this.pushVignette('rgba(92, 4, 20, 1)', 0.32, 0.04, 0.4);
        this.pushRingPulse('rgba(255, 58, 86, 1)', 0.42, 0.5);
        break;
      }

      // ============================================================
      // PHOENIX SPECIAL REVIVAL (Rising Fire Sphere -> 4s Manifest)
      // ============================================================
      case 'phoenix-special-rise': {
        this.addTrauma(0.24);
        this.sustainedZoomTarget = 0.72;
        this.sustainedFovTarget = 2.6;
        this.sustainedVignetteTarget = 0.3;
        this.sustainedVignetteColor = pal.vignette;
        this.pushLightPulse(pos, pal.lightHex, 5.8, 1.05, true, 0.09);
        this.pushGlow(pal.glow, 0.26, 0.14, 0.85);
        break;
      }

      case 'phoenix-special-manifest': {
        this.sustainedZoomTarget = 0.55;
        this.sustainedFovTarget = 2.2;
        this.sustainedVignetteTarget = 0.22;
        this.addTrauma(0.68);
        this.pushZoomPulse(0.68, 3.2, 0.06, 0.12, 0.65, 8);
        this.pushLightPulse(pos, pal.lightHex, 8.8, 1.15, true, 0.18);
        this.pushFlash(pal.flash, 0.38, 0.025, 0.42);
        this.pushVignette(pal.vignette, 0.34, 0.04, 0.55);
        this.pushGlow(pal.glow, 0.34, 0.05, 0.6);
        this.pushRingPulse(pal.pulse, 0.6, 0.62);
        this.pushBlur(1.2, 0.24);
        break;
      }

      // ============================================================
      // EMMA FROST (Icy Cyan & Crystal White)
      // ============================================================
      case 'mind-control-link': {
        this.addTrauma(0.14);
        this.pushZoomPulse(-0.34, -1.5, 0.1, 0.05, 0.28, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.4, 0.36, true, 0.06);
        this.pushFlash(pal.flash, 0.14, 0.02, 0.18);
        this.pushGlow(pal.glow, 0.22, 0.05, 0.3);
        this.pushVignette(pal.vignette, 0.2, 0.05, 0.28);
        break;
      }

      case 'mind-control-select': {
        this.addTrauma(0.24);
        this.pushZoomPulse(0.24, 1.1, 0.05, 0.04, 0.24, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.28, true, 0.08);
        this.pushFlash(pal.flash, 0.2, 0.02, 0.2);
        this.pushRingPulse(pal.pulse, 0.32, 0.42);
        break;
      }

      case 'mental-attack': {
        this.addTrauma(0.14);
        this.pushZoomPulse(-0.36, -1.7, 0.07, 0.04, 0.22, 2);
        this.pushLightPulse(pos, 0xbceeff, 3.8, 0.22, true, 0.05);
        this.pushGlow(pal.glow, 0.16, 0.03, 0.2);
        break;
      }

      case 'mental-impact': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.22, 1.0, 0.03, 0.02, 0.2, 3);
        this.pushLightPulse(pos, 0xffffff, 5.2, 0.22, false, 0.09);
        this.pushFlash('rgba(235, 250, 255, 1)', 0.22, 0.015, 0.18);
        this.pushRingPulse(pal.pulse, 0.26, 0.44);
        break;
      }

      case 'diamond-on': {
        this.addTrauma(0.28);
        this.pushZoomPulse(-0.56, -2.5, 0.12, 0.08, 0.38, 5);
        this.pushLightPulse(pos, 0xd8f4ff, 6.2, 0.48, true, 0.12);
        this.pushFlash('rgba(230, 248, 255, 1)', 0.28, 0.025, 0.28);
        this.pushGlow(pal.glow, 0.26, 0.06, 0.38);
        this.pushVignette(pal.vignette, 0.22, 0.06, 0.34);
        this.pushRingPulse('rgba(225, 248, 255, 1)', 0.44, 0.5);
        break;
      }

      case 'diamond-off': {
        this.pushGlow(pal.glow, 0.12, 0.03, 0.2);
        break;
      }

      case 'diamond-shard': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.2, -0.9, 0.04, 0.02, 0.18, 2);
        this.pushLightPulse(pos, 0xc8eeff, 3.8, 0.2, false, 0.05);
        this.pushFlash(pal.flash, 0.14, 0.015, 0.14);
        break;
      }

      case 'telepathic-wave': {
        this.addTrauma(0.28);
        this.pushZoomPulse(-0.44, -2.0, 0.1, 0.12, 0.42, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.2, 0.46, true, 0.08);
        this.pushGlow(pal.glow, 0.24, 0.06, 0.4);
        this.pushVignette(pal.vignette, 0.24, 0.06, 0.42);
        this.pushRingPulse(pal.pulse, 0.42, 0.48);
        break;
      }

      // ============================================================
      // HELA (Emerald Green & Obsidian Death Magic)
      // ============================================================
      case 'crown-on': {
        this.addTrauma(0.36);
        this.pushZoomPulse(-0.62, -2.8, 0.14, 0.1, 0.4, 5);
        this.pushLightPulse(pos, pal.lightHex, 6.4, 0.52, true, 0.11);
        this.pushFlash(pal.flash, 0.24, 0.025, 0.28);
        this.pushVignette(pal.vignette, 0.3, 0.06, 0.44);
        this.pushGlow(pal.glow, 0.28, 0.06, 0.4);
        this.pushRingPulse(pal.pulse, 0.46, 0.5);
        break;
      }

      case 'crown-off': {
        this.pushGlow(pal.glow, 0.12, 0.03, 0.2);
        break;
      }

      case 'sword-summon': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.36, -1.6, 0.08, 0.05, 0.28, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.32, true, 0.07);
        this.pushFlash(pal.flash, 0.18, 0.02, 0.2);
        this.pushRingPulse(pal.pulse, 0.34, 0.4);
        break;
      }

      case 'sword-throw': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.24, -1.1, 0.05, 0.02, 0.18, 2);
        this.pushLightPulse(pos, pal.lightHex, 3.6, 0.2, true, 0.05);
        break;
      }

      case 'sword-slash': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.26, -1.15, 0.04, 0.02, 0.18, 2);
        this.pushLightPulse(pos, 0x38ff78, 4.2, 0.22, false, 0.06);
        this.pushFlash(pal.flash, 0.12, 0.015, 0.14);
        break;
      }

      case 'sword-embed': {
        this.addTrauma(0.34);
        this.pushZoomPulse(0.24, 1.1, 0.03, 0.02, 0.22, 3);
        this.pushLightPulse(pos, pal.lightHex, 5.0, 0.24, false, 0.07);
        this.pushFlash(pal.flash, 0.16, 0.015, 0.16);
        this.pushRingPulse(pal.pulse, 0.26, 0.38);
        break;
      }

      case 'green-charge': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.48, -2.2, 0.26, 0.08, 0.18, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.6, 0.4, true, 0.06);
        this.pushGlow(pal.glow, 0.22, 0.12, 0.28);
        break;
      }

      case 'green-explosion': {
        this.addTrauma(0.76);
        this.pushZoomPulse(0.74, 3.6, 0.06, 0.09, 0.58, 7);
        this.pushLightPulse(pos, 0x3cff7a, 8.6, 0.56, false, 0.17);
        this.pushFlash(pal.flash, 0.36, 0.02, 0.34);
        this.pushVignette(pal.vignette, 0.4, 0.04, 0.5);
        this.pushGlow(pal.glow, 0.34, 0.04, 0.48);
        this.pushRingPulse(pal.pulse, 0.54, 0.6);
        this.pushBlur(1.25, 0.22);
        break;
      }

      case 'spinning-leap': {
        this.addTrauma(0.24);
        this.pushZoomPulse(0.42, 2.2, 0.08, 0.08, 0.32, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.2, 0.3, true, 0.06);
        this.pushGlow(pal.glow, 0.18, 0.04, 0.28);
        break;
      }

      case 'hero-landing': {
        this.addTrauma(0.44);
        this.pushZoomPulse(-0.32, -1.5, 0.04, 0.04, 0.28, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.4, 0.26, true, 0.07);
        this.pushRingPulse(pal.pulse, 0.32, 0.42);
        break;
      }

      case 'ground-sword': {
        this.addTrauma(0.68);
        this.pushZoomPulse(0.64, 3.1, 0.06, 0.08, 0.52, 6);
        this.pushLightPulse(pos, 0x3ce66b, 7.6, 0.52, false, 0.14);
        this.pushFlash(pal.flash, 0.3, 0.02, 0.28);
        this.pushVignette(pal.vignette, 0.34, 0.04, 0.44);
        this.pushGlow(pal.glow, 0.28, 0.04, 0.42);
        this.pushRingPulse(pal.pulse, 0.5, 0.56);
        this.pushBlur(1.1, 0.2);
        break;
      }

      // ============================================================
      // MAGNETO (Purple Magnetism & Heavy Metal Impact)
      // ============================================================
      case 'magneto-flight-on': {
        this.addTrauma(0.16);
        this.pushZoomPulse(0.32, 1.4, 0.1, 0.06, 0.32, 2);
        this.pushLightPulse(pos, pal.lightHex, 4.2, 0.36, true, 0.06);
        this.pushGlow(pal.glow, 0.2, 0.06, 0.3);
        break;
      }
      case 'magneto-flight-off': {
        this.pushGlow(pal.glow, 0.1, 0.03, 0.18);
        break;
      }
      case 'magneto-throw': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.24, -1.1, 0.05, 0.03, 0.2, 2);
        this.pushLightPulse(pos, pal.lightHex, 3.8, 0.22, true, 0.05);
        break;
      }
      case 'magneto-meteor-charge': {
        this.addTrauma(0.24);
        this.pushZoomPulse(0.56, 2.5, 0.24, 0.4, 0.36, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.4, 0.85, true, 0.08);
        this.pushGlow(pal.glow, 0.24, 0.12, 0.65);
        this.pushVignette(pal.vignette, 0.24, 0.12, 0.65);
        break;
      }
      case 'magneto-meteor-impact': {
        this.addTrauma(0.76);
        this.pushZoomPulse(0.72, 3.4, 0.06, 0.08, 0.58, 7);
        this.pushLightPulse(pos, pal.lightHex, 8.2, 0.56, false, 0.16);
        this.pushFlash(pal.flash, 0.34, 0.02, 0.32);
        this.pushVignette(pal.vignette, 0.38, 0.04, 0.48);
        this.pushGlow(pal.glow, 0.32, 0.04, 0.44);
        this.pushRingPulse(pal.pulse, 0.52, 0.58);
        this.pushBlur(1.2, 0.2);
        break;
      }
      case 'magneto-shield-on': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.34, -1.5, 0.08, 0.04, 0.26, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.34, true, 0.07);
        this.pushFlash(pal.flash, 0.18, 0.02, 0.18);
        this.pushRingPulse(pal.pulse, 0.34, 0.42);
        break;
      }
      case 'magneto-shield-off': {
        this.pushGlow(pal.glow, 0.1, 0.03, 0.16);
        break;
      }
      case 'magneto-tornado': {
        this.addTrauma(0.42);
        this.pushZoomPulse(0.62, 2.8, 0.12, 0.16, 0.48, 5);
        this.pushLightPulse(pos, pal.lightHex, 6.2, 0.55, true, 0.1);
        this.pushGlow(pal.glow, 0.26, 0.06, 0.42);
        this.pushVignette(pal.vignette, 0.28, 0.06, 0.44);
        this.pushRingPulse(pal.pulse, 0.44, 0.48);
        break;
      }

      // ============================================================
      // QUICKSILVER (Supersonic Green Speed & Time Stop)
      // ============================================================
      case 'qs-speed-on': {
        this.addTrauma(0.18);
        this.pushZoomPulse(0.38, 2.6, 0.08, 0.05, 0.28, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.4, 0.3, true, 0.06);
        this.pushFlash(pal.flash, 0.16, 0.015, 0.16);
        this.pushRingPulse(pal.pulse, 0.28, 0.38);
        break;
      }
      case 'qs-speed-off': {
        this.pushGlow(pal.glow, 0.08, 0.02, 0.15);
        break;
      }
      case 'qs-punch-hit': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.42, -1.8, 0.03, 0.04, 0.16, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.2, 0.18, false, 0.05);
        this.pushFlash(pal.flash, 0.12, 0.01, 0.1);
        break;
      }
      case 'qs-punch-finisher': {
        this.addTrauma(0.68);
        this.pushZoomPulse(0.66, 3.2, 0.05, 0.07, 0.48, 7);
        this.pushLightPulse(pos, pal.lightHex, 7.6, 0.46, false, 0.15);
        this.pushFlash(pal.flash, 0.34, 0.02, 0.28);
        this.pushVignette(pal.vignette, 0.32, 0.03, 0.4);
        this.pushRingPulse(pal.pulse, 0.46, 0.56);
        this.pushBlur(1.15, 0.18);
        break;
      }
      case 'qs-tornado': {
        this.addTrauma(0.28);
        this.pushZoomPulse(0.56, 2.4, 0.1, 0.1, 0.38, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.4, true, 0.07);
        this.pushGlow(pal.glow, 0.18, 0.05, 0.3);
        break;
      }
      case 'qs-time-stop': {
        this.addTrauma(0.36);
        this.pushZoomPulse(0.48, 2.2, 0.08, 0.06, 0.4, 5);
        this.pushLightPulse(pos, pal.lightHex, 5.4, 0.44, false, 0.08);
        this.pushFlash(pal.flash, 0.2, 0.02, 0.24);
        this.pushVignette(pal.vignette, 0.24, 0.05, 0.38);
        break;
      }

      // ============================================================
      // DOCTOR STRANGE (Mystic Orange Eldritch Arts & Portals)
      // ============================================================
      case 'strange-cloak-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(0.3, 1.3, 0.1, 0.05, 0.28, 2);
        this.pushLightPulse(pos, pal.lightHex, 3.8, 0.3, true, 0.05);
        this.pushGlow(pal.glow, 0.16, 0.05, 0.24);
        break;
      }
      case 'strange-cloak-off': {
        this.pushGlow(pal.glow, 0.08, 0.03, 0.16);
        break;
      }
      case 'strange-shield-on': {
        this.addTrauma(0.2);
        this.pushZoomPulse(-0.3, -1.4, 0.07, 0.04, 0.24, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.32, true, 0.07);
        this.pushFlash(pal.flash, 0.16, 0.015, 0.18);
        this.pushRingPulse(pal.pulse, 0.3, 0.4);
        break;
      }
      case 'strange-shield-off': {
        this.pushGlow(pal.glow, 0.08, 0.03, 0.15);
        break;
      }
      case 'strange-clones': {
        this.addTrauma(0.36);
        this.pushZoomPulse(-0.48, -2.1, 0.1, 0.08, 0.38, 5);
        this.pushLightPulse(pos, pal.lightHex, 6.0, 0.44, false, 0.09);
        this.pushFlash(pal.flash, 0.24, 0.02, 0.24);
        this.pushVignette(pal.vignette, 0.26, 0.04, 0.36);
        this.pushRingPulse(pal.pulse, 0.42, 0.48);
        break;
      }
      case 'strange-disc': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.22, -1.0, 0.05, 0.03, 0.2, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.6, 0.28, false, 0.07);
        this.pushFlash(pal.flash, 0.14, 0.015, 0.16);
        break;
      }
      case 'astral-extract-strike': {
        this.addTrauma(0.46);
        this.pushZoomPulse(-0.48, -2.2, 0.05, 0.06, 0.36, 6);
        this.pushLightPulse(pos, 0x80e4ff, 6.0, 0.42, false, 0.1);
        this.pushFlash('rgba(165, 240, 255, 1)', 0.26, 0.015, 0.24);
        this.pushRingPulse('rgba(255, 190, 92, 1)', 0.42, 0.46);
        break;
      }
      case 'phoenix-dive-launch': {
        this.addTrauma(0.26);
        this.pushZoomPulse(0.42, 1.8, 0.08, 0.05, 0.3, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.2, 0.36, true, 0.08);
        this.pushFlash(pal.flash, 0.2, 0.02, 0.2);
        break;
      }
      case 'phoenix-dive-impact': {
        this.addTrauma(0.76);
        this.pushZoomPulse(0.72, 3.3, 0.05, 0.08, 0.52, 7);
        this.pushLightPulse(pos, pal.lightHex, 8.2, 0.56, false, 0.16);
        this.pushFlash(pal.flash, 0.36, 0.02, 0.28);
        this.pushVignette(pal.vignette, 0.34, 0.03, 0.42);
        this.pushRingPulse(pal.pulse, 0.52, 0.58);
        this.pushBlur(1.2, 0.2);
        break;
      }

      // ============================================================
      // VISION (Mind Stone Solar Gold & Intangibility)
      // ============================================================
      case 'vision-flight-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(0.28, 1.2, 0.1, 0.05, 0.28, 2);
        this.pushLightPulse(pos, pal.lightHex, 3.8, 0.32, true, 0.05);
        this.pushGlow(pal.glow, 0.16, 0.05, 0.26);
        break;
      }
      case 'vision-flight-off': {
        this.pushGlow(pal.glow, 0.08, 0.03, 0.16);
        break;
      }
      case 'vision-phase-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(-0.24, -1.1, 0.06, 0.04, 0.22, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.4, 0.3, true, 0.07);
        this.pushFlash(pal.flash, 0.16, 0.015, 0.18);
        this.pushGlow(pal.glow, 0.2, 0.04, 0.26);
        break;
      }
      case 'vision-phase-off': {
        this.pushGlow(pal.glow, 0.1, 0.03, 0.16);
        break;
      }
      case 'vision-laser': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.36, -1.6, 0.08, 0.08, 0.3, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.6, 0.44, true, 0.09);
        this.pushFlash(pal.flash, 0.18, 0.02, 0.2);
        this.pushGlow(pal.glow, 0.22, 0.05, 0.34);
        break;
      }
      case 'vision-bolt': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.22, -1.0, 0.04, 0.02, 0.18, 2);
        this.pushLightPulse(pos, pal.lightHex, 4.2, 0.22, true, 0.06);
        this.pushFlash(pal.flash, 0.12, 0.015, 0.14);
        break;
      }
      case 'vision-bolt-small': {
        this.addTrauma(0.06);
        this.pushLightPulse(pos, pal.lightHex, 2.8, 0.16, true, 0.03);
        break;
      }
      case 'vision-bolt-charge': {
        this.addTrauma(0.12);
        this.pushZoomPulse(-0.34, -1.5, 0.12, 0.24, 0.22, 4);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.5, true, 0.07);
        this.pushGlow(pal.glow, 0.18, 0.08, 0.42);
        break;
      }
      case 'vision-bolt-explode': {
        this.addTrauma(0.72);
        this.pushZoomPulse(0.68, 3.2, 0.05, 0.07, 0.5, 7);
        this.pushLightPulse(pos, pal.lightHex, 7.8, 0.52, false, 0.15);
        this.pushFlash(pal.flash, 0.34, 0.02, 0.28);
        this.pushVignette(pal.vignette, 0.3, 0.03, 0.42);
        this.pushRingPulse(pal.pulse, 0.48, 0.56);
        this.pushBlur(1.1, 0.18);
        break;
      }
      case 'vision-head-grip': {
        this.addTrauma(0.28);
        this.pushZoomPulse(-0.56, -2.4, 0.08, 0.14, 0.34, 6);
        this.pushLightPulse(pos, pal.lightHex, 5.4, 0.48, true, 0.09);
        this.pushFlash(pal.flash, 0.2, 0.02, 0.22);
        this.pushVignette(pal.vignette, 0.26, 0.04, 0.38);
        break;
      }
      case 'vision-head-slam': {
        this.addTrauma(0.56);
        this.pushZoomPulse(0.54, 2.6, 0.05, 0.06, 0.42, 7);
        this.pushLightPulse(pos, pal.lightHex, 6.8, 0.42, false, 0.12);
        this.pushFlash(pal.flash, 0.28, 0.02, 0.26);
        this.pushRingPulse(pal.pulse, 0.4, 0.5);
        break;
      }
      case 'astral-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(-0.28, -1.3, 0.07, 0.04, 0.24, 3);
        this.pushLightPulse(pos, 0x80e4ff, 4.6, 0.36, true, 0.06);
        this.pushFlash('rgba(175, 240, 255, 1)', 0.18, 0.015, 0.22);
        this.pushGlow('rgba(110, 220, 255, 1)', 0.2, 0.04, 0.32);
        this.pushRingPulse('rgba(145, 232, 255, 1)', 0.34, 0.44);
        break;
      }
      case 'astral-off': {
        this.pushGlow('rgba(110, 220, 255, 1)', 0.1, 0.02, 0.18);
        break;
      }
      case 'kill-heal': {
        this.pushLightPulse(pos, 0x4ade80, 3.6, 0.42, true, 0.04);
        this.pushGlow('rgba(74, 222, 128, 1)', 0.18, 0.04, 0.36);
        this.pushRingPulse('rgba(74, 222, 128, 1)', 0.36, 0.34);
        break;
      }

      // ============================================================
      // AGATHA HARKNESS & NEW SCARLET / STRANGE ABILITIES
      // ============================================================
      case 'agatha-bolt': {
        this.addTrauma(0.2);
        this.pushZoomPulse(-0.28, -1.2, 0.04, 0.03, 0.2, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.6, 0.26, true, 0.06);
        this.pushFlash(pal.flash, 0.14, 0.015, 0.16);
        break;
      }
      case 'agatha-drain-start': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.36, -1.6, 0.08, 0.08, 0.3, 4);
        this.pushLightPulse(pos, pal.lightHex, 5.4, 0.48, true, 0.09);
        this.pushGlow(pal.glow, 0.24, 0.06, 0.42);
        this.pushVignette(pal.vignette, 0.22, 0.04, 0.36);
        break;
      }
      case 'agatha-shield-on': {
        this.addTrauma(0.18);
        this.pushZoomPulse(0.3, 1.3, 0.08, 0.04, 0.26, 3);
        this.pushLightPulse(pos, pal.lightHex, 4.8, 0.38, true, 0.07);
        this.pushGlow(pal.glow, 0.22, 0.04, 0.32);
        this.pushRingPulse(pal.pulse, 0.4, 0.42);
        break;
      }
      case 'agatha-shield-explode': {
        this.addTrauma(0.68);
        this.pushZoomPulse(0.64, 3.0, 0.05, 0.06, 0.46, 7);
        this.pushLightPulse(pos, pal.lightHex, 7.6, 0.5, true, 0.14);
        this.pushFlash(pal.flash, 0.3, 0.02, 0.26);
        this.pushRingPulse(pal.pulse, 0.48, 0.52);
        break;
      }
      case 'chaos-drain-bolt': {
        this.addTrauma(0.28);
        this.pushZoomPulse(-0.34, -1.5, 0.04, 0.03, 0.22, 4);
        this.pushLightPulse(pos, 0xc80d22, 5.0, 0.28, true, 0.08);
        this.pushFlash('rgba(220, 20, 42, 1)', 0.18, 0.015, 0.18);
        break;
      }
      case 'zombie-beam': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.38, -1.7, 0.08, 0.08, 0.3, 4);
        this.pushLightPulse(pos, 0xa80b18, 5.4, 0.44, true, 0.09);
        this.pushGlow('rgba(180, 12, 26, 1)', 0.22, 0.05, 0.36);
        break;
      }
      case 'zombie-stone-charge': {
        this.addTrauma(0.22);
        this.pushZoomPulse(0.46, 2.0, 0.16, 0.65, 0.35, 5);
        this.pushLightPulse(pos, 0xb80e1d, 5.6, 0.9, true, 0.09);
        this.pushVignette('rgba(105, 6, 16, 1)', 0.24, 0.08, 0.65);
        break;
      }
      case 'zombie-stone-explode': {
        this.addTrauma(0.84);
        this.pushZoomPulse(0.8, 3.6, 0.05, 0.08, 0.55, 8);
        this.pushLightPulse(pos, 0xd81224, 8.8, 0.58, true, 0.18);
        this.pushFlash('rgba(215, 22, 36, 1)', 0.38, 0.02, 0.3);
        this.pushVignette('rgba(120, 8, 18, 1)', 0.36, 0.03, 0.46);
        this.pushRingPulse('rgba(225, 34, 48, 1)', 0.54, 0.6);
        this.pushBlur(1.4, 0.22);
        break;
      }
      case 'purgatory-grasp': {
        this.addTrauma(0.54);
        this.pushZoomPulse(0.52, 2.4, 0.05, 0.06, 0.44, 6);
        this.pushLightPulse(pos, 0x52b8ff, 6.8, 0.48, false, 0.12);
        this.pushFlash('rgba(120, 210, 255, 1)', 0.26, 0.02, 0.24);
        this.pushRingPulse('rgba(96, 195, 255, 1)', 0.44, 0.48);
        break;
      }
      case 'invisible-flight-on': {
        this.pushZoomPulse(0.32, 1.4, 0.1, 0.08, 0.3, 2);
        this.pushLightPulse(pos, 0x38bdf8, 4.2, 0.36, true, 0.08);
        this.pushGlow('rgba(56, 189, 248, 1)', 0.22, 0.06, 0.28);
        break;
      }
      case 'invisible-flight-off': {
        this.pushLightPulse(pos, 0x38bdf8, 2.6, 0.24, true, 0.04);
        break;
      }
      case 'invisibility-on': {
        this.pushZoomPulse(-0.22, -1.0, 0.1, 0.08, 0.35, 3);
        this.pushLightPulse(pos, 0x7dd3fc, 4.8, 0.45, true, 0.08);
        this.pushFlash('rgba(150, 232, 255, 1)', 0.22, 0.03, 0.26);
        break;
      }
      case 'invisibility-off': {
        this.pushLightPulse(pos, 0x38bdf8, 3.8, 0.34, true, 0.06);
        this.pushGlow('rgba(56, 189, 248, 1)', 0.2, 0.04, 0.24);
        break;
      }
      case 'forcefield-shield-on': {
        this.addTrauma(0.18);
        this.pushZoomPulse(0.28, 1.2, 0.08, 0.06, 0.28, 4);
        this.pushLightPulse(pos, 0x38bdf8, 5.2, 0.4, true, 0.09);
        this.pushRingPulse('rgba(125, 211, 252, 1)', 0.36, 0.42);
        break;
      }
      case 'forcefield-shield-off': {
        this.pushLightPulse(pos, 0x38bdf8, 2.4, 0.24, true, 0.04);
        break;
      }
      case 'forcefield-transfer': {
        this.addTrauma(0.26);
        this.pushZoomPulse(-0.28, -1.2, 0.06, 0.08, 0.32, 5);
        this.pushLightPulse(pos, 0x7dd3fc, 5.8, 0.4, false, 0.1);
        this.pushFlash('rgba(186, 230, 253, 1)', 0.24, 0.02, 0.22);
        this.pushRingPulse('rgba(56, 189, 248, 1)', 0.42, 0.5);
        break;
      }
      case 'forcefield-protection': {
        this.addTrauma(0.2);
        this.pushLightPulse(pos, 0x7dd3fc, 5.4, 0.45, false, 0.1);
        this.pushGlow('rgba(125, 211, 252, 1)', 0.26, 0.05, 0.35);
        this.pushRingPulse('rgba(186, 230, 253, 1)', 0.4, 0.46);
        break;
      }
      case 'forcefield-suffocation': {
        this.addTrauma(0.36);
        this.pushZoomPulse(-0.34, -1.5, 0.06, 0.1, 0.34, 6);
        this.pushLightPulse(pos, 0x38bdf8, 6.2, 0.48, false, 0.12);
        this.pushVignette('rgba(14, 72, 138, 1)', 0.3, 0.04, 0.36);
        this.pushRingPulse('rgba(56, 189, 248, 1)', 0.44, 0.52);
        break;
      }
      case 'forcefield-barrier-cast': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.24, -1.0, 0.05, 0.05, 0.26, 4);
        this.pushLightPulse(pos, 0x38bdf8, 4.8, 0.32, true, 0.08);
        this.pushGlow('rgba(56, 189, 248, 1)', 0.18, 0.03, 0.22);
        break;
      }
      case 'forcefield-barrier-hit': {
        this.addTrauma(0.42);
        this.pushLightPulse(pos, 0x90e0ff, 6.4, 0.38, false, 0.11);
        this.pushFlash('rgba(150, 232, 255, 1)', 0.24, 0.02, 0.2);
        this.pushRingPulse('rgba(125, 211, 252, 1)', 0.38, 0.48);
        break;
      }

      // ============================================================
      // VAMPIRE (Super Flight / Ground Stomp / Yellow Energy / Absorption)
      // ============================================================
      case 'vampire-flight-on': {
        this.addTrauma(0.18);
        this.pushZoomPulse(0.28, 1.4, 0.06, 0.06, 0.3, 3);
        this.pushLightPulse(pos, 0xf4c430, 3.8, 0.3, true, 0.06);
        this.pushRingPulse('rgba(255, 224, 96, 1)', 0.34, 0.38);
        break;
      }
      case 'vampire-flight-off': {
        this.pushLightPulse(pos, 0xf4c430, 2.0, 0.2, true, 0.03);
        break;
      }
      case 'vampire-stomp-dive': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.32, -1.6, 0.04, 0.08, 0.28, 5);
        this.pushGlow('rgba(255, 224, 96, 1)', 0.24, 0.04, 0.3);
        break;
      }
      case 'vampire-stomp-impact': {
        this.addTrauma(0.76);
        this.pushZoomPulse(0.68, 3.2, 0.05, 0.08, 0.52, 7);
        this.pushLightPulse(pos, 0xffe066, 8.2, 0.48, false, 0.16);
        this.pushFlash('rgba(255, 234, 132, 1)', 0.34, 0.02, 0.32);
        this.pushVignette('rgba(30, 110, 52, 1)', 0.32, 0.04, 0.44);
        this.pushRingPulse('rgba(255, 224, 96, 1)', 0.48, 0.56);
        this.pushBlur(1.15, 0.2);
        break;
      }
      case 'vampire-bolt': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.22, -0.9, 0.04, 0.03, 0.2, 2);
        this.pushLightPulse(pos, 0xffd638, 4.2, 0.22, true, 0.06);
        break;
      }
      case 'vampire-absorb-start': {
        this.addTrauma(0.2);
        this.pushZoomPulse(-0.34, -1.4, 0.08, 0.1, 0.35, 4);
        this.pushLightPulse(pos, 0xffe066, 5.2, 0.42, true, 0.09);
        this.pushGlow('rgba(91, 255, 149, 1)', 0.22, 0.08, 0.5);
        break;
      }
      case 'vampire-absorb-complete': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.32, 1.4, 0.05, 0.06, 0.34, 5);
        this.pushLightPulse(pos, 0x5bff95, 5.8, 0.38, true, 0.11);
        this.pushFlash('rgba(166, 255, 198, 1)', 0.24, 0.02, 0.24);
        this.pushRingPulse('rgba(255, 224, 96, 1)', 0.4, 0.48);
        break;
      }

      // ============================================================
      // CAPTAIN AMERICA (Vibranium Kinetic Blue & Crimson-White)
      // ============================================================
      case 'cap-shield-throw': {
        this.addTrauma(0.18);
        this.pushZoomPulse(-0.24, -1.0, 0.05, 0.03, 0.2, 3);
        this.pushLightPulse(pos, 0x60a5fa, 3.8, 0.24, true, 0.05);
        break;
      }
      case 'cap-shield-hit': {
        this.addTrauma(0.38);
        this.pushZoomPulse(0.24, 1.1, 0.03, 0.03, 0.22, 4);
        this.pushLightPulse(pos, 0x93c5fd, 5.4, 0.26, false, 0.09);
        this.pushFlash('rgba(191, 219, 254, 1)', 0.22, 0.015, 0.18);
        this.pushRingPulse('rgba(96, 165, 250, 1)', 0.32, 0.44);
        break;
      }
      case 'cap-shield-catch': {
        this.addTrauma(0.14);
        this.pushLightPulse(pos, 0xbae6fd, 3.2, 0.18, true, 0.04);
        break;
      }
      case 'cap-shield-defense-on': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.24, -1.1, 0.07, 0.04, 0.22, 3);
        this.pushLightPulse(pos, 0x60a5fa, 4.2, 0.28, true, 0.06);
        break;
      }
      case 'cap-shield-defense-off': {
        this.pushGlow('rgba(96, 165, 250, 1)', 0.08, 0.02, 0.14);
        break;
      }
      case 'cap-combo-hit': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.22, -0.9, 0.03, 0.02, 0.16, 3);
        this.pushLightPulse(pos, 0x93c5fd, 3.8, 0.18, false, 0.05);
        break;
      }
      case 'cap-combo-finisher': {
        this.addTrauma(0.56);
        this.pushZoomPulse(0.52, 2.4, 0.04, 0.06, 0.38, 6);
        this.pushLightPulse(pos, 0x60a5fa, 6.8, 0.42, false, 0.13);
        this.pushFlash('rgba(191, 219, 254, 1)', 0.28, 0.018, 0.24);
        this.pushRingPulse('rgba(96, 165, 250, 1)', 0.42, 0.52);
        break;
      }
      case 'cap-charge-start': {
        this.addTrauma(0.26);
        this.pushZoomPulse(0.42, 2.2, 0.08, 0.08, 0.34, 4);
        this.pushLightPulse(pos, 0x3b82f6, 5.0, 0.38, true, 0.08);
        this.pushGlow('rgba(96, 165, 250, 1)', 0.22, 0.05, 0.34);
        break;
      }
      case 'cap-charge-hit': {
        this.addTrauma(0.36);
        this.pushLightPulse(pos, 0x93c5fd, 4.8, 0.22, false, 0.08);
        this.pushRingPulse('rgba(147, 197, 253, 1)', 0.28, 0.4);
        break;
      }

      // ============================================================
      // THOR (God of Thunder / Mjolnir & Storm Lightning)
      // ============================================================
      case 'thor-combo-hit': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.24, -1.0, 0.03, 0.03, 0.18, 3);
        this.pushLightPulse(pos, 0x6ce2ff, 4.8, 0.22, false, 0.07);
        this.pushFlash('rgba(186, 244, 255, 1)', 0.14, 0.015, 0.14);
        break;
      }
      case 'thor-combo-finisher': {
        this.addTrauma(0.64);
        this.pushZoomPulse(0.62, 2.9, 0.04, 0.07, 0.44, 6);
        this.pushLightPulse(pos, 0x7ce4ff, 7.6, 0.48, false, 0.15);
        this.pushFlash('rgba(205, 248, 255, 1)', 0.32, 0.02, 0.26);
        this.pushRingPulse('rgba(108, 226, 255, 1)', 0.46, 0.54);
        this.pushBlur(1.05, 0.18);
        break;
      }
      case 'thor-hammer-throw': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.28, -1.2, 0.05, 0.04, 0.22, 3);
        this.pushLightPulse(pos, 0x6ce2ff, 4.4, 0.26, true, 0.06);
        break;
      }
      case 'thor-hammer-impact': {
        this.addTrauma(0.52);
        this.pushZoomPulse(0.42, 1.9, 0.04, 0.05, 0.32, 5);
        this.pushLightPulse(pos, 0x9bebff, 6.8, 0.38, false, 0.13);
        this.pushFlash('rgba(210, 248, 255, 1)', 0.28, 0.018, 0.24);
        this.pushRingPulse('rgba(108, 226, 255, 1)', 0.4, 0.5);
        break;
      }
      case 'thor-hammer-catch': {
        this.addTrauma(0.18);
        this.pushLightPulse(pos, 0x7ce4ff, 3.8, 0.2, true, 0.05);
        break;
      }
      case 'thor-slam-launch': {
        this.addTrauma(0.3);
        this.pushZoomPulse(0.48, 2.1, 0.08, 0.08, 0.36, 5);
        this.pushLightPulse(pos, 0x6ce2ff, 5.8, 0.48, true, 0.1);
        this.pushGlow('rgba(108, 226, 255, 1)', 0.24, 0.06, 0.36);
        break;
      }
      case 'thor-slam-impact': {
        this.addTrauma(0.82);
        this.pushZoomPulse(0.76, 3.5, 0.05, 0.09, 0.56, 8);
        this.pushLightPulse(pos, 0x9bebff, 8.8, 0.6, false, 0.18);
        this.pushFlash('rgba(220, 250, 255, 1)', 0.38, 0.02, 0.32);
        this.pushVignette('rgba(14, 72, 138, 1)', 0.36, 0.04, 0.48);
        this.pushRingPulse('rgba(124, 228, 255, 1)', 0.56, 0.62);
        this.pushBlur(1.35, 0.22);
        break;
      }
      case 'thor-storm-channel': {
        this.addTrauma(0.24);
        this.pushZoomPulse(-0.42, -1.8, 0.12, 0.18, 0.38, 5);
        this.pushLightPulse(pos, 0x6ce2ff, 6.2, 0.85, true, 0.11);
        this.pushGlow('rgba(56, 189, 248, 1)', 0.26, 0.08, 0.72);
        this.pushVignette('rgba(14, 72, 138, 1)', 0.28, 0.08, 0.72);
        break;
      }
      case 'thor-storm-beam': {
        this.addTrauma(0.42);
        this.pushZoomPulse(0.44, 2.0, 0.08, 0.12, 0.42, 6);
        this.pushLightPulse(pos, 0x9bebff, 7.2, 0.56, true, 0.14);
        this.pushFlash('rgba(205, 248, 255, 1)', 0.28, 0.02, 0.24);
        this.pushRingPulse('rgba(124, 228, 255, 1)', 0.42, 0.5);
        break;
      }

      // ============================================================
      // SILVER SURFER (Power Cosmic, Chrome Board, Absorption & Sonic Wave)
      // ============================================================
      case 'silver-flight-on': {
        this.addTrauma(0.18);
        this.pushZoomPulse(0.32, 1.5, 0.06, 0.08, 0.28, 3);
        this.pushLightPulse(pos, 0xd8f2ff, 4.6, 0.34, true, 0.07);
        this.pushRingPulse('rgba(214, 240, 255, 1)', 0.34, 0.4);
        break;
      }
      case 'silver-flight-off': {
        this.pushZoomPulse(-0.14, -0.6, 0.04, 0.04, 0.18, 2);
        this.pushLightPulse(pos, 0xbfe8ff, 2.6, 0.2, true, 0.03);
        break;
      }
      case 'silver-absorb-on': {
        this.addTrauma(0.14);
        this.pushLightPulse(pos, 0xc7ecff, 3.8, 0.26, true, 0.05);
        this.pushGlow('rgba(186, 230, 255, 1)', 0.18, 0.04, 0.26);
        break;
      }
      case 'silver-absorb-off': {
        this.pushLightPulse(pos, 0xa8dcf8, 2.2, 0.18, true, 0.02);
        break;
      }
      case 'silver-absorb-hit': {
        this.addTrauma(0.2);
        this.pushLightPulse(pos, 0xe8f8ff, 4.8, 0.22, true, 0.08);
        this.pushFlash('rgba(220, 246, 255, 1)', 0.16, 0.014, 0.16);
        this.pushRingPulse('rgba(205, 240, 255, 1)', 0.24, 0.38);
        break;
      }
      case 'sonic-blast': {
        this.addTrauma(0.62);
        this.pushZoomPulse(0.58, 2.6, 0.05, 0.07, 0.42, 6);
        this.pushLightPulse(pos, 0xd8e4f0, 6.4, 0.38, false, 0.12);
        this.pushFlash('rgba(235, 242, 250, 1)', 0.28, 0.018, 0.24);
        this.pushRingPulse('rgba(196, 206, 220, 1)', 0.44, 0.56);
        this.pushBlur(0.95, 0.18);
        break;
      }
      case 'cosmic-blast-charge': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.34, -1.5, 0.08, 0.12, 0.28, 4);
        this.pushLightPulse(pos, 0xd8f2ff, 4.8, 0.32, true, 0.07);
        break;
      }
      case 'cosmic-blast-cast': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.36, 1.6, 0.04, 0.05, 0.28, 5);
        this.pushLightPulse(pos, 0xffffff, 5.8, 0.28, false, 0.1);
        this.pushFlash('rgba(232, 248, 255, 1)', 0.2, 0.016, 0.18);
        break;
      }
      case 'cosmic-blast-impact': {
        this.addTrauma(0.68);
        this.pushZoomPulse(0.62, 2.9, 0.04, 0.08, 0.46, 7);
        this.pushLightPulse(pos, 0xbfe8ff, 8.2, 0.48, false, 0.15);
        this.pushFlash('rgba(230, 248, 255, 1)', 0.32, 0.02, 0.28);
        this.pushRingPulse('rgba(191, 232, 255, 1)', 0.48, 0.56);
        this.pushBlur(1.1, 0.2);
        break;
      }
      case 'dual-cosmic-beam': {
        this.addTrauma(0.32);
        this.pushZoomPulse(0.28, 1.3, 0.06, 0.08, 0.34, 4);
        this.pushLightPulse(pos, 0xcbefff, 6.2, 0.42, false, 0.11);
        this.pushFlash('rgba(220, 246, 255, 1)', 0.22, 0.015, 0.18);
        this.pushRingPulse('rgba(168, 230, 255, 1)', 0.38, 0.48);
        break;
      }

      // ============================================================
      // STORM (Weather Goddess: Lightning, Tornado, Ice Spear, Wind)
      // ============================================================
      case 'storm-flight-on': {
        this.addTrauma(0.14);
        this.pushZoomPulse(0.24, 1.1, 0.06, 0.08, 0.26, 3);
        this.pushLightPulse(pos, 0xc2ecff, 3.8, 0.3, true, 0.05);
        this.pushRingPulse('rgba(194, 236, 255, 1)', 0.3, 0.36);
        break;
      }
      case 'storm-flight-off': {
        this.pushZoomPulse(-0.12, -0.5, 0.04, 0.04, 0.18, 2);
        this.pushLightPulse(pos, 0x9edbff, 2.2, 0.18, true, 0.02);
        break;
      }
      case 'lightning-strike-rise': {
        this.addTrauma(0.22);
        this.pushZoomPulse(-0.32, -1.4, 0.08, 0.14, 0.3, 4);
        this.pushLightPulse(pos, 0xfff3a8, 5.2, 0.42, true, 0.08);
        this.pushGlow('rgba(255, 240, 148, 1)', 0.22, 0.05, 0.34);
        break;
      }
      case 'lightning-strike-impact': {
        this.addTrauma(0.76);
        this.pushZoomPulse(0.68, 3.2, 0.04, 0.08, 0.5, 7);
        this.pushLightPulse(pos, 0xffe96b, 9.0, 0.52, false, 0.18);
        this.pushFlash('rgba(255, 252, 205, 1)', 0.38, 0.016, 0.3);
        this.pushRingPulse('rgba(255, 232, 110, 1)', 0.48, 0.58);
        this.pushBlur(1.2, 0.2);
        break;
      }
      case 'storm-tornado-on': {
        this.addTrauma(0.42);
        this.pushZoomPulse(0.46, 2.1, 0.08, 0.1, 0.38, 5);
        this.pushLightPulse(pos, 0xc8eeff, 5.8, 0.44, true, 0.1);
        this.pushRingPulse('rgba(200, 238, 255, 1)', 0.46, 0.52);
        break;
      }
      case 'storm-tornado-off': {
        this.pushLightPulse(pos, 0x9fd8ff, 2.4, 0.2, true, 0.03);
        break;
      }
      case 'ice-spear-create': {
        this.addTrauma(0.16);
        this.pushZoomPulse(-0.26, -1.1, 0.08, 0.12, 0.26, 4);
        this.pushLightPulse(pos, 0x9ce2ff, 4.4, 0.36, true, 0.06);
        break;
      }
      case 'ice-spear-launch': {
        this.addTrauma(0.3);
        this.pushZoomPulse(0.32, 1.4, 0.04, 0.05, 0.26, 5);
        this.pushLightPulse(pos, 0xc2f0ff, 5.2, 0.26, false, 0.08);
        break;
      }
      case 'ice-spear-shatter': {
        this.addTrauma(0.56);
        this.pushZoomPulse(0.48, 2.2, 0.04, 0.06, 0.36, 6);
        this.pushLightPulse(pos, 0xbaeeff, 7.2, 0.42, false, 0.13);
        this.pushFlash('rgba(218, 248, 255, 1)', 0.28, 0.018, 0.24);
        this.pushRingPulse('rgba(166, 235, 255, 1)', 0.42, 0.5);
        break;
      }
      case 'wind-blast-on': {
        this.addTrauma(0.24);
        this.pushZoomPulse(0.26, 1.2, 0.06, 0.08, 0.24, 4);
        this.pushLightPulse(pos, 0xdff5ff, 4.2, 0.3, true, 0.06);
        this.pushRingPulse('rgba(210, 244, 255, 1)', 0.34, 0.4);
        break;
      }
      case 'wind-blast-off': {
        this.pushLightPulse(pos, 0x9edbff, 2.0, 0.18, true, 0.02);
        break;
      }
    }
  }

  public setSustainedBlueTint(active: boolean): void {
    this.sustainedVignetteTarget = active ? 0.28 : 0;
    this.sustainedVignetteColor = 'rgba(20, 114, 224, 1)';
    this.sustainedGlowTarget = active ? 0.16 : 0;
    this.sustainedGlowColor = 'rgba(56, 189, 248, 1)';
  }

  public cancelSustainedCues(): void {
    this.sustainedZoomTarget = 0;
    this.sustainedFovTarget = 0;
    this.sustainedVignetteTarget = 0;
    this.sustainedGlowTarget = 0;
  }

  /**
   * Immediately clears active cues on death/respawn/character swap while allowing
   * smooth spring return so the camera never snaps abruptly.
   */
  public resetAll(hard = false): void {
    this.cancelSustainedCues();
    this.zoomPulse = null;
    this.flashLayer = null;
    this.vignetteLayer = null;
    this.glowLayer = null;
    this.ringPulse = null;
    this.lightPulse = null;
    this.blurTimer = 0;
    this.blurPeak = 0;

    if (hard) {
      this.trauma = 0;
      this.smoothZoomOffset = 0;
      this.smoothFovOffset = 0;
      this.smoothSustainedVignette = 0;
      this.smoothSustainedGlow = 0;
      this.smoothLightIntensity = 0;
      this.smoothExposureBoost = 0;
      this.shakeLocalOffset.set(0, 0, 0);
      this.shakeRollRad = 0;
      this.zoomOffset = 0;
      this.fovOffset = 0;
      this.exposureBoost = 0;
      this.lightIntensity = 0;
      this.screenFx.active = false;
      this.screenFx.flashOpacity = 0;
      this.screenFx.vignetteOpacity = 0;
      this.screenFx.glowOpacity = 0;
      this.screenFx.pulseOpacity = 0;
      this.screenFx.pulseProgress = 0;
      this.screenFx.blurPx = 0;
    }
  }

  private addTrauma(amount: number): void {
    // Diminishing blend prevents excessive shake when impacts overlap
    this.trauma = THREE.MathUtils.clamp(
      Math.max(this.trauma, amount) + Math.min(this.trauma, amount) * 0.25,
      0,
      1,
    );
    this.shakeSeed = (this.shakeSeed + 1.37) % 100;
  }

  private pushZoomPulse(
    peakDistanceOffset: number,
    peakFovOffset: number,
    inDuration: number,
    holdDuration: number,
    outDuration: number,
    priority: number,
  ): void {
    if (this.zoomPulse && priority < this.zoomPulse.priority) {
      const rem =
        this.zoomPulse.inDuration +
        this.zoomPulse.holdDuration +
        this.zoomPulse.outDuration -
        this.zoomPulse.elapsed;
      if (rem > 0.08) return;
    }
    const zp = this._zoomPulseObj;
    zp.elapsed = 0;
    zp.inDuration = inDuration;
    zp.holdDuration = holdDuration;
    zp.outDuration = outDuration;
    zp.peakDistanceOffset = THREE.MathUtils.clamp(peakDistanceOffset, -1.5, 0.9);
    zp.peakFovOffset = THREE.MathUtils.clamp(peakFovOffset, -5.0, 4.2);
    zp.priority = priority;
    this.zoomPulse = zp;
  }

  private pushLightPulse(
    pos: THREE.Vector3,
    colorHex: number,
    peakIntensity: number,
    duration: number,
    followPlayer: boolean,
    peakExposure: number,
  ): void {
    this.currentLightPos.copy(pos);
    const lp = this._lightPulseObj;
    lp.elapsed = 0;
    lp.duration = duration;
    lp.peakIntensity = peakIntensity;
    lp.colorHex = colorHex;
    lp.position.copy(pos);
    lp.followPlayer = followPlayer;
    lp.peakExposure = peakExposure;
    this.lightPulse = lp;
  }

  private pushFlash(
    color: string,
    peakOpacity: number,
    attack: number,
    decay: number,
  ): void {
    const capped = Math.min(0.42, peakOpacity);
    if (this.flashLayer) {
      const cur = this.evaluateLayer(this.flashLayer);
      if (cur > capped * 0.85) return;
    }
    const fl = this._flashLayerObj;
    fl.elapsed = 0;
    fl.attack = attack;
    fl.decay = decay;
    fl.peakOpacity = capped;
    fl.color = color;
    this.flashLayer = fl;
  }

  private pushVignette(
    color: string,
    peakOpacity: number,
    attack: number,
    decay: number,
  ): void {
    const capped = Math.min(0.44, peakOpacity);
    const vl = this._vignetteLayerObj;
    vl.elapsed = 0;
    vl.attack = attack;
    vl.decay = decay;
    vl.peakOpacity = capped;
    vl.color = color;
    this.vignetteLayer = vl;
  }

  private pushGlow(
    color: string,
    peakOpacity: number,
    attack: number,
    decay: number,
  ): void {
    const capped = Math.min(0.38, peakOpacity);
    const gl = this._glowLayerObj;
    gl.elapsed = 0;
    gl.attack = attack;
    gl.decay = decay;
    gl.peakOpacity = capped;
    gl.color = color;
    this.glowLayer = gl;
  }

  private pushRingPulse(color: string, duration: number, peakOpacity: number): void {
    const rp = this._ringPulseObj;
    rp.elapsed = 0;
    rp.duration = duration;
    rp.peakOpacity = Math.min(0.65, peakOpacity);
    rp.color = color;
    this.ringPulse = rp;
  }

  private pushBlur(peakPx: number, duration: number): void {
    if (!this.allowSubtleBlur) return;
    this.blurPeak = Math.min(1.5, Math.max(this.blurPeak, peakPx));
    this.blurDuration = duration;
    this.blurTimer = duration;
  }

  private evaluateLayer(layer: ActiveScreenLayer | null): number {
    if (!layer) return 0;
    if (layer.elapsed < layer.attack) {
      return layer.peakOpacity * easeOutCubic(layer.elapsed / Math.max(layer.attack, 0.001));
    }
    const decT = (layer.elapsed - layer.attack) / Math.max(layer.decay, 0.001);
    if (decT >= 1) return 0;
    return layer.peakOpacity * (1 - easeInOutQuad(decT));
  }

  public update(dt: number, playerFocusPos: THREE.Vector3): void {
    const safeDt = Math.min(Math.max(dt, 0.0001), 0.05);
    this.time += safeDt;

    // 1. Controlled Trauma Camera Shake (strictly 0 when idle)
    if (this.trauma > 0.001) {
      this.trauma = Math.max(0, this.trauma - safeDt * 1.65);
      const shakePower = this.trauma * this.trauma;
      const t = this.time * 36 + this.shakeSeed;
      const amp = 0.21 * shakePower;
      this.shakeLocalOffset.set(
        (Math.sin(t * 1.13) + 0.45 * Math.cos(t * 2.07)) * amp * 0.72,
        (Math.cos(t * 1.41) + 0.4 * Math.sin(t * 2.31)) * amp * 0.65,
        0,
      );
      this.shakeRollRad =
        (Math.sin(t * 1.27) + 0.35 * Math.cos(t * 1.93)) * 0.014 * shakePower;
    } else {
      this.trauma = 0;
      this.shakeLocalOffset.set(0, 0, 0);
      this.shakeRollRad = 0;
    }

    // 2. Smooth Dynamic Camera Zoom & FOV
    let pulseZoom = 0;
    let pulseFov = 0;
    if (this.zoomPulse) {
      const zp = this.zoomPulse;
      zp.elapsed += safeDt;
      const t1 = zp.inDuration;
      const t2 = t1 + zp.holdDuration;
      const t3 = t2 + zp.outDuration;

      if (zp.elapsed < t1) {
        const k = easeOutCubic(zp.elapsed / Math.max(t1, 0.001));
        pulseZoom = zp.peakDistanceOffset * k;
        pulseFov = zp.peakFovOffset * k;
      } else if (zp.elapsed < t2) {
        pulseZoom = zp.peakDistanceOffset;
        pulseFov = zp.peakFovOffset;
      } else if (zp.elapsed < t3) {
        const k = 1 - easeInOutQuad((zp.elapsed - t2) / Math.max(zp.outDuration, 0.001));
        pulseZoom = zp.peakDistanceOffset * k;
        pulseFov = zp.peakFovOffset * k;
      } else {
        this.zoomPulse = null;
      }
    }

    const desiredZoom = THREE.MathUtils.clamp(
      this.sustainedZoomTarget + pulseZoom,
      -1.55,
      0.95,
    );
    const desiredFov = THREE.MathUtils.clamp(
      this.sustainedFovTarget + pulseFov,
      -5.2,
      4.5,
    );

    this.smoothZoomOffset = THREE.MathUtils.damp(
      this.smoothZoomOffset,
      desiredZoom,
      14,
      safeDt,
    );
    this.smoothFovOffset = THREE.MathUtils.damp(
      this.smoothFovOffset,
      desiredFov,
      13,
      safeDt,
    );
    this.zoomOffset = Math.abs(this.smoothZoomOffset) < 0.001 ? 0 : this.smoothZoomOffset;
    this.fovOffset = Math.abs(this.smoothFovOffset) < 0.005 ? 0 : this.smoothFovOffset;

    // 3. Dynamic 3D Point Light & Tone-Mapping Exposure Boost
    let targetLight = 0;
    let targetExp = 0;
    if (this.lightPulse) {
      const lp = this.lightPulse;
      lp.elapsed += safeDt;
      const t = lp.elapsed / Math.max(lp.duration, 0.001);
      if (t >= 1) {
        this.lightPulse = null;
      } else {
        const env =
          t < 0.18
            ? easeOutCubic(t / 0.18)
            : 1 - easeInOutQuad((t - 0.18) / 0.82);
        targetLight = lp.peakIntensity * env;
        targetExp = lp.peakExposure * env;
        this.currentLightColor.setHex(lp.colorHex);
        if (lp.followPlayer) {
          this.currentLightPos.set(
            playerFocusPos.x,
            playerFocusPos.y + 1.25,
            playerFocusPos.z,
          );
        } else {
          this.currentLightPos.copy(lp.position);
          this.currentLightPos.y = Math.max(this.currentLightPos.y, 0.9);
        }
      }
    }
    this.smoothLightIntensity = THREE.MathUtils.damp(
      this.smoothLightIntensity,
      targetLight,
      18,
      safeDt,
    );
    this.smoothExposureBoost = THREE.MathUtils.damp(
      this.smoothExposureBoost,
      targetExp,
      16,
      safeDt,
    );
    this.lightIntensity =
      this.smoothLightIntensity < 0.01 ? 0 : this.smoothLightIntensity;
    this.exposureBoost =
      this.smoothExposureBoost < 0.002 ? 0 : this.smoothExposureBoost;
    this.lightPos.copy(this.currentLightPos);
    this.lightColor.copy(this.currentLightColor);

    // 4. Screen FX Layers
    if (this.flashLayer) {
      this.flashLayer.elapsed += safeDt;
      if (this.flashLayer.elapsed >= this.flashLayer.attack + this.flashLayer.decay) {
        this.flashLayer = null;
      }
    }
    if (this.vignetteLayer) {
      this.vignetteLayer.elapsed += safeDt;
      if (
        this.vignetteLayer.elapsed >=
        this.vignetteLayer.attack + this.vignetteLayer.decay
      ) {
        this.vignetteLayer = null;
      }
    }
    if (this.glowLayer) {
      this.glowLayer.elapsed += safeDt;
      if (this.glowLayer.elapsed >= this.glowLayer.attack + this.glowLayer.decay) {
        this.glowLayer = null;
      }
    }

    let pulseOp = 0;
    let pulseProg = 0;
    let pulseCol = PALETTES[this.identity].pulse;
    if (this.ringPulse) {
      this.ringPulse.elapsed += safeDt;
      const p = this.ringPulse.elapsed / Math.max(this.ringPulse.duration, 0.001);
      if (p >= 1) {
        this.ringPulse = null;
      } else {
        pulseProg = easeOutCubic(p);
        pulseOp = this.ringPulse.peakOpacity * Math.sin(p * Math.PI) * (1 - p * 0.35);
        pulseCol = this.ringPulse.color;
      }
    }

    if (this.blurTimer > 0) {
      this.blurTimer = Math.max(0, this.blurTimer - safeDt);
      if (this.blurTimer === 0) this.blurPeak = 0;
    }
    const blurPx =
      this.allowSubtleBlur && this.blurTimer > 0
        ? this.blurPeak * (this.blurTimer / Math.max(this.blurDuration, 0.001))
        : 0;

    this.smoothSustainedVignette = THREE.MathUtils.damp(
      this.smoothSustainedVignette,
      this.sustainedVignetteTarget,
      10,
      safeDt,
    );
    this.smoothSustainedGlow = THREE.MathUtils.damp(
      this.smoothSustainedGlow,
      this.sustainedGlowTarget,
      10,
      safeDt,
    );

    const flashOp = this.evaluateLayer(this.flashLayer);
    const transVigOp = this.evaluateLayer(this.vignetteLayer);
    const totalVigOp = Math.min(
      0.46,
      Math.max(this.smoothSustainedVignette, transVigOp),
    );
    const transGlowOp = this.evaluateLayer(this.glowLayer);
    const glowOp = Math.min(0.38, Math.max(this.smoothSustainedGlow, transGlowOp));

    this.screenFx.flashColor = this.flashLayer?.color ?? PALETTES[this.identity].flash;
    this.screenFx.flashOpacity = flashOp;
    this.screenFx.vignetteColor =
      this.vignetteLayer && transVigOp >= this.smoothSustainedVignette
        ? this.vignetteLayer.color
        : this.sustainedVignetteColor;
    this.screenFx.vignetteOpacity = totalVigOp < 0.004 ? 0 : totalVigOp;
    this.screenFx.glowColor =
      this.glowLayer && transGlowOp >= this.smoothSustainedGlow
        ? this.glowLayer.color
        : this.sustainedGlowColor;
    this.screenFx.glowOpacity = glowOp < 0.004 ? 0 : glowOp;
    this.screenFx.pulseColor = pulseCol;
    this.screenFx.pulseOpacity = pulseOp < 0.004 ? 0 : pulseOp;
    this.screenFx.pulseProgress = pulseProg;
    this.screenFx.blurPx = blurPx < 0.04 ? 0 : blurPx;
    this.screenFx.active =
      this.screenFx.flashOpacity > 0 ||
      this.screenFx.vignetteOpacity > 0 ||
      this.screenFx.glowOpacity > 0 ||
      this.screenFx.pulseOpacity > 0 ||
      this.screenFx.blurPx > 0;
  }
}
