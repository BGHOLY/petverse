export type AptitudeKey = 'hp' | 'attack' | 'defense' | 'magic' | 'speed';
export type NumberRange = readonly [number, number];

export interface PetSpeciesConfig {
  speciesCode: string;
  name: string;
  aliases: string[];
  element: string;
  roleTags: string[];
  mainAptitudes: AptitudeKey[];
  normalAptitudes: Record<AptitudeKey, NumberRange>;
  mutantAptitudes: Record<AptitudeKey, NumberRange>;
  normalGrowth: NumberRange;
  mutantGrowth: NumberRange;
  mutationSpecialSkillCode: string;
  fillSkillCodes: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    magic: number;
    speed: number;
  };
  configVersion: string;
}

export const PET_CONFIG_VERSION = '2.0.0';

export const PET_SPECIES_CONFIGS: PetSpeciesConfig[] = [
  {
    speciesCode: 'PET001',
    name: '炎尾狐',
    aliases: ['Fox', 'fox', 'Flame Fox'],
    element: 'fire',
    roleTags: ['magic_burst', 'speed'],
    mainAptitudes: ['magic', 'speed'],
    normalAptitudes: {
      hp: [1050, 1350],
      attack: [850, 1100],
      defense: [850, 1100],
      magic: [1250, 1550],
      speed: [1050, 1350],
    },
    mutantAptitudes: {
      hp: [1120, 1450],
      attack: [900, 1180],
      defense: [900, 1180],
      magic: [1380, 1650],
      speed: [1120, 1450],
    },
    normalGrowth: [1.05, 1.22],
    mutantGrowth: [1.1, 1.28],
    mutationSpecialSkillCode: 'SPECIAL_PET001',
    fillSkillCodes: [
      'LOW_MAGIC_COMBO',
      'LOW_MAGIC_CRIT',
      'LOW_MAGIC_POWER',
      'LOW_MAGIC_PIERCE',
      'LOW_SPEED_UP',
      'LOW_DEATH_SAVE',
      'LOW_ENERGY_GAIN',
      'LOW_ACCURACY',
    ],
    baseStats: { hp: 105, attack: 18, defense: 17, magic: 25, speed: 22 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET002',
    name: '岩甲龟',
    aliases: ['Turtle', 'turtle', 'Dog', 'dog'],
    element: 'earth',
    roleTags: ['tank', 'guard'],
    mainAptitudes: ['hp', 'defense'],
    normalAptitudes: {
      hp: [1350, 1650],
      attack: [850, 1100],
      defense: [1350, 1650],
      magic: [850, 1100],
      speed: [650, 900],
    },
    mutantAptitudes: {
      hp: [1450, 1750],
      attack: [900, 1180],
      defense: [1450, 1750],
      magic: [900, 1180],
      speed: [700, 980],
    },
    normalGrowth: [1.03, 1.2],
    mutantGrowth: [1.08, 1.26],
    mutationSpecialSkillCode: 'SPECIAL_PET002',
    fillSkillCodes: [
      'LOW_PHYSICAL_GUARD',
      'LOW_MAGIC_GUARD',
      'LOW_PARRY',
      'LOW_REFLECT',
      'LOW_OPENING_SHIELD',
      'LOW_MAX_HP',
      'LOW_SLOW_TANK',
      'LOW_GUARD_ALLY',
    ],
    baseStats: { hp: 125, attack: 17, defense: 26, magic: 16, speed: 12 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET003',
    name: '疾风兔',
    aliases: ['Rabbit', 'rabbit', 'Wind Rabbit'],
    element: 'wind',
    roleTags: ['physical_burst', 'first_move'],
    mainAptitudes: ['speed', 'attack'],
    normalAptitudes: {
      hp: [950, 1250],
      attack: [1150, 1450],
      defense: [800, 1050],
      magic: [850, 1100],
      speed: [1350, 1650],
    },
    mutantAptitudes: {
      hp: [1020, 1340],
      attack: [1250, 1550],
      defense: [850, 1130],
      magic: [900, 1180],
      speed: [1450, 1750],
    },
    normalGrowth: [1.04, 1.21],
    mutantGrowth: [1.09, 1.27],
    mutationSpecialSkillCode: 'SPECIAL_PET003',
    fillSkillCodes: [
      'LOW_PHYSICAL_COMBO',
      'LOW_PHYSICAL_CRIT',
      'LOW_PHYSICAL_POWER',
      'LOW_AMBUSH',
      'LOW_PURSUIT',
      'LOW_SPEED_UP',
      'LOW_ACCURACY',
      'LOW_DEATH_SAVE',
    ],
    baseStats: { hp: 98, attack: 23, defense: 15, magic: 17, speed: 28 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET004',
    name: '月光猫',
    aliases: ['Cat', 'cat', 'Moon Cat'],
    element: 'light',
    roleTags: ['healer', 'cleanse'],
    mainAptitudes: ['magic', 'speed'],
    normalAptitudes: {
      hp: [1050, 1350],
      attack: [800, 1000],
      defense: [950, 1200],
      magic: [1200, 1500],
      speed: [1100, 1400],
    },
    mutantAptitudes: {
      hp: [1120, 1450],
      attack: [850, 1080],
      defense: [1020, 1300],
      magic: [1320, 1600],
      speed: [1180, 1500],
    },
    normalGrowth: [1.05, 1.22],
    mutantGrowth: [1.1, 1.28],
    mutationSpecialSkillCode: 'SPECIAL_PET004',
    fillSkillCodes: [
      'LOW_HEALING_POWER',
      'LOW_ENERGY_GAIN',
      'LOW_CLEANSE',
      'LOW_HEALING_ECHO',
      'LOW_MAGIC_GUARD',
      'LOW_OPENING_SHIELD',
      'LOW_SPEED_UP',
      'LOW_CONTROL_RESIST',
    ],
    baseStats: { hp: 108, attack: 15, defense: 19, magic: 24, speed: 23 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET005',
    name: '雷角兽',
    aliases: ['Thunder Beast', 'thunder beast'],
    element: 'thunder',
    roleTags: ['physical_burst', 'bruiser'],
    mainAptitudes: ['attack', 'hp'],
    normalAptitudes: {
      hp: [1150, 1450],
      attack: [1300, 1600],
      defense: [1000, 1250],
      magic: [800, 1000],
      speed: [950, 1200],
    },
    mutantAptitudes: {
      hp: [1230, 1550],
      attack: [1420, 1700],
      defense: [1080, 1350],
      magic: [850, 1080],
      speed: [1020, 1300],
    },
    normalGrowth: [1.05, 1.22],
    mutantGrowth: [1.1, 1.28],
    mutationSpecialSkillCode: 'SPECIAL_PET005',
    fillSkillCodes: [
      'LOW_PHYSICAL_CRIT',
      'LOW_PHYSICAL_POWER',
      'LOW_AMBUSH',
      'LOW_PURSUIT',
      'LOW_LIFESTEAL',
      'LOW_MAX_HP',
      'LOW_ACCURACY',
      'LOW_CONTROL_RESIST',
    ],
    baseStats: { hp: 116, attack: 27, defense: 20, magic: 14, speed: 19 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET006',
    name: '潮汐獭',
    aliases: ['Otter', 'otter', 'Tide Otter'],
    element: 'water',
    roleTags: ['support', 'anti_speed'],
    mainAptitudes: ['magic', 'defense'],
    normalAptitudes: {
      hp: [1150, 1450],
      attack: [850, 1100],
      defense: [1050, 1300],
      magic: [1150, 1450],
      speed: [950, 1250],
    },
    mutantAptitudes: {
      hp: [1230, 1550],
      attack: [900, 1180],
      defense: [1130, 1400],
      magic: [1260, 1550],
      speed: [1020, 1350],
    },
    normalGrowth: [1.045, 1.215],
    mutantGrowth: [1.095, 1.275],
    mutationSpecialSkillCode: 'SPECIAL_PET006',
    fillSkillCodes: [
      'LOW_MAGIC_PIERCE',
      'LOW_MAGIC_GUARD',
      'LOW_OPENING_SHIELD',
      'LOW_REGEN',
      'LOW_CONTROL_RESIST',
      'LOW_DISPEL',
      'LOW_HEALING_POWER',
      'LOW_ENERGY_GAIN',
    ],
    baseStats: { hp: 114, attack: 16, defense: 22, magic: 23, speed: 19 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET007',
    name: '影刃狼',
    aliases: ['Wolf', 'wolf', 'Shadow Wolf'],
    element: 'dark',
    roleTags: ['assassin', 'execute'],
    mainAptitudes: ['attack', 'speed'],
    normalAptitudes: {
      hp: [1000, 1300],
      attack: [1300, 1600],
      defense: [850, 1100],
      magic: [800, 1000],
      speed: [1250, 1550],
    },
    mutantAptitudes: {
      hp: [1070, 1400],
      attack: [1420, 1700],
      defense: [900, 1180],
      magic: [850, 1080],
      speed: [1360, 1650],
    },
    normalGrowth: [1.055, 1.225],
    mutantGrowth: [1.105, 1.285],
    mutationSpecialSkillCode: 'SPECIAL_PET007',
    fillSkillCodes: [
      'LOW_PHYSICAL_COMBO',
      'LOW_PHYSICAL_CRIT',
      'LOW_AMBUSH',
      'LOW_PURSUIT',
      'LOW_SPEED_UP',
      'LOW_ACCURACY',
      'LOW_LIFESTEAL',
      'LOW_DEATH_SAVE',
    ],
    baseStats: { hp: 101, attack: 28, defense: 16, magic: 14, speed: 26 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET008',
    name: '森灵鹿',
    aliases: ['Deer', 'deer', 'Forest Deer'],
    element: 'wood',
    roleTags: ['healer', 'shield'],
    mainAptitudes: ['hp', 'magic'],
    normalAptitudes: {
      hp: [1200, 1500],
      attack: [800, 1000],
      defense: [1050, 1300],
      magic: [1200, 1500],
      speed: [900, 1150],
    },
    mutantAptitudes: {
      hp: [1290, 1600],
      attack: [850, 1080],
      defense: [1130, 1400],
      magic: [1320, 1600],
      speed: [960, 1230],
    },
    normalGrowth: [1.05, 1.22],
    mutantGrowth: [1.1, 1.28],
    mutationSpecialSkillCode: 'SPECIAL_PET008',
    fillSkillCodes: [
      'LOW_HEALING_POWER',
      'LOW_HEALING_ECHO',
      'LOW_REGEN',
      'LOW_MAX_HP',
      'LOW_OPENING_SHIELD',
      'LOW_CLEANSE',
      'LOW_MAGIC_GUARD',
      'LOW_GUARD_ALLY',
    ],
    baseStats: { hp: 120, attack: 14, defense: 21, magic: 25, speed: 17 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET009',
    name: '星辉龙',
    aliases: ['Dragon', 'dragon', 'Star Dragon'],
    element: 'star',
    roleTags: ['core', 'hybrid'],
    mainAptitudes: ['hp', 'attack', 'magic'],
    normalAptitudes: {
      hp: [1250, 1550],
      attack: [1150, 1450],
      defense: [1100, 1400],
      magic: [1150, 1450],
      speed: [1000, 1300],
    },
    mutantAptitudes: {
      hp: [1340, 1650],
      attack: [1250, 1550],
      defense: [1190, 1500],
      magic: [1250, 1550],
      speed: [1080, 1400],
    },
    normalGrowth: [1.08, 1.24],
    mutantGrowth: [1.13, 1.3],
    mutationSpecialSkillCode: 'SPECIAL_PET009',
    fillSkillCodes: [
      'LOW_PHYSICAL_POWER',
      'LOW_MAGIC_POWER',
      'LOW_OPENING_SHIELD',
      'LOW_MAX_HP',
      'LOW_SPEED_UP',
      'LOW_CONTROL_RESIST',
      'LOW_ENERGY_GAIN',
      'LOW_HEALING_ECHO',
    ],
    baseStats: { hp: 124, attack: 23, defense: 23, magic: 23, speed: 20 },
    configVersion: PET_CONFIG_VERSION,
  },
  {
    speciesCode: 'PET010',
    name: '霜羽鸮',
    aliases: ['Owl', 'owl', 'Phoenix', 'phoenix', 'Frost Owl'],
    element: 'ice',
    roleTags: ['control', 'magic'],
    mainAptitudes: ['magic', 'speed'],
    normalAptitudes: {
      hp: [1000, 1300],
      attack: [800, 1000],
      defense: [900, 1150],
      magic: [1300, 1600],
      speed: [1200, 1500],
    },
    mutantAptitudes: {
      hp: [1070, 1400],
      attack: [850, 1080],
      defense: [970, 1240],
      magic: [1420, 1700],
      speed: [1300, 1600],
    },
    normalGrowth: [1.05, 1.22],
    mutantGrowth: [1.1, 1.28],
    mutationSpecialSkillCode: 'SPECIAL_PET010',
    fillSkillCodes: [
      'LOW_MAGIC_COMBO',
      'LOW_MAGIC_CRIT',
      'LOW_MAGIC_POWER',
      'LOW_MAGIC_PIERCE',
      'LOW_SPEED_UP',
      'LOW_CONTROL_RESIST',
      'LOW_ENERGY_GAIN',
      'LOW_ACCURACY',
    ],
    baseStats: { hp: 102, attack: 14, defense: 18, magic: 28, speed: 25 },
    configVersion: PET_CONFIG_VERSION,
  },
];

export const DEFAULT_SPECIES_CONFIG = PET_SPECIES_CONFIGS[3];

export function findPetSpeciesConfig(value?: string | null): PetSpeciesConfig {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return DEFAULT_SPECIES_CONFIG;

  return (
    PET_SPECIES_CONFIGS.find((item) => item.speciesCode.toLowerCase() === normalized) ||
    PET_SPECIES_CONFIGS.find((item) => item.name.toLowerCase() === normalized) ||
    PET_SPECIES_CONFIGS.find((item) =>
      item.aliases.some((alias) => alias.toLowerCase() === normalized),
    ) ||
    DEFAULT_SPECIES_CONFIG
  );
}

export function getAptitudeRange(
  species: PetSpeciesConfig,
  key: AptitudeKey,
  isMutant: boolean,
): NumberRange {
  return isMutant ? species.mutantAptitudes[key] : species.normalAptitudes[key];
}

export function getGrowthRange(
  species: PetSpeciesConfig,
  isMutant: boolean,
): NumberRange {
  return isMutant ? species.mutantGrowth : species.normalGrowth;
}
