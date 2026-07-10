import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
} from 'typeorm';

import {
  EconomyCost,
  EconomyService,
} from '../economy/economy.service';
import { EggService } from '../egg/egg.service';
import { Friend } from '../friend/friend.entity';
import { DEFAULT_USER_ID } from '../game-data';
import { MailService } from '../mail/mail.service';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { LineageService } from './lineage.service';
import { MarriageProposal } from './marriage-proposal.entity';
import { Marriage } from './marriage.entity';

const BREEDING_COST: EconomyCost = {
  gold: 500,
  items: {
    breeding_token: 1,
  },
};

const PROPOSAL_EXPIRE_HOURS = 72;
const FERTILITY_COST = 20;
const FERTILITY_RECOVERY_PER_HOUR = 5;
const DEFAULT_BREED_LIMIT = 20;

@Injectable()
export class MarriageService {
  constructor(
    @InjectRepository(Marriage)
    private readonly marriageRepository: Repository<Marriage>,

    @InjectRepository(MarriageProposal)
    private readonly proposalRepository: Repository<MarriageProposal>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,

    private readonly eggService: EggService,
    private readonly petService: PetService,
    private readonly economyService: EconomyService,
    private readonly lineageService: LineageService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async getUserMarriages(userId = DEFAULT_USER_ID) {
    const marriages = await this.marriageRepository.find({
      where: [
        { ownerAId: userId, status: 'active' },
        { ownerBId: userId, status: 'active' },
      ],
      order: { id: 'DESC' },
    });

    const petIds = [
      ...new Set(
        marriages.flatMap((item) => [item.petAId, item.petBId]),
      ),
    ];
    const pets = petIds.length
      ? await this.petRepository.find({
          where: { id: In(petIds) },
        })
      : [];
    const petMap = new Map(pets.map((pet) => [pet.id, pet]));

    const data = marriages.map((marriage) => {
      const petA = petMap.get(marriage.petAId);
      const petB = petMap.get(marriage.petBId);
      const nextEggOwnerId =
        Number(marriage.nextEggOwnerId || 0) ||
        Number(marriage.ownerAId || userId);
      return {
        ...marriage,
        nextEggOwnerId,
        isMyTurn: nextEggOwnerId === userId,
        canLayEgg:
          nextEggOwnerId === userId &&
          this.getCooldownRemainingSeconds(marriage) <= 0 &&
          this.canPetBreed(petA) &&
          this.canPetBreed(petB),
        cooldownRemainingSeconds:
          this.getCooldownRemainingSeconds(marriage),
        breedingCost: BREEDING_COST,
        fertilityCost: FERTILITY_COST,
        pets: [petA, petB].filter(Boolean),
      };
    });

    return {
      success: true,
      marriages: data,
      data,
    };
  }

  async getProposals(
    userId: number,
    direction: 'incoming' | 'outgoing' | 'all' = 'all',
  ) {
    await this.expireOldProposals();
    const where =
      direction === 'incoming'
        ? { targetUserId: userId }
        : direction === 'outgoing'
          ? { proposerUserId: userId }
          : [
              { targetUserId: userId },
              { proposerUserId: userId },
            ];
    const proposals = await this.proposalRepository.find({
      where: where as any,
      order: { id: 'DESC' },
      take: 100,
    });
    return {
      success: true,
      proposals,
      data: proposals,
    };
  }

  async proposeMarriage(
    userId: number,
    proposerPetId: number,
    targetPetId: number,
    message = '',
  ) {
    if (!proposerPetId || !targetPetId || proposerPetId === targetPetId) {
      return {
        success: false,
        message: 'Invalid pet pair',
      };
    }

    try {
      const result = await this.dataSource.transaction(
        async (manager) => {
          const petA = await manager.findOne(Pet, {
            where: { id: proposerPetId },
            lock: { mode: 'pessimistic_write' },
          });
          const petB = await manager.findOne(Pet, {
            where: { id: targetPetId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!petA || !petB) throw new Error('Pet not found');
          if (petA.ownerId !== userId) {
            throw new Error('Proposer pet must belong to current player');
          }
          if (petA.ownerId === petB.ownerId) {
            return this.createMarriageWithManager(
              manager,
              petA,
              petB,
              0,
            );
          }

          await this.assertFriendship(
            manager,
            petA.ownerId,
            petB.ownerId,
          );
          await this.assertPetMarriageState(petA);
          await this.assertPetMarriageState(petB);

          const lineage = await this.lineageService.checkCompatibility(
            petA,
            petB,
            manager,
          );
          if (!lineage.compatible) {
            throw new Error(lineage.reason);
          }

          const existing = await manager.findOne(MarriageProposal, {
            where: [
              {
                proposerPetId: petA.id,
                targetPetId: petB.id,
                status: 'pending',
              },
              {
                proposerPetId: petB.id,
                targetPetId: petA.id,
                status: 'pending',
              },
            ],
            lock: { mode: 'pessimistic_write' },
          });
          if (existing) {
            return {
              success: true,
              duplicate: true,
              proposal: existing,
            };
          }

          const proposal = manager.create(MarriageProposal, {
            proposerUserId: petA.ownerId,
            targetUserId: petB.ownerId,
            proposerPetId: petA.id,
            targetPetId: petB.id,
            message: String(message || '').slice(0, 200),
            status: 'pending',
            expiresAt: new Date(
              Date.now() + PROPOSAL_EXPIRE_HOURS * 60 * 60 * 1000,
            ),
            resolvedAt: null,
            marriageId: 0,
          });
          const saved = await manager.save(MarriageProposal, proposal);
          return {
            success: true,
            duplicate: false,
            proposal: saved,
          };
        },
      );

      const proposal = (result as any)?.proposal as
        | MarriageProposal
        | undefined;
      if (proposal?.targetUserId) {
        await this.mailService.createMailWithAttachments(
          proposal.targetUserId,
          '收到宝宝结婚申请',
          `玩家 ${userId} 的宝宝发来了结婚申请，请在结婚系统中处理。`,
          [],
          {
            sourceType: 'marriage-proposal',
            sourceId: String(proposal.id),
            expiresAt: proposal.expiresAt,
          },
        );
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Marriage proposal failed'),
      };
    }
  }

  async respondProposal(
    userId: number,
    proposalId: number,
    accept: boolean,
  ) {
    try {
      const result = await this.dataSource.transaction(
        async (manager) => {
          const proposal = await manager.findOne(MarriageProposal, {
            where: {
              id: proposalId,
              targetUserId: userId,
              status: 'pending',
            },
            lock: { mode: 'pessimistic_write' },
          });
          if (!proposal) {
            throw new Error('Pending marriage proposal not found');
          }
          if (
            proposal.expiresAt &&
            new Date(proposal.expiresAt).getTime() <= Date.now()
          ) {
            proposal.status = 'expired';
            proposal.resolvedAt = new Date();
            await manager.save(MarriageProposal, proposal);
            throw new Error('Marriage proposal has expired');
          }

          if (!accept) {
            proposal.status = 'rejected';
            proposal.resolvedAt = new Date();
            await manager.save(MarriageProposal, proposal);
            return {
              success: true,
              accepted: false,
              proposal,
            };
          }

          const petA = await manager.findOne(Pet, {
            where: { id: proposal.proposerPetId },
            lock: { mode: 'pessimistic_write' },
          });
          const petB = await manager.findOne(Pet, {
            where: { id: proposal.targetPetId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!petA || !petB) throw new Error('Pet not found');
          if (petB.ownerId !== userId) {
            throw new Error('Target pet ownership changed');
          }

          await this.assertFriendship(
            manager,
            petA.ownerId,
            petB.ownerId,
          );
          await this.assertPetMarriageState(petA);
          await this.assertPetMarriageState(petB);
          const lineage = await this.lineageService.checkCompatibility(
            petA,
            petB,
            manager,
          );
          if (!lineage.compatible) throw new Error(lineage.reason);

          const marriageResult = await this.createMarriageWithManager(
            manager,
            petA,
            petB,
            proposal.id,
          );
          proposal.status = 'accepted';
          proposal.resolvedAt = new Date();
          proposal.marriageId = Number(marriageResult.marriage?.id || 0);
          await manager.save(MarriageProposal, proposal);

          const pending = await manager
            .getRepository(MarriageProposal)
            .find({
              where: { status: 'pending' },
            });
          for (const other of pending) {
            if (
              other.id !== proposal.id &&
              [
                other.proposerPetId,
                other.targetPetId,
              ].some((id) => id === petA.id || id === petB.id)
            ) {
              other.status = 'cancelled';
              other.resolvedAt = new Date();
            }
          }
          const cancelled = pending.filter(
            (item) => item.status === 'cancelled',
          );
          if (cancelled.length) {
            await manager.save(MarriageProposal, cancelled);
          }

          return {
            ...marriageResult,
            accepted: true,
            proposal,
          };
        },
      );

      const proposerUserId = Number(result?.proposal?.proposerUserId || 0);
      if (proposerUserId) {
        await this.mailService.createMailWithAttachments(
          proposerUserId,
          result.accepted ? '结婚申请已通过' : '结婚申请被拒绝',
          result.accepted
            ? '对方已同意宝宝结婚申请。'
            : '对方拒绝了宝宝结婚申请。',
          [],
          {
            sourceType: 'marriage-proposal-result',
            sourceId: String(proposalId),
          },
        );
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Proposal handling failed'),
      };
    }
  }

  async cancelProposal(userId: number, proposalId: number) {
    const proposal = await this.proposalRepository.findOne({
      where: {
        id: proposalId,
        proposerUserId: userId,
        status: 'pending',
      },
    });
    if (!proposal) {
      return {
        success: false,
        message: 'Pending marriage proposal not found',
      };
    }
    proposal.status = 'cancelled';
    proposal.resolvedAt = new Date();
    await this.proposalRepository.save(proposal);
    return {
      success: true,
      proposal,
    };
  }

  async createMarriage(
    userId: number,
    petAId: number,
    petBId: number,
  ) {
    const petA = await this.petRepository.findOne({
      where: { id: petAId },
    });
    const petB = await this.petRepository.findOne({
      where: { id: petBId },
    });
    if (!petA || !petB) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }
    if (petA.ownerId !== userId) {
      return {
        success: false,
        message: 'Pet A must belong to current player',
      };
    }
    if (petA.ownerId !== petB.ownerId) {
      return this.proposeMarriage(userId, petAId, petBId);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const lockedA = await manager.findOne(Pet, {
          where: { id: petAId },
          lock: { mode: 'pessimistic_write' },
        });
        const lockedB = await manager.findOne(Pet, {
          where: { id: petBId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedA || !lockedB) throw new Error('Pet not found');
        await this.assertPetMarriageState(lockedA);
        await this.assertPetMarriageState(lockedB);
        const lineage = await this.lineageService.checkCompatibility(
          lockedA,
          lockedB,
          manager,
        );
        if (!lineage.compatible) throw new Error(lineage.reason);
        return this.createMarriageWithManager(
          manager,
          lockedA,
          lockedB,
          0,
        );
      });
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Marriage creation failed'),
      };
    }
  }

  async layEgg(
    userId: number,
    marriageId?: number,
    petId?: number,
    requestedRequestId?: string,
  ) {
    const requestId = this.economyService.normalizeRequestId(
      requestedRequestId,
      'lay-egg',
    );
    const operationType = 'marriage_lay_egg';
    const existing = await this.economyService.getOperation(
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

    const selected = await this.findMarriageForLayEgg(
      userId,
      marriageId,
      petId,
    );
    if (!selected) {
      return {
        success: false,
        message: 'Active marriage not found',
        requestId,
      };
    }

    try {
      const result = await this.dataSource.transaction(
        async (manager) => {
          const duplicate =
            await this.economyService.getOperationWithManager(
              manager,
              userId,
              operationType,
              requestId,
            );
          if (duplicate?.status === 'success') {
            return {
              ...(duplicate.result || {}),
              duplicate: true,
              requestId,
            };
          }

          const marriage = await manager.findOne(Marriage, {
            where: {
              id: selected.id,
              status: 'active',
            },
            lock: { mode: 'pessimistic_write' },
          });
          if (!marriage) throw new Error('Active marriage not found');
          if (
            userId !== marriage.ownerAId &&
            userId !== marriage.ownerBId
          ) {
            throw new Error('Marriage does not belong to current player');
          }

          const nextEggOwnerId =
            Number(marriage.nextEggOwnerId || 0) ||
            Number(marriage.ownerAId);
          if (nextEggOwnerId !== userId) {
            throw new Error(
              `It is player ${nextEggOwnerId}'s turn to receive the next egg`,
            );
          }

          const cooldown = this.getCooldownRemainingSeconds(marriage);
          if (cooldown > 0) {
            throw new Error(`Marriage is on cooldown: ${cooldown}s`);
          }

          const petA = await manager.findOne(Pet, {
            where: { id: marriage.petAId },
            lock: { mode: 'pessimistic_write' },
          });
          const petB = await manager.findOne(Pet, {
            where: { id: marriage.petBId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!petA || !petB) throw new Error('Parent pet not found');
          this.refreshFertility(petA);
          this.refreshFertility(petB);
          await this.assertBreedReady(petA);
          await this.assertBreedReady(petB);

          const blueprint = this.petService.buildOffspringBlueprint(
            petA,
            petB,
            undefined,
            'breed',
            `breed-${userId}-${requestId}`,
          );

          const operation =
            duplicate ||
            (await this.economyService.createOperation(manager, {
              userId,
              operationType,
              requestId,
              cost: BREEDING_COST,
              payload: {
                marriageId: marriage.id,
                petAId: petA.id,
                petBId: petB.id,
                eggOwnerId: userId,
              },
            }));

          await this.economyService.spend(
            manager,
            userId,
            BREEDING_COST,
          );

          const egg = await this.eggService.createEgg(
            {
              ownerId: userId,
              parentAId: petA.id,
              parentBId: petB.id,
              rarityPotential: blueprint.rarity,
              quality: blueprint.quality,
              species: blueprint.species,
              speciesCode: blueprint.speciesCode,
              isMutant: blueprint.isMutant,
              skillSlotCount: blueprint.skillSlotCount,
              aptitudes: blueprint.aptitudes,
              growth: blueprint.growth,
              generation: blueprint.generation,
              specialSkillCount: blueprint.specialSkillCount,
              geneCode: blueprint.geneCode,
              geneScore: blueprint.geneScore,
              bodyType: blueprint.bodyType,
              color: blueprint.color,
              pattern: blueprint.pattern,
              inheritedSkills: blueprint.inheritedSkills,
              mutationData: blueprint.mutationData,
              parentSnapshot: blueprint.parentSnapshot,
              offspringData: blueprint,
              randomSeed: blueprint.seed,
              configVersion: '2.3.0',
              source: 'marriage',
            },
            manager,
          );

          const now = new Date();
          for (const pet of [petA, petB]) {
            pet.breedCount = Number(pet.breedCount || 0) + 1;
            pet.breedLimit = Number(pet.breedLimit || DEFAULT_BREED_LIMIT);
            pet.fertility = Math.max(
              0,
              Number(pet.fertility || 0) - FERTILITY_COST,
            );
            pet.fertilityUpdatedAt = now;
            pet.lastBreedAt = now;
          }

          marriage.eggCount = Number(marriage.eggCount || 0) + 1;
          marriage.lastEggOwnerId = userId;
          marriage.nextEggOwnerId =
            marriage.ownerAId === marriage.ownerBId
              ? marriage.ownerAId
              : userId === marriage.ownerAId
                ? marriage.ownerBId
                : marriage.ownerAId;
          marriage.cooldownEndAt = new Date(
            Date.now() + this.getMarriageCooldownSeconds() * 1000,
          );

          await manager.save(Marriage, marriage);
          await manager.save(Pet, [petA, petB]);

          const response = {
            success: true,
            message: 'Egg laid',
            egg: this.eggService.toEggView(egg),
            marriage: {
              ...marriage,
              canLayEgg: false,
              cooldownRemainingSeconds:
                this.getCooldownRemainingSeconds(marriage),
            },
            parents: [petA, petB],
            inheritance: blueprint,
            cost: BREEDING_COST,
            fertilityCost: FERTILITY_COST,
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
        wallet: await this.economyService.getWallet(userId),
      };
    } catch (error: any) {
      const duplicate = await this.economyService.getOperation(
        userId,
        operationType,
        requestId,
      );
      if (duplicate?.status === 'success') {
        return {
          ...(duplicate.result || {}),
          duplicate: true,
          requestId,
        };
      }
      return {
        success: false,
        message: String(error?.message || 'Egg laying failed'),
        requestId,
        cost: BREEDING_COST,
      };
    }
  }

  async divorce(userId: number, marriageId: number) {
    try {
      const result = await this.dataSource.transaction(
        async (manager) => {
          const marriage = await manager.findOne(Marriage, {
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
            lock: { mode: 'pessimistic_write' },
          });
          if (!marriage) throw new Error('Active marriage not found');

          const pets = await manager
            .getRepository(Pet)
            .find({
              where: {
                id: In([marriage.petAId, marriage.petBId]),
              },
            });
          for (const pet of pets) {
            pet.married = false;
            pet.partnerId = 0;
            pet.marriedPetId = 0;
          }
          await manager.save(Pet, pets);

          marriage.status = 'ended';
          marriage.endedAt = new Date();
          await manager.save(Marriage, marriage);
          return {
            success: true,
            message: 'Marriage ended',
            marriage,
            pets,
          };
        },
      );

      const otherOwnerId =
        result.marriage.ownerAId === userId
          ? result.marriage.ownerBId
          : result.marriage.ownerAId;
      if (otherOwnerId && otherOwnerId !== userId) {
        await this.mailService.createMailWithAttachments(
          otherOwnerId,
          '宝宝婚姻已结束',
          '对方已结束宝宝婚姻关系。',
          [],
          {
            sourceType: 'marriage-ended',
            sourceId: String(marriageId),
          },
        );
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: String(error?.message || 'Divorce failed'),
      };
    }
  }

  async getPetLineage(userId: number, petId: number) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
    });
    if (!pet) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }
    if (pet.ownerId !== userId) {
      const marriage = await this.marriageRepository.findOne({
        where: [
          { petAId: pet.id, ownerBId: userId, status: 'active' },
          { petBId: pet.id, ownerAId: userId, status: 'active' },
        ],
      });
      if (!marriage) {
        return {
          success: false,
          message: 'No permission to view this lineage',
        };
      }
    }
    const ancestors = await this.lineageService.getLineage(
      pet,
      this.petRepository,
    );
    return {
      success: true,
      pet,
      ancestors,
      maxDepth: 3,
      data: ancestors,
    };
  }

  async expireOldProposals() {
    const pending = await this.proposalRepository.find({
      where: { status: 'pending' },
    });
    const expired = pending.filter(
      (proposal) =>
        proposal.expiresAt &&
        new Date(proposal.expiresAt).getTime() <= Date.now(),
    );
    for (const proposal of expired) {
      proposal.status = 'expired';
      proposal.resolvedAt = new Date();
    }
    if (expired.length) {
      await this.proposalRepository.save(expired);
    }
    return {
      success: true,
      expiredCount: expired.length,
    };
  }

  async repairMarriageState() {
    const marriages = await this.marriageRepository.find({
      where: { status: 'active' },
    });
    let repairedPets = 0;
    let endedMarriages = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const marriage of marriages) {
        const pets = await manager
          .getRepository(Pet)
          .find({
            where: { id: In([marriage.petAId, marriage.petBId]) },
          });
        if (pets.length !== 2) {
          marriage.status = 'ended';
          marriage.endedAt = new Date();
          await manager.save(Marriage, marriage);
          endedMarriages += 1;
          continue;
        }

        for (const pet of pets) {
          const partnerId =
            pet.id === marriage.petAId
              ? marriage.petBId
              : marriage.petAId;
          if (
            !pet.married ||
            pet.partnerId !== partnerId ||
            pet.marriedPetId !== partnerId
          ) {
            pet.married = true;
            pet.partnerId = partnerId;
            pet.marriedPetId = partnerId;
            repairedPets += 1;
          }
          this.refreshFertility(pet);
        }
        await manager.save(Pet, pets);

        if (!marriage.nextEggOwnerId) {
          marriage.nextEggOwnerId = marriage.ownerAId;
          await manager.save(Marriage, marriage);
        }
      }
    });

    return {
      success: true,
      repairedPets,
      endedMarriages,
    };
  }

  private async createMarriageWithManager(
    manager: EntityManager,
    petA: Pet,
    petB: Pet,
    proposalId: number,
  ) {
    await this.assertPetMarriageState(petA);
    await this.assertPetMarriageState(petB);

    const existing = await manager.findOne(Marriage, {
      where: [
        { petAId: petA.id, petBId: petB.id, status: 'active' },
        { petAId: petB.id, petBId: petA.id, status: 'active' },
      ],
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        message: 'Marriage already exists',
        marriage: existing,
        pets: [petA, petB],
      };
    }

    const marriage = manager.create(Marriage, {
      petAId: petA.id,
      petBId: petB.id,
      ownerAId: petA.ownerId,
      ownerBId: petB.ownerId,
      status: 'active',
      eggCount: 0,
      nextEggOwnerId: petA.ownerId,
      lastEggOwnerId: 0,
      proposalId,
      cooldownEndAt: null,
      endedAt: null,
    });
    const saved = await manager.save(Marriage, marriage);

    petA.married = true;
    petA.partnerId = petB.id;
    petA.marriedPetId = petB.id;
    petB.married = true;
    petB.partnerId = petA.id;
    petB.marriedPetId = petA.id;
    await manager.save(Pet, [petA, petB]);

    return {
      success: true,
      duplicate: false,
      message: 'Marriage created',
      marriage: saved,
      pets: [petA, petB],
    };
  }

  private async assertFriendship(
    manager: EntityManager,
    userAId: number,
    userBId: number,
  ) {
    const relation = await manager.findOne(Friend, {
      where: [
        { userId: userAId, friendUserId: userBId },
        { userId: userBId, friendUserId: userAId },
      ],
    });
    if (!relation) {
      throw new Error('Players must be friends before proposing marriage');
    }
  }

  private async assertPetMarriageState(pet: Pet) {
    if (pet.isEgg) throw new Error('Eggs cannot marry');
    if (pet.isLocked) throw new Error('Locked pets cannot marry');
    if (
      pet.tradeStatus === 'listed' ||
      pet.tradeListingId
    ) {
      throw new Error('Listed pets cannot marry');
    }
    if (
      pet.married ||
      pet.partnerId ||
      pet.marriedPetId
    ) {
      throw new Error('One pet is already married');
    }
    if (Number(pet.level || 1) < 1) {
      throw new Error('Both pets must be at least level 1');
    }
  }

  private async assertBreedReady(pet: Pet) {
    await this.assertPetMarriageParentState(pet);
    const limit = Number(pet.breedLimit || DEFAULT_BREED_LIMIT);
    if (Number(pet.breedCount || 0) >= limit) {
      throw new Error(`${pet.nickname} has reached the breeding limit`);
    }
    if (Number(pet.fertility || 0) < FERTILITY_COST) {
      throw new Error(`${pet.nickname} does not have enough fertility`);
    }
  }

  private async assertPetMarriageParentState(pet: Pet) {
    if (pet.isEgg || !pet.married) {
      throw new Error('Parent marriage state is invalid');
    }
    if (
      pet.tradeStatus === 'listed' ||
      pet.tradeListingId
    ) {
      throw new Error('Listed pets cannot breed');
    }
  }

  private canPetBreed(pet?: Pet) {
    if (!pet) return false;
    this.refreshFertility(pet);
    return (
      !pet.isEgg &&
      pet.married &&
      pet.tradeStatus !== 'listed' &&
      !pet.tradeListingId &&
      Number(pet.breedCount || 0) <
        Number(pet.breedLimit || DEFAULT_BREED_LIMIT) &&
      Number(pet.fertility || 0) >= FERTILITY_COST
    );
  }

  private refreshFertility(pet: Pet) {
    const now = new Date();
    const updatedAt = pet.fertilityUpdatedAt
      ? new Date(pet.fertilityUpdatedAt)
      : now;
    const hours = Math.floor(
      (now.getTime() - updatedAt.getTime()) / (60 * 60 * 1000),
    );
    if (hours > 0) {
      pet.fertility = Math.min(
        100,
        Number(pet.fertility || 0) +
          hours * FERTILITY_RECOVERY_PER_HOUR,
      );
      pet.fertilityUpdatedAt = new Date(
        updatedAt.getTime() + hours * 60 * 60 * 1000,
      );
    } else if (!pet.fertilityUpdatedAt) {
      pet.fertilityUpdatedAt = now;
    }
  }

  private async findMarriageForLayEgg(
    userId: number,
    marriageId?: number,
    petId?: number,
  ) {
    if (marriageId) {
      return this.marriageRepository.findOne({
        where: [
          { id: marriageId, ownerAId: userId, status: 'active' },
          { id: marriageId, ownerBId: userId, status: 'active' },
        ],
      });
    }

    if (petId) {
      return this.marriageRepository.findOne({
        where: [
          { petAId: petId, ownerAId: userId, status: 'active' },
          { petBId: petId, ownerAId: userId, status: 'active' },
          { petAId: petId, ownerBId: userId, status: 'active' },
          { petBId: petId, ownerBId: userId, status: 'active' },
        ],
      });
    }

    return this.marriageRepository.findOne({
      where: [
        { ownerAId: userId, status: 'active' },
        { ownerBId: userId, status: 'active' },
      ],
      order: { id: 'DESC' },
    });
  }

  private getCooldownRemainingSeconds(marriage: Marriage) {
    if (!marriage.cooldownEndAt) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(marriage.cooldownEndAt).getTime() - Date.now()) /
          1000,
      ),
    );
  }

  private getMarriageCooldownSeconds() {
    return 60;
  }
}
