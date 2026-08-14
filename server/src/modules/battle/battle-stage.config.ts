export type BattleStageConfig = {
  regionCode: string;
  stageCode: string;
  title: string;
  subtitle: string;
  objective: string;
  mechanic: string;
  tutorialTip: string;
  difficulty: number;
  recommendedPower: number;
  enemyFormationCode: string;
  enemySpeciesCodes: string[];
  focusTargetSpeciesCode?: string;
  boss: boolean;
  maxRounds: number;
};

const moonForest = (
  stageCode: string,
  title: string,
  subtitle: string,
  objective: string,
  mechanic: string,
  tutorialTip: string,
  difficulty: number,
  recommendedPower: number,
  enemyFormationCode: string,
  enemySpeciesCodes: string[],
  focusTargetSpeciesCode?: string,
): BattleStageConfig => ({
  regionCode: 'moon-forest',
  stageCode,
  title,
  subtitle,
  objective,
  mechanic,
  tutorialTip,
  difficulty,
  recommendedPower,
  enemyFormationCode,
  enemySpeciesCodes,
  focusTargetSpeciesCode,
  boss: false,
  maxRounds: 25,
});

export const CHAPTER_ONE_BATTLE_STAGES: readonly BattleStageConfig[] = [
  moonForest(
    'stage-1',
    '月辉林径',
    '集火教学',
    '优先击败敌方月光猫',
    '敌方治疗会延长战斗，先处理后排治疗位。',
    '点击敌方月光猫头像设置集火目标。',
    0.8,
    2400,
    'turtle',
    ['PET002', 'PET003', 'PET004', 'PET006', 'PET004'],
    'PET004',
  ),
  moonForest(
    'stage-2',
    '岩甲坡',
    '护盾识别',
    '击破岩甲龟的全队护盾',
    '双前排会保护后排，持续输出比频繁换目标更有效。',
    '阵法能量满后释放大招，快速打穿护盾。',
    0.86,
    2700,
    'turtle',
    ['PET002', 'PET002', 'PET006', 'PET004', 'PET003'],
    'PET002',
  ),
  moonForest(
    'stage-3',
    '花鹿清泉',
    '治疗压制',
    '在森灵鹿完成治疗循环前击败它',
    '森灵鹿会治疗残血队友，并把过量治疗转化为护盾。',
    '保留阵法大招，在森灵鹿准备治疗时集中爆发。',
    0.92,
    3000,
    'phoenix',
    ['PET002', 'PET006', 'PET008', 'PET004', 'PET003'],
    'PET008',
  ),
  moonForest(
    'stage-4',
    '月影伏击',
    '速度应对',
    '承受敌方先手并保护己方后排',
    '疾风兔与炎尾狐拥有更高速度，会先攻击低生命目标。',
    '前排生存不足时，调整站位或改用龟阵。',
    0.99,
    3400,
    'crane',
    ['PET003', 'PET001', 'PET006', 'PET004', 'PET003'],
    'PET001',
  ),
  moonForest(
    'stage-5',
    '巢穴前哨',
    '综合试炼',
    '在十回合内击败守卫并保留三只宠物',
    '敌方同时拥有前排、治疗与爆发，是首领战前的阵容检查。',
    '先集火治疗位，再用阵法大招收掉残血目标。',
    1.06,
    3900,
    'dragon',
    ['PET002', 'PET001', 'PET008', 'PET004', 'PET006'],
    'PET008',
  ),
  {
    regionCode: 'moon-forest',
    stageCode: 'boss',
    title: '古树守卫',
    subtitle: '第一章首领',
    objective: '观察根震预警，在爆发前决定集火或保留阵法大招',
    mechanic: '古树守卫独立积累机制能量，预警后下一回合释放古树根震，生命低于55%进入狂化阶段。',
    tutorialTip: '预警出现后优先处理残血目标；无法击倒首领时，保留防御或治疗型阵法大招。',
    difficulty: 1.22,
    recommendedPower: 4700,
    enemyFormationCode: 'turtle',
    enemySpeciesCodes: ['PET008', 'PET002', 'PET004', 'PET003', 'PET006'],
    focusTargetSpeciesCode: 'PET008',
    boss: true,
    maxRounds: 35,
  },
] as const;

export function findBattleStageConfig(
  regionCode: unknown,
  stageCode: unknown,
  boss = false,
) {
  const normalizedRegion = String(regionCode || '');
  const normalizedStage = boss ? 'boss' : String(stageCode || '');
  return CHAPTER_ONE_BATTLE_STAGES.find(
    (stage) =>
      stage.regionCode === normalizedRegion &&
      stage.stageCode === normalizedStage &&
      stage.boss === Boolean(boss),
  );
}

export function battleStageViews(regionCode: unknown, boss = false) {
  return CHAPTER_ONE_BATTLE_STAGES.filter(
    (stage) =>
      stage.regionCode === String(regionCode || '') &&
      stage.boss === Boolean(boss),
  ).map((stage) => ({ ...stage, enemySpeciesCodes: [...stage.enemySpeciesCodes] }));
}
