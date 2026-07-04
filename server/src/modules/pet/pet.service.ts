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

    const diff = now.getTime() - new Date(pet.lastStatusUpdate).getTime();
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

  async marryPets(userId: number, petId: number, targetPetId: number) {
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
}