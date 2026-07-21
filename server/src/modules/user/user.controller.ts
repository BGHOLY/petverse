import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getDefaultUser(@Headers('x-user-id') userId?: string) {
    const user = await this.userService.getUserById(resolveRequestUserId(userId));
    return {
      success: true,
      user,
      data: user,
    };
  }

  @Get('profile')
  async getProfile(@Headers('x-user-id') userId?: string) {
    return {
      success: true,
      data: await this.userService.getProfile(resolveRequestUserId(userId)),
    };
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  async getInfo(@Req() req: any) {
    return {
      success: true,
      loginUser: req.user,
      user: await this.userService.getCurrentUser(),
    };
  }
}
