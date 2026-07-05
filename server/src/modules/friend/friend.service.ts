import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { User } from '../user/user.entity';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendRequest(userId: number, targetUserId: number) {
    if (userId === targetUserId) {
      return {
        success: false,
        message: '不能添加自己为好友',
      };
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return {
        success: false,
        message: '目标用户不存在',
      };
    }

    const existsFriend = await this.friendRepository.findOne({
      where: {
        userId,
        friendUserId: targetUserId,
      },
    });

    if (existsFriend) {
      return {
        success: false,
        message: '已经是好友',
      };
    }

    const existsRequest = await this.friendRequestRepository.findOne({
      where: {
        fromUserId: userId,
        toUserId: targetUserId,
        status: 'pending',
      },
    });

    if (existsRequest) {
      return {
        success: false,
        message: '好友申请已发送',
      };
    }

    const request = this.friendRequestRepository.create({
      fromUserId: userId,
      toUserId: targetUserId,
      status: 'pending',
    });

    const saved = await this.friendRequestRepository.save(request);

    return {
      success: true,
      message: '好友申请已发送',
      request: saved,
    };
  }

  async getRequests(userId: number) {
    return this.friendRequestRepository.find({
      where: {
        toUserId: userId,
        status: 'pending',
      },
      order: {
        id: 'DESC',
      },
    });
  }

  async handleRequest(userId: number, requestId: number, accept: boolean) {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      return {
        success: false,
        message: '好友申请不存在',
      };
    }

    if (request.toUserId !== userId) {
      return {
        success: false,
        message: '只能处理发给自己的好友申请',
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        message: '该申请已经处理过',
      };
    }

    if (!accept) {
      request.status = 'rejected';
      await this.friendRequestRepository.save(request);

      return {
        success: true,
        message: '已拒绝好友申请',
      };
    }

    request.status = 'accepted';

    const friendA = this.friendRepository.create({
      userId: request.fromUserId,
      friendUserId: request.toUserId,
    });

    const friendB = this.friendRepository.create({
      userId: request.toUserId,
      friendUserId: request.fromUserId,
    });

    await this.friendRequestRepository.save(request);
    await this.friendRepository.save(friendA);
    await this.friendRepository.save(friendB);

    return {
      success: true,
      message: '已成为好友',
    };
  }

  async getMyFriends(userId: number) {
    const friends = await this.friendRepository.find({
      where: { userId },
      order: {
        id: 'DESC',
      },
    });

    const friendIds = friends.map((item) => item.friendUserId);

    if (friendIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
  where: friendIds.map((id) => ({
    id,
  })),
});

    return users;
  }
}