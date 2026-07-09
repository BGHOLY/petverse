import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_SKILLS } from '../game-data';
import { Skill } from './skill.entity';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async seedDefaultSkills() {
    const saved: Skill[] = [];

    for (const data of DEFAULT_SKILLS) {
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

    return {
      success: true,
      count: saved.length,
      skills: await this.getAllSkills(),
    };
  }

  async getAllSkills() {
    return this.skillRepository.find({
      order: {
        rarity: 'ASC',
        id: 'ASC',
      },
    });
  }

  async generateRandomSkills(petRarity: number, slotCount: number) {
    let skills = await this.getAllSkills();

    if (!skills.length) {
      await this.seedDefaultSkills();
      skills = await this.getAllSkills();
    }

    const maxRarity = petRarity >= 6 ? 6 : Math.min(6, petRarity + 1);
    const candidates = skills.filter((skill) => skill.rarity <= maxRarity);
    const selected: Skill[] = [];
    const usedCodes = new Set<string>();

    while (selected.length < slotCount && selected.length < candidates.length) {
      const picked = this.pickWeightedSkill(
        candidates.filter((skill) => !usedCodes.has(skill.skillCode)),
        petRarity,
      );

      if (!picked) {
        break;
      }

      usedCodes.add(picked.skillCode);
      selected.push(picked);
    }

    return selected.map((skill) => ({
      id: skill.id,
      skillCode: skill.skillCode,
      name: skill.name,
      description: skill.description,
      rarity: skill.rarity,
      type: skill.type,
      power: skill.power,
      triggerRate: skill.triggerRate,
      effect: skill.effect,
    }));
  }

  private pickWeightedSkill(skills: Skill[], petRarity: number) {
    if (!skills.length) {
      return null;
    }

    const weighted = skills.map((skill) => {
      const distance = Math.abs(Number(skill.rarity || 1) - petRarity);
      const weight = Math.max(1, 8 - distance * 2);
      return { skill, weight };
    });

    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.skill;
      }
    }

    return weighted[weighted.length - 1].skill;
  }
}
