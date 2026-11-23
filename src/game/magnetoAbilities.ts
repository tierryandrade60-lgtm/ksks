import * as THREE from 'three';
import { CombatTargetProbe } from './scarletWitchAbilities';

let cachedPurpleGlowTex: THREE.CanvasTexture | null = null;
let cachedShockwaveRingTex: THREE.CanvasTexture | null = null;

function createPurpleGlowTexture(): THREE.CanvasTexture {
  if (cachedPurpleGlowTex) return cachedPurpleGlowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 240, 255, 1)');
  grad.addColorStop(0.28, 'rgba(216, 128, 255, 0.85)');
  grad.addColorStop(0.65, 'rgba(146, 42, 240, 0.35)');
  grad.addColorStop(1.0, 'rgba(70, 12, 130, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedPurpleGlowTex = tex;
  return tex;
}

function createShockwaveRingTexture(): THREE.CanvasTexture {
  if (cachedShockwaveRingTex) return cachedShockwaveRingTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, half * 0.52, half, half, half * 0.98);
  grad.addColorStop(0.0, 'rgba(200, 90, 255, 0)');
  grad.addColorStop(0.6, 'rgba(186, 72, 255, 0.72)');
  grad.addColorStop(0.82, 'rgba(245, 210, 255, 0.96)');
  grad.addColorStop(1.0, 'rgba(120, 20, 195, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedShockwaveRingTex = tex;
  return tex;
}

const DEBRIS_WEB_GEO = new THREE.BoxGeometry(0.14, 0.16, 0.76);
const DEBRIS_FLANGE_GEO = new THREE.BoxGeometry(0.32, 0.05, 0.78);
const DEBRIS_PLATE_GEO = new THREE.BoxGeometry(0.56, 0.1, 0.42);
const DEBRIS_RIB_GEO = new THREE.BoxGeometry(0.42, 0.14, 0.14);
const DEBRIS_CHUNK_GEO = new THREE.DodecahedronGeometry(0.24, 0);
const DEBRIS_BOLT_GEO = new THREE.BoxGeometry(0.42, 0.08, 0.1);

function buildMetalDebrisMesh(
  metalMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
  kind: number,
): THREE.Group {
  const g = new THREE.Group();
  if (kind % 3 === 0) {
    // Steel I-beam section
    const web = new THREE.Mesh(DEBRIS_WEB_GEO, metalMat);
    const flangeA = new THREE.Mesh(DEBRIS_FLANGE_GEO, darkMat);
    flangeA.position.y = 0.08;
    const flangeB = new THREE.Mesh(DEBRIS_FLANGE_GEO, darkMat);
    flangeB.position.y = -0.08;
    g.add(web, flangeA, flangeB);
  } else if (kind % 3 === 1) {
    // Jagged heavy armor plate
    const plate = new THREE.Mesh(DEBRIS_PLATE_GEO, darkMat);
    const rib = new THREE.Mesh(DEBRIS_RIB_GEO, metalMat);
    g.add(plate, rib);
  } else {
    // Chunky metallic gear/mass
    const chunk = new THREE.Mesh(DEBRIS_CHUNK_GEO, metalMat);
    chunk.scale.set(1.2, 0.65, 1.0);
    const bolt = new THREE.Mesh(DEBRIS_BOLT_GEO, darkMat);
    g.add(chunk, bolt);
  }
  return g;
}

interface MetalProjectile {
  group: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  age: number;
  maxAge: number;
  arcLine: THREE.Line;
}

interface ImpactBurst {
  group: THREE.Group;
  ring: THREE.Mesh;
  shards: Array<{ mesh: THREE.Object3D; vel: THREE.Vector3; spin: THREE.Vector3 }>;
  age: number;
  duration: number;
  maxRadius: number;
}

interface TornadoDebris {
  mesh: THREE.Group;
  angle: number;
  speed: number;
  radius: number;
  height: number;
  bobPhase: number;
  selfSpin: THREE.Vector3;
}

