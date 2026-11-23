export type AbilityId =
  | 'flight'
  | 'chaos-bolt'
  | 'darkhold'
  | 'chaos-implosion'
  | 'teleport'
  | 'telekinetic-explosion'
  | 'auto-shield'
  | 'phoenix-wave'
  | 'phoenix-fireballs'
  | 'pain-infliction'
  | 'phoenix-flight'
  | 'mind-control'
  | 'mc-paralysis'
  | 'mc-sleep'
  | 'mc-mental-damage'
  | 'mental-attack'
  | 'diamond-form'
  | 'telepathic-wave'
  | 'diamond-projectile'
  | 'sword-summon'
  | 'green-explosion'
  | 'spinning-leap'
  | 'ground-sword'
  | 'crown-form'
  | 'throw-sword'
  | 'sword-slash'
  | 'magneto-flight'
  | 'metal-projectile'
  | 'magnetic-meteor'
  | 'metal-tornado'
  | 'super-speed'
  | 'rapid-punch-combo'
  | 'speed-blitz'
  | 'wind-tornado'
  | 'time-stop'
  | 'cloak-flight'
  | 'mystic-shield'
  | 'astral-extraction'
  | 'mystic-clones'
  | 'eldritch-discs'
  | 'phoenix-dive'
  | 'vision-flight'
  | 'intangibility'
  | 'mind-stone-laser'
  | 'mind-stone-projectile'
  | 'head-grip'
  | 'astral-projection'
  | 'chaos-drain'
  | 'zombie-beam'
  | 'zombie-stone-explosion'
  | 'agatha-flight'
  | 'agatha-bolt'
  | 'agatha-darkhold'
  | 'agatha-teleport'
  | 'agatha-darkhold-blast'
  | 'agatha-auto-shield'
  | 'agatha-shield'
  | 'purgatory-grasp'
  | 'invisible-flight'
  | 'invisibility'
  | 'forcefield-shield'
  | 'forcefield-barrier'
  | 'forcefield-transfer'
  | 'forcefield-protection'
  | 'forcefield-suffocation'
  | 'vampire-flight'
  | 'ground-stomp'
  | 'vampire-bolt'
  | 'power-absorption'
  | 'stolen-ability'
  | 'bandit-gun'
  | 'prisoner-punch'
  | 'shield-throw'
  | 'shield-defense'
  | 'shield-combo'
  | 'shield-charge'
  | 'mjolnir-combo'
  | 'mjolnir-throw'
  | 'lightning-slam'
  | 'lightning-storm-beam'
  | 'cosmic-flight'
  | 'damage-absorption'
  | 'sonic-blast'
  | 'cosmic-blast'
  | 'dual-cosmic-beam'
  | 'storm-flight'
  | 'lightning-strike'
  | 'storm-tornado'
  | 'ice-spear'
  | 'wind-blast';

export type AbilityTypeLabel =
  | 'Toggle'
  | 'Summon'
  | 'Defense'
  | 'Projectile'
  | 'Targeted'
  | 'Targeted Area Attack'
  | 'Area Attack';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  type: AbilityTypeLabel;
  description: string;
  tiltDeg: number;
  maxCharges?: number;
  cooldownMs: number;
  stepCooldownMs?: number;
  durationMs?: number;
}

export const DARKHOLD_DURATION_MS = 12000;
export const AUTO_SHIELD_DURATION_MS = 10000;
export const AUTO_SHIELD_MAX_ABSORB = 100;
export const PHOENIX_SPECIAL_REVIVAL_COOLDOWN_MS = 60000;

export const EMMA_MC_PARALYSIS_MS = 5000;
export const EMMA_MC_SLEEP_MS = 4000;
export const EMMA_MC_MENTAL_DMG_MS = 3000;
export const EMMA_MIND_CONTROL_COOLDOWN_MS = 9000;
export const EMMA_ASTRAL_MAX_DURATION_MS = 10000;
export const EMMA_ASTRAL_COOLDOWN_MS = 8500;
export const EMMA_DIAMOND_DURATION_MS = 15000;
export const EMMA_DIAMOND_COOLDOWN_MS = 8000;
export const EMMA_DIAMOND_PROJECTILE_COOLDOWN_MS = 1200;

export const HELA_CROWN_DURATION_MS = 15000;
export const HELA_CROWN_COOLDOWN_MS = 20000;
export const HELA_SWORD_SUMMON_DURATION_MS = 14000;
export const HELA_SWORD_APPEAR_MS = 1000;
export const HELA_SWORD_THROW_READY_MS = 1450;
export const HELA_SWORD_SLASH_COOLDOWN_MS = 800;
export const HELA_CROWN_BONUS_DAMAGE = 5;

