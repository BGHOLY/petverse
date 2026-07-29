import { describe, expect, it } from '@jest/globals';

import { seededBattleRandom } from './battle-random.util';

describe('seededBattleRandom', () => {
  it('returns the same value for the same battle event seed', () => {
    expect(seededBattleRandom('battle:1:3:critical')).toBe(
      seededBattleRandom('battle:1:3:critical'),
    );
  });

  it('returns normalized values and changes with the event cursor', () => {
    const first = seededBattleRandom('battle:1:0');
    const second = seededBattleRandom('battle:1:1');
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(second).not.toBe(first);
  });
});