interface TornadoNpcOrbit {
  angle: number;
  angVel: number;
  radius: number;
  height: number;
  bobPhase: number;
}

export class MagnetoVfxSystem {
  public readonly group = new THREE.Group();

  private readonly glowTex: THREE.CanvasTexture;
  private readonly ringTex: THREE.CanvasTexture;
  private readonly metalMat: THREE.MeshStandardMaterial;
  private readonly darkMetalMat: THREE.MeshStandardMaterial;
  private readonly purpleCoreMat: THREE.MeshBasicMaterial;
  private readonly lightningMat: THREE.LineBasicMaterial;

  private readonly projectiles: MetalProjectile[] = [];
  private readonly bursts: ImpactBurst[] = [];
  private readonly impactRingGeo = new THREE.RingGeometry(0.4, 0.9, 32);
  private readonly meteorCoreGeo = new THREE.DodecahedronGeometry(1.05, 1);

  // Shield visual
  private readonly shieldGroup = new THREE.Group();
  private readonly shieldRings: THREE.Mesh[] = [];
  private readonly shieldNodes: THREE.Mesh[] = [];
  private shieldBlend = 0;
  private shieldActive = false;

  // Meteor sequence state
  private meteorState: {
    phase: 'gathering' | 'launching';
    elapsed: number;
    gatherDuration: number;
    coreGroup: THREE.Group;
    coreSphere: THREE.Mesh;
    aura: THREE.Sprite;
    shards: Array<{
      mesh: THREE.Object3D;
      startOffset: THREE.Vector3;
      orbitSpeed: number;
    }>;
    bolts: THREE.Line[];
    currentPos: THREE.Vector3;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    launchSpeed: number;
  } | null = null;

  // Metal tornado state
  private tornadoActive = false;
  private readonly tornadoGroup = new THREE.Group();
  private readonly tornadoDebris: TornadoDebris[] = [];
  private readonly tornadoBolts: THREE.Line[] = [];
  private tornadoDamageTimer = 0;
  private readonly tornadoOrbits = new Map<string, TornadoNpcOrbit>();
  private readonly tornadoReleasedIds = new Set<string>();

  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpPos = new THREE.Vector3();
  private readonly _tmpDir = new THREE.Vector3();
  private readonly _activeIds = new Set<string>();
  private animTime = 0;

