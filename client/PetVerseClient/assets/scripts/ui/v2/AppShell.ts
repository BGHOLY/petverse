import { Node } from 'cc';
import { PageName } from './AppRoutes';

export type AppShellLayers = {
    root: Node;
    globalBackground: Node;
    pageRoot: Node;
    topBar: Node;
    bottomNavigation: Node;
    overlayRoot: Node;
    fullScreenRoot: Node;
    systemRoot: Node;
    reconnect: Node;
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
    return PAGE_CONTAINERS
        .map((name) => pageRoot.getChildByName(name))
        .filter((node): node is Node => Boolean(node));
}

export function resolvePageContainer(pageRoot: Node, page: PageName) {
    const name = containerName(page);
    const target = pageRoot.getChildByName(name);
    if (!target) {
        console.error(`[AppShell] MainScene is missing the editor-owned page node "${name}".`);
        return null;
    }
    for (const child of pageRoot.children) child.active = child === target;
    return target;
}

function requireDirectChild(parent: Node, name: string) {
    const child = parent.getChildByName(name);
    if (!child) throw new Error(`[AppShell] MainScene is missing required node "${parent.name}/${name}".`);
    return child;
}

/**
 * Resolves the editor-authored shell without creating, sizing, anchoring,
 * reordering, or deleting nodes. MainScene/Prefab transforms are authoritative.
 */
export function resolveAppShell(canvas: Node): AppShellLayers {
    const root = requireDirectChild(canvas, 'PetVerseUIRoot');
    const overlayRoot = requireDirectChild(root, 'OverlayRoot');
    const fullScreenRoot = requireDirectChild(root, 'FullScreenRoot');
    const systemRoot = requireDirectChild(root, 'SystemRoot');

    const result: AppShellLayers = {
        root,
        globalBackground: requireDirectChild(root, 'GlobalBackground'),
        pageRoot: requireDirectChild(root, 'PageRoot'),
        topBar: requireDirectChild(root, 'TopBar'),
        bottomNavigation: requireDirectChild(root, 'BottomNavigation'),
        overlayRoot,
        fullScreenRoot,
        systemRoot,
        reconnect: requireDirectChild(overlayRoot, 'Reconnect'),
        drawerLayer: requireDirectChild(overlayRoot, 'DrawerLayer'),
        modalLayer: requireDirectChild(overlayRoot, 'ModalLayer'),
        utilityLayer: requireDirectChild(overlayRoot, 'UtilityLayer'),
        battleLayer: requireDirectChild(fullScreenRoot, 'BattleLayer'),
        revealLayer: requireDirectChild(overlayRoot, 'RevealLayer'),
        guideLayer: requireDirectChild(overlayRoot, 'GuideLayer'),
        toastLayer: requireDirectChild(overlayRoot, 'ToastLayer'),
        loadingLayer: requireDirectChild(overlayRoot, 'LoadingLayer'),
    };

    preparePageContainers(result.pageRoot);
    return result;
}
