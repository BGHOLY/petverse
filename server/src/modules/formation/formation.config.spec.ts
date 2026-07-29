import { describe, expect, it } from '@jest/globals';

import { FORMATION_CONFIGS } from './formation.config';

describe('formation combat configuration', () => {
  it('keeps all five legacy formation codes', () => {
    expect(FORMATION_CONFIGS.map((item) => item.code)).toEqual([
      'dragon',
      'turtle',
      'crane',
      'tiger',
      'phoenix',
    ]);
  });

  it.each(FORMATION_CONFIGS)(
    '$code has positions, passive and ultimate configuration',
    (formation) => {
      expect(formation.positions).toHaveLength(5);
      expect(formation.passiveRule.code).toBeTruthy();
      expect(formation.ultimateSkill.name).toBeTruthy();
      expect(formation.ultimateEnergyRequired).toBeGreaterThan(0);
      expect(formation.ultimateTrigger).toBe('MANUAL_OR_TACTICS');
    },
  );
});
