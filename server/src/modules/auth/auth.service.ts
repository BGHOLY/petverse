import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/user.entity';
import { Pet } from '../pet/pet.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async login(loginDto: LoginDto) {
    let user = await this.userRepository.findOne({
      where: {
        openid: loginDto.openid,
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      user = this.userRepository.create({
        openid: loginDto.openid,
        unionid: '',
        nickname: loginDto.nickname || 'PetVerse玩家',
        avatar: loginDto.avatar || '',
        level: 1,
        vipLevel: 0,
        exp: 0,
        gold: 1000,
        diamond: 100,
      });

      user = await this.userRepository.save(user);

      const pet = this.petRepository.create({
        ownerId: user.id,
        nickname: 'Mochi',
        species: 'Cat',
        rarity: 3,
        level: 1,
        exp: 0,
        hp: 100,
        attack: 20,
        defense: 15,
        agility: 18,
        intelligence: 20,
        hunger: 100,
        happiness: 100,
        cleanliness: 100,
        stamina: 100,
        geneCode: 'AAAA',
        fatherId: 0,
        motherId: 0,
        married: false,
        partnerId: 0,
      });

      await this.petRepository.save(pet);
    }

    const pets = await this.petRepository.find({
      where: {
        ownerId: user.id,
      },
    });

    return {
      success: true,
      isNewUser,
      token: `demo-token-${user.id}`,
      user,
      pets,
    };
  }
}