  constructor() {
    this.glowTex = createPurpleGlowTexture();
    this.ringTex = createShockwaveRingTexture();

    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0xb6becb,
      roughness: 0.24,
      metalness: 0.92,
    });
    this.darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x4b5364,
      roughness: 0.38,
      metalness: 0.85,
      emissive: new THREE.Color(0x3a0f5c),
      emissiveIntensity: 0.25,
    });
    this.purpleCoreMat = new THREE.MeshBasicMaterial({
      color: 0xd06bff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lightningMat = new THREE.LineBasicMaterial({
      color: 0xe299ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });

    this.impactRingGeo.rotateX(-Math.PI / 2);
    this.initShieldVisual();
    this.initTornadoVisual();
  }

  private initShieldVisual(): void {
    this.shieldGroup.visible = false;

    // 3 thin rotating orbital magnetic field rings (never obscures character inside)
    const ringGeoA = new THREE.TorusGeometry(1.18, 0.022, 8, 44);
    const ringGeoB = new THREE.TorusGeometry(1.06, 0.018, 8, 40);
    const ringGeoC = new THREE.TorusGeometry(1.26, 0.016, 8, 44);
    const matA = new THREE.MeshBasicMaterial({
      color: 0xd06bff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const matB = matA.clone();
    matB.color.setHex(0xf2ccff);
    const matC = matA.clone();
    matC.color.setHex(0x9a3bff);

    const r1 = new THREE.Mesh(ringGeoA, matA);
    r1.rotation.x = Math.PI * 0.42;
    const r2 = new THREE.Mesh(ringGeoB, matB);
    r2.rotation.set(Math.PI * 0.28, Math.PI * 0.32, 0);
    const r3 = new THREE.Mesh(ringGeoC, matC);
    r3.rotation.set(-Math.PI * 0.35, 0, Math.PI * 0.2);

    this.shieldRings.push(r1, r2, r3);
    this.shieldGroup.add(r1, r2, r3);

    // Subtle translucent geodesic magnetic shell
    const domeGeo = new THREE.IcosahedronGeometry(1.18, 1);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xc26bff,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    this.shieldRings.push(dome);
    this.shieldGroup.add(dome);

    // Orbiting small metallic rivets on field perimeter
    const rivetGeo = new THREE.OctahedronGeometry(0.065, 0);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(rivetGeo, this.metalMat);
      this.shieldNodes.push(m);
      this.shieldGroup.add(m);
    }

    this.group.add(this.shieldGroup);
  }

  private initTornadoVisual(): void {
    this.tornadoGroup.visible = false;

    for (let i = 0; i < 28; i++) {
      const mesh = buildMetalDebrisMesh(this.metalMat, this.darkMetalMat, i);
      const t = i / 28;
      const scale = 0.65 + Math.random() * 0.65;
      mesh.scale.setScalar(scale);
      this.tornadoGroup.add(mesh);
      this.tornadoDebris.push({
        mesh,
        angle: (i * Math.PI * 2) / 5.5 + Math.random() * 0.5,
        speed: 4.5 + (1 - t) * 4.2 + Math.random() * 1.4,
        radius: 1.65 + t * 3.8 + (Math.random() - 0.5) * 0.6,
        height: 0.45 + t * 4.1,
        bobPhase: Math.random() * Math.PI * 2,
        selfSpin: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
        ),
      });
    }

    // 8 jagged purple lightning bolts inside tornado funnel
    for (let b = 0; b < 8; b++) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s < 8; s++) pts.push(new THREE.Vector3());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, this.lightningMat);
      this.tornadoBolts.push(line);
      this.tornadoGroup.add(line);
    }

    this.group.add(this.tornadoGroup);
  }

  public setShieldActive(active: boolean): void {
    this.shieldActive = active;
  }

  public isMeteorBusy(): boolean {
    return this.meteorState !== null;
  }

  public isTornadoActive(): boolean {
    return this.tornadoActive;
  }

  public spawnMetalProjectile(origin: THREE.Vector3, target: THREE.Vector3, indexSeed = 0): void {
    const g = new THREE.Group();
    const chunk = buildMetalDebrisMesh(this.metalMat, this.darkMetalMat, indexSeed);
    chunk.scale.setScalar(0.95);
    g.add(chunk);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(1.05);
    g.add(glow);

    const pts = Array.from({ length: 6 }, () => new THREE.Vector3());
    const arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      this.lightningMat,
    );
    g.add(arcLine);

    g.position.copy(origin);
    this.group.add(g);

    const dir = this._tmpDir.copy(target).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    dir.normalize();

    this.projectiles.push({
      group: g,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(31),
      spin: new THREE.Vector3(6.5, 9.2, 4.4),
      age: 0,
      maxAge: 1.4,
      arcLine,
    });
  }

  public startMeteorSequence(playerPos: THREE.Vector3, aimTargetPos: THREE.Vector3): boolean {
    if (this.meteorState) return false;

    const coreGroup = new THREE.Group();
    const corePos = new THREE.Vector3(playerPos.x, playerPos.y + 4.1, playerPos.z);
    coreGroup.position.copy(corePos);

    const coreSphere = new THREE.Mesh(
      this.meteorCoreGeo,
      this.darkMetalMat,
    );
    coreSphere.scale.setScalar(0.18);
    coreGroup.add(coreSphere);

    // Outer purple magnetic veins on meteor
    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    aura.scale.setScalar(2.6);
    coreGroup.add(aura);

    const shards: Array<{ mesh: THREE.Object3D; startOffset: THREE.Vector3; orbitSpeed: number }> = [];
    for (let i = 0; i < 16; i++) {
      const m = buildMetalDebrisMesh(this.metalMat, this.darkMetalMat, i);
      const ang = (i / 16) * Math.PI * 2;
      const rad = 2.6 + Math.random() * 2.4;
      const startOffset = new THREE.Vector3(
        Math.cos(ang) * rad,
        -3.2 + Math.random() * 1.8,
        Math.sin(ang) * rad,
      );
      m.position.copy(startOffset);
      coreGroup.add(m);
      shards.push({
        mesh: m,
        startOffset,
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (3.5 + Math.random() * 2.5),
      });
    }

    const bolts: THREE.Line[] = [];
    for (let b = 0; b < 5; b++) {
      const pts = Array.from({ length: 7 }, () => new THREE.Vector3());
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        this.lightningMat,
      );
      coreGroup.add(line);
      bolts.push(line);
    }

    this.group.add(coreGroup);

    this.meteorState = {
      phase: 'gathering',
      elapsed: 0,
      gatherDuration: 1.05,
      coreGroup,
      coreSphere,
      aura,
      shards,
      bolts,
      currentPos: corePos.clone(),
      startPos: corePos.clone(),
      targetPos: new THREE.Vector3(aimTargetPos.x, Math.max(0.45, aimTargetPos.y), aimTargetPos.z),
      launchSpeed: 32,
    };
    return true;
  }

  public setTornadoActive(active: boolean): void {
    this.tornadoActive = active;
    this.tornadoGroup.visible = active;
    if (!active) {
      this.tornadoDamageTimer = 0;
    }
  }

  private spawnImpactBurst(pos: THREE.Vector3, maxRadius: number, shardCount: number): void {
    const g = new THREE.Group();
    g.position.set(pos.x, Math.max(0.08, pos.y), pos.z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd478ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.impactRingGeo, ringMat);
    g.add(ring);

    const shards: Array<{ mesh: THREE.Object3D; vel: THREE.Vector3; spin: THREE.Vector3 }> = [];
    for (let i = 0; i < shardCount; i++) {
      const m = buildMetalDebrisMesh(this.metalMat, this.darkMetalMat, i);
      m.scale.setScalar(0.55 + Math.random() * 0.55);
      const ang = Math.random() * Math.PI * 2;
      const spd = 4.5 + Math.random() * 7.5;
      g.add(m);
      shards.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(ang) * spd, 4.5 + Math.random() * 6.5, Math.sin(ang) * spd),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
        ),
      });
    }

    this.group.add(g);
    this.bursts.push({
      group: g,
      ring,
      shards,
      age: 0,
      duration: maxRadius > 3 ? 0.85 : 0.45,
      maxRadius,
    });
  }

  private randomizeLightning(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3, jitter: number): void {
    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const env = Math.sin(t * Math.PI);
      posAttr.setXYZ(
        i,
        THREE.MathUtils.lerp(a.x, b.x, t) + (Math.random() - 0.5) * jitter * env,
        THREE.MathUtils.lerp(a.y, b.y, t) + (Math.random() - 0.5) * jitter * env,
        THREE.MathUtils.lerp(a.z, b.z, t) + (Math.random() - 0.5) * jitter * env,
      );
    }
    posAttr.needsUpdate = true;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    targets: ReadonlyArray<CombatTargetProbe>,
    callbacks: {
      onProjectileHit: (targetId: string, hitDir: THREE.Vector3, damage: number) => void;
      onMeteorLaunch?: () => void;
      onMeteorImpact: (impactPos: THREE.Vector3) => void;
      onTornadoControl?: (
        id: string,
        pos: THREE.Vector3,
        yaw: number,
        tickDamage: number,
      ) => void;
      onTornadoRelease?: (id: string) => void;
    },
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    // 1. Magnetic Shield around Magneto
    this.shieldBlend = THREE.MathUtils.damp(
      this.shieldBlend,
      this.shieldActive ? 1 : 0,
      14,
      safeDt,
    );
    this.shieldGroup.visible = this.shieldBlend > 0.02;
    if (this.shieldGroup.visible) {
      this.shieldGroup.position.set(playerPos.x, playerPos.y + 1.02, playerPos.z);
      this.shieldGroup.scale.setScalar(0.7 + this.shieldBlend * 0.3);
      if (this.shieldRings[0]) this.shieldRings[0].rotation.z += safeDt * 2.4;
      if (this.shieldRings[1]) this.shieldRings[1].rotation.y -= safeDt * 3.1;
      if (this.shieldRings[2]) this.shieldRings[2].rotation.x += safeDt * 1.9;
      if (this.shieldRings[3]) this.shieldRings[3].rotation.y += safeDt * 0.9;
      for (let i = 0; i < this.shieldNodes.length; i++) {
        const ang = this.animTime * 3.2 + (i * Math.PI * 2) / this.shieldNodes.length;
        const elev = Math.sin(this.animTime * 2.5 + i) * 0.45;
        this.shieldNodes[i].position.set(
          Math.cos(ang) * 1.18,
          elev,
          Math.sin(ang) * 1.18,
        );
        this.shieldNodes[i].rotation.y += safeDt * 4;
      }
    }

    // 2. Metal Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += safeDt;
      p.pos.addScaledVector(p.vel, safeDt);
      p.group.position.copy(p.pos);
      p.group.children[0].rotation.x += p.spin.x * safeDt;
      p.group.children[0].rotation.y += p.spin.y * safeDt;
      p.group.children[0].rotation.z += p.spin.z * safeDt;

      this._tmpA.set(-0.35, -0.1, -0.35);
      this._tmpB.set(0.35, 0.1, 0.35);
      this.randomizeLightning(p.arcLine, this._tmpA, this._tmpB, 0.38);

      let hitTargetId: string | null = null;
      for (const t of targets) {
        const dx = p.pos.x - t.position.x;
        const dy = p.pos.y - (t.position.y + 1.0);
        const dz = p.pos.z - t.position.z;
        if (dx * dx + dy * dy + dz * dz <= 0.85 * 0.85) {
          hitTargetId = t.id;
          break;
        }
      }

      if (hitTargetId) {
        this._tmpDir.copy(p.vel).setY(0).normalize();
        callbacks.onProjectileHit(hitTargetId, this._tmpDir, 30);
        this.spawnImpactBurst(p.pos, 1.9, 6);
        this.disposeProjectile(p);
        this.projectiles.splice(i, 1);
      } else if (p.pos.y <= 0.14 || p.age >= p.maxAge) {
        this.spawnImpactBurst(p.pos, 1.8, 6);
        this.disposeProjectile(p);
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Magnetic Meteor
    if (this.meteorState) {
      const ms = this.meteorState;
      ms.elapsed += safeDt;
      if (ms.phase === 'gathering') {
        const u = Math.min(1, ms.elapsed / ms.gatherDuration);
        const gatherCenter = this._tmpPos.set(playerPos.x, playerPos.y + 4.15, playerPos.z);
        ms.coreGroup.position.copy(gatherCenter);
        ms.coreSphere.scale.setScalar(0.18 + u * 1.12);
        ms.coreSphere.rotation.y += safeDt * 2.2;

        for (const s of ms.shards) {
          const rotAng = this.animTime * s.orbitSpeed;
          const shrink = Math.pow(1 - u, 0.8);
          const ox =
            (s.startOffset.x * Math.cos(rotAng) - s.startOffset.z * Math.sin(rotAng)) *
            shrink;
          const oz =
            (s.startOffset.x * Math.sin(rotAng) + s.startOffset.z * Math.cos(rotAng)) *
            shrink;
          const oy = s.startOffset.y * shrink;
          s.mesh.position.set(ox, oy, oz);
          s.mesh.rotation.x += safeDt * 6;
          s.mesh.rotation.y += safeDt * 5;
          s.mesh.scale.setScalar(1 - u * 0.35);
        }

        this._tmpB.set(0, 0, 0);
        for (const b of ms.bolts) {
          const ang = Math.random() * Math.PI * 2;
          this._tmpA.set(Math.cos(ang) * 2.2, -1.5, Math.sin(ang) * 2.2);
          this.randomizeLightning(b, this._tmpA, this._tmpB, 0.55);
        }

        if (u >= 1) {
          ms.phase = 'launching';
          ms.startPos.copy(gatherCenter);
          ms.currentPos.copy(gatherCenter);
          callbacks.onMeteorLaunch?.();
        }
      } else {
        const toTarget = this._tmpDir.copy(ms.targetPos).sub(ms.currentPos);
        const dist = toTarget.length();
        const step = ms.launchSpeed * safeDt;
        ms.coreSphere.rotation.x += safeDt * 6;
        ms.coreSphere.rotation.z += safeDt * 4;
        this._tmpA.set(-1.3, 0.4, -1.3);
        this._tmpB.set(1.3, -0.4, 1.3);
        for (const b of ms.bolts) {
          this.randomizeLightning(b, this._tmpA, this._tmpB, 0.7);
        }

        if (step >= dist || ms.currentPos.y <= 0.55) {
          const impact = this._tmpPos.copy(ms.targetPos);
          impact.y = Math.max(0.1, impact.y);
          this.spawnImpactBurst(impact, 6.2, 22);
          callbacks.onMeteorImpact(impact);
          this.disposeMeteor();
        } else {
          ms.currentPos.addScaledVector(toTarget.normalize(), step);
          ms.coreGroup.position.copy(ms.currentPos);
        }
      }
    }

    // 4. Metal Tornado
    if (this.tornadoActive) {
      this.tornadoGroup.position.copy(playerPos);
      for (const d of this.tornadoDebris) {
        d.angle += d.speed * safeDt;
        const bob = Math.sin(this.animTime * 4 + d.bobPhase) * 0.25;
        d.mesh.position.set(
          Math.cos(d.angle) * d.radius,
          d.height + bob,
          Math.sin(d.angle) * d.radius,
        );
        d.mesh.rotation.x += d.selfSpin.x * safeDt;
        d.mesh.rotation.y += d.selfSpin.y * safeDt;
        d.mesh.rotation.z += d.selfSpin.z * safeDt;
      }

      for (let b = 0; b < this.tornadoBolts.length; b++) {
        const a0 = this.animTime * 7 + (b * Math.PI * 2) / this.tornadoBolts.length;
        const a1 = a0 + 0.9;
        this._tmpA.set(Math.cos(a0) * 1.9, 0.35, Math.sin(a0) * 1.9);
        this._tmpB.set(Math.cos(a1) * 4.9, 4.3, Math.sin(a1) * 4.9);
        this.randomizeLightning(this.tornadoBolts[b], this._tmpA, this._tmpB, 0.72);
      }

      // Continuous pull & orbit damage
      this.tornadoDamageTimer += safeDt;
      const shouldTickDamage = this.tornadoDamageTimer >= 0.6;
      if (shouldTickDamage) {
        this.tornadoDamageTimer -= 0.6;
      }

      this._activeIds.clear();
      for (const t of targets) {
        const distHz = Math.hypot(t.position.x - playerPos.x, t.position.z - playerPos.z);
        if (distHz <= 8.5 || this.tornadoOrbits.has(t.id)) {
          if (distHz <= 9.6) {
            this._activeIds.add(t.id);
            let orb = this.tornadoOrbits.get(t.id);
            if (!orb) {
              orb = {
                angle: Math.atan2(t.position.z - playerPos.z, t.position.x - playerPos.x),
                angVel: (Math.random() > 0.5 ? 1 : -1) * (3.6 + Math.random() * 2.2),
                radius: 2.2 + Math.random() * 2.0,
                height: 0.75 + Math.random() * 1.55,
                bobPhase: Math.random() * Math.PI * 2,
              };
              this.tornadoOrbits.set(t.id, orb);
            }
            orb.angle += orb.angVel * safeDt;
            this._tmpPos.set(
              playerPos.x + Math.cos(orb.angle) * orb.radius,
              orb.height + Math.sin(this.animTime * 5 + orb.bobPhase) * 0.45,
              playerPos.z + Math.sin(orb.angle) * orb.radius,
            );
            callbacks.onTornadoControl?.(
              t.id,
              this._tmpPos,
              orb.angle + Math.PI * 0.5,
              shouldTickDamage ? 8 : 0,
            );
          }
        }
      }

      for (const prevId of this.tornadoOrbits.keys()) {
        if (!this._activeIds.has(prevId)) {
          this.tornadoOrbits.delete(prevId);
          callbacks.onTornadoRelease?.(prevId);
        }
      }
    } else if (this.tornadoOrbits.size > 0) {
      for (const id of this.tornadoOrbits.keys()) {
        callbacks.onTornadoRelease?.(id);
      }
      this.tornadoOrbits.clear();
      this.tornadoReleasedIds.clear();
    }

    // 5. Impact Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += safeDt;
      const p = Math.min(1, b.age / b.duration);
      const r = 0.5 + p * b.maxRadius;
      b.ring.scale.setScalar(r);
      (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;

      for (const s of b.shards) {
        s.vel.y -= 18 * safeDt;
        s.mesh.position.addScaledVector(s.vel, safeDt);
        if (s.mesh.position.y < 0.08) {
          s.mesh.position.y = 0.08;
          s.vel.y *= -0.35;
          s.vel.x *= 0.7;
          s.vel.z *= 0.7;
        }
        s.mesh.rotation.x += s.spin.x * safeDt;
        s.mesh.rotation.y += s.spin.y * safeDt;
        s.mesh.scale.setScalar(Math.max(0.01, (1 - p) * 0.85));
      }

      if (p >= 1) {
        this.disposeBurst(b);
        this.bursts.splice(i, 1);
      }
    }
  }

  private disposeProjectile(p: MetalProjectile): void {
    this.group.remove(p.group);
    p.arcLine.geometry.dispose();
    const glow = p.group.children[1] as THREE.Sprite | undefined;
    if (glow) (glow.material as THREE.Material).dispose();
  }

  private disposeBurst(b: ImpactBurst): void {
    this.group.remove(b.group);
    (b.ring.material as THREE.Material).dispose();
  }

  private disposeMeteor(): void {
    const ms = this.meteorState;
    if (!ms) return;
    this.group.remove(ms.coreGroup);
    (ms.aura.material as THREE.Material).dispose();
    for (const b of ms.bolts) b.geometry.dispose();
    this.meteorState = null;
  }

  public clearAll(onReleaseNpc?: (id: string) => void): void {
    this.shieldActive = false;
    this.shieldBlend = 0;
    this.shieldGroup.visible = false;
    this.tornadoActive = false;
    this.tornadoGroup.visible = false;
    if (onReleaseNpc) {
      for (const id of this.tornadoOrbits.keys()) {
        onReleaseNpc(id);
      }
    }
    this.tornadoOrbits.clear();
    this.disposeMeteor();
    for (const p of this.projectiles) this.disposeProjectile(p);
    this.projectiles.length = 0;
    for (const b of this.bursts) this.disposeBurst(b);
    this.bursts.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.impactRingGeo.dispose();
    this.meteorCoreGeo.dispose();
    for (const r of this.shieldRings) {
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    }
    if (this.shieldNodes[0]) {
      this.shieldNodes[0].geometry.dispose();
    }
    for (const l of this.tornadoBolts) l.geometry.dispose();
    this.metalMat.dispose();
    this.darkMetalMat.dispose();
    this.purpleCoreMat.dispose();
    this.lightningMat.dispose();
  }
}
