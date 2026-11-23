import * as THREE from 'three';
import { CloudQuality } from './graphicsSettings';
import { createSunGlowTexture } from './pixelTextures';

interface PuffDef {
  ox: number;
  oy: number;
  oz: number;
  sx: number;
  sy: number;
  sz: number;
  tint: number;
}

interface CloudCluster {
  relX: number;
  baseY: number;
  relZ: number;
  cosYaw: number;
  sinYaw: number;
  quat: THREE.Quaternion;
  speed: number;
  scale: number;
  bobPhase: number;
  puffs: ReadonlyArray<PuffDef>;
}

const PUFFS_PER_CLOUD = 10;
const MAX_CLOUDS = 30;
const SKY_RING_HALF = 148;

const DISTANT_PUFFS_PER_CLOUD = 6;
const MAX_DISTANT_CLOUDS = 18;
const DISTANT_RING_MIN = 88;
const DISTANT_RING_MAX = 185;

// Rich, sculpted multi-lobed cumulus cartoon cloud silhouettes (flatter base, puffy sunlit crowns)
const CLOUD_ARCHETYPES: ReadonlyArray<ReadonlyArray<PuffDef>> = [
  [
    { ox: 0.0, oy: -0.08, oz: 0.0, sx: 3.6, sy: 0.92, sz: 2.1, tint: 0.92 },
    { ox: -2.0, oy: 0.04, oz: 0.14, sx: 2.25, sy: 0.88, sz: 1.65, tint: 0.94 },
    { ox: 2.05, oy: 0.02, oz: -0.12, sx: 2.15, sy: 0.85, sz: 1.6, tint: 0.94 },
    { ox: -0.65, oy: 0.82, oz: 0.08, sx: 2.05, sy: 1.32, sz: 1.55, tint: 1.0 },
    { ox: 0.95, oy: 0.68, oz: -0.08, sx: 1.72, sy: 1.12, sz: 1.4, tint: 0.99 },
    { ox: 0.05, oy: 0.22, oz: 0.88, sx: 2.1, sy: 0.86, sz: 1.25, tint: 0.96 },
    { ox: -0.15, oy: 0.18, oz: -0.82, sx: 1.95, sy: 0.82, sz: 1.2, tint: 0.95 },
    { ox: -1.45, oy: 0.48, oz: 0.22, sx: 1.35, sy: 0.92, sz: 1.15, tint: 0.98 },
    { ox: 1.65, oy: 0.42, oz: 0.18, sx: 1.28, sy: 0.85, sz: 1.08, tint: 0.97 },
    { ox: 0.15, oy: 1.18, oz: 0.0, sx: 1.32, sy: 1.05, sz: 1.18, tint: 1.0 },
  ],
  [
    { ox: 0.0, oy: -0.06, oz: 0.0, sx: 4.0, sy: 0.94, sz: 2.15, tint: 0.92 },
    { ox: -2.25, oy: 0.12, oz: -0.12, sx: 2.35, sy: 0.95, sz: 1.68, tint: 0.95 },
    { ox: 2.15, oy: 0.15, oz: 0.14, sx: 2.2, sy: 0.92, sz: 1.62, tint: 0.95 },
    { ox: 0.12, oy: 0.94, oz: 0.0, sx: 2.2, sy: 1.38, sz: 1.62, tint: 1.0 },
    { ox: -1.25, oy: 0.66, oz: 0.14, sx: 1.65, sy: 1.08, sz: 1.36, tint: 0.99 },
    { ox: 1.32, oy: 0.62, oz: -0.14, sx: 1.58, sy: 1.02, sz: 1.3, tint: 0.99 },
    { ox: 0.45, oy: 0.14, oz: 0.92, sx: 1.85, sy: 0.78, sz: 1.15, tint: 0.96 },
    { ox: -0.5, oy: 0.12, oz: -0.88, sx: 1.8, sy: 0.76, sz: 1.12, tint: 0.94 },
    { ox: -2.8, oy: -0.05, oz: 0.08, sx: 1.35, sy: 0.68, sz: 1.05, tint: 0.93 },
    { ox: 2.75, oy: -0.02, oz: -0.05, sx: 1.25, sy: 0.66, sz: 1.0, tint: 0.93 },
  ],
  [
    { ox: 0.0, oy: -0.05, oz: 0.0, sx: 3.25, sy: 0.92, sz: 1.9, tint: 0.92 },
    { ox: -1.65, oy: 0.1, oz: 0.12, sx: 1.95, sy: 0.88, sz: 1.5, tint: 0.95 },
    { ox: 1.68, oy: 0.08, oz: -0.1, sx: 1.88, sy: 0.84, sz: 1.45, tint: 0.95 },
    { ox: -0.25, oy: 0.78, oz: 0.02, sx: 1.92, sy: 1.28, sz: 1.48, tint: 1.0 },
    { ox: 0.95, oy: 0.52, oz: 0.28, sx: 1.42, sy: 0.96, sz: 1.2, tint: 0.98 },
    { ox: -0.72, oy: 0.18, oz: -0.68, sx: 1.72, sy: 0.82, sz: 1.15, tint: 0.95 },
    { ox: 0.55, oy: 0.2, oz: 0.72, sx: 1.65, sy: 0.8, sz: 1.12, tint: 0.96 },
    { ox: -1.1, oy: 0.52, oz: -0.18, sx: 1.28, sy: 0.88, sz: 1.08, tint: 0.98 },
    { ox: 0.2, oy: 1.12, oz: -0.06, sx: 1.22, sy: 0.96, sz: 1.08, tint: 1.0 },
    { ox: 1.88, oy: 0.25, oz: 0.24, sx: 1.12, sy: 0.7, sz: 0.95, tint: 0.96 },
  ],
  [
    { ox: 0.0, oy: -0.04, oz: 0.0, sx: 4.35, sy: 0.86, sz: 2.0, tint: 0.93 },
    { ox: -2.4, oy: 0.08, oz: 0.08, sx: 2.3, sy: 0.82, sz: 1.55, tint: 0.95 },
    { ox: 2.45, oy: 0.06, oz: -0.08, sx: 2.2, sy: 0.8, sz: 1.52, tint: 0.95 },
    { ox: -0.95, oy: 0.58, oz: 0.04, sx: 1.85, sy: 1.08, sz: 1.4, tint: 0.99 },
    { ox: 0.75, oy: 0.64, oz: -0.04, sx: 1.92, sy: 1.15, sz: 1.42, tint: 1.0 },
    { ox: -0.12, oy: 0.86, oz: 0.08, sx: 1.68, sy: 1.18, sz: 1.35, tint: 1.0 },
    { ox: 0.0, oy: 0.14, oz: 0.82, sx: 2.25, sy: 0.72, sz: 1.12, tint: 0.96 },
    { ox: 0.0, oy: 0.12, oz: -0.78, sx: 2.1, sy: 0.7, sz: 1.08, tint: 0.94 },
    { ox: -1.9, oy: 0.34, oz: -0.18, sx: 1.32, sy: 0.76, sz: 1.05, tint: 0.97 },
    { ox: 1.82, oy: 0.36, oz: 0.18, sx: 1.3, sy: 0.74, sz: 1.05, tint: 0.97 },
  ],
];

