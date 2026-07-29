import { SeededRandom } from '../breeding/utils/seeded-random.util';
import type { PetSpeciesConfig } from '../pet/config/pet-species.config';

export type ExpeditionMapCode =
  | 'forest'
  | 'volcano'
  | 'icefield'
  | 'ruins';

export const EXPEDITION_CONFIG_VERSION = '1.0.0';
export const EXPEDITION_DURATIONS = [30, 120, 240, 480] as const;

export const EXPEDITION_MAPS: Record<
  ExpeditionMapCode,
  {
    code: ExpeditionMapCode;
    name: string;
    description: string;
    preferredElements: string[];
    preferredRoles: string[];
    baseGoldPerHour: number;
    basePetExpPerHour: number;
    rareDropRate: number;
    eggDropRate: number;
  }
> = {
  forest: {
    code: 'forest',
    name: '月光森林',
    description: '收益均衡，适合任意队伍。',
    preferredElements: [],
    preferredRoles: [],
    baseGoldPerHour: 300,
    basePetExpPerHour: 90,
    rareDropRate: 0.08,
    eggDropRate: 0.01,
  },
  volcano: {
    code: 'volcano',
    name: '余烬火山',
    description: '水系宠物会提高远征收益。',
    preferredElements: ['water'],
    preferredRoles: [],
    baseGoldPerHour: 360,
    basePetExpPerHour: 100,
    rareDropRate: 0.1,
    eggDropRate: 0.012,
  },
  icefield: {
    code: 'icefield',
    name: '霜语冰原',
    description: '火系宠物会提高远征收益。',
    preferredElements: ['fire'],
    preferredRoles: [],
    baseGoldPerHour: 350,
    basePetExpPerHour: 105,
    rareDropRate: 0.1,
    eggDropRate: 0.012,
  },
  ruins: {
    code: 'ruins',
    name: '星辉遗迹',
    description: '控制与辅助宠物会提高稀有掉落率。',
    preferredElements: [],
    preferredRoles: ['control', 'support', 'healer', 'cleanse', 'shield'],
    baseGoldPerHour: 330,
    basePetExpPerHour: 110,
    rareDropRate: 0.14,
    eggDropRate: 0.015,
  },
};

export type ExpeditionReward = {
  gold: number;
  petExp: number;
  items: Record<string, number>;
};

export function calculateExpeditionRewards(
  mapCode: ExpeditionMapCode,
  durationMinutes: number,
  species: PetSpeciesConfig[],
  seed: string,
): {
  rewards: ExpeditionReward;
  modifiers: Record<string, any>;
} {
  const config = EXPEDITION_MAPS[mapCode];
  const rng = new SeededRandom(seed);
  const hours = durationMinutes / 60;
  const elementMatches = species.filter((pet) =>
    config.preferredElements.includes(pet.element),
  ).length;
  const roleMatches = species.filter((pet) =>
    pet.roleTags.some((role) => config.preferredRoles.includes(role)),
  ).length;
  const rewardMultiplier = 1 + Math.min(0.25, elementMatches * 0.08);
  const rareRateBonus = Math.min(0.2, roleMatches * 0.04);
  const variance = 0.92 + rng.next() * 0.16;
  const items: Record<string, number> = {
    apple: Math.max(1, Math.round(hours * (0.8 + rng.next() * 0.5))),
    adventure_leaf: Math.max(
      1,
      Math.round(hours * (0.6 + rng.next() * 0.6)),
    ),
  };

  if (rng.chance(Math.min(0.8, config.rareDropRate * hours + rareRateBonus))) {
    items.fusion_core = 1;
  }
  if (rng.chance(Math.min(0.35, config.rareDropRate * hours * 0.45 + rareRateBonus))) {
    const books = [
      'BOOK_LOW_PHYSICAL_COMBO',
      'BOOK_LOW_MAGIC_COMBO',
      'BOOK_LOW_MAX_HP',
      'BOOK_LOW_HEALING_POWER',
    ];
    items[rng.pick(books) || books[0]] = 1;
  }
  if (rng.chance(Math.min(0.12, config.eggDropRate * hours))) {
    items.common_pet_egg = 1;
  }

  return {
    rewards: {
      gold: Math.max(
        1,
        Math.round(config.baseGoldPerHour * hours * rewardMultiplier * variance),
      ),
      petExp: Math.max(
        1,
        Math.round(config.basePetExpPerHour * hours * rewardMultiplier),
      ),
      items,
    },
    modifiers: {
      elementMatches,
      roleMatches,
      rewardMultiplier,
      rareRateBonus,
    },
  };
}
