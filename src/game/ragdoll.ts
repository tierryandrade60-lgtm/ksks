import * as THREE from 'three';
import {
  BASEPLATE_BORDER_HEIGHT,
  BASEPLATE_HALF_INNER,
  getActiveWorldMaxBound,
  getGroundSurfaceY,
} from './physics';
import { R16Rig } from './r16Character';

interface JointState {
  rx: number;
  ry: number;
  rz: number;
  vx: number;
  vy: number;
  vz: number;
  targetRx: number;
  targetRz: number;
  minRx: number;
  maxRx: number;
  minRz: number;
  maxRz: number;
  stiffness: number;
  damping: number;
}

const GRAVITY = -28.0;
const PELVIS_REST_HEIGHT = 0.165; // Matches half-depth of R16 chest/pelvis + subtle cloth margin

function createEmptyJointState(): JointState {
  return {
    rx: 0,
    ry: 0,
    rz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    targetRx: 0,
    targetRz: 0,
    minRx: 0,
    maxRx: 0,
    minRz: 0,
    maxRz: 0,
    stiffness: 9.0,
    damping: 7.0,
  };
}

function setJointState(
  j: JointState,
  grp: THREE.Group,
  targetRx: number,
  targetRz: number,
  minRx: number,
  maxRx: number,
  minRz: number,
  maxRz: number,
  vxSeed: number,
  vzSeed: number,
  stiffness = 9.0,
  damping = 7.0,
): void {
  j.rx = grp.rotation.x;
  j.ry = grp.rotation.y;
  j.rz = grp.rotation.z;
  j.vx = vxSeed;
  j.vy = 0;
  j.vz = vzSeed;
  j.targetRx = targetRx;
  j.targetRz = targetRz;
  j.minRx = minRx;
  j.maxRx = maxRx;
  j.minRz = minRz;
  j.maxRz = maxRz;
  j.stiffness = stiffness;
  j.damping = damping;
}

export class R16Ragdoll {
  private readonly rig: R16Rig;
  public active = false;

  private readonly pelvisWorldPos = new THREE.Vector3();
  private readonly pelvisVel = new THREE.Vector3();
  private pelvisYaw = 0;
  private pelvisPitch = 0;
  private pelvisRoll = 0;
  private pelvisYawVel = 0;
  private pelvisPitchVel = 0;
  private pelvisRollVel = 0;
  private targetFlatPitch = Math.PI * 0.49;
  private settleTime = 0;
  private groundedContact = false;
  private settled = false;

  private readonly joints: Record<string, JointState> = {
    waist: createEmptyJointState(),
    chest: createEmptyJointState(),
    head: createEmptyJointState(),
    leftUpperArm: createEmptyJointState(),
    leftLowerArm: createEmptyJointState(),
    rightUpperArm: createEmptyJointState(),
    rightLowerArm: createEmptyJointState(),
    leftUpperLeg: createEmptyJointState(),
    leftLowerLeg: createEmptyJointState(),
    leftFoot: createEmptyJointState(),
    rightUpperLeg: createEmptyJointState(),
    rightLowerLeg: createEmptyJointState(),
    rightFoot: createEmptyJointState(),
  };
  private readonly _probeA = new THREE.Vector3();
  private readonly _probeB = new THREE.Vector3();
  private readonly _localOffset = new THREE.Vector3();

  constructor(rig: R16Rig) {
    this.rig = rig;
  }

