import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  MoreThan,
  Repository,
} from 'typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { DailyTaskService } from '../daily-task/daily-task.service';
import { Egg } from '../egg/egg.entity';
import { EquipmentItem } from '../equipment/equipment.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { Mail } from '../mail/mail.entity';
import { Marriage } from '../marriage/marriage.entity';
import { MarriageProposal } from '../marriage/marriage-proposal.entity';
import { RewardService, UnifiedReward } from '../reward/reward.service';
import { ServerTimeService } from '../server-time/server-time.service';
import { SignService } from '../sign/sign.service';
import { User } from '../user/user.entity';
import {
  ACTIVITY_DEFINITIONS,
  ActivityDefinition,
} from './activity.config';
import { ActivityProgress } from './activity-progress.entity';
import { ActivityRewardClaim } from './activity-reward-claim.entity';
import { NewcomerClaim } from './newcomer-claim.entity';

interface NewcomerTier {
  tierCode: string;
  title: string;
  description: string;
  reward: UnifiedReward;
}

const NEWCOMER_TIERS: NewcomerTier[] = [
  {
    tierCode: 'registered',
    title: '初来乍到',
    description: '创建 PetVerse 账号',
    reward: { gold: 500, items: { apple: 3 } },
  },
  {
    tierCode: 'level_5',
    title: '成长起步',
    description: '玩家等级达到 5 级',
    reward: { diamond: 10, items: { exp_potion_small: 2 } },
  },
  {
    tierCode: 'first_hatch',
    title: '生命诞生',
    description: '完成首次宠物孵化',
    reward: { gold: 800, items: { hatch_sandglass_small: 1 } },
  },
  {
    tierCode: 'first_marriage',
    title: '心愿结缘',
    description: '完成首次宠物婚礼',
    reward: { diamond: 15, items: { breeding_token: 1 } },
  },
  {
    tierCode: 'first_adventure',
    title: '踏上冒险',
    description: '首次赢得普通冒险',
    reward: { gold: 1000, playerExp: 100 },
  },
  {
    tierCode: 'first_boss',
    title: '首领挑战者',
    description: '首次击败区域首领',
    reward: { diamond: 20, items: { boss_core: 1 } },
  },
  {
    tierCode: 'first_equipment',
    title: '整装出发',
    description: '首次给宠物穿戴装备',
    reward: { gold: 600, items: { exp_potion_medium: 1 } },
  },
];

