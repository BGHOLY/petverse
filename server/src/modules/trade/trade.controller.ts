import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
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
  getMyListings(@Headers('x-user-id') userId?: string) {
    return this.tradeService.getMyListings(resolveRequestUserId(userId));
  }

  @Get('history')
  getHistory(@Headers('x-user-id') userId?: string) {
    return this.tradeService.getHistory(resolveRequestUserId(userId));
  }

  @Post('list')
  listPet(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.tradeService.listPet(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      String(body?.currencyType || 'gold'),
      Number(body?.price || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('cancel')
  cancel(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.tradeService.cancelListing(
      resolveRequestUserId(userId),
      Number(body?.listingId || 0),
    );
  }

  @Post('buy')
  buy(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.tradeService.buyListing(
      resolveRequestUserId(userId),
      Number(body?.listingId || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('expire')
  expire() {
    return this.tradeService.expireOldListings();
  }
}
