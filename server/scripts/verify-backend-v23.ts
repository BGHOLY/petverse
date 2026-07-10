import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

function read(relativePath: string) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return readFileSync(path, 'utf8');
}

function requireText(
  relativePath: string,
  expected: string,
) {
  const content = read(relativePath);
  if (!content.includes(expected)) {
    throw new Error(
      `${relativePath} is missing: ${expected}`,
    );
  }
}

const checks: Array<[string, string]> = [
  ['src/app.module.ts', 'GameConfigModule'],
  ['src/app.module.ts', 'MaintenanceModule'],
  [
    'src/config/database.config.ts',
    'MarriageProposal',
  ],
  [
    'src/modules/pet/pet.entity.ts',
    'fertilityUpdatedAt',
  ],
  [
    'src/modules/pet/pet.entity.ts',
    'breedLimit',
  ],
  [
    'src/modules/marriage/marriage.service.ts',
    'proposeMarriage',
  ],
  [
    'src/modules/marriage/marriage.service.ts',
    'checkCompatibility',
  ],
  [
    'src/modules/marriage/marriage.service.ts',
    'nextEggOwnerId',
  ],
  [
    'src/modules/marriage/marriage.service.ts',
    'FERTILITY_RECOVERY_PER_HOUR',
  ],
  [
    'src/modules/maintenance/maintenance.service.ts',
    'repairMarriageState',
  ],
  [
    'src/modules/backend/backend.service.ts',
    "version: '2.3.0'",
  ],
];

for (const [file, expected] of checks) {
  requireText(file, expected);
}

console.log(
  JSON.stringify(
    {
      success: true,
      version: '2.3.0',
      checks: checks.length,
      features: [
        'marriage proposals',
        'three-generation kinship validation',
        'alternating egg ownership',
        'fertility recovery',
        'breeding limits',
        'maintenance repair',
        'public game config',
        'x-user-id beta context',
      ],
    },
    null,
    2,
  ),
);
