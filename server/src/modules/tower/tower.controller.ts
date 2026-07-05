import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TowerService } from './tower.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengeTowerDto } from './dto/challenge-tower.dto';
import { DailyTaskService } from '../daily-task/daily-task.service';

@Controller('tower')
export class TowerController {
  constructor(
  private readonly towerService: TowerService,
  private readonly dailyTaskService: DailyTaskService,
) {}

  @Post('challenge')
  @UseGuards(JwtAuthGuard)
  async challenge(@Req() req: any, @Body() dto: ChallengeTowerDto) {
  const result = await this.towerService.challengeTower(
    req.user.sub,
    dto.petId,
  );

  if (result.success && result.result === 'win') {
    await this.dailyTaskService.completeTask(
      req.user.sub,
      'towerCompleted',
    );
  }

  return result;
}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyRecord(@Req() req: any) {
    return this.towerService.getMyRecord(req.user.sub);
  }
}