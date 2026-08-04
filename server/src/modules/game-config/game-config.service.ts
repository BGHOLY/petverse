import { Injectable } from '@nestjs/common';

import {
  DEFAULT_BREED_LIMIT,
  FERTILITY_COST,
  FERTILITY_RECOVERY_PER_HOUR,
  getMarriageCooldownSeconds,
  HAS_LIFETIME_BREED_LIMIT,
  PROPOSAL_EXPIRE_HOURS,
} from '../marriage/marriage.config';

@Injectable()
export class GameConfigService {
  getPublicConfig() {
    return {
      success: true,
      version: '2.3.0',
      pet: {
        initialCapacity: 50,
        maxCapacity: 200,
        teamSize: 5,
        skillSlots: { min: 2, max: 10 },
      },
      breeding: {
        proposalExpireHours: PROPOSAL_EXPIRE_HOURS,
        kinshipCheckDepth: 3,
        cooldownSeconds: getMarriageCooldownSeconds(),
        fertilityMax: 100,
        fertilityCost: FERTILITY_COST,
        fertilityRecoveryPerHour: FERTILITY_RECOVERY_PER_HOUR,
        hasLifetimeBreedLimit: HAS_LIFETIME_BREED_LIMIT,
        defaultBreedLimit: DEFAULT_BREED_LIMIT,
        eggRewardMode: 'one_per_distinct_owner',
        cost: {
          gold: 500,
          items: { breeding_token: 1 },
        },
      },
      fusion: {
        cost: {
          gold: 1000,
          items: { fusion_core: 1 },
        },
      },
      trade: {
        listingFeeGold: 100,
        transactionTaxRate: 0.05,
      },
      season: {
        type: 'monthly',
      },
    };
  }
}
