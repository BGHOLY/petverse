import crypto from 'node:crypto';
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

function directChildId(parentId, name) {
    const parent = nodeAt(parentId);
    return (parent._children || [])
        .map((reference) => reference.__id__)
        .find((id) => nodeAt(id)._name === name);
}

function requireDirectChildId(parentId, name) {
    const id = directChildId(parentId, name);
    if (id === undefined) {
        throw new Error(`Missing required node "${nodeAt(parentId)._name}/${name}".`);
    }
    return id;
}

function requireDirectChildFrom(parentIds, name) {
    for (const parentId of parentIds) {
        const id = directChildId(parentId, name);
        if (id !== undefined) return id;
    }
    throw new Error(
        `Missing required node "${name}" below: `
        + parentIds.map((id) => nodeAt(id)._name).join(', '),
    );
}

function randomCocosId() {
    return crypto.randomBytes(16).toString('base64').replace(/=+$/u, '');
}

function createContainer(parentId, name, width, height, active = true) {
    const existing = directChildId(parentId, name);
    if (existing !== undefined) return existing;

    const nodeId = records.length;
    const transformId = nodeId + 1;
    records.push(
        {
            __type__: 'cc.Node',
            _name: name,
            _objFlags: 0,
            __editorExtras__: {},
            _parent: { __id__: parentId },
            _children: [],
            _active: active,
            _components: [{ __id__: transformId }],
            _prefab: null,
            _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
            _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _mobility: 0,
            _layer: 33554432,
            _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            _id: randomCocosId(),
        },
        {
            __type__: 'cc.UITransform',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: { __id__: nodeId },
            _enabled: true,
            __prefab: null,
            _contentSize: { __type__: 'cc.Size', width, height },
            _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
            _id: randomCocosId(),
        },
    );
    nodeAt(parentId)._children.push({ __id__: nodeId });
    return nodeId;
}

function parentIdOf(nodeId) {
    return nodeAt(nodeId)._parent?.__id__;
}

function assertTranslationOnly(nodeId) {
    const node = nodeAt(nodeId);
    const rotation = node._lrot || {};
    const scale = node._lscale || {};
    const isIdentityRotation = Number(rotation.x || 0) === 0
        && Number(rotation.y || 0) === 0
        && Number(rotation.z || 0) === 0
        && Number(rotation.w ?? 1) === 1;
    const isIdentityScale = Number(scale.x ?? 1) === 1
        && Number(scale.y ?? 1) === 1
        && Number(scale.z ?? 1) === 1;
    if (!isIdentityRotation || !isIdentityScale) {
        throw new Error(
            `Cannot safely reparent "${node._name}": its parent chain contains rotation or scale.`,
        );
    }
}

function worldPosition(nodeId) {
    const position = { x: 0, y: 0, z: 0 };
    let currentId = nodeId;
    let isTargetNode = true;
    const visited = new Set();
    while (currentId !== undefined && currentId !== null) {
        if (visited.has(currentId)) throw new Error(`Cycle detected at serialized node ${currentId}.`);
        visited.add(currentId);
        // A node's own scale/rotation does not move its anchor. Ancestor
        // scale/rotation would affect its world position, so those must remain
        // identity for this hierarchy-only migration.
        if (!isTargetNode) assertTranslationOnly(currentId);
        const node = nodeAt(currentId);
        position.x += Number(node._lpos?.x || 0);
        position.y += Number(node._lpos?.y || 0);
        position.z += Number(node._lpos?.z || 0);
        isTargetNode = false;
        currentId = parentIdOf(currentId);
        if (currentId !== undefined && records[currentId]?.__type__ !== 'cc.Node') break;
    }
    return position;
}

function removeChildReference(parentId, childId) {
    const parent = nodeAt(parentId);
    parent._children = (parent._children || []).filter((reference) => reference.__id__ !== childId);
}

