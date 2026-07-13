import { BlockInputEvents, Node } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH, clearNode, getOrCreate, setRect } from '../cute/CuteUiKit';
import { PageName } from './AppRoutes';

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

const PAGE_CONTAINERS = ['HomePage', 'PetPage', 'AdventurePage', 'ShopPage', 'MorePage', 'SecondaryPage'];

function containerName(page: PageName) {
    if (page === 'home') return 'HomePage';
    if (page === 'pet') return 'PetPage';
    if (page === 'adventure') return 'AdventurePage';
    if (page === 'shop') return 'ShopPage';
    if (page === 'more') return 'MorePage';
    return 'SecondaryPage';
}

export function preparePageContainers(pageRoot: Node) {
    if (!pageRoot.getChildByName('HomePage')) clearNode(pageRoot);
    return PAGE_CONTAINERS.map((name) => {
        const container = getOrCreate(pageRoot, name);
        setRect(container, 0, 0, DESIGN_WIDTH, 1010);
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

    setRect(result.topBar, 0, 570, DESIGN_WIDTH, 130);
    setRect(result.pageRoot, 0, -5, DESIGN_WIDTH, 1010);
    setRect(result.bottomNavigation, 0, -575, DESIGN_WIDTH, 130);
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

    result.drawerLayer.active = false;
    result.revealLayer.active = false;
    result.guideLayer.active = false;
    result.loadingLayer.active = false;
    return result;
}
