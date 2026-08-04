import { describe, expect, it } from '@jest/globals';

import {
  STARTER_INVENTORY,
  STARTER_TEAM,
  STARTER_TEAM_SOURCE,
} from './starter-team.config';

describe('V12 starter team', () => {
  it('provides five unique, complementary and protected-ready pets', () => {
    expect(STARTER_TEAM).toHaveLength(5);
    expect(new Set(STARTER_TEAM.map((pet) => pet.key)).size).toBe(5);
    expect(new Set(STARTER_TEAM.map((pet) => pet.speciesCode)).size).toBe(5);
    expect(STARTER_TEAM.map((pet) => pet.speciesCode)).toEqual(
      expect.arrayContaining(['PET001', 'PET002', 'PET003', 'PET004', 'PET006']),
    );
    expect(STARTER_TEAM.every((pet) => pet.skillSlotCount >= 4)).toBe(true);
    expect(STARTER_TEAM_SOURCE).toBe('starter_team_v12');
  });

  it('gives enough resources to demonstrate growth, hatching and fusion', () => {
    expect(STARTER_INVENTORY.exp_potion_small).toBeGreaterThanOrEqual(3);
    expect(STARTER_INVENTORY.common_pet_egg).toBeGreaterThanOrEqual(2);
    expect(STARTER_INVENTORY.hatch_sandglass_large).toBeGreaterThanOrEqual(2);
    expect(STARTER_INVENTORY.fusion_core).toBeGreaterThanOrEqual(1);
    expect(STARTER_INVENTORY.breeding_token).toBeGreaterThanOrEqual(1);
  });
});
