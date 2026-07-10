import { Injectable } from '@nestjs/common';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { OffspringBlueprint, PetService } from '../pet/pet.service';

@Injectable()
export class HatcheryService {
  constructor(
    private readonly eggService: EggService,
    private readonly petService: PetService,
  ) {}

  async getEggs(userId = DEFAULT_USER_ID) {
    const eggs = await this.eggService.getUserEggViews(userId, true);
    return {
      success: true,
      eggs,
      data: eggs,
    };
  }

  async getEggDetail(userId: number, eggId: number) {
    const egg = await this.eggService.getEggById(eggId);

    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
        data: null,
      };
    }

    const data = this.eggService.toEggView(egg);
    return {
      success: true,
      data,
      egg: data,
    };
  }

  async hatch(userId: number, eggId?: number, force = false) {
    let egg = eggId ? await this.eggService.getEggById(eggId) : null;

    if (!egg) {
      const availableEggs = await this.eggService.getUserEggs(userId, false);
      egg =
        availableEggs.find(
          (candidate) => this.eggService.getRemainingSeconds(candidate) <= 0,
        ) ||
        availableEggs[0] ||
        null;
    }

    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
      };
    }

    if (egg.status !== 'unhatched') {
      return {
        success: false,
        message:
          egg.status === 'hatched'
            ? 'Egg already hatched'
            : 'Egg is being hatched',
        egg: this.eggService.toEggView(egg),
      };
    }

    const remainingSeconds = this.eggService.getRemainingSeconds(egg);
    const allowBetaForce = force && process.env.NODE_ENV !== 'production';

    if (remainingSeconds > 0 && !allowBetaForce) {
      return {
        success: false,
        message: 'Egg is not ready to hatch',
        remainingSeconds,
        hatchReadyAt: egg.hatchReadyAt,
        egg: this.eggService.toEggView(egg),
      };
    }

    const parentA = egg.parentAId
      ? await this.petService.getPetById(egg.parentAId)
      : null;
    const parentB = egg.parentBId
      ? await this.petService.getPetById(egg.parentBId)
      : null;

    const storedBlueprint: Partial<OffspringBlueprint> =
      egg.offspringData || {
        mode: 'breed',
        seed: egg.randomSeed,
        configVersion: egg.configVersion,
        rarity: egg.rarityPotential,
        quality: egg.quality,
        species: egg.species,
        speciesCode: egg.speciesCode,
        isMutant: egg.isMutant,
        skillSlotCount: egg.skillSlotCount,
        aptitudes: {
          hp: egg.hpAptitude,
          attack: egg.attackAptitude,
          defense: egg.defenseAptitude,
          magic: egg.magicAptitude,
          speed: egg.speedAptitude,
        },
        growth: egg.growth,
        generation: egg.generation,
        specialSkillCount: egg.specialSkillCount,
        geneCode: egg.geneCode,
        geneScore: egg.geneScore,
        bodyType: egg.bodyType,
        color: egg.color,
        pattern: egg.pattern,
        inheritedSkills: egg.inheritedSkills,
        mutationData: egg.mutationData,
        parentSnapshot: egg.parentSnapshot || {
          parentA: {},
          parentB: {},
        },
      };

    const lockedEgg = await this.eggService.tryMarkHatching(egg.id, userId);
    if (!lockedEgg) {
      const latest = await this.eggService.getEggById(egg.id);
      return {
        success: false,
        message:
          latest?.status === 'hatched'
            ? 'Egg already hatched'
            : 'Egg is being hatched',
        egg: latest ? this.eggService.toEggView(latest) : null,
      };
    }

    egg = lockedEgg;

    try {
      const pet = await this.petService.createPetFromEgg(
        userId,
        egg.rarityPotential,
        parentA,
        parentB,
        storedBlueprint,
      );
      pet.fatherId = Number(egg.parentAId || 0);
      pet.motherId = Number(egg.parentBId || 0);
      pet.hatchTime = new Date();
      await this.petService.savePet(pet);

      const hatchedEgg = await this.eggService.markHatched(egg, pet.id);
      const pets = await this.petService.getUserPets(userId);
      const eggs = await this.eggService.getUserEggViews(userId, true);

      return {
        success: true,
        message: 'Hatch successful',
        egg: this.eggService.toEggView(hatchedEgg),
        pet,
        pets: pets.pets,
        eggs,
        data: {
          pet,
          eggs,
        },
      };
    } catch (error) {
      await this.eggService.markUnhatched(egg);
      throw error;
    }
  }
}
