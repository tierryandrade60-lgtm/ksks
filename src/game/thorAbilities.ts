import * as THREE from 'three';
import { getGroundSurfaceY, hasLineOfSight } from './physics';
import { buildMjolnirGroup, MjolnirRig } from './mjolnir';
import type { CombatTargetProbe } from './scarletWitchAbilities';

export type MjolnirThrowPhase = 'idle' | 'outbound' | 'summon-wait' | 'returning';

interface ElectricFlash {
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  core: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
  maxScale: number;
}

interface ElectricSpark {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
}

interface TransientBolt {
  segments: THREE.Mesh[];
  mats: THREE.MeshBasicMaterial[];
  age: number;
  maxAge: number;
}

const BEAM_MAIN_SEGMENTS = 18;
const BEAM_BRANCH_COUNT = 10;
const BEAM_BRANCH_SEGS = 3;
const HAMMER_TRAIL_POINTS = 18;

/**
 * Thor Visual Effects & Mjolnir / Storm Lightning System:
 * 1. Mjolnir Combo electric arcs & thunder hits
 * 2. Mjolnir Throw spinning hammer + electric wake + summon-back catch
 * 3. Lightning Slam ascent lightning bolts (random ground points -> Thor) + huge thunder ground impact
 * 4. Lightning Storm Beam: T-pose sky-to-Thor lightning channeling + forward animated beam made
 *    of thin connected rectangular lightning segments with irregular movement & randomized branching
 */
export class ThorVfxSystem {
  public readonly group = new THREE.Group();

  // Spinning thrown Mjolnir
  private readonly hammerRig: MjolnirRig;
  private readonly hammerWrapper = new THREE.Group();
  private readonly hammerGlow: THREE.Mesh;
  private readonly hammerGlowMat: THREE.MeshBasicMaterial;
  private readonly hammerTrailPts: THREE.Vector3[] = [];
  private readonly hammerTrailArr = new Float32Array(HAMMER_TRAIL_POINTS * 3);
  private readonly hammerTrailGeo: THREE.BufferGeometry;
  private readonly hammerTrailMat: THREE.LineBasicMaterial;
  private readonly hammerTrailLine: THREE.Line;

  private throwPhase: MjolnirThrowPhase = 'idle';
  private throwElapsed = 0;
  private summonWaitTimer = 0;
  private hammerPos = new THREE.Vector3();
  private hammerPrevPos = new THREE.Vector3();
  private hammerDir = new THREE.Vector3(0, 0, -1);
  private hammerTargetId: string | null = null;
  private hammerAimDest = new THREE.Vector3();
  private hammerHitSent = false;

  // Ascent / Channel body aura ring
  private readonly auraGroup = new THREE.Group();
  private readonly auraRingMat: THREE.MeshBasicMaterial;

  // Lightning Storm Beam Pool (connected thin rectangular BoxGeometry segments)
  private readonly beamGroup = new THREE.Group();
  private readonly rectUnitGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly mainCoreMat: THREE.MeshBasicMaterial;
  private readonly mainGlowMat: THREE.MeshBasicMaterial;
  private readonly branchMat: THREE.MeshBasicMaterial;
  private readonly beamMainCores: THREE.Mesh[] = [];
  private readonly beamMainGlows: THREE.Mesh[] = [];
  private readonly beamBranchSegs: THREE.Mesh[] = [];
  private readonly beamNodes: THREE.Vector3[] = [];
  private readonly branchData: Array<{
    anchorIdx: number;
    nodes: THREE.Vector3[];
    active: boolean;
  }> = [];
  private beamRegenTimer = 0;

  // Transient explosions, sparks & ground-to-Thor / sky-to-enemy jagged bolts
  private readonly flashes: ElectricFlash[] = [];
  private readonly sparks: ElectricSpark[] = [];
  private readonly transientBolts: TransientBolt[] = [];

