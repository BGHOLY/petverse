
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import { SeasonService } from '../season/season.service';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { RankingSnapshot } from './ranking-snapshot.entity';
import { calculatePetPower } from './utils/pet-power.util';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RankingSnapshot)
    private readonly snapshotRepository: Repository<RankingSnapshot>,

    private readonly seasonService: SeasonService,
  ) {}

  async getMainRanking() {
    const [
      levelRanking,
      powerRanking,
      towerRanking,
      seasonResult,
    ] = await Promise.all([
      this.getLevelRanking(),
      this.getPowerRanking(),
      this.getTowerRanking(),
      this.getSeasonRanking(),
    ]);

    return {
      success: true,
      levelRanking,
      powerRanking,
      towerRanking,
      seasonRanking: seasonResult.leaderboard,
      season: seasonResult.season,
      list: powerRanking,
      data: powerRanking,
    };
  }

  async getTowerRanking() {
    const records =
      await this.towerRecordRepository.find({
        order: {
          maxFloor: 'DESC',
          totalRewardGold: 'DESC',
        },
        take: 50,
      });
    const users = await this.userRepository.find();
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    return records.map((record, index) => ({
      rank: index + 1,
      userId: record.userId,
      playerName:
        userMap.get(record.userId)?.nickname ||
        `Player ${record.userId}`,
      highestTower: record.maxFloor,
      maxFloor: record.maxFloor,
      totalRewardGold:
        record.totalRewardGold,
      score:
        Number(record.maxFloor || 0) *
          100000 +
        Number(
          record.totalRewardGold || 0,
        ),
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
    return this.decoratePets(
      pets,
      'level',
    );
  }

  async getPowerRanking() {
    const pets = await this.petRepository.find({
      where: {
        isEgg: false,
      },
    });
    const decorated = await this.decoratePets(
      pets,
      'power',
    );
    return decorated
      .sort((a, b) => b.power - a.power)
      .slice(0, 50)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  async getSeasonRanking() {
    return this.seasonService.getLeaderboard();
  }

  async getSettlementSnapshots() {
    const seasonResult =
      await this.seasonService.getCurrentSeason();
    const seasonCode =
      seasonResult.season.seasonCode;
    const snapshots =
      await this.snapshotRepository.find({
        where: {
          seasonCode,
        },
        order: {
          rankingType: 'ASC',
          rank: 'ASC',
        },
      });

    return {
      success: true,
      seasonCode,
      snapshots,
      data: snapshots,
    };
  }

  private async decoratePets(
    pets: Pet[],
    mode: 'level' | 'power',
  ) {
    const users = await this.userRepository.find();
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );
    const records =
      await this.towerRecordRepository.find();
    const towerMap = new Map(
      records.map((record) => [
        record.userId,
        record,
      ]),
    );

    const list = pets.map((pet) => {
      const power = calculatePetPower(pet);
      const tower = towerMap.get(pet.ownerId);
      return {
        userId: pet.ownerId,
        petId: pet.id,
        playerName:
          userMap.get(pet.ownerId)?.nickname ||
          `Player ${pet.ownerId}`,
        petName: pet.nickname,
        species: pet.species,
        speciesCode: pet.speciesCode,
        isMutant: pet.isMutant,
        level: pet.level,
        rarity: pet.rarity,
        rarityName: pet.rarityName,
        growth: pet.growth,
        skillSlotCount:
          pet.skillSlotCount,
        specialSkillCount:
          pet.specialSkillCount,
        power,
        highestTower:
          tower?.maxFloor || 0,
      };
    });

    const sorted =
      mode === 'level'
        ? list.sort(
            (a, b) =>
              b.level - a.level ||
              b.power - a.power,
          )
        : list.sort(
            (a, b) =>
              b.power - a.power,
          );

    return sorted.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }
}
