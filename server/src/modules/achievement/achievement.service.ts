import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Marriage } from '../marriage/marriage.entity';
import { Pet } from '../pet/pet.entity';
import { SignRecord } from '../sign/sign-record.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { Achievement } from './achievement.entity';

const ACHIEVEMENT_CONFIGS = [
  {
    achievementCode: 'sign_7',
    title: '签到达人',
    description: '累计签到7天',
    eventType: 'sign_total',
    target: 7,
    rewardType: 'gold',
    rewardValue: '500',
  },
  {
    achievementCode: 'tower_10',
    title: '爬塔新秀',
    description: '爬塔达到10层',
    eventType: 'tower_floor',
    target: 10,
    rewardType: 'gold',
    rewardValue: '1000',
  },
  {
    achievementCode: 'pet_level_10',
    title: '训练大师',
    description: '拥有10级宝宝',
    eventType: 'pet_level',
    target: 10,
    rewardType: 'gold',
    rewardValue: '1500',
  },
  {
    achievementCode: 'friend_1',
    title: '社交达人',
    description: '拥有1位好友',
    eventType: 'friend_count',
    target: 1,
    rewardType: 'gold',
    rewardValue: '300',
  },
  {
    achievementCode: 'breed_1',
    title: '血脉初生',
    description: '成功生蛋1次',
    eventType: 'breed_count',
    target: 1,
    rewardType: 'item',
    rewardValue: '{"breeding_token":2}',
  },
  {
    achievementCode: 'fusion_1',
    title: '炼妖初体验',
    description: '成功合宠1次',
    eventType: 'fusion_count',
    target: 1,
    rewardType: 'item',
    rewardValue: '{"fusion_core":2}',
  },
  {
    achievementCode: 'mutant_1',
    title: '变异发现者',
    description: '拥有1只变异宝宝',
    eventType: 'mutant_count',
    target: 1,
    rewardType: 'diamond',
    rewardValue: '20',
  },
  {
    achievementCode: 'special_2',
    title: '双特殊血脉',
    description: '拥有1只双特殊宝宝',
    eventType: 'max_special',
    target: 2,
    rewardType: 'diamond',
    rewardValue: '50',
  },
  {
    achievementCode: 'skill_slot_8',
    title: '八技能胚子',
    description: '拥有1只8技能格宝宝',
    eventType: 'max_skill_slot',
    target: 8,
    rewardType: 'item',
    rewardValue: '{"skill_lock":10}',
  },
];

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRepository: Repository<TowerRecord>,

    @InjectRepository(SignRecord)
    private readonly signRepository: Repository<SignRecord>,

    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    @InjectRepository(FusionRecord)
    private readonly fusionRepository: Repository<FusionRecord>,

    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,

    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  async seedAchievements(userId: number) {
    for (const config of ACHIEVEMENT_CONFIGS) {
      let achievement =
        await this.achievementRepository.findOne({
          where: {
            userId,
            achievementCode:
              config.achievementCode,
          },
        });

      if (!achievement) {
        achievement =
          this.achievementRepository.create({
            userId,
            ...config,
            progress: 0,
            completed: false,
            claimed: false,
          });
      } else {
        achievement.title =
          config.title;
        achievement.description =
          config.description;
        achievement.eventType =
          config.eventType;
        achievement.target =
          config.target;
        achievement.rewardType =
          config.rewardType;
        achievement.rewardValue =
          config.rewardValue;
      }
      await this.achievementRepository.save(
        achievement,
      );
    }

    return this.syncAchievements(userId);
  }

  async getMyAchievements(userId: number) {
    return this.syncAchievements(userId);
  }

  async syncAchievements(userId: number) {
    const current =
      await this.achievementRepository.count({
        where: { userId },
      });
    if (
      current < ACHIEVEMENT_CONFIGS.length
    ) {
      await this.seedMissing(userId);
    }

    const [
      pets,
      tower,
      sign,
      friendCount,
      fusionCount,
      marriages,
    ] = await Promise.all([
      this.petRepository.find({
        where: {
          ownerId: userId,
          isEgg: false,
        },
      }),
      this.towerRepository.findOne({
        where: { userId },
      }),
      this.signRepository.findOne({
        where: { userId },
      }),
      this.friendRepository.count({
        where: { userId },
      }),
      this.fusionRepository.count({
        where: { ownerId: userId },
      }),
      this.marriageRepository.find({
        where: { ownerAId: userId },
      }),
    ]);

    const progressMap: Record<string, number> = {
      sign_total: Number(sign?.totalDays || 0),
      tower_floor: Number(
        tower?.maxFloor || 0,
      ),
      pet_level: Math.max(
        0,
        ...pets.map((pet) =>
          Number(pet.level || 1),
        ),
      ),
      friend_count: friendCount,
      breed_count: marriages.reduce(
        (sum, marriage) =>
          sum +
          Number(marriage.eggCount || 0),
        0,
      ),
      fusion_count: fusionCount,
      mutant_count: pets.filter(
        (pet) => pet.isMutant,
      ).length,
      max_special: Math.max(
        0,
        ...pets.map((pet) =>
          Number(
            pet.specialSkillCount || 0,
          ),
        ),
      ),
      max_skill_slot: Math.max(
        0,
        ...pets.map((pet) =>
          Number(pet.skillSlotCount || 0),
        ),
      ),
    };

    const achievements =
      await this.achievementRepository.find({
        where: { userId },
        order: { id: 'ASC' },
      });

    for (const achievement of achievements) {
      const progress = Math.max(
        0,
        Number(
          progressMap[
            achievement.eventType
          ] || 0,
        ),
      );
      achievement.progress = progress;
      achievement.completed =
        progress >=
        Number(achievement.target || 1);
      await this.achievementRepository.save(
        achievement,
      );
    }

    return this.achievementRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });
  }

  async completeAchievement(
    userId: number,
    achievementCode: string,
  ) {
    const achievement =
      await this.achievementRepository.findOne({
        where: {
          userId,
          achievementCode,
        },
      });
    if (!achievement) return null;
    achievement.progress = Math.max(
      Number(achievement.progress || 0),
      Number(achievement.target || 1),
    );
    achievement.completed = true;
    return this.achievementRepository.save(
      achievement,
    );
  }

  async claimAchievement(
    userId: number,
    achievementId: number,
  ) {
    await this.syncAchievements(userId);

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const achievement =
              await manager.findOne(
                Achievement,
                {
                  where: {
                    id: achievementId,
                    userId,
                  },
                  lock: {
                    mode:
                      'pessimistic_write',
                  },
                },
              );
            if (!achievement) {
              throw new Error(
                '成就不存在',
              );
            }
            if (!achievement.completed) {
              throw new Error(
                '成就尚未完成',
              );
            }
            if (achievement.claimed) {
              throw new Error(
                '奖励已领取',
              );
            }

            const reward =
              this.parseReward(
                achievement,
              );
            await this.economyService.grant(
              manager,
              userId,
              reward,
            );

            achievement.claimed = true;
            await manager.save(
              Achievement,
              achievement,
            );

            return {
              success: true,
              message: '领取成功',
              achievement,
              reward,
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
          error?.message || '领取失败',
        ),
      };
    }
  }

  private async seedMissing(userId: number) {
    for (const config of ACHIEVEMENT_CONFIGS) {
      const exists =
        await this.achievementRepository.findOne({
          where: {
            userId,
            achievementCode:
              config.achievementCode,
          },
        });
      if (!exists) {
        await this.achievementRepository.save(
          this.achievementRepository.create({
            userId,
            ...config,
            progress: 0,
            completed: false,
            claimed: false,
          }),
        );
      }
    }
  }

  private parseReward(
    achievement: Achievement,
  ) {
    if (
      achievement.rewardType === 'diamond'
    ) {
      return {
        diamond: Number(
          achievement.rewardValue || 0,
        ),
      };
    }
    if (
      achievement.rewardType === 'item'
    ) {
      try {
        return {
          items: JSON.parse(
            achievement.rewardValue ||
              '{}',
          ),
        };
      } catch {
        return { items: {} };
      }
    }
    return {
      gold: Number(
        achievement.rewardValue || 0,
      ),
    };
  }
}
