import * as THREE from 'three';
import { getGroundSurfaceY, hasLineOfSight } from './physics';
import { buildVibraniumShieldGroup, VibraniumShieldRig } from './vibraniumShield';
import type { CombatTargetProbe } from './scarletWitchAbilities';

export type CapShieldThrowPhase = 'idle' | 'to-first' | 'to-second' | 'returning';

interface ShieldShockwave {
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  core: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface KineticSpark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

const TRAIL_SEGMENTS = 18;

/**
 * Captain America Visual Effects & Vibranium Shield Projectile System:
 * 1. Spinning Vibranium shield projectile (throw -> ricochet curve to 2nd target -> return -> catch)
 * 2. Concentric kinetic impact shockwaves & sparks (Shield Throw & 3-hit Shield Combo)
 * 3. Forward Shield Charge aerodynamic wake barrier & dust sparks
 */
export class CaptainAmericaVfxSystem {
  public readonly group = new THREE.Group();

  private readonly shieldRig: VibraniumShieldRig;
  private readonly shieldWrapper = new THREE.Group();
  private readonly shieldHalo: THREE.Mesh;
  private readonly shieldHaloMat: THREE.MeshBasicMaterial;

  // Ribbon/line wake behind spinning thrown shield
  private readonly trailPoints: THREE.Vector3[] = [];
  private readonly trailPositions = new Float32Array(TRAIL_SEGMENTS * 3);
  private readonly trailGeo: THREE.BufferGeometry;
  private readonly trailMat: THREE.LineBasicMaterial;
  private readonly trailLine: THREE.Line;

  // Shield Charge forward kinetic shock-arc
  private readonly chargeArcGroup = new THREE.Group();
  private readonly chargeArcMat: THREE.MeshBasicMaterial;
  private readonly chargeRimMat: THREE.MeshBasicMaterial;

  private readonly shockwaves: ShieldShockwave[] = [];
  private readonly sparks: KineticSpark[] = [];

  private readonly ringGeo = new THREE.RingGeometry(0.4, 0.72, 28);
  private readonly sphereGeo = new THREE.SphereGeometry(0.32, 12, 10);
  private readonly sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.22);

  // Throw state
  private throwPhase: CapShieldThrowPhase = 'idle';
  private throwElapsed = 0;
  private shieldPos = new THREE.Vector3();
  private shieldPrevPos = new THREE.Vector3();
  private shieldDir = new THREE.Vector3(0, 0, -1);
  private firstTargetId: string | null = null;
  private secondTargetId: string | null = null;
  private hitIds = new Set<string>();
  private aimDest = new THREE.Vector3();
  private curveStart = new THREE.Vector3();
  private curveCtrl = new THREE.Vector3();
  private curveT = 0;
  private curveDur = 0.28;

  private chargeSparkAccum = 0;
  private time = 0;

  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpC = new THREE.Vector3();
  private readonly _tmpD = new THREE.Vector3();

