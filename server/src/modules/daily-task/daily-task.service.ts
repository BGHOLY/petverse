import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DailyTask } from './daily-task.entity';

@Injectable()
export class DailyTaskService {
  constructor(
    @InjectRepository(DailyTask)
    private readonly dailyTaskRepository: Repository<DailyTask>,
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
    const task =
      await this.getTodayTask(userId);

    (task as any)[taskName] = true;

    return this.dailyTaskRepository.save(
      task,
    );
  }

  async claimReward(userId: number) {
    const task =
      await this.getTodayTask(userId);

    if (
      !task.signCompleted ||
      !task.feedCompleted ||
      !task.towerCompleted
    ) {
      return {
        success: false,
        message:
          '每日任务未全部完成',
      };
    }

    if (task.rewardClaimed) {
      return {
        success: false,
        message:
          '奖励已经领取',
      };
    }

    task.rewardClaimed = true;

    await this.dailyTaskRepository.save(
      task,
    );

    return {
      success: true,
      message:
        '每日奖励领取成功',
      reward: {
        gold: 500,
        expPotion: 1,
      },
    };
  }
}