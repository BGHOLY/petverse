import { UnifiedReward } from '../reward/reward.service';

export interface ActivityTier {
  tierCode: string;
  target: number;
  reward: UnifiedReward;
}

export interface ActivityDefinition {
  activityId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'ended';
  taskRules: {
    eventType: string;
    pointsPerEvent: number;
    cycle: 'weekly' | 'monthly';
  };
  rewardTiers: ActivityTier[];
  bannerResource: string;
  priority: number;
  bonuses?: Record<string, number>;
}

const OPEN_START = '2026-01-01T00:00:00.000Z';
const OPEN_END = '2030-01-01T00:00:00.000Z';

export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  {
    activityId: 'adventure_boost',
    title: '限时冒险加成',
    description: '冒险结算金币与宠物经验提升 20%。',
    startTime: OPEN_START,
    endTime: OPEN_END,
    status: 'active',
    taskRules: {
      eventType: 'adventure_completed',
      pointsPerEvent: 1,
      cycle: 'weekly',
    },
    rewardTiers: [],
    bannerResource: 'activity/adventure-boost',
    priority: 100,
    bonuses: { battleGoldMultiplier: 1.2, petExpMultiplier: 1.2 },
  },
  {
    activityId: 'hatch_festival',
    title: '孵化庆典',
    description: '领取新宠物可积累庆典积分。',
    startTime: OPEN_START,
    endTime: OPEN_END,
    status: 'active',
    taskRules: {
      eventType: 'pet_hatched',
      pointsPerEvent: 10,
      cycle: 'weekly',
    },
    rewardTiers: [
      {
        tierCode: 'hatch-10',
        target: 10,
        reward: { gold: 300 },
      },
      {
        tierCode: 'hatch-30',
        target: 30,
        reward: { diamond: 15, items: { hatch_sandglass_small: 2 } },
      },
    ],
    bannerResource: 'activity/hatch-festival',
    priority: 90,
  },
  {
    activityId: 'pet_training_week',
    title: '宠物培养周',
    description: '使用培养道具可积累训练积分。',
    startTime: OPEN_START,
    endTime: OPEN_END,
    status: 'active',
    taskRules: {
      eventType: 'item_used',
      pointsPerEvent: 5,
      cycle: 'weekly',
    },
    rewardTiers: [
      {
        tierCode: 'train-20',
        target: 20,
        reward: { gold: 300, items: { exp_potion_small: 2 } },
      },
      {
        tierCode: 'train-50',
        target: 50,
        reward: { diamond: 15, items: { exp_potion_medium: 1 } },
      },
    ],
    bannerResource: 'activity/pet-training',
    priority: 80,
  },
  {
    activityId: 'boss_challenge',
    title: '首领挑战',
    description: '击败区域首领可积累挑战积分。',
    startTime: OPEN_START,
    endTime: OPEN_END,
    status: 'active',
    taskRules: {
      eventType: 'boss_defeated',
      pointsPerEvent: 20,
      cycle: 'weekly',
    },
    rewardTiers: [
      {
        tierCode: 'boss-20',
        target: 20,
        reward: { gold: 500 },
      },
      {
        tierCode: 'boss-60',
        target: 60,
        reward: { diamond: 20, items: { boss_core: 1 } },
      },
    ],
    bannerResource: 'activity/boss-challenge',
    priority: 70,
  },
  {
    activityId: 'cumulative_login',
    title: '累计登录',
    description: '活动期间每日登录均可积累进度。',
    startTime: OPEN_START,
    endTime: OPEN_END,
    status: 'active',
    taskRules: {
      eventType: 'login',
      pointsPerEvent: 1,
      cycle: 'monthly',
    },
    rewardTiers: [
      {
        tierCode: 'login-3',
        target: 3,
        reward: { gold: 500 },
      },
      {
        tierCode: 'login-7',
        target: 7,
        reward: { diamond: 20 },
      },
      {
        tierCode: 'login-15',
        target: 15,
        reward: { eggs: [{ rarityPotential: 3, source: 'login_activity' }] },
      },
    ],
    bannerResource: 'activity/cumulative-login',
    priority: 60,
  },
];
