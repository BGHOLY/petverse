import { Injectable } from '@nestjs/common';

@Injectable()
export class GameConfigService {
  getPublicConfig() {
    return {
      success: true,
      version: '2.3.0',
      pet: {
        initialCapacity: 50,
        maxCapacity: 200,
        teamSize: 3,
        skillSlots: { min: 2, max: 10 },
      },
      breeding: {
        proposalExpireHours: 72,
        kinshipCheckDepth: 3,
        cooldownSeconds: 60,
        fertilityMax: 100,
        fertilityCost: 20,
        fertilityRecoveryPerHour: 5,
        defaultBreedLimit: 20,
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
