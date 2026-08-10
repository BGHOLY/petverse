import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fromRoot = (path) => resolve(root, path);
const read = (path) => readFileSync(fromRoot(path), 'utf8');
const client = 'client/PetVerseClient';
const resourcesPath = fromRoot(`${client}/assets/resources`);
const archivePath = fromRoot(`${client}/legacy-assets/audio`);
const engine = JSON.parse(read(`${client}/settings/v2/packages/engine.json`));
const buildConfig = JSON.parse(read(`${client}/build-configs/v12-wechatgame.json`));
const cache = engine.modules.configs.defaultConfig.cache;
const includedList = engine.modules.configs.defaultConfig.includeModules;
const included = new Set(includedList);

function filesIn(directory) {
  const output = [];
  if (!existsSync(directory)) return output;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) output.push(...filesIn(path));
    else output.push(path);
  }
  return output;
}

const resourceFiles = filesIn(resourcesPath);
const resourceBytes = resourceFiles.reduce((sum, path) => sum + statSync(path).size, 0);
const largestResource = resourceFiles
  .filter((path) => extname(path).toLowerCase() !== '.meta')
  .map((path) => ({ path, size: statSync(path).size }))
  .sort((a, b) => b.size - a.size)[0];
const disabledModules = [
  'physics-2d',
  'physics-2d-box2d',
  'particle-2d',
  'profiler',
  'video',
  'webview',
  'tiled-map',
  'spine',
  'spine-3.8',
  'dragon-bones',
];
const legacyAudio = ['home_bgm.wav', 'battle_bgm.wav', 'boss_bgm.wav'];
const scriptText = [
  read(`${client}/assets/scripts/ui/LoginUI.ts`),
  read(`${client}/assets/scripts/ui/MainUI.ts`),
].join('\n');

const checks = [
  ['release build targets WeChat Mini Game', buildConfig.platform === 'wechatgame'],
  ['release build starts from LoginScene', buildConfig.startScene === 'ddbec60e-dd05-49cb-9fae-d657a6db101d'],
  ['release build disables debug mode', buildConfig.debug === false],
  ['release build disables source maps', buildConfig.sourceMaps === false],
  ['release build enables md5 cache', buildConfig.md5Cache === true],
  ['release build uses portrait orientation', buildConfig.packages?.wechatgame?.orientation === 'portrait'],
  ['engine module list has no duplicates', included.size === includedList.length],
  ...disabledModules.map((name) => [`unused engine module disabled: ${name}`, cache[name]?._value === false]),
  ...disabledModules.map((name) => [`unused engine module excluded: ${name}`, !included.has(name)]),
  ['runtime does not import the profiler', !/\bprofiler\b/.test(scriptText)],
  ...legacyAudio.map((name) => [`legacy root audio removed from resources: ${name}`, !existsSync(join(resourcesPath, name))]),
  ...legacyAudio.map((name) => [`legacy audio preserved in archive: ${name}`, existsSync(join(archivePath, name))]),
  ...legacyAudio.map((name) => [`production audio remains available: ${name}`, existsSync(join(resourcesPath, 'audio', name))]),
  ['resources stay inside the V12 source budget', resourceBytes <= 35 * 1024 * 1024],
  ['no single runtime resource exceeds 2 MiB', !largestResource || largestResource.size <= 2 * 1024 * 1024],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}
console.log(`Resources: ${(resourceBytes / 1024 / 1024).toFixed(2)} MiB`);
if (largestResource) {
  console.log(`Largest: ${(largestResource.size / 1024 / 1024).toFixed(2)} MiB ${largestResource.path.slice(root.length + 1)}`);
}
console.log(`V12 package audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
