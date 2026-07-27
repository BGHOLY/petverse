import { BlockInputEvents, Node, screen, sys } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH, clearNode, getOrCreate, setRect } from '../cute/CuteUiKit';
import { PageName } from './AppRoutes';
import { V6_CONTENT_HEIGHT } from '../v6/UiMetrics';

export type AppShellLayers = {
    root: Node;
    pet3dLayer: Node;
    mainHudLayer: Node;
    pageLayer: Node;
    popupLayer: Node;
    globalBackground: Node;
    topBar: Node;
    pageRoot: Node;
    bottomNavigation: Node;
    drawerLayer: Node;
    modalLayer: Node;
    utilityLayer: Node;
    battleLayer: Node;
    revealLayer: Node;
    guideLayer: Node;
    toastLayer: Node;
    loadingLayer: Node;
};

const PAGE_CONTAINERS = [
    'HomePage',
    'PetPage',
    'InventoryPage',
    'AdventurePage',
    'ShopPage',
    'HatcheryPage',
    'MorePage',
    'SecondaryPage',
];
const LEGACY_CANVAS_LAYERS = ['bg', 'HomeLayer', 'PageLayer', 'ToastLayer'];

function applyLayerRecursively(node: Node, layerValue: number) {
    node.layer = layerValue;
    for (const child of node.children) applyLayerRecursively(child, layerValue);
}

function safeAreaInsets() {
    try {
        const windowSize = screen.windowSize;
        const safeArea = sys.getSafeAreaRect();
        if (!windowSize?.height || !safeArea?.height) return { top: 0, bottom: 0 };
        const designScale = DESIGN_HEIGHT / windowSize.height;
        const top = (windowSize.height - safeArea.y - safeArea.height) * designScale;
        const bottom = safeArea.y * designScale;
        return {
            top: Math.max(0, Math.min(120, top)),
            bottom: Math.max(0, Math.min(100, bottom)),
        };
    } catch {
        return { top: 0, bottom: 0 };
    }
}

function containerName(page: PageName) {
    if (page === 'home') return 'HomePage';
    if (page === 'pet') return 'PetPage';
    if (page === 'inventory') return 'InventoryPage';
    if (page === 'adventure') return 'AdventurePage';
    if (page === 'shop') return 'ShopPage';
    if (page === 'hatchery') return 'HatcheryPage';
    if (page === 'more') return 'MorePage';
    return 'SecondaryPage';
}

export function preparePageContainers(pageRoot: Node) {
    if (!pageRoot.getChildByName('HomePage')) clearNode(pageRoot);
    return PAGE_CONTAINERS.map((name) => {
        const container = getOrCreate(pageRoot, name);
        setRect(container, 0, 0, DESIGN_WIDTH, V6_CONTENT_HEIGHT);
        container.active = name === 'HomePage';
        return container;
    });
}

export function resolvePageContainer(pageRoot: Node, page: PageName) {
    const name = containerName(page);
    let target = pageRoot.getChildByName(name);
    if (!target) {
        preparePageContainers(pageRoot);
        target = pageRoot.getChildByName(name);
    }
    for (const child of pageRoot.children) child.active = child === target;
    return target || pageRoot;
}

function layer(root: Node, name: string, aliases: string[] = []) {
    let node = root.getChildByName(name);
    if (!node) {
        for (const alias of aliases) {
            node = root.getChildByName(alias);
            if (node) break;
        }
    }
    if (!node) node = getOrCreate(root, name);
    node.name = name;
    setRect(node, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    return node;
}

export function resolveAppShell(canvas: Node): AppShellLayers {
    const legacyRoot = canvas.getChildByName('PetVerseUIRoot')
        || canvas.getChildByName('LegacyUIRoot');
    if (legacyRoot) {
        legacyRoot.name = 'LegacyUIRoot';
        legacyRoot.active = false;
    }

    const root = getOrCreate(canvas, 'GameRoot');
    setRect(root, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    if (!root.getComponent(BlockInputEvents)) root.addComponent(BlockInputEvents);
    root.active = true;

    for (const name of LEGACY_CANVAS_LAYERS) {
        const legacyLayer = canvas.getChildByName(name);
        if (legacyLayer && legacyLayer !== root) legacyLayer.active = false;
    }

    const backgroundLayer = layer(root, 'BackgroundLayer');
    const pet3dLayer = layer(root, 'Pet3DLayer');
    const mainHudLayer = layer(root, 'MainHudLayer');
    const pageLayer = layer(root, 'PageLayer');
    const popupLayer = layer(root, 'PopupLayer');
    const toastLayer = layer(root, 'ToastLayer');
    const guideLayer = layer(root, 'GuideLayer');
    const loadingLayer = layer(root, 'LoadingLayer');

    const result: AppShellLayers = {
        root,
        pet3dLayer,
        mainHudLayer,
        pageLayer,
        popupLayer,
        globalBackground: backgroundLayer,
        topBar: layer(mainHudLayer, 'TopBar', ['CuteTopBar']),
        pageRoot: layer(pageLayer, 'PageRoot', ['CutePageRoot']),
        bottomNavigation: layer(mainHudLayer, 'BottomNavigation', ['CuteBottomNav']),
        drawerLayer: layer(popupLayer, 'DrawerLayer', ['CuteDrawerLayer']),
        modalLayer: layer(popupLayer, 'ModalLayer', ['CuteModalLayer']),
        utilityLayer: layer(popupLayer, 'UtilityLayer', ['CuteUtilityLayer']),
        battleLayer: layer(popupLayer, 'BattleLayer', ['CuteBattleResultLayer']),
        revealLayer: layer(popupLayer, 'RevealLayer', ['CuteRevealLayer']),
        guideLayer,
        toastLayer,
        loadingLayer,
    };

    const safe = safeAreaInsets();
    setRect(result.topBar, 0, 570 - safe.top, DESIGN_WIDTH, 140);
    setRect(result.pageRoot, 0, -5 + (safe.bottom - safe.top) / 2, DESIGN_WIDTH, 1010);
    setRect(result.bottomNavigation, 0, -537.5 + safe.bottom, DESIGN_WIDTH, 205);
    preparePageContainers(result.pageRoot);

    const ordered = [
        result.globalBackground,
        result.pet3dLayer,
        result.mainHudLayer,
        result.pageLayer,
        result.popupLayer,
        result.toastLayer,
        result.guideLayer,
        result.loadingLayer,
    ];
    ordered.forEach((node, index) => node.setSiblingIndex(index));
    result.topBar.setSiblingIndex(0);
    result.bottomNavigation.setSiblingIndex(1);
    [
        result.drawerLayer,
        result.modalLayer,
        result.utilityLayer,
        result.battleLayer,
        result.revealLayer,
    ].forEach((node, index) => node.setSiblingIndex(index));
    applyLayerRecursively(root, canvas.layer);
    root.setSiblingIndex(Math.max(0, canvas.children.length - 1));

    result.drawerLayer.active = false;
    result.revealLayer.active = false;
    result.guideLayer.active = false;
    result.loadingLayer.active = false;
    return result;
}
