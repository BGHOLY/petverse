import {
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
import { SignService } from './sign.service';

@Controller('sign')
export class SignController {
  constructor(
    private readonly signService: SignService,
  ) {}

  @Get()
  async getBetaSignInfo(@Headers('x-user-id') userId?: string) {
    return this.signService.getMySignInfo(resolveRequestUserId(userId));
  }

  @Post('today-beta')
  async signTodayBeta(@Headers('x-user-id') userId?: string) {
    return this.signService.signToday(resolveRequestUserId(userId));
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
