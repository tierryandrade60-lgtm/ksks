import * as THREE from 'three';

export interface VibraniumShieldRig {
  group: THREE.Group;
  dispose: () => void;
}

interface SharedShieldAssets {
  redMat: THREE.MeshStandardMaterial;
  silverMat: THREE.MeshStandardMaterial;
  blueMat: THREE.MeshStandardMaterial;
  starMat: THREE.MeshStandardMaterial;
  backSteelMat: THREE.MeshStandardMaterial;
  strapMat: THREE.MeshStandardMaterial;
  baseRimGeo: THREE.CylinderGeometry;
  outerRedRingGeo: THREE.RingGeometry;
  silverRingGeo: THREE.RingGeometry;
  innerRedRingGeo: THREE.RingGeometry;
  blueCenterGeo: THREE.CircleGeometry;
  starGeo: THREE.ExtrudeGeometry;
  handleBarGeo: THREE.BoxGeometry;
  strapGeo: THREE.BoxGeometry;
}

let sharedShieldAssets: SharedShieldAssets | null = null;
const NOOP_DISPOSE = () => {};

function buildStarShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = Math.PI * 0.5 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function getSharedShieldAssets(): SharedShieldAssets {
  if (sharedShieldAssets) return sharedShieldAssets;

  const starGeo = new THREE.ExtrudeGeometry(buildStarShape(0.118, 0.048), {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  starGeo.center();

  sharedShieldAssets = {
    redMat: new THREE.MeshStandardMaterial({
      color: '#C91D2A',
      roughness: 0.24,
      metalness: 0.62,
      side: THREE.DoubleSide,
    }),
    silverMat: new THREE.MeshStandardMaterial({
      color: '#DCE4EE',
      roughness: 0.18,
      metalness: 0.88,
      side: THREE.DoubleSide,
    }),
    blueMat: new THREE.MeshStandardMaterial({
      color: '#183E80',
      roughness: 0.26,
      metalness: 0.58,
      side: THREE.DoubleSide,
    }),
    starMat: new THREE.MeshStandardMaterial({
      color: '#F2F6FC',
      roughness: 0.18,
      metalness: 0.85,
    }),
    backSteelMat: new THREE.MeshStandardMaterial({
      color: '#8894A4',
      roughness: 0.34,
      metalness: 0.78,
    }),
    strapMat: new THREE.MeshStandardMaterial({
      color: '#4E2C1B',
      roughness: 0.84,
      metalness: 0.08,
    }),
    baseRimGeo: new THREE.CylinderGeometry(0.365, 0.352, 0.036, 32),
    outerRedRingGeo: new THREE.RingGeometry(0.292, 0.362, 32),
    silverRingGeo: new THREE.RingGeometry(0.224, 0.292, 32),
    innerRedRingGeo: new THREE.RingGeometry(0.156, 0.224, 32),
    blueCenterGeo: new THREE.CircleGeometry(0.156, 28),
    starGeo,
    handleBarGeo: new THREE.BoxGeometry(0.16, 0.022, 0.024),
    strapGeo: new THREE.BoxGeometry(0.038, 0.16, 0.036),
  };
  return sharedShieldAssets;
}

/**
 * Builds Captain America's composite Vibranium Shield (`THREE.Group`) centered at origin,
 * with the front concentric red/silver/red/blue + 5-point star emblem facing +Z,
 * and leather forearm straps on the -Z face.
 */
export function buildVibraniumShieldGroup(scale = 1): VibraniumShieldRig {
  const a = getSharedShieldAssets();
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Main brushed steel backing disc (slightly beveled silhouette)
  const backingDisc = new THREE.Mesh(a.baseRimGeo, a.backSteelMat);
  backingDisc.rotation.x = Math.PI * 0.5;
  backingDisc.castShadow = true;
  backingDisc.receiveShadow = true;
  group.add(backingDisc);

  // Front concentric Vibranium rings facing +Z (offset cleanly to avoid Z-fighting)
  const outerRed = new THREE.Mesh(a.outerRedRingGeo, a.redMat);
  outerRed.position.z = 0.02;
  group.add(outerRed);

  const silverRing = new THREE.Mesh(a.silverRingGeo, a.silverMat);
  silverRing.position.z = 0.0215;
  group.add(silverRing);

  const innerRed = new THREE.Mesh(a.innerRedRingGeo, a.redMat);
  innerRed.position.z = 0.023;
  group.add(innerRed);

  const blueCenter = new THREE.Mesh(a.blueCenterGeo, a.blueMat);
  blueCenter.position.z = 0.0245;
  group.add(blueCenter);

  // Raised 3D 5-point Vibranium star on center medallion
  const star = new THREE.Mesh(a.starGeo, a.starMat);
  star.position.z = 0.031;
  star.castShadow = true;
  group.add(star);

  // Dorsal leather forearm straps on -Z back side
  for (const sx of [-0.095, 0.095]) {
    const strap = new THREE.Mesh(a.strapGeo, a.strapMat);
    strap.position.set(sx, 0, -0.028);
    group.add(strap);
  }
  const gripBar = new THREE.Mesh(a.handleBarGeo, a.strapMat);
  gripBar.position.set(0, -0.08, -0.034);
  group.add(gripBar);

  return {
    group,
    dispose: NOOP_DISPOSE,
  };
}
