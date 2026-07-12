import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_USER_ID } from '../game-data';
import { DailyTaskService } from '../daily-task/daily-task.service';
import { FormationService } from '../formation/formation.service';
import { formationLevelMultiplier, getFormationConfig } from '../formation/formation.config';
import { findPetSpeciesConfig, PET_SPECIES_CONFIGS } from '../pet/config/pet-species.config';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { TeamService } from '../team/team.service';
import { SeasonService } from '../season/season.service';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { BattleSessionV10 } from './battle-session.entity';

type Side = 'left' | 'right';
type DirectiveType = 'auto' | 'focus' | 'guard' | 'shield' | 'cleanse';

type BattleStatus = {
  type: string;
  rounds: number;
  value?: number;
  source?: string;
};

type BattleUnit = {
  id: string;
  petId: number;
  side: Side;
  slotIndex: number;
  name: string;
  species: string;
  speciesCode: string;
  rarity: number;
  level: number;
  role: string;
  maxHp: number;
  hp: number;
  attack: number;
  magic: number;
  defense: number;
  magicDefense: number;
  speed: number;
  shield: number;
  energy: number;
  alive: boolean;
  skills: any[];
  statuses: BattleStatus[];
  tauntRate: number;
  healingRate: number;
  damageRate: number;
  physicalDamageRate: number;
  magicDamageRate: number;
  damageReductionRate: number;
  singleDamageRate: number;
  executeDamageRate: number;
  shieldDamageRate: number;
  defenseIgnoreRate: number;
  critRate: number;
  openingShieldRate: number;
  surviveOnce: boolean;
  surviveUsed: boolean;
  protectedDamageRate: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
};

type RoundDirective = {
  type: DirectiveType;
  targetId?: string;
  useUltimate?: boolean;
};

