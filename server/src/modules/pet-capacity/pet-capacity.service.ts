
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  Repository,
} from 'typeorm';

import {
  EconomyCost,
  EconomyService,
} from '../economy/economy.service';
import { Pet } from '../pet/pet.entity';
import { User } from '../user/user.entity';

const BASE_CAPACITY = 50;
const MAX_CAPACITY = 200;
const EXPAND_AMOUNT = 10;
const EXPAND_COST: EconomyCost = {
  items: {
    pet_capacity_ticket: 1,
  },
};

@Injectable()
export class PetCapacityService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly economyService: EconomyService,
  ) {}

  async getStatus(userId: number) {
    const [user, used] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },
      }),
      this.petRepository.count({
        where: {
          ownerId: userId,
          isEgg: false,
        },
      }),
    ]);

    const capacity = this.normalizeCapacity(
      Number(user?.petCapacity || BASE_CAPACITY),
    );

    return {
      success: Boolean(user),
      userId,
      used,
      capacity,
      remaining: Math.max(0, capacity - used),
      maxCapacity: MAX_CAPACITY,
      expandAmount: EXPAND_AMOUNT,
      expandCost: EXPAND_COST,
    };
  }

  async assertCanReceive(
    userId: number,
    count = 1,
    manager?: EntityManager,
  ) {
    const required = Math.max(
      1,
      Math.floor(Number(count || 1)),
    );
    const userRepository = manager
      ? manager.getRepository(User)
      : this.userRepository;
    const petRepository = manager
      ? manager.getRepository(Pet)
      : this.petRepository;

    const user = await userRepository.findOne({
      where: { id: userId },
      ...(manager
        ? {
            lock: {
              mode: 'pessimistic_write',
            },
          }
        : {}),
    });
    if (!user) {
      throw new Error('User not found');
    }

    const used = await petRepository.count({
      where: {
        ownerId: userId,
        isEgg: false,
      },
    });
    const capacity = this.normalizeCapacity(
      Number(user.petCapacity || BASE_CAPACITY),
    );

    if (used + required > capacity) {
      throw new Error(
        `Pet capacity is full (${used}/${capacity})`,
      );
    }

    return {
      user,
      used,
      capacity,
      remaining: capacity - used,
    };
  }

  async expandCapacity(
    userId: number,
    rawRequestId: string,
  ) {
    const requestId =
      this.economyService.normalizeRequestId(
        rawRequestId,
        'pet-capacity',
      );
    const existing =
      await this.economyService.getOperation(
        userId,
        'pet_capacity_expand',
        requestId,
      );

    if (existing?.status === 'success') {
      return {
        success: true,
        duplicate: true,
        requestId,
        ...existing.result,
      };
    }

    try {
      const result =
        await this.economyService.transaction(
          async (manager) => {
            const duplicate =
              await this.economyService.getOperationWithManager(
                manager,
                userId,
                'pet_capacity_expand',
                requestId,
              );
            if (duplicate?.status === 'success') {
              return {
                duplicate: true,
                result: duplicate.result,
              };
            }

            const userRepository =
              manager.getRepository(User);
            const user = await userRepository.findOne({
              where: { id: userId },
              lock: {
                mode: 'pessimistic_write',
              },
            });
            if (!user) {
              throw new Error('User not found');
            }

            const before = this.normalizeCapacity(
              Number(user.petCapacity || BASE_CAPACITY),
            );
            if (before >= MAX_CAPACITY) {
              throw new Error(
                'Pet capacity has reached the maximum',
              );
            }

            const operation =
              duplicate ||
              (await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType:
                    'pet_capacity_expand',
                  requestId,
                  cost: EXPAND_COST,
                  payload: {
                    before,
                    expandAmount: EXPAND_AMOUNT,
                  },
                },
              ));

            await this.economyService.spend(
              manager,
              userId,
              EXPAND_COST,
            );

            user.petCapacity = Math.min(
              MAX_CAPACITY,
              before + EXPAND_AMOUNT,
            );
            await userRepository.save(user);

            const response = {
              before,
              capacity: user.petCapacity,
              maxCapacity: MAX_CAPACITY,
              cost: EXPAND_COST,
            };
            await this.economyService.completeOperation(
              manager,
              operation,
              response,
            );

            return {
              duplicate: false,
              result: response,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Capacity expansion already completed'
          : 'Pet capacity expanded',
        duplicate: result.duplicate,
        requestId,
        ...result.result,
        status: await this.getStatus(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Pet capacity expansion failed',
        ),
        requestId,
        cost: EXPAND_COST,
      };
    }
  }

  private normalizeCapacity(value: number) {
    return Math.max(
      BASE_CAPACITY,
      Math.min(
        MAX_CAPACITY,
        Math.floor(Number(value || BASE_CAPACITY)),
      ),
    );
  }
}
