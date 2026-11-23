import * as THREE from 'three';
import { CharacterArchetype, CharacterSkinId } from './characterConfig';
import { R16Rig } from './r16Character';

export interface CharacterMotionState {
  /** Forward(+)/Backward(-) speed normalized to [-1, 1] relative to character facing */
  localForward: number;
  /** Right(+)/Left(-) strafe speed normalized to [-1, 1] relative to character facing */
  localRight: number;
  /** Vertical velocity (m/s) */
  verticalVelocity: number;
  /** True when resting on baseplate/collider */
  grounded: boolean;
  /** True on the exact frame a jump begins */
  justJumped: boolean;
  /** Impact speed (> 0) on the exact frame the character touches down */
  landImpactSpeed: number;
  /** Optional smooth flight mode */
  flying?: boolean;
  /** Dedicated forward sprint mode */
  sprinting?: boolean;
  /** Quicksilver extreme speed stride boost */
  superSpeed?: boolean;
  /** Camera/turn angular rate (rad/s) for Cloak of Levitation billowing */
  turnVelocity?: number;
  /** Preview mode enables showcase pose */
  previewMode?: boolean;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class CharacterAnimator {
  private rig: R16Rig;
  private archetype: CharacterArchetype;
  private skinId?: CharacterSkinId;

  private idleTime = 0;
  private stridePhase = 0;

  private smoothFwd = 0;
  private smoothRight = 0;
  private smoothSpeed = 0;
  private sprintBlend = 0;
  private airBlend = 0;
  private flyBlend = 0;
  private riseFallBlend = 0;

  private squashValue = 0;
  private squashVel = 0;
  private landKneeFlex = 0;
  private landKneeVel = 0;

  // Ability casting pose overlay
  private castKind:
    | 'bolt-left'
    | 'bolt-right'
    | 'teleport'
    | 'implosion'
    | 'revive'
    | 'mental-focus'
    | 'diamond-cast'
    | 'crown-transform'
    | 'sword-summon-open'
    | 'sword-throw-right'
    | 'sword-throw-left'
    | 'sword-slash-right'
    | 'sword-slash-left'
    | 'sword-slash-dual'
    | 'sword-throw'
    | 'green-charge-slam'
    | 'hero-landing'
    | 'npc-pistol-shoot'
    | 'npc-punch-left'
    | 'npc-punch-right'
    | 'magneto-throw-right'
    | 'magneto-throw-left'
    | 'meteor-raise'
    | 'qs-time-slam'
    | 'qs-finisher-punch'
    | 'strange-disc-cast'
    | 'strange-shield-cast'
    | 'strange-clones-cast'
    | 'ancient-one-extract'
    | 'vision-bolt'
    | 'vision-bolt-small'
    | 'agatha-bolt-right'
    | 'agatha-bolt-left'
    | 'strange-clones-precast'
    | 'purgatory-grasp-cast'
    | 'supreme-beam-bolt'
    | 'zombie-stone-explosion'
    | 'invisible-disc-throw'
    | 'vampire-stomp-dive'
    | 'cap-shield-throw'
    | 'cap-shield-catch'
    | 'cap-combo-1'
    | 'cap-combo-2'
    | 'cap-combo-3'
    | 'mjolnir-combo-1'
    | 'mjolnir-combo-2'
    | 'mjolnir-combo-3'
    | 'thor-mjolnir-throw'
    | 'thor-mjolnir-catch'
    | 'silver-sonic-blast'
    | 'silver-cosmic-blast'
    | 'storm-lightning-cast'
    | 'storm-ice-create'
    | 'storm-ice-launch'
    | null = null;
  private castElapsed = 0;
  private castDuration = 0;

  // Sustained combat / ability poses
  private spinElapsed = 0;
  private spinDuration = 0;
  private painChannelBlend = 0;
  private painChannelActive = false;
  private telepathicWaveBlend = 0;
  private telepathicWaveActive = false;
  private swordHeldBlend = 0;
  private swordHeldActive = false;
  private phoenixManifestBlend = 0;
  private phoenixManifestActive = false;
  private spinningLeapActive = false;
  private spinningLeapTime = 0;
  private headacheActive = false;
  private headacheBlend = 0;
  private metalTornadoActive = false;
  private metalTornadoBlend = 0;
  private rapidPunchActive = false;
  private rapidPunchBlend = 0;
  private rapidPunchTime = 0;
  private headGripActive = false;
  private headGripBlend = 0;
  private mindLaserActive = false;
  private mindLaserBlend = 0;
  private visionBoltChargeActive = false;
  private visionBoltChargeBlend = 0;
  private astralLimpActive = false;
  private astralLimpBlend = 0;
  private agathaAbsorbActive = false;
  private agathaAbsorbBlend = 0;
  private agathaDrainVictimActive = false;
  private agathaDrainVictimBlend = 0;
  private npcPistolAimActive = false;
  private npcPistolAimBlend = 0;
  private supremeDrainActive = false;
  private supremeDrainBlend = 0;
  private zombieBeamActive = false;
  private zombieBeamBlend = 0;
  private forcefieldShieldActive = false;
  private forcefieldShieldBlend = 0;
  private vampireAbsorbActive = false;
  private vampireAbsorbBlend = 0;
  private vampireVictimActive = false;
  private vampireVictimBlend = 0;
  private capShieldDefenseActive = false;
  private capShieldDefenseBlend = 0;
  private capShieldChargeActive = false;
  private capShieldChargeBlend = 0;
  private thorMjolnirSummonActive = false;
  private thorMjolnirSummonBlend = 0;
  private thorSlamPhase: 'idle' | 'ascend' | 'dive' = 'idle';
  private thorSlamAscendBlend = 0;
  private thorSlamDiveBlend = 0;
  private thorStormBeamPhase: 'idle' | 'channel' | 'beam' = 'idle';
  private thorStormChannelBlend = 0;
  private thorStormBeamBlend = 0;
  private silverAbsorbActive = false;
  private silverAbsorbBlend = 0;
  private silverAbsorbPulseTimer = 0;
  private silverCosmicChargeActive = false;
  private silverCosmicChargeBlend = 0;
  private silverDualBeamActive = false;
  private silverDualBeamBlend = 0;
  private surferBoardProgress = 0;
  private stormLightningRiseActive = false;
  private stormLightningRiseBlend = 0;
  private stormTornadoActive = false;
  private stormTornadoBlend = 0;
  private stormWindBlastActive = false;
  private stormWindBlastBlend = 0;
  private cloakSurge = 0;

  // NPC directional hit reaction overlay
  private hitTimer = 0;
  private hitDuration = 0.34;
  private hitLocalFwd = 0;
  private hitLocalRight = 0;

  constructor(
    rig: R16Rig,
    archetype: CharacterArchetype = 'standard',
    skinId?: CharacterSkinId,
  ) {
    this.rig = rig;
    this.archetype = archetype;
    this.skinId = skinId;
  }

  public reset(
    rig?: R16Rig,
    archetype?: CharacterArchetype,
    skinId?: CharacterSkinId,
  ): void {
    if (rig) {
      this.rig = rig;
      this.skinId = skinId;
    } else if (skinId !== undefined) {
      this.skinId = skinId;
    }
    if (archetype !== undefined) this.archetype = archetype;

    this.idleTime = 0;
    this.stridePhase = 0;
    this.smoothFwd = 0;
    this.smoothRight = 0;
    this.smoothSpeed = 0;
    this.sprintBlend = 0;
    this.airBlend = 0;
    this.flyBlend = 0;
    this.riseFallBlend = 0;
    this.squashValue = 0;
    this.squashVel = 0;
    this.landKneeFlex = 0;
    this.landKneeVel = 0;

    this.castKind = null;
    this.castElapsed = 0;
    this.castDuration = 0;
    this.spinElapsed = 0;
    this.spinDuration = 0;
    this.painChannelBlend = 0;
    this.painChannelActive = false;
    this.telepathicWaveBlend = 0;
    this.telepathicWaveActive = false;
    this.swordHeldBlend = 0;
    this.swordHeldActive = false;
    this.phoenixManifestBlend = 0;
    this.phoenixManifestActive = false;
    this.spinningLeapActive = false;
    this.spinningLeapTime = 0;
    this.headacheActive = false;
    this.headacheBlend = 0;
    this.metalTornadoActive = false;
    this.metalTornadoBlend = 0;
    this.rapidPunchActive = false;
    this.rapidPunchBlend = 0;
    this.rapidPunchTime = 0;
    this.headGripActive = false;
    this.headGripBlend = 0;
    this.mindLaserActive = false;
    this.mindLaserBlend = 0;
    this.visionBoltChargeActive = false;
    this.visionBoltChargeBlend = 0;
    this.astralLimpActive = false;
    this.astralLimpBlend = 0;
    this.agathaAbsorbActive = false;
    this.agathaAbsorbBlend = 0;
    this.agathaDrainVictimActive = false;
    this.agathaDrainVictimBlend = 0;
    this.npcPistolAimActive = false;
    this.npcPistolAimBlend = 0;
    this.supremeDrainActive = false;
    this.supremeDrainBlend = 0;
    this.zombieBeamActive = false;
    this.zombieBeamBlend = 0;
    this.forcefieldShieldActive = false;
    this.forcefieldShieldBlend = 0;
    this.vampireAbsorbActive = false;
    this.vampireAbsorbBlend = 0;
    this.vampireVictimActive = false;
    this.vampireVictimBlend = 0;
    this.capShieldDefenseActive = false;
    this.capShieldDefenseBlend = 0;
    this.capShieldChargeActive = false;
    this.capShieldChargeBlend = 0;
    this.thorMjolnirSummonActive = false;
    this.thorMjolnirSummonBlend = 0;
    this.thorSlamPhase = 'idle';
    this.thorSlamAscendBlend = 0;
    this.thorSlamDiveBlend = 0;
    this.thorStormBeamPhase = 'idle';
    this.thorStormChannelBlend = 0;
    this.thorStormBeamBlend = 0;
    this.silverAbsorbActive = false;
    this.silverAbsorbBlend = 0;
    this.silverAbsorbPulseTimer = 0;
    this.silverCosmicChargeActive = false;
    this.silverCosmicChargeBlend = 0;
    this.silverDualBeamActive = false;
    this.silverDualBeamBlend = 0;
    this.surferBoardProgress = 0;
    this.stormLightningRiseActive = false;
    this.stormLightningRiseBlend = 0;
    this.stormTornadoActive = false;
    this.stormTornadoBlend = 0;
    this.stormWindBlastActive = false;
    this.stormWindBlastBlend = 0;
    this.cloakSurge = 0;
    this.hitTimer = 0;
    this.hitLocalFwd = 0;
    this.hitLocalRight = 0;
    this.rig.setSurferBoardProgress(0, 0, 0);
  }

  public triggerCast(
    kind:
      | 'bolt-left'
      | 'bolt-right'
      | 'teleport'
      | 'implosion'
      | 'revive'
      | 'mental-focus'
      | 'diamond-cast'
      | 'crown-transform'
      | 'sword-summon-open'
      | 'sword-throw-right'
      | 'sword-throw-left'
      | 'sword-slash-right'
      | 'sword-slash-left'
      | 'sword-slash-dual'
      | 'sword-throw'
      | 'green-charge-slam'
      | 'hero-landing'
      | 'npc-pistol-shoot'
      | 'npc-punch-left'
      | 'npc-punch-right'
      | 'magneto-throw-right'
      | 'magneto-throw-left'
      | 'meteor-raise'
      | 'qs-time-slam'
      | 'qs-finisher-punch'
      | 'strange-disc-cast'
      | 'strange-shield-cast'
      | 'strange-clones-cast'
      | 'strange-clones-precast'
      | 'purgatory-grasp-cast'
      | 'ancient-one-extract'
      | 'vision-bolt'
      | 'vision-bolt-small'
      | 'agatha-bolt-right'
      | 'agatha-bolt-left'
      | 'supreme-beam-bolt'
      | 'zombie-stone-explosion'
      | 'invisible-disc-throw'
      | 'vampire-stomp-dive'
      | 'cap-shield-throw'
      | 'cap-shield-catch'
      | 'cap-combo-1'
      | 'cap-combo-2'
      | 'cap-combo-3'
      | 'mjolnir-combo-1'
      | 'mjolnir-combo-2'
      | 'mjolnir-combo-3'
      | 'thor-mjolnir-throw'
      | 'thor-mjolnir-catch'
      | 'silver-sonic-blast'
      | 'silver-cosmic-blast'
      | 'storm-lightning-cast'
      | 'storm-ice-create'
      | 'storm-ice-launch',
    durationSec = 0.34,
  ): void {
    this.castKind = kind;
    this.castElapsed = 0;
    this.castDuration = durationSec;
  }

  public triggerAerialSpin(durationSec = 0.44): void {
    this.spinElapsed = 0;
    this.spinDuration = durationSec;
  }

  public setPainChanneling(active: boolean): void {
    this.painChannelActive = active;
  }

  public setTelepathicWave(active: boolean): void {
    this.telepathicWaveActive = active;
  }

  public setSwordHeld(active: boolean): void {
    this.swordHeldActive = active;
  }

  public setPhoenixManifest(active: boolean): void {
    this.phoenixManifestActive = active;
  }

  public setSpinningLeap(active: boolean): void {
    if (active && !this.spinningLeapActive) {
      this.spinningLeapTime = 0;
    }
    this.spinningLeapActive = active;
  }

  public setHeadache(active: boolean): void {
    this.headacheActive = active;
  }

  public setMetalTornado(active: boolean): void {
    this.metalTornadoActive = active;
  }

  public setRapidPunch(active: boolean): void {
    if (active && !this.rapidPunchActive) {
      this.rapidPunchTime = 0;
    }
    this.rapidPunchActive = active;
  }

  public setHeadGrip(active: boolean): void {
    this.headGripActive = active;
  }

  public setMindLaser(active: boolean): void {
    this.mindLaserActive = active;
  }

  public setVisionBoltCharge(active: boolean): void {
    this.visionBoltChargeActive = active;
  }

  public setAstralLimp(active: boolean): void {
    this.astralLimpActive = active;
  }

  public setAgathaAbsorb(active: boolean): void {
    this.agathaAbsorbActive = active;
  }

  public isCastingAbility(): boolean {
    return Boolean(
      this.castKind ||
      this.spinDuration > 0 ||
      this.painChannelActive ||
      this.telepathicWaveActive ||
      this.phoenixManifestActive ||
      this.spinningLeapActive ||
      this.metalTornadoActive ||
      this.rapidPunchActive ||
      this.headGripActive ||
      this.mindLaserActive ||
      this.visionBoltChargeActive ||
      this.agathaAbsorbActive ||
      this.supremeDrainActive ||
      this.zombieBeamActive ||
      this.vampireAbsorbActive ||
      this.capShieldChargeActive ||
      this.thorSlamPhase !== 'idle' ||
      this.thorStormBeamPhase !== 'idle' ||
      this.thorMjolnirSummonActive,
    );
  }

  public setAgathaDrainVictim(active: boolean): void {
    this.agathaDrainVictimActive = active;
  }

  public setSupremeDrain(active: boolean): void {
    this.supremeDrainActive = active;
  }

  public setZombieBeam(active: boolean): void {
    this.zombieBeamActive = active;
  }

  public setForcefieldShield(active: boolean): void {
    this.forcefieldShieldActive = active;
  }

  public setVampireAbsorb(active: boolean): void {
    this.vampireAbsorbActive = active;
  }

  public setVampireVictim(active: boolean): void {
    this.vampireVictimActive = active;
  }

  public setCapShieldDefense(active: boolean): void {
    this.capShieldDefenseActive = active;
  }

  public setCapShieldCharge(active: boolean): void {
    this.capShieldChargeActive = active;
  }

  public setThorMjolnirSummon(active: boolean): void {
    this.thorMjolnirSummonActive = active;
  }

  public setThorSlamPhase(phase: 'idle' | 'ascend' | 'dive'): void {
    this.thorSlamPhase = phase;
  }

  public setThorStormBeamPhase(phase: 'idle' | 'channel' | 'beam'): void {
    this.thorStormBeamPhase = phase;
  }

  public setNpcPistolAim(active: boolean): void {
    this.npcPistolAimActive = active;
  }

  public setSilverAbsorb(active: boolean): void {
    this.silverAbsorbActive = active;
  }

  public triggerSilverAbsorbPulse(durationSec = 0.42): void {
    this.silverAbsorbPulseTimer = Math.max(this.silverAbsorbPulseTimer, durationSec);
  }

  public setSilverCosmicCharge(active: boolean): void {
    this.silverCosmicChargeActive = active;
  }

  public setSilverDualBeam(active: boolean): void {
    this.silverDualBeamActive = active;
  }

  public setStormLightningRise(active: boolean): void {
    this.stormLightningRiseActive = active;
  }

  public setStormTornado(active: boolean): void {
    this.stormTornadoActive = active;
  }

  public setStormWindBlast(active: boolean): void {
    this.stormWindBlastActive = active;
  }

  public triggerCloakSurge(amount = 0.45): void {
    this.cloakSurge = Math.min(1, this.cloakSurge + amount);
  }

  public triggerHitReaction(localFwdImpulse: number, localRightImpulse: number): void {
    this.hitTimer = this.hitDuration;
    this.hitLocalFwd = THREE.MathUtils.clamp(localFwdImpulse, -1, 1);
    this.hitLocalRight = THREE.MathUtils.clamp(localRightImpulse, -1, 1);
  }

  public update(dt: number, state: CharacterMotionState): void {
    const safeDt = Math.min(dt, 0.05);
    this.idleTime += safeDt;

    if (this.castKind) {
      this.castElapsed += safeDt;
      if (this.castElapsed >= this.castDuration) {
        this.castKind = null;
      }
    }

    if (this.spinDuration > 0) {
      this.spinElapsed += safeDt;
      if (this.spinElapsed >= this.spinDuration) {
        this.spinDuration = 0;
        this.spinElapsed = 0;
      }
    }

    if (this.spinningLeapActive) {
      this.spinningLeapTime += safeDt;
    }

    this.painChannelBlend = THREE.MathUtils.damp(
      this.painChannelBlend,
      this.painChannelActive ? 1 : 0,
      11,
      safeDt,
    );
    this.telepathicWaveBlend = THREE.MathUtils.damp(
      this.telepathicWaveBlend,
      this.telepathicWaveActive ? 1 : 0,
      12,
      safeDt,
    );
    this.swordHeldBlend = THREE.MathUtils.damp(
      this.swordHeldBlend,
      this.swordHeldActive ? 1 : 0,
      10,
      safeDt,
    );
    this.phoenixManifestBlend = THREE.MathUtils.damp(
      this.phoenixManifestBlend,
      this.phoenixManifestActive ? 1 : 0,
      9,
      safeDt,
    );
    this.headacheBlend = THREE.MathUtils.damp(
      this.headacheBlend,
      this.headacheActive ? 1 : 0,
      10,
      safeDt,
    );
    this.metalTornadoBlend = THREE.MathUtils.damp(
      this.metalTornadoBlend,
      this.metalTornadoActive ? 1 : 0,
      10,
      safeDt,
    );
    if (this.rapidPunchActive) {
      this.rapidPunchTime += safeDt;
    }
    this.rapidPunchBlend = THREE.MathUtils.damp(
      this.rapidPunchBlend,
      this.rapidPunchActive ? 1 : 0,
      18,
      safeDt,
    );
    this.headGripBlend = THREE.MathUtils.damp(
      this.headGripBlend,
      this.headGripActive ? 1 : 0,
      14,
      safeDt,
    );
    this.mindLaserBlend = THREE.MathUtils.damp(
      this.mindLaserBlend,
      this.mindLaserActive ? 1 : 0,
      14,
      safeDt,
    );
    this.visionBoltChargeBlend = THREE.MathUtils.damp(
      this.visionBoltChargeBlend,
      this.visionBoltChargeActive ? 1 : 0,
      14,
      safeDt,
    );
    this.astralLimpBlend = THREE.MathUtils.damp(
      this.astralLimpBlend,
      this.astralLimpActive ? 1 : 0,
      12,
      safeDt,
    );
    this.agathaAbsorbBlend = THREE.MathUtils.damp(
      this.agathaAbsorbBlend,
      this.agathaAbsorbActive ? 1 : 0,
      12,
      safeDt,
    );
    this.agathaDrainVictimBlend = THREE.MathUtils.damp(
      this.agathaDrainVictimBlend,
      this.agathaDrainVictimActive ? 1 : 0,
      12,
      safeDt,
    );
    this.supremeDrainBlend = THREE.MathUtils.damp(
      this.supremeDrainBlend,
      this.supremeDrainActive ? 1 : 0,
      16,
      safeDt,
    );
    this.zombieBeamBlend = THREE.MathUtils.damp(
      this.zombieBeamBlend,
      this.zombieBeamActive ? 1 : 0,
      14,
      safeDt,
    );
    this.forcefieldShieldBlend = THREE.MathUtils.damp(
      this.forcefieldShieldBlend,
      this.forcefieldShieldActive ? 1 : 0,
      13,
      safeDt,
    );
    this.vampireAbsorbBlend = THREE.MathUtils.damp(
      this.vampireAbsorbBlend,
      this.vampireAbsorbActive ? 1 : 0,
      12,
      safeDt,
    );
    this.vampireVictimBlend = THREE.MathUtils.damp(
      this.vampireVictimBlend,
      this.vampireVictimActive ? 1 : 0,
      12,
      safeDt,
    );
    this.npcPistolAimBlend = THREE.MathUtils.damp(
      this.npcPistolAimBlend,
      this.npcPistolAimActive ? 1 : 0,
      14,
      safeDt,
    );
    this.capShieldDefenseBlend = THREE.MathUtils.damp(
      this.capShieldDefenseBlend,
      this.capShieldDefenseActive ? 1 : 0,
      14,
      safeDt,
    );
    this.capShieldChargeBlend = THREE.MathUtils.damp(
      this.capShieldChargeBlend,
      this.capShieldChargeActive ? 1 : 0,
      16,
      safeDt,
    );
    this.thorMjolnirSummonBlend = THREE.MathUtils.damp(
      this.thorMjolnirSummonBlend,
      this.thorMjolnirSummonActive ? 1 : 0,
      15,
      safeDt,
    );
    this.thorSlamAscendBlend = THREE.MathUtils.damp(
      this.thorSlamAscendBlend,
      this.thorSlamPhase === 'ascend' ? 1 : 0,
      16,
      safeDt,
    );
    this.thorSlamDiveBlend = THREE.MathUtils.damp(
      this.thorSlamDiveBlend,
      this.thorSlamPhase === 'dive' ? 1 : 0,
      18,
      safeDt,
    );
    this.thorStormChannelBlend = THREE.MathUtils.damp(
      this.thorStormChannelBlend,
      this.thorStormBeamPhase === 'channel' ? 1 : 0,
      14,
      safeDt,
    );
    this.thorStormBeamBlend = THREE.MathUtils.damp(
      this.thorStormBeamBlend,
      this.thorStormBeamPhase === 'beam' ? 1 : 0,
      18,
      safeDt,
    );
    if (this.silverAbsorbPulseTimer > 0) {
      this.silverAbsorbPulseTimer = Math.max(0, this.silverAbsorbPulseTimer - safeDt);
    }
    this.silverAbsorbBlend = THREE.MathUtils.damp(
      this.silverAbsorbBlend,
      this.silverAbsorbActive || this.silverAbsorbPulseTimer > 0 ? 1 : 0,
      14,
      safeDt,
    );
    this.silverCosmicChargeBlend = THREE.MathUtils.damp(
      this.silverCosmicChargeBlend,
      this.silverCosmicChargeActive ? 1 : 0,
      16,
      safeDt,
    );
    this.silverDualBeamBlend = THREE.MathUtils.damp(
      this.silverDualBeamBlend,
      this.silverDualBeamActive ? 1 : 0,
      15,
      safeDt,
    );
    this.stormLightningRiseBlend = THREE.MathUtils.damp(
      this.stormLightningRiseBlend,
      this.stormLightningRiseActive ? 1 : 0,
      14,
      safeDt,
    );
    this.stormTornadoBlend = THREE.MathUtils.damp(
      this.stormTornadoBlend,
      this.stormTornadoActive ? 1 : 0,
      12,
      safeDt,
    );
    this.stormWindBlastBlend = THREE.MathUtils.damp(
      this.stormWindBlastBlend,
      this.stormWindBlastActive ? 1 : 0,
      14,
      safeDt,
    );
    this.cloakSurge = THREE.MathUtils.damp(this.cloakSurge, 0, 5.5, safeDt);

    if (this.hitTimer > 0) {
      this.hitTimer = Math.max(0, this.hitTimer - safeDt);
    }

    const isFlying = Boolean(state.flying);
    const isSuperSpeed = Boolean(state.superSpeed);

    // 1. Squash & stretch impulses (suppressed smoothly during flight)
    if (state.justJumped && !isFlying) {
      this.squashValue = 0.12;
      this.squashVel = 0.35;
      this.landKneeFlex = 0;
      this.landKneeVel = 0;
    }

    if (state.landImpactSpeed > 0.5 && !isFlying) {
      const amp = THREE.MathUtils.clamp(state.landImpactSpeed / 12, 0.28, 1.0);
      this.squashValue = -0.11 * amp;
      this.squashVel = -0.45 * amp;
      this.landKneeFlex = 0.72 * amp;
      this.landKneeVel = 1.6 * amp;
    }

    {
      const stiffness = 170;
      const damping = 16;
      const force = -stiffness * this.squashValue - damping * this.squashVel;
      this.squashVel += force * safeDt;
      this.squashValue += this.squashVel * safeDt;

      const kneeForce = -130 * this.landKneeFlex - 17 * this.landKneeVel;
      this.landKneeVel += kneeForce * safeDt;
      this.landKneeFlex = Math.max(0, this.landKneeFlex + this.landKneeVel * safeDt);
    }

    // 2. Smooth blends
    const speedCap = isSuperSpeed ? 3.25 : 1.42;
    const targetSpeed = Math.min(
      Math.hypot(state.localForward, state.localRight),
      speedCap,
    );

    this.smoothFwd = THREE.MathUtils.damp(this.smoothFwd, state.localForward, 14, safeDt);
    this.smoothRight = THREE.MathUtils.damp(this.smoothRight, state.localRight, 14, safeDt);
    this.smoothSpeed = THREE.MathUtils.damp(this.smoothSpeed, targetSpeed, 13, safeDt);
    const isSprinting =
      Boolean(state.sprinting) && state.grounded && !isFlying && this.smoothFwd > 0.25;
    this.sprintBlend = THREE.MathUtils.damp(this.sprintBlend, isSprinting ? 1 : 0, 12, safeDt);

    this.flyBlend = THREE.MathUtils.damp(
      this.flyBlend,
      isFlying ? 1 : 0,
      7.5,
      safeDt,
    );

    this.airBlend = THREE.MathUtils.damp(
      this.airBlend,
      state.grounded || isFlying ? 0 : 1,
      state.grounded ? 20 : 14,
      safeDt,
    );

    const targetRiseFall = THREE.MathUtils.clamp(state.verticalVelocity / 6.5, -1, 1);
    this.riseFallBlend = THREE.MathUtils.damp(
      this.riseFallBlend,
      targetRiseFall,
      11,
      safeDt,
    );

    // 3. Stride phase
    const moveActive = smoothstep(0.04, 0.16, this.smoothSpeed);
    const runBlend = smoothstep(0.38, 0.82, this.smoothSpeed);
    const sprintB = this.sprintBlend;
    const groundFactor = 1 - this.airBlend;

    if (this.smoothSpeed > 0.04 && state.grounded && !isFlying) {
      const speedMul = isSuperSpeed ? 2.85 : 1.0;
      const freq =
        THREE.MathUtils.lerp(5.8, 10.6, runBlend) *
        (0.65 + 0.35 * Math.min(this.smoothSpeed, 1.5)) *
        (1 + 0.16 * sprintB) *
        speedMul;
      this.stridePhase += safeDt * freq;
    } else if (state.grounded && !isFlying) {
      const nearestRest = Math.round(this.stridePhase / Math.PI) * Math.PI;
      this.stridePhase = THREE.MathUtils.damp(this.stridePhase, nearestRest, 10, safeDt);
    }

    const dirNorm = Math.max(Math.hypot(this.smoothFwd, this.smoothRight), 0.0001);
    const fwdRatio = this.smoothFwd / dirNorm;
    const rightRatio = this.smoothRight / dirNorm;
    const strafeWeight = Math.abs(rightRatio) * moveActive;
    const fwdAbsWeight = Math.abs(fwdRatio) * moveActive;
    const fwdSign = this.smoothFwd >= -0.05 ? 1 : -1;

    // 4. Grounded locomotion
    const pL = this.stridePhase;
    const pR = this.stridePhase + Math.PI;

    const strideAmp = THREE.MathUtils.lerp(0.52, 0.96 + 0.18 * sprintB, runBlend) * moveActive;
    const kneeAmp = THREE.MathUtils.lerp(0.62, 1.18 + 0.22 * sprintB, runBlend) * moveActive;
    const armAmp = THREE.MathUtils.lerp(0.45, 0.95 + 0.22 * sprintB, runBlend) * moveActive;

    const swingL = Math.sin(pL) * fwdSign;
    const swingR = Math.sin(pR) * fwdSign;

    const liftL = Math.max(0, Math.cos(pL * fwdSign));
    const liftR = Math.max(0, Math.cos(pR * fwdSign));
    const stanceCushionL = Math.max(0, -Math.cos(pL * fwdSign)) * 0.16;
    const stanceCushionR = Math.max(0, -Math.cos(pR * fwdSign)) * 0.16;

    const strafeStepL = Math.sin(pL) * rightRatio;
    const strafeStepR = Math.sin(pR) * rightRatio;
    const strafeLiftL = Math.max(0, Math.cos(pL)) * strafeWeight;
    const strafeLiftR = Math.max(0, Math.cos(pR)) * strafeWeight;

    // Scarlet Witch graceful feminine idle pose (poised hip, floating magic hands, gentle sway)
    const idleWeight = 1 - moveActive;
    const wWaveA = Math.sin(this.idleTime * 1.85);
    const wWaveB = Math.cos(this.idleTime * 1.4);
    const wBreath = Math.sin(this.idleTime * 2.1);

    let gUpperLegXL =
      swingL * strideAmp * (0.45 + 0.55 * Math.abs(fwdRatio)) +
      strafeLiftL * 0.24 -
      this.landKneeFlex * 0.52;
    let gUpperLegXR =
      swingR * strideAmp * (0.45 + 0.55 * Math.abs(fwdRatio)) +
      strafeLiftR * 0.24 -
      this.landKneeFlex * 0.52;

    let gUpperLegZL =
      -0.025 +
      Math.min(
        0.14,
        Math.max(-0.42, strafeStepL * 0.42 * strafeWeight - strafeWeight * 0.08),
      );
    let gUpperLegZR =
      0.025 +
      Math.max(
        -0.14,
        Math.min(0.42, strafeStepR * 0.42 * strafeWeight + strafeWeight * 0.08),
      );

    let gLowerLegXL = -(
      liftL * kneeAmp * (0.55 + 0.45 * Math.abs(fwdRatio)) +
      stanceCushionL * moveActive +
      strafeLiftL * 0.55 +
      this.landKneeFlex * 1.05
    );
    let gLowerLegXR = -(
      liftR * kneeAmp * (0.55 + 0.45 * Math.abs(fwdRatio)) +
      stanceCushionR * moveActive +
      strafeLiftR * 0.55 +
      this.landKneeFlex * 1.05
    );

    const gFootXL =
      (Math.sin(pL) * 0.26 * fwdSign * fwdAbsWeight +
        strafeLiftL * 0.14 +
        this.landKneeFlex * 0.45) *
      groundFactor;
    const gFootXR =
      (Math.sin(pR) * 0.26 * fwdSign * fwdAbsWeight +
        strafeLiftR * 0.14 +
        this.landKneeFlex * 0.45) *
      groundFactor;

    const strideBounce =
      (Math.abs(Math.sin(this.stridePhase)) - 0.5) *
      THREE.MathUtils.lerp(0.055, 0.105, runBlend) *
      moveActive;
    const idleBreath = wBreath * 0.014 * idleWeight;
    const idleShift = Math.sin(this.idleTime * 1.05) * 0.028 * idleWeight;

    const gPelvisY = 0.88 + strideBounce + idleBreath - this.landKneeFlex * 0.18;
    const gPelvisX = idleShift - Math.sin(this.stridePhase) * 0.03 * strafeWeight;
    let gPelvisYaw =
      -Math.sin(this.stridePhase) * 0.14 * moveActive * fwdSign -
      this.smoothRight * 0.22;
    let gPelvisRoll =
      Math.cos(this.stridePhase) * 0.045 * moveActive + this.smoothRight * 0.05;

    const speedExtraLean =
      (isSuperSpeed ? -0.28 : 0) * moveActive * fwdSign - 0.14 * sprintB * moveActive * fwdSign;
    const forwardLean =
      -this.smoothFwd * THREE.MathUtils.lerp(0.08, isSuperSpeed ? 0.3 : 0.2, runBlend) +
      speedExtraLean -
      this.landKneeFlex * 0.22;
    const sideLean = -this.smoothRight * (isSuperSpeed ? 0.16 : 0.11);

    let gWaistYaw = -gPelvisYaw * 0.55;
    let gChestYaw =
      -gPelvisYaw * 0.45 +
      Math.sin(this.stridePhase) * 0.08 * fwdAbsWeight * fwdSign;
    let gChestX = forwardLean + wBreath * 0.016 * idleWeight;
    let gChestZ = sideLean;

    let gHeadYaw = -this.smoothRight * 0.04;
    let gHeadX = -forwardLean * 0.45 + wBreath * 0.02 * idleWeight;
    let gHeadZ = -sideLean * 0.5 + idleShift * 0.4;

    let gUpperArmXL =
      swingR * armAmp * (0.65 + 0.35 * Math.abs(fwdRatio)) +
      Math.cos(pL) * 0.16 * strafeWeight;
    let gUpperArmXR =
      swingL * armAmp * (0.65 + 0.35 * Math.abs(fwdRatio)) +
      Math.cos(pR) * 0.16 * strafeWeight;

    let gUpperArmZL = -(
      0.08 +
      runBlend * 0.08 +
      sprintB * 0.04 +
      strafeWeight * 0.14 +
      wBreath * 0.016 * idleWeight
    );
    let gUpperArmZR =
      0.08 +
      runBlend * 0.08 +
      sprintB * 0.04 +
      strafeWeight * 0.14 +
      wBreath * 0.016 * idleWeight;

    const baseElbow = THREE.MathUtils.lerp(0.18, 0.72, runBlend * moveActive) + 0.34 * sprintB * moveActive;
    let gLowerArmXL =
      baseElbow +
      Math.max(0, swingR) * (0.42 + 0.14 * sprintB) * moveActive +
      this.landKneeFlex * 0.35;
    let gLowerArmXR =
      baseElbow +
      Math.max(0, swingL) * (0.42 + 0.14 * sprintB) * moveActive +
      this.landKneeFlex * 0.35;

    let leftHandRotX = 0;
    let leftHandRotZ = 0;
    let rightHandRotX = 0;
    let rightHandRotZ = 0;

    const previewBoost = state.previewMode ? 1.15 : 0.9;
    if (this.archetype === 'scarlet-witch' && this.skinId === 'wanda-zombie') {
      // Wanda Zombie: hunched, erratic undead idle stance that smoothly crossfades into the shared running animation when moving
      const twitchA = Math.sin(this.idleTime * 8.5) * 0.032 * previewBoost * idleWeight;
      const twitchB = Math.cos(this.idleTime * 11.2) * 0.028 * previewBoost * idleWeight;
      gPelvisYaw += -0.1 * idleWeight;
      gChestX += -0.26 * idleWeight + twitchA * 0.5;
      gChestZ += (0.09 + twitchB) * idleWeight;
      gHeadX += 0.18 * idleWeight;
      gHeadZ += (-0.14 + Math.sin(this.idleTime * 4.1) * 0.055) * idleWeight;

      gUpperLegXL += 0.16 * idleWeight;
      gLowerLegXL += -0.28 * idleWeight;
      gUpperLegXR += -0.1 * idleWeight;
      gLowerLegXR += -0.18 * idleWeight;

      // Clawed forward-reaching undead hands (idle only; blends smoothly into shared running arms)
      gUpperArmXL += (0.72 + wWaveA * 0.08 + twitchA) * idleWeight;
      gUpperArmXR += (0.86 + wWaveB * 0.08 - twitchB) * idleWeight;
      gUpperArmZL += -0.22 * idleWeight;
      gUpperArmZR += 0.24 * idleWeight;
      gLowerArmXL += (0.64 + twitchB * 2) * idleWeight;
      gLowerArmXR += (0.72 - twitchA * 2) * idleWeight;

      leftHandRotX = (-0.28 + Math.sin(this.idleTime * 5.2) * 0.12) * idleWeight;
      rightHandRotX = (-0.32 + Math.cos(this.idleTime * 5.6) * 0.12) * idleWeight;
    } else if (this.archetype === 'scarlet-witch') {
      // Scarlet Witch: confident, enchanting sorceress stance with gentle chaos wrists
      gPelvisYaw += -0.14 * idleWeight;
      gPelvisRoll += 0.045 * idleWeight;
      gWaistYaw += 0.08 * idleWeight;
      gChestYaw += 0.1 * idleWeight;
      gChestX += 0.04 * idleWeight;
      gChestZ += -0.03 * idleWeight;
      gHeadYaw += -0.06 * idleWeight;
      gHeadZ += 0.035 * idleWeight;

      gUpperLegXL += 0.12 * idleWeight;
      gLowerLegXL += -0.18 * idleWeight;
      gUpperLegXR += -0.08 * idleWeight;
      gLowerLegXR += -0.07 * idleWeight;
      gUpperLegZL += -0.035 * idleWeight;
      gUpperLegZR += 0.055 * idleWeight;

      gUpperArmXL += (0.28 + wWaveA * 0.08 * previewBoost) * idleWeight;
      gUpperArmXR += (0.48 + wWaveB * 0.09 * previewBoost) * idleWeight;
      gUpperArmZL += (-0.18 - wBreath * 0.045) * idleWeight;
      gUpperArmZR += (0.24 + wWaveA * 0.05) * idleWeight;
      gLowerArmXL += (0.68 + wWaveB * 0.14) * idleWeight;
      gLowerArmXR += (0.94 + wWaveA * 0.16) * idleWeight;

      leftHandRotX = (0.18 + Math.sin(this.idleTime * 2.6) * 0.14) * idleWeight;
      leftHandRotZ = (0.14 + Math.cos(this.idleTime * 2.1) * 0.12) * idleWeight;
      rightHandRotX = (0.22 + Math.cos(this.idleTime * 2.5) * 0.15) * idleWeight;
      rightHandRotZ = (-0.16 + Math.sin(this.idleTime * 2.2) * 0.12) * idleWeight;
    } else if (this.archetype === 'agatha-harkness') {
      // Agatha Harkness: theatrical ancient witch poise with expressive floating spell hands & subtle head tilt
      gPelvisYaw += -0.12 * idleWeight;
      gPelvisRoll += 0.04 * idleWeight;
      gWaistYaw += 0.08 * idleWeight;
      gChestYaw += 0.09 * idleWeight;
      gChestX += -0.03 * idleWeight;
      gHeadYaw += -0.05 * idleWeight;
      gHeadZ += 0.045 * idleWeight;

      gUpperLegZL += -0.035 * idleWeight;
      gUpperLegZR += 0.045 * idleWeight;

      gUpperArmXL += (0.36 + wWaveA * 0.07 * previewBoost) * idleWeight;
      gUpperArmXR += (0.42 + wWaveB * 0.07 * previewBoost) * idleWeight;
      gUpperArmZL += (-0.34 - wBreath * 0.04) * idleWeight;
      gUpperArmZR += (0.36 + wBreath * 0.04) * idleWeight;
      gLowerArmXL += (0.82 + wWaveB * 0.12) * idleWeight;
      gLowerArmXR += (0.86 + wWaveA * 0.12) * idleWeight;

      leftHandRotX = (-0.22 + Math.sin(this.idleTime * 2.1) * 0.14) * idleWeight;
      leftHandRotZ = (0.18 + Math.cos(this.idleTime * 1.9) * 0.1) * idleWeight;
      rightHandRotX = (-0.22 + Math.cos(this.idleTime * 2.1) * 0.14) * idleWeight;
      rightHandRotZ = (-0.18 + Math.sin(this.idleTime * 1.9) * 0.1) * idleWeight;
    } else if (this.archetype === 'phoenix-force') {
      // Phoenix Force: majestic upright stance with controlled solar hands & lifted chest
      gPelvisYaw += 0.06 * idleWeight;
      gChestX += -0.075 * idleWeight;
      gHeadX += 0.045 * idleWeight;
      gUpperLegZL += -0.055 * idleWeight;
      gUpperLegZR += 0.055 * idleWeight;
      gUpperLegXL += 0.05 * idleWeight;
      gUpperLegXR += -0.04 * idleWeight;

      gUpperArmXL += (0.22 + wWaveA * 0.06 * previewBoost) * idleWeight;
      gUpperArmXR += (0.24 + wWaveB * 0.06 * previewBoost) * idleWeight;
      gUpperArmZL += (-0.28 - wBreath * 0.035) * idleWeight;
      gUpperArmZR += (0.28 + wBreath * 0.035) * idleWeight;
      gLowerArmXL += (0.48 + wWaveB * 0.09) * idleWeight;
      gLowerArmXR += (0.48 + wWaveA * 0.09) * idleWeight;

      leftHandRotX = (0.14 + Math.sin(this.idleTime * 2.2) * 0.1) * idleWeight;
      rightHandRotX = (0.14 + Math.cos(this.idleTime * 2.2) * 0.1) * idleWeight;
    } else if (this.archetype === 'emma-frost') {
      // Emma Frost: refined White Queen pose with right hand raised gracefully near her temple/forehead
      gPelvisYaw += -0.14 * idleWeight;
      gPelvisRoll += 0.05 * idleWeight;
      gWaistYaw += 0.1 * idleWeight;
      gChestYaw += 0.08 * idleWeight;
      gChestX += -0.03 * idleWeight;
      gHeadYaw += -0.05 * idleWeight;
      gHeadZ += 0.03 * idleWeight;

      gUpperLegXL += 0.11 * idleWeight;
      gLowerLegXL += -0.16 * idleWeight;
      gUpperLegXR += -0.08 * idleWeight;
      gLowerLegXR += -0.06 * idleWeight;
      gUpperLegZL += -0.025 * idleWeight;
      gUpperLegZR += 0.05 * idleWeight;

      // Left arm poised elegantly at waist/hip
      gUpperArmXL += 0.16 * idleWeight;
      gUpperArmZL += (-0.32 - wBreath * 0.02) * idleWeight;
      gLowerArmXL += 0.96 * idleWeight;

      // Right hand gracefully poised near her forehead/temple
      const templeSway = Math.sin(this.idleTime * 1.9) * 0.035 * previewBoost;
      gUpperArmXR += (1.44 + templeSway) * idleWeight;
      gUpperArmZR += 0.36 * idleWeight;
      gLowerArmXR += 1.54 * idleWeight;

      rightHandRotX = 0.18 * idleWeight;
      rightHandRotZ = -0.18 * idleWeight;
    } else if (this.archetype === 'hela') {
      // Hela: intimidating combat idle with slightly crossed legs & sharp regal balance
      gPelvisYaw += -0.2 * idleWeight;
      gPelvisRoll += 0.03 * idleWeight;
      gWaistYaw += 0.12 * idleWeight;
      gChestYaw += 0.16 * idleWeight;
      gChestX += 0.02 * idleWeight;
      gHeadYaw += -0.08 * idleWeight;

      // Slightly crossed legs (left leg stepped gracefully across front, right anchored behind)
      gUpperLegXL += 0.15 * idleWeight;
      gUpperLegZL += 0.082 * idleWeight;
      gLowerLegXL += -0.18 * idleWeight;

      gUpperLegXR += -0.12 * idleWeight;
      gUpperLegZR += -0.048 * idleWeight;
      gLowerLegXR += -0.12 * idleWeight;

      // Sharp combat ready arms (held outside torso; seamlessly taken over when holding swords)
      gUpperArmXL += (0.24 + wWaveA * 0.05) * idleWeight;
      gUpperArmZL += (-0.28 - wBreath * 0.03) * idleWeight;
      gLowerArmXL += (0.52 + wWaveB * 0.06) * idleWeight;

      gUpperArmXR += (0.28 + wWaveB * 0.05) * idleWeight;
      gUpperArmZR += (0.28 + wBreath * 0.03) * idleWeight;
      gLowerArmXR += (0.56 + wWaveA * 0.06) * idleWeight;
    } else if (this.archetype === 'magneto') {
      // Magneto: commanding magnetic sovereign idle with slow hovering poise, lifted cape, and magnetic palm control
      const hoverPulse = Math.sin(this.idleTime * 1.9) * 0.032 * previewBoost;
      gPelvisYaw += -0.09 * idleWeight;
      gChestX += (-0.06 + hoverPulse * 0.4) * idleWeight;
      gHeadX += 0.04 * idleWeight;
      gUpperLegZL += -0.065 * idleWeight;
      gUpperLegZR += 0.065 * idleWeight;
      gUpperArmXL += (0.38 + wWaveA * 0.07 * previewBoost) * idleWeight;
      gUpperArmXR += (0.38 + wWaveB * 0.07 * previewBoost) * idleWeight;
      gUpperArmZL += (-0.34 - wBreath * 0.04) * idleWeight;
      gUpperArmZR += (0.34 + wBreath * 0.04) * idleWeight;
      gLowerArmXL += (0.68 + wWaveB * 0.09) * idleWeight;
      gLowerArmXR += (0.68 + wWaveA * 0.09) * idleWeight;
      leftHandRotX = (0.28 + Math.sin(this.idleTime * 2.3) * 0.08) * idleWeight;
      rightHandRotX = (0.28 + Math.cos(this.idleTime * 2.3) * 0.08) * idleWeight;
    } else if (this.archetype === 'quicksilver') {
      // Quicksilver: coiled forward-leaning sprinter readiness & bouncy idle arms
      const bounce = Math.abs(Math.sin(this.idleTime * 3.6)) * 0.028 * previewBoost;
      gPelvisYaw += -0.24 * idleWeight;
      gChestYaw += 0.2 * idleWeight;
      gChestX += -0.15 * idleWeight;
      gHeadX += 0.11 * idleWeight;
      gUpperLegXL += (0.24 + bounce) * idleWeight;
      gLowerLegXL += (-0.36 - bounce) * idleWeight;
      gUpperLegXR += -0.19 * idleWeight;
      gLowerLegXR += -0.17 * idleWeight;
      gUpperArmXL += (0.56 + bounce) * idleWeight;
      gUpperArmXR += (0.24 - bounce) * idleWeight;
      gLowerArmXL += 1.08 * idleWeight;
      gLowerArmXR += 1.18 * idleWeight;
    } else if (this.archetype === 'doctor-strange') {
      // Doctor Strange: poised mystic sorcerer stance with asymmetric conjuring mudra hands
      gPelvisYaw += -0.12 * idleWeight;
      gChestYaw += 0.1 * idleWeight;
      gUpperLegZL += -0.04 * idleWeight;
      gUpperLegZR += 0.05 * idleWeight;
      gUpperArmXL += (0.52 + wWaveA * 0.07 * previewBoost) * idleWeight;
      gUpperArmZL += -0.24 * idleWeight;
      gLowerArmXL += (0.98 + wWaveB * 0.09) * idleWeight;
      gUpperArmXR += (0.78 + wWaveB * 0.07 * previewBoost) * idleWeight;
      gUpperArmZR += 0.3 * idleWeight;
      gLowerArmXR += (1.16 + wWaveA * 0.09) * idleWeight;
      leftHandRotX = (0.24 + Math.sin(this.idleTime * 2.4) * 0.1) * idleWeight;
      rightHandRotX = (-0.2 + Math.cos(this.idleTime * 2.4) * 0.1) * idleWeight;
    } else if (this.archetype === 'vision') {
      // Vision: serene symmetrical synthezoid poise (arms lightly folded across chest & upright dignity)
      const hoverFloat = Math.sin(this.idleTime * 1.7) * 0.02 * previewBoost;
      gChestX += (-0.03 + hoverFloat) * idleWeight;
      gHeadX += -hoverFloat * 0.5 * idleWeight;
      gUpperLegZL += -0.028 * idleWeight;
      gUpperLegZR += 0.028 * idleWeight;
      gUpperArmXL += (0.4 + wBreath * 0.02) * idleWeight;
      gUpperArmXR += (0.4 + wBreath * 0.02) * idleWeight;
      gUpperArmZL += 0.16 * idleWeight;
      gUpperArmZR += -0.16 * idleWeight;
      gLowerArmXL += 1.12 * idleWeight;
      gLowerArmXR += 1.12 * idleWeight;
    } else if (this.archetype === 'captain-america') {
      // Captain America: grounded super-soldier ready stance displaying Vibranium shield on left forearm
      gChestX += -0.04 * idleWeight;
      gChestYaw += 0.08 * idleWeight;
      gUpperLegZL += -0.04 * idleWeight;
      gUpperLegZR += 0.04 * idleWeight;
      gUpperArmXL += (0.28 + wBreath * 0.025) * idleWeight;
      gUpperArmZL += -0.18 * idleWeight;
      gLowerArmXL += 0.62 * idleWeight;
      gUpperArmXR += (-0.08 + wBreath * 0.02) * idleWeight;
      gUpperArmZR += 0.16 * idleWeight;
      gLowerArmXR += 0.36 * idleWeight;
    } else if (this.archetype === 'thor') {
      // Thor: broad thunder-god stance holding Mjolnir ready in right hand
      gChestX += -0.03 * idleWeight;
      gChestYaw += -0.06 * idleWeight;
      gUpperLegZL += -0.045 * idleWeight;
      gUpperLegZR += 0.045 * idleWeight;
      gUpperArmXL += (0.06 + wBreath * 0.02) * idleWeight;
      gUpperArmZL += -0.16 * idleWeight;
      gLowerArmXL += 0.24 * idleWeight;
      gUpperArmXR += (0.22 + wBreath * 0.025) * idleWeight;
      gUpperArmZR += 0.2 * idleWeight;
      gLowerArmXR += 0.38 * idleWeight;
    } else if (this.archetype === 'silver-surfer') {
      // Silver Surfer: poised cosmic sentinel stance with taut balanced arms & chest
      gChestX += -0.05 * idleWeight;
      gPelvisYaw += -0.1 * idleWeight;
      gChestYaw += 0.1 * idleWeight;
      gUpperLegZL += -0.045 * idleWeight;
      gUpperLegZR += 0.045 * idleWeight;
      gUpperArmXL += (0.14 + wBreath * 0.025) * idleWeight;
      gUpperArmZL += -0.24 * idleWeight;
      gLowerArmXL += 0.34 * idleWeight;
      gUpperArmXR += (0.14 + wBreath * 0.025) * idleWeight;
      gUpperArmZR += 0.24 * idleWeight;
      gLowerArmXR += 0.34 * idleWeight;
    } else if (this.archetype === 'storm') {
      // Storm: regal floating weather-goddess stance with poised wind-weaving hands
      const gale = Math.sin(this.idleTime * 2.1) * 0.025 * previewBoost;
      gChestX += (-0.06 + gale * 0.4) * idleWeight;
      gPelvisYaw += -0.1 * idleWeight;
      gChestYaw += 0.1 * idleWeight;
      gUpperLegZL += -0.04 * idleWeight;
      gUpperLegZR += 0.04 * idleWeight;
      gUpperArmXL += (0.34 + wWaveA * 0.07 * previewBoost) * idleWeight;
      gUpperArmZL += (-0.34 - gale) * idleWeight;
      gLowerArmXL += (0.72 + wWaveB * 0.09) * idleWeight;
      gUpperArmXR += (0.42 + wWaveB * 0.07 * previewBoost) * idleWeight;
      gUpperArmZR += (0.34 + gale) * idleWeight;
      gLowerArmXR += (0.78 + wWaveA * 0.09) * idleWeight;
      leftHandRotX = (0.18 + Math.sin(this.idleTime * 2.2) * 0.08) * idleWeight;
      rightHandRotX = (0.18 + Math.cos(this.idleTime * 2.2) * 0.08) * idleWeight;
    }

    // 5. Airborne (Jump / Fall)
    const riseT = smoothstep(0.0, 0.9, this.riseFallBlend);
    const fallT = smoothstep(0.0, 0.9, -this.riseFallBlend);
    const airFlutter = Math.sin(this.idleTime * 11.0) * 0.04 * fallT;

    const aPelvisY = 0.88 + riseT * 0.05 - fallT * 0.04;
    const aChestX = -0.14 * riseT + 0.08 * fallT - this.smoothFwd * 0.12;
    const aChestZ = -this.smoothRight * 0.14;

    const aUpperLegXL = 0.56 * riseT + 0.24 * fallT + this.smoothFwd * 0.15;
    const aLowerLegXL = -(0.88 * riseT + 0.46 * fallT);
    const aUpperLegXR = -0.22 * riseT + 0.06 * fallT + this.smoothFwd * 0.1;
    const aLowerLegXR = -(0.34 * riseT + 0.38 * fallT);

    const aUpperLegZL = -0.08 - fallT * 0.07;
    const aUpperLegZR = 0.08 + fallT * 0.07;

    const aFootXL = -0.22 * riseT + 0.16 * fallT;
    const aFootXR = -0.28 * riseT + 0.12 * fallT;

    const aUpperArmXL = 0.65 * riseT + 0.32 * fallT + airFlutter;
    const aUpperArmXR = 0.48 * riseT + 0.32 * fallT - airFlutter;
    const aUpperArmZL = -(0.28 + 0.24 * fallT);
    const aUpperArmZR = 0.28 + 0.24 * fallT;
    const aLowerArmXL = 0.55 * riseT + 0.42 * fallT;
    const aLowerArmXR = 0.48 * riseT + 0.42 * fallT;

    // 6. Blend Grounded <-> Airborne
    const ab = this.airBlend;
    const rig = this.rig;

    let pPosX = THREE.MathUtils.lerp(gPelvisX, 0, ab);
    let pPosY = THREE.MathUtils.lerp(gPelvisY, aPelvisY, ab);
    let pRotX = 0;
    let pRotY = THREE.MathUtils.lerp(gPelvisYaw, -this.smoothRight * 0.12, ab);
    let pRotZ = THREE.MathUtils.lerp(gPelvisRoll, 0, ab);

    let waistY = THREE.MathUtils.lerp(gWaistYaw, 0, ab);
    let chestX = THREE.MathUtils.lerp(gChestX, aChestX, ab);
    let chestY = THREE.MathUtils.lerp(gChestYaw, this.smoothRight * 0.08, ab);
    let chestZ = THREE.MathUtils.lerp(gChestZ, aChestZ, ab);

    let headX = THREE.MathUtils.lerp(gHeadX, -aChestX * 0.4, ab);
    let headY = THREE.MathUtils.lerp(gHeadYaw, 0, ab);
    let headZ = THREE.MathUtils.lerp(gHeadZ, -aChestZ * 0.4, ab);

    let uLegLX = THREE.MathUtils.lerp(gUpperLegXL, aUpperLegXL, ab);
    let uLegLZ = THREE.MathUtils.lerp(gUpperLegZL, aUpperLegZL, ab);
    let lLegLX = THREE.MathUtils.lerp(gLowerLegXL, aLowerLegXL, ab);
    let footLX = THREE.MathUtils.lerp(gFootXL, aFootXL, ab);

    let uLegRX = THREE.MathUtils.lerp(gUpperLegXR, aUpperLegXR, ab);
    let uLegRZ = THREE.MathUtils.lerp(gUpperLegZR, aUpperLegZR, ab);
    let lLegRX = THREE.MathUtils.lerp(gLowerLegXR, aLowerLegXR, ab);
    let footRX = THREE.MathUtils.lerp(gFootXR, aFootXR, ab);

    let uArmLX = THREE.MathUtils.lerp(gUpperArmXL, aUpperArmXL, ab);
    let uArmLY = 0;
    let uArmLZ = THREE.MathUtils.lerp(gUpperArmZL, aUpperArmZL, ab);
    let lArmLX = THREE.MathUtils.lerp(gLowerArmXL, aLowerArmXL, ab);

    let uArmRX = THREE.MathUtils.lerp(gUpperArmXR, aUpperArmXR, ab);
    let uArmRY = 0;
    let uArmRZ = THREE.MathUtils.lerp(gUpperArmZR, aUpperArmZR, ab);
    let lArmRX = THREE.MathUtils.lerp(gLowerArmXR, aLowerArmXR, ab);

    // 7. Blend Flight Pose (directional body tilt + trailing legs + neutral return when stationary)
    if (this.flyBlend > 0.001) {
      const fb = this.flyBlend;
      const hoverBob = Math.sin(this.idleTime * 2.4) * 0.055;
      const fwdEffort = THREE.MathUtils.clamp(this.smoothFwd / 1.25, -1, 1);
      const rightEffort = THREE.MathUtils.clamp(this.smoothRight / 1.15, -1, 1);

      if (this.archetype === 'invisible-woman') {
        const shieldMix = this.forcefieldShieldBlend;
        const kneelFb = fb * (1 - shieldMix);
        const hoverFb = fb * shieldMix;

        if (kneelFb > 0.001) {
          // Kneeling atop circular blue Forcefield platform (matching Invisible Woman reference)
          const flyTiltFwd =
            fwdEffort >= 0 ? -0.26 * fwdEffort : -0.1 * fwdEffort;
          const flyBank = -0.14 * rightEffort;
          pPosX = THREE.MathUtils.lerp(pPosX, Math.sin(this.idleTime * 1.4) * 0.015, kneelFb);
          pPosY = THREE.MathUtils.lerp(pPosY, 0.64 + hoverBob * 0.8, kneelFb);
          pRotX = THREE.MathUtils.lerp(pRotX, flyTiltFwd * 0.6, kneelFb);
          pRotY = THREE.MathUtils.lerp(pRotY, -rightEffort * 0.12, kneelFb);
          pRotZ = THREE.MathUtils.lerp(pRotZ, flyBank, kneelFb);

          chestX = THREE.MathUtils.lerp(chestX, flyTiltFwd * 0.48 - 0.12, kneelFb);
          chestZ = THREE.MathUtils.lerp(chestZ, flyBank * 0.45, kneelFb);
          headX = THREE.MathUtils.lerp(headX, -flyTiltFwd * 0.65 + 0.1, kneelFb);
          headZ = THREE.MathUtils.lerp(headZ, -flyBank * 0.4, kneelFb);

          // Left leg bent forward supporting kneel; right knee bent back on platform
          uLegLX = THREE.MathUtils.lerp(uLegLX, 0.88, kneelFb);
          lLegLX = THREE.MathUtils.lerp(lLegLX, -1.52, kneelFb);
          footLX = THREE.MathUtils.lerp(footLX, -0.35, kneelFb);
          uLegLZ = THREE.MathUtils.lerp(uLegLZ, -0.14, kneelFb);

          uLegRX = THREE.MathUtils.lerp(uLegRX, -0.28, kneelFb);
          lLegRX = THREE.MathUtils.lerp(lLegRX, -1.62, kneelFb);
          footRX = THREE.MathUtils.lerp(footRX, -0.52, kneelFb);
          uLegRZ = THREE.MathUtils.lerp(uLegRZ, 0.12, kneelFb);

          // Graceful balanced arms while kneeling on Forcefield disc
          uArmLX = THREE.MathUtils.lerp(
            uArmLX,
            0.48 - fwdEffort * 0.1 + Math.sin(this.idleTime * 2.2) * 0.05,
            kneelFb,
          );
          uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.38, kneelFb);
          lArmLX = THREE.MathUtils.lerp(lArmLX, 0.72, kneelFb);

          uArmRX = THREE.MathUtils.lerp(
            uArmRX,
            0.36 - fwdEffort * 0.1 + Math.cos(this.idleTime * 2.2) * 0.05,
            kneelFb,
          );
          uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.44, kneelFb);
          lArmRX = THREE.MathUtils.lerp(lArmRX, 0.64, kneelFb);
        }

        if (hoverFb > 0.001) {
          // Hover stance while Forcefield Shield is active (platform hidden)
          const flyTiltFwd =
            fwdEffort >= 0 ? -0.3 * fwdEffort : -0.12 * fwdEffort;
          const flyBank = -0.16 * rightEffort;
          pPosY = THREE.MathUtils.lerp(pPosY, 0.92 + hoverBob, hoverFb);
          pRotX = THREE.MathUtils.lerp(pRotX, flyTiltFwd * 0.6, hoverFb);
          pRotZ = THREE.MathUtils.lerp(pRotZ, flyBank, hoverFb);
          chestX = THREE.MathUtils.lerp(chestX, flyTiltFwd * 0.4, hoverFb);
          headX = THREE.MathUtils.lerp(headX, -flyTiltFwd * 0.5, hoverFb);
          uLegLX = THREE.MathUtils.lerp(uLegLX, 0.22, hoverFb);
          lLegLX = THREE.MathUtils.lerp(lLegLX, -0.55, hoverFb);
          uLegRX = THREE.MathUtils.lerp(uLegRX, -0.12, hoverFb);
          lLegRX = THREE.MathUtils.lerp(lLegRX, -0.22, hoverFb);
        }
      } else if (this.archetype === 'vampire') {
        // Super Flight: strong Superman-style forward lean with right arm extended straight ahead
        const hasFwd = Math.max(0, fwdEffort);
        const flyTiltFwd =
          fwdEffort >= 0
            ? -0.24 - 0.68 * hasFwd
            : -0.15 * fwdEffort;
        const flyBank = -0.24 * rightEffort;

        pPosX = THREE.MathUtils.lerp(pPosX, Math.sin(this.idleTime * 1.4) * 0.018, fb);
        pPosY = THREE.MathUtils.lerp(pPosY, 0.96 + hoverBob, fb);
        pRotX = THREE.MathUtils.lerp(pRotX, flyTiltFwd * 0.72, fb);
        pRotY = THREE.MathUtils.lerp(pRotY, -rightEffort * 0.16, fb);
        pRotZ = THREE.MathUtils.lerp(pRotZ, flyBank, fb);

        chestX = THREE.MathUtils.lerp(
          chestX,
          flyTiltFwd * 0.46 + Math.sin(this.idleTime * 2.2) * 0.02,
          fb,
        );
        chestZ = THREE.MathUtils.lerp(chestZ, flyBank * 0.42, fb);
        headX = THREE.MathUtils.lerp(headX, -flyTiltFwd * 0.84, fb);
        headZ = THREE.MathUtils.lerp(headZ, -flyBank * 0.45, fb);

        const moveTrail = hasFwd * 0.26;
        uLegLX = THREE.MathUtils.lerp(
          uLegLX,
          -0.28 + moveTrail + Math.sin(this.idleTime * 2.0) * 0.04,
          fb,
        );
        lLegLX = THREE.MathUtils.lerp(lLegLX, -0.34, fb);
        uLegRX = THREE.MathUtils.lerp(
          uLegRX,
          -0.12 + moveTrail * 0.75 + Math.cos(this.idleTime * 2.0) * 0.03,
          fb,
        );
        lLegRX = THREE.MathUtils.lerp(lLegRX, -0.18, fb);

        // Right arm extended straight ahead in the direction of flight; left arm swept back
        uArmRX = THREE.MathUtils.lerp(
          uArmRX,
          1.45 + hasFwd * 0.34,
          fb,
        );
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.08, fb);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, fb);

