import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const checks = [];

function read(relativePath) {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) throw new Error(`Missing file: ${relativePath}`);
    return readFileSync(absolutePath, 'utf8');
}

function assert(name, condition, details = '') {
    if (!condition) throw new Error(`${name}${details ? `: ${details}` : ''}`);
    checks.push(name);
}

function filesUnder(relativePath) {
    const base = join(root, relativePath);
    const result = [];
    for (const entry of readdirSync(base, { withFileTypes: true })) {
        const path = join(base, entry.name);
        if (entry.isDirectory()) result.push(...filesUnder(path.slice(root.length + 1)));
        else result.push(path);
    }
    return result;
}

function verifyCanvas(relativePath) {
    const scene = JSON.parse(read(relativePath));
    const canvas = scene.find((entry) => entry?.__type__ === 'cc.Node' && entry?._name === 'Canvas');
    assert(`${relativePath} has Canvas`, Boolean(canvas));
    const components = (canvas?._components || []).map((reference) => scene[reference?.__id__]).filter(Boolean);
    const transform = components.find((component) => component?.__type__ === 'cc.UITransform');
    assert(
        `${relativePath} uses 720x1280 Canvas`,
        transform?._contentSize?.width === 720 && transform?._contentSize?.height === 1280,
        JSON.stringify(transform?._contentSize || null),
    );
    return scene;
}

const projectConfig = JSON.parse(read('client/PetVerseClient/settings/v2/packages/project.json'));
const resolution = projectConfig?.general?.designResolution;
assert('project design resolution is 720x1280', resolution?.width === 720 && resolution?.height === 1280);
assert('project keeps portrait fitHeight', resolution?.fitHeight === true);
const clientTypeConfig = JSON.parse(read('client/PetVerseClient/tsconfig.json'));
assert('client type check targets modern runtime libraries', clientTypeConfig?.compilerOptions?.lib?.includes('ES2020'));
assert('client type check ignores engine declaration churn', clientTypeConfig?.compilerOptions?.skipLibCheck === true);

const mainScene = verifyCanvas('client/PetVerseClient/assets/scenes/MainScene.scene');
verifyCanvas('client/PetVerseClient/assets/scenes/LoginScene.scene');
const sceneNodes = mainScene.map((entry, id) => ({ entry, id })).filter(({ entry }) => entry?.__type__ === 'cc.Node');
const sceneNodeNames = new Set(sceneNodes.map(({ entry }) => entry?._name));
for (const name of [
    'PetVerseUIRoot', 'GlobalBackground', 'TopBar', 'PageRoot', 'BottomNavigation',
    'DrawerLayer', 'ModalLayer', 'UtilityLayer', 'BattleLayer', 'RevealLayer',
    'GuideLayer', 'ToastLayer', 'LoadingLayer', 'HomePage', 'PetPage',
    'AdventurePage', 'ShopPage', 'MorePage', 'SecondaryPage',
]) {
    assert(`MainScene contains ${name}`, sceneNodeNames.has(name));
}
const canvasRecord = sceneNodes.find(({ entry }) => entry?._name === 'Canvas');
const editorRoot = sceneNodes.find(({ entry }) => entry?._name === 'PetVerseUIRoot' && entry?._parent?.__id__ === canvasRecord?.id);
const editorNodeIds = new Set();
const collectEditorNodes = (id) => {
    if (editorNodeIds.has(id)) return;
    editorNodeIds.add(id);
    for (const child of mainScene[id]?._children || []) collectEditorNodes(child.__id__);
};
if (editorRoot) collectEditorNodes(editorRoot.id);
assert('Cocos editor preview root is active', editorRoot?.entry?._active === true);
assert('Cocos editor preview uses UI_2D on every generated node', [...editorNodeIds].every((id) => mainScene[id]?._layer === canvasRecord?.entry?._layer));
for (const name of ['bg', 'HomeLayer', 'PageLayer', 'ToastLayer']) {
    const legacy = sceneNodes.find(({ entry }) => entry?._name === name && entry?._parent?.__id__ === canvasRecord?.id);
    assert(`legacy Cocos editor layer is disabled: ${name}`, legacy?.entry?._active === false);
}
for (const name of ['HomeTopArt', 'RoomArt', 'HomePetArt', 'PetNameplateArt', 'NavigationArt']) {
    const artNode = sceneNodes.find(({ entry, id }) => editorNodeIds.has(id) && entry?._name === name);
    const sprite = (artNode?.entry?._components || []).map((reference) => mainScene[reference.__id__]).find((component) => component?.__type__ === 'cc.Sprite');
    assert(`Cocos editor scene serializes ${name} SpriteFrame`, Boolean(sprite?._spriteFrame?.__uuid__));
}
const serializedMainUi = mainScene.find((entry) => entry?.apiBaseUrl && entry?.node?.__id__ === canvasRecord?.id);
assert('Cocos editor scene serializes page tuning controls', serializedMainUi?.editorPreviewPage === 0 && serializedMainUi?.pageContentScale === 1 && serializedMainUi?.petPageOffset?.__type__ === 'cc.Vec2');

