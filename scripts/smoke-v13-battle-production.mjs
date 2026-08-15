const baseUrl = String(
  process.env.PETVERSE_API_URL || 'http://127.0.0.1:3000/api',
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

function eventCount(session, type) {
  return (session?.battleLog || []).filter((event) => event?.type === type).length;
}

function assertUniqueEventIds(session, label) {
  const events = Array.isArray(session?.battleLog) ? session.battleLog : [];
  const ids = events.map((event) => String(event?.eventId || ''));
  assert(ids.every(Boolean), `${label} contains an event without eventId`);
  assert(new Set(ids).size === ids.length, `${label} contains duplicate eventId values`);
}

async function finishBattle(token, initialSession, runId, useInitialFocus = false) {
  let session = initialSession;
  let steps = 0;
  let focused = false;
  while (session?.status === 'active' && steps < Number(session.maxRounds || 35) + 3) {
    steps += 1;
    let directive = { type: 'auto' };
    if (useInitialFocus && !focused) {
      const target = (session.rightTeam || [])
        .filter((unit) => unit?.alive && unit?.hp > 0)
        .sort((left, right) => Number(left?.maxHp || left?.hp || 0) - Number(right?.maxHp || right?.hp || 0))[0];
      assert(target?.id, 'focus target is missing');
      directive = { type: 'focus', targetId: String(target.id) };
      focused = true;
    }
    if (session.commands?.ultimate?.enabled) {
      directive = {
        type: 'focus',
        targetId: String(
          session.cooldowns?.left?.focusTargetId ||
          session.rightTeam?.find((unit) => unit?.alive && unit?.hp > 0)?.id ||
          '',
        ),
        useUltimate: true,
      };
    }
    const result = await api('/battle/v10/command', {
      method: 'POST',
      token,
      body: {
        sessionId: Number(session.id),
        directive: {
          ...directive,
          requestId: `v13-${runId}-${session.id}-${steps}`,
        },
      },
    });
    session = result.session;
  }
  assert(session?.status !== 'active', `battle ${session?.battleId || ''} did not finish`);
  return { session, steps };
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const login = await api('/auth/login', {
  method: 'POST',
  body: {
    openid: `v13-battle-production-${runId}`,
    nickname: 'V13战斗生产验收',
  },
});
const token = String(login.token || '');
assert(login.isNewUser === true && token, 'isolated battle test account creation failed');

const starterPets = Array.isArray(login.pets) ? login.pets : [];
const pet008Result = await api('/pet/create', {
  method: 'POST',
  token,
  body: {
    nickname: '森灵鹿·V13验收',
    speciesCode: 'PET008',
    rarity: 3,
    quality: 90,
    skillSlotCount: 4,
    isLocked: true,
    sourceType: 'battle_production_smoke_v13',
  },
});
const pets = [...starterPets, pet008Result.pet];
const requiredSpecies = ['PET001', 'PET002', 'PET008', 'PET004', 'PET006'];
const selectedPets = requiredSpecies.map((speciesCode) =>
  pets.find((pet) => pet?.speciesCode === speciesCode),
);
assert(selectedPets.every(Boolean), 'PET001/PET002/PET008 production team could not be assembled');

const petIds = selectedPets.map((pet) => Number(pet.id));
await api('/team/set', {
  method: 'POST',
  token,
  body: {
    petIds,
    formationCode: 'dragon',
    slots: petIds.map((petId, index) => ({ petId, position: index + 1 })),
    tactics: {
      focusPriority: 'lowestHp',
      guardTarget: 'healer',
      shieldThreshold: 60,
      cleansePriority: ['control', 'healBlock', 'dot'],
      ultimatePolicy: 'ready',
    },
  },
});

const normalStart = await api('/battle/v10/start', {
  method: 'POST',
  token,
  body: {
    mode: 'pve',
    stageCode: `v13-production-normal-${runId}`,
    seed: `v13-production-normal-seed-${runId}`,
    // This smoke verifies presentation events rather than chapter balance. Keep
    // the enemy team weak enough to guarantee at least one deterministic defeat
    // and therefore exercise focus-retarget on fresh and long-lived databases.
    difficulty: 0.65,
    formationCode: 'dragon',
  },
});
const normal = await finishBattle(token, normalStart.session, `${runId}-normal`, true);
assert(normal.session.winnerSide === 'left', 'production team lost the normal battle');
assertUniqueEventIds(normal.session, 'normal battle');
assert(
  requiredSpecies.every((speciesCode) =>
    normal.session.leftTeam?.some((unit) => unit?.speciesCode === speciesCode),
  ),
  'normal battle snapshot does not contain the production team',
);
assert(eventCount(normal.session, 'command') >= 1, 'focus command was not recorded');
assert(eventCount(normal.session, 'focus-retarget') >= 1, 'focus target did not retarget after defeat');
assert(eventCount(normal.session, 'ultimate') >= 1, 'formation ultimate was not released');

const settlementKey = `v13-production-settlement-${normal.session.battleId}`;
const normalSettlement = await api('/battle/v10/settle', {
  method: 'POST',
  token,
  body: { sessionId: Number(normal.session.id), settlementKey },
});
assert(Number(normalSettlement.settlement?.reward?.gold || 0) > 0, 'normal battle granted no gold');
const duplicateSettlement = await api('/battle/v10/settle', {
  method: 'POST',
  token,
  body: { sessionId: Number(normal.session.id), settlementKey },
});
assert(duplicateSettlement.duplicate === true, 'battle settlement is not idempotent');

const bossStart = await api('/battle/v10/start', {
  method: 'POST',
  token,
  body: {
    mode: 'boss',
    boss: true,
    stageCode: `v13-production-boss-${runId}`,
    seed: `v13-production-boss-seed-${runId}`,
    difficulty: 1.5,
    formationCode: 'dragon',
  },
});
const boss = await finishBattle(token, bossStart.session, `${runId}-boss`, true);
assertUniqueEventIds(boss.session, 'boss battle');
assert(boss.session.bossBattle === true, 'boss battle flag is missing');
assert(
  boss.session.rightTeam?.some((unit) => unit?.role === 'boss'),
  'boss unit is missing from the battle snapshot',
);
assert(eventCount(boss.session, 'boss-telegraph') >= 1, 'boss telegraph never triggered');
assert(eventCount(boss.session, 'boss-skill') >= 1, 'boss skill never followed its telegraph');

const report = {
  userId: Number(login.user?.id || 0),
  productionTeam: selectedPets.map((pet) => ({
    id: Number(pet.id),
    speciesCode: pet.speciesCode,
    nickname: pet.nickname,
  })),
  normalBattle: {
    id: Number(normal.session.id),
    battleId: normal.session.battleId,
    winnerSide: normal.session.winnerSide,
    rounds: normal.session.round,
    events: normal.session.battleLog.length,
    focusCommands: eventCount(normal.session, 'command'),
    focusRetargets: eventCount(normal.session, 'focus-retarget'),
    formationUltimates: eventCount(normal.session, 'ultimate'),
    settlementDuplicateProtected: true,
  },
  bossBattle: {
    id: Number(boss.session.id),
    battleId: boss.session.battleId,
    winnerSide: boss.session.winnerSide,
    rounds: boss.session.round,
    events: boss.session.battleLog.length,
    telegraphs: eventCount(boss.session, 'boss-telegraph'),
    bossSkills: eventCount(boss.session, 'boss-skill'),
    phaseChanges: eventCount(boss.session, 'boss-phase'),
    formationUltimates: eventCount(boss.session, 'ultimate'),
  },
};

console.log('V13 production battle smoke passed');
console.log(JSON.stringify(report, null, 2));
