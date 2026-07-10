import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { FriendService } from './friend.service';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  getFriends(@Headers('x-user-id') userId?: string) {
    return this.friendService.getFriends(resolveRequestUserId(userId));
  }

  @Get('list')
  getMyFriends(@Headers('x-user-id') userId?: string) {
    return this.friendService.getFriends(resolveRequestUserId(userId));
  }

  @Post('seed')
  seedFriends(@Headers('x-user-id') userId?: string) {
    return this.friendService.seedMockFriends(resolveRequestUserId(userId));
  }

  @Post('request')
  sendRequest(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.friendService.sendRequest(
      resolveRequestUserId(userId),
      Number(body?.targetUserId || body?.userId || 0),
      String(body?.message || ''),
    );
  }

  @Get('requests')
  getIncomingRequests(@Headers('x-user-id') userId?: string) {
    return this.friendService.getRequests(
      resolveRequestUserId(userId),
      'incoming',
    );
  }

  @Get('requests/outgoing')
  getOutgoingRequests(@Headers('x-user-id') userId?: string) {
    return this.friendService.getRequests(
      resolveRequestUserId(userId),
      'outgoing',
    );
  }

  @Post('handle')
  handleRequest(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.friendService.handleRequest(
      resolveRequestUserId(userId),
      Number(body?.requestId || 0),
      Boolean(body?.accept),
    );
  }

  @Post('remove')
  removeFriend(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.friendService.removeFriend(
      resolveRequestUserId(userId),
      Number(body?.friendUserId || body?.userId || 0),
    );
  }

  @Post('search')
  searchPlayers(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.friendService.searchPlayers(
      resolveRequestUserId(userId),
      String(body?.keyword || ''),
    );
  }
}
