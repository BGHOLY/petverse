import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { Marriage } from './marriage.entity';

@Injectable()
export class MarriageService {
  constructor(
    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly eggService: EggService,
  ) {}

  async getUserMarriages(userId = DEFAULT_USER_ID) {
    const marriages = await this.marriageRepository.find({
      where: {
        ownerAId: userId,
        status: 'active',
      },
      order: {
        id: 'DESC',
      },
    });

    return {
      success: true,
      marriages,
      data: marriages,
    };
  }

  async createMarriage(userId: number, petAId: number, petBId: number) {
    if (!petAId || !petBId || petAId === petBId) {
      return {
        success: false,
        message: 'Invalid pet pair',
      };
    }

    const petA = await this.petRepository.findOne({ where: { id: petAId } });
    const petB = await this.petRepository.findOne({ where: { id: petBId } });

    if (!petA || !petB) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }

    if (petA.ownerId !== userId) {
      return {
        success: false,
        message: 'Pet A must belong to current player',
      };
    }

    if (petA.isEgg || petB.isEgg) {
      return {
        success: false,
        message: 'Eggs cannot marry',
      };
    }

    if (Number(petA.level || 1) < 1 || Number(petB.level || 1) < 1) {
      return {
        success: false,
        message: 'Both pets must be at least level 1',
      };
    }

    if (petA.married || petB.married || petA.marriedPetId || petB.marriedPetId) {
      return {
        success: false,
        message: 'One pet is already married',
      };
    }

    const existing = await this.marriageRepository.findOne({
      where: [
        { petAId, petBId, status: 'active' },
        { petAId: petBId, petBId: petAId, status: 'active' },
      ],
    });

    if (existing) {
      return {
        success: true,
        message: 'Marriage already exists',
        marriage: existing,
      };
    }

    const marriage = this.marriageRepository.create({
      petAId: petA.id,
      petBId: petB.id,
      ownerAId: petA.ownerId,
      ownerBId: petB.ownerId,
      status: 'active',
      eggCount: 0,
      cooldownEndAt: null,
    });

    const saved = await this.marriageRepository.save(marriage);

    petA.married = true;
    petA.partnerId = petB.id;
    petA.marriedPetId = petB.id;
    petB.married = true;
    petB.partnerId = petA.id;
    petB.marriedPetId = petA.id;

    await this.petRepository.save(petA);
    await this.petRepository.save(petB);

    return {
      success: true,
      message: 'Marriage created',
      marriage: saved,
      pets: [petA, petB],
    };
  }

  async layEgg(userId: number, marriageId?: number, petId?: number) {
    const marriage = await this.findMarriageForLayEgg(userId, marriageId, petId);

    if (!marriage) {
      return {
        success: false,
        message: 'Active marriage not found',
      };
    }

    const petA = await this.petRepository.findOne({ where: { id: marriage.petAId } });
    const petB = await this.petRepository.findOne({ where: { id: marriage.petBId } });

    if (!petA || !petB) {
      return {
        success: false,
        message: 'Parent pet not found',
      };
    }

    const rarityPotential = this.rollChildRarity(petA.rarity, petB.rarity);
    const egg = await this.eggService.createEgg({
      ownerId: userId,
      parentAId: petA.id,
      parentBId: petB.id,
      rarityPotential,
      source: 'marriage',
    });

    marriage.eggCount += 1;
    await this.marriageRepository.save(marriage);

    return {
      success: true,
      message: 'Egg laid',
      egg,
      marriage,
      parents: [petA, petB],
    };
  }

  private async findMarriageForLayEgg(
    userId: number,
    marriageId?: number,
    petId?: number,
  ) {
    if (marriageId) {
      return this.marriageRepository.findOne({
        where: {
          id: marriageId,
          ownerAId: userId,
          status: 'active',
        },
      });
    }

    if (petId) {
      return this.marriageRepository.findOne({
        where: [
          { petAId: petId, ownerAId: userId, status: 'active' },
          { petBId: petId, ownerAId: userId, status: 'active' },
        ],
      });
    }

    return this.marriageRepository.findOne({
      where: {
        ownerAId: userId,
        status: 'active',
      },
      order: {
        id: 'DESC',
      },
    });
  }

  private rollChildRarity(rarityA: number, rarityB: number) {
    const avgRarity = Math.floor((Number(rarityA || 1) + Number(rarityB || 1)) / 2);
    const roll = Math.random();
    let rarity = avgRarity;

    if (roll < 0.2) {
      rarity = avgRarity - 1;
    } else if (roll < 0.75) {
      rarity = avgRarity;
    } else if (roll < 0.95) {
      rarity = avgRarity + 1;
    } else {
      rarity = avgRarity + 2;
    }

    return Math.max(1, Math.min(6, rarity));
  }
}
