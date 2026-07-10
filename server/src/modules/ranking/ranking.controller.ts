
import { Controller, Get } from '@nestjs/common';

import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(
    private readonly rankingService: RankingService,
  ) {}

  @Get()
  getRanking() {
    return this.rankingService.getMainRanking();
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
