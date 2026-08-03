import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';

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
  pve(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleService.pve(
      resolveRequestUserId(userId),
      Number(body?.petId || body?.myPetId || 0) || undefined,
    );
  }

  @Post('friend')
  friend(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleService.friendBattle(
      resolveRequestUserId(userId),
      Number(body?.petId || body?.myPetId || 0) || undefined,
      Number(body?.friendPetId || body?.targetPetId || 0) || undefined,
    );
  }

  @Post('start')
  startBattle(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleService.startBattle(
      resolveRequestUserId(userId),
      Number(body?.myPetId || body?.petId || 0),
      Number(body?.targetPetId || body?.friendPetId || 0),
    );
  }

  @Post('team-pve')
  teamPve(@Headers('x-user-id') userId?: string) {
    return this.battleService.teamPve(resolveRequestUserId(userId));
  }

  @Post('team-friend')
  teamFriend(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleService.friendTeamBattle(
      resolveRequestUserId(userId),
      Number(body?.friendUserId || body?.targetUserId || 0) || undefined,
    );
  }

  @Post('v10/start')
  startFivePetBattle(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleV10Service.startPve(resolveRequestUserId(userId), body || {});
  }

  @Post('v10/command')
  commandFivePetBattle(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleV10Service.command(
      resolveRequestUserId(userId),
      Number(body?.sessionId || 0),
      body?.directive || body || {},
    );
  }

  @Get('v10/session/:id')
  getFivePetSession(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.battleV10Service.getSession(resolveRequestUserId(userId), Number(id || 0));
  }

  @Get('v10/id/:battleId')
  getFivePetSessionByBattleId(@Headers('x-user-id') userId: string, @Param('battleId') battleId: string) {
    return this.battleV10Service.getSessionByBattleId(resolveRequestUserId(userId), battleId);
  }

  @Post('v10/settle')
  settleFivePetBattle(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleV10Service.settle(resolveRequestUserId(userId), body || {});
  }

  @Post('v10/arena')
  arenaFivePetBattle(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.battleV10Service.arena(resolveRequestUserId(userId), body || {});
  }
}
