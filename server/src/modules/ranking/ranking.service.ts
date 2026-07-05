import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import { TowerRecord } from '../tower/tower-record.entity';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,
  ) {}

  async getTowerRanking() {
    return this.towerRecordRepository.find({
      order: {
        maxFloor: 'DESC',
        totalRewardGold: 'DESC',
      },
      take: 50,
    });
  }

  async getLevelRanking() {
    return this.petRepository.find({
      where: {
        isEgg: false,
      },
      order: {
        level: 'DESC',
        exp: 'DESC',
        rarity: 'DESC',
      },
      take: 50,
    });
  }

  async getPowerRanking() {
    const pets = await this.petRepository.find({
      where: {
        isEgg: false,
      },
    });

    return pets
      .map((pet) => {
        const power =
          pet.hp +
          pet.attack +
          pet.defense +
          pet.agility +
          pet.intelligence +
          pet.level * 10 +
          pet.rarity * 30;

        return {
          petId: pet.id,
          ownerId: pet.ownerId,
          nickname: pet.nickname,
          species: pet.species,
          level: pet.level,
          rarity: pet.rarity,
          rarityName: pet.rarityName,
          geneCode: pet.geneCode,
          power,
        };
      })
      .sort((a, b) => b.power - a.power)
      .slice(0, 50);
  }
}