  public trigger(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    facingYaw: number,
    knockbackImpulse?: THREE.Vector3,
  ): void {
    this.active = true;
    this.settleTime = 0;
    this.groundedContact = false;
    this.settled = false;

    this.rig.bodyPivot.scale.set(1, 1, 1);
    this.rig.bodyPivot.rotation.set(0, 0, 0);

    this.pelvisWorldPos.set(
      position.x,
      Math.max(position.y, 0) + this.rig.pelvis.position.y,
      position.z,
    );

    const sinY = Math.sin(facingYaw);
    const cosY = Math.cos(facingYaw);
    // Character front faces -Z; back faces +Z
    const fallBackward = Math.random() > 0.35;
    const fallDir = fallBackward ? 1 : -1;
    const lateralSign = Math.random() > 0.5 ? 1 : -1;

    this.pelvisVel.set(
      velocity.x * 0.55 +
        sinY * 0.85 * fallDir +
        cosY * lateralSign * 0.35 +
        (knockbackImpulse?.x ?? 0),
      Math.max(velocity.y * 0.35, 0) + 0.18 + (knockbackImpulse?.y ?? 0),
      velocity.z * 0.55 +
        cosY * 0.85 * fallDir -
        sinY * lateralSign * 0.35 +
        (knockbackImpulse?.z ?? 0),
    );

    this.pelvisYaw = facingYaw;
    this.pelvisPitch = 0;
    this.pelvisRoll = this.rig.pelvis.rotation.z;
    // +PI/2 tilts +Y (head) toward +Z (backward onto back); -PI/2 tilts +Y toward -Z (face down)
    this.targetFlatPitch = fallBackward ? Math.PI * 0.485 : -Math.PI * 0.485;

    this.pelvisPitchVel = fallBackward ? 4.3 : -4.3;
    this.pelvisRollVel = lateralSign * (0.75 + Math.random() * 0.65);
    this.pelvisYawVel = lateralSign * (0.85 + Math.random() * 0.95);

    // When lying on back (fallBackward=true):
    // negative head.rx lifts head away from floor; positive leg/arm.rx lifts arms/legs away from floor
    const headRestRx = fallBackward ? -0.14 : 0.14;
    const limbLift = fallBackward ? 0.12 : -0.12;

    setJointState(
      this.joints.waist,
      this.rig.waist,
      fallBackward ? -0.06 : 0.06,
      lateralSign * 0.04,
      -0.32,
      0.32,
      -0.24,
      0.24,
      fallBackward ? -1.1 : 1.1,
      lateralSign * 0.6,
      14,
      8.5,
    );
    setJointState(
      this.joints.chest,
      this.rig.chest,
      fallBackward ? -0.06 : 0.06,
      lateralSign * 0.05,
      -0.34,
      0.34,
      -0.28,
      0.28,
      fallBackward ? -1.3 : 1.3,
      lateralSign * 0.7,
      12,
      8.0,
    );
    setJointState(
      this.joints.head,
      this.rig.head,
      headRestRx,
      lateralSign * 0.14,
      -0.5,
      0.5,
      -0.4,
      0.4,
      fallBackward ? -2.2 : 2.2,
      lateralSign * 1.5,
      11.0,
      7.0,
    );
    setJointState(
      this.joints.leftUpperArm,
      this.rig.leftUpperArm,
      limbLift + (Math.random() - 0.5) * 0.35,
      -0.55 - Math.random() * 0.35,
      -1.8,
      1.8,
      -1.65,
      0.12,
      (Math.random() - 0.5) * 3.8,
      -2.4 - Math.random() * 1.4,
      8.0,
      6.5,
    );
    setJointState(
      this.joints.leftLowerArm,
      this.rig.leftLowerArm,
      0.25 + Math.random() * 0.38,
      0,
      0.04,
      1.65,
      -0.15,
      0.15,
      1.6 + Math.random() * 1.5,
      0,
      8.5,
      6.5,
    );
    setJointState(
      this.joints.rightUpperArm,
      this.rig.rightUpperArm,
      limbLift + (Math.random() - 0.5) * 0.35,
      0.55 + Math.random() * 0.35,
      -1.8,
      1.8,
      -0.58,
      -0.14,
      (Math.random() - 0.5) * 3.2,
      -1.8 - Math.random() * 1.2,
      8.5,
      7.0,
    );
    setJointState(
      this.joints.rightLowerArm,
      this.rig.rightLowerArm,
      0.25 + Math.random() * 0.38,
      0,
      0.04,
      1.65,
      -0.15,
      0.15,
      1.6 + Math.random() * 1.5,
      0,
      8.5,
      6.5,
    );
    setJointState(
      this.joints.leftUpperLeg,
      this.rig.leftUpperLeg,
      limbLift * 0.8 + (Math.random() - 0.5) * 0.18,
      -0.15 - Math.random() * 0.14,
      -1.15,
      1.15,
      -0.65,
      0.1,
      fallBackward ? 1.8 : -1.8,
      -1.0,
      8.5,
      6.8,
    );
    setJointState(
      this.joints.leftLowerLeg,
      this.rig.leftLowerLeg,
      -0.18 - Math.random() * 0.28,
      0,
      -1.75,
      -0.04,
      -0.1,
      0.1,
      -2.0 - Math.random() * 1.2,
      0,
      9.2,
      7.0,
    );
    setJointState(
      this.joints.leftFoot,
      this.rig.leftFoot,
      -0.12,
      0,
      -0.55,
      0.4,
      -0.18,
      0.18,
      -0.8,
      0,
      10.0,
      7.2,
    );
    setJointState(
      this.joints.rightUpperLeg,
      this.rig.rightUpperLeg,
      limbLift * 0.8 + (Math.random() - 0.5) * 0.18,
      0.15 + Math.random() * 0.14,
      -1.15,
      1.15,
      -0.1,
      0.65,
      fallBackward ? 1.5 : -1.5,
      1.0,
      8.5,
      6.8,
    );
    setJointState(
      this.joints.rightLowerLeg,
      this.rig.rightLowerLeg,
      -0.18 - Math.random() * 0.28,
      0,
      -1.75,
      -0.04,
      -0.1,
      0.1,
      -1.8 - Math.random() * 1.2,
      0,
      9.2,
      7.0,
    );
    setJointState(
      this.joints.rightFoot,
      this.rig.rightFoot,
      -0.12,
      0,
      -0.55,
      0.4,
      -0.18,
      0.18,
      -0.7,
      0,
      10.0,
      7.2,
    );
  }