export const SCARLET_WITCH_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Levitate swiftly on swirling dark-red chaos mist with responsive directional aerial tilt.',
    tiltDeg: 2.0,
    cooldownMs: 2500,
  },
  {
    id: 'chaos-bolt',
    name: 'CHAOS BOLT',
    type: 'Projectile',
    description:
      'Alternates hands to fire 3 hex stacks dealing 30 damage each. Recharges 1 stack every 1.5s.',
    tiltDeg: -1.8,
    maxCharges: 3,
    stepCooldownMs: 300,
    cooldownMs: 1500,
  },
  {
    id: 'darkhold',
    name: 'DARKHOLD',
    type: 'Summon',
    description:
      'Summon the floating Book of Sins for 12s, unlocking Teleport, Telekinetic Explosion, and Automatic Shield.',
    tiltDeg: 1.6,
    cooldownMs: 9000,
    durationMs: DARKHOLD_DURATION_MS,
  },
  {
    id: 'chaos-implosion',
    name: 'CHAOS EXPLOSION',
    type: 'Targeted Area Attack',
    description:
      'Unleash a supernatural crimson sphere that expands outward, pulling nearby foes inward into a 2s ragdoll.',
    tiltDeg: -1.8,
    cooldownMs: 6500,
  },
];

export const SCARLET_WITCH_SUPREME_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  SCARLET_WITCH_ABILITIES[0],
  SCARLET_WITCH_ABILITIES[1],
  {
    id: 'chaos-drain',
    name: 'ENERGY DRAIN',
    type: 'Targeted',
    description:
      'Hold to channel a widening dark-red Chaos beam draining target health & charging up to 2 stacks. Tap to fire a Chaos blast.',
    tiltDeg: 1.6,
    maxCharges: 2,
    cooldownMs: 0,
  },
  SCARLET_WITCH_ABILITIES[3],
];

export const SCARLET_WITCH_ZOMBIE_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    ...SCARLET_WITCH_ABILITIES[0],
    description:
      'Levitate swiftly on dark-crimson undead chaos mist with responsive directional aerial tilt.',
  },
  {
    ...SCARLET_WITCH_ABILITIES[1],
    description:
      'Alternates hands to fire 3 dark-crimson hex stacks dealing 30 damage each. Recharges 1 stack every 1.5s.',
  },
  {
    id: 'zombie-beam',
    name: 'CHAOS BEAM',
    type: 'Targeted',
    description:
      'Project a continuous dark-crimson beam of corrupted Chaos energy from your right hand onto the selected target.',
    tiltDeg: 1.6,
    cooldownMs: 5500,
    durationMs: 3000,
  },
  {
    id: 'zombie-stone-explosion',
    name: 'STONE CHAOS',
    type: 'Area Attack',
    description:
      'Rise into the air and gather surrounding stones around yourself before blasting them outward in a dark-red Chaos explosion.',
    tiltDeg: -1.8,
    cooldownMs: 8500,
  },
];

export const AGATHA_DARKHOLD_DURATION_MS = 12000;
export const AGATHA_SHIELD_DURATION_MS = 6000;

export const AGATHA_HARKNESS_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'agatha-flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Levitate with controlled dark-purple witch magic and swirling corrupted mist trails beneath your gown.',
    tiltDeg: 2.0,
    cooldownMs: 1800,
  },
  {
    id: 'agatha-bolt',
    name: 'MAGIC BOLT',
    type: 'Projectile',
    description:
      'Launch a dark corrupted-purple bolt that erupts on impact in a dense blast of purple smoke and mist (28 dmg).',
    tiltDeg: -1.7,
    cooldownMs: 850,
  },
  {
    id: 'agatha-darkhold',
    name: 'DARKHOLD',
    type: 'Summon',
    description:
      'Summon Agatha’s purple Darkhold for 12s, unlocking Teleport, Arcane Blast, and Mystic Shield.',
    tiltDeg: -1.6,
    cooldownMs: 9000,
    durationMs: AGATHA_DARKHOLD_DURATION_MS,
  },
  {
    id: 'agatha-shield',
    name: 'ABSORB SHIELD',
    type: 'Defense',
    description:
      'Immobilize yourself in purple mist for 6s tracking damage taken. Incoming Beams or 2 hits trigger absorption, healing tracked damage and draining the attacker.',
    tiltDeg: 1.7,
    cooldownMs: 11000,
    durationMs: AGATHA_SHIELD_DURATION_MS,
  },
];

export const AGATHA_DARKHOLD_SUB_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'agatha-teleport',
    name: 'TELEPORT',
    type: 'Targeted',
    description:
      'Vanish into dark-purple witch mist while invulnerable, then reappear at the aimed spot.',
    tiltDeg: -1.5,
    cooldownMs: 4000,
  },
  {
    id: 'agatha-darkhold-blast',
    name: 'ARCANE BLAST',
    type: 'Area Attack',
    description:
      'Unleash a corrupted purple arcane shockwave (28 dmg), blasting nearby foes into a 2s ragdoll.',
    tiltDeg: 1.4,
    cooldownMs: 4500,
  },
  {
    id: 'agatha-auto-shield',
    name: 'MYSTIC SHIELD',
    type: 'Defense',
    description:
      'Project a dark-purple Darkhold barrier for up to 10s that absorbs up to 100 damage points.',
    tiltDeg: -1.6,
    cooldownMs: 6500,
    durationMs: AUTO_SHIELD_DURATION_MS,
  },
];

