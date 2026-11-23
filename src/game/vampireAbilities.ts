import * as THREE from 'three';
import { getGroundSurfaceY, hasLineOfSight } from './physics';
import type { CombatTargetProbe } from './scarletWitchAbilities';

interface EnergyBolt {
  kind: 'energy' | 'bullet';
  mesh: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  tailMat: THREE.MeshBasicMaterial;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  dmgBonus: number;
  trailAccum: number;
}

interface GoldSpark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  startScale: number;
}

interface ImpactWave {
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  flash: THREE.Mesh;
  flashMat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxRadius: number;
}

interface SiphonOrb {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  speed: number;
  arcOffset: THREE.Vector3;
}

const MAX_WIND_STREAKS = 26;

interface WindStreak {
  x: number;
  y: number;
  z: number;
  length: number;
  speedMul: number;
}

/**
 * Vampire (Rogue) Visual Effects System:
 * 1. White wind-line speed trails during Super Flight & Ground Stomp dive
 * 2. Golden-yellow Energy Projectile + impact burst
 * 3. Ground Stomp golden-white shockwave impact
 * 4. Power Absorption golden siphon beam + flowing orbs & emerald-gold self-heal particles
 */
export class VampireVfxSystem {
  public readonly group = new THREE.Group();

  private readonly bolts: EnergyBolt[] = [];
  private readonly sparks: GoldSpark[] = [];
  private readonly waves: ImpactWave[] = [];

  // Shared lightweight geometries
  private readonly orbGeo = new THREE.SphereGeometry(0.085, 10, 8);
  private readonly tailGeo = new THREE.ConeGeometry(0.085, 0.56, 8);
  private readonly sparkGeo = new THREE.OctahedronGeometry(0.085, 0);
  private readonly ringGeo = new THREE.RingGeometry(0.45, 0.72, 28);
  private readonly flashGeo = new THREE.SphereGeometry(0.45, 12, 10);

  // White Wind-Line Speed Trails (Super Flight & Ground Stomp Dive)
  private readonly windStreaks: WindStreak[] = [];
  private readonly windPositions: Float32Array;
  private readonly windPosAttr: THREE.BufferAttribute;
  private readonly windMat: THREE.LineBasicMaterial;
  private readonly windLines: THREE.LineSegments;
  private windIntensity = 0;

  // Power Absorption Siphon Beam + Flowing Orbs + Heal Ring
  private readonly siphonGroup = new THREE.Group();
  private readonly siphonCore: THREE.Mesh;
  private readonly siphonCoreMat: THREE.MeshBasicMaterial;
  private readonly siphonGlow: THREE.Mesh;
  private readonly siphonGlowMat: THREE.MeshBasicMaterial;
  private readonly siphonOrbs: SiphonOrb[] = [];
  private readonly healRing: THREE.Mesh;
  private readonly healRingMat: THREE.MeshBasicMaterial;
  private healSparkAccum = 0;
  private siphonTime = 0;

  private readonly _dir = new THREE.Vector3();
  private readonly _mid = new THREE.Vector3();
  private readonly _seg = new THREE.Vector3();
  private readonly _perpA = new THREE.Vector3();
  private readonly _perpB = new THREE.Vector3();
  private readonly _upAxis = new THREE.Vector3(0, 1, 0);
  private readonly _tmpColor = new THREE.Color();

