import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/user.entity';
import { Pet } from '../pet/pet.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { InventoryService } from '../inventory/inventory.service';
import { ItemService } from '../item/item.service';

@Injectable()
export class AuthService {
  constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,

  @InjectRepository(Pet)
  private readonly petRepository: Repository<Pet>,

  private readonly jwtService: JwtService,
  private readonly inventoryService: InventoryService,
  private readonly itemService: ItemService,
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
      const apple = await this.itemService.findByCode('apple');
const fish = await this.itemService.findByCode('fish');
const potion =
  await this.itemService.findByCode(
    'exp_potion_small',
  );

if (apple) {
  await this.inventoryService.addItem(
    user.id,
    apple.id,
    apple.itemCode,
    10,
  );
}

if (fish) {
  await this.inventoryService.addItem(
    user.id,
    fish.id,
    fish.itemCode,
    5,
  );
}

if (potion) {
  await this.inventoryService.addItem(
    user.id,
    potion.id,
    potion.itemCode,
    3,
  );
}
    }

    const pets = await this.petRepository.find({
      where: {
        ownerId: user.id,
      },
    });

    return {
      success: true,
      isNewUser,
      token: this.jwtService.sign({
  sub: user.id,
  openid: user.openid,
}),
      user,
      pets,
    };
  }
}