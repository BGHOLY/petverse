import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { HatcheryService } from './hatchery.service';

@Controller('hatchery')
export class HatcheryController {
  constructor(private readonly hatcheryService: HatcheryService) {}

  @Get('eggs')
  async getEggs() {
    return this.hatcheryService.getEggs(DEFAULT_USER_ID);
  }

  @Get('eggs/:id')
  async getEggDetail(@Param('id') id: string) {
    return this.hatcheryService.getEggDetail(DEFAULT_USER_ID, Number(id));
  }

  @Post('start')
  async start(@Body() body: any) {
    return this.hatcheryService.startIncubation(
      DEFAULT_USER_ID,
      Number(body?.eggId || 0),
    );
  }

  @Post('accelerate')
  async accelerate(@Body() body: any) {
    return this.hatcheryService.accelerate(
      DEFAULT_USER_ID,
      Number(body?.eggId || 0),
      String(body?.itemCode || ''),
      Number(body?.quantity || 1),
    );
  }

  @Post('hatch')
  async hatch(@Body() body: any) {
    return this.hatcheryService.hatch(
      DEFAULT_USER_ID,
      Number(body?.eggId || 0) || undefined,
      Boolean(body?.force),
    );
  }
}
