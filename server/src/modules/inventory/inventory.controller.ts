import { Controller, Get, Req, UseGuards } from '@nestjs/common';

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
}