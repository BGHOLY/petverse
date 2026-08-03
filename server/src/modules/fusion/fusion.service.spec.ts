import { describe, expect, it } from '@jest/globals';

import { FusionService } from './fusion.service';

describe('FusionService parent safety rules', () => {
  const service = new FusionService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const parentA = {
    id: 11,
    ownerId: 77,
    isEgg: false,
    isLocked: false,
    tradeStatus: '',
    tradeListingId: 0,
    married: false,
    marriedPetId: 0,
  } as any;
  const parentB = { ...parentA, id: 12 } as any;
  const validate = (...rest: any[]) => (service as any).validateParents(77, parentA, parentB, ...rest);

  it('rejects pets that are still on an active expedition', () => {
    expect(validate({ petIds: [] }, [{ status: 'active', petIds: [11, 21] }], [])).toContain('active expedition');
  });

  it('rejects pets with equipped items so equipment cannot be orphaned', () => {
    expect(validate({ petIds: [] }, [], [{ equippedPetId: 12 }])).toContain('Unequip');
  });

  it('accepts idle, unequipped pets outside the active team', () => {
    expect(validate({ petIds: [21, 22, 23, 24, 25] }, [], [])).toBe('');
  });
});
