import * as THREE from 'three';
import { CharacterAnimator } from './characterAnimator';
import {
  CHARACTER_PRESETS,
  CharacterAppearance,
  CharacterArchetype,
} from './characterConfig';
import {
  BASEPLATE_HALF_INNER,
  getGroundSurfaceY,
  hasLineOfSight,
  resolveHorizontalObstaclePush,
} from './physics';
import { createContactShadowTexture } from './pixelTextures';
import { createR16Character, R16Rig } from './r16Character';
import { R16Ragdoll } from './ragdoll';
import { CombatTargetProbe, DarkholdBookVfx, ScarletShieldVfx } from './scarletWitchAbilities';
import { AgathaVfxSystem } from './agathaAbilities';
import { SHIELD_MAX_DURABILITY } from './shieldHitVfx';
import { NpcEliminationEvent, NpcHudSnapshot } from './npcSystem';
import type { MapId } from './maps';

export type PlayableAiHeroId = 'wanda-zombie' | 'agatha-harkness' | 'magneto';

type ActiveHeroAction =
  | { kind: 'none' }
  | {
      kind: 'zombie-beam';
      elapsed: number;
      duration: number;
      tickAccum: number;
    }
  | {
      kind: 'zombie-stone';
      elapsed: number;
      gatherDuration: number;
      startY: number;
      detonated: boolean;
      ringMesh: THREE.Mesh;
      stones: THREE.Mesh[];
    }
  | {
      kind: 'agatha-absorb';
      elapsed: number;
      duration: number;
      tickAccum: number;
    }
  | {
      kind: 'magneto-meteor';
      elapsed: number;
      chargeDuration: number;
      fallDuration: number;
      targetPos: THREE.Vector3;
      impacted: boolean;
      meteorMesh: THREE.Mesh;
      ringMesh: THREE.Mesh;
    }
  | {
      kind: 'magneto-tornado';
      elapsed: number;
      duration: number;
      tickAccum: number;
      vortexGroup: THREE.Group;
    };

interface AiProjectile {
  kind: 'chaos-bolt' | 'agatha-bolt' | 'metal-beam';
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  attackerId: string;
  targetType: 'player' | 'astral-body';
}

interface AiSmokeBurst {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
  maxScale: number;
}

interface PlayableAiActor {
  id: string;
  heroId: PlayableAiHeroId;
  name: string;
  archetype: CharacterArchetype;
  preset: CharacterAppearance;
  coinReward: number;
  rig: R16Rig;
  animator: CharacterAnimator;
  ragdoll: R16Ragdoll;
  spawnPos: THREE.Vector3;
  zoneCenter: THREE.Vector3;
  zoneRadius: number;
  patrolTarget: THREE.Vector3;
  patrolPause: number;
  position: THREE.Vector3;
  verticalVelocity: number;
  facingYaw: number;
  hp: number;
  maxHp: number;
  trailHp: number;
  trailHoldTimer: number;
  ragdollTimer: number;
  ragdollPushOnly: boolean;
  hitFlashTimer: number;
  respawnTimer: number;
  burningTimer: number;
  burnDps: number;
  burnTickAccum: number;
  burnSprite: THREE.Sprite;
  beamLine: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
  agathaShieldMesh: THREE.Mesh;
  agathaShieldMat: THREE.MeshBasicMaterial;
  magnetoShieldMesh: THREE.Mesh;
  magnetoShieldMat: THREE.MeshBasicMaterial;

  // Crowd control / engine compatibility
  painRestricted: boolean;
  paralyzed: boolean;
  paralysisImmune: boolean;
  mindControlImmune: boolean;
  clonesRestricted: boolean;
  agathaDrainVictim: boolean;
  forcefieldShieldHp: number;
  forcefieldShieldMaxHp: number;
  forcefieldTrapped: boolean;
  forcefieldAbilitiesLocked: boolean;
  forcefieldExternalImmune: boolean;
  externalControl: boolean;
  externalHeadache: boolean;
  externalLimp: boolean;
  externalVampireVictim: boolean;
  externalPitchX: number;
  headacheTimer: number;
  rewardClaimed: boolean;

  // AI brain & player-style cooldowns
  aggro: boolean;
  loseInterestTimer: number;
  strafeDir: number;
  strafeTimer: number;
  moveSpeed: number;
  globalCd: number;
  flying: boolean;
  flightTimer: number;
  flightCd: number;
  primaryCharges: number;
  primaryRechargeTimer: number;
  primaryCd: number;
  secondaryCd: number;
  specialCd: number;
  defenseCd: number;
  agathaShieldTimer: number;
  agathaShieldHits: number;
  agathaShieldTrackedDmg: number;
  agathaDarkholdTimer: number;
  agathaDarkholdCd: number;
  agathaBlastCd: number;
  agathaAutoShieldCd: number;
  agathaAutoShieldTimer: number;
  agathaAutoShieldHp: number;
  agathaTeleportCd: number;
  agathaTeleportTimer: number;
  agathaTeleportDest: THREE.Vector3;
  nextHandRight: boolean;
  activeAction: ActiveHeroAction;

  damageDisplay: {
    active: boolean;
    total: number;
    popTimer: number;
    idleTimer: number;
    offsetX: number;
    offsetY: number;
    driftDir: number;
  };
  probe: CombatTargetProbe;
  hudSnapshot: NpcHudSnapshot;
  // Pre-allocated hero-specific ability visuals (kept hidden until cast)
  stoneRingMesh?: THREE.Mesh;
  stoneMeshes?: THREE.Mesh[];
  meteorMesh?: THREE.Mesh;
  meteorRingMesh?: THREE.Mesh;
  vortexGroup?: THREE.Group;
  agathaDarkholdBook?: DarkholdBookVfx;
  agathaDarkholdShield?: ScarletShieldVfx;
  agathaVfx?: AgathaVfxSystem;
}

const DAMAGE_AGGREGATE_HOLD_SEC = 1.25;
const DAMAGE_FADE_DURATION_SEC = 0.42;
const TRAIL_DELAY_SEC = 0.45;
const DETECT_RANGE_M = 19.5;
const ZONE_CHASE_LIMIT_M = 38.0;

let cachedAiBurnAuraTexture: THREE.CanvasTexture | null = null;

function createBurnAuraTexture(): THREE.CanvasTexture {
  if (cachedAiBurnAuraTexture) return cachedAiBurnAuraTexture;
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half + 6, 3, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 240, 170, 0.92)');
  grad.addColorStop(0.45, 'rgba(255, 118, 18, 0.72)');
  grad.addColorStop(0.8, 'rgba(220, 38, 10, 0.25)');
  grad.addColorStop(1.0, 'rgba(120, 10, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedAiBurnAuraTexture = tex;
  return tex;
}

