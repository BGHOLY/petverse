import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { EggService } from '../egg/egg.service';
import { EconomyService } from '../economy/economy.service';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Pet } from '../pet/pet.entity';
import { User } from '../user/user.entity';
import { RewardClaim } from './reward-claim.entity';

export interface PetExpReward {
  petId: number;
  amount: number;
}

export interface EquipmentReward {
  itemTemplateId: string;
  name: string;
  slotType: string;
  rarity?: number;
  level?: number;
  mainStat?: Record<string, number>;
  subStats?: Record<string, number>;
  locked?: boolean;
}

export interface EggReward {
  rarityPotential?: number;
  source?: string;
  speciesCode?: string;
  isMutant?: boolean;
  skillSlotCount?: number;
}

export interface UnifiedReward {
  gold?: number;
  diamond?: number;
  playerExp?: number;
  petExp?: PetExpReward[];
  items?: Record<string, number>;
  equipment?: EquipmentReward[];
  eggs?: EggReward[];
}

@Injectable()
export class RewardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly economyService: EconomyService,
    private readonly eggService: EggService,
  ) {}

  async grant(
    userId: number,
    businessType: string,
    businessId: string,
    rawReward: UnifiedReward,
    payload: Record<string, any> = {},
    idempotencyKey = '',
  ) {
    try {
      const result = await this.dataSource.transaction((manager) =>
        this.grantWithManager(
          manager,
          userId,
          businessType,
          businessId,
          rawReward,
          payload,
          idempotencyKey,
        ),
      );
      return {
        success: true,
        ...result,
        wallet: await this.economyService.getWallet(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || '奖励发放失败'),
      };
    }
  }

  async grantWithManager(
    manager: EntityManager,
    userId: number,
    businessType: string,
    businessId: string,
    rawReward: UnifiedReward,
    payload: Record<string, any> = {},
    rawIdempotencyKey = '',
  ) {
    const type = this.requiredKey(businessType, 'businessType', 50);
    const id = this.requiredKey(businessId, 'businessId', 120);
    const idempotencyKey = this.requiredKey(
      rawIdempotencyKey || `${type}:${id}`,
      'idempotencyKey',
      120,
    );
    const repository = manager.getRepository(RewardClaim);
    const existing = await repository.findOne({
      where: { userId, businessType: type, businessId: id },
      lock: { mode: 'pessimistic_write' },
    });
    if (existing?.status === 'success') {
      return {
        duplicate: true,
        claimId: existing.id,
        reward: existing.reward || {},
        result: existing.result || {},
      };
    }

    const reward = this.normalizeReward(rawReward);
    const claim =
      existing ||
      (await repository.save(
        repository.create({
          userId,
          businessType: type,
          businessId: id,
          idempotencyKey,
          status: 'processing',
          reward,
          result: {},
          payload,
        }),
      ));

    const economy = await this.economyService.grant(manager, userId, {
      gold: reward.gold,
      diamond: reward.diamond,
      items: reward.items,
    });
    const player = await this.grantPlayerExp(
      manager,
      userId,
      reward.playerExp,
    );
    const pets = await this.grantPetExp(manager, userId, reward.petExp);
    const equipment = await this.grantEquipment(
      manager,
      userId,
      claim.id,
      reward.equipment,
    );
    const eggs = [];
    for (let index = 0; index < reward.eggs.length; index += 1) {
      const egg = reward.eggs[index];
      eggs.push(
        await this.eggService.createEgg(
          {
            ownerId: userId,
            rarityPotential: egg.rarityPotential,
            source: egg.source || `${type}:${id}`,
            speciesCode: egg.speciesCode,
            isMutant: egg.isMutant,
            skillSlotCount: egg.skillSlotCount,
            randomSeed: `reward-${claim.id}-egg-${index}`,
          },
          manager,
        ),
      );
    }

    const result = {
      userId,
      user: player,
      wallet: {
        gold: Number(economy.user?.gold || 0),
        diamond: Number(economy.user?.diamond || 0),
      },
      pets,
      equipment,
      eggs,
      inventoryChanged: Object.keys(reward.items).length > 0,
    };
    claim.status = 'success';
    claim.reward = reward;
    claim.result = result;
    await repository.save(claim);
    return {
      duplicate: false,
      claimId: claim.id,
      reward,
      result,
    };
  }

  async getClaim(userId: number, businessType: string, businessId: string) {
    return this.dataSource.getRepository(RewardClaim).findOne({
      where: {
        userId,
        businessType: String(businessType || ''),
        businessId: String(businessId || ''),
      },
    });
  }

  async inventorySnapshot(userId: number) {
    return this.dataSource.getRepository(Inventory).find({
      where: { userId },
      order: { id: 'ASC' },
    });
  }

  async wallet(userId: number) {
    return this.economyService.getWallet(userId);
  }

  private async grantPlayerExp(
    manager: EntityManager,
    userId: number,
    amount: number,
  ) {
    const repository = manager.getRepository(User);
    const user = await repository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new Error('User not found');
    user.exp = Number(user.exp || 0) + amount;
    while (user.exp >= Math.max(100, Number(user.level || 1) * 1000)) {
      user.exp -= Math.max(100, Number(user.level || 1) * 1000);
      user.level = Number(user.level || 1) + 1;
    }
    return repository.save(user);
  }

  private async grantPetExp(
    manager: EntityManager,
    userId: number,
    rewards: PetExpReward[],
  ) {
    const repository = manager.getRepository(Pet);
    const results: Pet[] = [];
    for (const entry of rewards) {
      const pet = await repository.findOne({
        where: {
          id: entry.petId,
          ownerId: userId,
          isEgg: false,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pet) throw new Error(`Pet not found: ${entry.petId}`);
      pet.exp = Number(pet.exp || 0) + entry.amount;
      pet.nextExp = Number(pet.nextExp || Number(pet.level || 1) * 100);
      while (pet.exp >= pet.nextExp) {
        pet.exp -= pet.nextExp;
        pet.level = Number(pet.level || 1) + 1;
        pet.unspentStatPoints = Number(pet.unspentStatPoints || 0) + 5;
        pet.nextExp = pet.level * 100;
      }
      results.push(await repository.save(pet));
    }
    return results;
  }

  private async grantEquipment(
    manager: EntityManager,
    userId: number,
    claimId: number,
    rewards: EquipmentReward[],
  ) {
    const repository = manager.getRepository(EquipmentItem);
    const results: EquipmentItem[] = [];
    for (let index = 0; index < rewards.length; index += 1) {
      const entry = rewards[index];
      const sourceKey = `reward:${claimId}:equipment:${index}`;
      let equipment = await repository.findOne({ where: { sourceKey } });
      if (!equipment) {
        equipment = await repository.save(
          repository.create({
            ownerId: userId,
            itemTemplateId: entry.itemTemplateId,
            name: entry.name,
            slotType: entry.slotType,
            rarity: entry.rarity,
            level: entry.level,
            mainStat: entry.mainStat,
            subStats: entry.subStats,
            equippedPetId: 0,
            locked: entry.locked,
            sourceBattleId: '',
            sourceKey,
          }),
        );
      }
      results.push(equipment);
    }
    return results;
  }

  private normalizeReward(raw: UnifiedReward) {
    const items: Record<string, number> = {};
    for (const [itemCode, value] of Object.entries(raw?.items || {})) {
      const quantity = this.quantity(value);
      if (itemCode && quantity > 0) items[itemCode] = quantity;
    }
    return {
      gold: this.quantity(raw?.gold),
      diamond: this.quantity(raw?.diamond),
      playerExp: this.quantity(raw?.playerExp),
      petExp: (Array.isArray(raw?.petExp) ? raw.petExp : [])
        .map((entry) => ({
          petId: this.quantity(entry?.petId),
          amount: this.quantity(entry?.amount),
        }))
        .filter((entry) => entry.petId > 0 && entry.amount > 0),
      items,
      equipment: (Array.isArray(raw?.equipment) ? raw.equipment : [])
        .map((entry) => ({
          itemTemplateId: String(entry?.itemTemplateId || '').slice(0, 64),
          name: String(entry?.name || '奖励装备').slice(0, 80),
          slotType: String(entry?.slotType || '').slice(0, 24),
          rarity: Math.max(1, Math.min(6, this.quantity(entry?.rarity) || 1)),
          level: Math.max(1, this.quantity(entry?.level) || 1),
          mainStat: entry?.mainStat || {},
          subStats: entry?.subStats || {},
          locked: Boolean(entry?.locked),
        }))
        .filter((entry) => entry.itemTemplateId && entry.slotType),
      eggs: (Array.isArray(raw?.eggs) ? raw.eggs : []).map((entry) => ({
        rarityPotential: Math.max(
          1,
          Math.min(6, this.quantity(entry?.rarityPotential) || 1),
        ),
        source: String(entry?.source || '').slice(0, 80),
        speciesCode: String(entry?.speciesCode || '').slice(0, 32) || undefined,
        isMutant: Boolean(entry?.isMutant),
        skillSlotCount: Math.max(
          1,
          Math.min(12, this.quantity(entry?.skillSlotCount) || 3),
        ),
      })),
    };
  }

  private quantity(value: any) {
    return Math.max(0, Math.floor(Number(value || 0)));
  }

  private requiredKey(value: string, name: string, length: number) {
    const normalized = String(value || '').trim().slice(0, length);
    if (!normalized) throw new Error(`Missing ${name}`);
    return normalized;
  }
}
