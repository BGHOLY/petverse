import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EconomyService } from '../economy/economy.service';
import { FormationService } from '../formation/formation.service';
import { DEFAULT_USER_ID } from '../game-data';
import { InventoryService } from '../inventory/inventory.service';
import { Pet } from '../pet/pet.entity';
import { TeamService } from '../team/team.service';
import { GuildBossRecord } from './guild-boss-record.entity';
import { GuildDonation } from './guild-donation.entity';
import { GuildExpedition } from './guild-expedition.entity';
import { GuildHelpRequest } from './guild-help.entity';
import { GuildMember } from './guild-member.entity';
import { GuildTask } from './guild-task.entity';
import { Guild } from './guild.entity';

@Injectable()
export class GuildService {
  constructor(
    @InjectRepository(Guild) private readonly guildRepository: Repository<Guild>,
    @InjectRepository(GuildMember) private readonly memberRepository: Repository<GuildMember>,
    @InjectRepository(GuildTask) private readonly taskRepository: Repository<GuildTask>,
    @InjectRepository(GuildBossRecord) private readonly bossRecordRepository: Repository<GuildBossRecord>,
    @InjectRepository(GuildDonation) private readonly donationRepository: Repository<GuildDonation>,
    @InjectRepository(GuildExpedition) private readonly expeditionRepository: Repository<GuildExpedition>,
    @InjectRepository(GuildHelpRequest) private readonly helpRepository: Repository<GuildHelpRequest>,
    @InjectRepository(Pet) private readonly petRepository: Repository<Pet>,
    private readonly economyService: EconomyService,
    private readonly inventoryService: InventoryService,
    private readonly formationService: FormationService,
    private readonly teamService: TeamService,
  ) {}

  async getMyGuild(userId = DEFAULT_USER_ID) {
    const member = await this.getMember(userId);
    if (!member) {
      return {
        success: true,
        joined: false,
        recommended: await this.getOrCreateBetaGuild(),
        unlockHint: '主线第二章或玩家等级10级解锁公会。测试版可直接加入。',
      };
    }
    const guild = await this.guildRepository.findOne({ where: { id: member.guildId } });
    if (!guild) return { success: false, message: 'Guild not found' };
    await this.refreshGuildWeek(guild);
    this.refreshMemberPeriods(member);
    await this.memberRepository.save(member);
    const members = await this.memberRepository.find({ where: { guildId: guild.id }, order: { weeklyContribution: 'DESC' } });
    const bossRecord = await this.ensureBossRecord(guild.id, userId);
    const tasks = await this.ensureTasks(guild.id, userId);
    const expedition = await this.expeditionRepository.findOne({ where: { userId, status: 'running' }, order: { id: 'DESC' } });
    return {
      success: true,
      joined: true,
      guild,
      member,
      members,
      memberCount: members.length,
      boss: this.bossView(guild, bossRecord, member),
      tasks,
      expedition: expedition ? this.expeditionView(expedition) : null,
      research: this.researchView(guild.level),
      shop: this.shopConfig(),
      data: { guild, member, members, tasks },
    };
  }

  async createGuild(userId: number, name: string) {
    if (await this.getMember(userId)) return { success: false, message: 'Already in a guild' };
    const normalized = String(name || '').trim().slice(0, 16);
    if (normalized.length < 2) return { success: false, message: 'Guild name must be at least 2 characters' };
    const exists = await this.guildRepository.findOne({ where: { name: normalized } });
    if (exists) return { success: false, message: 'Guild name already exists' };
    const guild = await this.guildRepository.save(this.guildRepository.create({
      name: normalized,
      level: 1,
      exp: 0,
      funds: 0,
      weeklyActivity: 0,
      memberLimit: 30,
      bossWeekKey: this.weekKey(),
      bossMaxHp: 1000000,
      bossHp: 1000000,
      bossPhase: 1,
    }));
    await this.memberRepository.save(this.memberRepository.create({
      guildId: guild.id,
      userId,
      role: 'leader',
      contribution: 0,
      weeklyContribution: 0,
      contributionWeekKey: this.weekKey(),
      lastSignDate: '',
      bossAttemptDate: this.dayKey(),
      bossAttemptsToday: 0,
      carriedBossAttempts: 0,
    }));
    return this.getMyGuild(userId);
  }

