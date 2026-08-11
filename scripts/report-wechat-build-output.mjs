import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const buildRoot = resolve(root, 'client/PetVerseClient/build/wechatgame-v12');
const strict = process.argv.includes('--strict');
const MIB = 1024 * 1024;
const LOCAL_PACKAGE_LIMIT = 20 * MIB;

if (!existsSync(buildRoot)) {
  console.error(`WeChat build output is missing: ${buildRoot}`);
  process.exit(1);
}

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else files.push({ path: relative(buildRoot, absolute), bytes: statSync(absolute).size });
  }
};
walk(buildRoot);

const sum = (items) => items.reduce((total, item) => total + item.bytes, 0);
const totalBytes = sum(files);
const assetBytes = sum(files.filter((file) => /^assets[\\/]/.test(file.path)));
const engineBytes = sum(files.filter((file) => /^cocos-js[\\/]/.test(file.path)));
const runtimeBytes = totalBytes - assetBytes;
const fitsLocalPackage = totalBytes <= LOCAL_PACKAGE_LIMIT;
const mib = (bytes) => (bytes / MIB).toFixed(2);

console.log('PetVerse WeChat build output report');
console.log(`- Files: ${files.length}`);
console.log(`- Local package: ${mib(totalBytes)} MiB`);
console.log(`- Runtime without assets: ${mib(runtimeBytes)} MiB`);
console.log(`- Cocos engine: ${mib(engineBytes)} MiB`);
console.log(`- Local assets: ${mib(assetBytes)} MiB`);
console.log(`- Conservative 20 MiB upload gate: ${fitsLocalPackage ? 'PASS' : 'BLOCKED'}`);

if (!fitsLocalPackage) {
  console.warn('Remote asset bundles/CDN are required before a production WeChat upload.');
  if (strict) process.exitCode = 2;
}
