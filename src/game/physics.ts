import * as THREE from 'three';
import { computeRampHeightAt, RampCollider } from './maps';

export interface AabbCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface PhysicsInput {
  /** Joystick horizontal X (-1 left .. +1 right) */
  moveX: number;
  /** Joystick vertical Y (-1 backward .. +1 forward) */
  moveY: number;
  /** Camera / character forward yaw in radians */
  facingYaw: number;
  /** Camera pitch in radians for 3D flight */
  cameraPitch?: number;
  /** Jump pressed or buffered */
  jumpQueued: boolean;
  /** Jump button/key held continuously (slow climb during flight) */
  ascendHeld?: boolean;
  /** Descend / crouch pressed during flight */
  descendQueued?: boolean;
  /** Sprint toggle state (only sprints while moving forward) */
  sprintEnabled?: boolean;
  /** Smooth slow floating flight mode */
  flying?: boolean;
  /** Optional flight hover elevation above ground (defaults to 0.94m) */
  hoverHeight?: number;
  /** Character-specific sprint multiplier when toggle is ON (defaults to 1.62) */
  sprintSpeedMultiplier?: number;
  /** Multiplier on max ground/air movement speed (e.g. Quicksilver Super Speed) */
  speedMultiplier?: number;
  /** Vision Intangibility: passes cleanly through walls/obstacles/NPCs while staying on ground/world bounds */
  intangible?: boolean;
}

export interface PhysicsStepResult {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  grounded: boolean;
  justJumped: boolean;
  landImpactSpeed: number;
  localForwardNorm: number;
  localRightNorm: number;
  sprintingForward: boolean;
}

export const BASEPLATE_HALF_INNER = 108.0;
export const BASEPLATE_HALF_OUTER = 109.4;
export const BASEPLATE_BORDER_HEIGHT = 0.28;

const CHAR_RADIUS = 0.34;
const CHAR_HEIGHT = 1.9;
const GRAVITY = -28.0;
const JUMP_SPEED = 9.85;
const MAX_SPEED = 7.4;
const GROUND_ACCEL = 42.0;
const GROUND_DECEL = 34.0;
const AIR_ACCEL = 22.0;
const AIR_DECEL = 6.0;
const COYOTE_TIME = 0.1;
const JUMP_BUFFER_TIME = 0.12;
const FIXED_DT = 1 / 120;

