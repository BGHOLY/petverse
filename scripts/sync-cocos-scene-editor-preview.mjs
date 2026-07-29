import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../client/PetVerseClient');
const scenePath = path.join(projectRoot, 'assets/scenes/MainScene.scene');
const resourcesRoot = path.join(projectRoot, 'assets/resources');
const data = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

const nodeAt = (id) => data[id];
const nodes = data
    .map((entry, id) => ({ entry, id }))
    .filter(({ entry }) => entry?.__type__ === 'cc.Node');

const childByName = (parentId, name) => {
    const reference = (nodeAt(parentId)?._children || [])
        .find(({ __id__ }) => nodeAt(__id__)?._name === name);
    return reference?.__id__;
};

const requirePath = (...segments) => {
    let current = nodes.find(({ entry }) => entry._name === segments[0])?.id;
    if (current === undefined) throw new Error(`MainScene is missing "${segments[0]}".`);
    for (const segment of segments.slice(1)) {
        current = childByName(current, segment);
        if (current === undefined) throw new Error(`MainScene is missing "${segments.join('/')}".`);
    }
    return current;
};

const canvasId = requirePath('Canvas');
const rootId = requirePath('Canvas', 'PetVerseUIRoot');
const pageRootId = requirePath('Canvas', 'PetVerseUIRoot', 'PageRoot');

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
    requirePath('Canvas', 'PetVerseUIRoot', name);
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
    if (childByName(pageRootId, name) === undefined) {
        throw new Error(`MainScene is missing editor-owned page "PageRoot/${name}".`);
    }
}

for (const [directory, file] of [
    ['ui/home-v3', 'home-room-v3.png'],
    ['ui/home-v3', 'top-overlay-v3.png'],
    ['ui/home-v4', 'pet-nameplate-v4.png'],
]) {
    const assetPath = path.join(resourcesRoot, directory, file);
    const metaPath = `${assetPath}.meta`;
    if (!fs.existsSync(assetPath) || !fs.existsSync(metaPath)) {
        throw new Error(`Required Cocos asset or .meta is missing: ${path.relative(projectRoot, assetPath)}`);
    }
}

const mainUi = data.find((entry) => entry?.apiBaseUrl && entry?.node?.__id__ === canvasId);
if (!mainUi) throw new Error('MainUI component was not found on Canvas.');

const root = nodeAt(rootId);
const suspiciousEmptyNodes = (root?._children || [])
    .map(({ __id__ }) => nodeAt(__id__))
    .filter((node) => node && !(node._children || []).length && !(node._components || []).length)
    .map((node) => node._name);

if (suspiciousEmptyNodes.length) {
    console.warn(`Review empty root children manually (nothing was deleted): ${suspiciousEmptyNodes.join(', ')}`);
}

console.log('MainScene editor-owned UI validation passed.');
console.log('No nodes, transforms, anchors, sizes, layers, or assets were changed.');