  async joinDefault(userId: number) {
    if (await this.getMember(userId)) return this.getMyGuild(userId);
    const guild = await this.getOrCreateBetaGuild();
    const count = await this.memberRepository.count({ where: { guildId: guild.id } });
    if (count >= guild.memberLimit) return { success: false, message: 'Guild is full' };
    await this.memberRepository.save(this.memberRepository.create({
      guildId: guild.id,
      userId,
      role: 'member',
      contribution: 0,
      weeklyContribution: 0,
      contributionWeekKey: this.weekKey(),
      lastSignDate: '',
      bossAttemptDate: this.dayKey(),
      bossAttemptsToday: 0,
      carriedBossAttempts: 0,
    }));
    return this.getMyGuild(userId);
  }

  async signIn(userId: number) {
    const member = await this.requireMember(userId);
    if (!member.success) return member;
    const row = member.member as GuildMember;
    this.refreshMemberPeriods(row);
    if (row.lastSignDate === this.dayKey()) return { success: false, message: 'Already signed in today' };
    row.lastSignDate = this.dayKey();
    await this.addContribution(row, 20);
    await this.formationService.grant(userId, 10, 0);
    const guild = await this.guildRepository.findOne({ where: { id: row.guildId } });
    if (guild) {
      guild.weeklyActivity += 10;
      guild.funds += 100;
      await this.guildRepository.save(guild);
    }
    await this.incrementTaskProgress(row.guildId, userId, 'sign', 1);
    return { success: true, message: 'Guild sign-in complete: +20 contribution, +10 formation knowledge', member: row };
  }

  async donate(userId: number, donationType: string, amount: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    this.refreshMemberPeriods(member);
    const dayKey = this.dayKey();
    const count = await this.donationRepository.count({ where: { userId, guildId: member.guildId, dayKey } });
    if (count >= 3) return { success: false, message: 'Daily guild donation limit reached' };
    const type = donationType === 'diamond' ? 'diamond' : 'gold';
    const normalized = type === 'diamond'
      ? Math.max(10, Math.min(100, Math.floor(Number(amount || 10))))
      : Math.max(1000, Math.min(30000, Math.floor(Number(amount || 1000))));
    try {
      await this.economyService.transaction(async (manager) => {
        await this.economyService.spend(manager, userId, type === 'diamond' ? { diamond: normalized } : { gold: normalized });
      });
    } catch (error: any) {
      return { success: false, message: String(error?.message || 'Donation failed') };
    }
    const contribution = type === 'diamond' ? normalized * 2 : Math.max(10, Math.floor(normalized / 100));
    await this.addContribution(member, contribution);
    await this.formationService.grant(userId, 10, 0);
    const guild = await this.guildRepository.findOne({ where: { id: member.guildId } });
    if (guild) {
      guild.funds += type === 'diamond' ? normalized * 50 : normalized;
      guild.exp += Math.max(1, Math.floor(contribution / 2));
      guild.weeklyActivity += Math.max(5, Math.floor(contribution / 4));
      this.recalculateGuildLevel(guild);
      await this.guildRepository.save(guild);
    }
    await this.donationRepository.save(this.donationRepository.create({
      guildId: member.guildId,
      userId,
      donationType: type,
      amount: normalized,
      contribution,
      dayKey,
    }));
    await this.incrementTaskProgress(member.guildId, userId, 'donate', 1);
    return { success: true, message: `Donation complete: +${contribution} contribution, +10 formation knowledge`, contribution };
  }

  async getTasks(userId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    return { success: true, tasks: await this.ensureTasks(member.guildId, userId) };
  }

