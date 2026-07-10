import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { FusionService } from './fusion.service';

@Controller('fusion')
export class FusionController {
  constructor(private readonly fusionService: FusionService) {}

  @Post('preview')
  async preview(@Body() body: any) {
    return this.fusionService.preview(
      DEFAULT_USER_ID,
      Number(body?.parentAId || body?.petAId || 0),
      Number(body?.parentBId || body?.petBId || 0),
      body?.seed ? String(body.seed) : undefined,
    );
  }

  @Post('execute')
  async execute(@Body() body: any) {
    return this.fusionService.execute(
      DEFAULT_USER_ID,
      Number(body?.parentAId || body?.petAId || 0),
      Number(body?.parentBId || body?.petBId || 0),
      String(body?.requestId || ''),
      body?.seed ? String(body.seed) : undefined,
    );
  }

  @Get('history')
  async getHistory() {
    return this.fusionService.getHistory(DEFAULT_USER_ID);
  }
}
