import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShopService } from './shop.service';
import { BuyItemDto } from './dto/buy-item.dto';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('seed')
  async seedShopItems() {
    return this.shopService.seedShopItems();
  }

  @Get('items')
  async getShopItems() {
    return this.shopService.getShopItems();
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  async buyItem(@Req() req: any, @Body() dto: BuyItemDto) {
    const userId = Number(
      req?.user?.sub ??
      req?.user?.id ??
      req?.user?.userId,
    );

    return this.shopService.buyItem(userId, dto);
  }
}
