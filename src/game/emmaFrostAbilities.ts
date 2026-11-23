import * as THREE from 'three';
import { CombatTargetProbe } from './scarletWitchAbilities';

const softPsychicTexCache = new Map<string, THREE.CanvasTexture>();
let cachedWhiteBurstTex: THREE.CanvasTexture | null = null;
let cachedTelepathicWaveTex: THREE.CanvasTexture | null = null;

function createSoftPsychicTex(rgbaCore: string, rgbaEdge: string): THREE.CanvasTexture {
  const key = `${rgbaCore}|${rgbaEdge}`;
  const cached = softPsychicTexCache.get(key);
  if (cached) return cached;
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const g = ctx.createRadialGradient(half, half, 2, half, half, half);
  g.addColorStop(0, rgbaCore);
  g.addColorStop(0.45, rgbaEdge);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  softPsychicTexCache.set(key, tex);
  return tex;
}

/**
 * Crisp white comic/cartoon starburst impact ("💥" shape in crisp icy-white)
 * displayed around a target's head on Mental Attack impact.
 */
function createWhiteCartoonExplosionTex(): THREE.CanvasTexture {
  if (cachedWhiteBurstTex) return cachedWhiteBurstTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Soft white outer halo
  const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 56);
  bg.addColorStop(0, 'rgba(255,255,255,0.95)');
  bg.addColorStop(0.55, 'rgba(220,245,255,0.45)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Jagged spiky comic starburst silhouette
  const spikes = 12;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 54 : 24 + (i % 4) * 3;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#C9EDFF';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedWhiteBurstTex = tex;
  return tex;
}

/**
 * Circular rippling light-blue / white telepathic wave ring texture.
 */
function createTelepathicWaveRingTex(): THREE.CanvasTexture {
  if (cachedTelepathicWaveTex) return cachedTelepathicWaveTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;
  const g = ctx.createRadialGradient(cx, cy, 18, cx, cy, 62);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(175,232,255,0.18)');
  g.addColorStop(0.76, 'rgba(225,248,255,0.92)');
  g.addColorStop(0.88, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.96, 'rgba(155,224,255,0.35)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedTelepathicWaveTex = tex;
  return tex;
}

interface MentalWindBolt {
  sprite: THREE.Sprite;
  trail: THREE.Sprite[];
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetId: string | null;
  age: number;
  maxAge: number;
  onArrive: () => void;
}

interface HeadStarburst {
  sprite: THREE.Sprite;
  age: number;
  life: number;
}

interface DiamondProjectile {
  mesh: THREE.Mesh;
  halo: THREE.Sprite;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  hitIds: Set<string>;
}

interface CrystalShardParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  life: number;
}

interface TelepathicWaveRing {
  sprite: THREE.Sprite;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
}

/**
 * Generates 3-4 delicate expanding white / light-blue circular psychic rings
 * emanating from Emma Frost's forehead during her refined idle pose.
 */
