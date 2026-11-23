import * as THREE from 'three';
import { CharacterAnimator } from './characterAnimator';
import { CharacterAppearance } from './characterConfig';
import { createR16Character, R16Rig } from './r16Character';
import { CombatTargetProbe } from './scarletWitchAbilities';

let cachedMandalaTex: THREE.CanvasTexture | null = null;
let cachedSparkTex: THREE.CanvasTexture | null = null;
let cachedBlueRingTex: THREE.CanvasTexture | null = null;

function createMandalaTexture(): THREE.CanvasTexture {
  if (cachedMandalaTex) return cachedMandalaTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  ctx.clearRect(0, 0, size, size);

  // Warm orange radial glow backdrop
  const glow = ctx.createRadialGradient(half, half, 12, half, half, half);
  glow.addColorStop(0.0, 'rgba(255, 224, 130, 0.42)');
  glow.addColorStop(0.55, 'rgba(255, 138, 28, 0.28)');
  glow.addColorStop(0.9, 'rgba(255, 102, 12, 0.1)');
  glow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 218, 114, 0.98)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 146, 36, 0.95)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Concentric rotated eldritch squares
  ctx.save();
  ctx.translate(half, half);
  for (let s = 0; s < 2; s++) {
    ctx.rotate(Math.PI * 0.25);
    ctx.strokeStyle = s === 0 ? 'rgba(255, 236, 168, 0.95)' : 'rgba(255, 152, 42, 0.92)';
    ctx.lineWidth = 2.8;
    const side = half * 1.1;
    ctx.strokeRect(-side * 0.5, -side * 0.5, side, side);
  }
  ctx.restore();

  // Outer ring runes/ticks
  ctx.strokeStyle = 'rgba(255, 240, 192, 0.96)';
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16;
    const r0 = half * 0.79;
    const r1 = half * 0.89;
    ctx.beginPath();
    ctx.moveTo(half + Math.cos(a) * r0, half + Math.sin(a) * r0);
    ctx.lineTo(half + Math.cos(a) * r1, half + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Inner circle
  ctx.beginPath();
  ctx.arc(half, half, half * 0.36, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedMandalaTex = tex;
  return tex;
}

function createSparkTexture(): THREE.CanvasTexture {
  if (cachedSparkTex) return cachedSparkTex;

  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 248, 210, 1)');
  grad.addColorStop(0.35, 'rgba(255, 164, 48, 0.88)');
  grad.addColorStop(0.75, 'rgba(255, 102, 14, 0.3)');
  grad.addColorStop(1.0, 'rgba(180, 50, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedSparkTex = tex;
  return tex;
}

function createBlueRuneRingTexture(): THREE.CanvasTexture {
  if (cachedBlueRingTex) return cachedBlueRingTex;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  ctx.clearRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(half, half, 12, half, half, half);
  glow.addColorStop(0.0, 'rgba(170, 236, 255, 0.36)');
  glow.addColorStop(0.48, 'rgba(56, 152, 255, 0.42)');
  glow.addColorStop(0.84, 'rgba(24, 72, 184, 0.25)');
  glow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(145, 232, 255, 0.98)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.88, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(34, 96, 228, 0.94)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(half, half);
  for (let s = 0; s < 2; s++) {
    ctx.rotate(Math.PI * 0.25);
    ctx.strokeStyle = s === 0 ? 'rgba(186, 244, 255, 0.95)' : 'rgba(62, 148, 255, 0.9)';
    ctx.lineWidth = 2.6;
    const side = half * 1.02;
    ctx.strokeRect(-side * 0.5, -side * 0.5, side, side);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedBlueRingTex = tex;
  return tex;
}

interface CloneEntity {
  rig: R16Rig;
  animator: CharacterAnimator;
  startPos: THREE.Vector3;
  pos: THREE.Vector3;
  chainMesh: THREE.Mesh;
  chainGlow: THREE.Sprite;
}

interface EldritchDiscProjectile {
  group: THREE.Group;
  outerDisc: THREE.Mesh;
  innerDisc: THREE.Mesh;
  rim: THREE.Mesh;
  halo: THREE.Sprite;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  sparkAccum: number;
  hitIds: Set<string>;
}

interface DiscSparkParticle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  age: number;
  life: number;
  startScale: number;
}

interface ShieldButterflyParticle {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  life: number;
  startScale: number;
  flapSpeed: number;
  flapPhase: number;
  spinY: number;
}

function createButterflyWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.11, 0.14, 0.24, 0.12);
  shape.quadraticCurveTo(0.28, 0.04, 0.16, -0.02);
  shape.quadraticCurveTo(0.21, -0.1, 0.11, -0.15);
  shape.quadraticCurveTo(0.04, -0.13, 0, -0.02);
  return new THREE.ShapeGeometry(shape, 5);
}

export class DoctorStrangeVfxSystem {
  public readonly group = new THREE.Group();

  private readonly mandalaTex: THREE.CanvasTexture;
  private readonly sparkTex: THREE.CanvasTexture;
  private readonly blueRingTex: THREE.CanvasTexture;

  // Enlarged Mystic Mandala Shield + timed summoning sparks
  private readonly shieldGroup = new THREE.Group();
  private readonly shieldDiscFront: THREE.Mesh;
  private readonly shieldDiscInner: THREE.Mesh;
  private readonly shieldRimTorus: THREE.Mesh;
  private readonly shieldOrbitSparks: THREE.Sprite[] = [];
  private shieldActive = false;
  private shieldBlend = 0;
  private shieldSummonElapsed = 0;

