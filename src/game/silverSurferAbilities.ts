import * as THREE from 'three';
import { getGroundSurfaceY, hasLineOfSight } from './physics';
import type { CombatTargetProbe } from './scarletWitchAbilities';

interface CosmicBlastBolt {
  group: THREE.Group;
  core: THREE.Mesh;
  halo: THREE.Mesh;
  ring: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface SonicWindRing {
  group: THREE.Group;
  mainRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  outerRing: THREE.Mesh;
  streakMeshes: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  age: number;
  maxAge: number;
  trailAccum: number;
  hitIds: Set<string>;
}

interface SonicRingEcho {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  expandRate: number;
}

interface FlightWakeStreak {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface SilverBurst {
  group: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  dome: THREE.Mesh;
  domeMat: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
  targetScale: number;
}

interface CosmicSpark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  gravity: number;
}

interface LightningArc {
  segments: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  age: number;
  maxAge: number;
}

export class SilverSurferVfxSystem {
  public readonly group = new THREE.Group();

  // Shared geometries
  private readonly sphereGeo = new THREE.SphereGeometry(0.32, 14, 14);
  private readonly ringGeo = new THREE.TorusGeometry(0.48, 0.032, 8, 28);
  private readonly sonicTorusMainGeo = new THREE.TorusGeometry(0.88, 0.068, 10, 36);
  private readonly sonicTorusInnerGeo = new THREE.TorusGeometry(0.58, 0.038, 8, 32);
  private readonly sonicTorusOuterGeo = new THREE.TorusGeometry(1.16, 0.026, 8, 36);
  private readonly burstRingGeo = new THREE.RingGeometry(0.36, 0.72, 32);
  private readonly domeGeo = new THREE.SphereGeometry(0.85, 18, 14);
  private readonly rectUnitGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly particleGeo = new THREE.OctahedronGeometry(0.085, 0);
  private readonly beamCylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);

  // Damage Absorption body/chest glow
  private readonly absorbGroup = new THREE.Group();
  private readonly absorbCore: THREE.Mesh;
  private readonly absorbRing: THREE.Mesh;
  private readonly absorbCoreMat: THREE.MeshBasicMaterial;
  private readonly absorbRingMat: THREE.MeshBasicMaterial;

  // Cosmic Blast charge orb
  private readonly chargeGroup = new THREE.Group();
  private readonly chargeCore: THREE.Mesh;
  private readonly chargeRing: THREE.Mesh;

  // Dual Cosmic Beam meshes (left beam -> converge <- right beam + convergence orb)
  private readonly dualBeamGroup = new THREE.Group();
  private readonly leftBeamCore: THREE.Mesh;
  private readonly leftBeamGlow: THREE.Mesh;
  private readonly rightBeamCore: THREE.Mesh;
  private readonly rightBeamGlow: THREE.Mesh;
  private readonly leftHandFlare: THREE.Mesh;
  private readonly rightHandFlare: THREE.Mesh;
  private readonly convergeCore: THREE.Mesh;
  private readonly convergeHalo: THREE.Mesh;
  private readonly convergeRing: THREE.Mesh;
  private dualBeamSparkAccum = 0;

  // Active collections
  private readonly cosmicBlasts: CosmicBlastBolt[] = [];
  private readonly sonicWaves: SonicWindRing[] = [];
  private readonly sonicEchoes: SonicRingEcho[] = [];
  private readonly flightWakes: FlightWakeStreak[] = [];
  private readonly bursts: SilverBurst[] = [];
  private readonly sparks: CosmicSpark[] = [];
  private readonly arcs: LightningArc[] = [];

