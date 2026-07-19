import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { Egg } from '../egg/egg.entity';
import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { InventoryService } from '../inventory/inventory.service';
import { OffspringBlueprint, PetService } from '../pet/pet.service';
import { Pet } from '../pet/pet.entity';
import { User } from '../user/user.entity';

@Injectable()
export class HatcheryService {
  constructor(
    private readonly eggService: EggService,
    private readonly petService: PetService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async getEggs(userId = DEFAULT_USER_ID) {
    const eggs = await this.eggService.getUserEggViews(userId, true);
    const activeEggs = eggs.filter((egg: any) =>
      ['incubating', 'hatching'].includes(String(egg?.status || '')),
    ).sort((a: any, b: any) => Number(a?.incubatorSlot || 0) - Number(b?.incubatorSlot || 0));
    const activeEgg = activeEggs[0] || null;
    const incubators = [1, 2, 3].map((slot) => ({
      slot,
      egg: activeEggs.find((egg: any) => Number(egg?.incubatorSlot || 0) === slot) || null,
    }));
    const warehouse = eggs.filter(
      (egg: any) => String(egg?.status || '') === 'stored',
    );
    return {
      success: true,
      eggs,
      activeEgg,
      activeEggs,
      incubators,
      warehouse,
      data: {
        eggs,
        activeEgg,
        activeEggs,
        incubators,
        warehouse,
        serverNow: new Date().toISOString(),
      },
      serverNow: new Date().toISOString(),
    };
  }

  async getEggDetail(userId: number, eggId: number) {
    const egg = await this.eggService.getEggById(eggId);

    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
        data: null,
      };
    }

