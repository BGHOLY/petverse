import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { TowerService } from './tower.service';

@Controller('tower')
export class TowerController {
  constructor(private readonly towerService: TowerService) {}

  @Get('status')
  getStatus(@Headers('x-user-id') userId?: string) {
    return this.towerService.getStatus(resolveRequestUserId(userId));
  }

  @Get('me')
  async getMyRecord(@Headers('x-user-id') userId?: string) {
    const record = await this.towerService.getMyRecord(resolveRequestUserId(userId));
    return { success: true, record, data: record };
  }

  @Post('challenge')
  challenge(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.towerService.challengeTower(
      resolveRequestUserId(userId),
      Number(body?.petId || 0) || undefined,
    );
  }

  @Post('challenge-team')
  challengeTeam(@Headers('x-user-id') userId?: string) {
    return this.towerService.challengeTeam(resolveRequestUserId(userId));
  }
}
