import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const scenePath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scenes/MainScene.scene',
);
const metricsPath = path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v6/UiMetrics.ts',
);
const records = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const failures = [];
const checks = [];

function check(condition, message) {
    if (condition) checks.push(message);
    else failures.push(message);
}

function nodeAt(id) {
    return records[id];
}

function nodeId(...segments) {
    let current = records.findIndex(
        (entry) => entry?.__type__ === 'cc.Node' && entry._name === segments[0],
    );
    if (current < 0) return undefined;
    for (const segment of segments.slice(1)) {
        const reference = (nodeAt(current)?._children || [])
            .find(({ __id__ }) => nodeAt(__id__)?._name === segment);
        if (!reference) return undefined;
        current = reference.__id__;
    }
    return current;
}

function component(id, type) {
    return (nodeAt(id)?._components || [])
        .map(({ __id__ }) => records[__id__])
        .find((entry) => entry?.__type__ === type);
}

function rect(id) {
    const node = nodeAt(id);
    const transform = component(id, 'cc.UITransform');
    return {
        x: Number(node?._lpos?.x || 0),
        y: Number(node?._lpos?.y || 0),
        width: Number(transform?._contentSize?.width || 0),
        height: Number(transform?._contentSize?.height || 0),
    };
}

function sameRect(actual, expected) {
    return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

const rootPath = ['Canvas', 'PetVerseUIRoot'];
const topBarId = nodeId(...rootPath, 'TopBar');
const pageRootId = nodeId(...rootPath, 'PageRoot');
const bottomNavigationId = nodeId(...rootPath, 'BottomNavigation');
const pageTitleId = nodeId(...rootPath, 'TopBar', 'PageTitle');

check(
    topBarId !== undefined && sameRect(rect(topBarId), { x: 0, y: 584, width: 720, height: 112 }),
    'TopBar uses the 720x1280 112px top safe region.',
);
check(
    pageRootId !== undefined && sameRect(rect(pageRootId), { x: 0, y: 19, width: 720, height: 1018 }),
    'PageRoot stays between the fixed top and bottom bars.',
);
check(
    bottomNavigationId !== undefined
        && sameRect(rect(bottomNavigationId), { x: 0, y: -565, width: 720, height: 150 }),
    'BottomNavigation uses the 150px bottom safe region.',
);
check(
    pageTitleId !== undefined
        && sameRect(rect(pageTitleId), { x: 0, y: 4, width: 190, height: 36 }),
    'TopBar contains a centered editor-owned current-page title.',
);
check(
    pageTitleId !== undefined && nodeAt(pageTitleId)?._active === false,
    'The baked top-board title is not covered by a duplicate runtime page title.',
);

for (const pageName of [
    'PetPage',
    'InventoryPage',
    'AdventurePage',
    'ShopPage',
    'HatcheryPage',
    'MorePage',
    'SecondaryPage',
]) {
    const pageId = nodeId(...rootPath, 'PageRoot', pageName);
    check(
        pageId !== undefined
            && sameRect(rect(pageId), { x: 0, y: 0, width: 720, height: 1018 }),
        `${pageName} matches PageRoot's safe viewport.`,
    );
    for (const layerName of ['PageBackground', 'StaticContent', 'RuntimeContent']) {
        const layerId = nodeId(...rootPath, 'PageRoot', pageName, layerName);
        check(
            layerId !== undefined
                && sameRect(rect(layerId), { x: 0, y: 0, width: 720, height: 1018 }),
            `${pageName}/${layerName} matches the safe viewport.`,
        );
    }
}

const metrics = fs.readFileSync(metricsPath, 'utf8');
for (const expected of [
    'V6_TOP_BAR_HEIGHT = 112',
    'V6_BOTTOM_NAV_HEIGHT = 150',
    'V6_SAFE_SIDE = 24',
    'V6_SAFE_VERTICAL = 16',
    'V6_PANEL_GAP = 16',
    'V6_SMALL_GAP = 8',
    'V6_LARGE_RADIUS = 24',
    'V6_SMALL_RADIUS = 16',
    'V6_PRIMARY_BUTTON_HEIGHT = 72',
    'V6_SECONDARY_BUTTON_HEIGHT = 56',
]) {
    check(metrics.includes(expected), `UiMetrics includes ${expected}.`);
}

const mainUi = records.find((entry) => entry && Object.hasOwn(entry, 'nicknameLabel'));
check(
    typeof mainUi?.pageTitleLabel?.__id__ === 'number'
        && records[mainUi.pageTitleLabel.__id__]?.__type__ === 'cc.Label',
    'MainUI current-page title uses an Inspector-bound Label.',
);

const mainUiSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/MainUI.ts',
), 'utf8');
check(
    mainUiSource.includes("'FeaturePageBackdrop'"),
    'Every non-home feature page receives a full-width warm backdrop.',
);

const prefabSizes = {
    InventoryItem: [150, 134],
    ShopItem: [250, 154],
    HatcheryEggItem: [150, 132],
    SkillSlotItem: [438, 74],
    FriendListItem: [286, 232],
    RankingListItem: [604, 78],
};
for (const [name, [width, height]] of Object.entries(prefabSizes)) {
    const prefabPath = path.join(
        repositoryRoot,
        `client/PetVerseClient/assets/resources/ui/list-items/${name}.prefab`,
    );
    const prefabRecords = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
    const rootNode = prefabRecords.find(
        (entry) => entry?.__type__ === 'cc.Node' && entry._name === name,
    );
    const transform = (rootNode?._components || [])
        .map(({ __id__ }) => prefabRecords[__id__])
        .find((entry) => entry?.__type__ === 'cc.UITransform');
    check(
        Number(transform?._contentSize?.width || 0) === width
            && Number(transform?._contentSize?.height || 0) === height,
        `${name} uses the approved ${width}x${height} list-card size.`,
    );
}

console.log(`Cocos UI layout audit: ${checks.length} checks passed.`);
if (failures.length) {
    console.error(`Cocos UI layout audit failed (${failures.length} issue(s)):\n`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Cocos UI layout audit passed.');
}
