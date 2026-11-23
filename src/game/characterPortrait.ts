import * as THREE from 'three';
import { CharacterAppearance } from './characterConfig';
import { createR16Character } from './r16Character';

const portraitCache = new Map<string, string>();

interface PortraitStudio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

let portraitStudio: PortraitStudio | null = null;

function getPortraitStudio(): PortraitStudio {
  if (portraitStudio) return portraitStudio;

  const size = 256;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setSize(size, size);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  // Character front faces -Z in local rig space -> rotate PI - 0.25 so it looks toward +Z camera slightly angled
  camera.position.set(0.08, 1.66, 2.32);
  camera.lookAt(0, 1.54, 0);

  const hemi = new THREE.HemisphereLight(0xfff4ea, 0x524064, 1.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff8ee, 1.65);
  key.position.set(1.6, 2.8, 3.0);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff8fa3, 0.85);
  rim.position.set(-2.0, 1.8, -1.6);
  scene.add(rim);

  portraitStudio = { renderer, scene, camera };
  return portraitStudio;
}

/**
 * Renders a crisp transparent 3D portrait snapshot directly from the actual
 * R16 character rig (head, headpiece, hair, shoulders, upper costume) and caches it.
 */
export function getCharacterPortraitUrl(
  cacheKey: string,
  appearance: CharacterAppearance,
): string {
  const existing = portraitCache.get(cacheKey);
  if (existing) return existing;

  try {
    const { renderer, scene, camera } = getPortraitStudio();
    const rig = createR16Character(appearance);
    rig.root.rotation.y = Math.PI - 0.22;
    rig.leftUpperArm.rotation.set(0.18, 0, -0.22);
    rig.rightUpperArm.rotation.set(-0.22, 0, 0.28);
    rig.leftLowerArm.rotation.set(0.45, 0, 0);
    rig.rightLowerArm.rotation.set(0.65, 0, 0);
    scene.add(rig.root);

    renderer.clear();
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    scene.remove(rig.root);
    rig.dispose();

    portraitCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    return '';
  }
}
