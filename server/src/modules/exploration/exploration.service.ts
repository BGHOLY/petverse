import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { WorldExplorationProgress } from './world-exploration.entity';

const REGIONS = [
  { code: 'moon-forest', name: '月光森林', chapter: '第一章', element: '月', speciesCode: 'PET004', speciesName: '月光猫', companionSpecies: '森灵鹿', description: '沿月辉足迹调查林间生态，发现第一处首领巢穴。', difficulty: 0.92, recommendedPower: 3200 },
  { code: 'ember-ridge', name: '余烬山脊', chapter: '第二章', element: '火', speciesCode: 'PET001', speciesName: '炎尾狐', companionSpecies: '雷角兽', description: '穿越火山峡谷，寻找余烬兽群的繁衍地。', difficulty: 1.05, recommendedPower: 4400 },
  { code: 'tide-coast', name: '潮汐海岸', chapter: '第三章', element: '水', speciesCode: 'PET006', speciesName: '潮汐獭', companionSpecies: '疾风兔', description: '追踪潮汐变化，破解海岸巢群的迁徙规律。', difficulty: 1.18, recommendedPower: 5800 },
  { code: 'shadow-ruins', name: '影刃遗迹', chapter: '第四章', element: '暗', speciesCode: 'PET007', speciesName: '影刃狼', companionSpecies: '霜羽鸮', description: '进入失落遗迹，用阵法应对高速暗影兽群。', difficulty: 1.34, recommendedPower: 7600 },
  { code: 'star-sanctum', name: '星辉圣域', chapter: '第五章', element: '星', speciesCode: 'PET009', speciesName: '星辉龙', companionSpecies: '岩甲龟', description: '挑战世界主线终点，收集最稀有的星辉生态蛋。', difficulty: 1.52, recommendedPower: 9800 },
] as const;

@Injectable()
export class ExplorationService {
  constructor(
    @InjectRepository(WorldExplorationProgress)
    private readonly progressRepository: Repository<WorldExplorationProgress>,
    @InjectRepository(BattleSessionV10)
    private readonly sessionRepository: Repository<BattleSessionV10>,
    private readonly eggService: EggService,
  ) {}

  async getWorld(userId = DEFAULT_USER_ID) {
    const progress = await this.getProgress(userId);
    await this.refreshDaily(progress);
    return this.toWorldView(progress);
  }

  async settleExplore(userId = DEFAULT_USER_ID, regionCode: string, sessionId: number) {
    const progress = await this.getProgress(userId);
    await this.refreshDaily(progress);
    const region = this.region(regionCode);
    const state = progress.regions?.[region.code];
    if (!state?.unlocked) return { ...(await this.toWorldView(progress)), success: false, message: '该地区尚未解锁' };

    const battle = await this.validateBattle(userId, sessionId, false);
    if (!battle.success) return { ...(await this.toWorldView(progress)), ...battle };
    if (this.wasSettled(progress, sessionId)) return { success: true, duplicate: true, message: '本场探索已经结算', ...(await this.toWorldView(progress)) };
    this.markSettled(progress, sessionId);

    if (!battle.won) {
      await this.progressRepository.save(progress);
      return { success: true, won: false, message: '探索失败不消耗体力，调整阵法后可再次挑战', ...(await this.toWorldView(progress)) };
    }

    state.exploration = Math.min(100, Number(state.exploration || 0) + 20);
    state.speciesDiscovered = Math.max(Number(state.speciesDiscovered || 0), state.exploration >= 60 ? 2 : 1);
    state.nestUnlocked = state.exploration >= 100;
    state.exploreWins = Number(state.exploreWins || 0) + 1;
    progress.currentRegionCode = region.code;
    progress.regions = { ...progress.regions, [region.code]: state };
    await this.progressRepository.save(progress);
    return {
      success: true,
      won: true,
      message: state.nestUnlocked ? `${region.name}探索度已满，首领巢穴开放！` : `${region.name}探索度提升至${state.exploration}%`,
      ...(await this.toWorldView(progress)),
    };
  }

