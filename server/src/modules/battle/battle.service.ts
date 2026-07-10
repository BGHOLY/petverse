import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DailyTaskService } from '../daily-task/daily-task.service';
import { FriendService } from '../friend/friend.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { TeamService } from '../team/team.service';
import { Battle } from './battle.entity';

type DamageType = 'physical' | 'magic';

type Combatant = {
  id: number;
  ownerId: number;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
  rarity: number;
  level: number;
  skills: any[];

  shield: number;
  shieldExpireRound: number;
  energy: number;
  firstDirectDamageDone: boolean;
  nextAttackBonus: number;
  astralDamageBonus: number;
  thunderStacks: number;
  lostHpShieldTriggers: number;
  frostTriggerCount: number;
  deathSaveUsed: boolean;
  rebirthUsed: boolean;
  surviveUsed: boolean;
  afterimageUsed: boolean;
  moonPrayerLastRound: number;
  tideReversalUsedRound: number;
  skillTriggerCount: number;
  turnTriggerKeys: Set<string>;
};

type DamageResult = {
  hpDamage: number;
  shieldDamage: number;
  totalDamage: number;
  critical: boolean;
};

@Injectable()
export class BattleService {
  constructor(
    @InjectRepository(Battle)
    private readonly battleRepository: Repository<Battle>,

    private readonly petService: PetService,

    private readonly friendService: FriendService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly teamService: TeamService,
  ) {}

