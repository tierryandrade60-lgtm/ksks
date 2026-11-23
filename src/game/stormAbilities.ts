import * as THREE from 'three';
import { getGroundSurfaceY, hasLineOfSight } from './physics';
import type { CombatTargetProbe } from './scarletWitchAbilities';

interface LightningBoltVisual {
  segments: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  age: number;
  maxAge: number;
}

interface ElectricFlash {
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  core: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface StormParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  age: number;
  maxAge: number;
  gravity: number;
}

interface ActiveIceSpear {
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface WindStreak {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface TornadoSwirlParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  angle: number;
  angularSpeed: number;
  height: number;
  maxHeight: number;
  riseSpeed: number;
  baseRadius: number;
  rotVel: THREE.Vector3;
  baseOpacity: number;
  isLeaf: boolean;
}

interface TornadoCaughtEnemy {
  angle: number;
  angularSpeed: number;
  orbitRadius: number;
  baseLift: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmp: number;
  spinYaw: number;
  spinRate: number;
  tiltPitch: number;
  tiltRoll: number;
}

function buildIceSpearMesh(): {
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
} {
  const g = new THREE.Group();
  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#A6EBFF',
    emissive: '#38BDF8',
    emissiveIntensity: 0.72,
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.94,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#E8FAFF',
    emissive: '#8CE8FF',
    emissiveIntensity: 0.95,
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.96,
  });

  // Main long sharp ice blade pointed toward +Z so lookAt aims straight forward
  const tipGeo = new THREE.ConeGeometry(0.145, 0.72, 6);
  tipGeo.rotateX(Math.PI * 0.5);
  const tip = new THREE.Mesh(tipGeo, coreMat);
  tip.position.z = 0.62;
  g.add(tip);

  const shaftGeo = new THREE.CylinderGeometry(0.115, 0.055, 1.05, 6);
  shaftGeo.rotateX(Math.PI * 0.5);
  const shaft = new THREE.Mesh(shaftGeo, crystalMat);
  shaft.position.z = -0.22;
  g.add(shaft);

  // Jagged side ice crystal barbs near hilt
  const barbGeo = new THREE.ConeGeometry(0.065, 0.34, 5);
  for (let i = 0; i < 4; i++) {
    const barb = new THREE.Mesh(barbGeo, crystalMat);
    const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    barb.position.set(Math.cos(ang) * 0.11, Math.sin(ang) * 0.11, -0.05);
    barb.rotation.z = ang - Math.PI * 0.5;
    barb.rotation.x = 0.42;
    g.add(barb);
  }

  return { group: g, mats: [crystalMat, coreMat] };
}

export class StormVfxSystem {
  public readonly group = new THREE.Group();

  private readonly rectUnitGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly planeUnitGeo = new THREE.PlaneGeometry(1, 1);
  private readonly sphereGeo = new THREE.SphereGeometry(0.38, 12, 12);
  private readonly ringGeo = new THREE.RingGeometry(0.42, 0.86, 32);
  private readonly shardGeo = new THREE.OctahedronGeometry(0.14, 0);
  private readonly leafGeo = new THREE.PlaneGeometry(0.28, 0.14);

  // Purely wind, particle & swirling leaf tornado funnel (zero solid 3D rings)
  private readonly tornadoSwirls: TornadoSwirlParticle[] = [];
  private readonly caughtTargets = new Map<string, TornadoCaughtEnemy>();

  // Ice Spear creation preview beside Storm's right side
  private readonly spearPreview: { group: THREE.Group; mats: THREE.MeshStandardMaterial[] };
  private readonly spearRing: THREE.Mesh;
  private readonly spearRingMat: THREE.MeshBasicMaterial;

  // Dynamic pools
  private readonly bolts: LightningBoltVisual[] = [];
  private readonly flashes: ElectricFlash[] = [];
  private readonly particles: StormParticle[] = [];
  private readonly iceSpears: ActiveIceSpear[] = [];
  private readonly windStreaks: WindStreak[] = [];