  async settleNest(userId = DEFAULT_USER_ID, regionCode: string, sessionId: number) {
    const progress = await this.getProgress(userId);
    await this.refreshDaily(progress);
    const region = this.region(regionCode);
    const state = progress.regions?.[region.code];
    if (!state?.nestUnlocked) return { ...(await this.toWorldView(progress)), success: false, message: '探索度达到100%后才能挑战首领巢穴' };

    const battle = await this.validateBattle(userId, sessionId, true);
    if (!battle.success) return { ...(await this.toWorldView(progress)), ...battle };
    if (this.wasSettled(progress, sessionId)) return { success: true, duplicate: true, message: '本场巢穴战已经结算', ...(await this.toWorldView(progress)) };
    this.markSettled(progress, sessionId);

    if (!battle.won) {
      await this.progressRepository.save(progress);
      return { success: true, won: false, message: '战败不消耗巢穴奖励次数', ...(await this.toWorldView(progress)) };
    }

    const attempts = this.attemptView(progress);
    if (attempts.remaining <= 0) {
      await this.progressRepository.save(progress);
      return { ...(await this.toWorldView(progress)), success: false, won: true, message: '今日巢穴奖励次数已用完，本场不消耗也不发放宠物蛋' };
    }
    this.consumeAttempt(progress);

    const rarity = this.rollRarity(progress);
    const isMutant = this.rollMutation(progress);
    const egg = await this.eggService.createEgg({
      ownerId: userId,
      rarityPotential: rarity,
      source: `region_nest:${region.code}`,
      speciesCode: region.speciesCode,
      species: region.speciesName,
      isMutant,
      quality: 92 + Math.floor(Math.random() * 20),
      skillSlotCount: Math.min(8, 3 + Math.max(0, rarity - 2)),
      specialSkillCount: rarity >= 5 ? 1 : 0,
    });

    state.bossWins = Number(state.bossWins || 0) + 1;
    state.eggsEarned = Number(state.eggsEarned || 0) + 1;
    const index = REGIONS.findIndex((item) => item.code === region.code);
    if (index >= 0 && index + 1 < REGIONS.length) {
      const next = REGIONS[index + 1];
      progress.regions[next.code] = { ...progress.regions[next.code], unlocked: true };
    }
    progress.regions[region.code] = state;
    await this.progressRepository.save(progress);

    return {
      success: true,
      won: true,
      message: `首领巢穴胜利，获得${region.speciesName}宠物蛋`,
      egg: this.eggService.toEggView(egg),
      ...(await this.toWorldView(progress)),
    };
  }

  private async getProgress(userId: number) {
    let progress = await this.progressRepository.findOne({ where: { userId } });
    if (progress) {
      progress.regions = this.normalizeRegions(progress.regions);
      progress.settledSessionIds = Array.isArray(progress.settledSessionIds) ? progress.settledSessionIds : [];
      return progress;
    }
    progress = this.progressRepository.create({
      userId,
      regions: this.normalizeRegions(null),
      currentRegionCode: REGIONS[0].code,
      dailyDate: this.today(),
      dailyNestWins: 0,
      storedNestAttempts: 0,
      monthlyPass: false,
      extraDailyAttempts: 0,
      epicPity: 0,
      legendaryPity: 0,
      mutationPity: 0,
      settledSessionIds: [],
    });
    return this.progressRepository.save(progress);
  }

  private normalizeRegions(raw: any) {
    const existing = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(REGIONS.map((region, index) => [region.code, {
      exploration: 0,
      unlocked: index === 0,
      nestUnlocked: false,
      speciesDiscovered: 0,
      exploreWins: 0,
      bossWins: 0,
      eggsEarned: 0,
      ...(existing[region.code] || {}),
    }]));
  }

  private async refreshDaily(progress: WorldExplorationProgress) {
    const today = this.today();
    if (progress.dailyDate === today) return;
    if (progress.dailyDate) {
      const unused = Math.max(0, this.dailyLimit(progress) - Number(progress.dailyNestWins || 0));
      progress.storedNestAttempts = Math.min(6, Number(progress.storedNestAttempts || 0) + unused);
    }
    progress.dailyDate = today;
    progress.dailyNestWins = 0;
    await this.progressRepository.save(progress);
  }

  private dailyLimit(progress: WorldExplorationProgress) {
    return Math.min(5, 3 + (progress.monthlyPass ? 1 : 0) + Math.max(0, Number(progress.extraDailyAttempts || 0)));
  }

