import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { resolveRequestUserId } from '../../common/request-user.util';
import { AchievementService } from './achievement.service';
import { ClaimAchievementDto } from './dto/claim-achievement.dto';

@Controller('achievement')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
  ) {}

  @Post('seed')
  seedBeta() {
    return this.achievementService.seedAchievements(
      DEFAULT_USER_ID,
    );
  }

  @Post('seed-auth')
  @UseGuards(JwtAuthGuard)
  seed(@Req() req: any) {
    return this.achievementService.seedAchievements(
      req.user.sub,
    );
  }

  @Get('list')
  async listBeta(@Headers('x-user-id') userId?: string) {
    const achievements = await this.achievementService.getMyAchievements(
      resolveRequestUserId(userId),
    );
    return { success: true, achievements, data: achievements, list: achievements };
  }

  @Get('list-auth')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    const achievements = await this.achievementService.getMyAchievements(req.user.sub);
    return { success: true, achievements, data: achievements, list: achievements };
  }

  @Post('claim')
  claimBeta(
    @Headers('x-user-id') userId: string,
    @Body() dto: ClaimAchievementDto,
  ) {
    return this.achievementService.claimAchievement(
      resolveRequestUserId(userId),
      Number(dto?.achievementId || 0),
    );
  }

  @Post('claim-auth')
  @UseGuards(JwtAuthGuard)
  claim(
    @Req() req: any,
    @Body() dto: ClaimAchievementDto,
  ) {
    return this.achievementService.claimAchievement(
      req.user.sub,
      Number(dto?.achievementId || 0),
    );
  }
}
