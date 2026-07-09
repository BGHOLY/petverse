import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory() {
    const inventory = await this.inventoryService.getUserInventory(DEFAULT_USER_ID);
    return {
      success: true,
      inventory,
      items: inventory,
      data: inventory,
    };
  }

  @Post('use')
  async useItem(
    @Body() body: { itemCode?: string; quantity?: number; petId?: number },
  ) {
    const itemCode = String(body?.itemCode || '').trim();
    const quantity = Number(body?.quantity || 1);

    return this.inventoryService.useItem(
      DEFAULT_USER_ID,
      itemCode,
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      Number(body?.petId || 0) || undefined,
    );
  }
}
