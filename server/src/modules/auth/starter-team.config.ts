export type StarterPetProfile = {
  key: string;
  nickname: string;
  speciesCode: string;
  rarity: number;
  skillSlotCount: number;
  isFavorite?: boolean;
};

export const STARTER_TEAM_SOURCE = 'starter_team_v12';

export const STARTER_TEAM: readonly StarterPetProfile[] = [
  {
    key: 'guardian',
    nickname: '岩甲守护',
    speciesCode: 'PET002',
    rarity: 2,
    skillSlotCount: 4,
  },
  {
    key: 'mochi',
    nickname: 'Mochi',
    speciesCode: 'PET004',
    rarity: 3,
    skillSlotCount: 4,
    isFavorite: true,
  },
  {
    key: 'flame',
    nickname: '炎尾灵狐',
    speciesCode: 'PET001',
    rarity: 2,
    skillSlotCount: 4,
  },
  {
    key: 'gale',
    nickname: '疾风兔',
    speciesCode: 'PET003',
    rarity: 2,
    skillSlotCount: 4,
  },
  {
    key: 'tide',
    nickname: '潮汐獭',
    speciesCode: 'PET006',
    rarity: 2,
    skillSlotCount: 4,
  },
];

export const STARTER_INVENTORY: Readonly<Record<string, number>> = {
  apple: 10,
  dried_fish: 5,
  clean_spray: 5,
  exp_potion_small: 5,
  common_pet_egg: 2,
  fusion_core: 2,
};
