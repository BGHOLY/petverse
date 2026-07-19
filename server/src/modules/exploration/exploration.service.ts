import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { battleRewardConfig } from '../battle/battle-reward.config';
import { EconomyService } from '../economy/economy.service';
import { EggService } from '../egg/egg.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { User } from '../user/user.entity';
import { WorldExplorationProgress } from './world-exploration.entity';

const region = (code: string, name: string, chapter: string, element: string, speciesCode: string, speciesName: string, companionSpecies: string, description: string, difficulty: number, recommendedPower: number, rewardGold: number) => ({
  code, name, chapter, element, speciesCode, speciesName, companionSpecies, description, difficulty, recommendedPower,
  discoverablePets: [speciesName, companionSpecies],
  firstRewards: [{ type: 'gold', amount: Math.round(rewardGold * 0.4), label: `金币×${Math.round(rewardGold * 0.4)}` }],
  completionRewards: [{ type: 'egg', amount: 1, label: `${speciesName}宠物蛋×1` }, { type: 'gold', amount: rewardGold, label: `金币×${rewardGold}` }],
});

const REGIONS = [
  region('moon-forest', '月光森林', '第一章', '月', 'PET004', '月光猫', '森灵鹿', '沿月辉足迹调查林间生态，发现第一处首领巢穴。', 0.92, 3200, 800),
  region('ember-ridge', '余烬山脊', '第二章', '火', 'PET001', '炎尾狐', '雷角兽', '穿越火山峡谷，寻找余烬兽群的繁衍地。', 1.05, 4400, 1100),
  region('tide-coast', '潮汐海岸', '第三章', '水', 'PET006', '潮汐獭', '疾风兔', '追踪潮汐变化，破解海岸巢群的迁徙规律。', 1.18, 5800, 1500),
  region('shadow-ruins', '影刃遗迹', '第四章', '暗', 'PET007', '影刃狼', '霜羽鸮', '进入失落遗迹，用阵法应对高速暗影兽群。', 1.34, 7600, 2000),
  region('star-sanctum', '星辉圣域', '第五章', '星', 'PET009', '星辉龙', '岩甲龟', '挑战世界主线终点，收集最稀有的星辉生态蛋。', 1.52, 9800, 2800),
] as const;

const EXPLORATION_EVENTS = [
  { type: 'normal_battle', title: '普通战斗', description: '击退巡游兽群，获得基础探索线索。', explorationGain: 20, gold: 80 },
  { type: 'elite_battle', title: '精英战斗', description: '发现高威胁精英踪迹，记录其阵法弱点。', explorationGain: 20, gold: 140 },
  { type: 'story', title: '剧情事件', description: '解读地区手记，推进当前章节故事。', explorationGain: 20, gold: 60 },
  { type: 'chest', title: '遗迹宝箱', description: '战斗后找到被藤蔓遮住的旧宝箱。', explorationGain: 20, gold: 180 },
  { type: 'pet_discovery', title: '宠物发现', description: '记录新的宠物足迹与生活区域。', explorationGain: 20, gold: 90 },
  { type: 'gathering', title: '材料采集', description: '清理威胁后完成一次安全采集。', explorationGain: 20, gold: 110 },
  { type: 'random', title: '随机事件', description: '临时路线带来了意外的探索收获。', explorationGain: 20, gold: 120 },
] as const;