        uArmLX = THREE.MathUtils.lerp(
          uArmLX,
          -0.24 - hasFwd * 0.36 + Math.sin(this.idleTime * 2.3) * 0.04,
          fb,
        );
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.26, fb);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.22, fb);
      } else if (this.archetype === 'silver-surfer') {
        // Cosmic Flight: crouched forward fast-flight posture when speeding ahead atop larger surfboard
        const fwdPos = Math.max(0, fwdEffort);
        const boardBank = -0.28 * rightEffort;
        const boardPitch = fwdEffort >= 0 ? -0.24 * fwdEffort : 0.08 * -fwdEffort;

        pPosX = THREE.MathUtils.lerp(pPosX, Math.sin(this.idleTime * 2.0) * 0.015, fb);
        pPosY = THREE.MathUtils.lerp(
          pPosY,
          0.95 - fwdPos * 0.16 + hoverBob * 0.35,
          fb,
        );
        pRotX = THREE.MathUtils.lerp(pRotX, boardPitch * 0.58 - fwdPos * 0.22, fb);
        pRotY = THREE.MathUtils.lerp(pRotY, -0.92 - rightEffort * 0.16 + fwdPos * 0.08, fb);
        pRotZ = THREE.MathUtils.lerp(pRotZ, boardBank, fb);

        waistY = THREE.MathUtils.lerp(waistY, 0.36 + fwdPos * 0.08, fb);
        chestY = THREE.MathUtils.lerp(chestY, 0.48 + fwdPos * 0.1, fb);
        chestX = THREE.MathUtils.lerp(chestX, -0.14 - fwdPos * 0.36, fb);
        chestZ = THREE.MathUtils.lerp(chestZ, boardBank * 0.62, fb);
        headY = THREE.MathUtils.lerp(headY, 0.12 - fwdPos * 0.06, fb);
        headX = THREE.MathUtils.lerp(headX, 0.14 + fwdPos * 0.42, fb);

        // Deeper athletic crouched surfing knees when carving forward at high velocity
        uLegLX = THREE.MathUtils.lerp(uLegLX, 0.48 + fwdPos * 0.34, fb);
        lLegLX = THREE.MathUtils.lerp(lLegLX, -0.72 - fwdPos * 0.38, fb);
        footLX = THREE.MathUtils.lerp(footLX, 0.2 + fwdPos * 0.1, fb);
        uLegLZ = THREE.MathUtils.lerp(uLegLZ, -0.16, fb);

        uLegRX = THREE.MathUtils.lerp(uLegRX, -0.24 + fwdPos * 0.14, fb);
        lLegRX = THREE.MathUtils.lerp(lLegRX, -0.34 - fwdPos * 0.32, fb);
        footRX = THREE.MathUtils.lerp(footRX, 0.44 + fwdPos * 0.12, fb);
        uLegRZ = THREE.MathUtils.lerp(uLegRZ, 0.18, fb);

        // Swept dynamic balance arms (widen and trail cleanly with speed)
        uArmLX = THREE.MathUtils.lerp(
          uArmLX,
          0.32 - fwdPos * 0.26 + Math.sin(this.idleTime * 2.4) * 0.04,
          fb,
        );
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.04 - fwdPos * 0.18, fb);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.26 + fwdPos * 0.14, fb);

        uArmRX = THREE.MathUtils.lerp(
          uArmRX,
          0.36 - fwdPos * 0.22 + Math.cos(this.idleTime * 2.4) * 0.04,
          fb,
        );
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.04 + fwdPos * 0.18, fb);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.26 + fwdPos * 0.14, fb);
      } else {
        // Noticeable forward inclination, subtle backward inclination, neutral (0) when stopped
        const flyTiltFwd =
          fwdEffort >= 0 ? -0.46 * fwdEffort : -0.17 * fwdEffort;
        // Subtle lateral banking toward direction of strafe
        const flyBank = -0.21 * rightEffort;

        pPosX = THREE.MathUtils.lerp(pPosX, Math.sin(this.idleTime * 1.4) * 0.02, fb);
        pPosY = THREE.MathUtils.lerp(pPosY, 0.92 + hoverBob, fb);
        pRotX = THREE.MathUtils.lerp(pRotX, flyTiltFwd * 0.68, fb);
        pRotY = THREE.MathUtils.lerp(pRotY, -rightEffort * 0.16, fb);
        pRotZ = THREE.MathUtils.lerp(pRotZ, flyBank, fb);

        chestX = THREE.MathUtils.lerp(
          chestX,
          flyTiltFwd * 0.48 + Math.sin(this.idleTime * 2.2) * 0.025,
          fb,
        );
        chestZ = THREE.MathUtils.lerp(chestZ, flyBank * 0.45, fb);
        headX = THREE.MathUtils.lerp(headX, -flyTiltFwd * 0.72, fb);
        headZ = THREE.MathUtils.lerp(headZ, -flyBank * 0.45, fb);

        const moveTrail = Math.abs(fwdEffort) * 0.22;
        // Left leg bent higher, right leg extended trailing naturally
        uLegLX = THREE.MathUtils.lerp(
          uLegLX,
          0.26 + moveTrail + Math.sin(this.idleTime * 1.9) * 0.045,
          fb,
        );
        lLegLX = THREE.MathUtils.lerp(lLegLX, -0.78, fb);
        footLX = THREE.MathUtils.lerp(footLX, -0.38, fb);

        uLegRX = THREE.MathUtils.lerp(
          uLegRX,
          -0.14 + moveTrail * 0.8 + Math.cos(this.idleTime * 1.9) * 0.04,
          fb,
        );
        lLegRX = THREE.MathUtils.lerp(lLegRX, -0.26, fb);
        footRX = THREE.MathUtils.lerp(footRX, -0.44, fb);

        uLegLZ = THREE.MathUtils.lerp(uLegLZ, -0.07, fb);
        uLegRZ = THREE.MathUtils.lerp(uLegRZ, 0.07, fb);

        // Arms gracefully spread/poised for chaos energy levitation
        uArmLX = THREE.MathUtils.lerp(
          uArmLX,
          0.16 - fwdEffort * 0.14 + Math.sin(this.idleTime * 2.4) * 0.07,
          fb,
        );
        uArmLZ = THREE.MathUtils.lerp(
          uArmLZ,
          -0.44 - Math.cos(this.idleTime * 2.0) * 0.05,
          fb,
        );
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.56, fb);

        uArmRX = THREE.MathUtils.lerp(
          uArmRX,
          0.22 - fwdEffort * 0.14 + Math.cos(this.idleTime * 2.4) * 0.07,
          fb,
        );
        uArmRZ = THREE.MathUtils.lerp(
          uArmRZ,
          0.44 + Math.sin(this.idleTime * 2.0) * 0.05,
          fb,
        );
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.62, fb);
      }
    }

    // 8. Sustained Weapon / Manifest / Telepathic Poses (blended cleanly under casts)
    if (this.swordHeldBlend > 0.01) {
      // Aggressive, elegant dual-sword combat stance (idle, walking, turning) angled outward with zero clipping
      const sb = this.swordHeldBlend;
      const dualBreath = Math.sin(this.idleTime * 2.4) * 0.04;
      const moveSway = Math.sin(this.stridePhase) * 0.11 * moveActive;
      const combatWeight = sb * (1 - this.flyBlend * 0.35);

      chestX = THREE.MathUtils.lerp(chestX, -0.09 - 0.05 * moveActive, combatWeight * 0.72);
      chestY = THREE.MathUtils.lerp(chestY, -this.smoothRight * 0.14 + moveSway * 0.6, combatWeight * 0.7);

      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.36 + dualBreath + moveSway * 0.9, combatWeight * 0.88);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.44 - Math.abs(this.smoothRight) * 0.08, combatWeight * 0.9);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.78, combatWeight * 0.88);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.16, sb);
      leftHandRotZ = THREE.MathUtils.lerp(leftHandRotZ, 0.14, sb);

      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.46 - dualBreath - moveSway * 0.9, combatWeight * 0.88);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.44 + Math.abs(this.smoothRight) * 0.08, combatWeight * 0.9);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.82, combatWeight * 0.88);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.16, sb);
      rightHandRotZ = THREE.MathUtils.lerp(rightHandRotZ, -0.14, sb);
    }

    if (this.telepathicWaveBlend > 0.01) {
      // Emma Frost raising BOTH hands to her temples (matches reference image)
      const tb = this.telepathicWaveBlend;
      const tremor = Math.sin(this.idleTime * 16) * 0.025 * tb;
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.52 + tremor, tb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.48, tb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 1.56, tb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.52 - tremor, tb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.48, tb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 1.56, tb);
      chestX = THREE.MathUtils.lerp(chestX, -0.1, tb);
      headX = THREE.MathUtils.lerp(headX, 0.08, tb);
    }

    if (this.phoenixManifestBlend > 0.01) {
      // Regal stationary hovering Phoenix manifestation pose in sky
      const mb = this.phoenixManifestBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 0.92 + Math.sin(this.idleTime * 2.6) * 0.03, mb);
      pRotX = THREE.MathUtils.lerp(pRotX, -0.06, mb);
      chestX = THREE.MathUtils.lerp(chestX, -0.18, mb);
      headX = THREE.MathUtils.lerp(headX, 0.14, mb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.36, mb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.96, mb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.18, mb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.36, mb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.96, mb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.18, mb);
      uLegLX = THREE.MathUtils.lerp(uLegLX, 0.18, mb);
      lLegLX = THREE.MathUtils.lerp(lLegLX, -0.34, mb);
      uLegRX = THREE.MathUtils.lerp(uLegRX, -0.08, mb);
      lLegRX = THREE.MathUtils.lerp(lLegRX, -0.14, mb);
    }

    // 8a-new. Sustained New Character Poses
    if (this.metalTornadoBlend > 0.01) {
      const mt = this.metalTornadoBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 0.98 + Math.sin(this.idleTime * 5.2) * 0.05, mt);
      chestX = THREE.MathUtils.lerp(chestX, -0.14, mt);
      headX = THREE.MathUtils.lerp(headX, 0.1, mt);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.32 + Math.sin(this.idleTime * 7.5) * 0.12, mt);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.32 + Math.cos(this.idleTime * 7.5) * 0.12, mt);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.78, mt);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.78, mt);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.38, mt);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.38, mt);
      uLegLX = THREE.MathUtils.lerp(uLegLX, 0.24, mt);
      lLegLX = THREE.MathUtils.lerp(lLegLX, -0.58, mt);
      uLegRX = THREE.MathUtils.lerp(uLegRX, -0.1, mt);
      lLegRX = THREE.MathUtils.lerp(lLegRX, -0.22, mt);
    }

    if (this.rapidPunchBlend > 0.01) {
      const rp = this.rapidPunchBlend;
      const pFreq = 38.0;
      const altL = Math.sin(this.rapidPunchTime * pFreq);
      const altR = -altL;
      const pushL = Math.max(0, altL);
      const pushR = Math.max(0, altR);
      chestX = THREE.MathUtils.lerp(chestX, -0.24, rp);
      chestY = THREE.MathUtils.lerp(chestY, altL * 0.34, rp);
      headX = THREE.MathUtils.lerp(headX, 0.18, rp);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.45 + pushL * 1.42, rp);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.45 + pushR * 1.42, rp);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 1.25 - pushL * 1.1, rp);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 1.25 - pushR * 1.1, rp);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.14, rp);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.14, rp);
    }

    if (this.headGripBlend > 0.01) {
      const hg = this.headGripBlend;
      chestX = THREE.MathUtils.lerp(chestX, -0.12, hg);
      chestY = THREE.MathUtils.lerp(chestY, 0.24, hg);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.88, hg);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.08, hg);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.18, hg);
      uArmLX = THREE.MathUtils.lerp(uArmLX, -0.18, hg);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.28, hg);
    }

    if (this.mindLaserBlend > 0.01) {
      const ml = this.mindLaserBlend;
      chestX = THREE.MathUtils.lerp(chestX, -0.18, ml);
      headX = THREE.MathUtils.lerp(headX, 0.14, ml);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.22, ml);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.22, ml);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.34, ml);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.34, ml);
    }

    if (this.visionBoltChargeBlend > 0.01) {
      // Vision levitates slightly while leaning backward to focus energy into the Mind Stone
      const vb = this.visionBoltChargeBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 1.24 + Math.sin(this.idleTime * 6.5) * 0.03, vb);
      pRotX = THREE.MathUtils.lerp(pRotX, 0.08, vb);
      chestX = THREE.MathUtils.lerp(chestX, 0.34, vb);
      headX = THREE.MathUtils.lerp(headX, 0.24, vb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, -0.24, vb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, -0.24, vb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.58, vb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.58, vb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.28, vb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.28, vb);
      uLegLX = THREE.MathUtils.lerp(uLegLX, 0.24, vb);
      lLegLX = THREE.MathUtils.lerp(lLegLX, -0.45, vb);
      uLegRX = THREE.MathUtils.lerp(uLegRX, -0.16, vb);
      lLegRX = THREE.MathUtils.lerp(lLegRX, -0.22, vb);
    }

    // 8a-ext: Agatha Energy Absorption (torso arched back, head thrown skyward, both arms flung wide with open palms)
    if (this.agathaAbsorbBlend > 0.01) {
      const ab2 = this.agathaAbsorbBlend;
      const pulse = Math.sin(this.idleTime * 9.5) * 0.028 * ab2;
      chestX = THREE.MathUtils.lerp(chestX, 0.34, ab2);
      headX = THREE.MathUtils.lerp(headX, 0.62 + pulse * 0.5, ab2);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.18 + pulse, ab2);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.18 - pulse, ab2);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.32, ab2);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.32, ab2);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.08, ab2);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, ab2);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.25, ab2);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.25, ab2);
      leftHandRotZ = THREE.MathUtils.lerp(leftHandRotZ, 0.35, ab2);
      rightHandRotZ = THREE.MathUtils.lerp(rightHandRotZ, -0.35, ab2);
    }

    // 8a-ext2: Supreme Sorceress Energy Drain Beam (right hand raised palm upward while free to move/fly)
    if (this.supremeDrainBlend > 0.01) {
      const sd = this.supremeDrainBlend;
      const tremor = Math.sin(this.idleTime * 15) * 0.025 * sd;
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.44 + tremor, sd);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.2, sd);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.24, sd);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.92, sd);
      chestY = THREE.MathUtils.lerp(chestY, 0.16, sd);
    }

    // 8a-ext3: Wanda Zombie Beam (right hand raised channeling corrupted dark-red energy)
    if (this.zombieBeamBlend > 0.01) {
      const zb = this.zombieBeamBlend;
      const tremor = Math.sin(this.idleTime * 18) * 0.03 * zb;
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.48 + tremor, zb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.14, zb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, zb);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.65, zb);
      chestX = THREE.MathUtils.lerp(chestX, -0.18, zb);
    }

    // 8a-ext4: Invisible Woman Forcefield Shield (one hand lowered, other raised behind her)
    if (this.forcefieldShieldBlend > 0.01) {
      const fsb = this.forcefieldShieldBlend;
      const sway = Math.sin(this.idleTime * 3.1) * 0.025 * fsb;
      // Left hand lowered beside hip
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.16 + sway, fsb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.34, fsb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.22, fsb);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, 0.26, fsb);
      // Right hand raised behind her shoulder projecting sphere
      uArmRX = THREE.MathUtils.lerp(uArmRX, -0.92 - sway, fsb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.72, fsb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 1.38, fsb);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.35, fsb);
      chestY = THREE.MathUtils.lerp(chestY, -0.22, fsb);
      chestX = THREE.MathUtils.lerp(chestX, -0.06, fsb);
    }

    // 8a-ext5: Vampire Power Absorption stance (both hands raised onto target's neck, facing eye-to-eye)
    if (this.vampireAbsorbBlend > 0.01) {
      const vab = this.vampireAbsorbBlend;
      const pulse = Math.sin(this.idleTime * 10) * 0.025 * vab;
      const healBob = Math.sin(this.idleTime * 4.8) * 0.028 * vab;
      pPosY += healBob;
      chestX = THREE.MathUtils.lerp(chestX, -0.04, vab);
      chestY = THREE.MathUtils.lerp(chestY, 0, vab);
      headX = THREE.MathUtils.lerp(headX, 0.02, vab);
      headY = THREE.MathUtils.lerp(headY, 0, vab);
      // Both arms raised forward gripping target's neck
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.72 + pulse, vab);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.72 - pulse, vab);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.24, vab);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.24, vab);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.28, vab);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.28, vab);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.18, vab);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.18, vab);
      leftHandRotZ = THREE.MathUtils.lerp(leftHandRotZ, 0.2, vab);
      rightHandRotZ = THREE.MathUtils.lerp(rightHandRotZ, -0.2, vab);
    }

    // 8a-ext6: Captain America Shield Defense (raises left arm across front with shield protecting forward)
    if (this.capShieldDefenseBlend > 0.01) {
      const db = this.capShieldDefenseBlend;
      chestX = THREE.MathUtils.lerp(chestX, -0.1, db);
      chestY = THREE.MathUtils.lerp(chestY, -0.26, db);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.18, db);
      uArmLY = THREE.MathUtils.lerp(uArmLY, -0.82, db);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.24, db);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 1.02, db);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.22, db);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.2, db);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.72, db);
    }

    // 8a-ext7: Captain America Shield Charge (high-speed forward rush bracing shield straight ahead)
    if (this.capShieldChargeBlend > 0.01) {
      const cb = this.capShieldChargeBlend;
      chestX = THREE.MathUtils.lerp(chestX, -0.28, cb);
      chestY = THREE.MathUtils.lerp(chestY, -0.22, cb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.38, cb);
      uArmLY = THREE.MathUtils.lerp(uArmLY, -0.84, cb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.16, cb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.88, cb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, -0.45, cb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.22, cb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.85, cb);
    }

    // 8a-ext8: Thor raising right hand to summon Mjolnir back
    if (this.thorMjolnirSummonBlend > 0.01) {
      const sb = this.thorMjolnirSummonBlend;
      const tremble = Math.sin(this.idleTime * 22) * 0.03 * sb;
      chestY = THREE.MathUtils.lerp(chestY, 0.14, sb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.56 + tremble, sb);
      uArmRY = THREE.MathUtils.lerp(uArmRY, -0.06, sb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.24, sb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.1, sb);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.18, sb);
    }

    // 8a-ext9: Thor Lightning Slam Ascent (diagonally forward/upward leaning pose) & Ground Dive
    if (this.thorSlamAscendBlend > 0.01) {
      const ab = this.thorSlamAscendBlend;
      pRotX = THREE.MathUtils.lerp(pRotX, -0.28, ab);
      chestX = THREE.MathUtils.lerp(chestX, -0.24, ab);
      headX = THREE.MathUtils.lerp(headX, 0.26, ab);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 2.55, ab);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.22, ab);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.28, ab);
      uArmLX = THREE.MathUtils.lerp(uArmLX, -0.35, ab);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.42, ab);
      uLegLX = THREE.MathUtils.lerp(uLegLX, 0.48, ab);
      lLegLX = THREE.MathUtils.lerp(lLegLX, -0.82, ab);
      uLegRX = THREE.MathUtils.lerp(uLegRX, -0.32, ab);
    }
    if (this.thorSlamDiveBlend > 0.01) {
      const db = this.thorSlamDiveBlend;
      pRotX = THREE.MathUtils.lerp(pRotX, -0.56, db);
      chestX = THREE.MathUtils.lerp(chestX, -0.42, db);
      headX = THREE.MathUtils.lerp(headX, 0.48, db);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 2.35, db);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.12, db);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, db);
      uArmLX = THREE.MathUtils.lerp(uArmLX, -0.28, db);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.35, db);
    }

    // 8a-ext10: Thor Lightning Storm Beam Phase 1 (T-pose + raised head sky channel) & Phase 2 (both hands forward together)
    if (this.thorStormChannelBlend > 0.01) {
      const cb = this.thorStormChannelBlend;
      const surge = Math.sin(this.idleTime * 26) * 0.04 * cb;
      chestX = THREE.MathUtils.lerp(chestX, 0.16, cb);
      headX = THREE.MathUtils.lerp(headX, 0.62, cb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0, cb);
      uArmLY = THREE.MathUtils.lerp(uArmLY, 0, cb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.55 + surge, cb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.08, cb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0, cb);
      uArmRY = THREE.MathUtils.lerp(uArmRY, 0, cb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.55 - surge, cb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, cb);
    }
    if (this.thorStormBeamBlend > 0.01) {
      const bb = this.thorStormBeamBlend;
      const recoil = Math.sin(this.idleTime * 34) * 0.03 * bb;
      chestX = THREE.MathUtils.lerp(chestX, -0.12, bb);
      headX = THREE.MathUtils.lerp(headX, 0.06, bb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.48 + recoil, bb);
      uArmLY = THREE.MathUtils.lerp(uArmLY, 0.24, bb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.22, bb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.12, bb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.48 - recoil, bb);
      uArmRY = THREE.MathUtils.lerp(uArmRY, -0.24, bb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.22, bb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, bb);
    }

    // 8a-ext11: Silver Surfer Damage Absorption (both hands draw inward absorbing energy toward chest)
    if (this.silverAbsorbBlend > 0.01) {
      const ab = this.silverAbsorbBlend;
      const hitBoost = this.silverAbsorbPulseTimer > 0 ? 1.0 : 0.48;
      const w = ab * hitBoost;
      const tremor = Math.sin(this.idleTime * 16) * 0.03 * w;
      chestX = THREE.MathUtils.lerp(chestX, 0.08, w);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.96 + tremor, w);
      uArmLY = THREE.MathUtils.lerp(uArmLY, 0.45, w);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.24, w);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 1.18, w);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.96 - tremor, w);
      uArmRY = THREE.MathUtils.lerp(uArmRY, -0.45, w);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.24, w);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 1.18, w);
    }

    // 8a-ext12: Silver Surfer Cosmic Blast charge (gather silver orb tightly between both palms)
    if (this.silverCosmicChargeBlend > 0.01) {
      const cb = this.silverCosmicChargeBlend;
      const pulse = Math.sin(this.idleTime * 20) * 0.025 * cb;
      chestY = THREE.MathUtils.lerp(chestY, 0.12, cb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.12 + pulse, cb);
      uArmLY = THREE.MathUtils.lerp(uArmLY, 0.36, cb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.14, cb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.72, cb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.12 - pulse, cb);
      uArmRY = THREE.MathUtils.lerp(uArmRY, -0.36, cb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.14, cb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.72, cb);
    }

    // 8a-ext12b: Silver Surfer Dual Cosmic Beam (wide embracing arms firing beams forward from each hand)
    if (this.silverDualBeamBlend > 0.01) {
      const db = this.silverDualBeamBlend;
      const tremor = Math.sin(this.idleTime * 24) * 0.028 * db;
      pRotY = THREE.MathUtils.lerp(pRotY, 0, db);
      waistY = THREE.MathUtils.lerp(waistY, 0, db);
      chestY = THREE.MathUtils.lerp(chestY, 0, db);
      chestX = THREE.MathUtils.lerp(chestX, 0.12, db);
      headY = THREE.MathUtils.lerp(headY, 0, db);
      headX = THREE.MathUtils.lerp(headX, -0.1, db);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.62 + tremor, db);
      uArmLY = THREE.MathUtils.lerp(uArmLY, -0.14, db);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.32, db);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.34, db);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.52, db);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.62 - tremor, db);
      uArmRY = THREE.MathUtils.lerp(uArmRY, 0.14, db);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.32, db);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.34, db);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.52, db);
    }

    // 8a-ext13: Storm Lightning Strike hover rise (elevates & gathers storm arc above head)
    if (this.stormLightningRiseBlend > 0.01) {
      const lb = this.stormLightningRiseBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 1.12 + Math.sin(this.idleTime * 5.2) * 0.04, lb);
      chestX = THREE.MathUtils.lerp(chestX, 0.14, lb);
      headX = THREE.MathUtils.lerp(headX, 0.18, lb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 2.38, lb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.32, lb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.24, lb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 2.38, lb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.32, lb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.24, lb);
    }

    // 8a-ext14: Storm Tornado sustained levitation channel
    if (this.stormTornadoBlend > 0.01) {
      const tb = this.stormTornadoBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 1.04 + Math.sin(this.idleTime * 4.8) * 0.05, tb);
      chestX = THREE.MathUtils.lerp(chestX, 0.1, tb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.24 + Math.sin(this.idleTime * 6.5) * 0.1, tb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.82, tb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.36, tb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.24 + Math.cos(this.idleTime * 6.5) * 0.1, tb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.82, tb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.36, tb);
    }

    // 8a-ext15: Storm Wind Blast continuous forward gale stance
    if (this.stormWindBlastBlend > 0.01) {
      const wb = this.stormWindBlastBlend;
      const sway = Math.sin(this.idleTime * 14) * 0.03 * wb;
      chestX = THREE.MathUtils.lerp(chestX, -0.14, wb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.46 + sway, wb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.14, wb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.16, wb);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.68, wb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.46 - sway, wb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.14, wb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, wb);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.68, wb);
    }

    // 8b. Additive Casting Pose Overlay
    if (this.castKind) {
      const p = THREE.MathUtils.clamp(this.castElapsed / Math.max(this.castDuration, 0.01), 0, 1);
      const env = Math.sin(p * Math.PI);
      if (this.castKind === 'bolt-right') {
        const thrust = smoothstep(0.18, 0.55, p) * (1 - smoothstep(0.65, 1.0, p));
        const windup = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.45, p));
        uArmRX += thrust * 1.48 - windup * 0.45;
        uArmRZ += thrust * 0.08;
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, thrust);
        chestY += thrust * 0.24 - windup * 0.18;
      } else if (this.castKind === 'bolt-left') {
        const thrust = smoothstep(0.18, 0.55, p) * (1 - smoothstep(0.65, 1.0, p));
        const windup = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.45, p));
        uArmLX += thrust * 1.48 - windup * 0.45;
        uArmLZ -= thrust * 0.08;
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.14, thrust);
        chestY -= thrust * 0.24 - windup * 0.18;
      } else if (this.castKind === 'teleport') {
        uArmLX += env * 0.95;
        uArmRX += env * 0.95;
        uArmLZ -= env * 0.28;
        uArmRZ += env * 0.28;
        lArmLX += env * 0.55;
        lArmRX += env * 0.55;
        chestX += env * 0.1;
      } else if (this.castKind === 'implosion') {
        const focus = smoothstep(0.0, 0.45, p) * (1 - smoothstep(0.6, 1.0, p));
        const release = smoothstep(0.4, 0.65, p) * (1 - smoothstep(0.7, 1.0, p));
        uArmLX += focus * 1.2 + release * 0.35;
        uArmRX += focus * 1.2 + release * 0.35;
        uArmLZ += focus * 0.24 - release * 0.36;
        uArmRZ -= focus * 0.24 - release * 0.36;
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.42, focus);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.42, focus);
        chestX -= release * 0.18 - focus * 0.1;
      } else if (this.castKind === 'revive') {
        const charge = smoothstep(0.0, 0.44, p) * (1 - smoothstep(0.44, 0.56, p));
        const burst = smoothstep(0.42, 0.55, p) * (1 - smoothstep(0.7, 1.0, p));
        pPosY += charge * 0.22 + burst * 0.12;
        uArmLX += charge * 0.72 + burst * 0.48;
        uArmRX += charge * 0.72 + burst * 0.48;
        uArmLZ += charge * 0.22 - burst * 0.92;
        uArmRZ -= charge * 0.22 - burst * 0.92;
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.95, charge);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.95, charge);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.16, burst);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, burst);
        chestX += charge * 0.14 - burst * 0.26;
        headX += charge * 0.18 + burst * 0.2;
      } else if (this.castKind === 'mental-focus') {
        // Emma Frost hand raised gracefully to forehead
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.62, env);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.36, env);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 1.65, env);
        chestY -= env * 0.16;
        headX += env * 0.08;
      } else if (this.castKind === 'diamond-cast') {
        // Crystalline brace & arm cross-flash
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.05, env);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.05, env);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.32, env);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.32, env);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 1.15, env);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 1.15, env);
        chestX -= env * 0.12;
      } else if (this.castKind === 'crown-transform') {
        // Smooth front-to-back head tilt/slide as tousled hair sweeps back into the Crown
        const dip = smoothstep(0.0, 0.26, p) * (1 - smoothstep(0.26, 0.5, p));
        const arch = smoothstep(0.28, 0.62, p) * (1 - smoothstep(0.68, 1.0, p));
        headX += -dip * 0.24 + arch * 0.34;
        chestX -= arch * 0.14;
        uArmLZ -= arch * 0.22;
        uArmRZ += arch * 0.22;
      } else if (this.castKind === 'sword-summon-open') {
        // Dramatic outward double-arm opening as dual Necroswords materialize
        const spread = smoothstep(0.0, 0.38, p) * (1 - smoothstep(0.62, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.48, spread);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.48, spread);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.16, spread);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.16, spread);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.22, spread);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.22, spread);
        chestX = THREE.MathUtils.lerp(chestX, -0.16, spread);
        headX += spread * 0.14;
      } else if (this.castKind === 'sword-throw-right' || this.castKind === 'sword-throw') {
        // Aggressive right-side whip throw with deep shoulder coil and rapid forward snap
        const wind = smoothstep(0, 0.2, p) * (1 - smoothstep(0.2, 0.38, p));
        const whip = smoothstep(0.18, 0.44, p) * (1 - smoothstep(0.6, 1.0, p));
        const blend = Math.max(wind, whip);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -1.28 * wind + 2.32 * whip, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.88 * wind + 0.16 * whip, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, whip);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.35 * whip, whip);
        chestY += -0.62 * wind + 0.72 * whip;
        chestZ += -0.22 * wind + 0.16 * whip;
        chestX -= whip * 0.28 - wind * 0.1;
      } else if (this.castKind === 'sword-throw-left') {
        // Aggressive left-side whip throw with deep shoulder coil and rapid forward snap
        const wind = smoothstep(0, 0.2, p) * (1 - smoothstep(0.2, 0.38, p));
        const whip = smoothstep(0.18, 0.44, p) * (1 - smoothstep(0.6, 1.0, p));
        const blend = Math.max(wind, whip);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -1.28 * wind + 2.32 * whip, blend);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.88 * wind - 0.16 * whip, blend);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.08, whip);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.35 * whip, whip);
        chestY += 0.62 * wind - 0.72 * whip;
        chestZ += 0.22 * wind - 0.16 * whip;
        chestX -= whip * 0.28 - wind * 0.1;
      } else if (this.castKind === 'sword-slash-right') {
        // Fierce sweeping right-hand cleave with aggressive lunge and torso torque
        const wind = smoothstep(0, 0.18, p) * (1 - smoothstep(0.18, 0.36, p));
        const slash = smoothstep(0.16, 0.44, p) * (1 - smoothstep(0.62, 1.0, p));
        const blend = Math.max(wind, slash);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.25 * wind + 1.88 * slash, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.18 * wind - 0.46 * slash, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, slash);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.28 * slash, slash);
        chestY += -0.58 * wind + 0.76 * slash;
        chestZ += -0.18 * wind + 0.18 * slash;
        chestX -= slash * 0.28;
      } else if (this.castKind === 'sword-slash-left') {
        // Fierce sweeping left-hand cleave with aggressive lunge and torso torque
        const wind = smoothstep(0, 0.18, p) * (1 - smoothstep(0.18, 0.36, p));
        const slash = smoothstep(0.16, 0.44, p) * (1 - smoothstep(0.62, 1.0, p));
        const blend = Math.max(wind, slash);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.25 * wind + 1.88 * slash, blend);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.18 * wind + 0.46 * slash, blend);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.16, slash);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.28 * slash, slash);
        chestY += 0.58 * wind - 0.76 * slash;
        chestZ += 0.18 * wind - 0.18 * slash;
        chestX -= slash * 0.28;
      } else if (this.castKind === 'sword-slash-dual') {
        // Ferocious twin Necrosword X-cross lunge
        const wind = smoothstep(0, 0.2, p) * (1 - smoothstep(0.2, 0.38, p));
        const cross = smoothstep(0.18, 0.48, p) * (1 - smoothstep(0.64, 1.0, p));
        const blend = Math.max(wind, cross);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.15 * wind + 1.82 * cross, blend);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.15 * wind + 1.82 * cross, blend);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.28 * wind + 0.38 * cross, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.28 * wind - 0.38 * cross, blend);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.18, cross);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.18, cross);
        chestX -= cross * 0.34 - wind * 0.2;
      } else if (this.castKind === 'npc-pistol-shoot') {
        const kick = Math.sin(Math.min(1, p * 1.45) * Math.PI);
        const settle = 1 - smoothstep(0.55, 1.0, p);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.54 + kick * 0.32, settle);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.05, settle);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08 + kick * 0.18, settle);
        chestX += kick * 0.12;
        headX += kick * 0.08;
      } else if (this.castKind === 'npc-punch-right') {
        const wind = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.42, p));
        const jab = smoothstep(0.2, 0.52, p) * (1 - smoothstep(0.64, 1.0, p));
        const blend = Math.max(wind, jab);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.35 * wind + 1.56 * jab, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.15, jab);
        chestY += -0.24 * wind + 0.38 * jab;
        chestX -= jab * 0.16;
      } else if (this.castKind === 'npc-punch-left') {
        const wind = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.42, p));
        const jab = smoothstep(0.2, 0.52, p) * (1 - smoothstep(0.64, 1.0, p));
        const blend = Math.max(wind, jab);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.35 * wind + 1.56 * jab, blend);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.15, jab);
        chestY += 0.24 * wind - 0.38 * jab;
        chestX -= jab * 0.16;
      } else if (this.castKind === 'green-charge-slam') {
        // Raise & gather green energy high (0..0.55) then smash arm downward (0.55..1.0)
        const raise = smoothstep(0.0, 0.38, p) * (1 - smoothstep(0.45, 0.62, p));
        const slam = smoothstep(0.46, 0.68, p) * (1 - smoothstep(0.8, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.65, raise);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.28, raise);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.35, raise);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.72, slam);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.64, slam);
        chestX = THREE.MathUtils.lerp(chestX, -0.14 * raise + 0.38 * slam, Math.max(raise, slam));
        pPosY -= slam * 0.12;
      } else if (this.castKind === 'hero-landing') {
        // Poised crouched one-knee / one-hand superhero landing pose
        const drop = smoothstep(0.0, 0.25, p) * (1 - smoothstep(0.68, 1.0, p));
        pPosY = THREE.MathUtils.lerp(pPosY, 0.56, drop);
        chestX = THREE.MathUtils.lerp(chestX, -0.46, drop);
        headX = THREE.MathUtils.lerp(headX, 0.38, drop);
        uLegLX = THREE.MathUtils.lerp(uLegLX, 1.05, drop);
        lLegLX = THREE.MathUtils.lerp(lLegLX, -1.55, drop);
        uLegRX = THREE.MathUtils.lerp(uLegRX, -0.52, drop);
        lLegRX = THREE.MathUtils.lerp(lLegRX, -1.15, drop);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.96, drop);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, drop);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.58, drop);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.42, drop);
      } else if (this.castKind === 'magneto-throw-right') {
        const wind = smoothstep(0, 0.25, p) * (1 - smoothstep(0.25, 0.48, p));
        const thrust = smoothstep(0.22, 0.55, p) * (1 - smoothstep(0.68, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.42 * wind + 1.62 * thrust, Math.max(wind, thrust));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.45 * wind + 0.12 * thrust, Math.max(wind, thrust));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, thrust);
        chestY += -0.28 * wind + 0.36 * thrust;
      } else if (this.castKind === 'magneto-throw-left') {
        const wind = smoothstep(0, 0.25, p) * (1 - smoothstep(0.25, 0.48, p));
        const thrust = smoothstep(0.22, 0.55, p) * (1 - smoothstep(0.68, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.42 * wind + 1.62 * thrust, Math.max(wind, thrust));
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.45 * wind - 0.12 * thrust, Math.max(wind, thrust));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.12, thrust);
        chestY += 0.28 * wind - 0.36 * thrust;
      } else if (this.castKind === 'meteor-raise') {
        const gather = smoothstep(0, 0.35, p) * (1 - smoothstep(0.72, 1.0, p));
        const hurl = smoothstep(0.72, 0.86, p) * (1 - smoothstep(0.92, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.75 * gather + 1.5 * hurl, Math.max(gather, hurl));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.18, gather);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.2, Math.max(gather, hurl));
        chestX = THREE.MathUtils.lerp(chestX, 0.16 * gather - 0.28 * hurl, Math.max(gather, hurl));
        headX = THREE.MathUtils.lerp(headX, 0.26 * gather, gather);
      } else if (this.castKind === 'qs-time-slam') {
        // Quicksilver raises arm then forcefully whips hand toward the ground
        const raise = smoothstep(0, 0.26, p) * (1 - smoothstep(0.26, 0.44, p));
        const slam = smoothstep(0.28, 0.56, p) * (1 - smoothstep(0.72, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.35 * raise + 0.52 * slam, Math.max(raise, slam));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.42 * raise + 0.18 * slam, Math.max(raise, slam));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, Math.max(raise, slam));
        chestX = THREE.MathUtils.lerp(chestX, -0.34 * slam, slam);
        pPosY -= slam * 0.16;
      } else if (this.castKind === 'qs-finisher-punch') {
        const wind = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.45, p));
        const smash = smoothstep(0.22, 0.55, p) * (1 - smoothstep(0.7, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.7 * wind + 1.92 * smash, Math.max(wind, smash));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.1, smash);
        chestY += -0.45 * wind + 0.65 * smash;
        chestX -= smash * 0.28;
      } else if (this.castKind === 'strange-disc-cast') {
        // Sweeping horizontal wrist flick launching flat orange magical discs
        const wind = smoothstep(0, 0.22, p) * (1 - smoothstep(0.22, 0.42, p));
        const whip = smoothstep(0.2, 0.56, p) * (1 - smoothstep(0.66, 1.0, p));
        const blend = Math.max(wind, whip);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.55 * wind + 1.44 * whip, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.85 * wind - 0.14 * whip, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, whip);
        rightHandRotZ = THREE.MathUtils.lerp(rightHandRotZ, -0.52 * whip, blend);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.62 * whip, whip);
        chestY += -0.34 * wind + 0.46 * whip;
        chestX -= whip * 0.12;
      } else if (this.castKind === 'strange-shield-cast') {
        // Deliberate circular conjuring arm sweep synced with Mystic Shield sparks forming
        const sweep = smoothstep(0.0, 0.42, p);
        const hold = smoothstep(0.38, 0.72, p) * (1 - smoothstep(0.76, 1.0, p));
        const angle = sweep * Math.PI * 1.1;
        const arcWeight = sweep * (1 - smoothstep(0.75, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(
          uArmRX,
          1.15 + Math.sin(angle) * 0.55 + hold * 0.25,
          arcWeight,
        );
        uArmRZ = THREE.MathUtils.lerp(
          uArmRZ,
          0.18 + Math.cos(angle) * 0.52,
          arcWeight,
        );
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.72 + hold * 0.28, arcWeight);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.92 + hold * 0.35, arcWeight);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.34, arcWeight);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.86, arcWeight);
        chestY += Math.cos(angle) * 0.16 * arcWeight;
        chestX -= hold * 0.08;
      } else if (this.castKind === 'strange-clones-cast') {
        // Coordinated clones pose: tilted slightly left, raising right hand to emit spark beam
        chestZ = THREE.MathUtils.lerp(chestZ, 0.14, env);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.46, env);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.12, env);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.18, env);
        rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.45, env);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.48, env);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.35, env);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.85, env);
      } else if (this.castKind === 'strange-clones-precast') {
        // Detailed Doctor Strange eldritch hand-weaving animation BEFORE summoning clones
        const weave = smoothstep(0.0, 0.52, p);
        const openSnap = smoothstep(0.54, 0.88, p) * (1 - smoothstep(0.9, 1.0, p));
        const circleAngle = weave * Math.PI * 2.2;
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.12 + Math.sin(circleAngle) * 0.26, weave);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.12 + Math.cos(circleAngle) * 0.26, weave);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.2 - openSnap * 0.55, Math.max(weave, openSnap));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.2 + openSnap * 0.55, Math.max(weave, openSnap));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 1.15 - openSnap * 0.85, Math.max(weave, openSnap));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 1.15 - openSnap * 0.85, Math.max(weave, openSnap));
        chestX -= openSnap * 0.14;
      } else if (this.castKind === 'purgatory-grasp-cast') {
        // Lift palms skyward (0..0.62) then forcefully snap both hands downward for ground slam (0.62..1.0)
        const lift = smoothstep(0.0, 0.45, p) * (1 - smoothstep(0.58, 0.72, p));
        const slam = smoothstep(0.6, 0.82, p) * (1 - smoothstep(0.86, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 2.35 * lift + 0.52 * slam, Math.max(lift, slam));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.35 * lift + 0.52 * slam, Math.max(lift, slam));
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.45 * lift - 0.16 * slam, Math.max(lift, slam));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.45 * lift + 0.16 * slam, Math.max(lift, slam));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.28, Math.max(lift, slam));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.28, Math.max(lift, slam));
        chestX += lift * 0.16 - slam * 0.34;
        headX += lift * 0.2;
      } else if (this.castKind === 'agatha-bolt-right') {
        const thrust = smoothstep(0.14, 0.52, p) * (1 - smoothstep(0.64, 1.0, p));
        uArmRX += thrust * 1.48;
        uArmRZ += thrust * 0.12;
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.16, thrust);
        rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.5, thrust);
        chestY += thrust * 0.24;
      } else if (this.castKind === 'agatha-bolt-left') {
        const thrust = smoothstep(0.14, 0.52, p) * (1 - smoothstep(0.64, 1.0, p));
        uArmLX += thrust * 1.48;
        uArmLZ -= thrust * 0.12;
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.16, thrust);
        leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.5, thrust);
        chestY -= thrust * 0.24;
      } else if (this.castKind === 'supreme-beam-bolt') {
        const snap = smoothstep(0.1, 0.45, p) * (1 - smoothstep(0.58, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.54, snap);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, snap);
        rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.75, snap);
        chestY += snap * 0.28;
      } else if (this.castKind === 'zombie-stone-explosion') {
        // Wanda Zombie levitates, raises clawed hands drawing stones in, then blasts outward
        const gather = smoothstep(0.0, 0.65, p) * (1 - smoothstep(0.68, 0.8, p));
        const release = smoothstep(0.68, 0.85, p) * (1 - smoothstep(0.88, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 2.2 * gather + 0.65 * release, Math.max(gather, release));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.2 * gather + 0.65 * release, Math.max(gather, release));
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.58 * gather - 1.1 * release, Math.max(gather, release));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.58 * gather + 1.1 * release, Math.max(gather, release));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.55 * gather + 0.15 * release, Math.max(gather, release));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.55 * gather + 0.15 * release, Math.max(gather, release));
        chestX += gather * 0.18 - release * 0.28;
        headX += gather * 0.28;
      } else if (this.castKind === 'ancient-one-extract') {
        // Controlled martial-arts Astral Extraction: pull right palm back (0..0.42), sharp palm thrust into chest (0.42..0.72), hold poised
        const wind = smoothstep(0.0, 0.34, p) * (1 - smoothstep(0.36, 0.52, p));
        const thrust = smoothstep(0.38, 0.56, p) * (1 - smoothstep(0.82, 1.0, p));
        const blend = Math.max(wind, thrust);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.68 * wind + 1.56 * thrust, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.38 * wind + 0.06 * thrust, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 1.38 * wind + 0.06 * thrust, blend);
        rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.45 * thrust, thrust);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.65 * wind + 0.38 * thrust, blend);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.28, blend);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.92, blend);
        chestY += -0.42 * wind + 0.34 * thrust;
        chestX -= thrust * 0.22 - wind * 0.06;
        headX += thrust * 0.14;
      } else if (this.castKind === 'vision-bolt') {
        // Crisp forward projection snap when releasing explosive Mind Bolt
        chestX -= env * 0.28;
        headX -= env * 0.14;
        uArmLX += env * 0.42;
        uArmRX += env * 0.42;
        uArmLZ -= env * 0.18;
        uArmRZ += env * 0.18;
      } else if (this.castKind === 'vision-bolt-small') {
        // Simple subtle torso & head forward lean when releasing small Mind Stone bolts
        const pulse = Math.sin(p * Math.PI);
        chestX -= pulse * 0.22;
        headX -= pulse * 0.24;
      } else if (this.castKind === 'invisible-disc-throw') {
        // Forcefield Barrier 0.7s throw: coil back (0..0.3), horizontal discus whip throw forward (0.3..0.68), poised follow-through
        const wind = smoothstep(0.0, 0.26, p) * (1 - smoothstep(0.26, 0.44, p));
        const whip = smoothstep(0.24, 0.52, p) * (1 - smoothstep(0.74, 1.0, p));
        const blend = Math.max(wind, whip);
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.45 * wind + 1.54 * whip, blend);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 1.05 * wind - 0.12 * whip, blend);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.92 * wind + 0.12 * whip, blend);
        rightHandRotZ = THREE.MathUtils.lerp(rightHandRotZ, -0.48 * whip, blend);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.58 * whip, whip);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.38 * whip, whip);
        chestY += -0.52 * wind + 0.62 * whip;
        chestX -= whip * 0.16 - wind * 0.06;
      } else if (this.castKind === 'vampire-stomp-dive') {
        // Rapid headfirst / fist-downward Ground Stomp plunge pose
        const dive = smoothstep(0.0, 0.2, p) * (1 - smoothstep(0.82, 1.0, p));
        pRotX = THREE.MathUtils.lerp(pRotX, -0.64, dive);
        chestX = THREE.MathUtils.lerp(chestX, -0.45, dive);
        headX = THREE.MathUtils.lerp(headX, 0.56, dive);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.25, dive);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.08, dive);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, dive);
        uArmLX = THREE.MathUtils.lerp(uArmLX, -0.45, dive);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.32, dive);
        uLegLX = THREE.MathUtils.lerp(uLegLX, 0.35, dive);
        lLegLX = THREE.MathUtils.lerp(lLegLX, -0.78, dive);
        uLegRX = THREE.MathUtils.lerp(uLegRX, -0.28, dive);
        lLegRX = THREE.MathUtils.lerp(lLegRX, -0.22, dive);
      } else if (this.castKind === 'cap-shield-throw') {
        const wind = smoothstep(0, 0.26, p) * (1 - smoothstep(0.26, 0.45, p));
        const whip = smoothstep(0.24, 0.6, p) * (1 - smoothstep(0.68, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.45 * wind + 1.42 * whip, Math.max(wind, whip));
        uArmLY = THREE.MathUtils.lerp(uArmLY, -1.05 * wind + 0.55 * whip, Math.max(wind, whip));
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -1.1 * wind - 0.12 * whip, Math.max(wind, whip));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.85 * wind + 0.14 * whip, Math.max(wind, whip));
        chestY += 0.48 * wind - 0.58 * whip;
      } else if (this.castKind === 'cap-shield-catch') {
        const catchT = smoothstep(0, 0.35, p) * (1 - smoothstep(0.45, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.24, catchT);
        uArmLY = THREE.MathUtils.lerp(uArmLY, -0.58, catchT);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.18, catchT);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.85, catchT);
        chestY += 0.24 * catchT;
      } else if (this.castKind === 'cap-combo-1') {
        // Strike 1: Left-hand shield horizontal sweep
        const swing = smoothstep(0.05, 0.48, p) * (1 - smoothstep(0.55, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.34, swing);
        uArmLY = THREE.MathUtils.lerp(uArmLY, -0.95 + p * 1.15, swing);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.25, swing);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.72, swing);
        chestY -= 0.44 * swing;
        chestX -= 0.16 * swing;
      } else if (this.castKind === 'cap-combo-2') {
        // Strike 2: Right-hand super-soldier punch
        const thrust = smoothstep(0.08, 0.42, p) * (1 - smoothstep(0.52, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.62, thrust);
        uArmRY = THREE.MathUtils.lerp(uArmRY, 0.24, thrust);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, thrust);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.52, thrust);
        chestY += 0.48 * thrust;
        chestX -= 0.18 * thrust;
      } else if (this.castKind === 'cap-combo-3') {
        // Strike 3: Heavy rising / diagonal shield smash
        const slam = smoothstep(0.08, 0.52, p) * (1 - smoothstep(0.62, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.88, slam);
        uArmLY = THREE.MathUtils.lerp(uArmLY, -0.42, slam);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.34, slam);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.58, slam);
        chestY -= 0.56 * slam;
        chestX -= 0.24 * slam;
      } else if (this.castKind === 'mjolnir-combo-1') {
        // Thor 1: Forehand horizontal Mjolnir sweep
        const swing = smoothstep(0.06, 0.48, p) * (1 - smoothstep(0.56, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.25, swing);
        uArmRY = THREE.MathUtils.lerp(uArmRY, 0.85 - p * 1.35, swing);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.35, swing);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.18, swing);
        chestY += 0.46 * swing;
      } else if (this.castKind === 'mjolnir-combo-2') {
        // Thor 2: Backhand diagonal upward hammer swing
        const swing = smoothstep(0.06, 0.5, p) * (1 - smoothstep(0.58, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.68, swing);
        uArmRY = THREE.MathUtils.lerp(uArmRY, -0.75 + p * 1.45, swing);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.22, swing);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, swing);
        chestY -= 0.48 * swing;
        chestX -= 0.14 * swing;
      } else if (this.castKind === 'mjolnir-combo-3') {
        // Thor 3: Overhead heavy Mjolnir thunder smash
        const rise = smoothstep(0, 0.32, p) * (1 - smoothstep(0.32, 0.5, p));
        const smash = smoothstep(0.28, 0.62, p) * (1 - smoothstep(0.68, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 2.75 * rise + 1.08 * smash, Math.max(rise, smash));
        uArmRY = THREE.MathUtils.lerp(uArmRY, 0.25 * smash, smash);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.18, Math.max(rise, smash));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, Math.max(rise, smash));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.9 * rise + 0.55 * smash, Math.max(rise, smash));
        chestX += 0.18 * rise - 0.36 * smash;
      } else if (this.castKind === 'thor-mjolnir-throw') {
        const wind = smoothstep(0, 0.24, p) * (1 - smoothstep(0.24, 0.42, p));
        const hurl = smoothstep(0.22, 0.56, p) * (1 - smoothstep(0.65, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, -0.55 * wind + 1.62 * hurl, Math.max(wind, hurl));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.65 * wind + 0.08 * hurl, Math.max(wind, hurl));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.65 * wind + 0.1 * hurl, Math.max(wind, hurl));
        chestY += -0.45 * wind + 0.56 * hurl;
        chestX -= 0.18 * hurl;
      } else if (this.castKind === 'thor-mjolnir-catch') {
        const catchT = smoothstep(0, 0.34, p) * (1 - smoothstep(0.42, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.44, catchT);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.22, catchT);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.42, catchT);
        chestY -= 0.2 * catchT;
      } else if (this.castKind === 'silver-sonic-blast') {
        // Draw back briefly then thrust BOTH hands straight forward unleashing the sonic wave
        const pull = smoothstep(0, 0.2, p) * (1 - smoothstep(0.2, 0.4, p));
        const thrust = smoothstep(0.18, 0.48, p) * (1 - smoothstep(0.68, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 0.45 * pull + 1.58 * thrust, Math.max(pull, thrust));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.45 * pull + 1.58 * thrust, Math.max(pull, thrust));
        uArmLY = THREE.MathUtils.lerp(uArmLY, 0.18 * thrust, thrust);
        uArmRY = THREE.MathUtils.lerp(uArmRY, -0.18 * thrust, thrust);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.18 * pull, Math.max(pull, thrust));
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.18 * pull, Math.max(pull, thrust));
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.9 * pull + 0.08 * thrust, Math.max(pull, thrust));
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.9 * pull + 0.08 * thrust, Math.max(pull, thrust));
        leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.65 * thrust, thrust);
        rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.65 * thrust, thrust);
        chestX -= thrust * 0.24 - pull * 0.1;
      } else if (this.castKind === 'silver-cosmic-blast') {
        const thrust = smoothstep(0.05, 0.45, p) * (1 - smoothstep(0.6, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.52, thrust);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.52, thrust);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.12, thrust);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, thrust);
        chestX -= thrust * 0.2;
      } else if (this.castKind === 'storm-lightning-cast') {
        const hurl = smoothstep(0.06, 0.45, p) * (1 - smoothstep(0.64, 1.0, p));
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.62, hurl);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.14, hurl);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.1, hurl);
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.24, hurl);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.28, hurl);
        chestY += 0.34 * hurl;
        chestX -= 0.18 * hurl;
      } else if (this.castKind === 'storm-ice-create') {
        // Specifically raise the LEFT hand skyward to conjure the sharp ice spear beside the right side
        const raise = smoothstep(0.0, 0.42, p) * (1 - smoothstep(0.84, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 2.55, raise);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.24, raise);
        lArmLX = THREE.MathUtils.lerp(lArmLX, 0.22, raise);
        leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.3, raise);
        // Right arm held poised slightly away from body beside the conjured spear
        uArmRX = THREE.MathUtils.lerp(uArmRX, 0.54, raise);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.62, raise);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.32, raise);
        chestY += -0.18 * raise;
        chestX += 0.08 * raise;
      } else if (this.castKind === 'storm-ice-launch') {
        // Sweep right hand forward launching the conjured ice spear toward aim
        const sweep = smoothstep(0.04, 0.46, p) * (1 - smoothstep(0.62, 1.0, p));
        uArmLX = THREE.MathUtils.lerp(uArmLX, 1.48, sweep);
        uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.32, sweep);
        uArmRX = THREE.MathUtils.lerp(uArmRX, 1.56, sweep);
        uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.12, sweep);
        lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, sweep);
        chestY += 0.38 * sweep;
        chestX -= 0.18 * sweep;
      }
    }

    // 8c. Pain Infliction Channeling Pose
    if (this.painChannelBlend > 0.01) {
      const pb = this.painChannelBlend;
      const tremor = Math.sin(this.idleTime * 14) * 0.03 * pb;
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.32 + tremor, pb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.16, pb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.24, pb);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.85 - tremor, pb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.32, pb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.42, pb);
      chestX = THREE.MathUtils.lerp(chestX, -0.06, pb);
    }

    // 8d. NPC Headache Reaction (clutching head & trembling in pain during Telepathic Wave)
    if (this.headacheBlend > 0.01) {
      const hb = this.headacheBlend;
      const shake = Math.sin(this.idleTime * 28) * 0.12 * hb;
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.62, hb);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.52, hb);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 1.75, hb);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.62, hb);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.52, hb);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 1.75, hb);
      headX = THREE.MathUtils.lerp(headX, -0.32, hb);
      headY += shake;
      headZ += Math.cos(this.idleTime * 23) * 0.09 * hb;
      chestX = THREE.MathUtils.lerp(chestX, -0.22, hb);
    }

    // 8e. Lifeless Slumped Target Pose during Ancient One's Astral Extraction
    if (this.astralLimpBlend > 0.01) {
      const al = this.astralLimpBlend;
      pPosY = THREE.MathUtils.lerp(pPosY, 0.78, al);
      pRotX = THREE.MathUtils.lerp(pRotX, 0.14, al);
      chestX = THREE.MathUtils.lerp(chestX, -0.36, al);
      headX = THREE.MathUtils.lerp(headX, -0.44, al);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.18, al);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.18, al);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.06, al);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.06, al);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.12, al);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.12, al);
      uLegLX = THREE.MathUtils.lerp(uLegLX, 0.24, al);
      lLegLX = THREE.MathUtils.lerp(lLegLX, -0.46, al);
      uLegRX = THREE.MathUtils.lerp(uLegRX, 0.16, al);
      lLegRX = THREE.MathUtils.lerp(lLegRX, -0.34, al);
    }

    // 8f. Agatha Drain Victim Pose (faces Agatha, leans forward, extends both arms forward)
    if (this.agathaDrainVictimBlend > 0.01) {
      const dv = this.agathaDrainVictimBlend;
      const strain = Math.sin(this.idleTime * 20) * 0.045 * dv;
      chestX = THREE.MathUtils.lerp(chestX, -0.36, dv);
      headX = THREE.MathUtils.lerp(headX, 0.18, dv);
      headY += strain * 0.6;
      uArmLX = THREE.MathUtils.lerp(uArmLX, 1.46 + strain, dv);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.46 - strain, dv);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, -0.18, dv);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.18, dv);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.14, dv);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.14, dv);
      leftHandRotX = THREE.MathUtils.lerp(leftHandRotX, -0.35, dv);
      rightHandRotX = THREE.MathUtils.lerp(rightHandRotX, -0.35, dv);
    }

    // 8f-2. Vampire Power Absorption Victim Pose (faces Vampire eye-to-eye while gripped by the neck)
    if (this.vampireVictimBlend > 0.01) {
      const vv = this.vampireVictimBlend;
      const strain = Math.sin(this.idleTime * 16) * 0.02 * vv;
      chestX = THREE.MathUtils.lerp(chestX, -0.04, vv);
      chestY = THREE.MathUtils.lerp(chestY, 0, vv);
      headX = THREE.MathUtils.lerp(headX, 0.03, vv);
      headY = THREE.MathUtils.lerp(headY, strain, vv);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.85, vv);
      uArmRX = THREE.MathUtils.lerp(uArmRX, 0.85, vv);
      uArmLZ = THREE.MathUtils.lerp(uArmLZ, 0.16, vv);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, -0.16, vv);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.95, vv);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.95, vv);
    }

    // 8g. Bandit steady pistol aiming pose (blends cleanly under npc-pistol-shoot recoil)
    if (this.npcPistolAimBlend > 0.01) {
      const ab = this.npcPistolAimBlend;
      uArmRX = THREE.MathUtils.lerp(uArmRX, 1.52, ab);
      uArmRZ = THREE.MathUtils.lerp(uArmRZ, 0.04, ab);
      lArmRX = THREE.MathUtils.lerp(lArmRX, 0.08, ab);
      uArmLX = THREE.MathUtils.lerp(uArmLX, 0.65, ab * 0.7);
      lArmLX = THREE.MathUtils.lerp(lArmLX, 0.85, ab * 0.7);
      chestY += 0.12 * ab;
    }

    // 9. Additive Directional Hit Reaction (NPC combat feedback)
    if (this.hitTimer > 0) {
      const t = this.hitTimer / this.hitDuration;
      const flinch = Math.sin(t * Math.PI) * t;
      chestX += this.hitLocalFwd * 0.48 * flinch;
      chestZ += -this.hitLocalRight * 0.42 * flinch;
      headX += -this.hitLocalFwd * 0.35 * flinch;
      headZ += this.hitLocalRight * 0.28 * flinch;
      uArmLX += 0.45 * flinch;
      uArmRX += 0.45 * flinch;
      uArmLZ -= 0.36 * flinch;
      uArmRZ += 0.36 * flinch;
    }

    // Apply all joint rotations & pivots
    rig.pelvis.position.set(pPosX, pPosY, 0);
    rig.pelvis.rotation.set(pRotX, pRotY, pRotZ);
    rig.waist.rotation.set(0, waistY, 0);
    rig.chest.rotation.set(chestX, chestY, chestZ);
    rig.head.rotation.set(headX, headY, headZ);

    rig.leftUpperLeg.rotation.set(uLegLX, 0, uLegLZ);
    rig.leftLowerLeg.rotation.set(lLegLX, 0, 0);
    rig.leftFoot.rotation.set(footLX, 0, 0);

    rig.rightUpperLeg.rotation.set(uLegRX, 0, uLegRZ);
    rig.rightLowerLeg.rotation.set(lLegRX, 0, 0);
    rig.rightFoot.rotation.set(footRX, 0, 0);

    rig.leftUpperArm.rotation.set(uArmLX, uArmLY, uArmLZ);
    rig.leftLowerArm.rotation.set(lArmLX, 0, 0);
    rig.leftHand.rotation.set(leftHandRotX, 0, leftHandRotZ);

    rig.rightUpperArm.rotation.set(uArmRX, uArmRY, uArmRZ);
    rig.rightLowerArm.rotation.set(lArmRX, 0, 0);
    rig.rightHand.rotation.set(rightHandRotX, 0, rightHandRotZ);

    // Billowing Cape & Doctor Strange Cloak of Levitation (strictly negative X = flows backward +Z, never forward)
    if (rig.capePivot) {
      const turnVel = THREE.MathUtils.clamp(state.turnVelocity ?? 0, -4.5, 4.5);
      const turnMag = Math.min(Math.abs(turnVel) * 0.08, 0.26);
      const isStrangeCloak = this.archetype === 'doctor-strange';
      const cloakExtra = isStrangeCloak ? this.cloakSurge + turnMag : turnMag * 0.5;
      const backwardWave =
        Math.sin(this.idleTime * (isStrangeCloak ? 3.8 : 2.8)) *
        (0.03 + 0.04 * this.flyBlend + 0.035 * moveActive);
      const fwdTrail = Math.max(0, this.smoothFwd);
      const baseBackFlow =
        (isStrangeCloak ? 0.18 : 0.15) +
        Math.min(this.smoothSpeed, 1.6) * (isStrangeCloak ? 0.26 : 0.2) +
        fwdTrail * 0.08 +
        this.flyBlend * (isStrangeCloak ? 0.34 : 0.26) +
        cloakExtra;

      const torsoPitch = pRotX + chestX;
      const rawCapeX =
        -(baseBackFlow + Math.max(0, torsoPitch) * 0.85) + backwardWave;
      const capePitch = Math.min(-0.14, rawCapeX, -0.15 - torsoPitch);
      const capeRoll = THREE.MathUtils.clamp(
        -this.smoothRight * (isStrangeCloak ? 0.2 : 0.13) -
          turnVel * 0.065 +
          Math.cos(this.idleTime * 2.1) * 0.03,
        -0.32,
        0.32,
      );
      const capeYaw = THREE.MathUtils.clamp(
        -turnVel * 0.055 - this.smoothRight * 0.08,
        -0.24,
        0.24,
      );
      rig.capePivot.rotation.set(capePitch, capeYaw, capeRoll);

      if (rig.capeLowerPivot) {
        const lowerTrailingX = Math.min(
          -0.06,
          -(
            0.07 +
            Math.min(this.smoothSpeed, 1.5) * 0.12 +
            this.flyBlend * 0.14 +
            Math.sin(this.idleTime * (isStrangeCloak ? 4.2 : 3.2) - 1.1) *
              (0.03 + 0.04 * moveActive + 0.04 * this.flyBlend)
          ),
        );
        const lowerRollLag = THREE.MathUtils.clamp(
          -turnVel * 0.045 -
            this.smoothRight * 0.07 +
            Math.sin(this.idleTime * 2.4 - 0.9) * 0.025,
          -0.22,
          0.22,
        );
        rig.capeLowerPivot.rotation.set(lowerTrailingX, 0, lowerRollLag);
      }
    }

    if (rig.hairBackPivot) {
      const turnVel = THREE.MathUtils.clamp(state.turnVelocity ?? 0, -4.5, 4.5);
      const headBackPitch = Math.max(0, pRotX + chestX + headX);
      const hairPitch = Math.min(
        -0.08,
        -(
          0.08 +
          this.smoothSpeed * 0.14 +
          this.flyBlend * 0.16 +
          headBackPitch * 0.8
        ) +
          Math.sin(this.idleTime * 2.5 - 0.6) * 0.03,
      );
      const hairRoll = THREE.MathUtils.clamp(
        -this.smoothRight * 0.08 -
          turnVel * 0.03 +
          Math.sin(this.idleTime * 1.9) * 0.025,
        -0.24,
        0.24,
      );
      rig.hairBackPivot.rotation.set(hairPitch, 0, hairRoll);
    }

    if (rig.zombieHairGroup) {
      const sway = Math.sin(this.idleTime * 2.8) * 0.045;
      const swayB = Math.cos(this.idleTime * 2.1) * 0.035;
      rig.zombieHairGroup.rotation.set(
        -0.06 - this.flyBlend * 0.14 + sway,
        0,
        swayB - this.smoothRight * 0.08,
      );
      const lift = 1 + this.flyBlend * 0.08 + Math.sin(this.idleTime * 3.4) * 0.025;
      rig.zombieHairGroup.scale.set(1, lift, 1);
    }

    if (rig.sashPivot) {
      const sashLift =
        0.08 +
        this.smoothSpeed * 0.26 +
        this.flyBlend * 0.32 +
        Math.sin(this.idleTime * 2.9) * (0.05 + 0.06 * moveActive + 0.06 * this.flyBlend);
      const sashSwing =
        0.12 +
        this.smoothSpeed * 0.16 +
        this.flyBlend * 0.18 +
        Math.cos(this.idleTime * 2.4) * 0.045;
      rig.sashPivot.rotation.set(sashLift, 0, -sashSwing);
    }

    if (this.spinningLeapActive) {
      rig.bodyPivot.rotation.set(
        -this.spinningLeapTime * 10.5,
        this.spinningLeapTime * 7.5,
        0,
      );
    } else if (this.spinDuration > 0) {
      const sp = THREE.MathUtils.clamp(this.spinElapsed / this.spinDuration, 0, 1);
      const eased = 1 - Math.pow(1 - sp, 2.4);
      rig.bodyPivot.rotation.set(0, eased * Math.PI * 2, 0);
    } else {
      rig.bodyPivot.rotation.set(0, 0, 0);
    }

    const sy = 1 + this.squashValue * (1 - this.flyBlend);
    const sxz = 1 / Math.sqrt(Math.max(0.75, sy));
    rig.bodyPivot.scale.set(sxz, sy, sxz);

    if (this.archetype === 'silver-surfer') {
      const targetBoard = isFlying ? 1 : 0;
      const rate = isFlying ? 7.5 : 10.5;
      this.surferBoardProgress = THREE.MathUtils.damp(
        this.surferBoardProgress,
        targetBoard,
        rate,
        safeDt,
      );
      const fwdEff = THREE.MathUtils.clamp(this.smoothFwd / 1.25, -1, 1);
      const rightEff = THREE.MathUtils.clamp(this.smoothRight / 1.15, -1, 1);
      rig.setSurferBoardProgress(
        this.surferBoardProgress,
        -0.28 * rightEff,
        fwdEff >= 0 ? -0.2 * fwdEff : 0.07 * -fwdEff,
      );
    } else if (this.surferBoardProgress > 0) {
      this.surferBoardProgress = 0;
      rig.setSurferBoardProgress(0, 0, 0);
    }
  }
}
