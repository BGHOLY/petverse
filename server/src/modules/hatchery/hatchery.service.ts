import { Injectable } from '@nestjs/common';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { PetService } from '../pet/pet.service';

@Injectable()
export class HatcheryService {
  constructor(
    private readonly eggService: EggService,
    private readonly petService: PetService,
  ) {}

  async getEggs(userId = DEFAULT_USER_ID) {
    const eggs = await this.eggService.getUserEggs(userId, true);
    return {
      success: true,
      eggs,
      data: eggs,
    };
  }

  async hatch(userId: number, eggId?: number) {
    const egg = eggId
      ? await this.eggService.getEggById(eggId)
      : (await this.eggService.getUserEggs(userId, false))[0];

    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
      };
    }

    if (egg.status === 'hatched') {
      return {
        success: false,
        message: 'Egg already hatched',
        egg,
      };
    }

    const parentA = egg.parentAId ? await this.petService.getPetById(egg.parentAId) : null;
    const parentB = egg.parentBId ? await this.petService.getPetById(egg.parentBId) : null;

    const pet = await this.petService.createPetFromEgg(
      userId,
      egg.rarityPotential,
      parentA,
      parentB,
    );

    const hatchedEgg = await this.eggService.markHatched(egg, pet.id);
    const pets = await this.petService.getUserPets(userId);
    const eggs = await this.eggService.getUserEggs(userId, true);

    return {
      success: true,
      message: 'Hatch successful',
      egg: hatchedEgg,
      pet,
      pets: pets.pets,
      eggs,
      data: {
        pet,
        eggs,
      },
    };
  }
}
