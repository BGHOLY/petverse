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

function events(session, type) {
  return (session?.battleLog || []).filter((event) => event?.type === type);
}

function assertEventIds(session, label) {
  const ids = (session?.battleLog || []).map((event) => String(event?.eventId || ''));
  assert(ids.length > 0 && ids.every(Boolean), `${label} eventId is missing`);
  assert(new Set(ids).size === ids.length, `${label} eventId is duplicated`);
}

async function finishBattle(token, initialSession, requestPrefix) {
  let session = initialSession;
  let step = 0;
  let focused = false;
  while (session?.status === 'active' && step <= Number(session?.maxRounds || 35) + 2) {
    step += 1;
    const focusSpecies = String(session?.stage?.focusTargetSpeciesCode || '');
    const focusTarget = session.rightTeam?.find(
      (unit) =>
        unit?.alive &&
        unit?.hp > 0 &&
        (!focusSpecies || unit?.speciesCode === focusSpecies),
    ) || session.rightTeam?.find((unit) => unit?.alive && unit?.hp > 0);
    let directive = focused
      ? { type: 'auto' }
      : { type: 'focus', targetId: String(focusTarget?.id || '') };
    focused = true;
    if (session?.commands?.ultimate?.enabled) {
      directive = {
        type: 'focus',
        targetId: String(
          session.cooldowns?.left?.focusTargetId || focusTarget?.id || '',
        ),
        useUltimate: true,
      };
    }
    const response = await api('/battle/v10/command', {
      method: 'POST',
      token,
      body: {
        sessionId: Number(session.id),
        directive: {
          ...directive,
          requestId: `${requestPrefix}-${session.id}-${step}`,
        },
      },
    });
    session = response.session;
  }
  assert(session?.status !== 'active', `${requestPrefix} did not finish`);
  assertEventIds(session, requestPrefix);
  return session;
}

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const login = await api('/auth/login', {
  method: 'POST',
  body: {
    openid: `v13-chapter-one-${runId}`,
    nickname: 'V13第一章验收',
  },
});
const token = String(login.token || '');
assert(login.isNewUser === true && token, 'isolated chapter account login failed');

const initialWorld = await api('/exploration/world', { token });
let moonForest = initialWorld.world?.regions?.find(
  (region) => region?.code === 'moon-forest',
);
assert(moonForest?.stages?.length === 5, 'chapter one does not expose five stages');
assert(moonForest?.bossStage?.title === '古树守卫', 'chapter one boss config is missing');

const expectedTitles = ['月辉林径', '岩甲坡', '花鹿清泉', '月影伏击', '巢穴前哨'];
const stageResults = [];

for (let index = 0; index < 5; index += 1) {
  const stageCode = `stage-${index + 1}`;
  const stage = moonForest.stages.find((item) => item?.code === stageCode);
  assert(stage?.title === expectedTitles[index], `${stageCode} title is incorrect`);
  const started = await api('/battle/v10/start', {
    method: 'POST',
    token,
    body: {
      mode: 'pve',
      regionCode: 'moon-forest',
      chapterCode: '第一章',
      stageCode,
      difficulty: 8,
      enemyFormationCode: 'phoenix',
      seed: `v13-chapter-${stageCode}-${runId}`,
    },
  });
  assert(started.session?.stage?.title === expectedTitles[index], `${stageCode} server stage metadata is missing`);
  assert(
    Number(started.session?.stage?.difficulty) === Number(stage.difficulty),
    `${stageCode} accepted a client-forged difficulty`,
  );
  assert(
    started.session?.enemyFormationCode === stage.enemyFormationCode,
    `${stageCode} accepted a client-forged enemy formation`,
  );
  assert(
    started.session?.rightTeam?.map((unit) => unit.speciesCode).join(',') === stage.enemySpeciesCodes.join(','),
    `${stageCode} enemy roster does not match the server config`,
  );

  const session = await finishBattle(token, started.session, `v13-${runId}-${stageCode}`);
  assert(session.winnerSide === 'left', `${stageCode} is not clearable by the starter journey`);
  const settled = await api('/exploration/settle-explore', {
    method: 'POST',
    token,
    body: { regionCode: 'moon-forest', sessionId: Number(session.id) },
  });
  assert(settled.won === true, `${stageCode} settlement was not a win`);
  moonForest = settled.world?.regions?.find((region) => region?.code === 'moon-forest');
  assert(Number(moonForest?.exploration || 0) === (index + 1) * 20, `${stageCode} exploration progress is incorrect`);

  const duplicate = await api('/exploration/settle-explore', {
    method: 'POST',
    token,
    body: { regionCode: 'moon-forest', sessionId: Number(session.id) },
  });
  assert(duplicate.duplicate === true, `${stageCode} settlement is not idempotent`);
  stageResults.push({
    stageCode,
    title: stage.title,
    battleId: session.battleId,
    rounds: session.round,
    events: session.battleLog.length,
    focusRetargets: events(session, 'focus-retarget').length,
    ultimates: events(session, 'ultimate').length,
    stars: Number(moonForest?.stageStars?.[stageCode] || 0),
  });
}

