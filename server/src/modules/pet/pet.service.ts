import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DEFAULT_USER_ID,
  RARITY_NAMES,
  SPECIES_POOL,
  STAT_RANGES,
} from '../game-data';
import { SkillService } from '../skill/skill.service';
import { Pet } from './pet.entity';
import {
  calculateGeneScore,
  generateGeneCode,
  inheritGeneCode,
  normalizeGeneCode,
} from './utils/gene.util';

export interface OffspringBlueprint {
  rarity: number;
  quality: number;
  species: string;
  geneCode: string;
  geneScore: number;
  bodyType: string;
  color: string;
  pattern: string;
  inheritedSkills: any[];
  mutationData: {
    geneMutationCount: number;
    geneMutationLoci: number[];
    mutatedTraits: string[];
  };
}

interface CreatePetData {
  nickname?: string;
  species?: string;
  rarity?: number;
  quality?: number;
  geneCode?: string;
  bodyType?: string;
  color?: string;
  pattern?: string;
  fatherId?: number;
  motherId?: number;
  skills?: any[];
}

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly skillService: SkillService,
  ) {}

  async getAllPets() {
    const pets = await this.petRepository.find({
      order: {
        ownerId: 'ASC',
        isEgg: 'ASC',
        id: 'ASC',
      },
    });

    for (const pet of pets) {
      await this.ensureBetaFields(pet);
    }

    return {
      success: true,
      pets,
      data: pets,
      currentPet: pets.find((pet) => pet.ownerId === DEFAULT_USER_ID && !pet.isEgg) || null,
    };
  }

  async getUserPets(userId: number) {
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
      },
      order: {
        isEgg: 'ASC',
        id: 'ASC',
      },
    });

    for (const pet of pets) {
      if (!pet.isEgg) {
        await this.updatePetStatus(pet);
        await this.ensureBetaFields(pet);
      }
    }

    return {
      success: true,
      pets,
      data: pets,
      currentPet: pets.find((pet) => !pet.isEgg) || null,
    };
  }

  async getPetById(id: number) {
    const pet = await this.petRepository.findOne({
      where: { id },
    });

    if (!pet) {
      return null;
    }

    if (!pet.isEgg) {
      await this.updatePetStatus(pet);
      await this.ensureBetaFields(pet);
    }

    return pet;
  }

  async getPetDetail(id: number) {
    const pet = await this.getPetById(id);

    if (!pet) {
      return null;
    }

    return {
      ...pet,
      lineage: {
        fatherId: Number(pet.fatherId || 0),
        motherId: Number(pet.motherId || 0),
      },
      finalAttributes: this.calculateFinalAttributes(pet),
    };
  }

  calculateFinalAttributes(pet: Pet) {
    // 当前基础属性已经包含稀有度初始值和升级成长，这里只应用资质。
    const qualityRate = this.clampQuality(Number(pet.quality || 100)) / 100;

    return {
      hp: Math.max(1, Math.round(Number(pet.hp || 100) * qualityRate)),
      attack: Math.max(1, Math.round(Number(pet.attack || 20) * qualityRate)),
      defense: Math.max(1, Math.round(Number(pet.defense || 20) * qualityRate)),
      speed: Math.max(1, Math.round(Number(pet.speed || pet.agility || 20) * qualityRate)),
    };
  }

  async getMainPet(userId: number) {
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
        isEgg: false,
      },
      order: {
        id: 'ASC',
      },
    });

    const pet = pets[0] || null;
    if (pet) {
      await this.ensureBetaFields(pet);
    }

    return pet;
  }

  async savePet(pet: Pet) {
    return this.petRepository.save(pet);
  }

  async createPet(userId: number, data: CreatePetData = {}) {
    const rarity = this.clampRarity(Number(data.rarity || this.randomRarity()));
    const species = data.species || this.randomSpecies();
    const geneCode = normalizeGeneCode(data.geneCode || generateGeneCode('AAAA', 'AAAA'));
    const stats = this.generateStats(rarity);
    const skillSlotCount = rarity + 1;
    const skills = await this.resolvePetSkills(rarity, skillSlotCount, data.skills);

    const pet = this.petRepository.create({
      ownerId: userId,
      nickname: data.nickname || `${species}-${Date.now().toString().slice(-4)}`,
      species,
      rarity,
      rarityName: RARITY_NAMES[rarity],
      quality: this.clampQuality(data.quality ?? 100),
      level: 1,
      exp: 0,
      nextExp: 100,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      agility: stats.speed,
      speed: stats.speed,
      intelligence: 10 + rarity * 5,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      stamina: 100,
      geneCode,
      geneScore: calculateGeneScore(geneCode),
      bodyType: data.bodyType || 'normal',
      color: data.color || 'white',
      pattern: data.pattern || 'none',
      fatherId: data.fatherId || 0,
      motherId: data.motherId || 0,
      married: false,
      partnerId: 0,
      marriedPetId: 0,
      skillSlotCount,
      skills,
      isEgg: false,
      hatchTime: null,
      lastStatusUpdate: new Date(),
    });

    return this.petRepository.save(pet);
  }

  buildOffspringBlueprint(
    parentA?: Pet | null,
    parentB?: Pet | null,
    forcedRarity?: number,
  ): OffspringBlueprint {
    const geneResult = inheritGeneCode(
      parentA?.geneCode || 'AAAA',
      parentB?.geneCode || 'AAAA',
    );
    const mutatedTraits: string[] = [];

    const speciesResult = this.inheritTrait(
      parentA?.species,
      parentB?.species,
      SPECIES_POOL,
      this.randomSpecies(),
      0.06,
    );
    if (speciesResult.mutated) mutatedTraits.push('species');

    const bodyTypeResult = this.inheritTrait(
      parentA?.bodyType,
      parentB?.bodyType,
      ['normal', 'small', 'large'],
      'normal',
      0.05,
    );
    if (bodyTypeResult.mutated) mutatedTraits.push('bodyType');

    const colorResult = this.inheritTrait(
      parentA?.color,
      parentB?.color,
      ['white', 'black', 'brown', 'gold', 'gray', 'cream'],
      'white',
      0.06,
    );
    if (colorResult.mutated) mutatedTraits.push('color');

    const patternResult = this.inheritTrait(
      parentA?.pattern,
      parentB?.pattern,
      ['none', 'stripe', 'spot', 'gradient', 'mask'],
      'none',
      0.06,
    );
    if (patternResult.mutated) mutatedTraits.push('pattern');

    const rarity = forcedRarity
      ? this.clampRarity(forcedRarity)
      : this.rollOffspringRarity(parentA, parentB);

    return {
      rarity,
      quality: this.inheritQuality(parentA, parentB, geneResult.mutationCount),
      species: speciesResult.value,
      geneCode: geneResult.geneCode,
      geneScore: calculateGeneScore(geneResult.geneCode),
      bodyType: bodyTypeResult.value,
      color: colorResult.value,
      pattern: patternResult.value,
      inheritedSkills: this.inheritParentSkills(parentA, parentB, rarity),
      mutationData: {
        geneMutationCount: geneResult.mutationCount,
        geneMutationLoci: geneResult.mutationLoci,
        mutatedTraits,
      },
    };
  }

  async createPetFromEgg(
    userId: number,
    rarity: number,
    parentA?: Pet | null,
    parentB?: Pet | null,
    storedBlueprint?: Partial<OffspringBlueprint>,
  ) {
    const generated = this.buildOffspringBlueprint(parentA, parentB, rarity);
    const blueprint: OffspringBlueprint = {
      ...generated,
      ...this.cleanStoredBlueprint(storedBlueprint),
      rarity: this.clampRarity(Number(storedBlueprint?.rarity || rarity || generated.rarity)),
      quality: this.clampQuality(Number(storedBlueprint?.quality || generated.quality)),
      geneCode: normalizeGeneCode(storedBlueprint?.geneCode || generated.geneCode),
      geneScore: calculateGeneScore(storedBlueprint?.geneCode || generated.geneCode),
      inheritedSkills: Array.isArray(storedBlueprint?.inheritedSkills)
        ? storedBlueprint.inheritedSkills
        : generated.inheritedSkills,
      mutationData: storedBlueprint?.mutationData || generated.mutationData,
    };

    return this.createPet(userId, {
      nickname: `${RARITY_NAMES[blueprint.rarity]} ${blueprint.species}`,
      species: blueprint.species,
      rarity: blueprint.rarity,
      quality: blueprint.quality,
      geneCode: blueprint.geneCode,
      bodyType: blueprint.bodyType,
      color: blueprint.color,
      pattern: blueprint.pattern,
      fatherId: parentA?.id || 0,
      motherId: parentB?.id || 0,
      skills: blueprint.inheritedSkills,
    });
  }

  async seedDefaultPet(userId = DEFAULT_USER_ID) {
    const existing = await this.getMainPet(userId);

    if (existing) {
      return existing;
    }

    return this.createPet(userId, {
      nickname: 'Mochi',
      species: 'Cat',
      rarity: 2,
    });
  }

  async feedPet(userId: number, petId?: number) {
    const pet = petId ? await this.getPetById(petId) : await this.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }

    pet.hunger = Math.min(100, Number(pet.hunger || 0) + 20);
    pet.happiness = Math.min(100, Number(pet.happiness || 0) + 10);
    pet.cleanliness = Math.min(100, Number(pet.cleanliness || 0) + 5);

    return {
      success: true,
      message: 'Pet fed',
      pet: await this.petRepository.save(pet),
    };
  }

  async levelUpPet(userId: number, petId?: number, exp = 100) {
    const pet = petId ? await this.getPetById(petId) : await this.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }

    return {
      success: true,
      message: 'Exp added',
      pet: await this.addExp(pet, exp),
    };
  }

  async addExp(pet: Pet, exp: number) {
    pet.exp = Number(pet.exp || 0) + Math.max(0, Number(exp || 0));
    pet.nextExp = Number(pet.nextExp || pet.level * 100 || 100);

    while (pet.exp >= pet.nextExp) {
      pet.exp -= pet.nextExp;
      pet.level = Number(pet.level || 1) + 1;
      pet.hp = Math.round(Number(pet.hp || 100) * 1.1);
      pet.attack = Math.round(Number(pet.attack || 20) * 1.08);
      pet.defense = Math.round(Number(pet.defense || 20) * 1.08);
      pet.speed = Math.round(Number(pet.speed || pet.agility || 20) * 1.05);
      pet.agility = pet.speed;
      pet.nextExp = pet.level * 100;
    }

    return this.petRepository.save(pet);
  }

  async updatePetStatus(pet: Pet) {
    const now = new Date();

    if (!pet.lastStatusUpdate) {
      pet.lastStatusUpdate = now;
      return this.petRepository.save(pet);
    }

    const diff = now.getTime() - new Date(pet.lastStatusUpdate).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours <= 0) {
      return pet;
    }

    pet.hunger = Math.max(0, Number(pet.hunger || 0) - hours);
    pet.happiness = Math.max(0, Number(pet.happiness || 0) - hours);
    pet.cleanliness = Math.max(0, Number(pet.cleanliness || 0) - hours);
    pet.stamina = Math.max(0, Number(pet.stamina || 0) - hours);
    pet.lastStatusUpdate = now;

    return this.petRepository.save(pet);
  }

  async hatchStarterEgg(userId: number) {
    const pet = await this.createPet(userId, {
      nickname: 'Starter Buddy',
      species: this.randomSpecies(),
      rarity: 1,
    });
    const pets = await this.getUserPets(userId);

    return {
      success: true,
      message: 'Starter pet created',
      pet,
      pets: pets.pets,
      data: pets.pets,
    };
  }

  private cleanStoredBlueprint(stored?: Partial<OffspringBlueprint>) {
    if (!stored) {
      return {};
    }

    const cleaned: Partial<OffspringBlueprint> = {};
    if (stored.species) cleaned.species = stored.species;
    if (stored.bodyType) cleaned.bodyType = stored.bodyType;
    if (stored.color) cleaned.color = stored.color;
    if (stored.pattern) cleaned.pattern = stored.pattern;
    if (stored.geneCode) cleaned.geneCode = stored.geneCode;
    if (stored.geneScore) cleaned.geneScore = stored.geneScore;
    if (stored.mutationData) cleaned.mutationData = stored.mutationData;
    return cleaned;
  }

  private async ensureBetaFields(pet: Pet) {
    let changed = false;
    const rarity = this.clampRarity(Number(pet.rarity || 1));
    const slotCount = rarity + 1;

    if (pet.rarity !== rarity) {
      pet.rarity = rarity;
      changed = true;
    }

    if (pet.rarityName !== RARITY_NAMES[rarity]) {
      pet.rarityName = RARITY_NAMES[rarity];
      changed = true;
    }

    if (!pet.nextExp || pet.nextExp < 1) {
      pet.nextExp = Math.max(100, Number(pet.level || 1) * 100);
      changed = true;
    }

    if (!pet.speed) {
      pet.speed = Number(pet.agility || 20);
      changed = true;
    }

    if (!pet.agility) {
      pet.agility = Number(pet.speed || 20);
      changed = true;
    }

    if (pet.skillSlotCount !== slotCount) {
      pet.skillSlotCount = slotCount;
      changed = true;
    }

    if (!Array.isArray(pet.skills) || pet.skills.length !== slotCount) {
      pet.skills = await this.resolvePetSkills(rarity, slotCount, pet.skills);
      changed = true;
    }

    if (pet.marriedPetId === undefined || pet.marriedPetId === null) {
      pet.marriedPetId = Number(pet.partnerId || 0);
      changed = true;
    }

    const quality = this.clampQuality(Number(pet.quality || 100));
    if (pet.quality !== quality) {
      pet.quality = quality;
      changed = true;
    }

    const geneCode = normalizeGeneCode(pet.geneCode || 'AAAA');
    if (pet.geneCode !== geneCode) {
      pet.geneCode = geneCode;
      changed = true;
    }

    const geneScore = calculateGeneScore(geneCode);
    if (pet.geneScore !== geneScore) {
      pet.geneScore = geneScore;
      changed = true;
    }

    if (!pet.bodyType) {
      pet.bodyType = 'normal';
      changed = true;
    }

    if (!pet.color) {
      pet.color = 'white';
      changed = true;
    }

    if (!pet.pattern) {
      pet.pattern = 'none';
      changed = true;
    }

    if (changed) {
      await this.petRepository.save(pet);
    }

    return pet;
  }

  private generateStats(rarity: number) {
    const ranges = STAT_RANGES[this.clampRarity(rarity)];
    return {
      hp: this.randomInt(ranges.hp[0], ranges.hp[1]),
      attack: this.randomInt(ranges.attack[0], ranges.attack[1]),
      defense: this.randomInt(ranges.defense[0], ranges.defense[1]),
      speed: this.randomInt(ranges.speed[0], ranges.speed[1]),
    };
  }

  private async resolvePetSkills(rarity: number, slotCount: number, inherited?: any[]) {
    const selected: any[] = [];
    const usedCodes = new Set<string>();

    for (const skill of Array.isArray(inherited) ? inherited : []) {
      const code = String(skill?.skillCode || '');
      if (!code || usedCodes.has(code) || selected.length >= slotCount) {
        continue;
      }
      usedCodes.add(code);
      selected.push(skill);
    }

    if (selected.length < slotCount) {
      const generated = await this.skillService.generateRandomSkills(rarity, slotCount);
      for (const skill of generated) {
        const code = String(skill?.skillCode || '');
        if (!code || usedCodes.has(code) || selected.length >= slotCount) {
          continue;
        }
        usedCodes.add(code);
        selected.push(skill);
      }
    }

    return selected.slice(0, slotCount);
  }

  private inheritParentSkills(parentA: Pet | null | undefined, parentB: Pet | null | undefined, rarity: number) {
    const pool = [...(parentA?.skills || []), ...(parentB?.skills || [])];
    const unique = new Map<string, any>();

    for (const skill of pool) {
      const code = String(skill?.skillCode || '');
      if (code && !unique.has(code)) {
        unique.set(code, skill);
      }
    }

    const candidates = [...unique.values()].sort(() => Math.random() - 0.5);
    const maxInherited = Math.max(1, Math.ceil((rarity + 1) / 2));
    const inherited = candidates.filter(() => Math.random() < 0.55).slice(0, maxInherited);

    if (!inherited.length && candidates.length && Math.random() < 0.65) {
      inherited.push(candidates[0]);
    }

    return inherited;
  }

  private rollOffspringRarity(parentA?: Pet | null, parentB?: Pet | null) {
    const rarityA = this.clampRarity(Number(parentA?.rarity || 1));
    const rarityB = this.clampRarity(Number(parentB?.rarity || rarityA));
    const base = this.clampRarity(Math.round((rarityA + rarityB) / 2));
    const averageQuality = (Number(parentA?.quality || 100) + Number(parentB?.quality || 100)) / 2;
    const averageGeneScore =
      (Number(parentA?.geneScore || calculateGeneScore(parentA?.geneCode || 'AAAA')) +
        Number(parentB?.geneScore || calculateGeneScore(parentB?.geneCode || 'AAAA'))) /
      2;

    const bonus = Math.max(
      -0.06,
      Math.min(0.1, (averageQuality - 100) / 200 + (averageGeneScore - 12) / 100),
    );
    const downgradeChance = Math.max(0.08, Math.min(0.2, 0.15 - bonus * 0.5));
    const upgradeTwoChance = Math.max(0.03, Math.min(0.12, 0.08 + bonus * 0.3));
    const upgradeOneChance = Math.max(0.18, Math.min(0.36, 0.27 + bonus * 0.7));
    const sameChance = Math.max(0, 1 - downgradeChance - upgradeOneChance - upgradeTwoChance);
    const roll = Math.random();

    if (roll < downgradeChance) return this.clampRarity(base - 1);
    if (roll < downgradeChance + sameChance) return base;
    if (roll < downgradeChance + sameChance + upgradeOneChance) {
      return this.clampRarity(base + 1);
    }
    return this.clampRarity(base + 2);
  }

  private inheritQuality(
    parentA?: Pet | null,
    parentB?: Pet | null,
    geneMutationCount = 0,
  ) {
    const qualities = [parentA?.quality, parentB?.quality]
      .map((value) => Number(value || 0))
      .filter((value) => value > 0);

    if (!qualities.length) {
      return 100;
    }

    const average = qualities.reduce((sum, value) => sum + value, 0) / qualities.length;
    const mutationBonus = geneMutationCount > 0 ? this.randomInt(0, Math.min(3, geneMutationCount + 1)) : 0;
    return this.clampQuality(Math.round(average) + this.randomInt(-4, 4) + mutationBonus);
  }

  private inheritTrait(
    parentAValue: string | undefined,
    parentBValue: string | undefined,
    mutationPool: string[],
    fallback: string,
    mutationRate: number,
  ) {
    const parentValues = [parentAValue, parentBValue].filter(Boolean) as string[];
    const inherited = parentValues.length
      ? parentValues[Math.floor(Math.random() * parentValues.length)]
      : fallback;

    if (Math.random() >= mutationRate || mutationPool.length < 2) {
      return { value: inherited, mutated: false };
    }

    const candidates = mutationPool.filter((value) => value !== inherited);
    const value = candidates[Math.floor(Math.random() * candidates.length)] || inherited;
    return { value, mutated: value !== inherited };
  }

  private randomSpecies() {
    return SPECIES_POOL[Math.floor(Math.random() * SPECIES_POOL.length)];
  }

  private randomRarity() {
    const roll = Math.random();
    if (roll < 0.5) return 1;
    if (roll < 0.75) return 2;
    if (roll < 0.9) return 3;
    if (roll < 0.97) return 4;
    if (roll < 0.995) return 5;
    return 6;
  }

  private clampQuality(quality: number) {
    return Math.max(80, Math.min(120, Math.round(quality || 100)));
  }

  private clampRarity(rarity: number) {
    return Math.max(1, Math.min(6, Math.floor(rarity || 1)));
  }

  private randomInt(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}
