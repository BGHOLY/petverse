import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { DailyTaskService } from '../daily-task/daily-task.service';
import { EconomyService } from '../economy/economy.service';
import { SignRecord } from './sign-record.entity';

@Injectable()
export class SignService {
  constructor(
    @InjectRepository(SignRecord)
    private readonly signRecordRepository: Repository<SignRecord>,

    private readonly dailyTaskService: DailyTaskService,
    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
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
    let record =
      await this.signRecordRepository.findOne({
        where: { userId },
      });

    if (!record) {
      record =
        this.signRecordRepository.create({
          userId,
          continuousDays: 0,
          totalDays: 0,
          lastSignTime: null,
        });
      record =
        await this.signRecordRepository.save(
          record,
        );
    }

    const today = new Date();
    return {
      record,
      canSign:
        !record.lastSignTime ||
        !this.isSameDay(
          new Date(record.lastSignTime),
          today,
        ),
    };
  }

  async signToday(userId: number) {
    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            let record =
              await manager.findOne(
                SignRecord,
                {
                  where: { userId },
                  lock: {
                    mode:
                      'pessimistic_write',
                  },
                },
              );
            if (!record) {
              record = manager.create(
                SignRecord,
                {
                  userId,
                  continuousDays: 0,
                  totalDays: 0,
                  lastSignTime: null,
                },
              );
            }

            const now = new Date();
            if (
              record.lastSignTime &&
              this.isSameDay(
                new Date(
                  record.lastSignTime,
                ),
                now,
              )
            ) {
              return {
                success: false,
                message:
                  '今天已经签到过了',
                record,
                alreadySigned: true,
              };
            }

            if (
              record.lastSignTime &&
              this.isYesterday(
                new Date(
                  record.lastSignTime,
                ),
                now,
              )
            ) {
              record.continuousDays =
                Number(
                  record.continuousDays ||
                    0,
                ) + 1;
            } else {
              record.continuousDays = 1;
            }

            record.totalDays =
              Number(
                record.totalDays || 0,
              ) + 1;
            record.lastSignTime = now;

            const rewardDay =
              ((record.continuousDays -
                1) %
                7) +
              1;
            const reward =
              this.getReward(rewardDay);

            await this.economyService.grant(
              manager,
              userId,
              reward,
            );
            const saved =
              await manager.save(
                SignRecord,
                record,
              );

            return {
              success: true,
              message: '签到成功',
              rewardDay,
              reward,
              record: saved,
            };
          },
        );

      await this.dailyTaskService.completeTask(
        userId,
        'signCompleted',
      );

      return {
        ...result,
        wallet:
          await this.economyService.getWallet(
            userId,
          ),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message || '签到失败',
        ),
      };
    }
  }

  private getReward(day: number) {
    const rewards: Record<number, any> = {
      1: { gold: 100 },
      2: { gold: 200 },
      3: { gold: 300 },
      4: { gold: 500 },
      5: {
        items: {
          exp_potion_small: 1,
        },
      },
      6: {
        items: {
          exp_potion_small: 3,
        },
      },
      7: {
        items: {
          common_pet_egg: 1,
        },
      },
    };
    return rewards[day] || {
      gold: 100,
    };
  }
}
