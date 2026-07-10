import { Controller, Get, Param } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { EconomyService } from './economy.service';

@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('wallet')
  getWallet() {
    return this.economyService.getWallet(DEFAULT_USER_ID);
  }

  @Get('operation/:type/:requestId')
  async getOperation(
    @Param('type') type: string,
    @Param('requestId') requestId: string,
  ) {
    const operation = await this.economyService.getOperation(
      DEFAULT_USER_ID,
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
