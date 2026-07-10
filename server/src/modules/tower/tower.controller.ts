import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { TowerService } from './tower.service';

@Controller('tower')
export class TowerController {
  constructor(private readonly towerService: TowerService) {}

  @Get('status')
  getStatus() {
    return this.towerService.getStatus(DEFAULT_USER_ID);
  }

  @Get('me')
  async getMyRecord() {
    const record = await this.towerService.getMyRecord(DEFAULT_USER_ID);
    return { success: true, record, data: record };
  }

  @Post('challenge')
  challenge(@Body() body: any) {
    return this.towerService.challengeTower(
      DEFAULT_USER_ID,
      Number(body?.petId || 0) || undefined,
    );
  }

  @Post('challenge-team')
  challengeTeam() {
    return this.towerService.challengeTeam(DEFAULT_USER_ID);
  }
}