function movePreservingWorldPosition(nodeId, newParentId) {
    const node = nodeAt(nodeId);
    const currentParentId = parentIdOf(nodeId);
    if (currentParentId === newParentId) return;

    const before = worldPosition(nodeId);
    const newParentWorld = worldPosition(newParentId);
    if (currentParentId !== undefined) removeChildReference(currentParentId, nodeId);
    nodeAt(newParentId)._children.push({ __id__: nodeId });
    node._parent = { __id__: newParentId };
    node._lpos = {
        __type__: 'cc.Vec3',
        x: before.x - newParentWorld.x,
        y: before.y - newParentWorld.y,
        z: before.z - newParentWorld.z,
    };
}

function setChildOrder(parentId, childIds) {
    const unique = [...new Set(childIds)];
    if (unique.length !== childIds.length) {
        throw new Error(`Duplicate children requested for "${nodeAt(parentId)._name}".`);
    }
    const actual = new Set((nodeAt(parentId)._children || []).map((reference) => reference.__id__));
    for (const childId of unique) {
        if (!actual.has(childId) || parentIdOf(childId) !== parentId) {
            throw new Error(
                `"${nodeAt(childId)._name}" is not a direct child of "${nodeAt(parentId)._name}".`,
            );
        }
    }
    if (actual.size !== unique.length) {
        const omitted = [...actual]
            .filter((id) => !unique.includes(id))
            .map((id) => nodeAt(id)._name);
        throw new Error(
            `Child order for "${nodeAt(parentId)._name}" omitted: ${omitted.join(', ')}.`,
        );
    }
    nodeAt(parentId)._children = unique.map((id) => ({ __id__: id }));
}

function contentSize(nodeId) {
    const node = nodeAt(nodeId);
    const transform = (node._components || [])
        .map((reference) => records[reference.__id__])
        .find((component) => component?.__type__ === 'cc.UITransform');
    return {
        width: Number(transform?._contentSize?.width || 720),
        height: Number(transform?._contentSize?.height || 1280),
    };
}

function componentId(nodeId, type) {
    return (nodeAt(nodeId)._components || [])
        .map((reference) => reference.__id__)
        .find((id) => records[id]?.__type__ === type);
}

function requireComponentId(nodeId, type) {
    const id = componentId(nodeId, type);
    if (id === undefined) {
        throw new Error(`Missing ${type} on "${nodeAt(nodeId)._name}".`);
    }
    return id;
}

function reference(id) {
    return { __id__: id };
}

function snapshotExistingNodes() {
    return new Map(
        records
            .map((entry, id) => ({ entry, id }))
            .filter(({ entry }) => entry?.__type__ === 'cc.Node')
            .map(({ entry, id }) => [
                entry._id,
                {
                    name: entry._name,
                    position: worldPosition(id),
                    rotation: structuredClone(entry._lrot),
                    scale: structuredClone(entry._lscale),
                },
            ]),
    );
}

function assertExistingTransformsUnchanged(before) {
    for (const [stableId, expected] of before) {
        const id = records.findIndex(
            (entry) => entry?.__type__ === 'cc.Node' && entry._id === stableId,
        );
        if (id < 0) throw new Error(`Existing node "${expected.name}" was deleted.`);
        const actualPosition = worldPosition(id);
        if (JSON.stringify(actualPosition) !== JSON.stringify(expected.position)) {
            throw new Error(
                `World position changed for "${expected.name}": `
                + `${JSON.stringify(expected.position)} -> ${JSON.stringify(actualPosition)}.`,
            );
        }
        const node = nodeAt(id);
        if (JSON.stringify(node._lrot) !== JSON.stringify(expected.rotation)) {
            throw new Error(`Rotation changed for existing node "${expected.name}".`);
        }
        if (JSON.stringify(node._lscale) !== JSON.stringify(expected.scale)) {
            throw new Error(`Scale changed for existing node "${expected.name}".`);
        }
    }
}

const before = snapshotExistingNodes();
const canvasId = records.findIndex(
    (entry) => entry?.__type__ === 'cc.Node' && entry._name === 'Canvas',
);
const rootId = requireDirectChildId(canvasId, 'PetVerseUIRoot');
const globalBackgroundId = requireDirectChildId(rootId, 'GlobalBackground');
const topBarId = requireDirectChildId(rootId, 'TopBar');
const bottomNavigationId = requireDirectChildId(rootId, 'BottomNavigation');
const pageRootId = directChildId(rootId, 'PageRoot')
    ?? requireDirectChildId(topBarId, 'PageRoot');