  private time = 0;
  private flightAccum = 0;
  private tornadoTickTimer = 0;
  private tornadoSpawnAccum = 0;
  private windBlastTickTimer = 0;
  private windBlastSpawnAccum = 0;

  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpMid = new THREE.Vector3();
  private readonly _tmpRight = new THREE.Vector3();
  private readonly _tmpHead = new THREE.Vector3();
  private readonly _tmpPosePos = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.ringGeo.rotateX(-Math.PI * 0.5);

    // Ice Spear creation preview
    this.spearPreview = buildIceSpearMesh();
    this.spearRingMat = new THREE.MeshBasicMaterial({
      color: '#BAE6FD',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spearRing = new THREE.Mesh(this.ringGeo, this.spearRingMat);
    this.spearRing.rotation.x = Math.PI * 0.5;
    this.spearPreview.group.add(this.spearRing);
    this.spearPreview.group.visible = false;
    this.group.add(this.spearPreview.group);
  }

  public updateFlightWind(
    flying: boolean,
    pos: THREE.Vector3,
    moveSpeed: number,
    dt: number,
  ): void {
    if (!flying) {
      this.flightAccum = 0;
      return;
    }
    this.flightAccum += dt * (moveSpeed > 2 ? 18 : 7);
    while (this.flightAccum >= 1) {
      this.flightAccum -= 1;
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.35 ? '#E6F6FF' : '#9FE2FF',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const streak = new THREE.Mesh(this.planeUnitGeo, mat);
      streak.position.set(
        pos.x + (Math.random() - 0.5) * 1.1,
        pos.y + 0.15 + Math.random() * 1.1,
        pos.z + (Math.random() - 0.5) * 1.1,
      );
      streak.scale.set(0.65 + Math.random() * 0.7, 0.045, 1);
      streak.rotation.y = Math.random() * Math.PI;
      this.group.add(streak);
      this.windStreaks.push({
        mesh: streak,
        mat,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          0.35 + Math.random() * 0.7,
          (Math.random() - 0.5) * 2.2,
        ),
        age: 0,
        maxAge: 0.35,
      });
    }
  }

