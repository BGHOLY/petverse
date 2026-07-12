import { Injectable } from '@nestjs/common';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { InventoryService } from '../inventory/inventory.service';
import { OffspringBlueprint, PetService } from '../pet/pet.service';

@Injectable()
export class HatcheryService {
  constructor(
    private readonly eggService: EggService,
    private readonly petService: PetService,
    private readonly inventoryService: InventoryService,
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
      },
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

    const activeEggs = await this.eggService.getActiveEggs(userId);
    if (activeEggs.length >= 3) {
      return {
        success: false,
        message: 'All three incubators are occupied',
        activeEggs: activeEggs.map((egg) => this.eggService.toEggView(egg)),
      };
    }
    if (slot && activeEggs.some((egg) => Number(egg.incubatorSlot || 0) === Number(slot))) {
      return { success: false, message: `Incubator slot ${slot} is occupied` };
    }

    const egg = await this.eggService.getEggById(eggId);
    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
      };
    }
    if (egg.status !== 'stored') {
      return {
        success: false,
        message: 'Only warehouse eggs can enter the incubator',
        egg: this.eggService.toEggView(egg),
      };
    }

    const started = await this.eggService.startIncubation(eggId, userId, slot);
    if (!started) {
      return {
        success: false,
        message: 'Failed to occupy incubator',
      };
    }

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
    const egg = await this.eggService.getEggById(eggId);
    if (
      !egg ||
      egg.ownerId !== userId ||
      egg.status !== 'incubating'
    ) {
      return {
        success: false,
        message: 'Incubating egg not found',
      };
    }

    const remainingSeconds = this.eggService.getRemainingSeconds(egg);
    if (remainingSeconds <= 0) {
      return {
        success: false,
        message: 'Egg is already ready to hatch',
        egg: this.eggService.toEggView(egg),
      };
    }

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
    const consumed = await this.inventoryService.consumeItem(
      userId,
      normalizedCode,
      normalizedQuantity,
    );
    if (!consumed) {
      return {
        success: false,
        message: 'Accelerator consumption failed',
      };
    }

    const accelerated = await this.eggService.accelerateIncubation(
      eggId,
      userId,
      secondsPerItem * normalizedQuantity,
    );
    if (!accelerated) {
      return {
        success: false,
        message: 'Egg acceleration failed',
      };
    }

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
    let egg = eggId ? await this.eggService.getEggById(eggId) : null;

    if (!egg) {
      const availableEggs = await this.eggService.getUserEggs(userId, false);
      egg =
        availableEggs.find(
          (candidate) =>
            candidate.status === 'incubating' &&
            this.eggService.getRemainingSeconds(candidate) <= 0,
        ) || null;
    }

    if (!egg || egg.ownerId !== userId) {
      return {
        success: false,
        message: 'Egg not found',
      };
    }

    if (egg.status !== 'incubating') {
      return {
        success: false,
        message:
          egg.status === 'hatched'
            ? 'Egg already hatched'
            : egg.status === 'stored'
              ? 'Place egg into incubator first'
              : 'Egg is being hatched',
        egg: this.eggService.toEggView(egg),
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
        egg: this.eggService.toEggView(egg),
      };
    }

    const parentA = egg.parentAId
      ? await this.petService.getPetById(egg.parentAId)
      : null;
    const parentB = egg.parentBId
      ? await this.petService.getPetById(egg.parentBId)
      : null;

    const storedBlueprint: Partial<OffspringBlueprint> =
      egg.offspringData || {
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
        parentSnapshot: egg.parentSnapshot || {
          parentA: {},
          parentB: {},
        },
      };

    const lockedEgg = await this.eggService.tryMarkHatching(egg.id, userId);
    if (!lockedEgg) {
      const latest = await this.eggService.getEggById(egg.id);
      return {
        success: false,
        message:
          latest?.status === 'hatched'
            ? 'Egg already hatched'
            : 'Egg is being hatched',
        egg: latest ? this.eggService.toEggView(latest) : null,
      };
    }

    egg = lockedEgg;

    try {
      const pet = await this.petService.createPetFromEgg(
        userId,
        egg.rarityPotential,
        parentA,
        parentB,
        storedBlueprint,
      );
      pet.fatherId = Number(egg.parentAId || 0);
      pet.motherId = Number(egg.parentBId || 0);
      pet.gender = ['male', 'female'].includes(String(egg.gender || ''))
        ? egg.gender
        : pet.gender;
      pet.hatchTime = new Date();
      await this.petService.savePet(pet);

      const hatchedEgg = await this.eggService.markHatched(egg, pet.id);
      const pets = await this.petService.getUserPets(userId);
      const eggs = await this.eggService.getUserEggViews(userId, true);

      return {
        success: true,
        message: 'Hatch successful',
        egg: this.eggService.toEggView(hatchedEgg),
        pet,
        pets: pets.pets,
        eggs,
        data: {
          pet,
          eggs,
        },
      };
    } catch (error: any) {
      await this.eggService.markUnhatched(egg);
      return {
        success: false,
        message: String(
          error?.message || 'Hatch failed',
        ),
        egg: this.eggService.toEggView(egg),
      };
    }
  }
}