movePreservingWorldPosition(pageRootId, rootId);

const rootSize = contentSize(rootId);
const overlayRootId = createContainer(
    rootId,
    'OverlayRoot',
    rootSize.width,
    rootSize.height,
);
const fullScreenRootId = createContainer(
    rootId,
    'FullScreenRoot',
    rootSize.width,
    rootSize.height,
);
const systemRootId = createContainer(
    rootId,
    'SystemRoot',
    rootSize.width,
    rootSize.height,
);

const reconnectId = requireDirectChildFrom([overlayRootId, topBarId], 'Reconnect');
const overlayNames = [
    'Reconnect',
    'DrawerLayer',
    'ModalLayer',
    'UtilityLayer',
    'RevealLayer',
    'GuideLayer',
    'ToastLayer',
    'LoadingLayer',
];
const overlayIds = overlayNames.map((name) => {
    const id = name === 'Reconnect'
        ? reconnectId
        : requireDirectChildFrom([overlayRootId, rootId], name);
    movePreservingWorldPosition(id, overlayRootId);
    return id;
});

const battleLayerId = requireDirectChildFrom([fullScreenRootId, rootId], 'BattleLayer');
movePreservingWorldPosition(battleLayerId, fullScreenRootId);
const audioDirectorId = requireDirectChildFrom([systemRootId, rootId], 'V10AudioDirector');
movePreservingWorldPosition(audioDirectorId, systemRootId);

const homePageId = requireDirectChildId(pageRootId, 'HomePage');
const homeSize = contentSize(homePageId);
const backgroundLayerId = createContainer(
    homePageId,
    'BackgroundLayer',
    homeSize.width,
    homeSize.height,
);
const staticContentId = createContainer(
    homePageId,
    'StaticContent',
    homeSize.width,
    homeSize.height,
);
const homeRuntimeContentId = createContainer(
    homePageId,
    'RuntimeContent',
    homeSize.width,
    homeSize.height,
);

const roomArtId = requireDirectChildFrom([backgroundLayerId, homePageId], 'RoomArt');
movePreservingWorldPosition(roomArtId, backgroundLayerId);
for (const childId of [...nodeAt(homePageId)._children.map((reference) => reference.__id__)]) {
    if ([backgroundLayerId, staticContentId, homeRuntimeContentId].includes(childId)) continue;
    movePreservingWorldPosition(childId, staticContentId);
}
setChildOrder(backgroundLayerId, [roomArtId]);
setChildOrder(homePageId, [backgroundLayerId, staticContentId, homeRuntimeContentId]);

const ordinaryPageNames = [
    'PetPage',
    'InventoryPage',
    'AdventurePage',
    'ShopPage',
    'HatcheryPage',
    'MorePage',
    'SecondaryPage',
];
for (const pageName of ordinaryPageNames) {
    const pageId = requireDirectChildId(pageRootId, pageName);
    const pageSize = contentSize(pageId);
    const pageBackgroundId = createContainer(
        pageId,
        'PageBackground',
        pageSize.width,
        pageSize.height,
    );
    const pageStaticContentId = createContainer(
        pageId,
        'StaticContent',
        pageSize.width,
        pageSize.height,
    );
    const runtimeContentId = createContainer(
        pageId,
        'RuntimeContent',
        pageSize.width,
        pageSize.height,
    );
    for (const childId of [...nodeAt(pageId)._children.map((reference) => reference.__id__)]) {
        if ([pageBackgroundId, pageStaticContentId, runtimeContentId].includes(childId)) continue;
        movePreservingWorldPosition(childId, pageStaticContentId);
    }
    setChildOrder(pageId, [pageBackgroundId, pageStaticContentId, runtimeContentId]);
}

setChildOrder(overlayRootId, overlayIds);
setChildOrder(fullScreenRootId, [battleLayerId]);
setChildOrder(systemRootId, [audioDirectorId]);
setChildOrder(rootId, [
    globalBackgroundId,
    pageRootId,
    topBarId,
    bottomNavigationId,
    overlayRootId,
    fullScreenRootId,
    systemRootId,
]);

