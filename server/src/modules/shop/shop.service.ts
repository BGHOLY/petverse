import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  SHOP_ITEM_CONFIGS,
} from '../item/config/item.config';
import { Item } from '../item/item.entity';
import { ItemService } from '../item/item.service';
import { BuyItemDto } from './dto/buy-item.dto';
import { ShopItem } from './shop-item.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(ShopItem)
    private readonly shopItemRepository: Repository<ShopItem>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    private readonly itemService: ItemService,
    private readonly inventoryService: InventoryService,
    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  async seedShopItems() {
    await this.itemService.seedDefaultItems();
    const configuredCodes = new Set(
      SHOP_ITEM_CONFIGS.map((item) => item.itemCode),
    );

    for (const data of SHOP_ITEM_CONFIGS) {
      const item = await this.itemRepository.findOne({
        where: {
          itemCode: data.itemCode,
          enabled: true,
        },
      });
      if (!item) continue;

      let shopItem =
        await this.shopItemRepository.findOne({
          where: { itemCode: data.itemCode },
        });

      if (!shopItem) {
        shopItem =
          this.shopItemRepository.create({
            itemCode: data.itemCode,
            name: item.name,
            currencyType: data.currencyType,
            price: data.price,
            quantity: data.quantity,
            enabled: true,
            version: '2.1.0',
          });
      } else {
        shopItem.name = item.name;
        shopItem.currencyType =
          data.currencyType;
        shopItem.price = data.price;
        shopItem.quantity = data.quantity;
        shopItem.enabled = true;
        shopItem.version = '2.1.0';
      }
      await this.shopItemRepository.save(
        shopItem,
      );
    }

    const stored =
      await this.shopItemRepository.find();
    for (const legacy of stored) {
      if (
        !configuredCodes.has(legacy.itemCode) &&
        legacy.enabled
      ) {
        legacy.enabled = false;
        await this.shopItemRepository.save(
          legacy,
        );
      }
    }

    return {
      success: true,
      count: SHOP_ITEM_CONFIGS.length,
      shopItems: await this.getShopItems(),
    };
  }

  async getShopItems() {
    const sentinel =
      await this.shopItemRepository.findOne({
        where: {
          itemCode: 'fusion_core',
          enabled: true,
        },
      });
    if (!sentinel) {
      await this.seedShopItems();
    }

    const shopItems =
      await this.shopItemRepository.find({
        where: { enabled: true },
        order: {
          currencyType: 'ASC',
          price: 'ASC',
          id: 'ASC',
        },
      });
    const items = await this.itemRepository.find({
      where: { enabled: true },
    });
    const itemMap = new Map(
      items.map((item) => [
        item.itemCode,
        item,
      ]),
    );

    return shopItems.map((shopItem) => {
      const item = itemMap.get(
        shopItem.itemCode,
      );
      return {
        ...shopItem,
        type: item?.type || 'material',
        description:
          item?.description || '',
        rarity: item?.rarity || 1,
        maxStack:
          item?.maxStack || 999999,
        effect: item?.effect || '',
        effectValue:
          item?.effectValue || 0,
        effectData:
          item?.effectData || {},
        version: item?.version || '',
      };
    });
  }

  async buyItem(
    userId: number,
    dto: BuyItemDto & {
      count?: number;
      requestId?: string;
    },
  ) {
    const shopItem =
      await this.findShopItem(dto);
    if (!shopItem) {
      return {
        success: false,
        message: 'Shop item not found',
      };
    }

    const count = Math.max(
      1,
      Math.min(
        99,
        Math.floor(Number(dto?.count || 1)),
      ),
    );
    const requestId =
      this.economyService.normalizeRequestId(
        dto?.requestId,
        'shop-buy',
      );
    const operationType = 'shop_buy';
    const existing =
      await this.economyService.getOperation(
        userId,
        operationType,
        requestId,
      );
    if (existing?.status === 'success') {
      return {
        ...(existing.result || {}),
        duplicate: true,
        requestId,
      };
    }

    const cost =
      shopItem.currencyType === 'diamond'
        ? {
            diamond:
              Number(shopItem.price || 0) *
              count,
          }
        : {
            gold:
              Number(shopItem.price || 0) *
              count,
          };
    const reward = {
      items: {
        [shopItem.itemCode]:
          Number(shopItem.quantity || 1) *
          count,
      },
    };

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const duplicate =
              await this.economyService.getOperationWithManager(
                manager,
                userId,
                operationType,
                requestId,
              );
            if (
              duplicate?.status === 'success'
            ) {
              return {
                ...(duplicate.result || {}),
                duplicate: true,
                requestId,
              };
            }

            const operation =
              duplicate ||
              (await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType,
                  requestId,
                  cost,
                  reward,
                  payload: {
                    shopItemId: shopItem.id,
                    itemCode:
                      shopItem.itemCode,
                    count,
                  },
                },
              ));

            await this.economyService.spend(
              manager,
              userId,
              cost,
            );
            await this.economyService.grant(
              manager,
              userId,
              reward,
            );

            const response = {
              success: true,
              message:
                'Purchase successful',
              shopItem,
              count,
              requestId,
              cost,
              reward,
              duplicate: false,
            };
            await this.economyService.completeOperation(
              manager,
              operation,
              response,
            );
            return response;
          },
        );

      return {
        ...result,
        wallet:
          await this.economyService.getWallet(
            userId,
          ),
        inventory:
          await this.inventoryService.getUserInventory(
            userId,
          ),
      };
    } catch (error: any) {
      const duplicate =
        await this.economyService.getOperation(
          userId,
          operationType,
          requestId,
        );
      if (duplicate?.status === 'success') {
        return {
          ...(duplicate.result || {}),
          duplicate: true,
          requestId,
        };
      }
      return {
        success: false,
        message: String(
          error?.message || 'Purchase failed',
        ),
        requestId,
      };
    }
  }

  private async findShopItem(
    dto: BuyItemDto,
  ) {
    if (dto?.shopItemId) {
      return this.shopItemRepository.findOne({
        where: {
          id: Number(dto.shopItemId),
          enabled: true,
        },
      });
    }

    if (dto?.itemCode) {
      return this.shopItemRepository.findOne({
        where: {
          itemCode: String(dto.itemCode),
          enabled: true,
        },
      });
    }

    return null;
  }
}
