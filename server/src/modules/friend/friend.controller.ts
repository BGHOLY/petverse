import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendService } from './friend.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { HandleFriendRequestDto } from './dto/handle-friend-request.dto';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard)
  async sendRequest(@Req() req: any, @Body() dto: SendFriendRequestDto) {
    return this.friendService.sendRequest(req.user.sub, dto.targetUserId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  async getRequests(@Req() req: any) {
    return this.friendService.getRequests(req.user.sub);
  }

  @Post('handle')
  @UseGuards(JwtAuthGuard)
  async handleRequest(@Req() req: any, @Body() dto: HandleFriendRequestDto) {
    return this.friendService.handleRequest(
      req.user.sub,
      dto.requestId,
      dto.accept,
    );
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getMyFriends(@Req() req: any) {
    return this.friendService.getMyFriends(req.user.sub);
  }
}