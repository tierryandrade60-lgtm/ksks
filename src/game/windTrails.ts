import * as THREE from 'three';

const TRAIL_COUNT = 12;
const SEGMENTS_PER_TRAIL = 22;
const VERTS_PER_TRAIL = SEGMENTS_PER_TRAIL * 2; // LineSegments pairs
const TOTAL_VERTS = TRAIL_COUNT * VERTS_PER_TRAIL;

const MAX_VISIBLE_RADIUS = 16.5;
const SPAWN_MIN_RADIUS = 2.8;
const SPAWN_MAX_RADIUS = 13.5;

interface TrailSlot {
  active: boolean;
  age: number;
  duration: number;
  cooldown: number;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  dirAngle: number;
  length: number;
  curveAmp1: number;
  curveAmp2: number;
  curveFreq1: number;
  curveFreq2: number;
  vertAmp: number;
  phase: number;
  maxAlpha: number;
}

/**
 * Atmospheric procedural wind trail system rendered in a single LineSegments draw call.
 * Generates delicate, smoothly curving, near-transparent white air current lines only
 * within the player's camera-visible local surroundings using object pooling and culling.
 */
export class WindTrailSystem {
  public readonly lines: THREE.LineSegments;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly positions: Float32Array;
  private readonly alphas: Float32Array;
  private readonly slots: TrailSlot[] = [];

  // Pre-allocated scratch helpers (zero GC in loop)
  private readonly _frustum = new THREE.Frustum();
  private readonly _projScreenMatrix = new THREE.Matrix4();
  private readonly _sphere = new THREE.Sphere();
  private readonly _camFwd = new THREE.Vector3();
  private readonly _ptA = new THREE.Vector3();
  private readonly _ptB = new THREE.Vector3();

  constructor() {
    this.positions = new Float32Array(TOTAL_VERTS * 3);
    this.alphas = new Float32Array(TOTAL_VERTS);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      this.slots.push({
        active: false,
        age: 0,
        duration: 3.0,
        cooldown: 0.15 + i * 0.24,
        anchorX: 0,
        anchorY: 1,
        anchorZ: 0,
        dirAngle: 0,
        length: 4.5,
        curveAmp1: 0.45,
        curveAmp2: 0.2,
        curveFreq1: 1.0,
        curveFreq2: 2.0,
        vertAmp: 0.22,
        phase: 0,
        maxAlpha: 0.2,
      });
    }

    this.geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const alphaAttr = new THREE.BufferAttribute(this.alphas, 1);
    alphaAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', posAttr);
    this.geometry.setAttribute('aAlpha', alphaAttr);

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;

        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;

        void main() {
          if (vAlpha <= 0.002) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
  }

  private sampleTrailPoint(
    slot: TrailSlot,
    s: number,
    out: THREE.Vector3,
  ): void {
    const cosD = Math.cos(slot.dirAngle);
    const sinD = Math.sin(slot.dirAngle);
    const perpX = -sinD;
    const perpZ = cosD;

    const along = (s - 0.5) * slot.length;
    const lateral =
      Math.sin(s * Math.PI * slot.curveFreq1 + slot.phase) * slot.curveAmp1 +
      Math.cos(s * Math.PI * slot.curveFreq2 - slot.phase * 0.7) * slot.curveAmp2;
    const vertical =
      Math.sin(s * Math.PI * 1.4 + slot.phase * 1.3) * slot.vertAmp +
      Math.cos(s * Math.PI * 0.8 + slot.phase) * (slot.vertAmp * 0.45);

    out.set(
      slot.anchorX + cosD * along + perpX * lateral,
      slot.anchorY + vertical,
      slot.anchorZ + sinD * along + perpZ * lateral,
    );
  }

