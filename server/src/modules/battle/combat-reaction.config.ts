export const COMBAT_TAGS = [
  'FIRE',
  'ICE',
  'WATER',
  'LIGHTNING',
  'POISON',
  'CONTROL',
  'MARK',
  'CHASE',
  'SHIELD',
  'HEAL',
  'COUNTER',
  'HEAVY',
] as const;

export type CombatTag = (typeof COMBAT_TAGS)[number];

export const COMBAT_REACTIONS = [
  {
    code: 'BURN_FIRE_BURST',
    required: ['FIRE'],
    targetStatus: 'dot',
    name: '烈焰爆发',
    maxPerRound: 1,
  },
  {
    code: 'WET_LIGHTNING',
    required: ['LIGHTNING'],
    targetStatus: 'wet',
    name: '感电',
    maxPerRound: 1,
  },
  {
    code: 'FREEZE_HEAVY',
    required: ['HEAVY'],
    targetStatus: 'freeze',
    name: '碎冰',
    maxPerRound: 1,
  },
  {
    code: 'MARK_CHASE',
    required: ['CHASE'],
    targetStatus: 'huntMark',
    name: '标记追击',
    maxPerRound: 1,
  },
  {
    code: 'OVERHEAL_SHIELD',
    required: ['HEAL'],
    targetStatus: '',
    name: '生命屏障',
    maxPerRound: 1,
  },
  {
    code: 'SHIELD_COUNTER',
    required: ['COUNTER'],
    targetStatus: 'shield',
    name: '坚壁回震',
    maxPerRound: 1,
  },
] as const;

export function getSkillCombatTags(skill: any): CombatTag[] {
  const explicit = Array.isArray(skill?.combatTags)
    ? skill.combatTags.map((tag: any) => String(tag).toUpperCase())
    : [];
  const source = [
    skill?.skillCode,
    skill?.effect,
    skill?.category,
    skill?.type,
  ]
    .map((value) => String(value || '').toUpperCase())
    .join(' ');
  const tags = new Set<CombatTag>();

  for (const tag of explicit) {
    if (COMBAT_TAGS.includes(tag as CombatTag)) tags.add(tag as CombatTag);
  }
  if (/FIRE|BURN|FLAME/.test(source)) tags.add('FIRE');
  if (/ICE|FROST|FREEZE/.test(source)) tags.add('ICE');
  if (/WATER|TIDE|WET/.test(source)) tags.add('WATER');
  if (/LIGHTNING|THUNDER|SHOCK/.test(source)) tags.add('LIGHTNING');
  if (/POISON|TOXIN/.test(source)) tags.add('POISON');
  if (/CONTROL|STUN|FREEZE|SILENCE/.test(source)) tags.add('CONTROL');
  if (/MARK/.test(source)) tags.add('MARK');
  if (/CHASE|PURSUIT|COMBO/.test(source)) tags.add('CHASE');
  if (/SHIELD|GUARD/.test(source)) tags.add('SHIELD');
  if (/HEAL|REGEN|LIFESTEAL/.test(source)) tags.add('HEAL');
  if (/COUNTER|REFLECT/.test(source)) tags.add('COUNTER');
  if (/PHYSICAL_POWER|AMBUSH|HEAVY|CRIT/.test(source)) tags.add('HEAVY');
  return [...tags];
}