  constructor() {
    this.shieldRig = buildVibraniumShieldGroup(1.06);
    // Orient shield horizontally like a flying discus spinning around Y
    this.shieldRig.group.rotation.x = -Math.PI * 0.5;
    this.shieldWrapper.add(this.shieldRig.group);

    this.shieldHaloMat = new THREE.MeshBasicMaterial({
      color: '#93D5FF',
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.shieldHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 28),
      this.shieldHaloMat,
    );
    this.shieldHalo.rotation.x = -Math.PI * 0.5;
    this.shieldWrapper.add(this.shieldHalo);
    this.shieldWrapper.visible = false;
    this.group.add(this.shieldWrapper);

    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      this.trailPoints.push(new THREE.Vector3());
    }
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3),
    );
    this.trailMat = new THREE.LineBasicMaterial({
      color: '#BAE6FD',
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.trailLine.visible = false;
    this.trailLine.frustumCulled = false;
    this.group.add(this.trailLine);

    // Shield Charge forward kinetic shock-cone
    this.chargeArcMat = new THREE.MeshBasicMaterial({
      color: '#60A5FA',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.chargeRimMat = new THREE.MeshBasicMaterial({
      color: '#E0F2FE',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coneMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 1.08, 1.35, 20, 1, true),
      this.chargeArcMat,
    );
    coneMesh.rotation.x = -Math.PI * 0.5;
    coneMesh.position.set(0, 0, -0.32);
    const frontRing = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.66, 24),
      this.chargeRimMat,
    );
    frontRing.position.set(0, 0, -0.78);
    this.chargeArcGroup.add(coneMesh, frontRing);
    this.chargeArcGroup.visible = false;
    this.group.add(this.chargeArcGroup);
  }

  public getThrowPhase(): CapShieldThrowPhase {
    return this.throwPhase;
  }

  public isShieldAway(): boolean {
    return this.throwPhase !== 'idle';
  }

  public launchShieldThrow(
    startPos: THREE.Vector3,
    aimPoint: THREE.Vector3,
    targetId: string | null,
  ): void {
    this.throwPhase = 'to-first';
    this.throwElapsed = 0;
    this.shieldPos.copy(startPos);
    this.shieldPrevPos.copy(startPos);
    this.firstTargetId = targetId;
    this.secondTargetId = null;
    this.hitIds.clear();
    this.aimDest.copy(aimPoint);

    this.shieldDir.subVectors(aimPoint, startPos);
    if (this.shieldDir.lengthSq() < 1e-4) {
      this.shieldDir.set(0, 0, -1);
    } else {
      this.shieldDir.normalize();
    }

    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      this.trailPoints[i].copy(startPos);
      this.trailPositions[i * 3] = startPos.x;
      this.trailPositions[i * 3 + 1] = startPos.y;
      this.trailPositions[i * 3 + 2] = startPos.z;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
    this.shieldWrapper.position.copy(startPos);
    this.shieldWrapper.visible = true;
    this.trailLine.visible = true;
  }

  public spawnShockwave(pos: THREE.Vector3, colorHex = '#93C5FD', maxScale = 2.4): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI * 0.5;
    ring.scale.setScalar(0.45);
    this.group.add(ring);

    const coreMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.position.copy(pos);
    core.scale.setScalar(0.5);
    this.group.add(core);

    this.shockwaves.push({
      ring,
      ringMat,
      core,
      coreMat,
      age: 0,
      maxAge: 0.34,
      maxScale,
    });
  }

  public spawnSparks(pos: THREE.Vector3, count: number, colorHex = '#E0F2FE', speed = 8.5): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#EF4444' : colorHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI * 0.65;
      const spd = speed * (0.55 + Math.random() * 0.7);
      const vel = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi) * spd,
        Math.sin(phi) * spd + 1.8,
        Math.sin(theta) * Math.cos(phi) * spd,
      );
      this._tmpA.copy(pos).add(vel);
      mesh.lookAt(this._tmpA);
      this.group.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel,
        age: 0,
        maxAge: 0.22 + Math.random() * 0.16,
      });
    }
  }

  public spawnComboStrike(pos: THREE.Vector3, forward: THREE.Vector3, isFinisher: boolean): void {
    this._tmpB.copy(pos).addScaledVector(forward, 0.85);
    this._tmpB.y += 1.05;
    this.spawnShockwave(
      this._tmpB,
      isFinisher ? '#60A5FA' : '#BAE6FD',
      isFinisher ? 3.2 : 1.75,
    );
    this.spawnSparks(this._tmpB, isFinisher ? 16 : 8, isFinisher ? '#93C5FD' : '#FFFFFF', isFinisher ? 11.5 : 7.5);
  }

  public update(
    dt: number,
    playerCatchWorldPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    playerYaw: number,
    chargeActive: boolean,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onShieldHit: (targetId: string, hitDir: THREE.Vector3, hitPos: THREE.Vector3) => void,
    onShieldCatch: () => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;

    // 1. Update Shield Charge Kinetic Barrier & Wake Sparks
    if (chargeActive) {
      this.chargeArcGroup.visible = true;
      const fwdX = -Math.sin(playerYaw);
      const fwdZ = -Math.cos(playerYaw);
      this.chargeArcGroup.position.set(
        playerPos.x + fwdX * 0.55,
        playerPos.y + 1.1,
        playerPos.z + fwdZ * 0.55,
      );
      this.chargeArcGroup.rotation.set(0, playerYaw, 0);
      const pulse = 0.94 + Math.sin(this.time * 24) * 0.07;
      this.chargeArcGroup.scale.setScalar(pulse);
      this.chargeArcMat.opacity = 0.28 + Math.sin(this.time * 20) * 0.08;

      this.chargeSparkAccum += safeDt;
      if (this.chargeSparkAccum >= 0.055) {
        this.chargeSparkAccum = 0;
        this._tmpC.set(
          playerPos.x + (Math.random() - 0.5) * 0.9,
          playerPos.y + 0.35 + Math.random() * 0.9,
          playerPos.z + (Math.random() - 0.5) * 0.9,
        );
        this.spawnSparks(this._tmpC, 2, '#93C5FD', 4.5);
      }
    } else {
      this.chargeArcGroup.visible = false;
    }

    // 2. Update Active Thrown Vibranium Shield
    if (this.throwPhase !== 'idle') {
      this.throwElapsed += safeDt;
      this.shieldPrevPos.copy(this.shieldPos);

      if (this.throwPhase === 'to-first') {
        const dest = this._tmpA.copy(this.aimDest);
        if (this.firstTargetId) {
          for (let i = 0; i < targetProbes.length; i++) {
            if (targetProbes[i].id === this.firstTargetId) {
              dest.set(
                targetProbes[i].position.x,
                targetProbes[i].position.y + 1.08,
                targetProbes[i].position.z,
              );
              break;
            }
          }
        }
        const toDest = this._tmpB.subVectors(dest, this.shieldPos);
        const dist = toDest.length();
        const speed = 32;
        if (dist > 0.01) {
          this.shieldDir.copy(toDest).divideScalar(dist);
        }
        const stepDist = Math.min(dist, speed * safeDt);
        this.shieldPos.addScaledVector(this.shieldDir, stepDist);

        // Check probe impact
        let hitProbe: CombatTargetProbe | null = null;
        for (let i = 0; i < targetProbes.length; i++) {
          const p = targetProbes[i];
          if (this.hitIds.has(p.id)) continue;
          this._tmpC.set(p.position.x, p.position.y + 1.05, p.position.z);
          if (this._tmpC.distanceToSquared(this.shieldPos) <= 1.25 * 1.25) {
            hitProbe = p;
            break;
          }
        }

        const hitWall = !hasLineOfSight(
          this.shieldPrevPos.x,
          this.shieldPrevPos.y,
          this.shieldPrevPos.z,
          this.shieldPos.x,
          this.shieldPos.y,
          this.shieldPos.z,
        );
        if (hitProbe) {
          this.hitIds.add(hitProbe.id);
          this.spawnShockwave(this.shieldPos, '#93C5FD', 2.6);
          this.spawnSparks(this.shieldPos, 14, '#FFFFFF', 10.5);
          onShieldHit(hitProbe.id, this.shieldDir, this.shieldPos);

          // Look for second nearby enemy to ricochet/curve toward
          let second: CombatTargetProbe | null = null;
          let bestDistSq = 12.5 * 12.5;
          for (let i = 0; i < targetProbes.length; i++) {
            const p = targetProbes[i];
            if (this.hitIds.has(p.id)) continue;
            this._tmpC.set(p.position.x, p.position.y + 1.05, p.position.z);
            const dSq = this._tmpC.distanceToSquared(this.shieldPos);
            if (dSq < bestDistSq) {
              bestDistSq = dSq;
              second = p;
            }
          }

          if (second) {
            this.secondTargetId = second.id;
            this.throwPhase = 'to-second';
            this.curveStart.copy(this.shieldPos);
            const endPos = this._tmpC.set(
              second.position.x,
              second.position.y + 1.08,
              second.position.z,
            );
            const mid = this._tmpD.addVectors(this.curveStart, endPos).multiplyScalar(0.5);
            const seg = this._tmpB.subVectors(endPos, this.curveStart);
            const perp = new THREE.Vector3(-seg.z, 0, seg.x);
            if (perp.lengthSq() > 1e-4) perp.normalize();
            else perp.set(1, 0, 0);
            const segLen = Math.max(2, seg.length());
            this.curveCtrl.copy(mid).addScaledVector(perp, Math.min(3.4, segLen * 0.36));
            this.curveCtrl.y += 0.35;
            this.curveT = 0;
            this.curveDur = THREE.MathUtils.clamp(segLen / 28, 0.16, 0.46);
          } else {
            this.beginReturn(playerCatchWorldPos);
          }
        } else if (dist <= 0.45 || hitWall || this.throwElapsed >= 0.85) {
          if (hitWall) {
            this.spawnShockwave(this.shieldPos, '#60A5FA', 1.8);
            this.spawnSparks(this.shieldPos, 8, '#BAE6FD', 7.5);
          }
          this.beginReturn(playerCatchWorldPos);
        }
      } else if (this.throwPhase === 'to-second') {
        let targetAlive = false;
        const endPos = this._tmpC.copy(this.shieldPos);
        if (this.secondTargetId) {
          for (let i = 0; i < targetProbes.length; i++) {
            const p = targetProbes[i];
            if (p.id === this.secondTargetId) {
              targetAlive = true;
              endPos.set(p.position.x, p.position.y + 1.08, p.position.z);
              break;
            }
          }
        }
        if (!targetAlive) {
          this.beginReturn(playerCatchWorldPos);
        } else {
          this.curveT = Math.min(1, this.curveT + safeDt / Math.max(0.08, this.curveDur));
          const omt = 1 - this.curveT;
          // Quadratic Bezier curve smoothly curving into 2nd target
          this.shieldPos.set(
            omt * omt * this.curveStart.x + 2 * omt * this.curveT * this.curveCtrl.x + this.curveT * this.curveT * endPos.x,
            omt * omt * this.curveStart.y + 2 * omt * this.curveT * this.curveCtrl.y + this.curveT * this.curveT * endPos.y,
            omt * omt * this.curveStart.z + 2 * omt * this.curveT * this.curveCtrl.z + this.curveT * this.curveT * endPos.z,
          );
          this.shieldDir.subVectors(this.shieldPos, this.shieldPrevPos);
          if (this.shieldDir.lengthSq() > 1e-6) this.shieldDir.normalize();

          if (this.curveT >= 0.96 || this.shieldPos.distanceToSquared(endPos) <= 1.2 * 1.2) {
            this.hitIds.add(this.secondTargetId!);
            this.spawnShockwave(endPos, '#93C5FD', 2.8);
            this.spawnSparks(endPos, 14, '#FFFFFF', 10.5);
            onShieldHit(this.secondTargetId!, this.shieldDir, endPos);
            this.beginReturn(playerCatchWorldPos);
          }
        }
      } else if (this.throwPhase === 'returning') {
        const toHand = this._tmpA.subVectors(playerCatchWorldPos, this.shieldPos);
        const dist = toHand.length();
        const retSpeed = 35;
        if (dist > 0.01) {
          this.shieldDir.copy(toHand).divideScalar(dist);
        }
        // Subtle lateral boomerang curve early in return that settles into exact catch point
        const curveFade = THREE.MathUtils.clamp((dist - 2.2) / 10, 0, 1);
        const step = Math.min(dist, retSpeed * safeDt);
        this.shieldPos.addScaledVector(this.shieldDir, step);
        if (curveFade > 0.02) {
          this.shieldPos.x += -this.shieldDir.z * curveFade * 6.5 * safeDt;
          this.shieldPos.z += this.shieldDir.x * curveFade * 6.5 * safeDt;
        }
        const gY = getGroundSurfaceY(this.shieldPos.x, this.shieldPos.z, this.shieldPos.y + 0.5);
        if (this.shieldPos.y < gY + 0.35) {
          this.shieldPos.y = gY + 0.35;
        }

        if (dist <= 1.05 || this.throwElapsed >= 2.8) {
          this.throwPhase = 'idle';
          this.shieldWrapper.visible = false;
          this.trailLine.visible = false;
          this.spawnSparks(playerCatchWorldPos, 7, '#BAE6FD', 5.5);
          onShieldCatch();
        }
      }

      if (this.throwPhase !== 'idle') {
        this.shieldWrapper.position.copy(this.shieldPos);
        this.shieldWrapper.rotation.y += safeDt * 28;
        this.shieldWrapper.rotation.z = Math.sin(this.time * 14) * 0.14;

        // Shift trail points
        for (let i = TRAIL_SEGMENTS - 1; i > 0; i--) {
          this.trailPoints[i].copy(this.trailPoints[i - 1]);
        }
        this.trailPoints[0].copy(this.shieldPos);
        for (let i = 0; i < TRAIL_SEGMENTS; i++) {
          const p = this.trailPoints[i];
          this.trailPositions[i * 3] = p.x;
          this.trailPositions[i * 3 + 1] = p.y;
          this.trailPositions[i * 3 + 2] = p.z;
        }
        this.trailGeo.attributes.position.needsUpdate = true;
      }
    }

    // 3. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const w = this.shockwaves[i];
      w.age += safeDt;
      const t = w.age / w.maxAge;
      if (t >= 1) {
        this.group.remove(w.ring, w.core);
        w.ringMat.dispose();
        w.coreMat.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - t, 2.2);
      w.ring.scale.setScalar(0.45 + ease * w.maxScale);
      w.ringMat.opacity = (1 - t) * 0.9;
      w.core.scale.setScalar(0.5 + ease * w.maxScale * 0.45);
      w.coreMat.opacity = Math.max(0, 1 - t * 1.45) * 0.85;
    }

    // 4. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += safeDt;
      const t = s.age / s.maxAge;
      if (t >= 1) {
        this.group.remove(s.mesh);
        s.mat.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      s.vel.y -= 14 * safeDt;
      s.mesh.position.addScaledVector(s.vel, safeDt);
      s.mat.opacity = 1 - t;
      s.mesh.scale.setScalar(1 - t * 0.45);
    }
  }

  private beginReturn(playerCatchPos: THREE.Vector3): void {
    this.throwPhase = 'returning';
    this.shieldDir.subVectors(playerCatchPos, this.shieldPos);
    if (this.shieldDir.lengthSq() > 1e-4) this.shieldDir.normalize();
  }

  public clearAll(): void {
    this.throwPhase = 'idle';
    this.firstTargetId = null;
    this.secondTargetId = null;
    this.hitIds.clear();
    this.shieldWrapper.visible = false;
    this.trailLine.visible = false;
    this.chargeArcGroup.visible = false;

    for (const w of this.shockwaves) {
      this.group.remove(w.ring, w.core);
      w.ringMat.dispose();
      w.coreMat.dispose();
    }
    this.shockwaves.length = 0;

    for (const s of this.sparks) {
      this.group.remove(s.mesh);
      s.mat.dispose();
    }
    this.sparks.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.shieldRig.dispose();
    this.shieldHaloMat.dispose();
    this.shieldHalo.geometry.dispose();
    this.trailGeo.dispose();
    this.trailMat.dispose();
    this.chargeArcMat.dispose();
    this.chargeRimMat.dispose();
    this.ringGeo.dispose();
    this.sphereGeo.dispose();
    this.sparkGeo.dispose();
  }
}
