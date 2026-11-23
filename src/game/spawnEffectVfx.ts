import * as THREE from 'three';

export interface WorldSpawnPoint {
  id: string;
  label: string;
  x: number;
  z: number;
  facingYaw: number;
}

/**
 * 3 distinct, non-overlapping Player Spawn Points spread cleanly across the arena,
 * guaranteed clear of static pillars and baseplate walls.
 */
export const PLAYER_SPAWN_POINTS: ReadonlyArray<WorldSpawnPoint> = [
  {
    id: 'spawn-south-plaza',
    label: 'South Courtyard',
    x: 0.0,
    z: 14.2,
    facingYaw: 0,
  },
  {
    id: 'spawn-east-overlook',
    label: 'East Overlook',
    x: 24.5,
    z: -4.5,
    facingYaw: Math.PI * 0.48,
  },
  {
    id: 'spawn-west-flank',
    label: 'West Flank',
    x: -24.5,
    z: -14.5,
    facingYaw: -Math.PI * 0.62,
  },
];

interface PadBeacon {
  root: THREE.Group;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  coreDisc: THREE.Mesh;
  motes: THREE.Mesh[];
  moteAngles: number[];
}

interface ActiveSpawnPulse {
  root: THREE.Group;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  column: THREE.Mesh;
  colMat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
}

/**
 * Renders subtle animated cartoon ground spawn beacons at the 3 world spawn points,
 * plus a crisp ground arrival pulse whenever a player spawns or respawns.
 */
export class SpawnPadVfxSystem {
  public readonly group = new THREE.Group();

  private readonly pads: PadBeacon[] = [];
  private readonly pulses: ActiveSpawnPulse[] = [];
  private readonly pulsePool: ActiveSpawnPulse[] = [];

  private readonly outerRingGeo = new THREE.RingGeometry(1.06, 1.24, 24);
  private readonly innerRingGeo = new THREE.RingGeometry(0.62, 0.75, 16);
  private readonly coreDiscGeo = new THREE.CircleGeometry(0.56, 20);
  private readonly moteGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
  private readonly pulseRingGeo = new THREE.RingGeometry(0.45, 0.92, 24);
  private readonly pulseColGeo = new THREE.CylinderGeometry(0.75, 1.05, 3.2, 20, 1, true);

