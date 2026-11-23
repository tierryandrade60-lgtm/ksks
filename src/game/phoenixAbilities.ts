import * as THREE from 'three';
import { PhoenixSkinVariant } from './characterConfig';
import { CombatTargetProbe } from './scarletWitchAbilities';

export const PHOENIX_WAVE_RADIUS = 2.65;
export const PAIN_INFLICTION_EXPLOSION_RADIUS = 5.2;

export interface PhoenixPalette {
  coreHex: number;
  midHex: number;
  outerHex: number;
  innerRgba: string;
  midRgba: string;
  outerRgba: string;
  wingCoreHex: number;
  wingOuterHex: number;
}

export function getPhoenixPalette(variant: PhoenixSkinVariant = 'phoenix'): PhoenixPalette {
  if (variant === 'dark-phoenix') {
    return {
      coreHex: 0xffd284,
      midHex: 0xff4500,
      outerHex: 0xb00e00,
      innerRgba: 'rgba(255, 224, 162, 0.98)',
      midRgba: 'rgba(255, 68, 8, 0.88)',
      outerRgba: 'rgba(182, 14, 2, 0.36)',
      wingCoreHex: 0xff7b1c,
      wingOuterHex: 0xbf1204,
    };
  }
  if (variant === 'white-phoenix') {
    return {
      coreHex: 0xffffff,
      midHex: 0xe6f2ff,
      outerHex: 0xbddcff,
      innerRgba: 'rgba(255, 255, 255, 0.99)',
      midRgba: 'rgba(232, 244, 255, 0.88)',
      outerRgba: 'rgba(185, 222, 255, 0.36)',
      wingCoreHex: 0xffffff,
      wingOuterHex: 0xd8ecff,
    };
  }
  return {
    coreHex: 0xfff4ad,
    midHex: 0xff9a1a,
    outerHex: 0xff3d00,
    innerRgba: 'rgba(255, 249, 204, 0.98)',
    midRgba: 'rgba(255, 162, 24, 0.88)',
    outerRgba: 'rgba(246, 66, 10, 0.34)',
    wingCoreHex: 0xffd23d,
    wingOuterHex: 0xff5a12,
  };
}

const fireOrbTexCache = new Map<string, THREE.CanvasTexture>();
const flameWispTexCache = new Map<string, THREE.CanvasTexture>();
const flameRingTexCache = new Map<string, THREE.CanvasTexture>();
let cachedIridescentWaveTex: THREE.CanvasTexture | null = null;

function createFireOrbTexture(palette: PhoenixPalette): THREE.CanvasTexture {
  const key = `${palette.innerRgba}|${palette.midRgba}|${palette.outerRgba}`;
  const cached = fireOrbTexCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, palette.innerRgba);
  grad.addColorStop(0.35, palette.midRgba);
  grad.addColorStop(0.72, palette.outerRgba);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  fireOrbTexCache.set(key, tex);
  return tex;
}

function createFlameWispTexture(palette: PhoenixPalette): THREE.CanvasTexture {
  const key = `${palette.innerRgba}|${palette.midRgba}|${palette.outerRgba}`;
  const cached = flameWispTexCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  ctx.clearRect(0, 0, size, size);

  // Teardrop / rising flame tongue silhouette for organic fire particles
  ctx.save();
  ctx.translate(half, half * 1.08);
  ctx.scale(0.84, 1.15);
  const grad = ctx.createRadialGradient(0, 4, 2, 0, -4, half * 0.78);
  grad.addColorStop(0.0, palette.innerRgba);
  grad.addColorStop(0.38, palette.midRgba);
  grad.addColorStop(0.75, palette.outerRgba);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  flameWispTexCache.set(key, tex);
  return tex;
}

function createFlameRingTexture(palette: PhoenixPalette): THREE.CanvasTexture {
  const key = `${palette.innerRgba}|${palette.midRgba}|${palette.outerRgba}`;
  const cached = flameRingTexCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  const grad = ctx.createRadialGradient(half, half, half * 0.4, half, half, half * 0.94);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.45, palette.outerRgba);
  grad.addColorStop(0.68, palette.innerRgba);
  grad.addColorStop(0.84, palette.midRgba);
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  flameRingTexCache.set(key, tex);
  return tex;
}

function createIridescentWaveTexture(): THREE.CanvasTexture {
  if (cachedIridescentWaveTex) return cachedIridescentWaveTex;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  const grad = ctx.createRadialGradient(half, half, half * 0.48, half, half, half * 0.96);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.55, 'rgba(210, 240, 255, 0.14)');
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.52)');
  grad.addColorStop(0.85, 'rgba(255, 205, 245, 0.24)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedIridescentWaveTex = tex;
  return tex;
}

/**
 * Hand flame aura for Phoenix Force & Dark Phoenix (preview + gameplay).
 */
export class HandFireAura {
  public readonly group = new THREE.Group();
  private readonly orb: THREE.Sprite;
  private readonly ring: THREE.Sprite;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;
  private readonly orbMat: THREE.SpriteMaterial;
  private readonly ringMat: THREE.SpriteMaterial;
  private time = 0;

  constructor(variant: PhoenixSkinVariant = 'phoenix', baseScale = 0.26) {
    const pal = getPhoenixPalette(variant);
    this.orbTex = createFireOrbTexture(pal);
    this.ringTex = createFlameRingTexture(pal);

    this.orbMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    this.ringMat = new THREE.SpriteMaterial({
      map: this.ringTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.88,
    });

    this.orb = new THREE.Sprite(this.orbMat);
    this.orb.scale.setScalar(baseScale * 0.95);

    this.ring = new THREE.Sprite(this.ringMat);
    this.ring.scale.setScalar(baseScale * 1.48);

    this.group.add(this.orb, this.ring);
  }

  public update(dt: number, intensity: number, baseScale = 0.26): void {
    this.time += dt;
    const clamped = THREE.MathUtils.clamp(intensity, 0, 1.5);
    this.group.visible = clamped > 0.02;
    if (!this.group.visible) return;

    const flicker = 1 + Math.sin(this.time * 13.0) * 0.12 + Math.cos(this.time * 8.5) * 0.06;
    this.orb.scale.set(
      baseScale * 0.92 * flicker * clamped,
      baseScale * 1.15 * flicker * clamped,
      1,
    );
    this.ring.scale.setScalar(
      baseScale * 1.45 * (1 + Math.sin(this.time * 5.2) * 0.08) * clamped,
    );
    this.ringMat.rotation = this.time * 2.6;
    this.orbMat.opacity = Math.min(1, 0.78 * clamped);
    this.ringMat.opacity = Math.min(1, 0.82 * clamped);
  }

  public dispose(): void {
    this.orbMat.dispose();
    this.ringMat.dispose();
  }
}

interface WingFlameNode {
  sprite: THREE.Sprite;
  basePos: THREE.Vector3;
  baseScaleX: number;
  baseScaleY: number;
  phase: number;
  spanT: number;
  baseOpacity: number;
  isEmber: boolean;
}

/**
 * Pure Particle-Based Fiery Wings attached to character's upper back.
 * Zero beam/block geometry — sculpted entirely from animated fire & ember particles.
 */
export class PhoenixWings {
  public readonly group = new THREE.Group();
  private readonly leftWing = new THREE.Group();
  private readonly rightWing = new THREE.Group();
  private readonly leftNodes: WingFlameNode[] = [];
  private readonly rightNodes: WingFlameNode[] = [];
  private readonly flameTex: THREE.CanvasTexture;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly palette: PhoenixPalette;
  private time = 0;
  private blend = 0;

  constructor(variant: PhoenixSkinVariant = 'phoenix') {
    this.palette = getPhoenixPalette(variant);
    this.flameTex = createFlameWispTexture(this.palette);
    this.orbTex = createFireOrbTexture(this.palette);

    this.leftWing.position.set(-0.12, 0.24, 0.14);
    this.rightWing.position.set(0.12, 0.24, 0.14);
    this.group.add(this.leftWing, this.rightWing);

    this.buildWingParticles(-1, this.leftWing, this.leftNodes);
    this.buildWingParticles(1, this.rightWing, this.rightNodes);

    this.group.visible = false;
  }