const mainUiComponentId = (nodeAt(canvasId)._components || [])
    .map((entry) => entry.__id__)
    .find((id) => Object.hasOwn(records[id] || {}, 'apiBaseUrl'));
const panelManagerComponentId = (nodeAt(canvasId)._components || [])
    .map((entry) => entry.__id__)
    .find((id) => Object.hasOwn(records[id] || {}, 'secondaryPage'));
if (mainUiComponentId === undefined || panelManagerComponentId === undefined) {
    throw new Error('MainUI or PanelManager component is missing from Canvas.');
}

const mainUi = records[mainUiComponentId];
mainUi.root = reference(rootId);
mainUi.topBar = reference(topBarId);
mainUi.pageHost = reference(pageRootId);
mainUi.bottomNav = reference(bottomNavigationId);
mainUi.homePage = reference(homePageId);
mainUi.nicknameLabel = reference(requireComponentId(
    requireDirectChildId(topBarId, 'Nickname'),
    'cc.Label',
));
mainUi.levelLabel = reference(requireComponentId(
    requireDirectChildId(topBarId, 'Level'),
    'cc.Label',
));
mainUi.vipLabel = reference(requireComponentId(
    requireDirectChildId(topBarId, 'Vip'),
    'cc.Label',
));
mainUi.goldLabel = reference(requireComponentId(
    requireDirectChildId(topBarId, 'GoldValue'),
    'cc.Label',
));
mainUi.diamondLabel = reference(requireComponentId(
    requireDirectChildId(topBarId, 'DiamondValue'),
    'cc.Label',
));
mainUi.goldButton = reference(requireComponentId(
    requireDirectChildId(topBarId, 'Gold'),
    'cc.Button',
));
mainUi.diamondButton = reference(requireComponentId(
    requireDirectChildId(topBarId, 'Diamond'),
    'cc.Button',
));
mainUi.reconnectButton = reference(requireComponentId(reconnectId, 'cc.Button'));
mainUi.homePetSprite = reference(requireComponentId(
    requireDirectChildId(staticContentId, 'HomePetArt'),
    'cc.Sprite',
));
mainUi.homePetNameLabel = reference(requireComponentId(
    requireDirectChildId(staticContentId, 'PetName'),
    'cc.Label',
));
mainUi.homePetMetaLabel = reference(requireComponentId(
    requireDirectChildId(staticContentId, 'PetMeta'),
    'cc.Label',
));
mainUi.switchPetButton = reference(requireComponentId(
    requireDirectChildId(staticContentId, 'SwitchPet'),
    'cc.Button',
));
mainUi.petTouchButton = reference(requireComponentId(
    requireDirectChildId(staticContentId, 'PetTouchArea'),
    'cc.Button',
));
mainUi.homeActivityButtons = ['sign', 'newcomer', 'daily', 'events'].map((key) => (
    reference(requireComponentId(
        requireDirectChildId(staticContentId, `Activity_${key}`),
        'cc.Button',
    ))
));
mainUi.homeShortcutButtons = ['adventure', 'hatchery', 'formation'].map((key) => (
    reference(requireComponentId(
        requireDirectChildId(staticContentId, `Shortcut_${key}`),
        'cc.Button',
    ))
));
mainUi.navigationButtons = ['home', 'pet', 'adventure', 'shop', 'more'].map((key) => (
    reference(requireComponentId(
        requireDirectChildId(bottomNavigationId, `Tab_${key}`),
        'cc.Button',
    ))
));

const panelManager = records[panelManagerComponentId];
for (const [propertyName, nodeName] of [
    ['homePage', 'HomePage'],
    ['petPage', 'PetPage'],
    ['inventoryPage', 'InventoryPage'],
    ['adventurePage', 'AdventurePage'],
    ['shopPage', 'ShopPage'],
    ['hatcheryPage', 'HatcheryPage'],
    ['morePage', 'MorePage'],
    ['secondaryPage', 'SecondaryPage'],
]) {
    panelManager[propertyName] = reference(requireDirectChildId(pageRootId, nodeName));
}

assertExistingTransformsUnchanged(before);
fs.writeFileSync(scenePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

console.log('MainScene hierarchy normalized without changing existing node world transforms.');
