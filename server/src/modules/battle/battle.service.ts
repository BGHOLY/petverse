import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FriendService } from '../friend/friend.service';
import { DEFAULT_USER_ID } from '../game-data';
import { Pet } from '../pet/pet.entity';
import { PetService } from '../pet/pet.service';
import { Battle } from './battle.entity';

type Combatant = {
  id: number;
  ownerId: number;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  rarity: number;
  level: number;
  skills: any[];
  rebirthUsed?: boolean;
  surviveUsed?: boolean;
};

@Injectable()
export class BattleService {
  constructor(
    @InjectRepository(Battle)
    private readonly battleRepository: Repository<Battle>,

    private readonly petService: PetService,

    private readonly friendService: FriendService,
  ) {}

  async pve(userId = DEFAULT_USER_ID, petId?: number) {
    const pet = petId ? await this.petService.getPetById(petId) : await this.petService.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Player pet not found',
      };
    }

    const monster = this.createMonster(1);
    const result = this.simulateBattle(this.fromPet(pet), monster);

    await this.saveBattle(userId, pet.id, 0, 0, result);

    return {
      success: true,
      mode: 'pve',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      battleLog: result.battleLog,
      playerPet: pet,
      monster,
    };
  }

  async friendBattle(userId = DEFAULT_USER_ID, petId?: number, friendPetId?: number) {
    const myPet = petId ? await this.petService.getPetById(petId) : await this.petService.getMainPet(userId);
    const friendPet = friendPetId
      ? await this.petService.getPetById(friendPetId)
      : await this.friendService.getFirstFriendPet();

    if (!myPet || myPet.ownerId !== userId || myPet.isEgg || !friendPet || friendPet.isEgg) {
      return {
        success: false,
        message: 'Battle pet not found',
      };
    }

    const result = this.simulateBattle(this.fromPet(myPet), this.fromPet(friendPet));
    await this.saveBattle(userId, myPet.id, friendPet.ownerId, friendPet.id, result);

    return {
      success: true,
      mode: 'friend',
      result: result.winnerSide === 'left' ? 'win' : 'lose',
      winner: result.winnerName,
      battleLog: result.battleLog,
      playerPet: myPet,
      friendPet,
    };
  }

  async startBattle(userId: number, myPetId: number, targetPetId: number) {
    return this.friendBattle(userId, myPetId, targetPetId);
  }

  simulateBattle(leftInput: Combatant, rightInput: Combatant) {
    const left = this.cloneCombatant(leftInput);
    const right = this.cloneCombatant(rightInput);
    const battleLog: string[] = [];

    this.applyPassiveSkills(left, right, battleLog);
    this.applyPassiveSkills(right, left, battleLog);

    const firstLeft = left.speed >= right.speed;

    for (let round = 1; round <= 30; round += 1) {
      battleLog.push(`第 ${round} 回合`);

      const first = firstLeft ? left : right;
      const second = firstLeft ? right : left;

      this.takeTurn(first, second, battleLog);
      if (this.handleDeath(second, battleLog)) {
        break;
      }

      this.takeTurn(second, first, battleLog);
      if (this.handleDeath(first, battleLog)) {
        break;
      }
    }

    this.applyPostBattleHealing(left, battleLog);
    this.applyPostBattleHealing(right, battleLog);

    const winnerSide = left.hp === right.hp ? 'left' : left.hp > right.hp ? 'left' : 'right';
    const winner = winnerSide === 'left' ? left : right;
    battleLog.push(`${winner.name} 获胜`);

    return {
      winnerSide,
      winnerName: winner.name,
      leftHp: Math.max(0, Math.round(left.hp)),
      rightHp: Math.max(0, Math.round(right.hp)),
      battleLog,
    };
  }

  createTowerMonster(floor: number) {
    const isBoss = floor % 5 === 0;
    const base = {
      id: 0,
      ownerId: 0,
      name: isBoss ? `Tower Boss ${floor}` : `Tower Monster ${floor}`,
      maxHp: 80 + floor * 40,
      hp: 80 + floor * 40,
      attack: 12 + floor * 8,
      defense: 5 + floor * 4,
      speed: 8 + floor * 2,
      rarity: Math.min(6, Math.max(1, Math.ceil(floor / 5))),
      level: floor,
      skills: [],
    };

    if (isBoss) {
      base.maxHp = Math.floor(base.maxHp * 1.8);
      base.hp = base.maxHp;
      base.attack = Math.floor(base.attack * 1.5);
      base.defense = Math.floor(base.defense * 1.3);
    }

    return base;
  }

  fromPet(pet: Pet): Combatant {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.nickname || `Pet ${pet.id}`,
      maxHp: Number(pet.hp || 100),
      hp: Number(pet.hp || 100),
      attack: Number(pet.attack || 20),
      defense: Number(pet.defense || 10),
      speed: Number(pet.speed || pet.agility || 10),
      rarity: Number(pet.rarity || 1),
      level: Number(pet.level || 1),
      skills: Array.isArray(pet.skills) ? pet.skills : [],
    };
  }

  private createMonster(level: number): Combatant {
    return {
      id: 0,
      ownerId: 0,
      name: '野外怪物',
      maxHp: 120 + level * 20,
      hp: 120 + level * 20,
      attack: 20 + level * 5,
      defense: 10 + level * 3,
      speed: 10 + level * 2,
      rarity: 1,
      level,
      skills: [],
    };
  }

  private cloneCombatant(input: Combatant): Combatant {
    return {
      ...input,
      skills: [...(input.skills || [])],
      hp: Number(input.hp || input.maxHp || 1),
      maxHp: Number(input.maxHp || input.hp || 1),
    };
  }

  private applyPassiveSkills(owner: Combatant, enemy: Combatant, battleLog: string[]) {
    for (const skill of owner.skills) {
      switch (skill.effect) {
        case 'hp+20':
          owner.maxHp += 20;
          owner.hp += 20;
          battleLog.push(`${owner.name} 触发 ${skill.name}，生命 +20`);
          break;
        case 'speed+5':
          owner.speed += 5;
          battleLog.push(`${owner.name} 触发 ${skill.name}，速度 +5`);
          break;
        case 'speed+30':
          owner.speed += 30;
          battleLog.push(`${owner.name} 触发 ${skill.name}，速度 +30`);
          break;
        case 'defense+10':
          owner.defense += 10;
          battleLog.push(`${owner.name} 触发 ${skill.name}，防御 +10`);
          break;
        case 'enemy_attack_down':
          enemy.attack = Math.max(1, Math.round(enemy.attack * 0.85));
          battleLog.push(`${owner.name} 触发 ${skill.name}，敌方攻击下降`);
          break;
      }
    }
  }

  private takeTurn(attacker: Combatant, defender: Combatant, battleLog: string[]) {
    if (attacker.hp <= 0 || defender.hp <= 0) {
      return;
    }

    if (this.hasSkill(attacker, 'low_hp_attack') && attacker.hp <= attacker.maxHp * 0.3) {
      attacker.attack = Math.round(attacker.attack * 1.3);
      battleLog.push(`${attacker.name} 触发 战斗怒意，攻击提升`);
    }

    let damage = this.calculateDamage(attacker, defender);
    const criticalSkill = attacker.skills.find((skill) => skill.effect === 'critical');

    if (criticalSkill && Math.random() < criticalSkill.triggerRate) {
      damage = Math.round(damage * 1.8);
      battleLog.push(`${attacker.name} 触发 ${criticalSkill.name}，暴击`);
    }

    defender.hp -= damage;
    battleLog.push(`${attacker.name} 使用普通攻击，造成 ${damage} 伤害`);
    this.applyOnDamageSkills(attacker, defender, damage, battleLog);

    for (const skill of attacker.skills) {
      if (defender.hp <= 0) {
        return;
      }

      if (!['attack', 'heal', 'buff', 'debuff'].includes(skill.type)) {
        continue;
      }

      if (Math.random() > Number(skill.triggerRate || 0)) {
        continue;
      }

      this.applyTriggeredSkill(attacker, defender, skill, battleLog);
    }
  }

  private applyTriggeredSkill(
    attacker: Combatant,
    defender: Combatant,
    skill: any,
    battleLog: string[],
  ) {
    switch (skill.effect) {
      case 'combo': {
        const damage = this.calculateDamage(attacker, defender);
        defender.hp -= damage;
        battleLog.push(`${attacker.name} 触发技能 ${skill.name}，追加攻击造成 ${damage} 伤害`);
        this.applyOnDamageSkills(attacker, defender, damage, battleLog);
        break;
      }

      case 'ignore_defense': {
        const damage = Math.max(1, Math.round(attacker.attack + Number(skill.power || 0) - defender.defense * 0.2));
        defender.hp -= damage;
        battleLog.push(`${attacker.name} 触发技能 ${skill.name}，造成 ${damage} 伤害`);
        this.applyOnDamageSkills(attacker, defender, damage, battleLog);
        break;
      }

      case 'lifesteal':
      case 'post_heal':
        break;

      default:
        if (skill.type === 'attack') {
          const damage = Math.max(
            1,
            Math.round(attacker.attack + Number(skill.power || 0) - defender.defense * 0.5),
          );
          defender.hp -= damage;
          battleLog.push(`${attacker.name} 触发技能 ${skill.name}，造成 ${damage} 伤害`);
          this.applyOnDamageSkills(attacker, defender, damage, battleLog);
        }
    }
  }

  private applyOnDamageSkills(
    attacker: Combatant,
    defender: Combatant,
    damage: number,
    battleLog: string[],
  ) {
    const lifesteal = attacker.skills.find((skill) => skill.effect === 'lifesteal');
    if (lifesteal && Math.random() < Number(lifesteal.triggerRate || 0)) {
      const heal = Math.max(1, Math.round(damage * 0.2));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      battleLog.push(`${attacker.name} 触发 ${lifesteal.name}，恢复 ${heal} 生命`);
    }

    const guard = defender.skills.find((skill) => skill.effect === 'damage_reduce');
    if (guard) {
      battleLog.push(`${defender.name} 拥有 ${guard.name}，受到伤害降低效果已计入防御`);
    }
  }

  private handleDeath(target: Combatant, battleLog: string[]) {
    if (target.hp > 0) {
      return false;
    }

    const rebirth = target.skills.find((skill) => skill.effect === 'rebirth');
    if (rebirth && !target.rebirthUsed) {
      target.rebirthUsed = true;
      target.hp = Math.max(1, Math.round(target.maxHp * 0.3));
      battleLog.push(`${target.name} 触发 ${rebirth.name}，复活并恢复生命`);
      return false;
    }

    const survive = target.skills.find((skill) => skill.effect === 'survive_one');
    if (survive && !target.surviveUsed && Math.random() < Number(survive.triggerRate || 0)) {
      target.surviveUsed = true;
      target.hp = 1;
      battleLog.push(`${target.name} 触发 ${survive.name}，保留 1 HP`);
      return false;
    }

    return true;
  }

  private applyPostBattleHealing(target: Combatant, battleLog: string[]) {
    const heal = target.skills.find((skill) => skill.effect === 'post_heal');
    if (heal && target.hp > 0) {
      const amount = Math.max(1, Math.round(target.maxHp * 0.1));
      target.hp = Math.min(target.maxHp, target.hp + amount);
      battleLog.push(`${target.name} 触发 ${heal.name}，战后恢复 ${amount} 生命`);
    }
  }

  private calculateDamage(attacker: Combatant, defender: Combatant) {
    let damage = Math.max(1, Math.round(attacker.attack - defender.defense * 0.5));

    if (this.hasSkill(defender, 'damage_reduce')) {
      damage = Math.max(1, Math.round(damage * 0.75));
    }

    return damage;
  }

  private hasSkill(target: Combatant, effect: string) {
    return target.skills.some((skill) => skill.effect === effect);
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
      winnerPetId: result.winnerSide === 'left' ? attackerPetId : defenderPetId,
      finished: true,
      battleLog: JSON.stringify(result.battleLog),
    });

    return this.battleRepository.save(battle);
  }
}