assert(moonForest?.nestUnlocked === true, 'boss nest did not unlock after five stages');
assert(moonForest?.nextStageCode === '', 'chapter still exposes a normal stage after completion');

const bossStarted = await api('/battle/v10/start', {
  method: 'POST',
  token,
  body: {
    mode: 'boss',
    boss: true,
    regionCode: 'moon-forest',
    chapterCode: '第一章',
    stageCode: 'boss',
    difficulty: 0.8,
    seed: `v13-chapter-boss-${runId}`,
  },
});
assert(bossStarted.session?.stage?.title === '古树守卫', 'boss stage metadata is missing');
const bossSession = await finishBattle(token, bossStarted.session, `v13-${runId}-boss`);
assert(bossSession.winnerSide === 'left', 'chapter boss is not clearable after the first chapter journey');
assert(events(bossSession, 'boss-telegraph').length >= 1, 'boss telegraph did not trigger');
assert(events(bossSession, 'boss-skill').length >= 1, 'boss skill did not follow its telegraph');

const bossSettlement = await api('/exploration/settle-nest', {
  method: 'POST',
  token,
  body: { regionCode: 'moon-forest', sessionId: Number(bossSession.id) },
});
assert(bossSettlement.won === true, 'boss settlement was not a win');
assert(Number(bossSettlement.egg?.id || 0) > 0, 'boss first clear granted no egg');
assert(bossSettlement.chapterCompleted === true, 'chapter completion flag is missing');
assert(bossSettlement.unlockedRegionCode === 'ember-ridge', 'second chapter did not unlock');

const duplicateBoss = await api('/exploration/settle-nest', {
  method: 'POST',
  token,
  body: { regionCode: 'moon-forest', sessionId: Number(bossSession.id) },
});
assert(duplicateBoss.duplicate === true, 'boss settlement is not idempotent');

const failureStarted = await api('/battle/v10/start', {
  method: 'POST',
  token,
  body: {
    mode: 'pve',
    stageCode: `v13-failure-recap-${runId}`,
    difficulty: 8,
    seed: `v13-failure-recap-seed-${runId}`,
  },
});
const failureSession = await finishBattle(token, failureStarted.session, `v13-${runId}-failure`);
assert(failureSession.winnerSide === 'right', 'failure recap sample unexpectedly won');
const failureSettlement = await api('/battle/v10/settle', {
  method: 'POST',
  token,
  body: {
    sessionId: Number(failureSession.id),
    settlementKey: `v13-failure-recap-${failureSession.battleId}`,
  },
});
assert(failureSettlement.settlement?.debrief?.firstFallen?.name, 'failure recap has no first fallen pet');
assert(failureSettlement.settlement?.debrief?.criticalEvents?.length > 0, 'failure recap has no critical event');
assert(failureSettlement.settlement?.debrief?.recommendations?.length > 0, 'failure recap has no actionable recommendation');

console.log('V13 chapter-one vertical slice smoke passed');
console.log(JSON.stringify({
  userId: Number(login.user?.id || 0),
  stages: stageResults,
  boss: {
    battleId: bossSession.battleId,
    rounds: bossSession.round,
    telegraphs: events(bossSession, 'boss-telegraph').length,
    bossSkills: events(bossSession, 'boss-skill').length,
    phaseChanges: events(bossSession, 'boss-phase').length,
    eggId: Number(bossSettlement.egg.id),
    unlockedRegionCode: bossSettlement.unlockedRegionCode,
  },
  failureRecap: failureSettlement.settlement.debrief,
}, null, 2));
