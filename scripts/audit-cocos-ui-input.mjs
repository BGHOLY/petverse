import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const scenePath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scenes/MainScene.scene',
);
const mainUiPath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/MainUI.ts',
);
const audioDirectorPath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v10/AudioDirector.ts',
);

const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const failures = [];
const nodeEntries = scene
    .map((entry, id) => ({ entry, id }))
    .filter(({ entry }) => entry?.__type__ === 'cc.Node');
const nodeById = new Map(nodeEntries.map(({ entry, id }) => [id, entry]));

function check(condition, message) {
    if (!condition) failures.push(message);
}

function componentEntries(node) {
    return (node?._components || [])
        .map(({ __id__ }) => ({ component: scene[__id__], id: __id__ }))
        .filter(({ component }) => Boolean(component));
}

function component(node, type) {
    return componentEntries(node).find(({ component: item }) => item.__type__ === type)?.component;
}

function parentId(node) {
    return Number.isInteger(node?._parent?.__id__) ? node._parent.__id__ : undefined;
}

function pathOf(id) {
    const node = nodeById.get(id);
    if (!node) return `#${id}`;
    const parent = parentId(node);
    return parent === undefined || !nodeById.has(parent)
        ? node._name
        : `${pathOf(parent)}/${node._name}`;
}

function activeInHierarchy(id) {
    let current = id;
    while (Number.isInteger(current)) {
        const node = nodeById.get(current);
        if (!node) break;
        if (node._active === false) return false;
        current = parentId(node);
    }
    return true;
}

function directChildId(parent, name) {
    return (nodeById.get(parent)?._children || [])
        .map(({ __id__ }) => __id__)
        .find((id) => nodeById.get(id)?._name === name);
}

function nodeId(...segments) {
    let current = nodeEntries.find(({ entry }) => entry._name === segments[0])?.id;
    for (const segment of segments.slice(1)) {
        if (current === undefined) return undefined;
        current = directChildId(current, segment);
    }
    return current;
}

function isFullScreen(node) {
    const transform = component(node, 'cc.UITransform');
    return Number(transform?._contentSize?.width || 0) >= 720
        && Number(transform?._contentSize?.height || 0) >= 1280;
}

function validSerializedClickEvent(event) {
    const targetId = event?.target?.__id__ ?? event?._target?.__id__;
    return !Number.isInteger(targetId) || Boolean(scene[targetId]);
}

const rootPath = ['Canvas', 'PetVerseUIRoot'];
const rootId = nodeId(...rootPath);
const overlayId = nodeId(...rootPath, 'OverlayRoot');
const fullScreenId = nodeId(...rootPath, 'FullScreenRoot');
const systemId = nodeId(...rootPath, 'SystemRoot');
const bottomNavigationId = nodeId(...rootPath, 'BottomNavigation');

check(rootId !== undefined, 'Missing Canvas/PetVerseUIRoot.');
check(overlayId !== undefined, 'Missing OverlayRoot.');
check(fullScreenId !== undefined, 'Missing FullScreenRoot.');
check(systemId !== undefined, 'Missing SystemRoot.');
check(bottomNavigationId !== undefined, 'Missing BottomNavigation.');

for (const [name, id] of [
    ['PetVerseUIRoot', rootId],
    ['OverlayRoot', overlayId],
    ['FullScreenRoot', fullScreenId],
    ['SystemRoot', systemId],
]) {
    check(
        id === undefined || !component(nodeById.get(id), 'cc.BlockInputEvents'),
        `${name} must not own BlockInputEvents.`,
    );
}

const defaultClosedOverlayNames = [
    'DrawerLayer',
    'ModalLayer',
    'UtilityLayer',
    'GuideLayer',
    'RevealLayer',
    'LoadingLayer',
    'Reconnect',
];
for (const name of defaultClosedOverlayNames) {
    const id = overlayId === undefined ? undefined : directChildId(overlayId, name);
    check(id !== undefined, `Missing OverlayRoot/${name}.`);
    check(id === undefined || nodeById.get(id)?._active === false, `${name} must default to active=false.`);
}
const battleId = fullScreenId === undefined ? undefined : directChildId(fullScreenId, 'BattleLayer');
check(battleId !== undefined, 'Missing FullScreenRoot/BattleLayer.');
check(battleId === undefined || nodeById.get(battleId)?._active === false, 'BattleLayer must default to active=false.');

const blockInputNodes = nodeEntries
    .filter(({ entry }) => Boolean(component(entry, 'cc.BlockInputEvents')))
    .map(({ id }) => ({ path: pathOf(id), active: activeInHierarchy(id) }));
const allowedBlockInputPaths = new Set([
    'Canvas/PetVerseUIRoot/OverlayRoot/ModalLayer',
]);
for (const item of blockInputNodes) {
    check(allowedBlockInputPaths.has(item.path), `Unexpected BlockInputEvents on ${item.path}.`);
    check(!item.active, `BlockInputEvents is active by default on ${item.path}.`);
}

