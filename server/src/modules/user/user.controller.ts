import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';

import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get('info')
  @UseGuards(JwtAuthGuard)
  async getInfo(@Req() req: any) {
    return {
      loginUser: req.user,
      user: await this.userService.getCurrentUser(),
    };
  }
}