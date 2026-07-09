import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
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
  ) {}

  async getUserInventory(userId: number) {
    const inventory = await this.inventoryRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });

    const items = await this.itemRepository.find();
    const itemMap = new Map(items.map((item) => [item.itemCode, item]));

    return inventory.map((entry) => {
      const item = itemMap.get(entry.itemCode);
      return {
        ...entry,
        name: item?.name || entry.itemCode,
        description: item?.description || '',
        type: item?.type || 'material',
        rarity: item?.rarity || 1,
        usable: item?.usable ?? true,
        effect: item?.effect || '',
        effectValue: item?.effectValue || 0,
      };
    });
  }

  async addItem(
    userId: number,
    itemId: number,
    itemCode: string,
    quantity: number,
  ) {
    let inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemId,
      },
    });

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        userId,
        itemId,
        itemCode,
        quantity,
      });
    } else {
      inventory.quantity += quantity;
    }

    return this.inventoryRepository.save(inventory);
  }

  async ensureItemQuantity(userId: number, itemCode: string, minQuantity: number) {
    const item = await this.itemRepository.findOne({
      where: { itemCode },
    });

    if (!item) {
      return null;
    }

    let inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemId: item.id,
      },
    });

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        userId,
        itemId: item.id,
        itemCode: item.itemCode,
        quantity: minQuantity,
      });
    } else if (inventory.quantity < minQuantity) {
      inventory.quantity = minQuantity;
    }

    return this.inventoryRepository.save(inventory);
  }

  async consumeItem(userId: number, itemCode: string, quantity = 1) {
    const inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemCode,
      },
    });

    if (!inventory || inventory.quantity < quantity) {
      return false;
    }

    inventory.quantity -= quantity;

    if (inventory.quantity <= 0) {
      await this.inventoryRepository.remove(inventory);
    } else {
      await this.inventoryRepository.save(inventory);
    }

    return true;
  }

  async useItem(
    userId: number,
    itemCode: string,
    quantity = 1,
    petId?: number,
  ) {
    if (!itemCode) {
      return {
        success: false,
        message: 'Missing itemCode',
      };
    }

    const item = await this.itemRepository.findOne({
      where: { itemCode },
    });

    if (!item) {
      return {
        success: false,
        message: 'Item not found',
      };
    }

    const inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemCode,
      },
    });

    if (!inventory || inventory.quantity < quantity) {
      return {
        success: false,
        message: 'Not enough items',
      };
    }

    let pet: Pet | null = null;
    let egg = null;

    if (item.type === 'egg' || item.effect === 'egg') {
      egg = await this.eggService.createEgg({
        ownerId: userId,
        rarityPotential: item.effectValue || item.rarity || 1,
        source: item.itemCode,
      });
    } else {
      pet = await this.findTargetPet(userId, petId);

      if (!pet) {
        return {
          success: false,
          message: 'No pet available',
        };
      }

      await this.applyItemEffect(pet, item);
      pet = await this.petRepository.save(pet);
    }

    await this.consumeItem(userId, itemCode, quantity);

    const inventoryList = await this.getUserInventory(userId);

    return {
      success: true,
      message: item.type === 'egg' ? 'Egg moved to hatchery' : 'Item used',
      itemCode,
      quantityUsed: quantity,
      pet,
      egg,
      inventory: inventoryList,
      data: inventoryList,
    };
  }

  private async findTargetPet(userId: number, petId?: number) {
    if (petId) {
      const pet = await this.petRepository.findOne({
        where: {
          id: petId,
          ownerId: userId,
          isEgg: false,
        },
      });

      if (pet) {
        return pet;
      }
    }

    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
        isEgg: false,
      },
      order: {
        id: 'ASC',
      },
    });

    return pets[0] || null;
  }

  private async applyItemEffect(pet: Pet, item: Item) {
    const value = Number(item.effectValue || 0);

    switch (item.effect) {
      case 'hunger':
        pet.hunger = Math.min(100, Number(pet.hunger || 0) + value);
        break;

      case 'happiness':
        pet.happiness = Math.min(100, Number(pet.happiness || 0) + value);
        break;

      case 'cleanliness':
        pet.cleanliness = Math.min(100, Number(pet.cleanliness || 0) + value);
        break;

      case 'exp':
        this.addExpToPet(pet, value);
        break;

      default:
        if (item.type === 'food') {
          pet.hunger = Math.min(100, Number(pet.hunger || 0) + 10);
          pet.happiness = Math.min(100, Number(pet.happiness || 0) + 5);
        }
    }
  }

  private addExpToPet(pet: Pet, exp: number) {
    pet.exp = Number(pet.exp || 0) + Math.max(0, exp);
    pet.nextExp = Number(pet.nextExp || pet.level * 100 || 100);

    while (pet.exp >= pet.nextExp) {
      pet.exp -= pet.nextExp;
      pet.level = Number(pet.level || 1) + 1;
      pet.hp = Math.round(Number(pet.hp || 100) * 1.1);
      pet.attack = Math.round(Number(pet.attack || 20) * 1.08);
      pet.defense = Math.round(Number(pet.defense || 20) * 1.08);
      pet.speed = Math.round(Number(pet.speed || pet.agility || 20) * 1.05);
      pet.agility = pet.speed;
      pet.nextExp = pet.level * 100;
    }
  }
}
