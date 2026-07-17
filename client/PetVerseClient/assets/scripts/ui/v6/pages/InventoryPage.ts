import {
    Color,
    Director,
    Layout,
    Mask,
    Node,
    ScrollView,
    Size,
    Vec2,
    director,
} from 'cc';
import {
    CuteTheme,
    artImage,
    button,
    hitArea,
    image,
    panel,
    safeName,
    setRect,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { createV6PageShell } from '../AppShell';
import { V6_CONTENT_HEIGHT, V6_PANEL_GAP, V6_PAGE_WIDTH } from '../UiMetrics';

export type InventoryCategoryV6 = 'all' | 'consumable' | 'material' | 'skill';
export type InventoryItemCategoryV6 = Exclude<InventoryCategoryV6, 'all'>;

export type InventoryVisualV6 = {
    kind: 'art' | 'icon';
    value: string;
};

export type InventoryTargetV6 = {
    name: string;
    meta: string;
    artPath: string;
};

export type InventoryPageV6Options = {
    category: InventoryCategoryV6;
    items: any[];
    totalCount: number;
    capacity: number;
    eggCount: number;
    sortLabel: string;
    selectedItemCode?: string;
    target?: InventoryTargetV6 | null;
    canPreviousTarget: boolean;
    canNextTarget: boolean;
    scrollKey: string;
    initialOffset?: Vec2;
    onCategory: (category: InventoryCategoryV6) => void;
    onPreviousTarget: () => void;
    onNextTarget: () => void;
    onItem: (item: any) => void;
    onSort: () => void;
    onHatchery: () => void;
    itemCategory: (item: any) => InventoryItemCategoryV6;
    itemVisual: (item: any) => InventoryVisualV6;
};

const CATEGORY_TABS: Array<[InventoryCategoryV6, string]> = [
    ['all', '全部'],
    ['consumable', '道具'],
    ['material', '材料'],
    ['skill', '技能书'],
];

function categoryLabel(category: InventoryItemCategoryV6) {
    if (category === 'consumable') return '道具';
    if (category === 'skill') return '技能书';
    return '材料';
}

function categoryColor(category: InventoryItemCategoryV6) {
    if (category === 'consumable') return CuteTheme.mint;
    if (category === 'skill') return CuteTheme.lilac;
    return new Color(226, 191, 142, 255);
}

function iconColor(icon: string, category: InventoryItemCategoryV6) {
    if (icon === 'potion') return new Color(83, 169, 199, 255);
    if (icon === 'hourglass') return new Color(205, 139, 44, 255);
    if (icon === 'core') return new Color(170, 105, 197, 255);
    if (icon === 'breed-token') return new Color(220, 116, 126, 255);
    if (icon === 'food') return new Color(100, 165, 83, 255);
    return category === 'consumable' ? CuteTheme.mintDark : CuteTheme.honeyDark;
}

function createItemCard(parent: Node, item: any, index: number, options: InventoryPageV6Options) {
    const code = String(item?.itemCode || item?.id || index);
    const category = options.itemCategory(item);
    const selected = code === String(options.selectedItemCode || '');
    const card = panel(
        parent,
        `InventoryItem_${code}`,
        0,
        0,
        154,
        134,
        selected ? new Color(255, 232, 170, 255) : new Color(255, 251, 236, 255),
        18,
        true,
        selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 220),
        selected ? 4 : 2,
    );
    const visual = options.itemVisual(item);
    if (visual.kind === 'art') artImage(card, 'ItemArt', visual.value, 0, 25, 56, 56);
    else drawUiIcon(card, 'ItemIcon', visual.value as any, 0, 25, 46, iconColor(visual.value, category));

    text(card, 'Name', safeName(item?.name || item?.itemCode, '道具'), 0, -18, 138, 34, 13, CuteTheme.caramel, 'center', true);
    tag(card, 'Category', categoryLabel(category), -43, -50, 58, categoryColor(category));
    text(card, 'Quantity', `×${Number(item?.quantity || 0)}`, 43, -50, 58, 24, 13, CuteTheme.caramel, 'center', true);
    hitArea(card, 'OpenItem', 0, 0, 154, 134, () => options.onItem(item));
}

