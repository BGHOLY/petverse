import { describe, expect, it } from '@jest/globals';

import { petRemovalRestriction } from './pet-removal-safety';

describe('pet removal safety', () => {
  it('rejects pets in the active five-pet team', () => {
    expect(
      petRemovalRestriction(12, { petIds: [9, 10, 11, 12, 13] } as any),
    ).toContain('active team');
  });

  it('rejects pets participating in an active expedition', () => {
    expect(
      petRemovalRestriction(
        12,
        { petIds: [1, 2, 3, 4, 5] } as any,
        [{ petIds: [8, 12] }, { petIds: [20, 21] }] as any,
      ),
    ).toContain('active expedition');
  });

  it('rejects equipped pets and accepts idle pets', () => {
    expect(petRemovalRestriction(12, null, [], { equippedPetId: 12 } as any)).toContain(
      'Unequip',
    );
    expect(petRemovalRestriction(12, null, [], { equippedPetId: 30 } as any)).toBe('');
  });
});
