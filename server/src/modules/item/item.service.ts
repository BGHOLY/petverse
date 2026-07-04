import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Item } from './item.entity';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async seedDefaultItems() {
    const defaultItems = [
      {
        itemCode: 'apple',
        name: '苹果',
        description: '普通食物，可恢复宠物饥饿值。',
        type: 'food',
        rarity: 1,
        maxStack: 999,
        usable: true,
      },
      {
        itemCode: 'fish',
        name: '小鱼干',
        description: '猫咪最爱的食物，可提升宠物快乐值。',
        type: 'food',
        rarity: 1,
        maxStack: 999,
        usable: true,
      },
      {
        itemCode: 'exp_potion_small',
        name: '初级经验药水',
        description: '使用后给宠物增加少量经验。',
        type: 'potion',
        rarity: 2,
        maxStack: 999,
        usable: true,
      },
      {
        itemCode: 'starter_egg',
        name: '新手宠物蛋',
        description: '新手赠送的宠物蛋。',
        type: 'egg',
        rarity: 2,
        maxStack: 99,
        usable: true,
      },
    ];

    for (const itemData of defaultItems) {
      const exists = await this.itemRepository.findOne({
        where: {
          itemCode: itemData.itemCode,
        },
      });

      if (!exists) {
        const item = this.itemRepository.create(itemData);
        await this.itemRepository.save(item);
      }
    }

    return this.itemRepository.find();
  }

  async findByCode(itemCode: string) {
    return this.itemRepository.findOne({
      where: { itemCode },
    });
  }

  async getAllItems() {
    return this.itemRepository.find();
  }
}