  private getProbeWorldPos(
    group: THREE.Group,
    localX: number,
    localY: number,
    localZ: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    this._localOffset.set(localX, localY, localZ);
    return out.copy(this._localOffset).applyMatrix4(group.matrixWorld);
  }

  public update(dt: number): THREE.Vector3 {
    const safeDt = Math.min(dt, 0.04);
    this.settleTime += safeDt;

    const activeMaxInner = getActiveWorldMaxBound();
    const onBorder =
      activeMaxInner === BASEPLATE_HALF_INNER &&
      (Math.abs(this.pelvisWorldPos.x) > BASEPLATE_HALF_INNER ||
        Math.abs(this.pelvisWorldPos.z) > BASEPLATE_HALF_INNER);
    const groundY = onBorder
      ? BASEPLATE_BORDER_HEIGHT
      : getGroundSurfaceY(
          this.pelvisWorldPos.x,
          this.pelvisWorldPos.z,
          this.pelvisWorldPos.y + 0.45,
        );
    const minPelvisY = groundY + PELVIS_REST_HEIGHT;

    if (!this.settled) {
      // 1. Always apply gravity while above floor surface
      const aboveFloor = this.pelvisWorldPos.y > minPelvisY + 0.004;
      if (aboveFloor || this.pelvisVel.y > 0) {
        this.pelvisVel.y += GRAVITY * safeDt;
        this.groundedContact = false;
      }

      this.pelvisWorldPos.addScaledVector(this.pelvisVel, safeDt);

      // 2. Clamp strictly inside arena walls
      const maxBound =
        activeMaxInner === BASEPLATE_HALF_INNER
          ? BASEPLATE_HALF_INNER + 0.55
          : activeMaxInner - 0.55;
      if (this.pelvisWorldPos.x < -maxBound) {
        this.pelvisWorldPos.x = -maxBound;
        this.pelvisVel.x = Math.abs(this.pelvisVel.x) * 0.2;
      } else if (this.pelvisWorldPos.x > maxBound) {
        this.pelvisWorldPos.x = maxBound;
        this.pelvisVel.x = -Math.abs(this.pelvisVel.x) * 0.2;
      }
      if (this.pelvisWorldPos.z < -maxBound) {
        this.pelvisWorldPos.z = -maxBound;
        this.pelvisVel.z = Math.abs(this.pelvisVel.z) * 0.2;
      } else if (this.pelvisWorldPos.z > maxBound) {
        this.pelvisWorldPos.z = maxBound;
        this.pelvisVel.z = -Math.abs(this.pelvisVel.z) * 0.2;
      }

      // 3. Floor collision & heavy viscous + Coulomb friction
      if (this.pelvisWorldPos.y <= minPelvisY) {
        const impactSpeed = Math.abs(this.pelvisVel.y);
        this.pelvisWorldPos.y = minPelvisY;
        if (impactSpeed > 2.8 && this.settleTime < 0.55) {
          this.pelvisVel.y = impactSpeed * 0.14;
          this.groundedContact = false;
        } else {
          this.pelvisVel.y = 0;
          this.groundedContact = true;
        }
      }

      if (this.groundedContact) {
        const viscous = Math.exp(-10.5 * safeDt);
        this.pelvisVel.x *= viscous;
        this.pelvisVel.z *= viscous;

        const horizSpeed = Math.hypot(this.pelvisVel.x, this.pelvisVel.z);
        const coulombDecel = 8.8 * safeDt;
        if (horizSpeed <= coulombDecel || horizSpeed < 0.08) {
          this.pelvisVel.x = 0;
          this.pelvisVel.z = 0;
        } else {
          const scale = (horizSpeed - coulombDecel) / horizSpeed;
          this.pelvisVel.x *= scale;
          this.pelvisVel.z *= scale;
        }

        // Strongly settle body pitch/roll/yaw flat onto the floor without sliding or endless spin
        const pitchPull = (this.targetFlatPitch - this.pelvisPitch) * 44;
        this.pelvisPitchVel =
          (this.pelvisPitchVel + pitchPull * safeDt) * Math.exp(-13.0 * safeDt);
        this.pelvisRollVel =
          (this.pelvisRollVel - this.pelvisRoll * 12.0 * safeDt) *
          Math.exp(-13.5 * safeDt);
        this.pelvisYawVel *= Math.exp(-13.5 * safeDt);

        if (Math.abs(this.pelvisYawVel) < 0.06) this.pelvisYawVel = 0;
        if (
          Math.abs(this.pelvisPitchVel) < 0.05 &&
          Math.abs(this.targetFlatPitch - this.pelvisPitch) < 0.025
        ) {
          this.pelvisPitch = this.targetFlatPitch;
          this.pelvisPitchVel = 0;
        }
        if (
          Math.abs(this.pelvisRollVel) < 0.05 &&
          Math.abs(this.pelvisRoll) < 0.025
        ) {
          this.pelvisRoll = 0;
          this.pelvisRollVel = 0;
        }
      } else {
        const airDamp = Math.exp(-1.6 * safeDt);
        this.pelvisPitchVel *= airDamp;
        this.pelvisRollVel *= airDamp;
        this.pelvisYawVel *= airDamp;
      }

      this.pelvisPitch += this.pelvisPitchVel * safeDt;
      this.pelvisRoll += this.pelvisRollVel * safeDt;
      this.pelvisYaw += this.pelvisYawVel * safeDt;

      // 4. Articulated limb spring constraints
      let totalJointEnergy = 0;
      const ryDamp = Math.exp(-10 * safeDt);
      const stepJoint = (name: string, grp: THREE.Group) => {
        const j = this.joints[name];
        if (!j) return;

        const forceX = (j.targetRx - j.rx) * j.stiffness - j.vx * j.damping;
        const forceZ = (j.targetRz - j.rz) * j.stiffness - j.vz * j.damping;
        j.vx += forceX * safeDt;
        j.vz += forceZ * safeDt;

        j.rx += j.vx * safeDt;
        j.rz += j.vz * safeDt;
        j.ry *= ryDamp;

        if (j.rx < j.minRx) {
          j.rx = j.minRx;
          if (j.vx < 0) j.vx = -j.vx * 0.1;
        } else if (j.rx > j.maxRx) {
          j.rx = j.maxRx;
          if (j.vx > 0) j.vx = -j.vx * 0.1;
        }
        if (j.rz < j.minRz) {
          j.rz = j.minRz;
          if (j.vz < 0) j.vz = -j.vz * 0.1;
        } else if (j.rz > j.maxRz) {
          j.rz = j.maxRz;
          if (j.vz > 0) j.vz = -j.vz * 0.1;
        }

        totalJointEnergy += Math.abs(j.vx) + Math.abs(j.vz);
        grp.rotation.set(j.rx, j.ry, j.rz);
      };

      stepJoint('waist', this.rig.waist);
      stepJoint('chest', this.rig.chest);
      stepJoint('head', this.rig.head);
      stepJoint('leftUpperArm', this.rig.leftUpperArm);
      stepJoint('leftLowerArm', this.rig.leftLowerArm);
      stepJoint('rightUpperArm', this.rig.rightUpperArm);
      stepJoint('rightLowerArm', this.rig.rightLowerArm);
      stepJoint('leftUpperLeg', this.rig.leftUpperLeg);
      stepJoint('leftLowerLeg', this.rig.leftLowerLeg);
      stepJoint('leftFoot', this.rig.leftFoot);
      stepJoint('rightUpperLeg', this.rig.rightUpperLeg);
      stepJoint('rightLowerLeg', this.rig.rightLowerLeg);
      stepJoint('rightFoot', this.rig.rightFoot);

      // 5. Apply pelvis transform & resolve exact 3D floor contacts (zero clipping!)
      this.applyRigAndFloorContacts(groundY, minPelvisY);

      const linearRest =
        this.groundedContact &&
        this.pelvisVel.x === 0 &&
        this.pelvisVel.z === 0 &&
        this.pelvisVel.y === 0;
      const angularRest =
        Math.abs(this.pelvisYawVel) < 0.02 &&
        Math.abs(this.pelvisPitchVel) < 0.02 &&
        Math.abs(this.pelvisRollVel) < 0.02;

      if (
        this.settleTime > 0.7 &&
        linearRest &&
        angularRest &&
        totalJointEnergy < 0.28
      ) {
        this.settled = true;
        this.pelvisVel.set(0, 0, 0);
        this.pelvisYawVel = 0;
        this.pelvisPitchVel = 0;
        this.pelvisRollVel = 0;
      }
    }

    return this.pelvisWorldPos;
  }

