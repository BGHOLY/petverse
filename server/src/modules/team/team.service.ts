import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetTeam } from './pet-team.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(PetTeam)
    private readonly teamRepository: Repository<PetTeam>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async getTeam(userId = DEFAULT_USER_ID) {
    let team = await this.teamRepository.findOne({
      where: { userId },
    });

    if (!team) {
      const firstPets = await this.petRepository.find({
        where: {
          ownerId: userId,
          isEgg: false,
        },
        order: { id: 'ASC' },
        take: 3,
      });
      team = this.teamRepository.create({
        userId,
        name: 'default',
        petIds: firstPets.map((pet) => pet.id),
        version: '2.1.0',
      });
      team = await this.teamRepository.save(team);
    }

    const petIds = this.normalizePetIds(team.petIds);
    const pets = petIds.length
      ? await this.petRepository.find({
          where: {
            id: In(petIds),
            ownerId: userId,
            isEgg: false,
          },
        })
      : [];
    const petMap = new Map(pets.map((pet) => [pet.id, pet]));
    const orderedPets = petIds
      .map((id) => petMap.get(id))
      .filter(Boolean) as Pet[];

    if (
      orderedPets.length !== petIds.length ||
      JSON.stringify(team.petIds || []) !==
        JSON.stringify(orderedPets.map((pet) => pet.id))
    ) {
      team.petIds = orderedPets.map((pet) => pet.id);
      await this.teamRepository.save(team);
    }

    return {
      success: true,
      team,
      petIds: orderedPets.map((pet) => pet.id),
      pets: orderedPets,
      data: {
        team,
        pets: orderedPets,
      },
    };
  }

  async setTeam(userId: number, rawPetIds: number[]) {
    const petIds = this.normalizePetIds(rawPetIds);
    if (!petIds.length || petIds.length > 3) {
      return {
        success: false,
        message: 'Team must contain 1 to 3 unique pets',
      };
    }

    const pets = await this.petRepository.find({
      where: {
        id: In(petIds),
        ownerId: userId,
        isEgg: false,
      },
    });
    if (pets.length !== petIds.length) {
      return {
        success: false,
        message: 'One or more team pets are invalid',
      };
    }

    let team = await this.teamRepository.findOne({
      where: { userId },
    });
    if (!team) {
      team = this.teamRepository.create({
        userId,
        name: 'default',
        petIds,
        version: '2.1.0',
      });
    } else {
      team.petIds = petIds;
      team.version = '2.1.0';
    }
    team = await this.teamRepository.save(team);

    const petMap = new Map(pets.map((pet) => [pet.id, pet]));
    const orderedPets = petIds.map((id) => petMap.get(id));

    return {
      success: true,
      message: 'Team updated',
      team,
      pets: orderedPets,
      data: {
        team,
        pets: orderedPets,
      },
    };
  }

  async containsPet(userId: number, petId: number) {
    const team = await this.teamRepository.findOne({
      where: { userId },
    });
    return this.normalizePetIds(team?.petIds).includes(Number(petId));
  }

  async removePet(userId: number, petId: number) {
    const team = await this.teamRepository.findOne({
      where: { userId },
    });
    if (!team) return null;
    const next = this.normalizePetIds(team.petIds).filter(
      (id) => id !== Number(petId),
    );
    if (next.length === (team.petIds || []).length) return team;
    team.petIds = next;
    return this.teamRepository.save(team);
  }

  private normalizePetIds(rawPetIds: any) {
    return [
      ...new Set(
        (Array.isArray(rawPetIds) ? rawPetIds : [])
          .map((id) => Number(id || 0))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ].slice(0, 3);
  }
}
