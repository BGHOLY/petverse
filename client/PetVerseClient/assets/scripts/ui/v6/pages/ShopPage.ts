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
    formatNumber,
    hitArea,
    panel,
    safeName,
    setRect,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { createV6PageShell } from '../AppShell';
import { V6_CONTENT_HEIGHT, V6_PANEL_GAP, V6_PAGE_WIDTH } from '../UiMetrics';

export type ShopCategoryV6 = 'featured' | 'nurture' | 'skills' | 'materials' | 'hatch' | 'special';

export type ProductVisualV6 = {
    kind: 'art' | 'icon';
    value: string;
};

export type ShopPageV6Options = {
    category: ShopCategoryV6;
    items: any[];
    selectedItemId: number;
    scrollKey: string;
    initialOffset?: Vec2;
    onCategory: (category: ShopCategoryV6) => void;
    onRefresh: () => void;
    onProduct: (item: any) => void;
    ownedCount: (item: any) => number;
    balance: (item: any) => number;
    productVisual: (item: any) => ProductVisualV6;
    countLabel?: string;
};

const CATEGORY_ROWS: Array<[ShopCategoryV6, string, string]> = [
    ['featured', '每日精选', 'shop'],
    ['nurture', '宝宝养成', 'pet'],
    ['skills', '技能书', 'skill'],
    ['materials', '培养材料', 'bag'],
    ['hatch', '孵化用品', 'egg'],
    ['special', '限定珍藏', 'star'],
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
    const card = panel(
        parent,
        `ShopProduct_${id}`,
        0,
        0,
        254,
        154,
        selected ? new Color(255, 232, 170, 255) : new Color(255, 251, 236, 255),
        20,
        true,
        selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 225),
        selected ? 4 : 2,
    );
    const visual = options.productVisual(item);
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
    hitArea(card, 'OpenProduct', 0, 0, 254, 154, () => options.onProduct(item));
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
    layout.cellSize = new Size(254, 154);
    layout.paddingLeft = 6;
    layout.paddingRight = 6;
    layout.paddingTop = 6;
    layout.paddingBottom = 6;
    layout.spacingX = 10;
    layout.spacingY = 10;

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
            if (!viewport.isValid || !content.isValid || !scroll.isValid || scroll.content !== content) return;
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
    const headerHeight = 90;
    const bodyHeight = V6_CONTENT_HEIGHT - headerHeight - V6_PANEL_GAP;
    const bodyY = -headerHeight / 2 - V6_PANEL_GAP / 2;

    const header = panel(page, 'ShopInfoBar', 0, V6_CONTENT_HEIGHT / 2 - headerHeight / 2, V6_PAGE_WIDTH, headerHeight, new Color(255, 249, 229, 252), 24, true, new Color(198, 145, 85, 235), 2);
    drawUiIcon(header, 'ShopIcon', 'shop', -302, 0, 48, CuteTheme.honeyDark);
    text(header, 'Title', '每日精选', -262, 17, 190, 34, 24, CuteTheme.caramel, 'left', true);
    text(header, 'Subtitle', '挑选真正能帮助宝宝成长的物资', -262, -19, 280, 28, 14, CuteTheme.muted, 'left', false);
    text(header, 'RefreshTime', '每日 05:00 更新', 112, 16, 150, 28, 14, CuteTheme.muted, 'center', true);
    button(header, 'Refresh', '刷新货架', 242, -16, 130, 44, options.onRefresh, { fill: CuteTheme.honey, fontSize: 14, radius: 18 });

    const railWidth = 120;
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

    if (options.items.length) {
        createProductScroll(products, options, productsWidth - 16, bodyHeight - 76);
    } else {
        text(products, 'Empty', '当前分类暂时没有商品\n刷新货架后再来看看吧', 0, 0, productsWidth - 70, 100, 19, CuteTheme.muted, 'center', true);
    }
}