export class EmmaIdleForeheadRings {
  public readonly group = new THREE.Group();
  private readonly ringGeo = new THREE.RingGeometry(0.78, 1.0, 28);
  private readonly rings: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    age: number;
    life: number;
    origin: THREE.Vector3;
    dir: THREE.Vector3;
    active: boolean;
  }> = [];
  private emitTimer = 0.25;
  private readonly _tmpQuat = new THREE.Quaternion();
  private readonly _zAxis = new THREE.Vector3(0, 0, 1);

  constructor(ringCount = 4) {
    for (let i = 0; i < ringCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xeef9ff : 0x9ee2ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({
        mesh,
        mat,
        age: 0,
        life: 1.55,
        origin: new THREE.Vector3(),
        dir: new THREE.Vector3(0, 0, -1),
        active: false,
      });
    }
  }

  public update(
    dt: number,
    active: boolean,
    foreheadPos: THREE.Vector3,
    foreheadForward: THREE.Vector3,
  ): void {
    const safeDt = Math.min(dt, 0.05);

    if (active) {
      this.emitTimer -= safeDt;
      if (this.emitTimer <= 0) {
        this.emitTimer = 0.42;
        for (let i = 0; i < this.rings.length; i++) {
          const r = this.rings[i];
          if (!r.active) {
            r.active = true;
            r.age = 0;
            r.origin.copy(foreheadPos);
            r.dir.copy(foreheadForward).normalize();
            r.mesh.visible = true;
            break;
          }
        }
      }
    }

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.age += safeDt;
      const t = r.age / r.life;
      if (t >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }

      // Gently drift outward from forehead and expand cleanly
      r.mesh.position.copy(r.origin).addScaledVector(r.dir, t * 0.42);
      this._tmpQuat.setFromUnitVectors(this._zAxis, r.dir);
      r.mesh.quaternion.copy(this._tmpQuat);

      const radius = THREE.MathUtils.lerp(0.06, 0.36, 1 - Math.pow(1 - t, 2));
      r.mesh.scale.setScalar(radius);

      const envelope = Math.sin(t * Math.PI);
      r.mat.opacity = envelope * (active ? 0.48 : 0.24);
    }
  }

  public clear(): void {
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
  }

  public dispose(): void {
    this.clear();
    this.ringGeo.dispose();
    for (const r of this.rings) {
      r.mat.dispose();
    }
  }
}

export class EmmaFrostVfxSystem {
  public readonly group = new THREE.Group();

  private readonly psychicWispTex: THREE.CanvasTexture;
  private readonly whiteBurstTex: THREE.CanvasTexture;
  private readonly waveRingTex: THREE.CanvasTexture;

  private readonly diamondGeo = new THREE.OctahedronGeometry(0.18, 0);
  private readonly shardGeo = new THREE.OctahedronGeometry(0.08, 0);

  // Mind Control connecting psychic beam between Emma forehead & target head
  private readonly mcBeamGroup = new THREE.Group();
  private readonly mcBeamCore: THREE.Mesh;
  private readonly mcBeamOuter: THREE.Mesh;
  private readonly mcOriginFlare: THREE.Sprite;
  private readonly mcTargetFlare: THREE.Sprite;
  private mcBeamActive = false;
  private time = 0;

  private readonly mentalBolts: MentalWindBolt[] = [];
  private readonly starbursts: HeadStarburst[] = [];
  private readonly diamondProjectiles: DiamondProjectile[] = [];
  private readonly shardParticles: CrystalShardParticle[] = [];
  private readonly waveRings: TelepathicWaveRing[] = [];

  private readonly _tmpVec = new THREE.Vector3();
  private readonly _tmpDir = new THREE.Vector3();

  constructor() {
    this.psychicWispTex = createSoftPsychicTex(
      'rgba(255,255,255,0.96)',
      'rgba(170,228,255,0.52)',
    );
    this.whiteBurstTex = createWhiteCartoonExplosionTex();
    this.waveRingTex = createTelepathicWaveRingTex();

    // Sleek Mind Control Beam along +Z from origin (0 -> 1)
    const coreGeo = new THREE.CylinderGeometry(0.032, 0.032, 1, 10);
    coreGeo.rotateX(Math.PI * 0.5);
    coreGeo.translate(0, 0, 0.5);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mcBeamCore = new THREE.Mesh(coreGeo, coreMat);

    const outerGeo = new THREE.CylinderGeometry(0.092, 0.092, 1, 12);
    outerGeo.rotateX(Math.PI * 0.5);
    outerGeo.translate(0, 0, 0.5);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x9ae4ff,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mcBeamOuter = new THREE.Mesh(outerGeo, outerMat);

    this.mcOriginFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.psychicWispTex,
        color: 0xe6f8ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.mcOriginFlare.scale.setScalar(0.42);

    this.mcTargetFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.psychicWispTex,
        color: 0xbceeff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.mcTargetFlare.scale.setScalar(0.68);

    this.mcBeamGroup.add(
      this.mcBeamCore,
      this.mcBeamOuter,
      this.mcOriginFlare,
      this.mcTargetFlare,
    );
    this.mcBeamGroup.visible = false;
    this.group.add(this.mcBeamGroup);
  }

