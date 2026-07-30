import {
    Color,
    Director,
    Layout,
    Mask,
    Node,
    ScrollView,
    Size,
    Sprite,
    Vec2,
    director,
} from 'cc';
import {
    CuteTheme,
    artImage,
    button,
    formatNumber,
    hitArea,
    image,
    panel,
    safeName,
    setRect,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { UiIconName } from '../../v2/AppRoutes';
import { instantiateDynamicListItem } from '../../prefab/DynamicListPrefabRegistry';
import { createV6PageShell } from '../AppShell';
import { V6_PANEL_GAP, V6_PAGE_WIDTH, V6_SAFE_CONTENT_HEIGHT, V6_SMALL_GAP } from '../UiMetrics';

export type ShopCategoryV6 = 'featured' | 'nurture' | 'skills' | 'materials' | 'hatch' | 'special';
export type ShopSubcategoryV6 = 'all' | 'damage' | 'survival' | 'control' | 'support';

export type ProductVisualV6 = {
    kind: 'art' | 'icon';
    value: string;
};

export type ShopPageV6Options = {
    category: ShopCategoryV6;
    subcategory: ShopSubcategoryV6;
    items: any[];
    selectedItemId: number;
    scrollKey: string;
    initialOffset?: Vec2;
    onCategory: (category: ShopCategoryV6) => void;
    onSubcategory: (subcategory: ShopSubcategoryV6) => void;
    onRefresh: () => void;
    onProduct: (item: any) => void;
    ownedCount: (item: any) => number;
    balance: (item: any) => number;
    productVisual: (item: any) => ProductVisualV6;
    countLabel?: string;
};

const CATEGORY_ROWS: Array<[ShopCategoryV6, string, UiIconName]> = [
    ['featured', '每日精选', 'shop'],
    ['nurture', '宝宝养成', 'pet'],
    ['skills', '技能书', 'skills'],
    ['materials', '培养材料', 'inventory'],
    ['hatch', '孵化用品', 'hatchery'],
    ['special', '限定珍藏', 'collection'],
];

const SKILL_FILTERS: Array<[ShopSubcategoryV6, string]> = [
    ['all', '全部'],
    ['damage', '输出'],
    ['survival', '生存'],
    ['control', '控制'],
    ['support', '辅助'],
];

function currencyType(item: any) {
    return String(item?.currencyType || item?.currency || '').toLowerCase() === 'diamond' ? 'diamond' : 'gold';
}

function productIconColor(icon: string) {
    if (icon === 'potion') return new Color(83, 169, 199, 255);
    if (icon === 'hourglass') return new Color(205, 139, 44, 255);
    if (icon === 'core' || icon === 'fusion') return new Color(170, 105, 197, 255);
    if (icon === 'breed-token' || icon === 'marriage') return new Color(220, 116, 126, 255);
    if (icon === 'food') return new Color(100, 165, 83, 255);
    if (icon === 'material') return new Color(192, 133, 64, 255);
    return CuteTheme.caramel;
}

function createProductCard(parent: Node, item: any, index: number, options: ShopPageV6Options) {
    const id = Number(item?.id || item?.shopItemId || index + 1);
    const selected = id === options.selectedItemId;
    const soldOut = Boolean(item?.soldOut) || (item?.stock !== undefined && Number(item?.stock || 0) <= 0);
    const insufficient = Number(item?.price || 0) > options.balance(item);
    const visual = options.productVisual(item);
    const prefabItem = instantiateDynamicListItem('ShopItem', parent, {
        name: safeName(item?.name, item?.itemCode || '商品'),
        value: `${currencyType(item) === 'diamond' ? '钻石' : '金币'} ${formatNumber(item?.price || 0)}`,
        meta: soldOut
            ? '已售罄'
            : insufficient
                ? `${currencyType(item) === 'diamond' ? '钻石' : '金币'}不足`
                : `拥有 ${options.ownedCount(item)}`,
        iconPath: visual.kind === 'art' ? visual.value : undefined,
    }, () => options.onProduct(item));
    if (prefabItem) {
        setRect(prefabItem, 0, 0, 250, 154);
        const faceSprite = prefabItem.getChildByName('Button')?.getComponent(Sprite);
        if (faceSprite) {
            // Keep the Button component for input, but replace the generic grey
            // Prefab face with the page-owned cream card below.
            faceSprite.enabled = false;
            faceSprite.color = soldOut
                ? new Color(226, 221, 207, 255)
                : insufficient
                    ? new Color(255, 239, 221, 255)
                    : selected
                        ? new Color(255, 232, 170, 255)
                        : new Color(255, 251, 236, 255);
        }

        const outline = panel(
            prefabItem,
            'CardOutline',
            0,
            0,
            250,
            154,
            soldOut
                ? new Color(238, 233, 220, 255)
                : insufficient
                    ? new Color(255, 242, 227, 255)
                    : selected
                        ? new Color(255, 238, 188, 255)
                        : new Color(255, 253, 242, 255),
            20,
            true,
            selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 225),
            selected ? 4 : 2,
        );
        outline.setSiblingIndex(1);

        const prefabIcon = prefabItem.getChildByName('Icon');
        if (prefabIcon) prefabIcon.active = false;
        if (visual.kind === 'art') {
            image(
                prefabItem,
                'ProductArt',
                visual.value,
                -86,
                21,
                72,
                72,
                new Color(250, 235, 206, 255),
                '物',
            );
        } else {
            const iconWell = panel(
                prefabItem,
                'ProductIconWell',
                -86,
                21,
                72,
                72,
                new Color(250, 235, 206, 255),
                20,
                true,
                new Color(222, 188, 139, 190),
                2,
            );
            drawUiIcon(iconWell, 'ProductIcon', visual.value as any, 0, 0, 48, productIconColor(visual.value));
        }
        return prefabItem;
    }

    const card = panel(
        parent,
        `ShopProduct_${id}`,
        0,
        0,
        250,
        154,
        selected ? new Color(255, 232, 170, 255) : new Color(255, 251, 236, 255),
        20,
        true,
        selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 225),
        selected ? 4 : 2,
    );
    if (visual.kind === 'art') artImage(card, 'ProductArt', visual.value, -86, 22, 72, 72);
    else drawUiIcon(card, 'ProductIcon', visual.value as any, -86, 22, 50, productIconColor(visual.value));

    text(card, 'Name', safeName(item?.name, item?.itemCode || '商品'), -42, 48, 152, 38, 16, CuteTheme.caramel, 'left', true);
    text(card, 'Owned', `拥有 ${options.ownedCount(item)}`, -42, 13, 120, 26, 13, CuteTheme.mintDark, 'left', true);
    const limit = Number(item?.purchaseLimit || item?.limit || 0);
    if (soldOut) tag(card, 'State', '已售罄', 80, 52, 72, new Color(224, 211, 203, 255));
    else if (limit > 0) tag(card, 'State', `限购 ${limit}`, 78, 52, 78, CuteTheme.peach);
    else if (insufficient) tag(card, 'State', currencyType(item) === 'diamond' ? '钻石不足' : '金币不足', 72, 52, 92, CuteTheme.peach);

    const priceBar = panel(card, 'PriceBar', 36, -48, 164, 48, currencyType(item) === 'diamond' ? new Color(220, 240, 248, 255) : new Color(255, 237, 184, 255), 17, false, CuteTheme.white, 2);
    const currency = currencyType(item);
    drawUiIcon(priceBar, 'Currency', currency, -54, 0, 25, currency === 'diamond' ? new Color(76, 174, 213, 255) : new Color(216, 157, 45, 255));
    text(priceBar, 'Price', formatNumber(item?.price || 0), 18, 0, 104, 34, 17, CuteTheme.caramel, 'center', true);
    hitArea(card, 'OpenProduct', 0, 0, 250, 154, () => options.onProduct(item));
    return card;
}

