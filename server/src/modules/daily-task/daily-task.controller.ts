import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyTaskService } from './daily-task.service';

@Controller('daily-task')
export class DailyTaskController {
  constructor(
    private readonly dailyTaskService: DailyTaskService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyTask(
    @Req() req: any,
  ) {
    return this.dailyTaskService.getTodayTask(
      req.user.sub,
    );
  }

  @Post('reward')
  @UseGuards(JwtAuthGuard)
  async claimReward(
    @Req() req: any,
  ) {
    return this.dailyTaskService.claimReward(
      req.user.sub,
    );
  }
}