export const DARKHOLD_SUB_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'teleport',
    name: 'TELEPORT',
    type: 'Targeted',
    description:
      'Vanish into crimson mist for 0.5s while invulnerable, then reappear at the aimed spot.',
    tiltDeg: -1.5,
    cooldownMs: 4000,
  },
  {
    id: 'telekinetic-explosion',
    name: 'TK BLAST',
    type: 'Area Attack',
    description:
      'Unleash an outward scarlet telekinetic shockwave (28 dmg), blasting nearby foes into a 2s ragdoll.',
    tiltDeg: 1.4,
    cooldownMs: 4500,
  },
  {
    id: 'auto-shield',
    name: 'AUTO SHIELD',
    type: 'Defense',
    description:
      'Project a subtle dark-red barrier for up to 10s that absorbs up to 100 damage points.',
    tiltDeg: -1.6,
    cooldownMs: 6500,
    durationMs: AUTO_SHIELD_DURATION_MS,
  },
];

export const PHOENIX_FORCE_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'phoenix-wave',
    name: 'PHOENIX WAVE',
    type: 'Area Attack',
    description:
      'Three consecutive ground fire explosions (right, left, both hands), dealing 20 damage each, 3s burn, knockback & ragdoll.',
    tiltDeg: 2.0,
    cooldownMs: 5500,
  },
  {
    id: 'phoenix-fireballs',
    name: 'PHOENIX FIREBALLS',
    type: 'Projectile',
    description:
      'Five independent fireball charges dealing 10 damage each and applying burning damage over time.',
    tiltDeg: -1.8,
    maxCharges: 5,
    stepCooldownMs: 220,
    cooldownMs: 1200,
  },
  {
    id: 'pain-infliction',
    name: 'PAIN INFLICTION',
    type: 'Targeted',
    description:
      'Channel on a target for 5s (5 dmg/s) while immune to damage. Ends in a fire blast (10 AoE dmg) & 2s ragdoll.',
    tiltDeg: 1.6,
    cooldownMs: 7500,
  },
  {
    id: 'phoenix-flight',
    name: 'PHOENIX FLIGHT',
    type: 'Toggle',
    description:
      'Fast aerial spin activation rising into graceful flight with animated fiery wings and ember trails.',
    tiltDeg: -1.8,
    cooldownMs: 2500,
  },
];

export const PHOENIX_DIVE_ABILITY: AbilityDefinition = {
  id: 'phoenix-dive',
  name: 'SOLAR DIVE',
  type: 'Targeted Area Attack',
  description:
    'Available during Flight: launch diagonally upward, hover for 3s while aiming, then dive onto the ground (double-tap to launch early) in a burning fire explosion.',
  tiltDeg: -1.6,
  cooldownMs: 9000,
  durationMs: 3000,
};

export const EMMA_FROST_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'astral-projection',
    name: 'ASTRAL FORM',
    type: 'Toggle',
    description:
      'Leave your body intangible in a glowing psychic astral projection for up to 10s, gaining swift mobility and damage immunity.',
    tiltDeg: 2.0,
    cooldownMs: EMMA_ASTRAL_COOLDOWN_MS,
    durationMs: EMMA_ASTRAL_MAX_DURATION_MS,
  },
  {
    id: 'mental-attack',
    name: 'MENTAL ATTACK',
    type: 'Targeted',
    description:
      'Focus psychic energy from your forehead to blast a target’s mind for 15 damage with a telepathic burst.',
    tiltDeg: -1.8,
    cooldownMs: 1400,
  },
  {
    id: 'diamond-form',
    name: 'DIAMOND FORM',
    type: 'Toggle',
    description:
      'Transform into living crystal for up to 15s (150 Shield durability), absorbing hits and unlocking Diamond Shard projectiles.',
    tiltDeg: 1.6,
    cooldownMs: EMMA_DIAMOND_COOLDOWN_MS,
    durationMs: EMMA_DIAMOND_DURATION_MS,
  },
  {
    id: 'telepathic-wave',
    name: 'TELEPATHIC WAVE',
    type: 'Targeted Area Attack',
    description:
      'Emit expanding circular psychic waves from your forehead, dealing periodic damage and stunning foes with pain.',
    tiltDeg: -1.8,
    cooldownMs: 7500,
  },
];

export const EMMA_WHITE_QUEEN_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'mind-control',
    name: 'MIND CONTROL',
    type: 'Targeted',
    description:
      'Link minds with the selected target to unleash Paralysis (5s lock), Sleep (4s ragdoll), or Mental Damage (3s beam).',
    tiltDeg: 2.0,
    cooldownMs: EMMA_MIND_CONTROL_COOLDOWN_MS,
  },
  ...EMMA_FROST_ABILITIES.slice(1),
];

export const EMMA_MIND_CONTROL_OPTIONS: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'mc-paralysis',
    name: 'PARALYSIS',
    type: 'Targeted',
    description:
      'Immobilize the target completely for 5s with a psychic white aura while they remain vulnerable to incoming damage.',
    tiltDeg: -1.2,
    cooldownMs: 0,
    durationMs: EMMA_MC_PARALYSIS_MS,
  },
  {
    id: 'mc-sleep',
    name: 'SLEEP',
    type: 'Targeted',
    description:
      'Severely overwhelm the target’s consciousness, dropping them into an unconscious 4s ragdoll.',
    tiltDeg: 0,
    cooldownMs: 0,
    durationMs: EMMA_MC_SLEEP_MS,
  },
  {
    id: 'mc-mental-damage',
    name: 'MENTAL DMG',
    type: 'Targeted',
    description:
      'Sustain a 3s psychic beam locking both Emma and the target in place while inflicting continuous mental damage.',
    tiltDeg: 1.2,
    cooldownMs: 0,
    durationMs: EMMA_MC_MENTAL_DMG_MS,
  },
];