function createItemScroll(parent: Node, options: InventoryPageV6Options, width: number, height: number) {
    const viewport = new Node('InventoryItemsScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, 0, width, height);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const content = new Node('Content');
    viewport.addChild(content);
    const rows = Math.max(1, Math.ceil(options.items.length / 4));
    const gridHeight = rows * 144 + 4;
    const footerHeight = 48;
    const bottomPadding = 24;
    const contentHeight = Math.max(height, gridHeight + footerHeight + bottomPadding);
    const contentTransform = setRect(content, 0, height / 2, width, contentHeight);
    contentTransform.setAnchorPoint(0.5, 1);

    const grid = new Node('InventoryGrid');
    content.addChild(grid);
    const gridTransform = setRect(grid, 0, 0, width, gridHeight);
    gridTransform.setAnchorPoint(0.5, 1);
    const layout = grid.addComponent(Layout);
    layout.type = Layout.Type.GRID;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.startAxis = Layout.AxisDirection.HORIZONTAL;
    layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.cellSize = new Size(154, 134);
    layout.paddingLeft = 12;
    layout.paddingRight = 12;
    layout.paddingTop = 6;
    layout.paddingBottom = 6;
    layout.spacingX = 8;
    layout.spacingY = 10;
    options.items.forEach((item, index) => createItemCard(grid, item, index, options));
    layout.updateLayout();

    if (options.items.length) {
        const footer = panel(content, 'ListEnd', 0, -gridHeight - footerHeight / 2, width - 24, footerHeight, CuteTheme.transparent, 0, false, CuteTheme.transparent, 0);
        panel(footer, 'LineLeft', -142, 0, 136, 2, new Color(188, 145, 92, 90), 1, false, CuteTheme.transparent, 0);
        panel(footer, 'LineRight', 142, 0, 136, 2, new Color(188, 145, 92, 90), 1, false, CuteTheme.transparent, 0);
        text(footer, 'Text', '已经到底了', 0, 0, 132, 28, 13, CuteTheme.muted, 'center', true);
    } else {
        text(content, 'Empty', '当前分类暂无物品', 0, -height / 2 + 36, width - 80, 70, 20, CuteTheme.muted, 'center', true);
    }

    const scroll = viewport.addComponent(ScrollView);
    scroll.content = content;
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.inertia = true;
    scroll.brake = 0.72;
    scroll.elastic = true;
    scroll.bounceDuration = 0.22;
    scroll.cancelInnerEvents = true;
    (viewport as any).__petVerseScrollKey = options.scrollKey;

    if (options.initialOffset) {
        const maxY = Math.max(0, contentHeight - height);
        const target = new Vec2(0, Math.max(0, Math.min(maxY, Number(options.initialOffset.y || 0))));
        director.once(Director.EVENT_AFTER_UPDATE, () => {
            if (!viewport.isValid || !content.isValid || !scroll.isValid || scroll.content !== content) return;
            try {
                scroll.stopAutoScroll();
                scroll.scrollToOffset(target, 0);
            } catch (error) {
                console.warn('[InventoryPageV6] skipped stale scroll restore', error);
            }
        });
    }
}

export function renderInventoryPageV6(parent: Node, options: InventoryPageV6Options) {
    const shell = createV6PageShell(parent, 'InventoryLayoutV6');
    const page = shell.content;
    const headerHeight = 88;
    const tabsHeight = 68;
    const targetHeight = 76;
    const footerHeight = 54;
    const gridHeight = V6_CONTENT_HEIGHT - headerHeight - tabsHeight - targetHeight - footerHeight - V6_PANEL_GAP * 4;
    let cursor = V6_CONTENT_HEIGHT / 2;

    const header = panel(page, 'InventoryInfoBar', 0, cursor - headerHeight / 2, V6_PAGE_WIDTH, headerHeight, new Color(255, 249, 229, 252), 24, true, new Color(198, 145, 85, 235), 2);
    cursor -= headerHeight + V6_PANEL_GAP;
    drawUiIcon(header, 'BagIcon', 'inventory', -302, 0, 46, new Color(102, 126, 70, 255));
    text(header, 'Title', '道具仓库', -262, 17, 180, 34, 24, CuteTheme.caramel, 'left', true);
    text(header, 'Subtitle', '分类、选择并安全使用', -262, -19, 260, 28, 14, CuteTheme.muted, 'left');
    button(header, 'HatcheryShortcut', options.eggCount > 0 ? `宠物蛋 ${options.eggCount} · 去孵化室` : '前往孵化室', 230, 0, 178, 46, options.onHatchery, { fill: CuteTheme.honey, fontSize: 13, radius: 18 });

    const tabs = panel(page, 'InventoryCategoryTabs', 0, cursor - tabsHeight / 2, V6_PAGE_WIDTH, tabsHeight, new Color(255, 249, 230, 248), 20, true, new Color(205, 158, 103, 225), 2);
    cursor -= tabsHeight + V6_PANEL_GAP;
    CATEGORY_TABS.forEach(([key, label], index) => {
        button(tabs, `Category_${key}`, label, -246 + index * 164, 0, 150, 48, () => options.onCategory(key), {
            selected: options.category === key,
            fill: options.category === key ? CuteTheme.honey : new Color(255, 252, 239, 245),
            fontSize: 14,
            radius: 18,
        });
    });

    const target = panel(page, 'InventoryUseTarget', 0, cursor - targetHeight / 2, V6_PAGE_WIDTH, targetHeight, new Color(255, 252, 239, 248), 20, true, new Color(205, 158, 103, 210), 2);
    cursor -= targetHeight + V6_PANEL_GAP;
    text(target, 'Title', '使用对象', -302, 0, 86, 30, 14, CuteTheme.caramel, 'left', true);
    if (options.target) {
        image(target, 'Pet', options.target.artPath, -210, 0, 56, 56, CuteTheme.paperWarm, '宠');
        text(target, 'PetName', options.target.name, -170, 13, 260, 28, 17, CuteTheme.caramel, 'left', true);
        text(target, 'PetMeta', options.target.meta, -170, -15, 280, 24, 12, CuteTheme.muted, 'left');
        button(target, 'PreviousPet', '‹', 220, 0, 50, 50, options.onPreviousTarget, { fill: CuteTheme.paperWarm, fontSize: 25, radius: 19, disabled: !options.canPreviousTarget });
        button(target, 'NextPet', '›', 286, 0, 50, 50, options.onNextTarget, { fill: CuteTheme.honey, fontSize: 25, radius: 19, disabled: !options.canNextTarget });
    } else {
        text(target, 'NoPet', '暂无可使用道具的宠物', 0, 0, 430, 36, 16, CuteTheme.peachDark, 'center', true);
    }

    const list = panel(page, 'InventoryItemsPanel', 0, cursor - gridHeight / 2, V6_PAGE_WIDTH, gridHeight, new Color(255, 249, 230, 246), 22, true, new Color(205, 158, 103, 225), 2);
    cursor -= gridHeight + V6_PANEL_GAP;
    createItemScroll(list, options, V6_PAGE_WIDTH - 16, gridHeight - 12);

    const footer = panel(page, 'InventoryFooter', 0, cursor - footerHeight / 2, V6_PAGE_WIDTH, footerHeight, new Color(255, 249, 230, 248), 18, true, new Color(205, 158, 103, 215), 2);
    text(footer, 'Capacity', `容量 ${options.totalCount}/${options.capacity}`, -248, 0, 180, 28, 14, CuteTheme.caramel, 'left', true);
    text(footer, 'ScrollHint', options.items.length > 16 ? '上下滑动查看更多' : '当前分类已全部显示', 0, 0, 220, 28, 13, CuteTheme.muted, 'center', true);
    button(footer, 'Sort', options.sortLabel, 244, 0, 160, 40, options.onSort, { fill: CuteTheme.honey, fontSize: 12, radius: 15 });
}