@Injectable()
export class RetentionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Egg)
    private readonly eggRepository: Repository<Egg>,
    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,
    @InjectRepository(BattleSessionV10)
    private readonly battleRepository: Repository<BattleSessionV10>,
    @InjectRepository(EquipmentItem)
    private readonly equipmentRepository: Repository<EquipmentItem>,
    @InjectRepository(ActivityProgress)
    private readonly activityRepository: Repository<ActivityProgress>,
    @InjectRepository(ActivityRewardClaim)
    private readonly activityClaimRepository: Repository<ActivityRewardClaim>,
    @InjectRepository(NewcomerClaim)
    private readonly newcomerClaimRepository: Repository<NewcomerClaim>,
    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(MarriageProposal)
    private readonly marriageProposalRepository: Repository<MarriageProposal>,
    private readonly dailyTaskService: DailyTaskService,
    private readonly signService: SignService,
    private readonly rewardService: RewardService,
    private readonly serverTime: ServerTimeService,
    private readonly dataSource: DataSource,
  ) {}

  async startSession(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    user.lastActiveAt = this.serverTime.now();
    await this.userRepository.save(user);
    const taskEvent = await this.dailyTaskService.recordEvent(
      userId,
      'login',
      `login:${this.serverTime.dayKey()}`,
      1,
      { serverNow: this.serverTime.now().toISOString() },
    );
    return {
      success: true,
      duplicate: taskEvent.duplicate,
      clock: this.serverTime.clock(),
      redDots: await this.getRedDots(userId),
    };
  }

  async getOverview(userId: number) {
    const [sign, tasks, newcomer, activities, redDots] = await Promise.all([
      this.signService.getMySignInfo(userId),
      this.dailyTaskService.getStatus(userId),
      this.getNewcomer(userId),
      this.getActivities(userId),
      this.getRedDots(userId),
    ]);
    return {
      success: true,
      clock: this.serverTime.clock(),
      sign,
      tasks,
      newcomer,
      activities,
      redDots,
    };
  }

  async getNewcomer(userId: number) {
    const [progress, claims] = await Promise.all([
      this.evaluateNewcomer(userId),
      this.newcomerClaimRepository.find({ where: { userId } }),
    ]);
    const claimed = new Set(claims.map((claim) => claim.tierCode));
    const tiers = NEWCOMER_TIERS.map((tier) => ({
      ...tier,
      completed: Boolean(progress[tier.tierCode]),
      claimed: claimed.has(tier.tierCode),
      canClaim:
        Boolean(progress[tier.tierCode]) && !claimed.has(tier.tierCode),
    }));
    return {
      success: true,
      tiers,
      claimableCount: tiers.filter((tier) => tier.canClaim).length,
    };
  }

  async claimNewcomer(
    userId: number,
    tierCode: string,
    rawRequestId = '',
  ) {
    const config = NEWCOMER_TIERS.find((tier) => tier.tierCode === tierCode);
    if (!config) return { success: false, message: '萌新礼包不存在' };
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const progress = await this.evaluateNewcomer(userId, manager);
        if (!progress[config.tierCode]) {
          throw new Error('礼包条件尚未完成');
        }
        const repository = manager.getRepository(NewcomerClaim);
        const existing = await repository.findOne({
          where: { userId, tierCode: config.tierCode },
          lock: { mode: 'pessimistic_write' },
        });
        if (existing) return { duplicate: true, reward: config.reward };
        const idempotencyKey =
          rawRequestId || `newcomer:${userId}:${config.tierCode}`;
        await this.rewardService.grantWithManager(
          manager,
          userId,
          'newcomer',
          config.tierCode,
          config.reward,
          { tierCode: config.tierCode },
          idempotencyKey,
        );
        await repository.save(
          repository.create({
            userId,
            tierCode: config.tierCode,
            claimedAt: this.serverTime.now(),
            idempotencyKey,
          }),
        );
        return { duplicate: false, reward: config.reward };
      });
      return {
        success: true,
        message: result.duplicate ? '萌新礼包已领取' : '萌新礼包领取成功',
        ...result,
        wallet: await this.rewardService.wallet(userId),
        newcomer: await this.getNewcomer(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || '萌新礼包领取失败'),
      };
    }
  }

  async getActivities(userId: number) {
    const now = this.serverTime.now();
    const rows = await this.activityRepository.find({ where: { userId } });
    const claims = await this.activityClaimRepository.find({
      where: { userId },
    });
    const activities = ACTIVITY_DEFINITIONS.map((definition) => {
      const status = this.activityStatus(definition, now);
      const cycleId = this.activityCycle(definition, now);
      const progress =
        rows.find(
          (row) =>
            row.activityId === definition.activityId &&
            row.cycleId === cycleId,
        )?.points || 0;
      const tiers = definition.rewardTiers.map((tier) => {
        const claimed = claims.some(
          (claim) =>
            claim.activityId === definition.activityId &&
            claim.cycleId === cycleId &&
            claim.tierCode === tier.tierCode,
        );
        return {
          ...tier,
          claimed,
          canClaim: status === 'active' && progress >= tier.target && !claimed,
        };
      });
      return {
        ...definition,
        status,
        cycleId,
        progress,
        rewardTiers: tiers,
        claimableCount: tiers.filter((tier) => tier.canClaim).length,
      };
    }).sort((a, b) => b.priority - a.priority);
    return {
      success: true,
      activities,
      claimableCount: activities.reduce(
        (sum, activity) => sum + activity.claimableCount,
        0,
      ),
      serverNow: now.toISOString(),
    };
  }

  async claimActivity(
    userId: number,
    activityId: string,
    tierCode: string,
    rawRequestId = '',
  ) {
    const definition = ACTIVITY_DEFINITIONS.find(
      (activity) => activity.activityId === activityId,
    );
    const tier = definition?.rewardTiers.find(
      (item) => item.tierCode === tierCode,
    );
    if (!definition || !tier) {
      return { success: false, message: '活动奖励不存在' };
    }
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const now = this.serverTime.now();
        if (this.activityStatus(definition, now) !== 'active') {
          throw new Error('活动未开放或已结束');
        }
        const cycleId = this.activityCycle(definition, now);
        const progress = await manager.getRepository(ActivityProgress).findOne({
          where: { userId, activityId, cycleId },
          lock: { mode: 'pessimistic_write' },
        });
        if (Number(progress?.points || 0) < tier.target) {
          throw new Error('活动进度不足');
        }
        const repository = manager.getRepository(ActivityRewardClaim);
        const existing = await repository.findOne({
          where: { userId, activityId, cycleId, tierCode },
          lock: { mode: 'pessimistic_write' },
        });
        if (existing) return { duplicate: true, reward: tier.reward };
        const idempotencyKey =
          rawRequestId ||
          `activity:${userId}:${activityId}:${cycleId}:${tierCode}`;
        await this.rewardService.grantWithManager(
          manager,
          userId,
          'activity',
          `${activityId}:${cycleId}:${tierCode}`,
          tier.reward,
          { activityId, cycleId, tierCode },
          idempotencyKey,
        );
        await repository.save(
          repository.create({
            userId,
            activityId,
            cycleId,
            tierCode,
            claimedAt: now,
            idempotencyKey,
          }),
        );
        return { duplicate: false, reward: tier.reward };
      });
      return {
        success: true,
        message: result.duplicate ? '活动奖励已领取' : '活动奖励领取成功',
        ...result,
        wallet: await this.rewardService.wallet(userId),
        activities: await this.getActivities(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || '活动奖励领取失败'),
      };
    }
  }

  async getRedDots(userId: number) {
    const [
      sign,
      tasks,
      newcomer,
      activities,
      unreadMail,
      claimableMail,
      friendRequests,
      marriageRequests,
      readyEggs,
    ] = await Promise.all([
      this.signService.getMySignInfo(userId),
      this.dailyTaskService.getStatus(userId),
      this.getNewcomer(userId),
      this.getActivities(userId),
      this.mailRepository.count({ where: { userId, readed: false } }),
      this.mailRepository.count({ where: { userId, claimed: false } }),
      this.friendRequestRepository.count({
        where: { toUserId: userId, status: 'pending' },
      }),
      this.marriageProposalRepository.count({
        where: { targetUserId: userId, status: 'pending' },
      }),
      this.eggRepository.count({
        where: {
          ownerId: userId,
          status: 'incubating',
          hatchReadyAt: MoreThan(new Date(0)),
        },
      }),
    ]);
    const sources = {
      sign: sign.canSign ? 1 : 0,
      newcomer: newcomer.claimableCount,
      tasks: Number(tasks.claimableCount || 0) +
        Number(tasks.activityChests?.filter((item: any) => item.canClaim).length || 0),
      activities: activities.claimableCount,
      friends: friendRequests,
      marriage: marriageRequests,
      hatchery: await this.countReadyEggs(userId, readyEggs),
      mail: Math.max(unreadMail, claimableMail),
    };
    const benefits =
      sources.sign + sources.newcomer + sources.tasks + sources.activities;
    const more =
      sources.friends + sources.marriage + sources.hatchery + sources.mail;
    return {
      success: true,
      sources,
      benefits,
      more,
      total: Math.min(999, benefits + more),
      displayTotal: benefits + more > 99 ? '99+' : String(benefits + more),
    };
  }

  async getActiveBonuses() {
    const now = this.serverTime.now();
    const bonuses: Record<string, number> = {};
    for (const activity of ACTIVITY_DEFINITIONS.filter(
      (item) => this.activityStatus(item, now) === 'active',
    )) {
      for (const [key, value] of Object.entries(activity.bonuses || {})) {
        bonuses[key] = Math.max(Number(bonuses[key] || 1), Number(value || 1));
      }
    }
    return bonuses;
  }

  private async evaluateNewcomer(
    userId: number,
    manager?: EntityManager,
  ): Promise<Record<string, boolean>> {
    const source = manager || this.dataSource.manager;
    const user = await source.getRepository(User).findOne({
      where: { id: userId },
    });
    if (!user) return {};
    const [hatched, marriages, adventures, bosses, equipped] =
      await Promise.all([
        source.getRepository(Egg).count({
          where: { ownerId: userId, status: 'hatched' },
        }),
        source.getRepository(Marriage).count({
          where: [{ ownerAId: userId }, { ownerBId: userId }],
        }),
        source.getRepository(BattleSessionV10).count({
          where: {
            userId,
            settled: true,
            winnerSide: 'left',
            bossBattle: false,
          },
        }),
        source.getRepository(BattleSessionV10).count({
          where: {
            userId,
            settled: true,
            winnerSide: 'left',
            bossBattle: true,
          },
        }),
        source.getRepository(EquipmentItem).count({
          where: {
            ownerId: userId,
            equippedPetId: MoreThan(0),
          },
        }),
      ]);
    return {
      registered: true,
      level_5: Number(user.level || 1) >= 5,
      first_hatch: hatched > 0,
      first_marriage: marriages > 0,
      first_adventure: adventures > 0,
      first_boss: bosses > 0,
      first_equipment: equipped > 0,
    };
  }

  private activityStatus(
    definition: ActivityDefinition,
    now: Date,
  ): 'scheduled' | 'active' | 'ended' {
    if (now.getTime() < new Date(definition.startTime).getTime()) {
      return 'scheduled';
    }
    if (now.getTime() >= new Date(definition.endTime).getTime()) {
      return 'ended';
    }
    return 'active';
  }

  private activityCycle(definition: ActivityDefinition, now: Date) {
    return definition.taskRules.cycle === 'monthly'
      ? this.serverTime.monthKey(now)
      : this.serverTime.weekKey(now);
  }

  private async countReadyEggs(userId: number, candidates: number) {
    if (!candidates) return 0;
    const now = this.serverTime.now().getTime();
    const eggs = await this.eggRepository.find({
      where: { ownerId: userId, status: 'incubating' },
    });
    return eggs.filter(
      (egg) =>
        Boolean(egg.hatchReadyAt) &&
        new Date(egg.hatchReadyAt).getTime() <= now,
    ).length;
  }
}
