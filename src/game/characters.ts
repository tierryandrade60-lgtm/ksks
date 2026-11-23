import {
  AGATHA_HARKNESS_ABILITIES,
  ANCIENT_ONE_ABILITIES,
  AbilityDefinition,
  CAPTAIN_AMERICA_ABILITIES,
  DOCTOR_STRANGE_ABILITIES,
  EMMA_FROST_ABILITIES,
  EMMA_WHITE_QUEEN_ABILITIES,
  HELA_ABILITIES,
  INVISIBLE_WOMAN_ABILITIES,
  MAGNETO_ABILITIES,
  PHOENIX_FORCE_ABILITIES,
  QUICKSILVER_ABILITIES,
  QUICKSILVER_SPEED_ABILITIES,
  SCARLET_WITCH_ABILITIES,
  SCARLET_WITCH_SUPREME_ABILITIES,
  SCARLET_WITCH_ZOMBIE_ABILITIES,
  SILVER_SURFER_ABILITIES,
  STORM_ABILITIES,
  THOR_ABILITIES,
  VAMPIRE_ABILITIES,
  VISION_ABILITIES,
} from './abilityConfig';
import {
  CHARACTER_PRESETS,
  CharacterAppearance,
  resolveCharacterAppearance,
} from './characterConfig';

export interface CharacterPreviewConfig {
  accentColor: string;
  badgeColor: string;
  podiumColor: string;
  cameraDistance: number;
  cameraOffsetY: number;
  initialYaw: number;
}

export type CharacterGender = 'male' | 'female';

export interface CharacterSkinDefinition {
  id: string;
  name: string;
  shortName: string;
  displayName: string;
  gender?: CharacterGender;
  price: number;
  damageMultiplier?: number;
  nameColor: string;
  accentColor: string;
  badgeColor: string;
  podiumColor: string;
  appearance: CharacterAppearance;
  abilities?: ReadonlyArray<AbilityDefinition>;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  gender: CharacterGender;
  nameColor: string;
  tags: ReadonlyArray<string>;
  description: string;
  maxHp: number;
  appearance: CharacterAppearance;
  preview: CharacterPreviewConfig;
  abilities: ReadonlyArray<AbilityDefinition>;
  skins?: ReadonlyArray<CharacterSkinDefinition>;
}

export const SUPREME_SORCERESS_SKIN_ID = 'supreme-sorceress';
export const WANDA_ZOMBIE_SKIN_ID = 'wanda-zombie';
export const DARK_PHOENIX_SKIN_ID = 'dark-phoenix';
export const DARK_PHOENIX_PRICE = 100;
export const WHITE_PHOENIX_SKIN_ID = 'white-phoenix';
export const SPEED_SKIN_ID = 'speed';
export const WHITE_QUEEN_SKIN_ID = 'white-queen';
export const WHITE_HELA_SKIN_ID = 'white-hela';
export const ANCIENT_ONE_SKIN_ID = 'ancient-one';

/**
 * Central extensible Character Registry.
 */
