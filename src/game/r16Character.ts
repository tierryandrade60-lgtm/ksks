import * as THREE from 'three';
import { CharacterAppearance } from './characterConfig';
import { buildNecroswordGroup, NecroswordRig } from './necrosword';
import { buildVibraniumShieldGroup, VibraniumShieldRig } from './vibraniumShield';
import { buildMjolnirGroup, MjolnirRig } from './mjolnir';
import { createCharacterPixelTextures } from './pixelTextures';

export interface R16Rig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  pelvis: THREE.Group;
  waist: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;

  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Group;
  leftHand: THREE.Group;

  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Group;
  rightHand: THREE.Group;

  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftFoot: THREE.Group;

  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightFoot: THREE.Group;

  capePivot: THREE.Group | null;
  capeLowerPivot: THREE.Group | null;
  hairBackPivot: THREE.Group | null;
  zombieHairGroup: THREE.Group | null;
  sashPivot: THREE.Group | null;
  mindStone: THREE.Mesh | null;
  surferBoard: THREE.Group | null;

  setOpacity: (alpha: number) => void;
  setHitFlash: (amount: number) => void;
  setDiamondForm: (blend: number) => void;
  setAstralProjection: (active: boolean) => void;
  setIntangible: (active: boolean, blend?: number) => void;
  setHelaCrownMode: (enabled: boolean) => void;
  setHelaCrownProgress: (blend: number) => void;
  setHelaHandSword: (visible: boolean) => void;
  setHelaHandSwords: (leftVisible: boolean, rightVisible: boolean) => void;
  setCapShieldVisible: (visible: boolean) => void;
  setThorHammerVisible: (visible: boolean) => void;
  setSurferBoardProgress: (progress: number, bankRoll?: number, pitchX?: number) => void;
  setNpcWeapon: (kind: 'none' | 'pistol') => void;
  setNpcMuzzleFlash: (intensity: number) => void;
  getNpcMuzzleWorldPos: (out: THREE.Vector3) => boolean;
  setWhiteOutline: (active: boolean) => void;
  setInvisibilityCloak: (
    active: boolean,
    cutLocalY: number,
    baseWorldY: number,
    ghostAlpha?: number,
  ) => void;
  dispose: () => void;
}

interface MaterialSnapshot {
  mat: THREE.MeshStandardMaterial;
  map: THREE.Texture | null;
  colorHex: number;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  emissiveHex: number;
  emissiveIntensity: number;
}

function makeMat(
  map: THREE.Texture,
  roughness = 0.82,
  metalness = 0.02,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    roughness,
    metalness,
  });
}

