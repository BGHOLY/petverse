import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../client/PetVerseClient');
const scenePath = path.join(projectRoot, 'assets/scenes/MainScene.scene');
const resourcesRoot = path.join(projectRoot, 'assets/resources');
const checkOnly = process.argv.includes('--check');

const data = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const nodeAt = (id) => data[id];
const nodes = data
    .map((entry, id) => ({ entry, id }))
    .filter(({ entry }) => entry?.__type__ === 'cc.Node');

const canvasRecord = nodes.find(({ entry }) => entry._name === 'Canvas');
if (!canvasRecord) throw new Error('Canvas node was not found in MainScene.scene.');

const rootRecord = nodes.find(({ entry }) => entry._name === 'PetVerseUIRoot' && entry._parent?.__id__ === canvasRecord.id);
if (!rootRecord) throw new Error('PetVerseUIRoot was not found under Canvas. Open MainScene once in Cocos before running this sync.');

let changes = 0;
const assign = (target, key, value) => {
    if (JSON.stringify(target[key]) === JSON.stringify(value)) return;
    target[key] = value;
    changes += 1;
};

const descendants = new Set();
const visit = (id) => {
    if (descendants.has(id)) return;
    descendants.add(id);
    const node = nodeAt(id);
    for (const child of node?._children || []) visit(child.__id__);
};
visit(rootRecord.id);

const canvasLayer = canvasRecord.entry._layer;
for (const id of descendants) assign(nodeAt(id), '_layer', canvasLayer);
assign(rootRecord.entry, '_active', true);

for (const name of ['bg', 'HomeLayer', 'PageLayer', 'ToastLayer']) {
    const legacy = nodes.find(({ entry }) => entry._name === name && entry._parent?.__id__ === canvasRecord.id);
    if (legacy) assign(legacy.entry, '_active', false);
}

const mainUi = data.find((entry) => entry?.apiBaseUrl && entry?.node?.__id__ === canvasRecord.id);
if (!mainUi) throw new Error('MainUI component was not found on Canvas.');
assign(mainUi, 'editorPreviewPage', 0);
assign(mainUi, 'pageContentOffsetX', 0);
assign(mainUi, 'pageContentOffsetY', 0);
assign(mainUi, 'pageContentScale', 1);
for (const page of ['pet', 'shop', 'inventory', 'hatchery']) {
    assign(mainUi, `${page}PageOffset`, { __type__: 'cc.Vec2', x: 0, y: 0 });
    assign(mainUi, `${page}PageScale`, 1);
}

const frameUuid = (resourcePath) => {
    const metaPath = ['png', 'jpg', 'jpeg', 'webp']
        .map((extension) => path.join(resourcesRoot, `${resourcePath}.${extension}.meta`))
        .find((candidate) => fs.existsSync(candidate));
    if (!metaPath) throw new Error(`Image metadata was not found for ${resourcePath}.`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const frame = Object.values(meta.subMetas || {}).find((entry) => entry.importer === 'sprite-frame');
    if (!frame?.uuid) throw new Error(`SpriteFrame metadata was not found for ${resourcePath}.`);
    return frame.uuid;
};

const artResources = new Map([
    ['HomeTopArt', 'ui/home-v3/top-overlay-v3'],
    ['RoomArt', 'ui/home-v3/home-room-v3'],
    ['HomePetArt', 'pet-art/PET001/home'],
    ['PetNameplateArt', 'ui/home-v4/pet-nameplate-v4'],
    ['ActivityArt_sign', 'ui/home-v4/activity-sign-v4'],
    ['ActivityArt_newcomer', 'ui/home-v4/activity-newcomer-v4'],
    ['ActivityArt_daily', 'ui/home-v4/activity-daily-v4'],
    ['ActivityArt_events', 'ui/home-v4/activity-events-v4'],
    ['ShortcutArt_adventure', 'ui/home-v4/shortcut-adventure-v4'],
    ['ShortcutArt_hatchery', 'ui/home-v4/shortcut-hatchery-v4'],
    ['ShortcutArt_formation', 'ui/home-v4/shortcut-formation-v4'],
    ['NavigationArt', 'ui/home-v4/bottom-navigation-v4'],
]);

const setSpriteFrame = (nodeId, resourcePath) => {
    const node = nodeAt(nodeId);
    const spriteRef = (node?._components || []).find((reference) => data[reference.__id__]?.__type__ === 'cc.Sprite');
    if (!spriteRef) throw new Error(`Sprite component was not found on ${node?._name || nodeId}.`);
    assign(data[spriteRef.__id__], '_spriteFrame', {
        __uuid__: frameUuid(resourcePath),
        __expectedType__: 'cc.SpriteFrame',
    });
};

for (const [nodeName, resourcePath] of artResources) {
    const record = nodes.find(({ id, entry }) => descendants.has(id) && entry._name === nodeName);
    if (!record) throw new Error(`Editor art node ${nodeName} was not found.`);
    setSpriteFrame(record.id, resourcePath);
}

const avatar = nodes.find(({ id, entry }) => descendants.has(id) && entry._name === 'Avatar');
const avatarSprite = avatar && (avatar.entry._children || [])
    .map((reference) => ({ id: reference.__id__, entry: nodeAt(reference.__id__) }))
    .find(({ entry }) => entry?._name === 'Sprite');
if (avatarSprite) setSpriteFrame(avatarSprite.id, 'cute-ui/player_avatar');

if (checkOnly) {
    if (changes) throw new Error(`MainScene editor preview is out of sync (${changes} changes required).`);
    console.log('MainScene editor preview is synchronized.');
} else if (changes) {
    fs.writeFileSync(scenePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`Synchronized MainScene editor preview (${changes} changes).`);
} else {
    console.log('MainScene editor preview was already synchronized.');
}
