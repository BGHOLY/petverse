import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { ItemService } from '../item/item.service';
import {
  findPetSpeciesConfig,
} from '../pet/config/pet-species.config';
import { Pet } from '../pet/pet.entity';
import {
  calculateExpeditionRewards,
  EXPEDITION_CONFIG_VERSION,
  EXPEDITION_DURATIONS,
  EXPEDITION_MAPS,
  ExpeditionMapCode,
} from './expedition.config';
import { Expedition } from './expedition.entity';

@Injectable()
export class ExpeditionService {
  constructor(
    @InjectRepository(Expedition)
    private readonly expeditionRepository: Repository<Expedition>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    private readonly economyService: EconomyService,
    private readonly itemService: ItemService,
  ) {}

  getConfig() {
    return {
      success: true,
      version: EXPEDITION_CONFIG_VERSION,
      durations: [...EXPEDITION_DURATIONS],
      maps: Object.values(EXPEDITION_MAPS),
      serverNow: new Date().toISOString(),
    };
  }

  async start(
    userId: number,
    rawMapCode: string,
    rawDurationMinutes: number,
    rawPetIds: number[],
    rawRequestId?: string,
  ) {
    const mapCode = String(rawMapCode || '') as ExpeditionMapCode;
    const map = EXPEDITION_MAPS[mapCode];
    const durationMinutes = Math.floor(Number(rawDurationMinutes || 0));
    const petIds = [
      ...new Set(
        (Array.isArray(rawPetIds) ? rawPetIds : [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ].slice(0, 5);
    const requestId = this.economyService.normalizeRequestId(
      rawRequestId,
      'expedition-start',
    );

    if (!map) return { success: false, message: 'Unknown expedition map' };
    if (!EXPEDITION_DURATIONS.includes(durationMinutes as any)) {
      return { success: false, message: 'Unsupported expedition duration' };
    }
    if (!petIds.length || petIds.length > 5) {
      return { success: false, message: 'Select 1 to 5 unique pets' };
    }

    const existing = await this.expeditionRepository.findOne({
      where: { userId, requestId },
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        expedition: this.toView(existing),
      };
    }

    const pets = await this.petRepository.find({
      where: { id: In(petIds), ownerId: userId, isEgg: false },
    });
    if (pets.length !== petIds.length) {
      return { success: false, message: 'One or more expedition pets are invalid' };
    }
    if (
      pets.some(
        (pet) =>
          pet.tradeStatus === 'listed' ||
          Number(pet.tradeListingId || 0) > 0,
      )
    ) {
      return { success: false, message: 'Listed pets cannot join an expedition' };
    }

    const active = await this.expeditionRepository.find({
      where: { userId, status: 'active' },
    });
    const busyPetIds = new Set(
      active.flatMap((entry) =>
        Array.isArray(entry.petIds) ? entry.petIds.map(Number) : [],
      ),
    );
    const busyPetId = petIds.find((petId) => busyPetIds.has(petId));
    if (busyPetId) {
      return {
        success: false,
        message: `Pet is already on an expedition: ${busyPetId}`,
      };
    }

    const rewardSeed = `expedition:${userId}:${requestId}`;
    const species = pets.map((pet) =>
      findPetSpeciesConfig(pet.speciesCode || pet.species),
    );
    const calculated = calculateExpeditionRewards(
      mapCode,
      durationMinutes,
      species,
      rewardSeed,
    );
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + durationMinutes * 60_000);
    const expedition = await this.expeditionRepository.save(
      this.expeditionRepository.create({
        userId,
        requestId,
        mapCode,
        durationMinutes,
        petIds,
        status: 'active',
        startedAt,
        endsAt,
        claimedAt: null,
        rewardSeed,
        rewards: calculated.rewards,
        modifiers: calculated.modifiers,
        configVersion: EXPEDITION_CONFIG_VERSION,
      }),
    );

    return {
      success: true,
      duplicate: false,
      expedition: this.toView(expedition),
    };
  }

  async getActive(userId: number) {
    const expeditions = await this.expeditionRepository.find({
      where: { userId, status: 'active' },
      order: { endsAt: 'ASC' },
    });
    return {
      success: true,
      expeditions: expeditions.map((entry) => this.toView(entry)),
      serverNow: new Date().toISOString(),
    };
  }

  async claim(userId: number, expeditionId: number) {
    await this.itemService.seedDefaultItems();
    try {
      const outcome = await this.economyService.transaction(async (manager) => {
        const repository = manager.getRepository(Expedition);
        const expedition = await repository.findOne({
          where: { id: expeditionId, userId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!expedition) throw new Error('Expedition not found');
        if (expedition.status === 'claimed') {
          return { expedition, duplicate: true };
        }
        if (new Date(expedition.endsAt).getTime() > Date.now()) {
          throw new Error('Expedition is not ready to claim');
        }

        const rewards = expedition.rewards || {};
        await this.economyService.grant(manager, userId, {
          gold: Number(rewards.gold || 0),
          items: rewards.items || {},
        });
        const petRepository = manager.getRepository(Pet);
        const pets = await petRepository.find({
          where: {
            id: In(Array.isArray(expedition.petIds) ? expedition.petIds : []),
            ownerId: userId,
          },
        });
        const petExp = Math.max(0, Math.floor(Number(rewards.petExp || 0)));
        for (const pet of pets) {
          pet.exp = Number(pet.exp || 0) + petExp;
        }
        if (pets.length) await petRepository.save(pets);

        expedition.status = 'claimed';
        expedition.claimedAt = new Date();
        await repository.save(expedition);
        return { expedition, duplicate: false };
      });

      return {
        success: true,
        duplicate: outcome.duplicate,
        expedition: this.toView(outcome.expedition),
        rewards: outcome.expedition.rewards,
        wallet: await this.economyService.getWallet(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Expedition claim failed'),
      };
    }
  }

  async getHistory(userId: number) {
    const expeditions = await this.expeditionRepository.find({
      where: { userId },
      order: { id: 'DESC' },
      take: 50,
    });
    return {
      success: true,
      expeditions: expeditions.map((entry) => this.toView(entry)),
      serverNow: new Date().toISOString(),
    };
  }

  async devComplete(userId: number, expeditionId: number) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'Expedition fast completion is disabled in production',
      };
    }
    const expedition = await this.expeditionRepository.findOne({
      where: { id: expeditionId, userId },
    });
    if (!expedition) return { success: false, message: 'Expedition not found' };
    if (expedition.status !== 'active') {
      return { success: true, duplicate: true, expedition: this.toView(expedition) };
    }
    expedition.endsAt = new Date(Date.now() - 1000);
    await this.expeditionRepository.save(expedition);
    return { success: true, expedition: this.toView(expedition) };
  }

  private toView(expedition: Expedition) {
    const endsAt = new Date(expedition.endsAt);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((endsAt.getTime() - Date.now()) / 1000),
    );
    return {
      ...expedition,
      ready: expedition.status === 'active' && remainingSeconds === 0,
      remainingSeconds,
      serverNow: new Date().toISOString(),
    };
  }
}