const CLOUD_COUNTS: Record<CloudQuality, number> = {
  low: 12,
  medium: 18,
  high: 24,
  ultra: 30,
};

const DISTANT_CLOUD_COUNTS: Record<CloudQuality, number> = {
  low: 0,
  medium: 10,
  high: 14,
  ultra: 18,
};

const SUN_SKY_OFFSET = new THREE.Vector3(46, 28, -110);
export const SUN_LIGHT_DIR = SUN_SKY_OFFSET.clone().normalize();
const _UP_AXIS = new THREE.Vector3(0, 1, 0);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

interface CloudShaderUniforms {
  uCloudSunDir: { value: THREE.Vector3 };
  uCloudTime: { value: number };
}

function enhanceCloudMaterial(
  mat: THREE.MeshLambertMaterial,
  uniforms: CloudShaderUniforms,
  isDistant: boolean,
): void {
  mat.customProgramCacheKey = () =>
    isDistant ? 'cartoon-cloud-distant-v1' : 'cartoon-cloud-main-v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCloudSunDir = uniforms.uCloudSunDir;
    shader.uniforms.uCloudTime = uniforms.uCloudTime;

    shader.vertexShader =
      'varying vec3 vCloudWorldNormal;\nvarying vec3 vCloudWorldPos;\nvarying vec3 vCloudLocalPos;\nuniform float uCloudTime;\n' +
      shader.vertexShader
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vCloudLocalPos = position;
          float puffBreath = sin(uCloudTime * 0.55 + position.x * 1.9 + position.z * 1.7) * 0.025;
          transformed *= (1.0 + puffBreath);`,
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
          vec4 cloudWp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            cloudWp = instanceMatrix * cloudWp;
          #endif
          cloudWp = modelMatrix * cloudWp;
          vCloudWorldPos = cloudWp.xyz;
          vec3 cloudN = objectNormal;
          #ifdef USE_INSTANCING
            cloudN = mat3(instanceMatrix) * cloudN;
          #endif
          vCloudWorldNormal = normalize(mat3(modelMatrix) * cloudN);`,
        );

    shader.fragmentShader =
      'uniform vec3 uCloudSunDir;\nvarying vec3 vCloudWorldNormal;\nvarying vec3 vCloudWorldPos;\nvarying vec3 vCloudLocalPos;\n' +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `vec3 cN = normalize(vCloudWorldNormal);
        vec3 cV = normalize(cameraPosition - vCloudWorldPos);
        float sunWrap = clamp(dot(cN, uCloudSunDir) * 0.5 + 0.5, 0.0, 1.0);
        float topFactor = smoothstep(-0.65, 0.72, cN.y);
        float underOcclusion = smoothstep(-0.85, 0.15, vCloudLocalPos.y);

        // Stylized cool periwinkle underside bounce + warm sunlit top
        vec3 shadowTint = vec3(0.72, 0.83, 0.97);
        vec3 warmCream = vec3(1.04, 0.99, 0.93);
        vec3 sculpted = mix(shadowTint, warmCream, clamp(topFactor * 0.68 + sunWrap * 0.42, 0.0, 1.0));
        outgoingLight *= mix(0.84, 1.08, underOcclusion * 0.65 + topFactor * 0.35);
        outgoingLight = mix(outgoingLight, outgoingLight * sculpted, 0.52);

        // Soft silver-lining / forward subsurface scattering toward sun
        float rimView = pow(1.0 - max(dot(cN, cV), 0.0), 2.3);
        float sunForward = pow(max(dot(-cV, uCloudSunDir), 0.0), 3.0);
        float rimScatter = rimView * (0.35 + sunForward * 1.15);
        vec3 silverRim = mix(vec3(0.92, 0.97, 1.0), vec3(1.0, 0.93, 0.78), sunForward);
        outgoingLight += silverRim * rimScatter * ${isDistant ? '0.16' : '0.22'};

        #include <opaque_fragment>`,
      );
  };
}

