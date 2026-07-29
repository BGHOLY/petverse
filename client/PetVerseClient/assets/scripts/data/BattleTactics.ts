export type TargetStrategy =
    | 'FRONT_FIRST'
    | 'BACK_FIRST'
    | 'LOWEST_HP'
    | 'HEALER_FIRST'
    | 'BOSS_FIRST';

export type SkillStrategy =
    | 'CAST_IMMEDIATELY'
    | 'CONTROL_COMBO'
    | 'BOSS_CAST'
    | 'EXECUTE';

export type SurvivalStrategy =
    | 'HEAL_LOW_HP'
    | 'PROTECT_BACKLINE'
    | 'FORMATION_AT_LOW_HP'
    | 'FULL_OFFENSE';

export type BattleTacticsPreset = {
    targetStrategy: TargetStrategy;
    skillStrategy: SkillStrategy;
    survivalStrategy: SurvivalStrategy;
};

export const DEFAULT_BATTLE_TACTICS: BattleTacticsPreset = {
    targetStrategy: 'LOWEST_HP',
    skillStrategy: 'CAST_IMMEDIATELY',
    survivalStrategy: 'PROTECT_BACKLINE',
};
