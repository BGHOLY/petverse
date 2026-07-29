import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const clientRoot = path.join(repositoryRoot, 'client/PetVerseClient');
const scenePath = path.join(clientRoot, 'assets/scenes/MainScene.scene');
const scriptRoot = path.join(clientRoot, 'assets/scripts');
const listItemRoot = path.join(clientRoot, 'assets/resources/ui/list-items');

const failures = [];
const checks = [];

function check(condition, message) {
    if (condition) checks.push(message);
    else failures.push(message);
}

function read(relativePath) {
    return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function methodBody(source, signature) {
    const start = source.indexOf(signature);
    if (start < 0) return null;
    const open = source.indexOf('{', start);
    if (open < 0) return null;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] === '}') {
            depth -= 1;
            if (depth === 0) return source.slice(open + 1, index);
        }
    }
    return null;
}

const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const nodeAt = (id) => scene[id];
const sceneNodes = scene
    .map((entry, id) => ({ entry, id }))
    .filter(({ entry }) => entry?.__type__ === 'cc.Node');

function directChild(parentId, name) {
    const reference = (nodeAt(parentId)?._children || [])
        .find(({ __id__ }) => nodeAt(__id__)?._name === name);
    return reference?.__id__;
}

function requireScenePath(...segments) {
    let current = sceneNodes.find(({ entry }) => entry._name === segments[0])?.id;
    if (current === undefined) return false;
    for (const segment of segments.slice(1)) {
        current = directChild(current, segment);
        if (current === undefined) return false;
    }
    return true;
}

const rootSegments = ['Canvas', 'PetVerseUIRoot'];
for (const name of [
    'GlobalBackground',
    'TopBar',
    'PageRoot',
    'BottomNavigation',
    'DrawerLayer',
    'ModalLayer',
    'UtilityLayer',
    'BattleLayer',
    'RevealLayer',
    'GuideLayer',
    'ToastLayer',
    'LoadingLayer',
    'V10AudioDirector',
]) {
    check(requireScenePath(...rootSegments, name), `MainScene keeps ${name}`);
}

for (const name of [
    'HomePage',
    'PetPage',
    'InventoryPage',
    'AdventurePage',
    'ShopPage',
    'HatcheryPage',
    'MorePage',
    'SecondaryPage',
]) {
    check(requireScenePath(...rootSegments, 'PageRoot', name), `MainScene keeps PageRoot/${name}`);
}

check(requireScenePath(...rootSegments, 'TopBar', 'Reconnect'), 'MainScene keeps TopBar/Reconnect');

const fixedFiles = [
    'client/PetVerseClient/assets/scripts/ui/v2/AppShell.ts',
    'client/PetVerseClient/assets/scripts/ui/v2/pages/HomePage.ts',
    'client/PetVerseClient/assets/scripts/manager/PanelManager.ts',
    'client/PetVerseClient/assets/scripts/ui/prefab/DynamicListItemView.ts',
];
const forbiddenFixedMutations = [
    'new Node(',
    'removeAllChildren(',
    '.destroy(',
    'setPosition(',
    'setWorldPosition(',
    'setScale(',
    'setContentSize(',
    'setAnchorPoint(',
];

for (const relativePath of fixedFiles) {
    const source = read(relativePath);
    for (const token of forbiddenFixedMutations) {
        check(
            !source.includes(token),
            `${relativePath} does not use fixed-layout mutation ${token}`,
        );
    }
}

const mainUiPath = 'client/PetVerseClient/assets/scripts/ui/MainUI.ts';
const mainUi = read(mainUiPath);
check(!mainUi.includes('@executeInEditMode'), 'MainUI does not execute layout code in edit mode');

for (const signature of [
    'private bindEditorNodes()',
    'private renderTopBar()',
    'private renderBottomNav()',
    'private renderHome()',
]) {
    const body = methodBody(mainUi, signature);
    check(Boolean(body), `MainUI contains ${signature}`);
    if (!body) continue;
    for (const token of forbiddenFixedMutations) {
        check(!body.includes(token), `${signature} does not use ${token}`);
    }
}