  async claimTask(userId: number, taskId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const task = await this.taskRepository.findOne({ where: { id: taskId, userId, guildId: member.guildId, weekKey: this.weekKey() } });
    if (!task) return { success: false, message: 'Guild task not found' };
    if (task.claimed) return { success: false, message: 'Guild task already claimed' };
    if (task.progress < task.target) {
      return { success: false, message: 'Guild task is not complete yet', task };
    }
    const claimedCount = await this.taskRepository.count({ where: { userId, guildId: member.guildId, weekKey: this.weekKey(), claimed: true } });
    if (claimedCount >= 2) return { success: false, message: 'Weekly guild personal tasks are three-choose-two; reward limit reached' };
    task.claimed = true;
    await this.taskRepository.save(task);
    await this.addContribution(member, task.contributionReward);
    await this.formationService.grant(userId, task.formationKnowledgeReward, 0);
    const guild = await this.guildRepository.findOne({ where: { id: member.guildId } });
    if (guild) {
      guild.weeklyActivity += 40;
      await this.guildRepository.save(guild);
    }
    return { success: true, message: `Task complete: +${task.contributionReward} contribution, +${task.formationKnowledgeReward} formation knowledge`, task };
  }

  async bossStatus(userId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const guild = await this.guildRepository.findOne({ where: { id: member.guildId } });
    if (!guild) return { success: false, message: 'Guild not found' };
    await this.refreshGuildWeek(guild);
    this.refreshMemberPeriods(member);
    await this.memberRepository.save(member);
    const record = await this.ensureBossRecord(guild.id, userId);
    const rankings = await this.bossRecordRepository.find({ where: { guildId: guild.id, weekKey: this.weekKey() }, order: { damage: 'DESC' }, take: 20 });
    return { success: true, boss: this.bossView(guild, record, member), rankings };
  }

  async challengeBoss(userId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const guild = await this.guildRepository.findOne({ where: { id: member.guildId } });
    if (!guild) return { success: false, message: 'Guild not found' };
    await this.refreshGuildWeek(guild);
    this.refreshMemberPeriods(member);
    const available = Math.min(4, 2 - member.bossAttemptsToday + member.carriedBossAttempts);
    if (available <= 0) return { success: false, message: 'No guild boss attempts available today' };
    const team = await this.teamService.getTeam(userId);
    if (!Array.isArray(team.pets) || team.pets.length < 5) return { success: false, message: 'Guild boss requires a complete five-pet team' };
    const damage = Math.max(1000, Math.round(team.pets.reduce((sum: number, pet: Pet) => {
      const stats: any = (pet as any).finalAttributes || {};
      return sum + Number(stats.attack || pet.attack || 20) * 12 + Number(stats.magic || pet.intelligence || 20) * 12 + Number(stats.hp || pet.hp || 100) * 0.6;
    }, 0) * (0.88 + Math.random() * 0.24)));
    guild.bossHp = Math.max(0, guild.bossHp - damage);
    guild.bossPhase = guild.bossHp <= guild.bossMaxHp * 0.25 ? 4 : guild.bossHp <= guild.bossMaxHp * 0.5 ? 3 : guild.bossHp <= guild.bossMaxHp * 0.75 ? 2 : 1;
    if (member.bossAttemptsToday < 2) member.bossAttemptsToday += 1;
    else member.carriedBossAttempts = Math.max(0, Number(member.carriedBossAttempts || 0) - 1);
    await this.memberRepository.save(member);
    await this.guildRepository.save(guild);
    const record = await this.ensureBossRecord(guild.id, userId);
    record.damage += damage;
    record.attempts += 1;
    await this.bossRecordRepository.save(record);
    await this.addContribution(member, 30);
    await this.formationService.grant(userId, 15, 0);
    await this.incrementTaskProgress(member.guildId, userId, 'boss', 1);
    return {
      success: true,
      message: `Guild boss damage ${damage}: +30 contribution, +15 formation knowledge`,
      damage,
      boss: this.bossView(guild, record, member),
      battlePreview: {
        bossPhase: guild.bossPhase,
        mechanic: ['护盾阶段', '召唤阶段', '狂暴阶段', '净化考验'][guild.bossPhase - 1],
        playerTeam: team.pets,
      },
    };
  }

  async shop(userId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    return { success: true, items: this.shopConfig(), contribution: (memberResult.member as GuildMember).contribution };
  }

