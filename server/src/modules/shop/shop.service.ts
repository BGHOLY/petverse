import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShopItem } from './shop-item.entity';
import { User } from '../user/user.entity';
import { Item } from '../item/item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { BuyItemDto } from './dto/buy-item.dto';

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
    const defaultItems = [
      { itemCode: 'apple', name: '苹果', price: 20, quantity: 1 },
      { itemCode: 'fish', name: '小鱼干', price: 30, quantity: 1 },
      { itemCode: 'exp_potion_small', name: '初级经验药水', price: 100, quantity: 1 },
      { itemCode: 'starter_egg', name: '新手宠物蛋', price: 300, quantity: 1 },
    ];

    for (const data of defaultItems) {
      const exists = await this.shopItemRepository.findOne({
        where: { itemCode: data.itemCode },
      });

      if (!exists) {
        await this.shopItemRepository.save(
          this.shopItemRepository.create({
            ...data,
            currencyType: 'gold',
            enabled: true,
          }),
        );
      }

      const itemExists = await this.itemRepository.findOne({
        where: { itemCode: data.itemCode },
      });

      if (!itemExists) {
        await this.itemRepository.save(
          this.itemRepository.create({
            itemCode: data.itemCode,
            name: data.name,
            description: data.name,
            type: 'consumable',
            rarity: 1,
            maxStack: 999999,
            usable: true,
          }),
        );
      }
    }

    return this.getShopItems();
  }

  async getShopItems() {
    return this.shopItemRepository.find({
      where: { enabled: true },
      order: { id: 'ASC' },
    });
  }

  async buyItem(userId: number, dto: BuyItemDto) {
    if (!Number.isFinite(userId) || userId <= 0) {
      return {
        success: false,
        message: '用户身份无效',
      };
    }

    const shopItem = await this.findShopItem(dto);

    if (!shopItem) {
      return {
        success: false,
        message: '商品不存在',
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    if (shopItem.currencyType === 'gold') {
      if (user.gold < shopItem.price) {
        return {
          success: false,
          message: '金币不足',
          user,
        };
      }

      user.gold -= shopItem.price;
    } else if (shopItem.currencyType === 'diamond') {
      if (user.diamond < shopItem.price) {
        return {
          success: false,
          message: '钻石不足',
          user,
        };
      }

      user.diamond -= shopItem.price;
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
      message: '购买成功',
      shopItem,
      user,
      inventory,
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
        type: 'consumable',
        rarity: 1,
        maxStack: 999999,
        usable: true,
      });

      item = await this.itemRepository.save(item);
    }

    return item;
  }
}
