import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TowerRecord } from './tower-record.entity';
import { PetService } from '../pet/pet.service';

@Injectable()
export class TowerService {
  constructor(
    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,
    private readonly petService: PetService,
  ) {}

  async challengeTower(userId: number, petId: number) {
    const pet = await this.petService.getPetById(petId);

    if (!pet) {
      return {
        success: false,
        message: '宠物不存在',
      };
    }

    if (pet.ownerId !== userId) {
      return {
        success: false,
        message: '只能使用自己的宠物挑战',
      };
    }

    if (pet.isEgg) {
      return {
        success: false,
        message: '宠物蛋不能挑战爬塔',
      };
    }

    let record = await this.towerRecordRepository.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.towerRecordRepository.create({
        userId,
        currentFloor: 1,
        maxFloor: 1,
        totalRewardGold: 0,
      });
    }

    const floor = record.currentFloor;

    const petPower =
      pet.attack +
      pet.defense +
      pet.hp / 10 +
      pet.level * 5 +
      pet.rarity * 10;

    const enemyPower = 40 + floor * 12;

    const win = petPower >= enemyPower;

    if (!win) {
      await this.towerRecordRepository.save(record);

      return {
        success: true,
        result: 'lose',
        message: `挑战第${floor}层失败`,
        floor,
        petPower,
        enemyPower,
        record,
      };
    }

    const rewardGold = 50 + floor * 10;
    const rewardExp = 20 + floor * 5;

    record.currentFloor += 1;
    record.maxFloor = Math.max(record.maxFloor, record.currentFloor);
    record.totalRewardGold += rewardGold;

    await this.petService.addExp(pet, rewardExp);

    const savedRecord = await this.towerRecordRepository.save(record);

    return {
      success: true,
      result: 'win',
      message: `挑战第${floor}层成功`,
      floor,
      reward: {
        gold: rewardGold,
        exp: rewardExp,
      },
      pet,
      record: savedRecord,
    };
  }

  async getMyRecord(userId: number) {
    let record = await this.towerRecordRepository.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.towerRecordRepository.create({
        userId,
        currentFloor: 1,
        maxFloor: 1,
        totalRewardGold: 0,
      });

      record = await this.towerRecordRepository.save(record);
    }

    return record;
  }
}