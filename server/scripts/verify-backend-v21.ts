import {
  ALL_ITEM_CONFIGS,
  SKILL_BOOK_ITEM_CONFIGS,
  SHOP_ITEM_CONFIGS,
} from '../src/modules/item/config/item.config';
import {
  ALL_SKILL_CONFIGS,
  NORMAL_SKILL_CONFIGS,
  SPECIAL_SKILL_CONFIGS,
} from '../src/modules/skill/config/skill.config';
import {
  PET_SPECIES_CONFIGS,
} from '../src/modules/pet/config/pet-species.config';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

assert(
  PET_SPECIES_CONFIGS.length === 10,
  `Expected 10 species, received ${PET_SPECIES_CONFIGS.length}`,
);
assert(
  NORMAL_SKILL_CONFIGS.length === 60,
  `Expected 60 normal skills, received ${NORMAL_SKILL_CONFIGS.length}`,
);
assert(
  SPECIAL_SKILL_CONFIGS.length === 10,
  `Expected 10 special skills, received ${SPECIAL_SKILL_CONFIGS.length}`,
);
assert(
  ALL_SKILL_CONFIGS.length === 70,
  `Expected 70 skills, received ${ALL_SKILL_CONFIGS.length}`,
);
assert(
  SKILL_BOOK_ITEM_CONFIGS.length === 60,
  `Expected 60 skill books, received ${SKILL_BOOK_ITEM_CONFIGS.length}`,
);
assert(
  ALL_ITEM_CONFIGS.length === 72,
  `Expected 72 items, received ${ALL_ITEM_CONFIGS.length}`,
);
assert(
  unique(ALL_SKILL_CONFIGS.map((skill) => skill.skillCode)),
  'Duplicate skillCode found',
);
assert(
  unique(ALL_ITEM_CONFIGS.map((item) => item.itemCode)),
  'Duplicate itemCode found',
);
assert(
  SHOP_ITEM_CONFIGS.every((item) =>
    ALL_ITEM_CONFIGS.some(
      (config) => config.itemCode === item.itemCode,
    ),
  ),
  'Shop contains an unconfigured item',
);
assert(
  PET_SPECIES_CONFIGS.every((species) => {
    const ranges = [
      ...Object.values(species.normalAptitudes),
      ...Object.values(species.mutantAptitudes),
      species.normalGrowth,
      species.mutantGrowth,
    ] as Array<[number, number]>;
    return ranges.every(
      ([min, max]) =>
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min <= max,
    );
  }),
  'Invalid aptitude or growth range',
);

console.log(
  JSON.stringify(
    {
      success: true,
      species: PET_SPECIES_CONFIGS.length,
      skills: ALL_SKILL_CONFIGS.length,
      normalSkills: NORMAL_SKILL_CONFIGS.length,
      specialSkills: SPECIAL_SKILL_CONFIGS.length,
      items: ALL_ITEM_CONFIGS.length,
      skillBooks: SKILL_BOOK_ITEM_CONFIGS.length,
      shopItems: SHOP_ITEM_CONFIGS.length,
    },
    null,
    2,
  ),
);
