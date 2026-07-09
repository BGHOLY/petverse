import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { PetService } from '../pet/pet.service';
import { User } from '../user/user.entity';
import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';

const MOCK_FRIENDS = [
  {
    id: 101,
    nickname: '小明',
    pets: [
      { nickname: 'Ming Cat', species: 'Cat', rarity: 2 },
      { nickname: 'Ming Fox', species: 'Fox', rarity: 3 },
    ],
  },
  {
    id: 102,
    nickname: '小红',
    pets: [
      { nickname: 'Ruby Rabbit', species: 'Rabbit', rarity: 1 },
      { nickname: 'Ruby Phoenix', species: 'Phoenix', rarity: 5 },
    ],
  },
  {
    id: 103,
    nickname: '阿强',
    pets: [
      { nickname: 'Strong Dog', species: 'Dog', rarity: 3 },
    ],
  },
  {
    id: 104,
    nickname: 'Luna',
    pets: [
      { nickname: 'Moon Dragon', species: 'Dragon', rarity: 4 },
      { nickname: 'Luna Cat', species: 'Cat', rarity: 2 },
      { nickname: 'Luna Fox', species: 'Fox', rarity: 3 },
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
  ) {}

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
        } as Partial<User>);
      } else {
        user.nickname = friendData.nickname;
        user.openid = user.openid || `mock_friend_${friendData.id}`;
      }

      await this.userRepository.save(user);

      let relation = await this.friendRepository.findOne({
        where: {
          userId,
          friendUserId: friendData.id,
        },
      });

      if (!relation) {
        relation = this.friendRepository.create({
          userId,
          friendUserId: friendData.id,
        });
        await this.friendRepository.save(relation);
      }

      const existingPets = await this.petService.getUserPets(friendData.id);
      const existingNames = new Set(existingPets.pets.map((pet) => pet.nickname));

      for (const petData of friendData.pets) {
        if (!existingNames.has(petData.nickname)) {
          await this.petService.createPet(friendData.id, petData);
        }
      }
    }

    return this.getMockFriends(userId);
  }

  async getMockFriends(userId = DEFAULT_USER_ID) {
    await this.seedRecordsOnly(userId);

    const friends = [];

    for (const friendData of MOCK_FRIENDS) {
      const user = await this.userRepository.findOne({
        where: { id: friendData.id },
      });
      const petResult = await this.petService.getUserPets(friendData.id);

      friends.push({
        id: friendData.id,
        userId: friendData.id,
        nickname: user?.nickname || friendData.nickname,
        pets: petResult.pets,
      });
    }

    return {
      success: true,
      friends,
      data: friends,
    };
  }

  async getFirstFriendPet() {
    const friend = MOCK_FRIENDS[0];
    const petResult = await this.petService.getUserPets(friend.id);
    return petResult.pets.find((pet) => !pet.isEgg) || null;
  }

  async sendRequest(userId: number, targetUserId: number) {
    return {
      success: true,
      message: 'Mock friend system uses fixed friends in beta',
      userId,
      targetUserId,
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
    return {
      success: true,
      message: 'Mock request handled',
      userId,
      requestId,
      accept,
    };
  }

  async getMyFriends(userId: number) {
    const result = await this.getMockFriends(userId);
    return result.friends;
  }

  private async seedRecordsOnly(userId: number) {
    for (const friendData of MOCK_FRIENDS) {
      const user = await this.userRepository.findOne({
        where: { id: friendData.id },
      });

      if (!user) {
        await this.seedMockFriends(userId);
        return;
      }
    }
  }
}