const pageBackgroundNames = new Set(['PageBackground', 'BackgroundLayer', 'RoomArt']);
for (const { entry, id } of nodeEntries.filter(({ entry }) => pageBackgroundNames.has(entry._name))) {
    check(!component(entry, 'cc.BlockInputEvents'), `${pathOf(id)} must not block input.`);
    check(!component(entry, 'cc.Button'), `${pathOf(id)} must not be a Button.`);
}

const buttonEntries = [];
const invalidClickEvents = [];
for (const { entry, id } of nodeEntries) {
    const button = component(entry, 'cc.Button');
    if (!button) continue;
    const clickEvents = Array.isArray(button.clickEvents) ? button.clickEvents : [];
    buttonEntries.push({
        path: pathOf(id),
        active: activeInHierarchy(id),
        interactable: button._interactable !== false,
        clickEvents: clickEvents.length,
    });
    for (const event of clickEvents) {
        if (!validSerializedClickEvent(event)) invalidClickEvents.push(pathOf(id));
    }
}

for (const name of ['home', 'pet', 'adventure', 'shop', 'more']) {
    const id = bottomNavigationId === undefined
        ? undefined
        : directChildId(bottomNavigationId, `Tab_${name}`);
    const button = id === undefined ? undefined : component(nodeById.get(id), 'cc.Button');
    check(id !== undefined, `Missing BottomNavigation/Tab_${name}.`);
    check(Boolean(button), `Tab_${name} is missing its Button component.`);
    check(button?._enabled !== false, `Tab_${name} Button component is disabled.`);
    check(button?._interactable !== false, `Tab_${name} Button is not interactable.`);
    check(id === undefined || activeInHierarchy(id), `Tab_${name} is not active in hierarchy.`);
}
check(invalidClickEvents.length === 0, `Invalid serialized ClickEvents: ${invalidClickEvents.join(', ')}`);

const activeFullScreenNodes = nodeEntries
    .filter(({ entry, id }) => activeInHierarchy(id) && isFullScreen(entry))
    .map(({ id }) => pathOf(id));
const fullScreenInteractiveNodes = nodeEntries
    .filter(({ entry, id }) => activeInHierarchy(id)
        && isFullScreen(entry)
        && (component(entry, 'cc.BlockInputEvents') || component(entry, 'cc.Button')))
    .map(({ id }) => pathOf(id));
check(
    fullScreenInteractiveNodes.length === 0,
    `Active full-screen input interceptors: ${fullScreenInteractiveNodes.join(', ')}`,
);

const root = rootId === undefined ? undefined : nodeById.get(rootId);
const rootChildren = (root?._children || []).map(({ __id__ }) => __id__);
const bottomIndex = rootChildren.indexOf(bottomNavigationId);
const fullScreenAboveNavigation = rootChildren
    .slice(bottomIndex + 1)
    .filter((id) => activeInHierarchy(id) && isFullScreen(nodeById.get(id)))
    .map((id) => ({
        path: pathOf(id),
        interactive: Boolean(
            component(nodeById.get(id), 'cc.BlockInputEvents')
            || component(nodeById.get(id), 'cc.Button'),
        ),
    }));
check(
    fullScreenAboveNavigation.every((item) => !item.interactive),
    `Interactive full-screen node above BottomNavigation: ${
        fullScreenAboveNavigation.filter((item) => item.interactive).map((item) => item.path).join(', ')
    }`,
);

const mainUi = fs.readFileSync(mainUiPath, 'utf8');
const audioDirector = fs.readFileSync(audioDirectorPath, 'utf8');
check(
    !mainUi.includes('this.root.on(Node.EventType.TOUCH_END, this.finishTeamDrag'),
    'MainUI must not register a full-screen root TOUCH_END listener.',
);
check(
    !audioDirector.includes('host.on(Node.EventType.TOUCH_'),
    'AudioDirector must not register touch listeners on the full-screen SystemRoot.',
);
check(
    audioDirector.includes('input.on(Input.EventType.TOUCH_START'),
    'AudioDirector must unlock audio through the global input dispatcher.',
);

console.log('Cocos UI input audit');
console.log(`- Active full-screen UI nodes: ${activeFullScreenNodes.length}`);
for (const item of activeFullScreenNodes) console.log(`  - ${item}`);
console.log(`- BlockInputEvents nodes: ${blockInputNodes.length}`);
for (const item of blockInputNodes) console.log(`  - ${item.path} (active=${item.active})`);
console.log(`- Active Buttons: ${buttonEntries.filter((item) => item.active).length}`);
console.log(`- Active interactable Buttons: ${buttonEntries.filter((item) => item.active && item.interactable).length}`);
console.log(`- Invalid serialized ClickEvents: ${invalidClickEvents.length}`);
console.log(`- Full-screen nodes above BottomNavigation: ${fullScreenAboveNavigation.length}`);
for (const item of fullScreenAboveNavigation) {
    console.log(`  - ${item.path} (interactive=${item.interactive})`);
}

if (failures.length) {
    console.error(`Cocos UI input audit failed (${failures.length} issue(s)):\n`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log('Cocos UI input audit passed.');
}
