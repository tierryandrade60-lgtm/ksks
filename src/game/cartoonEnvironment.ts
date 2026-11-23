import * as THREE from 'three';

export interface BaseplateTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface ArchitecturalTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates a vibrant, stylized outdoor sky + warm sun + navy arena ground-bounce
 * environment map via PMREMGenerator so metallic armor, shields, and satin surfaces
 * reflect bright cerulean sky and warm sun highlights rather than flat indoor grey.
 */
export function createCartoonSkyEnvironment(
  renderer: THREE.WebGLRenderer,
): THREE.WebGLRenderTarget {
  const envScene = new THREE.Scene();

  // Gradient sky sphere inside PMREM capture
  const skyGeo = new THREE.SphereGeometry(20, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(46, 28, -110).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float y = d.y;

        vec3 zenith = vec3(0.24, 0.52, 0.90);
        vec3 midSky = vec3(0.46, 0.74, 0.98);
        vec3 horizon = vec3(0.78, 0.90, 1.00);
        vec3 groundRim = vec3(0.16, 0.27, 0.48);
        vec3 groundDeep = vec3(0.08, 0.14, 0.27);

        vec3 col;
        if (y >= 0.0) {
          float t1 = smoothstep(0.0, 0.35, y);
          float t2 = smoothstep(0.30, 0.92, y);
          col = mix(horizon, midSky, t1);
          col = mix(col, zenith, t2);
        } else {
          float g = smoothstep(0.0, -0.55, y);
          col = mix(groundRim, groundDeep, g);
        }

        // Bright sun specular source for metallic glints
        float sunDot = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.92, 0.74) * pow(sunDot, 10.0) * 0.75;
        col += vec3(1.0, 0.98, 0.90) * pow(sunDot, 96.0) * 3.8;

        // Subtle cool sky fill panel opposite the sun for hero rim reflections
        vec3 fillDir = normalize(vec3(-0.6, 0.35, 0.72));
        float fillDot = max(dot(d, fillDir), 0.0);
        col += vec3(0.55, 0.80, 1.0) * pow(fillDot, 5.0) * 0.42;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(skyMesh);

  // Soft studio-outdoor bright key bounce boxes so flat reflective armor catches crisp shapes
  const cloudCardMat = new THREE.MeshBasicMaterial({ color: 0xf4f9ff });
  const cardGeo = new THREE.PlaneGeometry(8, 3.2);
  const card1 = new THREE.Mesh(cardGeo, cloudCardMat);
  card1.position.set(8, 7, -10);
  card1.lookAt(0, 0, 0);
  const card2 = new THREE.Mesh(cardGeo, cloudCardMat);
  card2.position.set(-10, 6, 6);
  card2.lookAt(0, 0, 0);
  envScene.add(card1, card2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(envScene, 0.03);

  skyGeo.dispose();
  skyMat.dispose();
  cardGeo.dispose();
  cloudCardMat.dispose();
  pmrem.dispose();

  return rt;
}

/**
 * Custom stylized atmospheric sky dome shader featuring multi-band cerulean gradients,
 * warm Mie sun halo, subtle drifting high-altitude cirrus wisps, and seamless horizon mist.
 */
export function createStylizedSkyDomeMaterial(
  sunDir: THREE.Vector3,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: sunDir.clone().normalize() },
      uTime: { value: 0 },
      uHorizonColor: { value: new THREE.Color(0xc2e0fa) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform vec3 uHorizonColor;
      varying vec3 vDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = rot * p * 2.03 + vec2(13.1, 7.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;

        // Vibrant stylized cartoon sky gradient
        vec3 zenithCol = vec3(0.20, 0.45, 0.82);
        vec3 upperMidCol = vec3(0.36, 0.65, 0.93);
        vec3 lowerSkyCol = vec3(0.60, 0.81, 0.98);
        vec3 horizonCol = uHorizonColor;
        vec3 nadirCol = vec3(0.18, 0.28, 0.46);

        float upperT = smoothstep(0.12, 0.72, max(y, 0.0));
        float midT = smoothstep(0.0, 0.22, max(y, 0.0));
        vec3 sky = mix(horizonCol, lowerSkyCol, smoothstep(0.0, 0.09, max(y, 0.0)));
        sky = mix(sky, upperMidCol, midT);
        sky = mix(sky, zenithCol, upperT);

        // Below horizon smooth atmospheric plunge
        float belowT = smoothstep(0.0, -0.45, y);
        sky = mix(sky, nadirCol, belowT);

        // Warm Mie forward-scattering around sun direction
        float sunCos = max(dot(d, uSunDir), 0.0);
        float wideMie = pow(sunCos, 3.0) * 0.24;
        float tightMie = pow(sunCos, 18.0) * 0.34;
        vec3 warmSunTint = vec3(1.0, 0.90, 0.72);
        sky = mix(sky, sky + warmSunTint * (wideMie + tightMie), smoothstep(-0.08, 0.25, y));

        // High-altitude wispy cartoon cirrus bands (projected on upper dome plane)
        if (y > 0.04) {
          vec2 skyUv = d.xz / (y + 0.24);
          vec2 wind1 = vec2(uTime * 0.012, uTime * 0.003);
          vec2 wind2 = vec2(uTime * 0.007, -uTime * 0.002);
          float wispA = fbm(skyUv * 1.15 + wind1);
          float wispB = fbm(skyUv * 2.3 - wind2 + vec2(4.2, 1.9));
          float cirrus = smoothstep(0.53, 0.82, wispA * 0.68 + wispB * 0.32);
          float altMask = smoothstep(0.05, 0.24, y) * (1.0 - smoothstep(0.72, 0.98, y));
          vec3 cirrusCol = mix(vec3(0.92, 0.96, 1.0), vec3(1.0, 0.96, 0.86), pow(sunCos, 4.0));
          sky = mix(sky, cirrusCol, cirrus * altMask * 0.28);
        }

        // Clean horizon mist band blending seamlessly into Three.Fog
        float horizonBand = exp(-abs(y) * 14.0);
        vec3 sunHorizon = mix(horizonCol, vec3(0.95, 0.93, 0.88), pow(sunCos, 4.0) * 0.35);
        sky = mix(sky, sunHorizon, horizonBand * 0.55);

        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Upgraded stylized cartoon PBR texture set for the iconic dark-blue square baseplate.
 * Preserves the crisp white grid lines and #182848 dark-blue palette while adding
 * subtle tile bevel normals, satin tile-center roughness contrast, and intersection ticks.
 */
export function createBaseplateSurfaceTextures(
  maxAnisotropy: number,
  repeatCount = 108,
): BaseplateTextureSet {
  const size = 128;

  // 1. Albedo Map (sRGB)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  // Base dark navy
  aCtx.fillStyle = '#182848';
  aCtx.fillRect(0, 0, size, size);

  // Subtle soft inner vignette/satin sheen inside each tile for depth without clutter
  const tileGrad = aCtx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.68,
  );
  tileGrad.addColorStop(0, '#1C2F54');
  tileGrad.addColorStop(0.72, '#182848');
  tileGrad.addColorStop(1, '#14213C');
  aCtx.fillStyle = tileGrad;
  aCtx.fillRect(2, 2, size - 4, size - 4);

  // Crisp white square grid lines (matching classic look, slightly sharper)
  aCtx.fillStyle = 'rgba(232, 242, 255, 0.42)';
  aCtx.fillRect(0, 0, size, 1.5);
  aCtx.fillRect(0, 0, 1.5, size);
  aCtx.fillRect(0, size - 1.5, size, 1.5);
  aCtx.fillRect(size - 1.5, 0, 1.5, size);

  // Subtle corner intersection accents
  aCtx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  aCtx.fillRect(0, 0, 4, 2);
  aCtx.fillRect(0, 0, 2, 4);
  aCtx.fillRect(size - 4, 0, 4, 2);
  aCtx.fillRect(size - 2, 0, 2, 4);
  aCtx.fillRect(0, size - 2, 4, 2);
  aCtx.fillRect(0, size - 4, 2, 4);
  aCtx.fillRect(size - 4, size - 2, 4, 2);
  aCtx.fillRect(size - 2, size - 4, 2, 4);

  // 2. Roughness Map (linear) — satin polished tile interior, matte grout edge
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = 'rgb(142, 142, 142)'; // ~0.56 satin cartoon floor
  rCtx.fillRect(0, 0, size, size);
  // Subtle diagonal sheen variation
  const rGrad = rCtx.createLinearGradient(0, 0, size, size);
  rGrad.addColorStop(0, 'rgb(128, 128, 128)');
  rGrad.addColorStop(0.5, 'rgb(148, 148, 148)');
  rGrad.addColorStop(1, 'rgb(134, 134, 134)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(4, 4, size - 8, size - 8);
  // Matte grout lines
  rCtx.fillStyle = 'rgb(225, 225, 225)';
  rCtx.fillRect(0, 0, size, 3);
  rCtx.fillRect(0, 0, 3, size);
  rCtx.fillRect(0, size - 3, size, 3);
  rCtx.fillRect(size - 3, 0, 3, size);

  // 3. Normal Map (linear) — subtle tile bevel slope along grid edges
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nCtx = normCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, size, size);
  // Top bevel tilts normal +Y (green > 128), bottom tilts -Y (green < 128)
  nCtx.fillStyle = 'rgb(128, 160, 248)';
  nCtx.fillRect(2, 2, size - 4, 3);
  nCtx.fillStyle = 'rgb(128, 96, 248)';
  nCtx.fillRect(2, size - 5, size - 4, 3);
  // Left bevel tilts -X (red < 128), right tilts +X (red > 128)
  nCtx.fillStyle = 'rgb(96, 128, 248)';
  nCtx.fillRect(2, 2, 3, size - 4);
  nCtx.fillStyle = 'rgb(160, 128, 248)';
  nCtx.fillRect(size - 5, 2, 3, size - 4);

  const configure = (tex: THREE.CanvasTexture, isSrgb: boolean) => {
    if (isSrgb) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatCount, repeatCount);
    if (maxAnisotropy > 0) {
      tex.anisotropy = maxAnisotropy;
    }
    tex.needsUpdate = true;
    return tex;
  };

  const map = configure(new THREE.CanvasTexture(albedoCanvas), true);
  const roughnessMap = configure(new THREE.CanvasTexture(roughCanvas), false);
  const normalMap = configure(new THREE.CanvasTexture(normCanvas), false);

  return {
    map,
    roughnessMap,
    normalMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      normalMap.dispose();
    },
  };
}