  private buildWingParticles(
    side: -1 | 1,
    targetGroup: THREE.Group,
    outNodes: WingFlameNode[],
  ): void {
    // 1. Primary sweeping upper Phoenix wing arc (12 layered flame sprites)
    const primaryCount = 12;
    const coreColor = new THREE.Color(this.palette.coreHex);
    const midColor = new THREE.Color(this.palette.midHex);
    const outerColor = new THREE.Color(this.palette.outerHex);
    for (let i = 0; i < primaryCount; i++) {
      const s = i / (primaryCount - 1); // 0 inner shoulder -> 1 wingtip
      const x = side * (0.08 + s * 1.12);
      const arch = Math.sin(s * Math.PI * 0.88) * 0.44 + s * 0.28;
      const y = 0.04 + arch;
      const z = 0.06 + s * 0.34;

      const tint = new THREE.Color().lerpColors(
        coreColor,
        s > 0.6 ? outerColor : midColor,
        s * 0.85,
      );

      const mat = new THREE.SpriteMaterial({
        map: this.flameTex,
        color: tint,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const basePos = new THREE.Vector3(x, y, z);
      sprite.position.copy(basePos);
      targetGroup.add(sprite);

      const scale = THREE.MathUtils.lerp(0.46, 0.26, s * 0.85);
      outNodes.push({
        sprite,
        basePos,
        baseScaleX: scale * 0.95,
        baseScaleY: scale * 1.32,
        phase: i * 0.55 + (side === 1 ? 0.3 : 0),
        spanT: s,
        baseOpacity: THREE.MathUtils.lerp(0.88, 0.62, s),
        isEmber: false,
      });
    }

    // 2. Secondary lower wing feather plume curve (9 flame particles)
    const secondaryCount = 9;
    for (let i = 0; i < secondaryCount; i++) {
      const s = i / (secondaryCount - 1);
      const x = side * (0.14 + s * 0.88);
      const y = -0.08 + Math.sin(s * Math.PI * 0.75) * 0.2 - s * 0.16;
      const z = 0.08 + s * 0.26;

      const tint = new THREE.Color().lerpColors(
        midColor,
        outerColor,
        s * 0.9,
      );

      const mat = new THREE.SpriteMaterial({
        map: this.flameTex,
        color: tint,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const basePos = new THREE.Vector3(x, y, z);
      sprite.position.copy(basePos);
      targetGroup.add(sprite);

      const scale = THREE.MathUtils.lerp(0.4, 0.22, s);
      outNodes.push({
        sprite,
        basePos,
        baseScaleX: scale * 0.86,
        baseScaleY: scale * 1.42,
        phase: i * 0.72 + 1.4,
        spanT: s,
        baseOpacity: THREE.MathUtils.lerp(0.76, 0.5, s),
        isEmber: false,
      });
    }

    // 3. Drifting fiery embers trailing from the wingtips & crest (10 particles)
    const emberCount = 10;
    for (let i = 0; i < emberCount; i++) {
      const s = 0.25 + (i / emberCount) * 0.75;
      const x = side * (0.24 + s * 0.95);
      const y = 0.05 + Math.sin(s * Math.PI * 0.82) * 0.36;
      const z = 0.14 + s * 0.32;

      const mat = new THREE.SpriteMaterial({
        map: this.orbTex,
        color: i % 2 === 0 ? this.palette.coreHex : this.palette.midHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const basePos = new THREE.Vector3(x, y, z);
      sprite.position.copy(basePos);
      targetGroup.add(sprite);

      outNodes.push({
        sprite,
        basePos,
        baseScaleX: 0.14 + (i % 3) * 0.035,
        baseScaleY: 0.16 + (i % 3) * 0.04,
        phase: i * 1.13 + (side === 1 ? 0.5 : 0),
        spanT: s,
        baseOpacity: 0.82,
        isEmber: true,
      });
    }
  }

  private updateWingNodes(
    nodes: WingFlameNode[],
    flying: boolean,
    moveSpeedNorm: number,
  ): void {
    const intensity = flying ? 1.15 : 0.88 + moveSpeedNorm * 0.2;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.isEmber) {
        const cycle = (this.time * (flying ? 1.45 : 0.95) + n.phase) % 1;
        n.sprite.position.set(
          n.basePos.x + Math.sin(cycle * Math.PI * 2 + n.phase) * 0.07,
          n.basePos.y + cycle * (flying ? 0.42 : 0.28),
          n.basePos.z + cycle * (flying ? 0.32 : 0.16),
        );
        const s = (1 - cycle * 0.65) * intensity;
        n.sprite.scale.set(n.baseScaleX * s, n.baseScaleY * s, 1);
        (n.sprite.material as THREE.SpriteMaterial).opacity =
          n.baseOpacity * Math.sin(cycle * Math.PI) * this.blend;
      } else {
        const wave = Math.sin(this.time * (flying ? 10.5 : 6.2) - n.spanT * 3.4 + n.phase);
        const rise = Math.cos(this.time * 7.8 + n.phase) * 0.038;
        n.sprite.position.set(
          n.basePos.x,
          n.basePos.y + rise + wave * 0.045 * n.spanT,
          n.basePos.z + wave * 0.035 * n.spanT,
        );
        const pulse = 0.92 + Math.sin(this.time * 13.5 + n.phase) * 0.14;
        n.sprite.scale.set(
          n.baseScaleX * pulse * intensity,
          n.baseScaleY * pulse * intensity,
          1,
        );
        (n.sprite.material as THREE.SpriteMaterial).opacity =
          n.baseOpacity * (0.86 + Math.sin(this.time * 11 + n.phase) * 0.14) * this.blend;
      }
    }
  }

  public update(dt: number, visible: boolean, flying: boolean, moveSpeedNorm = 0): void {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;
    this.blend = THREE.MathUtils.damp(this.blend, visible ? 1 : 0, 9.5, safeDt);

    if (this.blend < 0.015) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const flapSpeed = flying ? 7.6 : 3.1 + moveSpeedNorm * 2.0;
    const flapAmp = flying ? 0.24 : 0.085 + moveSpeedNorm * 0.075;
    const sweepBack = flying ? 0.32 + moveSpeedNorm * 0.14 : 0.2 + moveSpeedNorm * 0.16;
    const flap = Math.sin(this.time * flapSpeed) * flapAmp;

    this.leftWing.rotation.set(0.06, sweepBack + flap, -0.05 + flap * 0.22);
    this.rightWing.rotation.set(0.06, -(sweepBack + flap), 0.05 - flap * 0.22);

    const scale = THREE.MathUtils.lerp(0.62, flying ? 1.08 : 0.96, this.blend);
    this.leftWing.scale.setScalar(scale);
    this.rightWing.scale.setScalar(scale);

    this.updateWingNodes(this.leftNodes, flying, moveSpeedNorm);
    this.updateWingNodes(this.rightNodes, flying, moveSpeedNorm);
  }

  public dispose(): void {
    for (const n of this.leftNodes) {
      (n.sprite.material as THREE.Material).dispose();
    }
    for (const n of this.rightNodes) {
      (n.sprite.material as THREE.Material).dispose();
    }
  }
}

interface FireParticle {
  sprite: THREE.Sprite;
  active: boolean;
  age: number;
  life: number;
  offset: THREE.Vector3;
  vel: THREE.Vector3;
  startScale: number;
  endScale: number;
  maxOpacity: number;
}

interface FireballInstance {
  group: THREE.Group;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  hitIds: Set<string>;
  trailPositions: THREE.Vector3[];
  trailSprites: THREE.Sprite[];
}

interface SilhouetteParticleNode {
  sprite: THREE.Sprite;
  basePos: THREE.Vector3;
  vel: THREE.Vector3;
  baseScaleX: number;
  baseScaleY: number;
  maxOpacity: number;
  phase: number;
}

interface FireExplosionEffect {
  kind: 'wave' | 'telekinetic-blast' | 'fireball-hit';
  group: THREE.Group;
  ring: THREE.Mesh;
  extraRings?: THREE.Mesh[];
  dome?: THREE.Mesh;
  silhouetteGroup?: THREE.Group;
  silhouetteNodes?: SilhouetteParticleNode[];
  core: THREE.Sprite;
  sparks: THREE.Sprite[];
  sparkVels: THREE.Vector3[];
  age: number;
  life: number;
  maxRadius: number;
}

export class PhoenixVfxSystem {
  public readonly group = new THREE.Group();

  private readonly variant: PhoenixSkinVariant;
  private readonly palette: PhoenixPalette;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly flameTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;
  private readonly waveHaloTex: THREE.CanvasTexture;

  private readonly flightTrailPool: FireParticle[] = [];
  private readonly fireballs: FireballInstance[] = [];
  private readonly explosions: FireExplosionEffect[] = [];

  private readonly ringGeo = new THREE.RingGeometry(0.78, 1.0, 32);
  private readonly thinWaveGeo = new THREE.RingGeometry(0.88, 1.0, 32);
  private readonly headWaveGeo = new THREE.RingGeometry(0.32, 0.365, 28);
  private readonly domeGeo = new THREE.SphereGeometry(1, 20, 14);
  private readonly fireballGeo = new THREE.SphereGeometry(0.15, 12, 10);

  // Pain Infliction active telekinetic waves around BOTH Phoenix's head and target's head (NO beam)
  private readonly painPlayerHeadGroup = new THREE.Group();
  private readonly painTargetHeadGroup = new THREE.Group();
  private readonly painPlayerRings: THREE.Mesh[] = [];
  private readonly painTargetRings: THREE.Mesh[] = [];
  private readonly painPlayerHalo: THREE.Sprite;
  private readonly painTargetHalo: THREE.Sprite;
  private painTime = 0;

  private flightEmitAccum = 0;
  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpTo = new THREE.Vector3();
  private readonly _tmpColor = new THREE.Color();

  // Phoenix Special Revival VFX (60s cooldown): rising sphere + trail -> 4s giant silhouette
  private readonly revivalSphereGroup = new THREE.Group();
  private readonly revivalSphereMesh: THREE.Mesh;
  private readonly revivalSphereGlow: THREE.Sprite;
  private readonly revivalTrailPool: FireParticle[] = [];
  private revivalTrailAccum = 0;
  private readonly revivalBirdGroup = new THREE.Group();
  private readonly revivalBirdNodes: SilhouetteParticleNode[] = [];
  private readonly revivalBirdCore: THREE.Sprite;
  private revivalTime = 0;

  // Phoenix Flight Dive ground aim indicator
  private readonly diveAimGroup = new THREE.Group();
  private readonly diveAimOuterRing: THREE.Mesh;
  private readonly diveAimInnerRing: THREE.Mesh;
  private readonly diveAimCoreGlow: THREE.Sprite;
  private diveAimTime = 0;

  constructor(variant: PhoenixSkinVariant = 'phoenix') {
    this.variant = variant;
    this.palette = getPhoenixPalette(variant);
    this.orbTex = createFireOrbTexture(this.palette);
    this.flameTex = createFlameWispTexture(this.palette);
    this.ringTex = createFlameRingTexture(this.palette);
    this.waveHaloTex = createIridescentWaveTexture();

    this.ringGeo.rotateX(-Math.PI / 2);
    this.thinWaveGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 36; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.flightTrailPool.push({
        sprite,
        active: false,
        age: 0,
        life: 0.65,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.35,
        endScale: 0.72,
        maxOpacity: 0.72,
      });
    }

    // Build nearly transparent iridescent telekinetic head wave rings for Phoenix & Target
    const ringTilts: Array<[number, number, number]> = [
      [Math.PI / 2, 0, 0],
      [Math.PI / 2 + 0.42, 0.35, 0.25],
      [Math.PI / 2 - 0.38, -0.4, -0.25],
    ];
    for (let i = 0; i < ringTilts.length; i++) {
      const [rx, ry, rz] = ringTilts[i];
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xdff6ff,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pMesh = new THREE.Mesh(this.headWaveGeo, pMat);
      pMesh.rotation.set(rx, ry, rz);
      this.painPlayerHeadGroup.add(pMesh);
      this.painPlayerRings.push(pMesh);

      const tMat = new THREE.MeshBasicMaterial({
        color: 0xf4dcff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const tMesh = new THREE.Mesh(this.headWaveGeo, tMat);
      tMesh.rotation.set(rx, ry, rz);
      this.painTargetHeadGroup.add(tMesh);
      this.painTargetRings.push(tMesh);
    }

    const pHaloMat = new THREE.SpriteMaterial({
      map: this.waveHaloTex,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.painPlayerHalo = new THREE.Sprite(pHaloMat);
    this.painPlayerHalo.scale.setScalar(0.95);
    this.painPlayerHeadGroup.add(this.painPlayerHalo);

    const tHaloMat = new THREE.SpriteMaterial({
      map: this.waveHaloTex,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.painTargetHalo = new THREE.Sprite(tHaloMat);
    this.painTargetHalo.scale.setScalar(1.05);
    this.painTargetHeadGroup.add(this.painTargetHalo);

    this.painPlayerHeadGroup.visible = false;
    this.painTargetHeadGroup.visible = false;
    this.group.add(this.painPlayerHeadGroup, this.painTargetHeadGroup);

    // Special Revival rising sphere + flame trail
    const sphereCoreMat = new THREE.MeshBasicMaterial({
      color: this.palette.coreHex,
      transparent: true,
      opacity: 0.96,
    });
    this.revivalSphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 16, 12),
      sphereCoreMat,
    );
    const sphereGlowMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      color: this.palette.midHex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    this.revivalSphereGlow = new THREE.Sprite(sphereGlowMat);
    this.revivalSphereGlow.scale.setScalar(2.4);
    this.revivalSphereGroup.add(this.revivalSphereMesh, this.revivalSphereGlow);
    this.revivalSphereGroup.visible = false;
    this.group.add(this.revivalSphereGroup);

    for (let i = 0; i < 34; i++) {
      const tMat = new THREE.SpriteMaterial({
        map: this.flameTex,
        color: i % 2 === 0 ? this.palette.midHex : this.palette.outerHex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const sp = new THREE.Sprite(tMat);
      sp.visible = false;
      this.group.add(sp);
      this.revivalTrailPool.push({
        sprite: sp,
        active: false,
        age: 0,
        life: 0.55,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.72,
        endScale: 0.16,
        maxOpacity: 0.9,
      });
    }

    // Special Revival enormous 4-second Phoenix silhouette (~7.8m curved fiery wingspan)
    this.revivalBirdCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.85,
      }),
    );
    this.revivalBirdCore.position.set(0, 0.85, 0.35);
    this.revivalBirdCore.scale.setScalar(5.8);
    this.revivalBirdGroup.add(this.revivalBirdCore);

    // Central towering crest & fiery bird torso
    for (let c = 0; c < 8; c++) {
      const f = c / 7;
      this.addSilhouetteParticle(
        this.revivalBirdGroup,
        this.revivalBirdNodes,
        0,
        0.3 + f * 3.1,
        0.55 - f * 0.18,
        THREE.MathUtils.lerp(1.45, 0.45, f),
        THREE.MathUtils.lerp(1.65, 1.05, f),
        f < 0.45 ? this.palette.coreHex : this.palette.midHex,
        0.92 - f * 0.12,
        0,
        1.1,
        0,
        true,
      );
    }

    // Sweeping lower tail flames
    for (let t = 0; t < 6; t++) {
      const f = t / 5;
      this.addSilhouetteParticle(
        this.revivalBirdGroup,
        this.revivalBirdNodes,
        (t % 2 === 0 ? 1 : -1) * f * 0.32,
        -0.3 - f * 2.4,
        0.6 + f * 0.25,
        THREE.MathUtils.lerp(1.25, 0.48, f),
        THREE.MathUtils.lerp(1.5, 0.95, f),
        f < 0.4 ? this.palette.midHex : this.palette.outerHex,
        0.86 - f * 0.16,
        0,
        -0.9,
        0.1,
        true,
      );
    }

    // Two enormous symmetrical arched wings (~7.8m wingspan)
    for (const side of [-1, 1] as const) {
      for (let i = 1; i <= 11; i++) {
        const s = i / 11;
        const x = side * (0.45 + s * 3.55);
        const arch = Math.sin(s * Math.PI * 0.86) * 1.42 + Math.pow(s, 1.45) * 1.05;
        const y = 0.65 + arch;
        const z = 0.55 + s * 0.65;
        const hex =
          s < 0.32
            ? this.palette.coreHex
            : s < 0.72
              ? this.palette.midHex
              : this.palette.outerHex;
        this.addSilhouetteParticle(
          this.revivalBirdGroup,
          this.revivalBirdNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(1.25, 0.62, s),
          THREE.MathUtils.lerp(1.45, 0.85, s),
          hex,
          THREE.MathUtils.lerp(0.95, 0.72, s),
          side * 0.4,
          0.7,
          0.12,
          true,
        );
      }

      for (let j = 1; j <= 7; j++) {
        const s = j / 7;
        const x = side * (0.55 + s * 2.85);
        const y = 0.25 + Math.sin(s * Math.PI * 0.7) * 0.7 - s * 0.28;
        const z = 0.65 + s * 0.55;
        this.addSilhouetteParticle(
          this.revivalBirdGroup,
          this.revivalBirdNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(1.05, 0.52, s),
          THREE.MathUtils.lerp(1.45, 0.92, s),
          s < 0.45 ? this.palette.midHex : this.palette.outerHex,
          THREE.MathUtils.lerp(0.84, 0.58, s),
          side * 0.3,
          0.45,
          0.18,
          true,
        );
      }
    }

    this.revivalBirdGroup.visible = false;
    this.group.add(this.revivalBirdGroup);

    // Phoenix Flight Dive ground aim indicator
    const diveOuterGeo = new THREE.RingGeometry(2.55, 2.88, 40);
    diveOuterGeo.rotateX(-Math.PI * 0.5);
    this.diveAimOuterRing = new THREE.Mesh(
      diveOuterGeo,
      new THREE.MeshBasicMaterial({
        color: this.palette.midHex,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const diveInnerGeo = new THREE.RingGeometry(0.62, 0.92, 32);
    diveInnerGeo.rotateX(-Math.PI * 0.5);
    this.diveAimInnerRing = new THREE.Mesh(
      diveInnerGeo,
      new THREE.MeshBasicMaterial({
        color: this.palette.coreHex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    this.diveAimCoreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        color: this.palette.midHex,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.diveAimCoreGlow.position.y = 0.25;
    this.diveAimCoreGlow.scale.setScalar(2.4);

    this.diveAimGroup.add(this.diveAimOuterRing, this.diveAimInnerRing, this.diveAimCoreGlow);
    this.diveAimGroup.visible = false;
    this.group.add(this.diveAimGroup);
  }

  public spawnFireball(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) {
      dir.set(0, 0, -1);
    } else {
      dir.normalize();
    }

    const fbGroup = new THREE.Group();
    fbGroup.position.copy(origin);

    const coreMat = new THREE.MeshBasicMaterial({ color: this.palette.coreHex });
    const core = new THREE.Mesh(this.fireballGeo, coreMat);

    const haloMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.96,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.74);

    fbGroup.add(core, halo);
    this.group.add(fbGroup);

    const trailPositions: THREE.Vector3[] = [];
    const trailSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      trailPositions.push(origin.clone());
      const tMat = new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.62 * (1 - i / 6),
      });
      const tSprite = new THREE.Sprite(tMat);
      tSprite.scale.setScalar(0.38 * (1 - i * 0.13));
      tSprite.position.copy(origin);
      this.group.add(tSprite);
      trailSprites.push(tSprite);
    }

    this.fireballs.push({
      group: fbGroup,
      vel: dir.clone().multiplyScalar(32.0),
      age: 0,
      maxAge: 1.35,
      hitIds: new Set<string>(),
      trailPositions,
      trailSprites,
    });
  }

  private spawnFireballImpact(pos: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.copy(pos);

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.palette.midHex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);

    const coreMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.96,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(0.75);

    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      const sMat = new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      });
      const sp = new THREE.Sprite(sMat);
      sp.scale.setScalar(0.24);
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(Math.cos(a) * 2.8, 1.2 + Math.random() * 1.4, Math.sin(a) * 2.8),
      );
    }

    grp.add(ring, core);
    this.group.add(grp);

    this.explosions.push({
      kind: 'fireball-hit',
      group: grp,
      ring,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.3,
      maxRadius: 0.95,
    });
  }

  private addSilhouetteParticle(
    parent: THREE.Group,
    nodes: SilhouetteParticleNode[],
    x: number,
    y: number,
    z: number,
    scaleX: number,
    scaleY: number,
    colorHex: number,
    maxOpacity: number,
    velX: number,
    velY: number,
    velZ: number,
    useFlameTex = true,
  ): void {
    const mat = new THREE.SpriteMaterial({
      map: useFlameTex ? this.flameTex : this.orbTex,
      color: colorHex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(mat);
    const basePos = new THREE.Vector3(x, y, z);
    sprite.position.copy(basePos);
    parent.add(sprite);
    nodes.push({
      sprite,
      basePos,
      vel: new THREE.Vector3(velX, velY, velZ),
      baseScaleX: scaleX,
      baseScaleY: scaleY,
      maxOpacity,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /**
   * Spawns a large, fluid Phoenix bird silhouette made purely of animated fire particles:
   * - Two wide symmetrical swept wings extending left & right
   * - Pointed central rising flame crest/lance
   * - Flowing blazing tail plume
   */
  public spawnPhoenixWaveExplosion(
    center: THREE.Vector3,
    stepIdx: number,
    forwardDir?: THREE.Vector3,
  ): void {
    const grp = new THREE.Group();
    grp.position.set(center.x, 0.04, center.z);

    const scaleBoost = stepIdx === 2 ? 1.26 : 1.0 + stepIdx * 0.08;

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.palette.midHex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);

    const coreMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    const core = new THREE.Sprite(coreMat);
    core.position.y = 0.85;
    core.scale.setScalar(2.6 * scaleBoost);

    // Pure particle-sculpted Phoenix silhouette
    const silGroup = new THREE.Group();
    silGroup.position.y = 0.35;
    if (forwardDir && forwardDir.lengthSq() > 0.001) {
      silGroup.rotation.y = Math.atan2(-forwardDir.x, -forwardDir.z);
    }
    const silNodes: SilhouetteParticleNode[] = [];

    // 1. Pointed central Phoenix crown & torso flame column (ascending lance)
    for (let c = 0; c < 7; c++) {
      const f = c / 6;
      const y = 0.55 + f * 1.75;
      const z = -f * 0.25;
      const w = THREE.MathUtils.lerp(0.88, 0.26, f) * scaleBoost;
      const h = THREE.MathUtils.lerp(1.05, 0.65, f) * scaleBoost;
      const hex = f < 0.45 ? this.palette.coreHex : f < 0.8 ? this.palette.midHex : this.palette.outerHex;
      this.addSilhouetteParticle(
        silGroup,
        silNodes,
        0,
        y,
        z,
        w,
        h,
        hex,
        0.95 - f * 0.16,
        0,
        1.45 + f * 0.65,
        -0.3,
        true,
      );
    }

    // 2. Flowing twin tail plumes trailing downward/back
    for (let t = 0; t < 6; t++) {
      const f = t / 5;
      const spreadX = (t % 2 === 0 ? 1 : -1) * (0.08 + f * 0.28);
      const y = 0.42 - f * 0.62;
      const z = 0.18 + f * 0.58;
      this.addSilhouetteParticle(
        silGroup,
        silNodes,
        spreadX * scaleBoost,
        y,
        z,
        (0.54 - f * 0.2) * scaleBoost,
        (0.82 - f * 0.24) * scaleBoost,
        f < 0.4 ? this.palette.midHex : this.palette.outerHex,
        0.86 - f * 0.25,
        spreadX * 0.4,
        0.25,
        0.35,
        true,
      );
    }

    // 3. Two wide, symmetrical, swept curved fire wings (left & right)
    for (const side of [-1, 1] as const) {
      // Upper swept leading edge of each wing (9 particles per side)
      for (let i = 1; i <= 9; i++) {
        const s = i / 9;
        const x = side * (0.28 + s * 2.35) * scaleBoost;
        const arch = Math.sin(s * Math.PI * 0.86) * 0.92 + Math.pow(s, 1.5) * 0.68;
        const y = (0.65 + arch) * scaleBoost;
        const z = (s * 0.52 - Math.pow(s, 2) * 0.18) * scaleBoost;

        const hex =
          s < 0.35
            ? this.palette.coreHex
            : s < 0.72
              ? this.palette.midHex
              : this.palette.outerHex;

        this.addSilhouetteParticle(
          silGroup,
          silNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(0.82, 0.38, s) * scaleBoost,
          THREE.MathUtils.lerp(0.95, 0.52, s) * scaleBoost,
          hex,
          THREE.MathUtils.lerp(0.94, 0.7, s),
          side * (0.75 + s * 1.15),
          0.9 + s * 0.75,
          0.15,
          true,
        );
      }

      // Lower secondary feather curve trailing below the wing arc (6 particles per side)
      for (let j = 1; j <= 6; j++) {
        const s = j / 6;
        const x = side * (0.36 + s * 1.85) * scaleBoost;
        const y = (0.48 + Math.sin(s * Math.PI * 0.7) * 0.46 - s * 0.14) * scaleBoost;
        const z = (0.12 + s * 0.44) * scaleBoost;
        const hex = s < 0.45 ? this.palette.midHex : this.palette.outerHex;

        this.addSilhouetteParticle(
          silGroup,
          silNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(0.68, 0.34, s) * scaleBoost,
          THREE.MathUtils.lerp(0.96, 0.58, s) * scaleBoost,
          hex,
          THREE.MathUtils.lerp(0.82, 0.56, s),
          side * (0.6 + s * 0.8),
          0.65 + s * 0.4,
          0.25,
          true,
        );
      }
    }

    // 4. Radial ground flame sparks
    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const sMat = new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      });
      const sp = new THREE.Sprite(sMat);
      sp.scale.setScalar(0.36 * scaleBoost);
      sp.position.y = 0.25;
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(
          Math.cos(a) * 4.1 * scaleBoost,
          1.8 + Math.random() * 1.9,
          Math.sin(a) * 4.1 * scaleBoost,
        ),
      );
    }

    grp.add(ring, core, silGroup);
    this.group.add(grp);

    this.explosions.push({
      kind: 'wave',
      group: grp,
      ring,
      silhouetteGroup: silGroup,
      silhouetteNodes: silNodes,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.68,
      maxRadius: PHOENIX_WAVE_RADIUS * scaleBoost,
    });
  }

  /**
   * Rising golden/orange (or Dark Phoenix ember) gathering motes during the revival charge phase.
   */
  public spawnRevivalChargeEmbers(worldCenter: THREE.Vector3): void {
    let spawned = 0;
    for (let i = 0; i < this.flightTrailPool.length && spawned < 18; i++) {
      const p = this.flightTrailPool[i];
      if (p.active) continue;
      spawned++;
      p.active = true;
      p.age = 0;
      p.life = 0.44 + Math.random() * 0.22;
      const angle = (spawned / 18) * Math.PI * 2 + Math.random() * 0.35;
      const rad = 0.45 + Math.random() * 0.55;
      p.offset.set(
        Math.cos(angle) * rad,
        0.15 + Math.random() * 0.5,
        Math.sin(angle) * rad,
      );
      p.vel.set(
        -Math.cos(angle) * 0.9,
        1.45 + Math.random() * 0.9,
        -Math.sin(angle) * 0.9,
      );
      p.startScale = 0.38 + Math.random() * 0.18;
      p.endScale = 0.1;
      p.maxOpacity = 0.92;
      p.sprite.position.copy(worldCenter).add(p.offset);
      p.sprite.visible = true;
    }
  }

  /**
   * Radiant rising Phoenix silhouette + twin shockwave rings upon completing Revival.
   * Automatically uses Phoenix Force golden fire or Dark Phoenix deep orange/crimson embers.
   */
  public spawnRevivalBurst(center: THREE.Vector3, forwardDir?: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(center.x, 0.05, center.z);

    const scaleBoost = 1.42;

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.palette.midHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);

    const extraRings: THREE.Mesh[] = [];
    const secMat = new THREE.MeshBasicMaterial({
      color: this.palette.coreHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const secRing = new THREE.Mesh(this.thinWaveGeo, secMat);
    secRing.position.y = 0.72;
    secRing.rotation.set(0.28, 0.2, 0.12);
    grp.add(secRing);
    extraRings.push(secRing);

    const coreMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.98,
    });
    const core = new THREE.Sprite(coreMat);
    core.position.y = 1.05;
    core.scale.setScalar(3.4);

    const silGroup = new THREE.Group();
    silGroup.position.y = 0.55;
    if (forwardDir && forwardDir.lengthSq() > 0.001) {
      silGroup.rotation.y = Math.atan2(-forwardDir.x, -forwardDir.z);
    }
    const silNodes: SilhouetteParticleNode[] = [];

    for (let c = 0; c < 7; c++) {
      const f = c / 6;
      const y = 0.55 + f * 1.95;
      const z = -f * 0.2;
      const w = THREE.MathUtils.lerp(0.95, 0.28, f) * scaleBoost;
      const h = THREE.MathUtils.lerp(1.1, 0.68, f) * scaleBoost;
      const hex =
        f < 0.45
          ? this.palette.coreHex
          : f < 0.8
            ? this.palette.midHex
            : this.palette.outerHex;
      this.addSilhouetteParticle(
        silGroup,
        silNodes,
        0,
        y,
        z,
        w,
        h,
        hex,
        0.96 - f * 0.14,
        0,
        1.75 + f * 0.75,
        -0.25,
        true,
      );
    }

    for (const side of [-1, 1] as const) {
      for (let i = 1; i <= 9; i++) {
        const s = i / 9;
        const x = side * (0.28 + s * 2.45) * scaleBoost;
        const arch = Math.sin(s * Math.PI * 0.86) * 0.98 + Math.pow(s, 1.5) * 0.74;
        const y = (0.7 + arch) * scaleBoost;
        const z = (s * 0.5 - Math.pow(s, 2) * 0.16) * scaleBoost;
        const hex =
          s < 0.35
            ? this.palette.coreHex
            : s < 0.72
              ? this.palette.midHex
              : this.palette.outerHex;

        this.addSilhouetteParticle(
          silGroup,
          silNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(0.86, 0.4, s) * scaleBoost,
          THREE.MathUtils.lerp(0.98, 0.54, s) * scaleBoost,
          hex,
          THREE.MathUtils.lerp(0.96, 0.72, s),
          side * (0.85 + s * 1.25),
          1.15 + s * 0.85,
          0.12,
          true,
        );
      }

      for (let j = 1; j <= 6; j++) {
        const s = j / 6;
        const x = side * (0.36 + s * 1.9) * scaleBoost;
        const y = (0.5 + Math.sin(s * Math.PI * 0.7) * 0.48 - s * 0.14) * scaleBoost;
        const z = (0.12 + s * 0.42) * scaleBoost;
        const hex = s < 0.45 ? this.palette.midHex : this.palette.outerHex;
        this.addSilhouetteParticle(
          silGroup,
          silNodes,
          x,
          y,
          z,
          THREE.MathUtils.lerp(0.7, 0.36, s) * scaleBoost,
          THREE.MathUtils.lerp(0.98, 0.6, s) * scaleBoost,
          hex,
          THREE.MathUtils.lerp(0.84, 0.58, s),
          side * (0.65 + s * 0.85),
          0.85 + s * 0.45,
          0.22,
          true,
        );
      }
    }

    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const sMat = new THREE.SpriteMaterial({
        map: this.orbTex,
        color: i % 2 === 0 ? this.palette.coreHex : this.palette.midHex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95,
      });
      const sp = new THREE.Sprite(sMat);
      sp.scale.setScalar(0.42);
      sp.position.y = 0.32;
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(
          Math.cos(a) * 5.2,
          2.1 + Math.random() * 2.2,
          Math.sin(a) * 5.2,
        ),
      );
    }