export const EMMA_DIAMOND_PROJECTILE: AbilityDefinition = {
  id: 'diamond-projectile',
  name: 'DIAMOND SHARD',
  type: 'Projectile',
  description: 'Launch a razor crystal shard dealing 22 damage on impact.',
  tiltDeg: -1.5,
  cooldownMs: EMMA_DIAMOND_PROJECTILE_COOLDOWN_MS,
};

export const HELA_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'sword-summon',
    name: 'SWORD SUMMON',
    type: 'Summon',
    description:
      'Conjure dual Necroswords for 14s and unlock alternating thrown and close-range slash attacks.',
    tiltDeg: 2.0,
    cooldownMs: 8000,
    durationMs: HELA_SWORD_SUMMON_DURATION_MS,
  },
  {
    id: 'green-explosion',
    name: 'GREEN EXPLOSION',
    type: 'Area Attack',
    description:
      'Gather swirling emerald energy and slam downward, unleashing a massive explosion (32 dmg) with billowing mist.',
    tiltDeg: -1.8,
    cooldownMs: 6500,
  },
  {
    id: 'spinning-leap',
    name: 'SPINNING LEAP',
    type: 'Targeted',
    description:
      'Propels Hela upward and forward in a fierce aerial spin, landing in a poised crouched impact stance.',
    tiltDeg: 1.6,
    cooldownMs: 5000,
  },
  {
    id: 'ground-sword',
    name: 'GROUND SWORD',
    type: 'Targeted Area Attack',
    description:
      'Erupt a gigantic Necrosword straight out of the earth at the aimed target (35 dmg & knockback).',
    tiltDeg: -1.8,
    cooldownMs: 6500,
  },
];

export const HELA_CROWN_FORM: AbilityDefinition = {
  id: 'crown-form',
  name: 'CROWN FORM',
  type: 'Toggle',
  description:
    'Manifest Hela’s antlered crown for 15s, granting +5 bonus damage to Sword Summon throws, Green Explosion, and Ground Sword.',
  tiltDeg: 1.6,
  cooldownMs: HELA_CROWN_COOLDOWN_MS,
  durationMs: HELA_CROWN_DURATION_MS,
};

export const HELA_THROW_SWORD: AbilityDefinition = {
  id: 'throw-sword',
  name: 'THROW SWORD',
  type: 'Projectile',
  description:
    'Alternate throwing your right and left conjured Necroswords (25 dmg). Embedded blades linger before returning.',
  tiltDeg: -1.6,
  cooldownMs: HELA_SWORD_THROW_READY_MS,
};

export const HELA_SWORD_SLASH: AbilityDefinition = {
  id: 'sword-slash',
  name: 'SLASH',
  type: 'Targeted',
  description:
    'Strike an adjacent enemy at close range with a right, left, or coordinated dual-sword slash.',
  tiltDeg: 1.5,
  cooldownMs: HELA_SWORD_SLASH_COOLDOWN_MS,
};

// --- MAGNETO ---
export const MAGNETO_TORNADO_DURATION_MS = 5500;

export const MAGNETO_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'magneto-flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Levitate inside an automatic Magnetic Shield (exclusively active while flying). Land to cast offensive powers.',
    tiltDeg: 2.0,
    cooldownMs: 1400,
  },
  {
    id: 'metal-projectile',
    name: 'METAL LAUNCH',
    type: 'Projectile',
    description:
      'Alternate right and left hands to hurl heavy steel beams crackling with purple lightning (30 dmg).',
    tiltDeg: -1.7,
    cooldownMs: 550,
  },
  {
    id: 'magnetic-meteor',
    name: 'MAG METEOR',
    type: 'Targeted Area Attack',
    description:
      'Rise skyward to fuse surrounding metal debris into a colossal meteor, crashing down for 55 AoE dmg and 2s ragdoll.',
    tiltDeg: 1.6,
    cooldownMs: 9000,
  },
  {
    id: 'metal-tornado',
    name: 'METAL VORTEX',
    type: 'Area Attack',
    description:
      'Levitate inside a roaring tornado of spinning steel and purple lightning, pulling foes into orbit and damaging them continuously.',
    tiltDeg: 1.7,
    cooldownMs: 10500,
    durationMs: MAGNETO_TORNADO_DURATION_MS,
  },
];

// --- QUICKSILVER & SPEED ---
export const QUICKSILVER_COMBO_DURATION_MS = 2000;
export const QUICKSILVER_TORNADO_MAX_DURATION_MS = 5000;
export const QUICKSILVER_TIMESTOP_DURATION_MS = 5500;
export const SPEED_BLITZ_DURATION_MS = 1100;

