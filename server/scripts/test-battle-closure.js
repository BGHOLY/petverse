const BASE = process.env.PETVERSE_TEST_URL || 'http://127.0.0.1:3000/api';

async function api(path, method = 'GET', body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(result)}`);
  return result;
}

function assert(value, message) {
  if (!value) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function runBattle(input, commandCoverage = false) {
  const started = await api('/battle/v10/start', 'POST', input);
  assert(started.success, `battle start failed: ${started.message}`);
  const resumed = await api('/battle/v10/start', 'POST', input);
  assert(resumed.success && resumed.session?.battleId === started.session?.battleId && resumed.resumed, 'parallel start did not resume the active battle');
  let session = started.session;
  const eventTypes = new Set();
  let duplicateCommand = false;
  let invalidCleanse = false;
  let ultimateUsed = false;
  if (commandCoverage) {
    const target = session.leftTeam.find((unit) => unit.alive);
    const clean = await api('/battle/v10/command', 'POST', { sessionId: session.id, directive: { type: 'cleanse', targetId: target?.id, requestId: `invalid-cleanse:${session.battleId}` } });
    invalidCleanse = clean.success === false && /没有可净化|冷却/.test(String(clean.message));
  }
  for (let step = 0; step < 40 && session.status === 'active'; step += 1) {
    let directive = { type: 'auto' };
    if (commandCoverage && step === 0) directive = { type: 'focus', targetId: session.rightTeam.find((unit) => unit.alive)?.id };
    if (commandCoverage && step === 1) directive = { type: 'guard', targetId: session.leftTeam.find((unit) => unit.alive)?.id };
    if (commandCoverage && step === 2) directive = { type: 'shield', targetId: session.leftTeam.find((unit) => unit.alive)?.id };
    if (session.commands?.ultimate?.enabled) directive = { type: 'auto', useUltimate: true };
    const requestId = `integration:${session.battleId}:${step}`;
    const result = await api('/battle/v10/command', 'POST', { sessionId: session.id, directive: { ...directive, requestId } });
    assert(result.success, `command failed: ${result.message}`);
    for (const event of result.roundEvents || []) {
      eventTypes.add(event.type);
      if (event.type === 'ultimate') ultimateUsed = true;
    }
    if (step === 0) {
      const duplicate = await api('/battle/v10/command', 'POST', { sessionId: session.id, directive: { ...directive, requestId } });
      duplicateCommand = Boolean(duplicate.success && duplicate.duplicate);
    }
    if (commandCoverage && step === 3) {
      const target = session.leftTeam.find((unit) => unit.alive);
      const clean = await api('/battle/v10/command', 'POST', { sessionId: session.id, directive: { type: 'cleanse', targetId: target?.id, requestId: `invalid-cleanse:${session.battleId}` } });
      invalidCleanse = invalidCleanse || (clean.success === false && /没有可净化|冷却/.test(String(clean.message)));
    }
    session = result.session;
  }
  assert(session.status !== 'active', 'battle did not finish');
  return { session, eventTypes: [...eventTypes], duplicateCommand, invalidCleanse, ultimateUsed };
}

async function main() {
  await api('/item/seed', 'POST', {});
  const team = await api('/team');
  assert((team.petIds || []).length === 5, 'test account must have a complete five-pet team');

  const suffix = Date.now();
  const profileBefore = await api('/user/profile');
  const inventoryBefore = await api('/inventory');
  const regular = await runBattle({ mode: 'pve', difficulty: 0.8, formationCode: 'dragon', stageCode: `integration-win-${suffix}` }, true);
  console.error(`[test] regular battle ${regular.session.winnerSide} in ${regular.session.round} rounds`);
  assert(regular.duplicateCommand, 'duplicate command was not deduplicated');
  assert(regular.invalidCleanse, 'invalid cleanse did not return explicit feedback');
  assert(regular.eventTypes.includes('action-order'), 'action order event missing');
  assert(regular.eventTypes.includes('formation-energy'), 'formation energy event missing');
  const settlement = await api('/battle/v10/settle', 'POST', { sessionId: regular.session.id, battleId: regular.session.battleId, settlementKey: `integration:${regular.session.battleId}` });
  assert(settlement.success, 'regular battle settlement failed');
  const duplicateSettlement = await api('/battle/v10/settle', 'POST', { sessionId: regular.session.id, battleId: regular.session.battleId, settlementKey: `integration:${regular.session.battleId}` });
  assert(duplicateSettlement.success && duplicateSettlement.duplicate, 'duplicate reward claim was not deduplicated');

  const formations = {};
  for (const formationCode of ['dragon', 'turtle', 'crane', 'tiger', 'phoenix']) {
    const result = await runBattle({ mode: 'pve', difficulty: 0.8, formationCode, stageCode: `ultimate-${formationCode}-${suffix}` });
    formations[formationCode] = { ultimateUsed: result.ultimateUsed, result: result.session.result, rounds: result.session.round };
    console.error(`[test] formation ${formationCode}: ultimate=${result.ultimateUsed} result=${result.session.winnerSide}`);
  }
  assert(Object.values(formations).every((formation) => formation.ultimateUsed), 'not every formation released its ultimate');

  const failure = await runBattle({ mode: 'pve', difficulty: 8, formationCode: 'dragon', stageCode: `integration-fail-${suffix}` });
  const failureSettlement = await api('/battle/v10/settle', 'POST', { battleId: failure.session.battleId });
  console.error(`[test] high difficulty battle ${failure.session.winnerSide}`);
  assert(failureSettlement.success, 'failure settlement failed');
  assert(failure.session.winnerSide === 'right', 'high difficulty fixture did not produce a real defeat');
  assert(Number(failureSettlement.settlement?.reward?.gold || 0) === 0, 'failed battle granted clear reward');

  let world = await api('/exploration/world');
  let region = world.world.regions.find((item) => item.code === 'moon-forest');
  const explorationRuns = [];
  for (let attempt = 0; attempt < 8 && Number(region.exploration || 0) < 100; attempt += 1) {
    const stage = String(region.nextStageCode || `stage-${Math.min(5, Math.floor(Number(region.exploration || 0) / 20) + 1)}`);
    const battle = await runBattle({ mode: 'pve', difficulty: 0.8, formationCode: 'dragon', chapterCode: region.chapter, regionCode: region.code, stageCode: stage });
    const settled = await api('/exploration/settle-explore', 'POST', { regionCode: region.code, sessionId: battle.session.id });
    assert(settled.success, `exploration settle failed: ${settled.message}`);
    assert(settled.won, `exploration battle lost at ${stage}`);
    const duplicate = await api('/exploration/settle-explore', 'POST', { regionCode: region.code, sessionId: battle.session.id });
    assert(duplicate.success && duplicate.duplicate, 'exploration duplicate settlement was not deduplicated');
    explorationRuns.push({ stage, exploration: settled.settlement?.exploration?.value, stars: settled.settlement?.reward?.stars });
    world = await api('/exploration/world');
    region = world.world.regions.find((item) => item.code === 'moon-forest');
    console.error(`[test] exploration ${stage}: ${region.exploration}%`);
  }
  assert(Number(region.exploration || 0) >= 100, 'exploration did not reach 100% within 8 cleared stages');
  assert(region.nestUnlocked, 'boss nest did not unlock at 100% exploration');

  const bossBattle = await runBattle({ mode: 'boss', boss: true, difficulty: 0.8, formationCode: 'turtle', chapterCode: region.chapter, regionCode: region.code, stageCode: 'boss' });
  const bossSettlement = await api('/exploration/settle-nest', 'POST', { regionCode: region.code, sessionId: bossBattle.session.id });
  assert(bossSettlement.success, `boss settlement failed: ${bossSettlement.message}`);
  assert(bossSettlement.won, 'boss battle was not won');
  console.error(`[test] boss battle won in ${bossBattle.session.round} rounds`);
  const bossDuplicate = await api('/exploration/settle-nest', 'POST', { regionCode: region.code, sessionId: bossBattle.session.id });
  assert(bossDuplicate.success && bossDuplicate.duplicate, 'boss duplicate settlement was not deduplicated');

  const profileAfter = await api('/user/profile');
  const inventoryAfter = await api('/inventory');
  const finalWorld = await api('/exploration/world');
  console.log(JSON.stringify({
    success: true,
    battle: {
      battleId: regular.session.battleId,
      winner: regular.session.winnerSide,
      rounds: regular.session.round,
      eventTypes: regular.eventTypes,
      duplicateCommand: regular.duplicateCommand,
      invalidCleanseFeedback: regular.invalidCleanse,
      settlement: settlement.settlement,
      duplicateSettlement: duplicateSettlement.duplicate,
    },
    formations,
    failure: { winner: failure.session.winnerSide, settlement: failureSettlement.settlement },
    explorationRuns,
    boss: { battleId: bossBattle.session.battleId, winner: bossBattle.session.winnerSide, settlement: bossSettlement.settlement, eggId: bossSettlement.egg?.id },
    growth: {
      profileBefore: profileBefore.data?.user || profileBefore.user || profileBefore.data,
      profileAfter: profileAfter.data?.user || profileAfter.user || profileAfter.data,
      inventoryBeforeCount: Array.isArray(inventoryBefore.inventory) ? inventoryBefore.inventory.length : 0,
      inventoryAfterCount: Array.isArray(inventoryAfter.inventory) ? inventoryAfter.inventory.length : 0,
    },
    world: finalWorld.world,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
