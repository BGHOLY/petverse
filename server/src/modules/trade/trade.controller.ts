
import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { TradeService } from './trade.service';

@Controller('trade')
export class TradeController {
  constructor(
    private readonly tradeService: TradeService,
  ) {}

  @Get('listings')
  getListings() {
    return this.tradeService.getListings();
  }

  @Get('my')
  getMyListings() {
    return this.tradeService.getMyListings(
      DEFAULT_USER_ID,
    );
  }

  @Get('history')
  getHistory() {
    return this.tradeService.getHistory(
      DEFAULT_USER_ID,
    );
  }

  @Post('list')
  listPet(@Body() body: any) {
    return this.tradeService.listPet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      String(body?.currencyType || 'gold'),
      Number(body?.price || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('cancel')
  cancel(@Body() body: any) {
    return this.tradeService.cancelListing(
      DEFAULT_USER_ID,
      Number(body?.listingId || 0),
    );
  }

  @Post('buy')
  buy(@Body() body: any) {
    return this.tradeService.buyListing(
      DEFAULT_USER_ID,
      Number(body?.listingId || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('expire')
  expire() {
    return this.tradeService.expireOldListings();
  }
}
