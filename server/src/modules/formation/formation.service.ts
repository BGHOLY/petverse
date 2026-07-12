import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { DEFAULT_USER_ID } from '../game-data';
import { FORMATION_CONFIGS, FORMATION_UPGRADE_COSTS, getFormationConfig } from './formation.config';
import { FormationUpgradeLog } from './formation-upgrade-log.entity';
import { FormationWallet } from './formation-wallet.entity';
import { UserFormation } from './user-formation.entity';

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(UserFormation)
    private readonly formationRepository: Repository<UserFormation>,
    @InjectRepository(FormationWallet)
    private readonly walletRepository: Repository<FormationWallet>,
    @InjectRepository(FormationUpgradeLog)
    private readonly logRepository: Repository<FormationUpgradeLog>,
    private readonly economyService: EconomyService,
  ) {}

  async getOverview(userId = DEFAULT_USER_ID) {
    const [formations, wallet] = await Promise.all([
      this.ensureFormations(userId),
      this.ensureWallet(userId),
    ]);
    const levelMap = new Map<string, number>(formations.map((item) => [String(item.formationCode), Number(item.level || 1)]));
    return {
      success: true,
      wallet,
      formations: FORMATION_CONFIGS.map((config) => ({
        ...config,
        level: levelMap.get(config.code) || 1,
        maxLevel: 10,
        nextCost: FORMATION_UPGRADE_COSTS[levelMap.get(config.code) || 1] || null,
      })),
      purchaseLimits: {
        dailyKnowledge: 30,
        weeklyCores: 1,
        knowledgeDiamondEach: 3,
        coreDiamondEach: 300,
      },
    };
  }

  async getLevel(userId: number, formationCode: string) {
    const formations = await this.ensureFormations(userId);
    return formations.find((item) => item.formationCode === getFormationConfig(formationCode).code)?.level || 1;
  }

  async upgrade(userId: number, formationCode: string) {
    const config = getFormationConfig(formationCode);
    const formation = await this.ensureFormation(userId, config.code);
    const wallet = await this.ensureWallet(userId);
    if (formation.level >= 10) {
      return { success: false, message: 'Formation is already at max level' };
    }
    const cost = FORMATION_UPGRADE_COSTS[formation.level];
    if (!cost) return { success: false, message: 'Formation upgrade cost not found' };
    if (wallet.knowledge < cost.knowledge || wallet.cores < cost.cores) {
      return {
        success: false,
        message: 'Not enough formation materials',
        required: cost,
        wallet,
      };
    }
    wallet.knowledge -= cost.knowledge;
    wallet.cores -= cost.cores;
    const fromLevel = formation.level;
    formation.level += 1;
    await this.walletRepository.save(wallet);
    await this.formationRepository.save(formation);
    await this.logRepository.save(this.logRepository.create({
      userId,
      formationCode: config.code,
      fromLevel,
      toLevel: formation.level,
      knowledgeCost: cost.knowledge,
      coreCost: cost.cores,
      diamondCost: 0,
    }));
    return {
      success: true,
      message: `${config.name} upgraded to Lv.${formation.level}`,
      formation,
      wallet,
    };
  }

  async purchaseKnowledge(userId: number, quantity: number) {
    const amount = Math.max(1, Math.min(30, Math.floor(Number(quantity || 1))));
    const wallet = await this.ensureWallet(userId);
    this.refreshPurchaseKeys(wallet);
    if (wallet.dailyPurchasedKnowledge + amount > 30) {
      return { success: false, message: 'Daily formation knowledge purchase limit reached', wallet };
    }
    const diamondCost = amount * 3;
    try {
      await this.economyService.transaction(async (manager) => {
        await this.economyService.spend(manager, userId, { diamond: diamondCost });
      });
    } catch (error: any) {
      return { success: false, message: String(error?.message || 'Purchase failed') };
    }
    wallet.knowledge += amount;
    wallet.dailyPurchasedKnowledge += amount;
    await this.walletRepository.save(wallet);
    return { success: true, message: `Purchased ${amount} formation knowledge`, diamondCost, wallet };
  }

  async purchaseCore(userId: number) {
    const wallet = await this.ensureWallet(userId);
    this.refreshPurchaseKeys(wallet);
    if (wallet.weeklyPurchasedCores >= 1) {
      return { success: false, message: 'Weekly formation core purchase limit reached', wallet };
    }
    try {
      await this.economyService.transaction(async (manager) => {
        await this.economyService.spend(manager, userId, { diamond: 300 });
      });
    } catch (error: any) {
      return { success: false, message: String(error?.message || 'Purchase failed') };
    }
    wallet.cores += 1;
    wallet.weeklyPurchasedCores += 1;
    await this.walletRepository.save(wallet);
    return { success: true, message: 'Purchased 1 formation core', diamondCost: 300, wallet };
  }

  async grant(userId: number, knowledge = 0, cores = 0) {
    const wallet = await this.ensureWallet(userId);
    wallet.knowledge += Math.max(0, Math.floor(Number(knowledge || 0)));
    wallet.cores += Math.max(0, Math.floor(Number(cores || 0)));
    return this.walletRepository.save(wallet);
  }

  private async ensureFormations(userId: number) {
    const existing = await this.formationRepository.find({ where: { userId } });
    const byCode = new Map(existing.map((item) => [item.formationCode, item]));
    const missing = FORMATION_CONFIGS.filter((config) => !byCode.has(config.code));
    if (missing.length) {
      const created = await this.formationRepository.save(missing.map((config) => this.formationRepository.create({
        userId,
        formationCode: config.code,
        level: 1,
      })));
      existing.push(...created);
    }
    return existing;
  }

  private async ensureFormation(userId: number, formationCode: string) {
    let formation = await this.formationRepository.findOne({ where: { userId, formationCode } });
    if (!formation) {
      formation = await this.formationRepository.save(this.formationRepository.create({ userId, formationCode, level: 1 }));
    }
    return formation;
  }

  private async ensureWallet(userId: number) {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.walletRepository.save(this.walletRepository.create({
        userId,
        knowledge: 300,
        cores: 1,
        dailyKey: this.dayKey(),
        weeklyKey: this.weekKey(),
        dailyPurchasedKnowledge: 0,
        weeklyPurchasedCores: 0,
      }));
    }
    this.refreshPurchaseKeys(wallet);
    return wallet;
  }

  private refreshPurchaseKeys(wallet: FormationWallet) {
    const day = this.dayKey();
    const week = this.weekKey();
    if (wallet.dailyKey !== day) {
      wallet.dailyKey = day;
      wallet.dailyPurchasedKnowledge = 0;
    }
    if (wallet.weeklyKey !== week) {
      wallet.weeklyKey = week;
      wallet.weeklyPurchasedCores = 0;
    }
  }

  private dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  private weekKey(date = new Date()) {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
