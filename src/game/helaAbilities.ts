import * as THREE from 'three';
import { buildNecroswordGroup, NecroswordRig } from './necrosword';
import { CombatTargetProbe } from './scarletWitchAbilities';

let cachedGreenCloudTex: THREE.CanvasTexture | null = null;
let cachedGreenCoreTex: THREE.CanvasTexture | null = null;

function createGreenCloudTex(): THREE.CanvasTexture {
  if (cachedGreenCloudTex) return cachedGreenCloudTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const g = ctx.createRadialGradient(half, half, 4, half, half, half);
  g.addColorStop(0.0, 'rgba(130, 255, 165, 0.92)');
  g.addColorStop(0.38, 'rgba(38, 212, 95, 0.68)');
  g.addColorStop(0.75, 'rgba(12, 98, 46, 0.28)');
  g.addColorStop(1.0, 'rgba(4, 30, 14, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGreenCloudTex = tex;
  return tex;
}

function createGreenCoreTex(): THREE.CanvasTexture {
  if (cachedGreenCoreTex) return cachedGreenCoreTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const g = ctx.createRadialGradient(half, half, 2, half, half, half);
  g.addColorStop(0.0, 'rgba(235, 255, 240, 1.0)');
  g.addColorStop(0.28, 'rgba(85, 255, 130, 0.92)');
  g.addColorStop(0.64, 'rgba(18, 176, 74, 0.45)');
  g.addColorStop(1.0, 'rgba(4, 40, 16, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGreenCoreTex = tex;
  return tex;
}

interface ThrownSwordInstance {
  rig: NecroswordRig;
  trailSprites: THREE.Sprite[];
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  age: number;
  maxAge: number;
  hitIds: Set<string>;
}

interface EmbeddedSwordInstance {
  rig: NecroswordRig;
  targetId: string | null;
  localOffset: THREE.Vector3;
  baseYaw: number;
  baseQuat: THREE.Quaternion;
  age: number;
  life: number;
}

interface SlashArcInstance {
  group: THREE.Group;
  rings: THREE.Mesh[];
  age: number;
  life: number;
}

interface GreenSmokeCloud {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  startScale: number;
  endScale: number;
}

interface GreenExplosionInstance {
  group: THREE.Group;
  ringA: THREE.Mesh;
  ringB: THREE.Mesh;
  dome: THREE.Mesh;
  core: THREE.Sprite;
  clouds: GreenSmokeCloud[];
  age: number;
  life: number;
  maxRadius: number;
}

interface GroundSwordInstance {
  rig: NecroswordRig;
  auraRing: THREE.Mesh;
  smokeSprites: THREE.Sprite[];
  baseY: number;
  peakY: number;
  age: number;
  life: number;
}

export class HelaVfxSystem {
  public readonly group = new THREE.Group();

  private readonly greenCloudTex: THREE.CanvasTexture;
  private readonly greenCoreTex: THREE.CanvasTexture;
  private readonly ringGeo = new THREE.RingGeometry(0.76, 1.0, 36);
  private readonly slashArcGeo = new THREE.RingGeometry(0.72, 1.48, 18, 1, -1.05, 2.1);
  private readonly domeGeo = new THREE.SphereGeometry(1, 22, 16);

  // Swirling green energy gathering sphere on raised right hand before Green Explosion slam
  private readonly gatherGroup = new THREE.Group();
  private readonly gatherCore: THREE.Sprite;
  private readonly gatherWisps: THREE.Sprite[] = [];
  private gatherTime = 0;

  private readonly thrownSwords: ThrownSwordInstance[] = [];
  private readonly embeddedSwords: EmbeddedSwordInstance[] = [];
  private readonly slashArcs: SlashArcInstance[] = [];
  private readonly explosions: GreenExplosionInstance[] = [];
  private readonly groundSwords: GroundSwordInstance[] = [];

  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpNpcPos = new THREE.Vector3();
  private readonly _tmpOffset = new THREE.Vector3();
  private readonly _tmpEntryPos = new THREE.Vector3();
  private readonly _tmpEmbedDir = new THREE.Vector3();
  private readonly _tmpAxisY = new THREE.Vector3(0, 1, 0);
  private readonly _tmpDeltaQuat = new THREE.Quaternion();

  constructor() {
    this.greenCloudTex = createGreenCloudTex();
    this.greenCoreTex = createGreenCoreTex();
    this.ringGeo.rotateX(-Math.PI / 2);

    this.gatherCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.greenCoreTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95,
      }),
    );
    this.gatherCore.scale.setScalar(0.72);
    this.gatherGroup.add(this.gatherCore);

    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.greenCloudTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.78,
        }),
      );
      sp.scale.setScalar(0.36);
      this.gatherGroup.add(sp);
      this.gatherWisps.push(sp);
    }
    this.gatherGroup.visible = false;
    this.group.add(this.gatherGroup);
  }

  public updateHandGather(
    dt: number,
    active: boolean,
    worldPos: THREE.Vector3 | null,
    chargeRatio: number,
  ): void {
    if (!active || !worldPos) {
      this.gatherGroup.visible = false;
      return;
    }
    this.gatherGroup.visible = true;
    this.gatherTime += Math.min(dt, 0.05);
    this.gatherGroup.position.copy(worldPos);
    const scale = 0.45 + chargeRatio * 0.95;
    this.gatherCore.scale.setScalar(scale * (1 + Math.sin(this.gatherTime * 22) * 0.1));

    for (let i = 0; i < this.gatherWisps.length; i++) {
      const a = this.gatherTime * 8.5 + (i / this.gatherWisps.length) * Math.PI * 2;
      const r = (1 - chargeRatio * 0.65) * 0.58 + 0.14;
      this.gatherWisps[i].position.set(
        Math.cos(a) * r,
        Math.sin(a * 1.4) * r * 0.7,
        Math.sin(a) * r,
      );
    }
  }

  public spawnThrownSword(
    origin: THREE.Vector3,
    targetPoint: THREE.Vector3,
    damage: number,
  ): void {
    const rig = buildNecroswordGroup('standard');
    const dir = this._tmpDir.copy(targetPoint).sub(origin);
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    else dir.normalize();

    rig.group.position.copy(origin);
    // Align sword +Y axis with velocity vector
    rig.group.quaternion.setFromUnitVectors(this._tmpAxisY, dir);
    this.group.add(rig.group);

    const trailSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.greenCoreTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.62 - i * 0.12,
        }),
      );
      sp.position.copy(origin);
      sp.scale.setScalar(0.34 - i * 0.05);
      this.group.add(sp);
      trailSprites.push(sp);
    }

    this.thrownSwords.push({
      rig,
      trailSprites,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(32),
      damage,
      age: 0,
      maxAge: 1.5,
      hitIds: new Set(),
    });
  }

  private spawnEmbeddedSword(
    targetId: string | null,
    entryPos: THREE.Vector3,
    npcPos: THREE.Vector3 | null,
    npcYaw: number,
    travelDir: THREE.Vector3,
  ): void {
    const rig = buildNecroswordGroup('standard');
    const dirNorm = this._tmpEmbedDir.copy(travelDir).normalize();
    const baseQuat = new THREE.Quaternion().setFromUnitVectors(this._tmpAxisY, dirNorm);
    rig.group.quaternion.copy(baseQuat);

    // Tip sits at +1.54 local +Y, pommel at -0.24: offset -1.28 along dir so only tip penetrates,
    // leaving >85% of blade, crossguard & hilt cleanly visible outside the surface.
    rig.group.position.copy(entryPos).addScaledVector(dirNorm, -1.28);
    this.group.add(rig.group);

    const localOffset = npcPos
      ? rig.group.position.clone().sub(npcPos)
      : new THREE.Vector3();

    this.embeddedSwords.push({
      rig,
      targetId,
      localOffset,
      baseYaw: npcYaw,
      baseQuat,
      age: 0,
      life: targetId ? 1.3 : 1.0,
    });
  }

  public spawnSwordSlashTrail(
    origin: THREE.Vector3,
    forward: THREE.Vector3,
    kind: 'right' | 'left' | 'dual',
  ): void {
    const grp = new THREE.Group();
    grp.position.copy(origin);
    const yaw = Math.atan2(forward.x, forward.z);
    grp.rotation.y = yaw + Math.PI;

    const rings: THREE.Mesh[] = [];
    const tilts =
      kind === 'right' ? [-0.38] : kind === 'left' ? [0.38] : [-0.42, 0.42];
    for (const roll of tilts) {
      const mesh = new THREE.Mesh(
        this.slashArcGeo,
        new THREE.MeshBasicMaterial({
          color: 0x4bff8e,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.rotation.x = Math.PI * 0.5;
      mesh.rotation.y = roll;
      grp.add(mesh);
      rings.push(mesh);
    }

    this.group.add(grp);
    this.slashArcs.push({
      group: grp,
      rings,
      age: 0,
      life: 0.24,
    });
  }

  public spawnGreenExplosion(center: THREE.Vector3, maxRadius = 7.5): void {
    const grp = new THREE.Group();
    grp.position.set(center.x, 0.06, center.z);

    const ringA = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x3cff7a,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const ringB = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x16a846,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ringB.position.y = 0.25;

    const dome = new THREE.Mesh(
      this.domeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x26e664,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    dome.position.y = 0.4;

    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.greenCoreTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 1,
      }),
    );
    core.position.y = 1.1;
    core.scale.setScalar(4.8);

    const clouds: GreenSmokeCloud[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + Math.random() * 0.22;
      const radial = 2.6 + Math.random() * 5.8;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.greenCloudTex,
          color: i % 3 === 0 ? 0x6dff98 : i % 3 === 1 ? 0x1db854 : 0x0b5e29,
          transparent: true,
          depthWrite: false,
          blending: i % 2 === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: 0.85,
        }),
      );
      sp.position.set(Math.cos(a) * 0.4, 0.35 + Math.random() * 0.65, Math.sin(a) * 0.4);
      grp.add(sp);
      clouds.push({
        sprite: sp,
        vel: new THREE.Vector3(
          Math.cos(a) * radial,
          1.2 + Math.random() * 3.4,
          Math.sin(a) * radial,
        ),
        startScale: 1.4 + Math.random() * 0.8,
        endScale: 3.4 + Math.random() * 1.6,
      });
    }

    grp.add(ringA, ringB, dome, core);
    this.group.add(grp);

    this.explosions.push({
      group: grp,
      ringA,
      ringB,
      dome,
      core,
      clouds,
      age: 0,
      life: 1.05,
      maxRadius,
    });
  }

  public spawnGroundSword(center: THREE.Vector3): void {
    const rig = buildNecroswordGroup('giant');
    const baseY = -4.8;
    const peakY = -0.35;
    rig.group.position.set(center.x, baseY, center.z);
    // Slight menacing tilt
    rig.group.rotation.set(0.05, Math.random() * Math.PI * 2, -0.05);
    this.group.add(rig.group);

    const auraRing = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x3ce66b,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    auraRing.position.set(center.x, 0.05, center.z);
    auraRing.scale.setScalar(2.8);
    this.group.add(auraRing);

    const smokeSprites: THREE.Sprite[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.greenCloudTex,
          color: 0x2de065,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.72,
        }),
      );
      sp.position.set(center.x + Math.cos(a) * 0.85, 0.4, center.z + Math.sin(a) * 0.85);
      sp.scale.setScalar(1.35);
      this.group.add(sp);
      smokeSprites.push(sp);
    }

    this.groundSwords.push({
      rig,
      auraRing,
      smokeSprites,
      baseY,
      peakY,
      age: 0,
      life: 1.35,
    });
  }

  public update(
    dt: number,
    targets: ReadonlyArray<CombatTargetProbe>,
    getNpcPose: (
      targetId: string,
      outPos: THREE.Vector3,
    ) => { alive: boolean; facingYaw: number },
    onSwordHit: (
      targetId: string,
      damage: number,
      hitDir: THREE.Vector3,
      hitPos: THREE.Vector3,
    ) => void,
  ): void {
    const safeDt = Math.min(dt, 0.05);

    // 1. Thrown Necroswords
    for (let i = this.thrownSwords.length - 1; i >= 0; i--) {
      const ts = this.thrownSwords[i];
      ts.age += safeDt;
      ts.pos.addScaledVector(ts.vel, safeDt);
      ts.rig.group.position.copy(ts.pos);
      ts.rig.group.rotateY(safeDt * 18);

      for (let t = ts.trailSprites.length - 1; t > 0; t--) {
        ts.trailSprites[t].position.lerp(ts.trailSprites[t - 1].position, 0.65);
      }
      ts.trailSprites[0].position.copy(ts.pos);

      let done = ts.age >= ts.maxAge || ts.pos.y <= 0.14;
      let hitNpc = false;
      if (!done) {
        for (let k = 0; k < targets.length; k++) {
          const trg = targets[k];
          if (ts.hitIds.has(trg.id)) continue;
          const dx = ts.pos.x - trg.position.x;
          const dz = ts.pos.z - trg.position.z;
          const dy = ts.pos.y - (trg.position.y + trg.height * 0.56);
          const hitR = trg.radius + 0.36;
          if (dx * dx + dz * dz <= hitR * hitR && Math.abs(dy) <= trg.height * 0.68) {
            ts.hitIds.add(trg.id);
            this._tmpDir.copy(ts.vel).setY(0);
            if (this._tmpDir.lengthSq() > 1e-5) this._tmpDir.normalize();
            else this._tmpDir.set(0, 0, -1);

            const pose = getNpcPose(trg.id, this._tmpNpcPos);
            onSwordHit(trg.id, ts.damage, this._tmpDir, ts.pos);

            // Project surface entry onto target outer perimeter so full hilt & blade protrude visibly
            const surfX = ts.pos.x - trg.position.x;
            const surfZ = ts.pos.z - trg.position.z;
            const surfLen = Math.hypot(surfX, surfZ);
            const rScale = surfLen > 0.001 ? (trg.radius * 0.9) / surfLen : 0;
            const entryPos = this._tmpEntryPos.set(
              trg.position.x + surfX * rScale,
              THREE.MathUtils.clamp(ts.pos.y, trg.position.y + 0.42, trg.position.y + trg.height * 0.88),
              trg.position.z + surfZ * rScale,
            );

            this.spawnEmbeddedSword(
              trg.id,
              entryPos,
              this._tmpNpcPos,
              pose.facingYaw,
              ts.vel,
            );
            hitNpc = true;
            done = true;
            break;
          }
        }
      }

      if (done && !hitNpc && ts.pos.y <= 0.14) {
        // Embed blade tip cleanly at ground impact surface
        const floorEntry = this._tmpEntryPos.set(ts.pos.x, 0.02, ts.pos.z);
        const dir = this._tmpDir.copy(ts.vel);
        if (dir.y > -0.25) dir.y = -0.35;
        this.spawnEmbeddedSword(null, floorEntry, null, 0, dir);
      }

      if (done) {
        this.group.remove(ts.rig.group);
        ts.rig.dispose();
        for (const sp of ts.trailSprites) {
          this.group.remove(sp);
          (sp.material as THREE.Material).dispose();
        }
        this.thrownSwords.splice(i, 1);
      }
    }

    // 2. Embedded Necroswords attached cleanly to moving/turning targets or surface before fading out
    for (let i = this.embeddedSwords.length - 1; i >= 0; i--) {
      const es = this.embeddedSwords[i];
      es.age += safeDt;
      if (es.targetId) {
        const pose = getNpcPose(es.targetId, this._tmpNpcPos);
        const deltaYaw = pose.facingYaw - es.baseYaw;
        this._tmpOffset.copy(es.localOffset).applyAxisAngle(this._tmpAxisY, deltaYaw);
        es.rig.group.position.copy(this._tmpNpcPos).add(this._tmpOffset);
        this._tmpDeltaQuat.setFromAxisAngle(this._tmpAxisY, deltaYaw);
        es.rig.group.quaternion.copy(this._tmpDeltaQuat).multiply(es.baseQuat);
      }
      if (es.age > es.life - 0.18) {
        const shrink = THREE.MathUtils.clamp((es.life - es.age) / 0.18, 0.05, 1);
        es.rig.group.scale.setScalar(shrink);
      }
      if (es.age >= es.life) {
        this.group.remove(es.rig.group);
        es.rig.dispose();
        this.embeddedSwords.splice(i, 1);
      }
    }

    // 2b. Subtle emerald close-range sword slash trails
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const sa = this.slashArcs[i];
      sa.age += safeDt;
      const t = THREE.MathUtils.clamp(sa.age / sa.life, 0, 1);
      const scale = THREE.MathUtils.lerp(0.88, 1.24, 1 - (1 - t) * (1 - t));
      sa.group.scale.setScalar(scale);
      for (const r of sa.rings) {
        (r.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.68;
      }
      if (sa.age >= sa.life) {
        this.group.remove(sa.group);
        for (const r of sa.rings) {
          (r.material as THREE.Material).dispose();
        }
        this.slashArcs.splice(i, 1);
      }
    }

    // 3. Massive Green Explosions & billowing green smoke clouds
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.age += safeDt;
      const t = THREE.MathUtils.clamp(exp.age / exp.life, 0, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const radiusNow = THREE.MathUtils.lerp(0.6, exp.maxRadius, easeOut);
      const fade = 1 - t;

      exp.ringA.scale.setScalar(radiusNow);
      (exp.ringA.material as THREE.MeshBasicMaterial).opacity = 0.92 * fade;
      exp.ringB.scale.setScalar(radiusNow * 0.86);
      (exp.ringB.material as THREE.MeshBasicMaterial).opacity = 0.72 * fade * fade;
      exp.dome.scale.setScalar(radiusNow * 0.78);
      (exp.dome.material as THREE.MeshBasicMaterial).opacity = 0.28 * fade * fade;

      exp.core.scale.setScalar(4.8 * (1 + easeOut * 0.45));
      (exp.core.material as THREE.SpriteMaterial).opacity = 0.96 * fade * fade;

      for (const c of exp.clouds) {
        c.sprite.position.addScaledVector(c.vel, safeDt);
        c.vel.multiplyScalar(Math.exp(-2.8 * safeDt));
        c.sprite.scale.setScalar(THREE.MathUtils.lerp(c.startScale, c.endScale, easeOut));
        (c.sprite.material as THREE.SpriteMaterial).opacity = 0.78 * (1 - t * t);
      }

      if (exp.age >= exp.life) {
        this.group.remove(exp.group);
        exp.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
            (obj.material as THREE.Material).dispose();
          }
        });
        this.explosions.splice(i, 1);
      }
    }

    // 4. Giant Ground Necroswords erupting & retracting smoothly
    for (let i = this.groundSwords.length - 1; i >= 0; i--) {
      const gs = this.groundSwords[i];
      gs.age += safeDt;
      const t = THREE.MathUtils.clamp(gs.age / gs.life, 0, 1);

      let y = gs.baseY;
      if (t < 0.18) {
        const k = t / 0.18;
        const ease = 1 - Math.pow(1 - k, 3);
        y = THREE.MathUtils.lerp(gs.baseY, gs.peakY, ease);
      } else if (t < 0.78) {
        y = gs.peakY;
      } else {
        const k = (t - 0.78) / 0.22;
        y = THREE.MathUtils.lerp(gs.peakY, gs.baseY - 1.2, k * k);
      }
      gs.rig.group.position.y = y;

      const auraFade = t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);
      (gs.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.78 * auraFade;
      gs.auraRing.scale.setScalar(2.4 + Math.min(1, t * 4) * 0.95);

      for (const sp of gs.smokeSprites) {
        sp.position.y += safeDt * 1.2;
        sp.scale.addScalar(safeDt * 0.95);
        (sp.material as THREE.SpriteMaterial).opacity = 0.56 * auraFade;
      }

      if (gs.age >= gs.life) {
        this.group.remove(gs.rig.group);
        gs.rig.dispose();
        this.group.remove(gs.auraRing);
        (gs.auraRing.material as THREE.Material).dispose();
        for (const sp of gs.smokeSprites) {
          this.group.remove(sp);
          (sp.material as THREE.Material).dispose();
        }
        this.groundSwords.splice(i, 1);
      }
    }
  }

  public clearActiveEffects(): void {
    this.gatherGroup.visible = false;
    for (const ts of this.thrownSwords) {
      this.group.remove(ts.rig.group);
      ts.rig.dispose();
      for (const sp of ts.trailSprites) {
        this.group.remove(sp);
        (sp.material as THREE.Material).dispose();
      }
    }
    this.thrownSwords.length = 0;

    for (const es of this.embeddedSwords) {
      this.group.remove(es.rig.group);
      es.rig.dispose();
    }
    this.embeddedSwords.length = 0;

    for (const sa of this.slashArcs) {
      this.group.remove(sa.group);
      for (const r of sa.rings) {
        (r.material as THREE.Material).dispose();
      }
    }
    this.slashArcs.length = 0;

    for (const exp of this.explosions) {
      this.group.remove(exp.group);
      exp.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
          (obj.material as THREE.Material).dispose();
        }
      });
    }
    this.explosions.length = 0;

    for (const gs of this.groundSwords) {
      this.group.remove(gs.rig.group);
      gs.rig.dispose();
      this.group.remove(gs.auraRing);
      (gs.auraRing.material as THREE.Material).dispose();
      for (const sp of gs.smokeSprites) {
        this.group.remove(sp);
        (sp.material as THREE.Material).dispose();
      }
    }
    this.groundSwords.length = 0;
  }

  public dispose(): void {
    this.clearActiveEffects();
    this.gatherGroup.traverse((obj) => {
      if (obj instanceof THREE.Sprite) {
        (obj.material as THREE.Material).dispose();
      }
    });
    this.ringGeo.dispose();
    this.slashArcGeo.dispose();
    this.domeGeo.dispose();
  }
}
