import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { SeasonService } from './season.service';

@Controller('season')
export class SeasonController {
  constructor(
    private readonly seasonService: SeasonService,
  ) {}

  @Get('current')
  getCurrent() {
    return this.seasonService.getCurrentSeason();
  }

  @Get('me')
  getMySeason(@Headers('x-user-id') userId?: string) {
    return this.seasonService.getMySeason(resolveRequestUserId(userId));
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.seasonService.getLeaderboard();
  }

  @Post('sync')
  syncMyScores(@Headers('x-user-id') userId?: string) {
    return this.seasonService.syncPlayerScores(resolveRequestUserId(userId));
  }

  @Post('settle')
  settle(@Body() body: any) {
    return this.seasonService.settleCurrentSeason(
      Boolean(body?.force),
      String(body?.requestId || ''),
    );
  }
}
