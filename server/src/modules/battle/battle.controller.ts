import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattleService } from './battle.service';
import { StartBattleDto } from './dto/start-battle.dto';
import { DailyTaskService } from '../daily-task/daily-task.service';

@Controller('battle')
export class BattleController {
  constructor(
  private readonly battleService: BattleService,
  private readonly dailyTaskService: DailyTaskService,
) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startBattle(
    @Req() req: any,
    @Body() dto: StartBattleDto,
  ) {
    const result = await this.battleService.startBattle(
  req.user.sub,
  dto.myPetId,
  dto.targetPetId,
);

if (result.success) {
  await this.dailyTaskService.completeTask(
    req.user.sub,
    'battleCompleted',
  );
}

return result;
  }
}