import { describe, expect, it } from '@jest/globals';

import { normalizeBattleTactics } from './battle-tactics.config';

describe('battle tactics normalization', () => {
  it('provides safe defaults', () => {
    expect(normalizeBattleTactics({})).toMatchObject({
      targetStrategy: 'LOWEST_HP',
      skillStrategy: 'CAST_IMMEDIATELY',
      survivalStrategy: 'PROTECT_BACKLINE',
    });
  });

  it('maps the new preset to legacy battle fields', () => {
    expect(
      normalizeBattleTactics({
        targetStrategy: 'BACK_FIRST',
        skillStrategy: 'BOSS_CAST',
        survivalStrategy: 'FULL_OFFENSE',
      }),
    ).toMatchObject({
      focusPriority: 'back',
      ultimatePolicy: 'bossPhase',
      guardTarget: 'off',
      shieldThreshold: 0,
    });
  });

  it('keeps old team data compatible', () => {
    expect(
      normalizeBattleTactics({
        focusPriority: 'healer',
        ultimatePolicy: 'lowHp',
        guardTarget: 'lowestDefense',
        shieldThreshold: 40,
      }),
    ).toMatchObject({
      targetStrategy: 'HEALER_FIRST',
      skillStrategy: 'EXECUTE',
      survivalStrategy: 'FORMATION_AT_LOW_HP',
    });
  });
});