function makeColorMat(
  color: string,
  roughness = 0.82,
  metalness = 0.02,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

const sharedBoxGeos = new Map<string, THREE.BoxGeometry>();
const sharedConeGeos = new Map<string, THREE.ConeGeometry>();
const sharedCylinderGeos = new Map<string, THREE.CylinderGeometry>();
const sharedOctahedronGeos = new Map<string, THREE.OctahedronGeometry>();
const sharedDodecahedronGeos = new Map<string, THREE.DodecahedronGeometry>();
const sharedSphereGeos = new Map<string, THREE.SphereGeometry>();

function boxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w}|${h}|${d}`;
  let geo = sharedBoxGeos.get(key);
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    sharedBoxGeos.set(key, geo);
  }
  return geo;
}

function coneGeo(r: number, h: number, segs: number): THREE.ConeGeometry {
  const key = `${r}|${h}|${segs}`;
  let geo = sharedConeGeos.get(key);
  if (!geo) {
    geo = new THREE.ConeGeometry(r, h, segs);
    sharedConeGeos.set(key, geo);
  }
  return geo;
}

function cylinderGeo(
  rt: number,
  rb: number,
  h: number,
  segs: number,
): THREE.CylinderGeometry {
  const key = `${rt}|${rb}|${h}|${segs}`;
  let geo = sharedCylinderGeos.get(key);
  if (!geo) {
    geo = new THREE.CylinderGeometry(rt, rb, h, segs);
    sharedCylinderGeos.set(key, geo);
  }
  return geo;
}

function octahedronGeo(r: number, detail = 0): THREE.OctahedronGeometry {
  const key = `${r}|${detail}`;
  let geo = sharedOctahedronGeos.get(key);
  if (!geo) {
    geo = new THREE.OctahedronGeometry(r, detail);
    sharedOctahedronGeos.set(key, geo);
  }
  return geo;
}

function dodecahedronGeo(r: number, detail = 0): THREE.DodecahedronGeometry {
  const key = `${r}|${detail}`;
  let geo = sharedDodecahedronGeos.get(key);
  if (!geo) {
    geo = new THREE.DodecahedronGeometry(r, detail);
    sharedDodecahedronGeos.set(key, geo);
  }
  return geo;
}

function sphereGeo(r: number, ws: number, hs: number): THREE.SphereGeometry {
  const key = `${r}|${ws}|${hs}`;
  let geo = sharedSphereGeos.get(key);
  if (!geo) {
    geo = new THREE.SphereGeometry(r, ws, hs);
    sharedSphereGeos.set(key, geo);
  }
  return geo;
}

export function createR16Character(appearance: CharacterAppearance): R16Rig {
  const tex = createCharacterPixelTextures(appearance);
  const materials: THREE.MeshStandardMaterial[] = [];
  const shadowMeshes: THREE.Mesh[] = [];
  const invisUniforms = {
    uInvisActive: { value: 0 },
    uInvisCutY: { value: 2.3 },
    uInvisBaseY: { value: 0 },
    uInvisAlpha: { value: 0.34 },
  };

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => g;
  const trackMat = <T extends THREE.MeshStandardMaterial>(m: T): T => {
    m.envMapIntensity = m.metalness > 0.45 ? 1.15 : 0.82;
    m.customProgramCacheKey = () => 'r16-cartoon-v2';
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uInvisActive = invisUniforms.uInvisActive;
      shader.uniforms.uInvisCutY = invisUniforms.uInvisCutY;
      shader.uniforms.uInvisBaseY = invisUniforms.uInvisBaseY;
      shader.uniforms.uInvisAlpha = invisUniforms.uInvisAlpha;
      shader.vertexShader =
        'varying float vInvisWorldY;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vInvisWorldY = (modelMatrix * vec4(transformed, 1.0)).y;`,
        );
      shader.fragmentShader =
        'uniform float uInvisActive;\nuniform float uInvisCutY;\nuniform float uInvisBaseY;\nuniform float uInvisAlpha;\nvarying float vInvisWorldY;\n' +
        shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            if (uInvisActive > 0.5) {
              float localY = vInvisWorldY - uInvisBaseY;
              float cloakMask = smoothstep(uInvisCutY - 0.11, uInvisCutY + 0.11, localY);
              float seam = exp(-pow((localY - uInvisCutY) / 0.065, 2.0));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.46, 0.87, 1.0), cloakMask * 0.72) + vec3(0.42, 0.92, 1.0) * seam * 1.1;
              diffuseColor.a *= mix(1.0, uInvisAlpha, cloakMask);
            }`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            if (uInvisActive > 0.5) {
              float localYEm = vInvisWorldY - uInvisBaseY;
              float cloakMaskEm = smoothstep(uInvisCutY - 0.11, uInvisCutY + 0.11, localYEm);
              float seamEm = exp(-pow((localYEm - uInvisCutY) / 0.065, 2.0));
              totalEmissiveRadiance += vec3(0.16, 0.58, 0.96) * cloakMaskEm * 0.6 + vec3(0.42, 0.92, 1.0) * seamEm * 1.15;
            }`,
          )
          .replace(
            '#include <opaque_fragment>',
            `vec3 rimViewDir = normalize(vViewPosition);
            vec3 rimNormal = normalize(normal);
            float rimFresnel = pow(1.0 - clamp(dot(rimNormal, rimViewDir), 0.0, 1.0), 3.0);
            float upperHemisphere = smoothstep(-0.35, 0.85, rimNormal.y);
            vec3 rimTint = mix(vec3(0.42, 0.72, 1.0), vec3(0.88, 0.95, 1.0), upperHemisphere);
            float invisRimFade = uInvisActive > 0.5 ? 0.35 : 1.0;
            outgoingLight += rimTint * rimFresnel * 0.21 * diffuseColor.a * invisRimFade;
            #include <opaque_fragment>`,
          );
    };
    materials.push(m);
    return m;
  };

  const outlineSources: Array<{ mesh: THREE.Mesh; geo: THREE.BufferGeometry }> = [];
  const makeShadowMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    includeInOutline = false,
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    shadowMeshes.push(mesh);
    if (includeInOutline) {
      outlineSources.push({ mesh, geo });
    }
    return mesh;
  };

  const isScarletWitch = appearance.archetype === 'scarlet-witch';
  const isPhoenixForce = appearance.archetype === 'phoenix-force';
  const isEmmaFrost = appearance.archetype === 'emma-frost';
  const isHela = appearance.archetype === 'hela';
  const isMagneto = appearance.archetype === 'magneto';
  const isQuicksilver = appearance.archetype === 'quicksilver';
  const isStrange = appearance.archetype === 'doctor-strange';
  const isVision = appearance.archetype === 'vision';
  const isAgatha = appearance.archetype === 'agatha-harkness';
  const isInvisibleWoman = appearance.archetype === 'invisible-woman';
  const isVampire = appearance.archetype === 'vampire';
  const isCaptainAmerica = appearance.archetype === 'captain-america';
  const isThor = appearance.archetype === 'thor';
  const isSilverSurfer = appearance.archetype === 'silver-surfer';
  const isStorm = appearance.archetype === 'storm';
  const isRobot = appearance.archetype === 'npc-robot';
  const isHeroine =
    isScarletWitch ||
    isPhoenixForce ||
    isEmmaFrost ||
    isHela ||
    isAgatha ||
    isInvisibleWoman ||
    isVampire ||
    isStorm;

  const skinId = appearance.skinId;
  const isSupremeSorceress = skinId === 'supreme-sorceress';
  const isWandaZombie = skinId === 'wanda-zombie';
  const isWhiteHela = skinId === 'white-hela';
  const isWhiteQueen = skinId === 'white-queen';
  const isWhitePhoenix = skinId === 'white-phoenix';
  const isAncientOne = skinId === 'ancient-one';

  const bodyRough = isSilverSurfer ? 0.18 : 0.84;
  const bodyMetal = isSilverSurfer ? 0.88 : 0.02;

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // 1. Pelvis (LowerTorso)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.88, 0);
  bodyPivot.add(pelvis);

  const pelvisMat = trackMat(makeMat(tex.waistBand, isSilverSurfer ? bodyRough : 0.86, bodyMetal));
  const pelvisMesh = makeShadowMesh(
    trackGeo(boxGeo(0.5, 0.16, 0.28)),
    pelvisMat,
    true,
  );
  pelvisMesh.position.set(0, 0.06, 0);
  pelvis.add(pelvisMesh);

  if (isAncientOne) {
    // Wide black multi-ribbed waist corset/belt + flowing saffron outer robe skirt panels
    const corsetMat = trackMat(makeColorMat('#181A22', 0.58, 0.14));
    const corsetRibMat = trackMat(makeColorMat('#2B2F3D', 0.48, 0.2));
    const robeMat = trackMat(makeColorMat('#CE9228', 0.8, 0.04));
    const robeBackMat = trackMat(makeColorMat('#A9741A', 0.84, 0.03));

    const corset = makeShadowMesh(
      trackGeo(boxGeo(0.53, 0.16, 0.31)),
      corsetMat,
    );
    corset.position.set(0, 0.125, 0);
    pelvis.add(corset);

    const corsetSeam = makeShadowMesh(
      trackGeo(boxGeo(0.54, 0.025, 0.318)),
      corsetRibMat,
    );
    corsetSeam.position.set(0, 0.125, 0);
    pelvis.add(corsetSeam);

    for (const side of [-1, 1] as const) {
      const sideRobe = makeShadowMesh(
        trackGeo(boxGeo(0.065, 0.48, 0.3)),
        robeMat,
      );
      sideRobe.position.set(side * 0.255, -0.18, 0.01);
      sideRobe.rotation.z = side * -0.09;
      pelvis.add(sideRobe);
    }

    const backRobe = makeShadowMesh(
      trackGeo(boxGeo(0.46, 0.52, 0.05)),
      robeBackMat,
    );
    backRobe.position.set(0, -0.2, 0.14);
    backRobe.rotation.x = 0.08;
    pelvis.add(backRobe);
  }

  if (isAgatha) {
    // Flowing deep teal pleated lower gown skirt panels + front purple shawl tails
    const gownMat = trackMat(makeColorMat('#133C4A', 0.84, 0.04));
    const gownDarkMat = trackMat(makeColorMat('#0D2933', 0.88, 0.03));
    const shawlTailMat = trackMat(makeColorMat('#2E1F54', 0.82, 0.04));

    for (const side of [-1, 1] as const) {
      const sideSkirt = makeShadowMesh(
        trackGeo(boxGeo(0.08, 0.62, 0.34)),
        gownMat,
      );
      sideSkirt.position.set(side * 0.27, -0.24, 0.01);
      sideSkirt.rotation.z = side * -0.11;
      pelvis.add(sideSkirt);

      const shawlEnd = makeShadowMesh(
        trackGeo(boxGeo(0.11, 0.54, 0.04)),
        shawlTailMat,
      );
      shawlEnd.position.set(side * 0.19, -0.2, -0.155);
      shawlEnd.rotation.z = side * -0.05;
      shawlEnd.rotation.x = -0.06;
      pelvis.add(shawlEnd);
    }

    const frontPleat = makeShadowMesh(
      trackGeo(boxGeo(0.44, 0.58, 0.05)),
      gownDarkMat,
    );
    frontPleat.position.set(0, -0.24, -0.14);
    frontPleat.rotation.x = -0.06;
    pelvis.add(frontPleat);

    const backPleat = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.62, 0.06)),
      gownDarkMat,
    );
    backPleat.position.set(0, -0.25, 0.15);
    backPleat.rotation.x = 0.08;
    pelvis.add(backPleat);
  }

  if (isWandaZombie) {
    // Tattered long crimson coat lower flaps around thighs/knees
    const zCoatMat = trackMat(makeColorMat('#8E1520', 0.8, 0.04));
    const zCoatDarkMat = trackMat(makeColorMat('#590B12', 0.86, 0.03));
    for (const side of [-1, 1] as const) {
      const coatSide = makeShadowMesh(
        trackGeo(boxGeo(0.065, 0.58, 0.3)),
        zCoatMat,
      );
      coatSide.position.set(side * 0.27, -0.22, 0.02);
      coatSide.rotation.z = side * -0.14;
      pelvis.add(coatSide);
    }
    const coatBack = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.62, 0.05)),
      zCoatDarkMat,
    );
    coatBack.position.set(0, -0.24, 0.15);
    coatBack.rotation.x = 0.12;
    pelvis.add(coatBack);
  }

  if (isSupremeSorceress) {
    // Iconic flared crimson hip-fin belt wings attached to pelvis
    const hipWingMat = trackMat(makeColorMat('#C81E2B', 0.45, 0.16));
    const hipWingEdgeMat = trackMat(makeColorMat('#E8B938', 0.38, 0.42));
    for (const side of [-1, 1] as const) {
      const wing = makeShadowMesh(
        trackGeo(coneGeo(0.085, 0.34, 4)),
        hipWingMat,
      );
      wing.position.set(side * 0.31, 0.16, 0.02);
      wing.rotation.z = side * -0.52;
      wing.rotation.x = 0.08;
      wing.scale.set(0.95, 1.0, 0.32);
      pelvis.add(wing);

      const trim = makeShadowMesh(
        trackGeo(boxGeo(0.08, 0.03, 0.12)),
        hipWingEdgeMat,
      );
      trim.position.set(side * 0.25, 0.08, 0);
      trim.rotation.z = side * -0.2;
      pelvis.add(trim);
    }
  }

  // Phoenix Force / Dark Phoenix iconic 3D diagonal waist sash + draping hip ribbon tails
  let sashPivot: THREE.Group | null = null;
  if (isPhoenixForce) {
    const sashMainMat = trackMat(
      makeColorMat(appearance.sashColor ?? appearance.topSecondary, 0.56, 0.18),
    );
    const sashTrimMat = trackMat(
      makeColorMat(appearance.shoeAccent ?? '#FFE680', 0.52, 0.22),
    );

    const sashWrap = makeShadowMesh(
      trackGeo(boxGeo(0.54, 0.075, 0.305)),
      sashMainMat,
    );
    sashWrap.position.set(0, 0.11, 0);
    sashWrap.rotation.z = -0.18;
    pelvis.add(sashWrap);

    sashPivot = new THREE.Group();
    sashPivot.position.set(-0.275, 0.09, 0.01);
    pelvis.add(sashPivot);

    const sashTailA = makeShadowMesh(
      trackGeo(boxGeo(0.055, 0.52, 0.14)),
      sashMainMat,
    );
    sashTailA.position.set(-0.025, -0.25, 0.01);
    sashTailA.rotation.z = -0.14;
    sashTailA.rotation.x = 0.06;
    sashPivot.add(sashTailA);

    const sashTailB = makeShadowMesh(
      trackGeo(boxGeo(0.045, 0.38, 0.1)),
      sashTrimMat,
    );
    sashTailB.position.set(-0.045, -0.19, -0.05);
    sashTailB.rotation.z = -0.22;
    sashTailB.rotation.x = -0.08;
    sashPivot.add(sashTailB);
  }

  // 2. Waist (MidTorso connector)
  const waist = new THREE.Group();
  waist.position.set(0, 0.12, 0);
  pelvis.add(waist);

  const waistMat = isEmmaFrost
    ? trackMat(makeMat(tex.skinPlain, 0.78))
    : trackMat(makeColorMat(appearance.topPrimary, isSilverSurfer ? bodyRough : 0.84, bodyMetal));
  const waistMesh = makeShadowMesh(
    trackGeo(boxGeo(isHeroine ? 0.44 : 0.49, 0.1, 0.25)),
    waistMat,
    true,
  );
  waistMesh.position.set(0, 0.04, 0);
  waist.add(waistMesh);

  // 3. Chest (UpperTorso)
  const chest = new THREE.Group();
  chest.position.set(0, 0.07, 0);
  waist.add(chest);

  const chestMaterials = [
    trackMat(makeMat(tex.chestSide, bodyRough, bodyMetal)),
    trackMat(makeMat(tex.chestSide, bodyRough, bodyMetal)),
    trackMat(makeMat(tex.chestTop, bodyRough, bodyMetal)),
    trackMat(
      isEmmaFrost
        ? makeMat(tex.skinPlain, 0.78)
        : makeColorMat(appearance.topPrimary, isSilverSurfer ? bodyRough : 0.86, bodyMetal),
    ),
    trackMat(makeMat(tex.chestBack, bodyRough, bodyMetal)),
    trackMat(makeMat(tex.chestFront, bodyRough, bodyMetal)),
  ];
  const chestMesh = makeShadowMesh(
    trackGeo(boxGeo(isHeroine ? 0.52 : 0.56, 0.4, 0.29)),
    chestMaterials,
    true,
  );
  chestMesh.position.set(0, 0.2, 0);
  chest.add(chestMesh);

  if (isPhoenixForce) {
    const collarMat = trackMat(makeColorMat(appearance.topAccent, 0.72, 0.08));
    const collarMesh = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.085, 0.23)),
      collarMat,
    );
    collarMesh.position.set(0, 0.41, 0);
    chest.add(collarMesh);

    if (isWhitePhoenix) {
      // Gold shoulder epaulettes framing White Phoenix's shoulders
      const epauletteMat = trackMat(makeColorMat('#F2C12E', 0.34, 0.55));
      for (const side of [-1, 1] as const) {
        const ep = makeShadowMesh(
          trackGeo(boxGeo(0.16, 0.048, 0.26)),
          epauletteMat,
        );
        ep.position.set(side * 0.23, 0.405, 0);
        ep.rotation.z = side * -0.14;
        chest.add(ep);
      }
    }
  }

  if (isInvisibleWoman) {
    const iwCollarMat = trackMat(makeColorMat('#131A29', 0.68, 0.1));
    const iwCollarMesh = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.085, 0.23)),
      iwCollarMat,
    );
    iwCollarMesh.position.set(0, 0.41, 0);
    chest.add(iwCollarMesh);

    const iwCollarTrim = makeShadowMesh(
      trackGeo(boxGeo(0.15, 0.048, 0.036)),
      trackMat(makeColorMat('#1D7CE8', 0.58, 0.12)),
    );
    iwCollarTrim.position.set(0, 0.398, -0.118);
    chest.add(iwCollarTrim);
  }

  if (isVampire) {
    // Cropped brown leather jacket collar lapels, shoulder pads & golden buckle belt
    const jacketMat = trackMat(makeColorMat('#5C331E', 0.68, 0.08));
    const jacketDarkMat = trackMat(makeColorMat('#3D2012', 0.74, 0.06));
    const goldMat = trackMat(makeColorMat('#F4C430', 0.34, 0.58));

    const neckTrim = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.06, 0.22)),
      goldMat,
    );
    neckTrim.position.set(0, 0.405, 0);
    chest.add(neckTrim);

    for (const side of [-1, 1] as const) {
      const shoulderPad = makeShadowMesh(
        trackGeo(boxGeo(0.145, 0.06, 0.32)),
        jacketMat,
      );
      shoulderPad.position.set(side * 0.215, 0.395, 0.01);
      shoulderPad.rotation.z = side * -0.08;
      chest.add(shoulderPad);

      const frontLapel = makeShadowMesh(
        trackGeo(boxGeo(0.085, 0.26, 0.032)),
        jacketDarkMat,
      );
      frontLapel.position.set(side * 0.16, 0.26, -0.148);
      frontLapel.rotation.z = side * -0.1;
      chest.add(frontLapel);
    }

    const backJacketHem = makeShadowMesh(
      trackGeo(boxGeo(0.54, 0.045, 0.038)),
      jacketDarkMat,
    );
    backJacketHem.position.set(0, 0.15, 0.145);
    chest.add(backJacketHem);

    const beltStrap = makeShadowMesh(
      trackGeo(boxGeo(0.525, 0.055, 0.305)),
      jacketDarkMat,
    );
    beltStrap.position.set(0, 0.125, 0);
    pelvis.add(beltStrap);

    const buckle = makeShadowMesh(
      trackGeo(boxGeo(0.11, 0.07, 0.03)),
      goldMat,
    );
    buckle.position.set(0, 0.125, -0.155);
    pelvis.add(buckle);
  }

  if (isCaptainAmerica) {
    // 3D silver shoulder trim straps, raised 5-point chest star medallion, & 3D tactical utility belt pouches
    const silverTrimMat = trackMat(makeColorMat('#DCE4EE', 0.24, 0.78));
    const beltMat = trackMat(makeColorMat('#192338', 0.78, 0.12));
    const pouchMat = trackMat(makeColorMat('#23304A', 0.74, 0.1));

    for (const side of [-1, 1] as const) {
      const shoulderStrap = makeShadowMesh(
        trackGeo(boxGeo(0.13, 0.034, 0.305)),
        silverTrimMat,
      );
      shoulderStrap.position.set(side * 0.21, 0.398, 0);
      chest.add(shoulderStrap);
    }

    const collarRim = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.055, 0.23)),
      trackMat(makeColorMat('#152E5C', 0.72, 0.12)),
    );
    collarRim.position.set(0, 0.415, 0);
    chest.add(collarRim);

    const chestStarBadge = makeShadowMesh(
      trackGeo(octahedronGeo(0.054, 0)),
      silverTrimMat,
    );
    chestStarBadge.position.set(0, 0.285, -0.154);
    chestStarBadge.scale.set(1.05, 1.05, 0.36);
    chest.add(chestStarBadge);

    const utilityBelt = makeShadowMesh(
      trackGeo(boxGeo(0.545, 0.068, 0.325)),
      beltMat,
    );
    utilityBelt.position.set(0, 0.13, 0);
    pelvis.add(utilityBelt);

    const beltBuckle = makeShadowMesh(
      trackGeo(boxGeo(0.095, 0.076, 0.036)),
      silverTrimMat,
    );
    beltBuckle.position.set(0, 0.13, -0.165);
    pelvis.add(beltBuckle);

    for (const px of [-0.21, -0.115, 0.115, 0.21]) {
      const pouch = makeShadowMesh(
        trackGeo(boxGeo(0.078, 0.074, 0.052)),
        pouchMat,
      );
      pouch.position.set(px, 0.128, -0.162);
      pelvis.add(pouch);
    }
  }

  if (isThor) {
    // Thor dark navy armored collar rim + 6 glowing ice-blue chest discs (2 columns x 3 rows)
    const armorRimMat = trackMat(makeColorMat('#253147', 0.46, 0.48));
    const discGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#88EAFF',
        emissive: '#3CC8FF',
        emissiveIntensity: 1.35,
        roughness: 0.18,
        metalness: 0.22,
      }),
    );

    for (const side of [-1, 1] as const) {
      const shoulderPlate = makeShadowMesh(
        trackGeo(boxGeo(0.14, 0.048, 0.305)),
        armorRimMat,
      );
      shoulderPlate.position.set(side * 0.22, 0.398, 0.01);
      chest.add(shoulderPlate);
    }

    const discRows = [0.335, 0.22, 0.11];
    for (const dy of discRows) {
      for (const side of [-1, 1] as const) {
        const bezel = makeShadowMesh(
          trackGeo(cylinderGeo(0.046, 0.046, 0.02, 14)),
          armorRimMat,
        );
        bezel.rotation.x = Math.PI * 0.5;
        bezel.position.set(side * 0.135, dy, -0.15);
        chest.add(bezel);

        const disc = new THREE.Mesh(
          trackGeo(cylinderGeo(0.033, 0.033, 0.025, 14)),
          discGlowMat,
        );
        disc.rotation.x = Math.PI * 0.5;
        disc.position.set(side * 0.135, dy, -0.156);
        chest.add(disc);
      }
    }
  }

  if (isSupremeSorceress) {
    // 3D Eye of Agamotto brooch medallion on chest front
    const agamottoGold = trackMat(makeColorMat('#E8B938', 0.32, 0.65));
    const agamottoGem = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FF2A3C',
        emissive: '#E01528',
        emissiveIntensity: 0.75,
        roughness: 0.22,
        metalness: 0.2,
      }),
    );
    const ring = makeShadowMesh(
      trackGeo(cylinderGeo(0.056, 0.056, 0.022, 14)),
      agamottoGold,
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.set(0, 0.31, -0.152);
    chest.add(ring);

    const gem = makeShadowMesh(
      trackGeo(octahedronGeo(0.026, 0)),
      agamottoGem,
    );
    gem.position.set(0, 0.31, -0.162);
    gem.scale.set(1.0, 1.0, 0.45);
    chest.add(gem);
  }

  if (isAgatha) {
    // White turtleneck peek, oval gold/pearl brooch, and purple striped shawl draped over shoulders & torso
    const collarWhite = makeShadowMesh(
      trackGeo(boxGeo(0.18, 0.09, 0.19)),
      trackMat(makeColorMat('#EEF2F8', 0.8, 0.02)),
    );
    collarWhite.position.set(0, 0.425, 0);
    chest.add(collarWhite);

    const broochGold = makeShadowMesh(
      trackGeo(cylinderGeo(0.044, 0.044, 0.02, 12)),
      trackMat(makeColorMat('#DFC072', 0.32, 0.58)),
    );
    broochGold.rotation.x = Math.PI * 0.5;
    broochGold.scale.set(0.85, 1, 1.15);
    broochGold.position.set(0, 0.36, -0.155);
    chest.add(broochGold);

    const broochPearl = makeShadowMesh(
      trackGeo(sphereGeo(0.024, 8, 8)),
      trackMat(makeColorMat('#F7F9FC', 0.25, 0.1)),
    );
    broochPearl.scale.set(0.8, 1.1, 0.45);
    broochPearl.position.set(0, 0.36, -0.164);
    chest.add(broochPearl);

    const shawlMat = trackMat(makeColorMat('#2E1F54', 0.82, 0.04));
    const shawlStripeMat = trackMat(makeColorMat('#4E2980', 0.78, 0.06));
    for (const side of [-1, 1] as const) {
      const shoulderShawl = makeShadowMesh(
        trackGeo(boxGeo(0.14, 0.42, 0.33)),
        shawlMat,
      );
      shoulderShawl.position.set(side * 0.21, 0.22, 0);
      chest.add(shoulderShawl);

      const stripe = makeShadowMesh(
        trackGeo(boxGeo(0.035, 0.425, 0.336)),
        shawlStripeMat,
      );
      stripe.position.set(side * 0.21, 0.22, 0);
      chest.add(stripe);
    }
  }

  if (isWandaZombie) {
    // Upturned tattered crimson coat collar around neck
    const zCollarMat = trackMat(makeColorMat('#941722', 0.78, 0.04));
    for (const side of [-1, 1] as const) {
      const collarWing = makeShadowMesh(
        trackGeo(boxGeo(0.11, 0.15, 0.2)),
        zCollarMat,
      );
      collarWing.position.set(side * 0.16, 0.44, 0.05);
      collarWing.rotation.z = side * -0.22;
      chest.add(collarWing);
    }
  }

  if (isHela) {
    // High collar + pointed angled shoulder pauldrons (obsidian-emerald or White Hela pearl-silver)
    const armorMat = trackMat(
      makeColorMat(isWhiteHela ? '#F2F5F8' : '#151B1E', isWhiteHela ? 0.38 : 0.55, isWhiteHela ? 0.25 : 0.35),
    );
    const armorTrimMat = trackMat(
      makeColorMat(isWhiteHela ? '#9EA9B6' : '#648276', 0.36, 0.55),
    );
    const collarMesh = makeShadowMesh(
      trackGeo(boxGeo(0.25, 0.1, 0.24)),
      armorMat,
    );
    collarMesh.position.set(0, 0.42, 0);
    chest.add(collarMesh);

    for (const side of [-1, 1] as const) {
      const pauldron = makeShadowMesh(
        trackGeo(boxGeo(0.22, 0.065, 0.22)),
        armorMat,
      );
      pauldron.position.set(side * 0.36, 0.4, 0);
      pauldron.rotation.z = side * 0.24;
      chest.add(pauldron);

      const pauldronSpike = makeShadowMesh(
        trackGeo(coneGeo(0.055, 0.12, 4)),
        armorTrimMat,
      );
      pauldronSpike.position.set(side * 0.46, 0.44, 0);
      pauldronSpike.rotation.z = side * -1.15;
      pauldronSpike.scale.set(1, 1, 0.55);
      chest.add(pauldronSpike);
    }
  }

  if (appearance.topStyle === 'hoodie') {
    const hoodMat = trackMat(makeColorMat(appearance.topPrimary, 0.86));
    const hoodMesh = makeShadowMesh(
      trackGeo(boxGeo(0.36, 0.12, 0.12)),
      hoodMat,
    );
    hoodMesh.position.set(0, 0.38, 0.16);
    hoodMesh.rotation.x = 0.18;
    chest.add(hoodMesh);
  }

  if (isAncientOne) {
    // Folded lighter-gold Sorcerer Supreme V-collar lapels + dark brown shoulder mantle strips
    const lapelMat = trackMat(makeColorMat('#E7B84E', 0.72, 0.06));
    const mantleMat = trackMat(makeColorMat('#48392D', 0.78, 0.04));
    for (const side of [-1, 1] as const) {
      const lapel = makeShadowMesh(
        trackGeo(boxGeo(0.14, 0.14, 0.19)),
        lapelMat,
      );
      lapel.position.set(side * 0.155, 0.425, -0.03);
      lapel.rotation.z = side * -0.26;
      lapel.rotation.x = 0.08;
      chest.add(lapel);

      const strip = makeShadowMesh(
        trackGeo(boxGeo(0.09, 0.042, 0.31)),
        mantleMat,
      );
      strip.position.set(side * 0.22, 0.41, 0.01);
      chest.add(strip);
    }
    const backCollar = makeShadowMesh(
      trackGeo(boxGeo(0.36, 0.13, 0.07)),
      lapelMat,
    );
    backCollar.position.set(0, 0.43, 0.13);
    backCollar.rotation.x = -0.14;
    chest.add(backCollar);
  }

  // Flowing capes for Scarlet Witch, Emma Frost, White Hela, Magneto, Doctor Strange (Cloak of Levitation), & Vision (NOT Ancient One)
  let capePivot: THREE.Group | null = null;
  let capeLowerPivot: THREE.Group | null = null;
  if (
    (isScarletWitch && !isWandaZombie) ||
    isEmmaFrost ||
    isWhiteHela ||
    isMagneto ||
    (isStrange && !isAncientOne) ||
    isVision ||
    isThor ||
    isStorm
  ) {
    const outerHex = isEmmaFrost
      ? '#F6F9FC'
      : isWhiteHela
        ? '#F3F6FA'
        : isMagneto
          ? '#632095'
          : isVision
            ? '#F2C430'
            : isThor
              ? '#9A1622'
              : isStorm
                ? '#141620'
                : isStrange
                  ? '#A61124'
                  : '#B91323';
    const innerHex = isEmmaFrost
      ? '#CEDAE6'
      : isWhiteHela
        ? '#D6DFE8'
        : isMagneto
          ? '#3E1164'
          : isVision
            ? '#C89212'
            : isThor
              ? '#5E0C14'
              : isStorm
                ? '#0C0E16'
                : isStrange
                  ? '#6D0916'
                  : '#720914';
    const claspHex = isEmmaFrost
      ? '#EEF3F9'
      : isWhiteHela
        ? '#E6ECF4'
        : isMagneto
          ? '#7B32B5'
          : isVision
            ? '#FFD84D'
            : isThor
              ? '#2A3446'
              : isStorm
                ? '#E8B938'
                : isStrange
                  ? '#C4182E'
                  : '#E32436';

    const capeOuterMat = trackMat(makeColorMat(outerHex, isMagneto ? 0.68 : 0.78, isMagneto ? 0.14 : 0.04));
    const capeInnerMat = trackMat(makeColorMat(innerHex, 0.84, 0.02));
    const claspMat = trackMat(makeColorMat(claspHex, 0.48, 0.14));

    if (!isWhiteHela && !isThor && !isStorm) {
      const cowl = makeShadowMesh(
        trackGeo(boxGeo(0.6, isEmmaFrost ? 0.07 : 0.1, 0.34)),
        claspMat,
      );
      cowl.position.set(0, isEmmaFrost ? 0.36 : 0.39, 0.02);
      cowl.rotation.x = 0.08;
      chest.add(cowl);
    }

    if (isStorm) {
      // Storm iconic gold shoulder cape clasps & red-gold chest brooch clasp
      const stormGoldMat = trackMat(makeColorMat('#E8B938', 0.34, 0.62));
      for (const side of [-1, 1] as const) {
        const clasp = makeShadowMesh(
          trackGeo(cylinderGeo(0.044, 0.044, 0.024, 12)),
          stormGoldMat,
        );
        clasp.rotation.x = Math.PI * 0.5;
        clasp.position.set(side * 0.19, 0.36, -0.145);
        chest.add(clasp);
      }
      const gemClasp = makeShadowMesh(
        trackGeo(cylinderGeo(0.036, 0.036, 0.026, 12)),
        trackMat(makeColorMat('#C62828', 0.28, 0.25)),
      );
      gemClasp.rotation.x = Math.PI * 0.5;
      gemClasp.position.set(0, 0.35, -0.15);
      chest.add(gemClasp);
    }

    if (isWhiteQueen) {
      // Fluffy 3D white fur shoulder mantle framing Emma Frost's upper torso & shoulders
      const furMainMat = trackMat(makeColorMat('#FFFFFF', 0.94, 0.02));
      const furShadeMat = trackMat(makeColorMat('#EAF0F8', 0.92, 0.02));
      const furSpecs = [
        { x: -0.34, y: 0.41, z: 0.02, rx: 0.24, ry: 0.16, rz: 0.28 },
        { x: 0.34, y: 0.41, z: 0.02, rx: 0.24, ry: 0.16, rz: 0.28 },
        { x: -0.23, y: 0.43, z: 0.11, rx: 0.22, ry: 0.18, rz: 0.24 },
        { x: 0.23, y: 0.43, z: 0.11, rx: 0.22, ry: 0.18, rz: 0.24 },
        { x: 0, y: 0.44, z: 0.16, rx: 0.34, ry: 0.19, rz: 0.18 },
        { x: -0.29, y: 0.36, z: -0.09, rx: 0.16, ry: 0.12, rz: 0.18 },
        { x: 0.29, y: 0.36, z: -0.09, rx: 0.16, ry: 0.12, rz: 0.18 },
      ];
      furSpecs.forEach((f, idx) => {
        const puff = makeShadowMesh(
          trackGeo(dodecahedronGeo(0.5, 0)),
          idx % 2 === 0 ? furMainMat : furShadeMat,
        );
        puff.scale.set(f.rx * 2, f.ry * 2, f.rz * 2);
        puff.position.set(f.x, f.y, f.z);
        chest.add(puff);
      });
    }

    if (isMagneto) {
      // Sculpted purple collar mantle & metallic discs across upper chest (from Magneto ref)
      const discMat = trackMat(makeColorMat('#B4BCD2', 0.28, 0.72));
      for (const sx of [-0.21, -0.09, 0.09, 0.21]) {
        const disc = makeShadowMesh(
          trackGeo(cylinderGeo(0.032, 0.032, 0.02, 10)),
          discMat,
        );
        disc.rotation.x = Math.PI * 0.5;
        disc.position.set(sx, 0.37, -0.16);
        chest.add(disc);
      }
      const centerBuckle = makeShadowMesh(
        trackGeo(boxGeo(0.11, 0.08, 0.04)),
        claspMat,
      );
      centerBuckle.position.set(0, 0.36, -0.155);
      chest.add(centerBuckle);
    } else if (isStrange) {
      // Iconic upturned asymmetric high crimson & gold Cloak of Levitation collar
      const goldTrimMat = trackMat(makeColorMat('#E8B938', 0.36, 0.62));
      for (const side of [-1, 1] as const) {
        const highCollar = makeShadowMesh(
          trackGeo(boxGeo(0.14, 0.24, 0.22)),
          capeOuterMat,
        );
        highCollar.position.set(side * 0.26, 0.48, 0.06);
        highCollar.rotation.z = side * -0.18;
        highCollar.rotation.x = -0.12;
        chest.add(highCollar);

        const collarTrim = makeShadowMesh(
          trackGeo(boxGeo(0.025, 0.24, 0.23)),
          goldTrimMat,
        );
        collarTrim.position.set(side * 0.2, 0.48, 0.06);
        collarTrim.rotation.z = side * -0.18;
        collarTrim.rotation.x = -0.12;
        chest.add(collarTrim);
      }
      // 3D Eye of Agamotto medallion on chest
      const eyeRing = makeShadowMesh(
        trackGeo(cylinderGeo(0.064, 0.064, 0.026, 14)),
        goldTrimMat,
      );
      eyeRing.rotation.x = Math.PI * 0.5;
      eyeRing.position.set(0, 0.29, -0.156);
      chest.add(eyeRing);

      const eyeGemMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#34E878',
          emissive: '#1FD864',
          emissiveIntensity: 0.75,
          roughness: 0.22,
          metalness: 0.15,
        }),
      );
      const eyeGem = makeShadowMesh(
        trackGeo(octahedronGeo(0.032, 0)),
        eyeGemMat,
      );
      eyeGem.position.set(0, 0.29, -0.168);
      eyeGem.scale.set(0.9, 1.15, 0.48);
      chest.add(eyeGem);
    } else if (isVision) {
      // Iconic upturned high golden cape collar around neck
      for (const side of [-1, 1] as const) {
        const highCollar = makeShadowMesh(
          trackGeo(boxGeo(0.16, 0.22, 0.2)),
          claspMat,
        );
        highCollar.position.set(side * 0.24, 0.47, 0.05);
        highCollar.rotation.z = side * -0.2;
        chest.add(highCollar);
      }
      const backCollar = makeShadowMesh(
        trackGeo(boxGeo(0.46, 0.22, 0.06)),
        claspMat,
      );
      backCollar.position.set(0, 0.47, 0.14);
      backCollar.rotation.x = -0.15;
      chest.add(backCollar);
    }

    if (isEmmaFrost) {
      // 3D circular red/gold X brooch clasp on chest center
      const broochRim = makeShadowMesh(
        trackGeo(cylinderGeo(0.068, 0.068, 0.025, 12)),
        trackMat(makeColorMat('#D62828', 0.38, 0.35)),
      );
      broochRim.rotation.x = Math.PI * 0.5;
      broochRim.position.set(0, 0.33, -0.155);
      chest.add(broochRim);

      const broochGold = makeShadowMesh(
        trackGeo(boxGeo(0.082, 0.018, 0.032)),
        trackMat(makeColorMat('#F4C430', 0.3, 0.65)),
      );
      broochGold.position.set(0, 0.33, -0.162);
      broochGold.rotation.z = Math.PI * 0.25;
      chest.add(broochGold);

      const broochGoldB = makeShadowMesh(
        trackGeo(boxGeo(0.082, 0.018, 0.032)),
        trackMat(makeColorMat('#F4C430', 0.3, 0.65)),
      );
      broochGoldB.position.set(0, 0.33, -0.162);
      broochGoldB.rotation.z = -Math.PI * 0.25;
      chest.add(broochGoldB);
    }

    capePivot = new THREE.Group();
    capePivot.position.set(0, 0.37, 0.16);
    capePivot.rotation.x = -0.14;
    chest.add(capePivot);

    const capeUpper = makeShadowMesh(
      trackGeo(boxGeo(0.66, 0.58, 0.04)),
      capeOuterMat,
    );
    capeUpper.position.set(0, -0.28, 0.02);
    capePivot.add(capeUpper);

    const capeLiningUpper = makeShadowMesh(
      trackGeo(boxGeo(0.62, 0.54, 0.012)),
      capeInnerMat,
    );
    capeLiningUpper.position.set(0, -0.28, -0.004);
    capePivot.add(capeLiningUpper);

    capeLowerPivot = new THREE.Group();
    capeLowerPivot.position.set(0, -0.55, 0.018);
    capeLowerPivot.rotation.x = -0.09;
    capePivot.add(capeLowerPivot);

    const capeLower = makeShadowMesh(
      trackGeo(boxGeo(0.78, 0.56, 0.035)),
      capeOuterMat,
    );
    capeLower.position.set(0, -0.26, 0.008);
    capeLowerPivot.add(capeLower);

    const capeLiningLower = makeShadowMesh(
      trackGeo(boxGeo(0.72, 0.52, 0.012)),
      capeInnerMat,
    );
    capeLiningLower.position.set(0, -0.26, -0.012);
    capeLowerPivot.add(capeLiningLower);

    if (isSupremeSorceress || isStorm) {
      // Ornate gold embroidered trim borders along cape edges & hem
      const goldTrimMat = trackMat(makeColorMat('#E8B938', 0.36, 0.56));
      const hemTrim = makeShadowMesh(
        trackGeo(boxGeo(0.8, 0.065, 0.044)),
        goldTrimMat,
      );
      hemTrim.position.set(0, -0.52, 0.01);
      capeLowerPivot.add(hemTrim);

      for (const side of [-1, 1] as const) {
        const sideTrimUpper = makeShadowMesh(
          trackGeo(boxGeo(0.05, 0.58, 0.044)),
          goldTrimMat,
        );
        sideTrimUpper.position.set(side * 0.33, -0.28, 0.02);
        sideTrimUpper.rotation.z = side * -0.035;
        capePivot.add(sideTrimUpper);

        const sideTrimLower = makeShadowMesh(
          trackGeo(boxGeo(0.05, 0.56, 0.044)),
          goldTrimMat,
        );
        sideTrimLower.position.set(side * 0.38, -0.26, 0.01);
        sideTrimLower.rotation.z = side * -0.055;
        capeLowerPivot.add(sideTrimLower);
      }
    }
  }

  // 4. Faceless Head + Neck
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0);
  chest.add(head);

  const skinMat = trackMat(makeMat(tex.skinPlain, isSilverSurfer ? bodyRough : 0.78, bodyMetal));
  const neckMesh = makeShadowMesh(
    trackGeo(boxGeo(0.18, 0.1, 0.18)),
    skinMat,
  );
  neckMesh.position.set(0, 0.03, 0);
  head.add(neckMesh);

  if (isEmmaFrost) {
    // Sleek white choker around Emma Frost's neck
    const choker = makeShadowMesh(
      trackGeo(boxGeo(0.205, 0.042, 0.205)),
      trackMat(makeColorMat('#F4F8FC', 0.55, 0.08)),
    );
    choker.position.set(0, 0.038, 0);
    head.add(choker);
  }

  // Box faces: [+X, -X, +Y, -Y, +Z (back), -Z (front)]
  const headMaterials = [
    trackMat(makeMat(tex.headSideR, isSilverSurfer ? bodyRough : 0.78, bodyMetal)),
    trackMat(makeMat(tex.headSideL, isSilverSurfer ? bodyRough : 0.78, bodyMetal)),
    trackMat(makeMat(tex.headTop, isSilverSurfer ? bodyRough : 0.82, bodyMetal)),
    skinMat,
    trackMat(makeMat(tex.headBack, isSilverSurfer ? bodyRough : 0.84, bodyMetal)),
    trackMat(makeMat(tex.headFront, isSilverSurfer ? bodyRough : 0.76, bodyMetal)),
  ];
  const headMesh = makeShadowMesh(
    trackGeo(boxGeo(0.46, 0.44, 0.44)),
    headMaterials,
    true,
  );
  headMesh.position.set(0, 0.28, 0);
  head.add(headMesh);

  const hairCrownMat = trackMat(makeColorMat(appearance.hair, 0.86));
  if (
    !isVision &&
    !isAncientOne &&
    !isSilverSurfer &&
    !isRobot &&
    appearance.hatStyle !== 'magneto-helm' &&
    appearance.hatStyle !== 'captain-helm'
  ) {
    const hairCrown = makeShadowMesh(
      trackGeo(boxGeo(0.49, 0.09, 0.47)),
      hairCrownMat,
    );
    hairCrown.position.set(0, 0.49, 0.01);
    head.add(hairCrown);
  }

  if (isRobot) {
    // Ultron-style metallic armored brow crest, side ear fins, glowing crimson eyes & chest reactor
    const metalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#6C7588',
        roughness: 0.34,
        metalness: 0.68,
      }),
    );
    const robotGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FF2A3C',
        emissive: '#FF2438',
        emissiveIntensity: 1.9,
        roughness: 0.18,
        metalness: 0.1,
      }),
    );

    const browCrest = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.1, 0.47)),
      metalMat,
    );
    browCrest.position.set(0, 0.49, 0);
    head.add(browCrest);

    for (const side of [-1, 1] as const) {
      const earFin = makeShadowMesh(
        trackGeo(boxGeo(0.06, 0.24, 0.14)),
        metalMat,
      );
      earFin.position.set(side * 0.255, 0.31, 0.01);
      earFin.rotation.z = side * -0.14;
      head.add(earFin);

      const earNode = new THREE.Mesh(
        trackGeo(boxGeo(0.025, 0.09, 0.07)),
        robotGlowMat,
      );
      earNode.position.set(side * 0.285, 0.31, 0.01);
      head.add(earNode);

      const eyeSlit = new THREE.Mesh(
        trackGeo(boxGeo(0.095, 0.036, 0.022)),
        robotGlowMat,
      );
      eyeSlit.position.set(side * 0.095, 0.315, -0.222);
      eyeSlit.rotation.z = side * -0.14;
      head.add(eyeSlit);
    }

    const chestCore = new THREE.Mesh(
      trackGeo(cylinderGeo(0.064, 0.064, 0.024, 6)),
      robotGlowMat,
    );
    chestCore.rotation.x = Math.PI * 0.5;
    chestCore.position.set(0, 0.25, -0.158);
    chest.add(chestCore);
  }

  // Quicksilver iconic swept silver hair peaks; Strange swept hair & silver temples; Vision glowing Mind Stone
  let mindStone: THREE.Mesh | null = null;
  if (isQuicksilver) {
    const isSpeedSkin = appearance.skinId === 'speed';
    const qsHairLight = trackMat(makeColorMat('#F6FAFF', 0.78));
    for (const side of [-1, 1] as const) {
      const wingSpike = makeShadowMesh(
        trackGeo(boxGeo(0.14, 0.11, isSpeedSkin ? 0.34 : 0.28)),
        hairCrownMat,
      );
      wingSpike.position.set(side * 0.24, 0.52, isSpeedSkin ? 0.07 : 0.04);
      wingSpike.rotation.z = side * (isSpeedSkin ? -0.48 : -0.42);
      wingSpike.rotation.x = isSpeedSkin ? -0.25 : -0.18;
      head.add(wingSpike);
    }
    const sweptCrest = makeShadowMesh(
      trackGeo(boxGeo(0.32, isSpeedSkin ? 0.115 : 0.1, isSpeedSkin ? 0.38 : 0.34)),
      qsHairLight,
    );
    sweptCrest.position.set(0, 0.55, isSpeedSkin ? 0.07 : 0.04);
    sweptCrest.rotation.x = isSpeedSkin ? -0.26 : -0.2;
    head.add(sweptCrest);

    if (isSpeedSkin) {
      // Iconic Speed orange-tinted speedster goggles with crisp silver-white rims & dark cowl strap
      const goggleRimMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#EEF4FA',
          roughness: 0.28,
          metalness: 0.42,
        }),
      );
      const goggleLensMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#FF8A22',
          emissive: '#FF6B08',
          emissiveIntensity: 0.38,
          roughness: 0.14,
          metalness: 0.18,
          transparent: true,
          opacity: 0.88,
        }),
      );
      const strapMat = trackMat(makeColorMat('#0C1E14', 0.78));

      const strap = new THREE.Mesh(trackGeo(boxGeo(0.49, 0.065, 0.46)), strapMat);
      strap.position.set(0, 0.335, 0.005);
      head.add(strap);

      const bridge = new THREE.Mesh(trackGeo(boxGeo(0.06, 0.042, 0.035)), goggleRimMat);
      bridge.position.set(0, 0.345, -0.228);
      head.add(bridge);

      for (const side of [-1, 1] as const) {
        const rim = new THREE.Mesh(trackGeo(boxGeo(0.155, 0.105, 0.032)), goggleRimMat);
        rim.position.set(side * 0.105, 0.34, -0.226);
        rim.rotation.y = side * -0.1;
        head.add(rim);

        const lens = new THREE.Mesh(trackGeo(boxGeo(0.125, 0.076, 0.038)), goggleLensMat);
        lens.position.set(side * 0.105, 0.34, -0.229);
        lens.rotation.y = side * -0.1;
        head.add(lens);
      }
    }
  } else if (isStrange && !isAncientOne) {
    const templeSilverMat = trackMat(
      makeColorMat(appearance.hairSecondary ?? '#DCE5EE', 0.82),
    );
    for (const side of [-1, 1] as const) {
      const streak = makeShadowMesh(
        trackGeo(boxGeo(0.055, 0.18, 0.14)),
        templeSilverMat,
      );
      streak.position.set(side * 0.24, 0.36, -0.05);
      head.add(streak);
    }
    const topQuiff = makeShadowMesh(
      trackGeo(boxGeo(0.42, 0.09, 0.42)),
      hairCrownMat,
    );
    topQuiff.position.set(0, 0.53, 0.0);
    topQuiff.rotation.x = -0.1;
    head.add(topQuiff);
  } else if (isVision) {
    const stoneMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFE752',
        emissive: '#FFCC18',
        emissiveIntensity: 1.55,
        roughness: 0.18,
        metalness: 0.12,
      }),
    );
    mindStone = new THREE.Mesh(
      trackGeo(octahedronGeo(0.042, 0)),
      stoneMat,
    );
    mindStone.position.set(0, 0.372, -0.228);
    mindStone.scale.set(0.86, 1.32, 0.52);
    head.add(mindStone);
  }

  if (isSilverSurfer || isStorm) {
    // Glowing pure-white cosmic/weather-goddess eyes
    const glowEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: isSilverSurfer ? '#E8F6FF' : '#EAF8FF',
        emissiveIntensity: 1.95,
        roughness: 0.16,
        metalness: 0.05,
      }),
    );
    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(
        trackGeo(boxGeo(0.062, 0.032, 0.02)),
        glowEyeMat,
      );
      eye.position.set(side * 0.095, 0.305, -0.224);
      eye.rotation.z = side * (isStorm ? 0.08 : 0.04);
      head.add(eye);
    }
  }

  // Flowing hair for Scarlet Witch, Agatha Harkness, Phoenix Force, Emma Frost, Hela, & raised wild hair for Wanda Zombie
  let hairBackPivot: THREE.Group | null = null;
  let zombieHairGroup: THREE.Group | null = null;
  let helaHairGroup: THREE.Group | null = null;
  let helaCrownGroup: THREE.Group | null = null;

  if (isWandaZombie) {
    // Glowing fierce red/orange eye points over head front + wild raised disheveled undead hair
    const zEyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FF4E26',
        emissive: '#FF4E26',
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.0,
      }),
    );
    for (const side of [-1, 1] as const) {
      const eyeGlow = new THREE.Mesh(
        trackGeo(boxGeo(0.055, 0.036, 0.02)),
        zEyeMat,
      );
      eyeGlow.position.set(side * 0.095, 0.305, -0.224);
      head.add(eyeGlow);
    }

    zombieHairGroup = new THREE.Group();
    zombieHairGroup.position.set(0, 0.46, 0.02);
    head.add(zombieHairGroup);

    const zHairMat = hairCrownMat;
    const zHairDarkMat = trackMat(
      makeColorMat(appearance.hairSecondary ?? '#1C080A', 0.9),
    );
    const zLocks: Array<{
      x: number;
      y: number;
      z: number;
      rx: number;
      rz: number;
      w: number;
      h: number;
      d: number;
      dark?: boolean;
    }> = [
      { x: 0, y: 0.2, z: 0.04, rx: 0.14, rz: 0.0, w: 0.34, h: 0.34, d: 0.18 },
      { x: -0.2, y: 0.22, z: 0.02, rx: 0.08, rz: 0.62, w: 0.14, h: 0.44, d: 0.16 },
      { x: 0.2, y: 0.22, z: 0.02, rx: 0.08, rz: -0.62, w: 0.14, h: 0.44, d: 0.16 },
      { x: -0.34, y: 0.16, z: 0.05, rx: 0.18, rz: 1.05, w: 0.12, h: 0.42, d: 0.15, dark: true },
      { x: 0.34, y: 0.16, z: 0.05, rx: 0.18, rz: -1.05, w: 0.12, h: 0.42, d: 0.15, dark: true },
      { x: -0.14, y: 0.27, z: 0.12, rx: 0.32, rz: 0.36, w: 0.16, h: 0.36, d: 0.16, dark: true },
      { x: 0.14, y: 0.27, z: 0.12, rx: 0.32, rz: -0.36, w: 0.16, h: 0.36, d: 0.16, dark: true },
      { x: -0.28, y: 0.02, z: 0.1, rx: 0.12, rz: 1.32, w: 0.11, h: 0.36, d: 0.14 },
      { x: 0.28, y: 0.02, z: 0.1, rx: 0.12, rz: -1.32, w: 0.11, h: 0.36, d: 0.14 },
    ];
    for (const l of zLocks) {
      const strand = makeShadowMesh(
        trackGeo(boxGeo(l.w, l.h, l.d)),
        l.dark ? zHairDarkMat : zHairMat,
      );
      strand.position.set(l.x, l.y, l.z);
      strand.rotation.set(l.rx, 0, l.rz);
      zombieHairGroup.add(strand);
    }
  } else if (isHela) {
    // Default tousled voluminous jet-black hair (hidden when Crown Form is active)
    helaHairGroup = new THREE.Group();
    head.add(helaHairGroup);

    const helaHairMat = hairCrownMat;
    const helaHairShadeMat = trackMat(
      makeColorMat(appearance.hairSecondary ?? '#0A0B0E', 0.9),
    );

    const topVolume = makeShadowMesh(
      trackGeo(boxGeo(0.52, 0.11, 0.49)),
      helaHairMat,
    );
    topVolume.position.set(0, 0.51, 0.01);
    helaHairGroup.add(topVolume);

    // Messy sweeping bangs / cheek locks
    for (const side of [-1, 1] as const) {
      const sideLock = makeShadowMesh(
        trackGeo(boxGeo(0.11, 0.48, 0.26)),
        helaHairMat,
      );
      sideLock.position.set(side * 0.265, 0.26, 0.05);
      helaHairGroup.add(sideLock);

      const wildWave = makeShadowMesh(
        trackGeo(boxGeo(0.125, 0.34, 0.22)),
        helaHairShadeMat,
      );
      wildWave.position.set(side * 0.285, 0.0, 0.04);
      wildWave.rotation.z = side * -0.14;
      helaHairGroup.add(wildWave);
    }

    hairBackPivot = new THREE.Group();
    hairBackPivot.position.set(0, 0.43, 0.21);
    helaHairGroup.add(hairBackPivot);

    const backMane = makeShadowMesh(
      trackGeo(boxGeo(0.54, 0.58, 0.16)),
      helaHairMat,
    );
    backMane.position.set(0, -0.28, 0.05);
    backMane.rotation.x = -0.08;
    hairBackPivot.add(backMane);

    const backEnds = makeShadowMesh(
      trackGeo(boxGeo(0.48, 0.28, 0.13)),
      helaHairShadeMat,
    );
    backEnds.position.set(0, -0.62, 0.1);
    backEnds.rotation.x = -0.15;
    hairBackPivot.add(backEnds);

    // Hela Iconic Antlered Crown (obsidian-emerald or White Hela pearl-white & brushed silver)
    helaCrownGroup = new THREE.Group();
    helaCrownGroup.visible = false;
    head.add(helaCrownGroup);

    const crownMat = trackMat(
      makeColorMat(isWhiteHela ? '#F4F7FA' : '#0D1813', isWhiteHela ? 0.26 : 0.36, isWhiteHela ? 0.42 : 0.62),
    );
    const crownEdgeMat = trackMat(
      makeColorMat(isWhiteHela ? '#B8C3D0' : '#264A3B', 0.24, 0.72),
    );

    // Sleek armored helmet cap covering hair dome
    const helmCap = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.22, 0.48)),
      crownMat,
    );
    helmCap.position.set(0, 0.44, 0.01);
    helaCrownGroup.add(helmCap);

    // Brow V-ridge framing face
    const helmBrow = makeShadowMesh(
      trackGeo(boxGeo(0.49, 0.08, 0.06)),
      crownEdgeMat,
    );
    helmBrow.position.set(0, 0.4, -0.23);
    helaCrownGroup.add(helmBrow);

    // Symmetrical multi-antler branches sweeping outward & upward (reference image)
    const antlerSpecs: Array<{
      x: number;
      y: number;
      z: number;
      len: number;
      w: number;
      rz: number;
      rx: number;
    }> = [
      // Inner steep horns
      { x: 0.14, y: 0.68, z: -0.02, len: 0.42, w: 0.055, rz: -0.24, rx: -0.05 },
      // Mid sweeping tall tines
      { x: 0.34, y: 0.76, z: 0.02, len: 0.62, w: 0.065, rz: -0.68, rx: 0.04 },
      // Outer dramatic wide antlers
      { x: 0.56, y: 0.72, z: 0.05, len: 0.86, w: 0.072, rz: -1.04, rx: 0.08 },
      // Outer tip flare upward
      { x: 0.88, y: 0.92, z: 0.08, len: 0.42, w: 0.045, rz: -0.78, rx: 0.1 },
    ];

    for (const side of [-1, 1] as const) {
      // Cheek / ear armor guard
      const cheek = makeShadowMesh(
        trackGeo(boxGeo(0.06, 0.32, 0.28)),
        crownMat,
      );
      cheek.position.set(side * 0.255, 0.31, 0.02);
      helaCrownGroup.add(cheek);

      // Curved lower antler bridge
      const bridge = makeShadowMesh(
        trackGeo(boxGeo(0.46, 0.075, 0.06)),
        crownMat,
      );
      bridge.position.set(side * 0.38, 0.53, 0.01);
      bridge.rotation.z = side * 0.24;
      helaCrownGroup.add(bridge);

      for (const a of antlerSpecs) {
        const antler = makeShadowMesh(
          trackGeo(coneGeo(a.w * 0.55, a.len, 4)),
          a.len > 0.7 ? crownMat : crownEdgeMat,
        );
        antler.position.set(side * a.x, a.y, a.z);
        antler.rotation.z = side * a.rz;
        antler.rotation.x = a.rx;
        antler.scale.set(1.0, 1.0, 0.52);
        helaCrownGroup.add(antler);
      }
    }
  } else if (isHeroine) {
    const hairMat = hairCrownMat;
    const hairDarkMat = trackMat(
      makeColorMat(
        isVampire ? '#482012' : (appearance.hairSecondary ?? '#321712'),
        0.88,
      ),
    );
    const wideMane = isSupremeSorceress || isAgatha || isInvisibleWoman || isVampire || isStorm;

    for (const side of [-1, 1] as const) {
      const sideUpper = makeShadowMesh(
        trackGeo(boxGeo(wideMane ? 0.125 : 0.095, 0.44, wideMane ? 0.29 : 0.26)),
        hairMat,
      );
      sideUpper.position.set(side * (wideMane ? 0.27 : 0.255), 0.27, 0.06);
      head.add(sideUpper);

      const sideWave = makeShadowMesh(
        trackGeo(
          boxGeo(
            wideMane ? 0.145 : 0.11,
            isEmmaFrost || isInvisibleWoman ? 0.28 : wideMane ? 0.44 : 0.36,
            wideMane ? 0.24 : 0.21,
          ),
        ),
        hairDarkMat,
      );
      sideWave.position.set(
        side * (wideMane ? 0.295 : 0.27),
        isEmmaFrost || isInvisibleWoman ? 0.05 : -0.02,
        0.04,
      );
      sideWave.rotation.z =
        side * (isEmmaFrost || isInvisibleWoman ? -0.15 : wideMane ? -0.12 : -0.09);
      head.add(sideWave);
    }

    if (isVampire) {
      // Rogue's signature voluminous white/silver front streak sweeps framing forehead & temples
      const streakMat = trackMat(makeColorMat('#F2F6FA', 0.72, 0.04));
      for (const side of [-1, 1] as const) {
        const frontStreak = makeShadowMesh(
          trackGeo(boxGeo(0.095, 0.22, 0.085)),
          streakMat,
        );
        frontStreak.position.set(side * 0.145, 0.41, -0.2);
        frontStreak.rotation.z = side * -0.22;
        frontStreak.rotation.x = 0.08;
        head.add(frontStreak);

        const templeLock = makeShadowMesh(
          trackGeo(boxGeo(0.06, 0.18, 0.13)),
          streakMat,
        );
        templeLock.position.set(side * 0.23, 0.32, -0.11);
        templeLock.rotation.z = side * -0.1;
        head.add(templeLock);
      }
      const browArch = makeShadowMesh(
        trackGeo(boxGeo(0.28, 0.065, 0.095)),
        streakMat,
      );
      browArch.position.set(0, 0.485, -0.185);
      head.add(browArch);
    }

    hairBackPivot = new THREE.Group();
    hairBackPivot.position.set(0, 0.42, 0.21);
    head.add(hairBackPivot);

    const backHeight = isEmmaFrost ? 0.44 : isInvisibleWoman ? 0.54 : isStorm ? 0.72 : wideMane ? 0.68 : 0.62;
    const backWidth = isPhoenixForce ? 0.54 : isInvisibleWoman ? 0.58 : isStorm ? 0.66 : wideMane ? 0.62 : 0.5;
    const hairBackMain = makeShadowMesh(
      trackGeo(
        boxGeo(
          backWidth,
          backHeight,
          wideMane ? 0.18 : 0.14,
        ),
      ),
      hairMat,
    );
    hairBackMain.position.set(0, -backHeight * 0.5, 0.05);
    hairBackMain.rotation.x = -0.07;
    hairBackPivot.add(hairBackMain);

    const hairBackTip = makeShadowMesh(
      trackGeo(
        boxGeo(
          isPhoenixForce ? 0.48 : isStorm ? 0.6 : wideMane ? 0.56 : 0.44,
          isEmmaFrost ? 0.18 : isInvisibleWoman ? 0.24 : 0.32,
          wideMane ? 0.15 : 0.12,
        ),
      ),
      hairDarkMat,
    );
    hairBackTip.position.set(
      0,
      isEmmaFrost ? -0.49 : isInvisibleWoman ? -0.6 : isStorm ? -0.78 : wideMane ? -0.76 : -0.71,
      0.1,
    );
    hairBackTip.rotation.x = isEmmaFrost || isInvisibleWoman ? -0.2 : -0.13;
    hairBackPivot.add(hairBackTip);
  }

  // Optional Hat / Cap / Beanie / Scarlet Witch Tiara silhouette
  if (appearance.hatStyle === 'tiara') {
    const tiaraMat = isSupremeSorceress
      ? trackMat(
          new THREE.MeshStandardMaterial({
            color: appearance.hatColor,
            emissive: '#FF2A3C',
            emissiveIntensity: 0.72,
            roughness: 0.28,
            metalness: 0.18,
          }),
        )
      : trackMat(makeColorMat(appearance.hatColor, 0.42, 0.18));
    const tiaraTrimMat = isSupremeSorceress
      ? trackMat(
          new THREE.MeshStandardMaterial({
            color: '#FF6B78',
            emissive: '#FF3848',
            emissiveIntensity: 0.88,
            roughness: 0.24,
            metalness: 0.15,
          }),
        )
      : trackMat(makeColorMat('#FF4D5C', 0.36, 0.22));

    const browBand = makeShadowMesh(
      trackGeo(boxGeo(0.48, 0.09, 0.06)),
      tiaraMat,
    );
    browBand.position.set(0, 0.42, -0.225);
    head.add(browBand);

    const centerPoint = makeShadowMesh(
      trackGeo(boxGeo(0.11, 0.1, 0.065)),
      tiaraTrimMat,
    );
    centerPoint.position.set(0, 0.37, -0.23);
    centerPoint.rotation.z = Math.PI * 0.25;
    head.add(centerPoint);

    for (const side of [-1, 1] as const) {
      const hornPeak = makeShadowMesh(
        trackGeo(boxGeo(0.13, 0.28, 0.06)),
        tiaraMat,
      );
      hornPeak.position.set(side * 0.175, 0.56, -0.225);
      hornPeak.rotation.z = side * -0.24;
      head.add(hornPeak);

      const hornTip = makeShadowMesh(
        trackGeo(boxGeo(0.075, 0.12, 0.05)),
        tiaraTrimMat,
      );
      hornTip.position.set(side * 0.215, 0.69, -0.225);
      hornTip.rotation.z = side * -0.28;
      head.add(hornTip);

      const cheekGuard = makeShadowMesh(
        trackGeo(boxGeo(0.055, 0.29, 0.12)),
        tiaraMat,
      );
      cheekGuard.position.set(side * 0.235, 0.28, -0.18);
      head.add(cheekGuard);
    }
  } else if (appearance.hatStyle === 'magneto-helm') {
    const helmRedMat = trackMat(makeColorMat('#B4162A', 0.38, 0.45));
    const helmPurpleMat = trackMat(makeColorMat('#662298', 0.32, 0.52));

    const dome = makeShadowMesh(
      trackGeo(boxGeo(0.51, 0.17, 0.49)),
      helmRedMat,
    );
    dome.position.set(0, 0.48, 0.01);
    head.add(dome);

    const backPlate = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.34, 0.14)),
      helmRedMat,
    );
    backPlate.position.set(0, 0.28, 0.18);
    head.add(backPlate);

    const browTrim = makeShadowMesh(
      trackGeo(boxGeo(0.52, 0.075, 0.07)),
      helmPurpleMat,
    );
    browTrim.position.set(0, 0.41, -0.225);
    head.add(browTrim);

    const noseBridge = makeShadowMesh(
      trackGeo(boxGeo(0.07, 0.13, 0.065)),
      helmPurpleMat,
    );
    noseBridge.position.set(0, 0.33, -0.228);
    head.add(noseBridge);

    for (const side of [-1, 1] as const) {
      const cheekGuard = makeShadowMesh(
        trackGeo(boxGeo(0.065, 0.34, 0.22)),
        helmRedMat,
      );
      cheekGuard.position.set(side * 0.24, 0.26, -0.09);
      head.add(cheekGuard);

      const cheekRim = makeShadowMesh(
        trackGeo(boxGeo(0.04, 0.32, 0.04)),
        helmPurpleMat,
      );
      cheekRim.position.set(side * 0.22, 0.26, -0.205);
      head.add(cheekRim);

      const browHorn = makeShadowMesh(
        trackGeo(boxGeo(0.055, 0.11, 0.055)),
        helmPurpleMat,
      );
      browHorn.position.set(side * 0.09, 0.59, -0.2);
      browHorn.rotation.z = side * -0.45;
      head.add(browHorn);
    }
  } else if (appearance.hatStyle === 'beanie') {
    const beanieMat = trackMat(makeColorMat(appearance.hatColor, 0.88));
    const beanieRim = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.1, 0.48)),
      beanieMat,
    );
    beanieRim.position.set(0, 0.44, 0.01);
    head.add(beanieRim);

    const beanieTop = makeShadowMesh(
      trackGeo(boxGeo(0.44, 0.12, 0.42)),
      beanieMat,
    );
    beanieTop.position.set(0, 0.53, 0.02);
    head.add(beanieTop);
  } else if (appearance.hatStyle === 'cap') {
    const capMat = trackMat(makeColorMat(appearance.hatColor, 0.8));
    const capDome = makeShadowMesh(
      trackGeo(boxGeo(0.49, 0.13, 0.47)),
      capMat,
    );
    capDome.position.set(0, 0.47, 0);
    head.add(capDome);

    const capVisor = makeShadowMesh(
      trackGeo(boxGeo(0.46, 0.04, 0.22)),
      capMat,
    );
    capVisor.position.set(0, 0.41, -0.31);
    head.add(capVisor);
  } else if (appearance.hatStyle === 'captain-helm') {
    const capHelmMat = trackMat(makeColorMat(appearance.hatColor || '#1E4380', 0.48, 0.24));
    const capHelmDarkMat = trackMat(makeColorMat('#132C58', 0.56, 0.2));
    const capWhiteMat = trackMat(makeColorMat('#F4F8FC', 0.35, 0.1));

    const helmDome = makeShadowMesh(
      trackGeo(boxGeo(0.495, 0.16, 0.475)),
      capHelmMat,
    );
    helmDome.position.set(0, 0.455, 0.005);
    head.add(helmDome);

    const browRim = makeShadowMesh(
      trackGeo(boxGeo(0.5, 0.055, 0.06)),
      capHelmDarkMat,
    );
    browRim.position.set(0, 0.39, -0.22);
    head.add(browRim);

    for (const side of [-1, 1] as const) {
      const cheekWrap = makeShadowMesh(
        trackGeo(boxGeo(0.055, 0.24, 0.34)),
        capHelmMat,
      );
      cheekWrap.position.set(side * 0.242, 0.26, 0.05);
      head.add(cheekWrap);

      const chinStrap = makeShadowMesh(
        trackGeo(boxGeo(0.045, 0.13, 0.09)),
        capHelmDarkMat,
      );
      chinStrap.position.set(side * 0.236, 0.13, -0.14);
      head.add(chinStrap);
    }

    // Crisp raised 3D 'A' crest centered on helmet forehead
    const aLeft = makeShadowMesh(trackGeo(boxGeo(0.024, 0.09, 0.022)), capWhiteMat);
    aLeft.position.set(-0.026, 0.455, -0.238);
    aLeft.rotation.z = -0.2;
    head.add(aLeft);

    const aRight = makeShadowMesh(trackGeo(boxGeo(0.024, 0.09, 0.022)), capWhiteMat);
    aRight.position.set(0.026, 0.455, -0.238);
    aRight.rotation.z = 0.2;
    head.add(aRight);

    const aBar = makeShadowMesh(trackGeo(boxGeo(0.056, 0.02, 0.022)), capWhiteMat);
    aBar.position.set(0, 0.44, -0.24);
    head.add(aBar);
  } else if (appearance.hatStyle === 'storm-headband') {
    const bandMat = trackMat(makeColorMat(appearance.hatColor || '#141620', 0.48, 0.14));
    const badgeMat = trackMat(makeColorMat('#E8B938', 0.32, 0.62));
    const strap = makeShadowMesh(
      trackGeo(boxGeo(0.49, 0.078, 0.468)),
      bandMat,
    );
    strap.position.set(0, 0.42, 0.0);
    head.add(strap);

    const badge = makeShadowMesh(
      trackGeo(octahedronGeo(0.042, 0)),
      badgeMat,
    );
    badge.position.set(0, 0.42, -0.24);
    badge.scale.set(0.95, 1.1, 0.42);
    head.add(badge);
  }

  // Shared Arm & Leg materials
  const upperArmMat = trackMat(makeMat(tex.upperArm, isSilverSurfer ? bodyRough : 0.84, bodyMetal));
  const lowerArmMat = trackMat(makeMat(tex.lowerArm, isSilverSurfer ? bodyRough : 0.84, bodyMetal));
  const handMat = trackMat(makeMat(tex.hand, isSilverSurfer ? bodyRough : 0.78, bodyMetal));

  const upperLegMat = trackMat(makeMat(tex.upperLeg, isSilverSurfer ? bodyRough : 0.86, bodyMetal));
  const lowerLegMat = trackMat(makeMat(tex.lowerLeg, isSilverSurfer ? bodyRough : 0.86, bodyMetal));
  const footMaterials = [
    trackMat(makeMat(tex.footSide, isSilverSurfer ? bodyRough : 0.65, bodyMetal)),
    trackMat(makeMat(tex.footSide, isSilverSurfer ? bodyRough : 0.65, bodyMetal)),
    trackMat(makeMat(tex.footTop, isSilverSurfer ? bodyRough : 0.68, bodyMetal)),
    trackMat(makeMat(tex.footSole, isSilverSurfer ? bodyRough : 0.75, bodyMetal)),
    trackMat(makeMat(tex.footBack, isSilverSurfer ? bodyRough : 0.68, bodyMetal)),
    trackMat(makeMat(tex.footFront, isSilverSurfer ? bodyRough : 0.65, bodyMetal)),
  ];

  const cuffMat = isScarletWitch
    ? trackMat(makeColorMat(isSupremeSorceress ? '#C81E2B' : '#DF1E30', 0.72, 0.06))
    : isPhoenixForce
      ? trackMat(makeColorMat(appearance.topSecondary, 0.48, 0.22))
      : isEmmaFrost
        ? trackMat(makeColorMat('#E5EDF6', 0.6, 0.08))
        : null;

  const buildArm = (side: -1 | 1) => {
    const upperArm = new THREE.Group();
    upperArm.position.set(side * (isHeroine ? 0.365 : 0.39), 0.35, 0);
    chest.add(upperArm);

    const upperMesh = makeShadowMesh(
      trackGeo(
        boxGeo(
          isHeroine ? 0.18 : 0.2,
          0.28,
          isHeroine ? 0.18 : 0.2,
        ),
      ),
      upperArmMat,
      true,
    );
    upperMesh.position.set(0, -0.11, 0);
    upperArm.add(upperMesh);

    const lowerArm = new THREE.Group();
    lowerArm.position.set(0, -0.24, 0);
    upperArm.add(lowerArm);

    const lowerMesh = makeShadowMesh(
      trackGeo(
        boxGeo(
          isHeroine ? 0.175 : 0.185,
          0.26,
          isHeroine ? 0.175 : 0.185,
        ),
      ),
      lowerArmMat,
      true,
    );
    lowerMesh.position.set(0, -0.12, 0);
    lowerArm.add(lowerMesh);

    if (cuffMat && !isSupremeSorceress) {
      const gloveCuff = makeShadowMesh(
        trackGeo(boxGeo(0.205, 0.05, 0.205)),
        cuffMat,
      );
      gloveCuff.position.set(0, -0.02, 0);
      lowerArm.add(gloveCuff);
    }

    const hand = new THREE.Group();
    hand.position.set(0, -0.24, 0);
    lowerArm.add(hand);

    const handMesh = makeShadowMesh(
      trackGeo(boxGeo(0.16, 0.15, 0.16)),
      handMat,
      true,
    );
    handMesh.position.set(0, -0.06, 0);
    hand.add(handMesh);

    return { upperArm, lowerArm, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Hela's conjured dual Necrosword attachments (one in each hand, toggled on Sword Summon)
  let helaLeftHandSword: NecroswordRig | null = null;
  let helaRightHandSword: NecroswordRig | null = null;
  if (isHela) {
    helaLeftHandSword = buildNecroswordGroup('standard');
    helaLeftHandSword.group.position.set(-0.02, -0.08, -0.04);
    helaLeftHandSword.group.rotation.set(-Math.PI * 0.45, 0, 0.14);
    helaLeftHandSword.group.visible = false;
    leftArm.hand.add(helaLeftHandSword.group);

    helaRightHandSword = buildNecroswordGroup('standard');
    helaRightHandSword.group.position.set(0.02, -0.08, -0.04);
    helaRightHandSword.group.rotation.set(-Math.PI * 0.45, 0, -0.14);
    helaRightHandSword.group.visible = false;
    rightArm.hand.add(helaRightHandSword.group);
  }

  // Captain America Vibranium Shield strapped to left forearm
  let capShieldRig: VibraniumShieldRig | null = null;
  if (isCaptainAmerica) {
    capShieldRig = buildVibraniumShieldGroup(1.0);
    capShieldRig.group.position.set(-0.125, -0.14, 0.0);
    capShieldRig.group.rotation.set(0, -Math.PI * 0.5, 0);
    leftArm.lowerArm.add(capShieldRig.group);
  }

  // Thor Uru hammer Mjolnir gripped in right hand
  let thorHammerRig: MjolnirRig | null = null;
  if (isThor) {
    thorHammerRig = buildMjolnirGroup(1.0);
    thorHammerRig.group.position.set(0.0, -0.075, -0.04);
    thorHammerRig.group.rotation.set(-Math.PI * 0.48, 0, 0);
    rightArm.hand.add(thorHammerRig.group);
  }

  // Recognizable Bandit Face Mask around lower face
  if (appearance.archetype === 'npc-bandit') {
    const maskMat = trackMat(makeColorMat('#1B1D26', 0.86, 0.05));
    const maskTrimMat = trackMat(makeColorMat('#7A212C', 0.78, 0.06));
    const maskLower = makeShadowMesh(
      trackGeo(boxGeo(0.47, 0.165, 0.46)),
      maskMat,
    );
    maskLower.position.set(0, 0.155, -0.008);
    head.add(maskLower);

    const maskNoseRidge = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.052, 0.036)),
      maskTrimMat,
    );
    maskNoseRidge.position.set(0, 0.238, -0.228);
    head.add(maskNoseRidge);

    const maskKnot = makeShadowMesh(
      trackGeo(boxGeo(0.11, 0.08, 0.07)),
      maskTrimMat,
    );
    maskKnot.position.set(0, 0.16, 0.238);
    head.add(maskKnot);
  }

  // Bandit NPC pistol weapon attachment + muzzle point + flash
  let npcPistolGroup: THREE.Group | null = null;
  let npcMuzzlePoint: THREE.Object3D | null = null;
  let npcMuzzleFlashMesh: THREE.Mesh | null = null;
  let npcMuzzleFlashMat: THREE.MeshBasicMaterial | null = null;
  if (appearance.archetype === 'npc-bandit') {
    const gunSlideMat = trackMat(makeColorMat('#2B303C', 0.34, 0.78));
    const gunFrameMat = trackMat(makeColorMat('#181B24', 0.52, 0.45));
    const gunGripMat = trackMat(makeColorMat('#3B2A20', 0.78, 0.08));

    npcPistolGroup = new THREE.Group();
    const grip = makeShadowMesh(
      trackGeo(boxGeo(0.052, 0.145, 0.068)),
      gunGripMat,
    );
    grip.position.set(0, -0.055, 0.015);
    grip.rotation.x = 0.22;

    const frame = makeShadowMesh(
      trackGeo(boxGeo(0.054, 0.052, 0.23)),
      gunFrameMat,
    );
    frame.position.set(0, 0.025, -0.055);

    const slide = makeShadowMesh(
      trackGeo(boxGeo(0.056, 0.058, 0.25)),
      gunSlideMat,
    );
    slide.position.set(0, 0.068, -0.06);

    const barrelTip = makeShadowMesh(
      trackGeo(cylinderGeo(0.016, 0.018, 0.04, 8)),
      gunFrameMat,
    );
    barrelTip.rotation.x = Math.PI * 0.5;
    barrelTip.position.set(0, 0.066, -0.195);

    npcMuzzlePoint = new THREE.Object3D();
    npcMuzzlePoint.position.set(0, 0.066, -0.24);

    npcMuzzleFlashMat = new THREE.MeshBasicMaterial({
      color: '#FFCE54',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    npcMuzzleFlashMesh = new THREE.Mesh(
      trackGeo(octahedronGeo(0.095, 0)),
      npcMuzzleFlashMat,
    );
    npcMuzzleFlashMesh.position.set(0, 0.066, -0.245);
    npcMuzzleFlashMesh.scale.set(0.8, 0.8, 1.5);
    npcMuzzleFlashMesh.visible = false;

    npcPistolGroup.add(grip, frame, slide, barrelTip, npcMuzzlePoint, npcMuzzleFlashMesh);
    // Oriented forward along hand grip so pointing arm forward aims pistol straight toward target
    npcPistolGroup.position.set(0.0, -0.065, -0.035);
    npcPistolGroup.rotation.set(-Math.PI * 0.5, 0, 0);
    npcPistolGroup.visible = true;
    rightArm.hand.add(npcPistolGroup);
  }

  const buildLeg = (side: -1 | 1) => {
    const upperLeg = new THREE.Group();
    upperLeg.position.set(side * 0.145, -0.02, 0);
    pelvis.add(upperLeg);

    const upperMesh = makeShadowMesh(
      trackGeo(boxGeo(0.23, 0.38, 0.23)),
      upperLegMat,
      true,
    );
    upperMesh.position.set(0, -0.18, 0);
    upperLeg.add(upperMesh);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -0.36, 0);
    upperLeg.add(lowerLeg);

    const lowerMesh = makeShadowMesh(
      trackGeo(boxGeo(0.22, 0.36, 0.22)),
      lowerLegMat,
      true,
    );
    lowerMesh.position.set(0, -0.18, 0);
    lowerLeg.add(lowerMesh);

    const foot = new THREE.Group();
    foot.position.set(0, -0.36, 0);
    lowerLeg.add(foot);

    const footMesh = makeShadowMesh(
      trackGeo(boxGeo(0.235, 0.14, 0.33)),
      footMaterials,
      true,
    );
    footMesh.position.set(0, -0.07, -0.045);
    foot.add(footMesh);

    return { upperLeg, lowerLeg, foot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // Silver Surfer's Cosmic Surfboard (materializes from torso and rides flat under feet)
  let surferBoardGroup: THREE.Group | null = null;
  if (isSilverSurfer) {
    surferBoardGroup = new THREE.Group();
    surferBoardGroup.visible = false;
    surferBoardGroup.position.set(0, 1.05, 0);
    bodyPivot.add(surferBoardGroup);

    const boardChromeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#EDF4FC',
        roughness: 0.1,
        metalness: 0.95,
      }),
    );
    const boardDeckAccentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#C9DBF0',
        emissive: '#38BDF8',
        emissiveIntensity: 0.22,
        roughness: 0.16,
        metalness: 0.88,
      }),
    );
    const boardCosmicGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E0F2FE',
        emissive: '#BAE6FD',
        emissiveIntensity: 1.35,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      }),
    );

    // Classic sleek surfboard 2D silhouette extruded smoothly with beveled chrome rails (~2.38m long, ~0.62m wide)
    const boardShape = new THREE.Shape();
    boardShape.moveTo(0, 1.19); // Pointed forward nose (+Y in shape -> -Z local after rotateX(-PI/2))
    boardShape.bezierCurveTo(0.22, 0.92, 0.31, 0.42, 0.31, 0.04);
    boardShape.bezierCurveTo(0.31, -0.44, 0.25, -0.88, 0.13, -1.16);
    boardShape.quadraticCurveTo(0, -1.21, -0.13, -1.16);
    boardShape.bezierCurveTo(-0.25, -0.88, -0.31, -0.44, -0.31, 0.04);
    boardShape.bezierCurveTo(-0.31, 0.42, -0.22, 0.92, 0, 1.19);

    const boardHullGeo = trackGeo(
      new THREE.ExtrudeGeometry(boardShape, {
        depth: 0.044,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.022,
        bevelSegments: 3,
        curveSegments: 22,
      }),
    );
    boardHullGeo.rotateX(-Math.PI * 0.5);
    const deck = makeShadowMesh(boardHullGeo, boardChromeMat);
    deck.position.y = -0.022;
    surferBoardGroup.add(deck);

    // Dual racing cosmic spine ribs along upper & lower deck
    for (const sx of [-0.055, 0.055]) {
      const rib = makeShadowMesh(trackGeo(boxGeo(0.024, 0.068, 1.88)), boardDeckAccentMat);
      rib.position.set(sx, 0.008, 0.02);
      surferBoardGroup.add(rib);
    }

    // Center glowing cosmic stringer & nose crest
    const centerGlow = new THREE.Mesh(
      trackGeo(boxGeo(0.036, 0.014, 1.72)),
      boardCosmicGlowMat,
    );
    centerGlow.position.set(0, 0.04, -0.02);
    surferBoardGroup.add(centerGlow);

    // Subtle upturned nose & tail rockers via sleek contoured cap
    const tailPad = makeShadowMesh(
      trackGeo(boxGeo(0.24, 0.022, 0.34)),
      boardDeckAccentMat,
    );
    tailPad.position.set(0, 0.042, 0.88);
    surferBoardGroup.add(tailPad);

    // Twin swept rear ventral thruster fins + center cosmic stabilizer fin
    const centerFin = makeShadowMesh(
      trackGeo(boxGeo(0.026, 0.16, 0.34)),
      boardDeckAccentMat,
    );
    centerFin.position.set(0, -0.095, 0.84);
    centerFin.rotation.x = 0.28;
    surferBoardGroup.add(centerFin);

    for (const side of [-1, 1]) {
      const sideFin = makeShadowMesh(
        trackGeo(boxGeo(0.02, 0.11, 0.22)),
        boardDeckAccentMat,
      );
      sideFin.position.set(side * 0.15, -0.072, 0.68);
      sideFin.rotation.set(0.24, side * 0.08, side * 0.18);
      surferBoardGroup.add(sideFin);
    }

    // Under-board glowing propulsion strip
    const underStrip = new THREE.Mesh(
      trackGeo(boxGeo(0.14, 0.012, 1.42)),
      boardCosmicGlowMat,
    );
    underStrip.position.set(0, -0.036, 0.14);
    surferBoardGroup.add(underStrip);
  }

  // Save baseline material state so Diamond Form & Astral Projection cleanly morph & restore
  const snapshots: MaterialSnapshot[] = materials.map((mat) => ({
    mat,
    map: mat.map,
    colorHex: mat.color.getHex(),
    roughness: mat.roughness,
    metalness: mat.metalness,
    opacity: mat.opacity,
    transparent: mat.transparent,
    emissiveHex: mat.emissive.getHex(),
    emissiveIntensity: mat.emissiveIntensity,
  }));

  let baseOpacity = 1;
  let diamondBlend = 0;
  let astralActive = false;
  let intangibleBlend = 0;
  let hitFlashAmt = 0;
  let invisCloakActive = false;

  const crystalColor = new THREE.Color(0xdcf2ff);
  const intangibleColor = new THREE.Color(0xffe142);
  const origColorTmp = new THREE.Color();

  const applyVisualMaterialState = () => {
    const db = diamondBlend;
    const ib = intangibleBlend;
    const isCrystal = db > 0.02;
    const isIntangible = ib > 0.02;
    const targetAlpha =
      baseOpacity *
      (astralActive ? 0.38 : 1) *
      (isCrystal ? THREE.MathUtils.lerp(1, 0.84, db) : 1) *
      (isIntangible ? THREE.MathUtils.lerp(1, 0.46, ib) : 1);
    const isTransparent = targetAlpha < 0.995 || invisCloakActive;

    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      const m = s.mat;
      const desiredMap = db > 0.55 || ib > 0.45 ? null : s.map;
      if (m.map !== desiredMap) {
        m.map = desiredMap;
        m.needsUpdate = true;
      }

      if (isCrystal) {
        origColorTmp.setHex(s.colorHex);
        m.color.copy(origColorTmp).lerp(crystalColor, db * 0.92);
        m.roughness = THREE.MathUtils.lerp(s.roughness, 0.08, db);
        m.metalness = THREE.MathUtils.lerp(s.metalness, 0.52, db);
      } else if (isIntangible) {
        origColorTmp.setHex(s.colorHex);
        m.color.copy(origColorTmp).lerp(intangibleColor, ib * 0.88);
        m.roughness = THREE.MathUtils.lerp(s.roughness, 0.25, ib);
        m.metalness = THREE.MathUtils.lerp(s.metalness, 0.15, ib);
      } else {
        m.color.setHex(s.colorHex);
        m.roughness = s.roughness;
        m.metalness = s.metalness;
      }

      if (m.transparent !== isTransparent) {
        m.transparent = isTransparent;
        m.needsUpdate = true;
      }
      m.opacity = targetAlpha;
      m.depthWrite = !invisCloakActive && targetAlpha > 0.3 && !isIntangible;

      if (hitFlashAmt > 0.005) {
        m.emissive.setRGB(
          hitFlashAmt * 0.72,
          hitFlashAmt * 0.16,
          hitFlashAmt * 0.16,
        );
        m.emissiveIntensity = 1;
      } else if (isIntangible) {
        m.emissive.setHex(0xffd226);
        m.emissiveIntensity = THREE.MathUtils.lerp(s.emissiveIntensity, 0.92, ib);
      } else if (astralActive) {
        m.emissive.setHex(0x6fd4ff);
        m.emissiveIntensity = 0.62;
      } else if (isCrystal) {
        m.emissive.setHex(0x88c8f5);
        m.emissiveIntensity = db * 0.34;
      } else {
        m.emissive.setHex(s.emissiveHex);
        m.emissiveIntensity = s.emissiveIntensity;
      }
    }
    const shouldCastShadow = !invisCloakActive && targetAlpha > 0.55 && !isIntangible;
    for (let i = 0; i < shadowMeshes.length; i++) {
      shadowMeshes[i].castShadow = shouldCastShadow;
    }
    root.visible = targetAlpha > 0.015;
  };

  let whiteOutlineMat: THREE.MeshBasicMaterial | null = null;
  let whiteOutlineMeshes: THREE.Mesh[] | null = null;
  let whiteOutlineActive = false;

  const setWhiteOutline = (active: boolean) => {
    if (active === whiteOutlineActive) return;
    whiteOutlineActive = active;
    if (active && !whiteOutlineMeshes) {
      whiteOutlineMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
        depthWrite: false,
      });
      whiteOutlineMeshes = outlineSources.map(({ mesh, geo }) => {
        const outlineMesh = new THREE.Mesh(geo, whiteOutlineMat!);
        outlineMesh.scale.setScalar(1.08);
        outlineMesh.renderOrder = 2;
        mesh.add(outlineMesh);
        return outlineMesh;
      });
    }
    if (whiteOutlineMeshes) {
      for (const m of whiteOutlineMeshes) {
        m.visible = active && !invisCloakActive;
      }
    }
  };

  return {
    root,
    bodyPivot,
    pelvis,
    waist,
    chest,
    head,
    leftUpperArm: leftArm.upperArm,
    leftLowerArm: leftArm.lowerArm,
    leftHand: leftArm.hand,
    rightUpperArm: rightArm.upperArm,
    rightLowerArm: rightArm.lowerArm,
    rightHand: rightArm.hand,
    leftUpperLeg: leftLeg.upperLeg,
    leftLowerLeg: leftLeg.lowerLeg,
    leftFoot: leftLeg.foot,
    rightUpperLeg: rightLeg.upperLeg,
    rightLowerLeg: rightLeg.lowerLeg,
    rightFoot: rightLeg.foot,
    capePivot,
    capeLowerPivot,
    hairBackPivot,
    zombieHairGroup,
    sashPivot,
    mindStone,
    surferBoard: surferBoardGroup,
    setOpacity: (alpha: number) => {
      baseOpacity = THREE.MathUtils.clamp(alpha, 0, 1);
      applyVisualMaterialState();
    },
    setHitFlash: (amount: number) => {
      hitFlashAmt = THREE.MathUtils.clamp(amount, 0, 1);
      applyVisualMaterialState();
    },
    setDiamondForm: (blend: number) => {
      diamondBlend = THREE.MathUtils.clamp(blend, 0, 1);
      applyVisualMaterialState();
    },
    setAstralProjection: (active: boolean) => {
      astralActive = active;
      applyVisualMaterialState();
    },
    setIntangible: (active: boolean, blend = 1) => {
      intangibleBlend = active ? THREE.MathUtils.clamp(blend, 0, 1) : 0;
      applyVisualMaterialState();
    },
    setHelaCrownMode: (enabled: boolean) => {
      if (helaHairGroup) {
        helaHairGroup.visible = !enabled;
        helaHairGroup.position.set(0, 0, 0);
        helaHairGroup.scale.setScalar(1);
      }
      if (helaCrownGroup) {
        helaCrownGroup.visible = enabled;
        helaCrownGroup.position.set(0, 0, 0);
        helaCrownGroup.scale.setScalar(1);
      }
    },
    setHelaCrownProgress: (blend: number) => {
      const b = THREE.MathUtils.clamp(blend, 0, 1);
      if (helaHairGroup) {
        helaHairGroup.visible = b < 0.68;
        helaHairGroup.position.set(0, -b * 0.04, b * 0.14);
        helaHairGroup.scale.setScalar(Math.max(0.2, 1 - b * 0.65));
      }
      if (helaCrownGroup) {
        helaCrownGroup.visible = b > 0.22;
        helaCrownGroup.position.set(0, (1 - b) * 0.06, -(1 - b) * 0.14);
        helaCrownGroup.scale.setScalar(0.35 + 0.65 * b);
      }
    },
    setHelaHandSword: (visible: boolean) => {
      if (helaLeftHandSword) helaLeftHandSword.group.visible = visible;
      if (helaRightHandSword) helaRightHandSword.group.visible = visible;
    },
    setHelaHandSwords: (leftVisible: boolean, rightVisible: boolean) => {
      if (helaLeftHandSword) helaLeftHandSword.group.visible = leftVisible;
      if (helaRightHandSword) helaRightHandSword.group.visible = rightVisible;
    },
    setCapShieldVisible: (visible: boolean) => {
      if (capShieldRig) capShieldRig.group.visible = visible;
    },
    setThorHammerVisible: (visible: boolean) => {
      if (thorHammerRig) thorHammerRig.group.visible = visible;
    },
    setSurferBoardProgress: (progress: number, bankRoll = 0, pitchX = 0) => {
      if (!surferBoardGroup) return;
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      if (p <= 0.01) {
        surferBoardGroup.visible = false;
        return;
      }
      surferBoardGroup.visible = true;
      const eased = 1 - Math.pow(1 - p, 2.4);
      const boardY = THREE.MathUtils.lerp(1.08, 0.05, eased);
      const scaleXZ = THREE.MathUtils.lerp(0.12, 1.0, eased);
      surferBoardGroup.position.set(0, boardY, THREE.MathUtils.lerp(-0.18, -0.04, eased));
      surferBoardGroup.scale.set(scaleXZ, THREE.MathUtils.lerp(0.3, 1.0, eased), scaleXZ);
      surferBoardGroup.rotation.set(pitchX * eased, 0, bankRoll * eased);
    },
    setNpcWeapon: (kind: 'none' | 'pistol') => {
      if (npcPistolGroup) npcPistolGroup.visible = kind === 'pistol';
    },
    setNpcMuzzleFlash: (intensity: number) => {
      if (!npcMuzzleFlashMesh || !npcMuzzleFlashMat) return;
      const clamped = THREE.MathUtils.clamp(intensity, 0, 1);
      npcMuzzleFlashMesh.visible = clamped > 0.02;
      npcMuzzleFlashMat.opacity = clamped;
      npcMuzzleFlashMesh.scale.set(
        0.7 + clamped * 0.65,
        0.7 + clamped * 0.65,
        1.1 + clamped * 0.9,
      );
      npcMuzzleFlashMesh.rotation.z += 0.7;
    },
    getNpcMuzzleWorldPos: (out: THREE.Vector3): boolean => {
      if (npcMuzzlePoint) {
        npcMuzzlePoint.getWorldPosition(out);
        return true;
      }
      if (isRobot) {
        rightArm.hand.getWorldPosition(out);
        return true;
      }
      return false;
    },
    setWhiteOutline,
    setInvisibilityCloak: (
      active: boolean,
      cutLocalY: number,
      baseWorldY: number,
      ghostAlpha = 0.34,
    ) => {
      const wasActive = invisCloakActive;
      invisCloakActive = active;
      invisUniforms.uInvisActive.value = active ? 1 : 0;
      invisUniforms.uInvisCutY.value = cutLocalY;
      invisUniforms.uInvisBaseY.value = baseWorldY;
      invisUniforms.uInvisAlpha.value = ghostAlpha;
      if (wasActive !== active) {
        applyVisualMaterialState();
        if (whiteOutlineMeshes) {
          for (const m of whiteOutlineMeshes) {
            m.visible = whiteOutlineActive && !invisCloakActive;
          }
        }
      }
    },
    dispose: () => {
      materials.forEach((m) => m.dispose());
      whiteOutlineMat?.dispose();
      npcMuzzleFlashMat?.dispose();
      tex.dispose();
      helaLeftHandSword?.dispose();
      helaRightHandSword?.dispose();
      capShieldRig?.dispose();
      thorHammerRig?.dispose();
    },
  };
}
