import { Body, Controller, Get, Post } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../game-data';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  getTeam() {
    return this.teamService.getTeam(DEFAULT_USER_ID);
  }

  @Post('set')
  setTeam(@Body() body: any) {
    return this.teamService.setTeam(
      DEFAULT_USER_ID,
      Array.isArray(body?.petIds) ? body.petIds : [],
      body?.formationCode,
      Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined,
      body?.tactics,
    );
  }

  @Post('formation')
  setFormation(@Body() body: any) {
    return this.teamService.setFormation(
      DEFAULT_USER_ID,
      String(body?.formationCode || 'dragon'),
      Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined,
    );
  }

  @Post('tactics')
  setTactics(@Body() body: any) {
    return this.teamService.setTactics(DEFAULT_USER_ID, body?.tactics || body || {});
  }
}
