import { Body, Controller, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { BattleService } from './battle.service';

@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('pve')
  pve(@Body() body: any) {
    return this.battleService.pve(
      DEFAULT_USER_ID,
      Number(body?.petId || body?.myPetId || 0) || undefined,
    );
  }

  @Post('friend')
  friend(@Body() body: any) {
    return this.battleService.friendBattle(
      DEFAULT_USER_ID,
      Number(body?.petId || body?.myPetId || 0) || undefined,
      Number(body?.friendPetId || body?.targetPetId || 0) || undefined,
    );
  }

  @Post('start')
  startBattle(@Body() body: any) {
    return this.battleService.startBattle(
      DEFAULT_USER_ID,
      Number(body?.myPetId || body?.petId || 0),
      Number(body?.targetPetId || body?.friendPetId || 0),
    );
  }

  @Post('team-pve')
  teamPve() {
    return this.battleService.teamPve(DEFAULT_USER_ID);
  }

  @Post('team-friend')
  teamFriend(@Body() body: any) {
    return this.battleService.friendTeamBattle(
      DEFAULT_USER_ID,
      Number(body?.friendUserId || body?.targetUserId || 0) || undefined,
    );
  }
}
