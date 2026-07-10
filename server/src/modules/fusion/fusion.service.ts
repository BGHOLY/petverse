import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { FusionRecord } from './fusion-record.entity';

@Injectable()
export class FusionService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    @InjectRepository(FusionRecord)
    private readonly fusionRecordRepository: Repository<FusionRecord>,

    private readonly dataSource: DataSource,
    private readonly petService: PetService,
  ) {}

  async preview(
    userId = DEFAULT_USER_ID,
    parentAId: number,
    parentBId: number,
    seed?: string,
  ) {
    const parents = await this.loadAndValidateParents(
      userId,
      parentAId,
      parentBId,
    );
    if ('success' in parents && parents.success === false) return parents;

    const blueprint = this.petService.buildOffspringBlueprint(
      parents.parentA,
      parents.parentB,
      undefined,
      'fusion',
      seed,
    );

    return {
      success: true,
      message: 'Fusion preview generated; preview does not consume pets',
      parents: [parents.parentA, parents.parentB],
      blueprint,
    };
  }

  async execute(
    userId = DEFAULT_USER_ID,
    parentAId: number,
    parentBId: number,
    requestId: string,
    requestedSeed?: string,
  ) {
    const normalizedRequestId = String(requestId || '').trim().slice(0, 64);
    if (!normalizedRequestId) {
      return {
        success: false,
        message: 'requestId is required for idempotent fusion',
      };
    }

    const existing = await this.fusionRecordRepository.findOne({
      where: {
        ownerId: userId,
        requestId: normalizedRequestId,
      },
    });
    if (existing) return this.buildExistingResponse(existing);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const duplicate = (await manager.findOne(FusionRecord, {
          where: {
            ownerId: userId,
            requestId: normalizedRequestId,
          },
          lock: { mode: 'pessimistic_write' },
        })) as FusionRecord | null;
        if (duplicate) {
          const resultPet = duplicate.resultPetId
            ? await manager.findOne(Pet, {
                where: { id: duplicate.resultPetId },
              })
            : null;
          return {
            record: duplicate,
            resultPet,
            duplicate: true,
          };
        }

        if (!parentAId || !parentBId || parentAId === parentBId) {
          throw new Error('Invalid fusion pet pair');
        }

        const parentA = (await manager.findOne(Pet, {
          where: { id: parentAId },
          lock: { mode: 'pessimistic_write' },
        })) as Pet | null;
        const parentB = (await manager.findOne(Pet, {
          where: { id: parentBId },
          lock: { mode: 'pessimistic_write' },
        })) as Pet | null;

        const validation = this.validateParents(userId, parentA, parentB);
        if (validation) throw new Error(validation);

        const seed = String(
          requestedSeed || `fusion-${userId}-${normalizedRequestId}`,
        );
        const blueprint = this.petService.buildOffspringBlueprint(
          parentA,
          parentB,
          undefined,
          'fusion',
          seed,
        );
        const resultPet = manager.create(
          Pet,
          this.petService.buildPetCreateDataFromBlueprint(
            userId,
            blueprint,
            parentA,
            parentB,
            'fusion',
          ),
        );
        const savedPet = (await manager.save(Pet, resultPet)) as Pet;

        const record = manager.create(FusionRecord, {
          ownerId: userId,
          requestId: normalizedRequestId,
          parentAId: parentA.id,
          parentBId: parentB.id,
          resultPetId: savedPet.id,
          seed: blueprint.seed,
          parentSnapshot: blueprint.parentSnapshot,
          resultBlueprint: blueprint,
          status: 'success',
          configVersion: blueprint.configVersion,
        });
        const savedRecord = (await manager.save(
          FusionRecord,
          record,
        )) as FusionRecord;

        // 合宠消耗父母。前置校验禁止已婚宠物进入，避免破坏婚姻记录。
        await manager.delete(Pet, {
          id: In([parentA.id, parentB.id]),
        });

        return {
          record: savedRecord,
          resultPet: savedPet,
          duplicate: false,
        };
      });

      return {
        success: true,
        message: result.duplicate
          ? 'Fusion request already completed'
          : 'Fusion successful',
        record: result.record,
        pet: result.resultPet,
        blueprint: result.record.resultBlueprint,
        consumedPetIds: [
          result.record.parentAId,
          result.record.parentBId,
        ],
        duplicate: result.duplicate,
      };
    } catch (error: any) {
      const duplicate = await this.fusionRecordRepository.findOne({
        where: {
          ownerId: userId,
          requestId: normalizedRequestId,
        },
      });
      if (duplicate) return this.buildExistingResponse(duplicate);

      return {
        success: false,
        message: String(error?.message || 'Fusion failed'),
      };
    }
  }

  async getHistory(userId = DEFAULT_USER_ID) {
    const records = await this.fusionRecordRepository.find({
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

  private async buildExistingResponse(record: FusionRecord) {
    const resultPet = record.resultPetId
      ? await this.petRepository.findOne({
          where: { id: record.resultPetId },
        })
      : null;

    return {
      success: true,
      message: 'Fusion request already completed',
      record,
      pet: resultPet,
      blueprint: record.resultBlueprint,
      consumedPetIds: [record.parentAId, record.parentBId],
      duplicate: true,
    };
  }

  private async loadAndValidateParents(
    userId: number,
    parentAId: number,
    parentBId: number,
  ) {
    if (!parentAId || !parentBId || parentAId === parentBId) {
      return {
        success: false,
        message: 'Invalid fusion pet pair',
      };
    }

    const [parentA, parentB] = await Promise.all([
      this.petRepository.findOne({ where: { id: parentAId } }),
      this.petRepository.findOne({ where: { id: parentBId } }),
    ]);
    const message = this.validateParents(userId, parentA, parentB);
    if (message) {
      return {
        success: false,
        message,
      };
    }

    return { parentA, parentB };
  }

  private validateParents(
    userId: number,
    parentA: Pet | null,
    parentB: Pet | null,
  ) {
    if (!parentA || !parentB) return 'Fusion parent not found';
    if (parentA.ownerId !== userId || parentB.ownerId !== userId) {
      return 'Both fusion pets must belong to current player';
    }
    if (parentA.isEgg || parentB.isEgg) return 'Eggs cannot be fused';
    if (
      parentA.married ||
      parentB.married ||
      parentA.marriedPetId ||
      parentB.marriedPetId
    ) {
      return 'Married pets cannot be fused';
    }
    return '';
  }
}