function createProductScroll(parent: Node, options: ShopPageV6Options, viewportWidth: number, viewportHeight: number) {
    const viewport = new Node('ShopItemsScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, -28, viewportWidth, viewportHeight);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const content = new Node('Content');
    viewport.addChild(content);
    const rows = Math.max(1, Math.ceil(options.items.length / 2));
    const gridHeight = rows * 164 + 2;
    const footerHeight = 52;
    const bottomPadding = 28;
    const contentHeight = Math.max(viewportHeight, gridHeight + footerHeight + bottomPadding);
    const transform = setRect(content, 0, viewportHeight / 2, viewportWidth, contentHeight);
    transform.setAnchorPoint(0.5, 1);

    const grid = new Node('ProductGrid');
    content.addChild(grid);
    const gridTransform = setRect(grid, 0, 0, viewportWidth, gridHeight);
    gridTransform.setAnchorPoint(0.5, 1);
    const layout = grid.addComponent(Layout);
    layout.type = Layout.Type.GRID;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.startAxis = Layout.AxisDirection.HORIZONTAL;
    layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.cellSize = new Size(250, 154);
    layout.paddingLeft = 8;
    layout.paddingRight = 8;
    layout.paddingTop = 8;
    layout.paddingBottom = 16;
    layout.spacingX = 12;
    layout.spacingY = 12;

    options.items.forEach((item, index) => createProductCard(grid, item, index, options));
    layout.updateLayout();

    const footer = panel(content, 'ListEnd', 0, -gridHeight - footerHeight / 2, viewportWidth - 24, footerHeight, CuteTheme.transparent, 0, false, CuteTheme.transparent, 0);
    panel(footer, 'LineLeft', -128, 0, 120, 2, new Color(188, 145, 92, 90), 1, false, CuteTheme.transparent, 0);
    panel(footer, 'LineRight', 128, 0, 120, 2, new Color(188, 145, 92, 90), 1, false, CuteTheme.transparent, 0);
    text(footer, 'Text', '已经到底了', 0, 0, 132, 28, 13, CuteTheme.muted, 'center', true);

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
        const maxY = Math.max(0, contentHeight - viewportHeight);
        const target = new Vec2(0, Math.max(0, Math.min(maxY, Number(options.initialOffset.y || 0))));
        director.once(Director.EVENT_AFTER_UPDATE, () => {
            if (
                !viewport?.isValid
                || !content?.isValid
                || !scroll?.isValid
                || !scroll.content?.isValid
                || scroll.content !== content
            ) return;
            try {
                scroll.stopAutoScroll();
                scroll.scrollToOffset(target, 0);
            } catch (error) {
                console.warn('[ShopPageV6] skipped stale scroll restore', error);
            }
        });
    }
    return scroll;
}