export const QUICKSILVER_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'super-speed',
    name: 'SUPER SPEED',
    type: 'Toggle',
    description:
      'Accelerate to supersonic velocity with blue lightning arcs, speedster afterimages, and rapid forward sprint animations.',
    tiltDeg: 2.0,
    cooldownMs: 1500,
  },
  {
    id: 'rapid-punch-combo',
    name: 'RAPID PUNCH',
    type: 'Targeted',
    description:
      'Requires a target: blitz directly in front of them for a 2s unstoppable flurry of blue-lightning punches, ending in a ragdoll launch.',
    tiltDeg: -1.8,
    cooldownMs: 8000,
    durationMs: QUICKSILVER_COMBO_DURATION_MS,
  },
  {
    id: 'wind-tornado',
    name: 'WIND TORNADO',
    type: 'Toggle',
    description:
      'Whip up a 5s supersonic wind tornado that traps nearby foes and damages them continuously before releasing them cleanly to the ground.',
    tiltDeg: 1.6,
    cooldownMs: 6500,
    durationMs: QUICKSILVER_TORNADO_MAX_DURATION_MS,
  },
  {
    id: 'time-stop',
    name: 'TIME STOP',
    type: 'Area Attack',
    description:
      'Slam the ground to expand a translucent blue stasis sphere; any enemy touching it is completely paralyzed until time resumes.',
    tiltDeg: -1.8,
    cooldownMs: 10500,
    durationMs: QUICKSILVER_TIMESTOP_DURATION_MS,
  },
];

export const QUICKSILVER_SPEED_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'super-speed',
    name: 'SUPER SPEED',
    type: 'Toggle',
    description:
      'Accelerate to supersonic velocity with green lightning arcs, speedster afterimages, and rapid forward sprint animations.',
    tiltDeg: 2.0,
    cooldownMs: 1500,
  },
  {
    id: 'speed-blitz',
    name: 'SPEED BLITZ',
    type: 'Targeted Area Attack',
    description:
      'Rapidly dash between nearby enemies with green lightning, punching each once with strong knockback and ragdoll during the push.',
    tiltDeg: -1.8,
    cooldownMs: 8000,
    durationMs: SPEED_BLITZ_DURATION_MS,
  },
  {
    id: 'wind-tornado',
    name: 'WIND TORNADO',
    type: 'Toggle',
    description:
      'Whip up a 5s supersonic green wind tornado that traps nearby foes and damages them continuously before releasing them cleanly to the ground.',
    tiltDeg: 1.6,
    cooldownMs: 6500,
    durationMs: QUICKSILVER_TORNADO_MAX_DURATION_MS,
  },
  {
    id: 'time-stop',
    name: 'TIME STOP',
    type: 'Area Attack',
    description:
      'Slam the ground to expand a translucent green stasis sphere; any enemy touching it is completely paralyzed until time resumes.',
    tiltDeg: -1.8,
    cooldownMs: 10500,
    durationMs: QUICKSILVER_TIMESTOP_DURATION_MS,
  },
];

// --- DOCTOR STRANGE ---
export const STRANGE_SHIELD_MAX_DURATION_MS = 10000;
export const STRANGE_CLONES_DURATION_MS = 4000;

export const DOCTOR_STRANGE_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'cloak-flight',
    name: 'CLOAK FLIGHT',
    type: 'Toggle',
    description:
      'Soar effortlessly as the Cloak of Levitation lifts you with billowing aerial fabric motion.',
    tiltDeg: 2.0,
    cooldownMs: 1400,
  },
  {
    id: 'purgatory-grasp',
    name: "PURGATORY'S GRASP",
    type: 'Targeted Area Attack',
    description:
      'Summon layered blue mystic rings beneath nearby enemies, lifting them face-up before slamming them forcefully to the ground.',
    tiltDeg: -1.8,
    cooldownMs: 7500,
  },
  {
    id: 'mystic-clones',
    name: 'CLONES & CHAINS',
    type: 'Targeted',
    description:
      'Requires a target: weave eldritch gestures to summon mystic clones that restrain the enemy inside rotating runes for 4s.',
    tiltDeg: 1.6,
    cooldownMs: 9500,
    durationMs: STRANGE_CLONES_DURATION_MS,
  },
  {
    id: 'eldritch-discs',
    name: 'ELDRITCH DISC',
    type: 'Projectile',
    description:
      'Launch horizontal rotating orange magical discs forward with trailing sparks (28 dmg + knockback).',
    tiltDeg: -1.8,
    cooldownMs: 1800,
  },
];

export const MYSTIC_SHIELD_ABILITY: AbilityDefinition = {
  id: 'mystic-shield',
  name: 'MYSTIC SHIELD',
  type: 'Defense',
  description:
    'Available during Flight: conjure a large rotating orange eldritch mandala shield (120 Shield durability) that absorbs incoming enemy attacks.',
  tiltDeg: -1.8,
  cooldownMs: 6500,
  durationMs: STRANGE_SHIELD_MAX_DURATION_MS,
};

export const ANCIENT_ONE_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  DOCTOR_STRANGE_ABILITIES[0],
  {
    id: 'astral-extraction',
    name: 'SOUL STRIKE',
    type: 'Targeted',
    description:
      'Close-range strike that knocks an enemy’s astral form out of their body before snapping it back for 40 damage.',
    tiltDeg: -1.8,
    cooldownMs: 7500,
  },
  DOCTOR_STRANGE_ABILITIES[2],
  DOCTOR_STRANGE_ABILITIES[3],
];

