import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { RetentionService } from './retention.service';

@Controller('retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Post('session')
  startSession(@Headers('x-user-id') userId?: string) {
    return this.retentionService.startSession(resolveRequestUserId(userId));
  }

  @Get('overview')
  overview(@Headers('x-user-id') userId?: string) {
    return this.retentionService.getOverview(resolveRequestUserId(userId));
  }

  @Get('newcomer')
  newcomer(@Headers('x-user-id') userId?: string) {
    return this.retentionService.getNewcomer(resolveRequestUserId(userId));
  }

  @Post('newcomer/claim')
  claimNewcomer(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.retentionService.claimNewcomer(
      resolveRequestUserId(userId),
      String(body?.tierCode || ''),
      String(body?.requestId || ''),
    );
  }

  @Get('activities')
  activities(@Headers('x-user-id') userId?: string) {
    return this.retentionService.getActivities(resolveRequestUserId(userId));
  }

  @Post('activities/claim')
  claimActivity(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.retentionService.claimActivity(
      resolveRequestUserId(userId),
      String(body?.activityId || ''),
      String(body?.tierCode || ''),
      String(body?.requestId || ''),
    );
  }

  @Get('red-dots')
  redDots(@Headers('x-user-id') userId?: string) {
    return this.retentionService.getRedDots(resolveRequestUserId(userId));
  }
}
