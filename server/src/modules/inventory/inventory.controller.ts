import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getInventory(@Req() req: any) {
    return this.inventoryService.getUserInventory(req.user.sub);
  }

  @Post('use')
  @UseGuards(JwtAuthGuard)
  async useItem(
    @Req() req: any,
    @Body() body: { itemCode?: string; quantity?: number },
  ) {
    const itemCode = String(body?.itemCode || '').trim();
    const quantity = Number(body?.quantity || 1);

    return this.inventoryService.useItem(
      req.user.sub,
      itemCode,
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    );
  }
}
