import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BattleService } from '../battle/battle.service';
import { DailyTaskService } from '../daily-task/daily-task.service';
import { DEFAULT_USER_ID } from '../game-data';
import { PetService } from '../pet/pet.service';
import { SeasonService } from '../season/season.service';
import { TeamService } from '../team/team.service';
import { User } from '../user/user.entity';
import { TowerRecord } from './tower-record.entity';

@Injectable()
export class TowerService {
  constructor(
    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly petService: PetService,
    private readonly battleService: BattleService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly seasonService: SeasonService,
    private readonly teamService: TeamService,
  ) {}

  async getStatus(userId = DEFAULT_USER_ID) {
    const record = await this.getMyRecord(userId);
    const monster =
      this.battleService.createTowerMonster(
        record.currentFloor,
      );

    return {
      success: true,
      currentFloor: record.currentFloor,
      maxFloor: record.maxFloor,
      monster,
      record,
      rewardPreview: this.getReward(
        record.currentFloor,
      ),
    };
  }

  async challengeTower(
    userId: number,
    petId?: number,
  ) {
    const pet = petId
      ? await this.petService.getPetById(petId)
      : await this.petService.getMainPet(
          userId,
        );

    if (
      !pet ||
      pet.ownerId !== userId ||
      pet.isEgg
    ) {
      return {
        success: false,
        message: 'Player pet not found',
      };
    }
    if (pet.tradeStatus === 'listed' || pet.tradeListingId) {
      return {
        success: false,
        message: 'Listed pet cannot challenge tower',
      };
    }

    const record =
      await this.getMyRecord(userId);
    const floor = record.currentFloor;
    const monster =
      this.battleService.createTowerMonster(
        floor,
      );
    const result =
      this.battleService.simulateBattle(
        this.battleService.fromPet(pet),
        monster,
      );
    const win =
      result.winnerSide === 'left';

    if (!win) {
      return {
        success: true,
        result: 'lose',
        floor,
        monster,
        record,
        battleLog: result.battleLog,
        message: `Challenge floor ${floor} failed`,
      };
    }

    const reward = this.getReward(floor);
    const user =
      await this.userRepository.findOne({
        where: { id: userId },
      });

    if (user) {
      user.gold += reward.gold;
      user.diamond += reward.diamond;
      await this.userRepository.save(user);
    }

    const updatedPet =
      await this.petService.addExp(
        pet,
        reward.exp,
      );

    record.currentFloor += 1;
    record.maxFloor = Math.max(
      record.maxFloor || 0,
      floor,
    );
    record.totalRewardGold +=
      reward.gold;
    const savedRecord =
      await this.towerRecordRepository.save(
        record,
      );

    await this.dailyTaskService.completeTask(
      userId,
      'towerCompleted',
    );
    const seasonSync =
      await this.seasonService.syncPlayerScores(
        userId,
      );

    return {
      success: true,
      seasonSync,
      result: 'win',
      floor,
      monster,
      reward,
      record: savedRecord,
      user,
      pet: updatedPet,
      battleLog: result.battleLog,
      message: `Challenge floor ${floor} cleared`,
    };
  }


  async challengeTeam(userId = DEFAULT_USER_ID) {
    const teamResult = await this.teamService.getTeam(userId);
    const pets = Array.isArray(teamResult?.pets)
      ? teamResult.pets
          .filter(
            (pet: any) =>
              !pet.isEgg &&
              pet.tradeStatus !== 'listed' &&
              !pet.tradeListingId,
          )
          .slice(0, 5)
      : [];

    if (pets.length !== 5) {
      return {
        success: false,
        message: `Tower challenge requires a complete five-pet team. Current team: ${pets.length}/5`,
      };
    }

    const record = await this.getMyRecord(userId);
    const floor = Number(record.currentFloor || 1);
    const monsters = pets.map((_: any, index: number) =>
      this.battleService.createTowerMonster(floor + index),
    );
    const result = this.battleService.simulateTeamBattle(
      pets.map((pet: any) => this.battleService.fromPet(pet)),
      monsters,
    );
    const win = result.winnerSide === 'left';

    if (!win) {
      return {
        success: true,
        mode: 'team',
        result: 'lose',
        floor,
        monsters,
        record,
        battleLog: result.battleLog,
        combatResult: result,
        message: `Team challenge floor ${floor} failed`,
      };
    }

    const reward = this.getReward(floor);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (user) {
      user.gold += reward.gold;
      user.diamond += reward.diamond;
      await this.userRepository.save(user);
    }

    const expEach = Math.max(
      1,
      Math.floor(reward.exp / pets.length),
    );
    const updatedPets = [];
    for (const pet of pets) {
      updatedPets.push(
        await this.petService.addExp(pet, expEach),
      );
    }

    record.currentFloor += 1;
    record.maxFloor = Math.max(record.maxFloor || 0, floor);
    record.totalRewardGold += reward.gold;
    const savedRecord =
      await this.towerRecordRepository.save(record);
    await this.dailyTaskService.completeTask(
      userId,
      'towerCompleted',
    );
    const seasonSync =
      await this.seasonService.syncPlayerScores(userId);

    return {
      success: true,
      mode: 'team',
      seasonSync,
      result: 'win',
      floor,
      monsters,
      reward: { ...reward, expEach },
      record: savedRecord,
      user,
      pets: updatedPets,
      battleLog: result.battleLog,
      combatResult: result,
      message: `Team challenge floor ${floor} cleared`,
    };
  }

  async getMyRecord(userId: number) {
    let record =
      await this.towerRecordRepository.findOne({
        where: { userId },
      });

    if (!record) {
      record =
        this.towerRecordRepository.create({
          userId,
          currentFloor: 1,
          maxFloor: 0,
          totalRewardGold: 0,
        });

      record =
        await this.towerRecordRepository.save(
          record,
        );
    }

    return record;
  }

  private getReward(floor: number) {
    const isBoss = floor % 5 === 0;
    const multiplier = isBoss ? 2 : 1;

    return {
      gold: floor * 50 * multiplier,
      exp: floor * 30 * multiplier,
      diamond: isBoss ? 5 : 0,
    };
  }
}
