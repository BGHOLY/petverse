import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const loginScene = JSON.parse(read('client/PetVerseClient/assets/scenes/LoginScene.scene'));
const loginUi = read('client/PetVerseClient/assets/scripts/ui/LoginUI.ts');
const authService = read('server/src/modules/auth/auth.service.ts');
const starterTeam = read('server/src/modules/auth/starter-team.config.ts');
const runtimeConfig = read('server/src/config/runtime.config.ts');
const nodeByName = (name) => loginScene.find((item) => item?.__type__ === 'cc.Node' && item?._name === name);
const loginManager = nodeByName('LoginManager');
const managerComponents = (loginManager?._components || []).map((item) => loginScene[item.__id__]);
const testLogin = managerComponents.find((item) => String(item?.__type__ || '').startsWith('5197ec'));
const loginUiComponent = managerComponents.find((item) => String(item?.__type__ || '').startsWith('7b0e65'));

const checks = [
  ['login background exists', Boolean(nodeByName('LoginBackground'))],
  ['login pet exists', Boolean(nodeByName('LoginPet'))],
  ['login status exists', Boolean(nodeByName('LoginStatus'))],
  ['automatic test login is disabled', testLogin?._enabled === false],
  ['login button is inspector-bound', Number.isInteger(loginUiComponent?.loginButton?.__id__)],
  ['login status is inspector-bound', Number.isInteger(loginUiComponent?.statusLabel?.__id__)],
  ['client requests wx.login code', /wx\.login/.test(loginUi) && /return \{ code \}/.test(loginUi)],
  ['client limits openid fallback to local preview', /localhost/.test(loginUi) && /wx_test_004/.test(loginUi)],
  ['server resolves verified WeChat identity', /resolveLoginIdentity/.test(authService)],
  ['production requires WeChat app credentials', /WX_APPID/.test(runtimeConfig) && /WX_SECRET/.test(runtimeConfig)],
  ['new users receive five protected starter pets', /STARTER_TEAM/.test(authService) && /isLocked:\s*true/.test(authService) && (starterTeam.match(/speciesCode:\s*'PET\d+'/g) || []).length === 5],
  ['starter roster covers five unique species', new Set([...starterTeam.matchAll(/speciesCode:\s*'(PET\d+)'/g)].map((match) => match[1])).size === 5],
  ['starter package enables hatching and fusion', /common_pet_egg:\s*2/.test(starterTeam) && /fusion_core:\s*2/.test(starterTeam)],
  ['login scene remains compact', statSync(resolve(root, 'client/PetVerseClient/assets/scenes/LoginScene.scene')).size < 80_000],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}
console.log(`V12 release audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
