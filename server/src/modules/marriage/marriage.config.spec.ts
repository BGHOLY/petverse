import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_BREED_LIMIT,
  DEVELOPMENT_MARRIAGE_COOLDOWN_SECONDS,
  getMarriageCooldownSeconds,
  getMarriageEggOwnerIds,
  HAS_LIFETIME_BREED_LIMIT,
  PRODUCTION_MARRIAGE_COOLDOWN_SECONDS,
} from './marriage.config';

describe('marriage production configuration', () => {
  it('uses a short cooldown outside production and 72 hours in production', () => {
    expect(getMarriageCooldownSeconds({ NODE_ENV: 'development' })).toBe(
      DEVELOPMENT_MARRIAGE_COOLDOWN_SECONDS,
    );
    expect(getMarriageCooldownSeconds({ NODE_ENV: 'test' })).toBe(
      DEVELOPMENT_MARRIAGE_COOLDOWN_SECONDS,
    );
    expect(getMarriageCooldownSeconds({ NODE_ENV: 'production' })).toBe(
      PRODUCTION_MARRIAGE_COOLDOWN_SECONDS,
    );
  });

  it('supports an explicit positive cooldown override', () => {
    expect(
      getMarriageCooldownSeconds({
        NODE_ENV: 'production',
        MARRIAGE_COOLDOWN_SECONDS: '3600',
      }),
    ).toBe(3600);
  });

  it('has no lifetime breeding cap', () => {
    expect(HAS_LIFETIME_BREED_LIMIT).toBe(false);
    expect(DEFAULT_BREED_LIMIT).toBe(0);
  });

  it('awards one egg to each distinct owner', () => {
    expect(getMarriageEggOwnerIds(201, 202)).toEqual([201, 202]);
    expect(getMarriageEggOwnerIds(201, 201)).toEqual([201]);
  });
});
