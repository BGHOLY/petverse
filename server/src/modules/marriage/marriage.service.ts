import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { Marriage } from './marriage.entity';

@Injectable()
export class MarriageService {
  constructor(
    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly eggService: EggService,
    private readonly petService: PetService,
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

    const data = marriages.map((marriage) => ({
      ...marriage,
      canLayEgg: this.getCooldownRemainingSeconds(marriage) <= 0,
      cooldownRemainingSeconds: this.getCooldownRemainingSeconds(marriage),
    }));

    return {
      success: true,
      marriages: data,
      data,
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

    const cooldownRemainingSeconds = this.getCooldownRemainingSeconds(marriage);
    if (cooldownRemainingSeconds > 0) {
      return {
        success: false,
        message: 'Marriage is on cooldown',
        cooldownRemainingSeconds,
        cooldownEndAt: marriage.cooldownEndAt,
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

    if (petA.isEgg || petB.isEgg || !petA.married || !petB.married) {
      return {
        success: false,
        message: 'Parent marriage state is invalid',
      };
    }

    const blueprint = this.petService.buildOffspringBlueprint(petA, petB);
    const egg = await this.eggService.createEgg({
      ownerId: userId,
      parentAId: petA.id,
      parentBId: petB.id,
      rarityPotential: blueprint.rarity,
      quality: blueprint.quality,
      species: blueprint.species,
      geneCode: blueprint.geneCode,
      geneScore: blueprint.geneScore,
      bodyType: blueprint.bodyType,
      color: blueprint.color,
      pattern: blueprint.pattern,
      inheritedSkills: blueprint.inheritedSkills,
      mutationData: blueprint.mutationData,
      parentSnapshot: {
        parentA: this.toParentSnapshot(petA),
        parentB: this.toParentSnapshot(petB),
      },
      source: 'marriage',
    });

    marriage.eggCount = Number(marriage.eggCount || 0) + 1;
    marriage.cooldownEndAt = new Date(Date.now() + this.getMarriageCooldownSeconds() * 1000);
    await this.marriageRepository.save(marriage);

    return {
      success: true,
      message: 'Egg laid',
      egg: this.eggService.toEggView(egg),
      marriage: {
        ...marriage,
        canLayEgg: false,
        cooldownRemainingSeconds: this.getCooldownRemainingSeconds(marriage),
      },
      parents: [petA, petB],
      inheritance: blueprint,
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

  private toParentSnapshot(pet: Pet) {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      nickname: pet.nickname,
      species: pet.species,
      rarity: pet.rarity,
      quality: pet.quality,
      geneCode: pet.geneCode,
      geneScore: pet.geneScore,
      bodyType: pet.bodyType,
      color: pet.color,
      pattern: pet.pattern,
    };
  }

  private getCooldownRemainingSeconds(marriage: Marriage) {
    if (!marriage.cooldownEndAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((new Date(marriage.cooldownEndAt).getTime() - Date.now()) / 1000),
    );
  }

  private getMarriageCooldownSeconds() {
    // Beta 阶段为 60 秒，正式运营时再替换为策划配置。
    return 60;
  }
}
