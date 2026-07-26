import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { WorldExplorationProgress } from '../exploration/world-exploration.entity';
import { Pet } from '../pet/pet.entity';
import { SeasonService } from '../season/season.service';
import { PetTeam } from '../team/pet-team.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { RankingSnapshot } from './ranking-snapshot.entity';
import { calculatePetPower } from './utils/pet-power.util';

export type RankingType =
  | 'player-level'
  | 'pet-power'
  | 'team-power'
  | 'exploration'
  | 'boss';

export interface RankingPayload {
  success: true;
  type: RankingType;
  updatedAt: string;
  refreshAfterSeconds: number;
  leaderboard: any[];
  myRank: any | null;
  data: any[];
  list: any[];
}

@Injectable()
export class RankingService {
  private readonly cache = new Map<string, { expiresAt: number; value: RankingPayload }>();
  private readonly refreshSeconds = 5;

  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(TowerRecord)
    private readonly towerRecordRepository: Repository<TowerRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PetTeam)
    private readonly teamRepository: Repository<PetTeam>,
    @InjectRepository(WorldExplorationProgress)
    private readonly explorationRepository: Repository<WorldExplorationProgress>,
    @InjectRepository(BattleSessionV10)
    private readonly battleRepository: Repository<BattleSessionV10>,
    @InjectRepository(RankingSnapshot)
    private readonly snapshotRepository: Repository<RankingSnapshot>,
    private readonly seasonService: SeasonService,
  ) {}

  async getMainRanking(userId = 0) {
    const [playerLevel, petPower, teamPower, exploration, boss] = await Promise.all([
      this.getRanking('player-level', userId),
      this.getRanking('pet-power', userId),
      this.getRanking('team-power', userId),
      this.getRanking('exploration', userId),
      this.getRanking('boss', userId),
    ]);
    return {
      success: true,
      playerLevel,
      petPower,
      teamPower,
      exploration,
      boss,
      list: petPower.leaderboard,
      data: petPower.leaderboard,
    };
  }

  async getRanking(type: RankingType, userId = 0, force = false): Promise<RankingPayload> {
    const cacheKey = `${type}:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

    const all = await this.buildRanking(type);
    const leaderboard = all.slice(0, 50);
    const myRank = userId > 0
      ? all.find((entry) => Number(entry.userId) === Number(userId)) || null
      : null;
    const value: RankingPayload = {
      success: true,
      type,
      updatedAt: new Date().toISOString(),
      refreshAfterSeconds: this.refreshSeconds,
      leaderboard,
      myRank,
      data: leaderboard,
      list: leaderboard,
    };
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.refreshSeconds * 1000,
      value,
    });
    return value;
  }

  async getTowerRanking() {
    const records = await this.towerRecordRepository.find({
      order: { maxFloor: 'DESC', totalRewardGold: 'DESC', userId: 'ASC' },
      take: 50,
    });
    const users = await this.userMap();
    return records.map((record, index) => ({
      rank: index + 1,
      userId: record.userId,
      playerName: users.get(record.userId)?.nickname || `Player ${record.userId}`,
      highestTower: record.maxFloor,
      maxFloor: record.maxFloor,
      totalRewardGold: record.totalRewardGold,
      score: Number(record.maxFloor || 0) * 100000 + Number(record.totalRewardGold || 0),
    }));
  }

  /** Backward-compatible legacy endpoint: pet level ranking. */
  async getLevelRanking() {
    const pets = await this.petRepository.find({ where: { isEgg: false } });
    return (await this.decoratePets(pets))
      .sort((a, b) => b.level - a.level || b.power - a.power || a.petId - b.petId)
      .slice(0, 50)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /** Backward-compatible legacy endpoint: pet power ranking. */
  async getPowerRanking() {
    return (await this.getRanking('pet-power')).leaderboard;
  }

  async getSeasonRanking() {
    return this.seasonService.getLeaderboard();
  }

  async getSettlementSnapshots() {
    const seasonResult = await this.seasonService.getCurrentSeason();
    const seasonCode = seasonResult.season.seasonCode;
    const snapshots = await this.snapshotRepository.find({
      where: { seasonCode },
      order: { rankingType: 'ASC', rank: 'ASC' },
    });
    return { success: true, seasonCode, snapshots, data: snapshots };
  }

  private async buildRanking(type: RankingType) {
    if (type === 'player-level') return this.playerLevelRanking();
    if (type === 'pet-power') return this.petPowerRanking();
    if (type === 'team-power') return this.teamPowerRanking();
    if (type === 'exploration') return this.explorationRanking();
    return this.bossRanking();
  }

  private async playerLevelRanking() {
    const users = await this.userRepository.find();
    return users
      .map((user) => ({
        userId: user.id,
        playerName: user.nickname || `Player ${user.id}`,
        level: Number(user.level || 1),
        exp: Number(user.exp || 0),
        score: Number(user.level || 1) * 1000000 + Number(user.exp || 0),
      }))
      .sort((a, b) => b.level - a.level || b.exp - a.exp || a.userId - b.userId)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async petPowerRanking() {
    const pets = await this.petRepository.find({ where: { isEgg: false } });
    return (await this.decoratePets(pets))
      .sort((a, b) => b.power - a.power || b.level - a.level || a.petId - b.petId)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async teamPowerRanking() {
    const [teams, users] = await Promise.all([
      this.teamRepository.find(),
      this.userMap(),
    ]);
    const petIds = [...new Set(teams.flatMap((team) =>
      (Array.isArray(team.petIds) ? team.petIds : []).map(Number).filter((id) => id > 0),
    ))];
    const pets = petIds.length
      ? await this.petRepository.find({ where: { id: In(petIds), isEgg: false } })
      : [];
    const petMap = new Map(pets.map((pet) => [pet.id, pet]));
    return teams
      .map((team) => {
        const ordered = (Array.isArray(team.petIds) ? team.petIds : [])
          .map((id) => petMap.get(Number(id)))
          .filter(Boolean) as Pet[];
        const power = ordered.reduce((sum, pet) => sum + calculatePetPower(pet), 0);
        return {
          userId: team.userId,
          playerName: users.get(team.userId)?.nickname || `Player ${team.userId}`,
          teamName: team.name,
          formationCode: team.formationCode,
          petCount: ordered.length,
          petIds: ordered.map((pet) => pet.id),
          power,
          score: power,
        };
      })
      .sort((a, b) => b.power - a.power || b.petCount - a.petCount || a.userId - b.userId)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async explorationRanking() {
    const [records, users] = await Promise.all([
      this.explorationRepository.find(),
      this.userMap(),
    ]);
    return records
      .map((record) => {
        const states = Object.values(record.regions || {}) as any[];
        const exploration = states.reduce((sum, state) => sum + Number(state?.exploration || 0), 0);
        const clearedStages = states.reduce(
          (sum, state) => sum + (Array.isArray(state?.clearedStages) ? state.clearedStages.length : 0),
          0,
        );
        const completedRegions = states.filter((state) => Number(state?.exploration || 0) >= 100).length;
        return {
          userId: record.userId,
          playerName: users.get(record.userId)?.nickname || `Player ${record.userId}`,
          exploration,
          completedRegions,
          clearedStages,
          score: exploration * 100 + clearedStages,
        };
      })
      .sort((a, b) =>
        b.exploration - a.exploration ||
        b.clearedStages - a.clearedStages ||
        a.userId - b.userId,
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async bossRanking() {
    const [records, users, battles] = await Promise.all([
      this.explorationRepository.find(),
      this.userMap(),
      this.battleRepository.find({ where: { bossBattle: true, winnerSide: 'left' } }),
    ]);
    const firstClearAt = new Map<number, number>();
    for (const battle of battles) {
      const timestamp = new Date(battle.finishedAt || battle.createdAt).getTime();
      const current = firstClearAt.get(battle.userId);
      if (!current || timestamp < current) firstClearAt.set(battle.userId, timestamp);
    }
    return records
      .map((record) => {
        const states = Object.values(record.regions || {}) as any[];
        const bossClears = states.filter((state) => Boolean(state?.bossCleared)).length;
        const bossWins = states.reduce((sum, state) => sum + Number(state?.bossWins || 0), 0);
        return {
          userId: record.userId,
          playerName: users.get(record.userId)?.nickname || `Player ${record.userId}`,
          bossClears,
          bossWins,
          firstClearAt: firstClearAt.get(record.userId) || 0,
          score: bossClears * 100000 + bossWins,
        };
      })
      .sort((a, b) =>
        b.bossClears - a.bossClears ||
        b.bossWins - a.bossWins ||
        (a.firstClearAt || Number.MAX_SAFE_INTEGER) - (b.firstClearAt || Number.MAX_SAFE_INTEGER) ||
        a.userId - b.userId,
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  private async decoratePets(pets: Pet[]) {
    const users = await this.userMap();
    return pets.map((pet) => ({
      userId: pet.ownerId,
      petId: pet.id,
      playerName: users.get(pet.ownerId)?.nickname || `Player ${pet.ownerId}`,
      petName: pet.nickname,
      species: pet.species,
      speciesCode: pet.speciesCode,
      isMutant: pet.isMutant,
      level: Number(pet.level || 1),
      rarity: pet.rarity,
      rarityName: pet.rarityName,
      growth: pet.growth,
      skillSlotCount: pet.skillSlotCount,
      specialSkillCount: pet.specialSkillCount,
      power: calculatePetPower(pet),
      score: calculatePetPower(pet),
    }));
  }

  private async userMap() {
    const users = await this.userRepository.find();
    return new Map(users.map((user) => [user.id, user]));
  }
}
