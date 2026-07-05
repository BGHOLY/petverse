import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SignRecord } from './sign-record.entity';
import { User } from '../user/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ItemService } from '../item/item.service';
import { DailyTaskService } from '../daily-task/daily-task.service';

@Injectable()
export class SignService {
  constructor(
    @InjectRepository(SignRecord)
    private readonly signRecordRepository: Repository<SignRecord>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly inventoryService: InventoryService,
    private readonly itemService: ItemService,
    private readonly dailyTaskService: DailyTaskService,
  ) {}

  private isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private isYesterday(last: Date, now: Date) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    return this.isSameDay(last, yesterday);
  }

  async getMySignInfo(userId: number) {
    let record = await this.signRecordRepository.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.signRecordRepository.create({
        userId,
        continuousDays: 0,
        totalDays: 0,
        lastSignTime: null,
      });

      record = await this.signRecordRepository.save(record);
    }

    const today = new Date();

    return {
      record,
      canSign:
        !record.lastSignTime ||
        !this.isSameDay(new Date(record.lastSignTime), today),
    };
  }

  async signToday(userId: number) {
    let record = await this.signRecordRepository.findOne({
      where: { userId },
    });

    if (!record) {
      record = this.signRecordRepository.create({
        userId,
        continuousDays: 0,
        totalDays: 0,
        lastSignTime: null,
      });
    }

    const now = new Date();

    if (
      record.lastSignTime &&
      this.isSameDay(new Date(record.lastSignTime), now)
    ) {
      await this.dailyTaskService.completeTask(
        userId,
    'signCompleted',
  );

  return {
    success: false,
    message: '今天已经签到过了',
    record,
  };
}

    if (
      record.lastSignTime &&
      this.isYesterday(new Date(record.lastSignTime), now)
    ) {
      record.continuousDays += 1;
    } else {
      record.continuousDays = 1;
    }

    record.totalDays += 1;
    record.lastSignTime = now;

    const rewardDay = ((record.continuousDays - 1) % 7) + 1;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    let reward: any = {};

    if (rewardDay <= 4 && user) {
      const goldMap = {
        1: 100,
        2: 200,
        3: 300,
        4: 500,
      };

      const gold = goldMap[rewardDay];

      user.gold += gold;
      await this.userRepository.save(user);

      reward = {
        type: 'gold',
        gold,
      };
    }

    if (rewardDay === 5) {
      const potion = await this.itemService.findByCode('exp_potion_small');

      if (potion) {
        await this.inventoryService.addItem(
          userId,
          potion.id,
          potion.itemCode,
          1,
        );
      }

      reward = {
        type: 'item',
        itemCode: 'exp_potion_small',
        quantity: 1,
      };
    }

    if (rewardDay === 6) {
      const potion = await this.itemService.findByCode('exp_potion_small');

      if (potion) {
        await this.inventoryService.addItem(
          userId,
          potion.id,
          potion.itemCode,
          3,
        );
      }

      reward = {
        type: 'item',
        itemCode: 'exp_potion_small',
        quantity: 3,
      };
    }

    if (rewardDay === 7) {
      const egg = await this.itemService.findByCode('starter_egg');

      if (egg) {
        await this.inventoryService.addItem(
          userId,
          egg.id,
          egg.itemCode,
          1,
        );
      }

      reward = {
        type: 'item',
        itemCode: 'starter_egg',
        quantity: 1,
      };
    }

    const saved = await this.signRecordRepository.save(record);
    await this.dailyTaskService.completeTask(
        userId,
        'signCompleted',
    );

    return {
      success: true,
      message: '签到成功',
      rewardDay,
      reward,
      record: saved,
    };
  }
}