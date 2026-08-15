import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pathOf = (path) => resolve(root, path);
const exists = (path) => existsSync(pathOf(path));
const read = (path) => exists(path) ? readFileSync(pathOf(path), 'utf8') : '';

const cast = [
  {
    code: 'PET001',
    reference: 'docs/art/characters/pet001-flame-tail-fox-turnaround-v2.png',
    specification: 'docs/art/characters/pet001-flame-tail-fox-production-v2.md',
    revision: 'PET001-V2',
    builder: 'buildFlameTailFox',
    identity: ['orange-red', 'single-tail', 'ForeheadFlameMark'],
  },
  {
    code: 'PET002',
    reference: 'docs/art/characters/pet002-rockshell-turtle-turnaround-v1.png',
    specification: 'docs/art/characters/pet002-rockshell-turtle-production-v1.md',
    revision: 'PET002-V1',
    builder: 'buildRockshellTurtle',
    identity: ['RockShell', 'AmberCrystal', 'MossBand'],
  },
  {
    code: 'PET008',
    reference: 'docs/art/characters/pet008-forest-spirit-deer-turnaround-v1.png',
    specification: 'docs/art/characters/pet008-forest-spirit-deer-production-v1.md',
    revision: 'PET008-V1',
    builder: 'buildForestSpiritDeer',
    identity: ['AntlerBranch', 'WreathFlower', 'LeafTail'],
  },
  {
    code: 'BOSS001',
    reference: 'docs/art/characters/boss-ancient-guardian-turnaround-v1.png',
    specification: 'docs/art/characters/boss-ancient-guardian-production-v1.md',
    revision: 'BOSS001-V1',
    builder: 'buildAncientGuardian',
    identity: ['LifeCore', 'RootArm', 'CrownBranch'],
  },
];

const paths = {
  sharedSpecification: 'docs/battle-pet-production-v2.md',
  registry: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetVisualRegistry.ts',
  loader: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetAssetLoader.ts',
  stage: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/Battle3DStage.ts',
};

const shared = read(paths.sharedSpecification);
const registry = read(paths.registry);
const loader = read(paths.loader);
const stage = read(paths.stage);
const requiredAnimations = ['enter', 'idle', 'basic_attack', 'active_skill', 'hit', 'death', 'victory'];
const checks = [];

for (const character of cast) {
  const spec = read(character.specification);
  checks.push(
    [`${character.code} turnaround exists`, exists(character.reference)],
    [`${character.code} turnaround is non-empty`, exists(character.reference) && statSync(pathOf(character.reference)).size > 500_000],
    [`${character.code} specification exists`, exists(character.specification)],
    [`${character.code} is registered`, registry.includes(`${character.code}: {`)],
    [`${character.code} revision is locked`, registry.includes(character.revision)],
    [`${character.code} has a dedicated sample builder`, stage.includes(character.builder)],
    [`${character.code} specification contains all clips`, requiredAnimations.every((clip) => spec.includes(clip))],
    [`${character.code} reference remains outside runtime assets`, !character.reference.includes('client/PetVerseClient/assets')],
    [`${character.code} is linked by shared contract`, shared.includes(character.reference) && shared.includes(character.specification)],
  );
  for (const identity of character.identity) {
    checks.push([`${character.code} locks identity ${identity}`, spec.includes(identity) || stage.includes(identity)]);
  }
}

checks.push(
  ['shared V2 production contract exists', exists(paths.sharedSpecification)],
  ['asset loader and meta exist', exists(paths.loader) && exists(`${paths.loader}.meta`)],
  ['loader uses bundles and profile paths', loader.includes('loadBundle') && loader.includes('profile.bundleName') && loader.includes('profile.prefabPath')],
  ['loader validates required skeletal clips', loader.includes('validateBattleAsset') && exists('client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattleAssetValidator.ts')],
  ['loader fails safely when a formal asset is unavailable', loader.includes('return null')],
  ['formal assets require explicit readiness', registry.includes('formalAssetReady')],
  ['all four unapproved formal assets remain disabled', (registry.match(/formalAssetReady:\s*false/g) || []).length >= 4],
  ['stage upgrades visuals asynchronously', stage.includes('upgradeToFormalVisual') && stage.includes('assetLoader.instantiate')],
  ['stage keeps a separate model root for hot replacement', stage.includes("new Node('ModelRoot')") && stage.includes('visual.modelRoot.destroyAllChildren()')],
  ['formal model layer is assigned recursively', stage.includes('setLayerRecursively')],
  ['procedural samples implement all seven actions', requiredAnimations.every((clip) => stage.includes(`case '${clip}'`))],
  ['procedural motion differentiates all four characters', ['isFox', 'isTurtle', 'isDeer', 'isBoss'].every((flag) => stage.includes(flag))],
  ['boss runtime mapping uses BOSS001 profile', stage.includes("unit.role === 'boss' ? 'BOSS001' : unit.speciesCode")],
  ['stage clears loader state', stage.includes('assetLoader.clear')],
  ['V2 fox removes obsolete moonstone identity', !stage.includes('MoonstoneCharm') && !stage.includes('MoonFlameMark')],
);

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}

console.log(`Battle pet production audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
