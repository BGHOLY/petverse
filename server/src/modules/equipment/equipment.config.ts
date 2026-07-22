export const EQUIPMENT_SLOTS = ['head', 'necklace', 'amulet', 'accessory'] as const;
export const LOCKED_EQUIPMENT_SLOTS = ['emblem', 'spiritStone'] as const;

export type EquipmentSlotType = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_TEMPLATES = [
  { id: 'forest_headguard', name: '林语头巾', slotType: 'head', stat: 'defense', base: 8 },
  { id: 'moon_necklace', name: '月露项链', slotType: 'necklace', stat: 'hp', base: 40 },
  { id: 'guardian_amulet', name: '守护护符', slotType: 'amulet', stat: 'magicDefense', base: 8 },
  { id: 'swift_accessory', name: '疾风饰品', slotType: 'accessory', stat: 'speed', base: 5 },
] as const;

export function equipmentPower(stats: Record<string, number> = {}) {
  return Math.round(
    Number(stats.hp || 0) * 0.2 +
      Number(stats.attack || 0) * 3 +
      Number(stats.magic || 0) * 3 +
      Number(stats.defense || 0) * 2.5 +
      Number(stats.magicDefense || 0) * 2.5 +
      Number(stats.speed || 0) * 4,
  );
}
