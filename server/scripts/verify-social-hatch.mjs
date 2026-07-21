const API = process.env.PETVERSE_API || 'http://127.0.0.1:3000/api';

async function request(path, userId, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(`${path}: ${payload?.message || response.statusText}`);
  }
  return payload;
}

async function hatchInitialMarriageEgg(userId) {
  const before = await request('/hatchery/eggs', userId);
  const egg = before.eggs.find((item) =>
    item.ownerId === userId
      && item.source === 'marriage_initial'
      && item.status !== 'hatched',
  );
  if (!egg) {
    const completed = before.eggs.find((item) =>
      item.ownerId === userId
        && item.source === 'marriage_initial'
        && item.status === 'hatched',
    );
    if (!completed) throw new Error(`No initial marriage egg for account ${userId}`);
    const duplicate = await request('/hatchery/hatch', userId, {
      method: 'POST',
      body: JSON.stringify({ eggId: completed.id, force: true }),
    });
    return { egg: completed, result: duplicate };
  }

  if (egg.status === 'stored') {
    await request('/hatchery/start', userId, {
      method: 'POST',
      body: JSON.stringify({ eggId: egg.id, slot: 1 }),
    });
  }
  const result = await request('/hatchery/hatch', userId, {
    method: 'POST',
    body: JSON.stringify({ eggId: egg.id, force: true }),
  });
  return { egg, result };
}

const [accountA, accountB] = await Promise.all([
  hatchInitialMarriageEgg(201),
  hatchInitialMarriageEgg(202),
]);

if (!accountA.result.pet?.id || !accountB.result.pet?.id) {
  throw new Error('Both accounts must receive a persisted pet');
}
if (accountA.result.pet.id === accountB.result.pet.id) {
  throw new Error('The two accounts received the same pet record');
}
if (accountA.egg.randomSeed === accountB.egg.randomSeed) {
  throw new Error('The two account eggs reused the same random seed');
}

console.log(JSON.stringify({
  success: true,
  accounts: [201, 202],
  results: [accountA, accountB].map(({ egg, result }) => ({
    ownerId: egg.ownerId,
    eggId: egg.id,
    marriageId: egg.marriageId,
    randomSeed: egg.randomSeed,
    duplicate: Boolean(result.duplicate),
    pet: {
      id: result.pet.id,
      ownerId: result.pet.ownerId,
      nickname: result.pet.nickname,
      gender: result.pet.gender,
      species: result.pet.species,
      rarity: result.pet.rarity,
      growth: result.pet.growth,
      skillSlotCount: result.pet.skillSlotCount,
    },
  })),
}, null, 2));