    const data = this.eggService.toEggView(egg);
    return {
      success: true,
      data,
      egg: data,
    };
  }

  async startIncubation(userId: number, eggId: number, slot = 0) {
    if (!eggId) {
      return {
        success: false,
        message: 'Missing eggId',
      };
    }

    const requestedSlot = Number(slot) >= 1 && Number(slot) <= 3
      ? Math.floor(Number(slot))
      : 0;
    const startResult: any = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return { success: false, message: 'User not found' };

      const eggRepository = manager.getRepository(Egg);
      const activeEggs = await eggRepository.find({
        where: { ownerId: userId, status: In(['incubating', 'hatching']) },
        order: { incubatorSlot: 'ASC', id: 'ASC' },
      });
      if (activeEggs.length >= 3) {
        return {
          success: false,
          message: 'All three incubators are occupied',
          activeEggs: activeEggs.map((activeEgg) => this.eggService.toEggView(activeEgg)),
        };
      }

      const occupied = new Set(
        activeEggs.map((activeEgg) => Number(activeEgg.incubatorSlot || 0)),
      );
      const selectedSlot = requestedSlot || [1, 2, 3].find((candidate) => !occupied.has(candidate)) || 0;
      if (!selectedSlot || occupied.has(selectedSlot)) {
        return { success: false, message: `Incubator slot ${selectedSlot || requestedSlot} is occupied` };
      }

      const egg = await eggRepository.findOne({
        where: { id: eggId, ownerId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!egg) return { success: false, message: 'Egg not found' };
      if (egg.status !== 'stored') {
        return {
          success: false,
          message: 'Only warehouse eggs can enter the incubator',
          egg: this.eggService.toEggView(egg),
        };
      }

      egg.status = 'incubating';
      egg.incubatorSlot = selectedSlot;
      egg.hatchReadyAt = new Date(
        Date.now() + Math.max(0, Number(egg.hatchDurationSeconds || 0)) * 1000,
      );
      return { success: true, egg: await eggRepository.save(egg) };
    });

    if (!startResult.success) return startResult;
    const started: Egg = startResult.egg;

    const eggs = await this.eggService.getUserEggViews(userId, true);
    return {
      success: true,
      message: `Egg placed into incubator ${Number(started.incubatorSlot || slot || 1)}`,
      incubatorSlot: Number(started.incubatorSlot || slot || 1),
      egg: this.eggService.toEggView(started),
      eggs,
      data: {
        egg: this.eggService.toEggView(started),
        eggs,
      },
    };
  }

  async accelerate(
    userId: number,
    eggId: number,
    itemCode: string,
    quantity = 1,
  ) {
    const normalizedCode = String(itemCode || '').trim();
    const normalizedQuantity = Math.max(
      1,
      Math.min(99, Math.floor(Number(quantity || 1))),
    );
    const inventory = await this.inventoryService.getUserInventory(userId);
    const item = inventory.find(
      (entry: any) => String(entry?.itemCode || '') === normalizedCode,
    );
    if (
      !item ||
      String(item?.effect || '') !== 'hatch_acceleration' ||
      Number(item?.quantity || 0) < normalizedQuantity
    ) {
      return {
        success: false,
        message: 'Hatch accelerator not available',
      };
    }

    const secondsPerItem = Math.max(1, Number(item?.effectValue || 0));
    const accelerationResult: any = await this.dataSource.transaction(async (manager) => {
      const eggRepository = manager.getRepository(Egg);
      const egg = await eggRepository.findOne({
        where: { id: eggId, ownerId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!egg || egg.status !== 'incubating') {
        return { success: false, message: 'Incubating egg not found' };
      }

      const remainingSeconds = this.eggService.getRemainingSeconds(egg);
      if (remainingSeconds <= 0) {
        return {
          success: false,
          message: 'Egg is already ready to hatch',
          egg: this.eggService.toEggView(egg),
        };
      }

      const consumed = await this.inventoryService.consumeItem(
        userId,
        normalizedCode,
        normalizedQuantity,
        manager,
      );
      if (!consumed) return { success: false, message: 'Accelerator consumption failed' };

      const currentReadyAt = egg.hatchReadyAt
        ? new Date(egg.hatchReadyAt).getTime()
        : Date.now();
      egg.hatchReadyAt = new Date(
        Math.max(Date.now(), currentReadyAt - secondsPerItem * normalizedQuantity * 1000),
      );
      return { success: true, egg: await eggRepository.save(egg) };
    });

    if (!accelerationResult.success) return accelerationResult;
    const accelerated: Egg = accelerationResult.egg;

    const nextInventory =
      await this.inventoryService.getUserInventory(userId);
    const eggs = await this.eggService.getUserEggViews(userId, true);
    return {
      success: true,
      message: 'Incubation accelerated',
      reducedSeconds: secondsPerItem * normalizedQuantity,
      egg: this.eggService.toEggView(accelerated),
      eggs,
      inventory: nextInventory,
      data: {
        egg: this.eggService.toEggView(accelerated),
        eggs,
        inventory: nextInventory,
      },
    };
  }

  async hatch(userId: number, eggId?: number, force = false) {
    try {
      const transactionResult: any = await this.dataSource.transaction(async (manager) => {
        const eggRepository = manager.getRepository(Egg);
        const petRepository = manager.getRepository(Pet);
        let egg: Egg | null = null;

        if (eggId) {
          egg = await eggRepository.findOne({
            where: { id: eggId, ownerId: userId },
            lock: { mode: 'pessimistic_write' },
          });
        } else {
          const candidates = await eggRepository.find({
            where: { ownerId: userId, status: 'incubating' },
            order: { hatchReadyAt: 'ASC', id: 'ASC' },
          });
          const ready = candidates.find(
            (candidate) => this.eggService.getRemainingSeconds(candidate) <= 0,
          );
          if (ready) {
            egg = await eggRepository.findOne({
              where: { id: ready.id, ownerId: userId },
              lock: { mode: 'pessimistic_write' },
            });
          }
        }

        if (!egg) return { success: false, message: 'Egg not found' };
        if (egg.status === 'hatched' && Number(egg.hatchedPetId || 0)) {
          const existingPet = await petRepository.findOne({
            where: { id: Number(egg.hatchedPetId), ownerId: userId },
          });
          return {
            success: true,
            duplicate: true,
            message: 'Egg already hatched',
            egg,
            pet: existingPet,
          };
        }
        if (egg.status !== 'incubating') {
          return {
            success: false,
            message: egg.status === 'stored'
              ? 'Place egg into incubator first'
              : 'Egg is being hatched',
            egg,
          };
        }

        const remainingSeconds = this.eggService.getRemainingSeconds(egg);
        const allowBetaForce = force && process.env.NODE_ENV !== 'production';
        if (remainingSeconds > 0 && !allowBetaForce) {
          return {
            success: false,
            message: 'Egg is not ready to hatch',
            remainingSeconds,
            hatchReadyAt: egg.hatchReadyAt,
            egg,
          };
        }

        const parentA = egg.parentAId
          ? await petRepository.findOne({ where: { id: egg.parentAId } })
          : null;
        const parentB = egg.parentBId
          ? await petRepository.findOne({ where: { id: egg.parentBId } })
          : null;
        const storedBlueprint: Partial<OffspringBlueprint> = egg.offspringData || {
          mode: 'breed',
          seed: egg.randomSeed,
          configVersion: egg.configVersion,
          rarity: egg.rarityPotential,
          quality: egg.quality,
          species: egg.species,
          speciesCode: egg.speciesCode,
          isMutant: egg.isMutant,
          skillSlotCount: egg.skillSlotCount,
          aptitudes: {
            hp: egg.hpAptitude,
            attack: egg.attackAptitude,
            defense: egg.defenseAptitude,
            magic: egg.magicAptitude,
            speed: egg.speedAptitude,
          },
          growth: egg.growth,
          generation: egg.generation,
          specialSkillCount: egg.specialSkillCount,
          geneCode: egg.geneCode,
          geneScore: egg.geneScore,
          bodyType: egg.bodyType,
          color: egg.color,
          pattern: egg.pattern,
          inheritedSkills: egg.inheritedSkills,
          mutationData: egg.mutationData,
          parentSnapshot: egg.parentSnapshot || { parentA: {}, parentB: {} },
        };

        const pet = await this.petService.createPetFromEgg(
          userId,
          egg.rarityPotential,
          parentA,
          parentB,
          storedBlueprint,
          manager,
        );
        pet.fatherId = Number(egg.parentAId || 0);
        pet.motherId = Number(egg.parentBId || 0);
        pet.gender = ['male', 'female'].includes(String(egg.gender || ''))
          ? egg.gender
          : pet.gender;
        pet.hatchTime = new Date();
        await petRepository.save(pet);

        egg.status = 'hatched';
        egg.incubatorSlot = 0;
        egg.hatchedPetId = pet.id;
        const hatchedEgg = await eggRepository.save(egg);
        return { success: true, duplicate: false, egg: hatchedEgg, pet };
      });

      if (!transactionResult.success) {
        return {
          ...transactionResult,
          egg: transactionResult.egg
            ? this.eggService.toEggView(transactionResult.egg)
            : null,
        };
      }

      const pets = await this.petService.getUserPets(userId);
      const eggs = await this.eggService.getUserEggViews(userId, true);

      return {
        success: true,
        duplicate: Boolean(transactionResult.duplicate),
        message: transactionResult.duplicate ? 'Egg already hatched' : 'Hatch successful',
        egg: this.eggService.toEggView(transactionResult.egg),
        pet: transactionResult.pet,
        pets: pets.pets,
        eggs,
        data: {
          pet: transactionResult.pet,
          eggs,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message || 'Hatch failed',
        ),
      };
    }
  }
}
