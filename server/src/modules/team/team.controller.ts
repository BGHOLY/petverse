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
    const slots = Array.isArray(body?.slots)
      ? body.slots
          .slice(0, 5)
          .sort((left: any, right: any) => Number(left?.position || 0) - Number(right?.position || 0))
          .map((slot: any) => Number(slot?.petId || 0))
      : undefined;
    const petIds = Array.isArray(body?.petIds)
      ? body.petIds
      : (slots || []).filter((id: number) => id > 0);
    return this.teamService.setTeam(
      DEFAULT_USER_ID,
      petIds,
      body?.formationId || body?.formationCode,
      slots || (Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined),
      body?.tactics,
    );
  }

  @Post('formation')
  setFormation(@Body() body: any) {
    const slots = Array.isArray(body?.slots)
      ? body.slots
          .slice(0, 5)
          .sort((left: any, right: any) => Number(left?.position || 0) - Number(right?.position || 0))
          .map((slot: any) => Number(slot?.petId || 0))
      : undefined;
    return this.teamService.setFormation(
      DEFAULT_USER_ID,
      String(body?.formationId || body?.formationCode || 'dragon'),
      slots || (Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined),
    );
  }

  @Post('tactics')
  setTactics(@Body() body: any) {
    return this.teamService.setTactics(DEFAULT_USER_ID, body?.tactics || body || {});
  }
}
