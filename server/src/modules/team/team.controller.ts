import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { resolveRequestUserId } from '../../common/request-user.util';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  getTeam(@Headers('x-user-id') userId?: string) {
    return this.teamService.getTeam(resolveRequestUserId(userId));
  }

  @Post('set')
  setTeam(@Headers('x-user-id') userId: string, @Body() body: any) {
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
      resolveRequestUserId(userId),
      petIds,
      body?.formationId || body?.formationCode,
      slots || (Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined),
      body?.tactics,
    );
  }

  @Post('formation')
  setFormation(@Headers('x-user-id') userId: string, @Body() body: any) {
    const slots = Array.isArray(body?.slots)
      ? body.slots
          .slice(0, 5)
          .sort((left: any, right: any) => Number(left?.position || 0) - Number(right?.position || 0))
          .map((slot: any) => Number(slot?.petId || 0))
      : undefined;
    return this.teamService.setFormation(
      resolveRequestUserId(userId),
      String(body?.formationId || body?.formationCode || 'dragon'),
      slots || (Array.isArray(body?.slotAssignments) ? body.slotAssignments : undefined),
    );
  }

  @Post('tactics')
  setTactics(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.teamService.setTactics(resolveRequestUserId(userId), body?.tactics || body || {});
  }
}