  public setMindControlBeam(
    active: boolean,
    fromForeheadPos?: THREE.Vector3,
    toTargetHeadPos?: THREE.Vector3,
  ): void {
    this.mcBeamActive = active;
    this.mcBeamGroup.visible = active;
    if (!active || !fromForeheadPos || !toTargetHeadPos) return;

    this._tmpDir.subVectors(toTargetHeadPos, fromForeheadPos);
    const len = Math.max(0.15, this._tmpDir.length());
    const pulse = 1 + Math.sin(this.time * 24) * 0.14;

    this.mcOriginFlare.position.copy(fromForeheadPos);
    this.mcOriginFlare.scale.setScalar(0.42 * pulse);

    this.mcTargetFlare.position.copy(toTargetHeadPos);
    this.mcTargetFlare.scale.setScalar(0.72 * pulse);

    this.mcBeamCore.position.copy(fromForeheadPos);
    this.mcBeamCore.lookAt(toTargetHeadPos);
    this.mcBeamCore.scale.set(pulse, pulse, len);

    this.mcBeamOuter.position.copy(fromForeheadPos);
    this.mcBeamOuter.lookAt(toTargetHeadPos);
    this.mcBeamOuter.scale.set(pulse * 1.15, pulse * 1.15, len);
  }

  public spawnMentalAttack(
    foreheadPos: THREE.Vector3,
    targetHeadPos: THREE.Vector3,
    targetId: string | null,
    onArrive: () => void,
  ): void {
    const mat = new THREE.SpriteMaterial({
      map: this.psychicWispTex,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.95,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(foreheadPos);
    sp.scale.set(0.75, 0.36, 1);
    this.group.add(sp);

    const trail: THREE.Sprite[] = [];
    for (let i = 0; i < 5; i++) {
      const tMat = new THREE.SpriteMaterial({
        map: this.psychicWispTex,
        color: 0xe6f8ff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.7 - i * 0.11,
      });
      const tsp = new THREE.Sprite(tMat);
      tsp.position.copy(foreheadPos);
      tsp.scale.set(0.62 - i * 0.08, 0.28 - i * 0.03, 1);
      this.group.add(tsp);
      trail.push(tsp);
    }

    const dir = this._tmpDir.copy(targetHeadPos).sub(foreheadPos);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    this.mentalBolts.push({
      sprite: sp,
      trail,
      pos: foreheadPos.clone(),
      vel: dir.clone().multiplyScalar(32),
      targetPos: targetHeadPos.clone(),
      targetId,
      age: 0,
      maxAge: 0.65,
      onArrive,
    });
  }

  public spawnMentalHeadExplosion(headPos: THREE.Vector3): void {
    const mat = new THREE.SpriteMaterial({
      map: this.whiteBurstTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      opacity: 1,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(headPos);
    sp.scale.setScalar(1.35);
    this.group.add(sp);
    this.starbursts.push({
      sprite: sp,
      age: 0,
      life: 0.38,
    });
  }

  public spawnDiamondProjectile(
    origin: THREE.Vector3,
    targetPoint: THREE.Vector3,
  ): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeaf8ff,
      roughness: 0.06,
      metalness: 0.65,
      emissive: 0x8cd6ff,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(this.diamondGeo, mat);
    mesh.position.copy(origin);
    mesh.scale.set(0.75, 1.45, 0.75);

    const haloMat = new THREE.SpriteMaterial({
      map: this.psychicWispTex,
      color: 0xd9f4ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.65,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.62);
    mesh.add(halo);
    this.group.add(mesh);

    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    this.diamondProjectiles.push({
      mesh,
      halo,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(28),
      age: 0,
      maxAge: 1.6,
      hitIds: new Set(),
    });
  }

  private spawnCrystalBurst(pos: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xdcf4ff,
        roughness: 0.08,
        metalness: 0.5,
        emissive: 0x7fd4ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(this.shardGeo, mat);
      mesh.position.copy(pos);
      this.group.add(mesh);
      const a = (i / 8) * Math.PI * 2;
      this.shardParticles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(a) * (3.2 + Math.random() * 2.2),
          1.4 + Math.random() * 2.2,
          Math.sin(a) * (3.2 + Math.random() * 2.2),
        ),
        age: 0,
        life: 0.42,
      });
    }
  }

