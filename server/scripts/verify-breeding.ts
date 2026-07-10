import { BreedingService } from '../src/modules/breeding/breeding.service';

const service = new BreedingService();

function createParent(
  id: number,
  speciesCode: string,
  skillSlotCount: number,
  specialSkillCodes: string[] = [],
) {
  const normalCodes = [
    'LOW_PHYSICAL_COMBO',
    'LOW_PHYSICAL_CRIT',
    'LOW_PHYSICAL_POWER',
    'LOW_AMBUSH',
    'LOW_PURSUIT',
    'LOW_SPEED_UP',
    'LOW_ACCURACY',
    'LOW_DEATH_SAVE',
    'LOW_MAX_HP',
    'LOW_REGEN',
  ];
  const skills = [
    ...specialSkillCodes.map((skillCode) => ({
      skillCode,
      tier: 'special',
    })),
  ];

  for (const skillCode of normalCodes) {
    if (skills.length >= skillSlotCount) break;
    skills.push({ skillCode, tier: 'low' });
  }

  return {
    id,
    ownerId: 1,
    nickname: `Parent-${id}`,
    speciesCode,
    species: speciesCode,
    isMutant: false,
    rarity: 4,
    quality: 105,
    skillSlotCount,
    skills,
    hpAptitude: 1400,
    attackAptitude: 1400,
    defenseAptitude: 1300,
    magicAptitude: 1400,
    speedAptitude: 1400,
    growth: 1.18,
    generation: 2,
    geneCode: 'AAAA',
    geneScore: 12,
    bodyType: 'normal',
    color: 'white',
    pattern: 'none',
  } as any;
}

function runCase(
  name: string,
  slotA: number,
  slotB: number,
  mode: 'breed' | 'fusion',
  iterations: number,
) {
  const capacityDistribution: Record<number, number> = {};
  const specialDistribution: Record<number, number> = {};
  let invalid = 0;

  for (let index = 0; index < iterations; index += 1) {
    const parentA = createParent(1, 'PET001', slotA, [
      'SPECIAL_PET001',
      'SPECIAL_PET007',
    ]);
    const parentB = createParent(2, 'PET010', slotB, [
      'SPECIAL_PET010',
    ]);
    const result = service.buildOffspring(
      parentA,
      parentB,
      mode,
      `${name}-${index}`,
    );

    capacityDistribution[result.skillSlotCount] =
      (capacityDistribution[result.skillSlotCount] || 0) + 1;
    specialDistribution[result.specialSkillCount] =
      (specialDistribution[result.specialSkillCount] || 0) + 1;

    if (
      result.skillSlotCount < 2 ||
      result.skillSlotCount > 10 ||
      result.inheritedSkills.length !== result.skillSlotCount ||
      result.specialSkillCount > result.skillSlotCount - 1
    ) {
      invalid += 1;
    }
  }

  console.log(`\n${name}`);
  console.log('技能格分布:', capacityDistribution);
  console.log('特殊技能数量分布:', specialDistribution);
  console.log('非法结果:', invalid);
}

runCase('5+5 生蛋', 5, 5, 'breed', 10000);
runCase('5+5 合宠', 5, 5, 'fusion', 10000);
runCase('7+8 合宠', 7, 8, 'fusion', 10000);
runCase('10+10 合宠', 10, 10, 'fusion', 10000);
