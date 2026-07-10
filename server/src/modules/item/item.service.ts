import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ALL_ITEM_CONFIGS,
  getItemSeedConfig,
  ITEM_CONFIG_VERSION,
} from './config/item.config';
import { Item } from './item.entity';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async seedDefaultItems() {
    const saved: Item[] = [];

    for (const itemData of ALL_ITEM_CONFIGS) {
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

    const configuredCodes = new Set(
      ALL_ITEM_CONFIGS.map((item) => item.itemCode),
    );
    const storedItems = await this.itemRepository.find();
    for (const legacy of storedItems) {
      if (!configuredCodes.has(legacy.itemCode) && legacy.enabled !== false) {
        legacy.enabled = false;
        await this.itemRepository.save(legacy);
      }
    }

    return {
      success: true,
      count: saved.length,
      skillBookCount: saved.filter((item) => item.type === 'skill_book').length,
      materialCount: saved.filter((item) => item.type === 'material').length,
      version: ITEM_CONFIG_VERSION,
      items: await this.getAllItems(),
      data: await this.getAllItems(),
    };
  }

  async ensureSeeded() {
    const sentinel = await this.itemRepository.findOne({
      where: { itemCode: 'fusion_core' },
    });
    if (!sentinel || sentinel.version !== ITEM_CONFIG_VERSION) {
      await this.seedDefaultItems();
    }
  }

  async findByCode(itemCode: string) {
    await this.ensureSeeded();
    return this.itemRepository.findOne({
      where: {
        itemCode: String(itemCode || '').trim(),
        enabled: true,
      },
    });
  }

  async getAllItems() {
    return this.itemRepository.find({
      where: { enabled: true },
      order: {
        type: 'ASC',
        rarity: 'ASC',
        id: 'ASC',
      },
    });
  }

  getConfig(itemCode: string) {
    return getItemSeedConfig(itemCode) || null;
  }
}
