import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_ITEMS } from '../game-data';
import { Item } from './item.entity';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async seedDefaultItems() {
    const saved: Item[] = [];

    for (const itemData of DEFAULT_ITEMS) {
      let item = await this.itemRepository.findOne({
        where: { itemCode: itemData.itemCode },
      });

      if (!item) {
        item = this.itemRepository.create(itemData);
      } else {
        Object.assign(item, itemData);
      }

      saved.push(await this.itemRepository.save(item));
    }

    return {
      success: true,
      count: saved.length,
      items: await this.getAllItems(),
      data: await this.getAllItems(),
    };
  }

  async findByCode(itemCode: string) {
    return this.itemRepository.findOne({
      where: { itemCode },
    });
  }

  async getAllItems() {
    return this.itemRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }
}