  public spawnTelepathicWaveRing(
    foreheadPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
  ): void {
    const mat = new THREE.SpriteMaterial({
      map: this.waveRingTex,
      color: 0xdff6ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.92,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(foreheadPos);
    sp.scale.setScalar(0.45);
    this.group.add(sp);

    this.waveRings.push({
      sprite: sp,
      pos: foreheadPos.clone(),
      vel: forwardDir.clone().normalize().multiplyScalar(9.8),
      age: 0,
      life: 0.78,
    });
  }

  public update(
    dt: number,
    targets: ReadonlyArray<CombatTargetProbe>,
    onDiamondHit: (targetId: string, hitDir: THREE.Vector3) => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;

    if (this.mcBeamActive) {
      (this.mcBeamOuter.material as THREE.MeshBasicMaterial).opacity =
        0.44 + Math.sin(this.time * 18) * 0.12;
    }

    // 1. Mental Attack wind bolts
    for (let i = this.mentalBolts.length - 1; i >= 0; i--) {
      const b = this.mentalBolts[i];
      b.age += safeDt;
      const stepDist = b.vel.length() * safeDt;
      this._tmpVec.copy(b.targetPos).sub(b.pos);
      const dist = this._tmpVec.length();

      for (let t = b.trail.length - 1; t > 0; t--) {
        b.trail[t].position.lerp(b.trail[t - 1].position, 0.65);
      }
      b.trail[0].position.copy(b.pos);

      if (dist <= stepDist + 0.28 || b.age >= b.maxAge) {
        b.onArrive();
        this.group.remove(b.sprite);
        (b.sprite.material as THREE.Material).dispose();
        for (const tsp of b.trail) {
          this.group.remove(tsp);
          (tsp.material as THREE.Material).dispose();
        }
        this.mentalBolts.splice(i, 1);
      } else {
        this._tmpVec.normalize();
        b.pos.addScaledVector(this._tmpVec, stepDist);
        b.sprite.position.copy(b.pos);
        const wisp = 1 + Math.sin(this.time * 28 + i) * 0.14;
        b.sprite.scale.set(0.75 * wisp, 0.36 * wisp, 1);
      }
    }

    // 2. White cartoon starburst head explosions
    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      const sb = this.starbursts[i];
      sb.age += safeDt;
      const t = THREE.MathUtils.clamp(sb.age / sb.life, 0, 1);
      const scale =
        t < 0.25
          ? THREE.MathUtils.lerp(0.45, 1.52, t / 0.25)
          : THREE.MathUtils.lerp(1.52, 1.9, (t - 0.25) / 0.75);
      sb.sprite.scale.setScalar(scale);
      const mat = sb.sprite.material as THREE.SpriteMaterial;
      mat.opacity = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      mat.rotation = t * 0.5;
      if (sb.age >= sb.life) {
        this.group.remove(sb.sprite);
        mat.dispose();
        this.starbursts.splice(i, 1);
      }
    }

    // 3. Diamond Form crystal projectiles
    for (let i = this.diamondProjectiles.length - 1; i >= 0; i--) {
      const dp = this.diamondProjectiles[i];
      dp.age += safeDt;
      dp.pos.addScaledVector(dp.vel, safeDt);
      dp.mesh.position.copy(dp.pos);
      dp.mesh.rotation.x += safeDt * 12;
      dp.mesh.rotation.y += safeDt * 15;

      let done = dp.age >= dp.maxAge || dp.pos.y <= 0.08;
      if (!done) {
        for (let k = 0; k < targets.length; k++) {
          const trg = targets[k];
          if (dp.hitIds.has(trg.id)) continue;
          const dx = dp.pos.x - trg.position.x;
          const dz = dp.pos.z - trg.position.z;
          const dy = dp.pos.y - (trg.position.y + trg.height * 0.56);
          const hitR = trg.radius + 0.34;
          if (dx * dx + dz * dz <= hitR * hitR && Math.abs(dy) <= trg.height * 0.65) {
            dp.hitIds.add(trg.id);
            this._tmpDir.copy(dp.vel).setY(0).normalize();
            onDiamondHit(trg.id, this._tmpDir);
            this.spawnCrystalBurst(dp.pos);
            done = true;
            break;
          }
        }
      } else if (dp.pos.y <= 0.08) {
        this.spawnCrystalBurst(dp.pos);
      }

      if (done) {
        this.group.remove(dp.mesh);
        (dp.mesh.material as THREE.Material).dispose();
        (dp.halo.material as THREE.Material).dispose();
        this.diamondProjectiles.splice(i, 1);
      }
    }

    // 4. Crystal impact shards
    for (let i = this.shardParticles.length - 1; i >= 0; i--) {
      const sp = this.shardParticles[i];
      sp.age += safeDt;
      sp.vel.y -= 11 * safeDt;
      sp.mesh.position.addScaledVector(sp.vel, safeDt);
      sp.mesh.rotation.x += safeDt * 9;
      sp.mesh.rotation.z += safeDt * 7;
      const t = sp.age / sp.life;
      sp.mesh.scale.setScalar(1 - t * 0.75);
      const mat = sp.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.9 * (1 - t);
      if (sp.age >= sp.life) {
        this.group.remove(sp.mesh);
        mat.dispose();
        this.shardParticles.splice(i, 1);
      }
    }

    // 5. Forehead telepathic circular wave rings
    for (let i = this.waveRings.length - 1; i >= 0; i--) {
      const wr = this.waveRings[i];
      wr.age += safeDt;
      const t = THREE.MathUtils.clamp(wr.age / wr.life, 0, 1);
      wr.pos.addScaledVector(wr.vel, safeDt);
      wr.sprite.position.copy(wr.pos);
      wr.sprite.scale.setScalar(THREE.MathUtils.lerp(0.45, 3.25, t));
      const mat = wr.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(t * Math.PI) * 0.72;
      if (wr.age >= wr.life) {
        this.group.remove(wr.sprite);
        mat.dispose();
        this.waveRings.splice(i, 1);
      }
    }
  }

  public clearActiveEffects(): void {
    this.setMindControlBeam(false);
    for (const b of this.mentalBolts) {
      this.group.remove(b.sprite);
      (b.sprite.material as THREE.Material).dispose();
      for (const tsp of b.trail) {
        this.group.remove(tsp);
        (tsp.material as THREE.Material).dispose();
      }
    }
    this.mentalBolts.length = 0;

    for (const sb of this.starbursts) {
      this.group.remove(sb.sprite);
      (sb.sprite.material as THREE.Material).dispose();
    }
    this.starbursts.length = 0;

    for (const dp of this.diamondProjectiles) {
      this.group.remove(dp.mesh);
      (dp.mesh.material as THREE.Material).dispose();
      (dp.halo.material as THREE.Material).dispose();
    }
    this.diamondProjectiles.length = 0;

    for (const sp of this.shardParticles) {
      this.group.remove(sp.mesh);
      (sp.mesh.material as THREE.Material).dispose();
    }
    this.shardParticles.length = 0;

    for (const wr of this.waveRings) {
      this.group.remove(wr.sprite);
      (wr.sprite.material as THREE.Material).dispose();
    }
    this.waveRings.length = 0;
  }

  public dispose(): void {
    this.clearActiveEffects();
    this.mcBeamCore.geometry.dispose();
    (this.mcBeamCore.material as THREE.Material).dispose();
    this.mcBeamOuter.geometry.dispose();
    (this.mcBeamOuter.material as THREE.Material).dispose();
    (this.mcOriginFlare.material as THREE.Material).dispose();
    (this.mcTargetFlare.material as THREE.Material).dispose();
    this.diamondGeo.dispose();
    this.shardGeo.dispose();
  }
}
