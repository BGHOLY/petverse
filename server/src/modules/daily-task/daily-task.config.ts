import { UnifiedReward } from '../reward/reward.service';

export interface TaskDefinition {
  taskCode: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly';
  targetType: string;
  targetValue: number;
  reward: UnifiedReward;
  activityPoints: number;
}

export const DAILY_TASK_DEFINITIONS: TaskDefinition[] = [
  {
    taskCode: 'daily_login',
    title: '温馨报到',
    description: '登录游戏 1 次',
    category: 'daily',
    targetType: 'login',
    targetValue: 1,
    reward: { gold: 100 },
    activityPoints: 10,
  },
  {
    taskCode: 'daily_use_item',
    title: '细心照料',
    description: '使用培养道具 1 次',
    category: 'daily',
    targetType: 'item_used',
    targetValue: 1,
    reward: { items: { apple: 1 } },
    activityPoints: 10,
  },
  {
    taskCode: 'daily_adventure_1',
    title: '林间散步',
    description: '完成冒险 1 次',
    category: 'daily',
    targetType: 'adventure_completed',
    targetValue: 1,
    reward: { gold: 150 },
    activityPoints: 10,
  },
  {
    taskCode: 'daily_adventure_3',
    title: '勇者巡游',
    description: '完成冒险 3 次',
    category: 'daily',
    targetType: 'adventure_completed',
    targetValue: 3,
    reward: { gold: 300, playerExp: 50 },
    activityPoints: 20,
  },
  {
    taskCode: 'daily_shop',
    title: '小镇采购',
    description: '购买商品 1 次',
    category: 'daily',
    targetType: 'shop_purchase',
    targetValue: 1,
    reward: { gold: 100 },
    activityPoints: 10,
  },
  {
    taskCode: 'daily_hatch',
    title: '新生命',
    description: '领取孵化宠物 1 次',
    category: 'daily',
    targetType: 'pet_hatched',
    targetValue: 1,
    reward: { diamond: 5 },
    activityPoints: 20,
  },
  {
    taskCode: 'daily_team',
    title: '阵容整理',
    description: '保存编队 1 次',
    category: 'daily',
    targetType: 'team_saved',
    targetValue: 1,
    reward: { gold: 100 },
    activityPoints: 10,
  },
  {
    taskCode: 'daily_equip',
    title: '整装待发',
    description: '穿戴装备 1 次',
    category: 'daily',
    targetType: 'equipment_equipped',
    targetValue: 1,
    reward: { gold: 100 },
    activityPoints: 10,
  },
];

export const WEEKLY_TASK_DEFINITIONS: TaskDefinition[] = [
  {
    taskCode: 'weekly_adventure_20',
    title: '本周探险家',
    description: '完成冒险 20 次',
    category: 'weekly',
    targetType: 'adventure_completed',
    targetValue: 20,
    reward: { gold: 1500, diamond: 10 },
    activityPoints: 20,
  },
  {
    taskCode: 'weekly_boss_3',
    title: '首领克星',
    description: '击败首领 3 次',
    category: 'weekly',
    targetType: 'boss_defeated',
    targetValue: 3,
    reward: { diamond: 20 },
    activityPoints: 20,
  },
  {
    taskCode: 'weekly_hatch_3',
    title: '孵化达人',
    description: '领取孵化宠物 3 次',
    category: 'weekly',
    targetType: 'pet_hatched',
    targetValue: 3,
    reward: { items: { hatch_sandglass_small: 2 } },
    activityPoints: 20,
  },
  {
    taskCode: 'weekly_social',
    title: '心意相连',
    description: '完成婚礼或社交互动 1 次',
    category: 'weekly',
    targetType: 'social_completed',
    targetValue: 1,
    reward: { diamond: 15 },
    activityPoints: 20,
  },
  {
    taskCode: 'weekly_equipment_5',
    title: '装备收藏家',
    description: '获得装备 5 件',
    category: 'weekly',
    targetType: 'equipment_obtained',
    targetValue: 5,
    reward: { gold: 1000 },
    activityPoints: 20,
  },
];

export const ALL_TASK_DEFINITIONS = [
  ...DAILY_TASK_DEFINITIONS,
  ...WEEKLY_TASK_DEFINITIONS,
];

export const DAILY_ACTIVITY_CHESTS = [
  { threshold: 20, reward: { gold: 100 } },
  { threshold: 50, reward: { gold: 250, items: { exp_potion_small: 1 } } },
  { threshold: 80, reward: { diamond: 5 } },
  {
    threshold: 100,
    reward: { diamond: 10, items: { hatch_sandglass_small: 1 } },
  },
] as const;