  private attemptView(progress: WorldExplorationProgress) {
    const limit = this.dailyLimit(progress);
    const dailyRemaining = Math.max(0, limit - Number(progress.dailyNestWins || 0));
    const stored = Math.max(0, Math.min(6, Number(progress.storedNestAttempts || 0)));
    return { base: 3, monthlyPassBonus: progress.monthlyPass ? 1 : 0, limit, used: Number(progress.dailyNestWins || 0), stored, remaining: dailyRemaining + stored, storedCap: 6 };
  }

  private consumeAttempt(progress: WorldExplorationProgress) {
    if (Number(progress.dailyNestWins || 0) < this.dailyLimit(progress)) progress.dailyNestWins += 1;
    else progress.storedNestAttempts = Math.max(0, Number(progress.storedNestAttempts || 0) - 1);
  }

  private rollRarity(progress: WorldExplorationProgress) {
    const forcedLegendary = Number(progress.legendaryPity || 0) >= 39;
    const forcedEpic = Number(progress.epicPity || 0) >= 9;
    const roll = Math.random();
    let rarity = forcedLegendary ? 5 : forcedEpic ? 4 : roll < 0.005 ? 5 : roll < 0.04 ? 4 : roll < 0.15 ? 3 : roll < 0.42 ? 2 : 1;
    rarity = Math.max(1, Math.min(5, rarity));
    progress.epicPity = rarity >= 4 ? 0 : Number(progress.epicPity || 0) + 1;
    progress.legendaryPity = rarity >= 5 ? 0 : Number(progress.legendaryPity || 0) + 1;
    return rarity;
  }

  private rollMutation(progress: WorldExplorationProgress) {
    const mutant = Number(progress.mutationPity || 0) >= 79 || Math.random() < 0.01;
    progress.mutationPity = mutant ? 0 : Number(progress.mutationPity || 0) + 1;
    return mutant;
  }

  private async validateBattle(userId: number, sessionId: number, bossRequired: boolean) {
    if (!sessionId) return { success: false, won: false, message: '缺少战斗会话' };
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
    if (!session || session.status === 'active') return { success: false, won: false, message: '战斗尚未结束或会话不存在' };
    if (bossRequired && !session.bossBattle) return { success: false, won: false, message: '该战斗不是首领巢穴挑战' };
    return { success: true, won: session.winnerSide === 'left', message: '' };
  }

  private wasSettled(progress: WorldExplorationProgress, sessionId: number) {
    return (progress.settledSessionIds || []).map(Number).includes(Number(sessionId));
  }

  private markSettled(progress: WorldExplorationProgress, sessionId: number) {
    progress.settledSessionIds = [...(progress.settledSessionIds || []), Number(sessionId)].slice(-80);
  }

  private region(code: string) {
    return REGIONS.find((item) => item.code === code) || REGIONS[0];
  }

  private async toWorldView(progress: WorldExplorationProgress) {
    const regions = REGIONS.map((region, index) => ({ ...region, index, ...(progress.regions?.[region.code] || {}) }));
    return {
      success: true,
      world: {
        title: 'PetVerse生态大陆',
        currentRegionCode: progress.currentRegionCode,
        regions,
        attempts: this.attemptView(progress),
        pity: {
          epic: { current: Number(progress.epicPity || 0), guarantee: 10, remaining: Math.max(1, 10 - Number(progress.epicPity || 0)) },
          legendary: { current: Number(progress.legendaryPity || 0), guarantee: 40, remaining: Math.max(1, 40 - Number(progress.legendaryPity || 0)) },
          mutation: { current: Number(progress.mutationPity || 0), guarantee: 80, remaining: Math.max(1, 80 - Number(progress.mutationPity || 0)), baseRate: 0.01 },
        },
        daily: ['3次首领巢穴', '1次区域危机', '每日任务四选三', '孵化和宝宝培养'],
        weekly: ['世界首领', '区域危机轮换', '无尽遗迹', '好友协作首领'],
        season: ['阵法挑战', '策略排行榜', '稀有外观', '称号和家园装饰'],
        fairPlay: ['所有物种与战斗技能均可免费获得', '战败不消耗巢穴次数，主线失败不消耗体力', '未使用巢穴次数最多累计6次', '策略正确可以低战力通关'],
      },
      data: { regions, attempts: this.attemptView(progress) },
    };
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
