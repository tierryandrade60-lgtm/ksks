import * as THREE from 'three';
import { getGroundSurfaceY } from './physics';

const MAX_BURSTS = 6;
const MAX_CRACKS = 8;
const MAX_PLATES = 7;
const MAX_SHARDS = 14;

const MAIN_CRACK_POINTS = 8;
const BRANCH1_POINTS = 5;
const BRANCH2_POINTS = 4;
const TOTAL_CRACK_POINTS = MAIN_CRACK_POINTS + BRANCH1_POINTS + BRANCH2_POINTS;
const TOTAL_CRACK_VERTS = TOTAL_CRACK_POINTS * 2;

interface RockShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  baseScale: number;
  bounced: boolean;
}

interface GroundCrackPlate {
  mesh: THREE.Mesh;
  baseScale: number;
}

interface CrackRibbon {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  posAttr: THREE.BufferAttribute;
  targetLen: number;
  targetWidth: number;
}

interface RockBreakBurst {
  active: boolean;
  group: THREE.Group;
  crackRing: THREE.Mesh;
  crackRingMat: THREE.MeshBasicMaterial;
  plateMats: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  shardMats: [
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
  ];
  crackPlates: GroundCrackPlate[];
  shards: RockShard[];
  cracks: CrackRibbon[];
  crackMat: THREE.MeshBasicMaterial;
  activeCrackCount: number;
  activePlateCount: number;
  activeShardCount: number;
  elapsed: number;
  duration: number;
  peakScale: number;
  baseGroundY: number;
}

/**
 * Cartoon-style 3D Rock Break VFX System.
 * Triggers exclusively on heavy ground impacts, scaled by impact force,
 * spawning animated crooked radial cracks, broken stone plates, and flying rock fragments.
 */
export class RockBreakVfxSystem {
  public readonly group = new THREE.Group();

  private readonly burstPool: RockBreakBurst[] = [];
  private readonly shardGeoA = new THREE.DodecahedronGeometry(0.18, 0);
  private readonly shardGeoB = new THREE.BoxGeometry(0.24, 0.16, 0.22);
  private readonly plateGeo = new THREE.BoxGeometry(0.55, 0.08, 0.42);
  private readonly ringGeo = new THREE.RingGeometry(0.72, 0.94, 14);

  // Scratch buffers to avoid per-impact allocations
  private readonly _spineX = new Float32Array(MAIN_CRACK_POINTS);
  private readonly _spineZ = new Float32Array(MAIN_CRACK_POINTS);
  private readonly _spineHw = new Float32Array(MAIN_CRACK_POINTS);
  private readonly _branchX = new Float32Array(BRANCH1_POINTS);
  private readonly _branchZ = new Float32Array(BRANCH1_POINTS);
  private readonly _branchHw = new Float32Array(BRANCH1_POINTS);

  constructor() {
    this.ringGeo.rotateX(-Math.PI / 2);

    for (let b = 0; b < MAX_BURSTS; b++) {
      const burst = this.createBurstSlot();
      burst.group.visible = false;
      this.group.add(burst.group);
      this.burstPool.push(burst);
    }
  }

  private createCrackGeometry(): {
    geometry: THREE.BufferGeometry;
    posAttr: THREE.BufferAttribute;
  } {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(TOTAL_CRACK_VERTS * 3);
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);

    const indices: number[] = [];
    const appendStrip = (vertStart: number, pointCount: number) => {
      for (let i = 0; i < pointCount - 1; i++) {
        const a = vertStart + i * 2;
        const b = vertStart + i * 2 + 1;
        const c = vertStart + (i + 1) * 2;
        const d = vertStart + (i + 1) * 2 + 1;
        indices.push(a, c, b, b, c, d);
      }
    };

    appendStrip(0, MAIN_CRACK_POINTS);
    appendStrip(MAIN_CRACK_POINTS * 2, BRANCH1_POINTS);
    appendStrip((MAIN_CRACK_POINTS + BRANCH1_POINTS) * 2, BRANCH2_POINTS);

