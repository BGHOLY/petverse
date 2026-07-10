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
import { calculateGeneScore, generateGeneCode } from './utils/gene.util';

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
      finalAttributes: this.calculateFinalAttributes(pet),
    };
  }

  calculateFinalAttributes(pet: Pet) {
    // 当前 hp/attack/defense/speed 已经包含稀有度初始值和升级成长，
    // 这里只应用资质，避免再次乘稀有度和等级造成重复放大。
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

  async createPet(
    userId: number,
    data: {
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
    } = {},
  ) {
    const rarity = this.clampRarity(Number(data.rarity || this.randomRarity()));
    const species = data.species || this.randomSpecies();
    const geneCode = data.geneCode || generateGeneCode('AAAA', 'AAAA');
    const stats = this.generateStats(rarity);
    const skillSlotCount = rarity + 1;
    const skills = await this.skillService.generateRandomSkills(rarity, skillSlotCount);

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

  async createPetFromEgg(
    userId: number,
    rarity: number,
    parentA?: Pet | null,
    parentB?: Pet | null,
  ) {
    const species = this.pickChildSpecies(parentA, parentB);
    const geneCode = generateGeneCode(
      parentA?.geneCode || 'AAAA',
      parentB?.geneCode || 'AAAA',
    );

    return this.createPet(userId, {
      nickname: `${RARITY_NAMES[this.clampRarity(rarity)]} ${species}`,
      species,
      rarity,
      quality: this.inheritQuality(parentA, parentB),
      geneCode,
      bodyType: this.inheritAppearance(
        parentA?.bodyType,
        parentB?.bodyType,
        ['normal', 'small', 'large'],
        'normal',
      ),
      color: this.inheritAppearance(
        parentA?.color,
        parentB?.color,
        ['white', 'black', 'brown', 'gold', 'gray'],
        'white',
      ),
      pattern: this.inheritAppearance(
        parentA?.pattern,
        parentB?.pattern,
        ['none', 'stripe', 'spot', 'gradient'],
        'none',
      ),
      fatherId: parentA?.id || 0,
      motherId: parentB?.id || 0,
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
      pet.skills = await this.skillService.generateRandomSkills(rarity, slotCount);
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

  private pickChildSpecies(parentA?: Pet | null, parentB?: Pet | null) {
    if (Math.random() < 0.08) {
      return Math.random() < 0.5 ? 'Dragon' : 'Phoenix';
    }

    const parentSpecies = [parentA?.species, parentB?.species].filter(
      (species) => species && species !== 'Egg',
    ) as string[];

    if (parentSpecies.length) {
      return parentSpecies[Math.floor(Math.random() * parentSpecies.length)];
    }

    return this.randomSpecies();
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

  private inheritQuality(parentA?: Pet | null, parentB?: Pet | null) {
    const qualities = [parentA?.quality, parentB?.quality]
      .map((value) => Number(value || 0))
      .filter((value) => value > 0);

    if (!qualities.length) {
      return 100;
    }

    const average = qualities.reduce((sum, value) => sum + value, 0) / qualities.length;
    return this.clampQuality(Math.round(average) + this.randomInt(-5, 5));
  }

  private inheritAppearance(
    parentAValue: string | undefined,
    parentBValue: string | undefined,
    mutationPool: string[],
    fallback: string,
  ) {
    if (Math.random() < 0.08) {
      return mutationPool[Math.floor(Math.random() * mutationPool.length)];
    }

    const parentValues = [parentAValue, parentBValue].filter(Boolean) as string[];
    if (parentValues.length) {
      return parentValues[Math.floor(Math.random() * parentValues.length)];
    }

    return fallback;
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
