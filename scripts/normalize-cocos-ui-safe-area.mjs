import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const scenePath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scenes/MainScene.scene',
);
const records = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

function nodeAt(id) {
    const entry = records[id];
    if (!entry || entry.__type__ !== 'cc.Node') {
        throw new Error(`Serialized record ${id} is not a Cocos node.`);
    }
    return entry;
}

function nodeId(...segments) {
    let current = records.findIndex(
        (entry) => entry?.__type__ === 'cc.Node' && entry._name === segments[0],
    );
    if (current < 0) throw new Error(`Missing scene node "${segments[0]}".`);
    for (const segment of segments.slice(1)) {
        const reference = (nodeAt(current)._children || [])
            .find(({ __id__ }) => nodeAt(__id__)._name === segment);
        if (!reference) throw new Error(`Missing scene path "${segments.join('/')}".`);
        current = reference.__id__;
    }
    return current;
}

function transformAt(id) {
    const transform = (nodeAt(id)._components || [])
        .map(({ __id__ }) => records[__id__])
        .find((entry) => entry?.__type__ === 'cc.UITransform');
    if (!transform) throw new Error(`Missing UITransform on "${nodeAt(id)._name}".`);
    return transform;
}

function setRect(id, x, y, width, height) {
    const node = nodeAt(id);
    node._lpos = {
        __type__: 'cc.Vec3',
        x,
        y,
        z: Number(node._lpos?.z || 0),
    };
    transformAt(id)._contentSize = {
        __type__: 'cc.Size',
        width,
        height,
    };
}

const rootPath = ['Canvas', 'PetVerseUIRoot'];
const pageRootId = nodeId(...rootPath, 'PageRoot');
const bottomNavigationId = nodeId(...rootPath, 'BottomNavigation');
const pageCenterY = 39;
const pageHeight = 978;

setRect(pageRootId, 0, pageCenterY, 720, pageHeight);
setRect(bottomNavigationId, 0, -545, 720, 190);

const homePageId = nodeId(...rootPath, 'PageRoot', 'HomePage');
// Counter-shift the hand-authored home so its composition remains
// pixel-identical while the fixed navigation tray grows upward.
setRect(homePageId, 0, -32, 720, 1120);
for (const layerName of ['BackgroundLayer', 'StaticContent', 'RuntimeContent']) {
    setRect(nodeId(...rootPath, 'PageRoot', 'HomePage', layerName), 0, 0, 720, 1120);
}

for (const pageName of [
    'PetPage',
    'InventoryPage',
    'AdventurePage',
    'ShopPage',
    'HatcheryPage',
    'MorePage',
    'SecondaryPage',
]) {
    setRect(nodeId(...rootPath, 'PageRoot', pageName), 0, 0, 720, pageHeight);
    for (const layerName of ['PageBackground', 'StaticContent', 'RuntimeContent']) {
        setRect(
            nodeId(...rootPath, 'PageRoot', pageName, layerName),
            0,
            0,
            720,
            pageHeight,
        );
    }
}

fs.writeFileSync(scenePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log('Cocos 720x1280 safe-area geometry normalized.');
