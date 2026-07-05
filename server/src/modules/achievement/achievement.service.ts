import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Achievement } from './achievement.entity';
import { User } from '../user/user.entity';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seedAchievements(userId: number) {
    const configs = [
      {
        achievementCode: 'sign_7',
        title: '签到达人',
        description: '累计签到7天',
        rewardType: 'gold',
        rewardValue: '500',
      },
      {
        achievementCode: 'tower_10',
        title: '爬塔新秀',
        description: '爬塔达到10层',
        rewardType: 'gold',
        rewardValue: '1000',
      },
      {
        achievementCode: 'pet_level_10',
        title: '训练大师',
        description: '拥有10级宠物',
        rewardType: 'gold',
        rewardValue: '1500',
      },
      {
        achievementCode: 'friend_1',
        title: '社交达人',
        description: '拥有1位好友',
        rewardType: 'gold',
        rewardValue: '300',
      },
    ];

    for (const config of configs) {
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
            completed: false,
            claimed: false,
          }),
        );
      }
    }

    return this.getMyAchievements(userId);
  }

  async getMyAchievements(userId: number) {
    return this.achievementRepository.find({
      where: {
        userId,
      },
      order: {
        id: 'ASC',
      },
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

    if (!achievement) {
      return;
    }

    if (achievement.completed) {
      return;
    }

    achievement.completed = true;

    await this.achievementRepository.save(
      achievement,
    );
  }

  async claimAchievement(
    userId: number,
    achievementId: number,
  ) {
    const achievement =
      await this.achievementRepository.findOne({
        where: {
          id: achievementId,
          userId,
        },
      });

    if (!achievement) {
      return {
        success: false,
        message: '成就不存在',
      };
    }

    if (!achievement.completed) {
      return {
        success: false,
        message: '成就尚未完成',
      };
    }

    if (achievement.claimed) {
      return {
        success: false,
        message: '奖励已领取',
      };
    }

    if (
      achievement.rewardType === 'gold'
    ) {
      const user =
        await this.userRepository.findOne({
          where: {
            id: userId,
          },
        });

      if (user) {
        user.gold += Number(
          achievement.rewardValue,
        );

        await this.userRepository.save(
          user,
        );
      }
    }

    achievement.claimed = true;

    await this.achievementRepository.save(
      achievement,
    );

    return {
      success: true,
      message: '领取成功',
      achievement,
    };
  }
}