import { describe, expect, it, jest } from '@jest/globals';

import { ExpeditionService } from './expedition.service';

function createHarness() {
  const expeditions: any[] = [];
  const pets: any[] = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    ownerId: 1,
    isEgg: false,
    speciesCode: `PET00${index + 1}`,
    species: '',
    tradeStatus: 'none',
    tradeListingId: 0,
    exp: 0,
  }));
  const expeditionRepository: any = {
    findOne: jest.fn(async ({ where }: any) =>
      expeditions.find((entry) =>
        Object.entries(where).every(([key, value]) => entry[key] === value),
      ) || null,
    ),
    find: jest.fn(async ({ where }: any) =>
      expeditions.filter((entry) =>
        Object.entries(where).every(([key, value]) => entry[key] === value),
      ),
    ),
    create: jest.fn((value: any) => ({ ...value })),
    save: jest.fn(async (value: any) => {
      if (!value.id) {
        value.id = expeditions.length + 1;
        expeditions.push(value);
      }
      return value;
    }),
  };
  const petRepository: any = {
    find: jest.fn(async ({ where }: any) =>
      pets.filter(
        (pet) =>
          where.id._value.includes(pet.id) &&
          pet.ownerId === where.ownerId &&
          (where.isEgg === undefined || pet.isEgg === where.isEgg),
      ),
    ),
    save: jest.fn(async (values: any[]) => values),
  };
  const manager = {
    getRepository: jest.fn((entity: any) =>
      entity.name === 'Expedition' ? expeditionRepository : petRepository,
    ),
  };
  const economy: any = {
    normalizeRequestId: jest.fn(
      (requestId: string, prefix: string) => requestId || `${prefix}-generated`,
    ),
    transaction: jest.fn(async (run: any) => run(manager)),
    grant: jest.fn(async () => ({})),
    getWallet: jest.fn(async () => ({ gold: 1000, diamond: 100 })),
  };
  const itemService: any = {
    seedDefaultItems: jest.fn(async () => ({})),
  };
  return {
    service: new ExpeditionService(
      expeditionRepository,
      petRepository,
      economy,
      itemService,
    ),
    expeditions,
    pets,
    economy,
  };
}

describe('ExpeditionService', () => {
  it('does not allow one pet to join concurrent expeditions', async () => {
    const harness = createHarness();
    const first = await harness.service.start(
      1,
      'forest',
      30,
      [1, 2],
      'first',
    );
    const second = await harness.service.start(
      1,
      'volcano',
      30,
      [2, 3],
      'second',
    );
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.message).toContain('already on an expedition');
  });

  it('returns the original expedition for duplicate start requests', async () => {
    const harness = createHarness();
    await harness.service.start(1, 'forest', 30, [1], 'same-request');
    const duplicate = await harness.service.start(
      1,
      'forest',
      30,
      [1],
      'same-request',
    );
    expect(duplicate.success).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(harness.expeditions).toHaveLength(1);
  });

  it('rejects an early claim and grants a ready expedition only once', async () => {
    const harness = createHarness();
    const started: any = await harness.service.start(
      1,
      'forest',
      30,
      [1],
      'claim-request',
    );
    const id = started.expedition.id;
    const early = await harness.service.claim(1, id);
    expect(early.success).toBe(false);
    expect(early.message).toContain('not ready');

    harness.expeditions[0].endsAt = new Date(Date.now() - 1000);
    const claimed = await harness.service.claim(1, id);
    const duplicate = await harness.service.claim(1, id);
    expect(claimed.success).toBe(true);
    expect(claimed.duplicate).toBe(false);
    expect(duplicate.success).toBe(true);
    expect(duplicate.duplicate).toBe(true);
    expect(harness.economy.grant).toHaveBeenCalledTimes(1);
  });
});
