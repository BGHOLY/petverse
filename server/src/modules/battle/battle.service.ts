import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Battle } from './battle.entity';
import { PetService } from '../pet/pet.service';

@Injectable()
export class BattleService {
  constructor(
    @InjectRepository(Battle)
    private readonly battleRepository: Repository<Battle>,
    private readonly petService: PetService,
  ) {}

  async startBattle(
    userId: number,
    myPetId: number,
    targetPetId: number,
  ) {
    const myPet =
      await this.petService.getPetById(myPetId);

    const targetPet =
      await this.petService.getPetById(targetPetId);

    if (!myPet || !targetPet) {
      return {
        success: false,
        message: '宠物不存在',
      };
    }

    if (myPet.ownerId !== userId) {
      return {
        success: false,
        message: '只能操作自己的宠物',
      };
    }

    const myPower =
      myPet.attack +
      myPet.defense +
      myPet.level * 5 +
      myPet.rarity * 10;

    const targetPower =
      targetPet.attack +
      targetPet.defense +
      targetPet.level * 5 +
      targetPet.rarity * 10;

    const winner =
      myPower >= targetPower
        ? myPet
        : targetPet;

    const battle =
      this.battleRepository.create({
        attackerUserId: userId,
        attackerPetId: myPet.id,
        defenderUserId:
          targetPet.ownerId,
        defenderPetId:
          targetPet.id,
        winnerPetId: winner.id,
        finished: true,
        battleLog:
          `${myPet.nickname} VS ${targetPet.nickname}`,
      });

    const saved =
      await this.battleRepository.save(
        battle,
      );

    return {
      success: true,
      battle: saved,
      winner,
    };
  }
}