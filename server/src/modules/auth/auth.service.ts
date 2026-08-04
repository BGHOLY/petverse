import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/user.entity';
import { Pet } from '../pet/pet.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { InventoryService } from '../inventory/inventory.service';
import { ItemService } from '../item/item.service';
import { PetService } from '../pet/pet.service';
import { resolveLoginIdentity } from './wechat-login';
import {
  STARTER_INVENTORY,
  STARTER_TEAM,
  STARTER_TEAM_SOURCE,
} from './starter-team.config';

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
    private readonly petService: PetService,
  ) {}

  async login(loginDto: LoginDto) {
    const identity = await resolveLoginIdentity(loginDto);
    let user = await this.userRepository.findOne({
      where: {
        openid: identity.openid,
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      user = this.userRepository.create({
        openid: identity.openid,
        unionid: identity.unionid,
        nickname: loginDto.nickname || 'PetVerse玩家',
        avatar: loginDto.avatar || '',
        level: 1,
        vipLevel: 0,
        exp: 0,
        gold: 1000,
        diamond: 100,
      });

      user = await this.userRepository.save(user);
    } else if (identity.unionid && user.unionid !== identity.unionid) {
      user.unionid = identity.unionid;
      user = await this.userRepository.save(user);
    }

    const starterRosterCreated = await this.ensureStarterTeam(
      user.id,
      isNewUser,
    );
    if (starterRosterCreated) {
      await this.grantStarterInventory(user.id);
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

  private async ensureStarterTeam(userId: number, isNewUser: boolean) {
    const pets = await this.petRepository.find({ where: { ownerId: userId } });
    const starterPets = pets.filter(
      (pet) => pet.sourceType === STARTER_TEAM_SOURCE,
    );
    const shouldCreate =
      isNewUser ||
      pets.length === 0 ||
      (starterPets.length > 0 && starterPets.length < STARTER_TEAM.length);
    if (!shouldCreate) return false;

    const existingSpecies = new Set(
      starterPets.map((pet) => String(pet.speciesCode || '')),
    );
    for (const profile of STARTER_TEAM.filter(
      (item) => !existingSpecies.has(item.speciesCode),
    )) {
      await this.petService.createPet(userId, {
        nickname: profile.nickname,
        speciesCode: profile.speciesCode,
        rarity: profile.rarity,
        skillSlotCount: profile.skillSlotCount,
        isLocked: true,
        isFavorite: Boolean(profile.isFavorite),
        sourceType: STARTER_TEAM_SOURCE,
      });
    }
    return true;
  }

  private async grantStarterInventory(userId: number) {
    await this.itemService.ensureSeeded();
    for (const [itemCode, quantity] of Object.entries(STARTER_INVENTORY)) {
      await this.inventoryService.ensureItemQuantity(
        userId,
        itemCode,
        quantity,
      );
    }
  }
}
