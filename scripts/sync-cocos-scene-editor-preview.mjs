import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../client/PetVerseClient');
const scenePath = path.join(projectRoot, 'assets/scenes/MainScene.scene');
const resourcesRoot = path.join(projectRoot, 'assets/resources');
const checkOnly = process.argv.includes('--check');
const previewArgumentIndex = process.argv.indexOf('--preview');
const previewPageName = previewArgumentIndex >= 0
    ? String(process.argv[previewArgumentIndex + 1] || '').toLowerCase()
    : '';
const previewPageValues = {
    home: 0,
    pet: 1,
    shop: 2,
    inventory: 3,
    hatchery: 4,
    adventure: 5,
};

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
if (previewPageName) {
    if (!(previewPageName in previewPageValues)) {
        throw new Error(`Unknown editor preview page: ${previewPageName}`);
    }
    assign(mainUi, 'editorPreviewPage', previewPageValues[previewPageName]);
}
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

const childByName = (parentId, name) => {
    const parent = nodeAt(parentId);
    const reference = (parent?._children || []).find(({ __id__ }) => nodeAt(__id__)?._name === name);
    return reference?.__id__;
};

const nodeTemplate = (name, parentId, layer, x, y, active) => ({
    __type__: 'cc.Node',
    _name: name,
    _objFlags: 0,
    __editorExtras__: {},
    _parent: { __id__: parentId },
    _children: [],
    _active: active,
    _components: [],
    _prefab: null,
    _lpos: { __type__: 'cc.Vec3', x, y, z: 0 },
    _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
    _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
    _mobility: 0,
    _layer: layer,
    _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
    _id: `petverse-scene-node-${data.length}-${name}`,
});

const transformTemplate = (nodeId, width, height) => ({
    __type__: 'cc.UITransform',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: nodeId },
    _enabled: true,
    __prefab: null,
    _contentSize: { __type__: 'cc.Size', width, height },
    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
    _id: `petverse-scene-transform-${nodeId}`,
});

const ensureLayoutNode = (parentId, name, x, y, width, height, active = true) => {
    let nodeId = childByName(parentId, name);
    if (nodeId === undefined) {
        nodeId = data.length;
        const parent = nodeAt(parentId);
        const node = nodeTemplate(name, parentId, parent?._layer ?? canvasLayer, x, y, active);
        data.push(node);
        const transformId = data.length;
        data.push(transformTemplate(nodeId, width, height));
        node._components.push({ __id__: transformId });
        parent._children.push({ __id__: nodeId });
        changes += 1;
    }
    const node = nodeAt(nodeId);
    assign(node, '_active', active);
    assign(node, '_layer', nodeAt(parentId)?._layer ?? canvasLayer);
    assign(node, '_lpos', { __type__: 'cc.Vec3', x, y, z: 0 });
    let transformReference = (node._components || []).find(({ __id__ }) => nodeAt(__id__)?.__type__ === 'cc.UITransform');
    if (!transformReference) {
        const transformId = data.length;
        data.push(transformTemplate(nodeId, width, height));
        node._components.push({ __id__: transformId });
        transformReference = { __id__: transformId };
        changes += 1;
    }
    assign(nodeAt(transformReference.__id__), '_contentSize', { __type__: 'cc.Size', width, height });
    return nodeId;
};

const spriteTemplate = (nodeId, resourcePath) => ({
    __type__: 'cc.Sprite',
    _name: '',
    _objFlags: 0,
    __editorExtras__: {},
    node: { __id__: nodeId },
    _enabled: true,
    __prefab: null,
    _customMaterial: null,
    _srcBlendFactor: 2,
    _dstBlendFactor: 4,
    _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
    _spriteFrame: { __uuid__: frameUuid(resourcePath), __expectedType__: 'cc.SpriteFrame' },
    _type: 0,
    _fillType: 0,
    _sizeMode: 0,
    _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 },
    _fillStart: 0,
    _fillRange: 0,
    _isTrimmedMode: true,
    _useGrayscale: false,
    _atlas: null,
    _id: `petverse-scene-sprite-${nodeId}`,
});

const ensureArtNode = (parentId, name, resourcePath) => {
    const nodeId = ensureLayoutNode(parentId, name, 0, 0, 720, 1010, true);
    const node = nodeAt(nodeId);
    let spriteReference = (node._components || []).find(({ __id__ }) => nodeAt(__id__)?.__type__ === 'cc.Sprite');
    if (!spriteReference) {
        const spriteId = data.length;
        data.push(spriteTemplate(nodeId, resourcePath));
        node._components.push({ __id__: spriteId });
        spriteReference = { __id__: spriteId };
        changes += 1;
    }
    assign(nodeAt(spriteReference.__id__), '_spriteFrame', {
        __uuid__: frameUuid(resourcePath),
        __expectedType__: 'cc.SpriteFrame',
    });
    return nodeId;
};

const pageRootRecord = data
    .map((entry, id) => ({ entry, id }))
    .find(({ entry }) => entry?.__type__ === 'cc.Node' && entry._name === 'PageRoot' && entry._parent?.__id__ === rootRecord.id);
