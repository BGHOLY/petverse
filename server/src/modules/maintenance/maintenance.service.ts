import { Injectable } from '@nestjs/common';

import { MarriageService } from '../marriage/marriage.service';
import { TradeService } from '../trade/trade.service';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly marriageService: MarriageService,
    private readonly tradeService: TradeService,
  ) {}

  async run() {
    const [proposals, marriages, trades] = await Promise.all([
      this.marriageService.expireOldProposals(),
      this.marriageService.repairMarriageState(),
      this.tradeService.expireOldListings(),
    ]);

    return {
      success: true,
      version: '2.3.0',
      proposals,
      marriages,
      trades,
      ranAt: new Date(),
    };
  }
}
