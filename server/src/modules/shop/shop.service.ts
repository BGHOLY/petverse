import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_ITEMS, DEFAULT_SHOP_ITEMS } from '../game-data';
import { InventoryService } from '../inventory/inventory.service';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { BuyItemDto } from './dto/buy-item.dto';
import { ShopItem } from './shop-item.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(ShopItem)
    private readonly shopItemRepository: Repository<ShopItem>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    private readonly inventoryService: InventoryService,
  ) {}

  async seedShopItems() {
    for (const itemData of DEFAULT_ITEMS) {
      let item = await this.itemRepository.findOne({
        where: { itemCode: itemData.itemCode },
      });

      if (!item) {
        item = this.itemRepository.create(itemData);
      } else {
        Object.assign(item, itemData);
      }

      await this.itemRepository.save(item);
    }

    for (const data of DEFAULT_SHOP_ITEMS) {
      const item = await this.itemRepository.findOne({
        where: { itemCode: data.itemCode },
      });

      let shopItem = await this.shopItemRepository.findOne({
        where: { itemCode: data.itemCode },
      });

      if (!shopItem) {
        shopItem = this.shopItemRepository.create({
          itemCode: data.itemCode,
          name: item?.name || data.itemCode,
          currencyType: data.currencyType,
          price: data.price,
          quantity: data.quantity,
          enabled: true,
        });
      } else {
        shopItem.name = item?.name || data.itemCode;
        shopItem.currencyType = data.currencyType;
        shopItem.price = data.price;
        shopItem.quantity = data.quantity;
        shopItem.enabled = true;
      }

      await this.shopItemRepository.save(shopItem);
    }

    return {
      success: true,
      shopItems: await this.getShopItems(),
    };
  }

  async getShopItems() {
    const shopItems = await this.shopItemRepository.find({
      where: { enabled: true },
      order: { id: 'ASC' },
    });

    const items = await this.itemRepository.find();
    const itemMap = new Map(items.map((item) => [item.itemCode, item]));

    return shopItems.map((shopItem) => {
      const item = itemMap.get(shopItem.itemCode);
      return {
        ...shopItem,
        type: item?.type || 'material',
        description: item?.description || '',
        rarity: item?.rarity || 1,
        effect: item?.effect || '',
        effectValue: item?.effectValue || 0,
      };
    });
  }

  async buyItem(userId: number, dto: BuyItemDto) {
    const shopItem = await this.findShopItem(dto);

    if (!shopItem) {
      return {
        success: false,
        message: 'Shop item not found',
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found. Run POST /api/dev/seed-all first.',
      };
    }

    if (shopItem.currencyType === 'diamond') {
      if (Number(user.diamond || 0) < shopItem.price) {
        return {
          success: false,
          message: 'Not enough diamonds',
          user,
        };
      }
      user.diamond -= shopItem.price;
    } else {
      if (Number(user.gold || 0) < shopItem.price) {
        return {
          success: false,
          message: 'Not enough gold',
          user,
        };
      }
      user.gold -= shopItem.price;
    }

    await this.userRepository.save(user);

    const item = await this.ensureItemExists(shopItem);

    await this.inventoryService.addItem(
      userId,
      item.id,
      item.itemCode,
      shopItem.quantity || 1,
    );

    const inventory = await this.inventoryService.getUserInventory(userId);

    return {
      success: true,
      message: 'Purchase successful',
      shopItem,
      user,
      inventory,
      data: {
        user,
        inventory,
      },
    };
  }

  private async findShopItem(dto: BuyItemDto) {
    if (dto.shopItemId) {
      return this.shopItemRepository.findOne({
        where: {
          id: dto.shopItemId,
          enabled: true,
        },
      });
    }

    if (dto.itemCode) {
      return this.shopItemRepository.findOne({
        where: {
          itemCode: dto.itemCode,
          enabled: true,
        },
      });
    }

    return null;
  }

  private async ensureItemExists(shopItem: ShopItem) {
    let item = await this.itemRepository.findOne({
      where: { itemCode: shopItem.itemCode },
    });

    if (!item) {
      item = this.itemRepository.create({
        itemCode: shopItem.itemCode,
        name: shopItem.name,
        description: shopItem.name,
        type: 'material',
        rarity: 1,
        maxStack: 999999,
        usable: true,
        effect: '',
        effectValue: 0,
      });

      item = await this.itemRepository.save(item);
    }

    return item;
  }
}
