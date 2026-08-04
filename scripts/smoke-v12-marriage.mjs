const baseUrl = String(
  process.env.PETVERSE_API_URL || 'http://127.0.0.1:3003/api',
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

async function login(openid, nickname) {
  const result = await api('/auth/login', {
    method: 'POST',
    body: { openid, nickname },
  });
  assert(result.token, `${nickname} login did not return a token`);
  return {
    id: Number(result.user?.id || 0),
    token: result.token,
  };
}

async function createPet(player, nickname, gender) {
  const result = await api('/pet/create', {
    method: 'POST',
    token: player.token,
    body: {
      nickname,
      speciesCode: gender === 'male' ? 'PET001' : 'PET004',
      gender,
      rarity: 2,
      skillSlotCount: 4,
      sourceType: 'v12_marriage_smoke',
    },
  });
  return result.pet;
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const playerA = await login(`v12-marriage-a-${runId}`, 'V12结缘测试A');
const playerB = await login(`v12-marriage-b-${runId}`, 'V12结缘测试B');
assert(playerA.id > 0 && playerB.id > 0 && playerA.id !== playerB.id, 'test players were not isolated');

const petA = await createPet(playerA, `测试父系-${runId}`, 'male');
const petB = await createPet(playerB, `测试母系-${runId}`, 'female');

const requestResult = await api('/friend/request', {
  method: 'POST',
  token: playerA.token,
  body: { targetUserId: playerB.id, message: 'V12 marriage smoke' },
});
const friendRequestId = Number(requestResult.request?.id || 0);
assert(friendRequestId > 0, 'friend request id is missing');
await api('/friend/handle', {
  method: 'POST',
  token: playerB.token,
  body: { requestId: friendRequestId, accept: true },
});

const proposalResult = await api('/marriage/propose', {
  method: 'POST',
  token: playerA.token,
  body: {
    petAId: petA.id,
    petBId: petB.id,
    message: 'V12 dual egg smoke',
  },
});
const proposalId = Number(proposalResult.proposal?.id || 0);
assert(proposalId > 0, 'marriage proposal id is missing');

const accepted = await api('/marriage/proposal/respond', {
  method: 'POST',
  token: playerB.token,
  body: { proposalId, accept: true },
});
const marriageId = Number(accepted.marriage?.id || 0);
assert(marriageId > 0, 'marriage id is missing');
assert(Array.isArray(accepted.eggs) && accepted.eggs.length === 2, 'initial marriage must create two eggs');
assert(new Set(accepted.eggs.map((egg) => Number(egg.ownerId))).size === 2, 'initial eggs must belong to both owners');

const beforeA = await api('/hatchery/eggs', { token: playerA.token });
const beforeB = await api('/hatchery/eggs', { token: playerB.token });
const cooldownDeadline = Date.now() + 5_000;
let marriageReady = false;
while (Date.now() < cooldownDeadline) {
  const status = await api('/marriage', { token: playerA.token });
  marriageReady = Boolean(
    status.marriages?.find((marriage) => Number(marriage.id) === marriageId)?.canLayEgg,
  );
  if (marriageReady) break;
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
}
assert(marriageReady, 'marriage did not leave its configured cooldown');
const requestId = `v12-dual-egg-${runId}`;
const laid = await api('/marriage/lay-egg', {
  method: 'POST',
  token: playerA.token,
  body: { marriageId, requestId },
});

assert(Array.isArray(laid.eggs) && laid.eggs.length === 2, 'repeat breeding must create two eggs');
assert(new Set(laid.eggs.map((egg) => Number(egg.ownerId))).size === 2, 'repeat eggs must belong to both owners');
assert(new Set(laid.eggs.map((egg) => String(egg.randomSeed))).size === 2, 'repeat eggs must be independently rolled');
assert(laid.egg && laid.inheritance, 'legacy single-egg response fields must remain available');

const afterA = await api('/hatchery/eggs', { token: playerA.token });
const afterB = await api('/hatchery/eggs', { token: playerB.token });
assert(afterA.eggs.length === beforeA.eggs.length + 1, 'player A did not receive exactly one repeat egg');
assert(afterB.eggs.length === beforeB.eggs.length + 1, 'player B did not receive exactly one repeat egg');

const duplicate = await api('/marriage/lay-egg', {
  method: 'POST',
  token: playerA.token,
  body: { marriageId, requestId },
});
assert(duplicate.duplicate === true, 'duplicate request was not recognized');
const duplicateA = await api('/hatchery/eggs', { token: playerA.token });
const duplicateB = await api('/hatchery/eggs', { token: playerB.token });
assert(duplicateA.eggs.length === afterA.eggs.length, 'duplicate request created another egg for player A');
assert(duplicateB.eggs.length === afterB.eggs.length, 'duplicate request created another egg for player B');

console.log('V12 marriage smoke passed');
console.log(JSON.stringify({
  playerIds: [playerA.id, playerB.id],
  petIds: [petA.id, petB.id],
  marriageId,
  initialEggIds: accepted.eggs.map((egg) => egg.id),
  repeatEggIds: laid.eggs.map((egg) => egg.id),
  duplicateProtected: true,
}, null, 2));
