export type FormationCode = 'dragon' | 'turtle' | 'crane' | 'tiger' | 'phoenix';

export type FormationSlot = {
  index: number;
  position: number;
  role: string;
  label: string;
  x: number;
  y: number;
  bonuses: Record<string, number>;
  bonusType: string;
  bonusValue: number;
  bonusText: string;
};

export type FormationConfig = {
  id: FormationCode;
  code: FormationCode;
  name: string;
  icon: string;
  description: string;
  slots: FormationSlot[];
  positions: FormationSlot[];
  teamBonuses: Record<string, number>;
  counters: FormationCode[];
  counteredBy: FormationCode[];
  ultimate: {
    name: string;
    description: string;
    energyCost: number;
    icon: string;
    initialCooldown: number;
    cooldown: number;
  };
};

const BONUS_LABELS: Record<string, string> = {
  defenseRate: '防御', tauntRate: '嘲讽率', physicalDamageRate: '物伤', critRate: '暴击',
  magicDamageRate: '法伤', energyRate: '能量', healingRate: '治疗', damageReductionRate: '减伤',
  shieldRate: '护盾', controlResistRate: '抗控', protectedDamageRate: '受护伤害', speedRate: '速度',
  controlAccuracyRate: '控制命中', abnormalDamageRate: '异常伤害', cleanseExtra: '额外净化',
  openingShieldRate: '开场护盾', shieldDamageRate: '破盾伤害', defenseIgnoreRate: '忽视防御',
  singleDamageRate: '单体伤害', executeDamageRate: '收割伤害', surviveOnce: '免死次数',
  surviveShieldRate: '免死护盾',
};

const slots = (
  entries: Array<[string, string, number, number, Record<string, number>]>,
): FormationSlot[] => entries.map((entry, index) => ({
  index,
  position: index + 1,
  role: entry[0],
  label: entry[1],
  x: entry[2],
  y: entry[3],
  bonuses: entry[4],
  bonusType: Object.keys(entry[4])[0] || 'attribute',
  bonusValue: Number(Object.values(entry[4])[0] || 0),
  bonusText: Object.entries(entry[4]).map(([key, value]) => {
    const label = BONUS_LABELS[key] || key;
    return `${label}+${Math.abs(value) < 1 ? Math.round(value * 100) + '%' : value}`;
  }).join(' / '),
}));