  // Mystic Clones & Chains sequence
  private clonesState: {
    phase: 'binding' | 'returning';
    elapsed: number;
    bindDuration: number;
    returnDuration: number;
    targetId: string;
    targetPos: THREE.Vector3;
    clones: CloneEntity[];
    targetRuneRing: THREE.Mesh;
    targetGroundRune: THREE.Mesh;
    dmgAccum: number;
  } | null = null;

  // Purgatory's Grasp per-target blue rune columns & ground slam bursts
  private readonly purgatoryNodes = new Map<
    string,
    {
      group: THREE.Group;
      lightRing: THREE.Mesh;
      darkRing: THREE.Mesh;
      columnOuter: THREE.Mesh;
      columnInner: THREE.Mesh;
      slamPulse: THREE.Mesh;
    }
  >();
  private readonly purgatoryImpacts: Array<{
    ring: THREE.Mesh;
    age: number;
    life: number;
  }> = [];

  // Flat Horizontal Eldritch Discs (↔️) & Sparks
  private readonly discOuterGeo = new THREE.CircleGeometry(0.46, 32);
  private readonly discInnerGeo = new THREE.CircleGeometry(0.28, 24);
  private readonly discRimGeo = new THREE.TorusGeometry(0.47, 0.022, 8, 32);
  private readonly eldritchDiscs: EldritchDiscProjectile[] = [];
  private readonly discSparks: DiscSparkParticle[] = [];

  // Mystic Shield solid light-blue end butterflies
  private readonly butterflyWingGeo = createButterflyWingGeometry();
  private readonly shieldButterflies: ShieldButterflyParticle[] = [];

  // Flight visual-only hand shield discs (Doctor Strange & Ancient One)
  private readonly handDiscGeo = new THREE.CircleGeometry(0.24, 24);
  private readonly handDiscRimGeo = new THREE.RingGeometry(0.21, 0.24, 24);
  private readonly leftFlightDiscGroup = new THREE.Group();
  private readonly rightFlightDiscGroup = new THREE.Group();
  private readonly leftFlightDiscMesh: THREE.Mesh;
  private readonly rightFlightDiscMesh: THREE.Mesh;
  private readonly leftFlightDiscRim: THREE.Mesh;
  private readonly rightFlightDiscRim: THREE.Mesh;
  private flightDiscsVisible = false;

  // Ancient One Astral Extraction VFX (separated soul duplicate)
  private astralExtractVfx: {
    soulRig: R16Rig;
    soulAnimator: CharacterAnimator;
    strikeRing: THREE.Mesh;
    strikeFlare: THREE.Sprite;
    elapsed: number;
  } | null = null;

  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpHandPos = new THREE.Vector3();
  private readonly _tmpChestPos = new THREE.Vector3();
  private readonly _tmpMergeTarget = new THREE.Vector3();
  private readonly _tmpMid = new THREE.Vector3();
  private animTime = 0;

