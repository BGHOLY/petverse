import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
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
    @Headers('x-user-id') userId: string,
    @Body()
    dto: BuyItemDto & {
      count?: number;
      requestId?: string;
    },
  ) {
    return this.shopService.buyItem(
      resolveRequestUserId(userId),
      dto,
    );
  }
}
