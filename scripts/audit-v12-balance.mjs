import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const auth = read('server/src/modules/auth/auth.service.ts');
const starter = read('server/src/modules/auth/starter-team.config.ts');
const fusion = read('server/src/modules/fusion/fusion.service.ts');
const eggs = read('server/src/modules/egg/egg.service.ts');
const items = read('server/src/modules/item/config/item.config.ts');
const inventory = read('server/src/modules/inventory/inventory.service.ts');
const battleRewards = read('server/src/modules/battle/battle-reward.config.ts');
const battle = read('server/src/modules/battle/battle-v10.service.ts');
const equipment = read('server/src/modules/equipment/equipment.service.ts');
const offline = read('server/src/modules/offline-reward/offline-reward.service.ts');
const expedition = read('server/src/modules/expedition/expedition.config.ts');
const daily = read('server/src/modules/daily-task/daily-task.config.ts');
const species = read('server/src/modules/pet/config/pet-species.config.ts');

const value = (source, pattern, fallback = 0) =>
  Number(source.match(pattern)?.[1] || fallback);
const startingGold = value(auth, /gold:\s*(\d+)/);
const fusionGold = value(fusion, /const FUSION_COST[\s\S]*?gold:\s*(\d+)/);
const pveGold = value(battleRewards, /pve:\s*\{[\s\S]*?gold:\s*(\d+)/);
const commonHatchSeconds = 60 * 60;
const largeAcceleratorSeconds = value(
  items,
  /itemCode:\s*'hatch_sandglass_large'[\s\S]*?effectValue:\s*(\d+)/,
);
const fusionCoreShopPrice = value(
  items,
  /itemCode:\s*'fusion_core',\s*currencyType:\s*'gold',\s*price:\s*(\d+)/,
);
const dailySection = daily.split('export const WEEKLY_TASK_DEFINITIONS')[0];
const dailyActivity = [...dailySection.matchAll(/activityPoints:\s*(\d+)/g)]
  .reduce((sum, match) => sum + Number(match[1]), 0);
const starterSpecies = [
  ...starter.matchAll(/speciesCode:\s*'(PET\d+)'/g),
].map((match) => match[1]);

const checks = [
  ['starting gold pays for one first fusion', startingGold >= fusionGold && fusionGold > 0],
  ['first battle gives positive gold', pveGold > 0],
  ['starter package contains two eggs', /common_pet_egg:\s*2/.test(starter)],
  ['starter package contains two full hatch accelerators', /hatch_sandglass_large:\s*2/.test(starter) && largeAcceleratorSeconds >= commonHatchSeconds],
  ['starter package contains fusion materials', /fusion_core:\s*2/.test(starter)],
  ['starter package contains marriage materials', /breeding_token:\s*2/.test(starter)],
  ['starter roster has five unique species', starterSpecies.length === 5 && new Set(starterSpecies).size === 5],
  ['game ships ten pet species', new Set([...species.matchAll(/speciesCode:\s*'(PET\d+)'/g)].map((match) => match[1])).size >= 10],
  ['common egg hatch time is one hour', /1:\s*60\s*\*\s*60/.test(eggs)],
  ['egg item creation and consumption share one transaction', /if \(item\.type === 'egg'[\s\S]*?dataSource\.transaction[\s\S]*?consumeItem\([\s\S]*?manager[\s\S]*?createEgg\([\s\S]*?manager/.test(inventory)],
  ['offline income is capped at eight hours', /Math\.min\(minutes,\s*8\s*\*\s*60\)/.test(offline)],
  ['one offline cap nearly funds a fusion', 8 * 60 * 2 >= fusionGold * 0.9],
  ['shop fusion core is not more than two fusion fees', fusionCoreShopPrice > 0 && fusionCoreShopPrice <= fusionGold * 2],
  ['daily activity contains a complete 100-point route', dailyActivity >= 100],
  ['first battle grants an equipment drop', /equipmentService\.grantBattleDrop/.test(battle) && /async grantBattleDrop/.test(equipment)],
  ['expedition offers 30m, 2h, 4h and 8h choices', /EXPEDITION_DURATIONS\s*=\s*\[30,\s*120,\s*240,\s*480\]/.test(expedition)],
  ['new-player journey smoke is connected', read('scripts/smoke-v12-new-player.mjs').includes('V12 new-player journey smoke passed')],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed += 1;
}
console.log(`V12 balance audit: ${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
