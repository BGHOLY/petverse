
import * as fs from 'fs';
import * as path from 'path';

import { ALL_ITEM_CONFIGS } from '../src/modules/item/config/item.config';
import { PET_SPECIES_CONFIGS } from '../src/modules/pet/config/pet-species.config';
import { ALL_SKILL_CONFIGS } from '../src/modules/skill/config/skill.config';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredItemCodes = [
  'breeding_token',
  'fusion_core',
  'skill_lock',
  'pet_capacity_ticket',
  'season_token',
];

assert(
  PET_SPECIES_CONFIGS.length === 10,
  `Expected 10 species, got ${PET_SPECIES_CONFIGS.length}`,
);
assert(
  ALL_SKILL_CONFIGS.length === 70,
  `Expected 70 skills, got ${ALL_SKILL_CONFIGS.length}`,
);
assert(
  ALL_ITEM_CONFIGS.length >= 74,
  `Expected at least 74 items, got ${ALL_ITEM_CONFIGS.length}`,
);

const itemCodes = new Set(
  ALL_ITEM_CONFIGS.map((item) => item.itemCode),
);
for (const itemCode of requiredItemCodes) {
  assert(
    itemCodes.has(itemCode),
    `Missing required item: ${itemCode}`,
  );
}

const requiredFiles = [
  'src/modules/friend/friend.service.ts',
  'src/modules/mail/mail.service.ts',
  'src/modules/season/season.service.ts',
  'src/modules/trade/trade.service.ts',
  'src/modules/pet-capacity/pet-capacity.service.ts',
  'src/modules/ranking/ranking-snapshot.entity.ts',
];

for (const relative of requiredFiles) {
  assert(
    fs.existsSync(path.resolve(process.cwd(), relative)),
    `Missing V2.2 file: ${relative}`,
  );
}

const appModule = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app.module.ts'),
  'utf8',
);
for (const moduleName of [
  'PetCapacityModule',
  'SeasonModule',
  'TradeModule',
]) {
  assert(
    appModule.includes(moduleName),
    `AppModule does not include ${moduleName}`,
  );
}

console.log(
  JSON.stringify(
    {
      success: true,
      version: '2.2.0',
      species: PET_SPECIES_CONFIGS.length,
      skills: ALL_SKILL_CONFIGS.length,
      items: ALL_ITEM_CONFIGS.length,
      requiredItems: requiredItemCodes,
      modules: [
        'real-friends',
        'multi-attachment-mail',
        'season-settlement',
        'ranking-snapshots',
        'pet-trade',
        'pet-capacity',
      ],
    },
    null,
    2,
  ),
);