function dampAngle(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export class PlayableAiEnemySystem {
  public readonly group = new THREE.Group();
  private readonly enemies: PlayableAiActor[] = [];
  private readonly enemyById = new Map<string, PlayableAiActor>();
  private readonly projectiles: AiProjectile[] = [];
  private readonly projectilePools: Record<AiProjectile['kind'], AiProjectile[]> = {
    'chaos-bolt': [],
    'agatha-bolt': [],
    'metal-beam': [],
  };
  private readonly smokeBursts: AiSmokeBurst[] = [];
  private readonly smokeBurstPool: AiSmokeBurst[] = [];
  private readonly burnTex: THREE.CanvasTexture;

  private selectedTargetId: string | null = null;
  private readonly pendingEliminations: Array<{
    id: string;
    coins: number;
    worldPos: THREE.Vector3;
  }> = [];
  private readonly elimEvents: NpcEliminationEvent[] = [];
  private readonly cachedProbes: CombatTargetProbe[] = [];
  private readonly cachedSnapshots: NpcHudSnapshot[] = [];
  private animTime = 0;
  private readonly contactShadowGeo: THREE.PlaneGeometry;
  private readonly contactShadowMat: THREE.MeshBasicMaterial;
  private readonly contactShadowMesh: THREE.InstancedMesh;
  private readonly _shadowPos = new THREE.Vector3();
  private readonly _shadowScale = new THREE.Vector3();
  private readonly _shadowQuat = new THREE.Quaternion();
  private readonly _shadowMat4 = new THREE.Matrix4();

  // Shared pooled geometries & materials
  private readonly boltSphereGeo = new THREE.SphereGeometry(0.18, 10, 8);
  private readonly boltHaloGeo = new THREE.SphereGeometry(0.28, 10, 8);
  private readonly steelBeamGeo = new THREE.BoxGeometry(0.18, 0.14, 1.05);
  private readonly beamUnitGeo = new THREE.CylinderGeometry(0.065, 0.085, 1, 8, 1, true);
  private readonly stoneGeo = new THREE.DodecahedronGeometry(0.3, 0);
  private readonly meteorGeo = new THREE.DodecahedronGeometry(1.05, 1);
  private readonly ringGeo = new THREE.RingGeometry(0.75, 1.0, 24);
  private readonly vortexRingGeo = new THREE.TorusGeometry(1.5, 0.08, 6, 20);
  private readonly shieldSphereGeo = new THREE.IcosahedronGeometry(1.18, 1);
  private readonly smokeGeo = new THREE.SphereGeometry(0.55, 10, 8);

  private readonly wandaBoltMat = new THREE.MeshBasicMaterial({ color: '#FF2A48' });
  private readonly wandaHaloMat = new THREE.MeshBasicMaterial({
    color: '#98081C',
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly agathaBoltMat = new THREE.MeshBasicMaterial({ color: '#B84CFF' });
  private readonly agathaHaloMat = new THREE.MeshBasicMaterial({
    color: '#5C14A8',
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private readonly steelMat = new THREE.MeshStandardMaterial({
    color: '#9BA6BA',
    emissive: '#6E2CFF',
    emissiveIntensity: 0.5,
    roughness: 0.32,
    metalness: 0.82,
  });
  private readonly stoneMat = new THREE.MeshStandardMaterial({
    color: '#4F4A50',
    emissive: '#580812',
    emissiveIntensity: 0.35,
    roughness: 0.88,
  });
  private readonly meteorMat = new THREE.MeshStandardMaterial({
    color: '#4E5568',
    emissive: '#8B38FF',
    emissiveIntensity: 0.65,
    roughness: 0.45,
    metalness: 0.72,
  });
  private readonly crimsonRingMat = new THREE.MeshBasicMaterial({
    color: '#FF3654',
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly purpleRingMat = new THREE.MeshBasicMaterial({
    color: '#B666FF',
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly tornadoSteelMat = new THREE.MeshBasicMaterial({
    color: '#9D6BFF',
    transparent: true,
    opacity: 0.72,
    wireframe: true,
  });

  // Scratch vectors (zero allocations per frame)
  private readonly _proj = new THREE.Vector3();
  private readonly _fwd = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _toActor = new THREE.Vector3();
  private readonly _hitDir = new THREE.Vector3();
  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _mid = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _projNext = new THREE.Vector3();
  private readonly _zeroVec = new THREE.Vector3();
  private readonly _knockVec = new THREE.Vector3();
  private readonly _dirVec = new THREE.Vector3();
  private readonly _pullVec = new THREE.Vector3();
  private readonly _originVec = new THREE.Vector3();

  private readonly idleMotion = {
    localForward: 0,
    localRight: 0,
    verticalVelocity: 0,
    grounded: true,
    justJumped: false,
    landImpactSpeed: 0,
  };

  private readonly runMotion = {
    localForward: 1.05,
    localRight: 0,
    verticalVelocity: 0,
    grounded: true,
    justJumped: false,
    landImpactSpeed: 0,
  };

  private readonly flyMotion = {
    localForward: 0.45,
    localRight: 0,
    verticalVelocity: 0,
    grounded: false,
    justJumped: false,
    landImpactSpeed: 0,
  };

  constructor(mode: MapId = 'existing') {
    this.burnTex = createBurnAuraTexture();
    this.ringGeo.rotateX(-Math.PI / 2);
    this.vortexRingGeo.rotateX(Math.PI / 2);

    this.contactShadowGeo = new THREE.PlaneGeometry(0.96, 0.96);
    this.contactShadowGeo.rotateX(-Math.PI / 2);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.25,
    });
    this.contactShadowMesh = new THREE.InstancedMesh(
      this.contactShadowGeo,
      this.contactShadowMat,
      8,
    );
    this.contactShadowMesh.frustumCulled = false;
    this.contactShadowMesh.count = 0;
    this.group.add(this.contactShadowMesh);

    if (mode === 'test') {
      return;
    }

    // Exactly 3 playable-identical AI heroes (1 Wanda Zombie, 1 Agatha Harkness, 1 Magneto)
    const roster: Array<{
      id: string;
      heroId: PlayableAiHeroId;
      name: string;
      preset: CharacterAppearance;
      x: number;
      z: number;
      yaw: number;
      maxHp: number;
      moveSpeed: number;
      coinReward: number;
    }> = [
      {
        id: 'ai-wanda-1',
        heroId: 'wanda-zombie',
        name: 'Wanda Zombie',
        preset: CHARACTER_PRESETS.wandaZombie,
        x: -36,
        z: 22,
        yaw: 0.4,
        maxHp: 240,
        moveSpeed: 5.5,
        coinReward: 75,
      },
      {
        id: 'ai-agatha-1',
        heroId: 'agatha-harkness',
        name: 'Agatha Harkness',
        preset: CHARACTER_PRESETS.agathaHarkness,
        x: 38,
        z: 18,
        yaw: -0.5,
        maxHp: 250,
        moveSpeed: 5.3,
        coinReward: 75,
      },
      {
        id: 'ai-magneto-1',
        heroId: 'magneto',
        name: 'Magneto',
        preset: CHARACTER_PRESETS.magneto,
        x: 0,
        z: 42,
        yaw: 0,
        maxHp: 260,
        moveSpeed: 5.2,
        coinReward: 80,
      },
    ];

    for (const sp of roster) {
      const rig = createR16Character(sp.preset);
      rig.root.position.set(sp.x, 0, sp.z);
      rig.root.rotation.y = sp.yaw;
      this.group.add(rig.root);

      const burnMat = new THREE.SpriteMaterial({
        map: this.burnTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const burnSprite = new THREE.Sprite(burnMat);
      burnSprite.visible = false;
      burnSprite.scale.set(1.05, 1.35, 1);
      this.group.add(burnSprite);

      const beamMat = new THREE.MeshBasicMaterial({
        color: sp.heroId === 'wanda-zombie' ? '#FF2A48' : '#C468FF',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beamLine = new THREE.Mesh(this.beamUnitGeo, beamMat);
      beamLine.visible = false;
      this.group.add(beamLine);

      const agathaShieldMat = new THREE.MeshBasicMaterial({
        color: '#A94CFF',
        transparent: true,
        opacity: 0.34,
        wireframe: true,
        depthWrite: false,
      });
      const agathaShieldMesh = new THREE.Mesh(this.shieldSphereGeo, agathaShieldMat);
      agathaShieldMesh.visible = false;
      rig.root.add(agathaShieldMesh);
      agathaShieldMesh.position.y = 1.05;

      const magnetoShieldMat = new THREE.MeshBasicMaterial({
        color: '#C758FF',
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        depthWrite: false,
      });
      const magnetoShieldMesh = new THREE.Mesh(this.shieldSphereGeo, magnetoShieldMat);
      magnetoShieldMesh.scale.setScalar(1.22);
      magnetoShieldMesh.visible = false;
      rig.root.add(magnetoShieldMesh);
      magnetoShieldMesh.position.y = 1.05;

      const archetype = sp.preset.archetype ?? 'standard';
      const animator = new CharacterAnimator(rig, archetype, sp.preset.skinId);
      const ragdoll = new R16Ragdoll(rig);

      let stoneRingMesh: THREE.Mesh | undefined;
      let stoneMeshes: THREE.Mesh[] | undefined;
      if (sp.heroId === 'wanda-zombie') {
        stoneRingMesh = new THREE.Mesh(this.ringGeo, this.crimsonRingMat);
        stoneRingMesh.visible = false;
        this.group.add(stoneRingMesh);
        stoneMeshes = [];
        for (let s = 0; s < 8; s++) {
          const sm = new THREE.Mesh(this.stoneGeo, this.stoneMat);
          sm.visible = false;
          this.group.add(sm);
          stoneMeshes.push(sm);
        }
      }

      let meteorMesh: THREE.Mesh | undefined;
      let meteorRingMesh: THREE.Mesh | undefined;
      let vortexGroup: THREE.Group | undefined;
      if (sp.heroId === 'magneto') {
        meteorMesh = new THREE.Mesh(this.meteorGeo, this.meteorMat);
        meteorMesh.visible = false;
        meteorRingMesh = new THREE.Mesh(this.ringGeo, this.purpleRingMat);
        meteorRingMesh.visible = false;
        vortexGroup = new THREE.Group();
        vortexGroup.visible = false;
        for (let r = 0; r < 3; r++) {
          const vr = new THREE.Mesh(this.vortexRingGeo, this.tornadoSteelMat);
          vr.position.y = -0.4 + r * 0.9;
          vr.scale.setScalar(0.85 + r * 0.38);
          vortexGroup.add(vr);
        }
        this.group.add(meteorMesh, meteorRingMesh, vortexGroup);
      }

      let agathaDarkholdBook: DarkholdBookVfx | undefined;
      let agathaDarkholdShield: ScarletShieldVfx | undefined;
      let agathaVfx: AgathaVfxSystem | undefined;
      if (sp.heroId === 'agatha-harkness') {
        agathaDarkholdBook = new DarkholdBookVfx('purple');
        agathaDarkholdShield = new ScarletShieldVfx('purple');
        agathaVfx = new AgathaVfxSystem();
        this.group.add(agathaDarkholdBook.group, agathaDarkholdShield.group, agathaVfx.group);
      }

      const position = new THREE.Vector3(sp.x, 0, sp.z);
      const actor: PlayableAiActor = {
        id: sp.id,
        heroId: sp.heroId,
        name: sp.name,
        archetype,
        preset: sp.preset,
        coinReward: sp.coinReward,
        rig,
        animator,
        ragdoll,
        spawnPos: new THREE.Vector3(sp.x, 0, sp.z),
        zoneCenter: new THREE.Vector3(sp.x, 0, sp.z),
        zoneRadius: 11.5,
        patrolTarget: new THREE.Vector3(sp.x, 0, sp.z),
        patrolPause: 0.8 + Math.random() * 1.4,
        position,
        verticalVelocity: 0,
        facingYaw: sp.yaw,
        hp: sp.maxHp,
        maxHp: sp.maxHp,
        trailHp: sp.maxHp,
        trailHoldTimer: 0,
        ragdollTimer: 0,
        ragdollPushOnly: false,
        hitFlashTimer: 0,
        respawnTimer: 0,
        burningTimer: 0,
        burnDps: 2,
        burnTickAccum: 0,
        burnSprite,
        beamLine,
        beamMat,
        agathaShieldMesh,
        agathaShieldMat,
        magnetoShieldMesh,
        magnetoShieldMat,

        painRestricted: false,
        paralyzed: false,
        paralysisImmune: false,
        mindControlImmune: false,
        clonesRestricted: false,
        agathaDrainVictim: false,
        forcefieldShieldHp: 0,
        forcefieldShieldMaxHp: 0,
        forcefieldTrapped: false,
        forcefieldAbilitiesLocked: false,
        forcefieldExternalImmune: false,
        externalControl: false,
        externalHeadache: false,
        externalLimp: false,
        externalVampireVictim: false,
        externalPitchX: 0,
        headacheTimer: 0,
        rewardClaimed: false,

        aggro: false,
        loseInterestTimer: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.5 + Math.random() * 1.5,
        moveSpeed: sp.moveSpeed,
        globalCd: 0.4,
        flying: false,
        flightTimer: 0,
        flightCd: 2.0 + Math.random() * 2.5,
        primaryCharges: 3,
        primaryRechargeTimer: 0,
        primaryCd: 0.6 + Math.random() * 0.5,
        secondaryCd: 2.2 + Math.random() * 2.0,
        specialCd: 4.5 + Math.random() * 3.0,
        defenseCd: 3.0 + Math.random() * 2.5,
        agathaShieldTimer: 0,
        agathaShieldHits: 0,
        agathaShieldTrackedDmg: 0,
        agathaDarkholdTimer: 0,
        agathaDarkholdCd: 2.0 + Math.random() * 1.5,
        agathaBlastCd: 0,
        agathaAutoShieldCd: 0,
        agathaAutoShieldTimer: 0,
        agathaAutoShieldHp: 0,
        agathaTeleportCd: 0,
        agathaTeleportTimer: 0,
        agathaTeleportDest: new THREE.Vector3(sp.x, 0, sp.z),
        nextHandRight: true,
        activeAction: { kind: 'none' },

        damageDisplay: {
          active: false,
          total: 0,
          popTimer: 0,
          idleTimer: 0,
          offsetX: 0,
          offsetY: 0,
          driftDir: 1,
        },
        probe: {
          id: sp.id,
          position,
          radius: 0.48,
          height: 1.9,
        },
        hudSnapshot: {
          id: sp.id,
          name: sp.name,
          category: 'ai-hero',
          hp: sp.maxHp,
          maxHp: sp.maxHp,
          trailHp: sp.maxHp,
          visible: false,
          screenX: 0,
          screenY: 0,
          scale: 1,
          isTargeted: false,
          shield: {
            active: false,
            hp: 0,
            maxHp: 100,
            color: '#38BDF8',
            screenX: 0,
            screenY: 0,
          },
          damageNumber: {
            active: false,
            total: 0,
            scale: 1,
            opacity: 1,
            offsetX: 0,
            offsetY: 0,
          },
        },
        stoneRingMesh,
        stoneMeshes,
        meteorMesh,
        meteorRingMesh,
        vortexGroup,
        agathaDarkholdBook,
        agathaDarkholdShield,
        agathaVfx,
      };
      this.enemies.push(actor);
      this.enemyById.set(sp.id, actor);
    }
  }

  private isUsingAbility(actor: PlayableAiActor): boolean {
    return (
      actor.activeAction.kind !== 'none' ||
      actor.animator.isCastingAbility() ||
      actor.agathaShieldTimer > 0 ||
      actor.agathaTeleportTimer > 0
    );
  }

  private triggerAiAgathaAbsorption(actor: PlayableAiActor): void {
    actor.agathaShieldTimer = 0;
    actor.agathaShieldHits = 0;
    actor.agathaShieldMesh.visible = false;
    if (actor.agathaShieldTrackedDmg > 0) {
      actor.hp = Math.min(actor.maxHp, actor.hp + actor.agathaShieldTrackedDmg);
      actor.trailHp = Math.max(actor.trailHp, actor.hp);
      actor.agathaShieldTrackedDmg = 0;
    }
    actor.animator.setAgathaAbsorb(true);
    actor.agathaVfx?.startAbsorbTendrils('ai-agatha-absorb', 'player', 1.5);
    actor.activeAction = {
      kind: 'agatha-absorb',
      elapsed: 0,
      duration: 1.5,
      tickAccum: 0,
    };
  }

  private clearActiveAction(actor: PlayableAiActor): void {
    actor.beamLine.visible = false;
    actor.animator.setZombieBeam(false);
    actor.animator.setAgathaAbsorb(false);
    actor.animator.setMetalTornado(false);
    actor.agathaVfx?.stopAbsorbTendrils('ai-agatha-absorb');
    if (actor.activeAction.kind === 'zombie-stone') {
      actor.activeAction.ringMesh.visible = false;
      for (let i = 0; i < actor.activeAction.stones.length; i++) {
        actor.activeAction.stones[i].visible = false;
      }
    } else if (actor.activeAction.kind === 'magneto-meteor') {
      actor.activeAction.meteorMesh.visible = false;
      actor.activeAction.ringMesh.visible = false;
    } else if (actor.activeAction.kind === 'magneto-tornado') {
      actor.activeAction.vortexGroup.visible = false;
    }
    actor.activeAction = { kind: 'none' };
  }

  private pickPatrolTarget(actor: PlayableAiActor): void {
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * Math.max(2.5, actor.zoneRadius - 2.0);
    actor.patrolTarget.set(
      actor.zoneCenter.x + Math.cos(angle) * rad,
      0,
      actor.zoneCenter.z + Math.sin(angle) * rad,
    );
    actor.patrolPause = 1.0 + Math.random() * 2.0;
  }

  public getTargetProbes(): CombatTargetProbe[] {
    this.cachedProbes.length = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      this.cachedProbes.push(a.probe);
    }
    return this.cachedProbes;
  }

  public ownsTargetId(targetId: string): boolean {
    return this.enemyById.has(targetId);
  }

  public getSelectedTargetId(): string | null {
    if (!this.selectedTargetId) return null;
    const a = this.enemyById.get(this.selectedTargetId);
    if (!a || a.hp <= 0) return null;
    return a.id;
  }

  public findClosestTargetId(
    fromPos: THREE.Vector3,
    maxDistance: number,
  ): string | null {
    let bestId: string | null = null;
    let bestDistSq = maxDistance * maxDistance;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      const dSq = a.position.distanceToSquared(fromPos);
      if (dSq <= bestDistSq) {
        bestDistSq = dSq;
        bestId = a.id;
      }
    }
    return bestId;
  }

  public isTargetAlive(targetId: string): boolean {
    const a = this.enemyById.get(targetId);
    return Boolean(a && a.hp > 0);
  }

  public getTargetHeroId(targetId: string): PlayableAiHeroId | null {
    const a = this.enemyById.get(targetId);
    return a ? a.heroId : null;
  }

  public getTargetTorsoPosition(targetId: string, out: THREE.Vector3): boolean {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0) return false;
    out.set(a.position.x, a.position.y + 1.05, a.position.z);
    return true;
  }

  public getTargetHeadPosition(targetId: string, out: THREE.Vector3): boolean {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0) return false;
    out.set(
      a.position.x,
      a.position.y + (a.ragdoll.active ? 0.52 : 1.56),
      a.position.z,
    );
    return true;
  }

  public getNpcSwordEmbedPose(
    targetId: string,
    outPos: THREE.Vector3,
  ): { alive: boolean; facingYaw: number } {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0) return { alive: false, facingYaw: 0 };
    outPos.set(
      a.position.x,
      a.position.y + (a.ragdoll.active ? 0.35 : 1.05),
      a.position.z,
    );
    return { alive: true, facingYaw: a.facingYaw };
  }

  public getSelectedTargetAimPoint(out: THREE.Vector3): boolean {
    if (!this.selectedTargetId) return false;
    const a = this.enemyById.get(this.selectedTargetId);
    if (!a || a.hp <= 0) return false;
    out.set(a.position.x, a.position.y + 1.05, a.position.z);
    return true;
  }

  public setPainRestricted(targetId: string, restricted: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.painRestricted = restricted;
    if (restricted) this.clearActiveAction(a);
  }

  public setParalyzed(targetId: string, active: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.paralyzed = active;
    if (active) this.clearActiveAction(a);
  }

  public setMindControlParalysis(targetId: string, active: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.paralyzed = active;
    a.paralysisImmune = active;
    a.rig.setWhiteOutline(active);
    if (active) this.clearActiveAction(a);
  }

  public setMindControlImmune(targetId: string, active: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.mindControlImmune = active;
  }

  public setClonesRestricted(targetId: string, active: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.clonesRestricted = active;
    if (active) this.clearActiveAction(a);
  }

  public setAgathaDrainVictim(
    targetId: string,
    active: boolean,
    facePos?: THREE.Vector3,
  ): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.agathaDrainVictim = active;
    if (active) {
      this.clearActiveAction(a);
      if (facePos) {
        const dx = facePos.x - a.position.x;
        const dz = facePos.z - a.position.z;
        if (dx * dx + dz * dz > 1e-4) {
          a.facingYaw = Math.atan2(-dx, -dz);
        }
      }
    }
    a.animator.setAgathaDrainVictim(active);
  }

  public getTargetAppearance(targetId: string): CharacterAppearance | null {
    const a = this.enemyById.get(targetId);
    if (!a) return null;
    return { ...a.preset };
  }

  public setExternalControl(targetId: string, active: boolean): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    a.externalControl = active;
    if (active) {
      this.clearActiveAction(a);
      a.verticalVelocity = 0;
    } else {
      a.externalHeadache = false;
      a.externalLimp = false;
      a.externalVampireVictim = false;
      a.externalPitchX = 0;
      a.animator.setAstralLimp(false);
      a.animator.setVampireVictim(false);
      a.rig.root.rotation.x = 0;
      a.position.y = Math.max(0, a.position.y);
      a.verticalVelocity = 0;
    }
  }

  public setExternalPose(
    targetId: string,
    pos: THREE.Vector3,
    facingYaw?: number,
    options?: {
      headache?: boolean;
      limp?: boolean;
      vampireVictim?: boolean;
      pitchX?: number;
    },
  ): void {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0) return;
    const maxBound = BASEPLATE_HALF_INNER - 0.85;
    a.position.set(
      THREE.MathUtils.clamp(pos.x, -maxBound, maxBound),
      Math.max(0, pos.y),
      THREE.MathUtils.clamp(pos.z, -maxBound, maxBound),
    );
    if (facingYaw !== undefined) a.facingYaw = facingYaw;
    if (options?.headache !== undefined) a.externalHeadache = options.headache;
    if (options?.limp !== undefined) {
      a.externalLimp = options.limp;
      a.animator.setAstralLimp(options.limp);
    }
    if (options?.vampireVictim !== undefined) {
      a.externalVampireVictim = options.vampireVictim;
      a.animator.setVampireVictim(options.vampireVictim);
    }
    if (options?.pitchX !== undefined) a.externalPitchX = options.pitchX;
  }

  public setForcefieldState(
    targetId: string,
    state: {
      trapped?: boolean;
      abilitiesLocked?: boolean;
      externalImmune?: boolean;
      shieldHp?: number;
      shieldMaxHp?: number;
    } | null,
  ): void {
    const a = this.enemyById.get(targetId);
    if (!a) return;
    if (!state) {
      a.forcefieldTrapped = false;
      a.forcefieldAbilitiesLocked = false;
      a.forcefieldExternalImmune = false;
      a.forcefieldShieldHp = 0;
      a.forcefieldShieldMaxHp = 0;
      return;
    }
    if (state.trapped !== undefined) a.forcefieldTrapped = state.trapped;
    if (state.abilitiesLocked !== undefined) a.forcefieldAbilitiesLocked = state.abilitiesLocked;
    if (state.externalImmune !== undefined) a.forcefieldExternalImmune = state.externalImmune;
    if (state.shieldHp !== undefined) a.forcefieldShieldHp = Math.max(0, state.shieldHp);
    if (state.shieldMaxHp !== undefined) a.forcefieldShieldMaxHp = Math.max(0, state.shieldMaxHp);
    if (a.forcefieldTrapped || a.forcefieldAbilitiesLocked) {
      this.clearActiveAction(a);
    }
  }

  public getForcefieldShieldRemaining(targetId: string): number {
    const a = this.enemyById.get(targetId);
    return a ? a.forcefieldShieldHp : 0;
  }

  public applyHeal(targetId: string, amount: number): number {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0 || amount <= 0) return 0;
    const prev = a.hp;
    a.hp = Math.min(a.maxHp, a.hp + amount);
    a.trailHp = Math.max(a.trailHp, a.hp);
    return a.hp - prev;
  }

  public clearAllCrowdControl(): void {
    for (const a of this.enemies) {
      a.painRestricted = false;
      a.paralyzed = false;
      a.paralysisImmune = false;
      a.mindControlImmune = false;
      a.clonesRestricted = false;
      a.agathaDrainVictim = false;
      a.forcefieldShieldHp = 0;
      a.forcefieldShieldMaxHp = 0;
      a.forcefieldTrapped = false;
      a.forcefieldAbilitiesLocked = false;
      a.forcefieldExternalImmune = false;
      a.rig.setWhiteOutline(false);
      a.externalControl = false;
      a.externalHeadache = false;
      a.externalLimp = false;
      a.externalVampireVictim = false;
      a.externalPitchX = 0;
      a.animator.setAstralLimp(false);
      a.animator.setAgathaDrainVictim(false);
      a.animator.setVampireVictim(false);
      a.rig.root.rotation.x = 0;
      a.verticalVelocity = 0;
      a.position.y = 0;
    }
  }

  public applyHeadache(targetId: string, durationSec: number): void {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0) return;
    a.headacheTimer = Math.max(a.headacheTimer, durationSec);
    this.clearActiveAction(a);
  }

  public applyGlobalDamage(amount: number): number {
    let hitCount = 0;
    const dir = this._fwd.set(0, 0, -1);
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      if (this.applyDamage(a.id, amount, dir, 0)) hitCount++;
    }
    return hitCount;
  }

  public applyBurn(targetId: string, durationSec: number, dps = 2): void {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0 || a.mindControlImmune || a.forcefieldExternalImmune) return;
    const wasBurning = a.burningTimer > 0;
    a.burningTimer = Math.max(a.burningTimer, durationSec);
    a.burnDps = dps;
    if (!wasBurning) a.burnTickAccum = 0;
  }

  public triggerTargetRagdoll(
    targetId: string,
    ragdollDurationSec: number,
    knockbackImpulse?: THREE.Vector3,
    pushOnly = false,
  ): void {
    const a = this.enemyById.get(targetId);
    if (
      !a ||
      (a.paralysisImmune && a.hp > 0) ||
      (a.mindControlImmune && a.hp > 0) ||
      (a.forcefieldExternalImmune && a.hp > 0) ||
      (a.agathaShieldTimer > 0 && a.hp > 0) ||
      (a.heroId === 'magneto' && a.flying && a.hp > 0) ||
      (this.isUsingAbility(a) && a.hp > 0)
    ) {
      return;
    }
    this.clearActiveAction(a);
    if (!pushOnly) {
      a.ragdollPushOnly = false;
    }
    a.ragdollTimer = Math.max(a.ragdollTimer, ragdollDurationSec);
    if (!a.ragdoll.active) {
      a.ragdollPushOnly = pushOnly;
      a.ragdoll.trigger(
        a.position,
        this._zeroVec,
        a.facingYaw,
        knockbackImpulse,
      );
    }
  }

  public applyDamage(
    targetId: string,
    amount: number,
    hitDir: THREE.Vector3,
    ragdollDurationSec = 0,
    knockbackImpulse?: THREE.Vector3,
    options?: {
      bypassMindControlImmunity?: boolean;
      bypassExternalImmunity?: boolean;
      bypassShield?: boolean;
      noAggro?: boolean;
      isBeam?: boolean;
      pushOnly?: boolean;
    },
  ): boolean {
    const a = this.enemyById.get(targetId);
    if (!a || a.hp <= 0 || amount <= 0) return false;
    if (a.agathaTeleportTimer > 0) return false;
    if (a.mindControlImmune && !options?.bypassMindControlImmunity) {
      return false;
    }
    if (a.forcefieldExternalImmune && !options?.bypassExternalImmunity) {
      return false;
    }

    // Magneto airborne protective Magnetic Shield (ONLY active while flying)
    if (
      a.heroId === 'magneto' &&
      a.flying &&
      !options?.bypassMindControlImmunity &&
      !options?.bypassExternalImmunity
    ) {
      if (!options?.noAggro) {
        a.aggro = true;
        a.loseInterestTimer = 10;
      }
      a.hitFlashTimer = 0.08;
      return true;
    }

    // Agatha Purple Darkhold Mystic Shield (100 durability) absorbs hits before HP
    let remainingDmg = amount;
    if (
      !options?.bypassShield &&
      a.forcefieldShieldHp > 0
    ) {
      const absorbed = Math.min(a.forcefieldShieldHp, remainingDmg);
      a.forcefieldShieldHp -= absorbed;
      remainingDmg -= absorbed;
      if (a.forcefieldShieldHp <= 0) {
        a.forcefieldShieldHp = 0;
        a.forcefieldShieldMaxHp = 0;
      }
      if (remainingDmg <= 0) {
        if (!options?.noAggro) {
          a.aggro = true;
          a.loseInterestTimer = 10;
        }
        a.hitFlashTimer = 0.08;
        return true;
      }
    }

    if (
      a.heroId === 'agatha-harkness' &&
      a.agathaAutoShieldTimer > 0 &&
      a.agathaAutoShieldHp > 0 &&
      !options?.bypassMindControlImmunity &&
      !options?.bypassShield
    ) {
      const absorbed = Math.min(a.agathaAutoShieldHp, remainingDmg);
      a.agathaAutoShieldHp -= absorbed;
      remainingDmg -= absorbed;
      a.agathaDarkholdShield?.triggerDeflectFlash();
      if (a.agathaAutoShieldHp <= 0) {
        a.agathaAutoShieldTimer = 0;
        a.agathaAutoShieldHp = 0;
      }
      if (remainingDmg <= 0) {
        if (!options?.noAggro) {
          a.aggro = true;
          a.loseInterestTimer = 10;
        }
        a.hitFlashTimer = 0.08;
        return true;
      }
    }

    // Agatha Absorption Shield: tracks received damage, blocks ragdoll/knockback, triggers on Beam immediately or 2nd regular hit
    let finalAmount = remainingDmg;
    let blockRagdoll = false;
    if (
      a.heroId === 'agatha-harkness' &&
      a.agathaShieldTimer > 0 &&
      !options?.bypassExternalImmunity
    ) {
      blockRagdoll = true;
      const applied = Math.min(a.hp, finalAmount);
      a.agathaShieldTrackedDmg += applied;
      if (options?.isBeam) {
        this.triggerAiAgathaAbsorption(a);
      } else {
        a.agathaShieldHits++;
        if (a.agathaShieldHits >= 2) {
          this.triggerAiAgathaAbsorption(a);
        }
      }
    }

    a.hp = Math.max(0, a.hp - finalAmount);
    a.trailHoldTimer = TRAIL_DELAY_SEC;
    a.hitFlashTimer = 0.14;
    if (!options?.noAggro) {
      a.aggro = true;
      a.loseInterestTimer = 12;
    }

    const dd = a.damageDisplay;
    if (!dd.active) {
      const side = Math.random() > 0.5 ? 1 : -1;
      dd.active = true;
      dd.total = finalAmount;
      dd.driftDir = side;
      dd.offsetX = side * (62 + Math.random() * 10);
      dd.offsetY = -4 - Math.random() * 8;
    } else {
      dd.total += finalAmount;
    }
    dd.popTimer = 0.22;
    dd.idleTimer = 0;

    const abilityActive = this.isUsingAbility(a);
    const immuneToCc =
      (a.paralysisImmune ||
        a.mindControlImmune ||
        a.forcefieldExternalImmune ||
        blockRagdoll ||
        abilityActive) &&
      a.hp > 0;
    if (!immuneToCc) {
      if (ragdollDurationSec > 0) {
        this.clearActiveAction(a);
        if (!options?.pushOnly) {
          a.ragdollPushOnly = false;
        }
        a.ragdollTimer = Math.max(a.ragdollTimer, ragdollDurationSec);
        if (!a.ragdoll.active) {
          a.ragdollPushOnly = Boolean(options?.pushOnly);
          a.ragdoll.trigger(
            a.position,
            this._zeroVec,
            a.facingYaw,
            knockbackImpulse,
          );
        }
      } else if (!a.ragdoll.active) {
        const sinY = Math.sin(a.facingYaw);
        const cosY = Math.cos(a.facingYaw);
        this._fwd.set(-sinY, 0, -cosY);
        this._right.set(cosY, 0, -sinY);
        a.animator.triggerHitReaction(hitDir.dot(this._fwd), hitDir.dot(this._right));
      }
    }

    if (a.hp <= 0) {
      this.clearActiveAction(a);
      a.burningTimer = 0;
      a.flying = false;
      a.agathaShieldTimer = 0;
      a.agathaShieldHits = 0;
      a.agathaShieldTrackedDmg = 0;
      a.agathaDarkholdTimer = 0;
      a.agathaDarkholdBook?.setOpen(false, true);
      a.agathaAutoShieldTimer = 0;
      a.agathaAutoShieldHp = 0;
      a.agathaTeleportTimer = 0;
      a.rig.root.visible = true;
      a.painRestricted = false;
      a.paralyzed = false;
      a.paralysisImmune = false;
      a.mindControlImmune = false;
      a.clonesRestricted = false;
      a.agathaDrainVictim = false;
      a.forcefieldShieldHp = 0;
      a.forcefieldShieldMaxHp = 0;
      a.forcefieldTrapped = false;
      a.forcefieldAbilitiesLocked = false;
      a.forcefieldExternalImmune = false;
      a.rig.setWhiteOutline(false);
      a.externalControl = false;
      a.externalHeadache = false;
      a.externalLimp = false;
      a.externalVampireVictim = false;
      a.externalPitchX = 0;
      a.animator.setVampireVictim(false);
      a.rig.root.rotation.x = 0;
      a.verticalVelocity = 0;
      a.position.y = 0;
      a.headacheTimer = 0;
      a.aggro = false;
      a.respawnTimer = 6.5;
      if (!a.rewardClaimed) {
        a.rewardClaimed = true;
        this.pendingEliminations.push({
          id: a.id,
          coins: a.coinReward,
          worldPos: new THREE.Vector3(a.position.x, a.position.y + 1.05, a.position.z),
        });
      }
      if (!a.ragdoll.active) {
        a.ragdollPushOnly = false;
        a.ragdollTimer = 3.5;
        this._knockVec.copy(hitDir).multiplyScalar(2.2);
        a.ragdoll.trigger(
          a.position,
          this._zeroVec,
          a.facingYaw,
          this._knockVec,
        );
      } else {
        a.ragdollPushOnly = false;
      }
    }

    return true;
  }

  public applyAreaImplosion(
    center: THREE.Vector3,
    radius: number,
    damage: number,
    ragdollDurationSec: number,
  ): number {
    let hitCount = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      const dx = a.position.x - center.x;
      const dy = a.position.y + 0.9 - center.y;
      const dz = a.position.z - center.z;
      if (Math.hypot(dx, dy, dz) <= radius) {
        this._pullVec.set(-dx, 0, -dz);
        const hz = Math.hypot(dx, dz);
        if (hz > 0.05) {
          this._pullVec.normalize().multiplyScalar(THREE.MathUtils.clamp(hz * 0.72, 1.4, 3.6));
        } else {
          this._pullVec.set(0, 0, 0);
        }
        this._pullVec.y = 0.28;
        this._dirVec.set(dx, 0, dz);
        if (this._dirVec.lengthSq() > 0.001) this._dirVec.normalize();
        if (this.applyDamage(a.id, damage, this._dirVec, ragdollDurationSec, this._pullVec)) {
          hitCount++;
        }
      }
    }
    return hitCount;
  }

  public applyAreaFireExplosion(
    center: THREE.Vector3,
    radius: number,
    damage: number,
    ragdollDurationSec: number,
    knockbackStrength: number,
    burnDurationSec = 0,
    burnDps = 2,
    excludeId?: string,
  ): number {
    let hitCount = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0 || a.id === excludeId) continue;
      const dx = a.position.x - center.x;
      const dz = a.position.z - center.z;
      if (Math.hypot(dx, dz) <= radius) {
        this._dirVec.set(dx, 0, dz);
        if (this._dirVec.lengthSq() < 0.001) {
          this._dirVec.set(Math.sin(a.facingYaw), 0, Math.cos(a.facingYaw));
        } else {
          this._dirVec.normalize();
        }
        this._knockVec.copy(this._dirVec).multiplyScalar(knockbackStrength);
        this._knockVec.y = 0.42;
        if (this.applyDamage(a.id, damage, this._dirVec, ragdollDurationSec, this._knockVec)) {
          hitCount++;
          if (burnDurationSec > 0 && a.hp > 0) {
            this.applyBurn(a.id, burnDurationSec, burnDps);
          }
        }
      }
    }
    return hitCount;
  }

  private spawnSmokeBurst(pos: THREE.Vector3, colorHex: string, maxScale = 2.6): void {
    let burst: AiSmokeBurst | undefined;
    if (this.smokeBursts.length >= 10) {
      burst = this.smokeBursts.shift();
    } else {
      burst = this.smokeBurstPool.pop();
    }

    if (!burst) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.smokeGeo, mat);
      this.group.add(mesh);
      burst = {
        mesh,
        mat,
        elapsed: 0,
        duration: 0.42,
        maxScale,
      };
    } else {
      burst.mat.color.set(colorHex);
      burst.mat.opacity = 0.65;
    }

    burst.mesh.visible = true;
    burst.mesh.position.set(pos.x, pos.y + 0.9, pos.z);
    burst.mesh.scale.setScalar(0.35);
    burst.elapsed = 0;
    burst.duration = 0.42;
    burst.maxScale = maxScale;
    this.smokeBursts.push(burst);
  }

  private spawnProjectile(
    actor: PlayableAiActor,
    kind: AiProjectile['kind'],
    targetPos: THREE.Vector3,
    targetType: 'player' | 'astral-body',
  ): void {
    const rightSide = actor.nextHandRight;
    actor.nextHandRight = !actor.nextHandRight;
    const sinY = Math.sin(actor.facingYaw);
    const cosY = Math.cos(actor.facingYaw);
    const sideSign = rightSide ? 1 : -1;

    this._originVec.set(
      actor.position.x - sinY * 0.55 + cosY * 0.34 * sideSign,
      actor.position.y + 1.24,
      actor.position.z - cosY * 0.55 - sinY * 0.34 * sideSign,
    );

    this._dirVec.set(
      targetPos.x - this._originVec.x,
      targetPos.y + 1.05 - this._originVec.y,
      targetPos.z - this._originVec.z,
    );
    if (this._dirVec.lengthSq() < 1e-4) {
      this._dirVec.set(-sinY, 0, -cosY);
    } else {
      this._dirVec.normalize();
    }

    const pool = this.projectilePools[kind];
    let proj = pool.pop();
    if (!proj) {
      const holder = new THREE.Group();
      if (kind === 'metal-beam') {
        holder.add(new THREE.Mesh(this.steelBeamGeo, this.steelMat));
      } else {
        const coreMat = kind === 'chaos-bolt' ? this.wandaBoltMat : this.agathaBoltMat;
        const haloMat = kind === 'chaos-bolt' ? this.wandaHaloMat : this.agathaHaloMat;
        holder.add(new THREE.Mesh(this.boltSphereGeo, coreMat));
        holder.add(new THREE.Mesh(this.boltHaloGeo, haloMat));
      }
      this.group.add(holder);
      proj = {
        kind,
        mesh: holder,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 1.5,
        damage: 0,
        attackerId: '',
        targetType: 'player',
      };
    }

    proj.mesh.visible = true;
    proj.mesh.position.copy(this._originVec);
    if (kind === 'metal-beam') {
      proj.mesh.lookAt(
        this._originVec.x + this._dirVec.x,
        this._originVec.y + this._dirVec.y,
        this._originVec.z + this._dirVec.z,
      );
    }

    const speed = kind === 'metal-beam' ? 25.0 : kind === 'chaos-bolt' ? 23.0 : 21.0;
    const damage = kind === 'metal-beam' ? 16 : kind === 'chaos-bolt' ? 15 : 17;
    proj.pos.copy(this._originVec);
    proj.vel.copy(this._dirVec).multiplyScalar(speed);
    proj.life = 1.5;
    proj.damage = damage;
    proj.attackerId = actor.id;
    proj.targetType = targetType;

    this.projectiles.push(proj);
  }

  private orientBeam(
    mesh: THREE.Mesh,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
  ): void {
    this._mid.addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(this._mid);
    const len = Math.max(0.05, start.distanceTo(end));
    mesh.scale.set(radius, len, radius);
    this._tmpA.subVectors(end, start).normalize();
    mesh.quaternion.setFromUnitVectors(this._up, this._tmpA);
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    reticleNdcX: number,
    reticleNdcY: number,
    viewportWidth: number,
    viewportHeight: number,
    onBurnTick?: () => void,
    onEliminated?: (events: NpcEliminationEvent[]) => void,
    playerTargetable = true,
    onPlayerHit?: (
      damage: number,
      kind: 'ai-ability',
      hitDir: THREE.Vector3,
      attackerId: string,
      knockbackForce?: number,
      isBeam?: boolean,
    ) => void,
    astralBodyPos: THREE.Vector3 | null = null,
    onAstralBodyHit?: (damage: number, attackerId: string) => void,
    onRockImpact?: (pos: THREE.Vector3, force: number, colorHex?: string) => void,
  ): NpcHudSnapshot[] {
    const safeDt = Math.min(dt, 0.05);
    this.animTime += safeDt;
    const maxBound = BASEPLATE_HALF_INNER - 0.85;

    const activeTargetPos = astralBodyPos ?? playerPos;
    const activeTargetType: 'player' | 'astral-body' = astralBodyPos
      ? 'astral-body'
      : 'player';
    const hasValidTarget = Boolean(astralBodyPos || playerTargetable);

    for (const a of this.enemies) {
      // Burn DoT
      if (a.hp > 0 && a.burningTimer > 0) {
        a.burningTimer = Math.max(0, a.burningTimer - safeDt);
        a.burnTickAccum += safeDt;
        if (a.burnTickAccum >= 1.0) {
          a.burnTickAccum -= 1.0;
          const dir = this._fwd.set(0, 0, -1);
          if (this.applyDamage(a.id, a.burnDps, dir, 0)) {
            onBurnTick?.();
          }
        }
      }

      if (a.hp > 0 && a.burningTimer > 0) {
        a.burnSprite.visible = true;
        const flicker = 0.88 + Math.sin(this.animTime * 16 + a.spawnPos.x) * 0.14;
        a.burnSprite.position.set(
          a.position.x,
          a.position.y + (a.ragdoll.active ? 0.35 : 0.95),
          a.position.z,
        );
        a.burnSprite.scale.set(1.05 * flicker, 1.38 * flicker, 1);
        (a.burnSprite.material as THREE.SpriteMaterial).opacity =
          Math.min(1, a.burningTimer * 1.4) * 0.72;
      } else {
        a.burnSprite.visible = false;
      }

      if (a.hitFlashTimer > 0) {
        a.hitFlashTimer = Math.max(0, a.hitFlashTimer - safeDt);
        a.rig.setHitFlash(a.hitFlashTimer / 0.14);
      } else {
        a.rig.setHitFlash(0);
      }

      if (a.trailHoldTimer > 0) {
        a.trailHoldTimer = Math.max(0, a.trailHoldTimer - safeDt);
      } else if (a.trailHp > a.hp) {
        a.trailHp = Math.max(a.hp, a.trailHp - 75 * safeDt);
      } else {
        a.trailHp = a.hp;
      }

      // Shield & Agatha Darkhold visuals sync
      if (a.heroId === 'agatha-harkness') {
        if (a.agathaShieldTimer > 0 && a.hp > 0) {
          a.agathaShieldTimer = Math.max(0, a.agathaShieldTimer - safeDt);
          a.agathaShieldMesh.visible = true;
          a.agathaShieldMesh.rotation.y += safeDt * 1.8;
          if (a.agathaShieldTimer <= 0) {
            a.agathaShieldTrackedDmg = 0;
            a.agathaShieldHits = 0;
          }
        } else {
          a.agathaShieldMesh.visible = false;
        }
        if (a.agathaDarkholdTimer > 0 && a.hp > 0) {
          a.agathaDarkholdTimer = Math.max(0, a.agathaDarkholdTimer - safeDt);
          if (a.agathaDarkholdTimer <= 0) {
            a.agathaDarkholdBook?.setOpen(false);
          }
        }
        if (a.agathaAutoShieldTimer > 0 && a.hp > 0) {
          a.agathaAutoShieldTimer = Math.max(0, a.agathaAutoShieldTimer - safeDt);
          if (a.agathaAutoShieldTimer <= 0) a.agathaAutoShieldHp = 0;
        }
        if (a.agathaTeleportTimer > 0 && a.hp > 0) {
          a.agathaTeleportTimer = Math.max(0, a.agathaTeleportTimer - safeDt);
          a.rig.root.visible = false;
          if (a.agathaTeleportTimer <= 0) {
            a.position.copy(a.agathaTeleportDest);
            a.rig.root.visible = true;
            this.spawnSmokeBurst(a.position, '#A848FF', 3.0);
          }
        } else {
          a.rig.root.visible = true;
        }
        a.agathaDarkholdBook?.update(
          safeDt,
          a.position,
          a.facingYaw,
          a.agathaTeleportTimer > 0 || a.hp <= 0,
        );
        a.agathaDarkholdShield?.update(
          safeDt,
          a.agathaAutoShieldTimer > 0 && a.agathaAutoShieldHp > 0 && a.hp > 0,
          a.position,
          a.agathaAutoShieldTimer / 10.0,
        );
        a.agathaVfx?.update(safeDt, a.position, false, [], () => {});
      } else {
        a.agathaShieldMesh.visible = false;
      }
      if (a.heroId === 'magneto' && a.flying && a.hp > 0) {
        a.magnetoShieldMesh.visible = true;
        a.magnetoShieldMesh.rotation.y -= safeDt * 1.4;
      } else {
        a.magnetoShieldMesh.visible = false;
      }

      // Dead & Respawn
      if (a.hp <= 0) {
        a.respawnTimer -= safeDt;
        if (a.ragdoll.active) {
          const pelvisPos = a.ragdoll.update(safeDt);
          a.position.set(pelvisPos.x, 0, pelvisPos.z);
        }
        if (a.respawnTimer <= 0) {
          this.clearActiveAction(a);
          a.ragdoll.reset();
          a.position.copy(a.spawnPos);
          a.patrolTarget.copy(a.spawnPos);
          a.rig.root.position.copy(a.spawnPos);
          a.rig.root.rotation.set(0, a.facingYaw, 0);
          a.rig.root.visible = true;
          a.hp = a.maxHp;
          a.trailHp = a.maxHp;
          a.ragdollTimer = 0;
          a.ragdollPushOnly = false;
          a.burningTimer = 0;
          a.burnTickAccum = 0;
          a.flying = false;
          a.flightTimer = 0;
          a.flightCd = 2.0;
          a.agathaShieldTimer = 0;
          a.agathaShieldHits = 0;
          a.agathaShieldTrackedDmg = 0;
          a.agathaDarkholdTimer = 0;
          a.agathaDarkholdBook?.setOpen(false, true);
          a.agathaAutoShieldTimer = 0;
          a.agathaAutoShieldHp = 0;
          a.agathaTeleportTimer = 0;
          a.primaryCharges = 3;
          a.primaryCd = 0.5;
          a.secondaryCd = 2.0;
          a.specialCd = 4.0;
          a.defenseCd = 2.5;
          a.painRestricted = false;
          a.paralyzed = false;
          a.paralysisImmune = false;
          a.mindControlImmune = false;
          a.clonesRestricted = false;
          a.agathaDrainVictim = false;
          a.forcefieldShieldHp = 0;
          a.forcefieldShieldMaxHp = 0;
          a.forcefieldTrapped = false;
          a.forcefieldAbilitiesLocked = false;
          a.forcefieldExternalImmune = false;
          a.rig.setWhiteOutline(false);
          a.externalControl = false;
          a.externalHeadache = false;
          a.externalLimp = false;
          a.externalVampireVictim = false;
          a.externalPitchX = 0;
          a.verticalVelocity = 0;
          a.headacheTimer = 0;
          a.rewardClaimed = false;
          a.aggro = false;
          a.animator.reset(a.rig, a.archetype, a.preset.skinId);
        }
      } else if (a.ragdoll.active) {
        const pelvisPos = a.ragdoll.update(safeDt);
        a.position.set(pelvisPos.x, 0, pelvisPos.z);
        a.verticalVelocity = 0;
        a.ragdollTimer -= safeDt;
        if (a.ragdollTimer <= 0 || (a.ragdollPushOnly && a.ragdoll.isPushComplete())) {
          a.ragdollTimer = 0;
          a.ragdollPushOnly = false;
          a.ragdoll.reset();
          a.rig.root.position.copy(a.position);
          a.rig.root.rotation.set(0, a.facingYaw, 0);
          a.animator.reset(a.rig, a.archetype, a.preset.skinId);
        }
      } else {
        // Vertical gravity / hover
        if (!a.externalControl) {
          if (a.activeAction.kind === 'none') {
            const targetY = a.flying ? (a.heroId === 'magneto' ? 1.25 : 1.05) : 0;
            if (a.flying || a.position.y > 0.02) {
              a.position.y = THREE.MathUtils.damp(a.position.y, targetY, 6.5, safeDt);
              if (!a.flying && a.position.y < 0.03) a.position.y = 0;
            }
          }
        }

        if (a.paralyzed && !a.externalControl) {
          this.clearActiveAction(a);
          a.rig.root.position.copy(a.position);
          a.rig.root.rotation.y = a.facingYaw;
        } else {
          // Tick cooldowns
          if (a.headacheTimer > 0) a.headacheTimer = Math.max(0, a.headacheTimer - safeDt);
          if (a.globalCd > 0) a.globalCd = Math.max(0, a.globalCd - safeDt);
          if (a.primaryCd > 0) a.primaryCd = Math.max(0, a.primaryCd - safeDt);
          if (a.secondaryCd > 0) a.secondaryCd = Math.max(0, a.secondaryCd - safeDt);
          if (a.specialCd > 0) a.specialCd = Math.max(0, a.specialCd - safeDt);
          if (a.defenseCd > 0) a.defenseCd = Math.max(0, a.defenseCd - safeDt);
          if (a.flightCd > 0) a.flightCd = Math.max(0, a.flightCd - safeDt);
          if (a.agathaDarkholdCd > 0) a.agathaDarkholdCd = Math.max(0, a.agathaDarkholdCd - safeDt);
          if (a.agathaBlastCd > 0) a.agathaBlastCd = Math.max(0, a.agathaBlastCd - safeDt);
          if (a.agathaAutoShieldCd > 0) a.agathaAutoShieldCd = Math.max(0, a.agathaAutoShieldCd - safeDt);
          if (a.agathaTeleportCd > 0) a.agathaTeleportCd = Math.max(0, a.agathaTeleportCd - safeDt);
          if (a.heroId === 'wanda-zombie' && a.primaryCharges < 3) {
            a.primaryRechargeTimer += safeDt;
            if (a.primaryRechargeTimer >= 1.6) {
              a.primaryRechargeTimer = 0;
              a.primaryCharges++;
            }
          }
          if (a.flying) {
            a.flightTimer -= safeDt;
            if (a.flightTimer <= 0 && a.activeAction.kind === 'none') {
              a.flying = false;
              a.flightCd = 8.5;
            }
          }

          a.strafeTimer -= safeDt;
          if (a.strafeTimer <= 0) {
            a.strafeDir = -a.strafeDir;
            a.strafeTimer = 1.4 + Math.random() * 1.4;
          }

          const headacheActive = a.headacheTimer > 0 || a.externalHeadache;
          a.animator.setHeadache(headacheActive);
          a.animator.setAstralLimp(a.externalLimp);
          a.animator.setAgathaDrainVictim(a.agathaDrainVictim);
          a.animator.setVampireVictim(a.externalVampireVictim);
          const restricted =
            a.painRestricted ||
            a.paralyzed ||
            a.externalControl ||
            headacheActive ||
            a.externalLimp ||
            a.agathaDrainVictim ||
            a.externalVampireVictim ||
            a.forcefieldTrapped;

          let moving = false;

          if (restricted) {
            this.clearActiveAction(a);
          } else {
            const dxTarget = activeTargetPos.x - a.position.x;
            const dzTarget = activeTargetPos.z - a.position.z;
            const distTarget = Math.hypot(dxTarget, dzTarget);
            const distToZone = Math.hypot(
              activeTargetPos.x - a.zoneCenter.x,
              activeTargetPos.z - a.zoneCenter.z,
            );
            const losClear = hasLineOfSight(
              a.position.x,
              a.position.y + 1.25,
              a.position.z,
              activeTargetPos.x,
              activeTargetPos.y + 1.05,
              activeTargetPos.z,
            );

            // Detect player or retain aggro
            if (!hasValidTarget || distToZone > ZONE_CHASE_LIMIT_M) {
              a.aggro = false;
            } else if (distTarget <= DETECT_RANGE_M && losClear) {
              a.aggro = true;
              a.loseInterestTimer = 10;
            } else if (a.aggro) {
              a.loseInterestTimer -= safeDt;
              if (a.loseInterestTimer <= 0) a.aggro = false;
            }

            // Update active channeled/telegraphed hero actions first
            if (a.activeAction.kind !== 'none') {
              const act = a.activeAction;
              act.elapsed += safeDt;

              if (act.kind === 'zombie-beam') {
                const targetYaw = Math.atan2(-dxTarget, -dzTarget);
                a.facingYaw = dampAngle(a.facingYaw, targetYaw, 10, safeDt);
                const sinY = Math.sin(a.facingYaw);
                const cosY = Math.cos(a.facingYaw);
                this._tmpA.set(
                  a.position.x - sinY * 0.45 + cosY * 0.25,
                  a.position.y + 1.25,
                  a.position.z - cosY * 0.45 - sinY * 0.25,
                );
                this._tmpB.set(
                  activeTargetPos.x,
                  activeTargetPos.y + 1.05,
                  activeTargetPos.z,
                );
                const inBeamRange = distTarget <= 16.5 && hasValidTarget && losClear;
                a.beamLine.visible = inBeamRange;
                if (inBeamRange) {
                  this.orientBeam(a.beamLine, this._tmpA, this._tmpB, 1.0);
                  act.tickAccum += safeDt;
                  if (act.tickAccum >= 0.45) {
                    act.tickAccum -= 0.45;
                    this._hitDir.set(dxTarget, 0, dzTarget).normalize();
                    if (activeTargetType === 'astral-body' && astralBodyPos) {
                      onAstralBodyHit?.(7, a.id);
                    } else {
                      onPlayerHit?.(7, 'ai-ability', this._hitDir, a.id, undefined, true);
                    }
                  }
                }
                if (act.elapsed >= act.duration || !hasValidTarget) {
                  this.clearActiveAction(a);
                }
              } else if (act.kind === 'zombie-stone') {
                const gatherP = Math.min(1, act.elapsed / act.gatherDuration);
                a.position.y = THREE.MathUtils.lerp(act.startY, 4.35, Math.sin(gatherP * Math.PI * 0.5));
                act.ringMesh.position.set(a.position.x, 0.04, a.position.z);
                act.ringMesh.scale.setScalar(0.8 + gatherP * 7.8);
                for (let si = 0; si < act.stones.length; si++) {
                  const ang = this.animTime * 3.8 + (si / act.stones.length) * Math.PI * 2;
                  const rad = THREE.MathUtils.lerp(4.2, 0.9, gatherP);
                  act.stones[si].position.set(
                    a.position.x + Math.cos(ang) * rad,
                    a.position.y + 0.9 + Math.sin(this.animTime * 5 + si) * 0.35,
                    a.position.z + Math.sin(ang) * rad,
                  );
                  act.stones[si].rotation.x += safeDt * 4;
                  act.stones[si].rotation.y += safeDt * 5;
                }
                if (!act.detonated && act.elapsed >= act.gatherDuration) {
                  act.detonated = true;
                  this._tmpA.set(a.position.x, 0, a.position.z);
                  onRockImpact?.(this._tmpA, 1.45, '#7A0B1E');
                  this.spawnSmokeBurst(a.position, '#C41630', 5.2);
                  if (hasValidTarget && Math.hypot(activeTargetPos.x - a.position.x, activeTargetPos.z - a.position.z) <= 10.5) {
                    this._hitDir.set(dxTarget, 0, dzTarget);
                    if (this._hitDir.lengthSq() > 1e-4) this._hitDir.normalize();
                    else this._hitDir.set(0, 0, -1);
                    if (activeTargetType === 'astral-body' && astralBodyPos) {
                      onAstralBodyHit?.(24, a.id);
                    } else {
                      onPlayerHit?.(24, 'ai-ability', this._hitDir, a.id, 6.2);
                    }
                  }
                  this.clearActiveAction(a);
                }
              } else if (act.kind === 'agatha-absorb') {
                // Immobilized while absorbing: wide-armed arched-back pose + glowing tendrils from attacker into hands & chest
                const targetYaw = Math.atan2(-dxTarget, -dzTarget);
                a.facingYaw = dampAngle(a.facingYaw, targetYaw, 12, safeDt);
                a.agathaVfx?.updateAbsorbTendrils(
                  'ai-agatha-absorb',
                  safeDt,
                  a.position,
                  a.facingYaw,
                  activeTargetPos,
                );
                act.tickAccum += safeDt;
                if (act.tickAccum >= 0.36 && hasValidTarget && distTarget <= 15) {
                  act.tickAccum -= 0.36;
                  this._hitDir.set(dxTarget, 0, dzTarget).normalize();
                  if (activeTargetType === 'astral-body' && astralBodyPos) {
                    onAstralBodyHit?.(6, a.id);
                  } else {
                    onPlayerHit?.(6, 'ai-ability', this._hitDir, a.id, undefined, true);
                  }
                  a.hp = Math.min(a.maxHp, a.hp + 4);
                }
                if (act.elapsed >= act.duration || !hasValidTarget) {
                  this.spawnSmokeBurst(a.position, '#B54EFF', 4.8);
                  this.clearActiveAction(a);
                }
              } else if (act.kind === 'magneto-meteor') {
                if (act.elapsed < act.chargeDuration) {
                  const cp = act.elapsed / act.chargeDuration;
                  a.position.y = THREE.MathUtils.lerp(a.position.y, 1.9, safeDt * 4);
                  act.meteorMesh.position.set(
                    act.targetPos.x,
                    7.8 - cp * 0.8,
                    act.targetPos.z,
                  );
                  act.meteorMesh.scale.setScalar(0.35 + cp * 0.85);
                  act.meteorMesh.rotation.y += safeDt * 2.5;
                  act.ringMesh.scale.setScalar(5.8 * (0.4 + cp * 0.6));
                } else {
                  const fp = Math.min(1, (act.elapsed - act.chargeDuration) / act.fallDuration);
                  act.meteorMesh.position.set(
                    act.targetPos.x,
                    THREE.MathUtils.lerp(7.0, 0.85, fp * fp),
                    act.targetPos.z,
                  );
                  act.meteorMesh.rotation.x += safeDt * 6;
                  if (!act.impacted && fp >= 1) {
                    act.impacted = true;
                    onRockImpact?.(act.targetPos, 1.9, '#8E3BFF');
                    this.spawnSmokeBurst(act.targetPos, '#9D52FF', 5.8);
                    const dImpact = Math.hypot(
                      activeTargetPos.x - act.targetPos.x,
                      activeTargetPos.z - act.targetPos.z,
                    );
                    if (hasValidTarget && dImpact <= 6.2) {
                      this._hitDir
                        .set(
                          activeTargetPos.x - act.targetPos.x,
                          0,
                          activeTargetPos.z - act.targetPos.z,
                        );
                      if (this._hitDir.lengthSq() > 1e-4) this._hitDir.normalize();
                      else this._hitDir.set(0, 0, -1);
                      if (activeTargetType === 'astral-body' && astralBodyPos) {
                        onAstralBodyHit?.(30, a.id);
                      } else {
                        onPlayerHit?.(30, 'ai-ability', this._hitDir, a.id, 7.2);
                      }
                    }
                    this.clearActiveAction(a);
                  }
                }
              } else if (act.kind === 'magneto-tornado') {
                a.position.y = THREE.MathUtils.damp(a.position.y, 1.5, 6, safeDt);
                act.vortexGroup.position.set(a.position.x, a.position.y, a.position.z);
                act.vortexGroup.rotation.y += safeDt * 9.0;
                act.tickAccum += safeDt;
                if (act.tickAccum >= 0.55) {
                  act.tickAccum -= 0.55;
                  if (hasValidTarget && distTarget <= 7.8) {
                    this._hitDir.set(dxTarget, 0, dzTarget);
                    if (this._hitDir.lengthSq() > 1e-4) this._hitDir.normalize();
                    else this._hitDir.set(0, 0, -1);
                    if (activeTargetType === 'astral-body' && astralBodyPos) {
                      onAstralBodyHit?.(6, a.id);
                    } else {
                      onPlayerHit?.(6, 'ai-ability', this._hitDir, a.id);
                    }
                  }
                }
                if (act.elapsed >= act.duration || !hasValidTarget) {
                  this.clearActiveAction(a);
                }
              }
            } else if (a.aggro && hasValidTarget) {
              // Combat positioning + intelligent character-specific ability selection
              const targetYaw = Math.atan2(-dxTarget, -dzTarget);
              a.facingYaw = dampAngle(a.facingYaw, targetYaw, 10, safeDt);

              const immobilized =
                (a.heroId === 'agatha-harkness' && a.agathaShieldTimer > 0) ||
                a.agathaTeleportTimer > 0;
              const clonesSlow = a.clonesRestricted ? 0.35 : 1;
              const idealMin = a.heroId === 'agatha-harkness' ? 5.2 : 6.8;
              const idealMax = a.heroId === 'agatha-harkness' ? 11.5 : 13.5;
              const dirX = distTarget > 0.01 ? dxTarget / distTarget : 0;
              const dirZ = distTarget > 0.01 ? dzTarget / distTarget : -1;

              // Move to maintain combat distance & clear pillar LOS (unless immobilized)
              if (!immobilized) {
                if (!losClear || distTarget > idealMax) {
                  const strafeW = losClear ? 0.25 * a.strafeDir : 0.85 * a.strafeDir;
                  const mx = dirX + -dirZ * strafeW;
                  const mz = dirZ + dirX * strafeW;
                  const ml = Math.hypot(mx, mz) || 1;
                  const step = a.moveSpeed * (a.flying ? 1.25 : 1) * clonesSlow * safeDt;
                  a.position.x = THREE.MathUtils.clamp(
                    a.position.x + (mx / ml) * step,
                    -maxBound,
                    maxBound,
                  );
                  a.position.z = THREE.MathUtils.clamp(
                    a.position.z + (mz / ml) * step,
                    -maxBound,
                    maxBound,
                  );
                  if (!a.flying) resolveHorizontalObstaclePush(a.position, 0.48);
                  moving = true;
                } else if (distTarget < idealMin) {
                  const mx = -dirX * 0.6 + -dirZ * 0.65 * a.strafeDir;
                  const mz = -dirZ * 0.6 + dirX * 0.65 * a.strafeDir;
                  const ml = Math.hypot(mx, mz) || 1;
                  const step = a.moveSpeed * 0.82 * clonesSlow * safeDt;
                  a.position.x = THREE.MathUtils.clamp(
                    a.position.x + (mx / ml) * step,
                    -maxBound,
                    maxBound,
                  );
                  a.position.z = THREE.MathUtils.clamp(
                    a.position.z + (mz / ml) * step,
                    -maxBound,
                    maxBound,
                  );
                  if (!a.flying) resolveHorizontalObstaclePush(a.position, 0.48);
                  moving = true;
                } else {
                  // Smooth tactical combat strafe
                  const step = a.moveSpeed * 0.55 * clonesSlow * safeDt;
                  a.position.x = THREE.MathUtils.clamp(
                    a.position.x + -dirZ * a.strafeDir * step,
                    -maxBound,
                    maxBound,
                  );
                  a.position.z = THREE.MathUtils.clamp(
                    a.position.z + dirX * a.strafeDir * step,
                    -maxBound,
                    maxBound,
                  );
                  if (!a.flying) resolveHorizontalObstaclePush(a.position, 0.48);
                  moving = true;
                }
              }

              // Decision making (respects cooldowns, LOS & playable ability rules)
              if (!a.clonesRestricted && !a.forcefieldAbilitiesLocked && a.globalCd <= 0 && !immobilized) {
                if (a.heroId === 'wanda-zombie') {
                  if (!a.flying && a.flightCd <= 0 && (a.hp < a.maxHp * 0.65 || distTarget > 12)) {
                    a.flying = true;
                    a.flightTimer = 5.5;
                    a.globalCd = 0.5;
                  } else if (a.specialCd <= 0 && distTarget <= 9.2 && a.stoneRingMesh && a.stoneMeshes) {
                    // Chaos Stone Explosion (never activates flight toggle)
                    a.flying = false;
                    a.specialCd = 11.5;
                    a.globalCd = 1.6;
                    a.animator.triggerCast('zombie-stone-explosion', 1.35);
                    a.stoneRingMesh.visible = true;
                    for (let s = 0; s < a.stoneMeshes.length; s++) {
                      a.stoneMeshes[s].visible = true;
                    }
                    a.activeAction = {
                      kind: 'zombie-stone',
                      elapsed: 0,
                      gatherDuration: 1.25,
                      startY: a.position.y,
                      detonated: false,
                      ringMesh: a.stoneRingMesh,
                      stones: a.stoneMeshes,
                    };
                  } else if (a.secondaryCd <= 0 && losClear && distTarget <= 14.5) {
                    // Zombie Beam
                    a.secondaryCd = 7.0;
                    a.globalCd = 0.8;
                    a.animator.setZombieBeam(true);
                    a.activeAction = {
                      kind: 'zombie-beam',
                      elapsed: 0,
                      duration: 2.2,
                      tickAccum: 0,
                    };
                  } else if (a.primaryCd <= 0 && a.primaryCharges > 0 && losClear && distTarget <= 20) {
                    a.primaryCharges--;
                    a.primaryCd = 0.65;
                    a.globalCd = 0.45;
                    a.animator.triggerCast(
                      a.nextHandRight ? 'bolt-right' : 'bolt-left',
                      0.34,
                    );
                    this.spawnProjectile(a, 'chaos-bolt', activeTargetPos, activeTargetType);
                  }
                } else if (a.heroId === 'agatha-harkness') {
                  if (a.defenseCd <= 0 && distTarget <= 12) {
                    // Immobilizing Absorb Shield (tracks damage, cancels immediately on Beam or 2nd hit)
                    a.flying = false;
                    a.defenseCd = 13.0;
                    a.agathaShieldTimer = 6.0;
                    a.agathaShieldHits = 0;
                    a.agathaShieldTrackedDmg = 0;
                    a.globalCd = 0.5;
                  } else if (a.agathaDarkholdTimer <= 0 && a.agathaDarkholdCd <= 0) {
                    // Open Agatha's purple Darkhold for 12s
                    a.agathaDarkholdTimer = 12.0;
                    a.agathaDarkholdCd = 19.0;
                    a.agathaDarkholdBook?.setOpen(true);
                    a.globalCd = 0.55;
                  } else if (a.agathaDarkholdTimer > 0 && a.agathaAutoShieldCd <= 0 && a.agathaAutoShieldTimer <= 0) {
                    // Purple Darkhold Mystic Shield (100 durability)
                    a.agathaAutoShieldCd = 10.5;
                    a.agathaAutoShieldTimer = 10.0;
                    a.agathaAutoShieldHp = SHIELD_MAX_DURABILITY['agatha-auto-shield'];
                    a.globalCd = 0.45;
                  } else if (a.agathaDarkholdTimer > 0 && a.agathaBlastCd <= 0 && distTarget <= 7.2) {
                    // Purple Darkhold Arcane Blast
                    a.agathaBlastCd = 6.5;
                    a.globalCd = 0.7;
                    a.animator.triggerCast('implosion', 0.42);
                    this.spawnSmokeBurst(a.position, '#A848FF', 5.2);
                    if (hasValidTarget && distTarget <= 6.2) {
                      this._hitDir.set(dxTarget, 0, dzTarget).normalize();
                      if (activeTargetType === 'astral-body' && astralBodyPos) {
                        onAstralBodyHit?.(28, a.id);
                      } else {
                        onPlayerHit?.(28, 'ai-ability', this._hitDir, a.id, 6.2);
                      }
                    }
                  } else if (a.agathaDarkholdTimer > 0 && a.agathaTeleportCd <= 0 && distTarget > 12) {
                    // Purple Darkhold Teleport closer
                    a.agathaTeleportCd = 7.0;
                    a.agathaTeleportTimer = 0.45;
                    a.globalCd = 0.55;
                    this.spawnSmokeBurst(a.position, '#8B2EE8', 2.8);
                    const angle = Math.atan2(dzTarget, dxTarget) + (Math.random() - 0.5) * 0.8;
                    const hopDist = Math.max(5.5, distTarget - 6.5);
                    a.agathaTeleportDest.set(
                      THREE.MathUtils.clamp(a.position.x + Math.cos(angle) * hopDist, -maxBound, maxBound),
                      0,
                      THREE.MathUtils.clamp(a.position.z + Math.sin(angle) * hopDist, -maxBound, maxBound),
                    );
                    resolveHorizontalObstaclePush(a.agathaTeleportDest, 0.48);
                  } else if (!a.flying && a.flightCd <= 0 && distTarget > 9) {
                    a.flying = true;
                    a.flightTimer = 5.0;
                    a.globalCd = 0.45;
                  } else if (a.primaryCd <= 0 && losClear && distTarget <= 19) {
                    // Magic Bolt
                    a.primaryCd = 1.25;
                    a.globalCd = 0.5;
                    a.animator.triggerCast(
                      a.nextHandRight ? 'agatha-bolt-right' : 'agatha-bolt-left',
                      0.34,
                    );
                    this.spawnProjectile(a, 'agatha-bolt', activeTargetPos, activeTargetType);
                  }
                } else if (a.heroId === 'magneto') {
                  if (a.flying) {
                    // Magneto Flight & Magnetic Shield are exclusive: no other abilities usable while flying
                  } else if (a.flightCd <= 0 && (a.hp < a.maxHp * 0.68 || (a.secondaryCd > 4.0 && a.specialCd > 4.0))) {
                    // Fly with automatic Magnetic Shield
                    a.flying = true;
                    a.flightTimer = 4.5;
                    a.globalCd = 0.5;
                  } else if (a.specialCd <= 0 && distTarget <= 16 && a.meteorMesh && a.meteorRingMesh) {
                    // Magnetic Meteor (ground cast, does NOT enable flight/shield)
                    a.specialCd = 12.5;
                    a.globalCd = 1.6;
                    a.animator.triggerCast('meteor-raise', 0.95);
                    const tx = THREE.MathUtils.clamp(activeTargetPos.x, -maxBound + 4, maxBound - 4);
                    const tz = THREE.MathUtils.clamp(activeTargetPos.z, -maxBound + 4, maxBound - 4);
                    a.meteorMesh.visible = true;
                    a.meteorMesh.rotation.set(0, 0, 0);
                    a.meteorRingMesh.visible = true;
                    a.meteorRingMesh.position.set(tx, 0.04, tz);
                    a.activeAction = {
                      kind: 'magneto-meteor',
                      elapsed: 0,
                      chargeDuration: 0.9,
                      fallDuration: 0.42,
                      targetPos: new THREE.Vector3(tx, 0, tz),
                      impacted: false,
                      meteorMesh: a.meteorMesh,
                      ringMesh: a.meteorRingMesh,
                    };
                  } else if (a.secondaryCd <= 0 && distTarget <= 7.8 && a.vortexGroup) {
                    // Metal Vortex Tornado (ground cast, does NOT enable flight/shield)
                    a.secondaryCd = 12.0;
                    a.globalCd = 0.85;
                    a.animator.setMetalTornado(true);
                    a.vortexGroup.visible = true;
                    a.vortexGroup.rotation.y = 0;
                    a.activeAction = {
                      kind: 'magneto-tornado',
                      elapsed: 0,
                      duration: 3.4,
                      tickAccum: 0,
                      vortexGroup: a.vortexGroup,
                    };
                  } else if (a.primaryCd <= 0 && losClear && distTarget <= 21) {
                    // Metal Launch
                    a.primaryCd = 0.92;
                    a.globalCd = 0.45;
                    a.animator.triggerCast(
                      a.nextHandRight ? 'magneto-throw-right' : 'magneto-throw-left',
                      0.32,
                    );
                    this.spawnProjectile(a, 'metal-beam', activeTargetPos, activeTargetType);
                  }
                }
              }
            } else {
              // Natural zone patrol
              const pdx = a.patrolTarget.x - a.position.x;
              const pdz = a.patrolTarget.z - a.position.z;
              const pDist = Math.hypot(pdx, pdz);
              if (pDist < 0.5) {
                a.patrolPause -= safeDt;
                if (a.patrolPause <= 0) this.pickPatrolTarget(a);
              } else {
                const patrolSpeed = a.moveSpeed * 0.5;
                const step = Math.min(patrolSpeed * safeDt, pDist);
                a.position.x = THREE.MathUtils.clamp(
                  a.position.x + (pdx / pDist) * step,
                  -maxBound,
                  maxBound,
                );
                a.position.z = THREE.MathUtils.clamp(
                  a.position.z + (pdz / pDist) * step,
                  -maxBound,
                  maxBound,
                );
                resolveHorizontalObstaclePush(a.position, 0.48);
                a.facingYaw = dampAngle(a.facingYaw, Math.atan2(-pdx, -pdz), 6, safeDt);
                moving = true;
              }
            }
          }

          const shouldShake =
            a.painRestricted || (headacheActive && !a.paralyzed);
          const shakeX = shouldShake ? Math.sin(this.animTime * 42) * 0.032 : 0;
          const shakeZ = shouldShake ? Math.cos(this.animTime * 37) * 0.032 : 0;
          a.rig.root.position.set(
            a.position.x + shakeX,
            a.position.y,
            a.position.z + shakeZ,
          );
          a.rig.root.rotation.x = a.externalPitchX;
          a.rig.root.rotation.y = a.facingYaw;

          const animDt =
            headacheActive ||
            a.externalLimp ||
            a.agathaDrainVictim ||
            a.externalVampireVictim
              ? safeDt
              : a.paralyzed
                ? 0
                : restricted
                  ? safeDt * 0.15
                  : safeDt;
          const motionState = a.flying
            ? this.flyMotion
            : moving
              ? this.runMotion
              : this.idleMotion;
          a.animator.update(animDt, motionState);
        }
      }

      const dd = a.damageDisplay;
      if (dd.active) {
        if (dd.popTimer > 0) dd.popTimer = Math.max(0, dd.popTimer - safeDt);
        dd.idleTimer += safeDt;
        if (dd.idleTimer >= DAMAGE_AGGREGATE_HOLD_SEC + DAMAGE_FADE_DURATION_SEC) {
          dd.active = false;
          dd.total = 0;
        }
      }
    }

    // Update flying AI projectiles with wall LOS checks & impact effects
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= safeDt;
      this._projNext.copy(p.pos).addScaledVector(p.vel, safeDt);

      // Pillar wall collision
      if (
        !hasLineOfSight(
          p.pos.x,
          p.pos.y,
          p.pos.z,
          this._projNext.x,
          this._projNext.y,
          this._projNext.z,
        )
      ) {
        if (p.kind === 'agatha-bolt') {
          this.spawnSmokeBurst(p.pos, '#A442FF', 2.4);
        }
        p.mesh.visible = false;
        this.projectilePools[p.kind].push(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      p.pos.copy(this._projNext);
      p.mesh.position.copy(p.pos);

      const targetPos =
        p.targetType === 'astral-body' && astralBodyPos
          ? astralBodyPos
          : playerTargetable
            ? playerPos
            : null;
      if (targetPos) {
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y + 1.0 - p.pos.y;
        const dz = targetPos.z - p.pos.z;
        if (dx * dx + dz * dz < 0.65 * 0.65 && Math.abs(dy) < 1.15) {
          if (p.kind === 'agatha-bolt') {
            this.spawnSmokeBurst(p.pos, '#A442FF', 2.8);
          }
          if (p.targetType === 'astral-body' && astralBodyPos) {
            onAstralBodyHit?.(p.damage, p.attackerId);
          } else {
            this._hitDir.copy(p.vel).setY(0);
            if (this._hitDir.lengthSq() > 1e-4) this._hitDir.normalize();
            else this._hitDir.set(0, 0, -1);
            onPlayerHit?.(p.damage, 'ai-ability', this._hitDir, p.attackerId, 2.5);
          }
          p.mesh.visible = false;
          this.projectilePools[p.kind].push(p);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.life <= 0 || p.pos.y < 0.05) {
        if (p.kind === 'agatha-bolt') {
          this.spawnSmokeBurst(p.pos, '#A442FF', 2.4);
        }
        p.mesh.visible = false;
        this.projectilePools[p.kind].push(p);
        this.projectiles.splice(i, 1);
      }
    }

    // Update smoke puffs
    for (let i = this.smokeBursts.length - 1; i >= 0; i--) {
      const s = this.smokeBursts[i];
      s.elapsed += safeDt;
      const t = Math.min(1, s.elapsed / s.duration);
      s.mesh.scale.setScalar(0.35 + (1 - Math.pow(1 - t, 3)) * s.maxScale);
      s.mat.opacity = (1 - t) * 0.65;
      if (s.elapsed >= s.duration) {
        s.mesh.visible = false;
        this.smokeBurstPool.push(s);
        this.smokeBursts.splice(i, 1);
      }
    }

    // Soft separation between upright AI actors
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0 || a.ragdoll.active || a.paralyzed || a.externalControl) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.hp <= 0 || b.ragdoll.active || b.paralyzed || b.externalControl) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distSq = dx * dx + dz * dz;
        const minSep = 1.3;
        if (distSq > 1e-5 && distSq < minSep * minSep) {
          const dist = Math.sqrt(distSq);
          const push = (minSep - dist) * 0.45;
          const nx = dx / dist;
          const nz = dz / dist;
          a.position.x = THREE.MathUtils.clamp(a.position.x - nx * push, -maxBound, maxBound);
          a.position.z = THREE.MathUtils.clamp(a.position.z - nz * push, -maxBound, maxBound);
          b.position.x = THREE.MathUtils.clamp(b.position.x + nx * push, -maxBound, maxBound);
          b.position.z = THREE.MathUtils.clamp(b.position.z + nz * push, -maxBound, maxBound);
        }
      }
    }

    // Flush elimination events
    if (this.pendingEliminations.length > 0) {
      this.elimEvents.length = 0;
      for (let i = 0; i < this.pendingEliminations.length; i++) {
        const ev = this.pendingEliminations[i];
        this._proj.copy(ev.worldPos).project(camera);
        this.elimEvents.push({
          id: ev.id,
          coins: ev.coins,
          screenX: THREE.MathUtils.clamp(
            (this._proj.x * 0.5 + 0.5) * viewportWidth,
            36,
            viewportWidth - 36,
          ),
          screenY: THREE.MathUtils.clamp(
            (-this._proj.y * 0.5 + 0.5) * viewportHeight,
            56,
            viewportHeight - 56,
          ),
        });
      }
      this.pendingEliminations.length = 0;
      onEliminated?.(this.elimEvents);
    }

    // Target reticle selection
    let bestId: string | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      const distToPlayer = this._toActor.copy(a.position).sub(playerPos).length();
      if (distToPlayer > 28) continue;
      this._proj.set(a.position.x, a.position.y + 1.15, a.position.z).project(camera);
      if (this._proj.z < -1 || this._proj.z > 1) continue;
      const reticleDist = Math.hypot(this._proj.x - reticleNdcX, this._proj.y - reticleNdcY);
      if (reticleDist > 0.34) continue;
      const stickyBonus = a.id === this.selectedTargetId ? -0.045 : 0;
      const score = reticleDist + distToPlayer * 0.004 + stickyBonus;
      if (score < bestScore) {
        bestScore = score;
        bestId = a.id;
      }
    }
    this.selectedTargetId = bestId;

    // Project HUD snapshots
    this.cachedSnapshots.length = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      const headHeight = a.ragdoll.active ? 0.95 : 2.18;
      this._proj.set(a.position.x, a.position.y + headHeight, a.position.z).project(camera);
      const inFront = this._proj.z >= -1 && this._proj.z <= 1;
      const distToCam = camera.position.distanceTo(a.position);
      const visible =
        inFront &&
        distToCam < 40 &&
        a.hp > 0 &&
        Math.abs(this._proj.x) <= 1.08 &&
        Math.abs(this._proj.y) <= 1.08;

      const screenX = (this._proj.x * 0.5 + 0.5) * viewportWidth;
      const screenY = (-this._proj.y * 0.5 + 0.5) * viewportHeight;

      const dd = a.damageDisplay;
      const popRatio = dd.popTimer / 0.22;
      const popScale = dd.popTimer > 0 ? 1 + Math.sin(popRatio * Math.PI) * 0.44 : 1;

      let fadeRatio = 1;
      let driftX = 0;
      if (dd.idleTimer > DAMAGE_AGGREGATE_HOLD_SEC) {
        const f = THREE.MathUtils.clamp(
          (dd.idleTimer - DAMAGE_AGGREGATE_HOLD_SEC) / DAMAGE_FADE_DURATION_SEC,
          0,
          1,
        );
        fadeRatio = 1 - f;
        driftX = dd.driftDir * f * 34;
      }

      const scale = THREE.MathUtils.clamp(6.8 / Math.max(distToCam, 6.8), 0.44, 1.0);

      const snap = a.hudSnapshot;
      snap.hp = a.hp;
      snap.maxHp = a.maxHp;
      snap.trailHp = a.trailHp;
      snap.visible = visible || (dd.active && inFront);
      snap.screenX = screenX;
      snap.screenY = screenY;
      snap.scale = scale;
      snap.isTargeted = a.id === this.selectedTargetId && visible;
      if (snap.shield) {
        const hasShield =
          visible && a.forcefieldShieldHp > 0 && a.forcefieldShieldMaxHp > 0;
        snap.shield.active = hasShield;
        snap.shield.hp = hasShield ? a.forcefieldShieldHp : 0;
        snap.shield.maxHp = hasShield ? a.forcefieldShieldMaxHp : 100;
        snap.shield.color = '#38BDF8';
        snap.shield.screenX = screenX;
        snap.shield.screenY = screenY;
      }
      snap.damageNumber.active = dd.active && inFront && distToCam < 40;
      snap.damageNumber.total = dd.total;
      snap.damageNumber.scale = popScale;
      snap.damageNumber.opacity = fadeRatio;
      snap.damageNumber.offsetX = dd.offsetX + driftX;
      snap.damageNumber.offsetY = dd.offsetY;
      this.cachedSnapshots.push(snap);
    }

    // Update instanced ground-contact shadows beneath active AI heroes
    let shadowIdx = 0;
    for (let i = 0; i < this.enemies.length && shadowIdx < 8; i++) {
      const a = this.enemies[i];
      if (!a.rig.root.visible || a.hp <= 0) continue;
      const gY = getGroundSurfaceY(a.position.x, a.position.z, a.position.y + 0.5);
      const height = Math.max(0, a.position.y - gY);
      if (height > 6.5) continue;
      const sc = Math.max(0.42, 1.0 - height * 0.12) * (a.ragdoll.active ? 1.18 : 1.0);
      this._shadowPos.set(a.position.x, gY + 0.014, a.position.z);
      this._shadowScale.set(sc, 1, sc);
      this._shadowMat4.compose(this._shadowPos, this._shadowQuat, this._shadowScale);
      this.contactShadowMesh.setMatrixAt(shadowIdx++, this._shadowMat4);
    }
    this.contactShadowMesh.count = shadowIdx;
    this.contactShadowMesh.instanceMatrix.needsUpdate = true;

    return this.cachedSnapshots;
  }

  public resetAll(): void {
    this.selectedTargetId = null;
    this.pendingEliminations.length = 0;
    while (this.projectiles.length > 0) {
      const p = this.projectiles.pop();
      if (p) {
        p.mesh.visible = false;
        this.projectilePools[p.kind].push(p);
      }
    }
    while (this.smokeBursts.length > 0) {
      const s = this.smokeBursts.pop();
      if (s) {
        s.mesh.visible = false;
        this.smokeBurstPool.push(s);
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      this.clearActiveAction(a);
      a.ragdoll.reset();
      a.position.copy(a.spawnPos);
      a.patrolTarget.copy(a.spawnPos);
      a.rig.root.position.copy(a.spawnPos);
      a.rig.root.rotation.set(0, a.facingYaw, 0);
      a.hp = a.maxHp;
      a.trailHp = a.maxHp;
      a.trailHoldTimer = 0;
      a.ragdollTimer = 0;
      a.hitFlashTimer = 0;
      a.respawnTimer = 0;
      a.burningTimer = 0;
      a.burnTickAccum = 0;
      a.burnSprite.visible = false;
      a.agathaShieldTimer = 0;
      a.agathaShieldHits = 0;
      a.agathaShieldTrackedDmg = 0;
      a.agathaDarkholdTimer = 0;
      a.agathaDarkholdBook?.setOpen(false, true);
      a.agathaAutoShieldTimer = 0;
      a.agathaAutoShieldHp = 0;
      a.agathaTeleportTimer = 0;
      a.rig.root.visible = true;
      a.flying = false;
      a.painRestricted = false;
      a.paralyzed = false;
      a.paralysisImmune = false;
      a.mindControlImmune = false;
      a.clonesRestricted = false;
      a.agathaDrainVictim = false;
      a.forcefieldShieldHp = 0;
      a.forcefieldShieldMaxHp = 0;
      a.forcefieldTrapped = false;
      a.forcefieldAbilitiesLocked = false;
      a.forcefieldExternalImmune = false;
      a.rig.setWhiteOutline(false);
      a.externalControl = false;
      a.externalHeadache = false;
      a.externalLimp = false;
      a.externalVampireVictim = false;
      a.externalPitchX = 0;
      a.verticalVelocity = 0;
      a.headacheTimer = 0;
      a.rewardClaimed = false;
      a.aggro = false;
      a.damageDisplay.active = false;
      a.damageDisplay.total = 0;
      a.animator.reset(a.rig, a.archetype, a.preset.skinId);
    }
  }

  public dispose(): void {
    while (this.projectiles.length > 0) {
      const p = this.projectiles.pop();
      if (p) this.group.remove(p.mesh);
    }
    for (const kind of ['chaos-bolt', 'agatha-bolt', 'metal-beam'] as const) {
      const pool = this.projectilePools[kind];
      while (pool.length > 0) {
        const p = pool.pop();
        if (p) this.group.remove(p.mesh);
      }
    }
    while (this.smokeBursts.length > 0) {
      const s = this.smokeBursts.pop();
      if (s) {
        this.group.remove(s.mesh);
        s.mat.dispose();
      }
    }
    while (this.smokeBurstPool.length > 0) {
      const s = this.smokeBurstPool.pop();
      if (s) {
        this.group.remove(s.mesh);
        s.mat.dispose();
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      this.clearActiveAction(a);
      if (a.stoneRingMesh) this.group.remove(a.stoneRingMesh);
      if (a.stoneMeshes) {
        for (let s = 0; s < a.stoneMeshes.length; s++) {
          this.group.remove(a.stoneMeshes[s]);
        }
      }
      if (a.meteorMesh) this.group.remove(a.meteorMesh);
      if (a.meteorRingMesh) this.group.remove(a.meteorRingMesh);
      if (a.vortexGroup) this.group.remove(a.vortexGroup);
      if (a.agathaDarkholdBook) {
        this.group.remove(a.agathaDarkholdBook.group);
        a.agathaDarkholdBook.dispose();
      }
      if (a.agathaDarkholdShield) {
        this.group.remove(a.agathaDarkholdShield.group);
        a.agathaDarkholdShield.dispose();
      }
      if (a.agathaVfx) {
        this.group.remove(a.agathaVfx.group);
        a.agathaVfx.dispose();
      }
      a.rig.dispose();
      (a.burnSprite.material as THREE.Material).dispose();
      a.beamMat.dispose();
      a.agathaShieldMat.dispose();
      a.magnetoShieldMat.dispose();
    }
    this.boltSphereGeo.dispose();
    this.boltHaloGeo.dispose();
    this.steelBeamGeo.dispose();
    this.beamUnitGeo.dispose();
    this.stoneGeo.dispose();
    this.meteorGeo.dispose();
    this.ringGeo.dispose();
    this.vortexRingGeo.dispose();
    this.shieldSphereGeo.dispose();
    this.smokeGeo.dispose();
    this.wandaBoltMat.dispose();
    this.wandaHaloMat.dispose();
    this.agathaBoltMat.dispose();
    this.agathaHaloMat.dispose();
    this.steelMat.dispose();
    this.stoneMat.dispose();
    this.meteorMat.dispose();
    this.crimsonRingMat.dispose();
    this.purpleRingMat.dispose();
    this.tornadoSteelMat.dispose();
    this.contactShadowMesh.dispose();
    this.contactShadowGeo.dispose();
    this.contactShadowMat.dispose();
  }
}
