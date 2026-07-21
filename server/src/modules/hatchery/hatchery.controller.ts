import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { HatcheryService } from './hatchery.service';

@Controller('hatchery')
export class HatcheryController {
  constructor(private readonly hatcheryService: HatcheryService) {}

  @Get('eggs')
  async getEggs(@Headers('x-user-id') userId?: string) {
    return this.hatcheryService.getEggs(resolveRequestUserId(userId));
  }

  @Get('eggs/:id')
  async getEggDetail(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.hatcheryService.getEggDetail(resolveRequestUserId(userId), Number(id));
  }

  @Post('start')
  async start(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.hatcheryService.startIncubation(
      resolveRequestUserId(userId),
      Number(body?.eggId || 0),
      Number(body?.slot || body?.incubatorSlot || 0),
    );
  }

  @Post('accelerate')
  async accelerate(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.hatcheryService.accelerate(
      resolveRequestUserId(userId),
      Number(body?.eggId || 0),
      String(body?.itemCode || ''),
      Number(body?.quantity || 1),
    );
  }

  @Post('hatch')
  async hatch(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.hatcheryService.hatch(
      resolveRequestUserId(userId),
      Number(body?.eggId || 0) || undefined,
      Boolean(body?.force),
    );
  }
}
