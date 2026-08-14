import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pathOf = (path) => resolve(root, path);
const exists = (path) => existsSync(pathOf(path));
const read = (path) => (exists(path) ? readFileSync(pathOf(path), 'utf8') : '');

const paths = {
  stageConfig: 'server/src/modules/battle/battle-stage.config.ts',
  stageSpec: 'server/src/modules/battle/battle-stage.config.spec.ts',
  debrief: 'server/src/modules/battle/battle-debrief.ts',
  debriefSpec: 'server/src/modules/battle/battle-debrief.spec.ts',
  battleService: 'server/src/modules/battle/battle-v10.service.ts',
  explorationService: 'server/src/modules/exploration/exploration.service.ts',
  presentation: 'server/src/modules/battle/battle-presentation.ts',
  mainUi: 'client/PetVerseClient/assets/scripts/ui/MainUI.ts',
  battleScene: 'client/PetVerseClient/assets/scripts/ui/v10/BattleSceneV10.ts',
  smoke: 'scripts/smoke-v13-chapter-one.mjs',
};

const files = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, read(path)]),
);

const stageCodes = ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'];
const expectedDifficulties = ['0.8', '0.86', '0.92', '0.99', '1.06', '1.22'];
const expectedPowers = ['2400', '2700', '3000', '3400', '3900', '4700'];
const ordered = (source, values) => values.every((value, index) => {
  const position = source.indexOf(value);
  return position >= 0 && (index === 0 || position > source.indexOf(values[index - 1]));
});
const enemyRosters = files.stageConfig.match(/\[(?:\s*'PET\d{3}',?){5}\s*\]/g) || [];

const checks = [
  ['chapter-one stage config exists', exists(paths.stageConfig)],
  ['chapter-one stage tests exist', exists(paths.stageSpec)],
  ['failure debrief and tests exist', exists(paths.debrief) && exists(paths.debriefSpec)],
  ['chapter-one smoke exists', exists(paths.smoke)],
  ['five normal stages are configured', stageCodes.every((code) => files.stageConfig.includes(`'${code}'`))],
  ['chapter boss is configured', /stageCode:\s*'boss'/.test(files.stageConfig) && /boss:\s*true/.test(files.stageConfig)],
  ['all six stages use five enemies', enemyRosters.length === 6],
  ['normal stage difficulty rises steadily', ordered(files.stageConfig, expectedDifficulties.slice(0, 5))],
  ['boss is harder than stage five', files.stageConfig.indexOf('difficulty: 1.22') > files.stageConfig.indexOf('1.06')],
  ['recommended power rises steadily', ordered(files.stageConfig, expectedPowers)],
  ['each stage exposes objective and tutorial tip', /const moonForest = \([\s\S]*objective: string,[\s\S]*tutorialTip: string,/.test(files.stageConfig) && /stageCode:\s*'boss'[\s\S]*objective:[\s\S]*tutorialTip:/.test(files.stageConfig)],
  ['battle start resolves server stage config', /findBattleStageConfig\(regionCode, stageCode, bossBattle\)/.test(files.battleService)],
  ['stage difficulty overrides client input', /stageConfig\?\.difficulty\s*\|\|\s*body\?\.difficulty/.test(files.battleService)],
  ['stage formation overrides client input', /stageConfig\?\.enemyFormationCode\s*\|\|\s*body\?\.enemyFormationCode/.test(files.battleService)],
  ['stage enemy roster is server-authored', /stageConfig\?\.enemySpeciesCodes/.test(files.battleService)],
  ['stage max rounds is server-authored', /stageConfig\?\.maxRounds/.test(files.battleService)],
  ['battle session returns stage metadata', /const stage = findBattleStageConfig/.test(files.battleService) && /enemySpeciesCodes:\s*\[\.\.\.stage\.enemySpeciesCodes\]/.test(files.battleService)],
  ['world API exposes configured stages', /battleStageViews\(region\.code, false\)/.test(files.explorationService)],
  ['world API exposes configured boss', /bossStage:\s*battleStageViews\(region\.code, true\)\[0\]/.test(files.explorationService)],
  ['standard battle settlement returns debrief', /debrief:\s*buildBattleDebrief\(session, won, failureReason\)/.test(files.battleService)],
  ['exploration settlement returns debrief', /debrief:\s*buildBattleDebrief\(battle, won, failureReason\)/.test(files.explorationService)],
  ['debrief records first fallen pet', /firstFallen/.test(files.debrief) && /defeat/.test(files.debrief)],
  ['debrief records critical events', /criticalEvents/.test(files.debrief) && /boss-telegraph/.test(files.debrief)],
  ['debrief returns actionable recommendations', /const recommendations: string\[\]/.test(files.debrief) && /recommendations\.push/.test(files.debrief)],
  ['battle HUD uses server tutorial tip', /session\?\.stage\?\.tutorialTip/.test(files.battleScene)],
  ['failure result renders first fallen pet', /debrief\.firstFallen/.test(files.battleScene)],
  ['failure result renders a recommendation', /debrief\?\.recommendations/.test(files.battleScene)],
  ['victory result supports next-stage action', /options\.onNext/.test(files.battleScene) && /下一关/.test(files.battleScene)],
  ['adventure launches stage-authored battle', /const stage=kind==='nest'/.test(files.mainUi) && /difficulty:Number\(stage\?\.difficulty/.test(files.mainUi)],
  ['adventure can continue to the next stage', /continueRegionBattle/.test(files.mainUi) && /onNext:kind==='explore'/.test(files.mainUi)],
  ['boss telegraph presentation cue remains mapped', /'boss-telegraph':\s*\{[^}]*cue:\s*'boss\.telegraph'/.test(files.presentation)],
  ['boss skill presentation cue remains mapped', /'boss-skill':\s*\{[^}]*cue:\s*'boss\.skill'/.test(files.presentation)],
  ['boss phase presentation cue remains mapped', /'boss-phase':\s*\{[^}]*cue:\s*'boss\.phase'/.test(files.presentation)],
  ['smoke rejects forged client difficulty', /client-forged difficulty/.test(files.smoke)],
  ['smoke validates server enemy roster', /enemy roster does not match the server config/.test(files.smoke)],
  ['smoke validates idempotent settlement', /idempotent/.test(files.smoke)],
  ['smoke validates boss telegraph and skill', /boss telegraph/.test(files.smoke) && /boss skill/.test(files.smoke)],
  ['smoke validates chapter-two unlock', /unlockedRegionCode/.test(files.smoke) && /ember-ridge/.test(files.smoke)],
  ['smoke validates all failure recap fields', ['firstFallen', 'criticalEvents', 'recommendations'].every((field) => files.smoke.includes(field))],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}

console.log(`V13 chapter-one audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) process.exitCode = 1;
