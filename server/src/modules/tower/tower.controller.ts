import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TowerService } from './tower.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengeTowerDto } from './dto/challenge-tower.dto';

@Controller('tower')
export class TowerController {
  constructor(private readonly towerService: TowerService) {}

  @Post('challenge')
  @UseGuards(JwtAuthGuard)
  async challenge(@Req() req: any, @Body() dto: ChallengeTowerDto) {
    return this.towerService.challengeTower(req.user.sub, dto.petId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyRecord(@Req() req: any) {
    return this.towerService.getMyRecord(req.user.sub);
  }
}