/**
 * Generates an additive radial golden corona texture for the stylized sun halo.
 */
function createSunCoronaTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;

  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 252, 232, 0.95)');
  grad.addColorStop(0.16, 'rgba(255, 238, 178, 0.68)');
  grad.addColorStop(0.42, 'rgba(255, 212, 132, 0.22)');
  grad.addColorStop(0.72, 'rgba(255, 198, 118, 0.06)');
  grad.addColorStop(1.0, 'rgba(255, 190, 110, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class SkyAtmosphere {
  public readonly group = new THREE.Group();

  private readonly sunBillboard: THREE.Mesh;
  private readonly sunCorona: THREE.Mesh;
  private readonly sunRayGroup = new THREE.Group();
  private readonly sunRayMat: THREE.ShaderMaterial;

  private readonly cloudMesh: THREE.InstancedMesh;
  private readonly clouds: CloudCluster[] = [];
  private activeCloudCount = CLOUD_COUNTS.high;

  private readonly distantCloudMesh: THREE.InstancedMesh;
  private readonly distantClouds: CloudCluster[] = [];
  private activeDistantCloudCount = DISTANT_CLOUD_COUNTS.high;

  private readonly cloudUniforms: CloudShaderUniforms = {
    uCloudSunDir: { value: SUN_LIGHT_DIR.clone() },
    uCloudTime: { value: 0 },
  };

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private elapsed = 0;
  private lastPlayerX = 0;
  private lastPlayerZ = 0;
  private cloudQuality: CloudQuality = 'high';

  private readonly _dummyPos = new THREE.Vector3();
  private readonly _dummyScale = new THREE.Vector3();
  private readonly _dummyMat = new THREE.Matrix4();
  private readonly _color = new THREE.Color();
  private readonly _camFwd = new THREE.Vector3();

  constructor(initialCloudQuality: CloudQuality = 'high') {
    this.cloudQuality = initialCloudQuality;

    // --- 1. Luminous Stylized Sun Core + Golden Corona Halo ---
    const sunTex = createSunGlowTexture();
    const sunGeo = new THREE.PlaneGeometry(54, 54);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.geometries.push(sunGeo);
    this.materials.push(sunMat);

    this.sunBillboard = new THREE.Mesh(sunGeo, sunMat);
    this.sunBillboard.renderOrder = -2;
    this.group.add(this.sunBillboard);

    const coronaTex = createSunCoronaTexture();
    this.textures.push(coronaTex);
    const coronaGeo = new THREE.PlaneGeometry(118, 118);
    const coronaMat = new THREE.MeshBasicMaterial({
      map: coronaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.72,
    });
    this.geometries.push(coronaGeo);
    this.materials.push(coronaMat);

    this.sunCorona = new THREE.Mesh(coronaGeo, coronaMat);
    this.sunCorona.renderOrder = -2;
    this.group.add(this.sunCorona);

    // --- 2. 3D Volumetric Sun Ray Cones / Atmospheric Light Shafts ---
    // Fan softly downward from the sun disk into the upper arena sky
    const rayGeo = new THREE.CylinderGeometry(1.1, 13.5, 96, 20, 1, true);
    rayGeo.translate(0, -48, 0);
    this.geometries.push(rayGeo);

    this.sunRayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uRayAlpha: { value: 1.0 },
        uColorInner: { value: new THREE.Color(0xfff4d4) },
        uColorOuter: { value: new THREE.Color(0xffdfa0) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uRayAlpha;
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;

        void main() {
          // Soft Fresnel silhouette attenuation so cone edges vanish seamlessly
          float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
          float edgeFade = pow(ndotv, 1.85);

          // Along length: uv.y = 1 at sun apex, 0 at far bottom end
          float topFade = smoothstep(1.0, 0.86, vUv.y);
          float bottomFade = smoothstep(0.0, 0.58, vUv.y);
          float lengthMask = topFade * bottomFade;

          // Gentle animated fluted volumetric shafts around cone circumference
          float angle = vUv.x * 6.2831853;
          float waveA = 0.5 + 0.5 * sin(angle * 5.0 + uTime * 0.22);
          float waveB = 0.5 + 0.5 * sin(angle * 9.0 - uTime * 0.16 + 1.4);
          float streak = mix(0.45, 1.0, waveA * 0.65 + waveB * 0.35);

          float alpha = edgeFade * lengthMask * streak * 0.052 * uRayAlpha;
          vec3 col = mix(uColorOuter, uColorInner, vUv.y * 0.7 + edgeFade * 0.3);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this.materials.push(this.sunRayMat);

    const rayConfigs = [
      { rx: 0.42, rz: -0.18, ry: 0.1, scaleX: 1.15, scaleY: 1.0 },
      { rx: 0.56, rz: -0.38, ry: 0.6, scaleX: 0.88, scaleY: 0.92 },
      { rx: 0.32, rz: 0.04, ry: 1.3, scaleX: 0.95, scaleY: 1.06 },
      { rx: 0.64, rz: 0.18, ry: 2.1, scaleX: 0.78, scaleY: 0.85 },
      { rx: 0.48, rz: -0.52, ry: 2.9, scaleX: 0.72, scaleY: 0.88 },
    ];
    for (const rc of rayConfigs) {
      const m = new THREE.Mesh(rayGeo, this.sunRayMat);
      m.rotation.set(rc.rx, rc.ry, rc.rz);
      m.scale.set(rc.scaleX, rc.scaleY, rc.scaleX);
      m.renderOrder = -1;
      this.sunRayGroup.add(m);
    }
    this.group.add(this.sunRayGroup);

    // --- 3. Sculpted Mid-Sky Cartoon Cumulus Clouds (InstancedMesh) ---
    const puffGeo = new THREE.SphereGeometry(1, 20, 14);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: '#FFFFFF',
      emissive: '#BDD9FA',
      emissiveIntensity: 0.56,
      fog: true,
    });
    enhanceCloudMaterial(cloudMat, this.cloudUniforms, false);
    this.geometries.push(puffGeo);
    this.materials.push(cloudMat);

    this.cloudMesh = new THREE.InstancedMesh(
      puffGeo,
      cloudMat,
      MAX_CLOUDS * PUFFS_PER_CLOUD,
    );
    this.cloudMesh.frustumCulled = false;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < MAX_CLOUDS; i++) {
      const frac = (i + 0.5) / MAX_CLOUDS;
      const radius = 30 + Math.sqrt(frac) * (SKY_RING_HALF - 36);
      const angle = i * goldenAngle + 0.4;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      const yaw = (i * 1.17) % (Math.PI * 2);
      const quat = new THREE.Quaternion().setFromAxisAngle(_UP_AXIS, yaw);
      const cluster: CloudCluster = {
        relX: rx,
        baseY: 18.5 + (i % 6) * 2.9,
        relZ: rz,
        cosYaw: Math.cos(yaw),
        sinYaw: Math.sin(yaw),
        quat,
        speed: 0.8 + (i % 5) * 0.22,
        scale: 0.96 + (i % 4) * 0.25,
        bobPhase: i * 0.9,
        puffs: CLOUD_ARCHETYPES[i % CLOUD_ARCHETYPES.length],
      };
      this.clouds.push(cluster);

      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const tint = cluster.puffs[p].tint;
        this._color.setRGB(tint * 0.99, tint * 0.995, Math.min(1, tint * 1.01));
        this.cloudMesh.setColorAt(i * PUFFS_PER_CLOUD + p, this._color);
      }
    }
    if (this.cloudMesh.instanceColor) {
      this.cloudMesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.cloudMesh);

    // --- 4. Distant High-Altitude Cloud Banks for Parallax Depth ---
    const distantMat = new THREE.MeshLambertMaterial({
      color: '#F4F9FF',
      emissive: '#C8DFFA',
      emissiveIntensity: 0.68,
      fog: true,
    });
    enhanceCloudMaterial(distantMat, this.cloudUniforms, true);
    this.materials.push(distantMat);

    this.distantCloudMesh = new THREE.InstancedMesh(
      puffGeo,
      distantMat,
      MAX_DISTANT_CLOUDS * DISTANT_PUFFS_PER_CLOUD,
    );
    this.distantCloudMesh.frustumCulled = false;

    for (let i = 0; i < MAX_DISTANT_CLOUDS; i++) {
      const angle = (i / MAX_DISTANT_CLOUDS) * Math.PI * 2 + 0.22;
      const radius =
        DISTANT_RING_MIN + ((i * 37) % 100) * 0.01 * (DISTANT_RING_MAX - DISTANT_RING_MIN);
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      const yaw = (i * 0.87 + 0.5) % (Math.PI * 2);
      const quat = new THREE.Quaternion().setFromAxisAngle(_UP_AXIS, yaw);
      const arch = CLOUD_ARCHETYPES[(i + 1) % CLOUD_ARCHETYPES.length];
      const cluster: CloudCluster = {
        relX: rx,
        baseY: 34 + (i % 5) * 2.6,
        relZ: rz,
        cosYaw: Math.cos(yaw),
        sinYaw: Math.sin(yaw),
        quat,
        speed: 0.35 + (i % 4) * 0.12,
        scale: 2.35 + (i % 3) * 0.55,
        bobPhase: i * 1.3,
        puffs: arch,
      };
      this.distantClouds.push(cluster);

      for (let p = 0; p < DISTANT_PUFFS_PER_CLOUD; p++) {
        const tint = cluster.puffs[p].tint;
        this._color.setRGB(tint * 0.96, tint * 0.98, 1.0);
        this.distantCloudMesh.setColorAt(i * DISTANT_PUFFS_PER_CLOUD + p, this._color);
      }
    }
    if (this.distantCloudMesh.instanceColor) {
      this.distantCloudMesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.distantCloudMesh);

    this.setCloudQuality(initialCloudQuality);
    this.updateCloudMatrices(0, 0);
  }

  public setCloudQuality(quality: CloudQuality): void {
    this.cloudQuality = quality;
    this.activeCloudCount = CLOUD_COUNTS[quality];
    this.cloudMesh.count = this.activeCloudCount * PUFFS_PER_CLOUD;

    this.activeDistantCloudCount = DISTANT_CLOUD_COUNTS[quality];
    this.distantCloudMesh.count =
      this.activeDistantCloudCount * DISTANT_PUFFS_PER_CLOUD;
    this.distantCloudMesh.visible = this.activeDistantCloudCount > 0;

    this.sunRayGroup.visible = quality !== 'low';
  }

  public update(dt: number, playerPos: THREE.Vector3, camera: THREE.Camera): void {
    this.elapsed += dt;
    this.cloudUniforms.uCloudTime.value = this.elapsed;
    this.sunRayMat.uniforms.uTime.value = this.elapsed;

    // Position glowing sun + corona + volumetric sky shafts at celestial offset
    const sunX = playerPos.x + SUN_SKY_OFFSET.x;
    const sunY = SUN_SKY_OFFSET.y;
    const sunZ = playerPos.z + SUN_SKY_OFFSET.z;

    this.sunBillboard.position.set(sunX, sunY, sunZ);
    this.sunBillboard.quaternion.copy(camera.quaternion);
    const subtleBreath = 1 + Math.sin(this.elapsed * 0.42) * 0.015;
    this.sunBillboard.scale.setScalar(subtleBreath);

    this.sunCorona.position.set(sunX, sunY, sunZ);
    this.sunCorona.quaternion.copy(camera.quaternion);
    this.sunCorona.scale.setScalar(1 + Math.cos(this.elapsed * 0.35) * 0.04);

    if (this.sunRayGroup.visible) {
      this.sunRayGroup.position.set(sunX, sunY, sunZ);
      // Attenuate rays gently based on camera alignment with the sun direction
      camera.getWorldDirection(this._camFwd);
      const sunAlign = THREE.MathUtils.clamp(
        (this._camFwd.dot(SUN_LIGHT_DIR) + 0.35) / 1.15,
        0.15,
        1.0,
      );
      const presetScale =
        this.cloudQuality === 'ultra' ? 1.15 : this.cloudQuality === 'high' ? 1.0 : 0.72;
      this.sunRayMat.uniforms.uRayAlpha.value = sunAlign * presetScale;
    }

    // Drift both cloud layers smoothly with world wrap
    const dxPlayer = playerPos.x - this.lastPlayerX;
    const dzPlayer = playerPos.z - this.lastPlayerZ;
    this.lastPlayerX = playerPos.x;
    this.lastPlayerZ = playerPos.z;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.relX += c.speed * dt - dxPlayer;
      c.relZ += c.speed * 0.18 * dt - dzPlayer;

      if (c.relX > SKY_RING_HALF) c.relX -= SKY_RING_HALF * 2;
      else if (c.relX < -SKY_RING_HALF) c.relX += SKY_RING_HALF * 2;

      if (c.relZ > SKY_RING_HALF) c.relZ -= SKY_RING_HALF * 2;
      else if (c.relZ < -SKY_RING_HALF) c.relZ += SKY_RING_HALF * 2;
    }

    if (this.activeDistantCloudCount > 0) {
      for (let i = 0; i < this.distantClouds.length; i++) {
        const c = this.distantClouds[i];
        c.relX += c.speed * dt - dxPlayer * 0.35;
        c.relZ += c.speed * 0.14 * dt - dzPlayer * 0.35;

        if (c.relX > DISTANT_RING_MAX) c.relX -= DISTANT_RING_MAX * 2;
        else if (c.relX < -DISTANT_RING_MAX) c.relX += DISTANT_RING_MAX * 2;

        if (c.relZ > DISTANT_RING_MAX) c.relZ -= DISTANT_RING_MAX * 2;
        else if (c.relZ < -DISTANT_RING_MAX) c.relZ += DISTANT_RING_MAX * 2;
      }
    }

    this.updateCloudMatrices(playerPos.x, playerPos.z);
  }

  private updateCloudMatrices(px: number, pz: number): void {
    let instanceIdx = 0;
    for (let i = 0; i < this.activeCloudCount; i++) {
      const c = this.clouds[i];
      const horizDist = Math.hypot(c.relX, c.relZ);
      const boundaryFade = 1 - smoothstep(SKY_RING_HALF - 38, SKY_RING_HALF - 4, horizDist);
      const effectiveScale = c.scale * boundaryFade;

      const bobY = Math.sin(this.elapsed * 0.45 + c.bobPhase) * 0.2;
      const cx = px + c.relX;
      const cy = c.baseY + bobY;
      const cz = pz + c.relZ;
      const cosY = c.cosYaw;
      const sinY = c.sinYaw;

      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const puff = c.puffs[p];
        const ox = puff.ox * effectiveScale;
        const oy = puff.oy * effectiveScale;
        const oz = puff.oz * effectiveScale;

        this._dummyPos.set(
          cx + ox * cosY + oz * sinY,
          cy + oy,
          cz - ox * sinY + oz * cosY,
        );
        this._dummyScale.set(
          puff.sx * effectiveScale,
          puff.sy * effectiveScale,
          puff.sz * effectiveScale,
        );
        this._dummyMat.compose(this._dummyPos, c.quat, this._dummyScale);
        this.cloudMesh.setMatrixAt(instanceIdx++, this._dummyMat);
      }
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;

    if (this.activeDistantCloudCount > 0) {
      let dIdx = 0;
      for (let i = 0; i < this.activeDistantCloudCount; i++) {
        const c = this.distantClouds[i];
        const horizDist = Math.hypot(c.relX, c.relZ);
        const fadeOut = 1 - smoothstep(DISTANT_RING_MAX - 35, DISTANT_RING_MAX - 2, horizDist);
        const fadeIn = smoothstep(55, 86, horizDist);
        const effectiveScale = c.scale * fadeOut * fadeIn;

        const bobY = Math.sin(this.elapsed * 0.28 + c.bobPhase) * 0.22;
        const cx = px + c.relX;
        const cy = c.baseY + bobY;
        const cz = pz + c.relZ;
        const cosY = c.cosYaw;
        const sinY = c.sinYaw;

        for (let p = 0; p < DISTANT_PUFFS_PER_CLOUD; p++) {
          const puff = c.puffs[p];
          const ox = puff.ox * effectiveScale;
          const oy = puff.oy * effectiveScale;
          const oz = puff.oz * effectiveScale;

          this._dummyPos.set(
            cx + ox * cosY + oz * sinY,
            cy + oy,
            cz - ox * sinY + oz * cosY,
          );
          this._dummyScale.set(
            puff.sx * effectiveScale,
            puff.sy * effectiveScale,
            puff.sz * effectiveScale,
          );
          this._dummyMat.compose(this._dummyPos, c.quat, this._dummyScale);
          this.distantCloudMesh.setMatrixAt(dIdx++, this._dummyMat);
        }
      }
      this.distantCloudMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.cloudMesh.dispose();
    this.distantCloudMesh.dispose();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
