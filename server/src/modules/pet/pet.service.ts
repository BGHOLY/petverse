import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from './pet.entity';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async getAllPets() {
    return this.petRepository.find();
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

  async addExp(
    pet: Pet,
    exp: number,
  ) {
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

    const diff =
      now.getTime() -
      new Date(
        pet.lastStatusUpdate,
      ).getTime();

    const hours = Math.floor(
      diff / (1000 * 60 * 60),
    );

    if (hours <= 0) {
      return pet;
    }

    pet.hunger = Math.max(
      0,
      pet.hunger - hours,
    );

    pet.happiness = Math.max(
      0,
      pet.happiness - hours,
    );

    pet.cleanliness = Math.max(
      0,
      pet.cleanliness - hours,
    );

    pet.stamina = Math.max(
      0,
      pet.stamina - hours,
    );

    pet.lastStatusUpdate = now;

    return this.petRepository.save(pet);
  }
}