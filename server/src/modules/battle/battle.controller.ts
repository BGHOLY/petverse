import { Body, Controller, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { BattleService } from './battle.service';

@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('pve')
  async pve(@Body() body: any) {
    return this.battleService.pve(
      DEFAULT_USER_ID,
      Number(body?.petId || body?.myPetId || 0) || undefined,
    );
  }

  @Post('friend')
  async friend(@Body() body: any) {
    return this.battleService.friendBattle(
      DEFAULT_USER_ID,
      Number(body?.petId || body?.myPetId || 0) || undefined,
      Number(body?.friendPetId || body?.targetPetId || 0) || undefined,
    );
  }

  @Post('start')
  async startBattle(@Body() body: any) {
    return this.battleService.startBattle(
      DEFAULT_USER_ID,
      Number(body?.myPetId || body?.petId || 0),
      Number(body?.targetPetId || body?.friendPetId || 0),
    );
  }
}
