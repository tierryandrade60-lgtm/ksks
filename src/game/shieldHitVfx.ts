import * as THREE from 'three';

export type ShieldKind =
  | 'auto-shield'
  | 'agatha-auto-shield'
  | 'diamond-form'
  | 'mystic-shield'
  | 'forcefield-shield'
  | 'shield-defense';

export const SHIELD_MAX_DURABILITY: Record<ShieldKind, number> = {
  'auto-shield': 100,
  'agatha-auto-shield': 100,
  'diamond-form': 150,
  'mystic-shield': 120,
  'forcefield-shield': 200,
  'shield-defense': 150,
};

export const SHIELD_COLORS: Record<
  ShieldKind,
  { main: string; rim: string; disc: string }
> = {
  'auto-shield': {
    main: '#FF2956',
    rim: '#FF98B0',
    disc: '#FF3662',
  },
  'agatha-auto-shield': {
    main: '#A855F7',
    rim: '#E9D5FF',
    disc: '#9333EA',
  },
  'diamond-form': {
    main: '#8FE8FF',
    rim: '#EFFBFF',
    disc: '#9EF0FF',
  },
  'mystic-shield': {
    main: '#FF9426',
    rim: '#FFE084',
    disc: '#FF9D2E',
  },
  'forcefield-shield': {
    main: '#38BDF8',
    rim: '#BAE6FD',
    disc: '#60A5FA',
  },
  'shield-defense': {
    main: '#3B82F6',
    rim: '#DBEAFE',
    disc: '#EF4444',
  },
};

const MAX_SHIELD_DISCS = 10;
const MAX_PROTECTED_TAGS = 8;

interface ExpandingDisc {
  active: boolean;
  group: THREE.Group;
  innerMat: THREE.MeshBasicMaterial;
  outerMat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
}

export interface ProtectedTagRecord {
  id: number;
  worldPos: THREE.Vector3;
  color: string;
  elapsed: number;
  duration: number;
}

/**
 * Renders subtle horizontal expanding energy discs around a shielded character
 * whenever a shield absorbs incoming damage, and tracks synchronized "Protected"
 * torso popup tags for projection onto the combat HUD overlay.
 */
export class ShieldHitVfxSystem {
  public readonly group = new THREE.Group();

  private readonly discPool: ExpandingDisc[] = [];
  public readonly protectedTags: ProtectedTagRecord[] = [];
  private readonly tagFreePool: ProtectedTagRecord[] = [];
  private nextTagId = 1;

  private readonly discFillGeo = new THREE.CircleGeometry(0.95, 28);
  private readonly discRingGeo = new THREE.RingGeometry(0.76, 1.0, 28);

  constructor() {
    this.discFillGeo.rotateX(-Math.PI / 2);
    this.discRingGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < MAX_SHIELD_DISCS; i++) {
      const discGroup = new THREE.Group();
      discGroup.visible = false;

      const innerMat = new THREE.MeshBasicMaterial({
        color: '#FF3662',
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outerMat = new THREE.MeshBasicMaterial({
        color: '#FF98B0',
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const fill = new THREE.Mesh(this.discFillGeo, innerMat);
      const ring = new THREE.Mesh(this.discRingGeo, outerMat);
      ring.position.y = 0.008;
      discGroup.add(fill, ring);
      this.group.add(discGroup);

      this.discPool.push({
        active: false,
        group: discGroup,
        innerMat,
        outerMat,
        elapsed: 0,
        duration: 0.44,
      });
    }

    for (let i = 0; i < MAX_PROTECTED_TAGS; i++) {
      this.tagFreePool.push({
        id: 0,
        worldPos: new THREE.Vector3(),
        color: '#FFFFFF',
        elapsed: 0,
        duration: 0.65,
      });
    }
  }

  public triggerAbsorb(
    characterBasePos: THREE.Vector3,
    kind: ShieldKind,
  ): void {
    const palette = SHIELD_COLORS[kind];
    const torsoY = characterBasePos.y + 1.08;

    // 1. Expanding horizontal energy disc (reuse inactive or oldest active)
    let disc: ExpandingDisc | null = null;
    let oldestDisc = this.discPool[0];
    for (let i = 0; i < this.discPool.length; i++) {
      const d = this.discPool[i];
      if (!d.active) {
        disc = d;
        break;
      }
      if (d.elapsed > oldestDisc.elapsed) {
        oldestDisc = d;
      }
    }
    if (!disc) disc = oldestDisc;

    disc.active = true;
    disc.elapsed = 0;
    disc.duration = 0.44;
    disc.group.position.set(characterBasePos.x, torsoY, characterBasePos.z);
    disc.group.scale.setScalar(0.24);
    disc.innerMat.color.set(palette.disc);
    disc.innerMat.opacity = 0.34;
    disc.outerMat.color.set(palette.rim);
    disc.outerMat.opacity = 0.92;
    disc.group.visible = true;

    // 2. Synchronized "Protected" torso tag
    let tag: ProtectedTagRecord | undefined;
    if (this.protectedTags.length >= MAX_PROTECTED_TAGS) {
      tag = this.protectedTags.shift();
    } else {
      tag = this.tagFreePool.pop();
    }
    if (!tag) {
      tag = {
        id: 0,
        worldPos: new THREE.Vector3(),
        color: palette.rim,
        elapsed: 0,
        duration: 0.65,
      };
    }
    tag.id = this.nextTagId++;
    tag.worldPos.set(characterBasePos.x, torsoY + 0.08, characterBasePos.z);
    tag.color = palette.rim;
    tag.elapsed = 0;
    tag.duration = 0.65;
    this.protectedTags.push(tag);
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);

    for (let i = 0; i < this.discPool.length; i++) {
      const d = this.discPool[i];
      if (!d.active) continue;

      d.elapsed += safeDt;
      const t = Math.min(1, d.elapsed / d.duration);
      const easeOut = 1 - Math.pow(1 - t, 3);

      const scale = 0.24 + easeOut * 1.95;
      d.group.scale.setScalar(scale);

      const fade = t < 0.25 ? 1 : Math.max(0, 1 - (t - 0.25) / 0.75);
      d.innerMat.opacity = 0.32 * fade;
      d.outerMat.opacity = 0.92 * fade;

      if (d.elapsed >= d.duration) {
        d.active = false;
        d.group.visible = false;
      }
    }

    for (let i = this.protectedTags.length - 1; i >= 0; i--) {
      const tag = this.protectedTags[i];
      tag.elapsed += safeDt;
      tag.worldPos.y += safeDt * 0.45;
      if (tag.elapsed >= tag.duration) {
        this.protectedTags.splice(i, 1);
        this.tagFreePool.push(tag);
      }
    }
  }

  public dispose(): void {
    for (const d of this.discPool) {
      d.active = false;
      d.group.visible = false;
      d.innerMat.dispose();
      d.outerMat.dispose();
    }
    this.discPool.length = 0;
    this.protectedTags.length = 0;
    this.tagFreePool.length = 0;
    this.discFillGeo.dispose();
    this.discRingGeo.dispose();
  }
}
