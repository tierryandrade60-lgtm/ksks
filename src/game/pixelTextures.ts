import * as THREE from 'three';
import { CharacterAppearance } from './characterConfig';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const nr = clamp(r * factor);
  const ng = clamp(g * factor);
  const nb = clamp(b * factor);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${clamp(r1 + (r2 - r1) * t)}, ${clamp(g1 + (g2 - g1) * t)}, ${clamp(b1 + (b2 - b1) * t)})`;
}

function createPixelCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function finalizePixelTexture(
  canvas: HTMLCanvasElement,
  options?: {
    repeatX?: number;
    repeatY?: number;
    mipmaps?: boolean;
    anisotropy?: number;
  },
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;

  if (options?.mipmaps) {
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  } else {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.NearestFilter;
  }

  if (options?.repeatX && options?.repeatY) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(options.repeatX, options.repeatY);
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }

  if (options?.anisotropy) {
    tex.anisotropy = options.anisotropy;
  }

  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a clean, dark-blue classic baseplate texture with thin white lines
 * forming uniform squares across the entire surface (no studs or clutter).
 */
export function createBaseplateTopTexture(
  maxAnisotropy: number,
  repeatCount = 108,
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Elegant dark-blue baseplate surface balanced with the stylized sky
  ctx.fillStyle = '#182848';
  ctx.fillRect(0, 0, size, size);

  // Thin crisp white square grid lines (split evenly on borders for seamless tiling)
  ctx.fillStyle = 'rgba(240, 246, 255, 0.44)';
  ctx.fillRect(0, 0, size, 1.5);
  ctx.fillRect(0, 0, 1.5, size);
  ctx.fillRect(0, size - 1.5, size, 1.5);
  ctx.fillRect(size - 1.5, 0, 1.5, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatCount, repeatCount);
  if (maxAnisotropy > 0) {
    tex.anisotropy = maxAnisotropy;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a cohesive dark-navy border texture for the distant baseplate perimeter.
 */
export function createBaseplateTrimTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 32;
  const { canvas, ctx } = createPixelCanvas(size, size);

  ctx.fillStyle = '#14223E';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#20335A';
  ctx.fillRect(0, 0, size, 3);

  ctx.fillStyle = '#0F1A31';
  ctx.fillRect(0, 16, size, 16);

  return finalizePixelTexture(canvas, {
    repeatX: 54,
    repeatY: 1,
    mipmaps: true,
    anisotropy: maxAnisotropy,
  });
}

let cachedContactShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Soft radial ground contact shadow texture tuned for the dark-blue baseplate.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactShadowTexture) return cachedContactShadowTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    2,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(5, 9, 20, 0.5)');
  grad.addColorStop(0.52, 'rgba(5, 9, 20, 0.2)');
  grad.addColorStop(1, 'rgba(5, 9, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  cachedContactShadowTexture = tex;
  return tex;
}

let cachedSkyDomeTexture: THREE.CanvasTexture | null = null;

/**
 * Brighter, balanced stylized Cartoon Sky gradient texture with natural atmospheric depth.
 */
export function createSkyDomeTexture(): THREE.CanvasTexture {
  if (cachedSkyDomeTexture) return cachedSkyDomeTexture;
  const width = 64;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#4982C6'); // Rich atmospheric zenith blue
  grad.addColorStop(0.24, '#6CA4DF'); // Clear mid-sky Cartoon blue
  grad.addColorStop(0.42, '#99C5EE'); // Soft luminous lower sky
  grad.addColorStop(0.5, '#C0DBF4'); // Exact horizon mist matching Three.Fog
  grad.addColorStop(0.56, '#B8D4EE'); // Horizon continuation
  grad.addColorStop(0.75, '#769AC2'); // Gentle below-horizon fade
  grad.addColorStop(1.0, '#2E466E'); // Nadir balance
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cachedSkyDomeTexture = tex;
  return tex;
}

let cachedSunGlowTexture: THREE.CanvasTexture | null = null;

/**
 * Clean, softly blurred radial glowing sun sky texture with warm pale-gold falloff.
 */
export function createSunGlowTexture(): THREE.CanvasTexture {
  if (cachedSunGlowTexture) return cachedSunGlowTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 253, 240, 1.0)');
  grad.addColorStop(0.15, 'rgba(255, 247, 214, 0.96)');
  grad.addColorStop(0.24, 'rgba(255, 235, 174, 0.72)');
  grad.addColorStop(0.42, 'rgba(255, 224, 152, 0.26)');
  grad.addColorStop(0.7, 'rgba(255, 218, 146, 0.06)');
  grad.addColorStop(1.0, 'rgba(255, 215, 140, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedSunGlowTexture = tex;
  return tex;
}

export interface CharacterTextureSet {
  headFront: THREE.CanvasTexture;
  headBack: THREE.CanvasTexture;
  headSideL: THREE.CanvasTexture;
  headSideR: THREE.CanvasTexture;
  headTop: THREE.CanvasTexture;
  skinPlain: THREE.CanvasTexture;

  chestFront: THREE.CanvasTexture;
  chestBack: THREE.CanvasTexture;
  chestSide: THREE.CanvasTexture;
  chestTop: THREE.CanvasTexture;

  waistBand: THREE.CanvasTexture;
  upperArm: THREE.CanvasTexture;
  lowerArm: THREE.CanvasTexture;
  hand: THREE.CanvasTexture;

  upperLeg: THREE.CanvasTexture;
  lowerLeg: THREE.CanvasTexture;
  footFront: THREE.CanvasTexture;
  footSide: THREE.CanvasTexture;
  footBack: THREE.CanvasTexture;
  footTop: THREE.CanvasTexture;
  footSole: THREE.CanvasTexture;

  dispose: () => void;
}

const characterTextureCache = new Map<string, CharacterTextureSet>();

function getAppearanceCacheKey(a: CharacterAppearance): string {
  return [
    a.archetype ?? '',
    a.skinId ?? '',
    a.skin,
    a.hair,
    a.hairSecondary ?? '',
    a.topStyle,
    a.topPrimary,
    a.topSecondary,
    a.topAccent,
    a.emblemColor ?? '',
    a.sashColor ?? '',
    a.pantsStyle,
    a.pantsPrimary,
    a.pantsAccent,
    a.shoePrimary,
    a.shoeSole,
    a.shoeAccent,
    a.hatStyle,
    a.hatColor,
  ].join('|');
}

export function createCharacterPixelTextures(
  appearance: CharacterAppearance,
): CharacterTextureSet {
  const cacheKey = getAppearanceCacheKey(appearance);
  const cached = characterTextureCache.get(cacheKey);
  if (cached) return cached;

  const track = (tex: THREE.CanvasTexture) => tex;

  const skin = appearance.skin;
  const skinLight = shadeHex(skin, 1.06);
  const skinShadow = shadeHex(skin, 0.88);
  const skinBlush = mixHex(skin, '#F28B82', 0.16);

  const hair = appearance.hair;
  const hairLight = shadeHex(hair, 1.18);
  const hairDark = shadeHex(hair, 0.82);

  const top = appearance.topPrimary;
  const topLight = shadeHex(top, 1.12);
  const topDark = shadeHex(top, 0.78);
  const top2 = appearance.topSecondary;
  const top2Light = shadeHex(top2, 1.12);
  const top2Dark = shadeHex(top2, 0.84);
  const accent = appearance.topAccent;
  const emblem = appearance.emblemColor ?? top2;
  const sash = appearance.sashColor ?? top2;

  const pants = appearance.pantsPrimary;
  const pantsLight = shadeHex(pants, 1.1);
  const pantsDark = shadeHex(pants, 0.8);
  const pantsAccent = appearance.pantsAccent;

  const shoe = appearance.shoePrimary;
  const shoeDark = shadeHex(shoe, 0.84);
  const sole = appearance.shoeSole;
  const shoeAccent = appearance.shoeAccent;

  const isVision = appearance.archetype === 'vision';
  const isRobot = appearance.archetype === 'npc-robot';
  const isStrange = appearance.archetype === 'doctor-strange';
  const isAgatha = appearance.archetype === 'agatha-harkness';
  const skinId = appearance.skinId;
  const isSupremeSorceress = skinId === 'supreme-sorceress';
  const isWandaZombie = skinId === 'wanda-zombie';
  const isWhiteHela = skinId === 'white-hela';
  const isWhiteQueen = skinId === 'white-queen';
  const isWhitePhoenix = skinId === 'white-phoenix';
  const isAncientOne = skinId === 'ancient-one';
  const isSpeed = skinId === 'speed';
  const isVampire = appearance.archetype === 'vampire';
  const isCaptainAmerica = appearance.archetype === 'captain-america';
  const isThor = appearance.archetype === 'thor';
  const isSilverSurfer = appearance.archetype === 'silver-surfer';
  const isStorm = appearance.archetype === 'storm';

  // --- FACELESS HEAD (16x16) ---
  // Explicitly NO eyes, NO nose, NO mouth — clean soft cartoon pixel shading + hair/cowl silhouette
  const headFront = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    if (isRobot) {
      // Ultron-style metallic titanium faceplate, dark recessed visor, glowing crimson eyes & jaw grille
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skinLight;
      ctx.fillRect(2, 1, 12, 4);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 13, 16, 3);
      ctx.fillRect(0, 2, 1, 12);
      ctx.fillRect(15, 2, 1, 12);
      // Forehead metallic ridge
      ctx.fillStyle = hair;
      ctx.fillRect(4, 0, 8, 2);
      ctx.fillRect(6, 2, 4, 2);
      // Dark recessed visor slit + glowing red Ultron eyes
      ctx.fillStyle = '#141720';
      ctx.fillRect(2, 5, 12, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(3, 6, 4, 2);
      ctx.fillRect(9, 6, 4, 2);
      ctx.fillStyle = '#FF9EA8';
      ctx.fillRect(4, 6, 2, 1);
      ctx.fillRect(10, 6, 2, 1);
      // Cheekbone armor lines + glowing red Ultron mouth grille
      ctx.fillStyle = top2;
      ctx.fillRect(2, 9, 2, 5);
      ctx.fillRect(12, 9, 2, 5);
      ctx.fillStyle = '#141720';
      ctx.fillRect(4, 10, 8, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(5, 11, 1, 2);
      ctx.fillRect(7, 10, 2, 3);
      ctx.fillRect(10, 11, 1, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (isVision) {
      // Emerald cowl framing red synthezoid face (strictly faceless)
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      // Center synthetic red face panel
      ctx.fillStyle = skin;
      ctx.fillRect(3, 4, 10, 11);
      ctx.fillRect(4, 15, 8, 1);
      ctx.fillStyle = skinLight;
      ctx.fillRect(4, 5, 8, 5);
      // Cowl widow's peak V above Mind Stone area
      ctx.fillStyle = top;
      ctx.fillRect(6, 2, 4, 3);
      ctx.fillRect(7, 5, 2, 1);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(4, 14, 8, 2);
      return track(finalizePixelTexture(canvas));
    }

    if (isWandaZombie) {
      // Wanda Zombie: decayed grey-green skin, dark cracks, glowing orange-red eyes, snarling teeth
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 4, 10, 5);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillRect(0, 3, 1, 11);
      ctx.fillRect(15, 3, 1, 11);
      // Dark zombie cracks/scars
      ctx.fillStyle = '#3B423D';
      ctx.fillRect(9, 2, 1, 3);
      ctx.fillRect(10, 4, 1, 2);
      ctx.fillRect(3, 9, 1, 2);
      ctx.fillRect(12, 9, 1, 2);
      // Wild dark crimson hairline
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillRect(0, 3, 2, 2);
      ctx.fillRect(14, 3, 2, 2);
      // Sunken eye sockets + fierce glowing red/orange eyes
      ctx.fillStyle = '#231618';
      ctx.fillRect(3, 6, 3, 2);
      ctx.fillRect(10, 6, 3, 2);
      ctx.fillStyle = '#FF3E1D';
      ctx.fillRect(4, 6, 2, 2);
      ctx.fillRect(10, 6, 2, 2);
      ctx.fillStyle = '#FFE169';
      ctx.fillRect(5, 6, 1, 1);
      ctx.fillRect(10, 6, 1, 1);
      // Snarling undead mouth & bared teeth
      ctx.fillStyle = '#2E0A0E';
      ctx.fillRect(4, 11, 8, 3);
      ctx.fillStyle = '#D9CBA8';
      ctx.fillRect(5, 11, 1, 1);
      ctx.fillRect(7, 11, 2, 1);
      ctx.fillRect(10, 11, 1, 1);
      ctx.fillRect(5, 13, 1, 1);
      ctx.fillRect(8, 13, 1, 1);
      ctx.fillRect(10, 13, 1, 1);
      return track(finalizePixelTexture(canvas));
    }

    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 16, 16);
    // Soft cheek warmth (no facial features)
    ctx.fillStyle = skinLight;
    ctx.fillRect(3, 5, 10, 6);
    ctx.fillStyle = skinBlush;
    ctx.fillRect(2, 9, 2, 2);
    ctx.fillRect(12, 9, 2, 2);
    // Chin / jaw subtle AO shadow
    ctx.fillStyle = skinShadow;
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 4, 1, 10);
    ctx.fillRect(15, 4, 1, 10);

    if (isAncientOne) {
      // Smooth bald head + subtle Dark Dimension forehead mark (no hair)
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 1, 10, 4);
      ctx.fillStyle = appearance.hairSecondary ?? '#9C4228';
      ctx.fillRect(7, 2, 2, 1);
      ctx.fillRect(7, 3, 1, 2);
      ctx.fillRect(8, 3, 1, 2);
    } else if (isSilverSurfer) {
      // Sleek cosmic chrome bald head with specular forehead gleam & sculpted brow/cheekbone lines
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 1, 10, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(5, 2, 5, 2);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(2, 5, 5, 1);
      ctx.fillRect(9, 5, 5, 1);
      ctx.fillRect(6, 12, 4, 1);
    } else {
      // Hairline fringe across top of forehead
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(1, 4, 3, 2);
      ctx.fillRect(5, 4, 4, 1);
      ctx.fillRect(12, 4, 3, 2);
      ctx.fillStyle = hairLight;
      ctx.fillRect(3, 1, 7, 1);
      ctx.fillStyle = hairDark;
      ctx.fillRect(0, 3, 1, 3);
      ctx.fillRect(15, 3, 1, 3);

      if (isStrange) {
        // Iconic silver-white temple streaks
        ctx.fillStyle = appearance.hairSecondary ?? '#DCE5EE';
        ctx.fillRect(0, 2, 2, 4);
        ctx.fillRect(14, 2, 2, 4);
      } else if (isStorm) {
        // Flowing white hair sweep with black headband & gold forehead circlet emblem
        ctx.fillStyle = hair;
        ctx.fillRect(0, 0, 16, 3);
        ctx.fillRect(0, 3, 2, 4);
        ctx.fillRect(14, 3, 2, 4);
        ctx.fillStyle = '#141620';
        ctx.fillRect(1, 2, 14, 2);
        ctx.fillStyle = emblem;
        ctx.fillRect(7, 2, 2, 2);
      } else if (isSpeed) {
        // Dark emerald-black cheek/temple cowl strips framing face
        ctx.fillStyle = top2;
        ctx.fillRect(0, 4, 2, 10);
        ctx.fillRect(14, 4, 2, 10);
        ctx.fillRect(1, 13, 2, 3);
        ctx.fillRect(13, 13, 2, 3);
      } else if (isVampire) {
        // Rogue's iconic crisp white front hair streaks parting across auburn bangs
        ctx.fillStyle = appearance.hairSecondary ?? '#F2F6FA';
        ctx.fillRect(3, 0, 3, 4);
        ctx.fillRect(10, 0, 3, 4);
        ctx.fillRect(2, 4, 2, 2);
        ctx.fillRect(12, 4, 2, 2);
      } else if (isCaptainAmerica || appearance.hatStyle === 'captain-helm') {
        // Captain America navy helmet dome, cheek/temple wrap, forehead A crest, exposed nose & lower face
        const helmColor = appearance.hatColor || '#1E4380';
        ctx.fillStyle = helmColor;
        ctx.fillRect(0, 0, 16, 6);
        ctx.fillRect(0, 6, 3, 7);
        ctx.fillRect(13, 6, 3, 7);
        // Subtle nose bridge cowl between eyes
        ctx.fillRect(7, 6, 2, 3);
        // Darker navy chin strap under jawline
        ctx.fillStyle = shadeHex(helmColor, 0.72);
        ctx.fillRect(1, 13, 2, 3);
        ctx.fillRect(13, 13, 2, 3);
        // Crisp white 'A' forehead insignia
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(7, 1, 2, 1);
        ctx.fillRect(6, 2, 1, 3);
        ctx.fillRect(9, 2, 1, 3);
        ctx.fillRect(7, 3, 2, 1);
      } else if (isThor) {
        // Textured brown beard framing lower jaw & subtle cheek stubble
        ctx.fillStyle = hair;
        ctx.fillRect(2, 11, 12, 5);
        ctx.fillStyle = hairDark;
        ctx.fillRect(3, 12, 10, 4);
        // Mouth / beard gap
        ctx.fillStyle = skinShadow;
        ctx.fillRect(6, 12, 4, 2);
      }
    }

    return track(finalizePixelTexture(canvas));
  })();

  const headBack = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    if (isRobot) {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = hair;
      ctx.fillRect(2, 1, 12, 5);
      ctx.fillStyle = top2;
      ctx.fillRect(4, 7, 8, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(7, 9, 2, 3);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 13, 16, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (isVision) {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 13, 16, 3);
      ctx.fillStyle = topLight;
      ctx.fillRect(3, 2, 10, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (isAncientOne || isSilverSurfer) {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 2, 10, 4);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 13, 16, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (isCaptainAmerica || appearance.hatStyle === 'captain-helm') {
      const helmColor = appearance.hatColor || '#1E4380';
      ctx.fillStyle = helmColor;
      ctx.fillRect(0, 0, 16, 13);
      ctx.fillStyle = shadeHex(helmColor, 0.76);
      ctx.fillRect(2, 11, 12, 3);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 13, 16, 3);
      ctx.fillStyle = shadeHex(helmColor, 1.16);
      ctx.fillRect(3, 2, 10, 2);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 13);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(0, 13, 16, 3);
    // Hair taper at nape
    ctx.fillStyle = hairDark;
    ctx.fillRect(2, 12, 12, 2);
    ctx.fillRect(5, 14, 6, 1);
    ctx.fillStyle = hairLight;
    ctx.fillRect(3, 3, 10, 2);
    ctx.fillRect(4, 7, 8, 1);
    return track(finalizePixelTexture(canvas));
  })();

  const makeHeadSide = (flip: boolean) => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    if (isRobot) {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = top2;
      ctx.fillRect(5, 6, 6, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(7, 7, 2, 3);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 14, 16, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (isVision) {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skin;
      if (!flip) {
        ctx.fillRect(0, 5, 5, 10);
        ctx.fillStyle = topLight;
        ctx.fillRect(8, 7, 3, 3); // subtle green ear-node
      } else {
        ctx.fillRect(11, 5, 5, 10);
        ctx.fillStyle = topLight;
        ctx.fillRect(5, 7, 3, 3);
      }
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 2);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(0, 14, 16, 2);
    if (isAncientOne || isSilverSurfer) {
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 2, 10, 4);
      return track(finalizePixelTexture(canvas));
    }
    if (isCaptainAmerica || appearance.hatStyle === 'captain-helm') {
      const helmColor = appearance.hatColor || '#1E4380';
      ctx.fillStyle = helmColor;
      ctx.fillRect(0, 0, 16, 14);
      ctx.fillStyle = skin;
      if (!flip) {
        ctx.fillRect(0, 7, 5, 7);
      } else {
        ctx.fillRect(11, 7, 5, 7);
      }
      ctx.fillStyle = shadeHex(helmColor, 0.74);
      ctx.fillRect(!flip ? 3 : 11, 11, 2, 5);
      ctx.fillStyle = '#D5DEE8';
      ctx.fillRect(!flip ? 7 : 6, 7, 3, 2);
      return track(finalizePixelTexture(canvas));
    }
    // Hair covering back + sideburn
    ctx.fillStyle = hair;
    if (!flip) {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(6, 4, 10, 8);
      ctx.fillRect(10, 12, 6, 2);
      ctx.fillRect(3, 4, 2, 4); // sideburn
      ctx.fillStyle = hairLight;
      ctx.fillRect(4, 2, 8, 1);
      if (isStrange) {
        ctx.fillStyle = appearance.hairSecondary ?? '#DCE5EE';
        ctx.fillRect(3, 3, 3, 5);
      } else if (isSpeed) {
        ctx.fillStyle = top2;
        ctx.fillRect(0, 5, 4, 10);
        ctx.fillRect(0, 4, 16, 2);
      } else if (isThor) {
        ctx.fillStyle = hairDark;
        ctx.fillRect(0, 11, 6, 5);
      }
    } else {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 10, 8);
      ctx.fillRect(0, 12, 6, 2);
      ctx.fillRect(11, 4, 2, 4); // sideburn
      ctx.fillStyle = hairLight;
      ctx.fillRect(4, 2, 8, 1);
      if (isStrange) {
        ctx.fillStyle = appearance.hairSecondary ?? '#DCE5EE';
        ctx.fillRect(10, 3, 3, 5);
      } else if (isSpeed) {
        ctx.fillStyle = top2;
        ctx.fillRect(12, 5, 4, 10);
        ctx.fillRect(0, 4, 16, 2);
      } else if (isThor) {
        ctx.fillStyle = hairDark;
        ctx.fillRect(10, 11, 6, 5);
      }
    }
    return track(finalizePixelTexture(canvas));
  };

  const headSideL = makeHeadSide(false);
  const headSideR = makeHeadSide(true);

  const headTop = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    if (isRobot) {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = hair;
      ctx.fillRect(5, 0, 6, 16);
      ctx.fillStyle = skinLight;
      ctx.fillRect(2, 3, 2, 10);
      ctx.fillRect(12, 3, 2, 10);
      return track(finalizePixelTexture(canvas));
    }
    if (isVision) {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(3, 3, 10, 6);
      return track(finalizePixelTexture(canvas));
    }
    if (isAncientOne || isSilverSurfer) {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skinLight;
      ctx.fillRect(3, 3, 10, 7);
      return track(finalizePixelTexture(canvas));
    }
    if (isCaptainAmerica || appearance.hatStyle === 'captain-helm') {
      const helmColor = appearance.hatColor || '#1E4380';
      ctx.fillStyle = helmColor;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = shadeHex(helmColor, 1.15);
      ctx.fillRect(3, 3, 10, 7);
      ctx.fillStyle = shadeHex(helmColor, 0.78);
      ctx.fillRect(0, 13, 16, 3);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = hairLight;
    ctx.fillRect(3, 3, 10, 6);
    ctx.fillStyle = hairDark;
    ctx.fillRect(0, 13, 16, 3);
    return track(finalizePixelTexture(canvas));
  })();

  const skinPlain = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 8);
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(0, 6, 8, 2);
    return track(finalizePixelTexture(canvas));
  })();

  // --- CHEST / UPPER TORSO (16x16) ---
  const chestFront = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    if (isRobot) {
      // Ultron-style metallic chest plating + dark mechanical rib vents + glowing crimson reactor core
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(1, 1, 14, 4);
      ctx.fillStyle = top2;
      ctx.fillRect(5, 0, 6, 2);
      ctx.fillRect(3, 9, 10, 6);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 2);
      // Glowing crimson chest reactor & energy veins
      ctx.fillStyle = '#141720';
      ctx.fillRect(5, 3, 6, 5);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 4, 4, 3);
      ctx.fillStyle = '#FF9EA8';
      ctx.fillRect(7, 5, 2, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(2, 6, 3, 1);
      ctx.fillRect(11, 6, 3, 1);
      ctx.fillRect(6, 10, 4, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'bodysuit') {
      // Phoenix Force / Dark Phoenix / White Phoenix sleek bodysuit with high collar & Phoenix bird emblem
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = isWhitePhoenix ? '#FFFFFF' : topLight;
      ctx.fillRect(1, 2, 14, 3);
      ctx.fillStyle = isWhitePhoenix ? '#DCE3EE' : topDark;
      ctx.fillRect(0, 14, 16, 2);

      // High sleek black neck collar
      ctx.fillStyle = accent;
      ctx.fillRect(4, 0, 8, 3);

      // Iconic V-spread Phoenix bird chest emblem across upper torso
      ctx.fillStyle = emblem;
      ctx.fillRect(1, 2, 3, 2);
      ctx.fillRect(12, 2, 3, 2);
      ctx.fillRect(2, 3, 4, 2);
      ctx.fillRect(10, 3, 4, 2);
      ctx.fillRect(4, 5, 8, 2);
      ctx.fillRect(7, 3, 2, 9);
      ctx.fillRect(6, 7, 4, 3);
      ctx.fillRect(7, 12, 2, 2);

      ctx.fillStyle = shadeHex(emblem, 1.15);
      ctx.fillRect(7, 5, 2, 4);

      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'invisible-suit') {
      // Fantastic Four Invisible Woman: cobalt-blue bodysuit, black high collar & side panels, circular "4" chest emblem, black V-belt
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 3, 12, 3);

      // Black sculpted side panels / waist contour
      ctx.fillStyle = top2;
      ctx.fillRect(0, 2, 2, 14);
      ctx.fillRect(14, 2, 2, 14);
      ctx.fillRect(2, 11, 1, 5);
      ctx.fillRect(13, 11, 1, 5);

      // Sleek black high neck collar with blue V-collar accent
      ctx.fillStyle = top2;
      ctx.fillRect(4, 0, 8, 3);
      ctx.fillStyle = top;
      ctx.fillRect(6, 1, 4, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(6, 2, 4, 1);

      // Circular "4" Fantastic Four chest emblem centered on upper chest
      ctx.fillStyle = top2;
      ctx.fillRect(6, 4, 4, 6);
      ctx.fillRect(5, 5, 6, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(6, 5, 4, 4);
      ctx.fillStyle = emblem;
      // Crisp pixel "4" inside circular badge
      ctx.fillRect(8, 5, 1, 4);
      ctx.fillRect(6, 7, 4, 1);
      ctx.fillRect(6, 6, 1, 1);
      ctx.fillRect(7, 5, 1, 1);

      // Sleek black V-belt trim at bottom
      ctx.fillStyle = sash;
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(6, 14, 4, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'captain-suit') {
      // Captain America navy tactical torso with silver chest star & red/white abdomen stripes
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 1, 12, 4);
      // High tactical navy collar + subtle silver shoulder straps
      ctx.fillStyle = topDark;
      ctx.fillRect(5, 0, 6, 2);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 1, 3, 1);
      ctx.fillRect(13, 1, 3, 1);
      // Crisp 5-point silver-white chest star centered
      ctx.fillStyle = emblem;
      ctx.fillRect(7, 3, 2, 5);
      ctx.fillRect(5, 4, 6, 2);
      ctx.fillRect(6, 6, 1, 2);
      ctx.fillRect(9, 6, 1, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(7, 4, 2, 2);
      // Vertical red & white tactical abdomen stripes
      for (let x = 2; x < 14; x += 2) {
        const isRed = ((x - 2) / 2) % 2 === 0;
        ctx.fillStyle = isRed ? top2 : accent;
        ctx.fillRect(x, 9, 2, 6);
      }
      ctx.fillStyle = sash;
      ctx.fillRect(0, 15, 16, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'thor-armor') {
      // Thor dark navy sleeveless armored vest with 6 glowing blue chest discs (2 cols x 3 rows)
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 2, 12, 3);
      // Center seam & sculpted armor plate bevels
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 2, 2, 13);
      ctx.fillRect(0, 14, 16, 2);
      // Exposed neck V
      ctx.fillStyle = skin;
      ctx.fillRect(6, 0, 4, 2);
      // 6 glowing sky-blue circular armor discs
      const discYs = [3, 7, 11];
      for (const dy of discYs) {
        for (const dx of [3, 11]) {
          ctx.fillStyle = '#2A557D';
          ctx.fillRect(dx, dy, 2, 2);
          ctx.fillStyle = accent;
          ctx.fillRect(dx, dy, 2, 2);
          ctx.fillStyle = '#E6FAFF';
          ctx.fillRect(dx, dy, 1, 1);
        }
      }
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'vampire-suit') {
      // Rogue (Vampire): classic green bodysuit with golden-yellow V-chevron center & cropped brown leather jacket sides
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(4, 2, 8, 3);

      // Golden-yellow chest V/band & high-neck trim
      ctx.fillStyle = top2;
      ctx.fillRect(4, 0, 8, 2);
      ctx.fillRect(4, 3, 8, 3);
      ctx.fillRect(5, 6, 6, 3);
      ctx.fillRect(6, 9, 4, 4);
      ctx.fillStyle = '#FFE478';
      ctx.fillRect(7, 4, 2, 4);

      // Cropped brown leather jacket shoulders & open front lapels ending at ribcage
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 4, 11);
      ctx.fillRect(12, 0, 4, 11);
      ctx.fillStyle = '#734229';
      ctx.fillRect(1, 1, 2, 9);
      ctx.fillRect(13, 1, 2, 9);
      ctx.fillStyle = '#3B1F11';
      ctx.fillRect(0, 10, 4, 1);
      ctx.fillRect(12, 10, 4, 1);

      // Green lower waist + golden belt at bottom edge
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 1);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 15, 16, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'emma-corset') {
      // Emma Frost / White Queen white corset with red/gold brooch & bare midriff
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);

      // Off-shoulder cape strap / fur neckline across upper chest
      ctx.fillStyle = top;
      ctx.fillRect(0, 2, 16, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 4, 16, 1);

      // Sculpted white corset bodice ending cleanly above midriff
      ctx.fillStyle = top;
      ctx.fillRect(2, 4, 12, 8);
      ctx.fillStyle = isWhiteQueen ? '#B8C4D4' : topDark;
      ctx.fillRect(4, 5, 1, 7);
      ctx.fillRect(11, 5, 1, 7);
      ctx.fillRect(2, 11, 12, 1);

      if (isWhiteQueen) {
        // Front-laced corset crisscross detail down chest center
        ctx.fillStyle = '#AAB8CA';
        ctx.fillRect(6, 5, 1, 6);
        ctx.fillRect(9, 5, 1, 6);
        ctx.fillStyle = '#FFFFFF';
        for (let y = 5; y <= 10; y += 2) {
          ctx.fillRect(7, y, 2, 1);
        }
        // Gold-rimmed circular red ruby brooch clasp at collar
        ctx.fillStyle = sash;
        ctx.fillRect(6, 1, 4, 4);
        ctx.fillStyle = emblem;
        ctx.fillRect(7, 2, 2, 2);
      } else {
        // Circular red & gold X clasp in center of upper chest
        ctx.fillStyle = emblem;
        ctx.fillRect(6, 3, 4, 4);
        ctx.fillStyle = sash;
        ctx.fillRect(6, 3, 1, 1);
        ctx.fillRect(9, 3, 1, 1);
        ctx.fillRect(7, 4, 2, 2);
        ctx.fillRect(6, 6, 1, 1);
        ctx.fillRect(9, 6, 1, 1);
      }

      // Exposed bare midriff at bottom 4 rows
      ctx.fillStyle = skin;
      ctx.fillRect(0, 12, 16, 4);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(7, 13, 2, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'hela-armor') {
      if (isWhiteHela) {
        // White Hela: pearl-white sculpted armor, bare upper shoulder cutouts, silver-grey geometric seams
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 16, 16);
        // Subtle alabaster contour highlights
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, 3, 8, 3);
        // Bare skin upper shoulder cutouts matching reference
        ctx.fillStyle = skin;
        ctx.fillRect(0, 1, 2, 4);
        ctx.fillRect(14, 1, 2, 4);
        // Pearl-white high collar
        ctx.fillStyle = '#E4EAF2';
        ctx.fillRect(4, 0, 8, 3);
        // Crisp silver-grey geometric chest contours & center diamond seam
        ctx.fillStyle = emblem;
        ctx.fillRect(7, 2, 2, 14);
        ctx.fillRect(5, 5, 1, 9);
        ctx.fillRect(10, 5, 1, 9);
        ctx.fillRect(3, 3, 2, 6);
        ctx.fillRect(11, 3, 2, 6);
        ctx.fillRect(6, 9, 4, 1);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 14, 16, 2);
        return track(finalizePixelTexture(canvas));
      }
      // Hela dark scaly black-teal armor with silver-emerald chest ribs
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = top2;
      for (let y = 1; y < 15; y += 2) {
        for (let x = (y % 4 === 1 ? 1 : 2); x < 15; x += 2) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#0D1214';
      ctx.fillRect(4, 0, 8, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(3, 3, 2, 5);
      ctx.fillRect(11, 3, 2, 5);
      ctx.fillRect(5, 5, 2, 9);
      ctx.fillRect(9, 5, 2, 9);
      ctx.fillRect(7, 2, 2, 13);
      ctx.fillStyle = shadeHex(emblem, 1.2);
      ctx.fillRect(7, 4, 2, 4);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 14, 16, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'agatha-gown') {
      // Agatha Harkness: deep teal pleated gown, dark lace chest bib, white turtleneck, oval brooch, purple striped shawl
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      // Horizontal/draped gown pleat shadows
      ctx.fillStyle = topDark;
      for (let y = 7; y < 15; y += 2) {
        ctx.fillRect(3, y, 10, 1);
      }
      // Dark ornate lace bib
      ctx.fillStyle = accent;
      ctx.fillRect(4, 1, 8, 6);
      ctx.fillStyle = topLight;
      for (let y = 2; y < 6; y += 2) {
        ctx.fillRect(5, y, 1, 1);
        ctx.fillRect(10, y, 1, 1);
      }
      // Crisp white turtleneck collar & oval gold/pearl brooch
      ctx.fillStyle = '#EEF2F8';
      ctx.fillRect(6, 0, 4, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(7, 3, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(7, 3, 1, 1);
      // Purple-indigo striped shawl down both sides
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 3, 16);
      ctx.fillRect(13, 0, 3, 16);
      ctx.fillStyle = sash;
      ctx.fillRect(1, 0, 1, 16);
      ctx.fillRect(14, 0, 1, 16);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'corset') {
      if (isWandaZombie) {
        // Wanda Zombie: tattered crimson long coat & dark-laced corset over grey undead collar
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 16, 16);
        // Grey decayed neck V
        ctx.fillStyle = skin;
        ctx.fillRect(5, 0, 6, 3);
        ctx.fillRect(6, 3, 4, 1);
        // Coat lapel folds & weathering
        ctx.fillStyle = topDark;
        ctx.fillRect(0, 1, 3, 15);
        ctx.fillRect(13, 1, 3, 15);
        ctx.fillRect(4, 3, 1, 13);
        ctx.fillRect(11, 3, 1, 13);
        // Front vertical corset lacing down center
        ctx.fillStyle = accent;
        ctx.fillRect(7, 4, 2, 12);
        ctx.fillStyle = topLight;
        for (let y = 5; y <= 13; y += 2) {
          ctx.fillRect(6, y, 1, 1);
          ctx.fillRect(9, y, 1, 1);
        }
        // Subtle blood/soot wear marks
        ctx.fillStyle = '#3B090E';
        ctx.fillRect(2, 8, 2, 3);
        ctx.fillRect(12, 11, 2, 2);
        return track(finalizePixelTexture(canvas));
      }
      if (isSupremeSorceress) {
        // Scarlet Witch Supreme Sorceress: lavender chest yoke, crimson collar, Eye of Agamotto & crescent moons, black V-corset
        ctx.fillStyle = '#957BB5'; // Sheer lavender-violet chest yoke
        ctx.fillRect(0, 0, 16, 7);
        // Crimson high neck collar & shoulder transition
        ctx.fillStyle = top2;
        ctx.fillRect(4, 0, 8, 3);
        ctx.fillRect(5, 2, 6, 1);
        // Dark plum bodysuit base below chest
        ctx.fillStyle = top;
        ctx.fillRect(0, 7, 16, 9);
        // Deep black V-corset bodice
        ctx.fillStyle = accent;
        ctx.fillRect(2, 6, 5, 4);
        ctx.fillRect(9, 6, 5, 4);
        ctx.fillRect(3, 9, 10, 7);
        ctx.fillStyle = '#957BB5';
        ctx.fillRect(7, 6, 2, 3); // Center sheer plunge V
        // Gold Eye of Agamotto flanked by white crescent moons
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, 3, 1, 2);
        ctx.fillRect(11, 3, 1, 2);
        ctx.fillStyle = emblem;
        ctx.fillRect(6, 3, 4, 3);
        ctx.fillStyle = '#FF2A3C';
        ctx.fillRect(7, 4, 2, 1);
        // Subtle mystic gold arc dots
        ctx.fillStyle = emblem;
        ctx.fillRect(3, 2, 1, 1);
        ctx.fillRect(12, 2, 1, 1);
        return track(finalizePixelTexture(canvas));
      }
      // Classic Scarlet Witch crimson bodice over soft rose-pink sheer shoulders/neckline
      ctx.fillStyle = top2; // rose-pink upper chest / neckline
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = skin;
      ctx.fillRect(5, 0, 6, 3);
      ctx.fillRect(6, 3, 4, 2);

      // Crimson corset cups & sweetheart V-cut bodice
      ctx.fillStyle = top;
      ctx.fillRect(1, 3, 5, 4);
      ctx.fillRect(10, 3, 5, 4);
      ctx.fillRect(1, 6, 14, 10);
      ctx.fillStyle = skin;
      ctx.fillRect(7, 4, 2, 2);

      ctx.fillStyle = topLight;
      ctx.fillRect(2, 4, 3, 2);
      ctx.fillRect(11, 4, 3, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(4, 7, 1, 8);
      ctx.fillRect(11, 7, 1, 8);
      ctx.fillRect(7, 7, 2, 9);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 2);
      return track(finalizePixelTexture(canvas));
    }

    if (appearance.topStyle === 'magneto-armor') {
      // Magneto sculpted crimson chest armor with purple collar clasp & muscle contour lines
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 3, 5, 4);
      ctx.fillRect(9, 3, 5, 4);
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 3, 2, 12);
      ctx.fillRect(2, 8, 12, 1);
      ctx.fillRect(3, 11, 10, 1);
      // Purple metallic chest mantle & shoulder clasps
      ctx.fillStyle = top2;
      ctx.fillRect(2, 0, 12, 3);
      ctx.fillRect(5, 2, 6, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(3, 1, 2, 1);
      ctx.fillRect(7, 2, 2, 1);
      ctx.fillRect(11, 1, 2, 1);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 14, 16, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'quicksilver-suit') {
      if (isSpeed) {
        // Speed: metallic emerald suit with sculpted dark-green chest plates, dark collar & crisp silver-white side rib accents
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = topLight;
        ctx.fillRect(3, 3, 4, 4);
        ctx.fillRect(9, 3, 4, 4);
        ctx.fillStyle = top2;
        ctx.fillRect(4, 0, 8, 2);
        ctx.fillRect(7, 2, 2, 13);
        ctx.fillRect(3, 7, 10, 1);
        ctx.fillRect(4, 11, 8, 1);
        // Silver-white side rib / underarm armor accents
        ctx.fillStyle = accent;
        ctx.fillRect(0, 2, 2, 8);
        ctx.fillRect(14, 2, 2, 8);
        ctx.fillStyle = '#BAC8D8';
        ctx.fillRect(1, 9, 1, 4);
        ctx.fillRect(14, 9, 1, 4);
        ctx.fillStyle = topDark;
        ctx.fillRect(0, 14, 16, 2);
        return track(finalizePixelTexture(canvas));
      }
      // Quicksilver sleek cobalt-teal suit with crisp silver-white diagonal lightning bolt
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(1, 2, 14, 3);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 2);
      // Crisp neckline collar trim
      ctx.fillStyle = emblem;
      ctx.fillRect(4, 0, 8, 1);
      // Iconic diagonal jagged lightning bolt across torso (top-left shoulder to bottom-center)
      ctx.fillStyle = emblem;
      ctx.fillRect(1, 0, 4, 3);
      ctx.fillRect(2, 3, 5, 3);
      ctx.fillRect(4, 5, 5, 3);
      ctx.fillRect(6, 7, 4, 3);
      ctx.fillRect(5, 10, 5, 3);
      ctx.fillRect(7, 13, 3, 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(3, 2, 2, 4);
      ctx.fillRect(6, 7, 2, 3);
      ctx.fillRect(7, 12, 2, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'strange-tunic') {
      if (isAncientOne) {
        // The Ancient One: saffron-ochre layered Sorcerer Supreme robe, lighter gold V-lapel, dark brown shoulder trim, black waist corset
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = topDark;
        ctx.fillRect(1, 3, 2, 9);
        ctx.fillRect(13, 3, 2, 9);
        // Inner lighter gold crossed collar V-lapels
        ctx.fillStyle = top2;
        ctx.fillRect(3, 0, 10, 5);
        ctx.fillRect(4, 5, 8, 4);
        ctx.fillRect(5, 9, 6, 3);
        ctx.fillStyle = top2Dark;
        ctx.fillRect(7, 2, 1, 9);
        // Neckline skin V
        ctx.fillStyle = skin;
        ctx.fillRect(6, 0, 4, 2);
        // Dark earth-brown mantle strips framing shoulders
        ctx.fillStyle = pantsAccent;
        ctx.fillRect(2, 0, 2, 7);
        ctx.fillRect(12, 0, 2, 7);
        // Wide black ribbed waist corset at bottom of chest
        ctx.fillStyle = sash;
        ctx.fillRect(1, 11, 14, 5);
        ctx.fillStyle = '#2B2E3B';
        ctx.fillRect(2, 12, 12, 1);
        ctx.fillRect(2, 14, 12, 1);
        return track(finalizePixelTexture(canvas));
      }
      // Doctor Strange layered blue sorcerer tunic with gold trim & crossed mystic straps
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topDark;
      ctx.fillRect(2, 2, 2, 13);
      ctx.fillRect(12, 2, 2, 13);
      ctx.fillRect(7, 4, 2, 12);
      // High collar V-fold
      ctx.fillStyle = accent;
      ctx.fillRect(4, 0, 8, 2);
      ctx.fillStyle = skin;
      ctx.fillRect(6, 0, 4, 1);
      // Gold mystic trim along crossed chest lapel
      ctx.fillStyle = emblem;
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(4 + i, 2 + i, 1, 2);
        ctx.fillRect(11 - i, 2 + i, 1, 2);
      }
      // Leather mystic chest strap
      ctx.fillStyle = sash;
      ctx.fillRect(0, 12, 16, 4);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 12, 4, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'vision-suit') {
      // Vision emerald green synthezoid suit with bold gold chest diamond/V plating
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(1, 2, 14, 3);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 14, 16, 2);
      // Bold golden chest triangle / diamond accent
      ctx.fillStyle = emblem;
      ctx.fillRect(3, 1, 10, 2);
      ctx.fillRect(4, 3, 8, 3);
      ctx.fillRect(5, 6, 6, 3);
      ctx.fillRect(6, 9, 4, 3);
      ctx.fillRect(7, 12, 2, 2);
      // Subtle emerald center V stripe + bright gold edge highlight
      ctx.fillStyle = top;
      ctx.fillRect(6, 2, 4, 2);
      ctx.fillStyle = shadeHex(emblem, 1.18);
      ctx.fillRect(7, 5, 2, 4);
      return track(finalizePixelTexture(canvas));
    }

    if (appearance.topStyle === 'silver-surfer') {
      // Metallic chrome-silver sculpted cosmic torso: pec highlights, sternum contour, rib & ab definition
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 2, 5, 4);
      ctx.fillRect(9, 2, 5, 4);
      ctx.fillRect(5, 8, 2, 2);
      ctx.fillRect(9, 8, 2, 2);
      ctx.fillRect(5, 11, 2, 2);
      ctx.fillRect(9, 11, 2, 2);
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 2, 2, 12);
      ctx.fillRect(2, 6, 5, 1);
      ctx.fillRect(9, 6, 5, 1);
      ctx.fillRect(4, 10, 8, 1);
      ctx.fillRect(4, 13, 8, 1);
      ctx.fillRect(0, 0, 1, 16);
      ctx.fillRect(15, 0, 1, 16);
      return track(finalizePixelTexture(canvas));
    }

    if (appearance.topStyle === 'storm-suit') {
      // Storm iconic black & gold comic bodysuit with exposed midriff diamond & shoulder clasps
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 2, 5, 4);
      ctx.fillRect(9, 2, 5, 4);
      // Exposed neckline
      ctx.fillStyle = skin;
      ctx.fillRect(5, 0, 6, 2);
      // Gold shoulder cape clasps
      ctx.fillStyle = emblem;
      ctx.fillRect(2, 1, 2, 2);
      ctx.fillRect(12, 1, 2, 2);
      // Exposed midriff diamond cutout framed in gold
      ctx.fillStyle = skin;
      ctx.fillRect(6, 9, 4, 5);
      ctx.fillRect(5, 10, 6, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 8, 4, 1);
      ctx.fillRect(7, 14, 2, 2);
      ctx.fillRect(5, 9, 1, 4);
      ctx.fillRect(10, 9, 1, 4);
      // Glossy chest gold V-accent
      ctx.fillRect(7, 6, 2, 2);
      return track(finalizePixelTexture(canvas));
    }

    ctx.fillStyle = top;
    ctx.fillRect(0, 0, 16, 16);

    // Subtle soft shading top & bottom
    ctx.fillStyle = topLight;
    ctx.fillRect(1, 1, 14, 3);
    ctx.fillStyle = topDark;
    ctx.fillRect(0, 13, 16, 3);

    // Neckline / undershirt V or crew collar
    ctx.fillStyle = top2;
    ctx.fillRect(5, 0, 6, 2);
    ctx.fillStyle = skin;
    ctx.fillRect(6, 0, 4, 1);

    if (appearance.topStyle === 'hoodie') {
      // Drawstrings
      ctx.fillStyle = top2;
      ctx.fillRect(6, 2, 1, 5);
      ctx.fillRect(9, 2, 1, 5);
      // Center seam & kangaroo pocket
      ctx.fillStyle = topDark;
      ctx.fillRect(4, 10, 8, 4);
      ctx.fillStyle = topLight;
      ctx.fillRect(5, 10, 6, 1);
      // Accent chest stripe / patch
      ctx.fillStyle = accent;
      ctx.fillRect(10, 4, 3, 2);
    } else if (appearance.topStyle === 'varsity') {
      // Center button placket & snaps
      ctx.fillStyle = top2;
      ctx.fillRect(7, 2, 2, 12);
      ctx.fillStyle = accent;
      ctx.fillRect(7, 4, 2, 1);
      ctx.fillRect(7, 8, 2, 1);
      ctx.fillRect(7, 12, 2, 1);
      // Ribbed accent hem
      ctx.fillStyle = accent;
      ctx.fillRect(0, 14, 16, 2);
    } else {
      // Clean graphic tee band
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 16, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(4, 6, 8, 2);
    }

    return track(finalizePixelTexture(canvas));
  })();

  const chestBack = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 16);
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = topLight;
    ctx.fillRect(2, 1, 12, 3);
    ctx.fillStyle = topDark;
    ctx.fillRect(0, 13, 16, 3);

    if (appearance.topStyle === 'bodysuit') {
      ctx.fillStyle = accent;
      ctx.fillRect(4, 0, 8, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(2, 3, 12, 2);
      ctx.fillRect(7, 5, 2, 6);
    } else if (appearance.topStyle === 'invisible-suit') {
      ctx.fillStyle = top2;
      ctx.fillRect(4, 0, 8, 3);
      ctx.fillRect(0, 2, 2, 14);
      ctx.fillRect(14, 2, 2, 14);
      ctx.fillStyle = sash;
      ctx.fillRect(0, 14, 16, 2);
    } else if (appearance.topStyle === 'captain-suit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 1, 3, 1);
      ctx.fillRect(13, 1, 3, 1);
      for (let x = 2; x < 14; x += 2) {
        const isRed = ((x - 2) / 2) % 2 === 0;
        ctx.fillStyle = isRed ? top2 : accent;
        ctx.fillRect(x, 9, 2, 6);
      }
      ctx.fillStyle = sash;
      ctx.fillRect(0, 15, 16, 1);
    } else if (appearance.topStyle === 'thor-armor') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 2, 2, 13);
      ctx.fillStyle = emblem;
      ctx.fillRect(3, 4, 2, 2);
      ctx.fillRect(11, 4, 2, 2);
    } else if (appearance.topStyle === 'vampire-suit') {
      // Cropped brown jacket across upper back revealing emerald green waist below
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 16, 11);
      ctx.fillStyle = '#734229';
      ctx.fillRect(2, 2, 12, 7);
      ctx.fillStyle = '#3B1F11';
      ctx.fillRect(0, 10, 16, 1);
      ctx.fillStyle = top2;
      ctx.fillRect(5, 0, 6, 2);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 15, 16, 1);
    } else if (appearance.topStyle === 'emma-corset') {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = top;
      ctx.fillRect(0, 2, 16, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(7, 4, 2, 8);
    } else if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = emblem;
      ctx.fillRect(5, 3, 2, 11);
      ctx.fillRect(9, 3, 2, 11);
      ctx.fillRect(3, 2, 10, 2);
    } else if (appearance.topStyle === 'agatha-gown') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = top2;
      ctx.fillRect(1, 0, 14, 5);
      ctx.fillStyle = sash;
      ctx.fillRect(3, 1, 10, 2);
    } else if (appearance.topStyle === 'corset') {
      ctx.fillStyle = isSupremeSorceress ? '#957BB5' : isWandaZombie ? top : top2;
      ctx.fillRect(4, 0, 8, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(7, 4, 2, 11);
      if (isSupremeSorceress) {
        ctx.fillStyle = top2;
        ctx.fillRect(4, 0, 8, 2);
      }
    } else if (appearance.topStyle === 'magneto-armor') {
      ctx.fillStyle = top2;
      ctx.fillRect(2, 0, 12, 3);
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 3, 2, 11);
    } else if (appearance.topStyle === 'quicksilver-suit') {
      if (isSpeed) {
        ctx.fillStyle = top2;
        ctx.fillRect(4, 0, 8, 2);
        ctx.fillRect(7, 2, 2, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 2, 2, 9);
        ctx.fillRect(14, 2, 2, 9);
      } else {
        ctx.fillStyle = emblem;
        ctx.fillRect(11, 0, 4, 3);
        ctx.fillRect(9, 3, 4, 3);
        ctx.fillRect(7, 6, 4, 3);
        ctx.fillRect(6, 9, 4, 4);
        ctx.fillRect(6, 13, 3, 3);
      }
    } else if (appearance.topStyle === 'strange-tunic') {
      if (isAncientOne) {
        ctx.fillStyle = top2;
        ctx.fillRect(3, 0, 10, 3);
        ctx.fillStyle = pantsAccent;
        ctx.fillRect(2, 0, 2, 8);
        ctx.fillRect(12, 0, 2, 8);
        ctx.fillStyle = sash;
        ctx.fillRect(1, 11, 14, 5);
      } else {
        ctx.fillStyle = sash;
        ctx.fillRect(0, 12, 16, 4);
        ctx.fillStyle = emblem;
        ctx.fillRect(7, 1, 2, 11);
      }
    } else if (appearance.topStyle === 'vision-suit') {
      ctx.fillStyle = emblem;
      ctx.fillRect(4, 2, 8, 3);
      ctx.fillRect(6, 5, 4, 5);
    } else if (appearance.topStyle === 'hoodie') {
      // Folded hood silhouette on upper back
      ctx.fillStyle = topDark;
      ctx.fillRect(3, 0, 10, 5);
      ctx.fillStyle = top;
      ctx.fillRect(4, 0, 8, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(5, 1, 6, 1);
    } else if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 2, 5, 4);
      ctx.fillRect(9, 2, 5, 4);
      ctx.fillStyle = topDark;
      ctx.fillRect(7, 1, 2, 14);
      ctx.fillRect(3, 7, 10, 1);
    } else if (appearance.topStyle === 'storm-suit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = emblem;
      ctx.fillRect(2, 1, 3, 2);
      ctx.fillRect(11, 1, 3, 2);
      ctx.fillRect(0, 14, 16, 2);
    } else if (appearance.topStyle === 'varsity') {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillStyle = top2;
      ctx.fillRect(4, 4, 8, 2);
    } else {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 16, 4);
    }

    return track(finalizePixelTexture(canvas));
  })();

  const chestSide = (() => {
    const { canvas, ctx } = createPixelCanvas(12, 16);
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, 12, 16);
    ctx.fillStyle = topDark;
    ctx.fillRect(0, 13, 12, 3);
    if (appearance.topStyle === 'bodysuit') {
      ctx.fillStyle = emblem;
      ctx.fillRect(4, 2, 4, 2);
    } else if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(4, 2, 4, 8);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 12, 12, 4);
    } else if (appearance.topStyle === 'storm-suit') {
      ctx.fillStyle = emblem;
      ctx.fillRect(5, 10, 2, 6);
    } else if (appearance.topStyle === 'invisible-suit') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 12, 16);
      ctx.fillStyle = accent;
      ctx.fillRect(5, 0, 2, 14);
      ctx.fillStyle = sash;
      ctx.fillRect(0, 14, 12, 2);
    } else if (appearance.topStyle === 'emma-corset') {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 12, 16);
      ctx.fillStyle = top;
      ctx.fillRect(0, 2, 12, 10);
    } else if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 12, 16);
      ctx.fillStyle = emblem;
      ctx.fillRect(5, 4, 2, 10);
    } else if (appearance.topStyle === 'agatha-gown') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 12, 16);
      ctx.fillStyle = sash;
      ctx.fillRect(5, 0, 2, 16);
    } else if (appearance.topStyle === 'corset') {
      ctx.fillStyle = isWandaZombie ? top : top2;
      ctx.fillRect(0, 0, 12, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(5, 4, 2, 10);
    } else if (appearance.topStyle === 'magneto-armor') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 12, 3);
    } else if (appearance.topStyle === 'quicksilver-suit') {
      ctx.fillStyle = isSpeed ? accent : emblem;
      ctx.fillRect(isSpeed ? 3 : 5, 0, isSpeed ? 6 : 2, 16);
      if (isSpeed) {
        ctx.fillStyle = top2;
        ctx.fillRect(4, 11, 4, 5);
      }
    } else if (appearance.topStyle === 'strange-tunic') {
      ctx.fillStyle = sash;
      ctx.fillRect(0, 12, 12, 4);
    } else if (appearance.topStyle === 'vision-suit') {
      ctx.fillStyle = emblem;
      ctx.fillRect(5, 3, 2, 7);
    } else if (appearance.topStyle === 'tee') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 12, 4);
    } else if (appearance.topStyle === 'varsity') {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 14, 12, 2);
    }
    return track(finalizePixelTexture(canvas));
  })();

  const chestTop = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 12);
    ctx.fillStyle =
      appearance.topStyle === 'corset'
        ? top2
        : appearance.topStyle === 'bodysuit' ||
            appearance.topStyle === 'hela-armor' ||
            appearance.topStyle === 'magneto-armor' ||
            appearance.topStyle === 'quicksilver-suit' ||
            appearance.topStyle === 'strange-tunic' ||
            appearance.topStyle === 'vision-suit' ||
            appearance.topStyle === 'invisible-suit' ||
            appearance.topStyle === 'silver-surfer' ||
            appearance.topStyle === 'storm-suit'
          ? top
          : appearance.topStyle === 'emma-corset'
            ? skin
            : topLight;
    ctx.fillRect(0, 0, 16, 12);
    ctx.fillStyle =
      appearance.topStyle === 'bodysuit' ||
      appearance.topStyle === 'hela-armor' ||
      appearance.topStyle === 'invisible-suit'
        ? accent
        : appearance.topStyle === 'emma-corset'
          ? skin
          : top2;
    ctx.fillRect(5, 3, 6, 6);
    ctx.fillStyle = skin;
    ctx.fillRect(6, 4, 4, 4);
    return track(finalizePixelTexture(canvas));
  })();

  // --- WAIST / LOWER TORSO (16x8) ---
  const waistBand = (() => {
    const { canvas, ctx } = createPixelCanvas(16, 8);
    if (appearance.topStyle === 'bodysuit') {
      // Diagonal Phoenix sash across bodysuit waist
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = sash;
      for (let x = 0; x < 16; x++) {
        const y = Math.floor(1 + (x / 15) * 3);
        ctx.fillRect(x, y, 1, 3);
      }
      ctx.fillStyle = shadeHex(sash, 0.82);
      ctx.fillRect(0, 7, 16, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'invisible-suit') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      // Black V-belt across top & subtle center V
      ctx.fillStyle = sash;
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(4, 2, 8, 1);
      ctx.fillRect(6, 3, 4, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(6, 0, 4, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'captain-suit') {
      // Dark tactical utility belt with pouches & silver buckle over navy combat waist
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = sash;
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = '#2B364C';
      ctx.fillRect(1, 0, 3, 3);
      ctx.fillRect(12, 0, 3, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 0, 4, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'thor-armor') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = topDark;
      ctx.fillRect(6, 0, 4, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'vampire-suit') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = sash;
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 0, 4, 3);
      ctx.fillStyle = '#FFE478';
      ctx.fillRect(7, 1, 2, 1);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'emma-corset') {
      // Exposed midriff skin blending down into tailored white waistband
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = pants;
      ctx.fillRect(0, 3, 16, 5);
      ctx.fillStyle = pantsAccent;
      ctx.fillRect(0, 3, 16, 1);
      ctx.fillRect(6, 3, 4, 2);
      if (isWhiteQueen) {
        // High-cut white briefs revealing outer hip skin
        ctx.fillStyle = skin;
        ctx.fillRect(0, 6, 3, 2);
        ctx.fillRect(13, 6, 3, 2);
      }
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = emblem;
      ctx.fillRect(2, 0, 2, 7);
      ctx.fillRect(7, 0, 2, 8);
      ctx.fillRect(12, 0, 2, 7);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'magneto-armor') {
      // Magneto metallic purple belt & briefs
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(6, 0, 4, 3);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 6, 16, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'quicksilver-suit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 16, 8);
      if (isSpeed) {
        ctx.fillStyle = top2;
        ctx.fillRect(0, 0, 16, 2);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 2, 2, 6);
        ctx.fillRect(14, 2, 2, 6);
      } else {
        ctx.fillStyle = emblem;
        ctx.fillRect(7, 0, 3, 4);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 16, 1);
      }
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'strange-tunic') {
      if (isAncientOne) {
        // Wide black waist corset tapering into saffron lower robe skirt
        ctx.fillStyle = sash;
        ctx.fillRect(0, 0, 16, 5);
        ctx.fillStyle = '#2B2E3B';
        ctx.fillRect(2, 1, 12, 1);
        ctx.fillRect(2, 3, 12, 1);
        ctx.fillStyle = top;
        ctx.fillRect(0, 5, 16, 3);
        return track(finalizePixelTexture(canvas));
      }
      // Layered leather & cloth sorcerer belt with gold mystic buckle
      ctx.fillStyle = sash;
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = top;
      ctx.fillRect(0, 4, 16, 4);
      ctx.fillStyle = emblem;
      ctx.fillRect(6, 0, 4, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'vision-suit') {
      // Golden synthezoid belt & briefs over green tights
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 0, 16, 6);
      ctx.fillStyle = top;
      ctx.fillRect(0, 6, 16, 2);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(3, 0, 1, 5);
      ctx.fillRect(7, 0, 2, 5);
      ctx.fillRect(12, 0, 1, 5);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'agatha-gown') {
      // Agatha Harkness pleated teal gown waist with purple shawl borders
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = top;
      for (let x = 2; x < 14; x += 2) {
        ctx.fillRect(x, 0, 1, 8);
      }
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 3, 8);
      ctx.fillRect(13, 0, 3, 8);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(4, 1, 8, 3);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 6, 16, 2);
      ctx.fillRect(7, 1, 2, 6);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'storm-suit') {
      // Sleek black bodysuit V-cut briefs with gold buckle over dark skin hips
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = skin;
      ctx.fillRect(0, 4, 3, 4);
      ctx.fillRect(13, 4, 3, 4);
      ctx.fillStyle = sash;
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(6, 0, 4, 3);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(3, 6, 10, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.pantsStyle === 'tights') {
      if (isWandaZombie) {
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 16, 8);
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 4, 5);
        ctx.fillRect(12, 0, 4, 5);
        ctx.fillStyle = accent;
        ctx.fillRect(6, 0, 4, 3);
        return track(finalizePixelTexture(canvas));
      }
      if (isSupremeSorceress) {
        // Dark plum bodysuit with deep black V-cut and crimson belt crest
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 16, 8);
        ctx.fillStyle = accent;
        ctx.fillRect(1, 0, 14, 3);
        ctx.fillRect(3, 3, 10, 3);
        ctx.fillRect(6, 6, 4, 2);
        ctx.fillStyle = pantsAccent;
        ctx.fillRect(0, 0, 16, 1);
        return track(finalizePixelTexture(canvas));
      }
      // Crimson bodysuit V-cut over rose-pink tights
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = pantsAccent;
      ctx.fillRect(1, 0, 14, 3);
      ctx.fillRect(3, 3, 10, 3);
      ctx.fillRect(6, 6, 4, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 16, 1);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = pants;
    ctx.fillRect(0, 0, 16, 8);
    ctx.fillStyle = pantsDark;
    ctx.fillRect(0, 6, 16, 2);
    // Clean belt/waistband trim
    ctx.fillStyle = pantsAccent;
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = top2;
    ctx.fillRect(6, 0, 4, 2);
    return track(finalizePixelTexture(canvas));
  })();

  // --- ARMS (8x10) ---
  const upperArm = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 10);
    if (appearance.topStyle === 'bodysuit') {
      // Green / black short bodysuit shoulder transitioning into gold / crimson-red long gloves
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 8, 5);
      ctx.fillStyle = top2Light;
      ctx.fillRect(2, 6, 3, 4);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 5, 8, 1);
    } else if (appearance.topStyle === 'invisible-suit') {
      // Cobalt-blue upper sleeve transitioning into black glove top cuff with blue stripe
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 6);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 6, 8, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 6, 8, 1);
    } else if (appearance.topStyle === 'captain-suit') {
      // Captain America navy upper sleeve with silver shoulder trim & white/grey inner panel
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 8, 1);
      ctx.fillRect(2, 4, 4, 6);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 9, 8, 1);
    } else if (appearance.topStyle === 'thor-armor') {
      // Steel chainmail upper sleeves with pixel scale highlights
      ctx.fillStyle = '#535C6B';
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#8B97AA';
      for (let y = 0; y < 10; y += 2) {
        for (let x = y % 4 === 0 ? 0 : 1; x < 8; x += 2) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'vampire-suit') {
      // Cropped brown leather jacket sleeve rolled above green/yellow glove cuff
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = '#734229';
      ctx.fillRect(2, 1, 4, 6);
      ctx.fillStyle = '#3B1F11';
      ctx.fillRect(0, 7, 8, 1);
      ctx.fillStyle = top;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'emma-corset') {
      // Bare shoulder skin transitioning into white long opera glove
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 8, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 5, 8, 1);
    } else if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, isWhiteHela ? 4 : 2);
      ctx.fillStyle = top;
      ctx.fillRect(0, isWhiteHela ? 4 : 2, 8, isWhiteHela ? 6 : 8);
      ctx.fillStyle = emblem;
      ctx.fillRect(3, isWhiteHela ? 5 : 3, 2, isWhiteHela ? 5 : 6);
    } else if (appearance.topStyle === 'agatha-gown') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 7, 8, 3);
    } else if (appearance.topStyle === 'corset') {
      if (isWandaZombie) {
        // Tattered crimson sleeve with torn elbow hole showing grey zombie skin
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = topDark;
        ctx.fillRect(0, 8, 8, 2);
        ctx.fillStyle = skin;
        ctx.fillRect(2, 5, 4, 3);
      } else if (isSupremeSorceress) {
        // Lavender shoulder cap into deep black sleeve
        ctx.fillStyle = '#957BB5';
        ctx.fillRect(0, 0, 8, 3);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 3, 8, 7);
      } else {
        // Rose-pink sheer sleeves + flared crimson upper glove cuff
        ctx.fillStyle = top2;
        ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = top2Dark;
        ctx.fillRect(0, 6, 8, 2);
        ctx.fillStyle = top;
        ctx.fillRect(0, 8, 8, 2);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 8, 8, 1);
      }
    } else if (appearance.topStyle === 'magneto-armor') {
      // Magneto crimson shoulder sleeve into purple gauntlet cuff
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 7);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 7, 8, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 7, 8, 1);
    } else if (appearance.topStyle === 'quicksilver-suit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      if (isSpeed) {
        ctx.fillStyle = topLight;
        ctx.fillRect(1, 0, 6, 3);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 3, 8, 1);
        ctx.fillStyle = accent;
        ctx.fillRect(2, 4, 4, 6);
      } else {
        ctx.fillStyle = emblem;
        ctx.fillRect(3, 0, 2, 10);
      }
    } else if (appearance.topStyle === 'strange-tunic') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 4, 8, 2);
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'vision-suit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 7);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 7, 8, 3);
    } else if (appearance.topStyle === 'tee') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 6);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 5, 8, 1);
      ctx.fillStyle = skin;
      ctx.fillRect(0, 6, 8, 4);
    } else if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 3, 7);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'storm-suit') {
      // Bare dark arms with gold bicep armband leading to long black forearm gauntlets
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 7);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 5, 8, 1);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 7, 8, 3);
    } else {
      const sleeveColor = appearance.topStyle === 'varsity' ? top2 : top;
      const sleeveShade = appearance.topStyle === 'varsity' ? top2Dark : topDark;
      ctx.fillStyle = sleeveColor;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = sleeveShade;
      ctx.fillRect(0, 8, 8, 2);
      // Shoulder accent stripe
      ctx.fillStyle = accent;
      ctx.fillRect(3, 0, 2, 10);
    }
    return track(finalizePixelTexture(canvas));
  })();

  const lowerArm = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 10);
    if (appearance.topStyle === 'captain-suit') {
      // Navy elbow to crimson tactical forearm glove
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 3);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 3, 8, 7);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 3, 8, 1);
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'thor-armor') {
      // Chainmail forearm transitioning into dark armored wrist bracer
      ctx.fillStyle = '#535C6B';
      ctx.fillRect(0, 0, 8, 6);
      ctx.fillStyle = '#8B97AA';
      for (let y = 0; y < 6; y += 2) {
        for (let x = y % 4 === 0 ? 0 : 1; x < 8; x += 2) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = top;
      ctx.fillRect(0, 6, 8, 4);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 9, 8, 1);
    } else if (
      appearance.topStyle === 'bodysuit' ||
      appearance.topStyle === 'emma-corset' ||
      appearance.topStyle === 'vision-suit' ||
      appearance.topStyle === 'vampire-suit'
    ) {
      // Sleek gold / crimson / crisp white long opera gloves / gauntlets
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = top2Light;
      ctx.fillRect(2, 1, 3, 7);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'invisible-suit') {
      // Sleek black long gloves with crisp cyan cuff line
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#243046';
      ctx.fillRect(2, 1, 3, 7);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 7, 8, 1);
    } else if (appearance.topStyle === 'magneto-armor') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 2, 8, 1);
      ctx.fillRect(0, 6, 8, 1);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'quicksilver-suit') {
      if (isSpeed) {
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 5);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 5, 8, 5);
        ctx.fillStyle = accent;
        ctx.fillRect(2, 0, 3, 5);
      } else {
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 4);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 4, 8, 6);
        ctx.fillStyle = emblem;
        ctx.fillRect(0, 4, 8, 1);
      }
    } else if (appearance.topStyle === 'strange-tunic') {
      if (isAncientOne) {
        // Wide saffron-ochre sleeves with dark brown edge cuff
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = top2;
        ctx.fillRect(1, 0, 6, 3);
        ctx.fillStyle = pantsAccent;
        ctx.fillRect(0, 8, 8, 2);
      } else {
        // Cloth-wrapped sorcerer forearm bindings
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 2, 8, 2);
        ctx.fillRect(0, 6, 8, 2);
        ctx.fillStyle = emblem;
        ctx.fillRect(0, 8, 8, 1);
      }
    } else if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = emblem;
      ctx.fillRect(2, 2, 1, 7);
      ctx.fillRect(5, 2, 1, 7);
      ctx.fillStyle = top2;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'agatha-gown') {
      // Teal sleeve into dark lace fingerless witch cuff + skin wrist
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 5, 8, 4);
      ctx.fillStyle = skin;
      ctx.fillRect(0, 9, 8, 1);
    } else if (appearance.topStyle === 'corset') {
      if (isWandaZombie) {
        // Torn crimson sleeve revealing forearm zombie skin & red glow fade near wrist
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 7);
        ctx.fillStyle = skin;
        ctx.fillRect(1, 2, 4, 4);
        ctx.fillStyle = '#B81B2C';
        ctx.fillRect(0, 7, 8, 3);
      } else if (isSupremeSorceress) {
        // Deep black sleeve gradient into crimson lower forearm glove
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 8, 4);
        ctx.fillStyle = '#6A1228';
        ctx.fillRect(0, 4, 8, 3);
        ctx.fillStyle = top2;
        ctx.fillRect(0, 7, 8, 3);
      } else {
        // Crimson elbow-length gloves with subtle highlight & seam
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = topLight;
        ctx.fillRect(2, 1, 3, 7);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 8, 2);
        ctx.fillStyle = topDark;
        ctx.fillRect(0, 8, 8, 2);
      }
    } else if (appearance.topStyle === 'tee') {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 8, 8, 2);
      // Wristband
      ctx.fillStyle = accent;
      ctx.fillRect(0, 6, 8, 2);
    } else if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 3, 7);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'storm-suit') {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = emblem;
      ctx.fillRect(0, 0, 8, 1);
      ctx.fillRect(0, 7, 8, 1);
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 9, 8, 1);
    } else {
      const sleeveColor = appearance.topStyle === 'varsity' ? top2 : top;
      const sleeveShade = appearance.topStyle === 'varsity' ? top2Dark : topDark;
      ctx.fillStyle = sleeveColor;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = sleeveShade;
      ctx.fillRect(0, 6, 8, 2);
      // Ribbed cuff
      ctx.fillStyle = accent;
      ctx.fillRect(0, 8, 8, 2);
    }
    return track(finalizePixelTexture(canvas));
  })();

  const hand = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 8);
    if (
      appearance.topStyle === 'bodysuit' ||
      appearance.topStyle === 'emma-corset' ||
      appearance.topStyle === 'magneto-armor' ||
      appearance.topStyle === 'vision-suit' ||
      appearance.topStyle === 'invisible-suit' ||
      appearance.topStyle === 'vampire-suit' ||
      appearance.topStyle === 'captain-suit' ||
      appearance.topStyle === 'storm-suit'
    ) {
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = appearance.topStyle === 'invisible-suit' ? '#243046' : top2Light;
      ctx.fillRect(2, 1, 4, 4);
      if (appearance.topStyle === 'invisible-suit') {
        ctx.fillStyle = accent;
        ctx.fillRect(1, 2, 6, 1);
      }
      ctx.fillStyle = top2Dark;
      ctx.fillRect(0, 6, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'agatha-gown') {
      // Fair witch hands with dark corrupted-purple fingertips
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = '#2B173D';
      ctx.fillRect(0, 5, 8, 3);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'corset' || appearance.topStyle === 'hela-armor') {
      if (isWandaZombie) {
        // Glowing fierce crimson-red corrupted undead hands
        ctx.fillStyle = '#B81828';
        ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = '#FF3D24';
        ctx.fillRect(2, 2, 4, 4);
        ctx.fillStyle = '#360B10';
        ctx.fillRect(0, 6, 8, 2);
        return track(finalizePixelTexture(canvas));
      }
      if (isSupremeSorceress) {
        // Crimson mystic gloves fading slightly with glowing arcane rune sigils
        ctx.fillStyle = top2;
        ctx.fillRect(0, 0, 8, 5);
        ctx.fillStyle = skin;
        ctx.fillRect(0, 5, 8, 3);
        ctx.fillStyle = '#FFE388';
        ctx.fillRect(3, 1, 2, 2);
        ctx.fillRect(2, 3, 1, 1);
        ctx.fillRect(5, 3, 1, 1);
        return track(finalizePixelTexture(canvas));
      }
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = topLight;
      ctx.fillRect(2, 1, 4, 4);
      ctx.fillStyle = topDark;
      ctx.fillRect(0, 6, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (isSpeed) {
      // Fingerless dark emerald cuff with metallic silver-white gloved hand & knuckles
      ctx.fillStyle = top2;
      ctx.fillRect(0, 0, 8, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 2, 8, 6);
      ctx.fillStyle = '#BAC8D8';
      ctx.fillRect(0, 6, 8, 2);
      ctx.fillRect(2, 4, 4, 1);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = skinLight;
    ctx.fillRect(2, 1, 4, 4);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(0, 6, 8, 2);
    return track(finalizePixelTexture(canvas));
  })();

  // --- LEGS (8x10) ---
  const upperLeg = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 10);
    if (appearance.topStyle === 'bodysuit' || appearance.topStyle === 'vampire-suit') {
      // Emerald green upper thigh transitioning into angled thigh-high yellow/gold boots
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 4);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 4, 8, 6);
      ctx.fillRect(3, 3, 2, 1); // angled V-cut thigh boot peak
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(2, 5, 3, 4);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'invisible-suit' || appearance.topStyle === 'captain-suit' || appearance.topStyle === 'thor-armor') {
      // Tactical navy pants with subtle seam sculpting
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = pantsAccent;
      ctx.fillRect(0, 0, 2, 10);
      ctx.fillRect(6, 0, 2, 10);
      ctx.fillStyle = pantsLight;
      ctx.fillRect(2, 1, 4, 7);
      return track(finalizePixelTexture(canvas));
    }
    if (isWhiteQueen) {
      // White Queen: bare upper thighs transitioning cleanly into thigh-high white boots
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 4, 8, 1);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 5, 8, 5);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(0, 5, 8, 1);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = emblem;
      ctx.fillRect(1, 0, 1, 10);
      ctx.fillRect(5, 1, 1, 8);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 8, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'agatha-gown') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = topDark;
      ctx.fillRect(2, 0, 1, 10);
      ctx.fillRect(5, 0, 1, 10);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.pantsStyle === 'tights') {
      if (isWandaZombie) {
        // Dark torn pants revealing grey decayed skin patches
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = skin;
        ctx.fillRect(2, 3, 4, 4);
        ctx.fillStyle = pantsDark;
        ctx.fillRect(0, 8, 8, 2);
        return track(finalizePixelTexture(canvas));
      }
      if (isSupremeSorceress) {
        // Dark plum thighs with crimson chevron plates & dark inner seams
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = pantsAccent;
        ctx.fillRect(0, 2, 2, 6);
        ctx.fillRect(6, 2, 2, 6);
        ctx.fillStyle = accent;
        ctx.fillRect(3, 1, 2, 9);
        ctx.fillStyle = pantsDark;
        ctx.fillRect(0, 8, 8, 2);
        return track(finalizePixelTexture(canvas));
      }
      if (isSpeed) {
        // Metallic emerald thighs with bright silver-white outer racing panel
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 10);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 3, 9);
        ctx.fillRect(5, 0, 3, 9);
        ctx.fillStyle = top2;
        ctx.fillRect(3, 0, 2, 10);
        ctx.fillStyle = pantsDark;
        ctx.fillRect(0, 8, 8, 2);
        return track(finalizePixelTexture(canvas));
      }
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = pantsLight;
      ctx.fillRect(2, 1, 4, 7);
      ctx.fillStyle = pantsAccent;
      ctx.fillRect(0, 0, 8, 2);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 8, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 4, 7);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 8, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    if (appearance.topStyle === 'storm-suit') {
      // Bare dark brown upper thighs transitioning into thigh-high black boots with gold top V-trim
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 5, 8, 5);
      ctx.fillRect(3, 4, 2, 1);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(0, 5, 8, 1);
      ctx.fillRect(3, 4, 2, 1);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = pants;
    ctx.fillRect(0, 0, 8, 10);
    ctx.fillStyle = pantsLight;
    ctx.fillRect(2, 1, 4, 7);
    ctx.fillStyle = pantsAccent;
    ctx.fillRect(0, 0, 1, 10);
    ctx.fillStyle = pantsDark;
    ctx.fillRect(0, 8, 8, 2);
    return track(finalizePixelTexture(canvas));
  })();

  const lowerLeg = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 10);
    if (
      appearance.topStyle === 'bodysuit' ||
      appearance.topStyle === 'emma-corset' ||
      appearance.topStyle === 'vampire-suit' ||
      appearance.topStyle === 'storm-suit'
    ) {
      // Full thigh/knee-high boots / white tailored boots
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(2, 1, 3, 7);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'captain-suit' || appearance.topStyle === 'thor-armor') {
      // Navy knee transitioning into tall crimson/dark armored tactical boots
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 2);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 2, 8, 8);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(2, 3, 4, 1);
      ctx.fillRect(2, 6, 4, 1);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'invisible-suit') {
      // Blue knee above sleek black knee-high boots with 3 side buckle tabs
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 2);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 2, 8, 8);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(0, 2, 8, 1);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(0, 4, 2, 1);
      ctx.fillRect(0, 6, 2, 1);
      ctx.fillRect(0, 8, 2, 1);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 9, 8, 1);
    } else if (appearance.topStyle === 'magneto-armor') {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(0, 2, 8, 1);
      ctx.fillRect(0, 5, 8, 1);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'vision-suit') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 3);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 3, 8, 7);
      ctx.fillRect(3, 2, 2, 1);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'strange-tunic' || appearance.topStyle === 'quicksilver-suit') {
      if (isAncientOne) {
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 5);
        ctx.fillStyle = shoe;
        ctx.fillRect(0, 5, 8, 5);
        ctx.fillStyle = shoeDark;
        ctx.fillRect(0, 8, 8, 2);
      } else {
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 4);
        ctx.fillStyle = shoe;
        ctx.fillRect(0, 4, 8, 6);
        ctx.fillStyle = shoeAccent;
        ctx.fillRect(2, 4, 4, 2);
        ctx.fillStyle = shoeDark;
        ctx.fillRect(0, 8, 8, 2);
      }
    } else if (appearance.topStyle === 'hela-armor') {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(3, 1, 2, 7);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.topStyle === 'agatha-gown') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 6);
      ctx.fillStyle = topDark;
      ctx.fillRect(3, 0, 2, 6);
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 6, 8, 4);
    } else if (appearance.topStyle === 'silver-surfer') {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 4, 7);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 8, 8, 2);
    } else if (appearance.pantsStyle === 'tights') {
      if (isWandaZombie) {
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 5);
        ctx.fillStyle = skin;
        ctx.fillRect(2, 0, 3, 2);
        ctx.fillStyle = shoe;
        ctx.fillRect(0, 5, 8, 5);
        ctx.fillStyle = shoeDark;
        ctx.fillRect(0, 8, 8, 2);
      } else {
        // Rose-pink tights down to crimson V-notched knee-high boots
        ctx.fillStyle = pants;
        ctx.fillRect(0, 0, 8, 4);
        ctx.fillStyle = shoe;
        ctx.fillRect(0, 3, 8, 7);
        ctx.fillStyle = shoeAccent;
        ctx.fillRect(3, 2, 2, 2); // V-notch boot peak
        ctx.fillStyle = shoeDark;
        ctx.fillRect(0, 8, 8, 2);
      }
    } else if (appearance.pantsStyle === 'shorts') {
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 8, 7);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(0, 5, 8, 2);
      // Crew socks
      ctx.fillStyle = sole;
      ctx.fillRect(0, 7, 8, 3);
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(0, 7, 8, 1);
    } else {
      ctx.fillStyle = pants;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = pantsDark;
      ctx.fillRect(0, 6, 8, 2);
      // Jogger cuff / folded denim cuff
      ctx.fillStyle = pantsAccent;
      ctx.fillRect(0, 8, 8, 2);
    }
    return track(finalizePixelTexture(canvas));
  })();

  // --- SNEAKERS / BOOTS / FEET ---
  const footFront = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 8);
    if (isSilverSurfer) {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 4, 4);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 6, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = shoe;
    ctx.fillRect(0, 0, 8, 6);
    if (appearance.pantsStyle === 'tights') {
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(2, 1, 4, 3);
      ctx.fillStyle = sole;
      ctx.fillRect(0, 6, 8, 2);
    } else {
      // Tongue + pixel laces
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(2, 0, 4, 2);
      ctx.fillStyle = sole;
      ctx.fillRect(2, 2, 4, 1);
      ctx.fillRect(2, 4, 4, 1);
      // Crisp midsole
      ctx.fillStyle = sole;
      ctx.fillRect(0, 5, 8, 3);
    }
    return track(finalizePixelTexture(canvas));
  })();

  const footSide = (() => {
    const { canvas, ctx } = createPixelCanvas(12, 8);
    if (isSilverSurfer) {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 12, 8);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 1, 7, 3);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 6, 12, 2);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = shoe;
    ctx.fillRect(0, 0, 12, 6);
    ctx.fillStyle = shoeDark;
    ctx.fillRect(0, 4, 12, 2);
    if (appearance.pantsStyle === 'tights') {
      ctx.fillStyle = sole;
      ctx.fillRect(0, 6, 12, 2);
    } else {
      ctx.fillStyle = shoeAccent;
      ctx.fillRect(3, 2, 6, 2);
      ctx.fillStyle = sole;
      ctx.fillRect(0, 5, 12, 3);
    }
    return track(finalizePixelTexture(canvas));
  })();

  const footBack = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 8);
    if (isSilverSurfer) {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 6, 8, 2);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = shoe;
    ctx.fillRect(0, 0, 8, 6);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(2, 0, 4, 3);
    ctx.fillStyle = sole;
    ctx.fillRect(0, appearance.pantsStyle === 'tights' ? 6 : 5, 8, 3);
    return track(finalizePixelTexture(canvas));
  })();

  const footTop = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 12);
    if (isSilverSurfer) {
      ctx.fillStyle = shoe;
      ctx.fillRect(0, 0, 8, 12);
      ctx.fillStyle = '#F6FAFF';
      ctx.fillRect(2, 2, 4, 7);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = shoe;
    ctx.fillRect(0, 0, 8, 12);
    ctx.fillStyle = sole;
    ctx.fillRect(2, 3, 4, 5);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(2, 9, 4, 3);
    return track(finalizePixelTexture(canvas));
  })();

  const footSole = (() => {
    const { canvas, ctx } = createPixelCanvas(8, 12);
    if (isSilverSurfer) {
      ctx.fillStyle = shoeDark;
      ctx.fillRect(0, 0, 8, 12);
      return track(finalizePixelTexture(canvas));
    }
    ctx.fillStyle = shadeHex(sole, 0.86);
    ctx.fillRect(0, 0, 8, 12);
    ctx.fillStyle = shoeAccent;
    ctx.fillRect(1, 2, 6, 2);
    ctx.fillRect(1, 8, 6, 2);
    return track(finalizePixelTexture(canvas));
  })();

  const result: CharacterTextureSet = {
    headFront,
    headBack,
    headSideL,
    headSideR,
    headTop,
    skinPlain,
    chestFront,
    chestBack,
    chestSide,
    chestTop,
    waistBand,
    upperArm,
    lowerArm,
    hand,
    upperLeg,
    lowerLeg,
    footFront,
    footSide,
    footBack,
    footTop,
    footSole,
    // Cached globally across identical character/NPC appearances; keep GPU textures alive
    dispose: () => {},
  };
  characterTextureCache.set(cacheKey, result);
  return result;
}
