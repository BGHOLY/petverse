import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';
import {
  EQUIPMENT_SLOTS,
  EQUIPMENT_TEMPLATES,
  equipmentPower,
} from './equipment.config';
import { EquipmentItem } from './equipment.entity';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(EquipmentItem)
    private readonly equipmentRepository: Repository<EquipmentItem>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async list(userId: number) {
    const items = await this.equipmentRepository.find({
      where: { ownerId: userId },
      order: { equippedPetId: 'DESC', rarity: 'DESC', id: 'ASC' },
    });
    return items.map((item) => this.view(item));
  }

  async forPet(userId: number, petId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId, ownerId: userId, isEgg: false } });
    if (!pet) return { success: false, message: 'Pet not found' };
    const equipment = await this.equipmentRepository.find({ where: { ownerId: userId, equippedPetId: petId } });
    return { success: true, equipment: equipment.map((item) => this.view(item)), bonuses: this.sumBonuses(equipment) };
  }

  async attachToPets<T extends Pet>(pets: T[]) {
    const petIds = pets.map((pet) => Number(pet.id || 0)).filter((id) => id > 0);
    if (!petIds.length) return pets;
    const equipment = await this.equipmentRepository.find({ where: { equippedPetId: In(petIds) } });
    const byPet = new Map<number, EquipmentItem[]>();
    for (const item of equipment) {
      const list = byPet.get(item.equippedPetId) || [];
      list.push(item);
      byPet.set(item.equippedPetId, list);
    }
    for (const pet of pets) {
      const items = byPet.get(pet.id) || [];
      const mapped = Object.fromEntries(items.map((item) => [item.slotType, this.view(item)]));
      (pet as any).equipment = mapped;
      (pet as any).equipments = items.map((item) => this.view(item));
      (pet as any).equipmentBonuses = this.sumBonuses(items);
      (pet as any).equipmentPower = equipmentPower((pet as any).equipmentBonuses);
    }
    return pets;
  }

  async equip(userId: number, equipmentId: number, petId: number) {
    return this.equipmentRepository.manager.transaction(async (manager) => {
      const equipmentRepository = manager.getRepository(EquipmentItem);
      const petRepository = manager.getRepository(Pet);
      const item = await equipmentRepository.findOne({ where: { id: equipmentId, ownerId: userId }, lock: { mode: 'pessimistic_write' } });
      const pet = await petRepository.findOne({ where: { id: petId, ownerId: userId, isEgg: false }, lock: { mode: 'pessimistic_write' } });
      if (!item) return { success: false, message: 'Equipment not found' };
      if (!pet) return { success: false, message: 'Pet not found' };
      if (item.locked) return { success: false, message: 'Locked equipment cannot be changed' };
      if (!EQUIPMENT_SLOTS.includes(item.slotType as any)) return { success: false, message: 'Equipment slot is not available' };
      if (item.equippedPetId && item.equippedPetId !== petId) {
        return { success: false, message: 'Equipment is already used by another pet' };
      }
      const current = await equipmentRepository.findOne({
        where: { ownerId: userId, equippedPetId: petId, slotType: item.slotType },
        lock: { mode: 'pessimistic_write' },
      });
      if (current && current.id !== item.id) {
        current.equippedPetId = 0;
        await equipmentRepository.save(current);
      }
      item.equippedPetId = petId;
      await equipmentRepository.save(item);
      return {
        success: true,
        message: 'Equipment equipped',
        equipment: this.view(item),
        replaced: current && current.id !== item.id ? this.view(current) : null,
      };
    });
  }

  async unequip(userId: number, equipmentId: number) {
    return this.equipmentRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(EquipmentItem);
      const item = await repository.findOne({ where: { id: equipmentId, ownerId: userId }, lock: { mode: 'pessimistic_write' } });
      if (!item) return { success: false, message: 'Equipment not found' };
      if (item.locked) return { success: false, message: 'Locked equipment cannot be changed' };
      item.equippedPetId = 0;
      await repository.save(item);
      return { success: true, message: 'Equipment removed', equipment: this.view(item) };
    });
  }

  async grantBattleDrop(
    manager: EntityManager,
    userId: number,
    battleId: string,
    boss = false,
  ) {
    const repository = manager.getRepository(EquipmentItem);
    const sourceKey = `battle:${battleId}:equipment:0`;
    const existing = await repository.findOne({ where: { sourceKey } });
    if (existing) return this.view(existing);
    const hash = [...String(battleId || userId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const template = EQUIPMENT_TEMPLATES[hash % EQUIPMENT_TEMPLATES.length];
    const rarity = boss ? 4 : 2;
    const amount = Math.max(1, Math.round(template.base * (1 + (rarity - 1) * 0.35)));
    const item = repository.create({
      ownerId: userId,
      itemTemplateId: template.id,
      name: boss ? `首领·${template.name}` : template.name,
      slotType: template.slotType,
      rarity,
      level: 1,
      mainStat: { [template.stat]: amount },
      subStats: boss ? { hp: 20, attack: 3 } : {},
      equippedPetId: 0,
      locked: false,
      sourceBattleId: String(battleId || ''),
      sourceKey,
    });
    return this.view(await repository.save(item));
  }

  async seed(userId: number) {
    const repository = this.equipmentRepository;
    const created: EquipmentItem[] = [];
    for (let index = 0; index < 2; index += 1) {
      const sourceKey = `dev:equipment:${userId}:${index}`;
      let item = await repository.findOne({ where: { sourceKey } });
      if (!item) {
        const template = EQUIPMENT_TEMPLATES[index];
        item = await repository.save(repository.create({
          ownerId: userId,
          itemTemplateId: template.id,
          name: template.name,
          slotType: template.slotType,
          rarity: 2 + index,
          level: 1,
          mainStat: { [template.stat]: Math.round(template.base * (1.35 + index * 0.2)) },
          subStats: index ? { hp: 18 } : {},
          equippedPetId: 0,
          locked: false,
          sourceBattleId: '',
          sourceKey,
        }));
      }
      created.push(item);
    }
    return { success: true, equipment: created.map((item) => this.view(item)) };
  }

  private sumBonuses(items: EquipmentItem[]) {
    const result: Record<string, number> = {};
    for (const item of items) {
      for (const source of [item.mainStat || {}, item.subStats || {}]) {
        for (const [key, value] of Object.entries(source)) {
          result[key] = Number(result[key] || 0) + Number(value || 0);
        }
      }
    }
    return result;
  }

  private view(item: EquipmentItem) {
    const stats = this.sumBonuses([item]);
    return { ...item, type: 'equipment', stats, power: equipmentPower(this.sumBonuses([item])) };
  }
}
