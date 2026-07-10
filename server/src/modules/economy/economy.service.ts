import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
} from 'typeorm';

import { Inventory } from '../inventory/inventory.entity';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { GameOperationRecord } from './game-operation-record.entity';

export interface EconomyCost {
  gold?: number;
  diamond?: number;
  items?: Record<string, number>;
}

export interface EconomyReward {
  gold?: number;
  diamond?: number;
  items?: Record<string, number>;
}

@Injectable()
export class EconomyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(GameOperationRecord)
    private readonly operationRepository: Repository<GameOperationRecord>,

    private readonly dataSource: DataSource,
  ) {}

  createRequestId(prefix = 'operation') {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  normalizeRequestId(requestId: string | undefined, prefix: string) {
    const normalized = String(requestId || '').trim().slice(0, 80);
    return normalized || this.createRequestId(prefix);
  }

  async getWallet(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    const inventory = await this.inventoryRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });

    return {
      userId,
      gold: Number(user?.gold || 0),
      diamond: Number(user?.diamond || 0),
      items: Object.fromEntries(
        inventory.map((entry) => [
          entry.itemCode,
          Number(entry.quantity || 0),
        ]),
      ),
    };
  }


  async ensureMinimumBalance(
    userId: number,
    gold: number,
    diamond: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new Error('User not found');
      }
      user.gold = Math.max(
        Number(user.gold || 0),
        Math.max(0, Math.floor(Number(gold || 0))),
      );
      user.diamond = Math.max(
        Number(user.diamond || 0),
        Math.max(0, Math.floor(Number(diamond || 0))),
      );
      return repository.save(user);
    });
  }

  async getOperation(
    userId: number,
    operationType: string,
    requestId: string,
  ) {
    if (!requestId) return null;
    return this.operationRepository.findOne({
      where: {
        userId,
        operationType,
        requestId,
      },
    });
  }


  async getOperationWithManager(
    manager: EntityManager,
    userId: number,
    operationType: string,
    requestId: string,
  ) {
    if (!requestId) return null;
    return manager.getRepository(GameOperationRecord).findOne({
      where: {
        userId,
        operationType,
        requestId,
      },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async createOperation(
    manager: EntityManager,
    data: {
      userId: number;
      operationType: string;
      requestId: string;
      status?: string;
      cost?: EconomyCost;
      reward?: EconomyReward;
      payload?: Record<string, any>;
      result?: Record<string, any>;
    },
  ) {
    const repository = manager.getRepository(GameOperationRecord);
    const operation = repository.create({
      userId: data.userId,
      operationType: data.operationType,
      requestId: data.requestId,
      status: data.status || 'processing',
      cost: data.cost || {},
      reward: data.reward || {},
      payload: data.payload || {},
      result: data.result || {},
      configVersion: '2.2.0',
    });
    return repository.save(operation);
  }

  async completeOperation(
    manager: EntityManager,
    operation: GameOperationRecord,
    result: Record<string, any>,
  ) {
    operation.status = 'success';
    operation.result = result;
    return manager.getRepository(GameOperationRecord).save(operation);
  }

  async failOperation(
    manager: EntityManager,
    operation: GameOperationRecord,
    result: Record<string, any>,
  ) {
    operation.status = 'failed';
    operation.result = result;
    return manager.getRepository(GameOperationRecord).save(operation);
  }

  async spend(
    manager: EntityManager,
    userId: number,
    rawCost: EconomyCost,
  ) {
    const cost = this.normalizeCost(rawCost);
    const userRepository = manager.getRepository(User);
    const inventoryRepository = manager.getRepository(Inventory);
    const itemRepository = manager.getRepository(Item);

    const user = await userRepository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new Error(
        'User not found. Run POST /api/dev/seed-all first.',
      );
    }
    if (Number(user.gold || 0) < cost.gold) {
      throw new Error('Not enough gold');
    }
    if (Number(user.diamond || 0) < cost.diamond) {
      throw new Error('Not enough diamonds');
    }

    const itemEntries = Object.entries(cost.items);
    const inventoryRows: Array<{
      inventory: Inventory;
      quantity: number;
    }> = [];

    for (const [itemCode, quantity] of itemEntries) {
      const item = await itemRepository.findOne({
        where: {
          itemCode,
          enabled: true,
        },
      });
      if (!item) {
        throw new Error(`Cost item not found: ${itemCode}`);
      }

      const inventory = await inventoryRepository.findOne({
        where: {
          userId,
          itemCode,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory || Number(inventory.quantity || 0) < quantity) {
        throw new Error(`Not enough item: ${itemCode}`);
      }
      inventoryRows.push({ inventory, quantity });
    }

    user.gold = Number(user.gold || 0) - cost.gold;
    user.diamond = Number(user.diamond || 0) - cost.diamond;
    await userRepository.save(user);

    for (const row of inventoryRows) {
      row.inventory.quantity =
        Number(row.inventory.quantity || 0) - row.quantity;
      if (row.inventory.quantity <= 0) {
        await inventoryRepository.remove(row.inventory);
      } else {
        await inventoryRepository.save(row.inventory);
      }
    }

    return {
      cost,
      user,
    };
  }

  async grant(
    manager: EntityManager,
    userId: number,
    rawReward: EconomyReward,
  ) {
    const reward = this.normalizeReward(rawReward);
    const userRepository = manager.getRepository(User);
    const inventoryRepository = manager.getRepository(Inventory);
    const itemRepository = manager.getRepository(Item);

    const user = await userRepository.findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new Error('User not found');
    }

    user.gold = Number(user.gold || 0) + reward.gold;
    user.diamond = Number(user.diamond || 0) + reward.diamond;
    await userRepository.save(user);

    for (const [itemCode, quantity] of Object.entries(reward.items)) {
      const item = await itemRepository.findOne({
        where: {
          itemCode,
          enabled: true,
        },
      });
      if (!item) {
        throw new Error(`Reward item not found: ${itemCode}`);
      }

      let inventory = await inventoryRepository.findOne({
        where: { userId, itemCode },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) {
        inventory = inventoryRepository.create({
          userId,
          itemId: item.id,
          itemCode,
          quantity: 0,
        });
      }

      const nextQuantity =
        Number(inventory.quantity || 0) + quantity;
      if (nextQuantity > Number(item.maxStack || 999999)) {
        throw new Error(`Item stack limit exceeded: ${itemCode}`);
      }
      inventory.quantity = nextQuantity;
      await inventoryRepository.save(inventory);
    }

    return {
      reward,
      user,
    };
  }

  async transaction<T>(
    run: (manager: EntityManager) => Promise<T>,
  ) {
    return this.dataSource.transaction(run);
  }

  private normalizeCost(raw: EconomyCost) {
    return {
      gold: Math.max(0, Math.floor(Number(raw?.gold || 0))),
      diamond: Math.max(
        0,
        Math.floor(Number(raw?.diamond || 0)),
      ),
      items: this.normalizeItems(raw?.items),
    };
  }

  private normalizeReward(raw: EconomyReward) {
    return {
      gold: Math.max(0, Math.floor(Number(raw?.gold || 0))),
      diamond: Math.max(
        0,
        Math.floor(Number(raw?.diamond || 0)),
      ),
      items: this.normalizeItems(raw?.items),
    };
  }

  private normalizeItems(items?: Record<string, number>) {
    const result: Record<string, number> = {};
    for (const [code, rawQuantity] of Object.entries(items || {})) {
      const itemCode = String(code || '').trim();
      const quantity = Math.max(
        0,
        Math.floor(Number(rawQuantity || 0)),
      );
      if (itemCode && quantity > 0) {
        result[itemCode] = quantity;
      }
    }
    return result;
  }
}
