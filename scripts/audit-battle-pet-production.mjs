import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pathOf = (path) => resolve(root, path);
const exists = (path) => existsSync(pathOf(path));
const read = (path) => readFileSync(pathOf(path), 'utf8');

const paths = {
  reference: 'docs/art/characters/pet001-flame-tail-fox-turnaround-v1.png',
  specification: 'docs/art/characters/pet001-flame-tail-fox-production-v1.md',
  sharedSpecification: 'docs/battle-pet-production-v1.md',
  registry: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetVisualRegistry.ts',
  loader: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetAssetLoader.ts',
  stage: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/Battle3DStage.ts',
};

const files = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, exists(path) ? read(path) : '']),
);

const requiredAnimations = [
  'enter',
  'idle',
  'basic_attack',
  'active_skill',
  'hit',
  'death',
  'victory',
];

const checks = [
  ['PET001 turnaround is archived', exists(paths.reference)],
  ['turnaround is a non-empty PNG', exists(paths.reference) && statSync(pathOf(paths.reference)).size > 500_000],
  ['PET001 production specification exists', exists(paths.specification)],
  ['shared production specification references PET001 contract', files.sharedSpecification.includes(paths.reference) && files.sharedSpecification.includes(paths.specification)],
  ['reference art is outside client runtime resources', !paths.reference.includes('client/PetVerseClient/assets')],
  ['single-tail identity is locked', /单尾/.test(files.specification) && /第二条尾巴/.test(files.specification)],
  ['model triangle budget is locked', /8,000/.test(files.specification) && /12,000/.test(files.specification)],
  ['texture budget is locked', /512×512/.test(files.specification)],
  ['bone budget is locked', /不超过 30 根/.test(files.specification)],
  ['Cocos orientation and origin are locked', /Cocos `-Z`/.test(files.specification) && /`Y=0`/.test(files.specification)],
  ['all required clips are specified', requiredAnimations.every((clip) => files.specification.includes(`\`${clip}\``))],
  ['impact and release events are specified', /`impact`/.test(files.specification) && /`release`/.test(files.specification)],
  ['production prefab path is specified', /pets\/PET001\/PET001_Battle/.test(files.specification)],
  ['asset loader exists with a meta file', exists(paths.loader) && exists(`${paths.loader}.meta`)],
  ['asset loader uses a bundle rather than hard-coded scene assets', /loadBundle/.test(files.loader) && /profile\.bundleName/.test(files.loader)],
  ['asset loader validates every required animation', /validateAnimations/.test(files.loader) && /requiredAnimations/.test(files.loader)],
  ['asset loader keeps combat fail-safe', /return null/.test(files.loader) && /继续使用质量样片/.test(files.loader)],
  ['formal assets require explicit readiness', /formalAssetReady/.test(files.registry)],
  ['all unapproved formal assets remain disabled', (files.registry.match(/formalAssetReady:\s*false/g) || []).length >= 3],
  ['production revision is recorded', /PET001-V1/.test(files.registry)],
  ['PET001 sample has a dedicated builder', /buildFlameTailFox/.test(files.stage)],
  ['PET001 sample has recognizable moon mark', /MoonFlameMark/.test(files.stage)],
  ['PET001 sample has violet eyes and moonstone charm', /Eye_/.test(files.stage) && /MoonstoneCharm/.test(files.stage)],
  ['PET001 sample has segmented flame tail', /TailBase/.test(files.stage) && /TailFlameMid/.test(files.stage) && /TailFlameTip/.test(files.stage)],
  ['stage upgrades to formal visual asynchronously', /upgradeToFormalVisual/.test(files.stage) && /assetLoader\.instantiate/.test(files.stage)],
  ['formal model is recursively assigned to 3D layer', /setLayerRecursively/.test(files.stage)],
  ['stage plays production animation clips', /playUnitAnimation/.test(files.stage) && /active_skill/.test(files.stage) && /death/.test(files.stage)],
  ['stage clears asset loader state', /assetLoader\.clear/.test(files.stage)],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}

console.log(`Battle pet production audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;