  public spawnLightningStrike(handOrigin: THREE.Vector3, impactPos: THREE.Vector3): void {
    this.createJaggedYellowBolt(handOrigin, impactPos, 8, 0.1, 0.32);

    const skyStart = new THREE.Vector3(
      impactPos.x + (Math.random() - 0.5) * 2.4,
      impactPos.y + 22,
      impactPos.z + (Math.random() - 0.5) * 2.4,
    );
    this.createJaggedYellowBolt(skyStart, impactPos, 11, 0.16, 0.4);

    for (let b = 0; b < 3; b++) {
      const branchStart = skyStart.clone().lerp(impactPos, 0.35 + b * 0.2);
      const branchEnd = branchStart.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          -2.4 - Math.random() * 2.5,
          (Math.random() - 0.5) * 4.5,
        ),
      );
      this.createJaggedYellowBolt(branchStart, branchEnd, 5, 0.06, 0.28);
    }

    const ringMat = new THREE.MeshBasicMaterial({
      color: '#FFF4A3',
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.set(impactPos.x, impactPos.y + 0.1, impactPos.z);

    const coreMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.position.copy(impactPos);
    core.position.y += 0.28;

    this.group.add(ring, core);
    this.flashes.push({
      ring,
      ringMat,
      core,
      coreMat,
      age: 0,
      maxAge: 0.44,
      maxScale: 4.8,
    });

    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFFDE2' : '#FFE047',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.shardGeo, mat);
      mesh.position.copy(impactPos);
      mesh.position.y += 0.25;
      mesh.scale.setScalar(0.65);
      this.group.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const spd = 4.5 + Math.random() * 8.5;
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(Math.cos(ang) * spd, 2.5 + Math.random() * 6, Math.sin(ang) * spd),
        rotVel: new THREE.Vector3(8, 8, 8),
        age: 0,
        maxAge: 0.42 + Math.random() * 0.18,
        gravity: 12,
      });
    }
  }

  private createJaggedYellowBolt(
    start: THREE.Vector3,
    end: THREE.Vector3,
    segCount: number,
    thickness: number,
    maxAge: number,
  ): void {
    const segments: THREE.Mesh[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];
    this._tmpA.copy(start);

    for (let i = 0; i < segCount; i++) {
      const t = (i + 1) / segCount;
      this._tmpB.lerpVectors(start, end, t);
      if (i < segCount - 1) {
        this._tmpB.x += (Math.random() - 0.5) * 1.15;
        this._tmpB.y += (Math.random() - 0.5) * 0.65;
        this._tmpB.z += (Math.random() - 0.5) * 1.15;
      }

      const len = Math.max(0.08, this._tmpA.distanceTo(this._tmpB));
      this._tmpMid.addVectors(this._tmpA, this._tmpB).multiplyScalar(0.5);

      const coreMat = new THREE.MeshBasicMaterial({
        color: '#FFFDF0',
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coreSeg = new THREE.Mesh(this.rectUnitGeo, coreMat);
      coreSeg.position.copy(this._tmpMid);
      coreSeg.scale.set(thickness, thickness, len * 1.05);
      coreSeg.lookAt(this._tmpB);
      this.group.add(coreSeg);
      segments.push(coreSeg);
      mats.push(coreMat);

      const glowMat = new THREE.MeshBasicMaterial({
        color: '#FFE14D',
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowSeg = new THREE.Mesh(this.rectUnitGeo, glowMat);
      glowSeg.position.copy(this._tmpMid);
      glowSeg.scale.set(thickness * 2.7, thickness * 2.7, len * 1.04);
      glowSeg.lookAt(this._tmpB);
      this.group.add(glowSeg);
      segments.push(glowSeg);
      mats.push(glowMat);

      this._tmpA.copy(this._tmpB);
    }

    this.bolts.push({ segments, mats, age: 0, maxAge });
  }

  private clearTornadoVisuals(): void {
    for (const s of this.tornadoSwirls) {
      this.group.remove(s.mesh);
      s.mat.dispose();
    }
    this.tornadoSwirls.length = 0;
  }

  private releaseCaughtTargets(
    onReleaseTarget?: (targetId: string) => void,
  ): void {
    if (this.caughtTargets.size === 0) return;
    if (onReleaseTarget) {
      for (const id of this.caughtTargets.keys()) {
        onReleaseTarget(id);
      }
    }
    this.caughtTargets.clear();
  }

  /**
   * Tornado:
   * Built strictly from swirling wind ribbons, dense storm particles & swirling leaves (no solid 3D rings).
   * Enemies caught inside spin, rise, and fall with randomized orbital movements.
   */
  public updateTornado(
    active: boolean,
    centerPos: THREE.Vector3,
    dt: number,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onCapturePose: (
      targetId: string,
      worldPos: THREE.Vector3,
      yaw: number,
      pitch: number,
      roll: number,
      dealDamage: boolean,
    ) => void,
    onReleaseTarget: (targetId: string) => void,
  ): void {
    if (!active) {
      this.tornadoTickTimer = 0;
      this.tornadoSpawnAccum = 0;
      if (this.tornadoSwirls.length > 0) {
        this.clearTornadoVisuals();
      }
      this.releaseCaughtTargets(onReleaseTarget);
      return;
    }

    // Spawn layered wind ribbons, mist motes, and swirling leaves spiraling up the funnel
    this.tornadoSpawnAccum += dt * 76;
    while (this.tornadoSpawnAccum >= 1 && this.tornadoSwirls.length < 150) {
      this.tornadoSpawnAccum -= 1;
      const roll = Math.random();
      const isLeaf = roll < 0.34;
      const isWindRibbon = !isLeaf && roll < 0.78;
      const leafColors = ['#66B85C', '#8EE075', '#C9E77A', '#4B9D4E'];
      const mat = new THREE.MeshBasicMaterial({
        color: isLeaf
          ? leafColors[Math.floor(Math.random() * leafColors.length)]
          : isWindRibbon
            ? Math.random() > 0.35
              ? '#EBF8FF'
              : '#9CDFFF'
            : '#D8F2FF',
        transparent: true,
        opacity: isLeaf ? 0.9 : isWindRibbon ? 0.56 : 0.48,
        side: THREE.DoubleSide,
        blending: isLeaf ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(
        isLeaf ? this.leafGeo : isWindRibbon ? this.planeUnitGeo : this.shardGeo,
        mat,
      );
      if (isWindRibbon) {
        mesh.scale.set(1.25 + Math.random() * 1.65, 0.08 + Math.random() * 0.07, 1);
      } else if (!isLeaf) {
        mesh.scale.setScalar(0.32 + Math.random() * 0.36);
      } else {
        mesh.scale.setScalar(0.95 + Math.random() * 0.55);
      }
      this.group.add(mesh);

      this.tornadoSwirls.push({
        mesh,
        mat,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: 4.8 + Math.random() * 4.2,
        height: 0.1 + Math.random() * 0.6,
        maxHeight: 5.8 + Math.random() * 1.8,
        riseSpeed: 2.8 + Math.random() * 2.8,
        baseRadius: 1.2 + Math.random() * 1.4,
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 9,
        ),
        baseOpacity: isLeaf ? 0.9 : isWindRibbon ? 0.56 : 0.48,
        isLeaf,
      });
    }

    // Update orbital funnel wind ribbons, particles & swirling leaves
    for (let i = this.tornadoSwirls.length - 1; i >= 0; i--) {
      const s = this.tornadoSwirls[i];
      s.angle += s.angularSpeed * dt;
      s.height += s.riseSpeed * dt;
      const t = s.height / s.maxHeight;
      if (t >= 1) {
        this.group.remove(s.mesh);
        s.mat.dispose();
        this.tornadoSwirls.splice(i, 1);
        continue;
      }
      const funnelR = s.baseRadius + t * 4.2 + Math.sin(this.time * 4 + i) * 0.25;
      const x = centerPos.x + Math.cos(s.angle) * funnelR;
      const z = centerPos.z + Math.sin(s.angle) * funnelR;
      const y = centerPos.y + s.height;
      s.mesh.position.set(x, y, z);

      if (s.isLeaf) {
        s.mesh.rotation.x += s.rotVel.x * dt;
        s.mesh.rotation.y += s.rotVel.y * dt;
        s.mesh.rotation.z += s.rotVel.z * dt;
      } else {
        s.mesh.rotation.y = -s.angle;
        s.mesh.rotation.z = 0.22;
      }

      const env = Math.sin(t * Math.PI);
      s.mat.opacity = s.baseOpacity * env;
    }

    // Periodic damage tick & capture/release of enemies inside 6.6m radius
    this.tornadoTickTimer += dt;
    const dealDamageNow = this.tornadoTickTimer >= 0.45;
    if (dealDamageNow) {
      this.tornadoTickTimer = 0;
    }

    const presentIds = new Set<string>();
    const captureRadius = 6.6;
    for (const probe of targetProbes) {
      presentIds.add(probe.id);
      const dx = probe.position.x - centerPos.x;
      const dz = probe.position.z - centerPos.z;
      const horizDist = Math.hypot(dx, dz);

      let entry = this.caughtTargets.get(probe.id);
      if (!entry && horizDist <= captureRadius && Math.abs(probe.position.y - centerPos.y) <= 6.5) {
        entry = {
          angle: Math.atan2(dz, dx),
          angularSpeed: (Math.random() > 0.3 ? 1 : -1) * (3.6 + Math.random() * 2.4),
          orbitRadius: THREE.MathUtils.clamp(horizDist * 0.72, 1.5, 4.6),
          baseLift: 1.4 + Math.random() * 2.2,
          bobPhase: Math.random() * Math.PI * 2,
          bobSpeed: 2.8 + Math.random() * 2.6,
          bobAmp: 0.75 + Math.random() * 1.15,
          spinYaw: Math.random() * Math.PI * 2,
          spinRate: (Math.random() > 0.5 ? 1 : -1) * (6.5 + Math.random() * 4.5),
          tiltPitch: (Math.random() - 0.5) * 0.65,
          tiltRoll: (Math.random() - 0.5) * 0.65,
        };
        this.caughtTargets.set(probe.id, entry);
      }

      if (entry) {
        entry.angle += entry.angularSpeed * dt;
        entry.bobPhase += entry.bobSpeed * dt;
        entry.spinYaw += entry.spinRate * dt;
        const rPulse = entry.orbitRadius + Math.sin(entry.bobPhase * 0.7) * 0.55;
        const tx = centerPos.x + Math.cos(entry.angle) * rPulse;
        const tz = centerPos.z + Math.sin(entry.angle) * rPulse;
        const riseFall = entry.baseLift + Math.sin(entry.bobPhase) * entry.bobAmp;
        const minSurface = getGroundSurfaceY(tx, tz, centerPos.y + 4.0);
        const ty = Math.max(minSurface + 0.45, centerPos.y + riseFall);
        this._tmpPosePos.set(tx, ty, tz);

        onCapturePose(
          probe.id,
          this._tmpPosePos,
          entry.spinYaw,
          entry.tiltPitch * Math.sin(entry.bobPhase * 1.3),
          entry.tiltRoll * Math.cos(entry.bobPhase * 1.1),
          dealDamageNow,
        );
      }
    }

    // Release any caught target that despawned
    for (const id of this.caughtTargets.keys()) {
      if (!presentIds.has(id)) {
        this.caughtTargets.delete(id);
        onReleaseTarget(id);
      }
    }
  }

  /**
   * Ice Spear Creation Preview:
   * Conjured beside Storm's right side while raising her LEFT hand!
   */
  public updateIceSpearCreation(
    active: boolean,
    rightSideWorldPos: THREE.Vector3,
    aimPoint: THREE.Vector3,
    progress01: number,
  ): void {
    this.spearPreview.group.visible = active;
    if (!active) return;

    this.spearPreview.group.position.copy(rightSideWorldPos);
    this.spearPreview.group.lookAt(aimPoint);
    const eased = 1 - Math.pow(1 - THREE.MathUtils.clamp(progress01, 0, 1), 2.2);
    const scale = 0.15 + eased * 1.15;
    this.spearPreview.group.scale.setScalar(scale);
    this.spearPreview.group.rotateZ(this.time * 2.4);
    this.spearRingMat.opacity = 0.72 * (1 - eased * 0.4);
  }

  public spawnIceSpear(origin: THREE.Vector3, aimTarget: THREE.Vector3): void {
    const built = buildIceSpearMesh();
    built.group.position.copy(origin);
    built.group.scale.setScalar(1.3);
    built.group.lookAt(aimTarget);
    this.group.add(built.group);

    const vel = aimTarget.clone().sub(origin);
    if (vel.lengthSq() < 0.001) vel.set(0, 0, -1);
    vel.normalize().multiplyScalar(46);

    this.iceSpears.push({
      group: built.group,
      mats: built.mats,
      pos: origin.clone(),
      vel,
      age: 0,
      maxAge: 2.2,
    });
  }

  public spawnIceShatter(impactPos: THREE.Vector3): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#BAEEFF',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.set(impactPos.x, impactPos.y + 0.1, impactPos.z);

    const coreMat = new THREE.MeshBasicMaterial({
      color: '#E6FAFF',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.position.copy(impactPos);
    this.group.add(ring, core);
    this.flashes.push({
      ring,
      ringMat,
      core,
      coreMat,
      age: 0,
      maxAge: 0.36,
      maxScale: 3.1,
    });

    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#A6EBFF' : '#E0F7FF',
        transparent: true,
        opacity: 0.92,
      });
      const shard = new THREE.Mesh(this.shardGeo, mat);
      shard.position.copy(impactPos);
      shard.scale.set(0.6 + Math.random() * 0.7, 1.3 + Math.random() * 1.1, 0.6);
      this.group.add(shard);
      const ang = Math.random() * Math.PI * 2;
      const spd = 4.2 + Math.random() * 8.0;
      this.particles.push({
        mesh: shard,
        mat,
        vel: new THREE.Vector3(Math.cos(ang) * spd, 2.0 + Math.random() * 5.8, Math.sin(ang) * spd),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 18,
        ),
        age: 0,
        maxAge: 0.52 + Math.random() * 0.25,
        gravity: 14,
      });
    }
  }

  /**
   * Wind Blast:
   * Wide, tall, far-reaching horizontal gale straight ahead (never follows player aim pitch).
   * Emits large animated wind lines, swirling leaves & particles across the full forward corridor.
   */
  public updateWindBlast(
    active: boolean,
    origin: THREE.Vector3,
    horizontalForward: THREE.Vector3,
    dt: number,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onWindPush: (targetId: string, pushImpulse: THREE.Vector3, dealDamage: boolean) => void,
  ): void {
    if (!active) {
      this.windBlastTickTimer = 0;
      this.windBlastSpawnAccum = 0;
      return;
    }

    const fwd = horizontalForward.clone();
    fwd.y = 0;
    if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
    fwd.normalize();
    this._tmpRight.crossVectors(fwd, this._worldUp);
    if (this._tmpRight.lengthSq() < 0.001) this._tmpRight.set(1, 0, 0);
    this._tmpRight.normalize();

    // Wider, taller & denser emission mouth
    this.windBlastSpawnAccum += dt * 72;
    while (this.windBlastSpawnAccum >= 1) {
      this.windBlastSpawnAccum -= 1;
      const roll = Math.random();
      const spreadX = (Math.random() - 0.5) * 4.4;
      const spreadY = -0.35 + Math.random() * 3.1;
      const startPos = origin
        .clone()
        .addScaledVector(fwd, 0.8 + Math.random() * 0.9)
        .addScaledVector(this._tmpRight, spreadX);
      startPos.y += spreadY;

      if (roll < 0.56) {
        const mat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.35 ? '#F0FAFF' : '#96E0FF',
          transparent: true,
          opacity: 0.58,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const rectMesh = new THREE.Mesh(this.rectUnitGeo, mat);
        rectMesh.position.copy(startPos);
        rectMesh.scale.set(0.08, 0.06, 1.85 + Math.random() * 1.9);
        rectMesh.lookAt(startPos.clone().add(fwd));
        this.group.add(rectMesh);
        const spd = 28 + Math.random() * 14;
        this.windStreaks.push({
          mesh: rectMesh,
          mat,
          vel: fwd
            .clone()
            .multiplyScalar(spd)
            .addScaledVector(this._tmpRight, (Math.random() - 0.5) * 6.5)
            .add(new THREE.Vector3(0, (Math.random() - 0.35) * 2.8, 0)),
          age: 0,
          maxAge: 0.62,
        });
      } else if (roll < 0.84) {
        const leafColors = ['#66B85C', '#93DB7A', '#C8E67A', '#4EA352'];
        const mat = new THREE.MeshBasicMaterial({
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const leaf = new THREE.Mesh(this.leafGeo, mat);
        leaf.position.copy(startPos);
        leaf.scale.setScalar(1.25 + Math.random() * 0.5);
        this.group.add(leaf);
        const spd = 20 + Math.random() * 10;
        this.particles.push({
          mesh: leaf,
          mat,
          vel: fwd
            .clone()
            .multiplyScalar(spd)
            .addScaledVector(this._tmpRight, (Math.random() - 0.5) * 8.5)
            .add(new THREE.Vector3(0, (Math.random() - 0.3) * 4.5, 0)),
          rotVel: new THREE.Vector3(10, 14, 12),
          age: 0,
          maxAge: 0.72,
          gravity: -0.7,
        });
      } else {
        const mat = new THREE.MeshBasicMaterial({
          color: '#F2FAFF',
          transparent: true,
          opacity: 0.68,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mote = new THREE.Mesh(this.shardGeo, mat);
        mote.position.copy(startPos);
        mote.scale.setScalar(0.45 + Math.random() * 0.25);
        this.group.add(mote);
        this.particles.push({
          mesh: mote,
          mat,
          vel: fwd
            .clone()
            .multiplyScalar(24 + Math.random() * 11)
            .addScaledVector(this._tmpRight, (Math.random() - 0.5) * 5.2)
            .add(new THREE.Vector3(0, (Math.random() - 0.35) * 2.4, 0)),
          rotVel: new THREE.Vector3(6, 6, 6),
          age: 0,
          maxAge: 0.6,
          gravity: 0,
        });
      }
    }

    // Continuous push & gust damage across enlarged forward, lateral & vertical corridor (19.5m long)
    this.windBlastTickTimer += dt;
    const dealDmg = this.windBlastTickTimer >= 0.42;
    if (dealDmg) {
      this.windBlastTickTimer = 0;
    }

    const maxRange = 19.5;
    for (const probe of targetProbes) {
      const dx = probe.position.x - origin.x;
      const dz = probe.position.z - origin.z;
      const along = dx * fwd.x + dz * fwd.z;
      if (along < 0.1 || along > maxRange) continue;

      const lateral = Math.abs(dx * this._tmpRight.x + dz * this._tmpRight.z);
      const maxLateral = 2.9 + (along / maxRange) * 3.4;
      if (lateral > maxLateral) continue;

      const targetCenterY = probe.position.y + probe.height * 0.5;
      const vertOffset = targetCenterY - origin.y;
      if (vertOffset < -2.4 || vertOffset > 3.6 + (along / maxRange) * 1.4) continue;

      this._tmpHead.set(
        probe.position.x,
        probe.position.y + probe.height * 0.85,
        probe.position.z,
      );
      if (
        hasLineOfSight(
          origin.x,
          origin.y + 0.6,
          origin.z,
          this._tmpHead.x,
          this._tmpHead.y,
          this._tmpHead.z,
        )
      ) {
        const pushVec = fwd.clone().multiplyScalar(21.5 * dt);
        pushVec.y = 2.0 * dt;
        onWindPush(probe.id, pushVec, dealDmg);
      }
    }
  }

  public update(
    dt: number,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onIceSpearImpact: (pos: THREE.Vector3, directTargetId: string | null) => void,
  ): void {
    this.time += dt;

    // 1. Ice Spears
    for (let i = this.iceSpears.length - 1; i >= 0; i--) {
      const s = this.iceSpears[i];
      s.age += dt;
      s.pos.addScaledVector(s.vel, dt);
      s.group.position.copy(s.pos);
      s.group.rotateZ(dt * 8.5);

      let impacted = false;
      let hitTargetId: string | null = null;
      for (const probe of targetProbes) {
        this._tmpA.set(probe.position.x, probe.position.y + 0.95, probe.position.z);
        if (this._tmpA.distanceToSquared(s.pos) <= 1.2 * 1.2) {
          impacted = true;
          hitTargetId = probe.id;
          break;
        }
      }

      const groundY = getGroundSurfaceY(s.pos.x, s.pos.z, s.pos.y + 0.6);
      if (!impacted && s.pos.y <= groundY + 0.14) {
        s.pos.y = groundY + 0.14;
        impacted = true;
      }

      if (impacted || s.age >= s.maxAge) {
        if (impacted) {
          this.spawnIceShatter(s.pos);
          onIceSpearImpact(s.pos.clone(), hitTargetId);
        }
        this.group.remove(s.group);
        s.mats.forEach((m) => m.dispose());
        this.iceSpears.splice(i, 1);
      }
    }

    // 2. Lightning Bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.age += dt;
      const t = b.age / b.maxAge;
      if (t >= 1) {
        b.segments.forEach((s) => this.group.remove(s));
        b.mats.forEach((m) => m.dispose());
        this.bolts.splice(i, 1);
      } else {
        const fade = 1 - t;
        for (let k = 0; k < b.mats.length; k++) {
          b.mats[k].opacity = (k % 2 === 0 ? 0.98 : 0.48) * fade;
        }
      }
    }

    // 3. Flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      const t = THREE.MathUtils.clamp(f.age / f.maxAge, 0, 1);
      const ease = 1 - Math.pow(1 - t, 2.4);
      f.ring.scale.setScalar(0.35 + f.maxScale * ease);
      f.ringMat.opacity = 0.92 * (1 - t);
      f.core.scale.setScalar(0.4 + f.maxScale * 0.42 * ease);
      f.coreMat.opacity = 0.8 * (1 - t);
      if (t >= 1) {
        this.group.remove(f.ring, f.core);
        f.ringMat.dispose();
        f.coreMat.dispose();
        this.flashes.splice(i, 1);
      }
    }

    // 4. Wind Streaks
    for (let i = this.windStreaks.length - 1; i >= 0; i--) {
      const w = this.windStreaks[i];
      w.age += dt;
      const t = w.age / w.maxAge;
      if (t >= 1) {
        this.group.remove(w.mesh);
        w.mat.dispose();
        this.windStreaks.splice(i, 1);
      } else {
        w.mesh.position.addScaledVector(w.vel, dt);
        w.mat.opacity = 0.55 * (1 - t);
      }
    }

    // 5. Shards, leaves, sparks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const t = p.age / p.maxAge;
      if (t >= 1) {
        this.group.remove(p.mesh);
        p.mat.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vel.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;
        p.mat.opacity = 0.9 * (1 - t);
      }
    }
  }

  public clearAll(onReleaseTarget?: (targetId: string) => void): void {
    this.clearTornadoVisuals();
    this.releaseCaughtTargets(onReleaseTarget);
    this.spearPreview.group.visible = false;

    for (const s of this.iceSpears) {
      this.group.remove(s.group);
      s.mats.forEach((m) => m.dispose());
    }
    this.iceSpears.length = 0;

    for (const b of this.bolts) {
      b.segments.forEach((seg) => this.group.remove(seg));
      b.mats.forEach((m) => m.dispose());
    }
    this.bolts.length = 0;

    for (const f of this.flashes) {
      this.group.remove(f.ring, f.core);
      f.ringMat.dispose();
      f.coreMat.dispose();
    }
    this.flashes.length = 0;

    for (const w of this.windStreaks) {
      this.group.remove(w.mesh);
      w.mat.dispose();
    }
    this.windStreaks.length = 0;

    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mat.dispose();
    }
    this.particles.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.spearPreview.mats.forEach((m) => m.dispose());
    this.spearRingMat.dispose();
    this.rectUnitGeo.dispose();
    this.planeUnitGeo.dispose();
    this.sphereGeo.dispose();
    this.ringGeo.dispose();
    this.shardGeo.dispose();
    this.leafGeo.dispose();
  }
}
