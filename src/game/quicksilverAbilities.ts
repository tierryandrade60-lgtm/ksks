import * as THREE from 'three';
import { CombatTargetProbe } from './scarletWitchAbilities';

let cachedGreenSparkTex: THREE.CanvasTexture | null = null;
let cachedWhiteWindTex: THREE.CanvasTexture | null = null;

function createGreenSparkTexture(): THREE.CanvasTexture {
  if (cachedGreenSparkTex) return cachedGreenSparkTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(236, 255, 244, 1)');
  grad.addColorStop(0.32, 'rgba(92, 255, 168, 0.88)');
  grad.addColorStop(0.68, 'rgba(24, 212, 112, 0.34)');
  grad.addColorStop(1.0, 'rgba(8, 120, 56, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGreenSparkTex = tex;
  return tex;
}

function createWhiteWindTexture(): THREE.CanvasTexture {
  if (cachedWhiteWindTex) return cachedWhiteWindTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.78)');
  grad.addColorStop(0.45, 'rgba(235, 250, 245, 0.45)');
  grad.addColorStop(1.0, 'rgba(220, 255, 240, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedWhiteWindTex = tex;
  return tex;
}

interface AfterimageGhost {
  mesh: THREE.Group;
  mat: THREE.MeshBasicMaterial;
  age: number;
  maxAge: number;
}

interface PunchFxBurst {
  group: THREE.Group;
  ring: THREE.Mesh;
  streak: THREE.Mesh;
  age: number;
  duration: number;
  isFinisher: boolean;
}

interface WindTornadoOrbit {
  angle: number;
  angVel: number;
  radius: number;
  height: number;
  bobPhase: number;
}

interface TimeStopSphereState {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  center: THREE.Vector3;
  age: number;
  expandDuration: number;
  holdDuration: number;
  fadeDuration: number;
  maxRadius: number;
  currentRadius: number;
  frozenIds: Set<string>;
}

export type QuicksilverVfxPalette = 'blue' | 'green';

interface QuicksilverPaletteColors {
  lightningHex: number;
  windRingHex: number;
  punchRingHex: number;
  finisherRingHex: number;
  streakHex: number;
  timeStopHex: number;
  afterimageHex: number;
}

const QS_PALETTES: Record<QuicksilverVfxPalette, QuicksilverPaletteColors> = {
  blue: {
    lightningHex: 0x56d8ff,
    windRingHex: 0xebf8ff,
    punchRingHex: 0x38b6ff,
    finisherRingHex: 0xb8eeff,
    streakHex: 0x8ce4ff,
    timeStopHex: 0x38b6ff,
    afterimageHex: 0x3ebeff,
  },
  green: {
    lightningHex: 0x62ffb0,
    windRingHex: 0xf4fff9,
    punchRingHex: 0x52ffa8,
    finisherRingHex: 0xc2ffe0,
    streakHex: 0xa4ffd0,
    timeStopHex: 0x3cff96,
    afterimageHex: 0x4cff9e,
  },
};

export class QuicksilverVfxSystem {
  public readonly group = new THREE.Group();

  private palette: QuicksilverVfxPalette = 'blue';
  private palColors: QuicksilverPaletteColors = QS_PALETTES.blue;
  private readonly windTex: THREE.CanvasTexture;
  private readonly lightningMat: THREE.LineBasicMaterial;

  // Super speed lightning arcs & afterimage ghosts
  private readonly speedBolts: THREE.Line[] = [];
  private readonly dashBolts: Array<{
    line: THREE.Line;
    mat: THREE.LineBasicMaterial;
    age: number;
    duration: number;
  }> = [];
  private readonly afterimages: AfterimageGhost[] = [];
  private readonly ghostTorsoGeo = new THREE.BoxGeometry(0.56, 0.68, 0.32);
  private readonly ghostHeadGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  private readonly ghostLegsGeo = new THREE.BoxGeometry(0.48, 0.7, 0.3);
  private ghostSpawnAccum = 0;

  // Punch hit VFX bursts
  private readonly punchBursts: PunchFxBurst[] = [];
  private readonly punchRingGeo = new THREE.RingGeometry(0.18, 0.34, 24);
  private readonly finisherRingGeo = new THREE.RingGeometry(0.18, 0.52, 24);
  private readonly punchStreakGeo = new THREE.BoxGeometry(0.06, 0.06, 1.1);
  private readonly finisherStreakGeo = new THREE.BoxGeometry(0.06, 0.06, 2.2);

  // Wind tornado (toggleable)
  private tornadoActive = false;
  private readonly tornadoCenter = new THREE.Vector3();
  private readonly tornadoGroup = new THREE.Group();
  private readonly tornadoRings: THREE.Mesh[] = [];
  private readonly tornadoWindSprites: Array<{
    sprite: THREE.Sprite;
    angle: number;
    speed: number;
    radius: number;
    height: number;
  }> = [];
  private readonly tornadoBolts: THREE.Line[] = [];
  private tornadoDmgTimer = 0;
  private readonly tornadoOrbits = new Map<string, WindTornadoOrbit>();

  // Time Stop simple translucent sphere
  private timeStopState: TimeStopSphereState | null = null;
  private readonly timeStopSphereGeo = new THREE.SphereGeometry(1, 36, 24);
  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpPos = new THREE.Vector3();
  private readonly _activeIds = new Set<string>();
  private readonly _aliveIds = new Set<string>();
  private animTime = 0;

  constructor(palette: QuicksilverVfxPalette = 'blue') {
    this.palette = palette;
    this.palColors = QS_PALETTES[palette];
    this.windTex = createWhiteWindTexture();
    this.lightningMat = new THREE.LineBasicMaterial({
      color: this.palColors.lightningHex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });

    // 4 speed lightning bolts around Quicksilver
    for (let i = 0; i < 4; i++) {
      const pts = Array.from({ length: 7 }, () => new THREE.Vector3());
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        this.lightningMat,
      );
      line.visible = false;
      this.speedBolts.push(line);
      this.group.add(line);
    }

    this.initWindTornadoVisual();
  }

  public setPalette(palette: QuicksilverVfxPalette): void {
    if (this.palette === palette) return;
    this.palette = palette;
    this.palColors = QS_PALETTES[palette];
    this.lightningMat.color.setHex(this.palColors.lightningHex);
    for (let i = 0; i < this.tornadoRings.length; i++) {
      (this.tornadoRings[i].material as THREE.MeshBasicMaterial).color.setHex(
        this.palColors.windRingHex,
      );
    }
    if (this.timeStopState) {
      this.timeStopState.mat.color.setHex(this.palColors.timeStopHex);
    }
  }

  private initWindTornadoVisual(): void {
    this.tornadoGroup.visible = false;

    // Stacked translucent white wind ribbons forming wide funnel
    const tiers = 10;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const radius = 1.45 + t * 3.85;
      const geo = new THREE.TorusGeometry(radius, 0.16 + t * 0.12, 8, 36);
      geo.rotateX(Math.PI * 0.5);
      const mat = new THREE.MeshBasicMaterial({
        color: this.palColors.windRingHex,
        transparent: true,
        opacity: 0.34 - t * 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.y = 0.28 + t * 4.4;
      this.tornadoRings.push(ring);
      this.tornadoGroup.add(ring);
    }

    // Soft white cloud funnel sprites
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const mat = new THREE.SpriteMaterial({
        map: this.windTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const s = new THREE.Sprite(mat);
      const sc = 1.6 + t * 2.2;
      s.scale.set(sc, sc * 0.65, 1);
      this.tornadoGroup.add(s);
      this.tornadoWindSprites.push({
        sprite: s,
        angle: (i * Math.PI * 2) / 5,
        speed: 6.5 + (1 - t) * 5.0,
        radius: 1.4 + t * 3.6,
        height: 0.35 + t * 4.5,
      });
    }

    // Green speed lightning flickers around the white wind tornado
    for (let b = 0; b < 5; b++) {
      const pts = Array.from({ length: 7 }, () => new THREE.Vector3());
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        this.lightningMat,
      );
      this.tornadoBolts.push(line);
      this.tornadoGroup.add(line);
    }

    this.group.add(this.tornadoGroup);
  }

  public isWindTornadoActive(): boolean {
    return this.tornadoActive;
  }

  public getWindTornadoCenter(): THREE.Vector3 {
    return this.tornadoCenter;
  }

  public setWindTornado(active: boolean, center?: THREE.Vector3): void {
    this.tornadoActive = active;
    this.tornadoGroup.visible = active;
    if (active && center) {
      this.tornadoCenter.set(center.x, 0, center.z);
      this.tornadoGroup.position.copy(this.tornadoCenter);
      this.tornadoDmgTimer = 0;
    }
  }

  public spawnBlitzDash(fromPos: THREE.Vector3, toPos: THREE.Vector3, yaw: number): void {
    this.spawnAfterimage(fromPos, yaw);
    for (let k = 0; k < 2; k++) {
      const pts = Array.from({ length: 8 }, () => new THREE.Vector3());
      const mat = new THREE.LineBasicMaterial({
        color: k === 0 ? this.palColors.lightningHex : this.palColors.streakHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      this._tmpA.set(fromPos.x, fromPos.y + 0.95 + (k - 0.5) * 0.25, fromPos.z);
      this._tmpB.set(toPos.x, toPos.y + 0.95 + (k - 0.5) * 0.25, toPos.z);
      this.randomizeLightning(line, this._tmpA, this._tmpB, 0.45);
      this.group.add(line);
      this.dashBolts.push({
        line,
        mat,
        age: 0,
        duration: 0.22,
      });
    }
  }

  public spawnPunchImpact(worldPos: THREE.Vector3, isFinisher: boolean): void {
    const g = new THREE.Group();
    g.position.set(
      worldPos.x + (Math.random() - 0.5) * 0.4,
      worldPos.y + 0.9 + (Math.random() - 0.5) * 0.45,
      worldPos.z + (Math.random() - 0.5) * 0.4,
    );

    const ringMat = new THREE.MeshBasicMaterial({
      color: isFinisher ? this.palColors.finisherRingHex : this.palColors.punchRingHex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      isFinisher ? this.finisherRingGeo : this.punchRingGeo,
      ringMat,
    );
    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    g.add(ring);

    const streakMat = new THREE.MeshBasicMaterial({
      color: this.palColors.streakHex,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streak = new THREE.Mesh(
      isFinisher ? this.finisherStreakGeo : this.punchStreakGeo,
      streakMat,
    );
    streak.rotation.set((Math.random() - 0.5) * 1.2, Math.random() * Math.PI * 2, 0);
    g.add(streak);

    this.group.add(g);
    this.punchBursts.push({
      group: g,
      ring,
      streak,
      age: 0,
      duration: isFinisher ? 0.45 : 0.18,
      isFinisher,
    });
  }

  public spawnTimeStop(center: THREE.Vector3): boolean {
    if (this.timeStopState) return false;

    // Simple, clean translucent stasis sphere WITHOUT clutter, sparks, or extra decorations
    const mat = new THREE.MeshBasicMaterial({
      color: this.palColors.timeStopHex,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.timeStopSphereGeo, mat);
    mesh.position.set(center.x, 0.9, center.z);
    mesh.scale.setScalar(0.35);
    this.group.add(mesh);

    this.timeStopState = {
      mesh,
      mat,
      center: new THREE.Vector3(center.x, 0.9, center.z),
      age: 0,
      expandDuration: 0.65,
      holdDuration: 4.5,
      fadeDuration: 0.48,
      maxRadius: 11.5,
      currentRadius: 0.35,
      frozenIds: new Set<string>(),
    };
    return true;
  }

  private spawnAfterimage(pos: THREE.Vector3, yaw: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: this.palColors.afterimageHex,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const g = new THREE.Group();
    const torso = new THREE.Mesh(this.ghostTorsoGeo, mat);
    torso.position.y = 1.1;
    const head = new THREE.Mesh(this.ghostHeadGeo, mat);
    head.position.y = 1.66;
    const legs = new THREE.Mesh(this.ghostLegsGeo, mat);
    legs.position.y = 0.4;
    g.add(torso, head, legs);
    g.position.copy(pos);
    g.rotation.y = yaw;
    this.group.add(g);

    this.afterimages.push({
      mesh: g,
      mat,
      age: 0,
      maxAge: 0.24,
    });
  }

  private randomizeLightning(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3, jitter: number): void {
    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const env = Math.sin(t * Math.PI);
      posAttr.setXYZ(
        i,
        THREE.MathUtils.lerp(a.x, b.x, t) + (Math.random() - 0.5) * jitter * env,
        THREE.MathUtils.lerp(a.y, b.y, t) + (Math.random() - 0.5) * jitter * env,
        THREE.MathUtils.lerp(a.z, b.z, t) + (Math.random() - 0.5) * jitter * env,
      );
    }
    posAttr.needsUpdate = true;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    horizontalSpeed: number,
    speedEffectsActive: boolean,
    targets: ReadonlyArray<CombatTargetProbe>,
    callbacks: {
      onWindTornadoControl?: (
        id: string,
        pos: THREE.Vector3,
        yaw: number,
        tickDamage: number,
      ) => void;
      onWindTornadoRelease?: (id: string) => void;
      onTimeFreezeChange?: (id: string, frozen: boolean) => void;
    },
  ): void {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;

    // 1. Super Speed green lightning & trail afterimages
    const showSpeedVfx = speedEffectsActive && (horizontalSpeed > 2.2 || this.tornadoActive);
    for (let i = 0; i < this.speedBolts.length; i++) {
      const line = this.speedBolts[i];
      line.visible = showSpeedVfx;
      if (showSpeedVfx) {
        const ang = (i * Math.PI * 0.5) + this.animTime * 9;
        this._tmpA.set(
          playerPos.x + Math.cos(ang) * 0.42,
          playerPos.y + 0.35 + Math.random() * 0.4,
          playerPos.z + Math.sin(ang) * 0.42,
        );
        this._tmpB.set(
          playerPos.x + Math.cos(ang + 1.2) * 0.42,
          playerPos.y + 1.4 + Math.random() * 0.3,
          playerPos.z + Math.sin(ang + 1.2) * 0.42,
        );
        this.randomizeLightning(line, this._tmpA, this._tmpB, 0.35);
      }
    }

    if (speedEffectsActive && horizontalSpeed > 4.5) {
      this.ghostSpawnAccum += safeDt;
      if (this.ghostSpawnAccum >= 0.045) {
        this.ghostSpawnAccum = 0;
        this.spawnAfterimage(playerPos, playerYaw);
      }
    } else {
      this.ghostSpawnAccum = 0;
    }

    for (let i = this.dashBolts.length - 1; i >= 0; i--) {
      const db = this.dashBolts[i];
      db.age += safeDt;
      const u = Math.min(1, db.age / db.duration);
      db.mat.opacity = 0.95 * (1 - u);
      if (u >= 1) {
        this.group.remove(db.line);
        db.line.geometry.dispose();
        db.mat.dispose();
        this.dashBolts.splice(i, 1);
      }
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const g = this.afterimages[i];
      g.age += safeDt;
      const u = Math.min(1, g.age / g.maxAge);
      g.mat.opacity = 0.36 * (1 - u);
      if (u >= 1) {
        this.group.remove(g.mesh);
        g.mat.dispose();
        this.afterimages.splice(i, 1);
      }
    }

    // 2. Rapid Punch impact bursts
    for (let i = this.punchBursts.length - 1; i >= 0; i--) {
      const b = this.punchBursts[i];
      b.age += safeDt;
      const p = Math.min(1, b.age / b.duration);
      const sc = b.isFinisher ? 1 + p * 5.2 : 1 + p * 2.4;
      b.ring.scale.setScalar(sc);
      (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.9;
      (b.streak.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
      if (p >= 1) {
        this.group.remove(b.group);
        (b.ring.material as THREE.Material).dispose();
        (b.streak.material as THREE.Material).dispose();
        this.punchBursts.splice(i, 1);
      }
    }

    // 3. Wind Tornado
    if (this.tornadoActive) {
      for (let i = 0; i < this.tornadoRings.length; i++) {
        const ring = this.tornadoRings[i];
        ring.rotation.y += (8.5 - i * 0.45) * safeDt;
        const wob = Math.sin(this.animTime * 9 + i) * 0.14;
        ring.position.x = wob;
        ring.position.z = Math.cos(this.animTime * 8 + i) * 0.14;
      }

      for (const s of this.tornadoWindSprites) {
        s.angle += s.speed * safeDt;
        s.sprite.position.set(
          Math.cos(s.angle) * s.radius,
          s.height + Math.sin(this.animTime * 6 + s.angle) * 0.18,
          Math.sin(s.angle) * s.radius,
        );
      }

      for (let b = 0; b < this.tornadoBolts.length; b++) {
        const a0 = this.animTime * 11 + (b * Math.PI * 2) / this.tornadoBolts.length;
        this._tmpA.set(Math.cos(a0) * 1.5, 0.35, Math.sin(a0) * 1.5);
        this._tmpB.set(Math.cos(a0 + 1.1) * 4.8, 4.4, Math.sin(a0 + 1.1) * 4.8);
        this.randomizeLightning(this.tornadoBolts[b], this._tmpA, this._tmpB, 0.65);
      }

      this.tornadoDmgTimer += safeDt;
      const tickDmg = this.tornadoDmgTimer >= 0.5;
      if (tickDmg) this.tornadoDmgTimer -= 0.5;

      this._activeIds.clear();
      for (const t of targets) {
        const d = Math.hypot(
          t.position.x - this.tornadoCenter.x,
          t.position.z - this.tornadoCenter.z,
        );
        if (d <= 6.8 || (this.tornadoOrbits.has(t.id) && d <= 8.2)) {
          this._activeIds.add(t.id);
          let orb = this.tornadoOrbits.get(t.id);
          if (!orb) {
            orb = {
              angle: Math.atan2(
                t.position.z - this.tornadoCenter.z,
                t.position.x - this.tornadoCenter.x,
              ),
              angVel: 5.2 + Math.random() * 2.2,
              radius: 2.1 + Math.random() * 1.9,
              height: 0.7 + Math.random() * 1.8,
              bobPhase: Math.random() * Math.PI * 2,
            };
            this.tornadoOrbits.set(t.id, orb);
          }
          orb.angle += orb.angVel * safeDt;
          this._tmpPos.set(
            this.tornadoCenter.x + Math.cos(orb.angle) * orb.radius,
            orb.height + Math.sin(this.animTime * 6 + orb.bobPhase) * 0.35,
            this.tornadoCenter.z + Math.sin(orb.angle) * orb.radius,
          );
          callbacks.onWindTornadoControl?.(
            t.id,
            this._tmpPos,
            orb.angle + Math.PI * 0.5,
            tickDmg ? 7 : 0,
          );
        }
      }

      for (const id of this.tornadoOrbits.keys()) {
        if (!this._activeIds.has(id)) {
          this.tornadoOrbits.delete(id);
          callbacks.onWindTornadoRelease?.(id);
        }
      }
    } else if (this.tornadoOrbits.size > 0) {
      for (const id of this.tornadoOrbits.keys()) {
        callbacks.onWindTornadoRelease?.(id);
      }
      this.tornadoOrbits.clear();
    }

    // 4. Time Stop simple translucent green expanding sphere
    if (this.timeStopState) {
      const ts = this.timeStopState;
      ts.age += safeDt;
      const total = ts.expandDuration + ts.holdDuration + ts.fadeDuration;
      if (ts.age < ts.expandDuration) {
        const k = 1 - Math.pow(1 - ts.age / ts.expandDuration, 3);
        ts.currentRadius = 0.35 + (ts.maxRadius - 0.35) * k;
        ts.mat.opacity = 0.25;
      } else if (ts.age < ts.expandDuration + ts.holdDuration) {
        ts.currentRadius = ts.maxRadius;
        ts.mat.opacity = 0.22;
      } else {
        const f = Math.min(
          1,
          (ts.age - ts.expandDuration - ts.holdDuration) / ts.fadeDuration,
        );
        ts.mat.opacity = 0.22 * (1 - f);
      }

      ts.mesh.scale.setScalar(ts.currentRadius);

      if (ts.age >= total) {
        for (const id of ts.frozenIds) {
          callbacks.onTimeFreezeChange?.(id, false);
        }
        ts.frozenIds.clear();
        this.group.remove(ts.mesh);
        ts.mat.dispose();
        this.timeStopState = null;
      } else {
        this._aliveIds.clear();
        for (const t of targets) {
          this._aliveIds.add(t.id);
          const dist = Math.hypot(
            t.position.x - ts.center.x,
            t.position.y + 0.9 - ts.center.y,
            t.position.z - ts.center.z,
          );
          if (dist <= ts.currentRadius + 0.45 && !ts.frozenIds.has(t.id)) {
            ts.frozenIds.add(t.id);
            callbacks.onTimeFreezeChange?.(t.id, true);
          }
        }
        // Clean up ids of NPCs that died/respawned
        for (const id of ts.frozenIds) {
          if (!this._aliveIds.has(id)) {
            ts.frozenIds.delete(id);
          }
        }
      }
    }
  }

  public clearAll(
    onWindRelease?: (id: string) => void,
    onTimeUnfreeze?: (id: string) => void,
  ): void {
    this.tornadoActive = false;
    this.tornadoGroup.visible = false;
    for (const id of this.tornadoOrbits.keys()) {
      onWindRelease?.(id);
    }
    this.tornadoOrbits.clear();

    if (this.timeStopState) {
      for (const id of this.timeStopState.frozenIds) {
        onTimeUnfreeze?.(id);
      }
      this.group.remove(this.timeStopState.mesh);
      this.timeStopState.mat.dispose();
      this.timeStopState = null;
    }

    for (const l of this.speedBolts) l.visible = false;
    for (const db of this.dashBolts) {
      this.group.remove(db.line);
      db.line.geometry.dispose();
      db.mat.dispose();
    }
    this.dashBolts.length = 0;
    for (const g of this.afterimages) {
      this.group.remove(g.mesh);
      g.mat.dispose();
    }
    this.afterimages.length = 0;
    for (const b of this.punchBursts) {
      this.group.remove(b.group);
      (b.ring.material as THREE.Material).dispose();
      (b.streak.material as THREE.Material).dispose();
    }
    this.punchBursts.length = 0;
  }

  public dispose(): void {
    this.clearAll();
    this.ghostTorsoGeo.dispose();
    this.ghostHeadGeo.dispose();
    this.ghostLegsGeo.dispose();
    this.punchRingGeo.dispose();
    this.finisherRingGeo.dispose();
    this.punchStreakGeo.dispose();
    this.finisherStreakGeo.dispose();
    this.timeStopSphereGeo.dispose();
    for (const r of this.tornadoRings) {
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    }
    for (const ws of this.tornadoWindSprites) {
      (ws.sprite.material as THREE.Material).dispose();
    }
    for (const tb of this.tornadoBolts) tb.geometry.dispose();
    for (const sb of this.speedBolts) sb.geometry.dispose();
    this.lightningMat.dispose();
  }
}