const FORMATION_SOURCES: Array<Omit<FormationConfig, 'positions'>> = [
  {
    id: 'dragon',
    code: 'dragon',
    name: '龙阵·均衡进攻',
    icon: '龙',
    description: '一前排、双物伤、法伤与治疗齐备，适合大部分主线。',
    slots: slots([
      ['tank', '肉盾位', 0, 155, { defenseRate: 0.12, tauntRate: 0.30 }],
      ['physical', '物伤位', -150, 30, { physicalDamageRate: 0.08, critRate: 0.03 }],
      ['physical', '物伤位', 150, 30, { physicalDamageRate: 0.08, critRate: 0.03 }],
      ['magic', '法伤位', -95, -120, { magicDamageRate: 0.10, energyRate: 0.05 }],
      ['healer', '治疗位', 95, -120, { healingRate: 0.12, damageReductionRate: 0.08 }],
    ]),
    teamBonuses: { damageRate: 0.04, speedRate: -0.03 },
    counters: ['tiger'],
    counteredBy: ['phoenix'],
    ultimate: {
      name: '龙威合击',
      description: '五宠依次追击集火目标，最后造成小范围法术伤害。',
      energyCost: 100,
      icon: '龙',
      initialCooldown: 3,
      cooldown: 5,
    },
  },
  {
    id: 'turtle',
    code: 'turtle',
    name: '龟阵·坚守续航',
    icon: '龟',
    description: '双前排保护核心，护盾和治疗收益更高。',
    slots: slots([
      ['tank', '肉盾位', -100, 145, { damageReductionRate: 0.10, tauntRate: 0.24 }],
      ['tank', '肉盾位', 100, 145, { damageReductionRate: 0.10, tauntRate: 0.24 }],
      ['support', '辅助位', 0, 15, { shieldRate: 0.15, controlResistRate: 0.10 }],
      ['damage', '输出位', -105, -125, { protectedDamageRate: 0.08 }],
      ['healer', '治疗位', 105, -125, { healingRate: 0.15, damageReductionRate: 0.05 }],
    ]),
    teamBonuses: { damageReductionRate: 0.06, damageRate: -0.05 },
    counters: ['phoenix'],
    counteredBy: ['crane'],
    ultimate: {
      name: '玄甲天幕',
      description: '全队获得最大生命10%的护盾，并提高前排嘲讽率1回合。',
      energyCost: 100,
      icon: '盾',
      initialCooldown: 2,
      cooldown: 5,
    },
  },
  {
    id: 'crane',
    code: 'crane',
    name: '鹤阵·先手控制',
    icon: '鹤',
    description: '强调速度、控制与异常目标追击。',
    slots: slots([
      ['speed', '先手位', 0, 160, { speedRate: 0.15, controlAccuracyRate: 0.10 }],
      ['control', '控制位', -145, 35, { controlAccuracyRate: 0.12, damageReductionRate: 0.08 }],
      ['damage', '输出位', 145, 35, { abnormalDamageRate: 0.12 }],
      ['support', '辅助位', -90, -125, { cleanseExtra: 1 }],
      ['healer', '治疗位', 90, -125, { openingShieldRate: 0.05 }],
    ]),
    teamBonuses: { speedRate: 0.06, defenseRate: -0.04 },
    counters: ['turtle'],
    counteredBy: ['tiger'],
    ultimate: {
      name: '流云先机',
      description: '全队行动条推进20%，并清除一个速度类减益。',
      energyCost: 100,
      icon: '羽',
      initialCooldown: 2,
      cooldown: 4,
    },
  },
  {
    id: 'tiger',
    code: 'tiger',
    name: '虎阵·单点爆发',
    icon: '虎',
    description: '破盾、猎印与低血量收割，适合首领和竞技场。',
    slots: slots([
      ['breaker', '破甲位', 0, 155, { shieldDamageRate: 0.20, defenseIgnoreRate: 0.06 }],
      ['physical', '主攻位', -145, 30, { singleDamageRate: 0.10 }],
      ['physical', '主攻位', 145, 30, { singleDamageRate: 0.10 }],
      ['execute', '收割位', -90, -125, { executeDamageRate: 0.15 }],
      ['support', '辅助位', 90, -125, { energyRate: 0.08 }],
    ]),
    teamBonuses: { singleDamageRate: 0.04 },
    counters: ['crane'],
    counteredBy: ['dragon'],
    ultimate: {
      name: '白虎猎杀',
      description: '给目标施加2回合猎印，全队对其伤害提高12%。',
      energyCost: 100,
      icon: '爪',
      initialCooldown: 3,
      cooldown: 5,
    },
  },
  {
    id: 'phoenix',
    code: 'phoenix',
    name: '凤阵·复苏法术',
    icon: '凤',
    description: '双法伤、治疗和复苏位提供高容错。',
    slots: slots([
      ['tank', '承伤位', 0, 155, { damageReductionRate: 0.08, tauntRate: 0.20 }],
      ['magic', '法伤位', -145, 30, { magicDamageRate: 0.08, energyRate: 0.08 }],
      ['magic', '法伤位', 145, 30, { magicDamageRate: 0.08, energyRate: 0.08 }],
      ['healer', '治疗位', -90, -125, { healingRate: 0.10 }],
      ['revive', '复苏位', 90, -125, { surviveOnce: 1, surviveShieldRate: 0.08 }],
    ]),
    teamBonuses: { magicDamageRate: 0.04, healingRate: 0.04 },
    counters: ['dragon'],
    counteredBy: ['turtle'],
    ultimate: {
      name: '涅槃之羽',
      description: '治疗全队8%最大生命，并复活最早阵亡单位至20%生命。',
      energyCost: 100,
      icon: '焰',
      initialCooldown: 3,
      cooldown: 6,
    },
  },
];

export const FORMATION_CONFIGS: FormationConfig[] = FORMATION_SOURCES.map((config) => ({
  ...config,
  positions: config.slots,
}));

export const FORMATION_UPGRADE_COSTS: Record<number, { knowledge: number; cores: number }> = {
  1: { knowledge: 100, cores: 0 },
  2: { knowledge: 150, cores: 0 },
  3: { knowledge: 220, cores: 0 },
  4: { knowledge: 300, cores: 1 },
  5: { knowledge: 400, cores: 0 },
  6: { knowledge: 550, cores: 0 },
  7: { knowledge: 750, cores: 0 },
  8: { knowledge: 1000, cores: 0 },
  9: { knowledge: 1350, cores: 3 },
};

export function getFormationConfig(code?: string | null) {
  return FORMATION_CONFIGS.find((item) => item.code === code) || FORMATION_CONFIGS[0];
}

export function formationLevelMultiplier(level: number) {
  const safe = Math.max(1, Math.min(10, Math.floor(Number(level || 1))));
  return 1 + (safe - 1) * 0.02;
}