    grp.add(ring, core, silGroup);
    this.group.add(grp);

    this.explosions.push({
      kind: 'wave',
      group: grp,
      ring,
      extraRings,
      silhouetteGroup: silGroup,
      silhouetteNodes: silNodes,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.78,
      maxRadius: 4.2,
    });
  }

  public updateDiveAimIndicator(visible: boolean, groundPos?: THREE.Vector3, dt = 0.016): void {
    this.diveAimGroup.visible = visible;
    if (!visible || !groundPos) return;
    this.diveAimTime += Math.min(dt, 0.05) * 4;
    this.diveAimGroup.position.set(groundPos.x, 0.06, groundPos.z);
    const pulse = 1 + Math.sin(this.diveAimTime * 2.4) * 0.08;
    this.diveAimOuterRing.scale.setScalar(pulse);
    this.diveAimOuterRing.rotation.y += dt * 1.4;
    this.diveAimInnerRing.scale.setScalar(1 - Math.sin(this.diveAimTime * 2.4) * 0.12);
    this.diveAimCoreGlow.scale.setScalar(2.4 * pulse);
  }

  /**
   * Distinctive Phoenix energy burst behind the character when launching diagonally upward.
   */
  public spawnFlightDiveLaunchBurst(origin: THREE.Vector3, forwardDir: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(origin.x, origin.y + 0.9, origin.z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.palette.midHex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.35;

    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        color: this.palette.coreHex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.96,
      }),
    );
    core.scale.setScalar(2.8);

    const silGroup = new THREE.Group();
    if (forwardDir.lengthSq() > 0.001) {
      silGroup.rotation.y = Math.atan2(-forwardDir.x, -forwardDir.z);
    }
    const silNodes: SilhouetteParticleNode[] = [];
    for (const side of [-1, 1] as const) {
      for (let i = 1; i <= 7; i++) {
        const s = i / 7;
        this.addSilhouetteParticle(
          silGroup,
          silNodes,
          side * (0.3 + s * 2.1),
          0.25 + Math.sin(s * Math.PI * 0.8) * 1.1,
          0.4 + s * 0.5,
          THREE.MathUtils.lerp(0.95, 0.42, s),
          THREE.MathUtils.lerp(1.15, 0.56, s),
          s < 0.4 ? this.palette.coreHex : s < 0.75 ? this.palette.midHex : this.palette.outerHex,
          0.95,
          side * (1.2 + s * 1.4),
          0.7 + s * 0.8,
          0.9,
          true,
        );
      }
    }

    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.flameTex,
          color: i % 2 === 0 ? this.palette.coreHex : this.palette.midHex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.92,
        }),
      );
      sp.scale.setScalar(0.45);
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(
          Math.cos(a) * 3.6 - forwardDir.x * 2.6,
          -1.6 + Math.random() * 1.4,
          Math.sin(a) * 3.6 - forwardDir.z * 2.6,
        ),
      );
    }

    grp.add(ring, core, silGroup);
    this.group.add(grp);

    this.explosions.push({
      kind: 'wave',
      group: grp,
      ring,
      silhouetteGroup: silGroup,
      silhouetteNodes: silNodes,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.62,
      maxRadius: 3.4,
    });
  }

  /**
   * Powerful fiery impact explosion on the ground upon completing Phoenix Dive.
   */
  public spawnPhoenixDiveExplosion(groundPos: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(groundPos.x, 0.06, groundPos.z);

    const ring = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: this.palette.midHex,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const extraRings: THREE.Mesh[] = [];
    for (let r = 0; r < 2; r++) {
      const er = new THREE.Mesh(
        this.thinWaveGeo,
        new THREE.MeshBasicMaterial({
          color: r === 0 ? this.palette.coreHex : this.palette.outerHex,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      er.position.y = 0.28 + r * 0.4;
      er.rotation.set(r * 0.18, r * 0.4, -r * 0.14);
      grp.add(er);
      extraRings.push(er);
    }

    const dome = new THREE.Mesh(
      this.domeGeo,
      new THREE.MeshBasicMaterial({
        color: this.palette.midHex,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    dome.position.y = 0.25;
    dome.scale.setScalar(0.5);

    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        color: this.palette.coreHex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.98,
      }),
    );
    core.position.y = 1.05;
    core.scale.setScalar(3.8);

    const silGroup = new THREE.Group();
    silGroup.position.y = 0.35;
    const silNodes: SilhouetteParticleNode[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rad = 0.45 + (i % 3) * 0.85;
      this.addSilhouetteParticle(
        silGroup,
        silNodes,
        Math.cos(a) * rad,
        0.5 + (i % 2) * 0.45,
        Math.sin(a) * rad,
        1.15,
        1.75,
        i % 3 === 0 ? this.palette.coreHex : i % 3 === 1 ? this.palette.midHex : this.palette.outerHex,
        0.95,
        Math.cos(a) * 2.2,
        1.8 + Math.random() * 1.4,
        Math.sin(a) * 2.2,
        true,
      );
    }

    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.flameTex,
          color: i % 2 === 0 ? this.palette.coreHex : this.palette.outerHex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.95,
        }),
      );
      sp.position.y = 0.3;
      sp.scale.setScalar(0.54);
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(
          Math.cos(a) * (4.4 + Math.random() * 2.6),
          2.2 + Math.random() * 2.8,
          Math.sin(a) * (4.4 + Math.random() * 2.6),
        ),
      );
    }

    grp.add(ring, dome, core, silGroup);
    this.group.add(grp);

    this.explosions.push({
      kind: 'wave',
      group: grp,
      ring,
      extraRings,
      dome,
      silhouetteGroup: silGroup,
      silhouetteNodes: silNodes,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.88,
      maxRadius: 5.4,
    });
  }

  /**
   * Radial telekinetic shockwave originating from Phoenix upon completing Pain Infliction.
   */
  public spawnTelekineticShockwave(phoenixCenter: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(phoenixCenter.x, phoenixCenter.y + 0.14, phoenixCenter.z);

    const isWhitePhoenix = this.variant === 'white-phoenix';
    // 1. Primary ground air-distortion shockwave ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: isWhitePhoenix ? 0xffffff : 0xdff6ff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.thinWaveGeo, ringMat);

    // 2. Two tilted translucent iridescent wave rings expanding around Phoenix
    const extraRings: THREE.Mesh[] = [];
    const tilts: Array<[number, number, number, number]> = isWhitePhoenix
      ? [
          [0.32, 0.2, 0.15, 0xffffff],
          [-0.28, -0.3, 0.22, 0xd8ecff],
        ]
      : [
          [0.32, 0.2, 0.15, 0xf2cbff],
          [-0.28, -0.3, 0.22, 0xb8f4ff],
        ];
    for (const [rx, ry, rz, colorHex] of tilts) {
      const mMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mRing = new THREE.Mesh(this.thinWaveGeo, mMat);
      mRing.position.y = 0.72;
      mRing.rotation.set(rx, ry, rz);
      grp.add(mRing);
      extraRings.push(mRing);
    }

    // 3. Airy nearly-transparent expanding telekinetic pressure dome
    const domeMat = new THREE.MeshBasicMaterial({
      color: isWhitePhoenix ? 0xf2f8ff : 0xd8f0ff,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(this.domeGeo, domeMat);
    dome.position.y = 0.65;
    dome.scale.setScalar(0.4);

    // 4. Soft shimmering center wave halo
    const coreMat = new THREE.SpriteMaterial({
      map: isWhitePhoenix ? this.orbTex : this.waveHaloTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.78,
    });
    const core = new THREE.Sprite(coreMat);
    core.position.y = 0.8;
    core.scale.setScalar(3.0);

    // 5. Radial telekinetic wind motes pushing outward in all directions
    const sparks: THREE.Sprite[] = [];
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const sMat = new THREE.SpriteMaterial({
        map: isWhitePhoenix ? this.orbTex : this.waveHaloTex,
        color: isWhitePhoenix
          ? i % 2 === 0
            ? 0xffffff
            : 0xd8ecff
          : i % 3 === 0
            ? 0xc2f6ff
            : i % 3 === 1
              ? 0xf5c8ff
              : 0xffe6b8,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.75,
      });
      const sp = new THREE.Sprite(sMat);
      sp.scale.setScalar(0.55);
      sp.position.y = 0.75;
      grp.add(sp);
      sparks.push(sp);
      sparkVels.push(
        new THREE.Vector3(
          Math.cos(a) * 8.6,
          0.4 + Math.random() * 1.1,
          Math.sin(a) * 8.6,
        ),
      );
    }

    grp.add(ring, dome, core);
    this.group.add(grp);

    this.explosions.push({
      kind: 'telekinetic-blast',
      group: grp,
      ring,
      extraRings,
      dome,
      core,
      sparks,
      sparkVels,
      age: 0,
      life: 0.56,
      maxRadius: PAIN_INFLICTION_EXPLOSION_RADIUS,
    });
  }

  /**
   * Renders thin, nearly transparent iridescent telekinetic waves around the heads
   * of BOTH Phoenix and the target (NO connecting beam).
   */
  public updatePainTelekinetic(
    active: boolean,
    playerHeadWorld: THREE.Vector3 | null,
    targetHeadWorld: THREE.Vector3 | null,
    dt: number,
  ): void {
    if (!active || !playerHeadWorld || !targetHeadWorld) {
      this.painPlayerHeadGroup.visible = false;
      this.painTargetHeadGroup.visible = false;
      return;
    }

    this.painPlayerHeadGroup.visible = true;
    this.painTargetHeadGroup.visible = true;
    this.painTime += Math.min(dt, 0.05);

    this.painPlayerHeadGroup.position.copy(playerHeadWorld);
    this.painTargetHeadGroup.position.copy(targetHeadWorld);

    const isWhitePhoenix = this.variant === 'white-phoenix';
    for (let i = 0; i < this.painPlayerRings.length; i++) {
      const pr = this.painPlayerRings[i];
      const tr = this.painTargetRings[i];
      const hueBase = (this.painTime * 0.48 + i * 0.26) % 1;

      const pScale = 0.92 + Math.sin(this.painTime * 7.2 + i * 1.8) * 0.11;
      pr.scale.setScalar(pScale);
      pr.rotation.z += dt * (2.4 + i * 0.9);
      if (isWhitePhoenix) {
        this._tmpColor.setHex(i % 2 === 0 ? 0xffffff : 0xdff0ff);
      } else {
        this._tmpColor.setHSL(hueBase, 0.58, 0.8);
      }
      const pMat = pr.material as THREE.MeshBasicMaterial;
      pMat.color.copy(this._tmpColor);
      pMat.opacity = 0.22 + Math.sin(this.painTime * 6 + i) * 0.06;

      const tScale = 1.05 + Math.cos(this.painTime * 8.4 + i * 2.1) * 0.14;
      tr.scale.setScalar(tScale);
      tr.rotation.z -= dt * (2.8 + i * 1.0);
      if (isWhitePhoenix) {
        this._tmpColor.setHex(i % 2 === 0 ? 0xf0f7ff : 0xffffff);
      } else {
        this._tmpColor.setHSL((hueBase + 0.18) % 1, 0.62, 0.78);
      }
      const tMat = tr.material as THREE.MeshBasicMaterial;
      tMat.color.copy(this._tmpColor);
      tMat.opacity = 0.25 + Math.cos(this.painTime * 6.5 + i) * 0.07;
    }

    const pHaloMat = this.painPlayerHalo.material as THREE.SpriteMaterial;
    pHaloMat.rotation = this.painTime * 2.2;
    pHaloMat.opacity = 0.2 + Math.sin(this.painTime * 5.2) * 0.05;

    const tHaloMat = this.painTargetHalo.material as THREE.SpriteMaterial;
    tHaloMat.rotation = -this.painTime * 2.6;
    tHaloMat.opacity = 0.24 + Math.cos(this.painTime * 5.8) * 0.06;
  }

  /**
   * Controls Phoenix Force / Dark Phoenix Special Revival sequence:
   * - 'rising': bright fire sphere rises vertically leaving a flame trail
   * - 'manifest': sphere vanishes and an enormous animated Phoenix silhouette fills the sky for 4.0s
   */
  public updateSpecialRevival(
    dt: number,
    phase: 'none' | 'rising' | 'manifest',
    spherePos: THREE.Vector3 | null,
    anchorPos: THREE.Vector3 | null,
    facingYaw: number,
    elapsed: number,
    duration: number,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.revivalTime += safeDt;

    // 1. Update active fire trail particles
    if (phase === 'rising' && spherePos) {
      this.revivalSphereGroup.visible = true;
      this.revivalSphereGroup.position.copy(spherePos);
      const pulse = 1 + Math.sin(this.revivalTime * 18) * 0.12;
      this.revivalSphereGroup.scale.setScalar(pulse);
      this.revivalSphereGlow.material.rotation = this.revivalTime * 4;

      this.revivalTrailAccum += safeDt;
      while (this.revivalTrailAccum >= 0.022) {
        this.revivalTrailAccum -= 0.022;
        let p: FireParticle | null = null;
        for (let idx = 0; idx < this.revivalTrailPool.length; idx++) {
          if (!this.revivalTrailPool[idx].active) {
            p = this.revivalTrailPool[idx];
            break;
          }
        }
        if (p) {
          p.active = true;
          p.age = 0;
          p.life = 0.48 + Math.random() * 0.22;
          p.sprite.position.set(
            spherePos.x + (Math.random() - 0.5) * 0.24,
            spherePos.y - 0.15,
            spherePos.z + (Math.random() - 0.5) * 0.24,
          );
          p.vel.set(
            (Math.random() - 0.5) * 0.45,
            -1.4 - Math.random() * 1.1,
            (Math.random() - 0.5) * 0.45,
          );
          p.startScale = 0.85 + Math.random() * 0.35;
          p.endScale = 0.14;
          p.maxOpacity = 0.92;
          p.sprite.visible = true;
        }
      }
    } else {
      this.revivalSphereGroup.visible = false;
      this.revivalTrailAccum = 0;
    }

    for (let i = 0; i < this.revivalTrailPool.length; i++) {
      const p = this.revivalTrailPool[i];
      if (!p.active) continue;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.sprite.position.addScaledVector(p.vel, safeDt);
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, t));
      (p.sprite.material as THREE.SpriteMaterial).opacity =
        p.maxOpacity * Math.sin(t * Math.PI);
    }

    // 2. Giant animated Phoenix silhouette visible throughout the 4.0s anchor phase
    if (phase === 'manifest' && anchorPos) {
      this.revivalBirdGroup.visible = true;
      this.revivalBirdGroup.position.copy(anchorPos);
      this.revivalBirdGroup.rotation.y = facingYaw;

      const fadeIn = Math.min(1, elapsed / 0.35);
      const fadeOut = Math.min(1, Math.max(0, (duration - elapsed) / 0.45));
      const envelope = fadeIn * fadeOut;

      const openScale = 0.72 + 0.28 * Math.min(1, elapsed / 0.45);
      this.revivalBirdGroup.scale.setScalar(openScale);

      const coreMat = this.revivalBirdCore.material as THREE.SpriteMaterial;
      coreMat.opacity = (0.72 + Math.sin(this.revivalTime * 7.5) * 0.12) * envelope;
      this.revivalBirdCore.scale.setScalar(
        5.8 + Math.sin(this.revivalTime * 5.2) * 0.35,
      );

      for (let i = 0; i < this.revivalBirdNodes.length; i++) {
        const node = this.revivalBirdNodes[i];
        const wave = Math.sin(this.revivalTime * 8.5 + node.phase);
        const flapY = Math.abs(node.basePos.x) * Math.sin(this.revivalTime * 3.8) * 0.14;
        node.sprite.position.set(
          node.basePos.x + Math.cos(this.revivalTime * 4.5 + node.phase) * 0.06,
          node.basePos.y + flapY + wave * 0.09,
          node.basePos.z + Math.sin(this.revivalTime * 3.8 + node.phase) * 0.05,
        );
        const flicker = 0.9 + Math.sin(this.revivalTime * 14 + node.phase) * 0.14;
        node.sprite.scale.set(
          node.baseScaleX * flicker,
          node.baseScaleY * flicker,
          1,
        );
        (node.sprite.material as THREE.SpriteMaterial).opacity =
          node.maxOpacity * envelope;
      }
    } else {
      this.revivalBirdGroup.visible = false;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    flightActive: boolean,
    targets: ReadonlyArray<CombatTargetProbe>,
    onFireballHit: (targetId: string, hitDir: THREE.Vector3, hitPos: THREE.Vector3) => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);

    // 1. Flight fiery ember trails
    if (flightActive) {
      this.flightEmitAccum += safeDt;
      while (this.flightEmitAccum >= 0.036) {
        this.flightEmitAccum -= 0.036;
        let p: FireParticle | null = null;
        for (let idx = 0; idx < this.flightTrailPool.length; idx++) {
          if (!this.flightTrailPool[idx].active) {
            p = this.flightTrailPool[idx];
            break;
          }
        }
        if (p) {
          p.active = true;
          p.age = 0;
          p.life = 0.55 + Math.random() * 0.24;
          const angle = Math.random() * Math.PI * 2;
          const rad = 0.18 + Math.random() * 0.36;
          p.offset.set(
            Math.cos(angle) * rad,
            0.35 + Math.random() * 0.88,
            Math.sin(angle) * rad,
          );
          p.vel.set(
            Math.cos(angle) * 0.28,
            0.35 + Math.random() * 0.45,
            Math.sin(angle) * 0.28,
          );
          p.startScale = 0.32 + Math.random() * 0.2;
          p.endScale = 0.08;
          p.maxOpacity = 0.82;
          p.sprite.position.copy(playerPos).add(p.offset);
          p.sprite.visible = true;
        }
      }
    } else {
      this.flightEmitAccum = 0;
    }

    for (let i = 0; i < this.flightTrailPool.length; i++) {
      const p = this.flightTrailPool[i];
      if (!p.active) continue;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.offset.addScaledVector(p.vel, safeDt);
      p.sprite.position.copy(playerPos).add(p.offset);
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, t));
      (p.sprite.material as THREE.SpriteMaterial).opacity =
        p.maxOpacity * Math.sin(t * Math.PI);
    }

    // 2. Phoenix Fireballs
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.age += safeDt;
      fb.group.position.addScaledVector(fb.vel, safeDt);

      for (let t = fb.trailPositions.length - 1; t > 0; t--) {
        fb.trailPositions[t].lerp(fb.trailPositions[t - 1], 0.6);
        fb.trailSprites[t].position.copy(fb.trailPositions[t]);
      }
      fb.trailPositions[0].copy(fb.group.position);
      fb.trailSprites[0].position.copy(fb.group.position);

      let collided = fb.age >= fb.maxAge || fb.group.position.y <= 0.08;
      if (!collided) {
        for (let k = 0; k < targets.length; k++) {
          const trg = targets[k];
          if (fb.hitIds.has(trg.id)) continue;
          const dx = fb.group.position.x - trg.position.x;
          const dz = fb.group.position.z - trg.position.z;
          const dy = fb.group.position.y - (trg.position.y + trg.height * 0.56);
          const hitRadius = trg.radius + 0.36;
          if (dx * dx + dz * dz <= hitRadius * hitRadius && Math.abs(dy) <= trg.height * 0.65) {
            fb.hitIds.add(trg.id);
            this.spawnFireballImpact(fb.group.position);
            this._tmpTo.copy(fb.vel).setY(0).normalize();
            onFireballHit(trg.id, this._tmpTo, fb.group.position);
            collided = true;
            break;
          }
        }
      } else if (fb.group.position.y <= 0.08) {
        this.spawnFireballImpact(fb.group.position);
      }

      if (collided) {
        this.removeFireball(i);
      }
    }

    // 3. Fire & Telekinetic Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += safeDt;
      const t = THREE.MathUtils.clamp(exp.age / exp.life, 0, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const radiusNow = THREE.MathUtils.lerp(0.28, exp.maxRadius, easeOut);
      const fade = 1 - t;

      exp.ring.scale.setScalar(radiusNow);
      (exp.ring.material as THREE.MeshBasicMaterial).opacity =
        (exp.kind === 'telekinetic-blast' ? 0.62 : 0.88) * fade;

      exp.core.scale.setScalar(
        (exp.kind === 'telekinetic-blast' ? 3.2 : exp.kind === 'wave' ? 2.5 : 0.85) *
          (1 - t * 0.45),
      );
      (exp.core.material as THREE.SpriteMaterial).opacity =
        (exp.kind === 'telekinetic-blast' ? 0.65 : 0.9) * fade;

      if (exp.dome) {
        exp.dome.scale.setScalar(radiusNow);
        (exp.dome.material as THREE.MeshBasicMaterial).opacity = 0.2 * fade * fade;
      }

      if (exp.extraRings) {
        for (let r = 0; r < exp.extraRings.length; r++) {
          const er = exp.extraRings[r];
          er.scale.setScalar(radiusNow * (0.9 + r * 0.08));
          er.rotation.z += safeDt * (2.6 - r * 1.4);
          (er.material as THREE.MeshBasicMaterial).opacity = 0.48 * fade;
        }
      }

      if (exp.silhouetteGroup && exp.silhouetteNodes) {
        const silScale = THREE.MathUtils.lerp(0.42, 1.15, easeOut);
        exp.silhouetteGroup.scale.setScalar(silScale);
        exp.silhouetteGroup.position.y = 0.28 + easeOut * 0.55;
        const silAlpha = Math.sin(Math.min(1, t * 1.15) * Math.PI) * (1 - t * 0.25);

        for (let n = 0; n < exp.silhouetteNodes.length; n++) {
          const node = exp.silhouetteNodes[n];
          node.sprite.position.set(
            node.basePos.x + node.vel.x * t * 0.48,
            node.basePos.y + node.vel.y * t * 0.58 + Math.sin(exp.age * 16 + node.phase) * 0.04,
            node.basePos.z + node.vel.z * t * 0.42,
          );
          const flicker = 0.9 + Math.sin(exp.age * 18 + node.phase) * 0.12;
          node.sprite.scale.set(
            node.baseScaleX * flicker * (1 - t * 0.28),
            node.baseScaleY * flicker * (1 - t * 0.22),
            1,
          );
          (node.sprite.material as THREE.SpriteMaterial).opacity =
            node.maxOpacity * Math.max(0, silAlpha);
        }
      }

      for (let s = 0; s < exp.sparks.length; s++) {
        exp.sparks[s].position.addScaledVector(exp.sparkVels[s], safeDt);
        exp.sparkVels[s].multiplyScalar(Math.exp(-3.4 * safeDt));
        exp.sparks[s].scale.setScalar(
          (exp.kind === 'telekinetic-blast' ? 0.52 : 0.36) * (1 - t * 0.55),
        );
        (exp.sparks[s].material as THREE.SpriteMaterial).opacity =
          (exp.kind === 'telekinetic-blast' ? 0.72 : 0.92) * fade;
      }

      if (exp.age >= exp.life) {
        this.removeExplosion(i);
      }
    }
  }

  private removeFireball(idx: number): void {
    const fb = this.fireballs[idx];
    fb.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.remove(fb.group);
    for (const ts of fb.trailSprites) {
      (ts.material as THREE.Material).dispose();
      this.group.remove(ts);
    }
    this.fireballs.splice(idx, 1);
  }

  private removeExplosion(idx: number): void {
    const exp = this.explosions[idx];
    exp.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.remove(exp.group);
    this.explosions.splice(idx, 1);
  }

  public clearActiveEffects(): void {
    this.painPlayerHeadGroup.visible = false;
    this.painTargetHeadGroup.visible = false;
    this.revivalSphereGroup.visible = false;
    this.revivalBirdGroup.visible = false;
    this.diveAimGroup.visible = false;
    for (const p of this.revivalTrailPool) {
      p.active = false;
      p.sprite.visible = false;
    }
    for (let i = this.fireballs.length - 1; i >= 0; i--) this.removeFireball(i);
    for (let i = this.explosions.length - 1; i >= 0; i--) this.removeExplosion(i);
    for (const p of this.flightTrailPool) {
      p.active = false;
      p.sprite.visible = false;
    }
  }

  public dispose(): void {
    this.clearActiveEffects();
    for (const p of this.flightTrailPool) {
      (p.sprite.material as THREE.Material).dispose();
    }
    for (const p of this.revivalTrailPool) {
      (p.sprite.material as THREE.Material).dispose();
    }
    this.diveAimGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose?.();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.revivalSphereGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose?.();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.revivalBirdGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.painPlayerHeadGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.painTargetHeadGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.ringGeo.dispose();
    this.thinWaveGeo.dispose();
    this.headWaveGeo.dispose();
    this.domeGeo.dispose();
    this.fireballGeo.dispose();
  }
}