    geometry.setIndex(indices);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0.5), 1.8);
    return { geometry, posAttr };
  }

  private writeRibbonStrip(
    arr: Float32Array,
    vertOffset: number,
    px: Float32Array,
    pz: Float32Array,
    phw: Float32Array,
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const prev = Math.max(0, i - 1);
      const next = Math.min(count - 1, i + 1);
      let tx = px[next] - px[prev];
      let tz = pz[next] - pz[prev];
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;

      // Perpendicular on XZ ground plane
      const nx = tz;
      const nz = -tx;
      const hw = phw[i];

      const idx = (vertOffset + i * 2) * 3;
      arr[idx] = px[i] + nx * hw;
      arr[idx + 1] = 0;
      arr[idx + 2] = pz[i] + nz * hw;

      arr[idx + 3] = px[i] - nx * hw;
      arr[idx + 4] = 0;
      arr[idx + 5] = pz[i] - nz * hw;
    }
  }

  private randomizeCrookedCrack(posAttr: THREE.BufferAttribute): void {
    const arr = posAttr.array as Float32Array;

    // 1. Main jagged crooked fissure spine radiating from epicenter (z ~ 0.03 .. 1.0)
    let x = (Math.random() - 0.5) * 0.025;
    let dirSign = Math.random() < 0.5 ? -1 : 1;
    const baseWidth = 0.088 + Math.random() * 0.036;

    for (let i = 0; i < MAIN_CRACK_POINTS; i++) {
      const t = i / (MAIN_CRACK_POINTS - 1);
      if (i > 0) {
        if (Math.random() < 0.68) {
          dirSign *= -1;
        }
        const sharpJog = dirSign * (0.055 + Math.random() * 0.125);
        const drift = (Math.random() - 0.5) * 0.06;
        x = THREE.MathUtils.clamp(x + sharpJog + drift, -0.32, 0.32);
      }
      const zJitter =
        i === 0 || i === MAIN_CRACK_POINTS - 1 ? 0 : (Math.random() - 0.5) * 0.032;
      this._spineX[i] = x;
      this._spineZ[i] = 0.03 + t * 0.97 + zJitter;

      const taper = 1 - Math.pow(t, 1.28);
      const chip = i === MAIN_CRACK_POINTS - 1 ? 0 : 0.78 + Math.random() * 0.44;
      this._spineHw[i] =
        i === MAIN_CRACK_POINTS - 1 ? 0 : Math.max(0.008, baseWidth * taper * chip);
    }

    this.writeRibbonStrip(
      arr,
      0,
      this._spineX,
      this._spineZ,
      this._spineHw,
      MAIN_CRACK_POINTS,
    );

    // 2. Primary crooked side splinter fork
    const forkIdx1 = 2 + Math.floor(Math.random() * 2); // joint 2 or 3
    const side1 = Math.random() < 0.5 ? -1 : 1;
    let bAngle1 = side1 * (0.58 + Math.random() * 0.48);
    let bx = this._spineX[forkIdx1];
    let bz = this._spineZ[forkIdx1];
    const bLen1 = 0.28 + Math.random() * 0.16;
    const bStartHw1 = this._spineHw[forkIdx1] * (0.68 + Math.random() * 0.18);

    for (let i = 0; i < BRANCH1_POINTS; i++) {
      const t = i / (BRANCH1_POINTS - 1);
      this._branchX[i] = bx;
      this._branchZ[i] = bz;
      this._branchHw[i] =
        i === BRANCH1_POINTS - 1
          ? 0
          : bStartHw1 * (1 - Math.pow(t, 1.1)) * (0.85 + Math.random() * 0.3);

      const step = bLen1 / (BRANCH1_POINTS - 1);
      bAngle1 += (Math.random() - 0.5) * 0.75;
      bx += Math.sin(bAngle1) * step;
      bz += Math.cos(bAngle1) * step;
    }

    this.writeRibbonStrip(
      arr,
      MAIN_CRACK_POINTS * 2,
      this._branchX,
      this._branchZ,
      this._branchHw,
      BRANCH1_POINTS,
    );

    // 3. Secondary opposite crooked splinter
    const forkIdx2 = forkIdx1 === 2 ? 4 : 1 + Math.floor(Math.random() * 2) * 3;
    const side2 = -side1;
    let bAngle2 = side2 * (0.65 + Math.random() * 0.55);
    bx = this._spineX[forkIdx2];
    bz = this._spineZ[forkIdx2];
    const bLen2 = 0.17 + Math.random() * 0.13;
    const bStartHw2 = this._spineHw[forkIdx2] * (0.58 + Math.random() * 0.2);

    for (let i = 0; i < BRANCH2_POINTS; i++) {
      const t = i / (BRANCH2_POINTS - 1);
      this._branchX[i] = bx;
      this._branchZ[i] = bz;
      this._branchHw[i] =
        i === BRANCH2_POINTS - 1 ? 0 : bStartHw2 * (1 - t) * (0.85 + Math.random() * 0.3);

      const step = bLen2 / (BRANCH2_POINTS - 1);
      bAngle2 += (Math.random() - 0.5) * 0.8;
      bx += Math.sin(bAngle2) * step;
      bz += Math.cos(bAngle2) * step;
    }

    this.writeRibbonStrip(
      arr,
      (MAIN_CRACK_POINTS + BRANCH1_POINTS) * 2,
      this._branchX,
      this._branchZ,
      this._branchHw,
      BRANCH2_POINTS,
    );

    posAttr.needsUpdate = true;
  }

  private createBurstSlot(): RockBreakBurst {
    const burstGroup = new THREE.Group();

    const crackRingMat = new THREE.MeshBasicMaterial({
      color: '#0D1322',
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const crackRing = new THREE.Mesh(this.ringGeo, crackRingMat);
    crackRing.position.y = 0.012;
    burstGroup.add(crackRing);

    const crackMat = new THREE.MeshBasicMaterial({
      color: '#080A12',
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const cracks: CrackRibbon[] = [];
    for (let i = 0; i < MAX_CRACKS; i++) {
      const { geometry, posAttr } = this.createCrackGeometry();
      const mesh = new THREE.Mesh(geometry, crackMat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      burstGroup.add(mesh);
      cracks.push({
        mesh,
        geometry,
        posAttr,
        targetLen: 1,
        targetWidth: 1,
      });
    }

    const plateMats: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] = [
      new THREE.MeshStandardMaterial({
        color: '#3E4B68',
        roughness: 0.85,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 0.96,
      }),
      new THREE.MeshStandardMaterial({
        color: '#2C3752',
        roughness: 0.85,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 0.96,
      }),
    ];

    const crackPlates: GroundCrackPlate[] = [];
    for (let i = 0; i < MAX_PLATES; i++) {
      const plate = new THREE.Mesh(this.plateGeo, plateMats[i % 2]);
      plate.castShadow = false;
      plate.receiveShadow = true;
      plate.visible = false;
      burstGroup.add(plate);
      crackPlates.push({ mesh: plate, baseScale: 1 });
    }

    const shardMats: [
      THREE.MeshStandardMaterial,
      THREE.MeshStandardMaterial,
      THREE.MeshStandardMaterial,
    ] = [
      new THREE.MeshStandardMaterial({
        color: '#506084',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
      new THREE.MeshStandardMaterial({
        color: '#36425E',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
      new THREE.MeshStandardMaterial({
        color: '#252E44',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
    ];

    const shards: RockShard[] = [];
    for (let i = 0; i < MAX_SHARDS; i++) {
      const mesh = new THREE.Mesh(
        i % 2 === 0 ? this.shardGeoA : this.shardGeoB,
        shardMats[i % 3],
      );
      mesh.visible = false;
      burstGroup.add(mesh);
      shards.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        baseScale: 1,
        bounced: false,
      });
    }

    return {
      active: false,
      group: burstGroup,
      crackRing,
      crackRingMat,
      plateMats,
      shardMats,
      crackPlates,
      shards,
      cracks,
      crackMat,
      activeCrackCount: 0,
      activePlateCount: 0,
      activeShardCount: 0,
      elapsed: 0,
      duration: 1.85,
      peakScale: 1,
      baseGroundY: 0,
    };
  }

  /**
   * @param pos World impact point — snaps to actual ground/platform surface and skips floating mid-air hits
   * @param force Scale factor (~0.8 small-heavy slam .. 2.4 massive meteor/dive)
   * @param accentHex Optional impact rim tint (e.g. crater glow)
   */
  public spawnImpact(
    pos: THREE.Vector3,
    force = 1.0,
    accentHex = '#0D1322',
  ): boolean {
    const surfaceY = getGroundSurfaceY(pos.x, pos.z, pos.y + 0.9);
    if (pos.y - surfaceY > 1.45) {
      return false;
    }

    // Select first inactive slot, or recycle oldest active burst
    let b: RockBreakBurst | null = null;
    let oldest = this.burstPool[0];
    for (let i = 0; i < this.burstPool.length; i++) {
      const slot = this.burstPool[i];
      if (!slot.active) {
        b = slot;
        break;
      }
      if (slot.elapsed > oldest.elapsed) {
        oldest = slot;
      }
    }
    if (!b) b = oldest;

    const clampedForce = THREE.MathUtils.clamp(force, 0.7, 2.6);
    b.active = true;
    b.elapsed = 0;
    b.duration = 1.55 + clampedForce * 0.3;
    b.peakScale = clampedForce;
    b.baseGroundY = surfaceY;

    b.group.position.set(pos.x, surfaceY + 0.015, pos.z);
    b.group.visible = true;

    // 1. Cartoon dark crater outline ring expanding briefly on impact
    b.crackRingMat.color.set(accentHex);
    b.crackRingMat.opacity = 0.82;
    b.crackRing.scale.setScalar(0.35 * clampedForce);

    // 2. Jagged crooked cartoon ground crack fissures radiating outward
    b.crackMat.opacity = 0.94;
    const crackCount = clampedForce > 1.35 ? 8 : 6;
    b.activeCrackCount = crackCount;
    const baseAngleOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < MAX_CRACKS; i++) {
      const crack = b.cracks[i];
      if (i >= crackCount) {
        crack.mesh.visible = false;
        continue;
      }
      const angle =
        baseAngleOffset +
        (i / crackCount) * Math.PI * 2 +
        (Math.random() - 0.5) * 0.44;
      const len = (1.15 + Math.random() * 1.05) * clampedForce;
      const widthScale = (0.82 + Math.random() * 0.5) * Math.sqrt(clampedForce);
      crack.targetLen = len;
      crack.targetWidth = widthScale;

      this.randomizeCrookedCrack(crack.posAttr);

      crack.mesh.position.set(0, 0.016 + i * 0.0002, 0);
      crack.mesh.rotation.y = -angle + Math.PI * 0.5;
      crack.mesh.scale.set(widthScale, 1, Math.max(0.05, len * 0.06));
      crack.mesh.visible = true;
    }

    // 3. Tilted broken ground stone plates around epicenter
    const plateCount = Math.min(MAX_PLATES, Math.round(3 + clampedForce * 2));
    b.activePlateCount = plateCount;
    b.plateMats[0].opacity = 0.96;
    b.plateMats[1].opacity = 0.96;
    for (let i = 0; i < MAX_PLATES; i++) {
      const pl = b.crackPlates[i];
      if (i >= plateCount) {
        pl.mesh.visible = false;
        continue;
      }
      const angle = (i / plateCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.32;
      const dist = (0.48 + Math.random() * 0.45) * clampedForce;
      pl.mesh.position.set(
        Math.cos(angle) * dist,
        0.03,
        Math.sin(angle) * dist,
      );
      pl.mesh.rotation.y = -angle + (Math.random() - 0.5) * 0.4;
      pl.mesh.rotation.x = 0.24 + Math.random() * 0.22;
      const s = (0.78 + Math.random() * 0.45) * Math.sqrt(clampedForce);
      pl.mesh.scale.setScalar(s);
      pl.baseScale = s;
      pl.mesh.visible = true;
    }

    // 4. Flying cartoon rock fragments (eruption with gravity + bounce)
    const shardCount = Math.min(MAX_SHARDS, Math.round(6 + clampedForce * 4));
    b.activeShardCount = shardCount;
    b.shardMats[0].opacity = 1;
    b.shardMats[1].opacity = 1;
    b.shardMats[2].opacity = 1;
    for (let i = 0; i < MAX_SHARDS; i++) {
      const sh = b.shards[i];
      if (i >= shardCount) {
        sh.mesh.visible = false;
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const radialSpeed = (2.4 + Math.random() * 4.2) * Math.sqrt(clampedForce);
      const upSpeed = (4.6 + Math.random() * 4.4) * Math.sqrt(clampedForce);
      const spawnDist = (0.15 + Math.random() * 0.5) * clampedForce;
      sh.mesh.position.set(
        Math.cos(angle) * spawnDist,
        0.12 + Math.random() * 0.22,
        Math.sin(angle) * spawnDist,
      );
      sh.mesh.rotation.set(0, 0, 0);
      const baseScale = (0.7 + Math.random() * 0.72) * (0.75 + clampedForce * 0.26);
      sh.mesh.scale.setScalar(baseScale);
      sh.mesh.visible = true;
      sh.vx = Math.cos(angle) * radialSpeed;
      sh.vy = upSpeed;
      sh.vz = Math.sin(angle) * radialSpeed;
      sh.rx = (Math.random() - 0.5) * 11;
      sh.ry = (Math.random() - 0.5) * 11;
      sh.rz = (Math.random() - 0.5) * 11;
      sh.baseScale = baseScale;
      sh.bounced = false;
    }
    return true;
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);
    const gravity = -24.0;

    for (let i = 0; i < this.burstPool.length; i++) {
      const b = this.burstPool[i];
      if (!b.active) continue;

      b.elapsed += safeDt;
      const t = Math.min(1, b.elapsed / b.duration);

      // Ring pops outward immediately in first 0.25s, then fades cleanly
      const ringExpand = 0.4 + Math.min(1, b.elapsed / 0.24) * 1.45 * b.peakScale;
      b.crackRing.scale.setScalar(ringExpand);
      b.crackRingMat.opacity = Math.max(0, (1 - Math.min(1, b.elapsed / 0.65)) * 0.74);

      // Crooked ground cracks split outward quickly then fade out in final 45%
      const crackAlpha = t < 0.55 ? 0.94 : Math.max(0, 1 - (t - 0.55) / 0.45) * 0.94;
      b.crackMat.opacity = crackAlpha;
      const rawGrow = Math.min(1, b.elapsed / 0.11);
      const crackGrow = 1 - Math.pow(1 - rawGrow, 2.2);
      for (let c = 0; c < b.activeCrackCount; c++) {
        const crack = b.cracks[c];
        crack.mesh.scale.set(
          crack.targetWidth,
          1,
          Math.max(0.05, crack.targetLen * crackGrow),
        );
      }

      // Ground plates settle and fade near the end
      const plateAlpha = t < 0.6 ? 0.96 : Math.max(0, 1 - (t - 0.6) / 0.4) * 0.96;
      b.plateMats[0].opacity = plateAlpha;
      b.plateMats[1].opacity = plateAlpha;
      if (t > 0.72) {
        const shrink = 1 - (t - 0.72) / 0.28;
        for (let p = 0; p < b.activePlateCount; p++) {
          const pl = b.crackPlates[p];
          pl.mesh.scale.setScalar(Math.max(0.01, pl.baseScale * shrink));
        }
      }

      // Flying rock fragments obey ballistic arc + crisp bounce + shrink fade
      const fade = t < 0.58 ? 1 : Math.max(0, 1 - (t - 0.58) / 0.42);
      b.shardMats[0].opacity = fade;
      b.shardMats[1].opacity = fade;
      b.shardMats[2].opacity = fade;
      const scaleFactor = 0.25 + 0.75 * fade;

      for (let s = 0; s < b.activeShardCount; s++) {
        const sh = b.shards[s];
        sh.vy += gravity * safeDt;
        sh.mesh.position.x += sh.vx * safeDt;
        sh.mesh.position.y += sh.vy * safeDt;
        sh.mesh.position.z += sh.vz * safeDt;

        sh.mesh.rotation.x += sh.rx * safeDt;
        sh.mesh.rotation.y += sh.ry * safeDt;
        sh.mesh.rotation.z += sh.rz * safeDt;

        const wx = b.group.position.x + sh.mesh.position.x;
        const wz = b.group.position.z + sh.mesh.position.z;
        const localFloor =
          getGroundSurfaceY(wx, wz, b.baseGroundY + sh.mesh.position.y + 0.65) -
          b.baseGroundY +
          0.06;

        if (sh.mesh.position.y <= localFloor) {
          sh.mesh.position.y = localFloor;
          if (!sh.bounced && sh.vy < -1.5) {
            sh.vy = Math.abs(sh.vy) * 0.34;
            sh.vx *= 0.52;
            sh.vz *= 0.52;
            sh.rx *= 0.45;
            sh.ry *= 0.45;
            sh.rz *= 0.45;
            sh.bounced = true;
          } else {
            sh.vy = 0;
            sh.vx *= 0.84;
            sh.vz *= 0.84;
            sh.rx *= 0.7;
            sh.ry *= 0.7;
            sh.rz *= 0.7;
          }
        }

        sh.mesh.scale.setScalar(Math.max(0.01, sh.baseScale * scaleFactor));
      }

      if (b.elapsed >= b.duration) {
        b.active = false;
        b.group.visible = false;
      }
    }
  }

  public dispose(): void {
    for (const b of this.burstPool) {
      b.active = false;
      b.group.visible = false;
      b.crackRingMat.dispose();
      b.crackMat.dispose();
      for (const crack of b.cracks) {
        crack.geometry.dispose();
      }
      b.plateMats[0].dispose();
      b.plateMats[1].dispose();
      b.shardMats[0].dispose();
      b.shardMats[1].dispose();
      b.shardMats[2].dispose();
    }
    this.burstPool.length = 0;
    this.shardGeoA.dispose();
    this.shardGeoB.dispose();
    this.plateGeo.dispose();
    this.ringGeo.dispose();
  }
}
