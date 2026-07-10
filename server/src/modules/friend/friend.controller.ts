
import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { FriendService } from './friend.service';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  getFriends() {
    return this.friendService.getFriends(DEFAULT_USER_ID);
  }

  @Get('list')
  getMyFriends() {
    return this.friendService.getFriends(DEFAULT_USER_ID);
  }

  @Post('seed')
  seedFriends() {
    return this.friendService.seedMockFriends(DEFAULT_USER_ID);
  }

  @Post('request')
  sendRequest(@Body() body: any) {
    return this.friendService.sendRequest(
      DEFAULT_USER_ID,
      Number(body?.targetUserId || body?.userId || 0),
      String(body?.message || ''),
    );
  }

  @Get('requests')
  getIncomingRequests() {
    return this.friendService.getRequests(DEFAULT_USER_ID, 'incoming');
  }

  @Get('requests/outgoing')
  getOutgoingRequests() {
    return this.friendService.getRequests(DEFAULT_USER_ID, 'outgoing');
  }

  @Post('handle')
  handleRequest(@Body() body: any) {
    return this.friendService.handleRequest(
      DEFAULT_USER_ID,
      Number(body?.requestId || 0),
      Boolean(body?.accept),
    );
  }

  @Post('remove')
  removeFriend(@Body() body: any) {
    return this.friendService.removeFriend(
      DEFAULT_USER_ID,
      Number(body?.friendUserId || body?.userId || 0),
    );
  }

  @Post('search')
  searchPlayers(@Body() body: any) {
    return this.friendService.searchPlayers(
      DEFAULT_USER_ID,
      String(body?.keyword || ''),
    );
  }
}
