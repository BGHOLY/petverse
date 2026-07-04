import { Controller, Get, Post } from '@nestjs/common';

import { ItemService } from './item.service';

@Controller('item')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post('seed')
  async seed() {
    return this.itemService.seedDefaultItems();
  }

  @Get()
  async getAllItems() {
    return this.itemService.getAllItems();
  }
}