import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { User } from './user.entity';
import { Pet } from '../pet/pet.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async getCurrentUser(): Promise<User> {
    return this.getOrCreateDefaultUser();
  }

  async getOrCreateDefaultUser(): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { id: DEFAULT_USER_ID },
    });

    if (!user) {
      user = this.userRepository.create({
        id: DEFAULT_USER_ID,
        openid: 'petverse_dev_player',
        unionid: '',
        nickname: 'PetVerse Tester',
        avatar: '',
        level: 1,
        vipLevel: 0,
        exp: 0,
        gold: 3000,
        diamond: 150,
      } as Partial<User>);
    } else {
      user.openid = user.openid || 'petverse_dev_player';
      user.nickname = user.nickname || 'PetVerse Tester';
      user.gold = Math.max(Number(user.gold || 0), 1000);
      user.diamond = Math.max(Number(user.diamond || 0), 100);
    }

    return this.userRepository.save(user);
  }

  async getProfile() {
    const user = await this.getOrCreateDefaultUser();

    const pets = await this.petRepository.find({
      where: { ownerId: user.id },
      order: { id: 'ASC' },
    });

    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
        exp: user.exp,
        gold: user.gold,
        diamond: user.diamond,
        vipLevel: user.vipLevel,
      },
      pets: pets.map((pet) => ({
        id: pet.id,
        nickname: pet.nickname,
        species: pet.species,
        rarity: pet.rarity,
        level: pet.level,
        exp: pet.exp,
        hp: pet.hp,
        attack: pet.attack,
        defense: pet.defense,
        speed: pet.speed,
        happiness: pet.happiness,
        hunger: pet.hunger,
      })),
    };
  }

  async save(user: User) {
    return this.userRepository.save(user);
  }
}
