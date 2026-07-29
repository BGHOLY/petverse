import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { ExpeditionService } from './expedition.service';

@Controller('expedition')
export class ExpeditionController {
  constructor(private readonly expeditionService: ExpeditionService) {}

  @Get('config')
  getConfig() {
    return this.expeditionService.getConfig();
  }

  @Post('start')
  start(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.expeditionService.start(
      resolveRequestUserId(userId),
      String(body?.mapCode || ''),
      Number(body?.durationMinutes || 0),
      Array.isArray(body?.petIds) ? body.petIds : [],
      String(body?.requestId || ''),
    );
  }

  @Get('active')
  getActive(@Headers('x-user-id') userId: string) {
    return this.expeditionService.getActive(resolveRequestUserId(userId));
  }

  @Post('claim')
  claim(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.expeditionService.claim(
      resolveRequestUserId(userId),
      Number(body?.expeditionId || 0),
    );
  }

  @Get('history')
  getHistory(@Headers('x-user-id') userId: string) {
    return this.expeditionService.getHistory(resolveRequestUserId(userId));
  }

  @Post('dev/complete')
  devComplete(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.expeditionService.devComplete(
      resolveRequestUserId(userId),
      Number(body?.expeditionId || 0),
    );
  }
}
