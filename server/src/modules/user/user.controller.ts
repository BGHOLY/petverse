import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getDefaultUser() {
    const user = await this.userService.getCurrentUser();
    return {
      success: true,
      user,
      data: user,
    };
  }

  @Get('profile')
  async getProfile() {
    return {
      success: true,
      data: await this.userService.getProfile(),
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
