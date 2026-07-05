import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OfflineRewardService } from './offline-reward.service';

@Controller('offline-reward')
export class OfflineRewardController {
  constructor(
    private readonly offlineRewardService: OfflineRewardService,
  ) {}

  @Get('preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Req() req: any) {
    return this.offlineRewardService.getPreview(req.user.sub);
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  async claim(@Req() req: any) {
    return this.offlineRewardService.claim(req.user.sub);
  }
}