const handPainted = read('client/PetVerseClient/assets/scripts/ui/v2/HandPaintedUi.ts');
const navBody = methodBody(handPainted, 'export function renderBottomNavigation(');
check(Boolean(navBody), 'HandPaintedUi contains renderBottomNavigation');
if (navBody) {
    for (const token of forbiddenFixedMutations) {
        check(!navBody.includes(token), `renderBottomNavigation does not use ${token}`);
    }
}

const listKinds = [
    'PetListItem',
    'InventoryItem',
    'ShopItem',
    'HatcheryEggItem',
    'SkillSlotItem',
    'FriendListItem',
    'RankingListItem',
];

for (const kind of listKinds) {
    const prefabPath = path.join(listItemRoot, `${kind}.prefab`);
    const metaPath = `${prefabPath}.meta`;
    check(fs.existsSync(prefabPath), `${kind}.prefab exists`);
    check(fs.existsSync(metaPath), `${kind}.prefab.meta exists`);
    if (!fs.existsSync(prefabPath)) continue;

    const prefab = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
    const invalidReferences = [];
    const visit = (value, location = '$') => {
        if (!value || typeof value !== 'object') return;
        if (Number.isInteger(value.__id__) && !prefab[value.__id__]) {
            invalidReferences.push(`${location} -> ${value.__id__}`);
        }
        if (Array.isArray(value)) {
            value.forEach((item, index) => visit(item, `${location}[${index}]`));
        } else {
            for (const [key, item] of Object.entries(value)) {
                visit(item, `${location}.${key}`);
            }
        }
    };
    visit(prefab);
    check(invalidReferences.length === 0, `${kind}.prefab has valid serialized references`);

    const nodeNames = new Set(
        prefab.filter((entry) => entry?.__type__ === 'cc.Node').map((entry) => entry._name),
    );
    for (const childName of ['NameLabel', 'CountLabel', 'Icon', 'MetaLabel']) {
        check(nodeNames.has(childName), `${kind}.prefab exposes ${childName}`);
    }
}

const prefabIntegration = new Map([
    ['PetListItem', 'client/PetVerseClient/assets/scripts/ui/v6/components/PetListItem.ts'],
    ['InventoryItem', 'client/PetVerseClient/assets/scripts/ui/v6/pages/InventoryPage.ts'],
    ['ShopItem', 'client/PetVerseClient/assets/scripts/ui/v6/pages/ShopPage.ts'],
    ['HatcheryEggItem', 'client/PetVerseClient/assets/scripts/ui/v6/pages/HatcheryPage.ts'],
    ['SkillSlotItem', 'client/PetVerseClient/assets/scripts/ui/v6/components/PetSkillPanel.ts'],
    ['FriendListItem', mainUiPath],
    ['RankingListItem', mainUiPath],
]);

for (const [kind, relativePath] of prefabIntegration) {
    check(
        read(relativePath).includes(`instantiateDynamicListItem('${kind}'`),
        `${kind} is instantiated through its Prefab registry`,
    );
}

const asyncSpriteSources = [
    'client/PetVerseClient/assets/scripts/ui/MainUI.ts',
    'client/PetVerseClient/assets/scripts/ui/v2/pages/HomePage.ts',
    'client/PetVerseClient/assets/scripts/ui/prefab/DynamicListItemView.ts',
];
for (const relativePath of asyncSpriteSources) {
    const source = read(relativePath);
    check(
        !/(?<!\?)\.node\.isValid\b/.test(source),
        `${relativePath} null-checks component.node before asynchronous isValid access`,
    );
}

const prefabRegistry = read('client/PetVerseClient/assets/scripts/ui/prefab/DynamicListPrefabRegistry.ts');
for (const guard of ['parent?.isValid', 'prefab?.isValid', 'view?.node?.isValid']) {
    check(
        prefabRegistry.includes(guard),
        `DynamicListPrefabRegistry guards ${guard}`,
    );
}

if (failures.length) {
    console.error(`Cocos UI architecture audit failed (${failures.length} issue(s)):\n`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Cocos UI architecture audit passed (${checks.length} checks).`);
    console.log('Fixed editor-owned UI has no runtime transform or reconstruction mutations.');
    console.log('Seven dynamic list item Prefabs exist and are connected to runtime data paths.');
}