// --- VISION ---
export const VISION_INTANGIBLE_MAX_DURATION_MS = 8000;
export const VISION_LASER_DURATION_MS = 3600;
export const VISION_MIND_BOLT_CHARGE_MS = 520;
export const VISION_HEAD_GRIP_DURATION_MS = 2600;

export const VISION_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'vision-flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Control synthetic density to float and glide through the sky while unlocking aerial Intangibility phasing.',
    tiltDeg: 2.0,
    cooldownMs: 1400,
  },
  {
    id: 'mind-stone-laser',
    name: 'MIND LASER',
    type: 'Targeted Area Attack',
    description:
      'Channel a continuous golden-yellow energy beam directly from Vision’s forehead Mind Stone for 3.6s.',
    tiltDeg: 1.6,
    cooldownMs: 5500,
    durationMs: VISION_LASER_DURATION_MS,
  },
  {
    id: 'mind-stone-projectile',
    name: 'MIND BOLT',
    type: 'Projectile',
    description:
      'Fire two quick Mind Stone bolts; every third shot charges and levitates to unleash a massive explosive sphere (40 AoE dmg).',
    tiltDeg: -1.8,
    cooldownMs: 6000,
  },
  {
    id: 'head-grip',
    name: 'HEAD GRIP',
    type: 'Targeted',
    description:
      'Requires a target: phase directly in front, grip and lift them by the head, then release into a 3s ragdoll.',
    tiltDeg: 1.7,
    cooldownMs: 10500,
    durationMs: VISION_HEAD_GRIP_DURATION_MS,
  },
];

export const VISION_INTANGIBILITY: AbilityDefinition = {
  id: 'intangibility',
  name: 'INTANGIBLE',
  type: 'Toggle',
  description:
    'Available during Flight: phase into a translucent yellow state to pass cleanly through walls, pillars, and enemies.',
  tiltDeg: -1.7,
  cooldownMs: 5000,
  durationMs: VISION_INTANGIBLE_MAX_DURATION_MS,
};

// --- INVISIBLE WOMAN ---
export const INVISIBILITY_MAX_DURATION_MS = 10000;
export const FORCEFIELD_SHIELD_DURATION_MS = 10000;
export const FORCEFIELD_SHIELD_MAX_DURABILITY = 200;
export const FORCEFIELD_EFFECT_DURATION_MS = 4000;
export const FORCEFIELD_TRANSFER_COOLDOWN_MS = 13000;
export const FORCEFIELD_BARRIER_LOCK_MS = 700;

export const INVISIBLE_WOMAN_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'invisible-flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Kneel atop a hovering circular blue Forcefield platform to glide effortlessly through the air.',
    tiltDeg: 2.0,
    cooldownMs: 1400,
  },
  {
    id: 'invisibility',
    name: 'INVISIBILITY',
    type: 'Toggle',
    description:
      'Usable on the ground or during Flight: vanish from head to feet for 10s, hiding your nameplate and preventing enemy detection. Any other ability cancels it.',
    tiltDeg: -1.8,
    cooldownMs: 8000,
    durationMs: INVISIBILITY_MAX_DURATION_MS,
  },
  {
    id: 'forcefield-shield',
    name: 'FORCEFIELD SHIELD',
    type: 'Defense',
    description:
      'Project a 200-durability blue sphere for 10s with slow movement. Transfer half to a target for Protection (heal 2 HP/s) or Suffocation (5 dmg/s).',
    tiltDeg: 1.6,
    cooldownMs: 10000,
    durationMs: FORCEFIELD_SHIELD_DURATION_MS,
  },
  {
    id: 'forcefield-barrier',
    name: 'FORCEFIELD BARRIER',
    type: 'Projectile',
    description:
      'Face forward, lock movement for 0.7s, and launch a fast flat circular Forcefield disc straight ahead (34 dmg & knockback on collision).',
    tiltDeg: -1.8,
    cooldownMs: 4200,
  },
];

export const FORCEFIELD_TRANSFER_ABILITY: AbilityDefinition = {
  id: 'forcefield-transfer',
  name: 'TRANSFER',
  type: 'Targeted',
  description:
    'Split remaining Forcefield Shield durability equally with the selected target, locking them in place to choose Protection or Suffocation (13s cooldown).',
  tiltDeg: 0,
  cooldownMs: FORCEFIELD_TRANSFER_COOLDOWN_MS,
};

export const FORCEFIELD_EFFECT_OPTIONS: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'forcefield-protection',
    name: 'PROTECTION',
    type: 'Targeted',
    description:
      'Release target movement while keeping their Forcefield sphere and heal 2 HP/s for 4s. Both are immune to external damage, ragdoll & knockback.',
    tiltDeg: -1.0,
    cooldownMs: 0,
    durationMs: FORCEFIELD_EFFECT_DURATION_MS,
  },
  {
    id: 'forcefield-suffocation',
    name: 'SUFFOCATION',
    type: 'Targeted',
    description:
      'Keep target locked and shrink the sphere around their head, dealing 5 dmg/s for 4s. Both are immune to external damage, ragdoll & knockback.',
    tiltDeg: 1.0,
    cooldownMs: 0,
    durationMs: FORCEFIELD_EFFECT_DURATION_MS,
  },
];

