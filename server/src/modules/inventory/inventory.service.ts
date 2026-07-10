import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
} from 'typeorm';

import { EggService } from '../egg/egg.service';
import { Item } from '../item/item.entity';
import { Pet } from '../pet/pet.entity';
import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    private readonly eggService: EggService,
    private readonly dataSource: DataSource,
  ) {}

  async getUserInventory(userId: number) {
    const inventory = await this.inventoryRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });
    const items = await this.itemRepository.find({
      where: { enabled: true },
    });
    const itemMap = new Map(
      items.map((item) => [item.itemCode, item]),
    );

    return inventory
      .filter((entry) => Number(entry.quantity || 0) > 0)
      .map((entry) => {
        const item = itemMap.get(entry.itemCode);
        return {
          ...entry,
          name: item?.name || entry.itemCode,
          description: item?.description || '',
          type: item?.type || 'material',
          rarity: item?.rarity || 1,
          maxStack: item?.maxStack || 999999,
          usable: item?.usable ?? false,
          effect: item?.effect || '',
          effectValue: item?.effectValue || 0,
          effectData: item?.effectData || {},
          version: item?.version || '',
        };
      });
  }

  async getQuantity(userId: number, itemCode: string) {
    const inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemCode: String(itemCode || '').trim(),
      },
    });
    return Number(inventory?.quantity || 0);
  }

  async addItem(
    userId: number,
    itemId: number,
    itemCode: string,
    quantity: number,
  ) {
    return this.dataSource.transaction((manager) =>
      this.addItemWithManager(
        manager,
        userId,
        itemId,
        itemCode,
        quantity,
      ),
    );
  }

  async addItemWithManager(
    manager: EntityManager,
    userId: number,
    itemId: number,
    itemCode: string,
    quantity: number,
  ) {
    const normalizedQuantity = Math.max(
      0,
      Math.floor(Number(quantity || 0)),
    );
    if (!normalizedQuantity) {
      throw new Error('Item quantity must be positive');
    }

    const inventoryRepository =
      manager.getRepository(Inventory);
    const itemRepository = manager.getRepository(Item);
    const item =
      (itemId
        ? await itemRepository.findOne({
            where: { id: itemId, enabled: true },
          })
        : null) ||
      (await itemRepository.findOne({
        where: {
          itemCode: String(itemCode || '').trim(),
          enabled: true,
        },
      }));

    if (!item) {
      throw new Error(`Item not found: ${itemCode}`);
    }

    let inventory = await inventoryRepository.findOne({
      where: {
        userId,
        itemCode: item.itemCode,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!inventory) {
      inventory = inventoryRepository.create({
        userId,
        itemId: item.id,
        itemCode: item.itemCode,
        quantity: 0,
      });
    }

    const next =
      Number(inventory.quantity || 0) + normalizedQuantity;
    if (next > Number(item.maxStack || 999999)) {
      throw new Error(`Item stack limit exceeded: ${item.itemCode}`);
    }
    inventory.itemId = item.id;
    inventory.quantity = next;
    return inventoryRepository.save(inventory);
  }

  async ensureItemQuantity(
    userId: number,
    itemCode: string,
    minQuantity: number,
  ) {
    const item = await this.itemRepository.findOne({
      where: {
        itemCode,
        enabled: true,
      },
    });
    if (!item) return null;

    const existing = await this.inventoryRepository.findOne({
      where: { userId, itemCode },
    });
    const current = Number(existing?.quantity || 0);
    if (current >= minQuantity) return existing;

    return this.addItem(
      userId,
      item.id,
      item.itemCode,
      Math.max(0, minQuantity - current),
    );
  }

  async consumeItem(
    userId: number,
    itemCode: string,
    quantity = 1,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);
      const inventory = await repository.findOne({
        where: {
          userId,
          itemCode: String(itemCode || '').trim(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      const normalized = Math.max(
        1,
        Math.floor(Number(quantity || 1)),
      );
      if (
        !inventory ||
        Number(inventory.quantity || 0) < normalized
      ) {
        return false;
      }

      inventory.quantity -= normalized;
      if (inventory.quantity <= 0) {
        await repository.remove(inventory);
      } else {
        await repository.save(inventory);
      }
      return true;
    });
  }

  async useItem(
    userId: number,
    itemCode: string,
    quantity = 1,
    petId?: number,
  ) {
    const normalizedCode = String(itemCode || '').trim();
    const normalizedQuantity = Math.max(
      1,
      Math.min(99, Math.floor(Number(quantity || 1))),
    );
    if (!normalizedCode) {
      return {
        success: false,
        message: 'Missing itemCode',
      };
    }

    const item = await this.itemRepository.findOne({
      where: {
        itemCode: normalizedCode,
        enabled: true,
      },
    });
    if (!item) {
      return {
        success: false,
        message: 'Item not found',
      };
    }
    if (!item.usable) {
      return {
        success: false,
        message:
          item.type === 'skill_book'
            ? 'Use skill books through POST /api/skill/learn'
            : 'This item cannot be used directly',
      };
    }

    if (item.type === 'egg' || item.effect === 'egg') {
      const quantityOwned = await this.getQuantity(
        userId,
        normalizedCode,
      );
      if (quantityOwned < normalizedQuantity) {
        return {
          success: false,
          message: 'Not enough items',
        };
      }

      const eggs = [];
      for (let index = 0; index < normalizedQuantity; index += 1) {
        eggs.push(
          await this.eggService.createEgg({
            ownerId: userId,
            rarityPotential:
              Number(item.effectValue || item.rarity || 1),
            source: item.itemCode,
          }),
        );
      }
      const consumed = await this.consumeItem(
        userId,
        normalizedCode,
        normalizedQuantity,
      );
      if (!consumed) {
        return {
          success: false,
          message: 'Item consumption failed',
        };
      }

      const inventory = await this.getUserInventory(userId);
      return {
        success: true,
        message: 'Egg moved to hatchery',
        itemCode: normalizedCode,
        quantityUsed: normalizedQuantity,
        eggs,
        egg: eggs[0] || null,
        inventory,
        data: inventory,
      };
    }

    try {
      const result = await this.dataSource.transaction(
        async (manager) => {
          const inventoryRepository =
            manager.getRepository(Inventory);
          const petRepository = manager.getRepository(Pet);
          const inventory = await inventoryRepository.findOne({
            where: {
              userId,
              itemCode: normalizedCode,
            },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            !inventory ||
            Number(inventory.quantity || 0) <
              normalizedQuantity
          ) {
            throw new Error('Not enough items');
          }

          const pet = await this.findTargetPetWithManager(
            manager,
            userId,
            petId,
          );
          if (!pet) {
            throw new Error('No pet available');
          }
          if (
            pet.tradeStatus === 'listed' ||
            pet.tradeListingId
          ) {
            throw new Error(
              'Listed pet cannot use items',
            );
          }

          for (
            let index = 0;
            index < normalizedQuantity;
            index += 1
          ) {
            this.applyItemEffect(pet, item);
          }
          await petRepository.save(pet);

          inventory.quantity -= normalizedQuantity;
          if (inventory.quantity <= 0) {
            await inventoryRepository.remove(inventory);
          } else {
            await inventoryRepository.save(inventory);
          }

          return pet;
        },
      );

      const inventory = await this.getUserInventory(userId);
      return {
        success: true,
        message: 'Item used',
        itemCode: normalizedCode,
        quantityUsed: normalizedQuantity,
        pet: result,
        inventory,
        data: inventory,
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Item use failed'),
      };
    }
  }

  private async findTargetPetWithManager(
    manager: EntityManager,
    userId: number,
    petId?: number,
  ) {
    const repository = manager.getRepository(Pet);
    if (petId) {
      const pet = await repository.findOne({
        where: {
          id: petId,
          ownerId: userId,
          isEgg: false,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (pet) return pet;
    }

    return repository.findOne({
      where: {
        ownerId: userId,
        isEgg: false,
      },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private applyItemEffect(pet: Pet, item: Item) {
    const value = Number(item.effectValue || 0);

    switch (item.effect) {
      case 'hunger':
        pet.hunger = Math.min(
          100,
          Number(pet.hunger || 0) + value,
        );
        break;
      case 'happiness':
        pet.happiness = Math.min(
          100,
          Number(pet.happiness || 0) + value,
        );
        break;
      case 'cleanliness':
        pet.cleanliness = Math.min(
          100,
          Number(pet.cleanliness || 0) + value,
        );
        break;
      case 'exp':
        this.addExpToPet(pet, value);
        break;
      default:
        if (item.type === 'food') {
          pet.hunger = Math.min(
            100,
            Number(pet.hunger || 0) + 10,
          );
          pet.happiness = Math.min(
            100,
            Number(pet.happiness || 0) + 5,
          );
        }
    }
  }

  private addExpToPet(pet: Pet, exp: number) {
    pet.exp =
      Number(pet.exp || 0) + Math.max(0, Number(exp || 0));
    pet.nextExp = Number(
      pet.nextExp || pet.level * 100 || 100,
    );

    while (pet.exp >= pet.nextExp) {
      pet.exp -= pet.nextExp;
      pet.level = Number(pet.level || 1) + 1;
      pet.hp = Math.round(Number(pet.hp || 100) * 1.06);
      pet.attack = Math.round(
        Number(pet.attack || 20) * 1.04,
      );
      pet.defense = Math.round(
        Number(pet.defense || 20) * 1.04,
      );
      pet.speed = Math.round(
        Number(pet.speed || pet.agility || 20) * 1.03,
      );
      pet.agility = pet.speed;
      pet.intelligence = Math.round(
        Number(pet.intelligence || 20) * 1.04,
      );
      pet.nextExp = pet.level * 100;
    }
  }
}
