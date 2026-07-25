import {
  Controller,
  Get,
  Headers,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { resolveRequestUserId } from '../../common/request-user.util';
import { DailyTaskService } from './daily-task.service';

@Controller('daily-task')
export class DailyTaskController {
  constructor(
    private readonly dailyTaskService: DailyTaskService,
  ) {}

  @Get()
  getBetaTask(@Headers('x-user-id') userId?: string) {
    return this.dailyTaskService.getStatus(
      resolveRequestUserId(userId),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyTask(@Req() req: any) {
    return this.dailyTaskService.getStatus(
      req.user.sub,
    );
  }

  @Post('reward')
  claimBetaReward(@Headers('x-user-id') userId?: string) {
    return this.dailyTaskService.claimReward(
      resolveRequestUserId(userId),
    );
  }

  @Post('claim')
  claimTask(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.dailyTaskService.claimTask(
      resolveRequestUserId(userId),
      Number(body?.taskId || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('claim-all')
  claimAll(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    const category = ['daily', 'weekly'].includes(String(body?.category || ''))
      ? body.category
      : 'all';
    return this.dailyTaskService.claimAll(
      resolveRequestUserId(userId),
      category,
      String(body?.requestId || ''),
    );
  }

  @Post('activity-claim')
  claimActivity(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.dailyTaskService.claimActivityChest(
      resolveRequestUserId(userId),
      Number(body?.threshold || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('reward-auth')
  @UseGuards(JwtAuthGuard)
  claimReward(@Req() req: any) {
    return this.dailyTaskService.claimReward(
      req.user.sub,
    );
  }
}
