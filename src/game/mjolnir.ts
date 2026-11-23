import * as THREE from 'three';

export interface MjolnirRig {
  group: THREE.Group;
  dispose: () => void;
}

interface SharedMjolnirAssets {
  uruMat: THREE.MeshStandardMaterial;
  uruBevelMat: THREE.MeshStandardMaterial;
  etchMat: THREE.MeshStandardMaterial;
  runeMat: THREE.MeshStandardMaterial;
  leatherMat: THREE.MeshStandardMaterial;
  pommelMat: THREE.MeshStandardMaterial;
  headCoreGeo: THREE.BoxGeometry;
  headCapGeo: THREE.BoxGeometry;
  etchBandGeo: THREE.BoxGeometry;
  runeStripGeo: THREE.BoxGeometry;
  collarGeo: THREE.CylinderGeometry;
  handleGeo: THREE.CylinderGeometry;
  gripRibGeo: THREE.TorusGeometry;
  pommelGeo: THREE.CylinderGeometry;
  strapGeo: THREE.TorusGeometry;
}

let sharedMjolnirAssets: SharedMjolnirAssets | null = null;
const NOOP_DISPOSE = () => {};

function getSharedMjolnirAssets(): SharedMjolnirAssets {
  if (sharedMjolnirAssets) return sharedMjolnirAssets;

  sharedMjolnirAssets = {
    uruMat: new THREE.MeshStandardMaterial({
      color: '#B4BECA',
      roughness: 0.24,
      metalness: 0.88,
    }),
    uruBevelMat: new THREE.MeshStandardMaterial({
      color: '#8D98A6',
      roughness: 0.3,
      metalness: 0.84,
    }),
    etchMat: new THREE.MeshStandardMaterial({
      color: '#46505E',
      roughness: 0.42,
      metalness: 0.72,
    }),
    runeMat: new THREE.MeshStandardMaterial({
      color: '#7CE4FF',
      emissive: '#34BFFF',
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.3,
    }),
    leatherMat: new THREE.MeshStandardMaterial({
      color: '#5A341E',
      roughness: 0.84,
      metalness: 0.08,
    }),
    pommelMat: new THREE.MeshStandardMaterial({
      color: '#A5B0BD',
      roughness: 0.28,
      metalness: 0.86,
    }),
    headCoreGeo: new THREE.BoxGeometry(0.24, 0.22, 0.42),
    headCapGeo: new THREE.BoxGeometry(0.2, 0.18, 0.47),
    etchBandGeo: new THREE.BoxGeometry(0.252, 0.026, 0.32),
    runeStripGeo: new THREE.BoxGeometry(0.256, 0.016, 0.14),
    collarGeo: new THREE.CylinderGeometry(0.052, 0.044, 0.055, 10),
    handleGeo: new THREE.CylinderGeometry(0.032, 0.035, 0.44, 10),
    gripRibGeo: new THREE.TorusGeometry(0.036, 0.008, 6, 12),
    pommelGeo: new THREE.CylinderGeometry(0.046, 0.04, 0.055, 10),
    strapGeo: new THREE.TorusGeometry(0.056, 0.009, 6, 14),
  };

  return sharedMjolnirAssets;
}

/**
 * Builds Thor's composite Uru hammer Mjolnir (`THREE.Group`), pivoted at the hand grip
 * with the leather handle along Y and hammer head at +Y (aligned forward along Z).
 */
export function buildMjolnirGroup(scale = 1): MjolnirRig {
  const a = getSharedMjolnirAssets();
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // 1. Brown leather-wrapped shaft + ribbed grip rings
  const handle = new THREE.Mesh(a.handleGeo, a.leatherMat);
  handle.position.set(0, 0.08, 0);
  handle.castShadow = true;
  handle.receiveShadow = true;
  group.add(handle);

  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(a.gripRibGeo, a.leatherMat);
    rib.rotation.x = Math.PI * 0.5;
    rib.position.set(0, -0.05 + i * 0.068, 0);
    group.add(rib);
  }

  // 2. Metallic Uru collar & pommel + leather wrist strap loop
  const collar = new THREE.Mesh(a.collarGeo, a.pommelMat);
  collar.position.set(0, 0.25, 0);
  collar.castShadow = true;
  group.add(collar);

  const pommel = new THREE.Mesh(a.pommelGeo, a.pommelMat);
  pommel.position.set(0, -0.15, 0);
  pommel.castShadow = true;
  group.add(pommel);

  const strap = new THREE.Mesh(a.strapGeo, a.leatherMat);
  strap.position.set(0, -0.215, 0);
  strap.rotation.y = Math.PI * 0.5;
  group.add(strap);

  // 3. Chamfered multi-part Uru hammer head at top (+Y), striking faces along +-Z
  const headCore = new THREE.Mesh(a.headCoreGeo, a.uruMat);
  headCore.position.set(0, 0.38, 0);
  headCore.castShadow = true;
  headCore.receiveShadow = true;
  group.add(headCore);

  const headCaps = new THREE.Mesh(a.headCapGeo, a.uruBevelMat);
  headCaps.position.set(0, 0.38, 0);
  headCaps.castShadow = true;
  headCaps.receiveShadow = true;
  group.add(headCaps);

  // Etched Nordic trim bands + subtle glowing storm rune accent
  for (const sy of [-0.075, 0.075]) {
    const etchBand = new THREE.Mesh(a.etchBandGeo, a.etchMat);
    etchBand.position.set(0, 0.38 + sy, 0);
    group.add(etchBand);
  }
  const runeAccent = new THREE.Mesh(a.runeStripGeo, a.runeMat);
  runeAccent.position.set(0, 0.38, 0);
  group.add(runeAccent);

  return {
    group,
    dispose: NOOP_DISPOSE,
  };
}
