import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GameOperationRecord } from '../economy/game-operation-record.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Item } from '../item/item.entity';
import { ALL_ITEM_CONFIGS } from '../item/config/item.config';
import { Pet } from '../pet/pet.entity';
import { PET_SPECIES_CONFIGS } from '../pet/config/pet-species.config';
import { Skill } from '../skill/skill.entity';
import { ALL_SKILL_CONFIGS } from '../skill/config/skill.config';
import { PetTeam } from '../team/pet-team.entity';

@Injectable()
export class BackendService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(FusionRecord)
    private readonly fusionRecordRepository: Repository<FusionRecord>,

    @InjectRepository(GameOperationRecord)
    private readonly operationRepository: Repository<GameOperationRecord>,

    @InjectRepository(PetTeam)
    private readonly teamRepository: Repository<PetTeam>,
  ) {}

  async status() {
    const [
      enabledSkills,
      enabledItems,
      pets,
      fusions,
      operations,
      teams,
    ] = await Promise.all([
      this.skillRepository.count({
        where: { enabled: true },
      }),
      this.itemRepository.count({
        where: { enabled: true },
      }),
      this.petRepository.count(),
      this.fusionRecordRepository.count(),
      this.operationRepository.count(),
      this.teamRepository.count(),
    ]);

    const checks = {
      speciesConfig:
        PET_SPECIES_CONFIGS.length === 10,
      skillConfig:
        ALL_SKILL_CONFIGS.length === 70,
      itemConfig:
        ALL_ITEM_CONFIGS.length >= 72,
      skillDatabase:
        enabledSkills ===
        ALL_SKILL_CONFIGS.length,
      itemDatabase:
        enabledItems ===
        ALL_ITEM_CONFIGS.length,
    };

    return {
      success: Object.values(checks).every(Boolean),
      version: '2.1.0',
      checks,
      config: {
        species: PET_SPECIES_CONFIGS.length,
        skills: ALL_SKILL_CONFIGS.length,
        items: ALL_ITEM_CONFIGS.length,
      },
      database: {
        enabledSkills,
        enabledItems,
        pets,
        fusions,
        operations,
        teams,
      },
      nextAction: Object.values(checks).every(Boolean)
        ? 'Backend core data is ready'
        : 'Run POST /api/dev/seed-all',
    };
  }

  verifyConfig() {
    const skillCodes = ALL_SKILL_CONFIGS.map(
      (skill) => skill.skillCode,
    );
    const itemCodes = ALL_ITEM_CONFIGS.map(
      (item) => item.itemCode,
    );
    const duplicateSkills = skillCodes.filter(
      (code, index) =>
        skillCodes.indexOf(code) !== index,
    );
    const duplicateItems = itemCodes.filter(
      (code, index) =>
        itemCodes.indexOf(code) !== index,
    );
    const invalidSkills = ALL_SKILL_CONFIGS.filter(
      (skill) =>
        !skill.skillCode ||
        !skill.familyCode ||
        !skill.effect ||
        skill.triggerRate < 0 ||
        skill.triggerRate > 1,
    );
    const invalidItems = ALL_ITEM_CONFIGS.filter(
      (item) =>
        !item.itemCode ||
        !item.name ||
        item.maxStack < 1,
    );

    return {
      success:
        !duplicateSkills.length &&
        !duplicateItems.length &&
        !invalidSkills.length &&
        !invalidItems.length &&
        PET_SPECIES_CONFIGS.length === 10 &&
        ALL_SKILL_CONFIGS.length === 70,
      version: '2.1.0',
      duplicateSkills,
      duplicateItems,
      invalidSkillCodes: invalidSkills.map(
        (skill) => skill.skillCode,
      ),
      invalidItemCodes: invalidItems.map(
        (item) => item.itemCode,
      ),
      counts: {
        species: PET_SPECIES_CONFIGS.length,
        skills: ALL_SKILL_CONFIGS.length,
        items: ALL_ITEM_CONFIGS.length,
      },
    };
  }
}
