import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementService } from './achievement.service';
import { ClaimAchievementDto } from './dto/claim-achievement.dto';

@Controller('achievement')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
  ) {}

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  async seed(@Req() req: any) {
    return this.achievementService.seedAchievements(
      req.user.sub,
    );
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    return this.achievementService.getMyAchievements(
      req.user.sub,
    );
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  async claim(
    @Req() req: any,
    @Body() dto: ClaimAchievementDto,
  ) {
    return this.achievementService.claimAchievement(
      req.user.sub,
      dto.achievementId,
    );
  }
}