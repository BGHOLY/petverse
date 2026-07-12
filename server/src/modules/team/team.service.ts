import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { getFormationConfig } from '../formation/formation.config';
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
    let team = await this.teamRepository.findOne({ where: { userId } });
    if (!team) {
      const firstPets = await this.petRepository.find({
        where: { ownerId: userId, isEgg: false },
        order: { id: 'ASC' },
        take: 5,
      });
      team = await this.teamRepository.save(this.teamRepository.create({
        userId,
        name: 'default',
        petIds: firstPets.map((pet) => pet.id),
        formationCode: 'dragon',
        slotAssignments: firstPets.map((pet) => pet.id),
        tactics: this.defaultTactics(),
        version: '10.0.0',
      }));
    }

    const petIds = this.normalizePetIds(team.petIds);
    const pets = petIds.length
      ? await this.petRepository.find({
          where: { id: In(petIds), ownerId: userId, isEgg: false },
        })
      : [];
    const petMap = new Map(pets.map((pet) => [pet.id, pet]));
    const orderedPets = petIds.map((id) => petMap.get(id)).filter(Boolean) as Pet[];
    const formationCode = getFormationConfig(team.formationCode).code;
    const slotAssignments = this.normalizeSlots(team.slotAssignments, orderedPets.map((pet) => pet.id));
    const tactics = this.normalizeTactics(team.tactics);

    const changed =
      orderedPets.length !== petIds.length ||
      JSON.stringify(team.petIds || []) !== JSON.stringify(orderedPets.map((pet) => pet.id)) ||
      team.formationCode !== formationCode ||
      JSON.stringify(team.slotAssignments || []) !== JSON.stringify(slotAssignments) ||
      JSON.stringify(team.tactics || {}) !== JSON.stringify(tactics) ||
      team.version !== '10.0.0';

    if (changed) {
      team.petIds = orderedPets.map((pet) => pet.id);
      team.formationCode = formationCode;
      team.slotAssignments = slotAssignments;
      team.tactics = tactics;
      team.version = '10.0.0';
      await this.teamRepository.save(team);
    }

    return {
      success: true,
      team,
      petIds: orderedPets.map((pet) => pet.id),
      pets: orderedPets,
      formationCode,
      slotAssignments,
      tactics,
      data: { team, pets: orderedPets, formationCode, slotAssignments, tactics },
    };
  }

  async setTeam(
    userId: number,
    rawPetIds: number[],
    rawFormationCode?: string,
    rawSlotAssignments?: number[],
    rawTactics?: Record<string, any>,
  ) {
    const petIds = this.normalizePetIds(rawPetIds);
    if (!petIds.length || petIds.length > 5) {
      return { success: false, message: 'Team must contain 1 to 5 unique pets' };
    }

    const pets = await this.petRepository.find({
      where: { id: In(petIds), ownerId: userId, isEgg: false },
    });
    if (pets.length !== petIds.length) {
      return { success: false, message: 'One or more team pets are invalid' };
    }
    if (pets.some((pet) => pet.tradeStatus === 'listed' || Number(pet.tradeListingId || 0) > 0)) {
      return { success: false, message: 'Listed pets cannot join the active team' };
    }

    let team = await this.teamRepository.findOne({ where: { userId } });
    const formationCode = getFormationConfig(rawFormationCode || team?.formationCode).code;
    const slotAssignments = this.normalizeSlots(rawSlotAssignments, petIds);
    const tactics = this.normalizeTactics(rawTactics || team?.tactics);
    if (!team) {
      team = this.teamRepository.create({ userId, name: 'default' } as PetTeam);
    }
    team.petIds = petIds;
    team.formationCode = formationCode;
    team.slotAssignments = slotAssignments;
    team.tactics = tactics;
    team.version = '10.0.0';
    team = await this.teamRepository.save(team);

    const petMap = new Map(pets.map((pet) => [pet.id, pet]));
    const orderedPets = petIds.map((id) => petMap.get(id));
    return {
      success: true,
      message: 'Five-pet team updated',
      team,
      pets: orderedPets,
      formationCode,
      slotAssignments,
      tactics,
      data: { team, pets: orderedPets, formationCode, slotAssignments, tactics },
    };
  }

  async setFormation(userId: number, formationCode: string, slotAssignments?: number[]) {
    const current = await this.getTeam(userId);
    return this.setTeam(
      userId,
      current.petIds,
      formationCode,
      slotAssignments || current.slotAssignments,
      current.tactics,
    );
  }

  async setTactics(userId: number, tactics: Record<string, any>) {
    const current = await this.getTeam(userId);
    return this.setTeam(
      userId,
      current.petIds,
      current.formationCode,
      current.slotAssignments,
      tactics,
    );
  }

  async containsPet(userId: number, petId: number) {
    const team = await this.teamRepository.findOne({ where: { userId } });
    return this.normalizePetIds(team?.petIds).includes(Number(petId));
  }

  async removePet(userId: number, petId: number) {
    const team = await this.teamRepository.findOne({ where: { userId } });
    if (!team) return null;
    const next = this.normalizePetIds(team.petIds).filter((id) => id !== Number(petId));
    if (next.length === (team.petIds || []).length) return team;
    team.petIds = next;
    team.slotAssignments = this.normalizeSlots(team.slotAssignments, next);
    return this.teamRepository.save(team);
  }

  private normalizePetIds(rawPetIds: any) {
    return [...new Set((Array.isArray(rawPetIds) ? rawPetIds : [])
      .map((id) => Number(id || 0))
      .filter((id) => Number.isInteger(id) && id > 0))].slice(0, 5);
  }

  private normalizeSlots(rawSlots: any, petIds: number[]) {
    const allowed = new Set(petIds);
    const result: number[] = [];
    for (const id of Array.isArray(rawSlots) ? rawSlots : []) {
      const value = Number(id || 0);
      if (allowed.has(value) && !result.includes(value)) result.push(value);
    }
    for (const id of petIds) {
      if (!result.includes(id)) result.push(id);
    }
    while (result.length < 5) result.push(0);
    return result.slice(0, 5);
  }

  private normalizeTactics(raw: any) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      focusPriority: ['lowestHp', 'highestDamage', 'healer', 'front', 'random'].includes(source.focusPriority)
        ? source.focusPriority : 'lowestHp',
      guardTarget: ['healer', 'highestPower', 'lowestDefense', 'off'].includes(source.guardTarget)
        ? source.guardTarget : 'healer',
      shieldThreshold: [80, 60, 40, 0].includes(Number(source.shieldThreshold))
        ? Number(source.shieldThreshold) : 60,
      cleansePriority: Array.isArray(source.cleansePriority) && source.cleansePriority.length
        ? source.cleansePriority.slice(0, 4)
        : ['control', 'healBlock', 'dot'],
      ultimatePolicy: ['ready', 'bossPhase', 'lowHp'].includes(source.ultimatePolicy)
        ? source.ultimatePolicy : 'ready',
    };
  }

  private defaultTactics() {
    return this.normalizeTactics({});
  }
}