  async buyShopItem(userId: number, itemCode: string) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const item = this.shopConfig().find((entry) => entry.itemCode === itemCode);
    if (!item) return { success: false, message: 'Guild shop item not found' };
    if (member.contribution < item.price) return { success: false, message: 'Not enough guild contribution' };
    member.contribution -= item.price;
    await this.memberRepository.save(member);
    if (item.knowledge) await this.formationService.grant(userId, item.knowledge, 0);
    if (item.cores) await this.formationService.grant(userId, 0, item.cores);
    if (item.inventoryCode) {
      const currentQuantity = await this.inventoryService.getQuantity(userId, item.inventoryCode);
      const result = await this.inventoryService.ensureItemQuantity(userId, item.inventoryCode, currentQuantity + (item.quantity || 1));
      if (!result) return { success: false, message: 'Guild shop reward item is not configured in item table' };
    }
    return { success: true, message: `Purchased ${item.name}`, contribution: member.contribution, item };
  }

  async startExpedition(userId: number, petIds: number[], routeCode: string) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const running = await this.expeditionRepository.findOne({ where: { userId, status: 'running' } });
    if (running) return { success: false, message: 'A guild expedition is already running', expedition: this.expeditionView(running) };
    const ids = [...new Set((Array.isArray(petIds) ? petIds : []).map(Number).filter((id) => id > 0))].slice(0, 3);
    if (!ids.length) return { success: false, message: 'Select at least one expedition pet' };
    const pets = await this.petRepository.find({ where: { ownerId: userId, isEgg: false } });
    if (ids.some((id) => !pets.some((pet) => pet.id === id))) return { success: false, message: 'Invalid expedition pet' };
    const durationHours = 4;
    const expedition = await this.expeditionRepository.save(this.expeditionRepository.create({
      guildId: (memberResult.member as GuildMember).guildId,
      userId,
      petIds: ids,
      status: 'running',
      routeCode: String(routeCode || 'forest'),
      finishAt: new Date(Date.now() + durationHours * 3600 * 1000),
      reward: { formationKnowledge: 25 + ids.length * 5, contribution: 30 + ids.length * 10, gold: 1000 + ids.length * 500 },
    }));
    return { success: true, message: 'Guild expedition started. Main pets are not locked and may still battle.', expedition: this.expeditionView(expedition) };
  }

  async claimExpedition(userId: number, expeditionId: number, force = false) {
    const expedition = await this.expeditionRepository.findOne({ where: { id: expeditionId, userId, status: 'running' } });
    if (!expedition) return { success: false, message: 'Expedition not found' };
    if (new Date(expedition.finishAt).getTime() > Date.now() && !force) return { success: false, message: 'Expedition is not finished', expedition: this.expeditionView(expedition) };
    expedition.status = 'claimed';
    await this.expeditionRepository.save(expedition);
    const reward = expedition.reward || {};
    const member = await this.getMember(userId);
    if (member) await this.addContribution(member, Number(reward.contribution || 0));
    await this.formationService.grant(userId, Number(reward.formationKnowledge || 0), 0);
    try {
      await this.economyService.transaction(async (manager) => {
        await this.economyService.grant(manager, userId, { gold: Number(reward.gold || 0) });
      });
    } catch {}
    return { success: true, message: 'Guild expedition rewards claimed', reward, expedition: this.expeditionView(expedition) };
  }

  async getHelp(userId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const requests = await this.helpRepository.find({ where: { guildId: member.guildId, dayKey: this.dayKey() }, order: { id: 'DESC' } });
    return { success: true, requests };
  }

  async requestHelp(userId: number, resourceCode: string) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const allowed = ['hatch_accelerator', 'BOOK_LOW_PHYSICAL_COMBO', 'BOOK_LOW_MAGIC_COMBO', 'apple'];
    const code = allowed.includes(resourceCode) ? resourceCode : 'hatch_accelerator';
    const member = memberResult.member as GuildMember;
    let request = await this.helpRepository.findOne({ where: { guildId: member.guildId, userId, dayKey: this.dayKey(), resourceCode: code } });
    if (request) return { success: false, message: 'You already requested this resource today', request };
    request = await this.helpRepository.save(this.helpRepository.create({
      guildId: member.guildId,
      userId,
      dayKey: this.dayKey(),
      resourceCode: code,
      requested: 3,
      received: 0,
      donorUserIds: [],
    }));
    return { success: true, message: 'Guild help request created', request };
  }

  async donateHelp(userId: number, requestId: number) {
    const memberResult = await this.requireMember(userId);
    if (!memberResult.success) return memberResult;
    const member = memberResult.member as GuildMember;
    const request = await this.helpRepository.findOne({ where: { id: requestId, guildId: member.guildId, dayKey: this.dayKey() } });
    if (!request) return { success: false, message: 'Help request not found' };
    if (request.userId === userId) return { success: false, message: 'Cannot donate to your own request' };
    if (request.received >= request.requested) return { success: false, message: 'Help request is already complete' };
    const donors = Array.isArray(request.donorUserIds) ? request.donorUserIds : [];
    if (donors.includes(userId)) return { success: false, message: 'Already donated to this request today' };
    const consumed = await this.inventoryService.consumeItem(userId, request.resourceCode, 1);
    if (!consumed) return { success: false, message: 'Requested resource not available in your inventory' };
    request.received += 1;
    request.donorUserIds = [...donors, userId];
    await this.helpRepository.save(request);
    const receiver = await this.inventoryService.getQuantity(request.userId, request.resourceCode);
    await this.inventoryService.ensureItemQuantity(request.userId, request.resourceCode, receiver + 1);
    await this.addContribution(member, 10);
    return { success: true, message: 'Guild help donated: +10 contribution', request };
  }

  private async getMember(userId: number) {
    return this.memberRepository.findOne({ where: { userId } });
  }

  private async requireMember(userId: number): Promise<any> {
    const member = await this.getMember(userId);
    return member ? { success: true, member } : { success: false, message: 'Join a guild first' };
  }

  private async getOrCreateBetaGuild() {
    let guild = await this.guildRepository.findOne({ where: { name: '萌宠探险团' } });
    if (!guild) {
      guild = await this.guildRepository.save(this.guildRepository.create({
        name: '萌宠探险团',
        level: 1,
        exp: 0,
        funds: 0,
        weeklyActivity: 0,
        memberLimit: 30,
        notice: '异步参与，不强迫固定时间上线。欢迎一起挑战公会首领！',
        bossWeekKey: this.weekKey(),
        bossMaxHp: 1000000,
        bossHp: 1000000,
        bossPhase: 1,
      }));
    }
    await this.refreshGuildWeek(guild);
    return guild;
  }

  private async ensureTasks(guildId: number, userId: number) {
    const weekKey = this.weekKey();
    let tasks = await this.taskRepository.find({ where: { guildId, userId, weekKey }, order: { id: 'ASC' } });
    if (!tasks.length) {
      tasks = await this.taskRepository.save([
        this.taskRepository.create({ guildId, userId, weekKey, taskCode: 'sign', title: '完成1次公会签到', progress: 0, target: 1, contributionReward: 80, formationKnowledgeReward: 20 }),
        this.taskRepository.create({ guildId, userId, weekKey, taskCode: 'donate', title: '完成3次公会捐献', progress: 0, target: 3, contributionReward: 80, formationKnowledgeReward: 20 }),
        this.taskRepository.create({ guildId, userId, weekKey, taskCode: 'boss', title: '挑战2次公会首领', progress: 0, target: 2, contributionReward: 80, formationKnowledgeReward: 20 }),
      ]);
    }
    return tasks;
  }

  private async incrementTaskProgress(guildId: number, userId: number, taskCode: string, amount = 1) {
    const tasks = await this.ensureTasks(guildId, userId);
    const task = tasks.find((entry) => entry.taskCode === taskCode);
    if (!task || task.claimed) return task || null;
    task.progress = Math.min(task.target, Number(task.progress || 0) + Math.max(0, Math.floor(Number(amount || 0))));
    return this.taskRepository.save(task);
  }

  private async ensureBossRecord(guildId: number, userId: number) {
    const weekKey = this.weekKey();
    let record = await this.bossRecordRepository.findOne({ where: { guildId, userId, weekKey } });
    if (!record) record = await this.bossRecordRepository.save(this.bossRecordRepository.create({ guildId, userId, weekKey, damage: 0, attempts: 0, baseRewardClaimed: false }));
    return record;
  }

  private async addContribution(member: GuildMember, amount: number) {
    this.refreshMemberPeriods(member);
    member.contribution += Math.max(0, Math.floor(amount));
    member.weeklyContribution += Math.max(0, Math.floor(amount));
    await this.memberRepository.save(member);
  }

  private refreshMemberPeriods(member: GuildMember) {
    const week = this.weekKey();
    const day = this.dayKey();
    if (member.contributionWeekKey !== week) {
      member.contributionWeekKey = week;
      member.weeklyContribution = 0;
    }
    if (member.bossAttemptDate !== day) {
      const unused = Math.max(0, 2 - Number(member.bossAttemptsToday || 0));
      member.carriedBossAttempts = Math.min(2, Number(member.carriedBossAttempts || 0) + unused);
      member.bossAttemptDate = day;
      member.bossAttemptsToday = 0;
    }
  }

  private async refreshGuildWeek(guild: Guild) {
    const week = this.weekKey();
    if (guild.bossWeekKey === week) return;
    guild.bossWeekKey = week;
    guild.weeklyActivity = 0;
    guild.bossMaxHp = Math.round(1000000 * (1 + Math.max(0, guild.level - 1) * 0.18));
    guild.bossHp = guild.bossMaxHp;
    guild.bossPhase = 1;
    await this.guildRepository.save(guild);
  }

  private bossView(guild: Guild, record: GuildBossRecord, member: GuildMember) {
    const available = Math.max(0, Math.min(4, 2 - Number(member.bossAttemptsToday || 0) + Number(member.carriedBossAttempts || 0)));
    return {
      weekKey: this.weekKey(),
      name: '古树巢穴守卫',
      phase: guild.bossPhase,
      mechanic: ['护盾阶段', '召唤阶段', '狂暴阶段', '净化考验'][guild.bossPhase - 1],
      hp: guild.bossHp,
      maxHp: guild.bossMaxHp,
      hpRate: guild.bossMaxHp ? guild.bossHp / guild.bossMaxHp : 0,
      attemptsAvailable: available,
      dailyBaseAttempts: 2,
      maxStoredAttempts: 4,
      myDamage: record.damage,
      myAttempts: record.attempts,
      baseRewardThreshold: 50000,
      baseRewardEligible: record.damage >= 50000,
    };
  }

  private shopConfig() {
    return [
      { itemCode: 'formation_knowledge_50', name: '阵法心得×50', price: 180, knowledge: 50, weeklyLimit: 4 },
      { itemCode: 'formation_core', name: '阵眼核心×1', price: 1800, cores: 1, weeklyLimit: 1 },
      { itemCode: 'hatch_accelerator', name: '孵化加速道具', price: 120, inventoryCode: 'hatch_accelerator', quantity: 1, weeklyLimit: 5 },
      { itemCode: 'guild_room_decor', name: '公会小屋装饰券', price: 600, cosmetic: true, weeklyLimit: 1 },
    ];
  }

  private researchView(level: number) {
    return [
      { code: 'hatch_speed', name: '孵化协作', level: Math.min(10, level), effect: `孵化时间-${Math.min(10, level)}%`, pvpDisabled: true },
      { code: 'expedition_reward', name: '远征补给', level: Math.min(10, level), effect: `远征奖励+${Math.min(10, level) * 2}%`, pvpDisabled: true },
      { code: 'pet_exp', name: '伙伴训练', level: Math.min(10, level), effect: `PVE经验+${Math.min(10, level)}%`, pvpDisabled: true },
      { code: 'boss_damage', name: '首领研究', level: Math.min(10, level), effect: `公会首领伤害+${Math.min(10, level)}%`, pvpDisabled: true },
    ];
  }

  private expeditionView(expedition: GuildExpedition) {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(expedition.finishAt).getTime() - Date.now()) / 1000));
    return { ...expedition, remainingSeconds, canClaim: remainingSeconds <= 0 };
  }

  private recalculateGuildLevel(guild: Guild) {
    while (guild.level < 10 && guild.exp >= guild.level * 2000) {
      guild.exp -= guild.level * 2000;
      guild.level += 1;
    }
    guild.memberLimit = Math.min(50, 30 + Math.floor((guild.level - 1) / 2) * 5);
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
