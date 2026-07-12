export type FormationCode = 'dragon' | 'turtle' | 'crane' | 'tiger' | 'phoenix';

export type FormationSlot = {
  index: number;
  role: string;
  label: string;
  x: number;
  y: number;
  bonuses: Record<string, number>;
};

export type FormationConfig = {
  code: FormationCode;
  name: string;
  description: string;
  slots: FormationSlot[];
  teamBonuses: Record<string, number>;
  ultimate: {
    name: string;
    description: string;
    initialCooldown: number;
    cooldown: number;
  };
};

const slots = (
  entries: Array<[string, string, number, number, Record<string, number>]>,
): FormationSlot[] => entries.map((entry, index) => ({
  index,
  role: entry[0],
  label: entry[1],
  x: entry[2],
  y: entry[3],
  bonuses: entry[4],
}));

export const FORMATION_CONFIGS: FormationConfig[] = [
  {
    code: 'dragon',
    name: '龙阵·均衡进攻',
    description: '一前排、双物伤、法伤与治疗齐备，适合大部分主线。',
    slots: slots([
      ['tank', '肉盾位', 0, 155, { defenseRate: 0.12, tauntRate: 0.30 }],
      ['physical', '物伤位', -150, 30, { physicalDamageRate: 0.08, critRate: 0.03 }],
      ['physical', '物伤位', 150, 30, { physicalDamageRate: 0.08, critRate: 0.03 }],
      ['magic', '法伤位', -95, -120, { magicDamageRate: 0.10, energyRate: 0.05 }],
      ['healer', '治疗位', 95, -120, { healingRate: 0.12, damageReductionRate: 0.08 }],
    ]),
    teamBonuses: { damageRate: 0.04, speedRate: -0.03 },
    ultimate: {
      name: '龙威合击',
      description: '五宠依次追击集火目标，最后造成小范围法术伤害。',
      initialCooldown: 3,
      cooldown: 5,
    },
  },
  {
    code: 'turtle',
    name: '龟阵·坚守续航',
    description: '双前排保护核心，护盾和治疗收益更高。',
    slots: slots([
      ['tank', '肉盾位', -100, 145, { damageReductionRate: 0.10, tauntRate: 0.24 }],
      ['tank', '肉盾位', 100, 145, { damageReductionRate: 0.10, tauntRate: 0.24 }],
      ['support', '辅助位', 0, 15, { shieldRate: 0.15, controlResistRate: 0.10 }],
      ['damage', '输出位', -105, -125, { protectedDamageRate: 0.08 }],
      ['healer', '治疗位', 105, -125, { healingRate: 0.15, damageReductionRate: 0.05 }],
    ]),
    teamBonuses: { damageReductionRate: 0.06, damageRate: -0.05 },
    ultimate: {
      name: '玄甲天幕',
      description: '全队获得最大生命10%的护盾，并提高前排嘲讽率1回合。',
      initialCooldown: 2,
      cooldown: 5,
    },
  },
  {
    code: 'crane',
    name: '鹤阵·先手控制',
    description: '强调速度、控制与异常目标追击。',
    slots: slots([
      ['speed', '先手位', 0, 160, { speedRate: 0.15, controlAccuracyRate: 0.10 }],
      ['control', '控制位', -145, 35, { controlAccuracyRate: 0.12, damageReductionRate: 0.08 }],
      ['damage', '输出位', 145, 35, { abnormalDamageRate: 0.12 }],
      ['support', '辅助位', -90, -125, { cleanseExtra: 1 }],
      ['healer', '治疗位', 90, -125, { openingShieldRate: 0.05 }],
    ]),
    teamBonuses: { speedRate: 0.06, defenseRate: -0.04 },
    ultimate: {
      name: '流云先机',
      description: '全队行动条推进20%，并清除一个速度类减益。',
      initialCooldown: 2,
      cooldown: 4,
    },
  },
  {
    code: 'tiger',
    name: '虎阵·单点爆发',
    description: '破盾、猎印与低血量收割，适合首领和竞技场。',
    slots: slots([
      ['breaker', '破甲位', 0, 155, { shieldDamageRate: 0.20, defenseIgnoreRate: 0.06 }],
      ['physical', '主攻位', -145, 30, { singleDamageRate: 0.10 }],
      ['physical', '主攻位', 145, 30, { singleDamageRate: 0.10 }],
      ['execute', '收割位', -90, -125, { executeDamageRate: 0.15 }],
      ['support', '辅助位', 90, -125, { energyRate: 0.08 }],
    ]),
    teamBonuses: { singleDamageRate: 0.04 },
    ultimate: {
      name: '白虎猎杀',
      description: '给目标施加2回合猎印，全队对其伤害提高12%。',
      initialCooldown: 3,
      cooldown: 5,
    },
  },
  {
    code: 'phoenix',
    name: '凤阵·复苏法术',
    description: '双法伤、治疗和复苏位提供高容错。',
    slots: slots([
      ['tank', '承伤位', 0, 155, { damageReductionRate: 0.08, tauntRate: 0.20 }],
      ['magic', '法伤位', -145, 30, { magicDamageRate: 0.08, energyRate: 0.08 }],
      ['magic', '法伤位', 145, 30, { magicDamageRate: 0.08, energyRate: 0.08 }],
      ['healer', '治疗位', -90, -125, { healingRate: 0.10 }],
      ['revive', '复苏位', 90, -125, { surviveOnce: 1, surviveShieldRate: 0.08 }],
    ]),
    teamBonuses: { magicDamageRate: 0.04, healingRate: 0.04 },
    ultimate: {
      name: '涅槃之羽',
      description: '治疗全队8%最大生命，并复活最早阵亡单位至20%生命。',
      initialCooldown: 3,
      cooldown: 6,
    },
  },
];

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