const routes = read('client/PetVerseClient/assets/scripts/ui/v2/AppRoutes.ts');
const tabBlock = routes.match(/MAIN_TABS:[\s\S]*?=\s*\[([\s\S]*?)\];/)?.[1] || '';
const tabKeys = [...tabBlock.matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]);
assert(
    'bottom navigation has the required five entries',
    JSON.stringify(tabKeys) === JSON.stringify(['home', 'pet', 'adventure', 'shop', 'more']),
    tabKeys.join(', '),
);

const appShell = read('client/PetVerseClient/assets/scripts/ui/v2/AppShell.ts');
assert('app shell applies device safe area', appShell.includes('getSafeAreaRect') && appShell.includes('safe.bottom - safe.top'));
assert('app shell activates one page container', appShell.includes('child.active = child === target'));
assert('app shell disables legacy scene layers', appShell.includes('LEGACY_CANVAS_LAYERS') && appShell.includes('legacyLayer.active = false'));
assert('app shell normalizes generated node layers', appShell.includes('applyLayerRecursively(root, canvas.layer)'));

const uiKit = read('client/PetVerseClient/assets/scripts/ui/cute/CuteUiKit.ts');
assert('shared buttons debounce repeated clicks', uiKit.includes('lastAcceptedClickAt') && uiKit.includes('< 320'));
assert('button re-render replaces public click binding', uiKit.includes('node.off(Button.EventType.CLICK)'));
assert('generated artwork loads without runtime panel chrome', uiKit.includes('export function artImage'));
assert('generated artwork keeps transparent interaction areas', uiKit.includes('export function hitArea'));
assert('generated UI inherits the parent Cocos layer', uiKit.includes('node.layer = parent.layer'));

const mainUi = read('client/PetVerseClient/assets/scripts/ui/MainUI.ts');
for (const renderer of [
    'renderHome', 'renderPetDetail', 'renderInventory', 'renderShop', 'renderHatchery',
    'renderFormation', 'renderAdventure', 'renderSkillLearning', 'renderFusion', 'renderFriends',
    'renderMarriage', 'renderMail', 'renderRanking', 'renderTrade', 'renderBenefits',
    'renderProfile', 'renderSettings',
]) {
    assert(`MainUI dispatches ${renderer}`, mainUi.includes(`this.${renderer}(`));
}
assert('page rendering clears previous content', mainUi.includes('clearNode(this.pageRoot)'));
assert('secondary back uses router history', mainUi.includes('this.router.back('));
assert('scroll offsets persist across rendering', mainUi.includes('captureScrollOffsets') && mainUi.includes('scrollOffsets.set'));
assert('request failures have explicit handling', mainUi.includes('success === false') && mainUi.includes('showToast'));
assert('write operations use request ids', mainUi.includes('requestId('));
assert('secondary destructive actions use confirmation', mainUi.includes('openSecondaryConfirmation'));
assert('adventure map keeps a dedicated region page state', mainUi.includes('private adventureRegionOpen = false'));
assert('adventure region nodes open their matching region page', mainUi.includes('this.selectedRegionCode=String(item.code);this.adventureRegionOpen=true'));
assert('adventure region page preserves real explore and nest battles', mainUi.includes("this.startRegionBattle('explore',region)") && mainUi.includes("this.startRegionBattle('nest',region)"));
assert('adventure side cards route to crisis and tower pages', mainUi.includes("this.adventureMode='pve'") && mainUi.includes("this.adventureMode='tower'"));
assert('adventure main page uses illustrated map artwork', mainUi.includes("'ui/adventure-v3/adventure-map-page-v3'"));
assert('pet detail uses illustrated research-book artwork', mainUi.includes("'ui/pet-v3/pet-detail-page-v3'"));
assert('shop uses illustrated stationery-store artwork', mainUi.includes("'ui/shop-v3/shop-page-v3'"));
assert('inventory uses illustrated field-journal artwork', mainUi.includes("'ui/inventory-v3/inventory-page-v3'"));
assert('hatchery uses illustrated workshop artwork', mainUi.includes("'ui/hatchery-v3/hatchery-page-v3'"));
assert('illustrated pages expose Cocos editor preview controls', mainUi.includes('editorPreviewPage') && mainUi.includes('petPageOffset') && mainUi.includes('hatcheryPageScale'));
assert('illustrated pages use compact non-overlapping grids', mainUi.includes('rows * 116 + 8') && mainUi.includes("'InventoryScroll', 0, 0, 590, 464"));
assert('home top bar uses generated artwork with dynamic currency values', mainUi.includes("'ui/home-v3/top-overlay-v3'") && mainUi.includes("'GoldValue'"));
const homePageUi = read('client/PetVerseClient/assets/scripts/ui/v2/pages/HomePage.ts');
assert('home page composes generated room and independently scaled controls', homePageUi.includes("'ui/home-v3/home-room-v3'") && homePageUi.includes("'ui/home-v4/activity-sign-v4'"));
assert('home generated buttons preserve original activity and shortcut callbacks', homePageUi.includes('options.onActivity(activity)') && homePageUi.includes('options.onShortcut(shortcut)'));
const handPaintedUi = read('client/PetVerseClient/assets/scripts/ui/v2/HandPaintedUi.ts');
assert('bottom navigation uses tightly cropped five-tab artwork', handPaintedUi.includes("'ui/home-v4/bottom-navigation-v4'") && handPaintedUi.includes("item.key === 'adventure'"));
for (const legacyPanel of [
    'FriendPanel', 'HatcheryPanel', 'MarriagePanel', 'PetPanel', 'ProfilePanel',
    'RankingPanel', 'ShopPanel', 'SkillPanel', 'TowerPanel',
]) {
    assert(`legacy panel removed: ${legacyPanel}`, !existsSync(join(root, `client/PetVerseClient/assets/scripts/ui/${legacyPanel}.ts`)));
}