  private readonly outerRingMat = new THREE.MeshBasicMaterial({
    color: '#63D6FF',
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly innerRingMat = new THREE.MeshBasicMaterial({
    color: '#C9F4FF',
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly coreDiscMat = new THREE.MeshBasicMaterial({
    color: '#2B9EFF',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly moteMat = new THREE.MeshBasicMaterial({
    color: '#AEEFFF',
    transparent: true,
    opacity: 0.78,
  });

  private time = 0;

  constructor() {
    this.outerRingGeo.rotateX(-Math.PI / 2);
    this.innerRingGeo.rotateX(-Math.PI / 2);
    this.coreDiscGeo.rotateX(-Math.PI / 2);
    this.pulseRingGeo.rotateX(-Math.PI / 2);

    for (const sp of PLAYER_SPAWN_POINTS) {
      const root = new THREE.Group();
      root.position.set(sp.x, 0.018, sp.z);

      const outerRing = new THREE.Mesh(this.outerRingGeo, this.outerRingMat);
      const innerRing = new THREE.Mesh(this.innerRingGeo, this.innerRingMat);
      innerRing.position.y = 0.004;
      const coreDisc = new THREE.Mesh(this.coreDiscGeo, this.coreDiscMat);
      coreDisc.position.y = 0.002;
      root.add(coreDisc, outerRing, innerRing);

      const motes: THREE.Mesh[] = [];
      const moteAngles: number[] = [];
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const mote = new THREE.Mesh(this.moteGeo, this.moteMat);
        mote.position.set(Math.cos(angle) * 0.92, 0.14 + i * 0.06, Math.sin(angle) * 0.92);
        root.add(mote);
        motes.push(mote);
        moteAngles.push(angle);
      }

      this.group.add(root);
      this.pads.push({
        root,
        outerRing,
        innerRing,
        coreDisc,
        motes,
        moteAngles,
      });
    }
  }

  private acquirePulse(): ActiveSpawnPulse {
    const pooled = this.pulsePool.pop();
    if (pooled) return pooled;

    const root = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#7CE4FF',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.pulseRingGeo, ringMat);

    const colMat = new THREE.MeshBasicMaterial({
      color: '#63D6FF',
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const column = new THREE.Mesh(this.pulseColGeo, colMat);
    column.position.y = 1.6;
    root.add(ring, column);
    this.group.add(root);

    return {
      root,
      ring,
      ringMat,
      column,
      colMat,
      elapsed: 0,
      duration: 0.95,
    };
  }

  public triggerArrivalBurst(x: number, z: number): void {
    const p = this.acquirePulse();
    p.root.position.set(x, 0.025, z);
    p.ring.scale.setScalar(0.5);
    p.ringMat.opacity = 0.9;
    p.column.scale.set(1, 0.85, 1);
    p.colMat.opacity = 0.34;
    p.elapsed = 0;
    p.duration = 0.95;
    p.root.visible = true;
    this.pulses.push(p);
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;

    for (let i = 0; i < this.pads.length; i++) {
      const pad = this.pads[i];
      pad.outerRing.rotation.y = this.time * 0.45 + i;
      pad.innerRing.rotation.y = -this.time * 0.85 - i;
      const pulse = 1 + Math.sin(this.time * 2.6 + i * 1.3) * 0.045;
      pad.coreDisc.scale.setScalar(pulse);

      for (let m = 0; m < pad.motes.length; m++) {
        const ang = pad.moteAngles[m] + this.time * 1.15;
        const bob = ((this.time * 0.55 + m * 0.25 + i * 0.17) % 1);
        const mote = pad.motes[m];
        mote.position.set(
          Math.cos(ang) * (0.86 + Math.sin(this.time * 2 + m) * 0.08),
          0.08 + bob * 0.72,
          Math.sin(ang) * (0.86 + Math.sin(this.time * 2 + m) * 0.08),
        );
        mote.rotation.y = ang;
        mote.rotation.x = this.time * 2.2;
        const s = 0.55 + Math.sin(bob * Math.PI) * 0.65;
        mote.scale.setScalar(s);
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.elapsed += safeDt;
      const t = Math.min(1, p.elapsed / p.duration);
      const easeOut = 1 - Math.pow(1 - t, 3);

      p.ring.scale.setScalar(0.55 + easeOut * 2.15);
      p.ringMat.opacity = (1 - t) * 0.88;

      p.column.scale.set(1 - t * 0.45, 0.85 + t * 0.4, 1 - t * 0.45);
      p.colMat.opacity = (1 - t) * 0.34;

      if (p.elapsed >= p.duration) {
        this.pulses.splice(i, 1);
        p.root.visible = false;
        this.pulsePool.push(p);
      }
    }
  }

  public dispose(): void {
    while (this.pulses.length > 0) {
      const p = this.pulses.pop();
      if (p) {
        this.group.remove(p.root);
        p.ringMat.dispose();
        p.colMat.dispose();
      }
    }
    while (this.pulsePool.length > 0) {
      const p = this.pulsePool.pop();
      if (p) {
        this.group.remove(p.root);
        p.ringMat.dispose();
        p.colMat.dispose();
      }
    }
    this.outerRingGeo.dispose();
    this.innerRingGeo.dispose();
    this.coreDiscGeo.dispose();
    this.moteGeo.dispose();
    this.pulseRingGeo.dispose();
    this.pulseColGeo.dispose();
    this.outerRingMat.dispose();
    this.innerRingMat.dispose();
    this.coreDiscMat.dispose();
    this.moteMat.dispose();
  }
}
