import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { HatcheryService } from './hatchery.service';

@Controller('hatchery')
export class HatcheryController {
  constructor(private readonly hatcheryService: HatcheryService) {}

  @Get('eggs')
  async getEggs() {
    return this.hatcheryService.getEggs(DEFAULT_USER_ID);
  }

  @Post('hatch')
  async hatch(@Body() body: any) {
    return this.hatcheryService.hatch(
      DEFAULT_USER_ID,
      Number(body?.eggId || 0) || undefined,
    );
  }
}