export const CHARACTER_REGISTRY: ReadonlyArray<CharacterDefinition> = [
  {
    id: 'scarlet-witch',
    name: 'SCARLET WITCH',
    gender: 'female',
    nameColor: '#FF4557',
    tags: ['Witch', 'Sorceress', 'Chaos Magic'],
    description:
      'Master of Chaos Magic who levitates on crimson mist and overwhelms foes with hex bolts and inward implosions.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.scarletWitch),
    preview: {
      accentColor: '#E53540',
      badgeColor: '#FFD147',
      podiumColor: '#4A2B5E',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: SCARLET_WITCH_ABILITIES,
    skins: [
      {
        id: 'scarlet-default',
        name: 'Scarlet Witch',
        shortName: 'DEFAULT',
        displayName: 'SCARLET WITCH',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#FF4557',
        accentColor: '#E53540',
        badgeColor: '#FFD147',
        podiumColor: '#4A2B5E',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.scarletWitch),
        abilities: SCARLET_WITCH_ABILITIES,
      },
      {
        id: SUPREME_SORCERESS_SKIN_ID,
        name: 'Supreme Sorceress',
        shortName: 'SUPREME',
        displayName: 'SUPREME SORCERESS',
        price: 0,
        damageMultiplier: 1.25,
        nameColor: '#FF5E78',
        accentColor: '#FF2A3C',
        badgeColor: '#E8B938',
        podiumColor: '#3A1532',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.supremeSorceress),
        abilities: SCARLET_WITCH_SUPREME_ABILITIES,
      },
      {
        id: WANDA_ZOMBIE_SKIN_ID,
        name: 'Wanda Zombie',
        shortName: 'ZOMBIE',
        displayName: 'WANDA ZOMBIE',
        price: 0,
        damageMultiplier: 1.0,
        nameColor: '#FF4D4D',
        accentColor: '#B81824',
        badgeColor: '#FF5A36',
        podiumColor: '#2B0D12',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.wandaZombie),
        abilities: SCARLET_WITCH_ZOMBIE_ABILITIES,
      },
    ],
  },
  {
    id: 'phoenix-force',
    name: 'PHOENIX FORCE',
    gender: 'female',
    nameColor: '#FFD53D',
    tags: ['Cosmic Fire', 'Telepath', 'Phoenix'],
    description:
      'Avatar of cosmic fire wielding triple Phoenix Waves, rapid fireballs, Pain Infliction, and radiant fiery wings.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.phoenixForce),
    preview: {
      accentColor: '#FF981A',
      badgeColor: '#FFD53D',
      podiumColor: '#1E522C',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: PHOENIX_FORCE_ABILITIES,
    skins: [
      {
        id: 'phoenix-default',
        name: 'Phoenix Force',
        shortName: 'DEFAULT',
        displayName: 'PHOENIX FORCE',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#FFD53D',
        accentColor: '#FF981A',
        badgeColor: '#FFD53D',
        podiumColor: '#1E522C',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.phoenixForce),
      },
      {
        id: DARK_PHOENIX_SKIN_ID,
        name: 'Dark Phoenix',
        shortName: 'DARK',
        displayName: 'DARK PHOENIX',
        price: DARK_PHOENIX_PRICE,
        damageMultiplier: 1,
        nameColor: '#FF5E2B',
        accentColor: '#FF451A',
        badgeColor: '#FF5722',
        podiumColor: '#3A1112',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.darkPhoenix),
      },
      {
        id: WHITE_PHOENIX_SKIN_ID,
        name: 'White Phoenix of the Crown',
        shortName: 'W. PHOENIX',
        displayName: 'WHITE PHOENIX OF THE CROWN',
        price: 0,
        damageMultiplier: 1.25,
        nameColor: '#FFFFFF',
        accentColor: '#EBF4FF',
        badgeColor: '#F2C12E',
        podiumColor: '#3D4858',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.whitePhoenix),
      },
    ],
  },
  {
    id: 'emma-frost',
    name: 'EMMA FROST',
    gender: 'female',
    nameColor: '#E8F6FF',
    tags: ['White Queen', 'Telepath', 'Diamond Form'],
    description:
      'The White Queen commands targeted Mind Control (Paralysis, Sleep, Mental Damage), crystal Diamond invulnerability, and forehead telepathic waves.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.emmaFrost),
    preview: {
      accentColor: '#9EDBFF',
      badgeColor: '#E8F6FF',
      podiumColor: '#253B56',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: EMMA_FROST_ABILITIES,
    skins: [
      {
        id: 'emma-default',
        name: 'Emma Frost',
        shortName: 'DEFAULT',
        displayName: 'EMMA FROST',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#E8F6FF',
        accentColor: '#9EDBFF',
        badgeColor: '#E8F6FF',
        podiumColor: '#253B56',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.emmaFrost),
        abilities: EMMA_FROST_ABILITIES,
      },
      {
        id: WHITE_QUEEN_SKIN_ID,
        name: 'White Queen',
        shortName: 'W. QUEEN',
        displayName: 'WHITE QUEEN',
        price: 0,
        damageMultiplier: 1.25,
        nameColor: '#FFFFFF',
        accentColor: '#CFE8FF',
        badgeColor: '#F4C430',
        podiumColor: '#36455E',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.whiteQueen),
        abilities: EMMA_WHITE_QUEEN_ABILITIES,
      },
    ],
  },
  {
    id: 'hela',
    name: 'HELA',
    gender: 'female',
    nameColor: '#3CE66B',
    tags: ['Goddess of Death', 'Necroswords', 'Crown Form'],
    description:
      'Goddess of Death wielding conjured Necroswords, massive emerald explosions, spinning leaps, and her empowering Crown Form.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.hela),
    preview: {
      accentColor: '#3CE66B',
      badgeColor: '#66FF92',
      podiumColor: '#122E21',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: HELA_ABILITIES,
    skins: [
      {
        id: 'hela-default',
        name: 'Hela',
        shortName: 'DEFAULT',
        displayName: 'HELA',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#3CE66B',
        accentColor: '#3CE66B',
        badgeColor: '#66FF92',
        podiumColor: '#122E21',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.hela),
      },
      {
        id: WHITE_HELA_SKIN_ID,
        name: 'White Hela',
        shortName: 'WHITE',
        displayName: 'WHITE HELA',
        price: 0,
        damageMultiplier: 1.25,
        nameColor: '#F2F5F8',
        accentColor: '#D6E2ED',
        badgeColor: '#88FFB0',
        podiumColor: '#3A4652',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.whiteHela),
      },
    ],
  },
  {
    id: 'magneto',
    name: 'MAGNETO',
    gender: 'male',
    nameColor: '#D26BFF',
    tags: ['Master of Magnetism', 'Metal', 'Mutant'],
    description:
      'Master of Magnetism commanding steel projectiles, catastrophic magnetic meteors, purple-lightning metal tornadoes, and airborne magnetic shields.',
    maxHp: 260,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.magneto),
    preview: {
      accentColor: '#B84DFF',
      badgeColor: '#E09EFF',
      podiumColor: '#3B195C',
      cameraDistance: 3.15,
      cameraOffsetY: 1.06,
      initialYaw: 0.28,
    },
    abilities: MAGNETO_ABILITIES,
  },
  {
    id: 'quicksilver',
    name: 'QUICKSILVER',
    gender: 'male',
    nameColor: '#56C8FF',
    tags: ['Speedster', 'Time Stop', 'Whirlwind'],
    description:
      'Supersonic mutant crackling with blue lightning, capable of relentless punch flurries, swirling wind tornadoes, and time-freezing spheres.',
    maxHp: 240,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.quicksilver),
    preview: {
      accentColor: '#38B6FF',
      badgeColor: '#9BE4FF',
      podiumColor: '#153F52',
      cameraDistance: 3.05,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: QUICKSILVER_ABILITIES,
    skins: [
      {
        id: 'quicksilver-default',
        name: 'Quicksilver',
        shortName: 'QUICKSILVER',
        displayName: 'QUICKSILVER',
        price: 0,
        nameColor: '#56C8FF',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.quicksilver),
        accentColor: '#38B6FF',
        badgeColor: '#9BE4FF',
        podiumColor: '#153F52',
        abilities: QUICKSILVER_ABILITIES,
      },
      {
        id: 'speed',
        name: 'Speed',
        shortName: 'SPEED',
        displayName: 'SPEED',
        price: 0,
        nameColor: '#4DFF9E',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.speed),
        accentColor: '#3BE882',
        badgeColor: '#92FFC0',
        podiumColor: '#133824',
        abilities: QUICKSILVER_SPEED_ABILITIES,
      },
    ],
  },
  {
    id: 'doctor-strange',
    name: 'DOCTOR STRANGE',
    gender: 'male',
    nameColor: '#FF9D3B',
    tags: ['Sorcerer Supreme', 'Eldritch', 'Mystic'],
    description:
      'Sorcerer Supreme soaring while weaving mandala shields, restraining clones, and hurling spinning eldritch discs.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.doctorStrange),
    preview: {
      accentColor: '#FF8C24',
      badgeColor: '#FFD166',
      podiumColor: '#3E2218',
      cameraDistance: 3.15,
      cameraOffsetY: 1.05,
      initialYaw: 0.28,
    },
    abilities: DOCTOR_STRANGE_ABILITIES,
    skins: [
      {
        id: 'strange-default',
        name: 'Doctor Strange',
        shortName: 'DEFAULT',
        displayName: 'DOCTOR STRANGE',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#FF9D3B',
        accentColor: '#FF8C24',
        badgeColor: '#FFD166',
        podiumColor: '#3E2218',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.doctorStrange),
        abilities: DOCTOR_STRANGE_ABILITIES,
      },
      {
        id: ANCIENT_ONE_SKIN_ID,
        name: 'The Ancient One',
        shortName: 'ANCIENT 1',
        displayName: 'THE ANCIENT ONE',
        gender: 'female',
        price: 0,
        damageMultiplier: 1,
        nameColor: '#F3C654',
        accentColor: '#D49628',
        badgeColor: '#F6D365',
        podiumColor: '#382B19',
        appearance: resolveCharacterAppearance(CHARACTER_PRESETS.ancientOne),
        abilities: ANCIENT_ONE_ABILITIES,
      },
    ],
  },
  {
    id: 'vision',
    name: 'VISION',
    gender: 'male',
    nameColor: '#FFD84D',
    tags: ['Synthezoid', 'Mind Stone', 'Intangible'],
    description:
      'Solar-powered synthezoid capable of aerial yellow phase intangibility, forehead Mind Stone beams, and telekinetic head-grip takedowns.',
    maxHp: 260,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.vision),
    preview: {
      accentColor: '#FFD53D',
      badgeColor: '#45D072',
      podiumColor: '#1B4527',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: VISION_ABILITIES,
  },
  {
    id: 'agatha-harkness',
    name: 'AGATHA HARKNESS',
    gender: 'female',
    nameColor: '#C274FF',
    tags: ['Witch', 'Dark Magic', 'Absorption'],
    description:
      'Ancient witch commanding dark-purple magic bolts, life-draining Energy Absorption beams, and an Absorption Shield.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.agathaHarkness),
    preview: {
      accentColor: '#9B38FF',
      badgeColor: '#C274FF',
      podiumColor: '#24123D',
      cameraDistance: 3.15,
      cameraOffsetY: 1.05,
      initialYaw: 0.28,
    },
    abilities: AGATHA_HARKNESS_ABILITIES,
  },
  {
    id: 'invisible-woman',
    name: 'INVISIBLE WOMAN',
    gender: 'female',
    nameColor: '#56C8FF',
    tags: ['Forcefield', 'Stealth', 'Barrier'],
    description:
      'Master of psionic Forcefields who kneels atop flying energy discs, vanishes from sight, shields or suffocates targets, and hurls Forcefield discs.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.invisibleWoman),
    preview: {
      accentColor: '#38BDF8',
      badgeColor: '#BAE6FD',
      podiumColor: '#132D54',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: INVISIBLE_WOMAN_ABILITIES,
  },
  {
    id: 'vampire',
    name: 'VAMPIRE',
    gender: 'female',
    nameColor: '#56E378',
    tags: ['Super Flight', 'Absorption', 'Mimic'],
    description:
      'High-speed powerhouse who surges forward in Super Flight, plunges into Ground Stomp, fires golden energy bolts, and steals enemy abilities via Power Absorption.',
    maxHp: 250,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.vampire),
    preview: {
      accentColor: '#1E8244',
      badgeColor: '#F4C430',
      podiumColor: '#153824',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: VAMPIRE_ABILITIES,
  },
  {
    id: 'captain-america',
    name: 'CAPTAIN AMERICA',
    gender: 'male',
    nameColor: '#569EFF',
    tags: ['Super Soldier', 'Vibranium Shield', 'Brawler'],
    description:
      'Super Soldier armed with a ricocheting Vibranium shield, 150-durability Shield Defense, a 3-hit melee combo, and high-speed Shield Charge.',
    maxHp: 260,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.captainAmerica),
    preview: {
      accentColor: '#2B68C8',
      badgeColor: '#DF2938',
      podiumColor: '#13264D',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: CAPTAIN_AMERICA_ABILITIES,
  },
  {
    id: 'thor',
    name: 'THOR',
    gender: 'male',
    nameColor: '#6CE2FF',
    tags: ['God of Thunder', 'Mjolnir', 'Lightning'],
    description:
      'God of Thunder wielding enchanted Mjolnir, explosive Lightning Slams, sky-channeled Lightning Storm Beams, and returning hammer throws.',
    maxHp: 270,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.thor),
    preview: {
      accentColor: '#38BDF8',
      badgeColor: '#90EEFF',
      podiumColor: '#14223B',
      cameraDistance: 3.15,
      cameraOffsetY: 1.05,
      initialYaw: 0.28,
    },
    abilities: THOR_ABILITIES,
  },
  {
    id: 'silver-surfer',
    name: 'SILVER SURFER',
    gender: 'male',
    nameColor: '#E2EEFF',
    tags: ['Power Cosmic', 'Herald', 'Surfboard'],
    description:
      'Cosmic Herald surfing at blistering speeds atop a liquid-silver board, absorbing damage to unleash devastating 2D Sonic Blasts and trapping foes in silver energy fields.',
    maxHp: 260,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.silverSurfer),
    preview: {
      accentColor: '#B8D4F5',
      badgeColor: '#FFFFFF',
      podiumColor: '#1E2C42',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: SILVER_SURFER_ABILITIES,
  },
  {
    id: 'storm',
    name: 'STORM',
    gender: 'female',
    nameColor: '#FFE875',
    tags: ['Weather Goddess', 'Lightning', 'Tempest'],
    description:
      'Mistress of the Elements soaring effortlessly on wind currents, calling yellow-white lightning bolts, towering tornadoes, razor ice spears, and continuous gale blasts.',
    maxHp: 240,
    appearance: resolveCharacterAppearance(CHARACTER_PRESETS.storm),
    preview: {
      accentColor: '#FFE15A',
      badgeColor: '#7BE0FF',
      podiumColor: '#1B253A',
      cameraDistance: 3.1,
      cameraOffsetY: 1.04,
      initialYaw: 0.28,
    },
    abilities: STORM_ABILITIES,
  },
];

