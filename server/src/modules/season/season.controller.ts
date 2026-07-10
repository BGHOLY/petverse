
import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
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
  getMySeason() {
    return this.seasonService.getMySeason(
      DEFAULT_USER_ID,
    );
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.seasonService.getLeaderboard();
  }

  @Post('sync')
  syncMyScores() {
    return this.seasonService.syncPlayerScores(
      DEFAULT_USER_ID,
    );
  }

  @Post('settle')
  settle(@Body() body: any) {
    return this.seasonService.settleCurrentSeason(
      Boolean(body?.force),
      String(body?.requestId || ''),
    );
  }
}
