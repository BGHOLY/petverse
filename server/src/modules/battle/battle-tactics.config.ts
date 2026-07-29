export const TARGET_STRATEGIES = [
  'FRONT_FIRST',
  'BACK_FIRST',
  'LOWEST_HP',
  'HEALER_FIRST',
  'BOSS_FIRST',
] as const;

export const SKILL_STRATEGIES = [
  'CAST_IMMEDIATELY',
  'CONTROL_COMBO',
  'BOSS_CAST',
  'EXECUTE',
] as const;

export const SURVIVAL_STRATEGIES = [
  'HEAL_LOW_HP',
  'PROTECT_BACKLINE',
  'FORMATION_AT_LOW_HP',
  'FULL_OFFENSE',
] as const;

export type BattleTacticsPreset = {
  targetStrategy: (typeof TARGET_STRATEGIES)[number];
  skillStrategy: (typeof SKILL_STRATEGIES)[number];
  survivalStrategy: (typeof SURVIVAL_STRATEGIES)[number];
  focusPriority: string;
  guardTarget: string;
  shieldThreshold: number;
  cleansePriority: string[];
  ultimatePolicy: string;
  version: string;
};

const targetToLegacy: Record<string, string> = {
  FRONT_FIRST: 'front',
  BACK_FIRST: 'back',
  LOWEST_HP: 'lowestHp',
  HEALER_FIRST: 'healer',
  BOSS_FIRST: 'boss',
};

const legacyToTarget: Record<string, BattleTacticsPreset['targetStrategy']> = {
  front: 'FRONT_FIRST',
  back: 'BACK_FIRST',
  lowestHp: 'LOWEST_HP',
  healer: 'HEALER_FIRST',
  boss: 'BOSS_FIRST',
};

export function normalizeBattleTactics(raw: any): BattleTacticsPreset {
  const source = raw && typeof raw === 'object' ? raw : {};
  const targetStrategy = TARGET_STRATEGIES.includes(source.targetStrategy)
    ? source.targetStrategy
    : legacyToTarget[String(source.focusPriority || '')] || 'LOWEST_HP';
  const skillStrategy = SKILL_STRATEGIES.includes(source.skillStrategy)
    ? source.skillStrategy
    : source.ultimatePolicy === 'bossPhase'
      ? 'BOSS_CAST'
      : source.ultimatePolicy === 'lowHp'
        ? 'EXECUTE'
        : 'CAST_IMMEDIATELY';
  const survivalStrategy = SURVIVAL_STRATEGIES.includes(
    source.survivalStrategy,
  )
    ? source.survivalStrategy
    : !source.guardTarget &&
        source.shieldThreshold === undefined &&
        !source.ultimatePolicy
      ? 'PROTECT_BACKLINE'
      : source.guardTarget === 'off' && Number(source.shieldThreshold || 0) === 0
      ? 'FULL_OFFENSE'
      : source.ultimatePolicy === 'lowHp'
        ? 'FORMATION_AT_LOW_HP'
        : source.guardTarget === 'healer'
          ? 'PROTECT_BACKLINE'
          : 'HEAL_LOW_HP';

  const survivalLegacy =
    survivalStrategy === 'FULL_OFFENSE'
      ? { guardTarget: 'off', shieldThreshold: 0 }
      : survivalStrategy === 'PROTECT_BACKLINE'
        ? { guardTarget: 'healer', shieldThreshold: 40 }
        : survivalStrategy === 'FORMATION_AT_LOW_HP'
          ? { guardTarget: 'lowestDefense', shieldThreshold: 40 }
          : { guardTarget: 'healer', shieldThreshold: 60 };

  return {
    targetStrategy,
    skillStrategy,
    survivalStrategy,
    focusPriority: targetToLegacy[targetStrategy],
    guardTarget: survivalLegacy.guardTarget,
    shieldThreshold: survivalLegacy.shieldThreshold,
    cleansePriority:
      Array.isArray(source.cleansePriority) && source.cleansePriority.length
        ? source.cleansePriority.map(String).slice(0, 4)
        : ['control', 'healBlock', 'dot'],
    ultimatePolicy:
      skillStrategy === 'BOSS_CAST'
        ? 'bossPhase'
        : skillStrategy === 'EXECUTE' ||
            survivalStrategy === 'FORMATION_AT_LOW_HP'
          ? 'lowHp'
          : 'ready',
    version: '1.0.0',
  };
}

export const BATTLE_TACTICS_OPTIONS = {
  targetStrategies: [
    { code: 'FRONT_FIRST', name: '优先前排' },
    { code: 'BACK_FIRST', name: '优先后排' },
    { code: 'LOWEST_HP', name: '优先最低血量' },
    { code: 'HEALER_FIRST', name: '优先治疗单位' },
    { code: 'BOSS_FIRST', name: '优先首领' },
  ],
  skillStrategies: [
    { code: 'CAST_IMMEDIATELY', name: '怒气满立即释放' },
    { code: 'CONTROL_COMBO', name: '等待控制后释放' },
    { code: 'BOSS_CAST', name: '首领蓄力时释放' },
    { code: 'EXECUTE', name: '保留技能用于收割' },
  ],
  survivalStrategies: [
    { code: 'HEAL_LOW_HP', name: '残血优先治疗' },
    { code: 'PROTECT_BACKLINE', name: '优先援护后排' },
    { code: 'FORMATION_AT_LOW_HP', name: '低血量释放阵法技' },
    { code: 'FULL_OFFENSE', name: '保持进攻' },
  ],
};