export function getCharacterById(id: string): CharacterDefinition {
  return (
    CHARACTER_REGISTRY.find((c) => c.id === id) ?? CHARACTER_REGISTRY[0]
  );
}

export function resolveCharacterWithSkin(
  char: CharacterDefinition,
  skinId?: string | null,
): {
  displayName: string;
  gender: CharacterGender;
  nameColor: string;
  appearance: CharacterAppearance;
  preview: CharacterPreviewConfig;
  skin: CharacterSkinDefinition | null;
  damageMultiplier: number;
  abilities: ReadonlyArray<AbilityDefinition>;
} {
  if (!char.skins || char.skins.length === 0) {
    return {
      displayName: char.name,
      gender: char.gender,
      nameColor: char.nameColor,
      appearance: char.appearance,
      preview: char.preview,
      skin: null,
      damageMultiplier: 1,
      abilities: char.abilities,
    };
  }
  const skin = char.skins.find((s) => s.id === skinId) ?? char.skins[0];
  return {
    displayName: skin.displayName,
    gender: skin.gender ?? char.gender,
    nameColor: skin.nameColor,
    appearance: skin.appearance,
    preview: {
      ...char.preview,
      accentColor: skin.accentColor,
      badgeColor: skin.badgeColor,
      podiumColor: skin.podiumColor,
    },
    skin,
    damageMultiplier: skin.damageMultiplier ?? 1,
    abilities: skin.abilities ?? char.abilities,
  };
}
