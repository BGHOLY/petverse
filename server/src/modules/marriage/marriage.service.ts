import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import {
  EconomyCost,
  EconomyService,
} from '../economy/economy.service';
import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { Marriage } from './marriage.entity';

const BREEDING_COST: EconomyCost = {
  gold: 500,
  items: {
    breeding_token: 1,
  },
};

@Injectable()
export class MarriageService {
  constructor(
    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly eggService: EggService,
    private readonly petService: PetService,
    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  async getUserMarriages(
    userId = DEFAULT_USER_ID,
  ) {
    const marriages =
      await this.marriageRepository.find({
        where: [
          {
            ownerAId: userId,
            status: 'active',
          },
          {
            ownerBId: userId,
            status: 'active',
          },
        ],
        order: { id: 'DESC' },
      });

    const data = marriages.map(
      (marriage) => ({
        ...marriage,
        canLayEgg:
          marriage.ownerAId === userId &&
          this.getCooldownRemainingSeconds(
            marriage,
          ) <= 0,
        cooldownRemainingSeconds:
          this.getCooldownRemainingSeconds(
            marriage,
          ),
        breedingCost: BREEDING_COST,
      }),
    );

    return {
      success: true,
      marriages: data,
      data,
    };
  }

  async createMarriage(
    userId: number,
    petAId: number,
    petBId: number,
  ) {
    if (
      !petAId ||
      !petBId ||
      petAId === petBId
    ) {
      return {
        success: false,
        message: 'Invalid pet pair',
      };
    }

    try {
      return await this.dataSource.transaction(
        async (manager) => {
          const petA = await manager.findOne(
            Pet,
            {
              where: { id: petAId },
              lock: {
                mode: 'pessimistic_write',
              },
            },
          );
          const petB = await manager.findOne(
            Pet,
            {
              where: { id: petBId },
              lock: {
                mode: 'pessimistic_write',
              },
            },
          );

          if (!petA || !petB) {
            throw new Error('Pet not found');
          }
          if (petA.ownerId !== userId) {
            throw new Error(
              'Pet A must belong to current player',
            );
          }
          if (petA.isEgg || petB.isEgg) {
            throw new Error(
              'Eggs cannot marry',
            );
          }
          if (
            Number(petA.level || 1) < 1 ||
            Number(petB.level || 1) < 1
          ) {
            throw new Error(
              'Both pets must be at least level 1',
            );
          }
          if (
            petA.married ||
            petB.married ||
            petA.marriedPetId ||
            petB.marriedPetId
          ) {
            throw new Error(
              'One pet is already married',
            );
          }

          const existing =
            await manager.findOne(
              Marriage,
              {
                where: [
                  {
                    petAId,
                    petBId,
                    status: 'active',
                  },
                  {
                    petAId: petBId,
                    petBId: petAId,
                    status: 'active',
                  },
                ],
              },
            );
          if (existing) {
            return {
              success: true,
              message:
                'Marriage already exists',
              marriage: existing,
              pets: [petA, petB],
            };
          }

          const marriage = manager.create(
            Marriage,
            {
              petAId: petA.id,
              petBId: petB.id,
              ownerAId: petA.ownerId,
              ownerBId: petB.ownerId,
              status: 'active',
              eggCount: 0,
              cooldownEndAt: null,
            },
          );
          const saved = await manager.save(
            Marriage,
            marriage,
          );

          petA.married = true;
          petA.partnerId = petB.id;
          petA.marriedPetId = petB.id;
          petB.married = true;
          petB.partnerId = petA.id;
          petB.marriedPetId = petA.id;

          await manager.save(Pet, [
            petA,
            petB,
          ]);

          return {
            success: true,
            message: 'Marriage created',
            marriage: saved,
            pets: [petA, petB],
          };
        },
      );
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Marriage creation failed',
        ),
      };
    }
  }

  async layEgg(
    userId: number,
    marriageId?: number,
    petId?: number,
    requestedRequestId?: string,
  ) {
    const requestId =
      this.economyService.normalizeRequestId(
        requestedRequestId,
        'lay-egg',
      );
    const operationType =
      'marriage_lay_egg';
    const existing =
      await this.economyService.getOperation(
        userId,
        operationType,
        requestId,
      );
    if (existing?.status === 'success') {
      return {
        ...(existing.result || {}),
        duplicate: true,
        requestId,
      };
    }

    const selected =
      await this.findMarriageForLayEgg(
        userId,
        marriageId,
        petId,
      );
    if (!selected) {
      return {
        success: false,
        message:
          'Active marriage not found',
        requestId,
      };
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const duplicate =
              await this.economyService.getOperationWithManager(
                manager,
                userId,
                operationType,
                requestId,
              );
            if (
              duplicate?.status ===
              'success'
            ) {
              return {
                ...(duplicate.result || {}),
                duplicate: true,
                requestId,
              };
            }

            const marriage =
              await manager.findOne(
                Marriage,
                {
                  where: {
                    id: selected.id,
                    ownerAId: userId,
                    status: 'active',
                  },
                  lock: {
                    mode:
                      'pessimistic_write',
                  },
                },
              );
            if (!marriage) {
              throw new Error(
                'Active marriage not found',
              );
            }

            const cooldown =
              this.getCooldownRemainingSeconds(
                marriage,
              );
            if (cooldown > 0) {
              throw new Error(
                `Marriage is on cooldown: ${cooldown}s`,
              );
            }

            const petA =
              await manager.findOne(Pet, {
                where: {
                  id: marriage.petAId,
                },
                lock: {
                  mode:
                    'pessimistic_write',
                },
              });
            const petB =
              await manager.findOne(Pet, {
                where: {
                  id: marriage.petBId,
                },
                lock: {
                  mode:
                    'pessimistic_write',
                },
              });
            if (!petA || !petB) {
              throw new Error(
                'Parent pet not found',
              );
            }
            if (
              petA.isEgg ||
              petB.isEgg ||
              !petA.married ||
              !petB.married
            ) {
              throw new Error(
                'Parent marriage state is invalid',
              );
            }

            const blueprint =
              this.petService.buildOffspringBlueprint(
                petA,
                petB,
                undefined,
                'breed',
                `breed-${userId}-${requestId}`,
              );

            const operation =
              duplicate ||
              (await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType,
                  requestId,
                  cost: BREEDING_COST,
                  payload: {
                    marriageId:
                      marriage.id,
                    petAId: petA.id,
                    petBId: petB.id,
                  },
                },
              ));

            await this.economyService.spend(
              manager,
              userId,
              BREEDING_COST,
            );

            const egg =
              await this.eggService.createEgg(
                {
                  ownerId: userId,
                  parentAId: petA.id,
                  parentBId: petB.id,
                  rarityPotential:
                    blueprint.rarity,
                  quality:
                    blueprint.quality,
                  species:
                    blueprint.species,
                  speciesCode:
                    blueprint.speciesCode,
                  isMutant:
                    blueprint.isMutant,
                  skillSlotCount:
                    blueprint.skillSlotCount,
                  aptitudes:
                    blueprint.aptitudes,
                  growth:
                    blueprint.growth,
                  generation:
                    blueprint.generation,
                  specialSkillCount:
                    blueprint.specialSkillCount,
                  geneCode:
                    blueprint.geneCode,
                  geneScore:
                    blueprint.geneScore,
                  bodyType:
                    blueprint.bodyType,
                  color: blueprint.color,
                  pattern:
                    blueprint.pattern,
                  inheritedSkills:
                    blueprint.inheritedSkills,
                  mutationData:
                    blueprint.mutationData,
                  parentSnapshot:
                    blueprint.parentSnapshot,
                  offspringData:
                    blueprint,
                  randomSeed:
                    blueprint.seed,
                  configVersion:
                    blueprint.configVersion,
                  source: 'marriage',
                },
                manager,
              );

            marriage.eggCount =
              Number(
                marriage.eggCount || 0,
              ) + 1;
            marriage.cooldownEndAt =
              new Date(
                Date.now() +
                  this.getMarriageCooldownSeconds() *
                    1000,
              );
            petA.breedCount =
              Number(petA.breedCount || 0) +
              1;
            petB.breedCount =
              Number(petB.breedCount || 0) +
              1;

            await manager.save(
              Marriage,
              marriage,
            );
            await manager.save(Pet, [
              petA,
              petB,
            ]);

            const response = {
              success: true,
              message: 'Egg laid',
              egg:
                this.eggService.toEggView(
                  egg,
                ),
              marriage: {
                ...marriage,
                canLayEgg: false,
                cooldownRemainingSeconds:
                  this.getCooldownRemainingSeconds(
                    marriage,
                  ),
              },
              parents: [petA, petB],
              inheritance: blueprint,
              cost: BREEDING_COST,
              requestId,
              duplicate: false,
            };

            await this.economyService.completeOperation(
              manager,
              operation,
              response,
            );
            return response;
          },
        );

      return {
        ...result,
        wallet:
          await this.economyService.getWallet(
            userId,
          ),
      };
    } catch (error: any) {
      const duplicate =
        await this.economyService.getOperation(
          userId,
          operationType,
          requestId,
        );
      if (
        duplicate?.status === 'success'
      ) {
        return {
          ...(duplicate.result || {}),
          duplicate: true,
          requestId,
        };
      }
      return {
        success: false,
        message: String(
          error?.message ||
            'Egg laying failed',
        ),
        requestId,
        cost: BREEDING_COST,
      };
    }
  }

  async divorce(
    userId: number,
    marriageId: number,
  ) {
    try {
      return await this.dataSource.transaction(
        async (manager) => {
          const marriage =
            await manager.findOne(
              Marriage,
              {
                where: [
                  {
                    id: marriageId,
                    ownerAId: userId,
                    status: 'active',
                  },
                  {
                    id: marriageId,
                    ownerBId: userId,
                    status: 'active',
                  },
                ],
                lock: {
                  mode:
                    'pessimistic_write',
                },
              },
            );
          if (!marriage) {
            throw new Error(
              'Active marriage not found',
            );
          }

          const petA =
            await manager.findOne(Pet, {
              where: {
                id: marriage.petAId,
              },
              lock: {
                mode:
                  'pessimistic_write',
              },
            });
          const petB =
            await manager.findOne(Pet, {
              where: {
                id: marriage.petBId,
              },
              lock: {
                mode:
                  'pessimistic_write',
              },
            });

          for (const pet of [
            petA,
            petB,
          ]) {
            if (!pet) continue;
            pet.married = false;
            pet.partnerId = 0;
            pet.marriedPetId = 0;
          }
          await manager.save(
            Pet,
            [petA, petB].filter(Boolean) as Pet[],
          );

          marriage.status = 'ended';
          await manager.save(
            Marriage,
            marriage,
          );

          return {
            success: true,
            message: 'Marriage ended',
            marriage,
            pets: [petA, petB],
          };
        },
      );
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Divorce failed',
        ),
      };
    }
  }

  private async findMarriageForLayEgg(
    userId: number,
    marriageId?: number,
    petId?: number,
  ) {
    if (marriageId) {
      return this.marriageRepository.findOne({
        where: {
          id: marriageId,
          ownerAId: userId,
          status: 'active',
        },
      });
    }

    if (petId) {
      return this.marriageRepository.findOne({
        where: [
          {
            petAId: petId,
            ownerAId: userId,
            status: 'active',
          },
          {
            petBId: petId,
            ownerAId: userId,
            status: 'active',
          },
        ],
      });
    }

    return this.marriageRepository.findOne({
      where: {
        ownerAId: userId,
        status: 'active',
      },
      order: { id: 'DESC' },
    });
  }

  private getCooldownRemainingSeconds(
    marriage: Marriage,
  ) {
    if (!marriage.cooldownEndAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil(
        (new Date(
          marriage.cooldownEndAt,
        ).getTime() -
          Date.now()) /
          1000,
      ),
    );
  }

  private getMarriageCooldownSeconds() {
    return 60;
  }
}
