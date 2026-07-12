import { Body, Controller, Get, Post } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../game-data';
import { FormationService } from './formation.service';

@Controller('formation')
export class FormationController {
  constructor(private readonly formationService: FormationService) {}

  @Get()
  overview() {
    return this.formationService.getOverview(DEFAULT_USER_ID);
  }

  @Post('upgrade')
  upgrade(@Body() body: any) {
    return this.formationService.upgrade(DEFAULT_USER_ID, String(body?.formationCode || 'dragon'));
  }

  @Post('purchase-knowledge')
  purchaseKnowledge(@Body() body: any) {
    return this.formationService.purchaseKnowledge(DEFAULT_USER_ID, Number(body?.quantity || 1));
  }

  @Post('purchase-core')
  purchaseCore() {
    return this.formationService.purchaseCore(DEFAULT_USER_ID);
  }
}