  async pve(userId = DEFAULT_USER_ID, petId?: number) {
    const pet = petId
      ? await this.petService.getPetById(petId)
      : await this.petService.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Player pet not found',
      };
    }

    const monster = this.createMonster(Math.max(1, Number(pet.level || 1)));
    const result = this.simulateBattle(this.fromPet(pet), monster);

    await this.saveBattle(userId, pet.id, 0, 0, result);
    await this.dailyTaskService.completeTask(
      userId,
      'battleCompleted',
    );

    return {
      success: true,
      mode: 'pve',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      battleLog: result.battleLog,
      playerPet: pet,
      monster,
      combatResult: result,
    };
  }

  async friendBattle(
    userId = DEFAULT_USER_ID,
    petId?: number,
    friendPetId?: number,
  ) {
    const myPet = petId
      ? await this.petService.getPetById(petId)
      : await this.petService.getMainPet(userId);
    const friendPet = friendPetId
      ? await this.petService.getPetById(friendPetId)
      : await this.friendService.getFirstFriendPet();

    if (
      !myPet ||
      myPet.ownerId !== userId ||
      myPet.isEgg ||
      !friendPet ||
      friendPet.isEgg
    ) {
      return {
        success: false,
        message: 'Battle pet not found',
      };
    }

    const result = this.simulateBattle(
      this.fromPet(myPet),
      this.fromPet(friendPet),
    );
    await this.saveBattle(
      userId,
      myPet.id,
      friendPet.ownerId,
      friendPet.id,
      result,
    );
    await this.dailyTaskService.completeTask(
      userId,
      'battleCompleted',
    );

    return {
      success: true,
      mode: 'friend',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      battleLog: result.battleLog,
      playerPet: myPet,
      friendPet,
      combatResult: result,
    };
  }

  async startBattle(
    userId: number,
    myPetId: number,
    targetPetId: number,
  ) {
    return this.friendBattle(userId, myPetId, targetPetId);
  }

  async teamPve(userId = DEFAULT_USER_ID) {
    const teamResult = await this.teamService.getTeam(userId);
    const pets = Array.isArray(teamResult?.pets)
      ? teamResult.pets.filter((pet: Pet) => !pet.isEgg).slice(0, 3)
      : [];

    if (!pets.length) {
      return {
        success: false,
        message: 'Active team is empty',
      };
    }

    const averageLevel = Math.max(
      1,
      Math.round(
        pets.reduce((sum: number, pet: Pet) => sum + Number(pet.level || 1), 0) /
          pets.length,
      ),
    );
    const enemies = pets.map((_, index) =>
      this.createMonster(Math.max(1, averageLevel + index)),
    );
    const result = this.simulateTeamBattle(
      pets.map((pet: Pet) => this.fromPet(pet)),
      enemies,
    );

    await this.saveBattle(userId, pets[0].id, 0, 0, result);
    await this.dailyTaskService.completeTask(userId, 'battleCompleted');

    return {
      success: true,
      mode: 'team-pve',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      playerTeam: pets,
      enemyTeam: enemies,
      battleLog: result.battleLog,
      combatResult: result,
    };
  }

  async friendTeamBattle(
    userId = DEFAULT_USER_ID,
    friendUserId?: number,
  ) {
    const teamResult = await this.teamService.getTeam(userId);
    const myPets = Array.isArray(teamResult?.pets)
      ? teamResult.pets.filter((pet: Pet) => !pet.isEgg).slice(0, 3)
      : [];

    const friendResult = await this.friendService.getMockFriends(userId);
    const friend = friendUserId
      ? friendResult.friends.find(
          (item: any) => Number(item.userId || item.id) === Number(friendUserId),
        )
      : friendResult.friends[0];
    const friendPets = Array.isArray(friend?.pets)
      ? friend.pets.filter((pet: Pet) => !pet.isEgg).slice(0, 3)
      : [];

    if (!myPets.length || !friendPets.length) {
      return {
        success: false,
        message: 'Player or friend team is empty',
      };
    }

    const result = this.simulateTeamBattle(
      myPets.map((pet: Pet) => this.fromPet(pet)),
      friendPets.map((pet: Pet) => this.fromPet(pet)),
    );
    await this.saveBattle(
      userId,
      myPets[0].id,
      Number(friend?.userId || friend?.id || 0),
      friendPets[0].id,
      result,
    );
    await this.dailyTaskService.completeTask(userId, 'battleCompleted');

    return {
      success: true,
      mode: 'team-friend',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      playerTeam: myPets,
      friend: friend
        ? {
            id: Number(friend.userId || friend.id || 0),
            nickname: friend.nickname,
          }
        : null,
      friendTeam: friendPets,
      battleLog: result.battleLog,
      combatResult: result,
    };
  }

  simulateTeamBattle(
    leftTeamInput: Combatant[],
    rightTeamInput: Combatant[],
  ) {
    const leftTeam = leftTeamInput.slice(0, 3).map((pet) => this.cloneCombatant(pet));
    const rightTeam = rightTeamInput.slice(0, 3).map((pet) => this.cloneCombatant(pet));
    const battleLog: string[] = [];
    const duelResults: any[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < leftTeam.length && rightIndex < rightTeam.length) {
      const left = leftTeam[leftIndex];
      const right = rightTeam[rightIndex];
      battleLog.push(
        `出战：${left.name} VS ${right.name}（${leftIndex + 1}/${leftTeam.length} 对 ${rightIndex + 1}/${rightTeam.length}）`,
      );
      const duel = this.simulateBattle(left, right);
      duelResults.push({
        leftPetId: left.id,
        rightPetId: right.id,
        ...duel,
      });
      battleLog.push(...duel.battleLog.map((line: string) => `  ${line}`));

      if (duel.winnerSide === 'left') {
        left.hp = Math.max(1, Number(duel.leftHp || 1));
        left.shield = Math.max(0, Number(duel.leftShield || 0));
        rightIndex += 1;
      } else {
        right.hp = Math.max(1, Number(duel.rightHp || 1));
        right.shield = Math.max(0, Number(duel.rightShield || 0));
        leftIndex += 1;
      }
    }

    const winnerSide = leftIndex < leftTeam.length ? 'left' : 'right';
    const winner = winnerSide === 'left'
      ? leftTeam[Math.min(leftIndex, leftTeam.length - 1)]
      : rightTeam[Math.min(rightIndex, rightTeam.length - 1)];
    battleLog.push(
      winnerSide === 'left' ? '我方队伍获胜' : '对方队伍获胜',
    );

    return {
      winnerSide,
      winnerName: winner?.name || '',
      leftRemaining: Math.max(0, leftTeam.length - leftIndex),
      rightRemaining: Math.max(0, rightTeam.length - rightIndex),
      leftIndex,
      rightIndex,
      duelResults,
      battleLog,
    };
  }

  simulateBattle(leftInput: Combatant, rightInput: Combatant) {
    const left = this.cloneCombatant(leftInput);
    const right = this.cloneCombatant(rightInput);
    const battleLog: string[] = [];

    this.applyOpeningPassives(left, right, battleLog);
    this.applyOpeningPassives(right, left, battleLog);
    this.applyOpeningSpecials(left, right, battleLog);
    this.applyOpeningSpecials(right, left, battleLog);

    let finishedRound = 0;

    for (let round = 1; round <= 30; round += 1) {
      finishedRound = round;
      battleLog.push(`第 ${round} 回合`);

      const order = left.speed >= right.speed
        ? [left, right]
        : [right, left];

      for (const actor of order) {
        const target = actor === left ? right : left;
        if (this.isBattleOver(left, right, battleLog)) break;
        if (actor.hp <= 0 || target.hp <= 0) break;

        this.beginTurn(actor, round);
        const skipped = this.processTurnStart(actor, target, round, battleLog);

        if (!skipped) {
          this.takeTurn(actor, target, round, battleLog);
        }

        if (this.isBattleOver(left, right, battleLog)) break;

        this.applyTurnEnd(actor, target, round, battleLog);
        if (this.isBattleOver(left, right, battleLog)) break;
      }

      if (this.isBattleOver(left, right, battleLog)) break;
    }

    // 30 回合未分胜负时按剩余生命比例判定，避免纯坦无限拖延。
    const leftRate = Math.max(0, left.hp) / Math.max(1, left.maxHp);
    const rightRate = Math.max(0, right.hp) / Math.max(1, right.maxHp);
    const winnerSide = leftRate === rightRate
      ? left.speed >= right.speed ? 'left' : 'right'
      : leftRate > rightRate ? 'left' : 'right';
    const winner = winnerSide === 'left' ? left : right;

    battleLog.push(`${winner.name} 获胜`);

    return {
      winnerSide,
      winnerName: winner.name,
      rounds: finishedRound,
      leftHp: Math.max(0, Math.round(left.hp)),
      leftMaxHp: Math.round(left.maxHp),
      leftShield: Math.max(0, Math.round(left.shield)),
      rightHp: Math.max(0, Math.round(right.hp)),
      rightMaxHp: Math.round(right.maxHp),
      rightShield: Math.max(0, Math.round(right.shield)),
      battleLog,
    };
  }

  createTowerMonster(floor: number): Combatant {
    const safeFloor = Math.max(1, Math.floor(Number(floor || 1)));
    const isBoss = safeFloor % 5 === 0;
    const hp = 90 + safeFloor * 42;
    const attack = 14 + safeFloor * 7;
    const defense = 7 + safeFloor * 4;
    const magic = 12 + safeFloor * 7;
    const speed = 9 + safeFloor * 2;

    const monster = this.createCombatant({
      id: 0,
      ownerId: 0,
      name: isBoss
        ? `Tower Boss ${safeFloor}`
        : `Tower Monster ${safeFloor}`,
      maxHp: isBoss ? Math.floor(hp * 1.8) : hp,
      hp: isBoss ? Math.floor(hp * 1.8) : hp,
      attack: isBoss ? Math.floor(attack * 1.5) : attack,
      defense: isBoss ? Math.floor(defense * 1.3) : defense,
      magic: isBoss ? Math.floor(magic * 1.4) : magic,
      speed,
      rarity: Math.min(6, Math.max(1, Math.ceil(safeFloor / 5))),
      level: safeFloor,
      skills: [],
    });

    if (isBoss) {
      monster.skills = [
        {
          skillCode: 'TOWER_BOSS_GUARD',
          name: '首领护体',
          effect: 'physical_guard',
          effectData: { physicalDamageReduction: 0.08 },
          triggerRate: 1,
          tier: 'special',
        },
      ];
    }

    return monster;
  }

  fromPet(pet: Pet): Combatant {
    const attributes = this.petService.calculateFinalAttributes(pet);

    return this.createCombatant({
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.nickname || `Pet ${pet.id}`,
      maxHp: Number(attributes.hp || pet.hp || 100),
      hp: Number(attributes.hp || pet.hp || 100),
      attack: Number(attributes.attack || pet.attack || 20),
      defense: Number(attributes.defense || pet.defense || 10),
      magic: Number(
        attributes.magic || pet.intelligence || pet.attack || 20,
      ),
      speed: Number(
        attributes.speed || pet.speed || pet.agility || 10,
      ),
      rarity: Number(pet.rarity || 1),
      level: Number(pet.level || 1),
      skills: Array.isArray(pet.skills) ? pet.skills : [],
    });
  }

  private createMonster(level: number): Combatant {
    const safeLevel = Math.max(1, Math.floor(Number(level || 1)));
    return this.createCombatant({
      id: 0,
      ownerId: 0,
      name: '野外怪物',
      maxHp: 115 + safeLevel * 24,
      hp: 115 + safeLevel * 24,
      attack: 18 + safeLevel * 5,
      defense: 9 + safeLevel * 3,
      magic: 16 + safeLevel * 5,
      speed: 10 + safeLevel * 2,
      rarity: 1,
      level: safeLevel,
      skills: [],
    });
  }

  private createCombatant(input: Partial<Combatant>): Combatant {
    return {
      id: Number(input.id || 0),
      ownerId: Number(input.ownerId || 0),
      name: String(input.name || 'Pet'),
      maxHp: Math.max(1, Number(input.maxHp || input.hp || 1)),
      hp: Math.max(1, Number(input.hp || input.maxHp || 1)),
      attack: Math.max(1, Number(input.attack || 1)),
      defense: Math.max(0, Number(input.defense || 0)),
      magic: Math.max(1, Number(input.magic || input.attack || 1)),
      speed: Math.max(1, Number(input.speed || 1)),
      rarity: Math.max(1, Number(input.rarity || 1)),
      level: Math.max(1, Number(input.level || 1)),
      skills: Array.isArray(input.skills) ? input.skills : [],
      shield: Math.max(0, Number(input.shield || 0)),
      shieldExpireRound: Number(input.shieldExpireRound || 0),
      energy: Math.max(0, Number(input.energy || 0)),
      firstDirectDamageDone: Boolean(input.firstDirectDamageDone),
      nextAttackBonus: Number(input.nextAttackBonus || 0),
      astralDamageBonus: Number(input.astralDamageBonus || 0),
      thunderStacks: Number(input.thunderStacks || 0),
      lostHpShieldTriggers: Number(input.lostHpShieldTriggers || 0),
      frostTriggerCount: Number(input.frostTriggerCount || 0),
      deathSaveUsed: Boolean(input.deathSaveUsed),
      rebirthUsed: Boolean(input.rebirthUsed),
      surviveUsed: Boolean(input.surviveUsed),
      afterimageUsed: Boolean(input.afterimageUsed),
      moonPrayerLastRound: Number(input.moonPrayerLastRound || -99),
      tideReversalUsedRound: Number(input.tideReversalUsedRound || -1),
      skillTriggerCount: Number(input.skillTriggerCount || 0),
      turnTriggerKeys: new Set<string>(),
    };
  }

  private cloneCombatant(input: Combatant): Combatant {
    return this.createCombatant({
      ...input,
      skills: [...(input.skills || [])].map((skill) => ({ ...skill })),
      turnTriggerKeys: undefined,
    });
  }

  private applyOpeningPassives(
    owner: Combatant,
    enemy: Combatant,
    battleLog: string[],
  ) {
    const maxHp = this.findSkill(owner, 'max_hp');
    if (maxHp) {
      const bonus = this.numberData(maxHp, 'maxHpBonus', 0);
      owner.maxHp = Math.max(1, Math.round(owner.maxHp * (1 + bonus)));
      owner.hp = owner.maxHp;
      battleLog.push(`${owner.name} 的 ${maxHp.name} 使最大生命提升`);
    }

    const magicPower = this.findSkill(owner, 'magic_power');
    if (magicPower) {
      owner.magic = Math.max(
        1,
        Math.round(
          owner.magic *
            (1 + this.numberData(magicPower, 'magicStatBonus', 0)),
        ),
      );
    }

    const speedUp = this.findSkill(owner, 'speed_up');
    if (speedUp) {
      owner.speed = Math.max(
        1,
        Math.round(
          owner.speed *
            (1 + this.numberData(speedUp, 'speedBonus', 0)),
        ),
      );
    }

    const slowTank = this.findSkill(owner, 'slow_tank');
    if (slowTank) {
      owner.speed = Math.max(
        1,
        Math.round(
          owner.speed *
            (1 - this.numberData(slowTank, 'speedPenalty', 0)),
        ),
      );
    }

    const openingShield = this.findSkill(owner, 'opening_shield');
    if (openingShield) {
      const shield = Math.round(
        owner.maxHp * this.numberData(openingShield, 'maxHpRate', 0),
      );
      this.addShield(owner, shield, 2, 0, battleLog, openingShield.name);
    }

    // 兼容早期测试技能。
    for (const skill of owner.skills) {
      switch (skill.effect) {
        case 'hp+20':
          owner.maxHp += 20;
          owner.hp += 20;
          break;
        case 'speed+5':
          owner.speed += 5;
          break;
        case 'speed+30':
          owner.speed += 30;
          break;
        case 'defense+10':
          owner.defense += 10;
          break;
        case 'enemy_attack_down':
          enemy.attack = Math.max(1, Math.round(enemy.attack * 0.85));
          break;
      }
    }
  }

  private applyOpeningSpecials(
    owner: Combatant,
    enemy: Combatant,
    battleLog: string[],
  ) {
    const tide = this.findSkill(owner, 'special_tide_reversal');
    if (tide && this.findSkill(enemy, 'speed_up')) {
      enemy.speed = Math.max(
        1,
        Math.round(
          enemy.speed *
            (1 - this.numberData(tide, 'actionBarReduce', 0.2)),
        ),
      );
      this.heal(
        owner,
        owner,
        Math.round(
          owner.maxHp * this.numberData(tide, 'allyMaxHpHealRate', 0.04),
        ),
        0,
        battleLog,
        tide.name,
      );
      battleLog.push(`${owner.name} 的 ${tide.name} 压制了 ${enemy.name} 的先手`);
    }

    const frost = this.findSkill(owner, 'special_frost_prophecy');
    if (frost) {
      enemy.speed = Math.max(
        1,
        Math.round(
          enemy.speed *
            (1 - this.numberData(frost, 'actionBarReduce', 0.2)),
        ),
      );
      battleLog.push(`${owner.name} 使用 ${frost.name} 标记了 ${enemy.name}`);
    }
  }

  private beginTurn(owner: Combatant, round: number) {
    owner.turnTriggerKeys.clear();

    if (owner.shield > 0 && owner.shieldExpireRound > 0 && round > owner.shieldExpireRound) {
      owner.shield = 0;
      owner.shieldExpireRound = 0;
    }

    const energySkill = this.findSkill(owner, 'energy_gain');
    if (energySkill) {
      owner.energy = Math.min(
        200,
        owner.energy + this.numberData(energySkill, 'energyPerTurn', 0),
      );
    }
  }

  private processTurnStart(
    actor: Combatant,
    enemy: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const frost = this.findSkill(enemy, 'special_frost_prophecy');
    if (!frost) return false;

    enemy.frostTriggerCount += 1;
    const threshold = Math.max(
      1,
      Math.floor(this.numberData(frost, 'triggerToFreeze', 3)),
    );
    if (enemy.frostTriggerCount < threshold) return false;

    enemy.frostTriggerCount = 0;
    const resist = this.getControlResist(actor);
    if (Math.random() < resist) {
      battleLog.push(`${actor.name} 抵抗了 ${frost.name} 的冻结`);
      return false;
    }

    const cleanse = this.findSkill(actor, 'cleanse');
    if (cleanse && Math.random() < Number(cleanse.triggerRate || 0)) {
      this.registerSkillTrigger(actor, cleanse, battleLog);
      battleLog.push(`${actor.name} 触发 ${cleanse.name}，移除了冻结`);
      return false;
    }

    battleLog.push(`${actor.name} 被 ${frost.name} 冻结，跳过本回合行动`);
    return true;
  }

  private takeTurn(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    if (attacker.hp <= 0 || defender.hp <= 0) return;

    const useMagic = this.shouldUseMagic(attacker);
    const damageType: DamageType = useMagic ? 'magic' : 'physical';
    const actionName = useMagic ? '法术攻击' : '普通攻击';

    let energyBonus = 0;
    if (attacker.energy >= 100) {
      attacker.energy -= 100;
      energyBonus = 0.25;
      battleLog.push(`${attacker.name} 消耗能量强化本次行动`);
    }

    const result = this.performDirectAttack(
      attacker,
      defender,
      damageType,
      1 + energyBonus,
      round,
      battleLog,
      actionName,
    );

    if (result.totalDamage <= 0 || defender.hp <= 0) return;

    if (damageType === 'physical') {
      this.tryPhysicalCombo(attacker, defender, round, battleLog);
      if (defender.hp > 0) {
        this.tryPursuit(attacker, defender, round, battleLog);
      }
      if (defender.hp > 0) {
        this.handleThunderCharge(attacker, defender, round, battleLog);
      }
    } else {
      this.tryMagicCombo(attacker, defender, round, battleLog);
    }
  }

  private performDirectAttack(
    attacker: Combatant,
    defender: Combatant,
    damageType: DamageType,
    coefficient: number,
    round: number,
    battleLog: string[],
    actionName: string,
    isAdditional = false,
  ): DamageResult {
    const stat = damageType === 'magic' ? attacker.magic : attacker.attack;
    let defenseIgnore = 0;
    let damageBonus = 0;

    if (!attacker.firstDirectDamageDone) {
      const ambush = this.findSkill(attacker, 'ambush');
      if (ambush) {
        damageBonus += this.numberData(ambush, 'firstDamageBonus', 0);
        defenseIgnore += this.numberData(ambush, 'defenseIgnore', 0);
        this.registerSkillTrigger(attacker, ambush, battleLog);
      }
    }

    if (damageType === 'physical') {
      const power = this.findSkill(attacker, 'physical_power');
      if (power) {
        damageBonus += this.numberData(power, 'physicalDamageBonus', 0);
      }
    }

    const shadow = this.findSkill(attacker, 'special_shadow_hunt');
    if (
      shadow &&
      defender.hp / Math.max(1, defender.maxHp) <
        this.numberData(shadow, 'hpThreshold', 0.35)
    ) {
      defenseIgnore += this.numberData(shadow, 'defenseIgnore', 0.2);
      this.registerSkillTrigger(attacker, shadow, battleLog);
    }

    if (damageType === 'magic') {
      const variance = this.findSkill(attacker, 'magic_variance');
      if (variance) {
        const min = this.numberData(variance, 'minRate', 1);
        const max = this.numberData(variance, 'maxRate', 1);
        coefficient *= min + Math.random() * Math.max(0, max - min);
      }
    }

    damageBonus += Math.max(0, attacker.nextAttackBonus);
    damageBonus += Math.max(0, attacker.astralDamageBonus);
    attacker.nextAttackBonus = 0;
    attacker.astralDamageBonus = 0;

    const defenseFactor = damageType === 'magic' ? 0.42 : 0.5;
    let rawDamage = Math.max(
      1,
      Math.round(
        stat * coefficient * (1 + damageBonus) -
          defender.defense * defenseFactor * (1 - Math.min(0.8, defenseIgnore)),
      ),
    );

    let critical = false;
    const critSkill = this.findSkill(
      attacker,
      damageType === 'magic' ? 'magic_crit' : 'physical_crit',
    );
    const baseCrit = 0.05;
    const critBonus = critSkill
      ? this.numberData(
          critSkill,
          damageType === 'magic' ? 'magicCritRateBonus' : 'critRateBonus',
          0,
        )
      : 0;
    if (Math.random() < Math.min(0.75, baseCrit + critBonus)) {
      critical = true;
      const extraCritDamage = damageType === 'physical' && critSkill
        ? this.numberData(critSkill, 'critDamageBonus', 0)
        : 0;
      rawDamage = Math.max(1, Math.round(rawDamage * (1.5 + extraCritDamage)));
    }

    rawDamage = this.applyIncomingReduction(
      defender,
      attacker,
      rawDamage,
      damageType,
      battleLog,
    );

    const damage = this.applyDamage(defender, rawDamage);
    attacker.firstDirectDamageDone = true;

    battleLog.push(
      `${attacker.name} 使用${actionName}${critical ? '并暴击' : ''}，造成 ${damage.totalDamage} 伤害`,
    );

    if (damage.hpDamage > 0) {
      this.tryLifesteal(attacker, damage.hpDamage, round, battleLog);
      this.tryReflect(defender, attacker, damage.hpDamage, round, battleLog);
      this.handleLostHpShield(defender, round, battleLog);
    }

    if (damage.totalDamage > 0) {
      // 1v1 结算中用“下一次直接伤害”近似队友触发焚印：
      // 先引爆旧焚印，再由本次法术重新附加新焚印。
      this.tryExplodeBurningMark(attacker, defender, round, battleLog);
      if (damageType === 'magic' && defender.hp > 0) {
        this.handleBurningMark(attacker, defender, round, battleLog);
      }
    }

    if (!isAdditional) {
      this.tryDispel(attacker, defender, battleLog);
    }

    return {
      ...damage,
      critical,
    };
  }

  private applyIncomingReduction(
    defender: Combatant,
    attacker: Combatant,
    rawDamage: number,
    damageType: DamageType,
    battleLog: string[],
  ) {
    let reduction = 0;

    const guard = this.findSkill(
      defender,
      damageType === 'magic' ? 'magic_guard' : 'physical_guard',
    );
    if (guard) {
      reduction += this.numberData(
        guard,
        damageType === 'magic'
          ? 'magicDamageReduction'
          : 'physicalDamageReduction',
        0,
      );
    }

    const slowTank = this.findSkill(defender, 'slow_tank');
    if (slowTank) {
      reduction += this.numberData(slowTank, 'damageReduction', 0);
    }

    const lastStand = this.findSkill(defender, 'last_stand');
    if (
      lastStand &&
      defender.hp / Math.max(1, defender.maxHp) <
        this.numberData(lastStand, 'hpThreshold', 0.3)
    ) {
      reduction += this.numberData(lastStand, 'damageReduction', 0);
    }

    const parry = this.findSkill(defender, 'parry');
    if (
      parry &&
      this.useTurnTrigger(defender, 'parry', 1) &&
      Math.random() < Number(parry.triggerRate || 0)
    ) {
      reduction += this.numberData(parry, 'damageReduction', 0);
      this.registerSkillTrigger(defender, parry, battleLog);
    }

    const afterimage = this.findSkill(defender, 'special_time_afterimage');
    if (afterimage && !defender.afterimageUsed) {
      defender.afterimageUsed = true;
      reduction += this.numberData(afterimage, 'damageReduction', 0.6);
      defender.nextAttackBonus += this.numberData(afterimage, 'nextAttackBonus', 0.3);
      this.registerSkillTrigger(defender, afterimage, battleLog);
      battleLog.push(`${defender.name} 触发 ${afterimage.name}，闪避了大部分伤害`);
    }

    // 兼容早期神域庇护。
    if (this.findSkill(defender, 'damage_reduce')) reduction += 0.25;

    const pierce = damageType === 'magic'
      ? this.findSkill(attacker, 'magic_pierce')
      : null;
    if (pierce) {
      reduction -= this.numberData(pierce, 'damageReductionIgnore', 0);
    }

    reduction = Math.max(0, Math.min(0.8, reduction));
    return Math.max(1, Math.round(rawDamage * (1 - reduction)));
  }

  private applyDamage(target: Combatant, amount: number): Omit<DamageResult, 'critical'> {
    const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
    const shieldDamage = Math.min(target.shield, safeAmount);
    target.shield -= shieldDamage;
    const hpDamage = Math.min(
      Math.max(0, target.hp),
      Math.max(0, safeAmount - shieldDamage),
    );
    target.hp -= hpDamage;

    return {
      hpDamage,
      shieldDamage,
      totalDamage: hpDamage + shieldDamage,
    };
  }

  private tryPhysicalCombo(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'physical_combo');
    if (
      !skill ||
      !this.useTurnTrigger(attacker, 'physical_combo', 1) ||
      Math.random() >= Number(skill.triggerRate || 0)
    ) return;

    this.registerSkillTrigger(attacker, skill, battleLog);
    this.notifyExtraAction(defender, attacker, round, battleLog);
    this.performDirectAttack(
      attacker,
      defender,
      'physical',
      this.numberData(skill, 'extraDamageRate', 0.45),
      round,
      battleLog,
      skill.name,
      true,
    );
  }

  private tryMagicCombo(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'magic_combo');
    if (
      !skill ||
      !this.useTurnTrigger(attacker, 'magic_combo', 1) ||
      Math.random() >= Number(skill.triggerRate || 0)
    ) return;

    this.registerSkillTrigger(attacker, skill, battleLog);
    this.notifyExtraAction(defender, attacker, round, battleLog);
    this.performDirectAttack(
      attacker,
      defender,
      'magic',
      this.numberData(skill, 'repeatEffectRate', 0.4),
      round,
      battleLog,
      skill.name,
      true,
    );
  }

  private tryPursuit(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'pursuit');
    if (
      !skill ||
      defender.hp / Math.max(1, defender.maxHp) >=
        this.numberData(skill, 'hpThreshold', 0.3) ||
      !this.useTurnTrigger(attacker, 'pursuit', 1) ||
      Math.random() >= Number(skill.triggerRate || 0)
    ) return;

    this.registerSkillTrigger(attacker, skill, battleLog);
    this.performDirectAttack(
      attacker,
      defender,
      'physical',
      this.numberData(skill, 'extraDamageRate', 0.5),
      round,
      battleLog,
      skill.name,
      true,
    );
  }

  private handleThunderCharge(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'special_thunder_charge');
    if (!skill) return;

    attacker.thunderStacks += 1;
    const maxStacks = Math.max(
      1,
      Math.floor(this.numberData(skill, 'maxStacks', 3)),
    );
    if (attacker.thunderStacks < maxStacks) return;

    attacker.thunderStacks = 0;
    this.registerSkillTrigger(attacker, skill, battleLog);
    this.performDirectAttack(
      attacker,
      defender,
      'physical',
      this.numberData(skill, 'bounceDamageRate', 0.45),
      round,
      battleLog,
      `${skill.name}（单体折算）`,
      true,
    );
  }

  private tryLifesteal(
    attacker: Combatant,
    hpDamage: number,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'lifesteal');
    if (!skill) return;

    const amount = Math.round(
      hpDamage * this.numberData(skill, 'damageToHealRate', 0),
    );
    if (amount <= 0) return;

    this.registerSkillTrigger(attacker, skill, battleLog);
    this.heal(attacker, attacker, amount, round, battleLog, skill.name);
  }

  private tryReflect(
    defender: Combatant,
    attacker: Combatant,
    hpDamage: number,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(defender, 'reflect');
    const maxPerTurn = Math.max(
      1,
      Math.floor(this.numberData(skill, 'maxPerTurn', 2)),
    );
    if (
      !skill ||
      !this.useTurnTrigger(defender, 'reflect', maxPerTurn) ||
      Math.random() >= Number(skill.triggerRate || 0)
    ) return;

    const amount = Math.max(
      1,
      Math.round(hpDamage * this.numberData(skill, 'reflectRate', 0)),
    );
    this.registerSkillTrigger(defender, skill, battleLog);
    const reflected = this.applyDamage(attacker, amount);
    battleLog.push(
      `${defender.name} 触发 ${skill.name}，反弹 ${reflected.totalDamage} 伤害`,
    );
    this.handleLostHpShield(attacker, round, battleLog);
  }

  private handleLostHpShield(
    owner: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(owner, 'special_team_shield');
    if (!skill) return;

    const maxPerBattle = Math.max(
      1,
      Math.floor(this.numberData(skill, 'maxPerBattle', 3)),
    );
    if (owner.lostHpShieldTriggers >= maxPerBattle) return;

    const step = Math.max(0.05, this.numberData(skill, 'lostHpStep', 0.2));
    const shouldHaveTriggered = Math.floor(
      (owner.maxHp - Math.max(0, owner.hp)) /
        Math.max(1, owner.maxHp * step),
    );

    if (
      shouldHaveTriggered <= owner.lostHpShieldTriggers ||
      !this.useTurnTrigger(owner, 'special_team_shield', 1)
    ) return;

    owner.lostHpShieldTriggers += 1;
    const shield = Math.round(
      owner.maxHp * this.numberData(skill, 'shieldMaxHpRate', 0.05),
    );
    this.registerSkillTrigger(owner, skill, battleLog);
    this.addShield(owner, shield, 2, round, battleLog, skill.name);
  }

  private handleBurningMark(
    attacker: Combatant,
    defender: Combatant,
    _round: number,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'special_burning_mark');
    if (!skill || attacker.turnTriggerKeys.has('burning_mark_applied')) return;

    attacker.turnTriggerKeys.add('burning_mark_applied');
    (defender as any).burningMark = {
      ownerId: attacker.id,
      magicDamageRate: this.numberData(skill, 'magicDamageRate', 0.35),
      turns: Math.max(1, Math.floor(this.numberData(skill, 'durationTurns', 2))),
      skillName: skill.name,
    };
    this.registerSkillTrigger(attacker, skill, battleLog);
    battleLog.push(`${defender.name} 被附加焚印`);
  }

  private tryExplodeBurningMark(
    attacker: Combatant,
    defender: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const mark = (defender as any).burningMark;
    if (!mark || mark.ownerId !== attacker.id) return;
    if (!this.useTurnTrigger(attacker, 'burning_mark_explosion', 1)) return;

    const amount = Math.max(
      1,
      Math.round(attacker.magic * Number(mark.magicDamageRate || 0.35)),
    );
    const result = this.applyDamage(defender, amount);
    delete (defender as any).burningMark;
    battleLog.push(
      `${attacker.name} 引爆 ${mark.skillName || '焚印'}，造成 ${result.totalDamage} 伤害`,
    );
    this.handleLostHpShield(defender, round, battleLog);
  }

  private tryDispel(
    attacker: Combatant,
    defender: Combatant,
    battleLog: string[],
  ) {
    const skill = this.findSkill(attacker, 'dispel_on_hit');
    if (
      !skill ||
      !this.useTurnTrigger(attacker, 'dispel_on_hit', 1) ||
      Math.random() >= Number(skill.triggerRate || 0)
    ) return;

    this.registerSkillTrigger(attacker, skill, battleLog);
    if (defender.shield > 0) {
      const removed = Math.max(1, Math.round(defender.shield * 0.3));
      defender.shield = Math.max(0, defender.shield - removed);
      battleLog.push(`${attacker.name} 触发 ${skill.name}，驱散部分护盾`);
    } else if (defender.nextAttackBonus > 0 || defender.astralDamageBonus > 0) {
      defender.nextAttackBonus = 0;
      defender.astralDamageBonus = 0;
      battleLog.push(`${attacker.name} 触发 ${skill.name}，移除增益`);
    }
  }

  private notifyExtraAction(
    observer: Combatant,
    actor: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const tide = this.findSkill(observer, 'special_tide_reversal');
    if (!tide || observer.tideReversalUsedRound === round) return;

    observer.tideReversalUsedRound = round;
    this.registerSkillTrigger(observer, tide, battleLog);
    this.heal(
      observer,
      observer,
      Math.round(
        observer.maxHp * this.numberData(tide, 'allyMaxHpHealRate', 0.04),
      ),
      round,
      battleLog,
      tide.name,
    );
    actor.nextAttackBonus = Math.max(0, actor.nextAttackBonus - 0.2);
    battleLog.push(`${observer.name} 的 ${tide.name} 削弱了额外行动`);
  }

  private applyTurnEnd(
    owner: Combatant,
    enemy: Combatant,
    round: number,
    battleLog: string[],
  ) {
    const regen = this.findSkill(owner, 'regen');
    if (regen && owner.hp > 0) {
      const amount = Math.round(
        owner.maxHp * this.numberData(regen, 'maxHpRate', 0),
      );
      this.registerSkillTrigger(owner, regen, battleLog);
      this.heal(owner, owner, amount, round, battleLog, regen.name);
    }

    const prayer = this.findSkill(owner, 'special_moon_prayer');
    if (
      prayer &&
      owner.hp > 0 &&
      round - owner.moonPrayerLastRound >=
        Math.max(1, Math.floor(this.numberData(prayer, 'cooldownTurns', 2)))
    ) {
      owner.moonPrayerLastRound = round;
      const amount = Math.round(
        owner.maxHp * this.numberData(prayer, 'targetMaxHpRate', 0.06) +
          owner.magic * this.numberData(prayer, 'magicRate', 0.3),
      );
      this.registerSkillTrigger(owner, prayer, battleLog);
      this.heal(owner, owner, amount, round, battleLog, prayer.name);
    }

    const mark = (enemy as any).burningMark;
    if (mark) {
      mark.turns = Number(mark.turns || 1) - 1;
      if (mark.turns <= 0) delete (enemy as any).burningMark;
    }
  }

  private heal(
    healer: Combatant,
    target: Combatant,
    baseAmount: number,
    round: number,
    battleLog: string[],
    sourceName: string,
  ) {
    if (target.hp <= 0 || baseAmount <= 0) return 0;

    const healingPower = this.findSkill(healer, 'healing_power');
    const bonus = healingPower
      ? this.numberData(healingPower, 'healingAndShieldBonus', 0)
      : 0;
    const amount = Math.max(1, Math.round(baseAmount * (1 + bonus)));
    const missing = Math.max(0, target.maxHp - target.hp);
    const actual = Math.min(missing, amount);
    const overheal = Math.max(0, amount - actual);
    target.hp += actual;

    if (actual > 0) {
      battleLog.push(`${target.name} 通过 ${sourceName} 恢复 ${actual} 生命`);
    }

    const echo = this.findSkill(target, 'healing_echo');
    if (
      actual > 0 &&
      echo &&
      this.useTurnTrigger(target, 'healing_echo', 1) &&
      Math.random() < Number(echo.triggerRate || 0)
    ) {
      const extra = Math.max(
        1,
        Math.round(
          target.maxHp *
            this.numberData(echo, 'extraMaxHpHealRate', 0),
        ),
      );
      const extraActual = Math.min(
        Math.max(0, target.maxHp - target.hp),
        extra,
      );
      target.hp += extraActual;
      this.registerSkillTrigger(target, echo, battleLog);
      if (extraActual > 0) {
        battleLog.push(`${target.name} 触发 ${echo.name}，额外恢复 ${extraActual} 生命`);
      }
    }

    const resonance = this.findSkill(healer, 'special_life_resonance');
    if (overheal > 0 && resonance) {
      const cap = Math.round(
        healer.maxHp * this.numberData(resonance, 'turnCapMaxHpRate', 0.08),
      );
      const shield = Math.min(
        cap,
        Math.round(
          overheal * this.numberData(resonance, 'overhealToShieldRate', 0.6),
        ),
      );
      if (shield > 0) {
        this.registerSkillTrigger(healer, resonance, battleLog);
        this.addShield(
          healer,
          shield,
          this.numberData(resonance, 'durationTurns', 2),
          round,
          battleLog,
          resonance.name,
        );
      }
    }

    return actual;
  }

  private addShield(
    target: Combatant,
    amount: number,
    durationTurns: number,
    currentRound: number,
    battleLog: string[],
    sourceName: string,
  ) {
    if (amount <= 0) return;
    const healingPower = this.findSkill(target, 'healing_power');
    const bonus = healingPower
      ? this.numberData(healingPower, 'healingAndShieldBonus', 0)
      : 0;
    const finalAmount = Math.max(1, Math.round(amount * (1 + bonus)));
    const cap = Math.round(target.maxHp * 0.4);
    const before = target.shield;
    target.shield = Math.min(cap, target.shield + finalAmount);
    target.shieldExpireRound = Math.max(
      target.shieldExpireRound,
      currentRound + Math.max(1, Math.floor(durationTurns || 1)),
    );
    const added = target.shield - before;
    if (added > 0) {
      battleLog.push(`${target.name} 通过 ${sourceName} 获得 ${added} 护盾`);
    }
  }

  private registerSkillTrigger(
    owner: Combatant,
    skill: any,
    battleLog: string[],
  ) {
    if (!skill) return;
    owner.skillTriggerCount += 1;

    const astral = this.findSkill(owner, 'special_astral_resonance');
    if (!astral || skill.effect === 'special_astral_resonance') return;

    const required = Math.max(
      1,
      Math.floor(this.numberData(astral, 'skillCount', 3)),
    );
    if (owner.skillTriggerCount % required !== 0) return;

    owner.astralDamageBonus = Math.max(
      owner.astralDamageBonus,
      this.numberData(astral, 'damageBonus', 0.08),
    );
    battleLog.push(`${owner.name} 触发 ${astral.name}，下一次伤害提升`);
  }

  private isBattleOver(
    left: Combatant,
    right: Combatant,
    battleLog: string[],
  ) {
    if (left.hp <= 0) this.handleDeath(left, battleLog);
    if (right.hp <= 0) this.handleDeath(right, battleLog);
    return left.hp <= 0 || right.hp <= 0;
  }

  private handleDeath(target: Combatant, battleLog: string[]) {
    if (target.hp > 0) return false;

    const rebirth = this.findSkill(target, 'rebirth');
    if (rebirth && !target.rebirthUsed) {
      target.rebirthUsed = true;
      target.hp = Math.max(1, Math.round(target.maxHp * 0.3));
      battleLog.push(`${target.name} 触发 ${rebirth.name}，复活并恢复生命`);
      return false;
    }

    const deathSave = this.findSkill(target, 'death_save');
    if (
      deathSave &&
      !target.deathSaveUsed &&
      Math.random() < Number(deathSave.triggerRate || 0)
    ) {
      target.deathSaveUsed = true;
      target.hp = Math.max(1, this.numberData(deathSave, 'remainHp', 1));
      battleLog.push(`${target.name} 触发 ${deathSave.name}，保留 1 点生命`);
      return false;
    }

    const survive = this.findSkill(target, 'survive_one');
    if (
      survive &&
      !target.surviveUsed &&
      Math.random() < Number(survive.triggerRate || 0)
    ) {
      target.surviveUsed = true;
      target.hp = 1;
      battleLog.push(`${target.name} 触发 ${survive.name}，保留 1 HP`);
      return false;
    }

    return true;
  }

  private shouldUseMagic(owner: Combatant) {
    const magicSkills = owner.skills.filter(
      (skill) => skill.category === 'magic' || String(skill.effect || '').includes('magic'),
    ).length;
    const physicalSkills = owner.skills.filter(
      (skill) => skill.category === 'physical' || String(skill.effect || '').includes('physical'),
    ).length;

    if (magicSkills === physicalSkills) {
      return owner.magic > owner.attack * 1.05;
    }
    return magicSkills > physicalSkills;
  }

  private getControlResist(owner: Combatant) {
    const skill = this.findSkill(owner, 'control_resist');
    return Math.max(
      0,
      Math.min(0.75, skill ? this.numberData(skill, 'controlResistBonus', 0) : 0),
    );
  }

  private useTurnTrigger(
    owner: Combatant,
    key: string,
    maxPerTurn: number,
  ) {
    const prefix = `${key}:`;
    let count = 0;
    for (const existing of owner.turnTriggerKeys) {
      if (existing.startsWith(prefix)) count += 1;
    }
    if (count >= Math.max(1, maxPerTurn)) return false;
    owner.turnTriggerKeys.add(`${key}:${count + 1}`);
    return true;
  }

  private findSkill(owner: Combatant, effect: string) {
    return owner.skills.find((skill) => String(skill?.effect || '') === effect) || null;
  }

  private numberData(skill: any, key: string, fallback: number) {
    const value = Number(skill?.effectData?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  private async saveBattle(
    attackerUserId: number,
    attackerPetId: number,
    defenderUserId: number,
    defenderPetId: number,
    result: { winnerSide: string; battleLog: string[] },
  ) {
    const battle = this.battleRepository.create({
      attackerUserId,
      attackerPetId,
      defenderUserId,
      defenderPetId,
      winnerPetId:
        result.winnerSide === 'left'
          ? attackerPetId
          : defenderPetId,
      finished: true,
      battleLog: JSON.stringify(result.battleLog),
    });

    return this.battleRepository.save(battle);
  }
}