  private applyRigAndFloorContacts(groundY: number, minPelvisY: number): void {
    this.rig.root.position.set(this.pelvisWorldPos.x, groundY, this.pelvisWorldPos.z);
    this.rig.root.rotation.set(0, this.pelvisYaw, 0);
    this.rig.pelvis.position.set(0, this.pelvisWorldPos.y - groundY, 0);
    this.rig.pelvis.rotation.set(this.pelvisPitch, 0, this.pelvisRoll, 'YXZ');
    this.rig.root.updateMatrixWorld(true);

    // Helper: test finite-difference rotation sign so limb ALWAYS rotates strictly UPWARD.
    // Updates only the touched joint subtree (whose parent matrixWorld is already valid).
    const liftJointAboveFloor = (
      probeGroup: THREE.Group,
      lx: number,
      ly: number,
      lz: number,
      radius: number,
      jointKey: string,
      jointGroup: THREE.Group,
      gain = 2.6,
    ): number => {
      const p0 = this.getProbeWorldPos(probeGroup, lx, ly, lz, this._probeA);
      const bottomY = p0.y - radius;
      if (bottomY >= groundY + 0.004) return 0;

      const deficit = groundY + 0.004 - bottomY;
      const j = this.joints[jointKey];
      if (!j) return deficit;

      // Test +0.02 rad perturbation to see which rotation direction raises probe world Y
      const origRx = jointGroup.rotation.x;
      jointGroup.rotation.x = origRx + 0.02;
      jointGroup.updateMatrixWorld(true);
      const pPlus = this.getProbeWorldPos(probeGroup, lx, ly, lz, this._probeB);
      const slope = pPlus.y - p0.y;

      if (Math.abs(slope) > 1e-5) {
        const upDir = slope > 0 ? 1 : -1;
        const nextRx = THREE.MathUtils.clamp(
          j.rx + upDir * deficit * gain,
          j.minRx,
          j.maxRx,
        );
        j.rx = nextRx;
        j.targetRx = THREE.MathUtils.lerp(j.targetRx, nextRx, 0.55);
        j.vx *= 0.25;
        jointGroup.rotation.x = j.rx;
      } else {
        jointGroup.rotation.x = origRx;
      }
      jointGroup.updateMatrixWorld(true);
      return deficit;
    };

    // 1. Keep extremities (upper arms, forearms, hands, knees, feet, head) strictly above baseplate
    liftJointAboveFloor(this.rig.head, 0, 0.28, 0, 0.235, 'head', this.rig.head, 2.3);
    liftJointAboveFloor(this.rig.leftUpperArm, 0, -0.15, 0, 0.11, 'leftUpperArm', this.rig.leftUpperArm, 2.5);
    liftJointAboveFloor(this.rig.leftLowerArm, 0, -0.12, 0, 0.105, 'leftUpperArm', this.rig.leftUpperArm, 2.7);
    liftJointAboveFloor(this.rig.leftHand, 0, -0.06, 0, 0.1, 'leftUpperArm', this.rig.leftUpperArm, 2.7);
    liftJointAboveFloor(this.rig.rightUpperArm, 0, -0.15, 0, 0.11, 'rightUpperArm', this.rig.rightUpperArm, 2.5);
    liftJointAboveFloor(this.rig.rightLowerArm, 0, -0.12, 0, 0.105, 'rightUpperArm', this.rig.rightUpperArm, 2.7);
    liftJointAboveFloor(this.rig.rightHand, 0, -0.06, 0, 0.1, 'rightUpperArm', this.rig.rightUpperArm, 2.7);

    liftJointAboveFloor(this.rig.leftLowerLeg, 0, -0.18, 0, 0.12, 'leftUpperLeg', this.rig.leftUpperLeg, 2.7);
    liftJointAboveFloor(this.rig.leftFoot, 0, -0.07, -0.045, 0.12, 'leftUpperLeg', this.rig.leftUpperLeg, 2.5);
    liftJointAboveFloor(this.rig.rightLowerLeg, 0, -0.18, 0, 0.12, 'rightUpperLeg', this.rig.rightUpperLeg, 2.7);
    liftJointAboveFloor(this.rig.rightFoot, 0, -0.07, -0.045, 0.12, 'rightUpperLeg', this.rig.rightUpperLeg, 2.5);

    // 2. Final rigid floor guarantee for head, chest & pelvis so torso/head NEVER sink below y=0 or float
    const headCenter = this.getProbeWorldPos(this.rig.head, 0, 0.28, 0, this._probeA);
    const chestCenter = this.getProbeWorldPos(this.rig.chest, 0, 0.2, 0, this._probeB);
    const minTorsoBottom = Math.min(headCenter.y - 0.235, chestCenter.y - 0.155);
    if (minTorsoBottom < groundY + 0.002) {
      const lift = groundY + 0.002 - minTorsoBottom;
      this.pelvisWorldPos.y = Math.max(minPelvisY, this.pelvisWorldPos.y + lift);
      if (this.pelvisVel.y < 0) this.pelvisVel.y = 0;
      this.groundedContact = true;
      this.rig.pelvis.position.set(0, this.pelvisWorldPos.y - groundY, 0);
      this.rig.pelvis.updateMatrixWorld(true);
    }
  }