  private spawnTrail(
    slot: TrailSlot,
    playerPos: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
  ): void {
    // Generate locally within the camera's forward visible hemisphere around the player
    camera.getWorldDirection(this._camFwd);
    const camYaw = Math.atan2(this._camFwd.z, this._camFwd.x);
    const spreadAngle = camYaw + (Math.random() - 0.5) * Math.PI * 1.15;
    const dist =
      SPAWN_MIN_RADIUS + Math.random() * (SPAWN_MAX_RADIUS - SPAWN_MIN_RADIUS);

    const x = playerPos.x + Math.cos(spreadAngle) * dist;
    const z = playerPos.z + Math.sin(spreadAngle) * dist;
    const y = Math.max(0.45, playerPos.y + 0.55 + Math.random() * 2.9);

    // Distance & frustum check before committing spawn
    const dx = x - playerPos.x;
    const dz = z - playerPos.z;
    if (dx * dx + dz * dz > MAX_VISIBLE_RADIUS * MAX_VISIBLE_RADIUS) return;

    this._sphere.center.set(x, y, z);
    this._sphere.radius = 2.8;
    if (!this._frustum.intersectsSphere(this._sphere)) return;

    slot.active = true;
    slot.age = 0;
    slot.duration = 2.4 + Math.random() * 2.1;
    slot.anchorX = x;
    slot.anchorY = y;
    slot.anchorZ = z;
    // Organic random flow directions (gentle breeze bias + varied currents)
    slot.dirAngle = Math.random() * Math.PI * 2;
    slot.length = 3.2 + Math.random() * 3.4;
    slot.curveAmp1 = 0.35 + Math.random() * 0.65;
    slot.curveAmp2 = (Math.random() - 0.5) * 0.45;
    slot.curveFreq1 = 0.8 + Math.random() * 1.1;
    slot.curveFreq2 = 1.4 + Math.random() * 1.3;
    slot.vertAmp = 0.16 + Math.random() * 0.32;
    slot.phase = Math.random() * Math.PI * 2;
    slot.maxAlpha = 0.14 + Math.random() * 0.11; // subtle, almost invisible white lines
  }

  private clearSlotVertices(slotIndex: number): void {
    const alphaOffset = slotIndex * VERTS_PER_TRAIL;
    for (let v = 0; v < VERTS_PER_TRAIL; v++) {
      this.alphas[alphaOffset + v] = 0;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
  ): void {
    // Update camera frustum once per frame
    camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

    const maxRadSq = MAX_VISIBLE_RADIUS * MAX_VISIBLE_RADIUS;

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const slot = this.slots[i];

      if (!slot.active) {
        slot.cooldown -= dt;
        if (slot.cooldown <= 0) {
          slot.cooldown = 0.25 + Math.random() * 0.55;
          this.spawnTrail(slot, playerPos, camera);
        }
        if (!slot.active) {
          this.clearSlotVertices(i);
          continue;
        }
      }

      slot.age += dt;
      const life = slot.age / slot.duration;
      if (life >= 1) {
        slot.active = false;
        slot.cooldown = 0.2 + Math.random() * 0.65;
        this.clearSlotVertices(i);
        continue;
      }

      // Distance culling relative to player
      const dx = slot.anchorX - playerPos.x;
      const dz = slot.anchorZ - playerPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > maxRadSq) {
        slot.active = false;
        slot.cooldown = 0.15;
        this.clearSlotVertices(i);
        continue;
      }

      // Camera frustum visibility culling
      this._sphere.center.set(slot.anchorX, slot.anchorY, slot.anchorZ);
      this._sphere.radius = slot.length * 0.65;
      if (!this._frustum.intersectsSphere(this._sphere)) {
        this.clearSlotVertices(i);
        continue;
      }

      // Smooth fade at edges of visibility range and over lifecycle
      const dist = Math.sqrt(distSq);
      const distFade =
        1.0 -
        THREE.MathUtils.smoothstep(dist, MAX_VISIBLE_RADIUS * 0.68, MAX_VISIBLE_RADIUS);
      const lifeFade = Math.sin(life * Math.PI); // 0 -> 1 -> 0 smooth bell
      const baseAlpha = slot.maxAlpha * lifeFade * distFade;

      // Flowing sliding window along the organic trajectory
      const headS = -0.15 + life * 1.3;
      const span = 0.58;
      const tailS = headS - span;

      const posOffset = i * VERTS_PER_TRAIL * 3;
      const alphaOffset = i * VERTS_PER_TRAIL;

      for (let seg = 0; seg < SEGMENTS_PER_TRAIL; seg++) {
        const t0 = seg / SEGMENTS_PER_TRAIL;
        const t1 = (seg + 1) / SEGMENTS_PER_TRAIL;

        const s0 = tailS + t0 * span;
        const s1 = tailS + t1 * span;

        this.sampleTrailPoint(slot, s0, this._ptA);
        this.sampleTrailPoint(slot, s1, this._ptB);

        const pIdx = posOffset + seg * 6;
        this.positions[pIdx] = this._ptA.x;
        this.positions[pIdx + 1] = this._ptA.y;
        this.positions[pIdx + 2] = this._ptA.z;
        this.positions[pIdx + 3] = this._ptB.x;
        this.positions[pIdx + 4] = this._ptB.y;
        this.positions[pIdx + 5] = this._ptB.z;

        // Smooth taper at leading tip and trailing tail
        const a0 = baseAlpha * Math.sin(t0 * Math.PI);
        const a1 = baseAlpha * Math.sin(t1 * Math.PI);
        const aIdx = alphaOffset + seg * 2;
        this.alphas[aIdx] = a0;
        this.alphas[aIdx + 1] = a1;
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
