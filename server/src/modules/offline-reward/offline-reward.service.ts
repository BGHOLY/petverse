import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OfflineReward } from './offline-reward.entity';
import { User } from '../user/user.entity';
import { PetService } from '../pet/pet.service';

@Injectable()
export class OfflineRewardService {
  constructor(
    @InjectRepository(OfflineReward)
    private readonly offlineRewardRepository: Repository<OfflineReward>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly petService: PetService,
  ) {}

  private async getOrCreateRecord(userId: number) {
    let record = await this.offlineRewardRepository.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.offlineRewardRepository.create({
        userId,
        lastClaimTime: new Date(),
        pendingGold: 0,
        pendingExp: 0,
      });

      record = await this.offlineRewardRepository.save(record);
    }

    return record;
  }

  async getPreview(userId: number) {
    const record = await this.getOrCreateRecord(userId);

    const now = new Date();
    const last = record.lastClaimTime
      ? new Date(record.lastClaimTime)
      : now;

    const diffMs = now.getTime() - last.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));

    const cappedMinutes = Math.min(minutes, 8 * 60);

    const gold = cappedMinutes * 2;
    const exp = cappedMinutes * 1;

    return {
      success: true,
      offlineMinutes: minutes,
      cappedMinutes,
      reward: {
        gold,
        exp,
      },
      record,
    };
  }

  async claim(userId: number) {
    const preview = await this.getPreview(userId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    const gold = preview.reward.gold;
    const exp = preview.reward.exp;

    if (gold <= 0 && exp <= 0) {
      return {
        success: false,
        message: '暂无离线收益',
      };
    }

    user.gold += gold;
    await this.userRepository.save(user);

    const petResult = await this.petService.getUserPets(userId);
    const myPet = petResult.pets.find((pet) => !pet.isEgg);

    if (myPet && exp > 0) {
      await this.petService.addExp(myPet, exp);
    }

    const record = await this.getOrCreateRecord(userId);
    record.lastClaimTime = new Date();
    record.pendingGold = 0;
    record.pendingExp = 0;

    await this.offlineRewardRepository.save(record);

    return {
      success: true,
      message: '离线收益领取成功',
      reward: {
        gold,
        exp,
      },
      user,
      pet: myPet || null,
    };
  }
}
