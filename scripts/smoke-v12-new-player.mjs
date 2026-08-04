const baseUrl = String(
  process.env.PETVERSE_API_URL || 'http://127.0.0.1:3004/api',
).replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token
        ? { authorization: `Bearer ${options.token}` }
        : {}),
    },
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `${options.method || 'GET'} ${path} failed: ${response.status} ${payload?.message || 'unknown error'}`,
    );
  }
  return payload;
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const login = await api('/auth/login', {
  method: 'POST',
  body: {
    openid: `v12-new-player-${runId}`,
    nickname: 'V12新手旅程测试',
  },
});
const token = login.token;
const userId = Number(login.user?.id || 0);
assert(login.isNewUser === true && token && userId > 0, 'isolated new player login failed');
assert(Array.isArray(login.pets) && login.pets.length === 5, 'new player did not receive five starter pets');
assert(login.pets.every((pet) => pet.isLocked), 'starter pets are not protected');

const team = await api('/team', { token });
assert(team.petIds?.length === 5, 'new player team does not contain five pets');

const inventoryBefore = await api('/inventory', { token });
const quantity = (code) => Number(
  inventoryBefore.inventory?.find((item) => item.itemCode === code)?.quantity || 0,
);
assert(quantity('common_pet_egg') >= 2, 'starter eggs are missing');
assert(quantity('hatch_sandglass_large') >= 2, 'starter hatch accelerators are missing');
assert(quantity('fusion_core') >= 1, 'starter fusion core is missing');

const cultivated = await api('/inventory/use', {
  method: 'POST',
  token,
  body: {
    itemCode: 'exp_potion_small',
    quantity: 1,
    petId: Number(team.petIds[0]),
  },
});
assert(Number(cultivated.pet?.id || 0) === Number(team.petIds[0]), 'starter cultivation targeted the wrong pet');

const battleStamp = Date.now();
const startedBattle = await api('/battle/v10/start', {
  method: 'POST',
  token,
  body: {
    mode: 'pve',
    stageCode: `v12-new-player-${battleStamp}`,
    seed: `v12-new-player-battle-${battleStamp}`,
    difficulty: 0.75,
    formationCode: team.formationCode,
  },
});
let session = startedBattle.session;
let rounds = 0;
while (session?.status === 'active' && rounds < 35) {
  rounds += 1;
  const command = await api('/battle/v10/command', {
    method: 'POST',
    token,
    body: {
      sessionId: Number(session.id),
      type: 'auto',
      requestId: `v12-new-player-command-${session.id}-${rounds}`,
    },
  });
  session = command.session;
}
assert(session?.status !== 'active', 'starter battle did not finish within 35 rounds');
assert(session?.winnerSide === 'left', 'starter team lost the introductory battle');
const settlementKey = `v12-new-player-settlement-${session.battleId}`;
const settlement = await api('/battle/v10/settle', {
  method: 'POST',
  token,
  body: { sessionId: Number(session.id), settlementKey },
});
assert(Number(settlement.settlement?.reward?.gold || settlement.reward?.gold || 0) > 0, 'introductory battle did not grant gold');

const usedEggItems = await api('/inventory/use', {
  method: 'POST',
  token,
  body: { itemCode: 'common_pet_egg', quantity: 2 },
});
assert(usedEggItems.eggs?.length === 2, 'two starter egg items did not create two hatchery eggs');

const hatchedPets = [];
for (let index = 0; index < usedEggItems.eggs.length; index += 1) {
  const eggId = Number(usedEggItems.eggs[index].id);
  await api('/hatchery/start', {
    method: 'POST',
    token,
    body: { eggId, slot: index + 1 },
  });
  await api('/hatchery/accelerate', {
    method: 'POST',
    token,
    body: { eggId, itemCode: 'hatch_sandglass_large', quantity: 1 },
  });
  let readyToHatch = false;
  const hatchDeadline = Date.now() + 3_000;
  while (Date.now() < hatchDeadline) {
    const detail = await api(`/hatchery/eggs/${eggId}`, { token });
    readyToHatch = Boolean(detail.egg?.canHatch || detail.data?.canHatch);
    if (readyToHatch) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  assert(readyToHatch, 'starter egg was not ready after its full-duration accelerator');
  const hatched = await api('/hatchery/hatch', {
    method: 'POST',
    token,
    body: { eggId },
  });
  assert(Number(hatched.pet?.id || 0) > 0, 'starter egg did not hatch into a pet');
  hatchedPets.push(hatched.pet);
}

const fusionRequestId = `v12-new-player-fusion-${runId}`;
const fusion = await api('/fusion/execute', {
  method: 'POST',
  token,
  body: {
    parentAId: Number(hatchedPets[0].id),
    parentBId: Number(hatchedPets[1].id),
    requestId: fusionRequestId,
    seed: `v12-new-player-fusion-seed-${runId}`,
    useMutationEssence: false,
  },
});
assert(Number(fusion.pet?.id || 0) > 0, 'new player could not complete a first fusion');
const duplicateFusion = await api('/fusion/execute', {
  method: 'POST',
  token,
  body: {
    parentAId: Number(hatchedPets[0].id),
    parentBId: Number(hatchedPets[1].id),
    requestId: fusionRequestId,
    seed: `v12-new-player-fusion-seed-${runId}`,
    useMutationEssence: false,
  },
});
assert(duplicateFusion.duplicate === true, 'first fusion is not idempotent');

const expedition = await api('/expedition/start', {
  method: 'POST',
  token,
  body: {
    mapCode: 'forest',
    durationMinutes: 30,
    petIds: [Number(fusion.pet.id)],
    requestId: `v12-new-player-expedition-${runId}`,
  },
});
await api('/expedition/dev/complete', {
  method: 'POST',
  token,
  body: { expeditionId: Number(expedition.expedition.id) },
});
const expeditionClaim = await api('/expedition/claim', {
  method: 'POST',
  token,
  body: { expeditionId: Number(expedition.expedition.id) },
});
assert(Number(expeditionClaim.rewards?.gold || expeditionClaim.reward?.gold || 0) > 0, 'first expedition did not grant gold');

console.log('V12 new-player journey smoke passed');
console.log(JSON.stringify({
  userId,
  starterPetIds: team.petIds,
  cultivatedPetId: cultivated.pet.id,
  battleId: session.battleId,
  battleRounds: rounds,
  hatchedPetIds: hatchedPets.map((pet) => pet.id),
  fusionPetId: fusion.pet.id,
  expeditionId: expedition.expedition.id,
  fusionDuplicateProtected: true,
}, null, 2));
