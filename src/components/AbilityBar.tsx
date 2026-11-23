import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AGATHA_DARKHOLD_DURATION_MS,
  AGATHA_DARKHOLD_SUB_ABILITIES,
  AGATHA_SHIELD_DURATION_MS,
  AUTO_SHIELD_DURATION_MS,
  AbilityDefinition,
  AbilityId,
  CAP_SHIELD_CHARGE_DURATION_MS,
  DARKHOLD_DURATION_MS,
  DARKHOLD_SUB_ABILITIES,
  EMMA_ASTRAL_MAX_DURATION_MS,
  EMMA_DIAMOND_DURATION_MS,
  EMMA_MC_MENTAL_DMG_MS,
  EMMA_MIND_CONTROL_OPTIONS,
  FORCEFIELD_EFFECT_OPTIONS,
  FORCEFIELD_SHIELD_DURATION_MS,
  FORCEFIELD_TRANSFER_ABILITY,
  FORCEFIELD_TRANSFER_COOLDOWN_MS,
  HELA_SWORD_SUMMON_DURATION_MS,
  INVISIBILITY_MAX_DURATION_MS,
  MAGNETO_TORNADO_DURATION_MS,
  QUICKSILVER_COMBO_DURATION_MS,
  QUICKSILVER_TORNADO_MAX_DURATION_MS,
  SCARLET_WITCH_ABILITIES,
  SILVER_DUAL_BEAM_DURATION_MS,
  SPEED_BLITZ_DURATION_MS,
  STORM_TORNADO_DURATION_MS,
  STORM_WIND_BLAST_DURATION_MS,
  STRANGE_SHIELD_MAX_DURATION_MS,
  THOR_LIGHTNING_STORM_BEAM_MS,
  THOR_LIGHTNING_STORM_CHANNEL_MS,
  VAMPIRE_ABSORB_DURATION_MS,
  VISION_HEAD_GRIP_DURATION_MS,
  VISION_LASER_DURATION_MS,
} from '../game/abilityConfig';
import { AbilityIcon } from './AbilityIcon';

interface CooldownState {
  startMs: number;
  durationMs: number;
}

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.36) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(142, 145, 218, 0.36) 1.45px, transparent 1.55px)';

const DARKHOLD_DOT_PATTERN =
  'radial-gradient(circle, rgba(255, 118, 142, 0.32) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(255, 118, 142, 0.32) 1.45px, transparent 1.55px)';

const AGATHA_DARKHOLD_DOT_PATTERN =
  'radial-gradient(circle, rgba(192, 132, 252, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(192, 132, 252, 0.34) 1.45px, transparent 1.55px)';

export type AbilitySoundKind =
  | 'flight-on'
  | 'flight-off'
  | 'chaos-bolt'
  | 'darkhold-open'
  | 'darkhold-close'
  | 'teleport-start'
  | 'telekinetic-explosion'
  | 'auto-shield'
  | 'chaos-implosion'
  | 'phoenix-fireball'
  | 'pain-start'
  | 'pain-cancel'
  | 'phoenix-flight-on'
  | 'phoenix-flight-off'
  | 'mind-control-link'
  | 'mind-control-select'
  | 'mental-attack'
  | 'diamond-on'
  | 'diamond-off'
  | 'telepathic-wave'
  | 'sword-summon'
  | 'green-explosion'
  | 'spinning-leap'
  | 'ground-sword'
  | 'magneto-tornado'
  | 'quicksilver-speed-on'
  | 'quicksilver-speed-off'
  | 'quicksilver-tornado-on'
  | 'quicksilver-tornado-off'
  | 'strange-shield-on'
  | 'strange-shield-off'
  | 'eldritch-discs'
  | 'astral-extraction'
  | 'vision-laser'
  | 'vision-head-grip'
  | 'astral-on'
  | 'astral-off'
  | 'chaos-drain-start'
  | 'chaos-drain-bolt'
  | 'zombie-beam'
  | 'zombie-stone'
  | 'agatha-bolt'
  | 'agatha-drain'
  | 'agatha-shield'
  | 'purgatory-grasp'
  | 'invisibility-on'
  | 'invisibility-off'
  | 'forcefield-shield-on'
  | 'forcefield-shield-off'
  | 'forcefield-transfer'
  | 'forcefield-protection'
  | 'forcefield-suffocation'
  | 'forcefield-barrier'
  | 'vampire-bolt'
  | 'vampire-absorb-start'
  | 'bandit-gun'
  | 'prisoner-punch'
  | 'cap-defense-on'
  | 'cap-defense-off'
  | 'cosmic-flight-on'
  | 'cosmic-flight-off'
  | 'silver-absorb-on'
  | 'silver-absorb-off'
  | 'storm-flight-on'
  | 'storm-flight-off'
  | 'storm-tornado-on'
  | 'storm-tornado-off'
  | 'ice-spear-create'
  | 'wind-blast-on'
  | 'wind-blast-off';

export interface StolenAbilitySlotState {
  def: AbilityDefinition;
  startedAtMs: number;
  durationMs: number;
}

export interface AbilityBarHandle {
  startCooldown: (id: AbilityId, durationMs?: number) => void;
  startForcefieldTransferCooldown: () => void;
  endFlightWithCooldown: () => void;
  syncFlightState: (active: boolean) => void;
}

export interface AbilityBarProps {
  abilities?: ReadonlyArray<AbilityDefinition>;
  locked?: boolean;
  painChanneling?: boolean;
  darkholdActive?: boolean;
  autoShieldActive?: boolean;
  mindControlPhase?: 'idle' | 'choosing' | 'paralysis' | 'sleep' | 'mental-damage';
  astralActive?: boolean;
  diamondActive?: boolean;
  telepathicWaveActive?: boolean;
  swordSummonActive?: boolean;
  magnetoTornadoActive?: boolean;
  superSpeedActive?: boolean;
  rapidPunchActive?: boolean;
  speedBlitzActive?: boolean;
  windTornadoActive?: boolean;
  strangeShieldActive?: boolean;
  visionLaserActive?: boolean;
  visionHeadGripActive?: boolean;
  supremeDrainActive?: boolean;
  supremeStacks?: number;
  zombieBeamActive?: boolean;
  zombieStoneActive?: boolean;
  agathaDarkholdActive?: boolean;
  agathaAutoShieldActive?: boolean;
  agathaShieldActive?: boolean;
  invisibilityActive?: boolean;
  forcefieldShieldActive?: boolean;
  forcefieldTransferPhase?: 'idle' | 'choosing' | 'protection' | 'suffocation';
  vampireAbsorbing?: boolean;
  capShieldDefenseActive?: boolean;
  capShieldChargeActive?: boolean;
  thorSlamActive?: boolean;
  thorStormBeamPhase?: 'idle' | 'channel' | 'beam';
  damageAbsorptionActive?: boolean;
  silverEnergyReady?: boolean;
  dualCosmicBeamActive?: boolean;
  stormTornadoActive?: boolean;
  stormIceSpearActive?: boolean;
  windBlastActive?: boolean;
  stolenAbility?: StolenAbilitySlotState | null;
  lockedAbilityIds?: ReadonlyArray<AbilityId>;
  flightCancelVisible?: boolean;
  onFlightToggle?: (active: boolean) => boolean;
  onFlightStateChange?: (active: boolean) => void;
  onCastChaosBolt?: () => boolean;
  onToggleDarkhold?: () => boolean;
  onCastTeleport?: () => boolean;
  onCastTelekineticExplosion?: () => boolean;
  onCastAutoShield?: () => boolean;
  onCastChaosImplosion?: () => boolean;
  onStartSupremeDrainHold?: () => boolean;
  onStopSupremeDrainHold?: () => void;
  onFireSupremeStackBolt?: () => boolean;
  onCastZombieBeam?: () => boolean;
  onCastZombieStoneExplosion?: () => boolean;
  onCastAgathaBolt?: () => boolean;
  onToggleAgathaDarkhold?: () => boolean;
  onCastAgathaTeleport?: () => boolean;
  onCastAgathaDarkholdBlast?: () => boolean;
  onCastAgathaAutoShield?: () => boolean;
  onActivateAgathaShield?: () => boolean;
  onCastPurgatoryGrasp?: () => boolean;
  onCastPhoenixWave?: () => boolean;
  onCastPhoenixFireball?: () => boolean;
  onTogglePainInfliction?: () => boolean;
  onActivateMindControl?: () => boolean;
  onSelectMindControlOption?: (option: 'mc-paralysis' | 'mc-sleep' | 'mc-mental-damage') => void;
  onCastMentalAttack?: () => boolean;
  onToggleAstral?: () => boolean;
  onToggleDiamond?: () => boolean;
  onCastTelepathicWave?: () => boolean;
  onActivateSwordSummon?: () => boolean;
  onCastGreenExplosion?: () => boolean;
  onCastSpinningLeap?: () => boolean;
  onCastGroundSword?: () => boolean;
  onCastMetalProjectile?: () => boolean;
  onCastMagneticMeteor?: () => boolean;
  onToggleMetalTornado?: () => boolean;
  onToggleSuperSpeed?: () => boolean;
  onCastRapidPunchCombo?: () => boolean;
  onCastSpeedBlitz?: () => boolean;
  onToggleWindTornado?: () => boolean;
  onCastTimeStop?: () => boolean;
  onToggleMysticShield?: () => boolean;
  onCastMysticClones?: () => boolean;
  onCastEldritchDiscs?: () => boolean;
  onCastAstralExtraction?: () => boolean;
  onCastMindStoneLaser?: () => boolean;
  onCastMindStoneProjectile?: () => boolean;
  onCastHeadGrip?: () => boolean;
  onToggleInvisibility?: () => boolean;
  onToggleForcefieldShield?: () => boolean;
  onTransferForcefieldShield?: () => boolean;
  onSelectForcefieldOption?: (option: 'protection' | 'suffocation') => void;
  onCastForcefieldBarrier?: () => boolean;
  onCastVampireBolt?: () => boolean;
  onCastPowerAbsorption?: () => boolean;
  onCastBanditGun?: () => boolean;
  onCastPrisonerPunch?: () => boolean;
  onCastCapShieldThrow?: () => boolean;
  onToggleCapShieldDefense?: () => boolean;
  onCastCapShieldCombo?: () => boolean;
  onCastCapShieldCharge?: () => boolean;
  onCastThorMjolnirCombo?: () => boolean;
  onCastThorMjolnirThrow?: () => boolean;
  onCastThorLightningSlam?: () => boolean;
  onCastThorLightningStormBeam?: () => boolean;
  onToggleDamageAbsorption?: () => boolean;
  onCastCosmicBlast?: () => boolean;
  onCastDualCosmicBeam?: () => boolean;
  onToggleStormTornado?: () => boolean;
  onCastIceSpear?: () => boolean;
  onToggleWindBlast?: () => boolean;
  onAbilitySound?: (kind: AbilitySoundKind) => void;
}

function isFlightAbility(id: AbilityId): boolean {
  return (
    id === 'flight' ||
    id === 'phoenix-flight' ||
    id === 'magneto-flight' ||
    id === 'cloak-flight' ||
    id === 'vision-flight' ||
    id === 'agatha-flight' ||
    id === 'invisible-flight' ||
    id === 'vampire-flight' ||
    id === 'cosmic-flight' ||
    id === 'storm-flight'
  );
}

function isChargedAbility(def: AbilityDefinition): boolean {
  return (
    def.id !== 'chaos-drain' &&
    def.maxCharges !== undefined &&
    def.maxCharges > 0
  );
}

function isDarkholdSubAbility(id: AbilityId): boolean {
  return (
    id === 'teleport' || id === 'telekinetic-explosion' || id === 'auto-shield'
  );
}

function isAgathaDarkholdSubAbility(id: AbilityId): boolean {
  return (
    id === 'agatha-teleport' ||
    id === 'agatha-darkhold-blast' ||
    id === 'agatha-auto-shield'
  );
}