  constructor(private readonly appearance: CharacterAppearance) {
    this.mandalaTex = createMandalaTexture();
    this.sparkTex = createSparkTexture();
    this.blueRingTex = createBlueRuneRingTexture();

    this.discOuterGeo.rotateX(-Math.PI * 0.5);
    this.discInnerGeo.rotateX(-Math.PI * 0.5);
    this.discRimGeo.rotateX(Math.PI * 0.5);

    // Enlarged Front Mandala Shield (noticeably larger protection barrier)
    this.shieldGroup.visible = false;
    const shieldGeo = new THREE.CircleGeometry(1.62, 48);
    const shieldMatFront = new THREE.MeshBasicMaterial({
      map: this.mandalaTex,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shieldDiscFront = new THREE.Mesh(shieldGeo, shieldMatFront);

    const innerGeo = new THREE.CircleGeometry(0.98, 36);
    const innerMat = shieldMatFront.clone();
    this.shieldDiscInner = new THREE.Mesh(innerGeo, innerMat);
    this.shieldDiscInner.position.z = -0.025;

    this.shieldRimTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.56, 0.036, 10, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffb338,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    this.shieldGroup.add(this.shieldDiscFront, this.shieldDiscInner, this.shieldRimTorus);
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.sparkTex,
          color: i % 2 === 0 ? 0xffd578 : 0xff8c24,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sp.scale.setScalar(0.32);
      this.shieldGroup.add(sp);
      this.shieldOrbitSparks.push(sp);
    }

    this.group.add(this.shieldGroup);

    // Small visual-only mandala shield discs for both hands during Flight
    const makeFlightDiscMat = (opacity: number) =>
      new THREE.MeshBasicMaterial({
        map: this.mandalaTex,
        color: 0xffbf52,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    const makeFlightRimMat = () =>
      new THREE.MeshBasicMaterial({
        color: 0xff9a28,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    this.leftFlightDiscMesh = new THREE.Mesh(this.handDiscGeo, makeFlightDiscMat(0.86));
    this.leftFlightDiscRim = new THREE.Mesh(this.handDiscRimGeo, makeFlightRimMat());
    this.leftFlightDiscGroup.add(this.leftFlightDiscMesh, this.leftFlightDiscRim);
    this.leftFlightDiscGroup.position.set(0, -0.09, -0.08);
    this.leftFlightDiscGroup.rotation.set(Math.PI * 0.42, 0, 0);
    this.leftFlightDiscGroup.visible = false;

    this.rightFlightDiscMesh = new THREE.Mesh(this.handDiscGeo, makeFlightDiscMat(0.86));
    this.rightFlightDiscRim = new THREE.Mesh(this.handDiscRimGeo, makeFlightRimMat());
    this.rightFlightDiscGroup.add(this.rightFlightDiscMesh, this.rightFlightDiscRim);
    this.rightFlightDiscGroup.position.set(0, -0.09, -0.08);
    this.rightFlightDiscGroup.rotation.set(Math.PI * 0.42, 0, 0);
    this.rightFlightDiscGroup.visible = false;
  }

  public setShieldActive(active: boolean): void {
    if (active && !this.shieldActive) {
      this.shieldSummonElapsed = 0;
    } else if (!active && this.shieldActive) {
      this.spawnShieldButterflyBurst();
    }
    this.shieldActive = active;
  }

  public isShieldActive(): boolean {
    return this.shieldActive;
  }

  private spawnShieldButterflyBurst(): void {
    const center = this.shieldGroup.position;
    const palette = [0x7dd3fc, 0x9be7ff, 0x56c5ff];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      const root = new THREE.Group();
      const leftWing = new THREE.Mesh(this.butterflyWingGeo, mat);
      const rightWing = new THREE.Mesh(this.butterflyWingGeo, mat);
      rightWing.scale.x = -1;
      root.add(leftWing, rightWing);

      const ringAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const radialOffset = 0.25 + Math.random() * 1.15;
      root.position.set(
        center.x + Math.cos(ringAngle) * radialOffset * 0.65,
        center.y + Math.sin(ringAngle) * radialOffset * 0.65,
        center.z + (Math.random() - 0.5) * 0.55,
      );
      const startScale = 0.78 + Math.random() * 0.42;
      root.scale.setScalar(startScale);
      root.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.45,
      );
      this.group.add(root);

      const outAngle = Math.random() * Math.PI * 2;
      const outSpeed = 2.0 + Math.random() * 2.8;
      this.shieldButterflies.push({
        root,
        leftWing,
        rightWing,
        mat,
        vel: new THREE.Vector3(
          Math.cos(outAngle) * outSpeed,
          0.75 + Math.random() * 1.85,
          Math.sin(outAngle) * outSpeed,
        ),
        age: 0,
        life: 0.95 + Math.random() * 0.35,
        startScale,
        flapSpeed: 18 + Math.random() * 10,
        flapPhase: Math.random() * Math.PI * 2,
        spinY: (Math.random() - 0.5) * 2.6,
      });
    }
  }

  public updateFlightHandDiscs(
    visible: boolean,
    leftHand: THREE.Object3D | null,
    rightHand: THREE.Object3D | null,
    dt: number,
  ): void {
    this.flightDiscsVisible = visible && Boolean(leftHand && rightHand);
    if (!this.flightDiscsVisible || !leftHand || !rightHand) {
      this.leftFlightDiscGroup.visible = false;
      this.rightFlightDiscGroup.visible = false;
      return;
    }

    if (this.leftFlightDiscGroup.parent !== leftHand) {
      leftHand.add(this.leftFlightDiscGroup);
    }
    if (this.rightFlightDiscGroup.parent !== rightHand) {
      rightHand.add(this.rightFlightDiscGroup);
    }

    this.leftFlightDiscGroup.visible = true;
    this.rightFlightDiscGroup.visible = true;

    const safeDt = Math.min(dt, 0.05);
    this.leftFlightDiscMesh.rotation.z += safeDt * 3.4;
    this.rightFlightDiscMesh.rotation.z -= safeDt * 3.4;
    const pulse = 0.94 + Math.sin(this.animTime * 4.2) * 0.06;
    this.leftFlightDiscGroup.scale.setScalar(pulse);
    this.rightFlightDiscGroup.scale.setScalar(pulse);
  }

  public isClonesActive(): boolean {
    return this.clonesState !== null;
  }

  public spawnMysticClones(
    targetId: string,
    targetPos: THREE.Vector3,
    strangeAppearance: CharacterAppearance,
  ): boolean {
    if (this.clonesState) return false;

    const clones: CloneEntity[] = [];
    const chainGeo = new THREE.CylinderGeometry(0.042, 0.042, 1, 8);
    chainGeo.rotateX(Math.PI * 0.5);

    const count = 4;
    for (let i = 0; i < count; i++) {
      const baseAngle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.65;
      const rad = 2.9 + Math.random() * 1.1;
      const elevation = 1.05 + Math.random() * 1.25;
      const pos = new THREE.Vector3(
        targetPos.x + Math.cos(baseAngle) * rad,
        elevation,
        targetPos.z + Math.sin(baseAngle) * rad,
      );

      const rig = createR16Character(strangeAppearance);
      const facingYaw = Math.atan2(-(targetPos.x - pos.x), -(targetPos.z - pos.z));
      rig.root.position.copy(pos);
      rig.root.rotation.y = facingYaw;
      rig.setOpacity(0.88);
      this.group.add(rig.root);

      const animator = new CharacterAnimator(
        rig,
        strangeAppearance.archetype ?? 'doctor-strange',
        strangeAppearance.skinId,
      );
      animator.triggerCast('strange-clones-cast', 4.0);

      const chainMat = new THREE.MeshBasicMaterial({
        color: 0xffb23a,
        transparent: true,
        opacity: 0.94,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const chainMesh = new THREE.Mesh(chainGeo, chainMat);
      this.group.add(chainMesh);

      const chainGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.sparkTex,
          color: 0xffd268,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      chainGlow.scale.setScalar(0.65);
      this.group.add(chainGlow);

      clones.push({
        rig,
        animator,
        startPos: pos.clone(),
        pos,
        chainMesh,
        chainGlow,
      });
    }

    // Rotating circular ring of orange/yellow Doctor Strange runes surrounding the restrained target
    const targetRuneGeo = new THREE.RingGeometry(0.88, 1.48, 36);
    targetRuneGeo.rotateX(-Math.PI * 0.5);
    const targetRuneRing = new THREE.Mesh(
      targetRuneGeo,
      new THREE.MeshBasicMaterial({
        map: this.mandalaTex,
        color: 0xffc64a,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    targetRuneRing.position.set(targetPos.x, targetPos.y + 0.98, targetPos.z);
    this.group.add(targetRuneRing);

    const targetGroundRune = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 36).rotateX(-Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.mandalaTex,
        color: 0xff9d2e,
        transparent: true,
        opacity: 0.76,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    targetGroundRune.position.set(targetPos.x, targetPos.y + 0.06, targetPos.z);
    this.group.add(targetGroundRune);

    this.clonesState = {
      phase: 'binding',
      elapsed: 0,
      bindDuration: 4.0,
      returnDuration: 0.55,
      targetId,
      targetPos: targetPos.clone(),
      clones,
      targetRuneRing,
      targetGroundRune,
      dmgAccum: 0,
    };
    return true;
  }

  public addPurgatoryTarget(targetId: string, groundPos: THREE.Vector3): void {
    this.removePurgatoryTarget(targetId);

    const grp = new THREE.Group();
    grp.position.set(groundPos.x, 0, groundPos.z);

    const lightRing = new THREE.Mesh(
      new THREE.CircleGeometry(1.58, 36).rotateX(-Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.blueRingTex,
        color: 0x92eeff,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    lightRing.position.y = 0.06;

    const darkRing = new THREE.Mesh(
      new THREE.CircleGeometry(1.92, 36).rotateX(-Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.blueRingTex,
        color: 0x1a56db,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    darkRing.position.y = 0.04;

    const columnOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.32, 7.6, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x4b7cff,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    columnOuter.position.y = 3.8;

    const columnInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.72, 7.6, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x9cebff,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    columnInner.position.y = 3.8;

    const slamPulse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.25, 4.4, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xc2f6ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    slamPulse.position.y = 2.2;

    grp.add(darkRing, lightRing, columnOuter, columnInner, slamPulse);
    this.group.add(grp);

    this.purgatoryNodes.set(targetId, {
      group: grp,
      lightRing,
      darkRing,
      columnOuter,
      columnInner,
      slamPulse,
    });
  }

  public updatePurgatoryTarget(
    targetId: string,
    x: number,
    z: number,
    phaseProgress: number,
    slamFlare: number,
  ): void {
    const node = this.purgatoryNodes.get(targetId);
    if (!node) return;
    node.group.position.set(x, 0, z);
    node.lightRing.rotation.y += 0.06;
    node.darkRing.rotation.y -= 0.045;
    const pulse = 0.92 + Math.sin(this.animTime * 8) * 0.08;
    node.lightRing.scale.setScalar(pulse * (0.7 + 0.35 * phaseProgress));
    node.darkRing.scale.setScalar((0.85 + 0.2 * phaseProgress) * pulse);
    (node.columnInner.material as THREE.MeshBasicMaterial).opacity =
      0.34 + slamFlare * 0.46;
    (node.slamPulse.material as THREE.MeshBasicMaterial).opacity = slamFlare * 0.75;
    node.slamPulse.scale.set(1 + slamFlare * 0.45, 1, 1 + slamFlare * 0.45);
  }

  public triggerPurgatoryGroundSlam(pos: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 32).rotateX(-Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.blueRingTex,
        color: 0x8be9ff,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.position.set(pos.x, 0.08, pos.z);
    ring.scale.setScalar(0.6);
    this.group.add(ring);
    this.purgatoryImpacts.push({ ring, age: 0, life: 0.5 });
  }

  public removePurgatoryTarget(targetId: string): void {
    const node = this.purgatoryNodes.get(targetId);
    if (!node) return;
    this.group.remove(node.group);
    node.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.purgatoryNodes.delete(targetId);
  }

  /**
   * Launches a flat horizontal (↔️) orange magical mandala disc projectile forward.
   */
  public spawnEldritchDisc(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const grp = new THREE.Group();
    grp.position.copy(origin);

    const outerMat = new THREE.MeshBasicMaterial({
      map: this.mandalaTex,
      color: 0xffc662,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerDisc = new THREE.Mesh(this.discOuterGeo, outerMat);

    const innerMat = new THREE.MeshBasicMaterial({
      map: this.mandalaTex,
      color: 0xffe49a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerDisc = new THREE.Mesh(this.discInnerGeo, innerMat);
    innerDisc.position.y = 0.015;

    const rimMat = new THREE.MeshBasicMaterial({
      color: 0xff9426,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rim = new THREE.Mesh(this.discRimGeo, rimMat);

    const haloMat = new THREE.SpriteMaterial({
      map: this.sparkTex,
      color: 0xffb242,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(1.2, 0.52, 1);

    // Keep disc group strictly horizontal (no pitch/roll lookAt tilt)
    grp.add(outerDisc, innerDisc, rim, halo);
    this.group.add(grp);

    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    this.eldritchDiscs.push({
      group: grp,
      outerDisc,
      innerDisc,
      rim,
      halo,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(34),
      age: 0,
      maxAge: 1.4,
      sparkAccum: 0,
      hitIds: new Set(),
    });
  }

  private spawnDiscSparkBurst(pos: THREE.Vector3, count = 12, speed = 4.2): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.sparkTex,
        color: i % 2 === 0 ? 0xffdc7c : 0xff8c20,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      const startScale = 0.24 + Math.random() * 0.22;
      sprite.scale.setScalar(startScale);
      this.group.add(sprite);

      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = speed * (0.55 + Math.random() * 0.7);
      this.discSparks.push({
        sprite,
        vel: new THREE.Vector3(
          Math.cos(a) * spd,
          0.6 + Math.random() * 2.2,
          Math.sin(a) * spd,
        ),
        age: 0,
        life: 0.34 + Math.random() * 0.16,
        startScale,
      });
    }
  }

  public startAstralExtractionSoul(targetAppearance: CharacterAppearance): void {
    this.stopAstralExtractionSoul();

    const soulRig = createR16Character(targetAppearance);
    soulRig.setAstralProjection(true);
    soulRig.root.visible = false;
    this.group.add(soulRig.root);

    const soulAnimator = new CharacterAnimator(soulRig, targetAppearance.archetype);

    const ringGeo = new THREE.RingGeometry(0.18, 0.38, 28);
    const strikeRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        map: this.mandalaTex,
        color: 0xffbb52,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    strikeRing.visible = false;
    this.group.add(strikeRing);

    const strikeFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTex,
        color: 0xffba42,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    strikeFlare.visible = false;
    this.group.add(strikeFlare);

    this.astralExtractVfx = {
      soulRig,
      soulAnimator,
      strikeRing,
      strikeFlare,
      elapsed: 0,
    };
  }

  public updateAstralExtractionSoul(
    dt: number,
    elapsed: number,
    targetPos: THREE.Vector3,
    targetYaw: number,
    knockAxis: THREE.Vector3,
  ): void {
    const vfx = this.astralExtractVfx;
    if (!vfx) return;
    const safeDt = Math.min(dt, 0.05);
    vfx.elapsed = elapsed;

    // 1. Chest mandala palm-strike flash when Ancient One's palm connects (0.38s .. 0.85s)
    if (elapsed >= 0.36 && elapsed <= 0.92) {
      const f = (elapsed - 0.36) / 0.56;
      const env = Math.sin(f * Math.PI);
      vfx.strikeRing.visible = true;
      vfx.strikeRing.position.set(
        targetPos.x - knockAxis.x * 0.25,
        targetPos.y + 1.08,
        targetPos.z - knockAxis.z * 0.25,
      );
      vfx.strikeRing.rotation.set(0, targetYaw, elapsed * 5);
      vfx.strikeRing.scale.setScalar(0.6 + f * 2.1);
      (vfx.strikeRing.material as THREE.MeshBasicMaterial).opacity = env * 0.92;

      vfx.strikeFlare.visible = true;
      vfx.strikeFlare.position.copy(vfx.strikeRing.position);
      vfx.strikeFlare.scale.setScalar(1.25 * (0.5 + env * 0.9));
      (vfx.strikeFlare.material as THREE.SpriteMaterial).opacity = env * 0.95;
    } else {
      vfx.strikeRing.visible = false;
      vfx.strikeFlare.visible = false;
    }

    // 2. Astral soul duplicate emerges from behind physical body (0.44s -> 1.15s), hovers separated (1.15s -> 1.55s), then snaps cleanly back into body (1.55s -> 2.10s)
    if (elapsed >= 0.44 && elapsed <= 2.15) {
      let sepFactor = 0;
      let alpha = 0;
      if (elapsed < 1.15) {
        const u = (elapsed - 0.44) / 0.71;
        sepFactor = 1 - Math.pow(1 - u, 2.4);
        alpha = THREE.MathUtils.clamp(u * 2.2, 0, 1);
      } else if (elapsed < 1.55) {
        sepFactor = 1 + Math.sin((elapsed - 1.15) * 6) * 0.04;
        alpha = 1;
      } else {
        const u = THREE.MathUtils.clamp((elapsed - 1.55) / 0.55, 0, 1);
        sepFactor = 1 - u * u;
        alpha = 1 - Math.max(0, (u - 0.65) / 0.35);
      }

      vfx.soulRig.root.visible = alpha > 0.02;
      vfx.soulRig.setOpacity(alpha);
      vfx.soulRig.root.position.set(
        targetPos.x + knockAxis.x * sepFactor * 1.48,
        targetPos.y + sepFactor * 0.42,
        targetPos.z + knockAxis.z * sepFactor * 1.48,
      );
      vfx.soulRig.root.rotation.set(-sepFactor * 0.14, targetYaw, 0);
      vfx.soulAnimator.update(safeDt, {
        localForward: 0,
        localRight: 0,
        verticalVelocity: 0,
        grounded: false,
        justJumped: false,
        landImpactSpeed: 0,
        flying: true,
      });
    } else {
      vfx.soulRig.root.visible = false;
    }
  }

  public stopAstralExtractionSoul(): void {
    if (!this.astralExtractVfx) return;
    const vfx = this.astralExtractVfx;
    this.group.remove(vfx.soulRig.root);
    vfx.soulRig.dispose();
    this.group.remove(vfx.strikeRing);
    vfx.strikeRing.geometry.dispose();
    (vfx.strikeRing.material as THREE.Material).dispose();
    this.group.remove(vfx.strikeFlare);
    (vfx.strikeFlare.material as THREE.Material).dispose();
    this.astralExtractVfx = null;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    targets: ReadonlyArray<CombatTargetProbe>,
    callbacks: {
      onClonesTickDamage?: (targetId: string, damage: number) => void;
      onClonesEnd?: (targetId: string) => void;
      onDiscHitTarget?: (targetId: string, hitDir: THREE.Vector3) => void;
    },
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    // 1. Enlarged Mystic Mandala Shield with timed hand-conjuring sparks
    if (this.shieldActive) {
      this.shieldSummonElapsed += safeDt;
    }
    const summonGate = this.shieldActive
      ? THREE.MathUtils.clamp((this.shieldSummonElapsed - 0.14) / 0.24, 0, 1)
      : 0;
    this.shieldBlend = THREE.MathUtils.damp(
      this.shieldBlend,
      this.shieldActive ? Math.max(0.22, summonGate) : 0,
      14,
      safeDt,
    );
    this.shieldGroup.visible = this.shieldBlend > 0.02;
    if (this.shieldGroup.visible) {
      const fwdX = -Math.sin(playerYaw);
      const fwdZ = -Math.cos(playerYaw);
      this.shieldGroup.position.set(
        playerPos.x + fwdX * 0.94,
        playerPos.y + 1.12,
        playerPos.z + fwdZ * 0.94,
      );
      this.shieldGroup.rotation.y = playerYaw;

      const scaleEase = this.shieldActive
        ? 0.18 + Math.pow(this.shieldBlend, 0.85) * 0.82
        : this.shieldBlend;
      this.shieldGroup.scale.setScalar(scaleEase);
      this.shieldDiscFront.rotation.z += safeDt * 1.45;
      this.shieldDiscInner.rotation.z -= safeDt * 2.25;
      this.shieldRimTorus.rotation.z += safeDt * 0.95;

      const sparkAlpha =
        this.shieldActive && this.shieldSummonElapsed < 0.45
          ? 0.95
          : 0.58 * this.shieldBlend;
      for (let i = 0; i < this.shieldOrbitSparks.length; i++) {
        const sp = this.shieldOrbitSparks[i];
        const a = this.animTime * 3.8 + (i / this.shieldOrbitSparks.length) * Math.PI * 2;
        const r =
          this.shieldActive && this.shieldSummonElapsed < 0.22
            ? THREE.MathUtils.lerp(0.25, 1.52, this.shieldSummonElapsed / 0.22)
            : 1.54 + Math.sin(this.animTime * 7 + i) * 0.07;
        sp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.03);
        (sp.material as THREE.SpriteMaterial).opacity = sparkAlpha;
      }
    }

    // 2. Mystic Clones & Chains (coordinated pose, exact skin, right-hand spark beams, rotating target runes)
    if (this.clonesState) {
      const cs = this.clonesState;
      cs.elapsed += safeDt;

      // Keep targetPos synced with live target position so beam & rotating runes follow target movement
      let liveTarget: CombatTargetProbe | undefined;
      for (let ti = 0; ti < targets.length; ti++) {
        if (targets[ti].id === cs.targetId) {
          liveTarget = targets[ti];
          break;
        }
      }
      if (liveTarget) {
        cs.targetPos.copy(liveTarget.position);
      }

      if (cs.phase === 'binding') {
        cs.dmgAccum += safeDt;
        if (cs.dmgAccum >= 0.8) {
          cs.dmgAccum -= 0.8;
          callbacks.onClonesTickDamage?.(cs.targetId, 5);
        }

        const chestPos = this._tmpChestPos.set(
          cs.targetPos.x,
          cs.targetPos.y + 1.05,
          cs.targetPos.z,
        );

        cs.targetRuneRing.position.set(cs.targetPos.x, cs.targetPos.y + 0.98, cs.targetPos.z);
        cs.targetRuneRing.rotation.y += safeDt * 2.8;
        cs.targetGroundRune.position.set(cs.targetPos.x, cs.targetPos.y + 0.06, cs.targetPos.z);
        cs.targetGroundRune.rotation.y -= safeDt * 2.1;

        for (let i = 0; i < cs.clones.length; i++) {
          const c = cs.clones[i];
          const hover = Math.sin(this.animTime * 3.5 + i * 1.7) * 0.14;
          c.rig.root.position.set(c.startPos.x, c.startPos.y + hover, c.startPos.z);
          c.rig.root.rotation.y = Math.atan2(
            -(cs.targetPos.x - c.startPos.x),
            -(cs.targetPos.z - c.startPos.z),
          );
          c.animator.update(safeDt, {
            localForward: 0,
            localRight: 0,
            verticalVelocity: 0,
            grounded: false,
            justJumped: false,
            landImpactSpeed: 0,
            flying: true,
          });
          c.rig.root.updateMatrixWorld(true);

          // Emerge spark beam directly from each clone's raised right hand
          c.rig.rightHand.getWorldPosition(this._tmpHandPos);
          this._tmpMid.lerpVectors(this._tmpHandPos, chestPos, 0.5);
          const len = this._tmpHandPos.distanceTo(chestPos);
          c.chainMesh.position.copy(this._tmpMid);
          c.chainMesh.lookAt(chestPos);
          c.chainMesh.scale.set(1, 1, Math.max(0.1, len));
          c.chainGlow.position.lerpVectors(
            this._tmpHandPos,
            chestPos,
            (this.animTime * 2.4 + i * 0.25) % 1,
          );
        }

        if (cs.elapsed >= cs.bindDuration) {
          cs.phase = 'returning';
          cs.elapsed = 0;
          callbacks.onClonesEnd?.(cs.targetId);
          cs.targetRuneRing.visible = false;
          cs.targetGroundRune.visible = false;
          for (const c of cs.clones) {
            c.chainMesh.visible = false;
            c.chainGlow.visible = false;
          }
        }
      } else {
        const u = Math.min(1, cs.elapsed / cs.returnDuration);
        const mergeTarget = this._tmpMergeTarget.set(playerPos.x, playerPos.y + 0.1, playerPos.z);
        for (const c of cs.clones) {
          c.pos.lerpVectors(c.startPos, mergeTarget, u * u);
          c.rig.root.position.copy(c.pos);
          c.rig.root.scale.setScalar(Math.max(0.08, 1 - u * 0.85));
        }
        if (u >= 1) {
          this.group.remove(cs.targetRuneRing, cs.targetGroundRune);
          cs.targetRuneRing.geometry.dispose();
          (cs.targetRuneRing.material as THREE.Material).dispose();
          cs.targetGroundRune.geometry.dispose();
          (cs.targetGroundRune.material as THREE.Material).dispose();
          for (const c of cs.clones) {
            this.group.remove(c.rig.root);
            this.group.remove(c.chainMesh);
            this.group.remove(c.chainGlow);
            (c.chainMesh.material as THREE.Material).dispose();
            (c.chainGlow.material as THREE.Material).dispose();
            c.rig.dispose();
          }
          this.clonesState = null;
        }
      }
    }

    // 2b. Purgatory's Grasp slam shockwaves
    for (let i = this.purgatoryImpacts.length - 1; i >= 0; i--) {
      const imp = this.purgatoryImpacts[i];
      imp.age += safeDt;
      const t = THREE.MathUtils.clamp(imp.age / imp.life, 0, 1);
      imp.ring.scale.setScalar(0.6 + (1 - Math.pow(1 - t, 3)) * 3.4);
      (imp.ring.material as THREE.MeshBasicMaterial).opacity = 0.92 * (1 - t);
      if (imp.age >= imp.life) {
        this.group.remove(imp.ring);
        imp.ring.geometry.dispose();
        (imp.ring.material as THREE.Material).dispose();
        this.purgatoryImpacts.splice(i, 1);
      }
    }

    // 3. Flat Horizontal Eldritch Disc Projectiles (↔️)
    for (let i = this.eldritchDiscs.length - 1; i >= 0; i--) {
      const disc = this.eldritchDiscs[i];
      disc.age += safeDt;
      disc.pos.addScaledVector(disc.vel, safeDt);
      disc.group.position.copy(disc.pos);
      disc.outerDisc.rotation.y += safeDt * 13.5;
      disc.innerDisc.rotation.y -= safeDt * 17.5;
      disc.rim.rotation.z += safeDt * 11;

      disc.sparkAccum += safeDt;
      if (disc.sparkAccum >= 0.028) {
        disc.sparkAccum -= 0.028;
        const sm = new THREE.SpriteMaterial({
          map: this.sparkTex,
          color: 0xffb338,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sp = new THREE.Sprite(sm);
        sp.position.set(
          disc.pos.x + (Math.random() - 0.5) * 0.36,
          disc.pos.y + (Math.random() - 0.5) * 0.08,
          disc.pos.z + (Math.random() - 0.5) * 0.36,
        );
        sp.scale.setScalar(0.24);
        this.group.add(sp);
        this.discSparks.push({
          sprite: sp,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            0.35 + Math.random() * 0.7,
            (Math.random() - 0.5) * 1.4,
          ),
          age: 0,
          life: 0.24,
          startScale: 0.24,
        });
      }

      let done = disc.age >= disc.maxAge || disc.pos.y <= 0.1;
      if (!done) {
        for (let k = 0; k < targets.length; k++) {
          const trg = targets[k];
          if (disc.hitIds.has(trg.id)) continue;
          const dx = disc.pos.x - trg.position.x;
          const dz = disc.pos.z - trg.position.z;
          const dy = disc.pos.y - (trg.position.y + trg.height * 0.56);
          const hitR = trg.radius + 0.52;
          if (dx * dx + dz * dz <= hitR * hitR && Math.abs(dy) <= trg.height * 0.68) {
            disc.hitIds.add(trg.id);
            this._tmpDir.copy(disc.vel).setY(0).normalize();
            callbacks.onDiscHitTarget?.(trg.id, this._tmpDir);
            this.spawnDiscSparkBurst(disc.pos, 14, 4.6);
            done = true;
            break;
          }
        }
      } else {
        this.spawnDiscSparkBurst(disc.pos, 8, 3.0);
      }

      if (done) {
        this.group.remove(disc.group);
        (disc.outerDisc.material as THREE.Material).dispose();
        (disc.innerDisc.material as THREE.Material).dispose();
        (disc.rim.material as THREE.Material).dispose();
        (disc.halo.material as THREE.Material).dispose();
        this.eldritchDiscs.splice(i, 1);
      }
    }

    // 4. Eldritch Disc Sparks
    for (let i = this.discSparks.length - 1; i >= 0; i--) {
      const sp = this.discSparks[i];
      sp.age += safeDt;
      sp.vel.y -= 5.5 * safeDt;
      sp.sprite.position.addScaledVector(sp.vel, safeDt);
      const t = sp.age / sp.life;
      sp.sprite.scale.setScalar(sp.startScale * (1 - t * 0.72));
      (sp.sprite.material as THREE.SpriteMaterial).opacity = 0.92 * (1 - t);
      if (sp.age >= sp.life) {
        this.group.remove(sp.sprite);
        (sp.sprite.material as THREE.Material).dispose();
        this.discSparks.splice(i, 1);
      }
    }

    // 5. Mystic Shield End Butterflies (solid light-blue spread, shrink & fade)
    for (let i = this.shieldButterflies.length - 1; i >= 0; i--) {
      const bf = this.shieldButterflies[i];
      bf.age += safeDt;
      const t = THREE.MathUtils.clamp(bf.age / bf.life, 0, 1);
      bf.vel.multiplyScalar(1 - Math.min(0.45, safeDt * 1.4));
      bf.vel.y += safeDt * 0.45;
      bf.root.position.addScaledVector(bf.vel, safeDt);
      bf.root.rotation.y += bf.spinY * safeDt;

      const flap = Math.sin(bf.age * bf.flapSpeed + bf.flapPhase) * 0.85;
      bf.leftWing.rotation.y = flap;
      bf.rightWing.rotation.y = -flap;

      bf.root.scale.setScalar(bf.startScale * THREE.MathUtils.lerp(1.0, 0.14, t));
      bf.mat.opacity = t < 0.25 ? 0.96 : 0.96 * (1 - (t - 0.25) / 0.75);

      if (bf.age >= bf.life) {
        this.group.remove(bf.root);
        bf.mat.dispose();
        this.shieldButterflies.splice(i, 1);
      }
    }
  }

  public clearAll(onClonesRelease?: (targetId: string) => void): void {
    this.shieldActive = false;
    this.shieldBlend = 0;
    this.shieldSummonElapsed = 0;
    this.shieldGroup.visible = false;
    this.flightDiscsVisible = false;
    this.leftFlightDiscGroup.visible = false;
    this.rightFlightDiscGroup.visible = false;
    this.leftFlightDiscGroup.removeFromParent();
    this.rightFlightDiscGroup.removeFromParent();
    this.stopAstralExtractionSoul();

    for (const bf of this.shieldButterflies) {
      this.group.remove(bf.root);
      bf.mat.dispose();
    }
    this.shieldButterflies.length = 0;

    for (const disc of this.eldritchDiscs) {
      this.group.remove(disc.group);
      (disc.outerDisc.material as THREE.Material).dispose();
      (disc.innerDisc.material as THREE.Material).dispose();
      (disc.rim.material as THREE.Material).dispose();
      (disc.halo.material as THREE.Material).dispose();
    }
    this.eldritchDiscs.length = 0;

    for (const sp of this.discSparks) {
      this.group.remove(sp.sprite);
      (sp.sprite.material as THREE.Material).dispose();
    }
    this.discSparks.length = 0;

    for (const id of this.purgatoryNodes.keys()) {
      this.removePurgatoryTarget(id);
    }
    for (const imp of this.purgatoryImpacts) {
      this.group.remove(imp.ring);
      imp.ring.geometry.dispose();
      (imp.ring.material as THREE.Material).dispose();
    }
    this.purgatoryImpacts.length = 0;

    if (this.clonesState) {
      if (this.clonesState.phase === 'binding') {
        onClonesRelease?.(this.clonesState.targetId);
      }
      this.group.remove(this.clonesState.targetRuneRing, this.clonesState.targetGroundRune);
      this.clonesState.targetRuneRing.geometry.dispose();
      (this.clonesState.targetRuneRing.material as THREE.Material).dispose();
      this.clonesState.targetGroundRune.geometry.dispose();
      (this.clonesState.targetGroundRune.material as THREE.Material).dispose();
      for (const c of this.clonesState.clones) {
        this.group.remove(c.rig.root);
        this.group.remove(c.chainMesh);
        this.group.remove(c.chainGlow);
        (c.chainMesh.material as THREE.Material).dispose();
        (c.chainGlow.material as THREE.Material).dispose();
        c.rig.dispose();
      }
      this.clonesState = null;
    }
  }

  public dispose(): void {
    this.clearAll();
    this.discOuterGeo.dispose();
    this.discInnerGeo.dispose();
    this.discRimGeo.dispose();
    this.butterflyWingGeo.dispose();
    this.handDiscGeo.dispose();
    this.handDiscRimGeo.dispose();
    (this.leftFlightDiscMesh.material as THREE.Material).dispose();
    (this.leftFlightDiscRim.material as THREE.Material).dispose();
    (this.rightFlightDiscMesh.material as THREE.Material).dispose();
    (this.rightFlightDiscRim.material as THREE.Material).dispose();
    this.shieldDiscFront.geometry.dispose();
    (this.shieldDiscFront.material as THREE.Material).dispose();
    this.shieldDiscInner.geometry.dispose();
    (this.shieldDiscInner.material as THREE.Material).dispose();
    this.shieldRimTorus.geometry.dispose();
    (this.shieldRimTorus.material as THREE.Material).dispose();
    for (const sp of this.shieldOrbitSparks) {
      (sp.material as THREE.Material).dispose();
    }
    void this.appearance;
  }
}
