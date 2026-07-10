import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { DailyTaskService } from './daily-task.service';

@Controller('daily-task')
export class DailyTaskController {
  constructor(
    private readonly dailyTaskService: DailyTaskService,
  ) {}

  @Get()
  getBetaTask() {
    return this.dailyTaskService.getStatus(
      DEFAULT_USER_ID,
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
  claimBetaReward() {
    return this.dailyTaskService.claimReward(
      DEFAULT_USER_ID,
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
