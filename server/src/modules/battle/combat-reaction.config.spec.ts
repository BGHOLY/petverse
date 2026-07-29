import { describe, expect, it } from '@jest/globals';

import {
  COMBAT_REACTIONS,
  getSkillCombatTags,
} from './combat-reaction.config';

describe('combat reaction configuration', () => {
  it('contains the six approved reactions with trigger limits', () => {
    expect(COMBAT_REACTIONS).toHaveLength(6);
    expect(COMBAT_REACTIONS.every((item) => item.maxPerRound === 1)).toBe(true);
  });

  it('derives reusable tags from existing skill data', () => {
    expect(
      getSkillCombatTags({
        skillCode: 'HIGH_FIRE_CHASE',
        effect: 'pursuit',
      }),
    ).toEqual(expect.arrayContaining(['FIRE', 'CHASE']));
    expect(
      getSkillCombatTags({
        skillCode: 'HIGH_REFLECT',
        effect: 'reflect',
      }),
    ).toContain('COUNTER');
  });
});
