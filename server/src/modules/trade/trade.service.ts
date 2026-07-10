
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import {
  EconomyCost,
  EconomyReward,
  EconomyService,
} from '../economy/economy.service';
import { PetCapacityService } from '../pet-capacity/pet-capacity.service';
import { Pet } from '../pet/pet.entity';
import { calculatePetPower } from '../ranking/utils/pet-power.util';
import { PetTeam } from '../team/pet-team.entity';
import { User } from '../user/user.entity';
import { TradeListing } from './trade-listing.entity';
import { TradeRecord } from './trade-record.entity';

const LISTING_FEE_GOLD = 100;
const TAX_RATE = 0.05;
const LISTING_DURATION_MS =
  72 * 60 * 60 * 1000;

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(TradeListing)
    private readonly listingRepository: Repository<TradeListing>,

    @InjectRepository(TradeRecord)
    private readonly recordRepository: Repository<TradeRecord>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(PetTeam)
    private readonly teamRepository: Repository<PetTeam>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly economyService: EconomyService,
    private readonly petCapacityService: PetCapacityService,
    private readonly dataSource: DataSource,
  ) {}

  async getListings() {
    await this.expireOldListings();

    const [listings, users, pets] =
      await Promise.all([
        this.listingRepository.find({
          where: { status: 'active' },
          order: { id: 'DESC' },
          take: 100,
        }),
        this.userRepository.find(),
        this.petRepository.find(),
      ]);
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );
    const petMap = new Map(
      pets.map((pet) => [pet.id, pet]),
    );

    const data = listings
      .map((listing) =>
        this.decorateListing(
          listing,
          petMap.get(listing.petId) || null,
          userMap.get(listing.sellerUserId) ||
            null,
        ),
      )
      .filter((listing) => Boolean(listing.pet));

    return {
      success: true,
      listings: data,
      data,
    };
  }

  async getMyListings(userId: number) {
    await this.expireOldListings();
    const listings =
      await this.listingRepository.find({
        where: {
          sellerUserId: userId,
        },
        order: { id: 'DESC' },
        take: 100,
      });
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
      },
    });
    const petMap = new Map(
      pets.map((pet) => [pet.id, pet]),
    );
    const seller =
      await this.userRepository.findOne({
        where: { id: userId },
      });
    const data = listings.map((listing) =>
      this.decorateListing(
        listing,
        petMap.get(listing.petId) || null,
        seller,
      ),
    );

    return {
      success: true,
      listings: data,
      data,
    };
  }

  async getHistory(userId: number) {
    const records =
      await this.recordRepository.find({
        order: { id: 'DESC' },
        take: 200,
      });
    const data = records.filter(
      (record) =>
        record.sellerUserId === userId ||
        record.buyerUserId === userId,
    );

    return {
      success: true,
      records: data,
      data,
    };
  }

  async listPet(
    userId: number,
    petId: number,
    rawCurrencyType: string,
    rawPrice: number,
    rawRequestId: string,
  ) {
    const currencyType =
      rawCurrencyType === 'diamond'
        ? 'diamond'
        : 'gold';
    let price = 0;
    try {
      price = this.normalizePrice(
        currencyType,
        rawPrice,
      );
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message || 'Invalid trade price',
        ),
      };
    }
    const requestId =
      this.economyService.normalizeRequestId(
        rawRequestId,
        'trade-list',
      );
    const existing =
      await this.listingRepository.findOne({
        where: {
          sellerUserId: userId,
          requestId,
        },
      });
    if (existing) {
      return {
        success: true,
        message: 'Listing already created',
        duplicate: true,
        listing: existing,
        requestId,
      };
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const listingRepository =
              manager.getRepository(
                TradeListing,
              );
            const petRepository =
              manager.getRepository(Pet);
            const teamRepository =
              manager.getRepository(PetTeam);

            const duplicate =
              await listingRepository.findOne({
                where: {
                  sellerUserId: userId,
                  requestId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (duplicate) {
              return {
                duplicate: true,
                listing: duplicate,
              };
            }

            const pet =
              await petRepository.findOne({
                where: {
                  id: petId,
                  ownerId: userId,
                  isEgg: false,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (!pet) {
              throw new Error('Pet not found');
            }
            const team =
              await teamRepository.findOne({
                where: { userId },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            const validation =
              this.validateListingPet(
                pet,
                team,
              );
            if (validation) {
              throw new Error(validation);
            }

            const cost: EconomyCost = {
              gold: LISTING_FEE_GOLD,
            };
            const operation =
              await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType: 'trade_list',
                  requestId,
                  cost,
                  payload: {
                    petId,
                    currencyType,
                    price,
                  },
                },
              );
            await this.economyService.spend(
              manager,
              userId,
              cost,
            );

            let listing =
              listingRepository.create({
                sellerUserId: userId,
                petId: pet.id,
                currencyType,
                price,
                listingFeeGold:
                  LISTING_FEE_GOLD,
                taxRate: TAX_RATE,
                status: 'active',
                buyerUserId: 0,
                requestId,
                buyRequestId: '',
                petSnapshot:
                  this.petSnapshot(pet),
                expiresAt: new Date(
                  Date.now() +
                    LISTING_DURATION_MS,
                ),
                soldAt: null,
                cancelledAt: null,
              });
            listing =
              await listingRepository.save(
                listing,
              );

            pet.tradeStatus = 'listed';
            pet.tradeListingId = listing.id;
            await petRepository.save(pet);

            await this.economyService.completeOperation(
              manager,
              operation,
              {
                listingId: listing.id,
                petId: pet.id,
              },
            );

            return {
              duplicate: false,
              listing,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Listing already created'
          : 'Pet listed for trade',
        duplicate: result.duplicate,
        listing: result.listing,
        requestId,
        wallet:
          await this.economyService.getWallet(
            userId,
          ),
      };
    } catch (error: any) {
      const duplicate =
        await this.listingRepository.findOne({
          where: {
            sellerUserId: userId,
            requestId,
          },
        });
      if (duplicate) {
        return {
          success: true,
          message: 'Listing already created',
          duplicate: true,
          listing: duplicate,
          requestId,
        };
      }
      return {
        success: false,
        message: String(
          error?.message ||
            'Create listing failed',
        ),
        requestId,
        cost: {
          gold: LISTING_FEE_GOLD,
        },
      };
    }
  }

  async cancelListing(
    userId: number,
    listingId: number,
  ) {
    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const listingRepository =
              manager.getRepository(
                TradeListing,
              );
            const petRepository =
              manager.getRepository(Pet);
            const listing =
              await listingRepository.findOne({
                where: {
                  id: listingId,
                  sellerUserId: userId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (!listing) {
              throw new Error(
                'Listing not found',
              );
            }
            if (listing.status === 'cancelled') {
              return {
                duplicate: true,
                listing,
              };
            }
            if (listing.status !== 'active') {
              throw new Error(
                'Only active listings can be cancelled',
              );
            }

            const pet =
              await petRepository.findOne({
                where: {
                  id: listing.petId,
                  ownerId: userId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            listing.status = 'cancelled';
            listing.cancelledAt = new Date();
            await listingRepository.save(
              listing,
            );

            if (pet) {
              pet.tradeStatus = 'none';
              pet.tradeListingId = 0;
              await petRepository.save(pet);
            }

            return {
              duplicate: false,
              listing,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Listing already cancelled'
          : 'Listing cancelled',
        duplicate: result.duplicate,
        listing: result.listing,
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Cancel listing failed',
        ),
      };
    }
  }

  async buyListing(
    buyerUserId: number,
    listingId: number,
    rawRequestId: string,
  ) {
    const requestId =
      this.economyService.normalizeRequestId(
        rawRequestId,
        'trade-buy',
      );
    const existing =
      await this.recordRepository.findOne({
        where: {
          buyerUserId,
          requestId,
        },
      });
    if (existing) {
      return this.buildBoughtResponse(
        existing,
        true,
      );
    }

    await this.expireOldListings();

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const listingRepository =
              manager.getRepository(
                TradeListing,
              );
            const recordRepository =
              manager.getRepository(
                TradeRecord,
              );
            const petRepository =
              manager.getRepository(Pet);

            const duplicate =
              await recordRepository.findOne({
                where: {
                  buyerUserId,
                  requestId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (duplicate) {
              return {
                duplicate: true,
                record: duplicate,
              };
            }

            const listing =
              await listingRepository.findOne({
                where: {
                  id: listingId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (!listing) {
              throw new Error(
                'Listing not found',
              );
            }
            if (listing.status !== 'active') {
              throw new Error(
                'Listing is no longer active',
              );
            }
            if (
              new Date(
                listing.expiresAt,
              ).getTime() <= Date.now()
            ) {
              throw new Error(
                'Listing has expired',
              );
            }
            if (
              listing.sellerUserId ===
              buyerUserId
            ) {
              throw new Error(
                'Cannot buy your own listing',
              );
            }

            const pet =
              await petRepository.findOne({
                where: {
                  id: listing.petId,
                  ownerId:
                    listing.sellerUserId,
                },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            if (
              !pet ||
              pet.tradeStatus !== 'listed' ||
              pet.tradeListingId !==
                listing.id
            ) {
              throw new Error(
                'Listed pet state is invalid',
              );
            }

            await this.petCapacityService.assertCanReceive(
              buyerUserId,
              1,
              manager,
            );

            const buyerCost: EconomyCost =
              listing.currencyType ===
              'diamond'
                ? {
                    diamond:
                      listing.price,
                  }
                : {
                    gold: listing.price,
                  };
            const taxAmount = Math.floor(
              listing.price *
                Number(
                  listing.taxRate ||
                    TAX_RATE,
                ),
            );
            const sellerIncome =
              listing.price - taxAmount;
            const sellerReward: EconomyReward =
              listing.currencyType ===
              'diamond'
                ? {
                    diamond: sellerIncome,
                  }
                : {
                    gold: sellerIncome,
                  };

            const operation =
              await this.economyService.createOperation(
                manager,
                {
                  userId: buyerUserId,
                  operationType: 'trade_buy',
                  requestId,
                  cost: buyerCost,
                  payload: {
                    listingId,
                    petId: pet.id,
                    sellerUserId:
                      listing.sellerUserId,
                  },
                },
              );

            await this.economyService.spend(
              manager,
              buyerUserId,
              buyerCost,
            );
            await this.economyService.grant(
              manager,
              listing.sellerUserId,
              sellerReward,
            );

            const previousOwnerId =
              pet.ownerId;
            pet.ownerId = buyerUserId;
            pet.isLocked = false;
            pet.isFavorite = false;
            pet.tradeStatus = 'none';
            pet.tradeListingId = 0;
            pet.sourceType = 'trade';
            await petRepository.save(pet);

            listing.status = 'sold';
            listing.buyerUserId =
              buyerUserId;
            listing.buyRequestId =
              requestId;
            listing.soldAt = new Date();
            await listingRepository.save(
              listing,
            );

            const record =
              recordRepository.create({
                listingId: listing.id,
                petId: pet.id,
                sellerUserId:
                  previousOwnerId,
                buyerUserId,
                currencyType:
                  listing.currencyType,
                price: listing.price,
                taxAmount,
                sellerIncome,
                requestId,
                petSnapshot:
                  listing.petSnapshot ||
                  this.petSnapshot(pet),
              });
            const savedRecord =
              await recordRepository.save(
                record,
              );

            await this.economyService.completeOperation(
              manager,
              operation,
              {
                recordId:
                  savedRecord.id,
                listingId:
                  listing.id,
                petId: pet.id,
                sellerUserId:
                  previousOwnerId,
                buyerUserId,
                taxAmount,
                sellerIncome,
              },
            );

            return {
              duplicate: false,
              record: savedRecord,
            };
          },
        );

      return this.buildBoughtResponse(
        result.record,
        result.duplicate,
      );
    } catch (error: any) {
      const duplicate =
        await this.recordRepository.findOne({
          where: {
            buyerUserId,
            requestId,
          },
        });
      if (duplicate) {
        return this.buildBoughtResponse(
          duplicate,
          true,
        );
      }
      return {
        success: false,
        message: String(
          error?.message ||
            'Buy listing failed',
        ),
        requestId,
      };
    }
  }

  async expireOldListings() {
    const active =
      await this.listingRepository.find({
        where: { status: 'active' },
      });
    const expired = active.filter(
      (listing) =>
        new Date(
          listing.expiresAt,
        ).getTime() <= Date.now(),
    );

    for (const listing of expired) {
      await this.dataSource.transaction(
        async (manager) => {
          const listingRepository =
            manager.getRepository(
              TradeListing,
            );
          const petRepository =
            manager.getRepository(Pet);
          const locked =
            await listingRepository.findOne({
              where: {
                id: listing.id,
              },
              lock: {
                mode: 'pessimistic_write',
              },
            });
          if (
            !locked ||
            locked.status !== 'active'
          ) {
            return;
          }

          locked.status = 'expired';
          locked.cancelledAt = new Date();
          await listingRepository.save(
            locked,
          );

          const pet =
            await petRepository.findOne({
              where: {
                id: locked.petId,
                ownerId:
                  locked.sellerUserId,
              },
              lock: {
                mode: 'pessimistic_write',
              },
            });
          if (
            pet &&
            pet.tradeListingId ===
              locked.id
          ) {
            pet.tradeStatus = 'none';
            pet.tradeListingId = 0;
            await petRepository.save(pet);
          }
        },
      );
    }

    return {
      success: true,
      expiredCount: expired.length,
    };
  }

  private async buildBoughtResponse(
    record: TradeRecord,
    duplicate: boolean,
  ) {
    const [pet, buyerWallet, sellerWallet] =
      await Promise.all([
        this.petRepository.findOne({
          where: { id: record.petId },
        }),
        this.economyService.getWallet(
          record.buyerUserId,
        ),
        this.economyService.getWallet(
          record.sellerUserId,
        ),
      ]);

    return {
      success: true,
      message: duplicate
        ? 'Trade purchase already completed'
        : 'Trade purchase successful',
      duplicate,
      requestId: record.requestId,
      record,
      pet,
      buyerWallet,
      sellerWallet,
    };
  }

  private validateListingPet(
    pet: Pet,
    team: PetTeam | null,
  ) {
    if (pet.isLocked) {
      return 'Locked pet cannot be listed';
    }
    if (pet.isFavorite) {
      return 'Favorite pet cannot be listed';
    }
    if (
      pet.married ||
      pet.partnerId ||
      pet.marriedPetId
    ) {
      return 'Married pet cannot be listed';
    }
    if (
      pet.tradeStatus === 'listed' ||
      pet.tradeListingId
    ) {
      return 'Pet is already listed';
    }
    const teamIds = Array.isArray(
      team?.petIds,
    )
      ? team.petIds.map(Number)
      : [];
    if (teamIds.includes(pet.id)) {
      return 'Remove pet from active team first';
    }
    return '';
  }

  private normalizePrice(
    currencyType: string,
    rawPrice: number,
  ) {
    const price = Math.floor(
      Number(rawPrice || 0),
    );
    const min =
      currencyType === 'diamond'
        ? 1
        : 100;
    const max =
      currencyType === 'diamond'
        ? 100000
        : 10000000;
    if (price < min || price > max) {
      throw new Error(
        `Price must be between ${min} and ${max}`,
      );
    }
    return price;
  }

  private decorateListing(
    listing: TradeListing,
    pet: Pet | null,
    seller: User | null,
  ) {
    return {
      ...listing,
      seller: seller
        ? {
            id: seller.id,
            nickname:
              seller.nickname,
            avatar: seller.avatar,
          }
        : null,
      pet,
      power: pet
        ? calculatePetPower(pet)
        : Number(
            listing.petSnapshot
              ?.power || 0,
          ),
      remainingSeconds: Math.max(
        0,
        Math.ceil(
          (new Date(
            listing.expiresAt,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      ),
    };
  }

  private petSnapshot(pet: Pet) {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      nickname: pet.nickname,
      species: pet.species,
      speciesCode: pet.speciesCode,
      isMutant: pet.isMutant,
      rarity: pet.rarity,
      rarityName: pet.rarityName,
      level: pet.level,
      quality: pet.quality,
      growth: pet.growth,
      aptitudes: {
        hp: pet.hpAptitude,
        attack: pet.attackAptitude,
        defense:
          pet.defenseAptitude,
        magic: pet.magicAptitude,
        speed: pet.speedAptitude,
      },
      skillSlotCount:
        pet.skillSlotCount,
      specialSkillCount:
        pet.specialSkillCount,
      skills: pet.skills,
      generation: pet.generation,
      power: calculatePetPower(pet),
    };
  }
}
