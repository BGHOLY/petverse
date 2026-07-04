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

@Controller('battle')
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
  ) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async startBattle(
    @Req() req: any,
    @Body() dto: StartBattleDto,
  ) {
    return this.battleService.startBattle(
      req.user.sub,
      dto.myPetId,
      dto.targetPetId,
    );
  }
}