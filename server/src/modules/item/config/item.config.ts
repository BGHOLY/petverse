import {
  ALL_SKILL_CONFIGS,
  SKILL_CONFIG_VERSION,
} from '../../skill/config/skill.config';

export interface ItemSeedConfig {
  itemCode: string;
  name: string;
  description: string;
  type: string;
  rarity: number;
  maxStack: number;
  usable: boolean;
  effect: string;
  effectValue: number;
  effectData: Record<string, any>;
  enabled: boolean;
  version: string;
}

export interface ShopSeedConfig {
  itemCode: string;
  currencyType: 'gold' | 'diamond';
  price: number;
  quantity: number;
}

export const ITEM_CONFIG_VERSION = '2.5.0';

export const CORE_ITEM_CONFIGS: ItemSeedConfig[] = [
  {
    itemCode: 'apple',
    name: '苹果',
    description: '使用后饥饿值 +20。',
    type: 'food',
    rarity: 1,
    maxStack: 999,
    usable: true,
    effect: 'hunger',
    effectValue: 20,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'dried_fish',
    name: '小鱼干',
    description: '使用后快乐值 +20。',
    type: 'food',
    rarity: 1,
    maxStack: 999,
    usable: true,
    effect: 'happiness',
    effectValue: 20,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'clean_spray',
    name: '清洁喷雾',
    description: '使用后清洁值 +20。',
    type: 'clean',
    rarity: 1,
    maxStack: 999,
    usable: true,
    effect: 'cleanliness',
    effectValue: 20,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'exp_potion_small',
    name: '初级经验药水',
    description: '宝宝经验 +50。',
    type: 'potion',
    rarity: 1,
    maxStack: 999,
    usable: true,
    effect: 'exp',
    effectValue: 50,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'exp_potion_medium',
    name: '中级经验药水',
    description: '宝宝经验 +150。',
    type: 'potion',
    rarity: 2,
    maxStack: 999,
    usable: true,
    effect: 'exp',
    effectValue: 150,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'exp_potion_large',
    name: '高级经验药水',
    description: '宝宝经验 +500。',
    type: 'potion',
    rarity: 3,
    maxStack: 999,
    usable: true,
    effect: 'exp',
    effectValue: 500,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'common_pet_egg',
    name: '普通宠物蛋',
    description: '使用后进入孵化列表。',
    type: 'egg',
    rarity: 1,
    maxStack: 99,
    usable: true,
    effect: 'egg',
    effectValue: 1,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'rare_pet_egg',
    name: '稀有宠物蛋',
    description: '使用后进入孵化列表。',
    type: 'egg',
    rarity: 3,
    maxStack: 99,
    usable: true,
    effect: 'egg',
    effectValue: 3,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'breeding_token',
    name: '繁育凭证',
    description: '生蛋时消耗1个。',
    type: 'material',
    rarity: 2,
    maxStack: 999,
    usable: false,
    effect: 'breeding_cost',
    effectValue: 1,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'fusion_core',
    name: '合宠核心',
    description: '正式合宠时消耗1个。',
    type: 'material',
    rarity: 3,
    maxStack: 999,
    usable: false,
    effect: 'fusion_cost',
    effectValue: 1,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'skill_lock',
    name: '技能锁印',
    description: '打书时保护普通技能。锁1/2/3/4个技能分别消耗1/3/7/15个。',
    type: 'material',
    rarity: 3,
    maxStack: 9999,
    usable: false,
    effect: 'skill_lock',
    effectValue: 1,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'mutation_essence',
    name: '变异精华',
    description: '后续变异活动与高级繁育使用。',
    type: 'material',
    rarity: 4,
    maxStack: 999,
    usable: false,
    effect: 'mutation_bonus',
    effectValue: 1,
    effectData: { mutationRateBonus: 0.03 },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'pet_capacity_ticket',
    name: '宝宝仓库扩容券',
    description: '使用后宝宝容量永久增加10格，最高200格。',
    type: 'capacity',
    rarity: 4,
    maxStack: 99,
    usable: false,
    effect: 'pet_capacity_expand',
    effectValue: 10,
    effectData: { maxCapacity: 200 },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'hatch_sandglass_small',
    name: '初级孵化沙漏',
    description: '在孵化装置中使用，立即减少10分钟孵化时间。',
    type: 'hatch_accelerator',
    rarity: 2,
    maxStack: 999,
    usable: false,
    effect: 'hatch_acceleration',
    effectValue: 600,
    effectData: { seconds: 600 },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'hatch_sandglass_large',
    name: '高级孵化沙漏',
    description: '在孵化装置中使用，立即减少1小时孵化时间。',
    type: 'hatch_accelerator',
    rarity: 4,
    maxStack: 999,
    usable: false,
    effect: 'hatch_acceleration',
    effectValue: 3600,
    effectData: { seconds: 3600 },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'adventure_leaf',
    name: '生态叶片',
    description: '区域探索中获得的基础成长材料。',
    type: 'material',
    rarity: 1,
    maxStack: 9999,
    usable: false,
    effect: 'adventure_material',
    effectValue: 1,
    effectData: { source: 'adventure' },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'boss_core',
    name: '首领晶核',
    description: '击败区域首领后获得的稀有成长材料。',
    type: 'material',
    rarity: 4,
    maxStack: 9999,
    usable: false,
    effect: 'boss_material',
    effectValue: 1,
    effectData: { source: 'boss' },
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
  {
    itemCode: 'season_token',
    name: '赛季徽章',
    description: '赛季结算与赛季商店使用的纪念货币。',
    type: 'season',
    rarity: 4,
    maxStack: 9999,
    usable: false,
    effect: 'season_currency',
    effectValue: 1,
    effectData: {},
    enabled: true,
    version: ITEM_CONFIG_VERSION,
  },
];

export const SKILL_BOOK_ITEM_CONFIGS: ItemSeedConfig[] =
  ALL_SKILL_CONFIGS
    .filter((skill) => skill.canPurchase && skill.tier !== 'special')
    .map((skill) => ({
      itemCode: `BOOK_${skill.skillCode}`,
      name: `${skill.name}技能书`,
      description: `让宝宝学习“${skill.name}”。高级技能会直接替换同家族低级技能。`,
      type: 'skill_book',
      rarity: skill.tier === 'high' ? 5 : 2,
      maxStack: 999,
      usable: false,
      effect: 'learn_skill',
      effectValue: 1,
      effectData: {
        skillCode: skill.skillCode,
        familyCode: skill.familyCode,
        tier: skill.tier,
      },
      enabled: true,
      version: `${ITEM_CONFIG_VERSION}/${SKILL_CONFIG_VERSION}`,
    }));

export const ALL_ITEM_CONFIGS: ItemSeedConfig[] = [
  ...CORE_ITEM_CONFIGS,
  ...SKILL_BOOK_ITEM_CONFIGS,
];

const lowBooks = SKILL_BOOK_ITEM_CONFIGS.filter(
  (item) => item.effectData?.tier === 'low',
);
const highBooks = SKILL_BOOK_ITEM_CONFIGS.filter(
  (item) => item.effectData?.tier === 'high',
);

export const SHOP_ITEM_CONFIGS: ShopSeedConfig[] = [
  { itemCode: 'apple', currencyType: 'gold', price: 50, quantity: 1 },
  { itemCode: 'dried_fish', currencyType: 'gold', price: 120, quantity: 1 },
  { itemCode: 'clean_spray', currencyType: 'gold', price: 80, quantity: 1 },
  { itemCode: 'exp_potion_small', currencyType: 'gold', price: 100, quantity: 1 },
  { itemCode: 'exp_potion_medium', currencyType: 'gold', price: 300, quantity: 1 },
  { itemCode: 'exp_potion_large', currencyType: 'diamond', price: 10, quantity: 1 },
  { itemCode: 'common_pet_egg', currencyType: 'gold', price: 500, quantity: 1 },
  { itemCode: 'rare_pet_egg', currencyType: 'diamond', price: 30, quantity: 1 },
  { itemCode: 'breeding_token', currencyType: 'gold', price: 800, quantity: 1 },
  { itemCode: 'fusion_core', currencyType: 'gold', price: 1800, quantity: 1 },
  { itemCode: 'skill_lock', currencyType: 'gold', price: 120, quantity: 1 },
  { itemCode: 'mutation_essence', currencyType: 'diamond', price: 25, quantity: 1 },
  { itemCode: 'pet_capacity_ticket', currencyType: 'diamond', price: 50, quantity: 1 },
  { itemCode: 'hatch_sandglass_small', currencyType: 'gold', price: 200, quantity: 1 },
  { itemCode: 'hatch_sandglass_large', currencyType: 'diamond', price: 12, quantity: 1 },
  ...lowBooks.map((item) => ({
    itemCode: item.itemCode,
    currencyType: 'gold' as const,
    price: 600,
    quantity: 1,
  })),
  ...highBooks.map((item) => ({
    itemCode: item.itemCode,
    currencyType: 'diamond' as const,
    price: 35,
    quantity: 1,
  })),
];

export function getSkillBookItemCode(skillCode: string) {
  return `BOOK_${String(skillCode || '').trim()}`;
}

export function getItemSeedConfig(itemCode: string) {
  return ALL_ITEM_CONFIGS.find(
    (item) => item.itemCode === String(itemCode || '').trim(),
  );
}
