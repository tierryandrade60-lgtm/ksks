export type StatusEffectCategory =
  | 'no-powers'
  | 'paralyzed'
  | 'health-recovery'
  | 'dot'
  | 'shield';

export interface ActiveStatusEffect {
  id: StatusEffectCategory;
  label: string;
  description: string;
  /** Remaining seconds (Infinity for indefinite duration until deactivated) */
  remainingSec: number;
  /** Total duration seconds for countdown wipe overlay */
  totalSec: number;
}

export interface ProtectedTagSnapshot {
  active: boolean;
  screenX: number;
  screenY: number;
  /** 0..1 progress of popup animation */
  progress: number;
  color: string;
}

export interface ShieldBarSnapshot {
  active: boolean;
  hp: number;
  maxHp: number;
  screenX: number;
  screenY: number;
  color: string;
}

export interface EnergyBarSnapshot {
  active: boolean;
  energy: number;
  maxEnergy: number;
  unlockThreshold: number;
  screenX: number;
  screenY: number;
  ready: boolean;
  color: string;
}

export interface KillStreakHudSnapshot {
  count: number;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface MultiKillEvent {
  count: number;
  title: string;
  key: number;
}

export interface PlayerCombatTelemetry {
  playerHeadVisible: boolean;
  playerHeadX: number;
  playerHeadY: number;
  killStreak: number;
  playerShield: ShieldBarSnapshot;
  playerEnergy: EnergyBarSnapshot;
  protectedTags: ProtectedTagSnapshot[];
  statusEffects: ActiveStatusEffect[];
}
