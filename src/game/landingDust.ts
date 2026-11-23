import * as THREE from 'three';

let cachedDustPuffTex: THREE.CanvasTexture | null = null;

function getSoftDustPuffTexture(): THREE.CanvasTexture {
  if (cachedDustPuffTex) return cachedDustPuffTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(242, 248, 255, 0.92)');
  grad.addColorStop(0.45, 'rgba(210, 224, 245, 0.56)');
  grad.addColorStop(1.0, 'rgba(180, 200, 232, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedDustPuffTex = tex;
  return tex;
}

interface DustPuff {
  sprite: THREE.Sprite;
  active: boolean;
  age: number;
  life: number;
  vel: THREE.Vector3;
  startScale: number;
  endScale: number;
  maxOpacity: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  life: number;
  startScale: number;
  endScale: number;
  maxOpacity: number;
}

/**
 * Stylized Cartoon landing dust cloud + subtle ground shockwave ring
 * triggered at the character's feet whenever landing from a jump or flight.
 */
export class LandingDustSystem {
  public readonly group = new THREE.Group();

  private readonly puffTex: THREE.CanvasTexture;
  private readonly ringGeo: THREE.RingGeometry;
  private readonly puffs: DustPuff[] = [];
  private readonly rings: ShockwaveRing[] = [];

  constructor() {
    this.puffTex = getSoftDustPuffTexture();
    this.ringGeo = new THREE.RingGeometry(0.68, 1.0, 28);
    this.ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 18; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.puffTex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.puffs.push({
        sprite,
        active: false,
        age: 0,
        life: 0.42,
        vel: new THREE.Vector3(),
        startScale: 0.24,
        endScale: 0.56,
        maxOpacity: 0.58,
      });
    }

    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdbeafe,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({
        mesh,
        active: false,
        age: 0,
        life: 0.34,
        startScale: 0.28,
        endScale: 1.05,
        maxOpacity: 0.46,
      });
    }
  }

  public spawn(feetPos: THREE.Vector3, groundY: number, intensity = 1.0): void {
    const strength = THREE.MathUtils.clamp(intensity, 0.55, 1.5);
    const puffCount = Math.round(6 + strength * 2);

    let spawned = 0;
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < this.puffs.length && spawned < puffCount; i++) {
      const p = this.puffs[i];
      if (p.active) continue;
      const angle = baseAngle + (spawned / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const rad = 0.16 + Math.random() * 0.14;
      const speed = (1.35 + Math.random() * 0.85) * strength;
      p.active = true;
      p.age = 0;
      p.life = 0.34 + Math.random() * 0.14;
      p.sprite.position.set(
        feetPos.x + Math.cos(angle) * rad,
        groundY + 0.08 + Math.random() * 0.05,
        feetPos.z + Math.sin(angle) * rad,
      );
      p.vel.set(
        Math.cos(angle) * speed,
        0.38 + Math.random() * 0.34,
        Math.sin(angle) * speed,
      );
      p.startScale = 0.22 * strength;
      p.endScale = (0.48 + Math.random() * 0.18) * strength;
      p.maxOpacity = 0.44 + 0.12 * strength;
      p.sprite.scale.setScalar(p.startScale);
      p.sprite.visible = true;
      spawned++;
    }

    let ring: ShockwaveRing = this.rings[0];
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.rings[i].active) {
        ring = this.rings[i];
        break;
      }
    }
    ring.active = true;
    ring.age = 0;
    ring.life = 0.32;
    ring.startScale = 0.26 * strength;
    ring.endScale = 0.96 * strength;
    ring.maxOpacity = 0.38 * Math.min(1.2, strength);
    ring.mesh.position.set(feetPos.x, groundY + 0.025, feetPos.z);
    ring.mesh.scale.setScalar(ring.startScale);
    ring.mesh.visible = true;
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);

    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      if (!p.active) continue;
      p.age += safeDt;
      if (p.age >= p.life) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.sprite.position.addScaledVector(p.vel, safeDt);
      p.vel.multiplyScalar(Math.exp(-5.8 * safeDt));
      p.vel.y *= Math.exp(-3.2 * safeDt);
      const scale = THREE.MathUtils.lerp(p.startScale, p.endScale, 1 - (1 - t) * (1 - t));
      p.sprite.scale.setScalar(scale);
      (p.sprite.material as THREE.SpriteMaterial).opacity =
        p.maxOpacity * Math.sin(Math.min(1, t * 1.35) * Math.PI * 0.5) * (1 - t);
    }

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.age += safeDt;
      if (r.age >= r.life) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.age / r.life;
      const ease = 1 - Math.pow(1 - t, 2.5);
      r.mesh.scale.setScalar(THREE.MathUtils.lerp(r.startScale, r.endScale, ease));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity =
        r.maxOpacity * (1 - t) * (1 - t);
    }
  }

  public clear(): void {
    for (const p of this.puffs) {
      p.active = false;
      p.sprite.visible = false;
    }
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
  }

  public dispose(): void {
    this.clear();
    for (const p of this.puffs) {
      (p.sprite.material as THREE.Material).dispose();
    }
    for (const r of this.rings) {
      (r.mesh.material as THREE.Material).dispose();
    }
    this.ringGeo.dispose();
  }
}
