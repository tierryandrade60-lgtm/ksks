import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HandAgathaAura } from '../game/agathaAbilities';
import { createCartoonSkyEnvironment } from '../game/cartoonEnvironment';
import { CharacterAnimator } from '../game/characterAnimator';
import { CharacterDefinition, resolveCharacterWithSkin } from '../game/characters';
import { EmmaIdleForeheadRings } from '../game/emmaFrostAbilities';
import { HandFireAura, PhoenixWings } from '../game/phoenixAbilities';
import { createContactShadowTexture } from '../game/pixelTextures';
import { createR16Character } from '../game/r16Character';
import { HandChaosAura } from '../game/scarletWitchAbilities';

interface CharacterPreviewCanvasProps {
  character: CharacterDefinition;
  skinId?: string | null;
  forcedLandscape?: boolean;
}

const previewGlowTexCache = new Map<string, THREE.CanvasTexture>();
let previewMandalaTex: THREE.CanvasTexture | null = null;
let previewMandalaGeo: THREE.PlaneGeometry | null = null;
let previewMagnetoShardGeo: THREE.OctahedronGeometry | null = null;

function getPreviewGlowSpriteTex(inner: string, mid: string): THREE.CanvasTexture {
  const key = `${inner}|${mid}`;
  const cached = previewGlowTexCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.42, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  previewGlowTexCache.set(key, t);
  return t;
}

function getPreviewMandalaTex(): THREE.CanvasTexture {
  if (previewMandalaTex) return previewMandalaTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.translate(64, 64);
  ctx.strokeStyle = 'rgba(255, 165, 55, 0.88)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    ctx.rect(-26, -26, 52, 52);
    ctx.rotate(a);
  }
  ctx.stroke();
  const mTex = new THREE.CanvasTexture(c);
  mTex.colorSpace = THREE.SRGBColorSpace;
  previewMandalaTex = mTex;
  return mTex;
}

interface PreviewStudioState {
  swapCharacter: (char: CharacterDefinition, nextSkinId?: string | null) => void;
}

