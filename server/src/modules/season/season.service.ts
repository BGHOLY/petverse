
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import {
  Mail,
  MailAttachment,
} from '../mail/mail.entity';
import { Pet } from '../pet/pet.entity';
import { RankingSnapshot } from '../ranking/ranking-snapshot.entity';
import { calculatePetPower } from '../ranking/utils/pet-power.util';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { SeasonPlayer } from './season-player.entity';
import { Season } from './season.entity';

@Injectable()
export class SeasonService {
  constructor(
    @InjectRepository(Season)
    private readonly seasonRepository: Repository<Season>,

    @InjectRepository(SeasonPlayer)
    private readonly playerRepository: Repository<SeasonPlayer>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(TowerRecord)
    private readonly towerRepository: Repository<TowerRecord>,

    private readonly dataSource: DataSource,
  ) {}

  async ensureCurrentSeason() {
    const now = new Date();
    const seasonCode = this.getSeasonCode(now);
    let season = await this.seasonRepository.findOne({
      where: { seasonCode },
    });

    if (!season) {
      const startAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          1,
          0,
          0,
          0,
        ),
      );
      const endAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          1,
          0,
          0,
          0,
        ) - 1,
      );

      season = this.seasonRepository.create({
        seasonCode,
        name: `${now.getUTCFullYear()}年${
          now.getUTCMonth() + 1
        }月赛季`,
        status: 'active',
        startAt,
        endAt,
        settlementStatus: 'pending',
        settlementRequestId: '',
        settledAt: null,
        config: {
          initialRating: 1000,
          winPoints: 30,
          lossPoints: 10,
          version: '2.2.0',
        },
      });
      season = await this.seasonRepository.save(
        season,
      );
    }

    return season;
  }

  async getCurrentSeason() {
    const season = await this.ensureCurrentSeason();
    return {
      success: true,
      season: this.toSeasonView(season),
      data: this.toSeasonView(season),
    };
  }

  async getMySeason(userId: number) {
    const season = await this.ensureCurrentSeason();
    const player = await this.ensurePlayer(
      season.seasonCode,
      userId,
    );
    const synced = await this.syncPlayerScores(
      userId,
      season.seasonCode,
    );

    return {
      success: true,
      season: this.toSeasonView(season),
      player: synced.player || player,
      data: {
        season: this.toSeasonView(season),
        player: synced.player || player,
      },
    };
  }

  async recordBattle(
    userId: number,
    result: 'win' | 'lose' | 'draw',
    opponentRating = 1000,
  ) {
    const season = await this.ensureCurrentSeason();
    if (
      season.status !== 'active' ||
      season.settlementStatus === 'settled'
    ) {
      return {
        success: false,
        message: 'Current season is not active',
      };
    }

    const player = await this.ensurePlayer(
      season.seasonCode,
      userId,
    );
    const oldRating = Number(player.rating || 1000);
    const expected =
      1 /
      (1 +
        Math.pow(
          10,
          (Number(opponentRating || 1000) -
            oldRating) /
            400,
        ));
    const actual =
      result === 'win'
        ? 1
        : result === 'draw'
          ? 0.5
          : 0;
    const delta = Math.round(
      32 * (actual - expected),
    );

    player.rating = Math.max(
      0,
      oldRating + delta,
    );
    if (result === 'win') {
      player.wins += 1;
      player.points += 30;
    } else if (result === 'draw') {
      player.draws += 1;
      player.points += 15;
    } else {
      player.losses += 1;
      player.points += 10;
    }

    const saved = await this.playerRepository.save(
      player,
    );
    return {
      success: true,
      seasonCode: season.seasonCode,
      result,
      ratingBefore: oldRating,
      ratingDelta: delta,
      ratingAfter: saved.rating,
      player: saved,
    };
  }

  async syncPlayerScores(
    userId: number,
    forcedSeasonCode = '',
  ) {
    const season = forcedSeasonCode
      ? await this.seasonRepository.findOne({
          where: {
            seasonCode: forcedSeasonCode,
          },
        })
      : await this.ensureCurrentSeason();
    if (!season) {
      return {
        success: false,
        message: 'Season not found',
      };
    }

    const player = await this.ensurePlayer(
      season.seasonCode,
      userId,
    );
    const [pets, tower] = await Promise.all([
      this.petRepository.find({
        where: {
          ownerId: userId,
          isEgg: false,
        },
      }),
      this.towerRepository.findOne({
        where: { userId },
      }),
    ]);

    player.powerScore = pets.reduce(
      (max, pet) =>
        Math.max(max, calculatePetPower(pet)),
      0,
    );
    player.towerScore = Number(
      tower?.maxFloor || 0,
    );
    player.snapshot = {
      petCount: pets.length,
      strongestPetId:
        pets
          .slice()
          .sort(
            (a, b) =>
              calculatePetPower(b) -
              calculatePetPower(a),
          )[0]?.id || 0,
      syncedAt: new Date().toISOString(),
    };

    const saved = await this.playerRepository.save(
      player,
    );
    return {
      success: true,
      seasonCode: season.seasonCode,
      player: saved,
    };
  }

  async getLeaderboard() {
    const season = await this.ensureCurrentSeason();
    const players = await this.playerRepository.find({
      where: {
        seasonCode: season.seasonCode,
      },
    });
    const users = await this.userRepository.find();
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    const sorted = players
      .slice()
      .sort((a, b) => this.comparePlayers(a, b))
      .map((player, index) => ({
        rank:
          player.rank > 0 &&
          season.settlementStatus === 'settled'
            ? player.rank
            : index + 1,
        userId: player.userId,
        nickname:
          userMap.get(player.userId)?.nickname ||
          `Player ${player.userId}`,
        rating: player.rating,
        points: player.points,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
        towerScore: player.towerScore,
        powerScore: player.powerScore,
        rewardTier: player.rewardTier,
      }));

    return {
      success: true,
      season: this.toSeasonView(season),
      leaderboard: sorted,
      data: sorted,
    };
  }

  async settleCurrentSeason(
    force = false,
    rawRequestId = '',
  ) {
    const season = await this.ensureCurrentSeason();
    const requestId =
      String(rawRequestId || '').trim().slice(0, 80) ||
      `season-settle-${season.seasonCode}`;

    if (season.settlementStatus === 'settled') {
      return {
        success: true,
        duplicate: true,
        requestId:
          season.settlementRequestId || requestId,
        season: this.toSeasonView(season),
        leaderboard:
          (await this.getLeaderboard())
            .leaderboard,
      };
    }

    if (
      !force &&
      new Date(season.endAt).getTime() >
        Date.now()
    ) {
      return {
        success: false,
        message:
          'Season has not ended. Use force=true only during beta verification.',
        season: this.toSeasonView(season),
      };
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const seasonRepository =
              manager.getRepository(Season);
            const playerRepository =
              manager.getRepository(SeasonPlayer);
            const userRepository =
              manager.getRepository(User);
            const petRepository =
              manager.getRepository(Pet);
            const towerRepository =
              manager.getRepository(TowerRecord);
            const mailRepository =
              manager.getRepository(Mail);
            const snapshotRepository =
              manager.getRepository(
                RankingSnapshot,
              );

            const locked =
              await seasonRepository.findOne({
                where: {
                  id: season.id,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (!locked) {
              throw new Error('Season not found');
            }
            if (
              locked.settlementStatus ===
              'settled'
            ) {
              return {
                duplicate: true,
                season: locked,
                players:
                  await playerRepository.find({
                    where: {
                      seasonCode:
                        locked.seasonCode,
                    },
                  }),
              };
            }

            const [
              users,
              allPets,
              towerRecords,
              existingPlayers,
            ] = await Promise.all([
              userRepository.find(),
              petRepository.find({
                where: { isEgg: false },
              }),
              towerRepository.find(),
              playerRepository.find({
                where: {
                  seasonCode:
                    locked.seasonCode,
                },
              }),
            ]);

            const petGroups = new Map<
              number,
              Pet[]
            >();
            for (const pet of allPets) {
              const list =
                petGroups.get(pet.ownerId) || [];
              list.push(pet);
              petGroups.set(pet.ownerId, list);
            }
            const towerMap = new Map(
              towerRecords.map((record) => [
                record.userId,
                record,
              ]),
            );
            const playerMap = new Map(
              existingPlayers.map((player) => [
                player.userId,
                player,
              ]),
            );

            const players: SeasonPlayer[] = [];
            for (const user of users) {
              let player =
                playerMap.get(user.id);
              if (!player) {
                player = playerRepository.create({
                  seasonCode:
                    locked.seasonCode,
                  userId: user.id,
                  rating: 1000,
                  wins: 0,
                  losses: 0,
                  draws: 0,
                  points: 0,
                  towerScore: 0,
                  powerScore: 0,
                  rank: 0,
                  rewardTier: 'unranked',
                  rewardIssued: false,
                  rewardMailId: 0,
                  snapshot: {},
                });
              }

              const pets =
                petGroups.get(user.id) || [];
              player.powerScore = pets.reduce(
                (max, pet) =>
                  Math.max(
                    max,
                    calculatePetPower(pet),
                  ),
                0,
              );
              player.towerScore = Number(
                towerMap.get(user.id)
                  ?.maxFloor || 0,
              );
              player.snapshot = {
                petCount: pets.length,
                strongestPetId:
                  pets
                    .slice()
                    .sort(
                      (a, b) =>
                        calculatePetPower(b) -
                        calculatePetPower(a),
                    )[0]?.id || 0,
                settledAt:
                  new Date().toISOString(),
              };
              players.push(player);
            }

            players.sort((a, b) =>
              this.comparePlayers(a, b),
            );

            await snapshotRepository.delete({
              seasonCode:
                locked.seasonCode,
              rankingType: 'season',
            });

            const snapshots:
              RankingSnapshot[] = [];
            const mails: Mail[] = [];

            for (
              let index = 0;
              index < players.length;
              index += 1
            ) {
              const player = players[index];
              player.rank = index + 1;
              const reward =
                this.getSettlementReward(
                  player.rank,
                  players.length,
                );
              player.rewardTier =
                reward.tier;

              if (!player.rewardIssued) {
                const mail =
                  mailRepository.create({
                    userId: player.userId,
                    title: `${locked.name}结算奖励`,
                    content: `你的最终排名为第${player.rank}名，奖励已附在邮件中。`,
                    rewardType: '',
                    rewardValue: '',
                    attachments:
                      reward.attachments,
                    sourceType: 'season',
                    sourceId: `${locked.seasonCode}:${player.userId}`,
                    claimed: false,
                    readed: false,
                    claimRequestId: '',
                    claimedAt: null,
                    expiresAt: new Date(
                      Date.now() +
                        30 *
                          24 *
                          60 *
                          60 *
                          1000,
                    ),
                  });
                mails.push(mail);
              }

              snapshots.push(
                snapshotRepository.create({
                  seasonCode:
                    locked.seasonCode,
                  rankingType: 'season',
                  userId: player.userId,
                  petId: Number(
                    player.snapshot
                      ?.strongestPetId || 0,
                  ),
                  rank: player.rank,
                  score:
                    player.rating * 1000000 +
                    player.points * 1000 +
                    player.towerScore,
                  snapshotData: {
                    rating: player.rating,
                    points: player.points,
                    wins: player.wins,
                    losses: player.losses,
                    draws: player.draws,
                    towerScore:
                      player.towerScore,
                    powerScore:
                      player.powerScore,
                    rewardTier:
                      player.rewardTier,
                  },
                }),
              );
            }

            const savedMails = mails.length
              ? await mailRepository.save(mails)
              : [];
            const mailMap = new Map(
              savedMails.map((mail) => [
                mail.userId,
                mail.id,
              ]),
            );
            for (const player of players) {
              if (!player.rewardIssued) {
                player.rewardIssued = true;
                player.rewardMailId = Number(
                  mailMap.get(player.userId) || 0,
                );
              }
            }

            if (players.length) {
              await playerRepository.save(
                players,
              );
            }
            if (snapshots.length) {
              await snapshotRepository.save(
                snapshots,
              );
            }

            locked.status = 'settled';
            locked.settlementStatus =
              'settled';
            locked.settlementRequestId =
              requestId;
            locked.settledAt = new Date();
            const savedSeason =
              await seasonRepository.save(
                locked,
              );

            return {
              duplicate: false,
              season: savedSeason,
              players,
            };
          },
        );

      const users =
        await this.userRepository.find();
      const userMap = new Map(
        users.map((user) => [user.id, user]),
      );
      const leaderboard = result.players
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((player) => ({
          rank: player.rank,
          userId: player.userId,
          nickname:
            userMap.get(player.userId)
              ?.nickname ||
            `Player ${player.userId}`,
          rating: player.rating,
          points: player.points,
          towerScore: player.towerScore,
          powerScore: player.powerScore,
          rewardTier: player.rewardTier,
          rewardMailId:
            player.rewardMailId,
        }));

      return {
        success: true,
        message: result.duplicate
          ? 'Season was already settled'
          : 'Season settlement completed',
        duplicate: result.duplicate,
        requestId,
        season: this.toSeasonView(
          result.season,
        ),
        leaderboard,
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Season settlement failed',
        ),
        requestId,
      };
    }
  }

  private async ensurePlayer(
    seasonCode: string,
    userId: number,
  ) {
    let player =
      await this.playerRepository.findOne({
        where: {
          seasonCode,
          userId,
        },
      });
    if (!player) {
      player = this.playerRepository.create({
        seasonCode,
        userId,
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        towerScore: 0,
        powerScore: 0,
        rank: 0,
        rewardTier: 'unranked',
        rewardIssued: false,
        rewardMailId: 0,
        snapshot: {},
      });
      player =
        await this.playerRepository.save(
          player,
        );
    }
    return player;
  }

  private comparePlayers(
    a: SeasonPlayer,
    b: SeasonPlayer,
  ) {
    return (
      Number(b.rating || 0) -
        Number(a.rating || 0) ||
      Number(b.points || 0) -
        Number(a.points || 0) ||
      Number(b.towerScore || 0) -
        Number(a.towerScore || 0) ||
      Number(b.powerScore || 0) -
        Number(a.powerScore || 0) ||
      Number(a.userId || 0) -
        Number(b.userId || 0)
    );
  }

  private getSettlementReward(
    rank: number,
    total: number,
  ) {
    let tier = 'participant';
    let attachments: MailAttachment[] = [
      { type: 'gold', quantity: 500 },
      {
        type: 'item',
        itemCode: 'season_token',
        quantity: 5,
      },
    ];

    if (rank === 1) {
      tier = 'champion';
      attachments = [
        { type: 'gold', quantity: 10000 },
        { type: 'diamond', quantity: 300 },
        {
          type: 'item',
          itemCode: 'season_token',
          quantity: 100,
        },
      ];
    } else if (rank <= 3) {
      tier = 'top3';
      attachments = [
        { type: 'gold', quantity: 6000 },
        { type: 'diamond', quantity: 150 },
        {
          type: 'item',
          itemCode: 'season_token',
          quantity: 60,
        },
      ];
    } else if (rank <= 10) {
      tier = 'top10';
      attachments = [
        { type: 'gold', quantity: 3000 },
        { type: 'diamond', quantity: 80 },
        {
          type: 'item',
          itemCode: 'season_token',
          quantity: 30,
        },
      ];
    } else if (
      rank <= 50 ||
      rank <= Math.ceil(total * 0.2)
    ) {
      tier = 'top20percent';
      attachments = [
        { type: 'gold', quantity: 1500 },
        { type: 'diamond', quantity: 30 },
        {
          type: 'item',
          itemCode: 'season_token',
          quantity: 15,
        },
      ];
    }

    return {
      tier,
      attachments,
    };
  }

  private getSeasonCode(date: Date) {
    return `S${date.getUTCFullYear()}${String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
  }

  private toSeasonView(season: Season) {
    const now = Date.now();
    const end = new Date(
      season.endAt,
    ).getTime();
    return {
      ...season,
      remainingSeconds: Math.max(
        0,
        Math.ceil((end - now) / 1000),
      ),
      canSettle:
        season.settlementStatus !==
          'settled' && end <= now,
    };
  }
}
