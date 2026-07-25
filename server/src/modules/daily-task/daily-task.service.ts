import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { RewardService, UnifiedReward } from '../reward/reward.service';
import { ServerTimeService } from '../server-time/server-time.service';
import {
  ALL_TASK_DEFINITIONS,
  TaskDefinition,
} from './daily-task.config';
import { DailyTaskProgress } from './daily-task-progress.entity';
import { DailyTask } from './daily-task.entity';
import { TaskEventRecord } from './task-event-record.entity';

@Injectable()
export class DailyTaskService {
  constructor(
    @InjectRepository(DailyTask)
    private readonly legacyRepository: Repository<DailyTask>,
    @InjectRepository(DailyTaskProgress)
    private readonly progressRepository: Repository<DailyTaskProgress>,
    @InjectRepository(TaskEventRecord)
    private readonly eventRepository: Repository<TaskEventRecord>,
    private readonly rewardService: RewardService,
    private readonly serverTime: ServerTimeService,
    private readonly dataSource: DataSource,
  ) {}

  async getTodayTask(userId: number) {
    const taskDate = this.serverTime.dayKey();
    let task = await this.legacyRepository.findOne({
      where: { userId, taskDate },
    });
    if (!task) {
      task = await this.legacyRepository.save(
        this.legacyRepository.create({
          userId,
          taskDate,
          signCompleted: false,
          feedCompleted: false,
          towerCompleted: false,
          battleCompleted: false,
          rewardClaimed: false,
        }),
      );
    }
    return task;
  }

  async completeTask(userId: number, taskName: keyof DailyTask) {
    const eventMap: Record<string, string> = {
      signCompleted: 'login',
      feedCompleted: 'item_used',
      towerCompleted: 'adventure_completed',
      battleCompleted: 'adventure_completed',
    };
    const eventType = eventMap[String(taskName)];
    if (!eventType) {
      throw new Error(`Unsupported daily task: ${String(taskName)}`);
    }
    const legacy = await this.getTodayTask(userId);
    (legacy as any)[taskName] = true;
    await this.legacyRepository.save(legacy);
    return this.recordEvent(
      userId,
      eventType,
      `legacy:${String(taskName)}:${this.serverTime.dayKey()}`,
      1,
      { legacyTask: String(taskName) },
    );
  }

  async recordEvent(
    userId: number,
    eventType: string,
    eventId: string,
    amount = 1,
    payload: Record<string, any> = {},
  ) {
    const normalizedType = String(eventType || '').trim().slice(0, 60);
    const normalizedId = String(eventId || '').trim().slice(0, 120);
    const normalizedAmount = Math.max(1, Math.floor(Number(amount || 1)));
    if (!normalizedType || !normalizedId) {
      throw new Error('Task event requires eventType and eventId');
    }

    try {
      const response = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(TaskEventRecord);
        const duplicate = await repository.findOne({
          where: {
            userId,
            eventType: normalizedType,
            eventId: normalizedId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (duplicate) {
          return { duplicate: true, updatedTaskIds: [] as number[] };
        }
        await repository.save(
          repository.create({
            userId,
            eventType: normalizedType,
            eventId: normalizedId,
            amount: normalizedAmount,
            payload,
          }),
        );
        const tasks = await this.ensureTasks(userId, manager);
        const changed: number[] = [];
        for (const task of tasks.filter(
          (item) => item.targetType === normalizedType && !item.claimed,
        )) {
          const before = Number(task.currentValue || 0);
          task.currentValue = Math.min(
            Number(task.targetValue || 1),
            before + normalizedAmount,
          );
          if (
            before < task.targetValue &&
            task.currentValue >= task.targetValue &&
            !task.completedAt
          ) {
            task.completedAt = this.serverTime.now();
          }
          if (task.currentValue !== before) {
            await manager.getRepository(DailyTaskProgress).save(task);
            changed.push(task.id);
          }
        }
        return { duplicate: false, updatedTaskIds: changed };
      });
      return {
        success: true,
        ...response,
        status: await this.getStatus(userId),
      };
    } catch (error: any) {
      if (/duplicate|Duplicate entry/i.test(String(error?.message || ''))) {
        return {
          success: true,
          duplicate: true,
          updatedTaskIds: [],
          status: await this.getStatus(userId),
        };
      }
      throw error;
    }
  }

  async getStatus(userId: number) {
    const tasks = await this.ensureTasks(userId);
    const daily = tasks.filter((task) => task.category === 'daily');
    const weekly = tasks.filter((task) => task.category === 'weekly');
    const legacy = await this.getTodayTask(userId);
    const claimable = tasks.filter(
      (task) => task.currentValue >= task.targetValue && !task.claimed,
    );
    const dailyActivity = daily
      .filter((task) => task.currentValue >= task.targetValue)
      .reduce(
        (sum, task) => sum + this.definition(task.taskCode).activityPoints,
        0,
      );

    return {
      success: true,
      serverTime: this.serverTime.clock(),
      taskDate: this.serverTime.dayKey(),
      weekKey: this.serverTime.weekKey(),
      daily: daily.map((task) => this.view(task)),
      weekly: weekly.map((task) => this.view(task)),
      tasks: tasks.map((task) => this.view(task)),
      claimableCount: claimable.length,
      dailyActivity,
      dailyActivityMax: 100,
      signCompleted:
        legacy.signCompleted ||
        this.completedTarget(daily, 'login'),
      feedCompleted:
        legacy.feedCompleted ||
        this.completedTarget(daily, 'item_used'),
      towerCompleted: legacy.towerCompleted,
      battleCompleted:
        legacy.battleCompleted ||
        this.completedTarget(daily, 'adventure_completed'),
      completed: daily.filter((task) => task.currentValue >= task.targetValue)
        .length,
      total: daily.length,
      allCompleted: daily.every(
        (task) => task.currentValue >= task.targetValue,
      ),
      rewardClaimed: daily.every((task) => task.claimed),
    };
  }

  async claimTask(
    userId: number,
    taskId: number,
    rawRequestId = '',
  ) {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        await this.ensureTasks(userId, manager);
        const repository = manager.getRepository(DailyTaskProgress);
        const task = await repository.findOne({
          where: { id: taskId, userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!task) throw new Error('任务不存在');
        if (task.currentValue < task.targetValue) {
          throw new Error('任务尚未完成');
        }
        if (task.claimed) {
          return {
            duplicate: true,
            task: this.view(task),
            reward: task.reward || {},
          };
        }
        const reward = (task.reward || {}) as UnifiedReward;
        await this.rewardService.grantWithManager(
          manager,
          userId,
          'task',
          `${task.periodKey}:${task.taskCode}`,
          reward,
          { taskId: task.id, taskCode: task.taskCode },
          rawRequestId || `task:${task.periodKey}:${task.taskCode}`,
        );
        task.claimed = true;
        task.claimedAt = this.serverTime.now();
        await repository.save(task);
        return {
          duplicate: false,
          task: this.view(task),
          reward,
        };
      });
      return {
        success: true,
        message: result.duplicate ? '任务奖励已领取' : '任务奖励领取成功',
        ...result,
        wallet: await this.rewardService.wallet(userId),
        status: await this.getStatus(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || '任务奖励领取失败'),
      };
    }
  }

