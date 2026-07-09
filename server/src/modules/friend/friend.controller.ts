import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { FriendService } from './friend.service';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  async getFriends() {
    return this.friendService.getMockFriends(DEFAULT_USER_ID);
  }

  @Get('list')
  async getMyFriends() {
    return this.friendService.getMockFriends(DEFAULT_USER_ID);
  }

  @Post('seed')
  async seedFriends() {
    return this.friendService.seedMockFriends(DEFAULT_USER_ID);
  }

  @Post('request')
  async sendRequest(@Body() body: any) {
    return this.friendService.sendRequest(DEFAULT_USER_ID, Number(body?.targetUserId || 0));
  }

  @Get('requests')
  async getRequests() {
    return {
      success: true,
      requests: await this.friendService.getRequests(DEFAULT_USER_ID),
      data: await this.friendService.getRequests(DEFAULT_USER_ID),
    };
  }

  @Post('handle')
  async handleRequest(@Body() body: any) {
    return this.friendService.handleRequest(
      DEFAULT_USER_ID,
      Number(body?.requestId || 0),
      Boolean(body?.accept),
    );
  }
}