export const AbilityBar = memo(
  forwardRef<AbilityBarHandle, AbilityBarProps>(
    function AbilityBar(
    {
      abilities = SCARLET_WITCH_ABILITIES,
      locked = false,
      painChanneling = false,
      darkholdActive = false,
      autoShieldActive = false,
      mindControlPhase = 'idle',
      astralActive = false,
      diamondActive = false,
      telepathicWaveActive = false,
      swordSummonActive = false,
      magnetoTornadoActive = false,
      superSpeedActive = false,
      rapidPunchActive = false,
      speedBlitzActive = false,
      windTornadoActive = false,
      strangeShieldActive = false,
      visionLaserActive = false,
      visionHeadGripActive = false,
      supremeDrainActive = false,
      supremeStacks = 0,
      zombieBeamActive = false,
      zombieStoneActive = false,
      agathaDarkholdActive = false,
      agathaAutoShieldActive = false,
      agathaShieldActive = false,
      invisibilityActive = false,
      forcefieldShieldActive = false,
      forcefieldTransferPhase = 'idle',
      vampireAbsorbing = false,
      capShieldDefenseActive = false,
      capShieldChargeActive = false,
      thorSlamActive = false,
      thorStormBeamPhase = 'idle',
      damageAbsorptionActive = false,
      silverEnergyReady = false,
      dualCosmicBeamActive = false,
      stormTornadoActive = false,
      stormIceSpearActive = false,
      windBlastActive = false,
      stolenAbility = null,
      lockedAbilityIds,
      flightCancelVisible = false,
      onFlightToggle,
      onFlightStateChange,
      onCastChaosBolt,
      onToggleDarkhold,
      onCastTeleport,
      onCastTelekineticExplosion,
      onCastAutoShield,
      onCastChaosImplosion,
      onStartSupremeDrainHold,
      onStopSupremeDrainHold,
      onFireSupremeStackBolt,
      onCastZombieBeam,
      onCastZombieStoneExplosion,
      onCastAgathaBolt,
      onToggleAgathaDarkhold,
      onCastAgathaTeleport,
      onCastAgathaDarkholdBlast,
      onCastAgathaAutoShield,
      onActivateAgathaShield,
      onCastPurgatoryGrasp,
      onCastPhoenixWave,
      onCastPhoenixFireball,
      onTogglePainInfliction,
      onActivateMindControl,
      onSelectMindControlOption,
      onCastMentalAttack,
      onToggleAstral,
      onToggleDiamond,
      onCastTelepathicWave,
      onActivateSwordSummon,
      onCastGreenExplosion,
      onCastSpinningLeap,
      onCastGroundSword,
      onCastMetalProjectile,
      onCastMagneticMeteor,
      onToggleMetalTornado,
      onToggleSuperSpeed,
      onCastRapidPunchCombo,
      onCastSpeedBlitz,
      onToggleWindTornado,
      onCastTimeStop,
      onToggleMysticShield,
      onCastMysticClones,
      onCastEldritchDiscs,
      onCastAstralExtraction,
      onCastMindStoneLaser,
      onCastMindStoneProjectile,
      onCastHeadGrip,
      onToggleInvisibility,
      onToggleForcefieldShield,
      onTransferForcefieldShield,
      onSelectForcefieldOption,
      onCastForcefieldBarrier,
      onCastVampireBolt,
      onCastPowerAbsorption,
      onCastBanditGun,
      onCastPrisonerPunch,
      onCastCapShieldThrow,
      onToggleCapShieldDefense,
      onCastCapShieldCombo,
      onCastCapShieldCharge,
      onCastThorMjolnirCombo,
      onCastThorMjolnirThrow,
      onCastThorLightningSlam,
      onCastThorLightningStormBeam,
      onToggleDamageAbsorption,
      onCastCosmicBlast,
      onCastDualCosmicBeam,
      onToggleStormTornado,
      onCastIceSpear,
      onToggleWindBlast,
      onAbilitySound,
    },
    ref,
  ) {
    const [flightOn, setFlightOn] = useState(false);
    const flightOnRef = useRef(false);
    flightOnRef.current = flightOn;

    const effectiveAbilities = useMemo(() => {
      if (!stolenAbility) return abilities;
      if (!abilities.some((a) => a.id === 'stolen-ability')) return abilities;
      return abilities.map((a) =>
        a.id === 'stolen-ability' ? stolenAbility.def : a,
      );
    }, [abilities, stolenAbility]);

    const hasDarkholdMain = effectiveAbilities.some((a) => a.id === 'darkhold');
    const showDarkholdSubBar = hasDarkholdMain && darkholdActive;
    const hasAgathaDarkholdMain = effectiveAbilities.some((a) => a.id === 'agatha-darkhold');
    const showAgathaDarkholdSubBar = hasAgathaDarkholdMain && agathaDarkholdActive;
    const isSpeedMode = effectiveAbilities.some((a) => a.id === 'speed-blitz');
    const quicksilverVariant: 'blue' | 'green' = isSpeedMode ? 'green' : 'blue';

    const chargeDef = effectiveAbilities.find(isChargedAbility);
    const chargeAbilityId: AbilityId | null = chargeDef?.id ?? null;
    const maxCharges = chargeDef?.maxCharges ?? 0;
    const chargeRechargeMs = chargeDef?.cooldownMs ?? 1500;
    const chargeCastIntervalMs = chargeDef?.stepCooldownMs ?? 280;

    const [charges, setCharges] = useState(maxCharges);
    const chargesRef = useRef(maxCharges);
    chargesRef.current = charges;

    const rechargeQueueRef = useRef<Array<{ startMs: number; endMs: number }>>([]);
    const [isRecharging, setIsRecharging] = useState(false);
    const castUnlockAtRef = useRef(0);

    // Active duration bar refs
    const painStartMsRef = useRef<number>(0);
    const painBarRef = useRef<HTMLDivElement | null>(null);
    const darkholdStartMsRef = useRef<number>(0);
    const darkholdBarRef = useRef<HTMLDivElement | null>(null);
    const shieldStartMsRef = useRef<number>(0);
    const shieldBarRef = useRef<HTMLDivElement | null>(null);
    const mindControlStartMsRef = useRef<number>(0);
    const mindControlBarRef = useRef<HTMLDivElement | null>(null);
    const astralStartMsRef = useRef<number>(0);
    const astralBarRef = useRef<HTMLDivElement | null>(null);
    const diamondStartMsRef = useRef<number>(0);
    const diamondBarRef = useRef<HTMLDivElement | null>(null);
    const telepathicStartMsRef = useRef<number>(0);
    const telepathicBarRef = useRef<HTMLDivElement | null>(null);
    const swordSummonStartMsRef = useRef<number>(0);
    const swordSummonBarRef = useRef<HTMLDivElement | null>(null);
    const magnetoTornadoStartMsRef = useRef<number>(0);
    const magnetoTornadoBarRef = useRef<HTMLDivElement | null>(null);
    const rapidPunchStartMsRef = useRef<number>(0);
    const rapidPunchBarRef = useRef<HTMLDivElement | null>(null);
    const speedBlitzStartMsRef = useRef<number>(0);
    const speedBlitzBarRef = useRef<HTMLDivElement | null>(null);
    const windTornadoStartMsRef = useRef<number>(0);
    const windTornadoBarRef = useRef<HTMLDivElement | null>(null);
    const strangeShieldStartMsRef = useRef<number>(0);
    const strangeShieldBarRef = useRef<HTMLDivElement | null>(null);
    const visionLaserStartMsRef = useRef<number>(0);
    const visionLaserBarRef = useRef<HTMLDivElement | null>(null);
    const visionHeadGripStartMsRef = useRef<number>(0);
    const visionHeadGripBarRef = useRef<HTMLDivElement | null>(null);
    const zombieBeamStartMsRef = useRef<number>(0);
    const zombieBeamBarRef = useRef<HTMLDivElement | null>(null);
    const agathaDarkholdStartMsRef = useRef<number>(0);
    const agathaDarkholdBarRef = useRef<HTMLDivElement | null>(null);
    const agathaAutoShieldStartMsRef = useRef<number>(0);
    const agathaAutoShieldBarRef = useRef<HTMLDivElement | null>(null);
    const agathaShieldStartMsRef = useRef<number>(0);
    const agathaShieldBarRef = useRef<HTMLDivElement | null>(null);
    const invisStartMsRef = useRef<number>(0);
    const invisBarRef = useRef<HTMLDivElement | null>(null);
    const forcefieldShieldStartMsRef = useRef<number>(0);
    const forcefieldShieldBarRef = useRef<HTMLDivElement | null>(null);
    const vampireAbsorbStartMsRef = useRef<number>(0);
    const vampireAbsorbBarRef = useRef<HTMLDivElement | null>(null);
    const capShieldChargeStartMsRef = useRef<number>(0);
    const capShieldChargeBarRef = useRef<HTMLDivElement | null>(null);
    const thorStormStartMsRef = useRef<number>(0);
    const thorStormBarRef = useRef<HTMLDivElement | null>(null);
    const stormTornadoStartMsRef = useRef<number>(0);
    const stormTornadoBarRef = useRef<HTMLDivElement | null>(null);
    const dualCosmicBeamStartMsRef = useRef<number>(0);
    const dualCosmicBeamBarRef = useRef<HTMLDivElement | null>(null);
    const windBlastStartMsRef = useRef<number>(0);
    const windBlastBarRef = useRef<HTMLDivElement | null>(null);
    const stolenTimerBarRef = useRef<HTMLDivElement | null>(null);
    const prevStolenIdRef = useRef<AbilityId | null>(null);

    const [chargeAnimKey, setChargeAnimKey] = useState(0);
    const [triggerPulseId, setTriggerPulseId] = useState<AbilityId | null>(null);

    const [cooldowns, setCooldowns] = useState<Partial<Record<AbilityId, CooldownState>>>({});
    const cooldownsRef = useRef<Partial<Record<AbilityId, CooldownState>>>({});
    cooldownsRef.current = cooldowns;

    const [transferCd, setTransferCd] = useState<CooldownState | null>(null);
    const transferCdRef = useRef<CooldownState | null>(null);
    transferCdRef.current = transferCd;
    const transferVeilRef = useRef<HTMLDivElement | null>(null);

    const veilRefs = useRef<Partial<Record<AbilityId, HTMLDivElement | null>>>({});
    const finishedCdIdsRef = useRef<AbilityId[]>([]);
    const chargeBarRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number>(0);
    const pulseTimerRef = useRef<number>(0);
    const visionBoltCadenceRef = useRef<number>(0);
    const drainHoldRef = useRef<{
      downMs: number;
      startedDrain: boolean;
      timerId: number;
      pointerId: number | null;
    }>({
      downMs: 0,
      startedDrain: false,
      timerId: 0,
      pointerId: null,
    });

    // Sync charge pool & reset flight/cooldown state whenever character ability preset changes
    useEffect(() => {
      const def = abilities.find(isChargedAbility);
      const nextMax = def?.maxCharges ?? 0;
      chargesRef.current = nextMax;
      setCharges(nextMax);
      rechargeQueueRef.current = [];
      setIsRecharging(false);
      castUnlockAtRef.current = 0;
      visionBoltCadenceRef.current = 0;
      flightOnRef.current = false;
      setFlightOn(false);
      cooldownsRef.current = {};
      setCooldowns({});
      transferCdRef.current = null;
      setTransferCd(null);
      prevStolenIdRef.current = null;
      onFlightStateChange?.(false);
    }, [abilities, onFlightStateChange]);

    // Targeted Slot 4 stolen-ability transition cleanup without resetting Vampire's own cooldowns/flight
    useEffect(() => {
      const nextId = stolenAbility?.def.id ?? null;
      const prevId = prevStolenIdRef.current;
      if (prevId === nextId) return;
      prevStolenIdRef.current = nextId;

      if (prevId) {
        const nextCd = { ...cooldownsRef.current };
        if (nextCd[prevId] !== undefined) {
          delete nextCd[prevId];
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
        }
        if (prevId === 'chaos-bolt' || prevId === 'phoenix-fireballs') {
          rechargeQueueRef.current = [];
          setIsRecharging(false);
          chargesRef.current = 0;
          setCharges(0);
        }
      }

      if (nextId && stolenAbility && isChargedAbility(stolenAbility.def)) {
        const nextMax = stolenAbility.def.maxCharges ?? 0;
        rechargeQueueRef.current = [];
        setIsRecharging(false);
        castUnlockAtRef.current = 0;
        chargesRef.current = nextMax;
        setCharges(nextMax);
      }
    }, [stolenAbility]);

    useEffect(() => {
      if (painChanneling) {
        painStartMsRef.current = performance.now();
      }
    }, [painChanneling]);

    useEffect(() => {
      if (darkholdActive) {
        darkholdStartMsRef.current = performance.now();
      }
    }, [darkholdActive]);

    useEffect(() => {
      if (autoShieldActive) {
        shieldStartMsRef.current = performance.now();
      }
    }, [autoShieldActive]);

    useEffect(() => {
      if (mindControlPhase === 'mental-damage') {
        mindControlStartMsRef.current = performance.now();
      }
    }, [mindControlPhase]);

    useEffect(() => {
      if (diamondActive) {
        diamondStartMsRef.current = performance.now();
      }
    }, [diamondActive]);

    useEffect(() => {
      if (telepathicWaveActive) {
        telepathicStartMsRef.current = performance.now();
      }
    }, [telepathicWaveActive]);

    useEffect(() => {
      if (astralActive) {
        astralStartMsRef.current = performance.now();
      }
    }, [astralActive]);

    useEffect(() => {
      if (swordSummonActive) {
        swordSummonStartMsRef.current = performance.now();
      }
    }, [swordSummonActive]);

    useEffect(() => {
      if (magnetoTornadoActive) {
        magnetoTornadoStartMsRef.current = performance.now();
      }
    }, [magnetoTornadoActive]);

    useEffect(() => {
      if (rapidPunchActive) {
        rapidPunchStartMsRef.current = performance.now();
      }
    }, [rapidPunchActive]);

    useEffect(() => {
      if (speedBlitzActive) {
        speedBlitzStartMsRef.current = performance.now();
      }
    }, [speedBlitzActive]);

    useEffect(() => {
      if (windTornadoActive) {
        windTornadoStartMsRef.current = performance.now();
      }
    }, [windTornadoActive]);

    useEffect(() => {
      if (strangeShieldActive) {
        strangeShieldStartMsRef.current = performance.now();
      }
    }, [strangeShieldActive]);

    useEffect(() => {
      if (visionLaserActive) {
        visionLaserStartMsRef.current = performance.now();
      }
    }, [visionLaserActive]);

    useEffect(() => {
      if (visionHeadGripActive) {
        visionHeadGripStartMsRef.current = performance.now();
      }
    }, [visionHeadGripActive]);

    useEffect(() => {
      if (zombieBeamActive) {
        zombieBeamStartMsRef.current = performance.now();
      }
    }, [zombieBeamActive]);

    useEffect(() => {
      if (agathaDarkholdActive) {
        agathaDarkholdStartMsRef.current = performance.now();
      }
    }, [agathaDarkholdActive]);

    useEffect(() => {
      if (agathaAutoShieldActive) {
        agathaAutoShieldStartMsRef.current = performance.now();
      }
    }, [agathaAutoShieldActive]);

    useEffect(() => {
      if (agathaShieldActive) {
        agathaShieldStartMsRef.current = performance.now();
      }
    }, [agathaShieldActive]);

    useEffect(() => {
      if (invisibilityActive) {
        invisStartMsRef.current = performance.now();
      }
    }, [invisibilityActive]);

    useEffect(() => {
      if (forcefieldShieldActive) {
        forcefieldShieldStartMsRef.current = performance.now();
      }
    }, [forcefieldShieldActive]);

    useEffect(() => {
      if (vampireAbsorbing) {
        vampireAbsorbStartMsRef.current = performance.now();
      }
    }, [vampireAbsorbing]);

    useEffect(() => {
      if (capShieldChargeActive) {
        capShieldChargeStartMsRef.current = performance.now();
      }
    }, [capShieldChargeActive]);

    useEffect(() => {
      if (thorStormBeamPhase === 'channel') {
        thorStormStartMsRef.current = performance.now();
      }
    }, [thorStormBeamPhase]);

    useEffect(() => {
      if (stormTornadoActive) {
        stormTornadoStartMsRef.current = performance.now();
      }
    }, [stormTornadoActive]);

    useEffect(() => {
      if (dualCosmicBeamActive) {
        dualCosmicBeamStartMsRef.current = performance.now();
      }
    }, [dualCosmicBeamActive]);

    useEffect(() => {
      if (windBlastActive) {
        windBlastStartMsRef.current = performance.now();
      }
    }, [windBlastActive]);

    useImperativeHandle(
      ref,
      () => ({
        startCooldown: (id: AbilityId, durationMs?: number) => {
          const def =
            effectiveAbilities.find((a) => a.id === id) ??
            DARKHOLD_SUB_ABILITIES.find((a) => a.id === id) ??
            AGATHA_DARKHOLD_SUB_ABILITIES.find((a) => a.id === id);
          const resolvedDuration = durationMs ?? def?.cooldownMs ?? 0;
          if (!def || resolvedDuration <= 0) return;
          const now = performance.now();
          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            [id]: {
              startMs: now,
              durationMs: resolvedDuration,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
        },
        startForcefieldTransferCooldown: () => {
          const next = {
            startMs: performance.now(),
            durationMs: FORCEFIELD_TRANSFER_COOLDOWN_MS,
          };
          transferCdRef.current = next;
          setTransferCd(next);
        },
        endFlightWithCooldown: () => {
          const def = effectiveAbilities.find((a) => isFlightAbility(a.id));
          flightOnRef.current = false;
          setFlightOn(false);
          onFlightStateChange?.(false);
          if (!def || def.cooldownMs <= 0) return;
          const now = performance.now();
          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            [def.id]: {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
        },
        syncFlightState: (active: boolean) => {
          flightOnRef.current = active;
          setFlightOn(active);
        },
      }),
      [effectiveAbilities, onFlightStateChange],
    );

    useEffect(() => {
      const hasStandardCd = (Object.keys(cooldowns) as AbilityId[]).some(
        (id) => cooldowns[id] !== undefined,
      );
      if (
        !hasStandardCd &&
        transferCd === null &&
        !isRecharging &&
        !painChanneling &&
        !darkholdActive &&
        !autoShieldActive &&
        mindControlPhase !== 'mental-damage' &&
        !astralActive &&
        !diamondActive &&
        !telepathicWaveActive &&
        !swordSummonActive &&
        !magnetoTornadoActive &&
        !rapidPunchActive &&
        !speedBlitzActive &&
        !windTornadoActive &&
        !strangeShieldActive &&
        !visionLaserActive &&
        !visionHeadGripActive &&
        !zombieBeamActive &&
        !agathaDarkholdActive &&
        !agathaAutoShieldActive &&
        !agathaShieldActive &&
        !invisibilityActive &&
        !forcefieldShieldActive &&
        !vampireAbsorbing &&
        !capShieldChargeActive &&
        thorStormBeamPhase === 'idle' &&
        !stormTornadoActive &&
        !dualCosmicBeamActive &&
        !windBlastActive &&
        !stolenAbility
      ) {
        cancelAnimationFrame(rafRef.current);
        return;
      }

      const tick = () => {
        const now = performance.now();
        let anyRemaining = false;

        // 1. Standard single-cooldown abilities (main + Darkhold sub-abilities)
        const current = cooldownsRef.current;
        const finished = finishedCdIdsRef.current;
        finished.length = 0;
        for (const rawId in current) {
          const id = rawId as AbilityId;
          const cd = current[id];
          if (!cd) continue;

          const elapsed = now - cd.startMs;
          const progress = Math.min(Math.max(elapsed / cd.durationMs, 0), 1);
          const remaining = 1 - progress;
          const veilEl = veilRefs.current[id];
          if (veilEl) {
            veilEl.style.transform = `scaleY(${remaining})`;
          }

          if (elapsed >= cd.durationMs) {
            finished.push(id);
          } else {
            anyRemaining = true;
          }
        }

        if (finished.length > 0) {
          const nextCooldowns = { ...current };
          for (let i = 0; i < finished.length; i++) {
            delete nextCooldowns[finished[i]];
          }
          cooldownsRef.current = nextCooldowns;
          setCooldowns(nextCooldowns);
        }

        const tCd = transferCdRef.current;
        if (tCd) {
          const elapsed = now - tCd.startMs;
          const progress = Math.min(Math.max(elapsed / tCd.durationMs, 0), 1);
          if (transferVeilRef.current) {
            transferVeilRef.current.style.transform = `scaleY(${1 - progress})`;
          }
          if (elapsed >= tCd.durationMs) {
            transferCdRef.current = null;
            setTransferCd(null);
          } else {
            anyRemaining = true;
          }
        }

        // 2. Multi-charge sequential recharge (Chaos Bolt 3 / Phoenix Fireballs 5)
        const queue = rechargeQueueRef.current;
        if (queue.length > 0 && chargeAbilityId) {
          let restored = 0;
          while (queue.length > 0 && now >= queue[0].endMs) {
            queue.shift();
            restored++;
          }
          if (restored > 0) {
            const nextCharges = Math.min(maxCharges, chargesRef.current + restored);
            chargesRef.current = nextCharges;
            setCharges(nextCharges);
            setChargeAnimKey((k) => k + 1);
          }

          if (queue.length > 0) {
            anyRemaining = true;
            const active = queue[0];
            const dur = Math.max(1, active.endMs - active.startMs);
            const progress = Math.min(Math.max((now - active.startMs) / dur, 0), 1);

            const chargeVeil = veilRefs.current[chargeAbilityId];
            if (chargeVeil) {
              chargeVeil.style.transform =
                chargesRef.current === 0 ? `scaleY(${1 - progress})` : 'scaleY(0)';
            }
            if (chargeBarRef.current) {
              chargeBarRef.current.style.transform = `scaleX(${progress})`;
            }
          } else {
            if (chargeBarRef.current) {
              chargeBarRef.current.style.transform = 'scaleX(0)';
            }
            const chargeVeil = veilRefs.current[chargeAbilityId];
            if (chargeVeil) {
              chargeVeil.style.transform = 'scaleY(0)';
            }
            setIsRecharging(false);
          }
        }

        // 3. Pain Infliction 5.0s channel countdown bar
        if (painChanneling && painBarRef.current) {
          anyRemaining = true;
          const elapsed = now - painStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / 5000);
          painBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 4. Darkhold 12s active grimoire duration bar
        if (darkholdActive && darkholdBarRef.current) {
          anyRemaining = true;
          const elapsed = now - darkholdStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / DARKHOLD_DURATION_MS);
          darkholdBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 5. Automatic Shield 10s active barrier bar
        if (autoShieldActive && shieldBarRef.current) {
          anyRemaining = true;
          const elapsed = now - shieldStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / AUTO_SHIELD_DURATION_MS);
          shieldBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 6. Emma Frost Mind Control Mental Damage 3.0s countdown bar
        if (mindControlPhase === 'mental-damage' && mindControlBarRef.current) {
          anyRemaining = true;
          const elapsed = now - mindControlStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / EMMA_MC_MENTAL_DMG_MS);
          mindControlBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 7. Emma Frost Diamond Form 15s duration bar
        if (diamondActive && diamondBarRef.current) {
          anyRemaining = true;
          const elapsed = now - diamondStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / EMMA_DIAMOND_DURATION_MS);
          diamondBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 8. Emma Frost Telepathic Wave 2.4s channel bar
        if (telepathicWaveActive && telepathicBarRef.current) {
          anyRemaining = true;
          const elapsed = now - telepathicStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / 2400);
          telepathicBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 8b. Emma Frost Astral Projection 10s duration bar
        if (astralActive && astralBarRef.current) {
          anyRemaining = true;
          const elapsed = now - astralStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / EMMA_ASTRAL_MAX_DURATION_MS);
          astralBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 9. Hela Sword Summon 14s duration bar
        if (swordSummonActive && swordSummonBarRef.current) {
          anyRemaining = true;
          const elapsed = now - swordSummonStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / HELA_SWORD_SUMMON_DURATION_MS);
          swordSummonBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 10. Magneto Metal Tornado 5.5s duration bar
        if (magnetoTornadoActive && magnetoTornadoBarRef.current) {
          anyRemaining = true;
          const elapsed = now - magnetoTornadoStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / MAGNETO_TORNADO_DURATION_MS);
          magnetoTornadoBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 11. Quicksilver Rapid Punch 2.0s & Speed Blitz 1.1s duration bars
        if (rapidPunchActive && rapidPunchBarRef.current) {
          anyRemaining = true;
          const elapsed = now - rapidPunchStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / QUICKSILVER_COMBO_DURATION_MS);
          rapidPunchBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (speedBlitzActive && speedBlitzBarRef.current) {
          anyRemaining = true;
          const elapsed = now - speedBlitzStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / SPEED_BLITZ_DURATION_MS);
          speedBlitzBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 12. Quicksilver Wind Tornado 5.0s duration bar
        if (windTornadoActive && windTornadoBarRef.current) {
          anyRemaining = true;
          const elapsed = now - windTornadoStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / QUICKSILVER_TORNADO_MAX_DURATION_MS);
          windTornadoBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 13. Doctor Strange Mystic Shield 10s max duration bar
        if (strangeShieldActive && strangeShieldBarRef.current) {
          anyRemaining = true;
          const elapsed = now - strangeShieldStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / STRANGE_SHIELD_MAX_DURATION_MS);
          strangeShieldBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 14. Vision Mind Stone Laser 3.6s duration bar
        if (visionLaserActive && visionLaserBarRef.current) {
          anyRemaining = true;
          const elapsed = now - visionLaserStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / VISION_LASER_DURATION_MS);
          visionLaserBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 15. Vision Head Grip 2.6s duration bar
        if (visionHeadGripActive && visionHeadGripBarRef.current) {
          anyRemaining = true;
          const elapsed = now - visionHeadGripStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / VISION_HEAD_GRIP_DURATION_MS);
          visionHeadGripBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 16. Wanda Zombie Crimson Beam 3.0s duration bar
        if (zombieBeamActive && zombieBeamBarRef.current) {
          anyRemaining = true;
          const elapsed = now - zombieBeamStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / 3000);
          zombieBeamBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 17. Agatha Darkhold 12.0s & Mystic Shield 10.0s duration bars
        if (agathaDarkholdActive && agathaDarkholdBarRef.current) {
          anyRemaining = true;
          const elapsed = now - agathaDarkholdStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / AGATHA_DARKHOLD_DURATION_MS);
          agathaDarkholdBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (agathaAutoShieldActive && agathaAutoShieldBarRef.current) {
          anyRemaining = true;
          const elapsed = now - agathaAutoShieldStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / AUTO_SHIELD_DURATION_MS);
          agathaAutoShieldBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 18. Agatha Absorption Shield 6.0s duration bar
        if (agathaShieldActive && agathaShieldBarRef.current) {
          anyRemaining = true;
          const elapsed = now - agathaShieldStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / AGATHA_SHIELD_DURATION_MS);
          agathaShieldBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 19. Invisible Woman 10.0s Invisibility & Forcefield Shield 10.0s duration bars
        if (invisibilityActive && invisBarRef.current) {
          anyRemaining = true;
          const elapsed = now - invisStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / INVISIBILITY_MAX_DURATION_MS);
          invisBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (forcefieldShieldActive && forcefieldShieldBarRef.current) {
          anyRemaining = true;
          const elapsed = now - forcefieldShieldStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / FORCEFIELD_SHIELD_DURATION_MS);
          forcefieldShieldBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 20. Vampire 3.0s Power Absorption channel & 40s Stolen Ability lifetime bar
        if (vampireAbsorbing && vampireAbsorbBarRef.current) {
          anyRemaining = true;
          const elapsed = now - vampireAbsorbStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / VAMPIRE_ABSORB_DURATION_MS);
          vampireAbsorbBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (stolenAbility && stolenTimerBarRef.current) {
          anyRemaining = true;
          const elapsed = now - stolenAbility.startedAtMs;
          const rem = Math.max(0, 1 - elapsed / Math.max(1, stolenAbility.durationMs));
          stolenTimerBarRef.current.style.transform = `scaleX(${rem})`;
        }

        // 21. Captain America 4.0s Shield Charge & Thor 3.45s Lightning Storm Beam bars
        if (capShieldChargeActive && capShieldChargeBarRef.current) {
          anyRemaining = true;
          const elapsed = now - capShieldChargeStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / CAP_SHIELD_CHARGE_DURATION_MS);
          capShieldChargeBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (thorStormBeamPhase !== 'idle' && thorStormBarRef.current) {
          anyRemaining = true;
          const elapsed = now - thorStormStartMsRef.current;
          const totalDur = THOR_LIGHTNING_STORM_CHANNEL_MS + THOR_LIGHTNING_STORM_BEAM_MS;
          const rem = Math.max(0, 1 - elapsed / totalDur);
          thorStormBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (stormTornadoActive && stormTornadoBarRef.current) {
          anyRemaining = true;
          const elapsed = now - stormTornadoStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / STORM_TORNADO_DURATION_MS);
          stormTornadoBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (dualCosmicBeamActive && dualCosmicBeamBarRef.current) {
          anyRemaining = true;
          const elapsed = now - dualCosmicBeamStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / SILVER_DUAL_BEAM_DURATION_MS);
          dualCosmicBeamBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (windBlastActive && windBlastBarRef.current) {
          anyRemaining = true;
          const elapsed = now - windBlastStartMsRef.current;
          const rem = Math.max(0, 1 - elapsed / STORM_WIND_BLAST_DURATION_MS);
          windBlastBarRef.current.style.transform = `scaleX(${rem})`;
        }

        if (anyRemaining) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [
      cooldowns,
      transferCd,
      isRecharging,
      painChanneling,
      darkholdActive,
      autoShieldActive,
      mindControlPhase,
      astralActive,
      diamondActive,
      telepathicWaveActive,
      swordSummonActive,
      magnetoTornadoActive,
      rapidPunchActive,
      speedBlitzActive,
      windTornadoActive,
      strangeShieldActive,
      visionLaserActive,
      visionHeadGripActive,
      zombieBeamActive,
      agathaDarkholdActive,
      agathaAutoShieldActive,
      agathaShieldActive,
      invisibilityActive,
      forcefieldShieldActive,
      vampireAbsorbing,
      capShieldChargeActive,
      thorStormBeamPhase,
      stormTornadoActive,
      dualCosmicBeamActive,
      windBlastActive,
      stolenAbility,
      chargeAbilityId,
      maxCharges,
    ]);

    useEffect(() => {
      return () => {
        clearTimeout(pulseTimerRef.current);
        clearTimeout(drainHoldRef.current.timerId);
      };
    }, []);

    const triggerSubtlePulse = useCallback((id: AbilityId) => {
      clearTimeout(pulseTimerRef.current);
      setTriggerPulseId(id);
      pulseTimerRef.current = window.setTimeout(() => setTriggerPulseId(null), 130);
    }, []);

    const activateAbility = useCallback(
      (id: AbilityId) => {
        if (locked) return;
        if (id === 'stolen-ability') return;
        if (mindControlPhase === 'choosing' || mindControlPhase === 'mental-damage') return;
        if (forcefieldTransferPhase !== 'idle') return;
        if (painChanneling && id !== 'pain-infliction') return;
        if (lockedAbilityIds?.includes(id)) return;

        // Strictly block Darkhold sub-abilities unless Darkhold is currently active
        if (isDarkholdSubAbility(id) && !(hasDarkholdMain && darkholdActive)) {
          return;
        }
        if (
          isAgathaDarkholdSubAbility(id) &&
          !(hasAgathaDarkholdMain && agathaDarkholdActive)
        ) {
          return;
        }

        const def =
          effectiveAbilities.find((a) => a.id === id) ??
          (hasDarkholdMain && darkholdActive
            ? DARKHOLD_SUB_ABILITIES.find((a) => a.id === id)
            : undefined) ??
          (hasAgathaDarkholdMain && agathaDarkholdActive
            ? AGATHA_DARKHOLD_SUB_ABILITIES.find((a) => a.id === id)
            : undefined);
        if (!def) return;

        const now = performance.now();

        if (id === 'chaos-bolt' || id === 'phoenix-fireballs') {
          if (now < castUnlockAtRef.current) return;
          const prevCharges = chargesRef.current;
          if (prevCharges <= 0) return;

          const accepted =
            id === 'chaos-bolt'
              ? onCastChaosBolt
                ? onCastChaosBolt()
                : true
              : onCastPhoenixFireball
                ? onCastPhoenixFireball()
                : true;
          if (!accepted) return;

          castUnlockAtRef.current = now + chargeCastIntervalMs;
          const nextCharges = prevCharges - 1;
          chargesRef.current = nextCharges;
          setCharges(nextCharges);
          setChargeAnimKey((k) => k + 1);
          triggerSubtlePulse(id);
          onAbilitySound?.(id === 'chaos-bolt' ? 'chaos-bolt' : 'phoenix-fireball');

          const q = rechargeQueueRef.current;
          const startMs = q.length > 0 ? q[q.length - 1].endMs : now;
          q.push({ startMs, endMs: startMs + chargeRechargeMs });
          setIsRecharging(true);
          return;
        }

        if (id === 'pain-infliction') {
          if (!painChanneling) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasChanneling = painChanneling;
          const accepted = onTogglePainInfliction ? onTogglePainInfliction() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasChanneling ? 'pain-cancel' : 'pain-start');
          return;
        }

        if (id === 'darkhold') {
          if (!darkholdActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOpen = darkholdActive;
          const accepted = onToggleDarkhold ? onToggleDarkhold() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOpen) {
            onAbilitySound?.('darkhold-open');
          }
          return;
        }

        if (id === 'metal-tornado') {
          if (!magnetoTornadoActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOn = magnetoTornadoActive;
          const accepted = onToggleMetalTornado ? onToggleMetalTornado() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('magneto-tornado');
          }
          return;
        }

        if (id === 'super-speed') {
          if (!superSpeedActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOn = superSpeedActive;
          const accepted = onToggleSuperSpeed ? onToggleSuperSpeed() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'quicksilver-speed-off' : 'quicksilver-speed-on');
          if (wasOn && def.cooldownMs > 0) {
            const nextCd: Partial<Record<AbilityId, CooldownState>> = {
              ...cooldownsRef.current,
              [id]: {
                startMs: now,
                durationMs: def.cooldownMs,
              },
            };
            cooldownsRef.current = nextCd;
            setCooldowns(nextCd);
          }
          return;
        }

        if (id === 'rapid-punch-combo') {
          if (rapidPunchActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastRapidPunchCombo ? onCastRapidPunchCombo() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          return;
        }

        if (id === 'speed-blitz') {
          if (speedBlitzActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastSpeedBlitz ? onCastSpeedBlitz() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          return;
        }

        if (id === 'wind-tornado') {
          if (!windTornadoActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOn = windTornadoActive;
          const accepted = onToggleWindTornado ? onToggleWindTornado() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'quicksilver-tornado-off' : 'quicksilver-tornado-on');
          return;
        }

        if (id === 'mystic-shield') {
          if (!strangeShieldActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOn = strangeShieldActive;
          const accepted = onToggleMysticShield ? onToggleMysticShield() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('strange-shield-on');
          }
          return;
        }

        if (id === 'mind-stone-laser') {
          if (visionLaserActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastMindStoneLaser ? onCastMindStoneLaser() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('vision-laser');
          return;
        }

        if (id === 'head-grip') {
          if (visionHeadGripActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastHeadGrip ? onCastHeadGrip() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('vision-head-grip');
          return;
        }

        if (id === 'astral-projection') {
          if (!astralActive) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = astralActive;
          const accepted = onToggleAstral ? onToggleAstral() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('astral-on');
          }
          return;
        }

        if (id === 'invisibility') {
          if (!invisibilityActive) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = invisibilityActive;
          const accepted = onToggleInvisibility ? onToggleInvisibility() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('invisibility-on');
          }
          return;
        }

        if (id === 'forcefield-shield') {
          if (!forcefieldShieldActive) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = forcefieldShieldActive;
          const accepted = onToggleForcefieldShield ? onToggleForcefieldShield() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('forcefield-shield-on');
          }
          return;
        }

        const activeCd = cooldownsRef.current[id];
        if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
          return;
        }

        if (isFlightAbility(id)) {
          const nextActive = !flightOnRef.current;
          const accepted = onFlightToggle ? onFlightToggle(nextActive) : true;
          if (!accepted) return;

          flightOnRef.current = nextActive;
          setFlightOn(nextActive);
          onFlightStateChange?.(nextActive);
          triggerSubtlePulse(id);
          if (id === 'phoenix-flight') {
            onAbilitySound?.(nextActive ? 'phoenix-flight-on' : 'phoenix-flight-off');
          } else if (id === 'cosmic-flight') {
            onAbilitySound?.(nextActive ? 'cosmic-flight-on' : 'cosmic-flight-off');
          } else if (id === 'storm-flight') {
            onAbilitySound?.(nextActive ? 'storm-flight-on' : 'storm-flight-off');
          } else {
            onAbilitySound?.(nextActive ? 'flight-on' : 'flight-off');
          }

          if (!nextActive) {
            const nextCd: Partial<Record<AbilityId, CooldownState>> = {
              ...cooldownsRef.current,
              [id]: {
                startMs: now,
                durationMs: def.cooldownMs,
              },
            };
            cooldownsRef.current = nextCd;
            setCooldowns(nextCd);
          }
          return;
        }

        if (id === 'teleport') {
          const accepted = onCastTeleport ? onCastTeleport() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('teleport-start');

          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            teleport: {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
          return;
        }

        if (id === 'telekinetic-explosion') {
          const accepted = onCastTelekineticExplosion
            ? onCastTelekineticExplosion()
            : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('telekinetic-explosion');

          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            'telekinetic-explosion': {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
          return;
        }

        if (id === 'auto-shield') {
          if (autoShieldActive) return;
          const accepted = onCastAutoShield ? onCastAutoShield() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('auto-shield');
          return;
        }

        if (id === 'mind-control') {
          if (mindControlPhase !== 'idle') return;
          const accepted = onActivateMindControl ? onActivateMindControl() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('mind-control-link');
          return;
        }

        if (id === 'diamond-form') {
          if (!diamondActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOn = diamondActive;
          const accepted = onToggleDiamond ? onToggleDiamond() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOn) {
            onAbilitySound?.('diamond-on');
          }
          return;
        }

        if (id === 'telepathic-wave') {
          if (telepathicWaveActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastTelepathicWave ? onCastTelepathicWave() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('telepathic-wave');
          return;
        }

        if (id === 'sword-summon') {
          if (swordSummonActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onActivateSwordSummon ? onActivateSwordSummon() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('sword-summon');
          return;
        }

        if (id === 'mind-stone-projectile') {
          if (now < visionBoltCadenceRef.current) return;
          const accepted = onCastMindStoneProjectile
            ? onCastMindStoneProjectile()
            : true;
          if (!accepted) return;

          visionBoltCadenceRef.current = now + 360;
          triggerSubtlePulse(id);
          return;
        }

        if (id === 'zombie-beam') {
          if (zombieBeamActive || zombieStoneActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastZombieBeam ? onCastZombieBeam() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('zombie-beam');
          return;
        }

        if (id === 'zombie-stone-explosion') {
          if (zombieStoneActive || zombieBeamActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onCastZombieStoneExplosion
            ? onCastZombieStoneExplosion()
            : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('zombie-stone');
          return;
        }

        if (id === 'agatha-darkhold') {
          if (!agathaDarkholdActive) {
            const activeCd = cooldownsRef.current[id];
            if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
              return;
            }
          }
          const wasOpen = agathaDarkholdActive;
          const accepted = onToggleAgathaDarkhold ? onToggleAgathaDarkhold() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (!wasOpen) {
            onAbilitySound?.('darkhold-open');
          }
          return;
        }

        if (id === 'agatha-teleport') {
          const accepted = onCastAgathaTeleport ? onCastAgathaTeleport() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('teleport-start');

          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            'agatha-teleport': {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
          return;
        }

        if (id === 'agatha-darkhold-blast') {
          const accepted = onCastAgathaDarkholdBlast
            ? onCastAgathaDarkholdBlast()
            : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('telekinetic-explosion');

          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            'agatha-darkhold-blast': {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
          return;
        }

        if (id === 'agatha-auto-shield') {
          if (agathaAutoShieldActive) return;
          const accepted = onCastAgathaAutoShield ? onCastAgathaAutoShield() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('auto-shield');
          return;
        }

        if (id === 'agatha-shield') {
          if (agathaShieldActive) return;
          const activeCd = cooldownsRef.current[id];
          if (activeCd && now - activeCd.startMs < activeCd.durationMs) {
            return;
          }
          const accepted = onActivateAgathaShield ? onActivateAgathaShield() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('agatha-shield');
          return;
        }

        if (id === 'power-absorption') {
          if (vampireAbsorbing) return;
          const cdAbsorb = cooldownsRef.current[id];
          if (cdAbsorb && now - cdAbsorb.startMs < cdAbsorb.durationMs) {
            return;
          }
          const accepted = onCastPowerAbsorption ? onCastPowerAbsorption() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('vampire-absorb-start');
          return;
        }

        if (id === 'shield-defense') {
          if (!capShieldDefenseActive) {
            const cdDef = cooldownsRef.current[id];
            if (cdDef && now - cdDef.startMs < cdDef.durationMs) {
              return;
            }
          }
          const wasOn = capShieldDefenseActive;
          const accepted = onToggleCapShieldDefense ? onToggleCapShieldDefense() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'cap-defense-off' : 'cap-defense-on');
          return;
        }

        if (
          id === 'shield-throw' ||
          id === 'shield-combo' ||
          id === 'shield-charge' ||
          id === 'mjolnir-combo' ||
          id === 'mjolnir-throw' ||
          id === 'lightning-slam' ||
          id === 'lightning-storm-beam'
        ) {
          const cdCheck = cooldownsRef.current[id];
          if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
            return;
          }
          let accepted = true;
          if (id === 'shield-throw') {
            accepted = onCastCapShieldThrow ? onCastCapShieldThrow() : true;
          } else if (id === 'shield-combo') {
            accepted = onCastCapShieldCombo ? onCastCapShieldCombo() : true;
          } else if (id === 'shield-charge') {
            accepted = onCastCapShieldCharge ? onCastCapShieldCharge() : true;
          } else if (id === 'mjolnir-combo') {
            accepted = onCastThorMjolnirCombo ? onCastThorMjolnirCombo() : true;
          } else if (id === 'mjolnir-throw') {
            accepted = onCastThorMjolnirThrow ? onCastThorMjolnirThrow() : true;
          } else if (id === 'lightning-slam') {
            accepted = onCastThorLightningSlam ? onCastThorLightningSlam() : true;
          } else if (id === 'lightning-storm-beam') {
            accepted = onCastThorLightningStormBeam ? onCastThorLightningStormBeam() : true;
          }
          if (!accepted) return;
          triggerSubtlePulse(id);
          return;
        }

        if (id === 'damage-absorption') {
          if (!damageAbsorptionActive && !silverEnergyReady) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = damageAbsorptionActive || silverEnergyReady;
          const accepted = onToggleDamageAbsorption ? onToggleDamageAbsorption() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'silver-absorb-off' : 'silver-absorb-on');
          return;
        }

        if (id === 'dual-cosmic-beam') {
          if (dualCosmicBeamActive) return;
          const cdCheck = cooldownsRef.current[id];
          if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
            return;
          }
          const accepted = onCastDualCosmicBeam ? onCastDualCosmicBeam() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          return;
        }

        if (id === 'storm-tornado') {
          if (!stormTornadoActive) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = stormTornadoActive;
          const accepted = onToggleStormTornado ? onToggleStormTornado() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'storm-tornado-off' : 'storm-tornado-on');
          return;
        }

        if (id === 'wind-blast') {
          if (!windBlastActive) {
            const cdCheck = cooldownsRef.current[id];
            if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
              return;
            }
          }
          const wasOn = windBlastActive;
          const accepted = onToggleWindBlast ? onToggleWindBlast() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.(wasOn ? 'wind-blast-off' : 'wind-blast-on');
          return;
        }

        if (id === 'ice-spear') {
          if (stormIceSpearActive) return;
          const cdCheck = cooldownsRef.current[id];
          if (cdCheck && now - cdCheck.startMs < cdCheck.durationMs) {
            return;
          }
          const accepted = onCastIceSpear ? onCastIceSpear() : true;
          if (!accepted) return;

          triggerSubtlePulse(id);
          onAbilitySound?.('ice-spear-create');
          return;
        }

        if (
          id === 'chaos-implosion' ||
          id === 'phoenix-wave' ||
          id === 'mental-attack' ||
          id === 'green-explosion' ||
          id === 'spinning-leap' ||
          id === 'ground-sword' ||
          id === 'metal-projectile' ||
          id === 'magnetic-meteor' ||
          id === 'time-stop' ||
          id === 'mystic-clones' ||
          id === 'eldritch-discs' ||
          id === 'astral-extraction' ||
          id === 'agatha-bolt' ||
          id === 'purgatory-grasp' ||
          id === 'forcefield-barrier' ||
          id === 'vampire-bolt' ||
          id === 'bandit-gun' ||
          id === 'prisoner-punch' ||
          id === 'cosmic-blast'
        ) {
          let accepted = true;
          if (id === 'chaos-implosion') {
            accepted = onCastChaosImplosion ? onCastChaosImplosion() : true;
          } else if (id === 'phoenix-wave') {
            accepted = onCastPhoenixWave ? onCastPhoenixWave() : true;
          } else if (id === 'mental-attack') {
            accepted = onCastMentalAttack ? onCastMentalAttack() : true;
          } else if (id === 'green-explosion') {
            accepted = onCastGreenExplosion ? onCastGreenExplosion() : true;
          } else if (id === 'spinning-leap') {
            accepted = onCastSpinningLeap ? onCastSpinningLeap() : true;
          } else if (id === 'ground-sword') {
            accepted = onCastGroundSword ? onCastGroundSword() : true;
          } else if (id === 'metal-projectile') {
            accepted = onCastMetalProjectile ? onCastMetalProjectile() : true;
          } else if (id === 'magnetic-meteor') {
            accepted = onCastMagneticMeteor ? onCastMagneticMeteor() : true;
          } else if (id === 'time-stop') {
            accepted = onCastTimeStop ? onCastTimeStop() : true;
          } else if (id === 'mystic-clones') {
            accepted = onCastMysticClones ? onCastMysticClones() : true;
          } else if (id === 'eldritch-discs') {
            accepted = onCastEldritchDiscs ? onCastEldritchDiscs() : true;
          } else if (id === 'astral-extraction') {
            accepted = onCastAstralExtraction ? onCastAstralExtraction() : true;
          } else if (id === 'agatha-bolt') {
            accepted = onCastAgathaBolt ? onCastAgathaBolt() : true;
          } else if (id === 'purgatory-grasp') {
            accepted = onCastPurgatoryGrasp ? onCastPurgatoryGrasp() : true;
          } else if (id === 'forcefield-barrier') {
            accepted = onCastForcefieldBarrier ? onCastForcefieldBarrier() : true;
          } else if (id === 'vampire-bolt') {
            accepted = onCastVampireBolt ? onCastVampireBolt() : true;
          } else if (id === 'bandit-gun') {
            accepted = onCastBanditGun ? onCastBanditGun() : true;
          } else if (id === 'prisoner-punch') {
            accepted = onCastPrisonerPunch ? onCastPrisonerPunch() : true;
          } else if (id === 'cosmic-blast') {
            accepted = onCastCosmicBlast ? onCastCosmicBlast() : true;
          }
          if (!accepted) return;

          triggerSubtlePulse(id);
          if (id === 'chaos-implosion') {
            onAbilitySound?.('chaos-implosion');
          } else if (id === 'mental-attack') {
            onAbilitySound?.('mental-attack');
          } else if (id === 'green-explosion') {
            onAbilitySound?.('green-explosion');
          } else if (id === 'spinning-leap') {
            onAbilitySound?.('spinning-leap');
          } else if (id === 'ground-sword') {
            onAbilitySound?.('ground-sword');
          } else if (id === 'eldritch-discs') {
            onAbilitySound?.('eldritch-discs');
          } else if (id === 'astral-extraction') {
            onAbilitySound?.('astral-extraction');
          } else if (id === 'agatha-bolt') {
            onAbilitySound?.('agatha-bolt');
          } else if (id === 'purgatory-grasp') {
            onAbilitySound?.('purgatory-grasp');
          } else if (id === 'forcefield-barrier') {
            onAbilitySound?.('forcefield-barrier');
          } else if (id === 'vampire-bolt') {
            onAbilitySound?.('vampire-bolt');
          } else if (id === 'bandit-gun') {
            onAbilitySound?.('bandit-gun');
          } else if (id === 'prisoner-punch') {
            onAbilitySound?.('prisoner-punch');
          }

          const nextCd: Partial<Record<AbilityId, CooldownState>> = {
            ...cooldownsRef.current,
            [id]: {
              startMs: now,
              durationMs: def.cooldownMs,
            },
          };
          cooldownsRef.current = nextCd;
          setCooldowns(nextCd);
        }
      },
      [
        effectiveAbilities,
        agathaAutoShieldActive,
        agathaDarkholdActive,
        agathaShieldActive,
        astralActive,
        autoShieldActive,
        chargeCastIntervalMs,
        chargeRechargeMs,
        darkholdActive,
        diamondActive,
        forcefieldShieldActive,
        forcefieldTransferPhase,
        hasAgathaDarkholdMain,
        hasDarkholdMain,
        invisibilityActive,
        locked,
        lockedAbilityIds,
        magnetoTornadoActive,
        mindControlPhase,
        onAbilitySound,
        onActivateAgathaShield,
        onActivateMindControl,
        onActivateSwordSummon,
        onCastAgathaAutoShield,
        onCastAgathaBolt,
        onCastAgathaDarkholdBlast,
        onCastAgathaTeleport,
        onCastAstralExtraction,
        onCastAutoShield,
        onCastBanditGun,
        onCastChaosBolt,
        onCastChaosImplosion,
        onCastEldritchDiscs,
        onCastForcefieldBarrier,
        onCastGreenExplosion,
        onCastGroundSword,
        onCastHeadGrip,
        onCastMagneticMeteor,
        onCastMentalAttack,
        onCastMetalProjectile,
        onCastMindStoneLaser,
        onCastMindStoneProjectile,
        onCastMysticClones,
        onCastPhoenixFireball,
        onCastPhoenixWave,
        onCastPowerAbsorption,
        onCastPrisonerPunch,
        onCastPurgatoryGrasp,
        onCastRapidPunchCombo,
        onCastSpeedBlitz,
        onCastSpinningLeap,
        onCastTelekineticExplosion,
        onCastTelepathicWave,
        onCastTeleport,
        onCastTimeStop,
        onCastVampireBolt,
        onCastZombieBeam,
        onCastZombieStoneExplosion,
        onCastCapShieldThrow,
        onToggleCapShieldDefense,
        onCastCapShieldCombo,
        onCastCapShieldCharge,
        onCastThorMjolnirCombo,
        onCastThorMjolnirThrow,
        onCastThorLightningSlam,
        onCastThorLightningStormBeam,
        onToggleDamageAbsorption,
        onCastCosmicBlast,
        onCastDualCosmicBeam,
        onToggleStormTornado,
        onCastIceSpear,
        onToggleWindBlast,
        onFlightStateChange,
        onFlightToggle,
        onToggleAgathaDarkhold,
        onToggleAstral,
        onToggleDarkhold,
        onToggleDiamond,
        onToggleForcefieldShield,
        onToggleInvisibility,
        onToggleMetalTornado,
        onToggleMysticShield,
        onTogglePainInfliction,
        onToggleSuperSpeed,
        onToggleWindTornado,
        painChanneling,
        rapidPunchActive,
        speedBlitzActive,
        strangeShieldActive,
        superSpeedActive,
        swordSummonActive,
        telepathicWaveActive,
        triggerSubtlePulse,
        vampireAbsorbing,
        capShieldDefenseActive,
        capShieldChargeActive,
        thorSlamActive,
        thorStormBeamPhase,
        damageAbsorptionActive,
        silverEnergyReady,
        dualCosmicBeamActive,
        stormTornadoActive,
        stormIceSpearActive,
        windBlastActive,
        visionHeadGripActive,
        visionLaserActive,
        windTornadoActive,
        zombieBeamActive,
        zombieStoneActive,
      ],
    );

    const beginChaosDrainPress = useCallback(
      (pointerId: number | null) => {
        if (locked || lockedAbilityIds?.includes('chaos-drain')) return;
        const dh = drainHoldRef.current;
        clearTimeout(dh.timerId);
        dh.downMs = performance.now();
        dh.startedDrain = false;
        dh.pointerId = pointerId;
        dh.timerId = window.setTimeout(() => {
          if (drainHoldRef.current.downMs <= 0) return;
          const accepted = onStartSupremeDrainHold ? onStartSupremeDrainHold() : false;
          if (accepted) {
            drainHoldRef.current.startedDrain = true;
            onAbilitySound?.('chaos-drain-start');
          }
        }, 165);
      },
      [locked, lockedAbilityIds, onAbilitySound, onStartSupremeDrainHold],
    );

    const endChaosDrainPress = useCallback(
      (pointerId?: number | null) => {
        const dh = drainHoldRef.current;
        if (pointerId !== undefined && dh.pointerId !== null && dh.pointerId !== pointerId) {
          return;
        }
        clearTimeout(dh.timerId);
        if (dh.downMs <= 0 && !dh.startedDrain) return;
        const wasHolding = dh.startedDrain;
        dh.downMs = 0;
        dh.startedDrain = false;
        dh.pointerId = null;

        if (wasHolding) {
          onStopSupremeDrainHold?.();
        } else {
          const fired = onFireSupremeStackBolt ? onFireSupremeStackBolt() : false;
          if (fired) {
            triggerSubtlePulse('chaos-drain');
            onAbilitySound?.('chaos-drain-bolt');
          }
        }
      },
      [onAbilitySound, onFireSupremeStackBolt, onStopSupremeDrainHold, triggerSubtlePulse],
    );

    // Silent keyboard shortcuts: 1..5 for main abilities, Q/E/R for Darkhold sub-abilities while active
    useEffect(() => {
      const triggerSlotDown = (slotIdx: number) => {
        const card = effectiveAbilities[slotIdx];
        if (!card) return;
        if (card.id === 'chaos-drain') {
          beginChaosDrainPress(-1);
        } else {
          activateAbility(card.id);
        }
      };
      const triggerSlotUp = (slotIdx: number) => {
        const card = effectiveAbilities[slotIdx];
        if (card?.id === 'chaos-drain') {
          endChaosDrainPress(-1);
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        switch (e.code) {
          case 'Digit1':
            triggerSlotDown(0);
            break;
          case 'Digit2':
            triggerSlotDown(1);
            break;
          case 'Digit3':
            triggerSlotDown(2);
            break;
          case 'Digit4':
            triggerSlotDown(3);
            break;
          case 'Digit5':
            triggerSlotDown(4);
            break;
          case 'KeyQ':
            if (showDarkholdSubBar && DARKHOLD_SUB_ABILITIES[0]) {
              activateAbility(DARKHOLD_SUB_ABILITIES[0].id);
            } else if (showAgathaDarkholdSubBar && AGATHA_DARKHOLD_SUB_ABILITIES[0]) {
              activateAbility(AGATHA_DARKHOLD_SUB_ABILITIES[0].id);
            }
            break;
          case 'KeyE':
            if (showDarkholdSubBar && DARKHOLD_SUB_ABILITIES[1]) {
              activateAbility(DARKHOLD_SUB_ABILITIES[1].id);
            } else if (showAgathaDarkholdSubBar && AGATHA_DARKHOLD_SUB_ABILITIES[1]) {
              activateAbility(AGATHA_DARKHOLD_SUB_ABILITIES[1].id);
            }
            break;
          case 'KeyR':
            if (showDarkholdSubBar && DARKHOLD_SUB_ABILITIES[2]) {
              activateAbility(DARKHOLD_SUB_ABILITIES[2].id);
            } else if (showAgathaDarkholdSubBar && AGATHA_DARKHOLD_SUB_ABILITIES[2]) {
              activateAbility(AGATHA_DARKHOLD_SUB_ABILITIES[2].id);
            }
            break;
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
          case 'Digit1':
            triggerSlotUp(0);
            break;
          case 'Digit2':
            triggerSlotUp(1);
            break;
          case 'Digit3':
            triggerSlotUp(2);
            break;
          case 'Digit4':
            triggerSlotUp(3);
            break;
          case 'Digit5':
            triggerSlotUp(4);
            break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }, [
      effectiveAbilities,
      activateAbility,
      beginChaosDrainPress,
      endChaosDrainPress,
      showAgathaDarkholdSubBar,
      showDarkholdSubBar,
    ]);

    const isFiveSlots = effectiveAbilities.length >= 5;

    return (
      <>
        {/* Darkhold Sub-Ability Bar: visible STRICTLY ONLY while Darkhold is active */}
        {showDarkholdSubBar && (
          <div
            className="animate-cartoon-pop-in fixed z-20 flex items-center select-none"
            style={{
              right: flightCancelVisible
                ? 'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px) + clamp(54px, 8.4vw, 66px) + 10px)'
                : 'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
              bottom:
                'calc(max(20px, calc(var(--stage-safe-bottom, 0px) + 14px)) + clamp(50px, 7.8vw, 62px) + 12px)',
              gap: 'clamp(6px, 1.0vw, 8px)',
              touchAction: 'manipulation',
              transition: 'right 140ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
          >
            {DARKHOLD_SUB_ABILITIES.map((sub) => {
              const cd = cooldowns[sub.id];
              const isOnCd = cd !== undefined;
              const isShieldOn = sub.id === 'auto-shield' && autoShieldActive;
              const isDisabled = isOnCd || locked || isShieldOn;
              const isPulsing = triggerPulseId === sub.id;

              const bg = isShieldOn ? '#2A0D1D' : '#3E1C36';
              const pressY = isPulsing ? 1.5 : isShieldOn ? 1 : 0;
              const scale = isPulsing ? 0.94 : 1;

              return (
                <div
                  key={sub.id}
                  className="relative"
                  style={{
                    transform: `rotate(${sub.tiltDeg}deg)`,
                    opacity: locked && !isOnCd ? 0.56 : 1,
                    transition: 'opacity 120ms ease',
                  }}
                >
                  <button
                    type="button"
                    disabled={isDisabled}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      activateAbility(sub.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activateAbility(sub.id);
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-pressed={sub.id === 'auto-shield' ? isShieldOn : undefined}
                    aria-label={sub.name}
                    className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{
                      width: 'clamp(46px, 7.2vw, 56px)',
                      height: 'clamp(46px, 7.2vw, 56px)',
                      padding: '3px',
                      backgroundColor: bg,
                      backgroundImage: DARKHOLD_DOT_PATTERN,
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 5px 5px',
                      border: isShieldOn
                        ? '2.5px solid #FF4D6A'
                        : '2.5px solid #0B0D18',
                      boxShadow: isShieldOn
                        ? '1px 1.5px 0 rgba(8, 10, 18, 0.92), inset 0 0 0 1.5px rgba(255, 118, 142, 0.6)'
                        : '2px 3px 0 rgba(8, 10, 18, 0.88), inset 0 0 0 1.5px rgba(255, 92, 122, 0.34)',
                      transform: `translateY(${pressY}px) scale(${scale})`,
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition:
                        'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 140ms ease, box-shadow 140ms ease',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      <AbilityIcon id={sub.id} size={18} />
                    </span>

                    <span
                      className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95]"
                      style={{
                        fontSize:
                          sub.name.length > 9
                            ? 'clamp(6.2px, 0.88vw, 7.4px)'
                            : 'clamp(7px, 0.96vw, 8.4px)',
                        color: isShieldOn ? 'rgba(255, 224, 232, 0.98)' : '#FFFFFF',
                        textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                      }}
                    >
                      {sub.name}
                    </span>

                    {/* Active 4.5s Automatic Shield countdown bar */}
                    {sub.id === 'auto-shield' && autoShieldActive && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                      >
                        <div
                          ref={shieldBarRef}
                          className="h-full w-full bg-[#FF4D6A]"
                          style={{
                            transformOrigin: 'left center',
                            transform: 'scaleX(1)',
                            willChange: 'transform',
                          }}
                        />
                      </div>
                    )}

                    {/* Dark reveal wipe for sub-ability cooldowns */}
                    {isOnCd && (
                      <div
                        ref={(el) => {
                          veilRefs.current[sub.id] = el;
                        }}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-20"
                        style={{
                          backgroundColor: 'rgba(10, 11, 24, 0.74)',
                          borderTop: '1.5px solid rgba(255, 165, 185, 0.35)',
                          transformOrigin: 'bottom center',
                          transform: 'scaleY(1)',
                          willChange: 'transform',
                        }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Agatha Purple Darkhold Sub-Ability Bar: visible STRICTLY ONLY while Agatha's Darkhold is active */}
        {showAgathaDarkholdSubBar && (
          <div
            className="animate-cartoon-pop-in fixed z-20 flex items-center select-none"
            style={{
              right: flightCancelVisible
                ? 'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px) + clamp(54px, 8.4vw, 66px) + 10px)'
                : 'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
              bottom:
                'calc(max(20px, calc(var(--stage-safe-bottom, 0px) + 14px)) + clamp(50px, 7.8vw, 62px) + 12px)',
              gap: 'clamp(6px, 1.0vw, 8px)',
              touchAction: 'manipulation',
              transition: 'right 140ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
          >
            {AGATHA_DARKHOLD_SUB_ABILITIES.map((sub) => {
              const cd = cooldowns[sub.id];
              const isOnCd = cd !== undefined;
              const isShieldOn = sub.id === 'agatha-auto-shield' && agathaAutoShieldActive;
              const isDisabled = isOnCd || locked || isShieldOn || Boolean(lockedAbilityIds?.includes(sub.id));
              const isPulsing = triggerPulseId === sub.id;

              const bg = isShieldOn ? '#240E3B' : '#2E1848';
              const pressY = isPulsing ? 1.5 : isShieldOn ? 1 : 0;
              const scale = isPulsing ? 0.94 : 1;

              return (
                <div
                  key={sub.id}
                  className="relative"
                  style={{
                    transform: `rotate(${sub.tiltDeg}deg)`,
                    opacity: locked && !isOnCd ? 0.56 : 1,
                    transition: 'opacity 120ms ease',
                  }}
                >
                  <button
                    type="button"
                    disabled={isDisabled}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      activateAbility(sub.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activateAbility(sub.id);
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-pressed={sub.id === 'agatha-auto-shield' ? isShieldOn : undefined}
                    aria-label={sub.name}
                    className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{
                      width: 'clamp(46px, 7.2vw, 56px)',
                      height: 'clamp(46px, 7.2vw, 56px)',
                      padding: '3px',
                      backgroundColor: bg,
                      backgroundImage: AGATHA_DARKHOLD_DOT_PATTERN,
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 5px 5px',
                      border: isShieldOn
                        ? '2.5px solid #C084FC'
                        : '2.5px solid #0B0D18',
                      boxShadow: isShieldOn
                        ? '1px 1.5px 0 rgba(8, 10, 18, 0.92), inset 0 0 0 1.5px rgba(192, 132, 252, 0.6)'
                        : '2px 3px 0 rgba(8, 10, 18, 0.88), inset 0 0 0 1.5px rgba(192, 132, 252, 0.34)',
                      transform: `translateY(${pressY}px) scale(${scale})`,
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition:
                        'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 140ms ease, box-shadow 140ms ease',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      <AbilityIcon id={sub.id} size={18} />
                    </span>

                    <span
                      className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95]"
                      style={{
                        fontSize:
                          sub.name.length > 9
                            ? 'clamp(6.2px, 0.88vw, 7.4px)'
                            : 'clamp(7px, 0.96vw, 8.4px)',
                        color: isShieldOn ? 'rgba(243, 232, 255, 0.98)' : '#FFFFFF',
                        textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                      }}
                    >
                      {sub.name}
                    </span>

                    {sub.id === 'agatha-auto-shield' && agathaAutoShieldActive && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                      >
                        <div
                          ref={agathaAutoShieldBarRef}
                          className="h-full w-full bg-[#C084FC]"
                          style={{
                            transformOrigin: 'left center',
                            transform: 'scaleX(1)',
                            willChange: 'transform',
                          }}
                        />
                      </div>
                    )}

                    {isOnCd && (
                      <div
                        ref={(el) => {
                          veilRefs.current[sub.id] = el;
                        }}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-20"
                        style={{
                          backgroundColor: 'rgba(10, 11, 24, 0.74)',
                          borderTop: '1.5px solid rgba(216, 180, 254, 0.35)',
                          transformOrigin: 'bottom center',
                          transform: 'scaleY(1)',
                          willChange: 'transform',
                        }}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Emma Frost Mind Control: 3 temporary psychic options above ability bar */}
        {mindControlPhase === 'choosing' && (
          <div
            className="animate-cartoon-pop-in fixed z-30 flex items-center select-none"
            style={{
              right:
                'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
              bottom:
                'calc(max(20px, calc(var(--stage-safe-bottom, 0px) + 14px)) + clamp(50px, 7.8vw, 62px) + 14px)',
              gap: 'clamp(6px, 1.0vw, 9px)',
              touchAction: 'manipulation',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
          >
            {EMMA_MIND_CONTROL_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                className="relative"
                style={{ transform: `rotate(${opt.tiltDeg}deg)` }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectMindControlOption?.(
                      opt.id as 'mc-paralysis' | 'mc-sleep' | 'mc-mental-damage',
                    );
                    onAbilitySound?.('mind-control-select');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMindControlOption?.(
                        opt.id as 'mc-paralysis' | 'mc-sleep' | 'mc-mental-damage',
                      );
                      onAbilitySound?.('mind-control-select');
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={opt.name}
                  className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    width: 'clamp(48px, 7.5vw, 58px)',
                    height: 'clamp(48px, 7.5vw, 58px)',
                    padding: '3px',
                    backgroundColor: '#1E2C4F',
                    backgroundImage: PURPLE_DOT_PATTERN,
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0, 5px 5px',
                    border: '2.5px solid #80DCFF',
                    boxShadow:
                      '2px 3px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(128, 220, 255, 0.45)',
                    cursor: 'pointer',
                    transition:
                      'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 120ms ease',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <AbilityIcon id={opt.id} size={18} />
                  </span>
                  <span
                    className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95] text-white"
                    style={{
                      fontSize: 'clamp(6.4px, 0.9vw, 7.8px)',
                      textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                    }}
                  >
                    {opt.name}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Invisible Woman: Transfer button while Forcefield Shield is active */}
        {forcefieldShieldActive && forcefieldTransferPhase === 'idle' && !locked && (
          <div
            className="animate-cartoon-pop-in fixed z-30 flex items-center select-none"
            style={{
              right:
                'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
              bottom:
                'calc(max(20px, calc(var(--stage-safe-bottom, 0px) + 14px)) + clamp(50px, 7.8vw, 62px) + 14px)',
              touchAction: 'manipulation',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
          >
            <div style={{ transform: `rotate(${FORCEFIELD_TRANSFER_ABILITY.tiltDeg}deg)` }}>
              <button
                type="button"
                disabled={transferCd !== null}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (transferCd !== null) return;
                  const ok = onTransferForcefieldShield ? onTransferForcefieldShield() : true;
                  if (ok) {
                    onAbilitySound?.('forcefield-transfer');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (transferCd !== null) return;
                    const ok = onTransferForcefieldShield ? onTransferForcefieldShield() : true;
                    if (ok) {
                      onAbilitySound?.('forcefield-transfer');
                    }
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={FORCEFIELD_TRANSFER_ABILITY.name}
                className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  width: 'clamp(50px, 7.8vw, 60px)',
                  height: 'clamp(48px, 7.4vw, 56px)',
                  padding: '3px',
                  backgroundColor: '#19355C',
                  backgroundImage: PURPLE_DOT_PATTERN,
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px',
                  border: transferCd !== null ? '2.5px solid #2A5B84' : '2.5px solid #56D4FF',
                  boxShadow:
                    '2px 3px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(86, 212, 255, 0.48)',
                  cursor: transferCd !== null ? 'default' : 'pointer',
                  transition:
                    'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 120ms ease',
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  <AbilityIcon id={FORCEFIELD_TRANSFER_ABILITY.id} size={18} />
                </span>
                <span
                  className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95] text-white"
                  style={{
                    fontSize: 'clamp(6.4px, 0.9vw, 7.8px)',
                    textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                  }}
                >
                  {FORCEFIELD_TRANSFER_ABILITY.name}
                </span>
                {transferCd !== null && (
                  <div
                    ref={transferVeilRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20"
                    style={{
                      backgroundColor: 'rgba(10, 11, 24, 0.76)',
                      borderTop: '1.5px solid rgba(130, 218, 255, 0.4)',
                      transformOrigin: 'bottom center',
                      transform: `scaleY(${Math.max(
                        0,
                        Math.min(1, 1 - (performance.now() - transferCd.startMs) / transferCd.durationMs),
                      )})`,
                      willChange: 'transform',
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Invisible Woman: Protection & Suffocation options after Transfer */}
        {forcefieldTransferPhase === 'choosing' && (
          <div
            className="animate-cartoon-pop-in fixed z-30 flex items-center select-none"
            style={{
              right:
                'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
              bottom:
                'calc(max(20px, calc(var(--stage-safe-bottom, 0px) + 14px)) + clamp(50px, 7.8vw, 62px) + 14px)',
              gap: 'clamp(6px, 1.0vw, 9px)',
              touchAction: 'manipulation',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
          >
            {FORCEFIELD_EFFECT_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                className="relative"
                style={{ transform: `rotate(${opt.tiltDeg}deg)` }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const mode =
                      opt.id === 'forcefield-protection' ? 'protection' : 'suffocation';
                    onSelectForcefieldOption?.(mode);
                    onAbilitySound?.(
                      mode === 'protection'
                        ? 'forcefield-protection'
                        : 'forcefield-suffocation',
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const mode =
                        opt.id === 'forcefield-protection' ? 'protection' : 'suffocation';
                      onSelectForcefieldOption?.(mode);
                      onAbilitySound?.(
                        mode === 'protection'
                          ? 'forcefield-protection'
                          : 'forcefield-suffocation',
                      );
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={opt.name}
                  className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    width: 'clamp(52px, 8.0vw, 62px)',
                    height: 'clamp(48px, 7.5vw, 58px)',
                    padding: '3px',
                    backgroundColor:
                      opt.id === 'forcefield-protection' ? '#163B4D' : '#2E1E4A',
                    backgroundImage: PURPLE_DOT_PATTERN,
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0, 5px 5px',
                    border:
                      opt.id === 'forcefield-protection'
                        ? '2.5px solid #6EFFB8'
                        : '2.5px solid #56D4FF',
                    boxShadow:
                      '2px 3px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(86, 212, 255, 0.45)',
                    cursor: 'pointer',
                    transition:
                      'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 120ms ease',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <AbilityIcon id={opt.id} size={18} />
                  </span>
                  <span
                    className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95] text-white"
                    style={{
                      fontSize: 'clamp(6.0px, 0.86vw, 7.4px)',
                      textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                    }}
                  >
                    {opt.name}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main 4/5-Slot Ability Bar */}
        <div
          className="fixed z-20 flex items-center select-none"
          style={{
            right:
              'calc(max(18px, var(--stage-safe-right, 0px) + 12px) + clamp(54px, 8.4vw, 66px) + clamp(10px, 1.8vw, 16px))',
            bottom: 'max(20px, calc(var(--stage-safe-bottom, 0px) + 14px))',
            gap: isFiveSlots
              ? 'clamp(4px, 0.85vw, 7px)'
              : 'clamp(6px, 1.1vw, 9px)',
            touchAction: 'manipulation',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
        >
          {effectiveAbilities.map((card, slotIdx) => {
            const isStolenSlotPopulated =
              slotIdx === 3 &&
              Boolean(stolenAbility) &&
              card.id === stolenAbility?.def.id;
            const isStolenPlaceholder = card.id === 'stolen-ability';
            const isCharged = isChargedAbility(card);
            const isDarkholdSelected = card.id === 'darkhold' && darkholdActive;
            const isMindControlSelected =
              card.id === 'mind-control' && mindControlPhase !== 'idle';
            const isAstralSelected =
              card.id === 'astral-projection' && astralActive;
            const isDiamondSelected =
              card.id === 'diamond-form' && diamondActive;
            const isTelepathicSelected =
              card.id === 'telepathic-wave' && telepathicWaveActive;
            const isSwordSummonSelected =
              card.id === 'sword-summon' && swordSummonActive;
            const isMagnetoTornadoSelected =
              card.id === 'metal-tornado' && magnetoTornadoActive;
            const isSuperSpeedSelected =
              card.id === 'super-speed' && superSpeedActive;
            const isRapidPunchSelected =
              card.id === 'rapid-punch-combo' && rapidPunchActive;
            const isSpeedBlitzSelected =
              card.id === 'speed-blitz' && speedBlitzActive;
            const isWindTornadoSelected =
              card.id === 'wind-tornado' && windTornadoActive;
            const isStrangeShieldSelected =
              card.id === 'mystic-shield' && strangeShieldActive;
            const isVisionLaserSelected =
              card.id === 'mind-stone-laser' && visionLaserActive;
            const isVisionHeadGripSelected =
              card.id === 'head-grip' && visionHeadGripActive;
            const isSupremeDrainSelected =
              card.id === 'chaos-drain' && supremeDrainActive;
            const isZombieBeamSelected =
              card.id === 'zombie-beam' && zombieBeamActive;
            const isZombieStoneSelected =
              card.id === 'zombie-stone-explosion' && zombieStoneActive;
            const isAgathaDarkholdSelected =
              card.id === 'agatha-darkhold' && agathaDarkholdActive;
            const isAgathaShieldSelected =
              card.id === 'agatha-shield' && agathaShieldActive;
            const isInvisSelected = card.id === 'invisibility' && invisibilityActive;
            const isForcefieldShieldSelected =
              card.id === 'forcefield-shield' && forcefieldShieldActive;
            const isPowerAbsorbSelected =
              card.id === 'power-absorption' && vampireAbsorbing;
            const isCapDefenseSelected =
              card.id === 'shield-defense' && capShieldDefenseActive;
            const isCapChargeSelected =
              card.id === 'shield-charge' && capShieldChargeActive;
            const isThorSlamSelected =
              card.id === 'lightning-slam' && thorSlamActive;
            const isThorBeamSelected =
              card.id === 'lightning-storm-beam' && thorStormBeamPhase !== 'idle';
            const isDamageAbsorptionSelected =
              card.id === 'damage-absorption' &&
              (damageAbsorptionActive || silverEnergyReady);
            const isDualCosmicBeamSelected =
              card.id === 'dual-cosmic-beam' && dualCosmicBeamActive;
            const isStormTornadoSelected =
              card.id === 'storm-tornado' && stormTornadoActive;
            const isStormIceSelected =
              card.id === 'ice-spear' && stormIceSpearActive;
            const isWindBlastSelected =
              card.id === 'wind-blast' && windBlastActive;
            const isToggleSelected =
              (isFlightAbility(card.id) && flightOn) ||
              (card.id === 'pain-infliction' && painChanneling) ||
              isDarkholdSelected ||
              isMindControlSelected ||
              isAstralSelected ||
              isDiamondSelected ||
              isTelepathicSelected ||
              isSwordSummonSelected ||
              isMagnetoTornadoSelected ||
              isSuperSpeedSelected ||
              isRapidPunchSelected ||
              isSpeedBlitzSelected ||
              isWindTornadoSelected ||
              isStrangeShieldSelected ||
              isVisionLaserSelected ||
              isVisionHeadGripSelected ||
              isSupremeDrainSelected ||
              isZombieBeamSelected ||
              isZombieStoneSelected ||
              isAgathaDarkholdSelected ||
              isAgathaShieldSelected ||
              isInvisSelected ||
              isForcefieldShieldSelected ||
              isPowerAbsorbSelected ||
              isCapDefenseSelected ||
              isCapChargeSelected ||
              isThorSlamSelected ||
              isThorBeamSelected ||
              isDamageAbsorptionSelected ||
              isDualCosmicBeamSelected ||
              isStormTornadoSelected ||
              isStormIceSelected ||
              isWindBlastSelected;
            const cd = cooldowns[card.id];
            const isOnStandardCd = cd !== undefined;
            const isChargeEmpty = isCharged && charges === 0;
            const blockedByPain = painChanneling && card.id !== 'pain-infliction';
            const blockedByMindControl =
              mindControlPhase === 'choosing' || mindControlPhase === 'mental-damage';
            const blockedByForcefield = forcefieldTransferPhase !== 'idle';
            const blockedByGroupLock = Boolean(lockedAbilityIds?.includes(card.id));
            const isDisabled =
              isStolenPlaceholder ||
              isOnStandardCd ||
              isChargeEmpty ||
              locked ||
              blockedByPain ||
              blockedByMindControl ||
              blockedByForcefield ||
              blockedByGroupLock;
            const isTriggerPulsing = triggerPulseId === card.id;

            const baseBg =
              isDarkholdSelected || isSupremeDrainSelected || isZombieBeamSelected
                ? '#2A0E22'
                : isStolenPlaceholder
                  ? '#252647'
                  : isToggleSelected
                    ? '#1C1D3A'
                    : '#353664';
            const pressOffsetY = isTriggerPulsing ? 1.5 : isToggleSelected ? 1 : 0;
            const scaleVal = isTriggerPulsing ? 0.94 : 1;

            return (
              <div
                key={isStolenSlotPopulated ? `stolen-${card.id}` : card.id}
                className="relative"
                style={{
                  transform: `rotate(${card.tiltDeg}deg)`,
                  opacity: isStolenPlaceholder
                    ? 0.72
                    : (locked ||
                          blockedByPain ||
                          blockedByMindControl ||
                          blockedByForcefield ||
                          blockedByGroupLock) &&
                        !isOnStandardCd &&
                        !isChargeEmpty
                      ? 0.56
                      : 1,
                  transition: 'opacity 120ms ease',
                }}
              >
                {/* Synchronized Red Circular Stack Counter */}
                {(card.maxCharges !== undefined || card.id === 'chaos-drain') && (
                  <div
                    key={card.id === 'chaos-drain' ? supremeStacks : chargeAnimKey}
                    className="pointer-events-none absolute z-30 flex items-center justify-center rounded-full font-cartoon font-bold italic text-white animate-charge-pop"
                    style={{
                      top: '-9px',
                      right: '-7px',
                      width: '21px',
                      height: '21px',
                      fontSize: '12px',
                      lineHeight: 1,
                      backgroundColor:
                        (card.id === 'chaos-drain' ? supremeStacks : charges) === 0
                          ? '#B82834'
                          : '#E53540',
                      border: '2px solid #0B0D18',
                      boxShadow: '1px 2px 0 rgba(8, 10, 18, 0.78)',
                    }}
                  >
                    {card.id === 'chaos-drain' ? supremeStacks : charges}
                  </div>
                )}

                {/* Compact Square Dotted Purple Cartoon Ability Card */}
                <button
                  type="button"
                  disabled={isDisabled}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (card.id === 'chaos-drain') {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      beginChaosDrainPress(e.pointerId);
                    } else {
                      activateAbility(card.id);
                    }
                  }}
                  onPointerUp={(e) => {
                    if (card.id === 'chaos-drain') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                      endChaosDrainPress(e.pointerId);
                    }
                  }}
                  onPointerCancel={(e) => {
                    if (card.id === 'chaos-drain') {
                      e.stopPropagation();
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                      endChaosDrainPress(e.pointerId);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (card.id === 'chaos-drain') {
                        if (!e.repeat) beginChaosDrainPress(-2);
                      } else {
                        activateAbility(card.id);
                      }
                    }
                  }}
                  onKeyUp={(e) => {
                    if (card.id === 'chaos-drain' && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      endChaosDrainPress(-2);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-pressed={
                    isFlightAbility(card.id) ||
                    card.id === 'pain-infliction' ||
                    card.id === 'darkhold' ||
                    card.id === 'mind-control' ||
                    card.id === 'astral-projection' ||
                    card.id === 'diamond-form' ||
                    card.id === 'telepathic-wave' ||
                    card.id === 'sword-summon' ||
                    card.id === 'metal-tornado' ||
                    card.id === 'super-speed' ||
                    card.id === 'wind-tornado' ||
                    card.id === 'mystic-shield' ||
                    card.id === 'chaos-drain' ||
                    card.id === 'zombie-beam' ||
                    card.id === 'agatha-darkhold' ||
                    card.id === 'agatha-shield' ||
                    card.id === 'invisibility' ||
                    card.id === 'forcefield-shield' ||
                    card.id === 'shield-defense' ||
                    card.id === 'damage-absorption' ||
                    card.id === 'storm-tornado' ||
                    card.id === 'wind-blast'
                      ? isToggleSelected
                      : undefined
                  }
                  aria-label={card.name}
                  className="relative flex flex-col items-center justify-center gap-[2px] overflow-hidden rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    width: isFiveSlots
                      ? 'clamp(44px, 6.8vw, 55px)'
                      : 'clamp(50px, 7.8vw, 62px)',
                    height: isFiveSlots
                      ? 'clamp(44px, 6.8vw, 55px)'
                      : 'clamp(50px, 7.8vw, 62px)',
                    padding: '3px',
                    backgroundColor: baseBg,
                    backgroundImage:
                      isDarkholdSelected || isSupremeDrainSelected || isZombieBeamSelected
                        ? DARKHOLD_DOT_PATTERN
                        : isAgathaDarkholdSelected
                          ? AGATHA_DARKHOLD_DOT_PATTERN
                          : PURPLE_DOT_PATTERN,
                    backgroundSize: '11px 11px',
                    backgroundPosition: '0 0, 5.5px 5.5px',
                    border:
                      isDarkholdSelected || isSupremeDrainSelected || isZombieBeamSelected || isZombieStoneSelected
                        ? '2.5px solid #FF3B5C'
                        : isAgathaDarkholdSelected || isAgathaShieldSelected
                          ? '2.5px solid #CE78FF'
                          : card.id === 'pain-infliction' && painChanneling
                            ? '2.5px solid #FFA726'
                            : isMindControlSelected || isTelepathicSelected || isAstralSelected
                              ? '2.5px solid #80DCFF'
                              : isInvisSelected || isForcefieldShieldSelected || isThorSlamSelected || isThorBeamSelected
                                ? '2.5px solid #56D4FF'
                                : isDamageAbsorptionSelected ||
                                    isDualCosmicBeamSelected ||
                                    isStormTornadoSelected ||
                                    isStormIceSelected ||
                                    isWindBlastSelected
                                  ? '2.5px solid #9CE0FF'
                                    : isCapDefenseSelected || isCapChargeSelected
                                      ? '2.5px solid #60A5FA'
                                      : isDiamondSelected
                                        ? '2.5px solid #D8F5FF'
                                        : isSwordSummonSelected
                                          ? '2.5px solid #3CE66B'
                                          : isMagnetoTornadoSelected
                                            ? '2.5px solid #D06BFF'
                                            : isPowerAbsorbSelected
                                              ? '2.5px solid #4ADE80'
                                              : isStrangeShieldSelected
                                                ? '2.5px solid #FFA438'
                                                : isVisionLaserSelected ||
                                                    isVisionHeadGripSelected
                                                  ? '2.5px solid #FFE44D'
                                                  : isSuperSpeedSelected ||
                                                      isRapidPunchSelected ||
                                                      isSpeedBlitzSelected ||
                                                      isWindTornadoSelected
                                                    ? isSpeedMode
                                                      ? '2.5px solid #52FFA8'
                                                      : '2.5px solid #5CE1FF'
                                                    : '2.5px solid #0B0D18',
                    boxShadow: isDarkholdSelected
                      ? '1px 1.5px 0 rgba(8, 10, 18, 0.92), inset 0 0 0 1.5px rgba(255, 78, 108, 0.56)'
                      : isToggleSelected
                        ? '1px 1.5px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(255, 168, 96, 0.56)'
                        : '2px 3px 0 rgba(8, 10, 18, 0.85), inset 0 0 0 1.5px rgba(155, 160, 230, 0.22)',
                    transform: `translateY(${pressOffsetY}px) scale(${scaleVal})`,
                    cursor: isDisabled ? 'default' : 'pointer',
                    transition:
                      'transform 110ms cubic-bezier(0.16, 1, 0.3, 1), background-color 140ms ease, box-shadow 140ms ease',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <AbilityIcon
                      id={card.id}
                      size={isStolenPlaceholder ? 26 : isFiveSlots ? 18 : 20}
                      variant={quicksilverVariant}
                    />
                  </span>

                  {!isStolenPlaceholder && (
                    <span
                      className="relative z-10 font-cartoon font-bold italic uppercase text-center leading-[0.95]"
                      style={{
                        fontSize: isFiveSlots
                          ? card.name.length > 9
                            ? 'clamp(5.6px, 0.82vw, 6.8px)'
                            : 'clamp(6.6px, 0.92vw, 7.8px)'
                          : card.name.length > 10
                            ? 'clamp(6.4px, 0.92vw, 7.8px)'
                            : 'clamp(7.5px, 1.05vw, 9px)',
                        color: isToggleSelected ? 'rgba(255, 224, 232, 0.96)' : '#FFFFFF',
                        textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.94)',
                      }}
                    >
                      {card.name}
                    </span>
                  )}

                  {/* Stack recharge progress bar */}
                  {isCharged && isRecharging && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/80"
                    >
                      <div
                        ref={chargeBarRef}
                        className="h-full w-full"
                        style={{
                          backgroundColor:
                            card.id === 'phoenix-fireballs' ? '#FF981A' : '#FF4D6A',
                          transformOrigin: 'left center',
                          transform: 'scaleX(0)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 12s Darkhold summon countdown bar */}
                  {card.id === 'darkhold' && darkholdActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={darkholdBarRef}
                        className="h-full w-full bg-[#FF3B5C]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 5s Pain Infliction channel countdown bar */}
                  {card.id === 'pain-infliction' && painChanneling && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={painBarRef}
                        className="h-full w-full bg-[#FFA726]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 3.0s Mind Control Mental Damage countdown bar */}
                  {card.id === 'mind-control' && mindControlPhase === 'mental-damage' && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={mindControlBarRef}
                        className="h-full w-full bg-[#80DCFF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 15s Diamond Form countdown bar */}
                  {card.id === 'diamond-form' && diamondActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={diamondBarRef}
                        className="h-full w-full bg-[#D8F5FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 2.4s Telepathic Wave channel countdown bar */}
                  {card.id === 'telepathic-wave' && telepathicWaveActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={telepathicBarRef}
                        className="h-full w-full bg-[#80DCFF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 10s Astral Form countdown bar */}
                  {card.id === 'astral-projection' && astralActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={astralBarRef}
                        className="h-full w-full bg-[#80DCFF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active 14s Sword Summon countdown bar */}
                  {card.id === 'sword-summon' && swordSummonActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={swordSummonBarRef}
                        className="h-full w-full bg-[#3CE66B]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Magneto Tornado countdown bar */}
                  {card.id === 'metal-tornado' && magnetoTornadoActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={magnetoTornadoBarRef}
                        className="h-full w-full bg-[#C66BFF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Quicksilver Rapid Punch 2.0s countdown bar */}
                  {card.id === 'rapid-punch-combo' && rapidPunchActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={rapidPunchBarRef}
                        className="h-full w-full bg-[#5CE1FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Speed Blitz 1.1s countdown bar */}
                  {card.id === 'speed-blitz' && speedBlitzActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={speedBlitzBarRef}
                        className="h-full w-full bg-[#52FFA8]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Quicksilver / Speed Wind Tornado countdown bar */}
                  {card.id === 'wind-tornado' && windTornadoActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={windTornadoBarRef}
                        className="h-full w-full"
                        style={{
                          backgroundColor: isSpeedMode ? '#B8FFE0' : '#B8F0FF',
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Doctor Strange Shield countdown bar */}
                  {card.id === 'mystic-shield' && strangeShieldActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={strangeShieldBarRef}
                        className="h-full w-full bg-[#FFA438]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Vision Mind Laser countdown bar */}
                  {card.id === 'mind-stone-laser' && visionLaserActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={visionLaserBarRef}
                        className="h-full w-full bg-[#FFF078]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Vision Head Grip countdown bar */}
                  {card.id === 'head-grip' && visionHeadGripActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={visionHeadGripBarRef}
                        className="h-full w-full bg-[#FFD438]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Wanda Zombie Beam 3.0s countdown bar */}
                  {card.id === 'zombie-beam' && zombieBeamActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={zombieBeamBarRef}
                        className="h-full w-full bg-[#FF3B5C]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Agatha Purple Darkhold 12.0s countdown bar */}
                  {card.id === 'agatha-darkhold' && agathaDarkholdActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={agathaDarkholdBarRef}
                        className="h-full w-full bg-[#CE78FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Agatha Absorption Shield 6.0s countdown bar */}
                  {card.id === 'agatha-shield' && agathaShieldActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={agathaShieldBarRef}
                        className="h-full w-full bg-[#BA5AFF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Invisible Woman 10s Invisibility countdown bar */}
                  {card.id === 'invisibility' && invisibilityActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={invisBarRef}
                        className="h-full w-full bg-[#56D4FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Invisible Woman 10s Forcefield Shield countdown bar */}
                  {card.id === 'forcefield-shield' && forcefieldShieldActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={forcefieldShieldBarRef}
                        className="h-full w-full bg-[#56D4FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Vampire 3.0s Power Absorption channel bar */}
                  {card.id === 'power-absorption' && vampireAbsorbing && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={vampireAbsorbBarRef}
                        className="h-full w-full bg-[#4ADE80]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Captain America 4.0s Shield Charge bar */}
                  {card.id === 'shield-charge' && capShieldChargeActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={capShieldChargeBarRef}
                        className="h-full w-full bg-[#60A5FA]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Thor Lightning Storm Beam channel + beam bar */}
                  {card.id === 'lightning-storm-beam' && thorStormBeamPhase !== 'idle' && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={thorStormBarRef}
                        className="h-full w-full bg-[#56D4FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Silver Surfer 5.0s Dual Cosmic Beam countdown bar */}
                  {card.id === 'dual-cosmic-beam' && dualCosmicBeamActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={dualCosmicBeamBarRef}
                        className="h-full w-full bg-[#BAE6FD]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Storm 5.5s Tornado countdown bar */}
                  {card.id === 'storm-tornado' && stormTornadoActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={stormTornadoBarRef}
                        className="h-full w-full bg-[#9CE0FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Active Storm 6.0s Wind Blast countdown bar */}
                  {card.id === 'wind-blast' && windBlastActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[4px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={windBlastBarRef}
                        className="h-full w-full bg-[#9CE0FF]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Copied Ability 40s lifetime indicator bar along top edge of Slot 4 */}
                  {isStolenSlotPopulated && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[3.5px] bg-[#0B0D18]/85"
                    >
                      <div
                        ref={stolenTimerBarRef}
                        className="h-full w-full bg-[#FACC15]"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'scaleX(1)',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                  )}

                  {/* Dark reveal wipe for standard cooldowns OR while 0 charges remain */}
                  {(isOnStandardCd || isChargeEmpty) && (
                    <div
                      ref={(el) => {
                        veilRefs.current[card.id] = el;
                      }}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-20"
                      style={{
                        backgroundColor: 'rgba(10, 11, 24, 0.74)',
                        borderTop: '1.5px solid rgba(190, 195, 255, 0.32)',
                        transformOrigin: 'bottom center',
                        transform: 'scaleY(1)',
                        willChange: 'transform',
                      }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </>
    );
    },
  ),
);
