import * as THREE from 'three';
import { CombatTargetProbe } from './scarletWitchAbilities';

export const AGATHA_EXPLOSION_RADIUS = 6.0;
export const AGATHA_BOLT_SPLASH_RADIUS = 2.6;

const purpleMistTexCache = new Map<string, THREE.CanvasTexture>();
let cachedWitchRingTex: THREE.CanvasTexture | null = null;

function createPurpleMistTexture(
  inner = 'rgba(225, 165, 255, 0.92)',
  mid = 'rgba(138, 36, 214, 0.72)',
  outer = 'rgba(42, 6, 68, 0.18)',
): THREE.CanvasTexture {
  const key = `${inner}|${mid}|${outer}`;
  const cached = purpleMistTexCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, inner);
  grad.addColorStop(0.36, mid);
  grad.addColorStop(0.75, outer);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  purpleMistTexCache.set(key, tex);
  return tex;
}

function createWitchRingTexture(): THREE.CanvasTexture {
  if (cachedWitchRingTex) return cachedWitchRingTex;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(half, half, half * 0.4, half, half, half * 0.95);
  grad.addColorStop(0.0, 'rgba(168, 45, 255, 0)');
  grad.addColorStop(0.45, 'rgba(155, 36, 240, 0.72)');
  grad.addColorStop(0.68, 'rgba(235, 190, 255, 0.96)');
  grad.addColorStop(0.85, 'rgba(98, 12, 160, 0.55)');
  grad.addColorStop(1.0, 'rgba(40, 0, 75, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(240, 200, 255, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedWitchRingTex = tex;
  return tex;
}

/**
 * Dark-purple witch hand aura for Agatha Harkness (used in preview & active gameplay).
 */
export class HandAgathaAura {
  public readonly group = new THREE.Group();
  private readonly orb: THREE.Sprite;
  private readonly ring: THREE.Sprite;
  private readonly smoke: THREE.Sprite;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;
  private readonly smokeTex: THREE.CanvasTexture;
  private readonly orbMat: THREE.SpriteMaterial;
  private readonly ringMat: THREE.SpriteMaterial;
  private readonly smokeMat: THREE.SpriteMaterial;
  private time = 0;

  constructor(baseScale = 0.28) {
    this.orbTex = createPurpleMistTexture(
      'rgba(246, 224, 255, 0.96)',
      'rgba(176, 56, 255, 0.85)',
      'rgba(78, 12, 130, 0.28)',
    );
    this.ringTex = createWitchRingTexture();
    this.smokeTex = createPurpleMistTexture(
      'rgba(105, 20, 168, 0.72)',
      'rgba(52, 8, 86, 0.45)',
      'rgba(18, 2, 32, 0.08)',
    );

    this.orbMat = new THREE.SpriteMaterial({
      map: this.orbTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.86,
    });
    this.ringMat = new THREE.SpriteMaterial({
      map: this.ringTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.88,
    });
    this.smokeMat = new THREE.SpriteMaterial({
      map: this.smokeTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    });

    this.orb = new THREE.Sprite(this.orbMat);
    this.orb.scale.setScalar(baseScale * 0.88);
    this.ring = new THREE.Sprite(this.ringMat);
    this.ring.scale.setScalar(baseScale * 1.48);
    this.smoke = new THREE.Sprite(this.smokeMat);
    this.smoke.scale.setScalar(baseScale * 1.75);

    this.group.add(this.smoke, this.orb, this.ring);
  }

  public update(dt: number, intensity: number, baseScale = 0.28): void {
    this.time += dt;
    const clamped = THREE.MathUtils.clamp(intensity, 0, 1.5);
    this.group.visible = clamped > 0.02;
    if (!this.group.visible) return;

    const pulse = 1 + Math.sin(this.time * 5.4) * 0.1;
    this.orb.scale.setScalar(baseScale * 0.86 * pulse * clamped);
    this.ring.scale.setScalar(
      baseScale * 1.46 * (1 + Math.cos(this.time * 4.2) * 0.09) * clamped,
    );
    this.smoke.scale.setScalar(baseScale * 1.8 * (1 + Math.sin(this.time * 3.1) * 0.12) * clamped);
    this.ringMat.rotation = this.time * 1.9;
    this.smokeMat.rotation = -this.time * 1.2;
    this.orbMat.opacity = Math.min(1, 0.76 * clamped);
    this.ringMat.opacity = Math.min(1, 0.82 * clamped);
    this.smokeMat.opacity = Math.min(0.75, 0.5 * clamped);
  }

  public dispose(): void {
    this.orbMat.dispose();
    this.ringMat.dispose();
    this.smokeMat.dispose();
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

interface PurpleBoltInstance {
  group: THREE.Group;
  core: THREE.Mesh;
  halo: THREE.Sprite;
  smokeAura: THREE.Sprite;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  trailAccum: number;
}

interface AgathaSmokeExplosion {
  group: THREE.Group;
  outerSphere: THREE.Mesh;
  innerVoid: THREE.Mesh;
  ring: THREE.Mesh;
  halo: THREE.Sprite;
  smokeSprites: THREE.Sprite[];
  smokeDirs: THREE.Vector3[];
  age: number;
  life: number;
  maxRadius: number;
}

interface ActiveDrainBeam {
  id: string;
  targetId: string;
  outerBeam: THREE.Mesh;
  innerBeam: THREE.Mesh;
  handOrb: THREE.Sprite;
  targetOrb: THREE.Sprite;
  wisps: THREE.Sprite[];
  elapsed: number;
  duration: number;
}

interface ActiveAbsorbTendril {
  id: string;
  targetId: string;
  strandsOuter: THREE.Mesh[];
  strandsInner: THREE.Mesh[];
  chestOrb: THREE.Sprite;
  leftHandOrb: THREE.Sprite;
  rightHandOrb: THREE.Sprite;
  sourceOrb: THREE.Sprite;
  wisps: THREE.Sprite[];
  elapsed: number;
  duration: number;
}

export class AgathaVfxSystem {
  public readonly group = new THREE.Group();

  private readonly smokeTex: THREE.CanvasTexture;
  private readonly orbTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;

  private readonly flightMistPool: MistParticle[] = [];
  private readonly smokePool: MistParticle[] = [];
  private readonly bolts: PurpleBoltInstance[] = [];
  private readonly explosions: AgathaSmokeExplosion[] = [];
  private readonly beams = new Map<string, ActiveDrainBeam>();
  private readonly absorbTendrils = new Map<string, ActiveAbsorbTendril>();

  // Absorption Shield torso mist ring
  private readonly shieldGroup = new THREE.Group();
  private readonly shieldSprites: THREE.Sprite[] = [];
  private readonly shieldRings: THREE.Mesh[] = [];

  // Chaos Explosion charging orb around Agatha
  private readonly chargeGroup = new THREE.Group();
  private readonly chargeSphere: THREE.Mesh;
  private readonly chargeRing: THREE.Mesh;

  private readonly unitSphereGeo = new THREE.SphereGeometry(1, 22, 16);
  private readonly boltGeo = new THREE.SphereGeometry(0.16, 12, 10);
  private readonly ringGeo = new THREE.RingGeometry(0.82, 1.0, 32);
  private readonly beamCylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);

  private flightEmitAccum = 0;
  private shieldEmitAccum = 0;
  private animTime = 0;

  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpStart = new THREE.Vector3();
  private readonly _tmpEnd = new THREE.Vector3();
  private readonly _tmpMid = new THREE.Vector3();
  private readonly _tmpWispOff = new THREE.Vector3();
  private readonly _tmpSpawnPos = new THREE.Vector3();
  private readonly _tmpSpawnVel = new THREE.Vector3();
  private readonly _upAxis = new THREE.Vector3(0, 1, 0);
  private readonly _quat = new THREE.Quaternion();

  constructor() {
    this.smokeTex = createPurpleMistTexture(
      'rgba(104, 24, 165, 0.88)',
      'rgba(58, 10, 96, 0.65)',
      'rgba(22, 3, 42, 0.16)',
    );
    this.orbTex = createPurpleMistTexture(
      'rgba(248, 225, 255, 1.0)',
      'rgba(182, 62, 255, 0.9)',
      'rgba(82, 12, 148, 0.25)',
    );
    this.ringTex = createWitchRingTexture();

    for (let i = 0; i < 32; i++) {
      const mat = new THREE.SpriteMaterial({
        map: i % 3 === 0 ? this.orbTex : this.smokeTex,
        transparent: true,
        depthWrite: false,
        blending: i % 3 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.flightMistPool.push({
        sprite,
        active: false,
        age: 0,
        life: 0.78,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.45,
        endScale: 0.95,
        maxOpacity: 0.62,
      });
    }

    for (let i = 0; i < 48; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.smokePool.push({
        sprite,
        active: false,
        age: 0,
        life: 0.7,
        offset: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        startScale: 0.45,
        endScale: 1.25,
        maxOpacity: 0.75,
      });
    }

    // Absorption Shield swirling torso mist
    this.shieldGroup.visible = false;
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: i % 3 === 0 ? this.orbTex : this.smokeTex,
          transparent: true,
          depthWrite: false,
          blending: i % 3 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: 0.72,
        }),
      );
      sp.scale.setScalar(i % 3 === 0 ? 0.56 : 0.74);
      this.shieldGroup.add(sp);
      this.shieldSprites.push(sp);
    }
    for (let r = 0; r < 2; r++) {
      const ring = new THREE.Mesh(
        this.ringGeo,
        new THREE.MeshBasicMaterial({
          color: r === 0 ? 0xb85cff : 0x6c18b8,
          transparent: true,
          opacity: 0.68,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI * 0.5 + (r === 0 ? 0.22 : -0.22);
      ring.scale.setScalar(0.84 + r * 0.14);
      this.shieldGroup.add(ring);
      this.shieldRings.push(ring);
    }
    this.group.add(this.shieldGroup);

    // Charging Chaos Explosion aura around Agatha
    this.chargeGroup.visible = false;
    this.chargeSphere = new THREE.Mesh(
      this.unitSphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0x9b2eff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeRing = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd88cff,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeRing.rotation.x = Math.PI * 0.5;
    this.chargeGroup.add(this.chargeSphere, this.chargeRing);
    this.group.add(this.chargeGroup);
  }

  private spawnSmokeParticle(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    startScale: number,
    endScale: number,
    life: number,
    maxOpacity: number,
  ): void {
    let p: MistParticle | null = null;
    for (let i = 0; i < this.smokePool.length; i++) {
      if (!this.smokePool[i].active) {
        p = this.smokePool[i];
        break;
      }
    }
    if (!p) return;
    p.active = true;
    p.age = 0;
    p.life = life;
    p.sprite.position.copy(pos);
    p.vel.copy(vel);
    p.startScale = startScale;
    p.endScale = endScale;
    p.maxOpacity = maxOpacity;
    p.sprite.scale.setScalar(startScale);
    p.sprite.visible = true;
  }

  public spawnPurpleBolt(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    const grp = new THREE.Group();
    grp.position.copy(origin);

    const core = new THREE.Mesh(
      this.boltGeo,
      new THREE.MeshBasicMaterial({ color: 0x3b075c }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.94,
      }),
    );
    halo.scale.setScalar(0.84);

    const smokeAura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.smokeTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      }),
    );
    smokeAura.scale.setScalar(1.05);

    grp.add(smokeAura, core, halo);
    this.group.add(grp);

    this.bolts.push({
      group: grp,
      core,
      halo,
      smokeAura,
      pos: origin.clone(),
      prevPos: origin.clone(),
      vel: dir.clone().multiplyScalar(27),
      age: 0,
      maxAge: 1.5,
      trailAccum: 0,
    });
  }

  public spawnSmokeExplosion(
    center: THREE.Vector3,
    maxRadius: number,
    life = 0.65,
    smokeCount = 16,
  ): void {
    const grp = new THREE.Group();
    grp.position.set(center.x, Math.max(center.y, 0.68), center.z);

    const outerSphere = new THREE.Mesh(
      this.unitSphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0x8e24e8,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    outerSphere.scale.setScalar(0.45);

    const innerVoid = new THREE.Mesh(
      this.unitSphereGeo,
      new THREE.MeshBasicMaterial({
        color: 0x200436,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    innerVoid.scale.setScalar(0.8);

    const ring = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd07aff,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.scale.setScalar(0.5);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      }),
    );
    halo.scale.setScalar(maxRadius * 0.85);

    const smokeSprites: THREE.Sprite[] = [];
    const smokeDirs: THREE.Vector3[] = [];
    for (let i = 0; i < smokeCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / smokeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) * 0.65 + 0.1,
        Math.sin(phi) * Math.sin(theta),
      ).normalize();

      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: i % 4 === 0 ? this.orbTex : this.smokeTex,
          transparent: true,
          depthWrite: false,
          blending: i % 4 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: 0.88,
        }),
      );
      sp.scale.setScalar(maxRadius * 0.34);
      grp.add(sp);
      smokeSprites.push(sp);
      smokeDirs.push(dir);
    }

    grp.add(outerSphere, innerVoid, ring, halo);
    this.group.add(grp);

    this.explosions.push({
      group: grp,
      outerSphere,
      innerVoid,
      ring,
      halo,
      smokeSprites,
      smokeDirs,
      age: 0,
      life,
      maxRadius,
    });
  }

  public startDrainBeam(id: string, targetId: string, duration: number): void {
    this.stopDrainBeam(id);

    const outerBeam = new THREE.Mesh(
      this.beamCylGeo,
      new THREE.MeshBasicMaterial({
        color: 0x7c1ae0,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const innerBeam = new THREE.Mesh(
      this.beamCylGeo,
      new THREE.MeshBasicMaterial({
        color: 0xefc2ff,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );

    const handOrb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.92,
      }),
    );
    handOrb.scale.setScalar(0.75);

    const targetOrb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.orbTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.86,
      }),
    );
    targetOrb.scale.setScalar(0.95);

    const wisps: THREE.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: i % 2 === 0 ? this.orbTex : this.smokeTex,
          transparent: true,
          depthWrite: false,
          blending: i % 2 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: 0.82,
        }),
      );
      sp.scale.setScalar(0.48);
      this.group.add(sp);
      wisps.push(sp);
    }

    this.group.add(outerBeam, innerBeam, handOrb, targetOrb);
    this.beams.set(id, {
      id,
      targetId,
      outerBeam,
      innerBeam,
      handOrb,
      targetOrb,
      wisps,
      elapsed: 0,
      duration,
    });
  }

  public stopDrainBeam(id: string): void {
    const beam = this.beams.get(id);
    if (!beam) return;
    this.group.remove(beam.outerBeam, beam.innerBeam, beam.handOrb, beam.targetOrb);
    (beam.outerBeam.material as THREE.Material).dispose();
    (beam.innerBeam.material as THREE.Material).dispose();
    (beam.handOrb.material as THREE.Material).dispose();
    (beam.targetOrb.material as THREE.Material).dispose();
    for (const w of beam.wisps) {
      this.group.remove(w);
      (w.material as THREE.Material).dispose();
    }
    this.beams.delete(id);
  }

  public updateDrainBeamTransform(
    id: string,
    dt: number,
    playerHandsPos: THREE.Vector3,
    targetPos: THREE.Vector3,
  ): void {
    const beam = this.beams.get(id);
    if (!beam) return;
    beam.elapsed += dt;
    const progress = THREE.MathUtils.clamp(beam.elapsed / Math.max(beam.duration, 0.1), 0, 1);
    const pulse = 1 + Math.sin(this.animTime * 16 + beam.elapsed * 3) * 0.16;
    const ramp = THREE.MathUtils.clamp(beam.elapsed / 0.25, 0.2, 1) * (0.75 + 0.55 * progress);

    this._tmpStart.copy(playerHandsPos);
    this._tmpEnd.set(targetPos.x, targetPos.y + 1.05, targetPos.z);
    this._tmpDir.copy(this._tmpEnd).sub(this._tmpStart);
    const len = Math.max(0.2, this._tmpDir.length());
    this._tmpMid.copy(this._tmpStart).lerp(this._tmpEnd, 0.5);
    this._tmpDir.divideScalar(len);
    this._quat.setFromUnitVectors(this._upAxis, this._tmpDir);

    const outerRadius = 0.14 * pulse * ramp;
    const innerRadius = 0.055 * pulse * ramp;

    beam.outerBeam.position.copy(this._tmpMid);
    beam.outerBeam.quaternion.copy(this._quat);
    beam.outerBeam.scale.set(outerRadius, len, outerRadius);
    (beam.outerBeam.material as THREE.MeshBasicMaterial).opacity = 0.52 * ramp;

    beam.innerBeam.position.copy(this._tmpMid);
    beam.innerBeam.quaternion.copy(this._quat);
    beam.innerBeam.scale.set(innerRadius, len, innerRadius);
    (beam.innerBeam.material as THREE.MeshBasicMaterial).opacity = 0.86 * ramp;

    beam.handOrb.position.copy(this._tmpStart);
    beam.handOrb.scale.setScalar(0.68 * ramp * pulse);

    beam.targetOrb.position.copy(this._tmpEnd);
    beam.targetOrb.scale.setScalar(0.92 * ramp * pulse);

    // Extracted energy wisps flowing FROM target -> INTO Agatha's hands
    for (let i = 0; i < beam.wisps.length; i++) {
      const u = (this.animTime * 1.45 + i / beam.wisps.length) % 1;
      const swirlAngle = this.animTime * 7 + i * 1.1;
      const swirlR = Math.sin(u * Math.PI) * 0.22;
      this._tmpWispOff.set(
        Math.cos(swirlAngle) * swirlR,
        Math.sin(swirlAngle * 0.8) * swirlR,
        Math.sin(swirlAngle) * swirlR,
      );
      beam.wisps[i].position.lerpVectors(this._tmpEnd, this._tmpStart, u).add(this._tmpWispOff);
      beam.wisps[i].scale.setScalar((0.35 + Math.sin(u * Math.PI) * 0.24) * ramp);
    }
  }

  public isAbsorbTendrilActive(id: string): boolean {
    return this.absorbTendrils.has(id);
  }

  public startAbsorbTendrils(id: string, targetId: string, duration: number): void {
    this.stopAbsorbTendrils(id);

    const strandsOuter: THREE.Mesh[] = [];
    const strandsInner: THREE.Mesh[] = [];
    for (let s = 0; s < 3; s++) {
      const outer = new THREE.Mesh(
        this.beamCylGeo,
        new THREE.MeshBasicMaterial({
          color: 0x8f24f2,
          transparent: true,
          opacity: 0.56,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      const inner = new THREE.Mesh(
        this.beamCylGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf4ccff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      this.group.add(outer, inner);
      strandsOuter.push(outer);
      strandsInner.push(inner);
    }

    const mkOrb = (scale: number, opacity: number) => {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.orbTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity,
        }),
      );
      sp.scale.setScalar(scale);
      this.group.add(sp);
      return sp;
    };

    const chestOrb = mkOrb(0.9, 0.95);
    const leftHandOrb = mkOrb(0.84, 0.95);
    const rightHandOrb = mkOrb(0.84, 0.95);
    const sourceOrb = mkOrb(1.0, 0.88);

    const wisps: THREE.Sprite[] = [];
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: i % 3 === 0 ? this.orbTex : this.smokeTex,
          transparent: true,
          depthWrite: false,
          blending: i % 3 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: 0.85,
        }),
      );
      sp.scale.setScalar(0.46);
      this.group.add(sp);
      wisps.push(sp);
    }

    this.absorbTendrils.set(id, {
      id,
      targetId,
      strandsOuter,
      strandsInner,
      chestOrb,
      leftHandOrb,
      rightHandOrb,
      sourceOrb,
      wisps,
      elapsed: 0,
      duration,
    });
  }

  public stopAbsorbTendrils(id: string): void {
    const t = this.absorbTendrils.get(id);
    if (!t) return;
    for (let i = 0; i < t.strandsOuter.length; i++) {
      this.group.remove(t.strandsOuter[i], t.strandsInner[i]);
      (t.strandsOuter[i].material as THREE.Material).dispose();
      (t.strandsInner[i].material as THREE.Material).dispose();
    }
    this.group.remove(t.chestOrb, t.leftHandOrb, t.rightHandOrb, t.sourceOrb);
    (t.chestOrb.material as THREE.Material).dispose();
    (t.leftHandOrb.material as THREE.Material).dispose();
    (t.rightHandOrb.material as THREE.Material).dispose();
    (t.sourceOrb.material as THREE.Material).dispose();
    for (const w of t.wisps) {
      this.group.remove(w);
      (w.material as THREE.Material).dispose();
    }
    this.absorbTendrils.delete(id);
  }

  public updateAbsorbTendrils(
    id: string,
    dt: number,
    agathaPos: THREE.Vector3,
    agathaYaw: number,
    attackerPos: THREE.Vector3,
  ): void {
    const t = this.absorbTendrils.get(id);
    if (!t) return;
    t.elapsed += dt;
    const progress = THREE.MathUtils.clamp(t.elapsed / Math.max(t.duration, 0.1), 0, 1);
    const ramp = THREE.MathUtils.clamp(t.elapsed / 0.18, 0.3, 1) * (progress > 0.85 ? (1 - progress) / 0.15 : 1);
    const pulse = 1 + Math.sin(this.animTime * 19 + t.elapsed * 4) * 0.18;

    const sinY = Math.sin(agathaYaw);
    const cosY = Math.cos(agathaYaw);
    const rightX = cosY;
    const rightZ = -sinY;
    const fwdX = -sinY;
    const fwdZ = -cosY;

    // 3 endpoints matching arched-back wide-arm pose: chest, outstretched left palm, outstretched right palm
    const chestPt = this._tmpStart.set(
      agathaPos.x + fwdX * 0.08,
      agathaPos.y + 1.18,
      agathaPos.z + fwdZ * 0.08,
    );
    const leftHandPt = new THREE.Vector3(
      agathaPos.x - rightX * 0.82 + fwdX * 0.08,
      agathaPos.y + 1.24,
      agathaPos.z - rightZ * 0.82 + fwdZ * 0.08,
    );
    const rightHandPt = new THREE.Vector3(
      agathaPos.x + rightX * 0.82 + fwdX * 0.08,
      agathaPos.y + 1.24,
      agathaPos.z + rightZ * 0.82 + fwdZ * 0.08,
    );
    const sourcePt = this._tmpEnd.set(attackerPos.x, attackerPos.y + 1.1, attackerPos.z);

    const targets = [chestPt, leftHandPt, rightHandPt];
    for (let s = 0; s < 3; s++) {
      const dst = targets[s];
      this._tmpDir.copy(dst).sub(sourcePt);
      const len = Math.max(0.2, this._tmpDir.length());
      this._tmpMid.copy(sourcePt).lerp(dst, 0.5);
      this._tmpDir.divideScalar(len);
      this._quat.setFromUnitVectors(this._upAxis, this._tmpDir);

      const outerR = (s === 0 ? 0.11 : 0.085) * pulse * Math.max(0.25, ramp);
      const innerR = (s === 0 ? 0.044 : 0.032) * pulse * Math.max(0.25, ramp);

      const outer = t.strandsOuter[s];
      const inner = t.strandsInner[s];
      outer.position.copy(this._tmpMid);
      outer.quaternion.copy(this._quat);
      outer.scale.set(outerR, len, outerR);
      (outer.material as THREE.MeshBasicMaterial).opacity = 0.56 * ramp;

      inner.position.copy(this._tmpMid);
      inner.quaternion.copy(this._quat);
      inner.scale.set(innerR, len, innerR);
      (inner.material as THREE.MeshBasicMaterial).opacity = 0.92 * ramp;
    }

    t.chestOrb.position.copy(chestPt);
    t.chestOrb.scale.setScalar(0.82 * ramp * pulse);
    t.leftHandOrb.position.copy(leftHandPt);
    t.leftHandOrb.scale.setScalar(0.76 * ramp * pulse);
    t.rightHandOrb.position.copy(rightHandPt);
    t.rightHandOrb.scale.setScalar(0.76 * ramp * pulse);
    t.sourceOrb.position.copy(sourcePt);
    t.sourceOrb.scale.setScalar(0.95 * ramp * pulse);

    // Wisps streaming FROM attacker -> INTO Agatha's chest & outstretched palms
    for (let i = 0; i < t.wisps.length; i++) {
      const dst = targets[i % 3];
      const u = (this.animTime * 1.85 + i / t.wisps.length) % 1;
      const swirlAngle = this.animTime * 8.5 + i * 1.4;
      const swirlR = Math.sin(u * Math.PI) * 0.24;
      this._tmpWispOff.set(
        Math.cos(swirlAngle) * swirlR,
        Math.sin(swirlAngle * 0.9) * swirlR,
        Math.sin(swirlAngle) * swirlR,
      );
      t.wisps[i].position.lerpVectors(sourcePt, dst, u).add(this._tmpWispOff);
      t.wisps[i].scale.setScalar((0.36 + Math.sin(u * Math.PI) * 0.26) * Math.max(0.3, ramp));
      (t.wisps[i].material as THREE.SpriteMaterial).opacity = 0.85 * ramp;
    }
  }

  public updateChargeAura(active: boolean, center: THREE.Vector3, progress: number): void {
    this.chargeGroup.visible = active;
    if (!active) return;
    this.chargeGroup.position.set(center.x, center.y + 1.05, center.z);
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const s = 0.4 + p * 1.35;
    this.chargeSphere.scale.setScalar(s);
    (this.chargeSphere.material as THREE.MeshBasicMaterial).opacity = 0.18 + p * 0.36;
    this.chargeRing.scale.setScalar(0.6 + p * 1.65);
    this.chargeRing.rotation.z += 0.14;
    (this.chargeRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + p * 0.5;
  }

  public updateAbsorptionShield(active: boolean, playerPos: THREE.Vector3, safeDt: number): void {
    this.shieldGroup.visible = active;
    if (!active) return;
    this.shieldGroup.position.set(playerPos.x, playerPos.y + 1.05, playerPos.z);

    for (let i = 0; i < this.shieldSprites.length; i++) {
      const a = this.animTime * 3.4 + (i / this.shieldSprites.length) * Math.PI * 2;
      const rad = 0.64 + Math.sin(this.animTime * 5 + i) * 0.08;
      const yOff = Math.sin(this.animTime * 3.8 + i * 1.3) * 0.24;
      this.shieldSprites[i].position.set(Math.cos(a) * rad, yOff, Math.sin(a) * rad);
      (this.shieldSprites[i].material as THREE.SpriteMaterial).rotation += safeDt * 1.8;
    }
    this.shieldRings[0].rotation.z += safeDt * 3.2;
    this.shieldRings[1].rotation.z -= safeDt * 2.6;

    this.shieldEmitAccum += safeDt;
    if (this.shieldEmitAccum >= 0.08) {
      this.shieldEmitAccum -= 0.08;
      const a = Math.random() * Math.PI * 2;
      this._tmpSpawnPos.set(
        playerPos.x + Math.cos(a) * 0.62,
        playerPos.y + 0.9 + Math.random() * 0.4,
        playerPos.z + Math.sin(a) * 0.62,
      );
      this._tmpSpawnVel.set(-Math.sin(a) * 0.4, 0.45, Math.cos(a) * 0.4);
      this.spawnSmokeParticle(
        this._tmpSpawnPos,
        this._tmpSpawnVel,
        0.48,
        0.92,
        0.55,
        0.58,
      );
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    flightActive: boolean,
    targets: ReadonlyArray<CombatTargetProbe>,
    onBoltImpact: (center: THREE.Vector3, directTargetId: string | null) => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    // 1. Flight purple mist & energy trails around Agatha's legs & lower body
    if (flightActive) {
      this.flightEmitAccum += safeDt;
      while (this.flightEmitAccum >= 0.042) {
        this.flightEmitAccum -= 0.042;
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
          p.life = 0.65 + Math.random() * 0.3;
          const angle = Math.random() * Math.PI * 2;
          const rad = 0.16 + Math.random() * 0.32;
          p.offset.set(
            Math.cos(angle) * rad,
            0.12 + Math.random() * 0.6,
            Math.sin(angle) * rad,
          );
          p.vel.set(
            Math.cos(angle) * 0.22,
            -0.3 + Math.random() * 0.22,
            Math.sin(angle) * 0.22,
          );
          p.startScale = 0.46 + Math.random() * 0.24;
          p.endScale = 0.95 + Math.random() * 0.32;
          p.maxOpacity = 0.62;
          p.sprite.position.copy(playerPos).add(p.offset);
          p.sprite.visible = true;
        }
      }
    } else {
      this.flightEmitAccum = 0;
    }

    for (const p of this.flightMistPool) {
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

    // 2. Pooled smoke sprites
    for (const p of this.smokePool) {
      if (!p.active) continue;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.sprite.position.addScaledVector(p.vel, safeDt);
      p.vel.multiplyScalar(Math.exp(-3.2 * safeDt));
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, t));
      (p.sprite.material as THREE.SpriteMaterial).opacity =
        p.maxOpacity * Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.5) * (1 - t);
    }

    // 3. Purple Magic Bolts -> Large corrupted purple smoke & mist explosion on impact
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.prevPos.copy(b.pos);
      b.age += safeDt;
      b.pos.addScaledVector(b.vel, safeDt);
      b.group.position.copy(b.pos);

      b.trailAccum += safeDt;
      if (b.trailAccum >= 0.025) {
        b.trailAccum -= 0.025;
        this._tmpSpawnVel.set(
          (Math.random() - 0.5) * 0.7,
          0.2 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.7,
        );
        this.spawnSmokeParticle(
          b.pos,
          this._tmpSpawnVel,
          0.42,
          0.95,
          0.36,
          0.68,
        );
      }

      let hitTargetId: string | null = null;
      this._tmpDir.copy(b.pos).sub(b.prevPos);
      const segLenSq = this._tmpDir.lengthSq();

      for (let k = 0; k < targets.length; k++) {
        const trg = targets[k];
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
        const hitR = trg.radius + 0.42;
        if (
          (px - cx) * (px - cx) + (pz - cz) * (pz - cz) <= hitR * hitR &&
          Math.abs(py - cy) <= trg.height * 0.68
        ) {
          b.pos.set(px, py, pz);
          hitTargetId = trg.id;
          break;
        }
      }

      if (hitTargetId || b.age >= b.maxAge || b.pos.y <= 0.14) {
        this.spawnSmokeExplosion(b.pos, AGATHA_BOLT_SPLASH_RADIUS, 0.55, 14);
        onBoltImpact(b.pos, hitTargetId);
        this.group.remove(b.group);
        (b.core.material as THREE.Material).dispose();
        (b.halo.material as THREE.Material).dispose();
        (b.smokeAura.material as THREE.Material).dispose();
        this.bolts.splice(i, 1);
      }
    }

    // 4. Expanding Purple Corrupted Smoke & Chaos Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += safeDt;
      const t = THREE.MathUtils.clamp(exp.age / exp.life, 0, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const radiusNow = THREE.MathUtils.lerp(0.45, exp.maxRadius, easeOut);
      const fade = t < 0.58 ? 1 : (1 - t) / 0.42;

      exp.outerSphere.scale.setScalar(radiusNow);
      (exp.outerSphere.material as THREE.MeshBasicMaterial).opacity = 0.44 * fade;
      exp.innerVoid.scale.setScalar(
        Math.max(0.1, t < 0.25 ? THREE.MathUtils.lerp(0.4, 1.4, t / 0.25) : 1.4 * fade),
      );
      (exp.innerVoid.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
      exp.ring.scale.setScalar(radiusNow * 1.05);
      (exp.ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
      exp.halo.scale.setScalar(THREE.MathUtils.lerp(1.5, exp.maxRadius * 1.45, easeOut));
      (exp.halo.material as THREE.SpriteMaterial).opacity = 0.82 * fade;

      for (let s = 0; s < exp.smokeSprites.length; s++) {
        exp.smokeSprites[s].position
          .copy(exp.smokeDirs[s])
          .multiplyScalar(radiusNow * 0.86);
        exp.smokeSprites[s].scale.setScalar(
          exp.maxRadius * (0.28 + easeOut * 0.28) * (1 - t * 0.35),
        );
        (exp.smokeSprites[s].material as THREE.SpriteMaterial).opacity = 0.85 * fade;
      }

      if (exp.age >= exp.life) {
        this.group.remove(exp.group);
        exp.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            (obj.material as THREE.Material).dispose();
          }
        });
        this.explosions.splice(i, 1);
      }
    }
  }

  public clearAll(): void {
    this.shieldGroup.visible = false;
    this.chargeGroup.visible = false;

    for (const id of this.beams.keys()) {
      this.stopDrainBeam(id);
    }
    for (const id of Array.from(this.absorbTendrils.keys())) {
      this.stopAbsorbTendrils(id);
    }

    for (const b of this.bolts) {
      this.group.remove(b.group);
      (b.core.material as THREE.Material).dispose();
      (b.halo.material as THREE.Material).dispose();
      (b.smokeAura.material as THREE.Material).dispose();
    }
    this.bolts.length = 0;

    for (const exp of this.explosions) {
      this.group.remove(exp.group);
      exp.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
          (obj.material as THREE.Material).dispose();
        }
      });
    }
    this.explosions.length = 0;

    for (const p of this.flightMistPool) {
      p.active = false;
      p.sprite.visible = false;
    }
    for (const p of this.smokePool) {
      p.active = false;
      p.sprite.visible = false;
    }
  }

  public dispose(): void {
    this.clearAll();
    for (const p of this.flightMistPool) (p.sprite.material as THREE.Material).dispose();
    for (const p of this.smokePool) (p.sprite.material as THREE.Material).dispose();
    for (const sp of this.shieldSprites) (sp.material as THREE.Material).dispose();
    for (const r of this.shieldRings) (r.material as THREE.Material).dispose();
    (this.chargeSphere.material as THREE.Material).dispose();
    (this.chargeRing.material as THREE.Material).dispose();
    this.unitSphereGeo.dispose();
    this.boltGeo.dispose();
    this.ringGeo.dispose();
    this.beamCylGeo.dispose();
  }
}
