const BASE_URL = process.env.PETVERSE_API_URL || 'http://127.0.0.1:3000/api';
const ACCOUNT_A = 201;
const ACCOUNT_B = 202;

async function api(path, { userId, method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': String(userId) } : {}),
    },
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function list(result, keys) {
  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key];
    if (Array.isArray(result?.data?.[key])) return result.data[key];
  }
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function eligible(pet) {
  return pet && !pet.isEgg && !pet.married && !pet.partnerId && !pet.marriedPetId &&
    !pet.isLocked && pet.tradeStatus !== 'listed' && !pet.tradeListingId &&
    ['male', 'female'].includes(String(pet.gender || '').toLowerCase());
}

const report = {
  accounts: [ACCOUNT_A, ACCOUNT_B],
  friendFlow: [],
  marriageFlow: [],
  idempotency: {},
  eggs: [],
};

const seed = await api('/dev/seed-social', { method: 'POST' });
assert(seed.success === true, `seed-social failed: ${seed.message || 'unknown'}`);

let friendsA = list(await api('/friend/list', { userId: ACCOUNT_A }), ['friends']);
if (!friendsA.some((friend) => Number(friend.userId || friend.id) === ACCOUNT_B)) {
  const firstRequest = await api('/friend/request', {
    userId: ACCOUNT_A,
    method: 'POST',
    body: { targetUserId: ACCOUNT_B, message: '双账号拒绝流程验证' },
  });
  assert(firstRequest.success === true, `first friend request failed: ${firstRequest.message}`);
  const rejected = await api('/friend/handle', {
    userId: ACCOUNT_B,
    method: 'POST',
    body: { requestId: firstRequest.request.id, accept: false },
  });
  assert(rejected.success === true && rejected.request.status === 'rejected', 'friend rejection was not persisted');
  report.friendFlow.push('request-rejected');

  const secondRequest = await api('/friend/request', {
    userId: ACCOUNT_A,
    method: 'POST',
    body: { targetUserId: ACCOUNT_B, message: '双账号接受流程验证' },
  });
  assert(secondRequest.success === true, `second friend request failed: ${secondRequest.message}`);
  const accepted = await api('/friend/handle', {
    userId: ACCOUNT_B,
    method: 'POST',
    body: { requestId: secondRequest.request.id, accept: true },
  });
  assert(accepted.success === true && accepted.request.status === 'accepted', 'friend acceptance was not persisted');
  report.friendFlow.push('request-accepted');
} else {
  report.friendFlow.push('existing-friendship-reused');
}

friendsA = list(await api('/friend/list', { userId: ACCOUNT_A }), ['friends']);
const friendsB = list(await api('/friend/list', { userId: ACCOUNT_B }), ['friends']);
assert(friendsA.some((friend) => Number(friend.userId || friend.id) === ACCOUNT_B), 'account B missing from account A friend list');
assert(friendsB.some((friend) => Number(friend.userId || friend.id) === ACCOUNT_A), 'account A missing from account B friend list');
const publicPets = await api(`/${'friend'}/${ACCOUNT_B}/pets`, { userId: ACCOUNT_A });
assert(publicPets.success === true && list(publicPets, ['pets']).length >= 5, 'friend public pet list is unavailable');

const petsA = list(await api('/pet/my', { userId: ACCOUNT_A }), ['pets']);
const petsB = list(await api('/pet/my', { userId: ACCOUNT_B }), ['pets']);
let petA = petsA.find((pet) => eligible(pet) && pet.gender === 'male');
let petB = petsB.find((pet) => eligible(pet) && pet.gender === 'female');
if (!petA || !petB) {
  petA = petsA.find((pet) => eligible(pet) && pet.gender === 'female');
  petB = petsB.find((pet) => eligible(pet) && pet.gender === 'male');
}
assert(petA && petB, 'no eligible opposite-gender social test pet pair remains');

