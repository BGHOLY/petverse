import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { BattleService } from './battle.service';
import { BattleV10Service } from './battle-v10.service';
import { BattleTacticsService } from './battle-tactics.service';
import { resolveRequestUserId } from '../../common/request-user.util';

@Controller('battle')
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
    private readonly battleV10Service: BattleV10Service,
    private readonly battleTacticsService: BattleTacticsService,
  ) {}

  @Get('tactics/options')
  getTacticsOptions() {
    return this.battleTacticsService.getOptions();
  }

  @Get('tactics/preset')
  getTacticsPreset(@Headers('x-user-id') userId: string) {
    return this.battleTacticsService.getPreset(resolveRequestUserId(userId));
  }

  @Put('tactics/preset')
  saveTacticsPreset(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.battleTacticsService.savePreset(
      resolveRequestUserId(userId),
      body,
    );
  }

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

  @Post('v10/start')
  startFivePetBattle(@Body() body: any) {
    return this.battleV10Service.startPve(DEFAULT_USER_ID, body || {});
  }

  @Post('v10/command')
  commandFivePetBattle(@Body() body: any) {
    return this.battleV10Service.command(
      DEFAULT_USER_ID,
      Number(body?.sessionId || 0),
      body?.directive || body || {},
    );
  }

  @Get('v10/session/:id')
  getFivePetSession(@Param('id') id: string) {
    return this.battleV10Service.getSession(DEFAULT_USER_ID, Number(id || 0));
  }

  @Get('v10/id/:battleId')
  getFivePetSessionByBattleId(@Param('battleId') battleId: string) {
    return this.battleV10Service.getSessionByBattleId(DEFAULT_USER_ID, battleId);
  }

  @Post('v10/settle')
  settleFivePetBattle(@Body() body: any) {
    return this.battleV10Service.settle(DEFAULT_USER_ID, body || {});
  }

  @Post('v10/arena')
  arenaFivePetBattle(@Body() body: any) {
    return this.battleV10Service.arena(DEFAULT_USER_ID, body || {});
  }
}