const gameConfig = read('server/src/modules/game-config/game-config.service.ts');
assert('public game config uses five pets', /teamSize:\s*5/.test(gameConfig));
assert('public game config has no three-pet residue', !/teamSize:\s*3/.test(gameConfig));

const battleUi = read('client/PetVerseClient/assets/scripts/ui/v10/BattleSceneV10.ts');
assert('battle renders five units per side', battleUi.includes('team.slice(0, 5)'));
assert('battle consumes server formation positions', battleUi.includes('formation?.positions'));
assert('battle exposes formation energy', battleUi.includes('formationEnergy') && battleUi.includes('energyCost'));
assert('battle exposes auto mode', battleUi.includes("'Auto'") && battleUi.includes('autoMode'));

const resourcesRoot = 'client/PetVerseClient/assets/resources';
const requiredResources = [
    'cute-ui/player_avatar.jpg', 'pet-art/home_empty_room.jpg',
    'ui/home-v3/home-room-v3.png', 'ui/home-v3/home-overlay-v3.png',
    'ui/home-v3/top-overlay-v3.png', 'ui/home-v3/bottom-navigation-v3.png',
    'ui/adventure-v3/adventure-map-page-v3.png',
    'ui/pet-v3/pet-detail-page-v3.png',
    'ui/shop-v3/shop-page-v3.png',
    'ui/inventory-v3/inventory-page-v3.png',
    'ui/hatchery-v3/hatchery-page-v3.png',
    ...['activity-sign', 'activity-newcomer', 'activity-daily', 'activity-events', 'shortcut-adventure', 'shortcut-hatchery', 'shortcut-formation', 'pet-nameplate', 'bottom-navigation'].map((name) => `ui/home-v4/${name}-v4.png`),
    ...Array.from({ length: 10 }, (_, index) => `egg-art/PET${String(index + 1).padStart(3, '0')}.png`),
    ...Array.from({ length: 10 }, (_, index) => ['home', 'portrait', 'thumb'].map((usage) => `pet-art/PET${String(index + 1).padStart(3, '0')}/${usage}.png`)).flat(),
    'audio/home_bgm.wav', 'audio/battle_bgm.wav', 'audio/boss_bgm.wav',
    'audio/click_1.wav', 'audio/confirm.wav', 'audio/error.wav',
];
for (const resource of requiredResources) {
    const path = join(root, resourcesRoot, resource);
    assert(`resource exists: ${resource}`, existsSync(path) && statSync(path).size > 0);
}
const emptyResources = filesUnder(resourcesRoot).filter((path) => statSync(path).size === 0);
assert('resource tree has no zero-byte files', emptyResources.length === 0, emptyResources.join(', '));

console.log(JSON.stringify({ success: true, checks: checks.length, resolution: '720x1280', mainTabs: tabKeys, resources: requiredResources.length }, null, 2));
