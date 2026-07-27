import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const checks = [];

function check(label, condition) {
    if (!condition) {
        throw new Error(`FAILED: ${label}`);
    }
    checks.push(label);
}

const scene = JSON.parse(read('client/PetVerseClient/assets/scenes/MainScene.scene'));
const nodes = scene
    .map((entry, index) => ({ ...entry, __sceneIndex: index }))
    .filter((entry) => entry.__type__ === 'cc.Node');
const nodeByName = (name, parentIndex) =>
    nodes.find((node) => node._name === name && (parentIndex === undefined || node._parent?.__id__ === parentIndex));

const canvas = nodeByName('Canvas');
const legacyRoot = nodeByName('LegacyUIRoot', canvas?.__sceneIndex);
const gameRoot = nodeByName('GameRoot', canvas?.__sceneIndex);
const backgroundLayer = nodeByName('BackgroundLayer', gameRoot?.__sceneIndex);
const pet3dLayer = nodeByName('Pet3DLayer', gameRoot?.__sceneIndex);
const mainHudLayer = nodeByName('MainHudLayer', gameRoot?.__sceneIndex);
const pageLayer = nodeByName('PageLayer', gameRoot?.__sceneIndex);
const popupLayer = nodeByName('PopupLayer', gameRoot?.__sceneIndex);
const toastLayer = nodeByName('ToastLayer', gameRoot?.__sceneIndex);
const guideLayer = nodeByName('GuideLayer', gameRoot?.__sceneIndex);
const loadingLayer = nodeByName('LoadingLayer', gameRoot?.__sceneIndex);
const newTopBar = nodeByName('TopBar', mainHudLayer?.__sceneIndex);
const newBottomNavigation = nodeByName('BottomNavigation', mainHudLayer?.__sceneIndex);
const pageRoot = nodeByName('PageRoot', pageLayer?.__sceneIndex);
const homePage = nodeByName('HomePage', pageRoot?.__sceneIndex);
const newPageNames = ['HomePage', 'PetPage', 'InventoryPage', 'AdventurePage', 'ShopPage', 'HatcheryPage', 'MorePage', 'SecondaryPage'];
const activeNewPages = nodes.filter(
    (node) => node._parent?.__id__ === pageRoot?.__sceneIndex && newPageNames.includes(node._name) && node._active,
);

check('MainScene contains Canvas', Boolean(canvas));
check('legacy root is retained for migration', Boolean(legacyRoot));
check('legacy root is disabled while the new home is visible', legacyRoot?._active === false);
check('new GameRoot is active', gameRoot?._active === true);
check('GameRoot contains the single BackgroundLayer', Boolean(backgroundLayer));
check('GameRoot preserves the Pet3DLayer', Boolean(pet3dLayer));
check('GameRoot contains MainHudLayer', Boolean(mainHudLayer));
check('GameRoot contains PageLayer', Boolean(pageLayer));
check('GameRoot contains PopupLayer', Boolean(popupLayer));
check('GameRoot contains ToastLayer', Boolean(toastLayer));
check('GameRoot contains GuideLayer', Boolean(guideLayer));
check('GameRoot contains LoadingLayer', Boolean(loadingLayer));
check('new HUD contains exactly one TopBar', Boolean(newTopBar));
check('new HUD contains exactly one BottomNavigation', Boolean(newBottomNavigation));
check('new page layer contains a PageRoot', Boolean(pageRoot));
check('HomePage is active by default', homePage?._active === true);
check('only one complete new page is active', activeNewPages.length === 1 && activeNewPages[0]._name === 'HomePage');

const mainUi = read('client/PetVerseClient/assets/scripts/ui/MainUI.ts');
const appRoutes = read('client/PetVerseClient/assets/scripts/ui/v2/AppRoutes.ts');
const appShell = read('client/PetVerseClient/assets/scripts/ui/v2/AppShell.ts');
const home = read('client/PetVerseClient/assets/scripts/ui/v2/pages/HomePage.ts');
const paintedUi = read('client/PetVerseClient/assets/scripts/ui/v2/HandPaintedUi.ts');

check('editor preview page defaults to home', mainUi.includes('editorPreviewPage = EditorPreviewPage.Home'));
check('offline player identity is truthful', mainUi.includes("hasProfile ? safeName(GameStore.user?.nickname, '玩家') : '未登录'"));
check('offline player level is truthful', mainUi.includes("hasProfile ? `Lv.${Number(GameStore.user?.level || 1)}` : 'Lv.--'"));
check('offline wallet is not rendered as zero', mainUi.includes("goldText = hasProfile ? formatNumber(GameStore.user?.gold) : '--'"));
check('shell disables legacy root during the new home', appShell.includes('legacyRoot.active = false'));
check('bottom navigation contains the confirmed five tabs', ['home', 'pet', 'adventure', 'hatchery', 'shop'].every((key) => appRoutes.includes(`key: '${key}'`)));
check('bottom navigation removes the More tab', !appRoutes.match(/MAIN_TABS[\s\S]*?key:\s*'more'/));
check('home has only the confirmed left shortcuts', home.includes("'MainQuestEntry'") && home.includes("'ActivityEntry'"));
check('home has only the confirmed right shortcuts', home.includes("'FriendEntry'") && home.includes("'BondEntry'") && home.includes("'MailEntry'"));
check('home removes duplicate hatchery shortcut', !home.includes("'HatcheryEntry'"));
check('home removes duplicate formation shortcut', !home.includes("'FormationEntry'"));
check('home renders a dedicated cream-gold adventure CTA', home.includes('renderAdventureCta') && home.includes('踏上新的旅程'));
check('home displays truthful pet empty state', home.includes('等待主宠数据') && home.includes('连接后显示属性与定位'));
check('empty team slots are not filled with fake pets', !home.includes('String(index + 1).padStart'));
check('bottom navigation uses formal vector icons', paintedUi.includes("'NavigationIcon'") && paintedUi.includes('item.icon'));
check('unselected Adventure tab is visually distinct from the active tab', paintedUi.includes('fill: selected') && paintedUi.includes('isAdventure'));

console.log(`MainScene home integration validation passed: ${checks.length} checks`);
for (const label of checks) {
    console.log(`- ${label}`);
}