// --- VAMPIRE ---
export const VAMPIRE_ABSORB_DURATION_MS = 3000;
export const VAMPIRE_STOLEN_DURATION_MS = 40000;
export const VAMPIRE_GROUND_STOMP_COOLDOWN_MS = 6500;

export const VAMPIRE_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'vampire-flight',
    name: 'SUPER FLIGHT',
    type: 'Toggle',
    description:
      'Lean forward with one arm extended ahead and soar at extreme speed surrounded by white wind trails. Unlocks Ground Stomp mid-flight.',
    tiltDeg: 2.0,
    cooldownMs: 1200,
  },
  {
    id: 'vampire-bolt',
    name: 'ENERGY PROJECTILE',
    type: 'Projectile',
    description:
      'Alternate right and left hands to fire a fast, compact yellow energy orb with a luminous trail that detonates on impact.',
    tiltDeg: -1.6,
    cooldownMs: 1000,
  },
  {
    id: 'power-absorption',
    name: 'POWER ABSORPTION',
    type: 'Targeted',
    description:
      'Grip a close target by the neck face-to-face for 3s to deal 25 damage, heal 15 HP, ragdoll them for 2s, and copy one of their abilities into Slot 4 for 40s.',
    tiltDeg: 1.5,
    cooldownMs: 12000,
    durationMs: VAMPIRE_ABSORB_DURATION_MS,
  },
  {
    id: 'stolen-ability',
    name: 'STOLEN ABILITY',
    type: 'Targeted',
    description:
      'Disabled until you absorb a target. Temporarily copies one of their abilities for 40s with +5 damage and +5s cooldown.',
    tiltDeg: -1.8,
    cooldownMs: 0,
  },
];

export const STOLEN_BANDIT_GUN: AbilityDefinition = {
  id: 'bandit-gun',
  name: 'GUN SHOT',
  type: 'Projectile',
  description:
    'Copied from a Bandit: fire a fast pistol bullet straight at the aimed target (17 dmg).',
  tiltDeg: -1.6,
  cooldownMs: 1200,
};

export const STOLEN_PRISONER_PUNCH: AbilityDefinition = {
  id: 'prisoner-punch',
  name: 'HEAVY PUNCH',
  type: 'Targeted',
  description:
    'Copied from a Prisoner: deliver a forceful close-range punch with knockback (16 dmg).',
  tiltDeg: -1.7,
  cooldownMs: 1000,
};

export const VAMPIRE_GROUND_STOMP: AbilityDefinition = {
  id: 'ground-stomp',
  name: 'GROUND STOMP',
  type: 'Targeted Area Attack',
  description:
    'Available during Super Flight: plunge rapidly toward the ground or aimed target for a massive shockwave impact, immediately ending Flight.',
  tiltDeg: -1.7,
  cooldownMs: VAMPIRE_GROUND_STOMP_COOLDOWN_MS,
};

// --- CAPTAIN AMERICA ---
export const CAP_SHIELD_DEFENSE_DURABILITY = 150;
export const CAP_SHIELD_CHARGE_DURATION_MS = 4000;
export const COMBO_STEP_COOLDOWN_MS = 700;
export const COMBO_RESET_COOLDOWN_MS = 5000;

export const CAPTAIN_AMERICA_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'shield-throw',
    name: 'SHIELD THROW',
    type: 'Projectile',
    description:
      'Hurl your Vibranium shield at a target, ricocheting to a second nearby foe for 20 dmg, knockback, and ragdoll before returning cleanly to your hand.',
    tiltDeg: 1.9,
    cooldownMs: 3200,
  },
  {
    id: 'shield-defense',
    name: 'SHIELD DEFENSE',
    type: 'Defense',
    description:
      'Raise your left arm to guard with 150 Shield resistance while moving slowly. Disables other abilities while active.',
    tiltDeg: -1.6,
    cooldownMs: 6500,
  },
  {
    id: 'shield-combo',
    name: 'SHIELD COMBO',
    type: 'Targeted',
    description:
      'Chain 3 strikes: left shield strike, right punch, and heavy shield bash (0.7s per step, 5s cooldown after 3rd hit with strong knockback).',
    tiltDeg: 1.5,
    cooldownMs: COMBO_STEP_COOLDOWN_MS,
  },
  {
    id: 'shield-charge',
    name: 'SHIELD CHARGE',
    type: 'Area Attack',
    description:
      'Hold your shield forward and rush ahead at high speed for 4s, knocking aside every enemy in your path.',
    tiltDeg: -1.8,
    cooldownMs: 8500,
    durationMs: CAP_SHIELD_CHARGE_DURATION_MS,
  },
];

// --- THOR ---
export const THOR_LIGHTNING_STORM_CHANNEL_MS = 1050;
export const THOR_LIGHTNING_STORM_BEAM_MS = 2400;

