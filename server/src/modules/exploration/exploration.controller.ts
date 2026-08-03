import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { ExplorationService } from './exploration.service';

@Controller('exploration')
export class ExplorationController {
  constructor(private readonly explorationService: ExplorationService) {}

  @Get('world')
  getWorld(@Headers('x-user-id') userId?: string) {
    return this.explorationService.getWorld(resolveRequestUserId(userId));
  }

  @Post('settle-explore')
  settleExplore(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.explorationService.settleExplore(resolveRequestUserId(userId), String(body?.regionCode || ''), Number(body?.sessionId || 0));
  }

  @Post('settle-nest')
  settleNest(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.explorationService.settleNest(resolveRequestUserId(userId), String(body?.regionCode || ''), Number(body?.sessionId || 0));
  }
}
