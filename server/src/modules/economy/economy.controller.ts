import { Controller, Get, Headers, Param } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { EconomyService } from './economy.service';

@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('wallet')
  getWallet(@Headers('x-user-id') userId?: string) {
    return this.economyService.getWallet(resolveRequestUserId(userId));
  }

  @Get('operation/:type/:requestId')
  async getOperation(
    @Headers('x-user-id') userId: string,
    @Param('type') type: string,
    @Param('requestId') requestId: string,
  ) {
    const operation = await this.economyService.getOperation(
      resolveRequestUserId(userId),
      String(type || ''),
      String(requestId || ''),
    );
    return {
      success: Boolean(operation),
      operation,
      data: operation,
    };
  }
}