if (!pageRootRecord) throw new Error('PageRoot was not found under PetVerseUIRoot.');

const editorPages = [
    {
        name: 'PetPage', artName: 'PetDetailArt', art: 'ui/pet-v3/pet-detail-page-v3',
        anchors: [
            ['PetRosterSurface', -280, 18, 136, 790],
            ['Profile', -105, 42, 192, 720],
            ['ResearchData', 174, 42, 332, 720],
            ['Toolbar', 0, -403, 660, 62],
        ],
    },
    {
        name: 'InventoryPage', artName: 'InventoryPageArt', art: 'ui/inventory-v3/inventory-page-v3',
        anchors: [
            ['BagTitleBoard', -150, 371, 270, 78],
            ['CategoryTabs', 0, 270, 608, 62],
            ['UseTarget', 0, 214, 608, 48],
            ['InventoryGridPaper', 0, -66, 608, 490],
            ['BagFooter', 0, -378, 608, 58],
        ],
    },
    {
        name: 'ShopPage', artName: 'ShopPageArt', art: 'ui/shop-v3/shop-page-v3',
        anchors: [
            ['ShopSign', -193, 378, 244, 82],
            ['WalletBoard', 95, 385, 314, 58],
            ['RefreshTag', 272, 268, 88, 92],
            ['ShopCategoryRail', -263, -78, 112, 572],
            ['ProductLedger', 69, 38, 492, 350],
            ['ShopDetail', 69, -286, 492, 138],
        ],
    },
    {
        name: 'HatcheryPage', artName: 'HatcheryPageArt', art: 'ui/hatchery-v3/hatchery-page-v3',
        anchors: [
            ['TitleBoard', -200, 380, 248, 82],
            ['Device_1', -214, 164, 202, 300],
            ['Device_2', 0, 164, 202, 300],
            ['Device_3', 214, 164, 202, 300],
            ['Warehouse', 0, -210, 620, 348],
            ['EggPager', 0, -420, 176, 42],
        ],
    },
];

for (const page of editorPages) {
    const pageId = ensureLayoutNode(pageRootRecord.id, page.name, 0, 0, 720, 1010, false);
    ensureArtNode(pageId, page.artName, page.art);
    for (const [name, x, y, width, height] of page.anchors) {
        ensureLayoutNode(pageId, name, x, y, width, height, true);
    }
}

const pageNames = ['HomePage', 'PetPage', 'InventoryPage', 'AdventurePage', 'ShopPage', 'HatcheryPage', 'MorePage', 'SecondaryPage'];
for (const name of pageNames) {
    const pageId = childByName(pageRootRecord.id, name);
    if (pageId !== undefined) assign(nodeAt(pageId), '_active', name === 'HomePage');
}

// Remove the pre-v6 scene hierarchy instead of merely hiding it. The active
// interface is rendered exclusively under PetVerseUIRoot, so keeping the old
// bg/HomeLayer/PageLayer/ToastLayer subtrees makes the editor misleading and
// risks accidental edits to nodes that never appear in preview.
const legacyRootIds = new Set(
    (canvasRecord.entry._children || [])
        .map((reference) => reference.__id__)
        .filter((id) => ['bg', 'HomeLayer', 'PageLayer', 'ToastLayer'].includes(nodeAt(id)?._name)),
);

if (legacyRootIds.size) {
    const removedIds = new Set();
    const collectNodeRecords = (nodeId) => {
        if (removedIds.has(nodeId)) return;
        const node = nodeAt(nodeId);
        removedIds.add(nodeId);
        for (const reference of node?._components || []) removedIds.add(reference.__id__);
        for (const reference of node?._children || []) collectNodeRecords(reference.__id__);
    };
    for (const id of legacyRootIds) collectNodeRecords(id);

    canvasRecord.entry._children = (canvasRecord.entry._children || [])
        .filter((reference) => !legacyRootIds.has(reference.__id__));

    const oldToNew = new Map();
    const compacted = [];
    data.forEach((entry, oldId) => {
        if (removedIds.has(oldId)) return;
        oldToNew.set(oldId, compacted.length);
        compacted.push(entry);
    });

    const remapReferences = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(remapReferences);
            return;
        }
        if (Object.prototype.hasOwnProperty.call(value, '__id__')) {
            const mapped = oldToNew.get(value.__id__);
            if (mapped === undefined) throw new Error(`Dangling scene reference to removed record ${value.__id__}.`);
            value.__id__ = mapped;
        }
        Object.values(value).forEach(remapReferences);
    };
    compacted.forEach(remapReferences);
    data.splice(0, data.length, ...compacted);
    changes += removedIds.size;
}

if (checkOnly) {
    if (changes) throw new Error(`MainScene editor preview is out of sync (${changes} changes required).`);
    console.log('MainScene editor preview is synchronized.');
} else if (changes) {
    fs.writeFileSync(scenePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    console.log(`Synchronized MainScene editor preview (${changes} changes).`);
} else {
    console.log('MainScene editor preview was already synchronized.');
}