@Injectable()
export class ExplorationService {
  constructor(
    @InjectRepository(WorldExplorationProgress)
    private readonly progressRepository: Repository<WorldExplorationProgress>,
    @InjectRepository(BattleSessionV10)
    private readonly sessionRepository: Repository<BattleSessionV10>,
    private readonly eggService: EggService,
    private readonly petService: PetService,
    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  async getWorld(userId = DEFAULT_USER_ID) {
    const progress = await this.getProgress(userId);
    await this.refreshDaily(progress);
    return this.toWorldView(progress);
  }

  async settleExplore(userId = DEFAULT_USER_ID, regionCode: string, sessionId: number) {
    return this.settleRegionBattle(userId, regionCode, sessionId, false);
  }

  async settleNest(userId = DEFAULT_USER_ID, regionCode: string, sessionId: number) {
    return this.settleRegionBattle(userId, regionCode, sessionId, true);
  }

  private async settleRegionBattle(userId: number, regionCode: string, sessionId: number, boss: boolean) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const progressRepository = manager.getRepository(WorldExplorationProgress);
      const sessionRepository = manager.getRepository(BattleSessionV10);
      let progress = await progressRepository.findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!progress) {
        progress = progressRepository.create({
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
        progress = await progressRepository.save(progress);
      }
      progress.regions = this.normalizeRegions(progress.regions);
      progress.settledSessionIds = Array.isArray(progress.settledSessionIds) ? progress.settledSessionIds : [];
      this.refreshDailyState(progress);

      const region = this.region(regionCode);
      const state = progress.regions[region.code];
      if (!state?.unlocked) return { progress, success: false, message: '该地区尚未解锁' };
      if (boss && !state.nestUnlocked) return { progress, success: false, message: '探索度达到100%后才能挑战首领巢穴' };

      const battle = await sessionRepository.findOne({ where: { id: sessionId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!battle || battle.status === 'active') return { progress, success: false, message: '战斗尚未结束或会话不存在' };
      if (boss && !battle.bossBattle) return { progress, success: false, message: '该战斗不是首领巢穴挑战' };
      if (battle.regionCode && battle.regionCode !== region.code) return { progress, success: false, message: '战斗地区与结算地区不一致' };

      if (battle.rewardStatus === 'claimed' || battle.settled || this.wasSettled(progress, sessionId)) {
        return { progress, success: true, duplicate: true, won: battle.winnerSide === 'left', message: boss ? '本场巢穴战已经结算' : '本场探索已经结算', settlement: battle.resultSnapshot || {} };
      }

      const won = battle.winnerSide === 'left';
      this.markSettled(progress, sessionId);
      if (!won) {
        const settlement = this.regionSettlementSnapshot(battle, false, {}, state, boss, '');
        battle.rewardStatus = 'claimed';
        battle.rewardClaimedAt = new Date();
        battle.settlementKey = `exploration:${region.code}:${sessionId}`;
        battle.resultSnapshot = settlement;
        battle.rewards = {};
        battle.settled = true;
        await sessionRepository.save(battle);
        await progressRepository.save(progress);
        return { progress, success: true, won: false, settlement, message: boss ? '战败不消耗巢穴奖励次数' : '探索失败不消耗体力，调整阵法后可再次挑战' };
      }

      if (boss && this.attemptView(progress).remaining <= 0) {
        return { progress, success: false, won: true, message: '今日巢穴奖励次数已用完，本场不消耗也不发放宠物蛋' };
      }

      const base = battleRewardConfig(boss ? 'boss' : 'pve', boss);
      let message = '';
      let egg: any = null;
      let event: any = null;
      let unlockedRegionCode = '';
      let explorationGain = 0;
      let firstClear = false;
      const rewards: any = { ...base, items: { ...(base.items || {}) }, firstClear: false, stars: 0 };

      if (!boss) {
        const clearedStages: string[] = Array.isArray(state.clearedStages) ? state.clearedStages.map(String) : [];
        const nextStageCode = this.nextUnclearedStage(clearedStages);
        const stageCode = String(battle.stageCode || nextStageCode || 'stage-5');
        if (!clearedStages.includes(stageCode) && nextStageCode && stageCode !== nextStageCode) {
          return { progress, success: false, won: true, message: `前置关卡尚未完成，请先挑战 ${nextStageCode}` };
        }
        firstClear = !clearedStages.includes(stageCode);
        event = EXPLORATION_EVENTS[Number(state.exploreWins || 0) % EXPLORATION_EVENTS.length];
        const firstRegionReward = !state.firstRewardClaimed;
        const firstRewardGold = firstRegionReward ? Number(region.firstRewards[0]?.amount || 0) : 0;
        rewards.gold += Number(event.gold || 0) + firstRewardGold;
        rewards.firstClear = firstClear;
        rewards.stars = this.battleStars(battle);
        if (firstClear) {
          clearedStages.push(stageCode);
          explorationGain = Number(event.explorationGain || 0);
          state.exploration = Math.min(100, clearedStages.length * 20);
        }
        state.clearedStages = clearedStages;
        state.stageStars = { ...(state.stageStars || {}), [stageCode]: Math.max(Number(state.stageStars?.[stageCode] || 0), rewards.stars) };
        state.speciesDiscovered = Math.max(Number(state.speciesDiscovered || 0), state.exploration >= 60 ? 2 : 1);
        state.nestUnlocked = state.exploration >= 100;
        state.exploreWins = Number(state.exploreWins || 0) + 1;
        state.firstRewardClaimed = true;
        state.lastEvent = { ...event, firstClear, stageCode, explorationGain, reward: rewards, at: new Date().toISOString() };
        state.eventHistory = [...(Array.isArray(state.eventHistory) ? state.eventHistory : []), state.lastEvent].slice(-7);
        message = state.nestUnlocked ? `${region.name}探索度已满，首领巢穴开放！` : firstClear ? `${region.name}探索度提升至${state.exploration}%` : '重复挑战完成，首次探索度不会重复增加';
      } else {
        this.consumeAttempt(progress);
        const rarity = this.rollRarity(progress);
        const isMutant = this.rollMutation(progress);
        egg = await this.eggService.createEgg({
          ownerId: userId,
          rarityPotential: rarity,
          source: `region_nest:${region.code}`,
          speciesCode: region.speciesCode,
          species: region.speciesName,
          isMutant,
          quality: 92 + Math.floor(Math.random() * 20),
          skillSlotCount: Math.min(8, 3 + Math.max(0, rarity - 2)),
          specialSkillCount: rarity >= 5 ? 1 : 0,
        }, manager);
        firstClear = !state.bossCleared;
        if (firstClear) rewards.gold += Number(region.completionRewards.find((reward) => reward.type === 'gold')?.amount || 0);
        rewards.firstClear = firstClear;
        rewards.stars = this.battleStars(battle);
        state.bossCleared = true;
        state.bossWins = Number(state.bossWins || 0) + 1;
        state.eggsEarned = Number(state.eggsEarned || 0) + 1;
        const index = REGIONS.findIndex((item) => item.code === region.code);
        if (index >= 0 && index + 1 < REGIONS.length) {
          const next = REGIONS[index + 1];
          progress.regions[next.code] = { ...progress.regions[next.code], unlocked: true };
          unlockedRegionCode = next.code;
        }
        message = firstClear && unlockedRegionCode ? `首领巢穴胜利，${region.chapter}完成并解锁下一地区` : `首领巢穴胜利，获得${region.speciesName}宠物蛋`;
      }

      await this.grantBattleRewards(manager, battle, rewards);
      progress.currentRegionCode = region.code;
      progress.regions[region.code] = state;
      const settlement = this.regionSettlementSnapshot(battle, true, rewards, state, boss, unlockedRegionCode);
      battle.rewards = rewards;
      battle.resultSnapshot = settlement;
      battle.rewardStatus = 'claimed';
      battle.rewardClaimedAt = new Date();
      battle.settlementKey = `exploration:${region.code}:${sessionId}`;
      battle.settled = true;
      await sessionRepository.save(battle);
      await progressRepository.save(progress);
      return { progress, success: true, won: true, message, settlement, event: state.lastEvent, egg: egg ? this.eggService.toEggView(egg) : null, unlockedRegionCode, chapterCompleted: boss && firstClear };
    });

    return { ...outcome, ...(await this.toWorldView(outcome.progress)) };
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
      bossCleared: false,
      firstRewardClaimed: false,
      clearedStages: [],
      stageStars: {},
      lastEvent: null,
      eventHistory: [],
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

  private refreshDailyState(progress: WorldExplorationProgress) {
    const today = this.today();
    if (progress.dailyDate === today) return;
    if (progress.dailyDate) {
      const unused = Math.max(0, this.dailyLimit(progress) - Number(progress.dailyNestWins || 0));
      progress.storedNestAttempts = Math.min(6, Number(progress.storedNestAttempts || 0) + unused);
    }
    progress.dailyDate = today;
    progress.dailyNestWins = 0;
  }

  private battleStars(battle: BattleSessionV10) {
    const team = Array.isArray(battle.leftTeam) ? battle.leftTeam : [];
    const survivors = team.filter((unit: any) => unit?.alive && Number(unit?.hp || 0) > 0).length;
    if (survivors >= 5 && Number(battle.round || 99) <= 12) return 3;
    if (survivors >= 3) return 2;
    return 1;
  }

  private async grantBattleRewards(manager: EntityManager, battle: BattleSessionV10, rewards: any) {
    await this.economyService.grant(manager, battle.userId, { gold: rewards.gold, diamond: rewards.diamond, items: rewards.items });
    const userRepository = manager.getRepository(User);
    const user = await userRepository.findOne({ where: { id: battle.userId }, lock: { mode: 'pessimistic_write' } });
    if (!user) throw new Error('User not found');
    user.exp = Number(user.exp || 0) + Number(rewards.playerExp || 0);
    let nextExp = Math.max(100, Number(user.level || 1) * 100);
    while (user.exp >= nextExp) {
      user.exp -= nextExp;
      user.level = Number(user.level || 1) + 1;
      nextExp = Math.max(100, Number(user.level || 1) * 100);
    }
    await userRepository.save(user);

    const petRepository = manager.getRepository(Pet);
    const petIds = [...new Set((Array.isArray(battle.leftTeam) ? battle.leftTeam : []).map((unit: any) => Number(unit?.petId || 0)).filter((id: number) => id > 0))];
    rewards.petUpdates = [];
    for (const petId of petIds) {
      const pet = await petRepository.findOne({ where: { id: Number(petId), ownerId: battle.userId, isEgg: false }, lock: { mode: 'pessimistic_write' } });
      if (!pet) continue;
      const before = { level: pet.level, exp: pet.exp };
      const saved = await this.petService.addExp(pet, Number(rewards.petExp || 0), manager);
      rewards.petUpdates.push({ petId, name: this.cleanPetName(saved.nickname || saved.species), before, after: { level: saved.level, exp: saved.exp }, gainedExp: Number(rewards.petExp || 0) });
    }
  }

  private regionSettlementSnapshot(battle: BattleSessionV10, won: boolean, reward: any, state: any, boss: boolean, unlockedRegionCode: string) {
    const left = Array.isArray(battle.leftTeam) ? battle.leftTeam : [];
    const right = Array.isArray(battle.rightTeam) ? battle.rightTeam : [];
    const sum = (team: any[], key: string) => team.reduce((total, unit) => total + Number(unit?.[key] || 0), 0);
    return {
      battleId: battle.battleId,
      sessionId: battle.id,
      result: won ? 'win' : 'lose',
      mode: boss ? 'boss' : 'explore',
      chapterCode: battle.chapterCode,
      regionCode: battle.regionCode,
      stageCode: battle.stageCode,
      rounds: battle.round,
      survivingPets: left.filter((unit: any) => unit?.alive && Number(unit?.hp || 0) > 0).map((unit: any) => ({ petId: unit.petId, name: unit.name, hp: unit.hp, maxHp: unit.maxHp })),
      statistics: { totalDamage: sum(left, 'damageDealt'), totalHealing: sum(left, 'healingDone'), damageTaken: sum(left, 'damageTaken'), enemyDamage: sum(right, 'damageDealt') },
      reward,
      exploration: { value: Number(state?.exploration || 0), nestUnlocked: Boolean(state?.nestUnlocked), bossCleared: Boolean(state?.bossCleared), unlockedRegionCode },
      failureReason: won ? '' : '本次阵容未能完成关卡目标，请调整编队或阵法',
      nextActions: won ? ['next-stage', 'retry', 'return-adventure'] : ['adjust-team', 'change-formation', 'strengthen-pet', 'retry', 'return-adventure'],
      settledAt: new Date().toISOString(),
    };
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

  private async grantGold(userId: number, gold: number) {
    const amount = Math.max(0, Math.floor(Number(gold || 0)));
    if (!amount) return;
    await this.economyService.transaction((manager) => this.economyService.grant(manager, userId, { gold: amount }));
  }

  private async toWorldView(progress: WorldExplorationProgress) {
    const regions = REGIONS.map((region, index) => {
      const state = progress.regions?.[region.code] || {};
      const clearedStages = Array.isArray(state.clearedStages) ? state.clearedStages.map(String) : [];
      const stageStars = state.stageStars && typeof state.stageStars === 'object' ? state.stageStars : {};
      return {
        ...region,
        index,
        ...state,
        clearedStages,
        stageStars,
        nextStageCode: this.nextUnclearedStage(clearedStages),
        stages: this.stageSequence().map((code) => ({ code, cleared: clearedStages.includes(code), stars: Number(stageStars[code] || 0) })),
      };
    });
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

  private stageSequence() {
    return ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'];
  }

  private nextUnclearedStage(clearedStages: string[]) {
    const cleared = new Set((clearedStages || []).map(String));
    return this.stageSequence().find((code) => !cleared.has(code)) || '';
  }

  private cleanPetName(value: unknown) {
    const cleaned = String(value || '宝宝')
      .replace(/\b(?:common|uncommon|rare|epic|legendary|mythic)\b/gi, ' ')
      .replace(/普通|优秀|稀有|史诗|传说|神话/g, ' ')
      .replace(/\bPET[-_\s]*\d+\b/gi, ' ')
      .replace(/(?:^|[\s_#-])(?:[A-Z]{0,3}-?)?\d{6,}(?=$|[\s_#-])/gi, ' ')
      .replace(/[-_\s]?[A-Z]?-?\d{6,}$/i, '')
      .replace(/[|｜·]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || '宝宝';
  }
}
