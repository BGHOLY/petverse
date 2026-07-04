import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  async getUserInventory(userId: number) {
    return this.inventoryRepository.find({
      where: { userId },
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
    const inventory =
      await this.inventoryRepository.findOne({
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
      await this.inventoryRepository.remove(
        inventory,
      );
    } else {
      await this.inventoryRepository.save(
        inventory,
      );
    }

    return true;
  }
}