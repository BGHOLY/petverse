export type BreedingMode = 'breed' | 'fusion';

export interface WeightedDelta {
  delta: number;
  weight: number;
}

export interface PercentileBucket {
  name: string;
  weight: number;
  minOffset: number;
  maxOffset: number;
}

export interface ModeConfig {
  mode: BreedingMode;
  maxSkillCapacity: number;
  mutationBaseRate: number;
  specialBaseRate: number;
  normalSkillInheritRate: number;
  capacityDeltas: WeightedDelta[];
  aptitudeBuckets: PercentileBucket[];
  growthBuckets: PercentileBucket[];
}

export const BREEDING_CONFIG_VERSION = '2.0.0';
export const MIN_SKILL_CAPACITY = 2;
export const MAX_SKILL_CAPACITY = 10;
export const MIN_NORMAL_SKILL_SLOTS = 1;

export const SPECIAL_ORDER_DECAY = [1, 0.85, 0.7, 0.55, 0.4] as const;

export const BREAKTHROUGH_CONFIRM_RATE: Record<number, number> = {
  1: 0.5,
  2: 0.2,
  3: 0.05,
};

export const HIGH_CAPACITY_MODIFIER: Record<number, number> = {
  8: 0.8,
  9: 0.5,
  10: 0.25,
};

export const BREED_MODE_CONFIG: ModeConfig = {
  mode: 'breed',
  maxSkillCapacity: 8,
  mutationBaseRate: 0.03,
  specialBaseRate: 0.32,
  normalSkillInheritRate: 0.52,
  capacityDeltas: [
    { delta: -2, weight: 0.12 },
    { delta: -1, weight: 0.28 },
    { delta: 0, weight: 0.42 },
    { delta: 1, weight: 0.15 },
    { delta: 2, weight: 0.03 },
  ],
  aptitudeBuckets: [
    { name: 'major_down', weight: 0.22, minOffset: -0.2, maxOffset: -0.1 },
    { name: 'minor_down', weight: 0.34, minOffset: -0.1, maxOffset: -0.02 },
    { name: 'near_center', weight: 0.34, minOffset: -0.02, maxOffset: 0.03 },
    { name: 'minor_up', weight: 0.09, minOffset: 0.03, maxOffset: 0.08 },
    { name: 'breakthrough', weight: 0.01, minOffset: 0.08, maxOffset: 0.15 },
  ],
  growthBuckets: [
    { name: 'major_down', weight: 0.22, minOffset: -0.2, maxOffset: -0.1 },
    { name: 'minor_down', weight: 0.34, minOffset: -0.1, maxOffset: -0.02 },
    { name: 'near_center', weight: 0.34, minOffset: -0.02, maxOffset: 0.03 },
    { name: 'minor_up', weight: 0.09, minOffset: 0.03, maxOffset: 0.08 },
    { name: 'breakthrough', weight: 0.01, minOffset: 0.08, maxOffset: 0.15 },
  ],
};

export const FUSION_MODE_CONFIG: ModeConfig = {
  mode: 'fusion',
  maxSkillCapacity: 10,
  mutationBaseRate: 0.05,
  specialBaseRate: 0.42,
  normalSkillInheritRate: 0.62,
  capacityDeltas: [
    { delta: -2, weight: 0.1 },
    { delta: -1, weight: 0.24 },
    { delta: 0, weight: 0.34 },
    { delta: 1, weight: 0.21 },
    { delta: 2, weight: 0.09 },
    { delta: 3, weight: 0.02 },
  ],
  aptitudeBuckets: [
    { name: 'major_down', weight: 0.15, minOffset: -0.22, maxOffset: -0.1 },
    { name: 'minor_down', weight: 0.27, minOffset: -0.1, maxOffset: -0.02 },
    { name: 'near_center', weight: 0.34, minOffset: -0.02, maxOffset: 0.03 },
    { name: 'minor_up', weight: 0.18, minOffset: 0.03, maxOffset: 0.09 },
    { name: 'breakthrough', weight: 0.06, minOffset: 0.09, maxOffset: 0.16 },
  ],
  growthBuckets: [
    { name: 'major_down', weight: 0.15, minOffset: -0.22, maxOffset: -0.1 },
    { name: 'minor_down', weight: 0.27, minOffset: -0.1, maxOffset: -0.02 },
    { name: 'near_center', weight: 0.34, minOffset: -0.02, maxOffset: 0.03 },
    { name: 'minor_up', weight: 0.18, minOffset: 0.03, maxOffset: 0.09 },
    { name: 'breakthrough', weight: 0.06, minOffset: 0.09, maxOffset: 0.16 },
  ],
};

export function getModeConfig(mode: BreedingMode): ModeConfig {
  return mode === 'fusion' ? FUSION_MODE_CONFIG : BREED_MODE_CONFIG;
}
