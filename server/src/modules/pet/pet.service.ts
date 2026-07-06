import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from './pet.entity';
import { InventoryService } from '../inventory/inventory.service';
import {
  generateGeneCode,
  calculateGeneScore,
} from './utils/gene.util';
import {
  calculateRarityByScore,
  getRarityName,
} from './utils/rarity.util';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly inventoryService: InventoryService,
  ) {}

  async getAllPets() {
    return this.petRepository.find();
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
      }
    }

    return {
      success: true,
      pets,
      data: pets,
    };
  }

  async getPetById(id: number) {
    const pet = await this.petRepository.findOne({
      where: { id },
    });

    if (!pet) {
      return null;
    }

    await this.updatePetStatus(pet);

    return pet;
  }

  async savePet(pet: Pet) {
    return this.petRepository.save(pet);
  }

  async addExp(pet: Pet, exp: number) {
    pet.exp += exp;

    while (pet.exp >= 100) {
      pet.exp -= 100;
      pet.level += 1;

      pet.hp += 10;
      pet.attack += 2;
      pet.defense += 2;
      pet.agility += 1;
      pet.intelligence += 1;
    }

    return this.petRepository.save(pet);
  }

  async updatePetStatus(pet: Pet) {
    const now = new Date();

    if (!pet.lastStatusUpdate) {
      pet.lastStatusUpdate = now;
      return this.petRepository.save(pet);
    }

    const diff =
      now.getTime() -
      new Date(pet.lastStatusUpdate).getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours <= 0) {
      return pet;
    }

    pet.hunger = Math.max(0, pet.hunger - hours);
    pet.happiness = Math.max(0, pet.happiness - hours);
    pet.cleanliness = Math.max(0, pet.cleanliness - hours);
    pet.stamina = Math.max(0, pet.stamina - hours);
    pet.lastStatusUpdate = now;

    return this.petRepository.save(pet);
  }

  async hatchStarterEgg(userId: number) {
    const consumed = await this.inventoryService.consumeItem(
      userId,
      'starter_egg',
      1,
    );

    if (!consumed) {
      return {
        success: false,
        message: '暂无可孵化的宠物蛋',
      };
    }

    const geneCode = generateGeneCode('AAAA', 'AAAA');
    const geneScore = calculateGeneScore(geneCode);
    const rarity = calculateRarityByScore(geneScore);
    const rarityName = getRarityName(rarity);

    const speciesPool = ['Cat', 'Dog', 'Rabbit'];
    const species = speciesPool[
      Math.floor(Math.random() * speciesPool.length)
    ];

    const pet = this.petRepository.create({
      ownerId: userId,
      nickname: `${rarityName}小萌宠`,
      species,
      rarity,
      rarityName,
      level: 1,
      exp: 0,
      hp: 90 + rarity * 10,
      attack: 15 + rarity * 3,
      defense: 12 + rarity * 3,
      agility: 12 + rarity * 2,
      intelligence: 12 + rarity * 2,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      stamina: 100,
      geneCode,
      geneScore,
      fatherId: 0,
      motherId: 0,
      married: false,
      partnerId: 0,
      isEgg: false,
      hatchTime: null,
      lastStatusUpdate: new Date(),
    });

    const savedPet = await this.petRepository.save(pet);
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
      },
      order: {
        isEgg: 'ASC',
        id: 'ASC',
      },
    });
    const inventory = await this.inventoryService.getUserInventory(userId);

    return {
      success: true,
      message: '孵化成功',
      pet: savedPet,
      pets,
      inventory,
    };
  }

  async marryPets(
    userId: number,
    petId: number,
    targetPetId: number,
  ) {
    if (petId === targetPetId) {
      return {
        success: false,
        message: '不能和自己结婚',
      };
    }

    const pet = await this.getPetById(petId);
    const targetPet = await this.getPetById(targetPetId);

    if (!pet || !targetPet) {
      return {
        success: false,
        message: '宠物不存在',
      };
    }

    if (pet.ownerId !== userId) {
      return {
        success: false,
        message: '只能操作自己的宠物',
      };
    }

    if (pet.isEgg || targetPet.isEgg) {
      return {
        success: false,
        message: '宠物蛋不能结婚',
      };
    }

    if (pet.married || targetPet.married) {
      return {
        success: false,
        message: '其中一只宠物已经结婚',
      };
    }

    pet.married = true;
    pet.partnerId = targetPet.id;

    targetPet.married = true;
    targetPet.partnerId = pet.id;

    await this.petRepository.save(pet);
    await this.petRepository.save(targetPet);

    return {
      success: true,
      message: '结婚成功',
      pets: [pet, targetPet],
    };
  }

  async breedPet(userId: number, petId: number) {
    const father = await this.getPetById(petId);

    if (!father) {
      return {
        success: false,
        message: '宠物不存在',
      };
    }

    if (father.ownerId !== userId) {
      return {
        success: false,
        message: '只能操作自己的宠物',
      };
    }

    if (father.isEgg) {
      return {
        success: false,
        message: '宠物蛋不能生蛋',
      };
    }

    if (!father.married || !father.partnerId) {
      return {
        success: false,
        message: '宠物还没有结婚',
      };
    }

    const mother = await this.getPetById(father.partnerId);

    if (!mother) {
      return {
        success: false,
        message: '配偶不存在',
      };
    }

    if (father.stamina < 20 || mother.stamina < 20) {
      return {
        success: false,
        message: '宠物体力不足',
      };
    }

    father.stamina -= 20;
    mother.stamina -= 20;

    const geneCode = generateGeneCode(
      father.geneCode,
      mother.geneCode,
    );

    const geneScore = calculateGeneScore(geneCode);
    const rarity = calculateRarityByScore(geneScore);
    const rarityName = getRarityName(rarity);

    const egg = this.petRepository.create({
      ownerId: userId,
      nickname: '宠物蛋',
      species: 'Egg',
      rarity,
      rarityName,
      level: 1,
      exp: 0,
      hp: 80 + rarity * 10,
      attack: 10 + rarity * 3,
      defense: 10 + rarity * 3,
      agility: 10 + rarity * 2,
      intelligence: 10 + rarity * 2,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      stamina: 100,
      geneCode,
      geneScore,
      fatherId: father.id,
      motherId: mother.id,
      married: false,
      partnerId: 0,
      isEgg: true,
      hatchTime: new Date(Date.now() + 60 * 1000),
      lastStatusUpdate: new Date(),
    });

    await this.petRepository.save(father);
    await this.petRepository.save(mother);

    const savedEgg = await this.petRepository.save(egg);

    return {
      success: true,
      message: '生蛋成功',
      egg: savedEgg,
      parents: [father, mother],
    };
  }

  async hatchPet(userId: number, petId: number) {
    const egg = await this.getPetById(petId);

    if (!egg) {
      return {
        success: false,
        message: '宠物蛋不存在',
      };
    }

    if (egg.ownerId !== userId) {
      return {
        success: false,
        message: '只能孵化自己的宠物蛋',
      };
    }

    if (!egg.isEgg) {
      return {
        success: false,
        message: '这不是宠物蛋',
      };
    }

    const now = new Date();

    if (egg.hatchTime && now < new Date(egg.hatchTime)) {
      return {
        success: false,
        message: '孵化时间未到',
        hatchTime: egg.hatchTime,
      };
    }

    egg.isEgg = false;
    egg.species = 'Cat';
    egg.nickname = `${egg.rarityName}小萌宠`;
    egg.lastStatusUpdate = new Date();

    const savedPet = await this.petRepository.save(egg);

    return {
      success: true,
      message: '孵化成功',
      pet: savedPet,
    };
  }
}
