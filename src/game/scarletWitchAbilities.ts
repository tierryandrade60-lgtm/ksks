import * as THREE from 'three';

export const CHAOS_EXPLOSION_RADIUS = 5.4;
export const SCARLET_FLIGHT_CANCEL_RADIUS = 5.0;
export const TELEKINETIC_EXPLOSION_RADIUS = 6.0;
export const AUTO_SHIELD_RADIUS = 3.1;

const softChaosTexCache = new Map<string, THREE.CanvasTexture>();
let cachedChaosRingTex: THREE.CanvasTexture | null = null;
const darkholdPageTexCache = new Map<string, THREE.CanvasTexture>();

function createSoftChaosTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
  const key = `${inner}|${mid}|${outer}`;
  const cached = softChaosTexCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(0.72, outer);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  softChaosTexCache.set(key, tex);
  return tex;
}

function createChaosRingTexture(): THREE.CanvasTexture {
  if (cachedChaosRingTex) return cachedChaosRingTex;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  ctx.clearRect(0, 0, size, size);

  const aura = ctx.createRadialGradient(half, half, half * 0.42, half, half, half * 0.94);
  aura.addColorStop(0.0, 'rgba(255, 45, 70, 0)');
  aura.addColorStop(0.45, 'rgba(235, 32, 62, 0.72)');
  aura.addColorStop(0.68, 'rgba(255, 215, 225, 0.95)');
  aura.addColorStop(0.84, 'rgba(220, 22, 48, 0.6)');
  aura.addColorStop(1.0, 'rgba(180, 10, 30, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(255, 235, 240, 0.95)';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const cx = half + Math.cos(a) * half * 0.68;
    const cy = half + Math.sin(a) * half * 0.68;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedChaosRingTex = tex;
  return tex;
}

/**
 * Reusable hand Chaos Magic aura (ring + glowing orb core) used on both
 * the Character Selector preview and active Scarlet Witch gameplay.
 */
export class HandChaosAura {
  public readonly group = new THREE.Group();
  private readonly orb: THREE.Sprite;
  private readonly ring: THREE.Sprite;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;
  private readonly orbMat: THREE.SpriteMaterial;
  private readonly ringMat: THREE.SpriteMaterial;
  private time = 0;

  constructor(baseScale = 0.28, colorVariant: 'default' | 'crimson-dark' = 'default') {
    const isDark = colorVariant === 'crimson-dark';
    this.orbTex = createSoftChaosTexture(
      isDark ? 'rgba(255, 200, 196, 0.95)' : 'rgba(255, 242, 244, 0.95)',
      isDark ? 'rgba(210, 18, 28, 0.88)' : 'rgba(255, 58, 86, 0.8)',
      isDark ? 'rgba(110, 4, 14, 0.35)' : 'rgba(185, 16, 42, 0.25)',
    );
    this.ringTex = createChaosRingTexture();

    this.orbMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      color: isDark ? 0xd82028 : 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    this.ringMat = new THREE.SpriteMaterial({
      map: this.ringTex,
      color: isDark ? 0xb8101c : 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });

    this.orb = new THREE.Sprite(this.orbMat);
    this.orb.scale.setScalar(baseScale * 0.88);

    this.ring = new THREE.Sprite(this.ringMat);
    this.ring.scale.setScalar(baseScale * 1.45);

    this.group.add(this.orb, this.ring);
  }

  public update(dt: number, intensity: number, baseScale = 0.28): void {
    this.time += dt;
    const clamped = THREE.MathUtils.clamp(intensity, 0, 1.5);
    this.group.visible = clamped > 0.02;
    if (!this.group.visible) return;

    const pulse = 1 + Math.sin(this.time * 6.5) * 0.1;
    this.orb.scale.setScalar(baseScale * 0.86 * pulse * clamped);
    this.ring.scale.setScalar(
      baseScale * 1.45 * (1 + Math.cos(this.time * 4.8) * 0.08) * clamped,
    );
    this.ringMat.rotation = this.time * 2.2;
    this.orbMat.opacity = Math.min(1, 0.72 * clamped);
    this.ringMat.opacity = Math.min(1, 0.82 * clamped);
  }

  public dispose(): void {
    this.orbMat.dispose();
    this.ringMat.dispose();
  }
}

interface MistParticle {
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

interface ChaosBoltInstance {
  group: THREE.Group;
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  p3: THREE.Vector3;
  prevPos: THREE.Vector3;
  t: number;
  duration: number;
  damage: number;
  hitIds: Set<string>;
  trailPositions: THREE.Vector3[];
  trailSprites: THREE.Sprite[];
}

interface BoltImpactBurst {
  kind: 'bolt';
  group: THREE.Group;
  ring: THREE.Mesh;
  core: THREE.Sprite;
  age: number;
  life: number;
  maxRadius: number;
}

interface ChaosSphereExplosion {
  kind: 'sphere';
  group: THREE.Group;
  outerSphere: THREE.Mesh;
  innerVoid: THREE.Mesh;
  halo: THREE.Sprite;
  orbitRings: THREE.Mesh[];
  wisps: THREE.Sprite[];
  wispDirs: THREE.Vector3[];
  age: number;
  life: number;
  maxRadius: number;
}

type ImpactEffect = BoltImpactBurst | ChaosSphereExplosion;

interface ImplosionProjectile {
  group: THREE.Group;
  target: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

export interface CombatTargetProbe {
  id: string;
  position: THREE.Vector3;
  radius: number;
  height: number;
}

export class ScarletWitchVfxSystem {
  public readonly group = new THREE.Group();

  private readonly mistTex: THREE.CanvasTexture;
  private readonly boltOrbTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;

  private readonly flightMistPool: MistParticle[] = [];
  private readonly burstMistPool: MistParticle[] = [];
  private readonly bolts: ChaosBoltInstance[] = [];
  private readonly implosionOrbs: ImplosionProjectile[] = [];
  private readonly impacts: ImpactEffect[] = [];

  private readonly ringGeo = new THREE.RingGeometry(0.84, 1.0, 32);
  private readonly boltGeo = new THREE.SphereGeometry(0.14, 12, 10);
  private readonly implosionCoreGeo = new THREE.SphereGeometry(0.26, 14, 12);
  private readonly unitSphereGeo = new THREE.SphereGeometry(1, 24, 18);

  private flightEmitAccum = 0;

  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpTo = new THREE.Vector3();
  private readonly _tmpChordDir = new THREE.Vector3();
  private readonly _tmpRight = new THREE.Vector3();
  private readonly _tmpPerpUp = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);

  private readonly colorVariant: 'default' | 'crimson-dark';

  constructor(colorVariant: 'default' | 'crimson-dark' = 'default') {
    this.colorVariant = colorVariant;
    const isDark = colorVariant === 'crimson-dark';
    this.mistTex = createSoftChaosTexture(
      isDark ? 'rgba(148, 8, 20, 0.9)' : 'rgba(165, 16, 36, 0.82)',
      isDark ? 'rgba(72, 3, 10, 0.68)' : 'rgba(92, 6, 20, 0.56)',
      isDark ? 'rgba(24, 1, 5, 0.22)' : 'rgba(32, 2, 10, 0.14)',
    );
    this.boltOrbTex = createSoftChaosTexture(
      isDark ? 'rgba(255, 205, 200, 1.0)' : 'rgba(255, 240, 244, 1.0)',
      isDark ? 'rgba(214, 16, 28, 0.92)' : 'rgba(245, 36, 68, 0.88)',
      isDark ? 'rgba(105, 4, 14, 0.32)' : 'rgba(155, 10, 28, 0.25)',
    );
    this.ringTex = createChaosRingTexture();

    for (let i = 0; i < 28; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.mistTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.flightMistPool.push({
        sprite,
        active: false,
        age: 0,
        life: 0.8,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.45,
        endScale: 0.85,
        maxOpacity: 0.52,
      });
    }

    for (let i = 0; i < 36; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.mistTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.burstMistPool.push({
        sprite,
        active: false,
        age: 0,
        life: 0.65,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.7,
        endScale: 1.25,
        maxOpacity: 0.78,
      });
    }
  }

  public spawnBodyMistCloud(worldCenter: THREE.Vector3): void {
    let spawned = 0;
    for (let i = 0; i < this.burstMistPool.length && spawned < 14; i++) {
      const p = this.burstMistPool[i];
      if (p.active) continue;
      spawned++;
      p.active = true;
      p.age = 0;
      p.life = 0.58 + Math.random() * 0.24;
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * 0.42;
      const h = 0.2 + Math.random() * 1.45;
      p.sprite.position.set(
        worldCenter.x + Math.cos(angle) * rad,
        worldCenter.y + h,
        worldCenter.z + Math.sin(angle) * rad,
      );
      p.vel.set(
        Math.cos(angle) * (0.28 + Math.random() * 0.35),
        0.35 + Math.random() * 0.45,
        Math.sin(angle) * (0.28 + Math.random() * 0.35),
      );
      p.startScale = 0.62 + Math.random() * 0.3;
      p.endScale = 1.15 + Math.random() * 0.35;
      p.maxOpacity = 0.74;
      p.sprite.visible = true;
    }
  }

  public spawnRevivalChargeBurst(worldCenter: THREE.Vector3): void {
    let spawned = 0;
    for (let i = 0; i < this.burstMistPool.length && spawned < 18; i++) {
      const p = this.burstMistPool[i];
      if (p.active) continue;
      spawned++;
      p.active = true;
      p.age = 0;
      p.life = 0.46 + Math.random() * 0.22;
      const angle = (spawned / 18) * Math.PI * 2 + Math.random() * 0.3;
      const rad = 0.45 + Math.random() * 0.55;
      p.sprite.position.set(
        worldCenter.x + Math.cos(angle) * rad,
        worldCenter.y + 0.12 + Math.random() * 0.45,
        worldCenter.z + Math.sin(angle) * rad,
      );
      p.vel.set(
        -Math.cos(angle) * 0.85,
        1.15 + Math.random() * 0.85,
        -Math.sin(angle) * 0.85,
      );
      p.startScale = 0.52 + Math.random() * 0.26;
      p.endScale = 1.05 + Math.random() * 0.32;
      p.maxOpacity = 0.82;
      p.sprite.visible = true;
    }
  }

  public spawnChaosBolt(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const chord = this._tmpDir.copy(targetPoint).sub(origin);
    const dist = Math.max(chord.length(), 0.25);
    const dir = this._tmpChordDir.copy(chord).divideScalar(dist);

    // Build orthonormal lateral & vertical vectors perpendicular to shot chord
    const right = this._tmpRight.crossVectors(dir, this._worldUp);
    if (right.lengthSq() < 1e-4) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }
    const perpUp = this._tmpPerpUp.crossVectors(right, dir).normalize();

    const side = Math.random() > 0.5 ? 1 : -1;
    const arcH = Math.min(2.3, Math.max(0.28, dist * 0.115)) * (0.65 + Math.random() * 0.55);
    const arcV = (Math.random() - 0.3) * Math.min(1.35, dist * 0.065);

    const p0 = origin.clone();
    const p3 = targetPoint.clone();
    const p1 = p0
      .clone()
      .lerp(p3, 0.33)
      .addScaledVector(right, side * arcH)
      .addScaledVector(perpUp, arcV);
    const p2 = p0
      .clone()
      .lerp(p3, 0.68)
      .addScaledVector(right, side * arcH * 0.48)
      .addScaledVector(perpUp, arcV * 0.6);
    p1.y = Math.max(p1.y, 0.26);
    p2.y = Math.max(p2.y, 0.26);

    const boltGroup = new THREE.Group();
    boltGroup.position.copy(origin);

    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe4ea });
    const core = new THREE.Mesh(this.boltGeo, coreMat);

    const haloMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.68);

    const ringMat = new THREE.SpriteMaterial({
      map: this.ringTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    const ring = new THREE.Sprite(ringMat);
    ring.scale.setScalar(0.55);

    boltGroup.add(core, halo, ring);
    this.group.add(boltGroup);

    const trailPositions: THREE.Vector3[] = [];
    const trailSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      trailPositions.push(origin.clone());
      const tMat = new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.52 * (1 - i / 6),
      });
      const tSprite = new THREE.Sprite(tMat);
      const s = 0.34 * (1 - i * 0.13);
      tSprite.scale.setScalar(s);
      tSprite.position.copy(origin);
      this.group.add(tSprite);
      trailSprites.push(tSprite);
    }

    this.bolts.push({
      group: boltGroup,
      p0,
      p1,
      p2,
      p3,
      prevPos: origin.clone(),
      t: 0,
      duration: THREE.MathUtils.clamp(dist / 28, 0.14, 1.35),
      damage: 30,
      hitIds: new Set<string>(),
      trailPositions,
      trailSprites,
    });
  }

  /**
   * Supreme Sorceress stack-fired Chaos Bolt inspired by the widening dark-red Energy Drain Beam.
   */
  public spawnSupremeBeamBolt(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    const dist = Math.max(dir.length(), 0.25);
    const p0 = origin.clone();
    const p3 = targetPoint.clone();
    const p1 = p0.clone().lerp(p3, 0.33);
    const p2 = p0.clone().lerp(p3, 0.67);

    const boltGroup = new THREE.Group();
    boltGroup.position.copy(origin);
    const core = new THREE.Mesh(
      this.boltGeo,
      new THREE.MeshBasicMaterial({ color: 0xffc8c8 }),
    );
    core.scale.set(1.25, 1.25, 2.2);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        color: 0xd91024,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.98,
      }),
    );
    halo.scale.setScalar(1.02);

    const ring = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.ringTex,
        color: 0xff3646,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      }),
    );
    ring.scale.setScalar(0.84);

    boltGroup.add(core, halo, ring);
    boltGroup.lookAt(targetPoint);
    this.group.add(boltGroup);

    const trailPositions: THREE.Vector3[] = [];
    const trailSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 7; i++) {
      trailPositions.push(origin.clone());
      const ts = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.boltOrbTex,
          color: 0xb00c1e,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.62 * (1 - i / 7),
        }),
      );
      ts.scale.setScalar(0.46 * (1 - i * 0.11));
      ts.position.copy(origin);
      this.group.add(ts);
      trailSprites.push(ts);
    }

    this.bolts.push({
      group: boltGroup,
      p0,
      p1,
      p2,
      p3,
      prevPos: origin.clone(),
      t: 0,
      duration: THREE.MathUtils.clamp(dist / 36, 0.1, 0.95),
      damage: 42,
      hitIds: new Set<string>(),
      trailPositions,
      trailSprites,
    });
  }

  public spawnChaosImplosion(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    const dist = dir.length();
    if (dist < 0.05) {
      dir.set(0, 0, -1);
    } else {
      dir.divideScalar(dist);
    }

    const orbGroup = new THREE.Group();
    orbGroup.position.copy(origin);

    const coreMat = new THREE.MeshBasicMaterial({ color: 0x3b040c });
    const core = new THREE.Mesh(this.implosionCoreGeo, coreMat);

    const auraMat = new THREE.SpriteMaterial({
      map: this.ringTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    const aura = new THREE.Sprite(auraMat);
    aura.scale.setScalar(0.95);

    const glowMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.75);

    orbGroup.add(core, aura, glow);
    this.group.add(orbGroup);

    const speed = 27.0;
    const travelTime = THREE.MathUtils.clamp(dist / speed, 0.12, 1.15);

    this.implosionOrbs.push({
      group: orbGroup,
      target: targetPoint.clone(),
      vel: dir.clone().multiplyScalar(speed),
      age: 0,
      maxAge: travelTime,
    });
  }

  private spawnBoltImpact(pos: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.copy(pos);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3b58,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);

    const coreMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(0.65);

    grp.add(ring, core);
    this.group.add(grp);

    this.impacts.push({
      kind: 'bolt',
      group: grp,
      ring,
      core,
      age: 0,
      life: 0.26,
      maxRadius: 0.72,
    });
  }

  /**
   * Large, concentrated supernatural 3D crimson sphere expanding in ALL directions
   * matching exact hit radius CHAOS_EXPLOSION_RADIUS (5.4m).
   */
  private spawnChaosSphereEffect(pos: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(pos.x, Math.max(pos.y, 0.85), pos.z);

    // 1. Expanding supernatural crimson outer sphere (radius strictly reaches CHAOS_EXPLOSION_RADIUS)
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xd91438,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerSphere = new THREE.Mesh(this.unitSphereGeo, outerMat);
    outerSphere.scale.setScalar(0.5);

    // 2. Concentrated dark supernatural core pulsing at center
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x260209,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const innerVoid = new THREE.Mesh(this.unitSphereGeo, innerMat);
    innerVoid.scale.setScalar(1.3);

    // 3. Soft glowing chaos halo sprite filling spherical heart
    const haloMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(4.0);

    // 4. Three orthogonal 3D orbital energy bands framing the spherical boundary
    const orbitRings: THREE.Mesh[] = [];
    const tilts: Array<[number, number, number]> = [
      [0.45, 0.2, 0.15],
      [1.35, -0.5, 0.65],
      [-0.85, 0.7, -0.4],
    ];
    for (const [rx, ry, rz] of tilts) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff4066,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.rotation.set(rx, ry, rz);
      rMesh.scale.setScalar(0.5);
      grp.add(rMesh);
      orbitRings.push(rMesh);
    }

    // 5. 14 3D radial supernatural wisps expanding uniformly across the full sphere
    const wisps: THREE.Sprite[] = [];
    const wispDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 14);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ).normalize();

      const wMat = new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      });
      const wisp = new THREE.Sprite(wMat);
      wisp.scale.setScalar(0.58);
      grp.add(wisp);
      wisps.push(wisp);
      wispDirs.push(dir);
    }

    grp.add(outerSphere, innerVoid, halo);
    this.group.add(grp);

    this.impacts.push({
      kind: 'sphere',
      group: grp,
      outerSphere,
      innerVoid,
      halo,
      orbitRings,
      wisps,
      wispDirs,
      age: 0,
      life: 0.58,
      maxRadius: CHAOS_EXPLOSION_RADIUS,
    });
  }

  /**
   * Large red Chaos shockwave emitted around Scarlet Witch when cancelling Flight.
   */
  public spawnFlightCancelShockwave(pos: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.set(pos.x, Math.max(pos.y, 0.65), pos.z);

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff1e45,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerSphere = new THREE.Mesh(this.unitSphereGeo, outerMat);
    outerSphere.scale.setScalar(0.5);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x5c0414,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const innerVoid = new THREE.Mesh(this.unitSphereGeo, innerMat);
    innerVoid.scale.setScalar(1.0);

    const haloMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.94,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(3.6);

    const orbitRings: THREE.Mesh[] = [];
    const tilts: Array<[number, number, number]> = [
      [Math.PI / 2, 0, 0],
      [0.32, 0.25, -0.18],
      [-0.28, -0.35, 0.24],
    ];
    for (const [rx, ry, rz] of tilts) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff4669,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.rotation.set(rx, ry, rz);
      rMesh.scale.setScalar(0.5);
      grp.add(rMesh);
      orbitRings.push(rMesh);
    }

    const wisps: THREE.Sprite[] = [];
    const wispDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), (i % 3 - 1) * 0.22, Math.sin(a)).normalize();
      const wMat = new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.92,
      });
      const wisp = new THREE.Sprite(wMat);
      wisp.scale.setScalar(0.62);
      grp.add(wisp);
      wisps.push(wisp);
      wispDirs.push(dir);
    }

    grp.add(outerSphere, innerVoid, halo);
    this.group.add(grp);

    this.impacts.push({
      kind: 'sphere',
      group: grp,
      outerSphere,
      innerVoid,
      halo,
      orbitRings,
      wisps,
      wispDirs,
      age: 0,
      life: 0.48,
      maxRadius: SCARLET_FLIGHT_CANCEL_RADIUS,
    });
  }

  /**
   * Supernatural crimson & dark-red revival burst erupted around Scarlet Witch on Respawn.
   */
  public spawnRevivalBurst(pos: THREE.Vector3): void {
    this.spawnBodyMistCloud(pos);

    const grp = new THREE.Group();
    grp.position.set(pos.x, Math.max(pos.y, 0.9), pos.z);

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff224c,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerSphere = new THREE.Mesh(this.unitSphereGeo, outerMat);
    outerSphere.scale.setScalar(0.45);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x38020c,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const innerVoid = new THREE.Mesh(this.unitSphereGeo, innerMat);
    innerVoid.scale.setScalar(0.95);

    const haloMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.96,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(3.8);

    const orbitRings: THREE.Mesh[] = [];
    const tilts: Array<[number, number, number]> = [
      [Math.PI / 2, 0, 0],
      [0.42, 0.3, 0.22],
      [-0.45, -0.28, 0.35],
    ];
    for (const [rx, ry, rz] of tilts) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff4669,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.rotation.set(rx, ry, rz);
      rMesh.scale.setScalar(0.5);
      grp.add(rMesh);
      orbitRings.push(rMesh);
    }

    const wisps: THREE.Sprite[] = [];
    const wispDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 14);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) * 0.72 + 0.14,
        Math.sin(phi) * Math.sin(theta),
      ).normalize();
      const wMat = new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.94,
      });
      const wisp = new THREE.Sprite(wMat);
      wisp.scale.setScalar(0.64);
      grp.add(wisp);
      wisps.push(wisp);
      wispDirs.push(dir);
    }

    grp.add(outerSphere, innerVoid, halo);
    this.group.add(grp);

    this.impacts.push({
      kind: 'sphere',
      group: grp,
      outerSphere,
      innerVoid,
      halo,
      orbitRings,
      wisps,
      wispDirs,
      age: 0,
      life: 0.64,
      maxRadius: 4.8,
    });
  }

  /**
   * Darkhold Telekinetic Explosion: rapid outward scarlet/dark-red shockwave
   * blasting enemies away from Scarlet Witch across TELEKINETIC_EXPLOSION_RADIUS (6.0m).
   */
  public spawnTelekineticExplosion(pos: THREE.Vector3): void {
    this.spawnBodyMistCloud(pos);

    const grp = new THREE.Group();
    grp.position.set(pos.x, Math.max(pos.y + 0.85, 0.9), pos.z);

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff1644,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerSphere = new THREE.Mesh(this.unitSphereGeo, outerMat);
    outerSphere.scale.setScalar(0.5);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x3b020c,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const innerVoid = new THREE.Mesh(this.unitSphereGeo, innerMat);
    innerVoid.scale.setScalar(1.1);

    const haloMat = new THREE.SpriteMaterial({
      map: this.boltOrbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.98,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(4.4);

    const orbitRings: THREE.Mesh[] = [];
    const tilts: Array<[number, number, number]> = [
      [Math.PI / 2, 0, 0],
      [0.35, 0.25, -0.22],
      [-0.38, -0.3, 0.28],
    ];
    for (const [rx, ry, rz] of tilts) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xff547a,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(this.ringGeo, rMat);
      rMesh.rotation.set(rx, ry, rz);
      rMesh.scale.setScalar(0.5);
      grp.add(rMesh);
      orbitRings.push(rMesh);
    }

    const wisps: THREE.Sprite[] = [];
    const wispDirs: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const elev = ((i % 3) - 1) * 0.25;
      const dir = new THREE.Vector3(Math.cos(a), elev, Math.sin(a)).normalize();
      const wMat = new THREE.SpriteMaterial({
        map: this.boltOrbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.96,
      });
      const wisp = new THREE.Sprite(wMat);
      wisp.scale.setScalar(0.66);
      grp.add(wisp);
      wisps.push(wisp);
      wispDirs.push(dir);
    }

    grp.add(outerSphere, innerVoid, halo);
    this.group.add(grp);

    this.impacts.push({
      kind: 'sphere',
      group: grp,
      outerSphere,
      innerVoid,
      halo,
      orbitRings,
      wisps,
      wispDirs,
      age: 0,
      life: 0.52,
      maxRadius: TELEKINETIC_EXPLOSION_RADIUS,
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    flightActive: boolean,
    targets: ReadonlyArray<CombatTargetProbe>,
    onBoltHit: (
      targetId: string,
      hitDir: THREE.Vector3,
      hitPos: THREE.Vector3,
      damage: number,
    ) => void,
    onImplosionDetonate: (center: THREE.Vector3) => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);

    // 1. Flight localized dark-red mist around legs & lower torso
    if (flightActive) {
      this.flightEmitAccum += safeDt;
      while (this.flightEmitAccum >= 0.045) {
        this.flightEmitAccum -= 0.045;
        let p: MistParticle | null = null;
        for (let idx = 0; idx < this.flightMistPool.length; idx++) {
          if (!this.flightMistPool[idx].active) {
            p = this.flightMistPool[idx];
            break;
          }
        }
        if (p) {
          p.active = true;
          p.age = 0;
          p.life = 0.68 + Math.random() * 0.28;
          const angle = Math.random() * Math.PI * 2;
          const rad = 0.14 + Math.random() * 0.28;
          p.offset.set(
            Math.cos(angle) * rad,
            0.22 + Math.random() * 0.62,
            Math.sin(angle) * rad,
          );
          p.vel.set(
            Math.cos(angle) * 0.18,
            -0.25 + Math.random() * 0.25,
            Math.sin(angle) * 0.18,
          );
          p.startScale = 0.44 + Math.random() * 0.22;
          p.endScale = 0.78 + Math.random() * 0.28;
          p.maxOpacity = 0.56;
          p.sprite.position.copy(playerPos).add(p.offset);
          p.sprite.visible = true;
        }
      }
    } else {
      this.flightEmitAccum = 0;
    }

    for (let i = 0; i < this.flightMistPool.length; i++) {
      const p = this.flightMistPool[i];
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
      const scale = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
      p.sprite.scale.setScalar(scale);
      const fade = Math.sin(t * Math.PI);
      (p.sprite.material as THREE.SpriteMaterial).opacity = p.maxOpacity * fade;
    }

    // 2. Teleport origin/arrival crimson mist clouds
    for (let i = 0; i < this.burstMistPool.length; i++) {
      const p = this.burstMistPool[i];
      if (!p.active) continue;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.sprite.position.addScaledVector(p.vel, safeDt);
      p.vel.multiplyScalar(Math.exp(-3.5 * safeDt));
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, t));
      (p.sprite.material as THREE.SpriteMaterial).opacity =
        p.maxOpacity * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) * (1 - t);
    }

    // 3. Chaos Bolt Projectiles (Curved Cubic Bezier Paths ending precisely at crosshair target)
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.prevPos.copy(b.group.position);
      b.t = Math.min(1, b.t + safeDt / b.duration);
      const u = 1 - b.t;
      const w0 = u * u * u;
      const w1 = 3 * u * u * b.t;
      const w2 = 3 * u * b.t * b.t;
      const w3 = b.t * b.t * b.t;

      b.group.position.set(
        w0 * b.p0.x + w1 * b.p1.x + w2 * b.p2.x + w3 * b.p3.x,
        w0 * b.p0.y + w1 * b.p1.y + w2 * b.p2.y + w3 * b.p3.y,
        w0 * b.p0.z + w1 * b.p1.z + w2 * b.p2.z + w3 * b.p3.z,
      );

      for (let t = b.trailPositions.length - 1; t > 0; t--) {
        b.trailPositions[t].lerp(b.trailPositions[t - 1], 0.58);
        b.trailSprites[t].position.copy(b.trailPositions[t]);
      }
      b.trailPositions[0].copy(b.group.position);
      b.trailSprites[0].position.copy(b.group.position);

      let collided = false;
      this._tmpDir.copy(b.group.position).sub(b.prevPos);
      const segLenSq = this._tmpDir.lengthSq();

      for (let k = 0; k < targets.length; k++) {
        const trg = targets[k];
        if (b.hitIds.has(trg.id)) continue;
        // Closest point on [prevPos -> currentPos] to NPC body center
        const cx = trg.position.x;
        const cy = trg.position.y + trg.height * 0.56;
        const cz = trg.position.z;
        let alpha = 1;
        if (segLenSq > 1e-6) {
          alpha = THREE.MathUtils.clamp(
            ((cx - b.prevPos.x) * this._tmpDir.x +
              (cy - b.prevPos.y) * this._tmpDir.y +
              (cz - b.prevPos.z) * this._tmpDir.z) /
              segLenSq,
            0,
            1,
          );
        }
        const px = b.prevPos.x + this._tmpDir.x * alpha;
        const py = b.prevPos.y + this._tmpDir.y * alpha;
        const pz = b.prevPos.z + this._tmpDir.z * alpha;

        const dx = px - cx;
        const dz = pz - cz;
        const dy = py - cy;
        const hitRadius = trg.radius + 0.36;
        if (dx * dx + dz * dz <= hitRadius * hitRadius && Math.abs(dy) <= trg.height * 0.65) {
          b.hitIds.add(trg.id);
          b.group.position.set(px, py, pz);
          this.spawnBoltImpact(b.group.position);
          this._tmpTo.copy(this._tmpDir).setY(0);
          if (this._tmpTo.lengthSq() < 1e-5) {
            this._tmpTo.copy(b.p3).sub(b.p0).setY(0);
          }
          if (this._tmpTo.lengthSq() > 1e-5) this._tmpTo.normalize();
          else this._tmpTo.set(0, 0, -1);
          onBoltHit(trg.id, this._tmpTo, b.group.position, b.damage);
          collided = true;
          break;
        }
      }

      if (!collided && (b.t >= 1 || b.group.position.y <= 0.06)) {
        this.spawnBoltImpact(b.group.position);
        collided = true;
      }

      if (collided) {
        this.removeBolt(i);
      }
    }

    // 4. Chaos Explosion Orbs -> Spherical 3D Supernatural Detonation
    for (let i = this.implosionOrbs.length - 1; i >= 0; i--) {
      const orb = this.implosionOrbs[i];
      orb.age += safeDt;
      orb.group.position.addScaledVector(orb.vel, safeDt);

      let hitTargetEarly = false;
      for (let k = 0; k < targets.length; k++) {
        const trg = targets[k];
        const dx = orb.group.position.x - trg.position.x;
        const dz = orb.group.position.z - trg.position.z;
        const dy = orb.group.position.y - (trg.position.y + 0.9);
        if (dx * dx + dz * dz <= 0.85 * 0.85 && Math.abs(dy) <= 1.1) {
          hitTargetEarly = true;
          break;
        }
      }

      if (hitTargetEarly || orb.age >= orb.maxAge || orb.group.position.y <= 0.15) {
        const detonatePos = this._tmpTo.copy(hitTargetEarly ? orb.group.position : orb.target);
        detonatePos.y = Math.max(detonatePos.y, 0.85);
        this.spawnChaosSphereEffect(detonatePos);
        onImplosionDetonate(detonatePos);
        this.removeImplosionOrb(i);
      }
    }

    // 5. Impact Bursts & Spherical Supernatural Explosions
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const imp = this.impacts[i];
      imp.age += safeDt;
      const t = THREE.MathUtils.clamp(imp.age / imp.life, 0, 1);

      if (imp.kind === 'bolt') {
        const s = THREE.MathUtils.lerp(0.18, imp.maxRadius, 1 - (1 - t) * (1 - t));
        imp.ring.scale.setScalar(s);
        (imp.ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
        imp.core.scale.setScalar(0.65 * (1 - t * 0.7));
        (imp.core.material as THREE.SpriteMaterial).opacity = 1 - t;
      } else {
        // Fast outward supernatural ease matching CHAOS_EXPLOSION_RADIUS (5.4m)
        const easeOut = 1 - Math.pow(1 - t, 3);
        const radiusNow = THREE.MathUtils.lerp(0.45, imp.maxRadius, easeOut);
        const fade = t < 0.65 ? 1 : (1 - t) / 0.35;

        imp.outerSphere.scale.setScalar(radiusNow);
        (imp.outerSphere.material as THREE.MeshBasicMaterial).opacity =
          0.42 * fade * (1 - t * 0.35);

        const coreScale =
          t < 0.28
            ? THREE.MathUtils.lerp(0.5, 1.85, t / 0.28)
            : THREE.MathUtils.lerp(1.85, 0.15, (t - 0.28) / 0.72);
        imp.innerVoid.scale.setScalar(Math.max(0.1, coreScale));
        (imp.innerVoid.material as THREE.MeshBasicMaterial).opacity = 0.92 * fade;

        imp.halo.scale.setScalar(THREE.MathUtils.lerp(2.2, imp.maxRadius * 1.4, easeOut));
        (imp.halo.material as THREE.SpriteMaterial).opacity = 0.78 * fade;

        for (let r = 0; r < imp.orbitRings.length; r++) {
          const ring = imp.orbitRings[r];
          ring.scale.setScalar(radiusNow * (0.94 + r * 0.04));
          ring.rotation.x += safeDt * (1.8 + r * 0.6);
          ring.rotation.y += safeDt * (2.2 - r * 0.5);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
        }

        for (let w = 0; w < imp.wisps.length; w++) {
          const wRadius = radiusNow * 0.96;
          imp.wisps[w].position.copy(imp.wispDirs[w]).multiplyScalar(wRadius);
          imp.wisps[w].scale.setScalar(0.62 * (1 - t * 0.55));
          (imp.wisps[w].material as THREE.SpriteMaterial).opacity = 0.92 * fade;
        }
      }

      if (imp.age >= imp.life) {
        this.removeImpact(i);
      }
    }
  }

  private removeBolt(idx: number): void {
    const b = this.bolts[idx];
    b.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.remove(b.group);
    for (const ts of b.trailSprites) {
      (ts.material as THREE.Material).dispose();
      this.group.remove(ts);
    }
    this.bolts.splice(idx, 1);
  }

  private removeImplosionOrb(idx: number): void {
    const orb = this.implosionOrbs[idx];
    orb.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.remove(orb.group);
    this.implosionOrbs.splice(idx, 1);
  }

  private removeImpact(idx: number): void {
    const imp = this.impacts[idx];
    imp.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.group.remove(imp.group);
    this.impacts.splice(idx, 1);
  }

  public clearActiveProjectiles(): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) this.removeBolt(i);
    for (let i = this.implosionOrbs.length - 1; i >= 0; i--) this.removeImplosionOrb(i);
    for (let i = this.impacts.length - 1; i >= 0; i--) this.removeImpact(i);
    for (const p of this.flightMistPool) {
      p.active = false;
      p.sprite.visible = false;
    }
    for (const p of this.burstMistPool) {
      p.active = false;
      p.sprite.visible = false;
    }
  }

  public dispose(): void {
    this.clearActiveProjectiles();
    for (const p of this.flightMistPool) {
      (p.sprite.material as THREE.Material).dispose();
    }
    for (const p of this.burstMistPool) {
      (p.sprite.material as THREE.Material).dispose();
    }
    this.ringGeo.dispose();
    this.boltGeo.dispose();
    this.implosionCoreGeo.dispose();
    this.unitSphereGeo.dispose();
  }
}