export interface ArenaPillarDef {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

export const ARENA_PILLARS: ReadonlyArray<ArenaPillarDef> = [
  { x: -9.2, z: 0.0, w: 1.6, h: 4.2, d: 5.2 },
  { x: 9.2, z: 0.0, w: 1.6, h: 4.2, d: 5.2 },
  { x: -9.2, z: -9.2, w: 4.6, h: 3.8, d: 1.6 },
  { x: 9.2, z: -9.2, w: 4.6, h: 3.8, d: 1.6 },
  { x: 0.0, z: -11.6, w: 5.8, h: 4.4, d: 1.6 },
  { x: -11.0, z: 9.2, w: 2.2, h: 3.6, d: 2.2 },
  { x: 11.0, z: 9.2, w: 2.2, h: 3.6, d: 2.2 },
];

export const ARENA_PILLAR_COLLIDERS: ReadonlyArray<AabbCollider> = ARENA_PILLARS.map(
  (p) => ({
    minX: p.x - p.w * 0.5,
    maxX: p.x + p.w * 0.5,
    minY: 0,
    maxY: p.h + 0.24,
    minZ: p.z - p.d * 0.5,
    maxZ: p.z + p.d * 0.5,
  }),
);

let activeWorldObstacleColliders: ReadonlyArray<AabbCollider> = ARENA_PILLAR_COLLIDERS;
let activeWorldRamps: ReadonlyArray<RampCollider> = [];
let activeWorldMaxBound: number = BASEPLATE_HALF_INNER;

export function setActiveWorldColliders(
  colliders: ReadonlyArray<AabbCollider>,
  ramps: ReadonlyArray<RampCollider> = [],
  maxBound: number = BASEPLATE_HALF_INNER,
): void {
  activeWorldObstacleColliders = colliders;
  activeWorldRamps = ramps;
  activeWorldMaxBound = maxBound;
}

export function getActiveWorldMaxBound(): number {
  return activeWorldMaxBound;
}

export function getGroundSurfaceY(
  x: number,
  z: number,
  referenceY = Infinity,
): number {
  let highest = 0;
  for (let i = 0; i < activeWorldObstacleColliders.length; i++) {
    const box = activeWorldObstacleColliders[i];
    if (
      x >= box.minX - 0.18 &&
      x <= box.maxX + 0.18 &&
      z >= box.minZ - 0.18 &&
      z <= box.maxZ + 0.18 &&
      box.maxY <= referenceY + 0.45 &&
      box.maxY > highest
    ) {
      highest = box.maxY;
    }
  }
  for (let i = 0; i < activeWorldRamps.length; i++) {
    const ramp = activeWorldRamps[i];
    if (
      x >= ramp.minX - 0.05 &&
      x <= ramp.maxX + 0.05 &&
      z >= ramp.minZ - 0.05 &&
      z <= ramp.maxZ + 0.05
    ) {
      const ry = computeRampHeightAt(x, z, ramp);
      if (ry <= referenceY + 0.45 && ry > highest) {
        highest = ry;
      }
    }
  }
  return highest;
}

/**
 * 3D slab-intersection line-of-sight test against all active arena walls/pillars/blocks.
 * Returns true if segment A->B is unobstructed by any obstacle collider.
 */
export function hasLineOfSight(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;

  for (let i = 0; i < activeWorldObstacleColliders.length; i++) {
    const box = activeWorldObstacleColliders[i];
    let tMin = 0;
    let tMax = 1;

    // X slab
    if (Math.abs(dx) < 1e-6) {
      if (ax < box.minX || ax > box.maxX) continue;
    } else {
      const invD = 1 / dx;
      let t1 = (box.minX - ax) * invD;
      let t2 = (box.maxX - ax) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Y slab
    if (Math.abs(dy) < 1e-6) {
      if (ay < box.minY || ay > box.maxY) continue;
    } else {
      const invD = 1 / dy;
      let t1 = (box.minY - ay) * invD;
      let t2 = (box.maxY - ay) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    // Z slab
    if (Math.abs(dz) < 1e-6) {
      if (az < box.minZ || az > box.maxZ) continue;
    } else {
      const invD = 1 / dz;
      let t1 = (box.minZ - az) * invD;
      let t2 = (box.maxZ - az) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }

    if (tMin <= tMax && tMax >= 0 && tMin <= 1) {
      return false;
    }
  }
  return true;
}

/** Pushes an NPC/AI/spawn horizontal coordinate cleanly outside active static obstacles */
export function resolveHorizontalObstaclePush(
  pos: { x: number; y: number; z: number },
  radius = 0.44,
): void {
  if (pos.y > 5.2) return;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < activeWorldObstacleColliders.length; i++) {
      const box = activeWorldObstacleColliders[i];
      if (pos.y >= box.maxY - 0.08) continue;
      const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          const penLeft = Math.abs(pos.x - box.minX);
          const penRight = Math.abs(box.maxX - pos.x);
          const penTop = Math.abs(pos.z - box.minZ);
          const penBottom = Math.abs(box.maxZ - pos.z);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) pos.x = box.minX - radius;
          else if (minPen === penRight) pos.x = box.maxX + radius;
          else if (minPen === penTop) pos.z = box.minZ - radius;
          else pos.z = box.maxZ + radius;
        }
      }
    }
  }
}

export class CharacterPhysics {
  public readonly position = new THREE.Vector3(0, 0, 0);
  public readonly velocity = new THREE.Vector3(0, 0, 0);

  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private accumulator = 0;
  private lastSprintingForward = false;

  private readonly colliders: AabbCollider[];
  private readonly obstacleColliders: AabbCollider[] = [];
  private readonly ramps: RampCollider[] = [];
  private worldOuterBound: number;

