import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import { createRandomSeed, SeededRandom } from '../breeding/utils/seeded-random.util';
import {
  ALL_SKILL_CONFIGS,
  getSkillSeedConfig,
  isSpecialSkill,
  SKILL_CONFIG_VERSION,
} from './config/skill.config';
import { SkillLearningLog } from './skill-learning-log.entity';
import { Skill } from './skill.entity';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,

    @InjectRepository(SkillLearningLog)
    private readonly skillLearningLogRepository: Repository<SkillLearningLog>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async seedDefaultSkills() {
    const saved: Skill[] = [];

    for (const data of ALL_SKILL_CONFIGS) {
      let skill = await this.skillRepository.findOne({
        where: { skillCode: data.skillCode },
      });

      if (!skill) {
        skill = this.skillRepository.create(data);
      } else {
        Object.assign(skill, data);
      }

      saved.push(await this.skillRepository.save(skill));
    }

    const configuredCodes = new Set(
      ALL_SKILL_CONFIGS.map((skill) => skill.skillCode),
    );
    const allStored = await this.skillRepository.find();
    for (const legacy of allStored) {
      if (!configuredCodes.has(legacy.skillCode) && legacy.enabled !== false) {
        legacy.enabled = false;
        await this.skillRepository.save(legacy);
      }
    }

    return {
      success: true,
      count: saved.length,
      lowCount: saved.filter((skill) => skill.tier === 'low').length,
      highCount: saved.filter((skill) => skill.tier === 'high').length,
      specialCount: saved.filter((skill) => skill.tier === 'special').length,
      skills: await this.findAllEnabledSkills(),
    };
  }

  async getAllSkills() {
    const sentinel = await this.skillRepository.findOne({
      where: { skillCode: 'SPECIAL_PET010' },
    });
    if (!sentinel || sentinel.version !== SKILL_CONFIG_VERSION) {
      await this.seedDefaultSkills();
    }
    return this.findAllEnabledSkills();
  }

  async getSkillByCode(skillCode: string) {
    let skill = await this.skillRepository.findOne({
      where: {
        skillCode: String(skillCode || ''),
        enabled: true,
      },
    });

    if (!skill && getSkillSeedConfig(skillCode)) {
      await this.seedDefaultSkills();
      skill = await this.skillRepository.findOne({
        where: {
          skillCode: String(skillCode || ''),
          enabled: true,
        },
      });
    }

    return skill;
  }

  async getSkillSnapshot(skillCode: string) {
    const skill = await this.getSkillByCode(skillCode);
    const config = skill || getSkillSeedConfig(skillCode);
    return config ? this.toSnapshot(config) : null;
  }

  async generateRandomSkills(
    petRarity: number,
    slotCount: number,
    speciesCode = '',
  ) {
    let skills = await this.getAllSkills();

    if (!skills.length) {
      await this.seedDefaultSkills();
      skills = await this.getAllSkills();
    }

    const targetCount = Math.max(0, Math.min(10, Math.floor(Number(slotCount || 0))));
    const highChance = Math.max(0, Math.min(0.18, (Number(petRarity || 1) - 3) * 0.04));
    const candidates = skills.filter((skill) => {
      if (skill.tier === 'special') return false;
      if (skill.tier === 'high') return Math.random() < highChance;
      return true;
    });

    const selected: Skill[] = [];
    const usedFamilies = new Set<string>();
    const usedConflictGroups = new Set<string>();

    while (selected.length < targetCount && selected.length < candidates.length) {
      const available = candidates.filter((skill) => {
        const family = String(skill.familyCode || skill.skillCode);
        if (usedFamilies.has(family)) return false;
        if (skill.conflictGroup && usedConflictGroups.has(skill.conflictGroup)) return false;
        return true;
      });

      const picked = this.pickWeightedSkill(available, petRarity, speciesCode);
      if (!picked) break;

      selected.push(picked);
      usedFamilies.add(String(picked.familyCode || picked.skillCode));
      if (picked.conflictGroup) usedConflictGroups.add(picked.conflictGroup);
    }

    return selected.map((skill) => this.toSnapshot(skill));
  }

  async learnSkill(
    ownerId: number,
    petId: number,
    skillCode: string,
    lockedSkillCodes: string[] = [],
    requestedSeed?: string,
  ) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet || pet.ownerId !== ownerId || pet.isEgg) {
      return { success: false, message: 'Pet not found' };
    }

    const bookSkill = await this.getSkillByCode(skillCode);
    if (!bookSkill || bookSkill.tier === 'special' || !bookSkill.canPurchase) {
      return { success: false, message: 'Skill book is invalid' };
    }

    const beforeSkills = await this.normalizeSkillList(pet.skills);
    const lockSet = new Set(
      [...new Set((lockedSkillCodes || []).map((code) => String(code || '')))]
        .filter(Boolean)
        .slice(0, 4),
    );

    for (const code of lockSet) {
      const existing = beforeSkills.find((skill) => skill.skillCode === code);
      if (!existing) {
        return { success: false, message: `Locked skill not found: ${code}` };
      }
      if (existing.canLock === false || isSpecialSkill(existing)) {
        return { success: false, message: `Skill cannot be locked: ${code}` };
      }
    }

    if (beforeSkills.some((skill) => skill.skillCode === bookSkill.skillCode)) {
      return { success: false, message: 'Pet already has this skill' };
    }

    const afterSkills = beforeSkills.map((skill) => ({ ...skill }));
    const newSkill = this.toSnapshot(bookSkill);
    let overwrittenSkillCode = '';

    // 高级技能直接升级同家族低级技能，不触发随机顶格。
    const familyIndex = afterSkills.findIndex(
      (skill) =>
        skill.familyCode === newSkill.familyCode &&
        skill.skillCode !== newSkill.skillCode,
    );
    if (bookSkill.tier === 'high' && familyIndex >= 0) {
      overwrittenSkillCode = afterSkills[familyIndex].skillCode;
      afterSkills[familyIndex] = newSkill;
    } else {
      const conflictIndex = bookSkill.conflictGroup
        ? afterSkills.findIndex(
            (skill) => skill.conflictGroup === bookSkill.conflictGroup,
          )
        : -1;

      if (conflictIndex >= 0) {
        const conflictSkill = afterSkills[conflictIndex];
        if (lockSet.has(conflictSkill.skillCode)) {
          return {
            success: false,
            message: 'Conflicting skill is locked',
          };
        }
        overwrittenSkillCode = conflictSkill.skillCode;
        afterSkills[conflictIndex] = newSkill;
      } else {
        const capacity = Math.max(
          2,
          Math.min(10, Number(pet.skillSlotCount || beforeSkills.length || 3)),
        );

        if (afterSkills.length < capacity) {
          afterSkills.push(newSkill);
        } else {
          const candidates = afterSkills
            .map((skill, index) => ({ skill, index }))
            .filter(({ skill }) => {
              if (lockSet.has(skill.skillCode)) return false;
              return skill.canOverwrite !== false;
            });

          if (!candidates.length) {
            return {
              success: false,
              message: 'No skill can be overwritten',
            };
          }

          const seed = String(requestedSeed || createRandomSeed('skill-book'));
          const rng = new SeededRandom(seed);
          const selected = rng.pick(candidates);
          if (!selected) {
            return { success: false, message: 'Skill overwrite failed' };
          }

          overwrittenSkillCode = selected.skill.skillCode;
          afterSkills[selected.index] = newSkill;
          return this.saveSkillLearningResult(
            pet,
            ownerId,
            bookSkill.skillCode,
            beforeSkills,
            afterSkills,
            [...lockSet],
            overwrittenSkillCode,
            seed,
          );
        }
      }
    }

    const seed = String(requestedSeed || createRandomSeed('skill-book'));
    return this.saveSkillLearningResult(
      pet,
      ownerId,
      bookSkill.skillCode,
      beforeSkills,
      afterSkills,
      [...lockSet],
      overwrittenSkillCode,
      seed,
    );
  }

  async getPetLearningLogs(ownerId: number, petId: number) {
    return this.skillLearningLogRepository.find({
      where: { ownerId, petId },
      order: { id: 'DESC' },
      take: 50,
    });
  }

  toSnapshot(skill: any) {
    const config = getSkillSeedConfig(skill?.skillCode);
    const source = config || skill;

    return {
      id: skill?.id,
      skillCode: String(source?.skillCode || ''),
      familyCode: String(source?.familyCode || source?.skillCode || ''),
      name: String(source?.name || source?.skillCode || ''),
      description: String(source?.description || ''),
      rarity: Number(source?.rarity || 1),
      tier: String(source?.tier || 'low'),
      type: String(source?.type || 'passive'),
      category: String(source?.category || 'legacy'),
      power: Number(source?.power || 0),
      triggerRate: Number(source?.triggerRate ?? 1),
      effect: String(source?.effect || ''),
      effectData: source?.effectData || {},
      triggerLimit: source?.triggerLimit || {},
      conflictGroup: String(source?.conflictGroup || ''),
      roleAffinity: Array.isArray(source?.roleAffinity) ? source.roleAffinity : [],
      canLock: source?.canLock !== false,
      canOverwrite: source?.canOverwrite !== false,
      canInherit: source?.canInherit !== false,
      speciesCode: String(source?.speciesCode || ''),
      version: String(source?.version || SKILL_CONFIG_VERSION),
    };
  }

  private findAllEnabledSkills() {
    return this.skillRepository.find({
      where: { enabled: true },
      order: {
        tier: 'ASC',
        category: 'ASC',
        id: 'ASC',
      },
    });
  }

  private async saveSkillLearningResult(
    pet: Pet,
    ownerId: number,
    bookSkillCode: string,
    beforeSkills: any[],
    afterSkills: any[],
    lockedSkillCodes: string[],
    overwrittenSkillCode: string,
    seed: string,
  ) {
    pet.skills = afterSkills;
    pet.specialSkillCount = afterSkills.filter((skill) => isSpecialSkill(skill)).length;
    await this.petRepository.save(pet);

    const log = this.skillLearningLogRepository.create({
      ownerId,
      petId: pet.id,
      bookSkillCode,
      beforeSkills,
      afterSkills,
      lockedSkillCodes,
      overwrittenSkillCode,
      seed,
      configVersion: SKILL_CONFIG_VERSION,
    });
    await this.skillLearningLogRepository.save(log);

    return {
      success: true,
      message: overwrittenSkillCode ? 'Skill learned and one skill was overwritten' : 'Skill learned',
      pet,
      beforeSkills,
      afterSkills,
      overwrittenSkillCode,
      seed,
    };
  }

  private async normalizeSkillList(skills: any[]) {
    const result: any[] = [];
    for (const skill of Array.isArray(skills) ? skills : []) {
      if (!skill?.skillCode) continue;
      const stored = await this.getSkillByCode(skill.skillCode);
      result.push(this.toSnapshot(stored || skill));
    }
    return result;
  }

  private pickWeightedSkill(
    skills: Skill[],
    petRarity: number,
    speciesCode: string,
  ) {
    if (!skills.length) return null;

    const weighted = skills.map((skill) => {
      const tierWeight = skill.tier === 'high' ? Math.max(0.2, petRarity - 3) : 4;
      const speciesWeight =
        speciesCode && skill.speciesCode === speciesCode ? 3 : 1;
      const weight =
        Math.max(0.1, Number(skill.inheritanceWeight || 1)) *
        tierWeight *
        speciesWeight;
      return { skill, weight };
    });

    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) return item.skill;
    }

    return weighted[weighted.length - 1].skill;
  }
}
