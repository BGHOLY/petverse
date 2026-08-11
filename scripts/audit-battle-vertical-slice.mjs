import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const exists = (path) => existsSync(resolve(root, path));

const paths = {
  brief: 'docs/battle-vertical-slice-v1.md',
  contract: 'docs/battle-presentation-contract-v1.md',
  budget: 'docs/battle-3d-asset-budget-v1.md',
  presentation: 'server/src/modules/battle/battle-presentation.ts',
  battleService: 'server/src/modules/battle/battle-v10.service.ts',
  battleScene: 'client/PetVerseClient/assets/scripts/ui/v10/BattleSceneV10.ts',
  director: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePresentationDirector.ts',
  stage: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/Battle3DStage.ts',
  types: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePresentationTypes.ts',
  visualRegistry: 'client/PetVerseClient/assets/scripts/ui/v10/battle3d/BattlePetVisualRegistry.ts',
  productionSpec: 'docs/battle-pet-production-v1.md',
};

const files = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, exists(path) ? read(path) : '']),
);

const checks = [
  ['vertical-slice brief exists', exists(paths.brief)],
  ['presentation contract exists', exists(paths.contract)],
  ['3D asset budget exists', exists(paths.budget)],
  ['pet production specification exists', exists(paths.productionSpec)],
  ['brief locks 720x1280', /720\s*[×x]\s*1280/i.test(files.brief)],
  ['brief locks five-versus-five battle', /5\s*v\s*5|5v5|五宠对五宠|五对五/i.test(files.brief)],
  ['brief limits player input to focus and formation ultimate', /集火/.test(files.brief) && /阵法大招/.test(files.brief)],
  ['budget documents WeChat package constraints', /微信/.test(files.budget) && /分包|包体/.test(files.budget)],
  ['presentation event IDs are stable', /eventId/.test(files.presentation) && /sequence/.test(files.presentation)],
  ['presentation schema is versioned', /schemaVersion:\s*1/.test(files.presentation)],
  ['damage cue is mapped', /damage\.hit/.test(files.presentation)],
  ['heal and shield cues are mapped', /support\.heal/.test(files.presentation) && /support\.shield/.test(files.presentation)],
  ['formation ultimate cue is mapped', /formation\.ultimate/.test(files.presentation)],
  ['boss telegraph cue is mapped', /boss\.telegraph/.test(files.presentation)],
  ['boss skill cue is mapped', /boss\.skill/.test(files.presentation)],
  ['boss phase cue is mapped', /boss\.phase/.test(files.presentation)],
  ['boss is Ancient Guardian', /古树守卫/.test(files.battleService)],
  ['boss energy telegraph exists', /boss-telegraph/.test(files.battleService) && /boss\.energy\s*>=\s*75/.test(files.battleService)],
  ['boss phase transition exists', /boss-phase/.test(files.battleService)],
  ['battle scene owns the 3D stage', /new Battle3DStage/.test(files.battleScene)],
  ['battle scene owns the presentation director', /new BattlePresentationDirector/.test(files.battleScene)],
  ['battle scene supports focus selection', /focus/i.test(files.battleScene) && /focusTargetId/.test(files.battleScene)],
  ['battle scene supports formation ultimate', /formation ultimate|阵法大招|formationUltimate/i.test(files.battleScene)],
  ['3D stage creates ten unit slots', /LEFT_POSITIONS/.test(files.stage) && /RIGHT_POSITIONS/.test(files.stage) && /slice\(0,\s*5\)/.test(files.stage)],
  ['3D stage uses shared geometry and materials', /private readonly meshes = new Map/.test(files.stage) && /private readonly materials = new Map/.test(files.stage)],
  ['3D stage handles boss telegraph', /boss\.telegraph/.test(files.stage)],
  ['3D stage handles boss skill', /boss\.skill/.test(files.stage)],
  ['3D stage handles damage impact', /damage\.hit/.test(files.stage)],
  ['3D stage handles formation ultimate', /formation\.ultimate/.test(files.stage)],
  ['three representative pet profiles are registered', ['PET001', 'PET002', 'PET008'].every((code) => files.visualRegistry.includes(code))],
  ['formal pet prefabs have graybox fallback profiles', /prefabPath/.test(files.visualRegistry) && /fallbackArchetype/.test(files.visualRegistry)],
  ['director sorts events deterministically', /\.sort\(/.test(files.director) && /sequence/.test(files.director)],
  ['director deduplicates events', /playedEventIds/.test(files.director)],
  ['all client scripts have meta files', [paths.battleScene, paths.director, paths.stage, paths.types, paths.visualRegistry].every((path) => exists(`${path}.meta`))],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}

console.log(`Battle vertical-slice audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