export function CharacterPreviewCanvas({
  character,
  skinId,
  forcedLandscape = false,
}: CharacterPreviewCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<PreviewStudioState | null>(null);
  const initialSelectionRef = useRef<{
    character: CharacterDefinition;
    skinId?: string | null;
  }>({ character, skinId });
  initialSelectionRef.current = { character, skinId };

  const spinStateRef = useRef<{
    dragging: boolean;
    pointerId: number | null;
    lastX: number;
    userYaw: number;
  }>({
    dragging: false,
    pointerId: null,
    lastX: 0,
    userYaw: 0,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const envRT = createCartoonSkyEnvironment(renderer);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.82;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);

    // Toy-box Studio 3-Point Lighting with warm sky bounce
    const hemi = new THREE.HemisphereLight(0xc2e6ff, 0x2e4378, 1.12);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4df, 1.82);
    keyLight.position.set(3.2, 5.4, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    const d = 1.8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.015;
    keyLight.shadow.radius = 3.2;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.85);
    rimLight.position.set(-3.4, 2.8, -3.5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffe6c4, 0.3);
    fillLight.position.set(-2.2, -1.2, 3.0);
    scene.add(fillLight);

    // Playful Cartoon 3D Podium Platform (persistent across character swaps)
    const podiumGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.92, 1.04, 0.18, 40);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.44,
      metalness: 0.08,
      envMapIntensity: 0.72,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.09;
    baseMesh.receiveShadow = true;
    podiumGroup.add(baseMesh);

    const rimGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.045, 40);
    const rimMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.34,
      metalness: 0.14,
      envMapIntensity: 0.88,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = -0.025;
    rimMesh.receiveShadow = true;
    podiumGroup.add(rimMesh);

    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.02, 1.02);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.34,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = 0.008;
    podiumGroup.add(contactShadow);
    scene.add(podiumGroup);

    interface ActivePreviewRig {
      rig: ReturnType<typeof createR16Character>;
      initialYaw: number;
      cameraOffsetY: number;
      cameraDistance: number;
      isTallHeadgear: boolean;
      isCaped: boolean;
      leftHandAura: HandChaosAura | null;
      rightHandAura: HandChaosAura | null;
      leftAgathaAura: HandAgathaAura | null;
      rightAgathaAura: HandAgathaAura | null;
      leftFireAura: HandFireAura | null;
      rightFireAura: HandFireAura | null;
      phoenixWings: PhoenixWings | null;
      emmaIdleRings: EmmaIdleForeheadRings | null;
      magnetoShards: THREE.Mesh[];
      qsSparks: THREE.Sprite[];
      strangeMandala: THREE.Mesh | null;
      visionHalo: THREE.Sprite | null;
      perRigDisposables: Array<THREE.BufferGeometry | THREE.Material>;
    }

    let active: ActivePreviewRig | null = null;
    let animator: CharacterAnimator | null = null;

    const updatePreviewCamera = (w: number, h: number) => {
      if (!active) return;
      const safeW = Math.max(w, 1);
      const safeH = Math.max(h, 1);
      const aspect = Math.max(safeW / safeH, 0.35);
      const vFov = aspect < 1 ? 42 : 36;
      const tanHalfV = Math.tan(THREE.MathUtils.degToRad(vFov * 0.5));

      // Enclose from podium underside (y = -0.22) up to tall headgear/wings (y = +2.55)
      const targetY = Math.max(active.cameraOffsetY, 1.14);
      const halfH = active.isTallHeadgear ? 1.56 : active.isCaped ? 1.52 : 1.48;
      const halfW = active.isTallHeadgear ? 1.42 : active.isCaped ? 1.24 : 1.16;

      const distForH = halfH / tanHalfV;
      const distForW = halfW / (tanHalfV * aspect);
      const dist = Math.max(active.cameraDistance, distForH, distForW);

      camera.fov = vFov;
      camera.aspect = aspect;
      camera.position.set(0, targetY + 0.16, dist);
      camera.lookAt(0, targetY, 0);
      camera.updateProjectionMatrix();
    };

    const disposeActiveCharacter = () => {
      if (!active) return;
      active.leftHandAura?.dispose();
      active.rightHandAura?.dispose();
      active.leftAgathaAura?.dispose();
      active.rightAgathaAura?.dispose();
      active.leftFireAura?.dispose();
      active.rightFireAura?.dispose();
      active.phoenixWings?.dispose();
      if (active.emmaIdleRings) {
        active.emmaIdleRings.clear();
        scene.remove(active.emmaIdleRings.group);
        active.emmaIdleRings.dispose();
      }
      for (const m of active.magnetoShards) scene.remove(m);
      for (const sp of active.qsSparks) scene.remove(sp);
      if (active.visionHalo) scene.remove(active.visionHalo);
      for (const dItem of active.perRigDisposables) dItem.dispose();
      scene.remove(active.rig.root);
      active.rig.dispose();
      active = null;
    };

    const swapCharacter = (
      nextChar: CharacterDefinition,
      nextSkinId?: string | null,
    ) => {
      disposeActiveCharacter();

      const resolved = resolveCharacterWithSkin(nextChar, nextSkinId);
      const { appearance, preview } = resolved;

      baseMat.color.set(preview.podiumColor);
      rimMat.color.set(preview.badgeColor);

      const arch = appearance.archetype ?? 'standard';
      const isWitch = arch === 'scarlet-witch';
      const isAgatha = arch === 'agatha-harkness';
      const isPhoenix = arch === 'phoenix-force';
      const isEmma = arch === 'emma-frost';
      const isHela = arch === 'hela';
      const isMagneto = arch === 'magneto';
      const isQuicksilver = arch === 'quicksilver';
      const isStrange = arch === 'doctor-strange';
      const isVision = arch === 'vision';
      const isCaped = isMagneto || isStrange || isVision;

      const rig = createR16Character(appearance);
      rig.root.rotation.y = Math.PI - preview.initialYaw;
      scene.add(rig.root);

      if (!animator) {
        animator = new CharacterAnimator(rig, arch, appearance.skinId);
      } else {
        animator.reset(rig, arch, appearance.skinId);
      }
      if (isHela) {
        rig.setHelaHandSwords(true, true);
        animator.setSwordHeld(true);
      }

      const witchAuraVariant =
        appearance.skinId === 'wanda-zombie' ? 'crimson-dark' : 'default';
      const leftHandAura = isWitch ? new HandChaosAura(0.28, witchAuraVariant) : null;
      const rightHandAura = isWitch ? new HandChaosAura(0.28, witchAuraVariant) : null;
      if (leftHandAura) {
        leftHandAura.group.position.set(0, -0.09, -0.06);
        rig.leftHand.add(leftHandAura.group);
      }
      if (rightHandAura) {
        rightHandAura.group.position.set(0, -0.09, -0.06);
        rig.rightHand.add(rightHandAura.group);
      }

      const leftAgathaAura = isAgatha ? new HandAgathaAura(0.28) : null;
      const rightAgathaAura = isAgatha ? new HandAgathaAura(0.28) : null;
      if (leftAgathaAura) {
        leftAgathaAura.group.position.set(0, -0.09, -0.06);
        rig.leftHand.add(leftAgathaAura.group);
      }
      if (rightAgathaAura) {
        rightAgathaAura.group.position.set(0, -0.09, -0.06);
        rig.rightHand.add(rightAgathaAura.group);
      }

      const skinVar = appearance.skinVariant ?? 'phoenix';
      const leftFireAura = isPhoenix ? new HandFireAura(skinVar, 0.27) : null;
      const rightFireAura = isPhoenix ? new HandFireAura(skinVar, 0.27) : null;
      const phoenixWings = isPhoenix ? new PhoenixWings(skinVar) : null;
      if (leftFireAura) {
        leftFireAura.group.position.set(0, -0.09, -0.06);
        rig.leftHand.add(leftFireAura.group);
      }
      if (rightFireAura) {
        rightFireAura.group.position.set(0, -0.09, -0.06);
        rig.rightHand.add(rightFireAura.group);
      }
      if (phoenixWings) {
        rig.chest.add(phoenixWings.group);
      }

      const emmaIdleRings = isEmma ? new EmmaIdleForeheadRings(4) : null;
      if (emmaIdleRings) {
        scene.add(emmaIdleRings.group);
      }

      const perRigDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];

      const magnetoShards: THREE.Mesh[] = [];
      if (isMagneto) {
        if (!previewMagnetoShardGeo) {
          previewMagnetoShardGeo = new THREE.OctahedronGeometry(0.052, 0);
        }
        const shardMat = new THREE.MeshStandardMaterial({
          color: '#9BA6BD',
          metalness: 0.85,
          roughness: 0.22,
          emissive: '#59208F',
          emissiveIntensity: 0.35,
        });
        perRigDisposables.push(shardMat);
        for (let i = 0; i < 3; i++) {
          const s = new THREE.Mesh(previewMagnetoShardGeo, shardMat);
          s.scale.set(0.75, 1.35, 0.55);
          scene.add(s);
          magnetoShards.push(s);
        }
      }

      const qsSparks: THREE.Sprite[] = [];
      if (isQuicksilver) {
        const tex = getPreviewGlowSpriteTex(
          'rgba(220,255,240,0.95)',
          'rgba(60,255,155,0.52)',
        );
        const spMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        perRigDisposables.push(spMat);
        for (let i = 0; i < 6; i++) {
          const sp = new THREE.Sprite(spMat);
          sp.scale.setScalar(0.14);
          scene.add(sp);
          qsSparks.push(sp);
        }
      }

      let strangeMandala: THREE.Mesh | null = null;
      if (isStrange) {
        const mTex = getPreviewMandalaTex();
        if (!previewMandalaGeo) {
          previewMandalaGeo = new THREE.PlaneGeometry(0.32, 0.32);
        }
        const mMat = new THREE.MeshBasicMaterial({
          map: mTex,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        perRigDisposables.push(mMat);
        strangeMandala = new THREE.Mesh(previewMandalaGeo, mMat);
        strangeMandala.position.set(0.02, -0.06, -0.14);
        rig.rightHand.add(strangeMandala);
      }

      let visionHalo: THREE.Sprite | null = null;
      if (isVision) {
        const vTex = getPreviewGlowSpriteTex(
          'rgba(255,250,200,0.92)',
          'rgba(255,210,45,0.42)',
        );
        const vMat = new THREE.SpriteMaterial({
          map: vTex,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        perRigDisposables.push(vMat);
        visionHalo = new THREE.Sprite(vMat);
        visionHalo.scale.setScalar(0.18);
        scene.add(visionHalo);
      }

      active = {
        rig,
        initialYaw: preview.initialYaw,
        cameraOffsetY: preview.cameraOffsetY,
        cameraDistance: preview.cameraDistance,
        isTallHeadgear: isHela || isPhoenix,
        isCaped,
        leftHandAura,
        rightHandAura,
        leftAgathaAura,
        rightAgathaAura,
        leftFireAura,
        rightFireAura,
        phoenixWings,
        emmaIdleRings,
        magnetoShards,
        qsSparks,
        strangeMandala,
        visionHalo,
        perRigDisposables,
      };

      spinStateRef.current.userYaw = 0;
      updatePreviewCamera(container.clientWidth, container.clientHeight);
    };

    studioRef.current = { swapCharacter };
    swapCharacter(
      initialSelectionRef.current.character,
      initialSelectionRef.current.skinId,
    );

    const handleResize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      updatePreviewCamera(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
    };

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    ro?.observe(container);
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let lastMs = performance.now();
    let elapsed = 0;
    let disposed = false;

    const idleInput = {
      localForward: 0,
      localRight: 0,
      verticalVelocity: 0,
      grounded: true,
      justJumped: false,
      landImpactSpeed: 0,
      previewMode: true,
    };

    const foreheadPos = new THREE.Vector3();
    const foreheadDir = new THREE.Vector3();

    const renderLoop = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(Math.max((now - lastMs) / 1000, 0.001), 0.05);
      lastMs = now;
      elapsed += dt;

      if (active && animator) {
        animator.update(dt, idleInput);
        active.leftHandAura?.update(dt, 0.92 + Math.sin(elapsed * 2.2) * 0.12, 0.28);
        active.rightHandAura?.update(dt, 1.0 + Math.cos(elapsed * 2.0) * 0.12, 0.28);
        active.leftAgathaAura?.update(dt, 0.92 + Math.sin(elapsed * 2.2) * 0.12, 0.28);
        active.rightAgathaAura?.update(dt, 1.0 + Math.cos(elapsed * 2.0) * 0.12, 0.28);

        active.leftFireAura?.update(dt, 0.92 + Math.sin(elapsed * 2.4) * 0.14, 0.27);
        active.rightFireAura?.update(dt, 1.0 + Math.cos(elapsed * 2.1) * 0.14, 0.27);
        active.phoenixWings?.update(dt, true, false, 0.25);

        const autoSway = spinStateRef.current.dragging
          ? 0
          : Math.sin(elapsed * 0.85) * 0.22;
        active.rig.root.rotation.y =
          Math.PI -
          active.initialYaw +
          spinStateRef.current.userYaw +
          autoSway;

        podiumGroup.position.y = Math.sin(elapsed * 1.4) * 0.018;
        active.rig.root.position.y = podiumGroup.position.y;

        if (active.emmaIdleRings) {
          active.rig.root.updateMatrixWorld(true);
          foreheadPos.set(0, 0.3, -0.25).applyMatrix4(active.rig.head.matrixWorld);
          foreheadDir
            .set(0, 0.32, -1.25)
            .applyMatrix4(active.rig.head.matrixWorld)
            .sub(foreheadPos)
            .normalize();
          active.emmaIdleRings.update(dt, true, foreheadPos, foreheadDir);
        }

        if (active.magnetoShards.length > 0) {
          for (let i = 0; i < active.magnetoShards.length; i++) {
            const ang =
              elapsed * 1.35 + (i * Math.PI * 2) / active.magnetoShards.length;
            const m = active.magnetoShards[i];
            m.position.set(
              Math.cos(ang) * 0.56,
              0.86 + Math.sin(elapsed * 2.1 + i * 1.7) * 0.16 + podiumGroup.position.y,
              Math.sin(ang) * 0.56,
            );
            m.rotation.set(elapsed * 1.4 + i, elapsed * 1.9, i);
          }
        }

        if (active.qsSparks.length > 0) {
          for (let i = 0; i < active.qsSparks.length; i++) {
            const ang = elapsed * 4.8 + i * 1.05;
            const sp = active.qsSparks[i];
            const rad = 0.34 + (i % 2) * 0.14;
            sp.position.set(
              Math.cos(ang) * rad,
              0.22 + ((i * 0.25 + elapsed * 0.55) % 1.45),
              Math.sin(ang) * rad,
            );
            const sc = 0.09 + Math.sin(elapsed * 9 + i) * 0.035;
            sp.scale.setScalar(sc);
          }
        }

        if (active.strangeMandala) {
          active.strangeMandala.rotation.z = elapsed * 1.2;
          const sc = 0.92 + Math.sin(elapsed * 2.8) * 0.08;
          active.strangeMandala.scale.setScalar(sc);
        }

        if (active.visionHalo && active.rig.mindStone) {
          active.rig.root.updateMatrixWorld(true);
          active.rig.mindStone.getWorldPosition(foreheadPos);
          active.visionHalo.position.copy(foreheadPos);
          const pulse = 0.16 + Math.sin(elapsed * 3.1) * 0.04;
          active.visionHalo.scale.setScalar(pulse);
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', handleResize);
      studioRef.current = null;
      disposeActiveCharacter();
      baseGeo.dispose();
      baseMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      // Do NOT dispose shadowTex — it is a shared singleton managed by pixelTextures.ts
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    studioRef.current?.swapCharacter(character, skinId);
  }, [character, skinId]);

  return (
    <div
      ref={mountRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        spinStateRef.current.dragging = true;
        spinStateRef.current.pointerId = e.pointerId;
        spinStateRef.current.lastX = forcedLandscape ? e.clientY : e.clientX;
      }}
      onPointerMove={(e) => {
        if (
          !spinStateRef.current.dragging ||
          spinStateRef.current.pointerId !== e.pointerId
        ) {
          return;
        }
        e.stopPropagation();
        const currX = forcedLandscape ? e.clientY : e.clientX;
        const dx = currX - spinStateRef.current.lastX;
        spinStateRef.current.lastX = currX;
        spinStateRef.current.userYaw += dx * 0.012;
      }}
      onPointerUp={(e) => {
        if (spinStateRef.current.pointerId === e.pointerId) {
          spinStateRef.current.dragging = false;
          spinStateRef.current.pointerId = null;
        }
      }}
      onPointerCancel={(e) => {
        if (spinStateRef.current.pointerId === e.pointerId) {
          spinStateRef.current.dragging = false;
          spinStateRef.current.pointerId = null;
        }
      }}
    />
  );
}
