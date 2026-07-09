import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getMainRanking() {
    const [levelRanking, powerRanking, towerRanking] = await Promise.all([
      this.getLevelRanking(),
      this.getPowerRanking(),
      this.getTowerRanking(),
    ]);

    return {
      success: true,
      levelRanking,
      powerRanking,
      towerRanking,
      list: powerRanking,
      data: powerRanking,
    };
  }

  async getTowerRanking() {
    const records = await this.towerRecordRepository.find({
      order: {
        maxFloor: 'DESC',
        totalRewardGold: 'DESC',
      },
      take: 50,
    });

    const users = await this.userRepository.find();
    const userMap = new Map(users.map((user) => [user.id, user]));

    return records.map((record, index) => ({
      rank: index + 1,
      userId: record.userId,
      playerName: userMap.get(record.userId)?.nickname || `Player ${record.userId}`,
      petName: '',
      power: 0,
      highestTower: record.maxFloor,
      maxFloor: record.maxFloor,
      totalRewardGold: record.totalRewardGold,
    }));
  }

  async getLevelRanking() {
    const pets = await this.petRepository.find({
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

    return this.decoratePets(pets, 'level');
  }

  async getPowerRanking() {
    const pets = await this.petRepository.find({
      where: {
        isEgg: false,
      },
    });

    const decorated = await this.decoratePets(pets, 'power');
    return decorated.sort((a, b) => b.power - a.power).slice(0, 50);
  }

  private async decoratePets(pets: Pet[], mode: 'level' | 'power') {
    const users = await this.userRepository.find();
    const userMap = new Map(users.map((user) => [user.id, user]));
    const records = await this.towerRecordRepository.find();
    const towerMap = new Map(records.map((record) => [record.userId, record]));

    const list = pets.map((pet) => {
      const power = this.calculatePower(pet);
      const tower = towerMap.get(pet.ownerId);
      return {
        userId: pet.ownerId,
        petId: pet.id,
        playerName: userMap.get(pet.ownerId)?.nickname || `Player ${pet.ownerId}`,
        petName: pet.nickname,
        species: pet.species,
        level: pet.level,
        rarity: pet.rarity,
        rarityName: pet.rarityName,
        power,
        highestTower: tower?.maxFloor || 0,
      };
    });

    const sorted = mode === 'level'
      ? list.sort((a, b) => b.level - a.level || b.power - a.power)
      : list.sort((a, b) => b.power - a.power);

    return sorted.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }

  private calculatePower(pet: Pet) {
    return Math.round(
      Number(pet.hp || 0) +
        Number(pet.attack || 0) * 5 +
        Number(pet.defense || 0) * 3 +
        Number(pet.speed || pet.agility || 0) * 2 +
        Number(pet.rarity || 1) * 100 +
        Number(pet.level || 1) * 20,
    );
  }
}