  constructor() {
    this.ringGeo.rotateX(-Math.PI / 2);

    // 1. White Wind-Line Trails
    this.windPositions = new Float32Array(MAX_WIND_STREAKS * 2 * 3);
    this.windPosAttr = new THREE.BufferAttribute(this.windPositions, 3);
    this.windPosAttr.setUsage(THREE.DynamicDrawUsage);
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', this.windPosAttr);
    this.windMat = new THREE.LineBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.windLines = new THREE.LineSegments(windGeo, this.windMat);
    this.windLines.frustumCulled = false;
    this.windLines.visible = false;
    this.group.add(this.windLines);

    for (let i = 0; i < MAX_WIND_STREAKS; i++) {
      this.windStreaks.push({
        x: (Math.random() - 0.5) * 2.2,
        y: (Math.random() - 0.15) * 1.9,
        z: (Math.random() - 0.5) * 2.4,
        length: 0.9 + Math.random() * 1.45,
        speedMul: 0.75 + Math.random() * 0.55,
      });
    }

    // 2. Power Absorption Beam & Heal Aura
    const cylGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 8, 1, true);
    this.siphonCoreMat = new THREE.MeshBasicMaterial({
      color: '#FFF6B8',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.siphonCore = new THREE.Mesh(cylGeo, this.siphonCoreMat);
    this.siphonGroup.add(this.siphonCore);

    const outerCylGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 8, 1, true);
    this.siphonGlowMat = new THREE.MeshBasicMaterial({
      color: '#FFD028',
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.siphonGlow = new THREE.Mesh(outerCylGeo, this.siphonGlowMat);
    this.siphonGroup.add(this.siphonGlow);

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFE666' : '#64F58D',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.scale.setScalar(1.25);
      this.siphonGroup.add(mesh);
      const angle = (i / 8) * Math.PI * 2;
      this.siphonOrbs.push({
        mesh,
        mat,
        t: i / 8,
        speed: 1.35 + (i % 3) * 0.25,
        arcOffset: new THREE.Vector3(Math.cos(angle) * 0.22, Math.sin(angle) * 0.18, 0),
      });
    }

    this.healRingMat = new THREE.MeshBasicMaterial({
      color: '#5BFF95',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.healRing = new THREE.Mesh(this.ringGeo, this.healRingMat);
    this.siphonGroup.add(this.healRing);

    this.siphonGroup.visible = false;
    this.group.add(this.siphonGroup);
  }

  public spawnEnergyProjectile(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    dmgBonus = 0,
  ): void {
    const dir = this._dir.subVectors(target, origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    const mesh = new THREE.Group();
    mesh.position.copy(origin);

    const coreMat = new THREE.MeshBasicMaterial({
      color: '#FFFDE0',
      transparent: true,
      opacity: 0.98,
    });
    const core = new THREE.Mesh(this.orbGeo, coreMat);
    mesh.add(core);

    const haloMat = new THREE.MeshBasicMaterial({
      color: '#FFD419',
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(this.orbGeo, haloMat);
    halo.scale.setScalar(1.6);
    mesh.add(halo);

    const tailMat = new THREE.MeshBasicMaterial({
      color: '#FFE033',
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tail = new THREE.Mesh(this.tailGeo, tailMat);
    this._mid.copy(dir).negate();
    tail.quaternion.setFromUnitVectors(this._upAxis, this._mid);
    tail.position.copy(dir).multiplyScalar(-0.26);
    mesh.add(tail);

    this.group.add(mesh);

    this.bolts.push({
      kind: 'energy',
      mesh,
      coreMat,
      haloMat,
      tailMat,
      pos: origin.clone(),
      prevPos: origin.clone(),
      vel: dir.clone().multiplyScalar(50),
      age: 0,
      maxAge: 1.05,
      dmgBonus,
      trailAccum: 0,
    });

    this.spawnBurstSparks(origin, '#FFE033', 5, 2.8, 0.22);
  }

  public spawnBanditBullet(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    dmgBonus = 0,
  ): void {
    const dir = this._dir.subVectors(target, origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    const mesh = new THREE.Group();
    mesh.position.copy(origin);
    mesh.lookAt(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);

    const coreMat = new THREE.MeshBasicMaterial({
      color: '#FFF4B8',
      transparent: true,
      opacity: 0.98,
    });
    const core = new THREE.Mesh(this.orbGeo, coreMat);
    core.scale.set(0.55, 0.55, 2.2);
    mesh.add(core);

    const haloMat = new THREE.MeshBasicMaterial({
      color: '#FFA826',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(this.orbGeo, haloMat);
    halo.scale.set(0.95, 0.95, 2.8);
    mesh.add(halo);

    const tailMat = new THREE.MeshBasicMaterial({
      color: '#FFCC33',
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tail = new THREE.Mesh(this.tailGeo, tailMat);
    tail.rotation.x = Math.PI * 0.5;
    tail.position.z = -0.32;
    mesh.add(tail);

    this.group.add(mesh);

    this.bolts.push({
      kind: 'bullet',
      mesh,
      coreMat,
      haloMat,
      tailMat,
      pos: origin.clone(),
      prevPos: origin.clone(),
      vel: dir.clone().multiplyScalar(42),
      age: 0,
      maxAge: 0.95,
      dmgBonus,
      trailAccum: 0,
    });

    this.spawnBurstSparks(origin, '#FFB833', 4, 2.4, 0.16);
  }

  public spawnGroundStompImpact(center: THREE.Vector3): void {
    this.spawnWave(center, '#FFE26A', 4.8, 0.42);
    this.spawnBurstSparks(center, '#FFF5B8', 16, 7.2, 0.44, true);
    this.spawnBurstSparks(center, '#FFBF1A', 12, 5.4, 0.48, true);
  }

  public spawnProjectileImpact(center: THREE.Vector3): void {
    this.spawnWave(center, '#FFD638', 1.85, 0.28);
    this.spawnBurstSparks(center, '#FFE97A', 12, 5.0, 0.36);
  }

  private spawnWave(
    center: THREE.Vector3,
    color: string,
    maxRadius: number,
    maxAge: number,
  ): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.set(center.x, center.y + 0.08, center.z);
    ring.scale.setScalar(0.3);
    this.group.add(ring);

    const flashMat = new THREE.MeshBasicMaterial({
      color: '#FFF9D6',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flash = new THREE.Mesh(this.flashGeo, flashMat);
    flash.position.set(center.x, center.y + 0.25, center.z);
    flash.scale.setScalar(0.5);
    this.group.add(flash);

    this.waves.push({ ring, ringMat, flash, flashMat, age: 0, maxAge, maxRadius });
  }

  private spawnBurstSparks(
    origin: THREE.Vector3,
    color: string,
    count: number,
    speed: number,
    maxAge: number,
    upwardBias = false,
  ): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.94,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(origin);
      const startScale = 0.75 + Math.random() * 0.75;
      mesh.scale.setScalar(startScale);
      this.group.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const elev = upwardBias
        ? 0.28 + Math.random() * 0.75
        : (Math.random() - 0.35) * 0.9;
      const spd = speed * (0.45 + Math.random() * 0.65);
      const vel = new THREE.Vector3(
        Math.cos(theta) * spd * Math.cos(elev * 0.8),
        Math.sin(elev) * spd + (upwardBias ? 1.8 : 0.4),
        Math.sin(theta) * spd * Math.cos(elev * 0.8),
      );
      this.sparks.push({ mesh, mat, vel, age: 0, maxAge, startScale });
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    windActive: boolean,
    windDiving: boolean,
    absorbState: {
      active: boolean;
      handWorld: THREE.Vector3;
      targetWorld: THREE.Vector3;
      healerPos: THREE.Vector3;
    },
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onBoltHit: (
      targetId: string | null,
      hitDir: THREE.Vector3,
      hitPos: THREE.Vector3,
      dmgBonus: number,
      kind: 'energy' | 'bullet',
    ) => void,
  ): void {
    // 1. White Wind-Line Trails during Super Flight or Ground Stomp Dive
    const targetWind = windActive ? (windDiving ? 1.0 : 0.78) : 0;
    this.windIntensity = THREE.MathUtils.damp(this.windIntensity, targetWind, 10, dt);

    if (this.windIntensity > 0.03) {
      this.windLines.visible = true;
      this.windMat.opacity = Math.min(0.86, this.windIntensity * 0.82);

      // Travel opposite to player velocity (or trailing behind rig if nearly hovering)
      this._dir.copy(playerVel);
      const spd = this._dir.length();
      if (spd > 0.4) {
        this._dir.divideScalar(spd);
      } else {
        this._dir.set(0, 0, -1);
      }

      // Basis vectors perpendicular to velocity
      if (Math.abs(this._dir.y) < 0.92) {
        this._perpA.crossVectors(this._dir, this._upAxis).normalize();
      } else {
        this._perpA.set(1, 0, 0);
      }
      this._perpB.crossVectors(this._perpA, this._dir).normalize();

      const streamRate = (windDiving ? 28 : 16 + spd * 0.85) * dt;
      const lenScale = windDiving ? 1.45 : Math.max(0.6, Math.min(1.45, spd / 11.5));

      for (let i = 0; i < MAX_WIND_STREAKS; i++) {
        const s = this.windStreaks[i];
        s.z -= streamRate * s.speedMul;
        if (s.z < -2.4) {
          s.z = 1.8 + Math.random() * 0.9;
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.42 + Math.random() * 0.95;
          s.x = Math.cos(angle) * radius;
          s.y = Math.sin(angle) * radius;
          s.length = 0.75 + Math.random() * 1.25;
        }

        const baseX =
          playerPos.x +
          this._perpA.x * s.x +
          this._perpB.x * s.y +
          this._dir.x * s.z;
        const baseY =
          playerPos.y +
          1.05 +
          this._perpA.y * s.x +
          this._perpB.y * s.y +
          this._dir.y * s.z;
        const baseZ =
          playerPos.z +
          this._perpA.z * s.x +
          this._perpB.z * s.y +
          this._dir.z * s.z;

        const segLen = s.length * lenScale;
        const idx = i * 6;
        this.windPositions[idx] = baseX;
        this.windPositions[idx + 1] = baseY;
        this.windPositions[idx + 2] = baseZ;
        this.windPositions[idx + 3] = baseX - this._dir.x * segLen;
        this.windPositions[idx + 4] = baseY - this._dir.y * segLen;
        this.windPositions[idx + 5] = baseZ - this._dir.z * segLen;
      }
      this.windPosAttr.needsUpdate = true;
    } else {
      this.windLines.visible = false;
    }

    // 2. Energy Projectiles (swept collision against probes, world geometry & ground)
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.age += dt;
      b.prevPos.copy(b.pos);
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      const pulse = 1 + Math.sin(b.age * 34) * 0.14;
      b.mesh.scale.setScalar(pulse);

      b.trailAccum += dt;
      if (b.trailAccum >= 0.009) {
        b.trailAccum = 0;
        this.spawnBurstSparks(b.pos, '#FFE94A', 2, 1.3, 0.16);
      }

      let hitTargetId: string | null = null;
      let hitPos: THREE.Vector3 | null = null;

      // Swept segment vs probe spheres
      this._seg.subVectors(b.pos, b.prevPos);
      const segLenSq = Math.max(1e-6, this._seg.lengthSq());
      let bestDistSq = Infinity;
      for (let j = 0; j < targetProbes.length; j++) {
        const probe = targetProbes[j];
        const centerY = probe.position.y + 0.95;
        const t = THREE.MathUtils.clamp(
          ((probe.position.x - b.prevPos.x) * this._seg.x +
            (centerY - b.prevPos.y) * this._seg.y +
            (probe.position.z - b.prevPos.z) * this._seg.z) /
            segLenSq,
          0,
          1,
        );
        const cx = b.prevPos.x + this._seg.x * t;
        const cy = b.prevPos.y + this._seg.y * t;
        const cz = b.prevPos.z + this._seg.z * t;
        const dx = cx - probe.position.x;
        const dy = cy - centerY;
        const dz = cz - probe.position.z;
        const hitR = probe.radius + 0.28;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq <= hitR * hitR && dSq < bestDistSq) {
          bestDistSq = dSq;
          hitTargetId = probe.id;
          hitPos = new THREE.Vector3(cx, cy, cz);
        }
      }

      const groundY = getGroundSurfaceY(b.pos.x, b.pos.z, b.pos.y + 0.4);
      const hitObstacle = !hasLineOfSight(
        b.prevPos.x,
        b.prevPos.y,
        b.prevPos.z,
        b.pos.x,
        b.pos.y,
        b.pos.z,
      );
      const hitGround = b.pos.y <= groundY + 0.08;

      if (hitPos || hitObstacle || hitGround || b.age >= b.maxAge) {
        const impactPos = hitPos ?? b.pos.clone();
        if (hitGround && !hitPos) impactPos.y = groundY + 0.08;
        const hitDir = this._dir.copy(b.vel).setY(0);
        if (hitDir.lengthSq() > 0.001) hitDir.normalize();
        else hitDir.set(0, 0, -1);

        if (hitTargetId || hitObstacle || hitGround) {
          this.spawnProjectileImpact(impactPos);
          onBoltHit(hitTargetId, hitDir.clone(), impactPos, b.dmgBonus, b.kind);
        }

        this.group.remove(b.mesh);
        b.coreMat.dispose();
        b.haloMat.dispose();
        b.tailMat.dispose();
        this.bolts.splice(i, 1);
      }
    }

    // 3. Power Absorption Beam & Healing Aura
    if (absorbState.active) {
      this.siphonGroup.visible = true;
      this.siphonTime += dt;

      const start = absorbState.targetWorld;
      const end = absorbState.handWorld;
      const delta = this._seg.subVectors(end, start);
      const dist = Math.max(0.05, delta.length());
      this._mid.addVectors(start, end).multiplyScalar(0.5);

      const dirNorm = this._dir.copy(delta).divideScalar(dist);
      this.siphonCore.position.copy(this._mid);
      this.siphonCore.quaternion.setFromUnitVectors(this._upAxis, dirNorm);
      const pulse = 0.85 + Math.sin(this.siphonTime * 22) * 0.25;
      this.siphonCore.scale.set(pulse, dist, pulse);

      this.siphonGlow.position.copy(this._mid);
      this.siphonGlow.quaternion.copy(this.siphonCore.quaternion);
      this.siphonGlow.scale.set(pulse * 1.25, dist, pulse * 1.25);

      for (let i = 0; i < this.siphonOrbs.length; i++) {
        const o = this.siphonOrbs[i];
        o.t = (o.t + dt * o.speed) % 1;
        const arc = Math.sin(o.t * Math.PI);
        o.mesh.position.lerpVectors(start, end, o.t);
        o.mesh.position.y += arc * 0.22;
        o.mesh.position.x += Math.cos(o.t * 8 + this.siphonTime * 9 + i) * 0.14 * arc;
        o.mesh.position.z += Math.sin(o.t * 8 + this.siphonTime * 9 + i) * 0.14 * arc;
        o.mat.opacity = 0.35 + arc * 0.65;
      }

      // Soft pulsing emerald-gold heal ring under Vampire
      const healPos = absorbState.healerPos;
      this.healRing.position.set(healPos.x, healPos.y + 0.08, healPos.z);
      const ringScale = 0.95 + Math.sin(this.siphonTime * 6.5) * 0.15;
      this.healRing.scale.setScalar(ringScale);
      this.healRingMat.opacity = 0.48 + Math.sin(this.siphonTime * 8) * 0.18;

      this.healSparkAccum += dt;
      if (this.healSparkAccum >= 0.085) {
        this.healSparkAccum = 0;
        const angle = Math.random() * Math.PI * 2;
        const rad = 0.28 + Math.random() * 0.36;
        const spPos = new THREE.Vector3(
          healPos.x + Math.cos(angle) * rad,
          healPos.y + 0.18 + Math.random() * 0.9,
          healPos.z + Math.sin(angle) * rad,
        );
        this.spawnBurstSparks(
          spPos,
          Math.random() > 0.38 ? '#5BFF95' : '#FFE466',
          1,
          1.35,
          0.55,
          true,
        );
      }
    } else {
      this.siphonGroup.visible = false;
      this.siphonTime = 0;
    }

    // 4. Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      const p = s.age / s.maxAge;
      if (p >= 1) {
        this.group.remove(s.mesh);
        s.mat.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      s.mesh.position.addScaledVector(s.vel, dt);
      s.vel.multiplyScalar(1 - Math.min(0.6, dt * 3.0));
      s.mesh.rotation.y += dt * 7;
      s.mesh.rotation.x += dt * 5;
      s.mesh.scale.setScalar(s.startScale * (1 - p * 0.72));
      s.mat.opacity = 0.92 * (1 - p);
    }

    // 5. Impact Shockwaves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.age += dt;
      const p = w.age / w.maxAge;
      if (p >= 1) {
        this.group.remove(w.ring);
        this.group.remove(w.flash);
        w.ringMat.dispose();
        w.flashMat.dispose();
        this.waves.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - p, 2);
      w.ring.scale.setScalar(0.35 + ease * w.maxRadius);
      w.ringMat.opacity = 0.9 * (1 - p);
      w.flash.scale.setScalar(0.55 + ease * (w.maxRadius * 0.42));
      w.flashMat.opacity = 0.72 * Math.pow(1 - p, 1.8);
    }

    void this._tmpColor;
  }

  public clearAll(): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      this.group.remove(b.mesh);
      b.coreMat.dispose();
      b.haloMat.dispose();
      b.tailMat.dispose();
    }
    this.bolts.length = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      this.group.remove(s.mesh);
      s.mat.dispose();
    }
    this.sparks.length = 0;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      this.group.remove(w.ring);
      this.group.remove(w.flash);
      w.ringMat.dispose();
      w.flashMat.dispose();
    }
    this.waves.length = 0;
    this.siphonGroup.visible = false;
    this.windLines.visible = false;
    this.windIntensity = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.orbGeo.dispose();
    this.tailGeo.dispose();
    this.sparkGeo.dispose();
    this.ringGeo.dispose();
    this.flashGeo.dispose();
    this.windLines.geometry.dispose();
    this.windMat.dispose();
    this.siphonCore.geometry.dispose();
    this.siphonCoreMat.dispose();
    this.siphonGlow.geometry.dispose();
    this.siphonGlowMat.dispose();
    this.healRingMat.dispose();
    for (const o of this.siphonOrbs) {
      o.mat.dispose();
    }
  }
}
