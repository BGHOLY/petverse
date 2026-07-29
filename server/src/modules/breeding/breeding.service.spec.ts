import { describe, expect, it } from '@jest/globals';
import { BreedingService } from './breeding.service';
import type { Pet } from '../pet/pet.entity';
import { getSkillSeedConfig } from '../skill/config/skill.config';

function parent(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 1,
    ownerId: 1,
    nickname: '测试宠物',
    species: '焰尾灵狐',
    speciesCode: 'PET001',
    isMutant: false,
    rarity: 4,
    quality: 100,
    skillSlotCount: 5,
    hpAptitude: 1300,
    attackAptitude: 1400,
    defenseAptitude: 1200,
    magicAptitude: 1350,
    speedAptitude: 1250,
    growth: 1.1,
    generation: 1,
    geneCode: 'AAAA',
    skills: [
      getSkillSeedConfig('LOW_PHYSICAL_COMBO'),
      getSkillSeedConfig('LOW_PHYSICAL_CRIT'),
      getSkillSeedConfig('SPECIAL_PET001'),
    ].filter(Boolean) as any[],
    ...overrides,
  } as Pet;
}

describe('BreedingService fusion blueprint', () => {
  const service = new BreedingService();

  it('is deterministic for the same seed', () => {
    const parentA = parent();
    const parentB = parent({
      id: 2,
      speciesCode: 'PET004',
      species: '月光猫',
      skills: [
        getSkillSeedConfig('LOW_HEALING_POWER'),
        getSkillSeedConfig('SPECIAL_PET004'),
      ].filter(Boolean) as any[],
    });

    expect(
      service.buildOffspring(parentA, parentB, 'fusion', 'stable-seed'),
    ).toEqual(
      service.buildOffspring(parentA, parentB, 'fusion', 'stable-seed'),
    );
  });

  it('never exceeds the rolled skill capacity and never duplicates skills', () => {
    for (let index = 0; index < 100; index += 1) {
      const result = service.buildOffspring(
        parent(),
        parent({ id: 2 }),
        'fusion',
        `capacity-${index}`,
      );
      const codes = result.inheritedSkills.map((skill) => skill.skillCode);
      expect(codes.length).toBeLessThanOrEqual(result.skillSlotCount);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it('guarantees valid locked ordinary skills without locking special skills', () => {
    const result = service.buildOffspring(
      parent(),
      parent({ id: 2 }),
      'fusion',
      'locked-seed',
      0,
      ['LOW_PHYSICAL_COMBO', 'SPECIAL_PET001'],
    );
    const codes = result.inheritedSkills.map((skill) => skill.skillCode);
    expect(codes).toContain('LOW_PHYSICAL_COMBO');
    expect(result.lockedSkillCodes).toEqual(['LOW_PHYSICAL_COMBO']);
  });

  it('can roll lower and higher capacities instead of guaranteeing growth', () => {
    const capacities = new Set<number>();
    for (let index = 0; index < 300; index += 1) {
      capacities.add(
        service.buildOffspring(
          parent(),
          parent({ id: 2 }),
          'fusion',
          `variance-${index}`,
        ).skillSlotCount,
      );
    }
    expect([...capacities].some((value) => value < 5)).toBe(true);
    expect([...capacities].some((value) => value > 5)).toBe(true);
  });
});
