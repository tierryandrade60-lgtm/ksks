import * as THREE from 'three';
import { hasLineOfSight } from './physics';
import { CombatTargetProbe } from './scarletWitchAbilities';

interface CloakParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  elapsed: number;
  duration: number;
  vel: THREE.Vector3;
  baseScale: number;
}

interface BarrierDisc {
  group: THREE.Group;
  discMat: THREE.MeshBasicMaterial;
  rimMat: THREE.MeshBasicMaterial;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  elapsed: number;
  maxLife: number;
  active: boolean;
}

interface ImpactBurst {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
  active: boolean;
}

function createForcefieldSphereMaterial(
  baseColorHex: string,
  rimColorHex: string,
  centerAlpha: number,
  rimAlpha: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColorHex) },
      uRimColor: { value: new THREE.Color(rimColorHex) },
      uCenterAlpha: { value: centerAlpha },
      uRimAlpha: { value: rimAlpha },
      uFlash: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      uniform float uCenterAlpha;
      uniform float uRimAlpha;
      uniform float uFlash;
      uniform float uTime;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 n = normalize(vNormalView);
        vec3 v = normalize(vViewPos);
        float ndotv = abs(dot(n, v));
        float fresnel = pow(1.0 - ndotv, 2.15);
        float ripple = 0.5 + 0.5 * sin(vLocalPos.y * 8.5 - uTime * 4.2 + sin(vLocalPos.x * 6.0) * 1.3);
        vec3 col = mix(uBaseColor, uRimColor, clamp(fresnel * 1.15 + ripple * 0.14 + uFlash * 0.6, 0.0, 1.0));
        float alpha = mix(uCenterAlpha, uRimAlpha, fresnel) + ripple * 0.045 + uFlash * 0.34;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export class InvisibleWomanVfxSystem {
  public readonly group = new THREE.Group();

  // 1. Kneeling circular Forcefield flight platform
  private readonly platformGroup = new THREE.Group();
  private readonly platformDiscMat: THREE.MeshBasicMaterial;
  private readonly platformOuterRingMat: THREE.MeshBasicMaterial;
  private readonly platformInnerRingMat: THREE.MeshBasicMaterial;
  private readonly platformOuterRing: THREE.Mesh;
  private readonly platformInnerRing: THREE.Mesh;
  private platformBlend = 0;

  // 2. Owner Forcefield shield sphere
  private readonly ownerSphereGroup = new THREE.Group();
  private readonly ownerSphereMat: THREE.ShaderMaterial;
  private readonly ownerRingA: THREE.Mesh;
  private readonly ownerRingB: THREE.Mesh;
  private readonly ownerRingAMat: THREE.MeshBasicMaterial;
  private readonly ownerRingBMat: THREE.MeshBasicMaterial;
  private ownerSphereBlend = 0;
  private ownerDeflectFlash = 0;

  // 3. Target Forcefield shield sphere (normal / protection / suffocation head-shrink)
  private readonly targetSphereGroup = new THREE.Group();
  private readonly targetSphereMat: THREE.ShaderMaterial;
  private readonly targetRing: THREE.Mesh;
  private readonly targetRingMat: THREE.MeshBasicMaterial;
  private targetSphereBlend = 0;
  private targetCurrentRadius = 1.12;
  private readonly targetCurrentPos = new THREE.Vector3();
  private targetPosInitialized = false;

  // 4. Invisibility descending/ascending Forcefield particles
  private readonly cloakParticles: CloakParticle[] = [];
  private readonly particleGeo = new THREE.SphereGeometry(0.055, 6, 5);
  private cloakSpawnAccum = 0;

  // 5. Straight-line Forcefield Barrier discs & impact bursts
  private readonly barrierDiscs: BarrierDisc[] = [];
  private readonly barrierDiscGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.055, 28);
  private readonly barrierRimGeo = new THREE.TorusGeometry(0.68, 0.032, 8, 34);
  private readonly barrierCoreRingGeo = new THREE.RingGeometry(0.32, 0.42, 24);
  private readonly impactBursts: ImpactBurst[] = [];
  private readonly burstSphereGeo = new THREE.SphereGeometry(0.5, 12, 10);
  private readonly burstRingGeo = new THREE.RingGeometry(0.45, 0.72, 24);

  // Reusable scratch vectors (zero per-frame heap allocations)
  private readonly _prevPos = new THREE.Vector3();
  private readonly _hitDir = new THREE.Vector3();
  private readonly _desiredTargetPos = new THREE.Vector3();
  private time = 0;

  constructor() {
    // --- Flight Platform ---
    const platDiscGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.042, 34);
    this.platformDiscMat = new THREE.MeshBasicMaterial({
      color: '#4EC6FF',
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const platDisc = new THREE.Mesh(platDiscGeo, this.platformDiscMat);
    this.platformGroup.add(platDisc);

    const platOuterGeo = new THREE.TorusGeometry(1.04, 0.03, 10, 42);
    platOuterGeo.rotateX(Math.PI / 2);
    this.platformOuterRingMat = new THREE.MeshBasicMaterial({
      color: '#C2EEFF',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.platformOuterRing = new THREE.Mesh(platOuterGeo, this.platformOuterRingMat);
    this.platformGroup.add(this.platformOuterRing);

    const platInnerGeo = new THREE.RingGeometry(0.56, 0.64, 28);
    platInnerGeo.rotateX(-Math.PI / 2);
    this.platformInnerRingMat = new THREE.MeshBasicMaterial({
      color: '#7CD8FF',
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.platformInnerRing = new THREE.Mesh(platInnerGeo, this.platformInnerRingMat);
    this.platformInnerRing.position.y = 0.025;
    this.platformGroup.add(this.platformInnerRing);
    this.platformGroup.visible = false;
    this.group.add(this.platformGroup);

    // --- Owner Forcefield Sphere ---
    const sphereGeo = new THREE.SphereGeometry(1.22, 28, 22);
    this.ownerSphereMat = createForcefieldSphereMaterial('#2294FF', '#BCEBFF', 0.14, 0.68);
    const ownerSphereMesh = new THREE.Mesh(sphereGeo, this.ownerSphereMat);
    ownerSphereMesh.renderOrder = 3;
    this.ownerSphereGroup.add(ownerSphereMesh);

    const eqRingGeo = new THREE.TorusGeometry(1.23, 0.02, 8, 42);
    this.ownerRingAMat = new THREE.MeshBasicMaterial({
      color: '#AEE8FF',
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownerRingA = new THREE.Mesh(eqRingGeo, this.ownerRingAMat);
    this.ownerRingA.rotation.x = Math.PI * 0.42;
    this.ownerSphereGroup.add(this.ownerRingA);

    this.ownerRingBMat = new THREE.MeshBasicMaterial({
      color: '#5CCBFF',
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ownerRingB = new THREE.Mesh(eqRingGeo, this.ownerRingBMat);
    this.ownerRingB.rotation.set(Math.PI * 0.25, Math.PI * 0.35, 0);
    this.ownerSphereGroup.add(this.ownerRingB);

    this.ownerSphereGroup.visible = false;
    this.group.add(this.ownerSphereGroup);

    // --- Target Forcefield Sphere ---
    const targetSphereGeo = new THREE.SphereGeometry(1.0, 26, 20);
    this.targetSphereMat = createForcefieldSphereMaterial('#299AFF', '#C7F0FF', 0.16, 0.72);
    const targetSphereMesh = new THREE.Mesh(targetSphereGeo, this.targetSphereMat);
    targetSphereMesh.renderOrder = 3;
    this.targetSphereGroup.add(targetSphereMesh);

    const targetRingGeo = new THREE.TorusGeometry(1.01, 0.022, 8, 38);
    this.targetRingMat = new THREE.MeshBasicMaterial({
      color: '#BEEFFF',
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.targetRing = new THREE.Mesh(targetRingGeo, this.targetRingMat);
    this.targetRing.rotation.x = Math.PI * 0.46;
    this.targetSphereGroup.add(this.targetRing);
    this.targetSphereGroup.visible = false;
    this.group.add(this.targetSphereGroup);

    // --- Cloak Particle Pool ---
    for (let i = 0; i < 42; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#9CE4FF' : '#40BFFF',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.cloakParticles.push({
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.45,
        vel: new THREE.Vector3(),
        baseScale: 1,
      });
    }

    // --- Forcefield Barrier Disc Pool ---
    this.barrierCoreRingGeo.rotateX(-Math.PI / 2);
    this.barrierRimGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const discGroup = new THREE.Group();
      const discMat = new THREE.MeshBasicMaterial({
        color: '#38B6FF',
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const rimMat = new THREE.MeshBasicMaterial({
        color: '#D4F3FF',
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const discMesh = new THREE.Mesh(this.barrierDiscGeo, discMat);
      const rimMesh = new THREE.Mesh(this.barrierRimGeo, rimMat);
      const innerRing = new THREE.Mesh(this.barrierCoreRingGeo, rimMat);
      innerRing.position.y = 0.03;
      discGroup.add(discMesh, rimMesh, innerRing);
      discGroup.visible = false;
      this.group.add(discGroup);
      this.barrierDiscs.push({
        group: discGroup,
        discMat,
        rimMat,
        pos: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 0, -1),
        speed: 27,
        elapsed: 0,
        maxLife: 1.25,
        active: false,
      });
    }

    // --- Impact Burst Pool ---
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#7DD3FC',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#E0F7FF',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.burstSphereGeo, mat);
      const ring = new THREE.Mesh(this.burstRingGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      ring.visible = false;
      this.group.add(mesh, ring);
      this.impactBursts.push({
        mesh,
        ring,
        mat,
        ringMat,
        elapsed: 0,
        duration: 0.34,
        active: false,
      });
    }
  }

  public triggerOwnerDeflectFlash(): void {
    this.ownerDeflectFlash = 1.0;
  }

  public spawnBarrierDisc(origin: THREE.Vector3, dir: THREE.Vector3): void {
    let slot: BarrierDisc | null = null;
    for (let i = 0; i < this.barrierDiscs.length; i++) {
      if (!this.barrierDiscs[i].active) {
        slot = this.barrierDiscs[i];
        break;
      }
    }
    if (!slot) {
      slot = this.barrierDiscs[0];
    }
    slot.active = true;
    slot.elapsed = 0;
    slot.pos.copy(origin);
    slot.dir.copy(dir).normalize();
    slot.speed = 50.0;
    slot.maxLife = 0.72;
    slot.group.visible = true;
    slot.group.position.copy(origin);
    slot.group.rotation.set(0, Math.atan2(-slot.dir.x, -slot.dir.z), 0);
    slot.discMat.opacity = 0.44;
    slot.rimMat.opacity = 0.95;
  }

  public spawnCloakParticles(
    basePos: THREE.Vector3,
    cutLocalY: number,
    direction: 'down' | 'up',
    count = 3,
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.cloakParticles.length && spawned < count; i++) {
      const p = this.cloakParticles[i];
      if (p.active) continue;
      p.active = true;
      p.elapsed = 0;
      p.duration = 0.38 + Math.random() * 0.22;
      const angle = Math.random() * Math.PI * 2;
      const rad = 0.22 + Math.random() * 0.32;
      p.mesh.position.set(
        basePos.x + Math.cos(angle) * rad,
        basePos.y + cutLocalY + (Math.random() - 0.5) * 0.14,
        basePos.z + Math.sin(angle) * rad,
      );
      p.vel.set(
        Math.cos(angle) * 0.32,
        direction === 'down' ? -(1.25 + Math.random() * 0.9) : 1.15 + Math.random() * 0.85,
        Math.sin(angle) * 0.32,
      );
      p.baseScale = 0.65 + Math.random() * 0.65;
      p.mesh.scale.setScalar(p.baseScale);
      p.mesh.visible = true;
      p.mat.opacity = 0.9;
      spawned++;
    }
  }

  private spawnImpactBurst(pos: THREE.Vector3): void {
    let burst: ImpactBurst | null = null;
    for (let i = 0; i < this.impactBursts.length; i++) {
      if (!this.impactBursts[i].active) {
        burst = this.impactBursts[i];
        break;
      }
    }
    if (!burst) burst = this.impactBursts[0];
    burst.active = true;
    burst.elapsed = 0;
    burst.duration = 0.34;
    burst.mesh.position.copy(pos);
    burst.ring.position.set(pos.x, Math.max(0.06, pos.y), pos.z);
    burst.mesh.scale.setScalar(0.35);
    burst.ring.scale.setScalar(0.45);
    burst.mesh.visible = true;
    burst.ring.visible = true;
    burst.mat.opacity = 0.78;
    burst.ringMat.opacity = 0.88;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    showPlatform: boolean,
    ownerShieldActive: boolean,
    cloakAnim: { active: boolean; phase: 'idle' | 'vanishing' | 'cloaked' | 'revealing'; cutLocalY: number },
    targetShield: {
      active: boolean;
      mode: 'idle' | 'choosing' | 'protection' | 'suffocation';
      torsoPos: THREE.Vector3;
      headPos: THREE.Vector3;
      hasTarget: boolean;
    },
    targetProbes: readonly CombatTargetProbe[],
    onBarrierHit: (targetId: string, hitDir: THREE.Vector3, hitPos: THREE.Vector3) => void,
  ): void {
    const safeDt = Math.min(Math.max(dt, 0.0001), 0.05);
    this.time += safeDt;

    // 1. Kneeling Forcefield Flight Disc Platform
    const targetPlat = showPlatform ? 1 : 0;
    this.platformBlend = THREE.MathUtils.damp(this.platformBlend, targetPlat, 12, safeDt);
    if (this.platformBlend > 0.015) {
      this.platformGroup.visible = true;
      this.platformGroup.position.set(playerPos.x, playerPos.y + 0.14, playerPos.z);
      const s = 0.45 + 0.55 * this.platformBlend;
      this.platformGroup.scale.set(s, 1, s);
      const pulse = 0.92 + Math.sin(this.time * 4.5) * 0.08;
      this.platformDiscMat.opacity = 0.28 * this.platformBlend * pulse;
      this.platformOuterRingMat.opacity = 0.88 * this.platformBlend;
      this.platformInnerRingMat.opacity = 0.58 * this.platformBlend;
      this.platformInnerRing.rotation.z += safeDt * 1.1;
    } else {
      this.platformGroup.visible = false;
    }

    // 2. Owner Forcefield Sphere
    const targetOwnerSphere = ownerShieldActive ? 1 : 0;
    this.ownerSphereBlend = THREE.MathUtils.damp(
      this.ownerSphereBlend,
      targetOwnerSphere,
      14,
      safeDt,
    );
    if (this.ownerDeflectFlash > 0) {
      this.ownerDeflectFlash = Math.max(0, this.ownerDeflectFlash - safeDt * 3.8);
    }
    if (this.ownerSphereBlend > 0.015) {
      this.ownerSphereGroup.visible = true;
      this.ownerSphereGroup.position.set(playerPos.x, playerPos.y + 1.08, playerPos.z);
      const s = 0.35 + 0.65 * this.ownerSphereBlend;
      this.ownerSphereGroup.scale.setScalar(s);
      this.ownerSphereMat.uniforms.uTime.value = this.time;
      this.ownerSphereMat.uniforms.uFlash.value = this.ownerDeflectFlash;
      this.ownerSphereMat.uniforms.uCenterAlpha.value = 0.14 * this.ownerSphereBlend;
      this.ownerSphereMat.uniforms.uRimAlpha.value = 0.7 * this.ownerSphereBlend;
      this.ownerRingAMat.opacity = (0.48 + this.ownerDeflectFlash * 0.35) * this.ownerSphereBlend;
      this.ownerRingBMat.opacity = (0.42 + this.ownerDeflectFlash * 0.3) * this.ownerSphereBlend;
      this.ownerRingA.rotation.y += safeDt * 1.4;
      this.ownerRingB.rotation.z -= safeDt * 1.1;
    } else {
      this.ownerSphereGroup.visible = false;
    }

    // 3. Target Forcefield Sphere (Normal / Protection / Suffocation head-shrink)
    const targetShouldShow = targetShield.active && targetShield.hasTarget;
    this.targetSphereBlend = THREE.MathUtils.damp(
      this.targetSphereBlend,
      targetShouldShow ? 1 : 0,
      12,
      safeDt,
    );
    if (this.targetSphereBlend > 0.015 && targetShield.hasTarget) {
      const isSuffocating = targetShield.mode === 'suffocation';
      this._desiredTargetPos.copy(isSuffocating ? targetShield.headPos : targetShield.torsoPos);
      if (!this.targetPosInitialized) {
        this.targetCurrentPos.copy(this._desiredTargetPos);
        this.targetPosInitialized = true;
      } else {
        this.targetCurrentPos.x = THREE.MathUtils.damp(
          this.targetCurrentPos.x,
          this._desiredTargetPos.x,
          14,
          safeDt,
        );
        this.targetCurrentPos.y = THREE.MathUtils.damp(
          this.targetCurrentPos.y,
          this._desiredTargetPos.y,
          11,
          safeDt,
        );
        this.targetCurrentPos.z = THREE.MathUtils.damp(
          this.targetCurrentPos.z,
          this._desiredTargetPos.z,
          14,
          safeDt,
        );
      }

      const desiredRad = isSuffocating ? 0.33 : 1.12;
      this.targetCurrentRadius = THREE.MathUtils.damp(
        this.targetCurrentRadius,
        desiredRad,
        9,
        safeDt,
      );

      this.targetSphereGroup.visible = true;
      this.targetSphereGroup.position.copy(this.targetCurrentPos);
      const shrinkPulse = isSuffocating ? 1 + Math.sin(this.time * 12) * 0.045 : 1;
      this.targetSphereGroup.scale.setScalar(
        this.targetCurrentRadius * (0.4 + 0.6 * this.targetSphereBlend) * shrinkPulse,
      );
      this.targetSphereMat.uniforms.uTime.value = this.time * (isSuffocating ? 2.1 : 1.0);
      this.targetSphereMat.uniforms.uCenterAlpha.value =
        (isSuffocating ? 0.24 : 0.16) * this.targetSphereBlend;
      this.targetSphereMat.uniforms.uRimAlpha.value =
        (isSuffocating ? 0.85 : 0.72) * this.targetSphereBlend;
      this.targetSphereMat.uniforms.uFlash.value = isSuffocating
        ? 0.28 + Math.sin(this.time * 10) * 0.14
        : 0;
      this.targetRingMat.opacity = (isSuffocating ? 0.78 : 0.56) * this.targetSphereBlend;
      this.targetRing.rotation.y += safeDt * (isSuffocating ? 3.2 : 1.5);
    } else {
      this.targetSphereGroup.visible = false;
      if (!targetShouldShow && this.targetSphereBlend <= 0.02) {
        this.targetPosInitialized = false;
        this.targetCurrentRadius = 1.12;
      }
    }

    // 4. Cloak Particles (descending during head->feet vanish, rising during feet->head reveal)
    if (cloakAnim.phase === 'vanishing' || cloakAnim.phase === 'revealing') {
      this.cloakSpawnAccum += safeDt;
      if (this.cloakSpawnAccum >= 0.028) {
        this.cloakSpawnAccum = 0;
        this.spawnCloakParticles(
          playerPos,
          cloakAnim.cutLocalY,
          cloakAnim.phase === 'vanishing' ? 'down' : 'up',
          3,
        );
      }
    } else {
      this.cloakSpawnAccum = 0;
    }

    for (let i = 0; i < this.cloakParticles.length; i++) {
      const p = this.cloakParticles[i];
      if (!p.active) continue;
      p.elapsed += safeDt;
      const t = p.elapsed / p.duration;
      if (t >= 1) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, safeDt);
      p.mat.opacity = (1 - t) * 0.88;
      p.mesh.scale.setScalar(p.baseScale * (1 - t * 0.5));
    }

    // 5. Straight-line Forcefield Barrier Discs (actual collision only, zero homing)
    for (let i = 0; i < this.barrierDiscs.length; i++) {
      const b = this.barrierDiscs[i];
      if (!b.active) continue;
      b.elapsed += safeDt;
      if (b.elapsed >= b.maxLife) {
        b.active = false;
        b.group.visible = false;
        this.spawnImpactBurst(b.pos);
        continue;
      }

      this._prevPos.copy(b.pos);
      b.pos.addScaledVector(b.dir, b.speed * safeDt);
      b.group.position.copy(b.pos);
      b.group.children[2].rotation.z += safeDt * 9;

      if (
        !hasLineOfSight(
          this._prevPos.x,
          this._prevPos.y,
          this._prevPos.z,
          b.pos.x,
          b.pos.y,
          b.pos.z,
        )
      ) {
        b.active = false;
        b.group.visible = false;
        this.spawnImpactBurst(b.pos);
        continue;
      }

      const discRadius = 0.72;
      const segDx = b.pos.x - this._prevPos.x;
      const segDz = b.pos.z - this._prevPos.z;
      const segLenSq = segDx * segDx + segDz * segDz;
      let hitTargetId: string | null = null;
      let bestT = Infinity;

      for (let ti = 0; ti < targetProbes.length; ti++) {
        const trg = targetProbes[ti];
        const t =
          segLenSq > 1e-6
            ? THREE.MathUtils.clamp(
                ((trg.position.x - this._prevPos.x) * segDx +
                  (trg.position.z - this._prevPos.z) * segDz) /
                  segLenSq,
                0,
                1,
              )
            : 1;
        const cx = this._prevPos.x + segDx * t;
        const cy = THREE.MathUtils.lerp(this._prevPos.y, b.pos.y, t);
        const cz = this._prevPos.z + segDz * t;
        const dx = trg.position.x - cx;
        const dz = trg.position.z - cz;
        const hitRad = trg.radius + discRadius;
        if (dx * dx + dz * dz <= hitRad * hitRad) {
          if (
            cy >= trg.position.y - 0.18 &&
            cy <= trg.position.y + trg.height + 0.35 &&
            t < bestT
          ) {
            bestT = t;
            hitTargetId = trg.id;
          }
        }
      }

      if (hitTargetId) {
        if (bestT < 1) {
          b.pos.set(
            this._prevPos.x + segDx * bestT,
            THREE.MathUtils.lerp(this._prevPos.y, b.pos.y, bestT),
            this._prevPos.z + segDz * bestT,
          );
          b.group.position.copy(b.pos);
        }
        this._hitDir.copy(b.dir).setY(0);
        if (this._hitDir.lengthSq() > 1e-4) this._hitDir.normalize();
        else this._hitDir.set(0, 0, -1);
        onBarrierHit(hitTargetId, this._hitDir, b.pos);
        this.spawnImpactBurst(b.pos);
        b.active = false;
        b.group.visible = false;
      }
    }

    // 6. Impact Bursts
    for (let i = 0; i < this.impactBursts.length; i++) {
      const ib = this.impactBursts[i];
      if (!ib.active) continue;
      ib.elapsed += safeDt;
      const t = ib.elapsed / ib.duration;
      if (t >= 1) {
        ib.active = false;
        ib.mesh.visible = false;
        ib.ring.visible = false;
        continue;
      }
      const ease = 1 - Math.pow(1 - t, 3);
      ib.mesh.scale.setScalar(0.35 + ease * 1.45);
      ib.ring.scale.setScalar(0.45 + ease * 1.9);
      ib.mat.opacity = (1 - t) * 0.72;
      ib.ringMat.opacity = (1 - t) * 0.85;
    }
  }

  public reset(): void {
    this.platformBlend = 0;
    this.platformGroup.visible = false;
    this.ownerSphereBlend = 0;
    this.ownerDeflectFlash = 0;
    this.ownerSphereGroup.visible = false;
    this.targetSphereBlend = 0;
    this.targetPosInitialized = false;
    this.targetCurrentRadius = 1.12;
    this.targetSphereGroup.visible = false;
    this.cloakSpawnAccum = 0;

    for (let i = 0; i < this.cloakParticles.length; i++) {
      this.cloakParticles[i].active = false;
      this.cloakParticles[i].mesh.visible = false;
    }
    for (let i = 0; i < this.barrierDiscs.length; i++) {
      this.barrierDiscs[i].active = false;
      this.barrierDiscs[i].group.visible = false;
    }
    for (let i = 0; i < this.impactBursts.length; i++) {
      this.impactBursts[i].active = false;
      this.impactBursts[i].mesh.visible = false;
      this.impactBursts[i].ring.visible = false;
    }
  }

  public dispose(): void {
    this.particleGeo.dispose();
    this.barrierDiscGeo.dispose();
    this.barrierRimGeo.dispose();
    this.barrierCoreRingGeo.dispose();
    this.burstSphereGeo.dispose();
    this.burstRingGeo.dispose();

    this.platformDiscMat.dispose();
    this.platformOuterRingMat.dispose();
    this.platformInnerRingMat.dispose();
    this.ownerSphereMat.dispose();
    this.ownerRingAMat.dispose();
    this.ownerRingBMat.dispose();
    this.targetSphereMat.dispose();
    this.targetRingMat.dispose();

    for (const c of this.platformGroup.children) {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    }
    for (const c of this.ownerSphereGroup.children) {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    }
    for (const c of this.targetSphereGroup.children) {
      const m = c as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    }
    for (const p of this.cloakParticles) p.mat.dispose();
    for (const b of this.barrierDiscs) {
      b.discMat.dispose();
      b.rimMat.dispose();
    }
    for (const ib of this.impactBursts) {
      ib.mat.dispose();
      ib.ringMat.dispose();
    }
  }
}
