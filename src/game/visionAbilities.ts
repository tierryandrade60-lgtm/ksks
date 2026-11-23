import * as THREE from 'three';
import { CombatTargetProbe } from './scarletWitchAbilities';

let cachedGoldGlowTex: THREE.CanvasTexture | null = null;

function createGoldGlowTexture(): THREE.CanvasTexture {
  if (cachedGoldGlowTex) return cachedGoldGlowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 252, 224, 1)');
  grad.addColorStop(0.32, 'rgba(255, 222, 72, 0.92)');
  grad.addColorStop(0.7, 'rgba(245, 168, 22, 0.35)');
  grad.addColorStop(1.0, 'rgba(180, 108, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGoldGlowTex = tex;
  return tex;
}

interface GoldBolt {
  group: THREE.Group;
  shell: THREE.Mesh;
  ring: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface SmallGoldBolt {
  group: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface GoldBurst {
  group: THREE.Group;
  ring: THREE.Mesh;
  outerRing: THREE.Mesh;
  dome: THREE.Mesh;
  flare: THREE.Sprite;
  age: number;
  duration: number;
  targetScale: number;
}

export class VisionVfxSystem {
  public readonly group = new THREE.Group();

  private readonly glowTex: THREE.CanvasTexture;

  // Mind Stone Continuous Laser
  private laserActive = false;
  private readonly laserGroup = new THREE.Group();
  private readonly laserCore: THREE.Mesh;
  private readonly laserOuter: THREE.Mesh;
  private readonly laserImpactFlare: THREE.Sprite;
  private readonly laserOriginFlare: THREE.Sprite;
  private laserDamageTimer = 0;

  // Mind Stone Explosive Bolt Charge-up
  private boltChargeActive = false;
  private boltChargeProgress = 0;
  private readonly chargeGroup = new THREE.Group();
  private readonly chargeCore: THREE.Mesh;
  private readonly chargeRingA: THREE.Mesh;
  private readonly chargeRingB: THREE.Mesh;
  private readonly chargeFlare: THREE.Sprite;

  // Mind Stone Explosive Bolts & Subtle Small Bolts
  private readonly bolts: GoldBolt[] = [];
  private readonly smallBolts: SmallGoldBolt[] = [];
  private readonly bursts: GoldBurst[] = [];
  private readonly boltCoreGeo = new THREE.SphereGeometry(0.28, 14, 14);
  private readonly boltShellGeo = new THREE.SphereGeometry(0.46, 14, 14);
  private readonly boltRingGeo = new THREE.TorusGeometry(0.58, 0.032, 8, 24);
  private readonly smallCoreGeo = new THREE.SphereGeometry(0.105, 10, 10);
  private readonly smallHaloGeo = new THREE.SphereGeometry(0.18, 10, 10);
  private readonly burstRingGeo = new THREE.RingGeometry(0.32, 0.62, 32);
  private readonly burstOuterRingGeo = new THREE.RingGeometry(0.45, 0.72, 32);
  private readonly burstDomeGeo = new THREE.SphereGeometry(0.85, 18, 14);
  private animTime = 0;

  private readonly _dir = new THREE.Vector3();
  private readonly _mid = new THREE.Vector3();
  private readonly _tmpFwd = new THREE.Vector3();
  private readonly _tmpDetPos = new THREE.Vector3();

  constructor() {
    this.glowTex = createGoldGlowTexture();
    this.burstRingGeo.rotateX(-Math.PI * 0.5);
    this.burstOuterRingGeo.rotateX(-Math.PI * 0.5);

    // Laser beam unit cylinders aligned along +Z (origin at 0, length scaled along Z)
    const coreGeo = new THREE.CylinderGeometry(0.042, 0.042, 1, 10);
    coreGeo.rotateX(Math.PI * 0.5);
    coreGeo.translate(0, 0, 0.5);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff8c8,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.laserCore = new THREE.Mesh(coreGeo, coreMat);

    const outerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
    outerGeo.rotateX(Math.PI * 0.5);
    outerGeo.translate(0, 0, 0.5);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffd238,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.laserOuter = new THREE.Mesh(outerGeo, outerMat);

    this.laserOriginFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.laserOriginFlare.scale.setScalar(0.55);

    this.laserImpactFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.laserImpactFlare.scale.setScalar(1.25);

    this.laserGroup.add(
      this.laserCore,
      this.laserOuter,
      this.laserOriginFlare,
      this.laserImpactFlare,
    );
    this.laserGroup.visible = false;
    this.group.add(this.laserGroup);

    // Explosive Bolt Charge-up at Mind Stone
    this.chargeCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xfff8c6,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeRingA = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.025, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffd842,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeRingB = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.02, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffe985,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.chargeGroup.add(
      this.chargeCore,
      this.chargeRingA,
      this.chargeRingB,
      this.chargeFlare,
    );
    this.chargeGroup.visible = false;
    this.group.add(this.chargeGroup);
  }

  public setLaserActive(active: boolean): void {
    this.laserActive = active;
    this.laserGroup.visible = active;
    if (active) {
      this.laserDamageTimer = 0.22; // Trigger initial hit immediately
    }
  }

  public setBoltCharging(active: boolean, progress = 0): void {
    this.boltChargeActive = active;
    this.boltChargeProgress = THREE.MathUtils.clamp(progress, 0, 1);
    this.chargeGroup.visible = active;
  }

  public spawnMindBolt(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      this.boltCoreGeo,
      new THREE.MeshBasicMaterial({ color: 0xfff8ce }),
    );
    g.add(core);

    const shell = new THREE.Mesh(
      this.boltShellGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffce2e,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    g.add(shell);

    const ring = new THREE.Mesh(
      this.boltRingGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffe97a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    g.add(ring);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(2.15);
    g.add(glow);

    g.position.copy(origin);
    g.lookAt(targetPoint);
    this.group.add(g);

    const dir = this._dir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    dir.normalize();

    this.bolts.push({
      group: g,
      shell,
      ring,
      pos: origin.clone(),
      vel: dir.multiplyScalar(38),
      age: 0,
      maxAge: 1.45,
    });
  }

  /**
   * Launches a small, subtle golden Mind Stone energy bolt (shots 1 & 2 before the large explosive 3rd shot).
   */
  public spawnSmallMindBolt(origin: THREE.Vector3, targetPoint: THREE.Vector3): void {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      this.smallCoreGeo,
      new THREE.MeshBasicMaterial({ color: 0xfff8d4 }),
    );
    const halo = new THREE.Mesh(
      this.smallHaloGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffd238,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flare.scale.setScalar(0.62);
    g.add(core, halo, flare);
    g.position.copy(origin);
    this.group.add(g);

    const dir = this._dir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    dir.normalize();

    this.smallBolts.push({
      group: g,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(42),
      age: 0,
      maxAge: 1.25,
    });
  }

  private spawnBurst(pos: THREE.Vector3, scale = 1): void {
    const g = new THREE.Group();
    g.position.copy(pos);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffdc4d,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.burstRingGeo, ringMat);
    ring.position.y = 0.08;
    g.add(ring);

    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfff3a6,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(this.burstOuterRingGeo, outerRingMat);
    outerRing.position.y = 0.14;
    g.add(outerRing);

    const dome = new THREE.Mesh(
      this.burstDomeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffd238,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    g.add(dome);

    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sp.scale.setScalar(2.6 * scale);
    g.add(sp);

    this.group.add(g);
    this.bursts.push({
      group: g,
      ring,
      outerRing,
      dome,
      flare: sp,
      age: 0,
      duration: 0.52,
      targetScale: scale,
    });
  }

  public update(
    dt: number,
    mindStoneWorldPos: THREE.Vector3,
    laserEndPoint: THREE.Vector3,
    targets: ReadonlyArray<CombatTargetProbe>,
    callbacks: {
      onLaserHitTarget?: (targetId: string, dir: THREE.Vector3, damage: number) => void;
      onBoltHitTarget?: (targetId: string, dir: THREE.Vector3, damage: number) => void;
      onExplosiveBoltDetonate?: (impactPos: THREE.Vector3, forwardDir: THREE.Vector3) => void;
    },
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    // 0. Mind Stone Bolt Charge-up
    if (this.boltChargeActive) {
      const p = this.boltChargeProgress;
      const pulse = 1 + Math.sin(this.animTime * 36) * 0.14;
      const grow = 0.35 + p * 1.15;
      this.chargeGroup.position.copy(mindStoneWorldPos);
      this.chargeCore.scale.setScalar(grow * pulse);
      this.chargeRingA.scale.setScalar(1.35 - p * 0.35);
      this.chargeRingA.rotation.set(this.animTime * 4.5, this.animTime * 3.2, 0);
      this.chargeRingB.scale.setScalar(1.55 - p * 0.5);
      this.chargeRingB.rotation.set(-this.animTime * 3.6, 0, this.animTime * 4.8);
      this.chargeFlare.scale.setScalar((0.75 + p * 1.35) * pulse);
    }

    // 1. Mind Stone Continuous Laser
    if (this.laserActive) {
      this._dir.subVectors(laserEndPoint, mindStoneWorldPos);
      const len = Math.max(0.2, this._dir.length());
      const normDir = this._mid.copy(this._dir).divideScalar(len);

      const pulse = 1 + Math.sin(this.animTime * 48) * 0.16;
      this.laserOriginFlare.position.copy(mindStoneWorldPos);
      this.laserOriginFlare.scale.setScalar(0.55 * pulse);

      this.laserImpactFlare.position.copy(laserEndPoint);
      this.laserImpactFlare.scale.setScalar(1.25 * pulse);

      this.laserCore.position.copy(mindStoneWorldPos);
      this.laserCore.lookAt(laserEndPoint);
      this.laserCore.scale.set(pulse, pulse, len);

      this.laserOuter.position.copy(mindStoneWorldPos);
      this.laserOuter.lookAt(laserEndPoint);
      this.laserOuter.scale.set(pulse * 1.15, pulse * 1.15, len);

      // Periodic beam damage against NPCs intersected along laser segment
      this.laserDamageTimer += safeDt;
      if (this.laserDamageTimer >= 0.25) {
        this.laserDamageTimer -= 0.25;
        const seg = this._dir;
        for (const t of targets) {
          const targetCenterY = t.position.y + 1.05;
          const toNpcX = t.position.x - mindStoneWorldPos.x;
          const toNpcY = targetCenterY - mindStoneWorldPos.y;
          const toNpcZ = t.position.z - mindStoneWorldPos.z;
          const proj =
            toNpcX * normDir.x + toNpcY * normDir.y + toNpcZ * normDir.z;
          if (proj < 0 || proj > len + 0.6) continue;
          const closestX = mindStoneWorldPos.x + normDir.x * proj;
          const closestY = mindStoneWorldPos.y + normDir.y * proj;
          const closestZ = mindStoneWorldPos.z + normDir.z * proj;
          const perpDist = Math.hypot(
            t.position.x - closestX,
            targetCenterY - closestY,
            t.position.z - closestZ,
          );
          if (perpDist <= 0.92) {
            this._tmpFwd.copy(seg).setY(0).normalize();
            callbacks.onLaserHitTarget?.(t.id, this._tmpFwd, 12);
          }
        }
      }
    }

    // 2. Mind Stone Explosive Bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.age += safeDt;
      b.pos.addScaledVector(b.vel, safeDt);
      b.group.position.copy(b.pos);
      const pulse = 1 + Math.sin(this.animTime * 28 + i) * 0.1;
      b.shell.scale.setScalar(pulse);
      b.ring.rotation.x += safeDt * 7.5;
      b.ring.rotation.y += safeDt * 5.2;

      let hitId: string | null = null;
      for (const t of targets) {
        const d = Math.hypot(
          b.pos.x - t.position.x,
          b.pos.y - (t.position.y + 1.0),
          b.pos.z - t.position.z,
        );
        if (d <= 1.08) {
          hitId = t.id;
          break;
        }
      }

      if (hitId || b.pos.y <= 0.2 || b.age >= b.maxAge) {
        const detPos = this._tmpDetPos.copy(b.pos);
        if (detPos.y < 0.15) detPos.y = 0.15;
        const fwd = this._tmpFwd.copy(b.vel).setY(0);
        if (fwd.lengthSq() > 0.0001) fwd.normalize();
        else fwd.set(0, 0, -1);

        callbacks.onExplosiveBoltDetonate?.(detPos, fwd);
        if (!callbacks.onExplosiveBoltDetonate && hitId) {
          callbacks.onBoltHitTarget?.(hitId, fwd, 40);
        }
        this.spawnBurst(detPos, 2.35);
        this.disposeGroupMaterials(b.group);
        this.bolts.splice(i, 1);
      }
    }

    // 2b. Small Subtle Mind Stone Bolts
    for (let i = this.smallBolts.length - 1; i >= 0; i--) {
      const sb = this.smallBolts[i];
      sb.age += safeDt;
      sb.pos.addScaledVector(sb.vel, safeDt);
      sb.group.position.copy(sb.pos);

      let hitId: string | null = null;
      for (const t of targets) {
        const d = Math.hypot(
          sb.pos.x - t.position.x,
          sb.pos.y - (t.position.y + 1.0),
          sb.pos.z - t.position.z,
        );
        if (d <= 0.85) {
          hitId = t.id;
          break;
        }
      }

      if (hitId || sb.pos.y <= 0.14 || sb.age >= sb.maxAge) {
        const fwd = this._tmpFwd.copy(sb.vel).setY(0);
        if (fwd.lengthSq() > 0.0001) fwd.normalize();
        else fwd.set(0, 0, -1);
        if (hitId) {
          callbacks.onBoltHitTarget?.(hitId, fwd, 14);
        }
        this.spawnBurst(sb.pos, 0.72);
        this.disposeGroupMaterials(sb.group);
        this.smallBolts.splice(i, 1);
      }
    }

    // 3. Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const br = this.bursts[i];
      br.age += safeDt;
      const p = Math.min(1, br.age / br.duration);
      const easeOut = 1 - Math.pow(1 - p, 2.2);
      br.ring.scale.setScalar(1 + easeOut * 4.8 * br.targetScale);
      (br.ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.95;
      br.outerRing.scale.setScalar(1 + easeOut * 6.4 * br.targetScale);
      (br.outerRing.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.72;
      br.dome.scale.setScalar(0.5 + easeOut * 2.8 * br.targetScale);
      (br.dome.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.65;
      br.flare.scale.setScalar((2.4 + easeOut * 2.6) * br.targetScale);
      (br.flare.material as THREE.SpriteMaterial).opacity = (1 - p) * 0.95;
      if (p >= 1) {
        this.disposeGroupMaterials(br.group);
        this.bursts.splice(i, 1);
      }
    }
  }

  private disposeGroupMaterials(grp: THREE.Group): void {
    this.group.remove(grp);
    grp.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
  }

  public clearAll(): void {
    this.setLaserActive(false);
    this.setBoltCharging(false, 0);
    for (const b of this.bolts) this.disposeGroupMaterials(b.group);
    this.bolts.length = 0;
    for (const sb of this.smallBolts) this.disposeGroupMaterials(sb.group);
    this.smallBolts.length = 0;
    for (const br of this.bursts) this.disposeGroupMaterials(br.group);
    this.bursts.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.boltCoreGeo.dispose();
    this.boltShellGeo.dispose();
    this.boltRingGeo.dispose();
    this.smallCoreGeo.dispose();
    this.smallHaloGeo.dispose();
    this.burstRingGeo.dispose();
    this.burstOuterRingGeo.dispose();
    this.burstDomeGeo.dispose();
    this.laserCore.geometry.dispose();
    (this.laserCore.material as THREE.Material).dispose();
    this.laserOuter.geometry.dispose();
    (this.laserOuter.material as THREE.Material).dispose();
    (this.laserOriginFlare.material as THREE.Material).dispose();
    (this.laserImpactFlare.material as THREE.Material).dispose();
    this.chargeCore.geometry.dispose();
    (this.chargeCore.material as THREE.Material).dispose();
    this.chargeRingA.geometry.dispose();
    (this.chargeRingA.material as THREE.Material).dispose();
    this.chargeRingB.geometry.dispose();
    (this.chargeRingB.material as THREE.Material).dispose();
    (this.chargeFlare.material as THREE.Material).dispose();
  }
}
