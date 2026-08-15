import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pathOf = (path) => resolve(root, path);
const exists = (path) => existsSync(pathOf(path));
const read = (path) => exists(path) ? readFileSync(pathOf(path), 'utf8') : '';

const paths = {
  registry: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetVisualRegistry.ts',
  loader: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetAssetLoader.ts',
  runtime: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattleAssetRuntime.ts',
  validator: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattleAssetValidator.ts',
  quality: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattleQualityPolicy.ts',
  audio: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattleAudioRouter.ts',
  stage: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/Battle3DStage.ts',
  scene: 'client/PetVerseClient/assets/scripts/ui/v10/BattleSceneV10.ts',
  contract: 'docs/battle-asset-intake-v1.md',
};

const files = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, read(path)]),
);
const checks = [];
const add = (name, passed) => checks.push([name, Boolean(passed)]);
const species = Array.from({ length: 10 }, (_, index) => `PET${String(index + 1).padStart(3, '0')}`);
const requiredAnimations = ['enter', 'idle', 'basic_attack', 'active_skill', 'hit', 'death', 'victory'];

for (const path of Object.values(paths).filter((path) => path.endsWith('.ts'))) {
  add(`${path} exists with meta`, exists(path) && exists(`${path}.meta`));
}

for (const code of [...species, 'BOSS001']) {
  add(`${code} has a visual profile`, files.registry.includes(`${code}:`) || files.registry.includes(`pendingProfile('${code}'`));
}

add('all formal assets require an explicit readiness gate', (files.registry.match(/formalAssetReady:\s*false/g) || []).length >= 4 && files.registry.includes('formalAssetReady'));
add('first release keeps formal assets disabled until real files arrive', !/formalAssetReady:\s*true/.test(files.registry));
add('all profiles declare remote delivery', files.registry.includes("delivery: 'remote'") && !/delivery:\s*'local',/.test(files.registry));
add('pet triangle budget is encoded', files.registry.includes('maxTriangles: 12000'));
add('boss triangle budget is encoded', files.registry.includes('maxTriangles: 25000'));
add('material, node and compressed-size budgets are encoded', ['maxMaterials', 'maxNodes', 'compressedBudgetBytes'].every((field) => files.registry.includes(field)));
add('all seven required animation names are shared', requiredAnimations.every((clip) => files.registry.includes(`'${clip}'`)));

add('runtime reads WeChat extConfig', files.runtime.includes('getExtConfigSync'));
add('runtime supports battleAssetBaseUrl', files.runtime.includes('battleAssetBaseUrl'));
add('runtime trims trailing URL separators', files.runtime.includes("replace(/\\/+$/, '')"));
add('loader resolves a remote or local bundle source', files.loader.includes('resolveBattleBundleSource'));
add('loader validates an instantiated prefab before use', files.loader.includes('validateBattleAsset'));
add('invalid formal assets are destroyed and fall back safely', files.loader.includes('if (!validation.valid)') && files.loader.includes('node.destroy()') && files.loader.includes('return null'));
add('loader releases loaded prefab assets', files.loader.includes("entry.bundle?.release?.(entry.path, Prefab)"));
add('loader exposes validation reports', files.loader.includes('getValidationReports'));

for (const prohibited of ['Camera', 'Light', 'UITransform', 'Canvas', 'Button', 'ParticleSystem']) {
  add(`validator rejects ${prohibited}`, files.validator.includes(prohibited));
}
add('validator enforces node budget', files.validator.includes('nodes.length > profile.maxNodes'));
add('validator enforces material budget', files.validator.includes('materials.size > profile.maxMaterials'));
add('validator enforces triangle budget', files.validator.includes('triangleCount > profile.maxTriangles'));
add('validator enforces required animations', files.validator.includes('missingAnimations'));
add('validator rejects empty renderable content', files.validator.includes("errors.push('未发现可渲染网格')"));

for (const tier of ['low', 'balanced', 'high']) {
  add(`${tier} quality tier exists`, new RegExp(`${tier}:\\s*\\{`).test(files.quality));
}
add('automatic quality detects WeChat benchmark level', files.quality.includes('benchmarkLevel'));
add('automatic quality detects device memory', files.quality.includes('memorySize'));
add('quality preference persists locally', files.quality.includes('getStorageSync') && files.quality.includes('setStorageSync'));
add('low quality targets 30 FPS', /low:\s*\{[\s\S]*?targetFps:\s*30/.test(files.quality));
add('high quality targets 60 FPS', /high:\s*\{[\s\S]*?targetFps:\s*60/.test(files.quality));
add('low quality disables secondary VFX', /low:\s*\{[\s\S]*?enableSecondaryVfx:\s*false/.test(files.quality));

add('audio router maps presentation cues', files.audio.includes('CUE_AUDIO'));
add('audio router throttles duplicate sounds', files.audio.includes('lastPlayedAt') && files.audio.includes('cooldown'));
add('audio router retains legacy event fallback', files.audio.includes('legacySound'));
add('battle scene uses adaptive quality', files.scene.includes('resolveBattleQualityProfile'));
add('battle scene applies and restores target FPS', files.scene.includes('game.frameRate = qualityProfile.targetFps') && files.scene.includes('game.frameRate = previousFrameRate'));
add('battle scene yields large event batches without dropping the old 24-event cap', files.scene.includes('events.slice(0, 24)') && files.scene.includes('qualityProfile.maxEventsPerBatch'));
add('battle scene delegates combat audio routing', files.scene.includes('audioRouter.play(event)'));
add('battle scene emits presentation diagnostics', files.scene.includes('stage3d.getDiagnostics()'));

add('stage scales primitive detail by quality tier', files.stage.includes('this.quality.primitiveSegments'));
add('stage scales torus detail by quality tier', files.stage.includes('this.quality.torusSegments'));
add('stage caps transient effects', files.stage.includes('maxTransientEffects') && files.stage.includes('reserveTransientEffect'));
add('stage records skipped effects', files.stage.includes('skippedEffects'));
add('stage scales camera shake', files.stage.includes('cameraShakeScale'));
add('stage adds readable impact bursts', files.stage.includes('impactBurst'));
add('stage adds boss shockwaves', files.stage.includes('BossShockwave') && files.stage.includes('shockwave'));
add('stage lengthens boss warning readability', files.stage.includes('duration(820)'));
add('stage retains formal-asset fallback replacement', files.stage.includes('upgradeToFormalVisual') && files.stage.includes('visual.modelRoot.destroyAllChildren()'));
add('stage exposes asset and performance diagnostics', files.stage.includes('BattleStageDiagnostics') && files.stage.includes('assetValidationReports'));

const runtimeAssetRoot = pathOf('client/PetVerseClient/assets');
const modelExtensions = new Set(['.fbx', '.glb', '.gltf']);
const modelFiles = walk(runtimeAssetRoot).filter((path) => modelExtensions.has(extname(path).toLowerCase()));
add('no unapproved raw modelling files entered runtime assets', modelFiles.length === 0);
add('asset intake contract exists', exists(paths.contract));
add('asset intake contract names all seven clips', requiredAnimations.every((clip) => files.contract.includes(clip)));
add('asset intake contract documents remote bundle configuration', files.contract.includes('battleAssetBaseUrl'));
add('asset intake contract documents the readiness gate', files.contract.includes('formalAssetReady'));

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}
console.log(`V13.3 battle-experience audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;

function walk(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}
