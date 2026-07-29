import { describe, expect, it } from '@jest/globals';

import { PET_SPECIES_CONFIGS } from '../pet/config/pet-species.config';
import {
  calculateExpeditionRewards,
  EXPEDITION_DURATIONS,
  EXPEDITION_MAPS,
} from './expedition.config';

describe('expedition reward configuration', () => {
  it('supports the four approved maps and durations', () => {
    expect(Object.keys(EXPEDITION_MAPS)).toEqual([
      'forest',
      'volcano',
      'icefield',
      'ruins',
    ]);
    expect(EXPEDITION_DURATIONS).toEqual([30, 120, 240, 480]);
  });

  it('is deterministic for the same server seed', () => {
    const species = PET_SPECIES_CONFIGS.slice(0, 5);
    expect(
      calculateExpeditionRewards('forest', 120, species, 'same-seed'),
    ).toEqual(
      calculateExpeditionRewards('forest', 120, species, 'same-seed'),
    );
  });

  it('rewards a matching elemental team without reducing base rewards', () => {
    const fire = PET_SPECIES_CONFIGS.filter((item) => item.element === 'fire');
    const water = PET_SPECIES_CONFIGS.filter((item) => item.element === 'water');
    const unmatched = calculateExpeditionRewards(
      'volcano',
      120,
      fire,
      'element-seed',
    );
    const matched = calculateExpeditionRewards(
      'volcano',
      120,
      water,
      'element-seed',
    );
    expect(matched.modifiers.elementMatches).toBeGreaterThan(0);
    expect(matched.rewards.gold).toBeGreaterThanOrEqual(unmatched.rewards.gold);
  });
});