  private readonly ringGeo = new THREE.RingGeometry(0.42, 0.78, 30);
  private readonly sphereGeo = new THREE.SphereGeometry(0.35, 12, 10);
  private readonly sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.24);

  private time = 0;
  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpC = new THREE.Vector3();
  private readonly _tmpMid = new THREE.Vector3();
  private readonly _tmpRight = new THREE.Vector3();
  private readonly _tmpUp = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.hammerRig = buildMjolnirGroup(1.06);
    this.hammerWrapper.add(this.hammerRig.group);

    this.hammerGlowMat = new THREE.MeshBasicMaterial({
      color: '#7CE4FF',
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.hammerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      this.hammerGlowMat,
    );
    this.hammerGlow.position.set(0, 0.24, 0);
    this.hammerWrapper.add(this.hammerGlow);
    this.hammerWrapper.visible = false;
    this.group.add(this.hammerWrapper);

    for (let i = 0; i < HAMMER_TRAIL_POINTS; i++) {
      this.hammerTrailPts.push(new THREE.Vector3());
    }
    this.hammerTrailGeo = new THREE.BufferGeometry();
    this.hammerTrailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.hammerTrailArr, 3),
    );
    this.hammerTrailMat = new THREE.LineBasicMaterial({
      color: '#7CE4FF',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.hammerTrailLine = new THREE.Line(this.hammerTrailGeo, this.hammerTrailMat);
    this.hammerTrailLine.visible = false;
    this.hammerTrailLine.frustumCulled = false;
    this.group.add(this.hammerTrailLine);

    // Body lightning aura ring
    this.auraRingMat = new THREE.MeshBasicMaterial({
      color: '#7CE4FF',
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const auraRingA = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 6, 24), this.auraRingMat);
    auraRingA.rotation.x = Math.PI * 0.44;
    const auraRingB = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.028, 6, 20), this.auraRingMat);
    auraRingB.rotation.set(Math.PI * 0.35, 0, Math.PI * 0.32);
    this.auraGroup.add(auraRingA, auraRingB);
    this.auraGroup.visible = false;
    this.group.add(this.auraGroup);

    // Lightning Storm Beam rectangular segment pool
    this.mainCoreMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mainGlowMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.branchMat = new THREE.MeshBasicMaterial({
      color: '#7CE4FF',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i <= BEAM_MAIN_SEGMENTS; i++) {
      this.beamNodes.push(new THREE.Vector3());
    }
    for (let i = 0; i < BEAM_MAIN_SEGMENTS; i++) {
      const core = new THREE.Mesh(this.rectUnitGeo, this.mainCoreMat);
      const glow = new THREE.Mesh(this.rectUnitGeo, this.mainGlowMat);
      this.beamMainCores.push(core);
      this.beamMainGlows.push(glow);
      this.beamGroup.add(glow, core);
    }

    for (let b = 0; b < BEAM_BRANCH_COUNT; b++) {
      const nodes: THREE.Vector3[] = [];
      for (let n = 0; n <= BEAM_BRANCH_SEGS; n++) {
        nodes.push(new THREE.Vector3());
      }
      this.branchData.push({
        anchorIdx: 2 + (b % (BEAM_MAIN_SEGMENTS - 3)),
        nodes,
        active: false,
      });
      for (let s = 0; s < BEAM_BRANCH_SEGS; s++) {
        const seg = new THREE.Mesh(this.rectUnitGeo, this.branchMat);
        seg.visible = false;
        this.beamBranchSegs.push(seg);
        this.beamGroup.add(seg);
      }
    }
    this.beamGroup.visible = false;
    this.group.add(this.beamGroup);
  }

  public getThrowPhase(): MjolnirThrowPhase {
    return this.throwPhase;
  }

  public isHammerAway(): boolean {
    return this.throwPhase !== 'idle';
  }

  public launchMjolnirThrow(
    startPos: THREE.Vector3,
    aimPoint: THREE.Vector3,
    targetId: string | null,
  ): void {
    this.throwPhase = 'outbound';
    this.throwElapsed = 0;
    this.summonWaitTimer = 0;
    this.hammerHitSent = false;
    this.hammerPos.copy(startPos);
    this.hammerPrevPos.copy(startPos);
    this.hammerTargetId = targetId;
    this.hammerAimDest.copy(aimPoint);

    this.hammerDir.subVectors(aimPoint, startPos);
    if (this.hammerDir.lengthSq() < 1e-4) {
      this.hammerDir.set(0, 0, -1);
    } else {
      this.hammerDir.normalize();
    }

    for (let i = 0; i < HAMMER_TRAIL_POINTS; i++) {
      this.hammerTrailPts[i].copy(startPos);
      this.hammerTrailArr[i * 3] = startPos.x;
      this.hammerTrailArr[i * 3 + 1] = startPos.y;
      this.hammerTrailArr[i * 3 + 2] = startPos.z;
    }
    this.hammerTrailGeo.attributes.position.needsUpdate = true;
    this.hammerWrapper.position.copy(startPos);
    this.hammerWrapper.visible = true;
    this.hammerTrailLine.visible = true;
  }

  public spawnComboSlash(pos: THREE.Vector3, forward: THREE.Vector3, step: 1 | 2 | 3): void {
    const scale = step === 3 ? 3.2 : step === 2 ? 2.1 : 1.7;
    const hitCenter = this._tmpA.copy(pos).addScaledVector(forward, 1.05);
    hitCenter.y += 1.05;
    this.spawnThunderBurst(hitCenter, scale, step === 3 ? 0.42 : 0.28);
    // Quick crackling arc bolt across strike plane
    const side = this._tmpB.set(-forward.z, 0, forward.x).normalize();
    const pStart = hitCenter.clone().addScaledVector(side, -1.1 * (step === 3 ? 1.4 : 1));
    const pEnd = hitCenter.clone().addScaledVector(side, 1.1 * (step === 3 ? 1.4 : 1));
    if (step === 3) {
      pStart.y += 1.5;
      pEnd.y -= 0.7;
    }
    this.spawnJaggedBolt(pStart, pEnd, step === 3 ? 0.08 : 0.055, 7, 0.22, '#9BEBFF');
  }

  public spawnThunderBurst(pos: THREE.Vector3, maxScale = 2.6, duration = 0.34): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#6CE2FF',
      transparent: true,
      opacity: 0.92,
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
      color: '#E6FAFF',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.position.copy(pos);
    core.scale.setScalar(0.5);
    this.group.add(core);

    this.flashes.push({
      ring,
      ringMat,
      core,
      coreMat,
      age: 0,
      maxAge: duration,
      maxScale,
    });

    const count = maxScale > 4 ? 22 : maxScale > 2.5 ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFFFFF' : '#56D4FF',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.25) * Math.PI * 0.65;
      const spd = (maxScale > 4 ? 13 : 8.5) * (0.55 + Math.random() * 0.7);
      const vel = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi) * spd,
        Math.sin(phi) * spd + 2.4,
        Math.sin(theta) * Math.cos(phi) * spd,
      );
      this._tmpC.copy(pos).add(vel);
      mesh.lookAt(this._tmpC);
      this.group.add(mesh);
      this.sparks.push({
        mesh,
        mat,
        vel,
        age: 0,
        maxAge: 0.24 + Math.random() * 0.18,
      });
    }
  }

  /**
   * Spawns a transient jagged lightning bolt made of connected thin rectangular BoxGeometry segments.
   */
  public spawnJaggedBolt(
    start: THREE.Vector3,
    end: THREE.Vector3,
    thickness = 0.065,
    segCount = 8,
    duration = 0.24,
    colorHex = '#7CE4FF',
  ): void {
    const segments: THREE.Mesh[] = [];
    const mats: THREE.MeshBasicMaterial[] = [];

    const totalVec = new THREE.Vector3().subVectors(end, start);
    const totalLen = Math.max(0.2, totalVec.length());
    const dir = totalVec.clone().divideScalar(totalLen);
    const perpA = new THREE.Vector3(-dir.z, 0.2, dir.x);
    if (perpA.lengthSq() < 1e-4) perpA.set(1, 0, 0);
    perpA.normalize();
    const perpB = new THREE.Vector3().crossVectors(dir, perpA).normalize();

    let prev = start.clone();
    for (let i = 1; i <= segCount; i++) {
      const t = i / segCount;
      const curr = new THREE.Vector3().lerpVectors(start, end, t);
      if (i < segCount) {
        const jitterAmp = Math.sin(t * Math.PI) * Math.min(0.85, totalLen * 0.12);
        curr.addScaledVector(perpA, (Math.random() - 0.5) * 2 * jitterAmp);
        curr.addScaledVector(perpB, (Math.random() - 0.5) * 2 * jitterAmp);
      }

      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FFFFFF' : colorHex,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.rectUnitGeo, mat);
      this.orientRectSegment(mesh, prev, curr, thickness);
      this.group.add(mesh);
      segments.push(mesh);
      mats.push(mat);
      prev = curr;
    }

    this.transientBolts.push({
      segments,
      mats,
      age: 0,
      maxAge: duration,
    });
  }

  public spawnGroundToThorBolt(groundPos: THREE.Vector3, thorTorsoPos: THREE.Vector3): void {
    this.spawnJaggedBolt(groundPos, thorTorsoPos, 0.072, 8, 0.24, '#6CE2FF');
    this.spawnThunderBurst(groundPos, 1.35, 0.22);
  }

  public spawnSkyToTargetBolt(targetPos: THREE.Vector3): void {
    const skyStart = new THREE.Vector3(
      targetPos.x + (Math.random() - 0.5) * 2.2,
      targetPos.y + 13.5,
      targetPos.z + (Math.random() - 0.5) * 2.2,
    );
    this.spawnJaggedBolt(skyStart, targetPos, 0.095, 10, 0.34, '#7CE4FF');
    this.spawnThunderBurst(targetPos, 2.2, 0.32);
  }

  public spawnSlamImpact(pos: THREE.Vector3, radius: number): void {
    this.spawnThunderBurst(pos, radius * 0.92, 0.46);
    const skyStart = new THREE.Vector3(pos.x, pos.y + 16, pos.z);
    this.spawnJaggedBolt(skyStart, pos, 0.15, 12, 0.38, '#9BEBFF');
  }

  public spawnSkyChannelBolt(thorPos: THREE.Vector3): void {
    const skyStart = new THREE.Vector3(
      thorPos.x + (Math.random() - 0.5) * 4.5,
      thorPos.y + 15.5,
      thorPos.z + (Math.random() - 0.5) * 4.5,
    );
    const targetBody = new THREE.Vector3(
      thorPos.x + (Math.random() - 0.5) * 0.35,
      thorPos.y + 1.15 + Math.random() * 0.35,
      thorPos.z + (Math.random() - 0.5) * 0.35,
    );
    this.spawnJaggedBolt(skyStart, targetBody, 0.075, 10, 0.19, '#7CE4FF');
  }

  /**
   * Updates Thor's forward Lightning Storm Beam built strictly of thin, connected rectangular
   * segments with irregular continuous jitter and randomized branching.
   */
  public updateStormBeam(
    active: boolean,
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    beamLength: number,
    dt: number,
  ): void {
    if (!active) {
      this.beamGroup.visible = false;
      return;
    }

    this.beamGroup.visible = true;
    this.beamRegenTimer -= dt;
    const regenStep = this.beamRegenTimer <= 0;
    if (regenStep) {
      this.beamRegenTimer = 0.036;
    }

    // Build orthonormal basis perpendicular to beam direction
    this._tmpRight.crossVectors(dir, this._worldUp);
    if (this._tmpRight.lengthSq() < 1e-4) {
      this._tmpRight.set(1, 0, 0);
    } else {
      this._tmpRight.normalize();
    }
    this._tmpUp.crossVectors(this._tmpRight, dir).normalize();

    // Update main connected spine nodes
    this.beamNodes[0].copy(origin);
    const stepLen = beamLength / BEAM_MAIN_SEGMENTS;
    for (let i = 1; i <= BEAM_MAIN_SEGMENTS; i++) {
      const n = this.beamNodes[i];
      n.copy(origin).addScaledVector(dir, i * stepLen);
      if (i < BEAM_MAIN_SEGMENTS) {
        const edgeFade = Math.min(1, i * 0.35) * (1 - (i / BEAM_MAIN_SEGMENTS) * 0.15);
        const waveA =
          Math.sin(this.time * 42 + i * 1.9) * 0.24 +
          (regenStep ? (Math.random() - 0.5) * 0.44 : Math.cos(this.time * 63 + i * 3.7) * 0.14);
        const waveB =
          Math.cos(this.time * 37 + i * 2.4) * 0.22 +
          (regenStep ? (Math.random() - 0.5) * 0.44 : Math.sin(this.time * 58 + i * 2.9) * 0.14);
        n.addScaledVector(this._tmpRight, waveA * edgeFade);
        n.addScaledVector(this._tmpUp, waveB * edgeFade);
      }
    }

    for (let i = 0; i < BEAM_MAIN_SEGMENTS; i++) {
      const p0 = this.beamNodes[i];
      const p1 = this.beamNodes[i + 1];
      const coreThickness = 0.072 + Math.sin(this.time * 52 + i) * 0.015;
      const glowThickness = coreThickness * 2.15;
      this.orientRectSegment(this.beamMainCores[i], p0, p1, coreThickness);
      this.orientRectSegment(this.beamMainGlows[i], p0, p1, glowThickness);
    }

    // Randomized flickering secondary branches sprouting from spine nodes
    for (let b = 0; b < BEAM_BRANCH_COUNT; b++) {
      const br = this.branchData[b];
      if (regenStep) {
        br.active = Math.random() < 0.72;
        if (br.active) {
          br.anchorIdx = 1 + Math.floor(Math.random() * (BEAM_MAIN_SEGMENTS - 2));
          const anchor = this.beamNodes[br.anchorIdx];
          br.nodes[0].copy(anchor);
          const angle = Math.random() * Math.PI * 2;
          const outDir = new THREE.Vector3()
            .copy(dir)
            .multiplyScalar(0.75 + Math.random() * 0.45)
            .addScaledVector(this._tmpRight, Math.cos(angle) * (0.65 + Math.random() * 0.85))
            .addScaledVector(this._tmpUp, Math.sin(angle) * (0.65 + Math.random() * 0.85))
            .normalize();
          const bLen = 1.6 + Math.random() * 2.2;
          let cur = anchor.clone();
          for (let s = 1; s <= BEAM_BRANCH_SEGS; s++) {
            cur = cur
              .clone()
              .addScaledVector(outDir, bLen / BEAM_BRANCH_SEGS)
              .addScaledVector(this._tmpRight, (Math.random() - 0.5) * 0.42)
              .addScaledVector(this._tmpUp, (Math.random() - 0.5) * 0.42);
            br.nodes[s].copy(cur);
          }
        }
      } else if (br.active) {
        // Keep branch root pinned to moving spine node
        const delta = this._tmpA.subVectors(this.beamNodes[br.anchorIdx], br.nodes[0]);
        for (let s = 0; s <= BEAM_BRANCH_SEGS; s++) {
          br.nodes[s].add(delta);
        }
      }

      for (let s = 0; s < BEAM_BRANCH_SEGS; s++) {
        const mesh = this.beamBranchSegs[b * BEAM_BRANCH_SEGS + s];
        mesh.visible = br.active;
        if (br.active) {
          const thick = 0.045 * (1 - s * 0.22);
          this.orientRectSegment(mesh, br.nodes[s], br.nodes[s + 1], thick);
        }
      }
    }

    this.mainCoreMat.opacity = 0.88 + Math.sin(this.time * 60) * 0.12;
    this.mainGlowMat.opacity = 0.48 + Math.cos(this.time * 48) * 0.16;
  }

  private orientRectSegment(
    mesh: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    thickness: number,
  ): void {
    this._tmpMid.addVectors(a, b).multiplyScalar(0.5);
    mesh.position.copy(this._tmpMid);
    const len = a.distanceTo(b);
    mesh.scale.set(thickness, thickness, Math.max(0.05, len));
    mesh.lookAt(b);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerRightHandPos: THREE.Vector3,
    auraActive: boolean,
    targetProbes: ReadonlyArray<CombatTargetProbe>,
    onHammerImpact: (targetId: string | null, hitDir: THREE.Vector3, hitPos: THREE.Vector3) => void,
    onHammerSummonStart: () => void,
    onHammerCatch: () => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;

    if (auraActive) {
      this.auraGroup.visible = true;
      this.auraGroup.position.set(playerPos.x, playerPos.y + 1.05, playerPos.z);
      this.auraGroup.rotation.y += safeDt * 12;
      this.auraRingMat.opacity = 0.45 + Math.sin(this.time * 28) * 0.18;
    } else {
      this.auraGroup.visible = false;
    }

    // 1. Update Mjolnir Throw
    if (this.throwPhase !== 'idle') {
      this.throwElapsed += safeDt;
      this.hammerPrevPos.copy(this.hammerPos);

      if (this.throwPhase === 'outbound') {
        const dest = this._tmpA.copy(this.hammerAimDest);
        if (this.hammerTargetId) {
          for (let i = 0; i < targetProbes.length; i++) {
            const p = targetProbes[i];
            if (p.id === this.hammerTargetId) {
              dest.set(p.position.x, p.position.y + 1.1, p.position.z);
              break;
            }
          }
        }
        const toDest = this._tmpB.subVectors(dest, this.hammerPos);
        const dist = toDest.length();
        const speed = 34;
        if (dist > 0.01) {
          this.hammerDir.copy(toDest).divideScalar(dist);
        }
        const step = Math.min(dist, speed * safeDt);
        this.hammerPos.addScaledVector(this.hammerDir, step);

        let hitProbe: CombatTargetProbe | null = null;
        for (let i = 0; i < targetProbes.length; i++) {
          const p = targetProbes[i];
          this._tmpC.set(p.position.x, p.position.y + 1.08, p.position.z);
          if (this._tmpC.distanceToSquared(this.hammerPos) <= 1.32 * 1.32) {
            hitProbe = p;
            break;
          }
        }
        const hitWall = !hasLineOfSight(
          this.hammerPrevPos.x,
          this.hammerPrevPos.y,
          this.hammerPrevPos.z,
          this.hammerPos.x,
          this.hammerPos.y,
          this.hammerPos.z,
        );

        if (hitProbe || dist <= 0.45 || hitWall || this.throwElapsed >= 0.85) {
          if (!this.hammerHitSent) {
            this.hammerHitSent = true;
            this.spawnThunderBurst(this.hammerPos, 3.3, 0.36);
            this.spawnSkyToTargetBolt(this.hammerPos);
            onHammerImpact(hitProbe?.id ?? null, this.hammerDir, this.hammerPos);
          }
          this.throwPhase = 'summon-wait';
          this.summonWaitTimer = 0.22;
          onHammerSummonStart();
        }
      } else if (this.throwPhase === 'summon-wait') {
        // Brief pause after impact while Thor raises his right hand to summon Mjolnir back
        this.summonWaitTimer -= safeDt;
        this.hammerWrapper.rotation.z += safeDt * 18;
        if (this.summonWaitTimer <= 0) {
          this.throwPhase = 'returning';
        }
      } else if (this.throwPhase === 'returning') {
        const toHand = this._tmpA.subVectors(playerRightHandPos, this.hammerPos);
        const dist = toHand.length();
        const retSpeed = 38;
        if (dist > 0.01) {
          this.hammerDir.copy(toHand).divideScalar(dist);
        }
        const step = Math.min(dist, retSpeed * safeDt);
        this.hammerPos.addScaledVector(this.hammerDir, step);

        const gY = getGroundSurfaceY(this.hammerPos.x, this.hammerPos.z, this.hammerPos.y + 0.5);
        if (this.hammerPos.y < gY + 0.38) {
          this.hammerPos.y = gY + 0.38;
        }

        if (dist <= 1.05 || this.throwElapsed >= 3.0) {
          this.throwPhase = 'idle';
          this.hammerWrapper.visible = false;
          this.hammerTrailLine.visible = false;
          this.spawnThunderBurst(playerRightHandPos, 1.45, 0.24);
          onHammerCatch();
        }
      }

      if (this.throwPhase !== 'idle') {
        this.hammerWrapper.position.copy(this.hammerPos);
        this.hammerWrapper.rotation.x += safeDt * 24;
        this.hammerWrapper.rotation.y += safeDt * 12;

        for (let i = HAMMER_TRAIL_POINTS - 1; i > 0; i--) {
          this.hammerTrailPts[i].copy(this.hammerTrailPts[i - 1]);
        }
        this.hammerTrailPts[0].copy(this.hammerPos);
        for (let i = 0; i < HAMMER_TRAIL_POINTS; i++) {
          const pt = this.hammerTrailPts[i];
          this.hammerTrailArr[i * 3] = pt.x;
          this.hammerTrailArr[i * 3 + 1] = pt.y;
          this.hammerTrailArr[i * 3 + 2] = pt.z;
        }
        this.hammerTrailGeo.attributes.position.needsUpdate = true;
      }
    }

    // 2. Update Transient Jagged Bolts
    for (let i = this.transientBolts.length - 1; i >= 0; i--) {
      const tb = this.transientBolts[i];
      tb.age += safeDt;
      const t = tb.age / tb.maxAge;
      if (t >= 1) {
        for (let s = 0; s < tb.segments.length; s++) {
          this.group.remove(tb.segments[s]);
          tb.mats[s].dispose();
        }
        this.transientBolts.splice(i, 1);
        continue;
      }
      const op = 1 - t;
      for (let s = 0; s < tb.mats.length; s++) {
        tb.mats[s].opacity = op * 0.96;
      }
    }

    // 3. Update Electric Flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += safeDt;
      const t = f.age / f.maxAge;
      if (t >= 1) {
        this.group.remove(f.ring, f.core);
        f.ringMat.dispose();
        f.coreMat.dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - t, 2.2);
      f.ring.scale.setScalar(0.45 + ease * f.maxScale);
      f.ringMat.opacity = (1 - t) * 0.92;
      f.core.scale.setScalar(0.5 + ease * f.maxScale * 0.45);
      f.coreMat.opacity = Math.max(0, 1 - t * 1.4) * 0.9;
    }

    // 4. Update Electric Sparks
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
      s.vel.y -= 15 * safeDt;
      s.mesh.position.addScaledVector(s.vel, safeDt);
      s.mat.opacity = 1 - t;
      s.mesh.scale.setScalar(1 - t * 0.45);
    }
  }

  public clearAll(): void {
    this.throwPhase = 'idle';
    this.hammerTargetId = null;
    this.hammerWrapper.visible = false;
    this.hammerTrailLine.visible = false;
    this.auraGroup.visible = false;
    this.beamGroup.visible = false;

    for (const tb of this.transientBolts) {
      for (let s = 0; s < tb.segments.length; s++) {
        this.group.remove(tb.segments[s]);
        tb.mats[s].dispose();
      }
    }
    this.transientBolts.length = 0;

    for (const f of this.flashes) {
      this.group.remove(f.ring, f.core);
      f.ringMat.dispose();
      f.coreMat.dispose();
    }
    this.flashes.length = 0;

    for (const s of this.sparks) {
      this.group.remove(s.mesh);
      s.mat.dispose();
    }
    this.sparks.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.hammerRig.dispose();
    this.hammerGlowMat.dispose();
    this.hammerGlow.geometry.dispose();
    this.hammerTrailGeo.dispose();
    this.hammerTrailMat.dispose();
    this.auraRingMat.dispose();
    this.rectUnitGeo.dispose();
    this.mainCoreMat.dispose();
    this.mainGlowMat.dispose();
    this.branchMat.dispose();
    this.ringGeo.dispose();
    this.sphereGeo.dispose();
    this.sparkGeo.dispose();
  }
}
