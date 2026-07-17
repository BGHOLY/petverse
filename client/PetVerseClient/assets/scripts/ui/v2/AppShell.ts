import { BlockInputEvents, Node, screen, sys } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH, clearNode, getOrCreate, setRect } from '../cute/CuteUiKit';
import { PageName } from './AppRoutes';
import {
    V6_BOTTOM_NAV_CENTER_Y,
    V6_BOTTOM_NAV_HEIGHT,
    V6_CONTENT_CENTER_Y,
    V6_CONTENT_HEIGHT,
    V6_TOP_BAR_CENTER_Y,
    V6_TOP_BAR_HEIGHT,
} from '../v6/UiMetrics';

export type AppShellLayers = {
    root: Node;
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
    const root = getOrCreate(canvas, 'PetVerseUIRoot');
    setRect(root, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    if (!root.getComponent(BlockInputEvents)) root.addComponent(BlockInputEvents);

    for (const name of LEGACY_CANVAS_LAYERS) {
        const legacyLayer = canvas.getChildByName(name);
        if (legacyLayer && legacyLayer !== root) legacyLayer.active = false;
    }

    const result: AppShellLayers = {
        root,
        globalBackground: layer(root, 'GlobalBackground', ['BackgroundLayer', 'Background']),
        topBar: layer(root, 'TopBar', ['CuteTopBar']),
        pageRoot: layer(root, 'PageRoot', ['CutePageRoot']),
        bottomNavigation: layer(root, 'BottomNavigation', ['CuteBottomNav']),
        drawerLayer: layer(root, 'DrawerLayer', ['CuteDrawerLayer']),
        modalLayer: layer(root, 'ModalLayer', ['CuteModalLayer']),
        utilityLayer: layer(root, 'UtilityLayer', ['CuteUtilityLayer']),
        battleLayer: layer(root, 'BattleLayer', ['CuteBattleResultLayer']),
        revealLayer: layer(root, 'RevealLayer', ['CuteRevealLayer']),
        guideLayer: layer(root, 'GuideLayer', ['CuteGuideLayer']),
        toastLayer: layer(root, 'ToastLayer', ['CuteToastLayer']),
        loadingLayer: layer(root, 'LoadingLayer', ['CuteLoadingLayer']),
    };

    const safe = safeAreaInsets();
    setRect(result.topBar, 0, V6_TOP_BAR_CENTER_Y - safe.top, DESIGN_WIDTH, V6_TOP_BAR_HEIGHT);
    setRect(result.pageRoot, 0, V6_CONTENT_CENTER_Y + (safe.bottom - safe.top) / 2, DESIGN_WIDTH, V6_CONTENT_HEIGHT);
    setRect(result.bottomNavigation, 0, V6_BOTTOM_NAV_CENTER_Y + safe.bottom, DESIGN_WIDTH, V6_BOTTOM_NAV_HEIGHT);
    preparePageContainers(result.pageRoot);

    const ordered = [
        result.globalBackground,
        result.topBar,
        result.pageRoot,
        result.bottomNavigation,
        result.drawerLayer,
        result.modalLayer,
        result.utilityLayer,
        result.battleLayer,
        result.revealLayer,
        result.guideLayer,
        result.toastLayer,
        result.loadingLayer,
    ];
    ordered.forEach((node, index) => node.setSiblingIndex(index));
    applyLayerRecursively(root, canvas.layer);

    result.drawerLayer.active = false;
    result.revealLayer.active = false;
    result.guideLayer.active = false;
    result.loadingLayer.active = false;
    return result;
}
