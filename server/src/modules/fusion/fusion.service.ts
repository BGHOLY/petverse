import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
} from 'typeorm';

import {
  EconomyCost,
  EconomyService,
} from '../economy/economy.service';
import { DEFAULT_USER_ID } from '../game-data';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Expedition } from '../expedition/expedition.entity';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import {
  getSkillSeedConfig,
  isSpecialSkill,
} from '../skill/config/skill.config';
import { PetTeam } from '../team/pet-team.entity';
import { FusionRecord } from './fusion-record.entity';

const FUSION_COST: EconomyCost = {
  gold: 1000,
  items: {
    fusion_core: 1,
  },
};

@Injectable()
export class FusionService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(PetTeam)
    private readonly petTeamRepository: Repository<PetTeam>,

    @InjectRepository(FusionRecord)
    private readonly fusionRecordRepository: Repository<FusionRecord>,

    @InjectRepository(Expedition)
    private readonly expeditionRepository: Repository<Expedition>,

    @InjectRepository(EquipmentItem)
    private readonly equipmentRepository: Repository<EquipmentItem>,

    private readonly dataSource: DataSource,
    private readonly petService: PetService,
    private readonly economyService: EconomyService,
  ) {}

  async preview(
    userId = DEFAULT_USER_ID,
    parentAId: number,
    parentBId: number,
    seed?: string,
    useMutationEssence = false,
    requestedLockedSkillCodes: string[] = [],
  ) {
    const parents =
      await this.loadAndValidateParents(
        userId,
        parentAId,
        parentBId,
      );
    if (
      'success' in parents &&
      parents.success === false
    ) {
      return parents;
    }

    const lockedSkillCodes = this.validateLockedSkillCodes(
      parents.parentA,
      parents.parentB,
      requestedLockedSkillCodes,
    );
    if (!Array.isArray(lockedSkillCodes)) return lockedSkillCodes;

    const blueprint =
      this.petService.buildOffspringBlueprint(
        parents.parentA,
        parents.parentB,
        undefined,
        'fusion',
        seed,
        useMutationEssence ? 0.03 : 0,
        lockedSkillCodes,
      );

    const cost = this.buildFusionCost(
      useMutationEssence,
      lockedSkillCodes.length,
    );

    return {
      success: true,
      message:
        'Fusion preview generated; preview does not consume pets',
      parents: [
        parents.parentA,
        parents.parentB,
      ],
      blueprint,
      cost,
      wallet:
        await this.economyService.getWallet(
          userId,
        ),
    };
  }

  async execute(
    userId = DEFAULT_USER_ID,
    parentAId: number,
    parentBId: number,
    requestId: string,
    requestedSeed?: string,
    useMutationEssence = false,
    requestedLockedSkillCodes: string[] = [],
  ) {
    const normalizedLockedSkillCodes = this.normalizeLockedSkillCodes(
      requestedLockedSkillCodes,
    );
    const fusionCost = this.buildFusionCost(
      useMutationEssence,
      normalizedLockedSkillCodes.length,
    );
    const normalizedRequestId =
      this.economyService.normalizeRequestId(
        requestId,
        'fusion',
      );

    const existing =
      await this.fusionRecordRepository.findOne({
        where: {
          ownerId: userId,
          requestId: normalizedRequestId,
        },
      });
    if (existing) {
      return this.buildExistingResponse(
        existing,
      );
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const duplicate =
              await manager.findOne(
                FusionRecord,
                {
                  where: {
                    ownerId: userId,
                    requestId:
                      normalizedRequestId,
                  },
                  lock: {
                    mode: 'pessimistic_write',
                  },
                },
              );
            if (duplicate) {
              const resultPet =
                duplicate.resultPetId
                  ? await manager.findOne(
                      Pet,
                      {
                        where: {
                          id: duplicate.resultPetId,
                        },
                      },
                    )
                  : null;
              return {
                record: duplicate,
                resultPet,
                duplicate: true,
              };
            }

            if (
              !parentAId ||
              !parentBId ||
              parentAId === parentBId
            ) {
              throw new Error(
                'Invalid fusion pet pair',
              );
            }

            const parentA =
              await manager.findOne(Pet, {
                where: { id: parentAId },
                lock: {
                  mode: 'pessimistic_write',
                },
              });
            const parentB =
              await manager.findOne(Pet, {
                where: { id: parentBId },
                lock: {
                  mode: 'pessimistic_write',
                },
              });

            const validation =
              await this.validateParentsWithManager(
                manager,
                userId,
                parentA,
                parentB,
              );
            if (validation) {
              throw new Error(validation);
            }
            const lockedSkillCodes = this.validateLockedSkillCodes(
              parentA,
              parentB,
              normalizedLockedSkillCodes,
            );
            if (!Array.isArray(lockedSkillCodes)) {
              throw new Error(lockedSkillCodes.message);
            }

            await this.economyService.spend(
              manager,
              userId,
              this.buildFusionCost(
                useMutationEssence,
                lockedSkillCodes.length,
              ),
            );

            const seed = String(
              requestedSeed ||
                `fusion-${userId}-${normalizedRequestId}`,
            );
            const blueprint =
              this.petService.buildOffspringBlueprint(
                parentA,
                parentB,
                undefined,
                'fusion',
                seed,
                useMutationEssence ? 0.03 : 0,
                lockedSkillCodes,
              );
            const createData =
              this.petService.buildPetCreateDataFromBlueprint(
                userId,
                blueprint,
                parentA,
                parentB,
                'fusion',
              );
            createData.fusionCount =
              Math.max(
                Number(parentA.fusionCount || 0),
                Number(parentB.fusionCount || 0),
              ) + 1;

            const resultPet = manager.create(
              Pet,
              createData,
            );
            const savedPet = await manager.save(
              Pet,
              resultPet,
            );

            const record = manager.create(
              FusionRecord,
              {
                ownerId: userId,
                requestId:
                  normalizedRequestId,
                parentAId: parentA.id,
                parentBId: parentB.id,
                resultPetId: savedPet.id,
                seed: blueprint.seed,
                costData: fusionCost,
                parentSnapshot:
                  blueprint.parentSnapshot,
                resultBlueprint: blueprint,
                status: 'success',
                configVersion:
                  blueprint.configVersion,
              },
            );
            const savedRecord =
              await manager.save(
                FusionRecord,
                record,
              );

            await manager.delete(Pet, {
              id: In([
                parentA.id,
                parentB.id,
              ]),
            });

            return {
              record: savedRecord,
              resultPet: savedPet,
              duplicate: false,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Fusion request already completed'
          : 'Fusion successful',
        record: result.record,
        pet: result.resultPet,
        blueprint:
          result.record.resultBlueprint,
        cost:
          result.record.costData ||
          fusionCost,
        consumedPetIds: [
          result.record.parentAId,
          result.record.parentBId,
        ],
        duplicate: result.duplicate,
        requestId: normalizedRequestId,
        wallet:
          await this.economyService.getWallet(
            userId,
          ),
      };
    } catch (error: any) {
      const duplicate =
        await this.fusionRecordRepository.findOne(
          {
            where: {
              ownerId: userId,
              requestId:
                normalizedRequestId,
            },
          },
        );
      if (duplicate) {
        return this.buildExistingResponse(
          duplicate,
        );
      }

      return {
        success: false,
        message: String(
          error?.message || 'Fusion failed',
        ),
        requestId: normalizedRequestId,
        cost: fusionCost,
      };
    }
  }

  private buildFusionCost(
    useMutationEssence: boolean,
    lockedSkillCount = 0,
  ): EconomyCost {
    return {
      ...FUSION_COST,
      items: {
        ...(FUSION_COST.items || {}),
        ...(useMutationEssence ? { mutation_essence: 1 } : {}),
        ...(lockedSkillCount > 0 ? { skill_lock: lockedSkillCount } : {}),
      },
    };
  }

  private normalizeLockedSkillCodes(raw: string[]) {
    return [
      ...new Set(
        (Array.isArray(raw) ? raw : [])
          .map((skillCode) => String(skillCode || '').trim())
          .filter(Boolean),
      ),
    ].slice(0, 10);
  }

  private validateLockedSkillCodes(
    parentA: Pet,
    parentB: Pet,
    raw: string[],
  ): string[] | { success: false; message: string } {
    const requested = this.normalizeLockedSkillCodes(raw);
    const available = new Map<string, any>(
      [...(parentA.skills || []), ...(parentB.skills || [])]
        .map(
          (skill: any): [string, any] => [
            String(skill?.skillCode || ''),
            getSkillSeedConfig(String(skill?.skillCode || '')) || skill,
          ],
        )
        .filter(([skillCode]) => Boolean(skillCode)),
    );

    for (const skillCode of requested) {
      const skill = available.get(skillCode);
      if (!skill) {
        return {
          success: false,
          message: `Locked skill is not owned by either parent: ${skillCode}`,
        };
      }
      if (skill.canLock === false || isSpecialSkill(skill)) {
        return {
          success: false,
          message: `Skill cannot be locked during fusion: ${skillCode}`,
        };
      }
    }
    return requested;
  }

  async getHistory(
    userId = DEFAULT_USER_ID,
  ) {
    const records =
      await this.fusionRecordRepository.find({
        where: { ownerId: userId },
        order: { id: 'DESC' },
        take: 100,
      });

    return {
      success: true,
      records,
      data: records,
    };
  }

  private async buildExistingResponse(
    record: FusionRecord,
  ) {
    const resultPet = record.resultPetId
      ? await this.petRepository.findOne({
          where: {
            id: record.resultPetId,
          },
        })
      : null;

    return {
      success: true,
      message:
        'Fusion request already completed',
      record,
      pet: resultPet,
      blueprint: record.resultBlueprint,
      cost:
        record.costData || FUSION_COST,
      consumedPetIds: [
        record.parentAId,
        record.parentBId,
      ],
      duplicate: true,
      requestId: record.requestId,
    };
  }

  private async loadAndValidateParents(
    userId: number,
    parentAId: number,
    parentBId: number,
  ) {
    if (
      !parentAId ||
      !parentBId ||
      parentAId === parentBId
    ) {
      return {
        success: false,
        message: 'Invalid fusion pet pair',
      };
    }

    const [parentA, parentB, team, activeExpeditions, equippedItems] =
      await Promise.all([
        this.petRepository.findOne({
          where: { id: parentAId },
        }),
        this.petRepository.findOne({
          where: { id: parentBId },
        }),
        this.petTeamRepository.findOne({
          where: { userId },
        }),
        this.expeditionRepository.find({
          where: { userId, status: 'active' },
        }),
        this.equipmentRepository.find({
          where: {
            ownerId: userId,
            equippedPetId: In([parentAId, parentBId]),
          },
        }),
      ]);
    const message = this.validateParents(
      userId,
      parentA,
      parentB,
      team,
      activeExpeditions,
      equippedItems,
    );
    if (message) {
      return {
        success: false,
        message,
      };
    }

    return {
      parentA,
      parentB,
    };
  }

  private async validateParentsWithManager(
    manager: any,
    userId: number,
    parentA: Pet | null,
    parentB: Pet | null,
  ) {
    const [team, activeExpeditions, equippedItems] = await Promise.all([
      manager.findOne(PetTeam, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      }),
      manager.find(Expedition, {
        where: { userId, status: 'active' },
        lock: { mode: 'pessimistic_read' },
      }),
      manager.find(EquipmentItem, {
        where: {
          ownerId: userId,
          equippedPetId: In([
            Number(parentA?.id || 0),
            Number(parentB?.id || 0),
          ]),
        },
        lock: { mode: 'pessimistic_read' },
      }),
    ]);
    return this.validateParents(
      userId,
      parentA,
      parentB,
      team,
      activeExpeditions,
      equippedItems,
    );
  }

  private validateParents(
    userId: number,
    parentA: Pet | null,
    parentB: Pet | null,
    team: PetTeam | null,
    activeExpeditions: Expedition[] = [],
    equippedItems: EquipmentItem[] = [],
  ) {
    if (!parentA || !parentB) {
      return 'Fusion parent not found';
    }
    if (
      parentA.ownerId !== userId ||
      parentB.ownerId !== userId
    ) {
      return 'Both fusion pets must belong to current player';
    }
    if (parentA.isEgg || parentB.isEgg) {
      return 'Eggs cannot be fused';
    }
    if (parentA.isLocked || parentB.isLocked) {
      return 'Locked pets cannot be fused';
    }
    if (
      parentA.tradeStatus === 'listed' ||
      parentB.tradeStatus === 'listed' ||
      parentA.tradeListingId ||
      parentB.tradeListingId
    ) {
      return 'Listed pets cannot be fused';
    }
    if (
      parentA.married ||
      parentB.married ||
      parentA.marriedPetId ||
      parentB.marriedPetId
    ) {
      return 'Married pets cannot be fused';
    }

    const teamIds = Array.isArray(team?.petIds)
      ? team.petIds.map(Number)
      : [];
    if (
      teamIds.includes(parentA.id) ||
      teamIds.includes(parentB.id)
    ) {
      return 'Remove fusion pets from the active team first';
    }
    const parentIds = new Set([Number(parentA.id), Number(parentB.id)]);
    if (
      activeExpeditions.some((entry) =>
        (entry.petIds || []).some((petId) => parentIds.has(Number(petId))),
      )
    ) {
      return 'Claim or finish the active expedition before fusing these pets';
    }
    if (
      equippedItems.some((item) =>
        parentIds.has(Number(item.equippedPetId || 0)),
      )
    ) {
      return 'Unequip all equipment from fusion pets first';
    }
    return '';
  }
}
