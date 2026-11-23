import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { QualityPreset } from './graphicsSettings';

/**
 * Combined single-pass depth-based Screen-Space Ambient Occlusion +
 * depth-occluded Radial Volumetric Sun Rays shader.
 * Operates strictly in linear HDR color space before UnrealBloomPass & OutputPass.
 */
const AtmosphericPostShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCameraNear: { value: 0.15 },
    uCameraFar: { value: 360 },
    uTanHalfFov: { value: 0.4663 },
    uAspect: { value: 1.777 },
    uSunScreenPos: { value: new THREE.Vector2(0.5, 0.75) },
    uSunVisibility: { value: 0 },
    uAoStrength: { value: 0.28 },
    uRayStrength: { value: 0.18 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float uCameraNear;
    uniform float uCameraFar;
    uniform float uTanHalfFov;
    uniform float uAspect;
    uniform vec2 uSunScreenPos;
    uniform float uSunVisibility;
    uniform float uAoStrength;
    uniform float uRayStrength;
    uniform float uTime;
    varying vec2 vUv;

    float getViewZ(float depthSample) {
      float zNdc = depthSample * 2.0 - 1.0;
      return (2.0 * uCameraNear * uCameraFar) /
        (uCameraFar + uCameraNear - zNdc * (uCameraFar - uCameraNear));
    }

    vec3 getViewPos(vec2 uv, float viewZ) {
      vec2 ndc = uv * 2.0 - 1.0;
      return vec3(
        ndc.x * uAspect * uTanHalfFov * viewZ,
        ndc.y * uTanHalfFov * viewZ,
        -viewZ
      );
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float rawDepth = texture2D(tDepth, vUv).r;
      float viewZ = getViewZ(rawDepth);

      // 1. Lightweight Depth-Only Screen-Space Contact AO on geometry within 58m
      float ao = 1.0;
      if (uAoStrength > 0.001 && rawDepth < 0.9975 && viewZ < 58.0) {
        vec3 centerPos = getViewPos(vUv, viewZ);
        vec2 texel = 1.0 / max(uResolution, vec2(1.0));

        // Approximate surface normal from neighboring depth samples
        float dR = getViewZ(texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r);
        float dU = getViewZ(texture2D(tDepth, vUv + vec2(0.0, texel.y)).r);
        vec3 pR = getViewPos(vUv + vec2(texel.x, 0.0), dR);
        vec3 pU = getViewPos(vUv + vec2(0.0, texel.y), dU);
        vec3 nrm = normalize(cross(pR - centerPos, pU - centerPos));

        float radiusPx = clamp(32.0 / max(viewZ, 1.8), 4.0, 22.0);
        float rot = hash12(gl_FragCoord.xy) * 6.2831853;
        float occ = 0.0;

        // 8-tap golden-angle spiral
        const float golden = 2.3999632;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          float rNorm = (fi + 0.5) / 8.0;
          float ang = fi * golden + rot;
          vec2 offset = vec2(cos(ang), sin(ang)) * (radiusPx * rNorm) * texel;
          vec2 sUv = clamp(vUv + offset, vec2(0.002), vec2(0.998));
          float sDepth = texture2D(tDepth, sUv).r;
          float sZ = getViewZ(sDepth);
          vec3 sPos = getViewPos(sUv, sZ);
          vec3 diff = sPos - centerPos;
          float dist = length(diff);
          if (dist > 0.03 && dist < 1.65) {
            float horizon = max(0.0, dot(nrm, diff / dist) - 0.08);
            float rangeFade = 1.0 - smoothstep(0.35, 1.65, dist);
            occ += horizon * rangeFade;
          }
        }
        float distFade = 1.0 - smoothstep(28.0, 58.0, viewZ);
        float rawOcc = clamp(occ * 0.24, 0.0, 0.85) * distFade;
        ao = 1.0 - rawOcc * uAoStrength;
      }

      // Apply subtle cool-indigo tint in occluded corners instead of muddy black
      vec3 aoColor = mix(base.rgb * vec3(0.76, 0.84, 1.04), base.rgb, ao);

      // 2. Depth-Occluded Screen-Space Radial Volumetric Sun Rays
      vec3 rayAccum = vec3(0.0);
      if (uSunVisibility > 0.002 && uRayStrength > 0.001) {
        vec2 toSun = uSunScreenPos - vUv;
        float distToSun = length(toSun);
        float radialEnvelope = exp(-distToSun * 1.18) * smoothstep(1.65, 0.05, distToSun);
        if (radialEnvelope > 0.002) {
          vec2 stepUv = toSun * (0.72 / 12.0);
          float jitter = hash12(gl_FragCoord.xy + fract(uTime * 0.37));
          vec2 traceUv = vUv + stepUv * jitter;
          float illum = 1.0;
          float shaftSum = 0.0;
          for (int s = 0; s < 12; s++) {
            traceUv += stepUv;
            vec2 clampedUv = clamp(traceUv, vec2(0.001), vec2(0.999));
            float sampleD = texture2D(tDepth, clampedUv).r;
            // Sky & far horizon pass light; foreground pillars, walls & rigs cast volumetric ray shadows
            float skyMask = smoothstep(0.985, 0.9978, sampleD);
            shaftSum += skyMask * illum;
            illum *= 0.88;
          }
          shaftSum /= 5.4;
          vec3 warmSunShaft = vec3(1.0, 0.92, 0.72);
          rayAccum = warmSunShaft * shaftSum * radialEnvelope * uSunVisibility * uRayStrength;
        }
      }

      gl_FragColor = vec4(aoColor + rayAccum, base.a);
    }
  `,
};

class AtmosphericPostPass extends ShaderPass {
  constructor() {
    super(AtmosphericPostShader);
  }

  public override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime = 0,
    maskActive = false,
  ): void {
    if (this.uniforms.tDepth && readBuffer.depthTexture) {
      this.uniforms.tDepth.value = readBuffer.depthTexture;
    }
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}

export class CartoonPostPipeline {
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly atmosphericPass: AtmosphericPostPass;
  private readonly bloomPass: UnrealBloomPass;
  private readonly smaaPass: SMAAPass;
  private readonly outputPass: OutputPass;
  private readonly sunWorldPos = new THREE.Vector3();
  private readonly sunProjected = new THREE.Vector3();
  private readonly camFwd = new THREE.Vector3();

  private enabled = false;
  private disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    pixelRatio: number,
    initialPreset: QualityPreset,
    isSoftwareGl: boolean,
  ) {
    const safeW = Math.max(width, 1);
    const safeH = Math.max(height, 1);

    const depthTexture = new THREE.DepthTexture(safeW, safeH);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    const primaryRT = new THREE.WebGLRenderTarget(safeW, safeH, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      depthTexture,
    });
    primaryRT.texture.name = 'CartoonPostPrimaryRT';

    this.composer = new EffectComposer(renderer, primaryRT);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(safeW, safeH);

    this.renderPass = new RenderPass(scene, camera);
    this.atmosphericPass = new AtmosphericPostPass();
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(safeW, safeH),
      0.21,
      0.42,
      0.92,
    );
    this.smaaPass = new SMAAPass();
    this.outputPass = new OutputPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.atmosphericPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.outputPass);

    this.setSize(safeW, safeH, pixelRatio);
    this.setQuality(initialPreset, isSoftwareGl);
  }

  public get isEnabled(): boolean {
    return this.enabled && !this.disposed;
  }

  public setQuality(preset: QualityPreset, isSoftwareGl: boolean): void {
    const usePost = !isSoftwareGl && (preset === 'high' || preset === 'ultra');
    this.enabled = usePost;

    if (preset === 'ultra') {
      this.atmosphericPass.enabled = true;
      this.atmosphericPass.uniforms.uAoStrength.value = 0.34;
      this.atmosphericPass.uniforms.uRayStrength.value = 0.22;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.22;
      this.smaaPass.enabled = true;
    } else if (preset === 'high') {
      this.atmosphericPass.enabled = true;
      this.atmosphericPass.uniforms.uAoStrength.value = 0.25;
      this.atmosphericPass.uniforms.uRayStrength.value = 0.16;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.18;
      this.smaaPass.enabled = true;
    } else {
      this.atmosphericPass.enabled = false;
      this.bloomPass.enabled = false;
      this.smaaPass.enabled = false;
    }
  }

  public setSize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) return;
    const safeW = Math.max(width, 1);
    const safeH = Math.max(height, 1);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(safeW, safeH);
    this.atmosphericPass.uniforms.uResolution.value.set(
      safeW * pixelRatio,
      safeH * pixelRatio,
    );
  }

  public update(
    camera: THREE.PerspectiveCamera,
    sunDir: THREE.Vector3,
    elapsed: number,
  ): void {
    if (!this.enabled || this.disposed) return;

    const u = this.atmosphericPass.uniforms;
    u.uCameraNear.value = camera.near;
    u.uCameraFar.value = camera.far;
    u.uTanHalfFov.value = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    u.uAspect.value = camera.aspect;
    u.uTime.value = elapsed;

    // Project distant sun direction into screen UV space
    this.sunWorldPos.copy(camera.position).addScaledVector(sunDir, 180);
    this.sunProjected.copy(this.sunWorldPos).project(camera);

    camera.getWorldDirection(this.camFwd);
    const forwardDot = this.camFwd.dot(sunDir);
    const inFront = THREE.MathUtils.clamp((forwardDot + 0.15) / 0.75, 0, 1);

    if (forwardDot > -0.15) {
      u.uSunScreenPos.value.set(
        this.sunProjected.x * 0.5 + 0.5,
        this.sunProjected.y * 0.5 + 0.5,
      );
      const offscreenX = Math.max(0, Math.abs(this.sunProjected.x) - 1.0);
      const offscreenY = Math.max(0, Math.abs(this.sunProjected.y) - 1.0);
      const screenMask = Math.exp(-(offscreenX + offscreenY) * 1.4);
      u.uSunVisibility.value = inFront * screenMask;
    } else {
      u.uSunVisibility.value = 0;
    }
  }

  public render(): void {
    if (!this.enabled || this.disposed) return;
    this.composer.render();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderPass.dispose();
    this.atmosphericPass.dispose();
    this.bloomPass.dispose();
    this.smaaPass.dispose();
    this.outputPass.dispose();
    this.composer.renderTarget1.depthTexture?.dispose();
    this.composer.renderTarget2.depthTexture?.dispose();
    this.composer.dispose();
  }
}
