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

function directChildId(parentId, name) {
    return (nodeAt(parentId)._children || [])
        .map(({ __id__ }) => __id__)
        .find((id) => nodeAt(id)._name === name);
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

function randomCocosId() {
    return crypto.randomBytes(16).toString('base64').replace(/=+$/u, '');
}

function collectSubtree(rootId) {
    const collected = [];
    const queue = [rootId];
    const visited = new Set();
    while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        collected.push(id);
        const entry = records[id];
        if (entry?.__type__ !== 'cc.Node') continue;
        for (const reference of entry._children || []) queue.push(reference.__id__);
        for (const reference of entry._components || []) queue.push(reference.__id__);
    }
    return collected;
}

function cloneSubtree(rootId, newParentId, newName) {
    const sourceIds = collectSubtree(rootId);
    const mapping = new Map(sourceIds.map((id, offset) => [id, records.length + offset]));
    const clones = sourceIds.map((id) => structuredClone(records[id]));
    const remap = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(remap);
            return;
        }
        if (typeof value.__id__ === 'number' && mapping.has(value.__id__)) {
            value.__id__ = mapping.get(value.__id__);
        }
        for (const child of Object.values(value)) remap(child);
    };
    clones.forEach((clone) => {
        remap(clone);
        if (clone?._id !== undefined) clone._id = randomCocosId();
    });
    records.push(...clones);

    const clonedRootId = mapping.get(rootId);
    const clonedRoot = nodeAt(clonedRootId);
    clonedRoot._name = newName;
    clonedRoot._parent = { __id__: newParentId };
    clonedRoot._active = false;
    return clonedRootId;
}

const rootPath = ['Canvas', 'PetVerseUIRoot'];
const bottomNavigationId = nodeId(...rootPath, 'BottomNavigation');
const navigationArtId = nodeId(...rootPath, 'BottomNavigation', 'NavigationArt');
setRect(navigationArtId, 0, 0, 720, 150);

const tabLayout = {
    home: { x: -268, y: 0, width: 112, height: 102 },
    pet: { x: -134, y: 0, width: 112, height: 102 },
    adventure: { x: 0, y: 12, width: 138, height: 132 },
    shop: { x: 134, y: 0, width: 112, height: 102 },
    more: { x: 268, y: 0, width: 112, height: 102 },
};

for (const [key, geometry] of Object.entries(tabLayout)) {
    setRect(
        nodeId(...rootPath, 'BottomNavigation', `Tab_${key}`),
        geometry.x,
        geometry.y,
        geometry.width,
        geometry.height,
    );
}

const selectedHomeId = nodeId(...rootPath, 'BottomNavigation', 'Selected_home');
const selectedIds = [selectedHomeId];
for (const key of ['pet', 'adventure', 'shop', 'more']) {
    let selectedId = directChildId(bottomNavigationId, `Selected_${key}`);
    if (selectedId === undefined) {
        selectedId = cloneSubtree(selectedHomeId, bottomNavigationId, `Selected_${key}`);
        nodeAt(bottomNavigationId)._children.push({ __id__: selectedId });
    }
    selectedIds.push(selectedId);
}

for (const [index, key] of ['home', 'pet', 'adventure', 'shop', 'more'].entries()) {
    const selectedId = selectedIds[index];
    const geometry = tabLayout[key];
    setRect(selectedId, geometry.x, geometry.y, 112, 102);
    nodeAt(selectedId)._active = key === 'home';
}

const navChildren = nodeAt(bottomNavigationId)._children.map(({ __id__ }) => __id__);
const fixedOrder = [
    navigationArtId,
    ...selectedIds,
    ...['home', 'pet', 'adventure', 'shop', 'more']
        .map((key) => nodeId(...rootPath, 'BottomNavigation', `Tab_${key}`)),
];
const remaining = navChildren.filter((id) => !fixedOrder.includes(id));
nodeAt(bottomNavigationId)._children = [...fixedOrder, ...remaining].map((id) => ({ __id__: id }));

const homePath = [...rootPath, 'PageRoot', 'HomePage', 'StaticContent'];
const sideRows = {
    sign: 220,
    daily: 70,
    events: -80,
};
for (const [key, y] of Object.entries(sideRows)) {
    setRect(nodeId(...homePath, `ActivityArt_${key}`), -306, y, 92, 102);
    setRect(nodeId(...homePath, `Activity_${key}`), -306, y, 100, 112);
}
for (const [key, y] of Object.entries({
    adventure: 220,
    hatchery: 70,
    formation: -80,
})) {
    setRect(nodeId(...homePath, `ShortcutArt_${key}`), 306, y, 92, 102);
    setRect(nodeId(...homePath, `Shortcut_${key}`), 306, y, 100, 112);
}

for (const name of ['ActivityArt_newcomer', 'Activity_newcomer']) {
    nodeAt(nodeId(...homePath, name))._active = false;
}

for (const [name, x, y] of [
    ['HomePetArt', 0, -108],
    ['PetTouchArea', 0, -108],
    ['PetNameplateArt', 0, -324],
    ['PetName', 0, -312],
    ['PetMeta', 0, -337],
    ['SwitchPet', 0, -324],
]) {
    const id = nodeId(...homePath, name);
    const transform = transformAt(id);
    setRect(
        id,
        x,
        y,
        Number(transform._contentSize.width),
        Number(transform._contentSize.height),
    );
}

fs.writeFileSync(scenePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log('Home composition and bottom navigation polished.');
