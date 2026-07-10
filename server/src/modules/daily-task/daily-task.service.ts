import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { DailyTask } from './daily-task.entity';

@Injectable()
export class DailyTaskService {
  constructor(
    @InjectRepository(DailyTask)
    private readonly dailyTaskRepository: Repository<DailyTask>,

    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  private getToday() {
    return new Date()
      .toISOString()
      .split('T')[0];
  }

  async getTodayTask(userId: number) {
    const today = this.getToday();

    let task =
      await this.dailyTaskRepository.findOne({
        where: {
          userId,
          taskDate: today,
        },
      });

    if (!task) {
      task =
        this.dailyTaskRepository.create({
          userId,
          taskDate: today,
          signCompleted: false,
          feedCompleted: false,
          towerCompleted: false,
          battleCompleted: false,
          rewardClaimed: false,
        });
      task =
        await this.dailyTaskRepository.save(
          task,
        );
    }

    return task;
  }

  async completeTask(
    userId: number,
    taskName: keyof DailyTask,
  ) {
    const allowed = new Set([
      'signCompleted',
      'feedCompleted',
      'towerCompleted',
      'battleCompleted',
    ]);
    if (!allowed.has(String(taskName))) {
      throw new Error(
        `Unsupported daily task: ${String(
          taskName,
        )}`,
      );
    }

    const task =
      await this.getTodayTask(userId);
    (task as any)[taskName] = true;
    return this.dailyTaskRepository.save(
      task,
    );
  }

  async getStatus(userId: number) {
    const task =
      await this.getTodayTask(userId);
    const completed = [
      task.signCompleted,
      task.feedCompleted,
      task.towerCompleted,
      task.battleCompleted,
    ].filter(Boolean).length;

    return {
      ...task,
      completed,
      total: 4,
      allCompleted: completed === 4,
      reward: {
        gold: 500,
        items: {
          exp_potion_small: 1,
        },
      },
    };
  }

  async claimReward(userId: number) {
    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const today = this.getToday();
            const task =
              await manager.findOne(
                DailyTask,
                {
                  where: {
                    userId,
                    taskDate: today,
                  },
                  lock: {
                    mode:
                      'pessimistic_write',
                  },
                },
              );

            if (!task) {
              throw new Error(
                '每日任务不存在',
              );
            }
            if (
              !task.signCompleted ||
              !task.feedCompleted ||
              !task.towerCompleted ||
              !task.battleCompleted
            ) {
              throw new Error(
                '每日任务未全部完成',
              );
            }
            if (task.rewardClaimed) {
              throw new Error(
                '奖励已经领取',
              );
            }

            const reward = {
              gold: 500,
              items: {
                exp_potion_small: 1,
              },
            };
            await this.economyService.grant(
              manager,
              userId,
              reward,
            );

            task.rewardClaimed = true;
            await manager.save(
              DailyTask,
              task,
            );

            return {
              success: true,
              message:
                '每日奖励领取成功',
              reward,
              task,
            };
          },
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
          error?.message ||
            '每日奖励领取失败',
        ),
      };
    }
  }
}
