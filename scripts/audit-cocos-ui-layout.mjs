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
const homePetId = nodeId(...rootPath, 'PageRoot', 'HomePage', 'StaticContent', 'HomePetArt');
const homeNameplateId = nodeId(...rootPath, 'PageRoot', 'HomePage', 'StaticContent', 'PetNameplateArt');

check(
    topBarId !== undefined && sameRect(rect(topBarId), { x: 0, y: 584, width: 720, height: 112 }),
    'TopBar uses the 720x1280 112px top safe region.',
);
check(
    pageRootId !== undefined && sameRect(rect(pageRootId), { x: 0, y: 39, width: 720, height: 978 }),
    'PageRoot stays between the fixed top and bottom bars.',
);
check(
    bottomNavigationId !== undefined
        && sameRect(rect(bottomNavigationId), { x: 0, y: -545, width: 720, height: 190 }),
    'BottomNavigation uses the 190px hand-painted tray region.',
);
check(
    pageTitleId !== undefined
        && sameRect(rect(pageTitleId), { x: 0, y: 4, width: 190, height: 36 }),
    'TopBar contains a centered editor-owned current-page title.',
);
check(
    pageTitleId !== undefined && nodeAt(pageTitleId)?._active === false,
    'The editor title starts hidden until the runtime blank title plate covers the baked home label.',
);
check(
    homePetId !== undefined && rect(homePetId).x === 0 && rect(homePetId).y === -88,
    'The home showcase pet is centered and lifted clear of the bottom navigation.',
);
check(
    homeNameplateId !== undefined && rect(homeNameplateId).x === 0 && rect(homeNameplateId).y === -304,
    'The home pet nameplate stays centered beneath the lifted showcase pet.',
);

for (const tab of ['home', 'pet', 'adventure', 'shop', 'more']) {
    const faceId = nodeId(...rootPath, 'BottomNavigation', `Selected_${tab}`, 'Face');
    const graphics = faceId === undefined ? undefined : component(faceId, 'cc.Graphics');
    check(
        graphics?._lineWidth === 4
            && Number(graphics?._fillColor?.a || 0) >= 70
            && Number(graphics?._strokeColor?.a || 0) >= 240,
        `BottomNavigation ${tab} has a clearly visible selected-state highlight.`,
    );
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
    const pageId = nodeId(...rootPath, 'PageRoot', pageName);
    check(
        pageId !== undefined
            && sameRect(rect(pageId), { x: 0, y: 0, width: 720, height: 978 }),
        `${pageName} matches PageRoot's safe viewport.`,
    );
    for (const layerName of ['PageBackground', 'StaticContent', 'RuntimeContent']) {
        const layerId = nodeId(...rootPath, 'PageRoot', pageName, layerName);
        check(
            layerId !== undefined
                && sameRect(rect(layerId), { x: 0, y: 0, width: 720, height: 978 }),
            `${pageName}/${layerName} matches the safe viewport.`,
        );
    }
}

const metrics = fs.readFileSync(metricsPath, 'utf8');
for (const expected of [
    'V6_TOP_BAR_HEIGHT = 112',
    'V6_BOTTOM_NAV_HEIGHT = 190',
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
check(
    mainUiSource.includes("'DynamicPageTitlePlate'")
        && mainUiSource.includes('216,')
        && mainUiSource.includes('64,')
        && mainUiSource.includes('titleNode.active = true')
        && mainUiSource.includes('PAGE_TITLE_LABELS[this.currentPage]'),
    'The baked home title is covered by one centered dynamic title plate for every page.',
);
check(
    mainUiSource.includes("'PrimaryHomeAction'")
        && mainUiSource.includes("'领取孵化宝宝'")
        && mainUiSource.includes("'继续冒险'")
        && mainUiSource.includes('0,')
        && mainUiSource.includes('-405,')
        && mainUiSource.includes('320,')
        && mainUiSource.includes('72,'),
    'Home exposes one dynamic primary action above the fixed bottom navigation.',
);
check(
    mainUiSource.includes("'TeamQuickActions'"),
    'Adventure team actions use a dedicated card instead of overlapping the story progress footer.',
);
check(
    mainUiSource.includes("createV6PageShell(this.pageRoot, 'FusionLayoutV6')")
        && mainUiSource.includes("'FusionPage',")
        && mainUiSource.includes('V6_SAFE_CONTENT_HEIGHT,')
        && mainUiSource.includes("'FusionSteps'")
        && mainUiSource.includes("'ParentA',")
        && mainUiSource.includes("-160, 142, 'A'")
        && mainUiSource.includes("'ParentB',")
        && mainUiSource.includes("160, 142, 'B'")
        && mainUiSource.includes("'ExecuteButton'")
        && mainUiSource.includes('0, -386, 280, 72'),
    'Fusion uses the safe-area shell, equal parent cards, three-step guidance, and one safe primary action.',
);
check(
    mainUiSource.includes("createV6PageShell(this.pageRoot, 'SkillLayoutV6')")
        && mainUiSource.includes("'SkillResearchPage',0,-60,672,824")
        && mainUiSource.includes("'Current',-159,42,302,404")
        && mainUiSource.includes("'Books',159,42,302,404")
        && mainUiSource.includes("'Learn','")
        && mainUiSource.includes('230,-5,160,70'),
    'Skill learning uses the safe-area shell, balanced skill/book columns and one clear primary action.',
);
check(
    mainUiSource.includes("'TeamEditor', 0, 0, 650, 850")
        && mainUiSource.includes("'TeamPetScroll',0,-210,610,270")
        && mainUiSource.includes("'Save','")
        && mainUiSource.includes("245,-382,140,50"),
    'Team editing keeps its formation field, scroll list and save action within the safe viewport.',
);
check(
    mainUiSource.includes("'PhotoFace'")
        && mainUiSource.includes('286,')
        && mainUiSource.includes('232,')
        && mainUiSource.includes('faceSprite.enabled = false'),
    'Friend cards replace the generic grey Prefab face with a clear cream photo card.',
);
check(
    mainUiSource.includes("'RankFace'")
        && mainUiSource.includes('604,')
        && mainUiSource.includes('78,')
        && mainUiSource.includes('rank <= 3 ? CuteTheme.honeyDark'),
    'Ranking cards replace the generic grey Prefab face and distinguish the top three.',
);

const petPageSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v6/pages/PetPage.ts',
), 'utf8');
check(
    petPageSource.includes('const LEFT_WIDTH = 184;')
        && petPageSource.includes('const ROSTER_CARD_GAP = 12;'),
    'The pet roster has a distinct wider column and comfortable card spacing.',
);

const shopPageSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v6/pages/ShopPage.ts',
), 'utf8');
check(
    shopPageSource.includes("'CardOutline'")
        && shopPageSource.includes("'ProductIconWell'")
        && shopPageSource.includes("'ProductArt'"),
    'Shop cards have clear outlines and visible icon fallbacks instead of blank grey blocks.',
);
check(
    shopPageSource.includes('Math.ceil(options.items.length / 2)')
        && shopPageSource.includes('layout.cellSize = new Size(250, 154)'),
    'Shop products use a readable two-column card grid.',
);
check(
    shopPageSource.includes("'EmptyState'")
        && shopPageSource.includes("'RefreshAction'")
        && shopPageSource.includes("'这一栏正在补货'"),
    'Shop empty categories explain the state and provide a refresh action.',
);

const inventoryPageSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v6/pages/InventoryPage.ts',
), 'utf8');
check(
    inventoryPageSource.includes('Math.ceil(options.items.length / 4)')
        && inventoryPageSource.includes("'ItemIconWell'"),
    'Inventory keeps a four-column grid with clear icon wells.',
);
check(
    inventoryPageSource.includes("'EmptyState'")
        && inventoryPageSource.includes("'当前分类还是空的'")
        && inventoryPageSource.includes('emptyHint'),
    'Inventory empty categories explain where matching items come from.',
);

const hatcheryPageSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v6/pages/HatcheryPage.ts',
), 'utf8');
check(
    hatcheryPageSource.includes("'WarehouseHeader'")
        && hatcheryPageSource.includes("'EggListPanel'")
        && hatcheryPageSource.includes('Math.ceil(options.eggs.length / 4)'),
    'The hatchery separates its incubators and four-column egg warehouse with clear boundaries.',
);
check(
    hatcheryPageSource.includes("'魔法育宠温室'")
        && hatcheryPageSource.includes("'NurseryScene'")
        && hatcheryPageSource.includes("'NurseryNestRow'")
        && hatcheryPageSource.includes("'EggWarehouseDrawer'")
        && hatcheryPageSource.includes("'OpenWarehouse'")
        && hatcheryPageSource.includes("'CloseWarehouse'"),
    'The hatchery uses a nursery-first scene with three nests and an expandable egg warehouse drawer.',
);
check(
    hatcheryPageSource.includes("'EmptyState'")
        && hatcheryPageSource.includes("'ShowAll'")
        && hatcheryPageSource.includes("'GoMarriage'"),
    'The hatchery empty warehouse offers a relevant next action.',
);

const cuteUiKitSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/cute/CuteUiKit.ts',
), 'utf8');
check(
    cuteUiKitSource.includes('disabledReason?: string;')
        && cuteUiKitSource.includes('new Color(239, 233, 219, 255)')
        && cuteUiKitSource.includes('const subtitle = options.subtitle || (disabled ? options.disabledReason : undefined);'),
    'Disabled buttons use a warm neutral state and can explain why an action is unavailable.',
);

const morePageSource = fs.readFileSync(path.join(
    repositoryRoot,
    'client/PetVerseClient/assets/scripts/ui/v2/MorePage.ts',
), 'utf8');
check(
    morePageSource.includes("createV6PageShell(parent, 'MoreLayoutV6')")
        && morePageSource.includes("key: 'nurture'")
        && morePageSource.includes("key: 'social'")
        && morePageSource.includes("key: 'reward'")
        && morePageSource.includes("key: 'personal'"),
    'More uses a full safe-area background and four player-goal groups.',
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