@Injectable()
export class BattleV10Service {
  constructor(
    @InjectRepository(BattleSessionV10)
    private readonly sessionRepository: Repository<BattleSessionV10>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TowerRecord)
    private readonly towerRepository: Repository<TowerRecord>,
    private readonly teamService: TeamService,
    private readonly petService: PetService,
    private readonly formationService: FormationService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly seasonService: SeasonService,
  ) {}

  async startPve(userId = DEFAULT_USER_ID, body: any = {}) {
    const teamResult = await this.teamService.getTeam(userId);
    const pets = this.orderTeamPets(teamResult).slice(0, 5);
    if (pets.length !== 5) {
      return {
        success: false,
        message: `Five-pet battle requires 5 pets. Current team: ${pets.length}/5`,
        team: teamResult,
      };
    }

    const formationCode = getFormationConfig(body?.formationCode || teamResult.formationCode).code;
    const formationLevel = await this.formationService.getLevel(userId, formationCode);
    const averageLevel = Math.max(1, Math.round(pets.reduce((sum, pet) => sum + Number(pet.level || 1), 0) / pets.length));
    const bossBattle = Boolean(body?.boss || body?.mode === 'boss' || body?.mode === 'tower' || body?.mode === 'nest' || body?.mode === 'guild-boss');
    let difficulty = Math.max(0.8, Math.min(2.5, Number(body?.difficulty || (bossBattle ? 1.25 : 1))));
    if (body?.mode === 'tower') {
      const record = await this.towerRepository.findOne({ where: { userId } });
      const floor = Math.max(1, Number(record?.currentFloor || 1));
      difficulty = Math.max(difficulty, Math.min(2.5, 1.08 + (floor - 1) * 0.035));
    }
    const enemyFormationCode = getFormationConfig(body?.enemyFormationCode || this.randomFormationCode()).code;
    const leftTeam = this.buildPlayerUnits(pets, teamResult.slotAssignments, formationCode, formationLevel, 'left');
    const rightTeam = this.buildEnemyUnits(averageLevel, difficulty, enemyFormationCode, bossBattle, String(body?.enemySpeciesCode || ''));

    const session = await this.sessionRepository.save(this.sessionRepository.create({
      userId,
      mode: String(body?.mode || (bossBattle ? 'boss' : 'pve')),
      status: 'active',
      round: 1,
      maxRounds: bossBattle ? 35 : 25,
      formationCode,
      enemyFormationCode,
      leftTeam,
      rightTeam,
      cooldowns: this.initialCooldownState(formationCode, enemyFormationCode),
      tactics: teamResult.tactics || {},
      battleLog: [{ round: 0, type: 'start', text: `五宠出战：${getFormationConfig(formationCode).name} VS ${getFormationConfig(enemyFormationCode).name}` }],
      winnerSide: '',
      bossBattle,
      settled: false,
      rewards: {},
    }));

    return {
      success: true,
      message: 'Five-pet battle started',
      session: this.toSessionView(session),
      data: this.toSessionView(session),
    };
  }

  async getSession(userId: number, sessionId: number) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
    if (!session) return { success: false, message: 'Battle session not found' };
    return { success: true, session: this.toSessionView(session), data: this.toSessionView(session) };
  }

  async command(userId: number, sessionId: number, rawDirective: any) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
    if (!session) return { success: false, message: 'Battle session not found' };
    if (session.status !== 'active') {
      return { success: false, message: 'Battle has already ended', session: this.toSessionView(session) };
    }

    const directive = this.normalizeDirective(rawDirective);
    const enemyDirective = this.autoDirective(
      session.rightTeam as BattleUnit[],
      session.leftTeam as BattleUnit[],
      session.cooldowns?.right || {},
      session.tactics || {},
    );
    const roundEvents = this.runRound(session, directive, enemyDirective);
    session.battleLog = [...(session.battleLog || []), ...roundEvents];
    this.finishIfNeeded(session);
    if (session.status === 'active') session.round += 1;
    else await this.settleSession(session);
    await this.sessionRepository.save(session);

    return {
      success: true,
      message: session.status === 'active' ? `Round ${session.round - 1} completed` : 'Battle completed',
      roundEvents,
      session: this.toSessionView(session),
      data: this.toSessionView(session),
    };
  }

  async arena(userId = DEFAULT_USER_ID, body: any = {}) {
    const started = await this.startPve(userId, {
      ...body,
      mode: 'arena',
      difficulty: Number(body?.difficulty || 1.05),
      boss: false,
    });
    if (started.success === false) return started;
    const sessionId = Number(started.session?.id || 0);
    let latest: any = started;
    for (let index = 0; index < 35; index += 1) {
      const current = latest.session;
      if (!current || current.status !== 'active') break;
      const session = await this.sessionRepository.findOne({ where: { id: sessionId, userId } });
      if (!session) break;
      const directive = this.autoDirective(
        session.leftTeam as BattleUnit[],
        session.rightTeam as BattleUnit[],
        session.cooldowns?.left || {},
        session.tactics || {},
      );
      latest = await this.command(userId, sessionId, directive);
    }
    return {
      ...latest,
      mode: 'arena',
      auto: true,
      battleLog: latest.session?.battleLog || [],
      result: latest.session?.winnerSide === 'left' ? 'win' : 'lose',
    };
  }

  private runRound(session: BattleSessionV10, leftDirective: RoundDirective, rightDirective: RoundDirective) {
    const left = session.leftTeam as BattleUnit[];
    const right = session.rightTeam as BattleUnit[];
    const events: any[] = [{ round: session.round, type: 'round', text: `第 ${session.round} 回合` }];
    this.tickStatuses(left, session.round, events);
    this.tickStatuses(right, session.round, events);
    this.applyDirective(session, 'left', leftDirective, events);
    this.applyDirective(session, 'right', rightDirective, events);

    const order = [...left, ...right]
      .filter((unit) => unit.alive && unit.hp > 0)
      .sort((a, b) => b.speed - a.speed || a.slotIndex - b.slotIndex);
    for (const actor of order) {
      if (!actor.alive || actor.hp <= 0) continue;
      const allies = actor.side === 'left' ? left : right;
      const enemies = actor.side === 'left' ? right : left;
      if (!enemies.some((unit) => unit.alive && unit.hp > 0)) break;
      const stunned = actor.statuses.some((status) => status.type === 'stun' || status.type === 'freeze');
      if (stunned) {
        events.push({ round: session.round, type: 'status', actorId: actor.id, text: `${actor.name} 受到控制，跳过行动` });
        continue;
      }
      this.takeAction(session, actor, allies, enemies, events);
    }

    this.reduceCooldowns(session.cooldowns?.left);
    this.reduceCooldowns(session.cooldowns?.right);
    return events;
  }

  private takeAction(
    session: BattleSessionV10,
    actor: BattleUnit,
    allies: BattleUnit[],
    enemies: BattleUnit[],
    events: any[],
  ) {
    const livingAllies = allies.filter((unit) => unit.alive && unit.hp > 0);
    const lowAlly = livingAllies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if ((actor.role === 'healer' || actor.role === 'support') && lowAlly && lowAlly.hp / lowAlly.maxHp < 0.72) {
      const amount = Math.max(1, Math.round((actor.magic * 0.92 + lowAlly.maxHp * 0.045) * (1 + actor.healingRate)));
      lowAlly.hp = Math.min(lowAlly.maxHp, lowAlly.hp + amount);
      actor.healingDone += amount;
      events.push({ round: session.round, type: 'heal', actorId: actor.id, targetId: lowAlly.id, value: amount, text: `${actor.name} 治疗 ${lowAlly.name}，恢复 ${amount} 生命` });
      return;
    }

    if (actor.role === 'support' && session.round % 3 === 0) {
      const target = lowAlly || actor;
      const shield = Math.max(1, Math.round(target.maxHp * 0.07));
      target.shield += shield;
      events.push({ round: session.round, type: 'shield', actorId: actor.id, targetId: target.id, value: shield, text: `${actor.name} 为 ${target.name} 套上 ${shield} 护盾` });
      return;
    }

    const target = this.selectAttackTarget(session, actor, enemies);
    if (!target) return;
    const useMagic = actor.magic > actor.attack * 1.08 || actor.role === 'magic' || actor.role === 'healer';
    const skill = this.pickSkill(actor);
    const skillMultiplier = skill ? this.skillMultiplier(skill) : 1;
    const baseStat = useMagic ? actor.magic : actor.attack;
    const targetDefense = useMagic ? target.magicDefense : target.defense;
    let multiplier = 1 + actor.damageRate + actor.singleDamageRate + (useMagic ? actor.magicDamageRate : actor.physicalDamageRate);
    if (target.hp / target.maxHp < 0.35) multiplier += actor.executeDamageRate;
    if (target.statuses.some((status) => status.type === 'huntMark')) multiplier += 0.12;
    multiplier *= skillMultiplier;
    const defenseIgnore = Math.min(0.6, actor.defenseIgnoreRate);
    let damage = Math.max(1, Math.round(baseStat * multiplier - targetDefense * 0.45 * (1 - defenseIgnore)));
    const critical = Math.random() < Math.min(0.55, 0.05 + actor.critRate);
    if (critical) damage = Math.round(damage * 1.5);
    damage = Math.max(1, Math.round(damage * (1 - target.damageReductionRate)));

    const guard = this.guardRedirect(session, target, actor.side === 'left' ? 'right' : 'left');
    if (guard && guard.id !== target.id) {
      const redirected = Math.round(damage * 0.4);
      const remaining = damage - redirected;
      this.applyDamage(session, actor, guard, redirected, events, `${guard.name} 为 ${target.name} 分担伤害`);
      this.applyDamage(session, actor, target, remaining, events, '守护后的剩余伤害', critical, skill);
    } else {
      this.applyDamage(session, actor, target, damage, events, '', critical, skill);
    }

    if (skill && target.alive) this.tryApplySkillStatus(skill, actor, target, session.round, events);
  }

  private applyDamage(
    session: BattleSessionV10,
    actor: BattleUnit,
    target: BattleUnit,
    rawDamage: number,
    events: any[],
    note = '',
    critical = false,
    skill?: any,
  ) {
    let damage = Math.max(0, Math.round(rawDamage));
    const shieldDamage = Math.min(target.shield, damage * (1 + actor.shieldDamageRate));
    if (shieldDamage > 0) {
      const consumed = Math.min(target.shield, Math.round(shieldDamage));
      target.shield -= consumed;
      damage = Math.max(0, damage - consumed);
    }
    target.hp = Math.max(0, target.hp - damage);
    actor.damageDealt += damage;
    target.damageTaken += damage;
    const skillName = skill?.name || skill?.displayName || '';
    events.push({
      round: session.round,
      type: 'damage',
      actorId: actor.id,
      targetId: target.id,
      value: damage,
      shieldValue: Math.round(shieldDamage),
      critical,
      skillName,
      text: `${actor.name}${skillName ? ` 使用 ${skillName}` : ' 发起攻击'}，${critical ? '暴击 ' : ''}对 ${target.name} 造成 ${damage} 伤害${note ? `（${note}）` : ''}`,
    });
    if (target.hp <= 0) this.handleDefeat(session, target, events);
  }

  private handleDefeat(session: BattleSessionV10, target: BattleUnit, events: any[]) {
    if (target.surviveOnce && !target.surviveUsed) {
      target.surviveUsed = true;
      target.hp = 1;
      target.shield += Math.round(target.maxHp * 0.08);
      events.push({ round: session.round, type: 'survive', targetId: target.id, text: `${target.name} 触发复苏位效果，保留1点生命并获得护盾` });
      return;
    }
    target.alive = false;
    target.hp = 0;
    events.push({ round: session.round, type: 'defeat', targetId: target.id, text: `${target.name} 倒下了` });
  }

  private applyDirective(session: BattleSessionV10, side: Side, directive: RoundDirective, events: any[]) {
    const allies = (side === 'left' ? session.leftTeam : session.rightTeam) as BattleUnit[];
    const enemies = (side === 'left' ? session.rightTeam : session.leftTeam) as BattleUnit[];
    const cooldowns = session.cooldowns?.[side] || {};
    const normalized = directive.type === 'auto'
      ? this.autoDirective(allies, enemies, cooldowns, side === 'left' ? session.tactics : {})
      : directive;

    if (normalized.type === 'focus') {
      const target = enemies.find((unit) => unit.id === normalized.targetId && unit.alive) || this.lowestHpUnit(enemies);
      cooldowns.focusTargetId = target?.id || '';
      if (target) events.push({ round: session.round, type: 'command', side, command: 'focus', targetId: target.id, text: `${side === 'left' ? '我方' : '敌方'}集火 ${target.name}` });
    }

    if (normalized.type === 'guard' && Number(cooldowns.guard || 0) <= 0) {
      const target = allies.find((unit) => unit.id === normalized.targetId && unit.alive) || this.guardTargetByTactics(allies, session.tactics);
      const protector = this.bestProtector(allies, target?.id);
      if (target && protector) {
        cooldowns.guard = 2;
        cooldowns.guardTargetId = target.id;
        cooldowns.guardProtectorId = protector.id;
        cooldowns.guardRounds = 1;
        events.push({ round: session.round, type: 'command', side, command: 'guard', targetId: target.id, actorId: protector.id, text: `${protector.name} 本回合守护 ${target.name}` });
      }
    }

    if (normalized.type === 'shield' && Number(cooldowns.shield || 0) <= 0) {
      const targets = allies.filter((unit) => unit.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
      for (const target of targets) {
        const amount = Math.max(1, Math.round(target.maxHp * 0.08));
        target.shield += amount;
        events.push({ round: session.round, type: 'command-shield', side, command: 'shield', targetId: target.id, value: amount, text: `战术套盾：${target.name} 获得 ${amount} 护盾` });
      }
      cooldowns.shield = 3;
    }

    if (normalized.type === 'cleanse' && Number(cooldowns.cleanse || 0) <= 0) {
      const target = allies.find((unit) => unit.id === normalized.targetId && unit.alive) ||
        allies.filter((unit) => unit.alive).sort((a, b) => this.debuffScore(b) - this.debuffScore(a))[0];
      if (target) {
        const before = target.statuses.length;
        const removable = target.statuses.filter((status) => ['stun', 'freeze', 'dot', 'healBlock', 'slow'].includes(status.type));
        const removeTypes = new Set(removable.sort((a, b) => this.statusPriority(b.type) - this.statusPriority(a.type)).slice(0, 2).map((status) => status.type));
        target.statuses = target.statuses.filter((status) => !removeTypes.has(status.type));
        cooldowns.cleanse = 3;
        events.push({ round: session.round, type: 'command-cleanse', side, command: 'cleanse', targetId: target.id, value: before - target.statuses.length, text: `战术净化：为 ${target.name} 清除 ${before - target.statuses.length} 个负面状态` });
      }
    }

    if (normalized.useUltimate) this.useFormationUltimate(session, side, events);
    session.cooldowns[side] = cooldowns;
  }

  private useFormationUltimate(session: BattleSessionV10, side: Side, events: any[]) {
    const cooldowns = session.cooldowns?.[side] || {};
    const formationCode = side === 'left' ? session.formationCode : session.enemyFormationCode;
    const config = getFormationConfig(formationCode);
    if (session.round < config.ultimate.initialCooldown || Number(cooldowns.ultimate || 0) > 0) return;
    const allies = (side === 'left' ? session.leftTeam : session.rightTeam) as BattleUnit[];
    const enemies = (side === 'left' ? session.rightTeam : session.leftTeam) as BattleUnit[];
    const livingAllies = allies.filter((unit) => unit.alive);
    const livingEnemies = enemies.filter((unit) => unit.alive);
    if (!livingAllies.length || !livingEnemies.length) return;

    events.push({ round: session.round, type: 'ultimate', side, formationCode, text: `${side === 'left' ? '我方' : '敌方'}发动阵法大招：${config.ultimate.name}` });
    if (formationCode === 'dragon') {
      const target = livingEnemies.find((unit) => unit.id === cooldowns.focusTargetId) || this.lowestHpUnit(livingEnemies)!;
      for (const actor of livingAllies) {
        this.applyDamage(session, actor, target, Math.max(1, Math.round(Math.max(actor.attack, actor.magic) * 0.35)), events, '龙威合击');
        if (!target.alive) break;
      }
      for (const enemy of livingEnemies.filter((unit) => unit.alive && unit.id !== target.id)) {
        enemy.hp = Math.max(0, enemy.hp - Math.round(target.maxHp * 0.04));
        if (enemy.hp <= 0) this.handleDefeat(session, enemy, events);
      }
    } else if (formationCode === 'turtle') {
      for (const ally of livingAllies) ally.shield += Math.round(ally.maxHp * 0.10);
      cooldowns.tauntBoostRounds = 1;
    } else if (formationCode === 'crane') {
      for (const ally of livingAllies) {
        ally.speed = Math.round(ally.speed * 1.20);
        ally.statuses = ally.statuses.filter((status) => status.type !== 'slow');
      }
    } else if (formationCode === 'tiger') {
      const target = livingEnemies.find((unit) => unit.id === cooldowns.focusTargetId) || this.lowestHpUnit(livingEnemies)!;
      target.statuses.push({ type: 'huntMark', rounds: 2, value: 0.12, source: config.ultimate.name });
    } else if (formationCode === 'phoenix') {
      for (const ally of allies) {
        if (ally.alive) {
          const amount = Math.round(ally.maxHp * 0.08);
          ally.hp = Math.min(ally.maxHp, ally.hp + amount);
        }
      }
      const dead = allies.find((unit) => !unit.alive);
      if (dead) {
        dead.alive = true;
        dead.hp = Math.max(1, Math.round(dead.maxHp * 0.20));
        events.push({ round: session.round, type: 'revive', targetId: dead.id, text: `${dead.name} 被涅槃之羽复活` });
      }
    }
    cooldowns.ultimate = config.ultimate.cooldown;
    cooldowns.ultimateUsed = Number(cooldowns.ultimateUsed || 0) + 1;
    session.cooldowns[side] = cooldowns;
  }

  private selectAttackTarget(session: BattleSessionV10, actor: BattleUnit, enemies: BattleUnit[]) {
    const living = enemies.filter((unit) => unit.alive && unit.hp > 0);
    if (!living.length) return null;
    const sideKey: Side = actor.side;
    const attackerCooldowns = session.cooldowns?.[sideKey] || {};
    const focused = living.find((unit) => unit.id === attackerCooldowns.focusTargetId);
    const taunts = living.filter((unit) => unit.tauntRate > 0 || unit.statuses.some((status) => status.type === 'taunt'));
    if (taunts.length) {
      const boosted = Number(session.cooldowns?.[actor.side === 'left' ? 'right' : 'left']?.tauntBoostRounds || 0) > 0;
      const candidate = taunts.sort((a, b) => b.tauntRate - a.tauntRate)[0];
      if (candidate && Math.random() < Math.min(0.85, candidate.tauntRate + (boosted ? 0.25 : 0))) return candidate;
    }
    return focused || this.lowestHpUnit(living) || living[0];
  }

  private guardRedirect(session: BattleSessionV10, target: BattleUnit, defenderSide: Side) {
    const cooldowns = session.cooldowns?.[defenderSide] || {};
    if (Number(cooldowns.guardRounds || 0) <= 0 || cooldowns.guardTargetId !== target.id) return null;
    const team = (defenderSide === 'left' ? session.leftTeam : session.rightTeam) as BattleUnit[];
    return team.find((unit) => unit.id === cooldowns.guardProtectorId && unit.alive) || null;
  }

  private tickStatuses(team: BattleUnit[], round: number, events: any[]) {
    for (const unit of team) {
      if (!unit.alive) continue;
      for (const status of unit.statuses) {
        if (status.type === 'dot') {
          const damage = Math.max(1, Math.round(status.value || unit.maxHp * 0.03));
          unit.hp = Math.max(0, unit.hp - damage);
          events.push({ round, type: 'dot', targetId: unit.id, value: damage, text: `${unit.name} 受到 ${damage} 持续伤害` });
          if (unit.hp <= 0) {
            unit.alive = false;
            events.push({ round, type: 'defeat', targetId: unit.id, text: `${unit.name} 被持续伤害击倒` });
          }
        }
        status.rounds -= 1;
      }
      unit.statuses = unit.statuses.filter((status) => status.rounds > 0);
    }
  }

  private tryApplySkillStatus(skill: any, actor: BattleUnit, target: BattleUnit, round: number, events: any[]) {
    const code = String(skill?.skillCode || skill?.code || '').toUpperCase();
    if (/FROST|FREEZE/.test(code) && Math.random() < 0.18) {
      target.statuses.push({ type: 'freeze', rounds: 1, source: code });
      events.push({ round, type: 'status', actorId: actor.id, targetId: target.id, text: `${target.name} 被冻结` });
    } else if (/CONTROL|STUN/.test(code) && Math.random() < 0.16) {
      target.statuses.push({ type: 'stun', rounds: 1, source: code });
      events.push({ round, type: 'status', actorId: actor.id, targetId: target.id, text: `${target.name} 被眩晕` });
    } else if (/FIRE|BURN|FLAME/.test(code) && Math.random() < 0.22) {
      target.statuses.push({ type: 'dot', rounds: 2, value: Math.max(1, Math.round(actor.magic * 0.18)), source: code });
      events.push({ round, type: 'status', actorId: actor.id, targetId: target.id, text: `${target.name} 被附加灼烧` });
    }
  }

  private async settleSession(session: BattleSessionV10) {
    if (session.settled) return;
    session.settled = true;
    session.rewards = {};
    if (session.winnerSide !== 'left') return;

    const user = await this.userRepository.findOne({ where: { id: session.userId } });
    const livingPets = (session.leftTeam as BattleUnit[])
      .map((unit) => Number(unit.petId || 0))
      .filter((id) => id > 0);

    if (session.mode === 'tower') {
      let record = await this.towerRepository.findOne({ where: { userId: session.userId } });
      if (!record) {
        record = this.towerRepository.create({
          userId: session.userId,
          currentFloor: 1,
          maxFloor: 0,
          totalRewardGold: 0,
        } as TowerRecord);
      }
      const floor = Math.max(1, Number(record.currentFloor || 1));
      const reward = {
        gold: 200 + floor * 80,
        diamond: floor % 5 === 0 ? 2 : 0,
        exp: 100 + floor * 20,
        floor,
      };
      if (user) {
        user.gold = Number(user.gold || 0) + reward.gold;
        user.diamond = Number(user.diamond || 0) + reward.diamond;
        await this.userRepository.save(user);
      }
      const expEach = Math.max(1, Math.floor(reward.exp / Math.max(1, livingPets.length)));
      for (const petId of livingPets) {
        const pet = await this.petService.getPetById(petId);
        if (pet && pet.ownerId === session.userId) await this.petService.addExp(pet, expEach);
      }
      record.currentFloor = floor + 1;
      record.maxFloor = Math.max(Number(record.maxFloor || 0), floor);
      record.totalRewardGold = Number(record.totalRewardGold || 0) + reward.gold;
      await this.towerRepository.save(record);
      await this.dailyTaskService.completeTask(session.userId, 'towerCompleted');
      await this.seasonService.syncPlayerScores(session.userId);
      session.rewards = { ...reward, expEach };
      return;
    }

    if (session.mode === 'pve' || session.mode === 'boss') {
      const reward = {
        gold: session.bossBattle ? 320 : 160,
        diamond: session.bossBattle ? 1 : 0,
        exp: session.bossBattle ? 220 : 120,
      };
      if (user) {
        user.gold = Number(user.gold || 0) + reward.gold;
        user.diamond = Number(user.diamond || 0) + reward.diamond;
        await this.userRepository.save(user);
      }
      const expEach = Math.max(1, Math.floor(reward.exp / Math.max(1, livingPets.length)));
      for (const petId of livingPets) {
        const pet = await this.petService.getPetById(petId);
        if (pet && pet.ownerId === session.userId) await this.petService.addExp(pet, expEach);
      }
      await this.dailyTaskService.completeTask(session.userId, 'battleCompleted');
      session.rewards = { ...reward, expEach };
    }
  }

  private finishIfNeeded(session: BattleSessionV10) {
    const leftAlive = (session.leftTeam as BattleUnit[]).some((unit) => unit.alive && unit.hp > 0);
    const rightAlive = (session.rightTeam as BattleUnit[]).some((unit) => unit.alive && unit.hp > 0);
    if (!leftAlive || !rightAlive) {
      session.status = 'finished';
      session.winnerSide = leftAlive ? 'left' : 'right';
    } else if (session.round >= session.maxRounds) {
      const leftRate = this.teamHpRate(session.leftTeam as BattleUnit[]);
      const rightRate = this.teamHpRate(session.rightTeam as BattleUnit[]);
      session.status = 'finished';
      session.winnerSide = leftRate >= rightRate ? 'left' : 'right';
    }
    if (session.status === 'finished') {
      session.battleLog = [...(session.battleLog || []), {
        round: session.round,
        type: 'finish',
        text: session.winnerSide === 'left' ? '我方五宠获胜' : '敌方五宠获胜',
      }];
    }
  }

  private buildPlayerUnits(
    pets: Pet[],
    slotAssignments: number[],
    formationCode: string,
    formationLevel: number,
    side: Side,
  ) {
    const map = new Map(pets.map((pet) => [pet.id, pet]));
    const ordered = (Array.isArray(slotAssignments) ? slotAssignments : [])
      .map((id) => map.get(Number(id)))
      .filter(Boolean) as Pet[];
    for (const pet of pets) if (!ordered.includes(pet)) ordered.push(pet);
    return ordered.slice(0, 5).map((pet, slotIndex) => this.fromPet(pet, side, slotIndex, formationCode, formationLevel));
  }

  private buildEnemyUnits(level: number, difficulty: number, formationCode: string, boss: boolean, featuredSpeciesCode = '') {
    return Array.from({ length: 5 }, (_, slotIndex) => {
      const species = slotIndex === 0 && featuredSpeciesCode
        ? findPetSpeciesConfig(featuredSpeciesCode)
        : PET_SPECIES_CONFIGS[(level + slotIndex * 3) % PET_SPECIES_CONFIGS.length];
      const multiplier = difficulty * (boss && slotIndex === 0 ? 1.35 : 1);
      const base = {
        id: -(slotIndex + 1),
        ownerId: 0,
        nickname: boss && slotIndex === 0 ? `巢穴首领·${species.name}` : `守关·${species.name}`,
        species: species.name,
        speciesCode: species.speciesCode,
        rarity: boss && slotIndex === 0 ? 4 : 2,
        level: Math.max(1, Math.round(level * multiplier)),
        skills: [],
        finalAttributes: {
          hp: Math.round((species.baseStats.hp + level * 75) * multiplier),
          attack: Math.round((species.baseStats.attack + level * 7.5) * multiplier),
          magic: Math.round((species.baseStats.magic + level * 7.5) * multiplier),
          defense: Math.round((species.baseStats.defense + level * 5.2) * multiplier),
          speed: Math.round((species.baseStats.speed + level * 3.8) * multiplier),
        },
      } as any;
      return this.fromPet(base, 'right', slotIndex, formationCode, boss ? 5 : 3);
    });
  }

  private fromPet(pet: any, side: Side, slotIndex: number, formationCode: string, formationLevel: number): BattleUnit {
    const species = findPetSpeciesConfig(pet.speciesCode || pet.species);
    const stats = pet.finalAttributes || this.petService.calculateFinalAttributes(pet as Pet);
    const config = getFormationConfig(formationCode);
    const slot = config.slots[slotIndex] || config.slots[0];
    const levelMultiplier = formationLevelMultiplier(formationLevel);
    const bonuses = { ...(config.teamBonuses || {}), ...(slot?.bonuses || {}) } as Record<string, number>;
    const value = (key: string) => Number(bonuses[key] || 0) * levelMultiplier;
    const maxHp = Math.max(1, Math.round(Number(stats.hp || pet.hp || 100) * (1 + value('hpRate'))));
    const defense = Math.max(1, Math.round(Number(stats.defense || pet.defense || 20) * (1 + value('defenseRate'))));
    const roleTags = species.roleTags || [];
    const role = slot?.role === 'healer' || roleTags.includes('healer') ? 'healer'
      : slot?.role === 'support' || roleTags.includes('support') || roleTags.includes('shield') ? 'support'
      : slot?.role === 'tank' || roleTags.includes('tank') || roleTags.includes('guard') ? 'tank'
      : slot?.role === 'magic' || roleTags.some((tag) => /magic|healer/.test(tag)) ? 'magic'
      : 'physical';
    const openingShieldRate = value('openingShieldRate');
    return {
      id: `${side}-${pet.id || slotIndex + 1}`,
      petId: Number(pet.id || 0),
      side,
      slotIndex,
      name: String(pet.nickname || pet.name || species.name),
      species: species.name,
      speciesCode: species.speciesCode,
      rarity: Number(pet.rarity || 1),
      level: Number(pet.level || 1),
      role,
      maxHp,
      hp: maxHp,
      attack: Math.max(1, Math.round(Number(stats.attack || pet.attack || 20) * (1 + value('attackRate')))),
      magic: Math.max(1, Math.round(Number(stats.magic || pet.intelligence || 20) * (1 + value('magicRate')))),
      defense,
      magicDefense: Math.max(1, Math.round(Number(stats.magicDefense || stats.defense || pet.defense || 20) * (1 + value('defenseRate')))),
      speed: Math.max(1, Math.round(Number(stats.speed || pet.speed || 20) * (1 + value('speedRate')))),
      shield: Math.round(maxHp * openingShieldRate),
      energy: 0,
      alive: true,
      skills: Array.isArray(pet.skills) ? pet.skills : [],
      statuses: [],
      tauntRate: value('tauntRate'),
      healingRate: value('healingRate'),
      damageRate: value('damageRate'),
      physicalDamageRate: value('physicalDamageRate'),
      magicDamageRate: value('magicDamageRate'),
      damageReductionRate: value('damageReductionRate'),
      singleDamageRate: value('singleDamageRate'),
      executeDamageRate: value('executeDamageRate'),
      shieldDamageRate: value('shieldDamageRate'),
      defenseIgnoreRate: value('defenseIgnoreRate'),
      critRate: value('critRate'),
      openingShieldRate,
      surviveOnce: value('surviveOnce') > 0,
      surviveUsed: false,
      protectedDamageRate: value('protectedDamageRate'),
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
    };
  }

  private orderTeamPets(teamResult: any) {
    const pets = Array.isArray(teamResult?.pets) ? teamResult.pets : [];
    const map = new Map(pets.map((pet: Pet) => [pet.id, pet]));
    const ordered = (Array.isArray(teamResult?.slotAssignments) ? teamResult.slotAssignments : [])
      .map((id: number) => map.get(Number(id)))
      .filter(Boolean) as Pet[];
    for (const pet of pets) if (!ordered.includes(pet)) ordered.push(pet);
    return ordered.filter((pet) => !pet.isEgg && pet.tradeStatus !== 'listed' && !pet.tradeListingId);
  }

  private autoDirective(allies: BattleUnit[], enemies: BattleUnit[], cooldowns: any, tactics: any): RoundDirective {
    const debuffed = allies.filter((unit) => unit.alive && this.debuffScore(unit) > 0).sort((a, b) => this.debuffScore(b) - this.debuffScore(a))[0];
    if (debuffed && Number(cooldowns.cleanse || 0) <= 0) return { type: 'cleanse', targetId: debuffed.id, useUltimate: this.autoUltimate(allies, cooldowns, tactics) };
    const threshold = Math.max(0, Number(tactics?.shieldThreshold ?? 60)) / 100;
    if (threshold > 0 && Number(cooldowns.shield || 0) <= 0 && allies.filter((unit) => unit.alive && unit.hp / unit.maxHp < threshold).length >= 2) {
      return { type: 'shield', useUltimate: this.autoUltimate(allies, cooldowns, tactics) };
    }
    const guardTarget = this.guardTargetByTactics(allies, tactics);
    if (guardTarget && guardTarget.hp / guardTarget.maxHp < 0.65 && Number(cooldowns.guard || 0) <= 0) {
      return { type: 'guard', targetId: guardTarget.id, useUltimate: this.autoUltimate(allies, cooldowns, tactics) };
    }
    const focus = this.focusByTactics(enemies, tactics);
    return { type: 'focus', targetId: focus?.id, useUltimate: this.autoUltimate(allies, cooldowns, tactics) };
  }

  private autoUltimate(allies: BattleUnit[], cooldowns: any, tactics: any) {
    if (Number(cooldowns.ultimate || 0) > 0) return false;
    const policy = String(tactics?.ultimatePolicy || 'ready');
    if (policy === 'lowHp') return this.teamHpRate(allies) < 0.55;
    if (policy === 'bossPhase') return allies.some((unit) => unit.energy >= 100) || this.teamHpRate(allies) < 0.7;
    return true;
  }

  private normalizeDirective(raw: any): RoundDirective {
    const type = ['auto', 'focus', 'guard', 'shield', 'cleanse'].includes(String(raw?.type))
      ? String(raw.type) as DirectiveType : 'auto';
    return { type, targetId: raw?.targetId ? String(raw.targetId) : undefined, useUltimate: Boolean(raw?.useUltimate) };
  }

  private initialCooldownState(leftFormation: string, rightFormation: string) {
    const make = (code: string) => ({
      guard: 0,
      shield: 0,
      cleanse: 0,
      ultimate: 0,
      ultimateReadyRound: getFormationConfig(code).ultimate.initialCooldown,
      ultimateUsed: 0,
      focusTargetId: '',
      guardTargetId: '',
      guardProtectorId: '',
      guardRounds: 0,
      tauntBoostRounds: 0,
    });
    return { left: make(leftFormation), right: make(rightFormation) };
  }

  private reduceCooldowns(cooldowns: any) {
    if (!cooldowns) return;
    for (const key of ['guard', 'shield', 'cleanse', 'ultimate', 'guardRounds', 'tauntBoostRounds']) {
      cooldowns[key] = Math.max(0, Number(cooldowns[key] || 0) - 1);
    }
    if (cooldowns.guardRounds <= 0) {
      cooldowns.guardTargetId = '';
      cooldowns.guardProtectorId = '';
    }
  }

  private pickSkill(actor: BattleUnit) {
    if (!actor.skills.length || Math.random() > 0.42) return null;
    return actor.skills[Math.floor(Math.random() * actor.skills.length)] || null;
  }

  private skillMultiplier(skill: any) {
    const tier = String(skill?.tier || '').toLowerCase();
    const code = String(skill?.skillCode || '').toUpperCase();
    if (tier === 'special' || code.startsWith('SPECIAL_')) return 1.32;
    if (tier === 'high' || code.startsWith('HIGH_')) return 1.18;
    return 1.06;
  }

  private focusByTactics(enemies: BattleUnit[], tactics: any) {
    const living = enemies.filter((unit) => unit.alive);
    const priority = String(tactics?.focusPriority || 'lowestHp');
    if (priority === 'healer') return living.find((unit) => unit.role === 'healer') || this.lowestHpUnit(living);
    if (priority === 'highestDamage') return living.sort((a, b) => Math.max(b.attack, b.magic) - Math.max(a.attack, a.magic))[0];
    if (priority === 'front') return living.sort((a, b) => a.slotIndex - b.slotIndex)[0];
    if (priority === 'random') return living[Math.floor(Math.random() * living.length)];
    return this.lowestHpUnit(living);
  }

  private guardTargetByTactics(allies: BattleUnit[], tactics: any) {
    const living = allies.filter((unit) => unit.alive);
    const mode = String(tactics?.guardTarget || 'healer');
    if (mode === 'off') return null;
    if (mode === 'highestPower') return living.sort((a, b) => (b.attack + b.magic) - (a.attack + a.magic))[0];
    if (mode === 'lowestDefense') return living.sort((a, b) => a.defense - b.defense)[0];
    return living.find((unit) => unit.role === 'healer') || this.lowestHpUnit(living);
  }

  private bestProtector(allies: BattleUnit[], excludedId?: string) {
    return allies.filter((unit) => unit.alive && unit.id !== excludedId)
      .sort((a, b) => (b.role === 'tank' ? 100000 : 0) + b.defense - ((a.role === 'tank' ? 100000 : 0) + a.defense))[0] || null;
  }

  private lowestHpUnit(units: BattleUnit[]) {
    return units.filter((unit) => unit.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
  }

  private teamHpRate(units: BattleUnit[]) {
    const max = units.reduce((sum, unit) => sum + unit.maxHp, 0);
    const current = units.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
    return max > 0 ? current / max : 0;
  }

  private debuffScore(unit: BattleUnit) {
    return unit.statuses.reduce((sum, status) => sum + this.statusPriority(status.type), 0);
  }

  private statusPriority(type: string) {
    if (type === 'stun' || type === 'freeze') return 100;
    if (type === 'healBlock') return 60;
    if (type === 'dot') return 30;
    if (type === 'slow') return 20;
    return 0;
  }

  private randomFormationCode() {
    const codes = ['dragon', 'turtle', 'crane', 'tiger', 'phoenix'];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private toSessionView(session: BattleSessionV10) {
    const left = session.leftTeam as BattleUnit[];
    const right = session.rightTeam as BattleUnit[];
    const leftFormation = getFormationConfig(session.formationCode);
    const rightFormation = getFormationConfig(session.enemyFormationCode);
    return {
      id: session.id,
      userId: session.userId,
      mode: session.mode,
      status: session.status,
      round: session.round,
      maxRounds: session.maxRounds,
      winnerSide: session.winnerSide,
      result: session.status === 'finished' ? (session.winnerSide === 'left' ? 'win' : 'lose') : '',
      bossBattle: session.bossBattle,
      settled: session.settled,
      rewards: session.rewards || {},
      formationCode: leftFormation.code,
      enemyFormationCode: rightFormation.code,
      formationName: leftFormation.name,
      enemyFormationName: rightFormation.name,
      formation: leftFormation,
      enemyFormation: rightFormation,
      ultimate: leftFormation.ultimate,
      leftTeam: left,
      rightTeam: right,
      playerTeam: left,
      enemyTeam: right,
      cooldowns: session.cooldowns,
      tactics: session.tactics,
      battleLog: session.battleLog || [],
      commands: {
        focus: { cooldown: 0, enabled: session.status === 'active' },
        guard: { cooldown: Number(session.cooldowns?.left?.guard || 0), enabled: session.status === 'active' && Number(session.cooldowns?.left?.guard || 0) <= 0 },
        shield: { cooldown: Number(session.cooldowns?.left?.shield || 0), enabled: session.status === 'active' && Number(session.cooldowns?.left?.shield || 0) <= 0 },
        cleanse: { cooldown: Number(session.cooldowns?.left?.cleanse || 0), enabled: session.status === 'active' && Number(session.cooldowns?.left?.cleanse || 0) <= 0 },
        ultimate: {
          cooldown: Number(session.cooldowns?.left?.ultimate || 0),
          readyRound: leftFormation.ultimate.initialCooldown,
          enabled: session.status === 'active' && session.round >= leftFormation.ultimate.initialCooldown && Number(session.cooldowns?.left?.ultimate || 0) <= 0,
        },
      },
      summary: {
        playerHpRate: this.teamHpRate(left),
        enemyHpRate: this.teamHpRate(right),
        playerAlive: left.filter((unit) => unit.alive).length,
        enemyAlive: right.filter((unit) => unit.alive).length,
        left: {
          damage: left.reduce((sum, unit) => sum + Number(unit.damageDealt || 0), 0),
          taken: left.reduce((sum, unit) => sum + Number(unit.damageTaken || 0), 0),
          healing: left.reduce((sum, unit) => sum + Number(unit.healingDone || 0), 0),
        },
        right: {
          damage: right.reduce((sum, unit) => sum + Number(unit.damageDealt || 0), 0),
          taken: right.reduce((sum, unit) => sum + Number(unit.damageTaken || 0), 0),
          healing: right.reduce((sum, unit) => sum + Number(unit.healingDone || 0), 0),
        },
      },
    };
  }
}
