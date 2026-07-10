import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { BuyItemDto } from './dto/buy-item.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
  ) {}

  @Post('seed')
  seedShopItems() {
    return this.shopService.seedShopItems();
  }

  @Get()
  async getShop() {
    const shopItems =
      await this.shopService.getShopItems();
    return {
      success: true,
      shopItems,
      items: shopItems,
      data: shopItems,
    };
  }

  @Get('items')
  async getShopItems() {
    const shopItems =
      await this.shopService.getShopItems();
    return {
      success: true,
      shopItems,
      items: shopItems,
      data: shopItems,
    };
  }

  @Post('buy')
  buyItem(
    @Body()
    dto: BuyItemDto & {
      count?: number;
      requestId?: string;
    },
  ) {
    return this.shopService.buyItem(
      DEFAULT_USER_ID,
      dto,
    );
  }
}
