import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { SignService } from './sign.service';

@Controller('sign')
export class SignController {
  constructor(
    private readonly signService: SignService,
  ) {}

  @Get()
  async getBetaSignInfo() {
    return this.signService.getMySignInfo(DEFAULT_USER_ID);
  }

  @Post('today-beta')
  async signTodayBeta() {
    return this.signService.signToday(DEFAULT_USER_ID);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySignInfo(@Req() req: any) {
    return this.signService.getMySignInfo(req.user.sub);
  }

  @Post('today')
  @UseGuards(JwtAuthGuard)
  async signToday(@Req() req: any) {
    return this.signService.signToday(req.user.sub);
  }
}
