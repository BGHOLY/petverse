import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { Egg } from '../egg/egg.entity';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Marriage } from '../marriage/marriage.entity';
import { Pet } from '../pet/pet.entity';
import { RewardService } from '../reward/reward.service';
import { SignRecord } from '../sign/sign-record.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { Achievement } from './achievement.entity';

interface AchievementConfig {
  achievementCode: string;
  category: string;
  groupCode: string;
  tier: number;
  title: string;
  description: string;
  eventType: string;
  target: number;
  rewardType: string;
  rewardValue: string;
}

const staged = (
  category: string,
  groupCode: string,
  eventType: string,
  title: string,
  targets: number[],
  rewards: Array<[string, string]>,
): AchievementConfig[] => targets.map((target, index) => ({
  achievementCode: `${groupCode}_${index + 1}`,
  category,
  groupCode,
  tier: index + 1,
  title: `${title}·${['初阶', '进阶', '大师'][index] || `第${index + 1}阶`}`,
  description: `累计达到 ${target}`,
  eventType,
  target,
  rewardType: rewards[index]?.[0] || 'gold',
  rewardValue: rewards[index]?.[1] || '100',
}));

const ACHIEVEMENT_CONFIGS: AchievementConfig[] = [
  ...staged('collection', 'pet_collection', 'pet_count', '宠物收藏家', [5, 15, 30], [
    ['gold', '300'], ['diamond', '20'], ['diamond', '50'],
  ]),
  ...staged('training', 'pet_training', 'pet_level', '培养大师', [10, 30, 50], [
    ['gold', '500'], ['item', '{"exp_potion_large":3}'], ['diamond', '60'],
  ]),
  ...staged('hatch', 'hatch_master', 'hatched_count', '孵化大师', [1, 5, 15], [
    ['item', '{"hatch_accelerator":1}'], ['gold', '1200'], ['diamond', '80'],
  ]),
  ...staged('social', 'social_bonds', 'marriage_count', '心愿结缘', [1, 3, 8], [
    ['gold', '500'], ['item', '{"breeding_token":2}'], ['diamond', '80'],
  ]),
  ...staged('adventure', 'adventure_wins', 'adventure_wins', '大陆探索者', [5, 25, 100], [
    ['gold', '500'], ['gold', '2000'], ['diamond', '100'],
  ]),
  ...staged('boss', 'boss_wins', 'boss_wins', '首领征服者', [1, 5, 20], [
    ['gold', '800'], ['item', '{"season_token":5}'], ['diamond', '120'],
  ]),
  ...staged('equipment', 'equipment_collection', 'equipment_count', '装备收藏家', [1, 10, 30], [
    ['gold', '300'], ['gold', '1500'], ['diamond', '80'],
  ]),
  ...staged('wealth', 'wealth_total', 'wealth_value', '财富达人', [5000, 20000, 100000], [
    ['gold', '500'], ['diamond', '30'], ['diamond', '100'],
  ]),
  {
    achievementCode: 'sign_7',
    category: 'general',
    groupCode: 'sign',
    tier: 1,
    title: '签到达人',
    description: '累计签到 7 天',
    eventType: 'sign_total',
    target: 7,
    rewardType: 'gold',
    rewardValue: '500',
  },
  {
    achievementCode: 'tower_10',
    category: 'adventure',
    groupCode: 'tower',
    tier: 1,
    title: '生态之塔新秀',
    description: '生态之塔达到第 10 层',
    eventType: 'tower_floor',
    target: 10,
    rewardType: 'gold',
    rewardValue: '1000',
  },
  {
    achievementCode: 'friend_1',
    category: 'social',
    groupCode: 'friends',
    tier: 1,
    title: '初识伙伴',
    description: '拥有 1 位好友',
    eventType: 'friend_count',
    target: 1,
    rewardType: 'gold',
    rewardValue: '300',
  },
  {
    achievementCode: 'pet_level_10',
    category: 'training',
    groupCode: 'pet_level_legacy',
    tier: 1,
    title: '培养新秀',
    description: '拥有 1 只达到 10 级的宠物',
    eventType: 'pet_level',
    target: 10,
    rewardType: 'gold',
    rewardValue: '1500',
  },
  {
    achievementCode: 'breed_1',
    category: 'social',
    groupCode: 'breed_legacy',
    tier: 1,
    title: '血脉初生',
    description: '完成 1 次结缘生蛋',
    eventType: 'marriage_count',
    target: 1,
    rewardType: 'item',
    rewardValue: '{"breeding_token":2}',
  },
  {
    achievementCode: 'fusion_1',
    category: 'training',
    groupCode: 'fusion',
    tier: 1,
    title: '炼妖初体验',
    description: '成功炼妖 1 次',
    eventType: 'fusion_count',
    target: 1,
    rewardType: 'item',
    rewardValue: '{"fusion_core":2}',
  },
  {
    achievementCode: 'mutant_1',
    category: 'collection',
    groupCode: 'mutant',
    tier: 1,
    title: '变异发现者',
    description: '拥有 1 只变异宠物',
    eventType: 'mutant_count',
    target: 1,
    rewardType: 'diamond',
    rewardValue: '20',
  },
  {
    achievementCode: 'special_2',
    category: 'training',
    groupCode: 'special_skill',
    tier: 1,
    title: '双特殊血脉',
    description: '拥有 1 只双特殊技能宠物',
    eventType: 'max_special',
    target: 2,
    rewardType: 'diamond',
    rewardValue: '50',
  },
  {
    achievementCode: 'skill_slot_8',
    category: 'training',
    groupCode: 'skill_slots',
    tier: 1,
    title: '八技能天赋',
    description: '拥有 1 只八技能槽宠物',
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
    @InjectRepository(Egg)
    private readonly eggRepository: Repository<Egg>,
    @InjectRepository(EquipmentItem)
    private readonly equipmentRepository: Repository<EquipmentItem>,
    @InjectRepository(BattleSessionV10)
    private readonly battleRepository: Repository<BattleSessionV10>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rewardService: RewardService,
    private readonly dataSource: DataSource,
  ) {}

  async seedAchievements(userId: number) {
    await this.seedMissing(userId, true);
    return this.syncAchievements(userId);
  }

  async getMyAchievements(userId: number) {
    return this.syncAchievements(userId);
  }

  async syncAchievements(userId: number) {
    await this.seedMissing(userId, true);
    const [pets, tower, sign, friendCount, fusionCount, marriageCount, hatchedCount, equipmentCount, adventureWins, bossWins, user] =
      await Promise.all([
        this.petRepository.find({ where: { ownerId: userId, isEgg: false } }),
        this.towerRepository.findOne({ where: { userId } }),
        this.signRepository.findOne({ where: { userId } }),
        this.friendRepository.count({ where: { userId } }),
        this.fusionRepository.count({ where: { ownerId: userId } }),
        this.marriageRepository
          .createQueryBuilder('marriage')
          .where('marriage.ownerAId = :userId OR marriage.ownerBId = :userId', { userId })
          .getCount(),
        this.eggRepository.count({ where: { ownerId: userId, status: 'hatched' } }),
        this.equipmentRepository.count({ where: { ownerId: userId } }),
        this.battleRepository.count({
          where: { userId, winnerSide: 'left', bossBattle: false, settled: true },
        }),
        this.battleRepository.count({
          where: { userId, winnerSide: 'left', bossBattle: true, settled: true },
        }),
        this.userRepository.findOne({ where: { id: userId } }),
      ]);

    const progressMap: Record<string, number> = {
      sign_total: Number(sign?.totalDays || 0),
      tower_floor: Number(tower?.maxFloor || 0),
      pet_count: pets.length,
      pet_level: Math.max(0, ...pets.map((pet) => Number(pet.level || 1))),
      friend_count: friendCount,
      marriage_count: marriageCount,
      hatched_count: hatchedCount,
      fusion_count: fusionCount,
      mutant_count: pets.filter((pet) => pet.isMutant).length,
      max_special: Math.max(0, ...pets.map((pet) => Number(pet.specialSkillCount || 0))),
      max_skill_slot: Math.max(0, ...pets.map((pet) => Number(pet.skillSlotCount || 0))),
      adventure_wins: adventureWins,
      boss_wins: bossWins,
      equipment_count: equipmentCount,
      wealth_value: Number(user?.gold || 0) + Number(user?.diamond || 0) * 100,
    };

    const achievements = await this.achievementRepository.find({
      where: { userId },
      order: { category: 'ASC', groupCode: 'ASC', tier: 'ASC', id: 'ASC' },
    });
    for (const achievement of achievements) {
      achievement.progress = Math.max(0, Number(progressMap[achievement.eventType] || 0));
      achievement.completed = achievement.progress >= Number(achievement.target || 1);
    }
    if (achievements.length) await this.achievementRepository.save(achievements);

    const nextByGroup = new Map<string, Achievement[]>();
    for (const achievement of achievements) {
      const group = achievement.groupCode || achievement.achievementCode;
      const values = nextByGroup.get(group) || [];
      values.push(achievement);
      nextByGroup.set(group, values);
    }
    return achievements.map((achievement) => {
      const group = nextByGroup.get(achievement.groupCode || achievement.achievementCode) || [];
      const nextStage = group.find((item) => item.tier === achievement.tier + 1);
      return {
        ...achievement,
        nextStage: nextStage
          ? { achievementCode: nextStage.achievementCode, tier: nextStage.tier, target: nextStage.target }
          : null,
      };
    });
  }

  async completeAchievement(userId: number, achievementCode: string) {
    const achievement = await this.achievementRepository.findOne({
      where: { userId, achievementCode },
    });
    if (!achievement) return null;
    achievement.progress = Math.max(Number(achievement.progress || 0), Number(achievement.target || 1));
    achievement.completed = true;
    return this.achievementRepository.save(achievement);
  }

  async claimAchievement(userId: number, achievementId: number) {
    await this.syncAchievements(userId);
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const achievement = await manager.findOne(Achievement, {
          where: { id: achievementId, userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!achievement) throw new Error('成就不存在');
        if (!achievement.completed) throw new Error('成就尚未完成');
        if (achievement.claimed) throw new Error('奖励已领取');

        const reward = this.parseReward(achievement);
        await this.rewardService.grantWithManager(
          manager,
          userId,
          'achievement',
          achievement.achievementCode,
          reward,
          { achievementId: achievement.id, achievementCode: achievement.achievementCode },
        );
        achievement.claimed = true;
        await manager.save(Achievement, achievement);
        return { success: true, message: '领取成功', achievement, reward };
      });
      return { ...result, wallet: await this.rewardService.wallet(userId) };
    } catch (error: any) {
      return { success: false, message: String(error?.message || '领取失败') };
    }
  }

  private async seedMissing(userId: number, updateExisting = false) {
    for (const config of ACHIEVEMENT_CONFIGS) {
      let achievement = await this.achievementRepository.findOne({
        where: { userId, achievementCode: config.achievementCode },
      });
      if (!achievement) {
        achievement = this.achievementRepository.create({
          userId,
          ...config,
          progress: 0,
          completed: false,
          claimed: false,
        });
      } else if (updateExisting) {
        Object.assign(achievement, config);
      }
      await this.achievementRepository.save(achievement);
    }
  }

  private parseReward(achievement: Achievement) {
    if (achievement.rewardType === 'diamond') {
      return { diamond: Number(achievement.rewardValue || 0) };
    }
    if (achievement.rewardType === 'item') {
      try {
        return { items: JSON.parse(achievement.rewardValue || '{}') };
      } catch {
        return { items: {} };
      }
    }
    return { gold: Number(achievement.rewardValue || 0) };
  }
}
