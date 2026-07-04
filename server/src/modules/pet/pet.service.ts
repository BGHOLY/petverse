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
    return this.petRepository.findOne({
      where: {
        id,
      },
    });
  }

  async savePet(pet: Pet) {
    return this.petRepository.save(pet);
  }
}