  private time = 0;
  private flightTrailAccum = 0;
  private flightWakeAccum = 0;
  private absorbArcAccum = 0;
  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpRight = new THREE.Vector3();
  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpMid = new THREE.Vector3();
  private readonly _tmpHead = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);
  private readonly _upVec = new THREE.Vector3(0, 1, 0);
  private readonly _tmpQuat = new THREE.Quaternion();

  constructor() {
    this.burstRingGeo.rotateX(-Math.PI * 0.5);

    // Damage Absorption aura around chest
    this.absorbCoreMat = new THREE.MeshBasicMaterial({
      color: '#DCF2FF',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.absorbCore = new THREE.Mesh(this.sphereGeo, this.absorbCoreMat);
    this.absorbCore.scale.setScalar(1.1);

    this.absorbRingMat = new THREE.MeshBasicMaterial({
      color: '#A5E3FF',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.absorbRing = new THREE.Mesh(this.ringGeo, this.absorbRingMat);
    this.absorbGroup.add(this.absorbCore, this.absorbRing);
    this.absorbGroup.visible = false;
    this.group.add(this.absorbGroup);

    // Cosmic Blast charge orb
    this.chargeCore = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: '#F4FBFF',
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeRing = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: '#8CE0FF',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeGroup.add(this.chargeCore, this.chargeRing);
    this.chargeGroup.visible = false;
    this.group.add(this.chargeGroup);

    // Dual Cosmic Beam system
    const beamCoreMatA = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamGlowMatA = new THREE.MeshBasicMaterial({
      color: '#9BE4FF',
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamCoreMatB = beamCoreMatA.clone();
    const beamGlowMatB = beamGlowMatA.clone();

    this.leftBeamCore = new THREE.Mesh(this.beamCylGeo, beamCoreMatA);
    this.leftBeamGlow = new THREE.Mesh(this.beamCylGeo, beamGlowMatA);
    this.rightBeamCore = new THREE.Mesh(this.beamCylGeo, beamCoreMatB);
    this.rightBeamGlow = new THREE.Mesh(this.beamCylGeo, beamGlowMatB);

    const flareMat = new THREE.MeshBasicMaterial({
      color: '#E6F8FF',
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.leftHandFlare = new THREE.Mesh(this.sphereGeo, flareMat);
    this.rightHandFlare = new THREE.Mesh(this.sphereGeo, flareMat.clone());

    this.convergeCore = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.convergeHalo = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: '#8CE0FF',
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.convergeRing = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: '#DCF6FF',
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    this.dualBeamGroup.add(
      this.leftBeamGlow,
      this.leftBeamCore,
      this.rightBeamGlow,
      this.rightBeamCore,
      this.leftHandFlare,
      this.rightHandFlare,
      this.convergeHalo,
      this.convergeCore,
      this.convergeRing,
    );
    this.dualBeamGroup.visible = false;
    this.group.add(this.dualBeamGroup);
  }

  public updateCosmicFlightTrail(
    flying: boolean,
    boardWorldPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    moveSpeed: number,
    dt: number,
  ): void {
    if (!flying) {
      this.flightTrailAccum = 0;
      this.flightWakeAccum = 0;
      return;
    }

    const fwd = this._tmpDir.copy(forwardDir);
    if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
    fwd.normalize();
    this._tmpRight.crossVectors(fwd, this._worldUp);
    if (this._tmpRight.lengthSq() < 0.001) this._tmpRight.set(1, 0, 0);
    this._tmpRight.normalize();

    const speedFactor = THREE.MathUtils.clamp(moveSpeed / 12, 0.25, 2.2);

    // Dual wingtip/rail slipstream wind ribbons at high speed
    this.flightWakeAccum += dt * (moveSpeed > 4 ? 32 * speedFactor : 7);
    while (this.flightWakeAccum >= 1) {
      this.flightWakeAccum -= 1;
      for (const side of [-1, 1]) {
        const mat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.35 ? '#DCF4FF' : '#96E2FF',
          transparent: true,
          opacity: 0.42 + speedFactor * 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const streak = new THREE.Mesh(this.rectUnitGeo, mat);
        const startPos = boardWorldPos
          .clone()
          .addScaledVector(this._tmpRight, side * (0.28 + Math.random() * 0.08))
          .addScaledVector(fwd, -0.55);
        startPos.y += 0.06 + (Math.random() - 0.5) * 0.08;
        streak.position.copy(startPos);
        streak.scale.set(0.032, 0.018, 0.75 + speedFactor * 1.15);
        streak.lookAt(startPos.x + fwd.x, startPos.y + fwd.y, startPos.z + fwd.z);
        this.group.add(streak);
        this.flightWakes.push({
          mesh: streak,
          mat,
          vel: fwd
            .clone()
            .multiplyScalar(-4.5 - speedFactor * 4.2)
            .addScaledVector(this._tmpRight, side * 0.45),
          age: 0,
          maxAge: 0.26 + Math.random() * 0.14,
        });
      }
    }

    // Cosmic shimmer particles behind board tail
    this.flightTrailAccum += dt * (moveSpeed > 3 ? 28 * speedFactor : 9);
    while (this.flightTrailAccum >= 1) {
      this.flightTrailAccum -= 1;
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.38 ? '#D6ECFF' : '#FFFFFF',
        transparent: true,
        opacity: 0.74,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position
        .copy(boardWorldPos)
        .addScaledVector(fwd, -0.78)
        .addScaledVector(this._tmpRight, (Math.random() - 0.5) * 0.42);
      mesh.position.y += 0.08 + (Math.random() - 0.5) * 0.12;
      mesh.scale.setScalar(0.5 + Math.random() * 0.65);
      this.group.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel: fwd
          .clone()
          .multiplyScalar(-3.2 - speedFactor * 2.8)
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 1.2,
              0.25 + Math.random() * 0.7,
              (Math.random() - 0.5) * 1.2,
            ),
          ),
        age: 0,
        maxAge: 0.32 + Math.random() * 0.16,
        gravity: 0,
      });
    }
  }

  public updateAbsorptionAura(
    active: boolean,
    chestWorldPos: THREE.Vector3,
    energyNorm: number,
    dt: number,
  ): void {
    this.absorbGroup.visible = active;
    if (!active) {
      this.absorbArcAccum = 0;
      return;
    }
    this.absorbGroup.position.copy(chestWorldPos);
    const pulse = 1 + Math.sin(this.time * 12) * 0.1 + energyNorm * 0.35;
    this.absorbCore.scale.setScalar(0.65 * pulse);
    this.absorbCoreMat.opacity = 0.18 + energyNorm * 0.24;
    this.absorbRing.rotation.x = this.time * 3.2;
    this.absorbRing.rotation.y = this.time * 4.4;
    this.absorbRing.scale.setScalar(0.85 * pulse);
    this.absorbRingMat.opacity = 0.35 + energyNorm * 0.35;

    if (energyNorm >= 0.65) {
      this.absorbArcAccum += dt * 7;
      if (this.absorbArcAccum >= 1) {
        this.absorbArcAccum -= 1;
        this.spawnBodySilverLightning(chestWorldPos, 1);
      }
    }
  }

  public triggerAbsorptionHit(centerWorldPos: THREE.Vector3): void {
    this.spawnBodySilverLightning(centerWorldPos, 3);
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 0.45;
      const sx = centerWorldPos.x + Math.cos(ang) * r;
      const sy = centerWorldPos.y + (Math.random() - 0.3) * 0.7;
      const sz = centerWorldPos.z + Math.sin(ang) * r;
      const mat = new THREE.MeshBasicMaterial({
        color: '#D8F2FF',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(sx, sy, sz);
      mesh.scale.setScalar(0.75);
      this.group.add(mesh);
      const vel = this._tmpDir
        .set(centerWorldPos.x - sx, centerWorldPos.y - sy, centerWorldPos.z - sz)
        .normalize()
        .multiplyScalar(4.8);
      this.sparks.push({
        mesh,
        mat,
        vel: vel.clone(),
        age: 0,
        maxAge: 0.24,
        gravity: 0,
      });
    }
  }

  private spawnBodySilverLightning(centerPos: THREE.Vector3, arcCount: number): void {
    for (let a = 0; a < arcCount; a++) {
      const segments: THREE.Mesh[] = [];
      const mats: THREE.MeshBasicMaterial[] = [];
      const segs = 4;
      const startOff = new THREE.Vector3(
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 0.7,
      );
      const endOff = new THREE.Vector3(
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 0.7,
      );
      this._tmpA.copy(centerPos).add(startOff);
      for (let i = 0; i < segs; i++) {
        const t = (i + 1) / segs;
        this._tmpB.copy(centerPos).add(startOff.clone().lerp(endOff, t));
        if (i < segs - 1) {
          this._tmpB.x += (Math.random() - 0.5) * 0.26;
          this._tmpB.y += (Math.random() - 0.5) * 0.26;
          this._tmpB.z += (Math.random() - 0.5) * 0.26;
        }
        const mat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? '#FFFFFF' : '#B7E5FF',
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const seg = new THREE.Mesh(this.rectUnitGeo, mat);
        this._tmpMid.addVectors(this._tmpA, this._tmpB).multiplyScalar(0.5);
        const len = Math.max(0.05, this._tmpA.distanceTo(this._tmpB));
        seg.position.copy(this._tmpMid);
        seg.scale.set(0.026, 0.026, len * 1.06);
        seg.lookAt(this._tmpB);
        this.group.add(seg);
        segments.push(seg);
        mats.push(mat);
        this._tmpA.copy(this._tmpB);
      }
      this.arcs.push({ segments, mats, age: 0, maxAge: 0.18 + Math.random() * 0.08 });
    }
  }

  /**
   * Sonic Blast (unlocked at 80 energy):
   * Redesigned as a fast-moving aerodynamic wind ring with an animated slipstream trail.
   */
  public spawnSonicBlast(origin: THREE.Vector3, dir: THREE.Vector3): void {
    const waveGroup = new THREE.Group();
    const normDir = dir.clone().normalize();
    waveGroup.position.copy(origin);
    waveGroup.lookAt(
      origin.x + normDir.x,
      origin.y + normDir.y,
      origin.z + normDir.z,
    );

    const mats: THREE.MeshBasicMaterial[] = [];

    const mainMat = new THREE.MeshBasicMaterial({
      color: '#EAF7FF',
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mainRing = new THREE.Mesh(this.sonicTorusMainGeo, mainMat);

    const innerMat = new THREE.MeshBasicMaterial({
      color: '#9BE4FF',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerRing = new THREE.Mesh(this.sonicTorusInnerGeo, innerMat);
    innerRing.position.z = 0.18;

    const outerMat = new THREE.MeshBasicMaterial({
      color: '#CFD8E3',
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(this.sonicTorusOuterGeo, outerMat);
    outerRing.position.z = -0.14;

    mats.push(mainMat, innerMat, outerMat);
    waveGroup.add(outerRing, mainRing, innerRing);

    // Slipstream speed streaks trailing around the circumference of the flying wind ring
    const streakMeshes: THREE.Mesh[] = [];
    const streakCount = 8;
    for (let i = 0; i < streakCount; i++) {
      const ang = (i / streakCount) * Math.PI * 2;
      const smat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFFFFF' : '#B4E6FF',
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const streak = new THREE.Mesh(this.rectUnitGeo, smat);
      streak.position.set(
        Math.cos(ang) * 0.92,
        Math.sin(ang) * 0.92,
        -0.55 - (i % 2) * 0.25,
      );
      streak.scale.set(0.036, 0.036, 1.25 + (i % 3) * 0.35);
      waveGroup.add(streak);
      streakMeshes.push(streak);
      mats.push(smat);
    }

    this.group.add(waveGroup);
    this.sonicWaves.push({
      group: waveGroup,
      mainRing,
      innerRing,
      outerRing,
      streakMeshes,
      mats,
      pos: origin.clone(),
      dir: normDir,
      speed: 48,
      age: 0,
      maxAge: 0.68,
      trailAccum: 0,
      hitIds: new Set<string>(),
    });
  }

  public updateCosmicCharge(
    active: boolean,
    centerPos: THREE.Vector3,
    progress01: number,
  ): void {
    this.chargeGroup.visible = active;
    if (!active) return;
    this.chargeGroup.position.copy(centerPos);
    const s = 0.25 + progress01 * 0.95;
    this.chargeCore.scale.setScalar(s);
    this.chargeRing.scale.setScalar(s * 1.35);
    this.chargeRing.rotation.x = this.time * 6.5;
    this.chargeRing.rotation.y = this.time * 4.8;
  }

  public spawnCosmicBlast(origin: THREE.Vector3, target: THREE.Vector3): void {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.96,
      }),
    );
    core.scale.setScalar(0.82);

    const halo = new THREE.Mesh(
      this.sphereGeo,
      new THREE.MeshBasicMaterial({
        color: '#9BE4FF',
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(1.48);

    const ring = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: '#E0F7FF',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.scale.setScalar(1.05);

    group.add(halo, core, ring);
    group.position.copy(origin);
    this.group.add(group);

    const vel = target.clone().sub(origin);
    if (vel.lengthSq() < 0.001) vel.set(0, 0, -1);
    vel.normalize().multiplyScalar(42);

    this.cosmicBlasts.push({
      group,
      core,
      halo,
      ring,
      pos: origin.clone(),
      vel,
      age: 0,
      maxAge: 2.1,
    });
  }

  public spawnCosmicExplosion(pos: THREE.Vector3, radius = 4.0): void {
    const group = new THREE.Group();
    group.position.copy(pos);

    const ringMat = new THREE.MeshBasicMaterial({
      color: '#DDF6FF',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.burstRingGeo, ringMat);
    ring.position.y = 0.08;

    const domeMat = new THREE.MeshBasicMaterial({
      color: '#B5ECFF',
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(this.domeGeo, domeMat);

    group.add(ring, dome);
    this.group.add(group);
    this.bursts.push({
      group,
      ring,
      ringMat,
      dome,
      domeMat,
      age: 0,
      duration: 0.46,
      targetScale: radius,
    });

    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFFFFF' : '#96E2FF',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);
      this.group.add(mesh);
      const theta = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(
          Math.cos(theta) * spd,
          2.2 + Math.random() * 5.2,
          Math.sin(theta) * spd,
        ),
        age: 0,
        maxAge: 0.42 + Math.random() * 0.25,
        gravity: 9.5,
      });
    }
  }

  private alignCylinderBeam(
    coreMesh: THREE.Mesh,
    glowMesh: THREE.Mesh,
    start: THREE.Vector3,
    end: THREE.Vector3,
    coreRadius: number,
    glowRadius: number,
  ): void {
    this._tmpMid.addVectors(start, end).multiplyScalar(0.5);
    this._tmpA.subVectors(end, start);
    const len = Math.max(0.08, this._tmpA.length());
    this._tmpA.divideScalar(len);
    this._tmpQuat.setFromUnitVectors(this._upVec, this._tmpA);

    coreMesh.position.copy(this._tmpMid);
    coreMesh.quaternion.copy(this._tmpQuat);
    coreMesh.scale.set(coreRadius, len, coreRadius);

    glowMesh.position.copy(this._tmpMid);
    glowMesh.quaternion.copy(this._tmpQuat);
    glowMesh.scale.set(glowRadius, len, glowRadius);
  }

  /**
   * Dual Cosmic Beam:
   * Fires a glowing cosmic beam from each outstretched hand, converging tightly at the player's aim point.
   */
  public updateDualCosmicBeam(
    active: boolean,
    leftHandPos: THREE.Vector3,
    rightHandPos: THREE.Vector3,
    convergePos: THREE.Vector3,
    dt: number,
  ): void {
    this.dualBeamGroup.visible = active;
    if (!active) {
      this.dualBeamSparkAccum = 0;
      return;
    }

    const pulse = 1 + Math.sin(this.time * 28) * 0.14;
    this.alignCylinderBeam(
      this.leftBeamCore,
      this.leftBeamGlow,
      leftHandPos,
      convergePos,
      0.08 * pulse,
      0.21 * pulse,
    );
    this.alignCylinderBeam(
      this.rightBeamCore,
      this.rightBeamGlow,
      rightHandPos,
      convergePos,
      0.08 * pulse,
      0.21 * pulse,
    );

    this.leftHandFlare.position.copy(leftHandPos);
    this.leftHandFlare.scale.setScalar(0.52 * pulse);
    this.rightHandFlare.position.copy(rightHandPos);
    this.rightHandFlare.scale.setScalar(0.52 * pulse);

    this.convergeCore.position.copy(convergePos);
    this.convergeCore.scale.setScalar(0.82 * pulse);
    this.convergeHalo.position.copy(convergePos);
    this.convergeHalo.scale.setScalar(1.65 * pulse);
    this.convergeRing.position.copy(convergePos);
    this.convergeRing.scale.setScalar(1.35 * pulse);
    this.convergeRing.rotation.x = this.time * 8.2;
    this.convergeRing.rotation.y = this.time * 10.5;

    // Sparks flying off convergence focal point
    this.dualBeamSparkAccum += dt * 34;
    while (this.dualBeamSparkAccum >= 1) {
      this.dualBeamSparkAccum -= 1;
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.35 ? '#FFFFFF' : '#96E2FF',
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(convergePos);
      mesh.scale.setScalar(0.65 + Math.random() * 0.55);
      this.group.add(mesh);
      const theta = Math.random() * Math.PI * 2;
      const spd = 3.2 + Math.random() * 6.5;
      this.sparks.push({
        mesh,
        mat,
        vel: new THREE.Vector3(
          Math.cos(theta) * spd,
          1.4 + Math.random() * 4.5,
          Math.sin(theta) * spd,
        ),
        age: 0,
        maxAge: 0.34 + Math.random() * 0.16,
        gravity: 7.5,
      });
    }
  }

  public update(
    dt: number,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onSonicHit: (targetId: string, hitDir: THREE.Vector3) => void,
    onCosmicBlastImpact: (pos: THREE.Vector3, directTargetId: string | null) => void,
  ): void {
    this.time += dt;

    // 1. Sonic Blast wind rings + animated trail echoes & hit checks
    for (let i = this.sonicWaves.length - 1; i >= 0; i--) {
      const w = this.sonicWaves[i];
      w.age += dt;
      const lifeT = THREE.MathUtils.clamp(w.age / w.maxAge, 0, 1);
      w.pos.addScaledVector(w.dir, w.speed * dt);
      w.group.position.copy(w.pos);

      const scale = 1 + lifeT * 0.95;
      w.group.scale.setScalar(scale);
      w.mainRing.rotation.z += dt * 9.5;
      w.innerRing.rotation.z -= dt * 13.0;
      w.outerRing.rotation.z += dt * 7.2;

      const fade = 1 - lifeT * 0.78;
      w.mats[0].opacity = 0.88 * fade;
      w.mats[1].opacity = 0.72 * fade;
      w.mats[2].opacity = 0.56 * fade;
      for (let s = 0; s < w.streakMeshes.length; s++) {
        w.mats[3 + s].opacity = 0.62 * fade;
        const jitterZ = Math.sin(this.time * 24 + s * 1.4) * 0.14;
        w.streakMeshes[s].position.z = -0.55 - (s % 2) * 0.25 + jitterZ;
      }

      // Spawn animated trailing wind-ring echoes along path
      w.trailAccum += dt * 42;
      while (w.trailAccum >= 1) {
        w.trailAccum -= 1;
        const echoMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.4 ? '#CBEFFF' : '#E8F7FF',
          transparent: true,
          opacity: 0.44 * (1 - lifeT),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const echoMesh = new THREE.Mesh(this.sonicTorusOuterGeo, echoMat);
        echoMesh.position.copy(w.pos);
        echoMesh.lookAt(
          w.pos.x + w.dir.x,
          w.pos.y + w.dir.y,
          w.pos.z + w.dir.z,
        );
        echoMesh.scale.setScalar(scale * 0.86);
        this.group.add(echoMesh);
        this.sonicEchoes.push({
          mesh: echoMesh,
          mat: echoMat,
          vel: w.dir.clone().multiplyScalar(5.5),
          age: 0,
          maxAge: 0.28,
          expandRate: 2.8,
        });
      }

      // Hit probes along fast sonic wind ring
      const hitRadius = 2.25 + lifeT * 1.1;
      for (const probe of targetProbes) {
        if (w.hitIds.has(probe.id)) continue;
        this._tmpHead.set(
          probe.position.x,
          probe.position.y + probe.height * 0.85,
          probe.position.z,
        );
        const dx = this._tmpHead.x - w.pos.x;
        const dy = probe.position.y + probe.height * 0.52 - w.pos.y;
        const dz = this._tmpHead.z - w.pos.z;
        if (
          dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius &&
          hasLineOfSight(
            w.pos.x,
            w.pos.y,
            w.pos.z,
            this._tmpHead.x,
            this._tmpHead.y,
            this._tmpHead.z,
          )
        ) {
          w.hitIds.add(probe.id);
          onSonicHit(probe.id, w.dir.clone());
        }
      }

      const groundY = getGroundSurfaceY(w.pos.x, w.pos.z, w.pos.y + 1.0);
      if (w.age >= w.maxAge || w.pos.y < groundY - 0.2) {
        this.group.remove(w.group);
        w.mats.forEach((m) => m.dispose());
        this.sonicWaves.splice(i, 1);
      }
    }

    for (let i = this.sonicEchoes.length - 1; i >= 0; i--) {
      const tr = this.sonicEchoes[i];
      tr.age += dt;
      const t = tr.age / tr.maxAge;
      if (t >= 1) {
        this.group.remove(tr.mesh);
        tr.mat.dispose();
        this.sonicEchoes.splice(i, 1);
      } else {
        tr.mesh.position.addScaledVector(tr.vel, dt);
        tr.mesh.scale.addScalar(tr.expandRate * dt);
        tr.mat.opacity = 0.44 * (1 - t);
      }
    }

    for (let i = this.flightWakes.length - 1; i >= 0; i--) {
      const fk = this.flightWakes[i];
      fk.age += dt;
      const t = fk.age / fk.maxAge;
      if (t >= 1) {
        this.group.remove(fk.mesh);
        fk.mat.dispose();
        this.flightWakes.splice(i, 1);
      } else {
        fk.mesh.position.addScaledVector(fk.vel, dt);
        fk.mat.opacity = 0.48 * (1 - t);
      }
    }

    // 2. Cosmic Blast projectiles
    for (let i = this.cosmicBlasts.length - 1; i >= 0; i--) {
      const b = this.cosmicBlasts[i];
      b.age += dt;
      b.pos.addScaledVector(b.vel, dt);
      b.group.position.copy(b.pos);
      b.ring.rotation.x += dt * 7;
      b.ring.rotation.y += dt * 5;

      let impacted = false;
      let hitTargetId: string | null = null;
      for (const probe of targetProbes) {
        this._tmpA.set(probe.position.x, probe.position.y + 0.95, probe.position.z);
        if (this._tmpA.distanceToSquared(b.pos) <= 1.25 * 1.25) {
          impacted = true;
          hitTargetId = probe.id;
          break;
        }
      }

      const groundY = getGroundSurfaceY(b.pos.x, b.pos.z, b.pos.y + 0.6);
      if (!impacted && b.pos.y <= groundY + 0.14) {
        b.pos.y = groundY + 0.14;
        impacted = true;
      }

      if (impacted || b.age >= b.maxAge) {
        if (impacted) {
          this.spawnCosmicExplosion(b.pos, 4.2);
          onCosmicBlastImpact(b.pos.clone(), hitTargetId);
        }
        this.group.remove(b.group);
        (b.core.material as THREE.Material).dispose();
        (b.halo.material as THREE.Material).dispose();
        (b.ring.material as THREE.Material).dispose();
        this.cosmicBlasts.splice(i, 1);
      }
    }

    // 3. Lightning arcs
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      arc.age += dt;
      const t = arc.age / arc.maxAge;
      if (t >= 1) {
        arc.segments.forEach((s) => this.group.remove(s));
        arc.mats.forEach((m) => m.dispose());
        this.arcs.splice(i, 1);
      } else {
        const op = 0.92 * (1 - t);
        arc.mats.forEach((m) => {
          m.opacity = op;
        });
      }
    }

    // 4. Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const t = THREE.MathUtils.clamp(b.age / b.duration, 0, 1);
      const ease = 1 - Math.pow(1 - t, 2.5);
      b.ring.scale.setScalar(0.35 + b.targetScale * ease);
      b.ringMat.opacity = 0.9 * (1 - t);
      b.dome.scale.setScalar(0.4 + b.targetScale * 0.6 * ease);
      b.domeMat.opacity = 0.46 * (1 - t);
      if (t >= 1) {
        this.group.remove(b.group);
        b.ringMat.dispose();
        b.domeMat.dispose();
        this.bursts.splice(i, 1);
      }
    }

    // 5. Cosmic particles & sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      const t = s.age / s.maxAge;
      if (t >= 1) {
        this.group.remove(s.mesh);
        s.mat.dispose();
        this.sparks.splice(i, 1);
      } else {
        s.vel.y -= s.gravity * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += dt * 7;
        s.mesh.rotation.y += dt * 6;
        s.mat.opacity = 0.92 * (1 - t);
      }
    }
  }

  public clearAll(): void {
    this.absorbGroup.visible = false;
    this.chargeGroup.visible = false;
    this.dualBeamGroup.visible = false;

    for (const w of this.sonicWaves) {
      this.group.remove(w.group);
      w.mats.forEach((m) => m.dispose());
    }
    this.sonicWaves.length = 0;

    for (const tr of this.sonicEchoes) {
      this.group.remove(tr.mesh);
      tr.mat.dispose();
    }
    this.sonicEchoes.length = 0;

    for (const fk of this.flightWakes) {
      this.group.remove(fk.mesh);
      fk.mat.dispose();
    }
    this.flightWakes.length = 0;

    for (const b of this.cosmicBlasts) {
      this.group.remove(b.group);
      (b.core.material as THREE.Material).dispose();
      (b.halo.material as THREE.Material).dispose();
      (b.ring.material as THREE.Material).dispose();
    }
    this.cosmicBlasts.length = 0;

    for (const arc of this.arcs) {
      arc.segments.forEach((s) => this.group.remove(s));
      arc.mats.forEach((m) => m.dispose());
    }
    this.arcs.length = 0;

    for (const br of this.bursts) {
      this.group.remove(br.group);
      br.ringMat.dispose();
      br.domeMat.dispose();
    }
    this.bursts.length = 0;

    for (const sp of this.sparks) {
      this.group.remove(sp.mesh);
      sp.mat.dispose();
    }
    this.sparks.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.sphereGeo.dispose();
    this.ringGeo.dispose();
    this.sonicTorusMainGeo.dispose();
    this.sonicTorusInnerGeo.dispose();
    this.sonicTorusOuterGeo.dispose();
    this.burstRingGeo.dispose();
    this.domeGeo.dispose();
    this.rectUnitGeo.dispose();
    this.particleGeo.dispose();
    this.beamCylGeo.dispose();
    this.absorbCoreMat.dispose();
    this.absorbRingMat.dispose();
    (this.chargeCore.material as THREE.Material).dispose();
    (this.chargeRing.material as THREE.Material).dispose();
    (this.leftBeamCore.material as THREE.Material).dispose();
    (this.leftBeamGlow.material as THREE.Material).dispose();
    (this.rightBeamCore.material as THREE.Material).dispose();
    (this.rightBeamGlow.material as THREE.Material).dispose();
    (this.leftHandFlare.material as THREE.Material).dispose();
    (this.rightHandFlare.material as THREE.Material).dispose();
    (this.convergeCore.material as THREE.Material).dispose();
    (this.convergeHalo.material as THREE.Material).dispose();
    (this.convergeRing.material as THREE.Material).dispose();
  }
}
