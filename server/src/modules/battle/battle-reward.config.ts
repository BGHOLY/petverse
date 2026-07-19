export const FORMATION_ENERGY_GAINS = {
  normalAttack: 8,
  activeSkill: 12,
  damageTaken: 5,
  kill: 18,
  specialSkill: 10,
} as const;

export type BattleRewardConfig = {
  gold: number;
  diamond: number;
  playerExp: number;
  petExp: number;
  items: Record<string, number>;
};

export const BATTLE_REWARD_CONFIGS: Record<string, BattleRewardConfig> = {
  pve: {
    gold: 160,
    diamond: 0,
    playerExp: 50,
    petExp: 120,
    items: { adventure_leaf: 2 },
  },
  boss: {
    gold: 320,
    diamond: 1,
    playerExp: 120,
    petExp: 220,
    items: { adventure_leaf: 3, boss_core: 1 },
  },
  tower: {
    gold: 280,
    diamond: 0,
    playerExp: 80,
    petExp: 140,
    items: { adventure_leaf: 2 },
  },
  arena: {
    gold: 0,
    diamond: 0,
    playerExp: 0,
    petExp: 0,
    items: {},
  },
};

export function battleRewardConfig(mode: string, bossBattle: boolean) {
  if (bossBattle) return BATTLE_REWARD_CONFIGS.boss;
  return BATTLE_REWARD_CONFIGS[String(mode || 'pve')] || BATTLE_REWARD_CONFIGS.pve;
}