  // Reusable scratch vectors & result objects (zero GC in loop)
  private readonly _fwd = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _wishVel = new THREE.Vector3();
  private readonly _resultPos = new THREE.Vector3();
  private readonly _resultVel = new THREE.Vector3();
  private readonly _subResult = { justJumped: false, landImpactSpeed: 0 };
  private readonly _stepResult: PhysicsStepResult = {
    position: this._resultPos,
    velocity: this._resultVel,
    grounded: true,
    justJumped: false,
    landImpactSpeed: 0,
    localForwardNorm: 0,
    localRightNorm: 0,
    sprintingForward: false,
  };

  constructor(options?: { halfInner?: number; halfOuter?: number; withBorderRim?: boolean }) {
    const inner = options?.halfInner ?? BASEPLATE_HALF_INNER;
    const outer = options?.halfOuter ?? BASEPLATE_HALF_OUTER;
    const h = BASEPLATE_BORDER_HEIGHT;
    const withBorderRim = options?.withBorderRim ?? true;
    this.worldOuterBound = outer;

    this.colliders = [
      // Main baseplate floor slab
      {
        minX: -inner,
        maxX: inner,
        minY: -2.0,
        maxY: 0.0,
        minZ: -inner,
        maxZ: inner,
      },
    ];

    if (withBorderRim) {
      this.colliders.push(
        // North trim (-Z)
        {
          minX: -outer,
          maxX: outer,
          minY: -2.0,
          maxY: h,
          minZ: -outer,
          maxZ: -inner,
        },
        // South trim (+Z)
        {
          minX: -outer,
          maxX: outer,
          minY: -2.0,
          maxY: h,
          minZ: inner,
          maxZ: outer,
        },
        // West trim (-X)
        {
          minX: -outer,
          maxX: -inner,
          minY: -2.0,
          maxY: h,
          minZ: -inner,
          maxZ: inner,
        },
        // East trim (+X)
        {
          minX: inner,
          maxX: outer,
          minY: -2.0,
          maxY: h,
          minZ: -inner,
          maxZ: inner,
        },
      );
    }

    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].maxY > 0.04) {
        this.obstacleColliders.push(this.colliders[i]);
      }
    }
  }

  public addCollider(box: AabbCollider): void {
    this.colliders.push(box);
    if (box.maxY > 0.04) {
      this.obstacleColliders.push(box);
    }
  }

  public addRamp(ramp: RampCollider): void {
    this.ramps.push(ramp);
  }

  public queueJump(): void {
    this.jumpBufferTimer = JUMP_BUFFER_TIME;
  }

  public setGrounded(grounded: boolean): void {
    this.grounded = grounded;
  }

  public reset(): void {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.accumulator = 0;
    this.lastSprintingForward = false;
  }

  /** Pushes character cleanly out of any raised AABB obstacles (used when Vision Intangibility turns off) */
  public resolveHorizontalOverlap(): void {
    for (let pass = 0; pass < 3; pass++) {
      this.resolveHorizontalCollisions(false);
    }
    const maxBound = this.worldOuterBound - CHAR_RADIUS - 0.12;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -maxBound, maxBound);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -maxBound, maxBound);
  }

  public step(dt: number, input: PhysicsInput): PhysicsStepResult {
    const safeDt = Math.min(dt, 0.05);
    if (input.jumpQueued) {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    }

    this.accumulator += safeDt;

    let justJumpedAny = false;
    let maxLandImpact = 0;

    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      const sub = this.stepFixed(FIXED_DT, input);
      if (sub.justJumped) justJumpedAny = true;
      if (sub.landImpactSpeed > maxLandImpact) {
        maxLandImpact = sub.landImpactSpeed;
      }
    }

    // Compute local forward/right velocity relative to character facing yaw
    const sinY = Math.sin(input.facingYaw);
    const cosY = Math.cos(input.facingYaw);
    // Forward direction in Three.js for yaw rotation around Y: (-sin(yaw), 0, -cos(yaw))
    this._fwd.set(-sinY, 0, -cosY);
    this._right.set(cosY, 0, -sinY);

    const localForwardNorm =
      (this.velocity.x * this._fwd.x + this.velocity.z * this._fwd.z) / MAX_SPEED;
    const localRightNorm =
      (this.velocity.x * this._right.x + this.velocity.z * this._right.z) / MAX_SPEED;

    this._resultPos.copy(this.position);
    this._resultVel.copy(this.velocity);

    this._stepResult.grounded = this.grounded;
    this._stepResult.justJumped = justJumpedAny;
    this._stepResult.landImpactSpeed = maxLandImpact;
    this._stepResult.localForwardNorm = localForwardNorm;
    this._stepResult.localRightNorm = localRightNorm;
    this._stepResult.sprintingForward = this.lastSprintingForward;
    return this._stepResult;
  }

  private stepFixed(
    dt: number,
    input: PhysicsInput,
  ): { justJumped: boolean; landImpactSpeed: number } {
    let justJumped = false;
    let landImpactSpeed = 0;

    // Timers
    if (this.grounded) {
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Forward & right unit vectors for facingYaw
    const sinY = Math.sin(input.facingYaw);
    const cosY = Math.cos(input.facingYaw);
    this._fwd.set(-sinY, 0, -cosY);
    this._right.set(cosY, 0, -sinY);

    // Normalize joystick magnitude gently while keeping analog walk->run range
    const rawMag = Math.hypot(input.moveX, input.moveY);
    const clampedMag = Math.min(rawMag, 1);
    let normX = 0;
    let normY = 0;
    if (rawMag > 0.0001) {
      normX = (input.moveX / rawMag) * clampedMag;
      normY = (input.moveY / rawMag) * clampedMag;
    }

    // Sprint only activates when toggle is ON AND character is actively moving forward
    // (never when idle, moving backward, or strafing sideways)
    const isFlying = Boolean(input.flying);
    const speedMul = Math.max(0.25, input.speedMultiplier ?? 1);
    const isMovingForward =
      !isFlying && normY > 0.2 && Math.abs(normY) > Math.abs(normX) * 0.75;
    const sprintActive = Boolean(input.sprintEnabled) && isMovingForward;
    this.lastSprintingForward = sprintActive;

    // Flight is swift, responsive, and smoothly controlled
    const speedLimit = (isFlying ? 7.6 : MAX_SPEED) * speedMul;
    const sprintMul = input.sprintSpeedMultiplier ?? 1.62;
    const fwdSpeedScale = isFlying
      ? normY >= 0
        ? 1.04
        : 0.86
      : normY >= 0
        ? sprintActive
          ? sprintMul
          : 1.0
        : 0.84;
    const strafeScale = isFlying ? 0.94 : 0.88;
    const targetVx =
      (this._fwd.x * normY * fwdSpeedScale + this._right.x * normX * strafeScale) *
      speedLimit;
    const targetVz =
      (this._fwd.z * normY * fwdSpeedScale + this._right.z * normX * strafeScale) *
      speedLimit;

    this._wishVel.set(targetVx, 0, targetVz);

    const hasInput = clampedMag > 0.02;
    const baseAccel = isFlying
      ? hasInput
        ? 22.0
        : 13.5
      : this.grounded
        ? hasInput
          ? GROUND_ACCEL
          : GROUND_DECEL
        : hasInput
          ? AIR_ACCEL
          : AIR_DECEL;
    const accel = baseAccel * Math.max(1, speedMul * 0.82);

    const dvx = this._wishVel.x - this.velocity.x;
    const dvz = this._wishVel.z - this.velocity.z;
    const dvLen = Math.hypot(dvx, dvz);
    const maxStep = accel * dt;

    if (dvLen <= maxStep) {
      this.velocity.x = this._wishVel.x;
      this.velocity.z = this._wishVel.z;
    } else if (dvLen > 0.0001) {
      this.velocity.x += (dvx / dvLen) * maxStep;
      this.velocity.z += (dvz / dvLen) * maxStep;
    }

    if (isFlying) {
      // 3D 360-Degree Free Flight (vôo livre) with inverted pitch (up=down, down=up) & smooth animated speed
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;

      const pitch = input.cameraPitch ?? 0;
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const flyFwdX = -sinY * cosP;
      const flyFwdY = -sinP; // Inverted pitch: looking up goes down, looking down goes up
      const flyFwdZ = -cosY * cosP;

      const ascendDown = (input.ascendHeld ? 1 : 0) - (input.descendQueued ? 1 : 0);
      const verticalControlRate = 2.85; // Gentle, slow climb/descent when holding jump/descend

      const targetVx = (flyFwdX * normY * fwdSpeedScale + this._right.x * normX * strafeScale) * speedLimit;
      const targetVy = flyFwdY * normY * fwdSpeedScale * speedLimit + ascendDown * verticalControlRate;
      const targetVz = (flyFwdZ * normY * fwdSpeedScale + this._right.z * normX * strafeScale) * speedLimit;

      this._wishVel.set(targetVx, targetVy, targetVz);

      const flyAccel = hasInput || ascendDown !== 0 ? 12.0 : 7.5;

      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVx, flyAccel, dt);
      this.velocity.y = THREE.MathUtils.damp(this.velocity.y, targetVy, flyAccel, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVz, flyAccel, dt);
    } else {
      // Jump execution (coyote + buffered)
      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.velocity.y = JUMP_SPEED;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        justJumped = true;
      }

      // Gravity
      if (!this.grounded) {
        this.velocity.y += GRAVITY * dt;
      }
    }

    // Move horizontally & resolve XZ collisions against raised colliders
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.resolveHorizontalCollisions(Boolean(input.intangible));

    // Clamp cleanly within outer arena boundary
    const maxBound = this.worldOuterBound - CHAR_RADIUS - 0.12;
    if (this.position.x < -maxBound) {
      this.position.x = -maxBound;
      if (this.velocity.x < 0) this.velocity.x = 0;
    } else if (this.position.x > maxBound) {
      this.position.x = maxBound;
      if (this.velocity.x > 0) this.velocity.x = 0;
    }

    if (this.position.z < -maxBound) {
      this.position.z = -maxBound;
      if (this.velocity.z < 0) this.velocity.z = 0;
    } else if (this.position.z > maxBound) {
      this.position.z = maxBound;
      if (this.velocity.z > 0) this.velocity.z = 0;
    }

    // Move vertically & resolve swept ground/platform/ramp collisions
    const prevY = this.position.y;
    const prevVy = this.velocity.y;
    const wasGrounded = this.grounded;
    this.position.y += this.velocity.y * dt;

    if (isFlying) {
      // Free flight altitude clamp (0.3m min to 55m max) without forcing ground snaps
      if (this.position.y < 0.3) {
        this.position.y = 0.3;
        if (this.velocity.y < 0) this.velocity.y = 0;
      } else if (this.position.y > 55.0) {
        this.position.y = 55.0;
        if (this.velocity.y > 0) this.velocity.y = 0;
      }
      this.grounded = false;
      this._subResult.justJumped = false;
      this._subResult.landImpactSpeed = 0;
      return this._subResult;
    }

    let highestFloor = -Infinity;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (this.overlapsXZ(this.position.x, this.position.z, CHAR_RADIUS, c)) {
        // Check if character feet were at or above top surface (with step-up tolerance for ramp exits)
        if (prevY >= c.maxY - 0.14 && this.position.y <= c.maxY + 0.005 && this.velocity.y <= 0) {
          if (c.maxY > highestFloor) {
            highestFloor = c.maxY;
          }
        }
      }
    }

    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      if (
        this.position.x >= r.minX - CHAR_RADIUS * 0.5 &&
        this.position.x <= r.maxX + CHAR_RADIUS * 0.5 &&
        this.position.z >= r.minZ - CHAR_RADIUS * 0.5 &&
        this.position.z <= r.maxZ + CHAR_RADIUS * 0.5
      ) {
        const rampY = computeRampHeightAt(this.position.x, this.position.z, r);
        const snapDown = wasGrounded && !justJumped && this.velocity.y <= 0 ? 0.24 : 0.04;
        if (prevY >= rampY - 0.35 && this.position.y <= rampY + snapDown && this.velocity.y <= 0) {
          if (rampY > highestFloor) {
            highestFloor = rampY;
          }
        }
      }
    }

    if (highestFloor > -Infinity) {
      if (!this.grounded && prevVy < -0.5) {
        landImpactSpeed = Math.abs(prevVy);
      }
      this.position.y = highestFloor;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      // Check if still supported right beneath feet when walking horizontally
      let supportY = -Infinity;
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (this.overlapsXZ(this.position.x, this.position.z, CHAR_RADIUS, c)) {
          if (Math.abs(this.position.y - c.maxY) < 0.04 && this.velocity.y <= 0) {
            if (c.maxY > supportY) supportY = c.maxY;
          }
        }
      }
      if (supportY > -Infinity && this.velocity.y <= 0) {
        this.position.y = supportY;
        this.velocity.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    // Safety floor clamp
    if (this.position.y < 0) {
      if (!this.grounded && prevVy < -0.5) {
        landImpactSpeed = Math.abs(prevVy);
      }
      this.position.y = 0;
      this.velocity.y = 0;
      this.grounded = true;
    }

    this._subResult.justJumped = justJumped;
    this._subResult.landImpactSpeed = landImpactSpeed;
    return this._subResult;
  }

  private overlapsXZ(
    px: number,
    pz: number,
    radius: number,
    box: AabbCollider,
  ): boolean {
    const closestX = Math.max(box.minX, Math.min(px, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  private resolveHorizontalCollisions(intangible = false): void {
    if (intangible) return;
    const footY = this.position.y;
    const headY = this.position.y + CHAR_HEIGHT;

    for (let i = 0; i < this.obstacleColliders.length; i++) {
      const box = this.obstacleColliders[i];
      // Ignore floor slabs or colliders strictly below feet / above head
      if (box.maxY <= footY + 0.14 || box.minY >= headY) continue;

      const closestX = Math.max(box.minX, Math.min(this.position.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(this.position.z, box.maxZ));
      const dx = this.position.x - closestX;
      const dz = this.position.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < CHAR_RADIUS * CHAR_RADIUS) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = CHAR_RADIUS - dist;
          const nx = dx / dist;
          const nz = dz / dist;
          this.position.x += nx * push;
          this.position.z += nz * push;

          // Cancel inward velocity component
          const vDotN = this.velocity.x * nx + this.velocity.z * nz;
          if (vDotN < 0) {
            this.velocity.x -= nx * vDotN;
            this.velocity.z -= nz * vDotN;
          }
        } else {
          // Center inside AABB fallback: push out along shallowest axis
          const penLeft = Math.abs(this.position.x - box.minX);
          const penRight = Math.abs(box.maxX - this.position.x);
          const penTop = Math.abs(this.position.z - box.minZ);
          const penBottom = Math.abs(box.maxZ - this.position.z);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);

          if (minPen === penLeft) {
            this.position.x = box.minX - CHAR_RADIUS;
            if (this.velocity.x > 0) this.velocity.x = 0;
          } else if (minPen === penRight) {
            this.position.x = box.maxX + CHAR_RADIUS;
            if (this.velocity.x < 0) this.velocity.x = 0;
          } else if (minPen === penTop) {
            this.position.z = box.minZ - CHAR_RADIUS;
            if (this.velocity.z > 0) this.velocity.z = 0;
          } else {
            this.position.z = box.maxZ + CHAR_RADIUS;
            if (this.velocity.z < 0) this.velocity.z = 0;
          }
        }
      }
    }

    // Also block horizontal entry into tall sides/backs of ramps above step-up tolerance
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      if (r.topY <= footY + 0.14 || r.baseY >= headY) continue;
      const closestX = Math.max(r.minX, Math.min(this.position.x, r.maxX));
      const closestZ = Math.max(r.minZ, Math.min(this.position.z, r.maxZ));
      const dx = this.position.x - closestX;
      const dz = this.position.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= CHAR_RADIUS * CHAR_RADIUS) continue;
      const rampY = computeRampHeightAt(closestX, closestZ, r);
      if (rampY <= footY + 0.42) continue;

      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = CHAR_RADIUS - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        this.position.x += nx * push;
        this.position.z += nz * push;
        const vDotN = this.velocity.x * nx + this.velocity.z * nz;
        if (vDotN < 0) {
          this.velocity.x -= nx * vDotN;
          this.velocity.z -= nz * vDotN;
        }
      }
    }
  }
}