  async claimAll(
    userId: number,
    category: 'daily' | 'weekly' | 'all' = 'all',
    rawRequestId = '',
  ) {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const tasks = await this.ensureTasks(userId, manager);
        const claimable = tasks.filter(
          (task) =>
            (category === 'all' || task.category === category) &&
            task.currentValue >= task.targetValue &&
            !task.claimed,
        );
        const rewards: UnifiedReward[] = [];
        for (const task of claimable) {
          const reward = (task.reward || {}) as UnifiedReward;
          await this.rewardService.grantWithManager(
            manager,
            userId,
            'task',
            `${task.periodKey}:${task.taskCode}`,
            reward,
            { taskId: task.id, taskCode: task.taskCode },
            `${rawRequestId || 'task-all'}:${task.periodKey}:${task.taskCode}`,
          );
          task.claimed = true;
          task.claimedAt = this.serverTime.now();
          await manager.getRepository(DailyTaskProgress).save(task);
          rewards.push(reward);
        }
        return {
          claimedCount: claimable.length,
          taskIds: claimable.map((task) => task.id),
          reward: this.mergeRewards(rewards),
        };
      });
      return {
        success: true,
        message: result.claimedCount
          ? `已领取 ${result.claimedCount} 项任务奖励`
          : '没有可领取的任务奖励',
        ...result,
        wallet: await this.rewardService.wallet(userId),
        status: await this.getStatus(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || '一键领取失败'),
      };
    }
  }

  async claimReward(userId: number) {
    return this.claimAll(
      userId,
      'daily',
      `legacy-daily:${this.serverTime.dayKey()}`,
    );
  }

  private async ensureTasks(userId: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(DailyTaskProgress)
      : this.progressRepository;
    const dayKey = this.serverTime.dayKey();
    const weekKey = this.serverTime.weekKey();
    const result: DailyTaskProgress[] = [];
    for (const config of ALL_TASK_DEFINITIONS) {
      const periodKey = config.category === 'daily' ? dayKey : weekKey;
      let task = await repository.findOne({
        where: {
          userId,
          taskCode: config.taskCode,
          periodKey,
        },
      });
      if (!task) {
        task = await repository.save(
          repository.create({
            userId,
            taskCode: config.taskCode,
            category: config.category,
            targetType: config.targetType,
            targetValue: config.targetValue,
            currentValue: 0,
            reward: config.reward,
            resetType: config.category,
            periodKey,
            claimed: false,
            completedAt: null,
            claimedAt: null,
          }),
        );
      }
      result.push(task);
    }
    return result;
  }

  private view(task: DailyTaskProgress) {
    const config = this.definition(task.taskCode);
    return {
      ...task,
      title: config.title,
      description: config.description,
      activityPoints: config.activityPoints,
      completed: Number(task.currentValue || 0) >= Number(task.targetValue || 1),
      canClaim:
        Number(task.currentValue || 0) >= Number(task.targetValue || 1) &&
        !task.claimed,
    };
  }

  private definition(taskCode: string): TaskDefinition {
    return (
      ALL_TASK_DEFINITIONS.find((item) => item.taskCode === taskCode) ||
      ALL_TASK_DEFINITIONS[0]
    );
  }

  private completedTarget(tasks: DailyTaskProgress[], targetType: string) {
    return tasks.some(
      (task) =>
        task.targetType === targetType &&
        task.currentValue >= task.targetValue,
    );
  }

  private mergeRewards(rewards: UnifiedReward[]) {
    const result: UnifiedReward = {
      gold: 0,
      diamond: 0,
      playerExp: 0,
      items: {},
      petExp: [],
      equipment: [],
      eggs: [],
    };
    for (const reward of rewards) {
      result.gold += Number(reward.gold || 0);
      result.diamond += Number(reward.diamond || 0);
      result.playerExp += Number(reward.playerExp || 0);
      for (const [code, quantity] of Object.entries(reward.items || {})) {
        result.items[code] =
          Number(result.items[code] || 0) + Number(quantity || 0);
      }
      result.petExp.push(...(reward.petExp || []));
      result.equipment.push(...(reward.equipment || []));
      result.eggs.push(...(reward.eggs || []));
    }
    return result;
  }
}
