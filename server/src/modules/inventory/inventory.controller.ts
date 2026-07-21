import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(@Headers('x-user-id') userId?: string) {
    const inventory = await this.inventoryService.getUserInventory(resolveRequestUserId(userId));
    return {
      success: true,
      inventory,
      items: inventory,
      data: inventory,
    };
  }

  @Post('use')
  async useItem(
    @Headers('x-user-id') userId: string,
    @Body() body: { itemCode?: string; quantity?: number; petId?: number },
  ) {
    const itemCode = String(body?.itemCode || '').trim();
    const quantity = Number(body?.quantity || 1);

    return this.inventoryService.useItem(
      resolveRequestUserId(userId),
      itemCode,
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      Number(body?.petId || 0) || undefined,
    );
  }
}
