import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const checks = [];
const expectText = (name, source, expected) => {
  const values = Array.isArray(expected) ? expected : [expected];
  const missing = values.filter((value) => !source.includes(value));
  checks.push({ name, passed: missing.length === 0, details: missing.length ? `missing: ${missing.join(', ')}` : '' });
};
const rejectText = (name, source, rejected) => {
  const values = Array.isArray(rejected) ? rejected : [rejected];
  const found = values.filter((value) => source.includes(value));
  checks.push({ name, passed: found.length === 0, details: found.length ? `found: ${found.join(', ')}` : '' });
};

const apiClient = read('client/PetVerseClient/assets/scripts/network/ApiClient.ts');
expectText('client sends active account header', apiClient, ["headers['X-User-Id']", 'userIdFromLocation']);

const scopedControllers = [
  'server/src/modules/battle/battle.controller.ts',
  'server/src/modules/economy/economy.controller.ts',
  'server/src/modules/exploration/exploration.controller.ts',
  'server/src/modules/formation/formation.controller.ts',
  'server/src/modules/fusion/fusion.controller.ts',
  'server/src/modules/skill/skill.controller.ts',
  'server/src/modules/team/team.controller.ts',
  'server/src/modules/tower/tower.controller.ts',
];
for (const controllerPath of scopedControllers) {
  const source = read(controllerPath);
  expectText(`${controllerPath} resolves the request account`, source, ["@Headers('x-user-id')", 'resolveRequestUserId']);
  rejectText(`${controllerPath} does not force the beta account`, source, 'DEFAULT_USER_ID');
}

const mainUi = read('client/PetVerseClient/assets/scripts/ui/MainUI.ts');
expectText('client cultivation-to-adventure endpoints are connected', mainUi, [
  "ApiClient.post('/fusion/execute'",
  "ApiClient.post('/team/set'",
  "ApiClient.get('/exploration/world'",
  "'/exploration/settle-explore'",
  "'/exploration/settle-nest'",
  'showFivePetBattle',
]);

const fusionService = read('server/src/modules/fusion/fusion.service.ts');
expectText('fusion is transactional and idempotent', fusionService, [
  'this.dataSource.transaction',
  'normalizedRequestId',
  'requestId: normalizedRequestId',
  'await manager.delete(Pet',
  "status: 'active'",
  'Unequip all equipment from fusion pets first',
]);

const petRemovalSafety = read('server/src/modules/pet/pet-removal-safety.ts');
expectText('pet removal protects the active gameplay loop', petRemovalSafety, [
  'Claim or finish the active expedition before releasing this pet',
  'Unequip all equipment before releasing this pet',
]);

const battleService = read('server/src/modules/battle/battle-v10.service.ts');
expectText('five-pet battle validates, commands and settles safely', battleService, [
  'pets.length !== 5',
  "const requestId = String(rawDirective?.requestId || '').trim()",
  "session.rewardStatus === 'claimed' || session.settled",
  'await this.grantReward(manager, session, reward)',
  "session.mode === 'tower'",
]);
rejectText('obsolete secondary battle settlement is removed', battleService, 'private async settleSession');

const battleScene = read('client/PetVerseClient/assets/scripts/ui/v10/BattleSceneV10.ts');
expectText('battle scene supports the complete interactive settlement flow', battleScene, [
  "ApiClient.post('/battle/v10/start'",
  "ApiClient.post('/battle/v10/command'",
  "ApiClient.post('/battle/v10/settle'",
  'settlementDone',
  'renderResult',
  'createDragCommand',
]);

const failed = checks.filter((check) => !check.passed);
console.log(`PetVerse core gameplay loop audit: ${checks.length - failed.length}/${checks.length} passed`);
for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}${check.details ? ` (${check.details})` : ''}`);
if (failed.length) process.exitCode = 1;