  public isPushComplete(): boolean {
    if (!this.active) return true;
    const horizSpeed = Math.hypot(this.pelvisVel.x, this.pelvisVel.z);
    return this.groundedContact && this.settleTime >= 0.14 && horizSpeed < 0.35;
  }

  public reset(): void {
    this.active = false;
    this.settleTime = 0;
    this.groundedContact = false;
    this.settled = false;
    this.pelvisVel.set(0, 0, 0);
    this.rig.bodyPivot.scale.set(1, 1, 1);
    this.rig.bodyPivot.rotation.set(0, 0, 0);
    this.rig.pelvis.position.set(0, 0.88, 0);
    this.rig.pelvis.rotation.set(0, 0, 0, 'XYZ');
    this.rig.waist.rotation.set(0, 0, 0);
    this.rig.chest.rotation.set(0, 0, 0);
    this.rig.head.rotation.set(0, 0, 0);
    this.rig.leftUpperArm.rotation.set(0, 0, 0);
    this.rig.leftLowerArm.rotation.set(0, 0, 0);
    this.rig.leftHand.rotation.set(0, 0, 0);
    this.rig.rightUpperArm.rotation.set(0, 0, 0);
    this.rig.rightLowerArm.rotation.set(0, 0, 0);
    this.rig.rightHand.rotation.set(0, 0, 0);
    this.rig.leftUpperLeg.rotation.set(0, 0, 0);
    this.rig.leftLowerLeg.rotation.set(0, 0, 0);
    this.rig.leftFoot.rotation.set(0, 0, 0);
    this.rig.rightUpperLeg.rotation.set(0, 0, 0);
    this.rig.rightLowerLeg.rotation.set(0, 0, 0);
    this.rig.rightFoot.rotation.set(0, 0, 0);
  }
}