const rejectedProposal = await api('/marriage/propose', {
  userId: ACCOUNT_A,
  method: 'POST',
  body: { petAId: petA.id, petBId: petB.id, message: '婚礼拒绝验证' },
});
assert(rejectedProposal.success === true, `marriage proposal failed: ${rejectedProposal.message}`);
const rejectedMarriage = await api('/marriage/proposal/respond', {
  userId: ACCOUNT_B,
  method: 'POST',
  body: { proposalId: rejectedProposal.proposal.id, accept: false },
});
assert(rejectedMarriage.success === true && rejectedMarriage.proposal.status === 'rejected', 'marriage rejection was not persisted');
report.marriageFlow.push('proposal-rejected');

const acceptedProposal = await api('/marriage/propose', {
  userId: ACCOUNT_A,
  method: 'POST',
  body: { petAId: petA.id, petBId: petB.id, message: '婚礼接受与双蛋验证' },
});
assert(acceptedProposal.success === true, `second marriage proposal failed: ${acceptedProposal.message}`);

const acceptRequest = () => api('/marriage/proposal/respond', {
  userId: ACCOUNT_B,
  method: 'POST',
  body: { proposalId: acceptedProposal.proposal.id, accept: true },
});
const [acceptOne, acceptTwo] = await Promise.all([acceptRequest(), acceptRequest()]);
assert(acceptOne.success === true && acceptTwo.success === true, 'concurrent acceptance did not return stable success responses');
assert(acceptOne.accepted === true && acceptTwo.accepted === true, 'both acceptance responses must identify the completed marriage');
assert(Boolean(acceptOne.duplicate) !== Boolean(acceptTwo.duplicate), 'exactly one concurrent acceptance should be the idempotent replay');
const completed = acceptOne.duplicate ? acceptTwo : acceptOne;
const replay = acceptOne.duplicate ? acceptOne : acceptTwo;
const marriageId = Number(completed.marriage?.id || completed.proposal?.marriageId || 0);
assert(marriageId > 0, 'completed marriage id is missing');
report.marriageFlow.push('proposal-completed');
report.idempotency = {
  marriageId,
  firstDuplicate: Boolean(completed.duplicate),
  replayDuplicate: Boolean(replay.duplicate),
};

const eggsA = list(await api('/hatchery/eggs', { userId: ACCOUNT_A }), ['eggs']);
const eggsB = list(await api('/hatchery/eggs', { userId: ACCOUNT_B }), ['eggs']);
const eggA = eggsA.find((egg) => Number(egg.marriageId) === marriageId && egg.source === 'marriage_initial');
const eggB = eggsB.find((egg) => Number(egg.marriageId) === marriageId && egg.source === 'marriage_initial');
assert(eggA && eggB, 'both accounts must receive an initial marriage egg');
assert(Number(eggA.id) !== Number(eggB.id), 'initial marriage eggs must be independent records');
assert(eggA.randomSeed !== eggB.randomSeed, 'initial marriage eggs must use independent random seeds');
assert(Number(eggA.ownerId) === ACCOUNT_A && Number(eggB.ownerId) === ACCOUNT_B, 'initial marriage egg ownership is incorrect');
assert(Number(eggA.parentAId) === Number(eggB.parentAId) && Number(eggA.parentBId) === Number(eggB.parentBId), 'initial marriage eggs must share the same parent pair');
report.eggs = [
  { id: eggA.id, ownerId: eggA.ownerId, marriageId: eggA.marriageId, seed: eggA.randomSeed, speciesCode: eggA.speciesCode, rarity: eggA.rarityPotential },
  { id: eggB.id, ownerId: eggB.ownerId, marriageId: eggB.marriageId, seed: eggB.randomSeed, speciesCode: eggB.speciesCode, rarity: eggB.rarityPotential },
];

const repeatProposal = await api('/marriage/propose', {
  userId: ACCOUNT_A,
  method: 'POST',
  body: { petAId: petA.id, petBId: petB.id, message: '已婚宠物重复申请保护' },
});
assert(repeatProposal.success === false, 'married pets must not be allowed to create another proposal');
report.marriageFlow.push('already-married-blocked');

console.log(JSON.stringify({ success: true, ...report }, null, 2));