function createDarkholdPageTexture(
  rightPage: boolean,
  variant: 'crimson' | 'purple' = 'crimson',
): THREE.CanvasTexture {
  const key = `${variant}:${rightPage ? 'r' : 'l'}`;
  const cached = darkholdPageTexCache.get(key);
  if (cached) return cached;

  const isPurple = variant === 'purple';
  const w = 128;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Aged charred parchment base with glowing ember rim
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, h * 0.65);
  grad.addColorStop(0.0, isPurple ? '#EAE0F5' : '#E9D4B5');
  grad.addColorStop(0.65, isPurple ? '#BDA8D9' : '#C8A57E');
  grad.addColorStop(0.88, isPurple ? '#4E236F' : '#6B2A1E');
  grad.addColorStop(1.0, isPurple ? '#1C092C' : '#2C0A0C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle charred edge scorch border
  ctx.strokeStyle = isPurple ? 'rgba(182, 72, 255, 0.7)' : 'rgba(255, 76, 36, 0.65)';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.strokeStyle = isPurple ? '#220B38' : '#2A0E12';
  ctx.lineWidth = 2.2;
  ctx.fillStyle = isPurple ? 'rgba(148, 36, 232, 0.34)' : 'rgba(170, 20, 42, 0.32)';

  if (rightPage) {
    // Prophecy Sigil (mystic crown / coven geometry)
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.34, 24, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.36);
    ctx.lineTo(w * 0.4, h * 0.16);
    ctx.lineTo(w * 0.5, h * 0.28);
    ctx.lineTo(w * 0.6, h * 0.16);
    ctx.lineTo(w * 0.68, h * 0.36);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.34);
    ctx.lineTo(w * 0.72, h * 0.56);
    ctx.lineTo(w * 0.5, h * 0.84);
    ctx.lineTo(w * 0.28, h * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.56, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Occult arcane rings & eldritch runes
    for (const cy of [h * 0.3, h * 0.55, h * 0.76]) {
      ctx.beginPath();
      ctx.arc(w * 0.5, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.14);
    ctx.lineTo(w * 0.5, h * 0.9);
    ctx.moveTo(w * 0.24, h * 0.55);
    ctx.lineTo(w * 0.76, h * 0.55);
    ctx.stroke();

    ctx.fillStyle = isPurple ? '#220B38' : '#2A0E12';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(18, 22 + i * 20, 14, 3);
      ctx.fillRect(w - 32, 22 + i * 20, 14, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  darkholdPageTexCache.set(key, tex);
  return tex;
}

interface BookEmber {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  offset: THREE.Vector3;
  vel: THREE.Vector3;
}

/**
 * Articulated 3D floating Darkhold Grimoire summoned beside Scarlet Witch.
 * Opens smoothly on summon, hovers with subtle mystic bob & ember particles,
 * and folds shut cleanly on dismissal or cooldown.
 */
export class DarkholdBookVfx {
  public readonly group = new THREE.Group();
  private readonly bookRig = new THREE.Group();
  private readonly leftPivot = new THREE.Group();
  private readonly rightPivot = new THREE.Group();
  private readonly pageGlowSprite: THREE.Sprite;
  private readonly embers: BookEmber[] = [];

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private openAmount = 0; // 0 = closed, 1 = open
  private active = false;
  private closing = false;
  private time = 0;

  private readonly _fwd = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _targetPos = new THREE.Vector3();

  constructor(variant: 'crimson' | 'purple' = 'crimson') {
    this.group.visible = false;
    const isPurple = variant === 'purple';

    const coverMat = new THREE.MeshStandardMaterial({
      color: isPurple ? 0x26123a : 0x3b1b22,
      roughness: 0.78,
      metalness: 0.18,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: isPurple ? 0x70568a : 0x7b5638,
      roughness: 0.36,
      metalness: 0.74,
    });
    const crimsonAccentMat = new THREE.MeshStandardMaterial({
      color: isPurple ? 0x9b2eff : 0xa1122e,
      emissive: isPurple ? 0x560b96 : 0x620618,
      emissiveIntensity: 0.85,
      roughness: 0.42,
      metalness: 0.35,
    });

    const leftPageTex = createDarkholdPageTexture(false, variant);
    const rightPageTex = createDarkholdPageTexture(true, variant);
    const emberTex = isPurple
      ? createSoftChaosTexture(
          'rgba(244, 214, 255, 1.0)',
          'rgba(168, 56, 255, 0.85)',
          'rgba(82, 12, 152, 0.16)',
        )
      : createSoftChaosTexture(
          'rgba(255, 224, 190, 1.0)',
          'rgba(255, 52, 68, 0.85)',
          'rgba(165, 10, 26, 0.15)',
        );

    const leftPageMat = new THREE.MeshBasicMaterial({ map: leftPageTex });
    const rightPageMat = new THREE.MeshBasicMaterial({ map: rightPageTex });
    const pageEdgeMat = new THREE.MeshStandardMaterial({
      color: isPurple ? 0x86709e : 0x9c795b,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.materials.push(
      coverMat,
      trimMat,
      crimsonAccentMat,
      leftPageMat,
      rightPageMat,
      pageEdgeMat,
    );

    // Central spine
    const spineGeo = new THREE.BoxGeometry(0.055, 0.46, 0.06);
    const spineMesh = new THREE.Mesh(spineGeo, trimMat);
    this.geometries.push(spineGeo);
    this.bookRig.add(spineMesh);

    // Shared cover/page geometries
    const coverGeo = new THREE.BoxGeometry(0.28, 0.45, 0.024);
    const frameTopGeo = new THREE.BoxGeometry(0.29, 0.04, 0.032);
    const crestGeo = new THREE.OctahedronGeometry(0.055, 0);
    const pageBlockGeo = new THREE.BoxGeometry(0.245, 0.4, 0.022);
    const pageFaceGeo = new THREE.PlaneGeometry(0.242, 0.395);
    this.geometries.push(coverGeo, frameTopGeo, crestGeo, pageBlockGeo, pageFaceGeo);

    // Left Wing Hinge
    this.leftPivot.position.set(-0.022, 0, 0);
    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.set(-0.14, 0, -0.014);
    const leftTopTrim = new THREE.Mesh(frameTopGeo, trimMat);
    leftTopTrim.position.set(-0.14, 0.21, -0.014);
    const leftBotTrim = new THREE.Mesh(frameTopGeo, trimMat);
    leftBotTrim.position.set(-0.14, -0.21, -0.014);
    const leftCrest = new THREE.Mesh(crestGeo, crimsonAccentMat);
    leftCrest.position.set(-0.14, 0, -0.03);
    leftCrest.scale.set(1, 1.35, 0.45);
    const leftPages = new THREE.Mesh(pageBlockGeo, pageEdgeMat);
    leftPages.position.set(-0.128, 0, 0.012);
    const leftPageFace = new THREE.Mesh(pageFaceGeo, leftPageMat);
    leftPageFace.position.set(-0.128, 0, 0.025);
    this.leftPivot.add(
      leftCover,
      leftTopTrim,
      leftBotTrim,
      leftCrest,
      leftPages,
      leftPageFace,
    );

    // Right Wing Hinge
    this.rightPivot.position.set(0.022, 0, 0);
    const rightCover = new THREE.Mesh(coverGeo, coverMat);
    rightCover.position.set(0.14, 0, -0.014);
    const rightTopTrim = new THREE.Mesh(frameTopGeo, trimMat);
    rightTopTrim.position.set(0.14, 0.21, -0.014);
    const rightBotTrim = new THREE.Mesh(frameTopGeo, trimMat);
    rightBotTrim.position.set(0.14, -0.21, -0.014);
    const rightCrest = new THREE.Mesh(crestGeo, crimsonAccentMat);
    rightCrest.position.set(0.14, 0, -0.03);
    rightCrest.scale.set(1, 1.35, 0.45);
    const rightPages = new THREE.Mesh(pageBlockGeo, pageEdgeMat);
    rightPages.position.set(0.128, 0, 0.012);
    const rightPageFace = new THREE.Mesh(pageFaceGeo, rightPageMat);
    rightPageFace.position.set(0.128, 0, 0.025);
    this.rightPivot.add(
      rightCover,
      rightTopTrim,
      rightBotTrim,
      rightCrest,
      rightPages,
      rightPageFace,
    );

    // Additive Crimson Rune Halo hovering between open pages
    const glowMat = new THREE.SpriteMaterial({
      map: emberTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.72,
    });
    this.materials.push(glowMat);
    this.pageGlowSprite = new THREE.Sprite(glowMat);
    this.pageGlowSprite.position.set(0, 0.02, 0.14);
    this.pageGlowSprite.scale.setScalar(0.55);

    this.bookRig.add(this.leftPivot, this.rightPivot, this.pageGlowSprite);
    this.group.add(this.bookRig);

    // Orbiting dark-crimson ember pool
    for (let i = 0; i < 12; i++) {
      const eMat = new THREE.SpriteMaterial({
        map: emberTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      this.materials.push(eMat);
      const sp = new THREE.Sprite(eMat);
      sp.scale.setScalar(0.12);
      this.bookRig.add(sp);
      const angle = (i / 12) * Math.PI * 2;
      this.embers.push({
        sprite: sp,
        age: Math.random() * 0.9,
        life: 0.75 + Math.random() * 0.45,
        offset: new THREE.Vector3(Math.cos(angle) * 0.25, -0.15, Math.sin(angle) * 0.14),
        vel: new THREE.Vector3(Math.cos(angle) * 0.12, 0.42 + Math.random() * 0.25, 0.06),
      });
    }
  }

  public setOpen(isOpen: boolean, immediate = false): void {
    if (isOpen) {
      this.active = true;
      this.closing = false;
      this.group.visible = true;
      if (immediate) this.openAmount = 1;
    } else if (this.active) {
      this.active = false;
      this.closing = true;
      if (immediate) {
        this.openAmount = 0;
        this.closing = false;
        this.group.visible = false;
      }
    } else if (immediate) {
      this.openAmount = 0;
      this.closing = false;
      this.group.visible = false;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    facingYaw: number,
    hiddenByTeleport: boolean,
  ): void {
    if (!this.active && !this.closing) {
      this.group.visible = false;
      return;
    }

    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;

    if (this.active) {
      this.openAmount = Math.min(1, this.openAmount + safeDt / 0.3);
    } else if (this.closing) {
      this.openAmount = Math.max(0, this.openAmount - safeDt / 0.24);
      if (this.openAmount <= 0.001) {
        this.closing = false;
        this.group.visible = false;
        return;
      }
    }

    this.group.visible = !hiddenByTeleport;
    if (!this.group.visible) return;

    const ease = 1 - Math.pow(1 - this.openAmount, 3);
    const sinY = Math.sin(facingYaw);
    const cosY = Math.cos(facingYaw);
    this._fwd.set(-sinY, 0, -cosY);
    this._right.set(cosY, 0, -sinY);

    const bob = Math.sin(this.time * 3.1) * 0.065;
    this._targetPos
      .copy(playerPos)
      .addScaledVector(this._fwd, 0.68)
      .addScaledVector(this._right, 0.56);
    this._targetPos.y += 1.32 + bob;

    if (this.group.position.lengthSq() < 0.001) {
      this.group.position.copy(this._targetPos);
    } else {
      this.group.position.lerp(this._targetPos, 1 - Math.exp(-16 * safeDt));
    }

    // Angle book so open rune pages (+Z face) face directly toward Scarlet Witch, cover facing away
    this.group.rotation.set(
      0.26 + Math.sin(this.time * 2.2) * 0.04,
      facingYaw - 0.24,
      Math.sin(this.time * 1.7) * 0.05,
    );

    const bookScale = 0.2 + ease * 0.92;
    this.bookRig.scale.setScalar(bookScale);

    // Hinge open leaves cupping gently toward Scarlet Witch
    const breathe = Math.sin(this.time * 3.4) * 0.04 * ease;
    const leafAngle = 0.06 + ease * 0.38 + breathe;
    this.leftPivot.rotation.y = leafAngle;
    this.rightPivot.rotation.y = -leafAngle;

    const glowMat = this.pageGlowSprite.material as THREE.SpriteMaterial;
    glowMat.opacity = ease * (0.58 + Math.sin(this.time * 6.0) * 0.16);
    this.pageGlowSprite.scale.setScalar(0.45 + ease * 0.28);

    // Update book embers
    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      e.age += safeDt;
      if (e.age >= e.life) {
        e.age = 0;
        const angle = Math.random() * Math.PI * 2;
        e.offset.set(
          Math.cos(angle) * 0.24,
          -0.16 + Math.random() * 0.18,
          Math.sin(angle) * 0.12 + 0.06,
        );
      }
      const t = e.age / e.life;
      e.sprite.position
        .copy(e.offset)
        .addScaledVector(e.vel, e.age);
      const eMat = e.sprite.material as THREE.SpriteMaterial;
      eMat.opacity = ease * Math.sin(t * Math.PI) * 0.85;
      e.sprite.scale.setScalar(0.11 * (1 - t * 0.45));
    }
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}

/**
 * Subtle, almost-invisible dark-red translucent sphere for Darkhold's Automatic Shield.
 */
export class ScarletShieldVfx {
  public readonly group = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly domeGeo: THREE.BufferGeometry;
  private readonly domeMat: THREE.MeshBasicMaterial;
  private deflectFlash = 0;

  constructor(variant: 'crimson' | 'purple' = 'crimson') {
    this.group.visible = false;

    this.domeGeo = new THREE.SphereGeometry(1.32, 24, 18);
    this.domeMat = new THREE.MeshBasicMaterial({
      color: variant === 'purple' ? 0x7c1ae0 : 0x8c0c22,
      transparent: true,
      opacity: 0.11,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    this.dome = new THREE.Mesh(this.domeGeo, this.domeMat);
    this.group.add(this.dome);
  }

  public triggerDeflectFlash(): void {
    this.deflectFlash = 1.0;
  }

  public update(
    dt: number,
    active: boolean,
    playerPos: THREE.Vector3,
    remainingRatio: number,
  ): void {
    this.group.visible = active;
    if (!active) {
      this.deflectFlash = 0;
      return;
    }

    const safeDt = Math.min(dt, 0.05);
    this.deflectFlash = Math.max(0, this.deflectFlash - safeDt * 4.5);

    this.group.position.set(playerPos.x, playerPos.y + 0.98, playerPos.z);
    this.group.scale.setScalar(1 + this.deflectFlash * 0.04);

    const fadeOut = remainingRatio < 0.15 ? remainingRatio / 0.15 : 1;
    this.domeMat.opacity = (0.11 + this.deflectFlash * 0.07) * fadeOut;
  }

  public dispose(): void {
    this.domeGeo.dispose();
    this.domeMat.dispose();
  }
}

/**
 * Supreme Sorceress continuous Energy Drain Beam & Wanda Zombie Beam:
 * Narrow near raised right hand, progressively wider toward target; hand sphere contracts
 * as the beam expands toward its endpoint.
 */
export class ChaosDrainBeamVfx {
  public readonly group = new THREE.Group();
  private readonly outerCone: THREE.Mesh;
  private readonly innerCone: THREE.Mesh;
  private readonly handOrb: THREE.Sprite;
  private readonly targetFlare: THREE.Sprite;
  private readonly wisps: THREE.Sprite[] = [];
  private readonly tex: THREE.CanvasTexture;
  private readonly coneGeo: THREE.CylinderGeometry;

  private active = false;
  private time = 0;
  private pulsePhase = 0;

  private readonly _dir = new THREE.Vector3();
  private readonly _mid = new THREE.Vector3();
  private readonly _wispOff = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _quat = new THREE.Quaternion();

  constructor(darkCrimson = false) {
    this.group.visible = false;
    this.tex = createSoftChaosTexture(
      'rgba(255, 224, 226, 1)',
      darkCrimson ? 'rgba(180, 10, 20, 0.9)' : 'rgba(210, 16, 36, 0.88)',
      'rgba(70, 2, 10, 0.15)',
    );
    // Top = target (+Y after rotation = endpoint, wide), Bottom = hand (narrow)
    this.coneGeo = new THREE.CylinderGeometry(0.42, 0.045, 1, 16, 1, true);

    this.outerCone = new THREE.Mesh(
      this.coneGeo,
      new THREE.MeshBasicMaterial({
        color: darkCrimson ? 0x8e0814 : 0xaa0c22,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.innerCone = new THREE.Mesh(
      this.coneGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff4658,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );

    this.handOrb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.tex,
        color: 0xff3b4e,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.95,
      }),
    );
    this.targetFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.tex,
        color: 0xc80e24,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.92,
      }),
    );

    for (let i = 0; i < 6; i++) {
      const w = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.tex,
          color: i % 2 === 0 ? 0xff4a5c : 0x9c0a1c,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.82,
        }),
      );
      this.group.add(w);
      this.wisps.push(w);
    }

    this.group.add(this.outerCone, this.innerCone, this.handOrb, this.targetFlare);
  }

  public setActive(active: boolean): void {
    if (active && !this.active) {
      this.pulsePhase = 0;
    }
    this.active = active;
    this.group.visible = active;
  }

  public update(dt: number, handPos: THREE.Vector3, targetPos: THREE.Vector3): void {
    if (!this.active) return;
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;
    this.pulsePhase = (this.pulsePhase + safeDt * 1.8) % 1;

    this._dir.copy(targetPos).sub(handPos);
    const len = Math.max(0.25, this._dir.length());
    this._mid.copy(handPos).lerp(targetPos, 0.5);
    this._dir.divideScalar(len);
    this._quat.setFromUnitVectors(this._up, this._dir);

    // Hand sphere contracts smoothly as beam pulse expands toward endpoint
    const expandWave = 0.72 + Math.sin(this.pulsePhase * Math.PI) * 0.42;
    const handContract = THREE.MathUtils.lerp(0.68, 0.28, this.pulsePhase);

    this.outerCone.position.copy(this._mid);
    this.outerCone.quaternion.copy(this._quat);
    this.outerCone.scale.set(expandWave, len, expandWave);

    this.innerCone.position.copy(this._mid);
    this.innerCone.quaternion.copy(this._quat);
    this.innerCone.scale.set(0.42 * expandWave, len, 0.42 * expandWave);

    this.handOrb.position.copy(handPos);
    this.handOrb.scale.setScalar(handContract);

    this.targetFlare.position.copy(targetPos);
    this.targetFlare.scale.setScalar(1.05 * expandWave);

    for (let i = 0; i < this.wisps.length; i++) {
      const u = (this.time * 1.9 + i / this.wisps.length) % 1;
      const r = THREE.MathUtils.lerp(0.05, 0.36, u);
      const a = this.time * 9 + i * 1.25;
      this._wispOff.set(Math.cos(a) * r, Math.sin(a * 0.7) * r, Math.sin(a) * r);
      this.wisps[i].position.lerpVectors(handPos, targetPos, u).add(this._wispOff);
      this.wisps[i].scale.setScalar(0.22 + u * 0.36);
    }
  }

  public dispose(): void {
    this.coneGeo.dispose();
    (this.outerCone.material as THREE.Material).dispose();
    (this.innerCone.material as THREE.Material).dispose();
    (this.handOrb.material as THREE.Material).dispose();
    (this.targetFlare.material as THREE.Material).dispose();
    for (const w of this.wisps) (w.material as THREE.Material).dispose();
  }
}

interface StoneRockPiece {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  orbitAngle: number;
  orbitElev: number;
  orbitRadius: number;
  blastDir: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  baseScale: number;
}

/**
 * Wanda Zombie Stone Chaos Explosion:
 * Gathers surrounding 3D rocks inward to encase her body while charging dark-red Chaos energy,
 * then blasts every stone outward across a huge AoE radius.
 */
export class StoneChaosExplosionVfx {
  public readonly group = new THREE.Group();
  private readonly rockGeo = new THREE.DodecahedronGeometry(0.41, 0);
  private readonly sphereGeo = new THREE.SphereGeometry(1, 24, 18);
  private readonly ringGeo = new THREE.RingGeometry(0.84, 1.0, 32);
  private readonly _tmpOrbitPos = new THREE.Vector3();

  private activeState: {
    phase: 'gather' | 'blast';
    elapsed: number;
    gatherDuration: number;
    blastDuration: number;
    origin: THREE.Vector3;
    rocks: StoneRockPiece[];
    chargeSphere: THREE.Mesh;
    blastSphere: THREE.Mesh;
    blastRing: THREE.Mesh;
  } | null = null;

  public isActive(): boolean {
    return this.activeState !== null;
  }

  public start(center: THREE.Vector3, gatherDuration = 1.35): void {
    this.clear();

    const rocks: StoneRockPiece[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 4.6 + Math.random() * 4.8;
      const rockMat = new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0x4b484c : i % 3 === 1 ? 0x615d62 : 0x3b272a,
        emissive: 0x48050b,
        emissiveIntensity: 0.25,
        roughness: 0.92,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(this.rockGeo, rockMat);
      const baseScale = 1.12 + Math.random() * 1.02;
      mesh.scale.set(
        baseScale * (0.85 + Math.random() * 0.35),
        baseScale * (0.75 + Math.random() * 0.4),
        baseScale * (0.85 + Math.random() * 0.35),
      );
      const startPos = new THREE.Vector3(
        center.x + Math.cos(a) * dist,
        0.16,
        center.z + Math.sin(a) * dist,
      );
      mesh.position.copy(startPos);
      this.group.add(mesh);

      rocks.push({
        mesh,
        startPos,
        orbitAngle: a,
        orbitElev: (Math.random() - 0.5) * 0.85,
        orbitRadius: 0.42 + (i % 4) * 0.14,
        blastDir: new THREE.Vector3(
          Math.cos(a),
          0.18 + Math.random() * 0.52,
          Math.sin(a),
        ).normalize(),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 7,
        ),
        baseScale,
      });
    }

    const chargeSphere = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0xa80b1c,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    chargeSphere.scale.setScalar(0.35);

    const blastSphere = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0xcc1024,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    blastSphere.visible = false;

    const blastRing = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff3b4e,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    blastRing.rotation.x = Math.PI * 0.5;
    blastRing.visible = false;

    this.group.add(chargeSphere, blastSphere, blastRing);
    this.activeState = {
      phase: 'gather',
      elapsed: 0,
      gatherDuration,
      blastDuration: 0.72,
      origin: center.clone(),
      rocks,
      chargeSphere,
      blastSphere,
      blastRing,
    };
  }

  public triggerBlast(center: THREE.Vector3): void {
    if (!this.activeState) return;
    const st = this.activeState;
    st.phase = 'blast';
    st.elapsed = 0;
    st.origin.copy(center);
    st.chargeSphere.visible = false;
    st.blastSphere.visible = true;
    st.blastSphere.position.set(center.x, center.y + 1.0, center.z);
    st.blastRing.visible = true;
    st.blastRing.position.set(center.x, center.y + 0.9, center.z);
  }

  public update(dt: number, anchorPos: THREE.Vector3): void {
    const st = this.activeState;
    if (!st) return;
    const safeDt = Math.min(dt, 0.05);
    st.elapsed += safeDt;

    if (st.phase === 'gather') {
      const p = THREE.MathUtils.clamp(st.elapsed / st.gatherDuration, 0, 1);
      const pull = smoothStep01(p);
      const targetCenterY = anchorPos.y + 1.05;

      st.chargeSphere.position.set(anchorPos.x, targetCenterY, anchorPos.z);
      st.chargeSphere.scale.setScalar(0.35 + pull * 1.15);
      (st.chargeSphere.material as THREE.MeshBasicMaterial).opacity = 0.2 + pull * 0.45;

      for (let i = 0; i < st.rocks.length; i++) {
        const r = st.rocks[i];
        const spinA = r.orbitAngle + st.elapsed * (2.6 + pull * 5.2);
        this._tmpOrbitPos.set(
          anchorPos.x + Math.cos(spinA) * r.orbitRadius * (1.55 - pull * 0.72),
          targetCenterY + r.orbitElev * (1.3 - pull * 0.55),
          anchorPos.z + Math.sin(spinA) * r.orbitRadius * (1.55 - pull * 0.72),
        );
        r.mesh.position.lerpVectors(r.startPos, this._tmpOrbitPos, pull);
        r.mesh.rotation.x += r.rotSpeed.x * safeDt;
        r.mesh.rotation.y += r.rotSpeed.y * safeDt;
        const mat = r.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.25 + pull * 1.15;
      }
    } else {
      const p = THREE.MathUtils.clamp(st.elapsed / st.blastDuration, 0, 1);
      const easeOut = 1 - Math.pow(1 - p, 3);
      const fade = p < 0.55 ? 1 : (1 - p) / 0.45;

      st.blastSphere.scale.setScalar(THREE.MathUtils.lerp(0.6, 7.2, easeOut));
      (st.blastSphere.material as THREE.MeshBasicMaterial).opacity = 0.54 * fade;
      st.blastRing.scale.setScalar(THREE.MathUtils.lerp(0.6, 7.5, easeOut));
      (st.blastRing.material as THREE.MeshBasicMaterial).opacity = 0.88 * fade;

      for (let i = 0; i < st.rocks.length; i++) {
        const r = st.rocks[i];
        r.mesh.position.addScaledVector(r.blastDir, 15.5 * safeDt);
        r.blastDir.y -= 0.42 * safeDt;
        r.mesh.rotation.x += r.rotSpeed.x * safeDt * 1.8;
        r.mesh.rotation.z += r.rotSpeed.z * safeDt * 1.8;
        r.mesh.scale.setScalar(Math.max(0.05, r.baseScale * (1 - p * 0.65)));
      }

      if (st.elapsed >= st.blastDuration) {
        this.clear();
      }
    }
  }

  public clear(): void {
    const st = this.activeState;
    if (!st) return;
    for (const r of st.rocks) {
      this.group.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
    this.group.remove(st.chargeSphere, st.blastSphere, st.blastRing);
    (st.chargeSphere.material as THREE.Material).dispose();
    (st.blastSphere.material as THREE.Material).dispose();
    (st.blastRing.material as THREE.Material).dispose();
    this.activeState = null;
  }

  public dispose(): void {
    this.clear();
    this.rockGeo.dispose();
    this.sphereGeo.dispose();
    this.ringGeo.dispose();
  }
}

function smoothStep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}
