import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { ExplorationService } from './exploration.service';

@Controller('exploration')
export class ExplorationController {
  constructor(private readonly explorationService: ExplorationService) {}

  @Get('world')
  getWorld() {
    return this.explorationService.getWorld(DEFAULT_USER_ID);
  }

  @Post('settle-explore')
  settleExplore(@Body() body: any) {
    return this.explorationService.settleExplore(DEFAULT_USER_ID, String(body?.regionCode || ''), Number(body?.sessionId || 0));
  }

  @Post('settle-nest')
  settleNest(@Body() body: any) {
    return this.explorationService.settleNest(DEFAULT_USER_ID, String(body?.regionCode || ''), Number(body?.sessionId || 0));
  }
}
