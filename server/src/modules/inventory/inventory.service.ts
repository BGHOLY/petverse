import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Inventory } from './inventory.entity';
import { Pet } from '../pet/pet.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async getUserInventory(userId: number) {
    return this.inventoryRepository.find({
      where: { userId },
      order: { id: 'ASC' },
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

  async consumeItem(
    userId: number,
    itemCode: string,
    quantity = 1,
  ) {
    const inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemCode,
      },
    });

    if (!inventory) {
      return false;
    }

    if (inventory.quantity < quantity) {
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

  async useItem(userId: number, itemCode: string, quantity = 1) {
    if (!itemCode) {
      return {
        success: false,
        message: '缺少 itemCode',
      };
    }

    const inventory = await this.inventoryRepository.findOne({
      where: {
        userId,
        itemCode,
      },
    });

    if (!inventory || inventory.quantity <= 0 || inventory.quantity < quantity) {
      return {
        success: false,
        message: '道具数量不足',
      };
    }

    const pet = await this.findMainPet(userId);

    if (!pet) {
      return {
        success: false,
        message: '暂无可使用道具的宠物',
      };
    }

    const effectResult = await this.applyItemEffect(pet, itemCode);

    if (!effectResult.success) {
      return effectResult;
    }

    inventory.quantity -= quantity;

    if (inventory.quantity <= 0) {
      await this.inventoryRepository.remove(inventory);
    } else {
      await this.inventoryRepository.save(inventory);
    }

    const savedPet = await this.petRepository.save(pet);
    const inventoryList = await this.getUserInventory(userId);

    return {
      success: true,
      message: effectResult.message,
      itemCode,
      quantityUsed: quantity,
      pet: savedPet,
      inventory: inventoryList,
      data: inventoryList,
    };
  }

  private async findMainPet(userId: number) {
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
      },
      order: {
        isEgg: 'ASC',
        id: 'ASC',
      },
    });

    return pets.find((pet) => !pet.isEgg) || pets[0] || null;
  }

  private async applyItemEffect(pet: Pet, itemCode: string) {
    switch (itemCode) {
      case 'apple':
        pet.hunger = Math.min(100, Number(pet.hunger || 0) + 20);
        pet.happiness = Math.min(100, Number(pet.happiness || 0) + 5);
        return {
          success: true,
          message: '苹果使用成功，饥饿值提升',
        };

      case 'fish':
        pet.hunger = Math.min(100, Number(pet.hunger || 0) + 10);
        pet.happiness = Math.min(100, Number(pet.happiness || 0) + 15);
        return {
          success: true,
          message: '小鱼干使用成功，快乐值提升',
        };

      case 'exp_potion_small':
        this.addExpToPet(pet, 50);
        return {
          success: true,
          message: '初级经验药水使用成功，经验提升',
        };

      default:
        return {
          success: false,
          message: '该道具暂时不能使用',
        };
    }
  }

  private addExpToPet(pet: Pet, exp: number) {
    pet.exp = Number(pet.exp || 0) + exp;

    while (pet.exp >= 100) {
      pet.exp -= 100;
      pet.level = Number(pet.level || 1) + 1;
      pet.hp = Number(pet.hp || 100) + 10;
      pet.attack = Number(pet.attack || 20) + 2;
      pet.defense = Number(pet.defense || 20) + 2;
      pet.agility = Number(pet.agility || 20) + 1;
      pet.intelligence = Number(pet.intelligence || 20) + 1;
    }
  }
}
