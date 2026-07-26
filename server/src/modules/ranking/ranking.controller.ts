
import { Controller, Get, Headers, Param, Query } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { RankingService, RankingType } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(
    private readonly rankingService: RankingService,
  ) {}

  @Get()
  getRanking(@Headers('x-user-id') userId?: string) {
    return this.rankingService.getMainRanking(resolveRequestUserId(userId));
  }

  @Get('board/:type')
  getBoard(
    @Param('type') type: RankingType,
    @Headers('x-user-id') userId?: string,
    @Query('refresh') refresh?: string,
  ) {
    const allowed: RankingType[] = [
      'player-level',
      'pet-power',
      'team-power',
      'exploration',
      'boss',
    ];
    const normalized = allowed.includes(type) ? type : 'pet-power';
    return this.rankingService.getRanking(
      normalized,
      resolveRequestUserId(userId),
      refresh === '1',
    );
  }

  @Get('tower')
  getTowerRanking() {
    return this.rankingService.getTowerRanking();
  }

  @Get('level')
  getLevelRanking() {
    return this.rankingService.getLevelRanking();
  }

  @Get('power')
  getPowerRanking() {
    return this.rankingService.getPowerRanking();
  }

  @Get('season')
  getSeasonRanking() {
    return this.rankingService.getSeasonRanking();
  }

  @Get('snapshots')
  getSnapshots() {
    return this.rankingService.getSettlementSnapshots();
  }
}
