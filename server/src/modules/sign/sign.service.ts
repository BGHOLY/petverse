import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { DailyTaskService } from '../daily-task/daily-task.service';
import { RewardService, UnifiedReward } from '../reward/reward.service';
import { ServerTimeService } from '../server-time/server-time.service';
import { SignClaim } from './sign-claim.entity';
import { SignRecord } from './sign-record.entity';

@Injectable()
export class SignService {
  constructor(
    @InjectRepository(SignRecord)
    private readonly signRecordRepository: Repository<SignRecord>,

    private readonly dailyTaskService: DailyTaskService,
    private readonly rewardService: RewardService,
    private readonly serverTime: ServerTimeService,
    private readonly dataSource: DataSource,
  ) {}

  private isYesterday(last: Date, now: Date) {
    const previous = new Date(this.serverTime.startOfDay(now).getTime() - 86_400_000);
    return this.serverTime.dayKey(last) === this.serverTime.dayKey(previous);
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

    const today = this.serverTime.now();
    const dayKey = this.serverTime.dayKey(today);
    const claim = await this.dataSource.getRepository(SignClaim).findOne({
      where: { userId, rewardDate: dayKey },
    });
    const nextDay = (Number(record.totalDays || 0) % 7) + 1;
    const cycleNumber = Math.floor(Number(record.totalDays || 0) / 7) + 1;
    const claims = await this.dataSource.getRepository(SignClaim).find({
      where: {
        userId,
        cycleId: `cycle-${cycleNumber}`,
      },
      order: { dayIndex: 'ASC' },
    });
    const claimedDays = new Set(claims.map((item) => item.dayIndex));
    return {
      record,
      canSign: !claim,
      cycleId: `cycle-${cycleNumber}`,
      nextDay,
      dayKey,
      days: Array.from({ length: 7 }, (_, index) => {
        const dayIndex = index + 1;
        return {
          dayIndex,
          reward: this.getReward(dayIndex),
          claimed: claimedDays.has(dayIndex),
          current: dayIndex === nextDay && !claim,
          locked: dayIndex > nextDay,
        };
      }),
      clock: this.serverTime.clock(today),
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

            const now = this.serverTime.now();
            const rewardDate = this.serverTime.dayKey(now);
            const claimRepository = manager.getRepository(SignClaim);
            const existingClaim = await claimRepository.findOne({
              where: { userId, rewardDate },
              lock: { mode: 'pessimistic_write' },
            });
            if (existingClaim) {
              return {
                success: false,
                message:
                  '今天已经签到过了',
                record,
                alreadySigned: true,
                claim: existingClaim,
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
            const cycleId = `cycle-${Math.floor(
              (Number(record.totalDays || 1) - 1) / 7,
            ) + 1}`;
            const idempotencyKey = `sign:${userId}:${rewardDate}`;
            await this.rewardService.grantWithManager(
              manager,
              userId,
              'sign',
              rewardDate,
              reward,
              { cycleId, rewardDay, rewardDate },
              idempotencyKey,
            );
            const saved =
              await manager.save(
                SignRecord,
                record,
              );
            const claim = await claimRepository.save(
              claimRepository.create({
                userId,
                cycleId,
                dayIndex: rewardDay,
                rewardDate,
                claimedAt: now,
                idempotencyKey,
                reward,
              }),
            );

            return {
              success: true,
              message: '签到成功',
              rewardDay,
              reward,
              record: saved,
              claim,
            };
          },
        );

      if (result.success) {
        await this.dailyTaskService.completeTask(
          userId,
          'signCompleted',
        );
      }

      return {
        ...result,
        wallet: await this.rewardService.wallet(userId),
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

  private getReward(day: number): UnifiedReward {
    const rewards: Record<number, UnifiedReward> = {
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
        diamond: 30,
        eggs: [{ rarityPotential: 2, source: 'seven_day_sign' }],
      },
    };
    return rewards[day] || {
      gold: 100,
    };
  }
}
