import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { resolveRequestUserId } from '../../common/request-user.util';
import { FormationService } from './formation.service';

@Controller('formation')
export class FormationController {
  constructor(private readonly formationService: FormationService) {}

  @Get()
  overview(@Headers('x-user-id') userId?: string) {
    return this.formationService.getOverview(resolveRequestUserId(userId));
  }

  @Post('upgrade')
  upgrade(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.formationService.upgrade(resolveRequestUserId(userId), String(body?.formationCode || 'dragon'));
  }

  @Post('purchase-knowledge')
  purchaseKnowledge(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.formationService.purchaseKnowledge(resolveRequestUserId(userId), Number(body?.quantity || 1));
  }

  @Post('purchase-core')
  purchaseCore(@Headers('x-user-id') userId?: string) {
    return this.formationService.purchaseCore(resolveRequestUserId(userId));
  }
}
