
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { PetService } from '../pet/pet.service';
import { User } from '../user/user.entity';
import { FriendRequest } from './friend-request.entity';
import { Friend } from './friend.entity';

const MOCK_FRIENDS = [
  {
    id: 101,
    nickname: '小明',
    pets: [
      { nickname: 'Ming Cat', speciesCode: 'PET004', rarity: 2 },
      { nickname: 'Ming Fox', speciesCode: 'PET001', rarity: 3 },
    ],
  },
  {
    id: 102,
    nickname: '小红',
    pets: [
      { nickname: 'Ruby Rabbit', speciesCode: 'PET003', rarity: 1 },
      { nickname: 'Ruby Dragon', speciesCode: 'PET009', rarity: 5 },
    ],
  },
  {
    id: 103,
    nickname: '阿强',
    pets: [
      { nickname: 'Strong Wolf', speciesCode: 'PET007', rarity: 3 },
    ],
  },
  {
    id: 104,
    nickname: 'Luna',
    pets: [
      { nickname: 'Moon Cat', speciesCode: 'PET004', rarity: 4 },
      { nickname: 'Luna Owl', speciesCode: 'PET010', rarity: 3 },
    ],
  },
];

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly petService: PetService,
    private readonly dataSource: DataSource,
  ) {}

  async getFriends(userId = DEFAULT_USER_ID, page = 1, pageSize = 50) {
    await this.touchActivity(userId);
    const safePage = Math.max(1, Math.floor(Number(page || 1)));
    const safePageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize || 50))));
    const relations = await this.friendRepository.find({
      where: { userId },
      order: { id: 'ASC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    const users = await this.userRepository.find();
    const userMap = new Map(users.map((user) => [user.id, user]));
    const friends = [];

    for (const relation of relations) {
      const friendUser = userMap.get(relation.friendUserId);
      if (!friendUser) continue;
      const petResult = await this.petService.getUserPets(friendUser.id);
      friends.push({
        relationId: relation.id,
        id: friendUser.id,
        userId: friendUser.id,
        nickname: friendUser.nickname,
        avatar: friendUser.avatar,
        level: friendUser.level,
        lastActiveAt: friendUser.lastActiveAt,
        online: this.isRecentlyActive(friendUser.lastActiveAt),
        pets: petResult.pets.filter((pet) => !pet.isEgg),
        since: relation.createTime,
      });
    }

    return {
      success: true,
      count: friends.length,
      page: safePage,
      pageSize: safePageSize,
      friends,
      data: friends,
    };
  }

  getMockFriends(userId = DEFAULT_USER_ID) {
    return this.getFriends(userId);
  }

  async seedMockFriends(userId = DEFAULT_USER_ID) {
    for (const friendData of MOCK_FRIENDS) {
      let user = await this.userRepository.findOne({
        where: { id: friendData.id },
      });

      if (!user) {
        user = this.userRepository.create({
          id: friendData.id,
          openid: `mock_friend_${friendData.id}`,
          unionid: '',
          nickname: friendData.nickname,
          avatar: '',
          level: 1,
          vipLevel: 0,
          exp: 0,
          gold: 1000,
          diamond: 100,
          petCapacity: 50,
        } as Partial<User>);
      } else {
        user.nickname = friendData.nickname;
        user.openid = user.openid || `mock_friend_${friendData.id}`;
      }
      await this.userRepository.save(user);

      await this.ensureRelation(userId, friendData.id);
      await this.ensureRelation(friendData.id, userId);

      const existingPets = await this.petService.getUserPets(friendData.id);
      const existingNames = new Set(
        existingPets.pets.map((pet) => pet.nickname),
      );

      for (const petData of friendData.pets) {
        if (!existingNames.has(petData.nickname)) {
          await this.petService.createPet(friendData.id, {
            ...petData,
            sourceType: 'friend_seed',
          });
        }
      }
    }

    return this.getFriends(userId);
  }

  async sendRequest(
    userId: number,
    targetUserId: number,
    message = '',
  ) {
    if (!targetUserId || targetUserId === userId) {
      return {
        success: false,
        message: 'Invalid target user',
      };
    }

    const [target, relation, reverseRelation] = await Promise.all([
      this.userRepository.findOne({ where: { id: targetUserId } }),
      this.friendRepository.findOne({
        where: { userId, friendUserId: targetUserId },
      }),
      this.friendRepository.findOne({
        where: { userId: targetUserId, friendUserId: userId },
      }),
    ]);

    if (!target) {
      return {
        success: false,
        message: 'Target user not found',
      };
    }
    if (relation || reverseRelation) {
      return {
        success: false,
        message: 'Users are already friends',
      };
    }

    const requests = await this.friendRequestRepository.find({
      where: { status: 'pending' },
    });
    const pending = requests.find(
      (request) =>
        (request.fromUserId === userId &&
          request.toUserId === targetUserId) ||
        (request.fromUserId === targetUserId &&
          request.toUserId === userId),
    );

    if (pending) {
      return {
        success: false,
        message: 'A pending friend request already exists',
        request: pending,
      };
    }

    const request = this.friendRequestRepository.create({
      fromUserId: userId,
      toUserId: targetUserId,
      status: 'pending',
      message: String(message || '').trim().slice(0, 100),
      handledAt: null,
    });

    return {
      success: true,
      message: 'Friend request sent',
      request: await this.friendRequestRepository.save(request),
    };
  }

  async getRequests(
    userId: number,
    direction: 'incoming' | 'outgoing' = 'incoming',
  ) {
    const requests = await this.friendRequestRepository.find({
      where:
        direction === 'outgoing'
          ? { fromUserId: userId }
          : { toUserId: userId },
      order: { id: 'DESC' },
    });
    const users = await this.userRepository.find();
    const userMap = new Map(users.map((user) => [user.id, user]));

    const data = requests.map((request) => {
      const otherUserId =
        direction === 'outgoing'
          ? request.toUserId
          : request.fromUserId;
      const other = userMap.get(otherUserId);
      return {
        ...request,
        otherUser: other
          ? {
              id: other.id,
              nickname: other.nickname,
              avatar: other.avatar,
              level: other.level,
            }
          : null,
      };
    });

    return {
      success: true,
      direction,
      requests: data,
      data,
    };
  }

  async handleRequest(
    userId: number,
    requestId: number,
    accept: boolean,
  ) {
    if (!requestId) {
      return {
        success: false,
        message: 'Invalid request id',
      };
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const requestRepository =
          manager.getRepository(FriendRequest);
        const friendRepository = manager.getRepository(Friend);

        const request = await requestRepository.findOne({
          where: {
            id: requestId,
            toUserId: userId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!request) {
          throw new Error('Friend request not found');
        }
        if (request.status !== 'pending') {
          return {
            success: true,
            message: 'Friend request already handled',
            request,
            duplicate: true,
          };
        }

        request.status = accept ? 'accepted' : 'rejected';
        request.handledAt = new Date();
        await requestRepository.save(request);

        if (accept) {
          await this.ensureRelationWithRepository(
            friendRepository,
            request.fromUserId,
            request.toUserId,
          );
          await this.ensureRelationWithRepository(
            friendRepository,
            request.toUserId,
            request.fromUserId,
          );
        }

        return {
          success: true,
          message: accept
            ? 'Friend request accepted'
            : 'Friend request rejected',
          request,
          duplicate: false,
        };
      });
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Handle request failed'),
      };
    }
  }

  async removeFriend(userId: number, friendUserId: number) {
    if (!friendUserId || friendUserId === userId) {
      return {
        success: false,
        message: 'Invalid friend user',
      };
    }

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Friend);
      await repository.delete({
        userId,
        friendUserId,
      });
      await repository.delete({
        userId: friendUserId,
        friendUserId: userId,
      });
    });

    return {
      success: true,
      message: 'Friend removed',
      friendUserId,
    };
  }

  async searchPlayers(userId: number, keyword: string) {
    await this.touchActivity(userId);
    const normalized = String(keyword || '').trim().toLowerCase();
    if (!normalized) {
      return {
        success: true,
        users: [],
        data: [],
      };
    }

    const relations = await this.friendRepository.find({
      where: { userId },
    });
    const friendIds = new Set(
      relations.map((relation) => relation.friendUserId),
    );
    const users = await this.userRepository.find();
    const matched = users
      .filter((user) => user.id !== userId)
      .filter(
        (user) =>
          String(user.id) === normalized ||
          String(user.nickname || '')
            .toLowerCase()
            .includes(normalized) ||
          String(user.openid || '').toLowerCase() === normalized,
      )
      .slice(0, 20)
      .map((user) => ({
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
        lastActiveAt: user.lastActiveAt,
        online: this.isRecentlyActive(user.lastActiveAt),
        isFriend: friendIds.has(user.id),
      }));

    return {
      success: true,
      users: matched,
      data: matched,
    };
  }

  async getFirstFriendPet(userId = DEFAULT_USER_ID) {
    const result = await this.getFriends(userId);
    for (const friend of result.friends) {
      const pet = (friend.pets || []).find((item) => !item.isEgg);
      if (pet) return pet;
    }
    return null;
  }

  async getMyFriends(userId: number) {
    const result = await this.getFriends(userId);
    return result.friends;
  }

  async getFriendPets(userId: number, friendUserId: number) {
    if (!friendUserId || friendUserId === userId) {
      return { success: false, message: 'Invalid friend user', pets: [] };
    }
    const relation = await this.friendRepository.findOne({
      where: { userId, friendUserId },
    });
    if (!relation) {
      return { success: false, message: 'Players are not friends', pets: [] };
    }
    const result = await this.petService.getUserPets(friendUserId);
    const pets = result.pets.filter((pet) => !pet.isEgg);
    return { success: true, friendUserId, count: pets.length, pets, data: pets };
  }

  private async ensureRelation(userId: number, friendUserId: number) {
    return this.ensureRelationWithRepository(
      this.friendRepository,
      userId,
      friendUserId,
    );
  }

  private async touchActivity(userId: number) {
    if (userId > 0) {
      await this.userRepository.update({ id: userId }, { lastActiveAt: new Date() });
    }
  }

  private isRecentlyActive(value?: Date | null) {
    if (!value) return false;
    return Date.now() - new Date(value).getTime() <= 5 * 60 * 1000;
  }

  private async ensureRelationWithRepository(
    repository: Repository<Friend>,
    userId: number,
    friendUserId: number,
  ) {
    let relation = await repository.findOne({
      where: { userId, friendUserId },
    });
    if (!relation) {
      relation = repository.create({
        userId,
        friendUserId,
      });
      relation = await repository.save(relation);
    }
    return relation;
  }
}
