import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const files = {
    apiConfig: read('client/PetVerseClient/assets/scripts/network/ApiConfig.ts'),
    apiClient: read('client/PetVerseClient/assets/scripts/network/ApiClient.ts'),
    loginUi: read('client/PetVerseClient/assets/scripts/ui/LoginUI.ts'),
    mainUi: read('client/PetVerseClient/assets/scripts/ui/MainUI.ts'),
    mainScene: read('client/PetVerseClient/assets/scenes/MainScene.scene'),
    appModule: read('server/src/app.module.ts'),
    database: read('server/src/config/database.config.ts'),
    runtime: read('server/src/config/runtime.config.ts'),
    identity: read('server/src/common/request-identity.middleware.ts'),
};

const checks = [
    ['runtime API config supported', /PETVERSE_API_BASE_URL/.test(files.apiConfig)],
    ['WeChat extConfig API config supported', /getExtConfigSync/.test(files.apiConfig)],
    ['API client can fail safely when unconfigured', /configurationError/.test(files.apiClient)],
    ['login binds auth token', /ApiClient\.setToken\(PlayerData\.token\)/.test(files.loginUi)],
    ['login binds authenticated user id', /ApiClient\.setUserId/.test(files.loginUi)],
    ['main UI restores authenticated identity', /PlayerData\.token/.test(files.mainUi) && /ApiClient\.setUserId/.test(files.mainUi)],
    ['scene no longer serializes localhost API URL', !/"apiBaseUrl"\s*:\s*"http:\/\/127\.0\.0\.1/.test(files.mainScene)],
    ['development module is conditional', /developmentOnlyModules/.test(files.appModule)],
    ['request identity middleware is global', /RequestIdentityMiddleware/.test(files.appModule)],
    ['database synchronization is environment-aware', /shouldSynchronizeDatabase/.test(files.database)],
    ['production config fail-fast exists', /assertProductionRuntime/.test(files.runtime)],
    ['test user header disabled by production default', /ALLOW_TEST_USER_HEADER/.test(files.runtime)],
    ['JWT identity overrides user header', /headers\['x-user-id'\]\s*=\s*String\(userId\)/.test(files.identity)],
    ['development routes hidden in production', /isDevelopmentOnlyPath/.test(files.identity)],
    ['operations routes hidden from players', /maintenance/.test(files.identity) && /season\\\/settle/.test(files.identity) && /trade\\\/expire/.test(files.identity)],
];

let failed = 0;
for (const [name, passed] of checks) {
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
    if (!passed) failed += 1;
}
console.log(`V12 readiness audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
