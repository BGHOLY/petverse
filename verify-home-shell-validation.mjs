import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const checks = [];

function read(relativePath) {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) throw new Error(`Missing file: ${relativePath}`);
    return readFileSync(absolutePath, 'utf8');
}

function assert(name, condition, details = '') {
    if (!condition) throw new Error(`${name}${details ? `: ${details}` : ''}`);
    checks.push(name);
}

const scenePath = 'client/PetVerseClient/assets/scenes/HomeShellValidation.scene';
const scene = JSON.parse(read(scenePath));
const sceneNodes = scene.filter((record) => record?.__type__ === 'cc.Node');
const names = new Set(sceneNodes.map((record) => record._name));

for (const name of [
    'Canvas',
    'GameRoot',
    'BackgroundLayer',
    'Pet3DLayer',
    'MainHudLayer',
    'PageLayer',
    'PopupLayer',
    'ToastLayer',
    'GuideLayer',
    'LoadingLayer',
]) {
    assert(`validation scene contains ${name}`, names.has(name));
}

const canvas = sceneNodes.find((record) => record._name === 'Canvas');
const canvasComponents = (canvas?._components || []).map((reference) => scene[reference.__id__]);
const canvasTransform = canvasComponents.find((record) => record?.__type__ === 'cc.UITransform');
assert(
    'validation Canvas is 720x1280',
    canvasTransform?._contentSize?.width === 720 && canvasTransform?._contentSize?.height === 1280,
);

const prefabSpecs = [
    ['TopBar', 720, 140],
    ['BottomNavigation', 720, 205],
    ['HomePage', 720, 1010],
];
for (const [name, width, height] of prefabSpecs) {
    const path = `client/PetVerseClient/assets/resources/ui-prefabs/${name}.prefab`;
    const prefab = JSON.parse(read(path));
    assert(`${name} prefab root is named correctly`, prefab[1]?._name === name);
    const transform = prefab.find((record) => record?.__type__ === 'cc.UITransform');
    assert(
        `${name} prefab has expected size`,
        transform?._contentSize?.width === width && transform?._contentSize?.height === height,
    );
    assert(`${name} prefab has a view component`, prefab.some((record) => (
        typeof record?.__type__ === 'string'
        && record.__type__ !== 'cc.Prefab'
        && record.__type__ !== 'cc.Node'
        && record.__type__ !== 'cc.UITransform'
        && record.__type__ !== 'cc.PrefabInfo'
        && record.__type__ !== 'cc.CompPrefabInfo'
    )));
}

const requiredAssets = [
    'client/PetVerseClient/assets/resources/ui/home-v3/home-room-v3.png',
    'client/PetVerseClient/assets/resources/ui/home-v3/top-overlay-v3.png',
    'client/PetVerseClient/assets/resources/ui/home-v4/pet-nameplate-v4.png',
    'client/PetVerseClient/assets/resources/cute-ui/player_avatar.jpg',
];
for (let index = 1; index <= 5; index += 1) {
    requiredAssets.push(
        `client/PetVerseClient/assets/resources/pet-art/PET${String(index).padStart(3, '0')}/thumb.png`,
    );
}
requiredAssets.push('client/PetVerseClient/assets/resources/pet-art/PET001/home.png');
for (const path of requiredAssets) assert(`formal asset exists: ${path}`, existsSync(join(root, path)));

const shellCode = read('client/PetVerseClient/assets/scripts/ui/home-validation/HomeShellValidation.ts');
assert('shell keeps a 2D pet fallback', shellCode.includes('PetArtwork2DFallback'));
assert('shell reserves a Pet3D layer', shellCode.includes("'Pet3DLayer'"));
assert('shell uses the single home-room background', shellCode.includes("'ui/home-v3/home-room-v3'"));
assert('shell no longer renders low-fi rounded background panels', !shellCode.includes('rounded('));
assert('shell does not use lateUpdate layer forcing', !shellCode.includes('lateUpdate'));

const navCode = read('client/PetVerseClient/assets/scripts/ui/home-validation/BottomNavigationView.ts');
const tabKeys = [...navCode.matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]);
assert(
    'bottom navigation keeps the confirmed five independent tabs',
    JSON.stringify(tabKeys) === JSON.stringify(['home', 'pet', 'adventure', 'hatchery', 'shop']),
    tabKeys.join(', '),
);
for (const title of ['首页', '宠物', '冒险', '孵化', '商店']) {
    assert(`bottom navigation contains ${title}`, navCode.includes(`title: '${title}'`));
}
assert('bottom navigation removes the More entry', !navCode.includes('更多'));
assert('bottom navigation does not reuse the wrong composite artwork', !navCode.includes('bottom-navigation-v4'));

const homeCode = read('client/PetVerseClient/assets/scripts/ui/home-validation/HomePageView.ts');
for (const nodeName of [
    'LeftEntryColumn',
    'RightEntryColumn',
    'MainQuestEntry',
    'ActivityEntry',
    'FriendEntry',
    'BondEntry',
    'MailEntry',
]) {
    assert(`HomePage defines ${nodeName}`, homeCode.includes(`'${nodeName}'`));
}
for (const removedName of ['AdventureEntry', 'HatcheryEntry', 'FormationEntry', 'NewcomerEntry']) {
    assert(`HomePage removes duplicate ${removedName}`, !homeCode.includes(`'${removedName}'`));
}
assert('HomePage keeps the independent pet nameplate asset', homeCode.includes('pet-nameplate-v4'));
assert('HomePage shows element role and level metadata', homeCode.includes('火系 · 输出型 · Lv.12'));
assert('HomePage marks the display pet as secondary information', homeCode.includes('展示主宠'));
assert('HomePage defines exactly five team slots', homeCode.includes('index < 5'));
assert('HomePage uses PET001-PET005 thumbnails', homeCode.includes('padStart(3'));
assert('HomePage uses equal team portrait sizes', !homeCode.includes("index === 0 ? 68"));
assert('HomePage labels the strip as battle lineup', homeCode.includes('出战阵容'));
assert('HomePage has a separate adventure CTA', homeCode.includes("'AdventureCTA'"));

const topBarCode = read('client/PetVerseClient/assets/scripts/ui/home-validation/TopBarView.ts');
assert('TopBar uses a player avatar rather than a pet portrait', topBarCode.includes("'cute-ui/player_avatar'"));
assert('TopBar does not use PET001 as player avatar', !topBarCode.includes("'pet-art/PET001/thumb'"));

console.log(`HomeShell formal visual validation passed: ${checks.length} checks`);
for (const check of checks) console.log(`- ${check}`);