/**
 * Generates clean stylized cartoon architectural panel textures (albedo, roughness, AO, normal)
 * for pillars, perimeter walls, elevated platforms, and cover blocks.
 */
export function createArchitecturalPanelTextures(
  maxAnisotropy: number,
  baseHex: string,
  trimHex: string,
  repeatX = 1,
  repeatY = 1,
): ArchitecturalTextureSet {
  const size = 128;

  // 1. Albedo
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d')!;

  const baseCol = new THREE.Color(baseHex);
  const trimCol = new THREE.Color(trimHex);
  const lightCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), 0.14);
  const darkCol = baseCol.clone().multiplyScalar(0.72);

  const grad = aCtx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, `#${lightCol.getHexString()}`);
  grad.addColorStop(0.2, `#${baseCol.getHexString()}`);
  grad.addColorStop(0.85, `#${baseCol.getHexString()}`);
  grad.addColorStop(1, `#${darkCol.getHexString()}`);
  aCtx.fillStyle = grad;
  aCtx.fillRect(0, 0, size, size);

  // Subtle architectural panel framing
  aCtx.strokeStyle = `#${trimCol.getHexString()}`;
  aCtx.lineWidth = 3;
  aCtx.strokeRect(6, 8, size - 12, size - 16);

  // Crisp inner highlight & seam
  aCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  aCtx.fillRect(8, 10, size - 16, 2);
  aCtx.fillStyle = 'rgba(5, 10, 24, 0.24)';
  aCtx.fillRect(0, size * 0.5 - 1, size, 2);
  aCtx.fillRect(size * 0.5 - 1, 8, 2, size - 16);

  // Corner bolt/rivet dots
  aCtx.fillStyle = 'rgba(210, 228, 255, 0.25)';
  for (const [rx, ry] of [
    [13, 15],
    [size - 16, 15],
    [13, size - 18],
    [size - 16, size - 18],
  ]) {
    aCtx.fillRect(rx, ry, 3, 3);
  }

  // 2. Roughness
  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = 'rgb(168, 168, 168)';
  rCtx.fillRect(0, 0, size, size);
  rCtx.strokeStyle = 'rgb(112, 112, 112)';
  rCtx.lineWidth = 5;
  rCtx.strokeRect(6, 8, size - 12, size - 16);
  rCtx.fillStyle = 'rgb(215, 215, 215)';
  rCtx.fillRect(0, size * 0.5 - 1, size, 2);

  // 3. Ambient Occlusion (vertical + edge crevice AO)
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = size;
  aoCanvas.height = size;
  const aoCtx = aoCanvas.getContext('2d')!;
  const aoGrad = aoCtx.createLinearGradient(0, 0, 0, size);
  aoGrad.addColorStop(0.0, 'rgb(218, 218, 218)');
  aoGrad.addColorStop(0.14, 'rgb(255, 255, 255)');
  aoGrad.addColorStop(0.76, 'rgb(245, 245, 245)');
  aoGrad.addColorStop(1.0, 'rgb(138, 138, 138)');
  aoCtx.fillStyle = aoGrad;
  aoCtx.fillRect(0, 0, size, size);
  // Subtle dark AO in panel seams
  aoCtx.strokeStyle = 'rgb(195, 195, 195)';
  aoCtx.lineWidth = 3;
  aoCtx.strokeRect(6, 8, size - 12, size - 16);

  // 4. Normal map (subtle panel recess)
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, size, size);
  nCtx.fillStyle = 'rgb(128, 158, 248)';
  nCtx.fillRect(6, 8, size - 12, 3);
  nCtx.fillStyle = 'rgb(128, 98, 248)';
  nCtx.fillRect(6, size - 11, size - 12, 3);
  nCtx.fillStyle = 'rgb(98, 128, 248)';
  nCtx.fillRect(6, 8, 3, size - 16);
  nCtx.fillStyle = 'rgb(158, 128, 248)';
  nCtx.fillRect(size - 9, 8, 3, size - 16);

  const setup = (tex: THREE.CanvasTexture, isSrgb: boolean) => {
    if (isSrgb) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (maxAnisotropy > 0) {
      tex.anisotropy = maxAnisotropy;
    }
    tex.needsUpdate = true;
    return tex;
  };

  const map = setup(new THREE.CanvasTexture(aCanvas), true);
  const roughnessMap = setup(new THREE.CanvasTexture(rCanvas), false);
  const aoMap = setup(new THREE.CanvasTexture(aoCanvas), false);
  const normalMap = setup(new THREE.CanvasTexture(nCanvas), false);

  return {
    map,
    roughnessMap,
    aoMap,
    normalMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      aoMap.dispose();
      normalMap.dispose();
    },
  };
}

let cachedGroundAoTex: THREE.CanvasTexture | null = null;

/**
 * Soft rectangular/radial ground-contact ambient occlusion decal texture used to
 * ground pillars, walls, platforms, ramps, and blocks seamlessly to the floor.
 */
export function createGroundAoDecalTexture(): THREE.CanvasTexture {
  if (cachedGroundAoTex) return cachedGroundAoTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Soft rectangular edge-falloff AO box
  const pad = 22;
  const inner = size - pad * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(4, 8, 22, 0.72)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(4, 8, 22, 0.72)';
  ctx.fillRect(pad, pad, inner, inner);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedGroundAoTex = tex;
  return tex;
}