export function renderShopPageV6(parent: Node, options: ShopPageV6Options) {
    const shell = createV6PageShell(parent, 'ShopLayoutV6');
    const page = shell.content;
    const headerHeight = 86;
    const bodyHeight = V6_SAFE_CONTENT_HEIGHT - headerHeight - V6_PANEL_GAP;
    const bodyY = -headerHeight / 2 - V6_PANEL_GAP / 2;

    const header = panel(page, 'ShopInfoBar', 0, V6_SAFE_CONTENT_HEIGHT / 2 - headerHeight / 2, V6_PAGE_WIDTH, headerHeight, new Color(255, 249, 229, 252), 24, true, new Color(198, 145, 85, 235), 2);
    drawUiIcon(header, 'ShopIcon', 'shop', -302, 0, 48, CuteTheme.honeyDark);
    text(header, 'Title', '每日精选', -262, 17, 190, 34, 24, CuteTheme.caramel, 'left', true);
    text(header, 'Subtitle', '挑选真正能帮助宝宝成长的物资', -262, -19, 280, 28, 14, CuteTheme.muted, 'left', false);
    text(header, 'RefreshTime', '每日 05:00 更新', 112, 16, 150, 28, 14, CuteTheme.muted, 'center', true);
    button(header, 'Refresh', '刷新货架', 242, -16, 130, 44, options.onRefresh, { fill: CuteTheme.honey, fontSize: 14, radius: 18 });

    const railWidth = 112;
    const productsWidth = V6_PAGE_WIDTH - railWidth - V6_PANEL_GAP;
    const railX = -V6_PAGE_WIDTH / 2 + railWidth / 2;
    const productsX = V6_PAGE_WIDTH / 2 - productsWidth / 2;
    const rail = panel(page, 'ShopCategoryRail', railX, bodyY, railWidth, bodyHeight, new Color(255, 248, 226, 248), 22, true, new Color(205, 158, 103, 225), 2);
    text(rail, 'Title', '商品分类', 0, bodyHeight / 2 - 38, 104, 30, 17, CuteTheme.caramel, 'center', true);
    CATEGORY_ROWS.forEach(([key, title, icon], index) => {
        const categoryButton = button(
            rail,
            `Category_${key}`,
            '',
            0,
            bodyHeight / 2 - 102 - index * 90,
            104,
            68,
            () => options.onCategory(key),
            {
                selected: options.category === key,
                fill: options.category === key ? CuteTheme.honey : new Color(255, 252, 239, 245),
                radius: 20,
            },
        );
        drawUiIcon(categoryButton, 'CategoryIcon', icon, 0, 15, 28, options.category === key ? CuteTheme.honeyDark : CuteTheme.caramel);
        text(categoryButton, 'CategoryTitle', title, 0, -20, 92, 26, 14, CuteTheme.caramel, 'center', true);
    });
    text(rail, 'Guide', '切换分类后\n从顶部开始', 0, -bodyHeight / 2 + 50, 96, 46, 12, CuteTheme.muted, 'center', false);

    const products = panel(page, 'ProductPanel', productsX, bodyY, productsWidth, bodyHeight, new Color(255, 249, 230, 246), 22, true, new Color(205, 158, 103, 225), 2);
    text(products, 'Title', options.category === 'featured' ? '全部精选' : CATEGORY_ROWS.find(([key]) => key === options.category)?.[1] || '商品列表', -productsWidth / 2 + 22, bodyHeight / 2 - 34, 210, 32, 19, CuteTheme.caramel, 'left', true);
    text(products, 'Count', options.countLabel || `${options.items.length} 件 · 上下滑动查看更多`, productsWidth / 2 - 22, bodyHeight / 2 - 34, 260, 30, 13, CuteTheme.muted, 'right', false);

    let scrollTopInset = 76;
    if (options.category === 'skills') {
        const filterBar = panel(products, 'SkillFilterBar', 0, bodyHeight / 2 - 82, productsWidth - 32, 48, new Color(250, 242, 219, 245), 16, false, CuteTheme.transparent, 0);
        const chipWidth = 88;
        const totalWidth = SKILL_FILTERS.length * chipWidth + (SKILL_FILTERS.length - 1) * V6_SMALL_GAP;
        SKILL_FILTERS.forEach(([key, label], index) => {
            button(
                filterBar,
                `SkillFilter_${key}`,
                label,
                -totalWidth / 2 + chipWidth / 2 + index * (chipWidth + V6_SMALL_GAP),
                0,
                chipWidth,
                36,
                () => options.onSubcategory(key),
                {
                    selected: options.subcategory === key,
                    fill: options.subcategory === key ? CuteTheme.honey : new Color(255, 252, 239, 245),
                    fontSize: 13,
                    radius: 14,
                },
            );
        });
        scrollTopInset = 126;
    }

    if (options.items.length) {
        const scroll = createProductScroll(products, options, productsWidth - 16, bodyHeight - scrollTopInset);
        scroll.node.setPosition(0, -28 - (scrollTopInset - 76) / 2);
    } else {
        const empty = panel(
            products,
            'EmptyState',
            0,
            -16,
            productsWidth - 64,
            260,
            new Color(255, 253, 243, 248),
            24,
            false,
            new Color(221, 185, 134, 190),
            2,
        );
        const iconWell = panel(empty, 'IconWell', 0, 76, 82, 82, new Color(255, 239, 195, 255), 28, false, CuteTheme.white, 2);
        drawUiIcon(iconWell, 'Icon', 'shop', 0, 0, 52, CuteTheme.honeyDark);
        text(empty, 'Title', '这一栏正在补货', 0, 20, productsWidth - 120, 38, 21, CuteTheme.caramel, 'center', true);
        text(empty, 'Hint', '刷新货架，或先看看其他分类', 0, -20, productsWidth - 120, 30, 14, CuteTheme.muted, 'center', false);
        button(empty, 'RefreshAction', '刷新货架', 0, -82, 164, 50, options.onRefresh, {
            fill: CuteTheme.honey,
            fontSize: 14,
            radius: 20,
        });
    }
}