export const THOR_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'mjolnir-combo',
    name: 'MJOLNIR COMBO',
    type: 'Targeted',
    description:
      'Deliver 3 distinct Mjolnir strikes with escalating thunder impact (0.7s per step, 5s cooldown after the heavy 3rd strike).',
    tiltDeg: 1.9,
    cooldownMs: COMBO_STEP_COOLDOWN_MS,
  },
  {
    id: 'mjolnir-throw',
    name: 'MJOLNIR THROW',
    type: 'Projectile',
    description:
      'Hurl spinning Mjolnir toward a target for thunder impact, then raise your right hand to summon the hammer flying back.',
    tiltDeg: -1.7,
    cooldownMs: 4200,
  },
  {
    id: 'lightning-slam',
    name: 'LIGHTNING SLAM',
    type: 'Area Attack',
    description:
      'Launch diagonally skyward as ground lightning arcs toward you, then dive into the earth in a massive electrified blast.',
    tiltDeg: 1.6,
    cooldownMs: 8500,
  },
  {
    id: 'lightning-storm-beam',
    name: 'LIGHTNING BEAM',
    type: 'Targeted Area Attack',
    description:
      'Spread both arms and raise your head to channel sky lightning, then unleash a jagged branching lightning beam forward.',
    tiltDeg: -1.8,
    cooldownMs: 10500,
    durationMs: THOR_LIGHTNING_STORM_CHANNEL_MS + THOR_LIGHTNING_STORM_BEAM_MS,
  },
];

// --- SILVER SURFER ---
export const SILVER_SURFER_ENERGY_MAX = 100;
export const SILVER_SURFER_SONIC_UNLOCK = 80;
export const SILVER_DUAL_BEAM_DURATION_MS = 5000;

export const SILVER_SURFER_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'cosmic-flight',
    name: 'COSMIC FLIGHT',
    type: 'Toggle',
    description:
      'Materialize a detailed silver surfboard from within and surf at high cosmic velocity with dynamic wind trails.',
    tiltDeg: 2.0,
    cooldownMs: 1200,
  },
  {
    id: 'damage-absorption',
    name: 'ABSORPTION',
    type: 'Toggle',
    description:
      'Reduce incoming damage by 50% until reaching 80 energy to unlock Sonic Blast. Manually canceling consumes Sonic Blast and triggers a 7s cooldown.',
    tiltDeg: -1.6,
    cooldownMs: 7000,
  },
  {
    id: 'cosmic-blast',
    name: 'COSMIC BLAST',
    type: 'Projectile',
    description:
      'Gather radiant silver energy between both hands and launch a powerful cosmic projectile that explodes on impact.',
    tiltDeg: 1.6,
    cooldownMs: 2600,
  },
  {
    id: 'dual-cosmic-beam',
    name: 'DUAL COSMIC BEAM',
    type: 'Targeted',
    description:
      'Open both arms wide and fire twin cosmic beams from each hand that converge at your aim point for 5 seconds.',
    tiltDeg: -1.8,
    cooldownMs: 9500,
    durationMs: SILVER_DUAL_BEAM_DURATION_MS,
  },
];

export const SILVER_SURFER_SONIC_BLAST: AbilityDefinition = {
  id: 'sonic-blast',
  name: 'SONIC BLAST',
  type: 'Area Attack',
  description:
    'Ends Damage Absorption and launches a fast-moving wind ring with an animated trail, dealing 40 damage and strong knockback.',
  tiltDeg: -1.6,
  cooldownMs: 1500,
};

// --- STORM ---
export const STORM_TORNADO_DURATION_MS = 5500;
export const STORM_WIND_BLAST_DURATION_MS = 6000;

export const STORM_LIGHTNING_STRIKE: AbilityDefinition = {
  id: 'lightning-strike',
  name: 'LIGHTNING',
  type: 'Targeted Area Attack',
  description:
    'Usable only during Flight: rise higher into the sky and hurl a yellow-white lightning bolt toward your aim.',
  tiltDeg: -1.7,
  cooldownMs: 4200,
};

export const STORM_ABILITIES: ReadonlyArray<AbilityDefinition> = [
  {
    id: 'storm-flight',
    name: 'FLIGHT',
    type: 'Toggle',
    description:
      'Soar smoothly through the skies surrounded by graceful billowing wind currents.',
    tiltDeg: 2.0,
    cooldownMs: 1200,
  },
  {
    id: 'storm-tornado',
    name: 'TORNADO',
    type: 'Area Attack',
    description:
      'Conjure a towering wind tempest with swirling leaves and particles that spins, lifts, and drops nearby enemies.',
    tiltDeg: 1.6,
    cooldownMs: 8500,
    durationMs: STORM_TORNADO_DURATION_MS,
  },
  {
    id: 'ice-spear',
    name: 'ICE SPEAR',
    type: 'Projectile',
    description:
      'Raise your left hand to materialize a razor-sharp light-blue ice spear at your right side, launching it to shatter on impact.',
    tiltDeg: -1.6,
    cooldownMs: 3200,
  },
  {
    id: 'wind-blast',
    name: 'WIND BLAST',
    type: 'Toggle',
    description:
      'Unleash a wide, towering 6-second gale straight forward packed with wind lines, leaves, and particles.',
    tiltDeg: 1.7,
    cooldownMs: 8000,
    durationMs: STORM_WIND_BLAST_DURATION_MS,
  },
];



