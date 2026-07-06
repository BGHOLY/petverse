import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import { TowerRecord } from '../tower/tower-record.entity';

type RankingItem = {
  rank: number;
  playerName: string;
  petName: string;
  level: number;
  power: number;
  rarityName: string;
};

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,
  ) {}

  async getMainRanking() {
    const powerRanking = await this.getPowerRanking();

    if (!powerRanking.length) {
      return {
        success: true,
        type: 'mock',
        list: this.getMockRanking(),
      };
    }

    const list: RankingItem[] = powerRanking.map((item: any, index: number) => {
      return {
        rank: index + 1,
        playerName: `玩家${item.ownerId}`,
        petName: item.nickname || '未命名宠物',
        level: item.level || 1,
        power: item.power || 0,
        rarityName: item.rarityName || '普通',
      };
    });

    return {
      success: true,
      type: 'power',
      list,
    };
  }

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
          Number(pet.hp || 0) +
          Number(pet.attack || 0) +
          Number(pet.defense || 0) +
          Number(pet.agility || 0) +
          Number(pet.intelligence || 0) +
          Number(pet.level || 1) * 10 +
          Number(pet.rarity || 1) * 30;

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

  private getMockRanking(): RankingItem[] {
    return [
      {
        rank: 1,
        playerName: 'test001',
        petName: 'Mochi',
        level: 10,
        power: 1200,
        rarityName: '稀有',
      },
      {
        rank: 2,
        playerName: 'test002',
        petName: 'Luna',
        level: 8,
        power: 980,
        rarityName: '普通',
      },
      {
        rank: 3,
        playerName: 'test004',
        petName: '暂无宠物',
        level: 1,
        power: 100,
        rarityName: '普通',
      },
    ];
  }
}
