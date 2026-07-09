import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Egg } from './egg.entity';

@Injectable()
export class EggService {
  constructor(
    @InjectRepository(Egg)
    private readonly eggRepository: Repository<Egg>,
  ) {}

  async createEgg(data: {
    ownerId: number;
    parentAId?: number;
    parentBId?: number;
    rarityPotential: number;
    source: string;
  }) {
    const egg = this.eggRepository.create({
      ownerId: data.ownerId,
      parentAId: data.parentAId || 0,
      parentBId: data.parentBId || 0,
      rarityPotential: Math.max(1, Math.min(6, data.rarityPotential || 1)),
      source: data.source,
      status: 'unhatched',
      hatchedPetId: 0,
    });

    return this.eggRepository.save(egg);
  }

  async getUserEggs(userId: number, includeHatched = true) {
    return this.eggRepository.find({
      where: includeHatched
        ? { ownerId: userId }
        : { ownerId: userId, status: 'unhatched' },
      order: {
        status: 'ASC',
        id: 'ASC',
      },
    });
  }

  async getEggById(id: number) {
    return this.eggRepository.findOne({
      where: { id },
    });
  }

  async markHatched(egg: Egg, petId: number) {
    egg.status = 'hatched';
    egg.hatchedPetId = petId;
    return this.eggRepository.save(egg);
  }
}
