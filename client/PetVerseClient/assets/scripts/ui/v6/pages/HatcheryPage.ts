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
    hitArea,
    panel,
    progress,
    setRect,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { getEggArtPath, getEggDisplayName } from '../../v10/EggArtRegistry';
import { createV6PageShell } from '../AppShell';
import { V6_PAGE_WIDTH, V6_PANEL_GAP, V6_SAFE_CONTENT_HEIGHT } from '../UiMetrics';
import { instantiateDynamicListItem } from '../../prefab/DynamicListPrefabRegistry';

export type HatcheryEggFilterV6 = 'all' | 'normal' | 'rare' | 'mutant';
export type HatcheryEggSortV6 = 'rarity' | 'created' | 'hatchTime';

export type HatcherySlotV6 = {
    slot: number;
    egg: any | null;
    remaining: number;
    total: number;
    ready: boolean;
};

export type HatcheryPageV6Options = {
    slots: HatcherySlotV6[];
    eggs: any[];
    totalStored: number;
    capacity: number;
    filter: HatcheryEggFilterV6;
    sort: HatcheryEggSortV6;
    selectedEggId: number;
    warehouseOpen: boolean;
    scrollKey: string;
    initialOffset?: Vec2;
    formatDuration: (seconds: number) => string;
    formatEggDuration: (egg: any) => string;
    onFilter: (filter: HatcheryEggFilterV6) => void;
    onSort: () => void;
    onChooseEgg: (egg: any) => void;
    onChooseEmptySlot: (slot: number) => void;
    onAccelerate: (egg: any) => void;
    onCollect: (egg: any) => void;
    onToggleWarehouse: () => void;
    onGoMarriage: () => void;
    onBackHome: () => void;
};

const FILTERS: Array<[HatcheryEggFilterV6, string]> = [
    ['all', '全部'],
    ['normal', '普通'],
    ['rare', '稀有'],
    ['mutant', '变异'],
];

function parentNames(egg: any) {
    const snapshot = egg?.parentSnapshot || {};
    const parentA = snapshot?.parentA || snapshot?.father || {};
    const parentB = snapshot?.parentB || snapshot?.mother || {};
    const nameA = String(parentA?.nickname || parentA?.name || egg?.parentNameA || '').trim();
    const nameB = String(parentB?.nickname || parentB?.name || egg?.parentNameB || '').trim();
    return nameA || nameB ? `${nameA || '未知'} × ${nameB || '未知'}` : '活动或商店获得';
}

function renderIncubator(parent: Node, slot: HatcherySlotV6, options: HatcheryPageV6Options, x: number) {
    const active = Boolean(slot.egg);
    const card = panel(
        parent,
        `NurseryNest_${slot.slot}`,
        x,
        0,
        216,
        300,
        slot.slot === 1
            ? new Color(246, 250, 227, 250)
            : slot.slot === 2
                ? new Color(255, 244, 228, 250)
                : new Color(244, 238, 255, 250),
        28,
        true,
        active ? CuteTheme.honeyDark : new Color(145, 184, 137, 225),
        active ? 3 : 2,
    );
    tag(card, 'SlotNumber', `育宠窝 0${slot.slot}`, 0, 120, 108, active ? CuteTheme.honey : CuteTheme.mint);
    const chamber = panel(
        card,
        'NestCushion',
        0,
        31,
        174,
        150,
        active ? new Color(255, 241, 194, 255) : new Color(237, 247, 222, 255),
        70,
        true,
        new Color(218, 179, 121, 210),
        3,
    );
    panel(card, 'NestBase', 0, -40, 184, 48, new Color(221, 185, 126, 210), 22, false, new Color(181, 130, 77, 210), 2);

    if (!slot.egg) {
        const selectedEgg = options.eggs.find((egg) => Number(egg?.id || 0) === options.selectedEggId) || null;
        if (selectedEgg) artImage(chamber, 'SelectedEggArt', getEggArtPath(selectedEgg), 0, 22, 76, 94);
        else drawUiIcon(chamber, 'EmptyEgg', 'hatchery', 0, 18, 62, CuteTheme.honeyDark);
        text(chamber, 'EmptyState', selectedEgg ? `${getEggDisplayName(selectedEgg)}\n等待放入` : '柔软空窝\n等待宠物蛋', 0, -40, 142, 48, 14, selectedEgg ? CuteTheme.caramel : CuteTheme.muted, 'center', true);
        text(card, 'Status', selectedEgg ? '已选择宠物蛋' : '温度适宜 · 可以使用', 0, -65, 176, 26, 12, selectedEgg ? CuteTheme.honeyDark : CuteTheme.mintDark, 'center', true);
        button(card, 'ChooseEgg', selectedEgg ? '放入这个窝' : '打开蛋仓库', 0, -111, 148, 42, () => {
            if (selectedEgg) options.onChooseEmptySlot(slot.slot);
            else options.onToggleWarehouse();
        }, { fill: selectedEgg ? CuteTheme.honey : CuteTheme.mint, fontSize: 13, radius: 17 });
        return;
    }

    artImage(chamber, 'EggArt', getEggArtPath(slot.egg), 0, 20, 86, 106);
    if (slot.egg?.isMutant) tag(chamber, 'Mutant', '变异', 50, 66, 56, CuteTheme.peach);
    text(chamber, 'EggName', getEggDisplayName(slot.egg), 0, -48, 150, 28, 13, CuteTheme.caramel, 'center', true);
    progress(card, 'Progress', 0, -60, 166, 12, slot.ready ? 1 : 1 - slot.remaining / Math.max(1, slot.total), slot.ready ? CuteTheme.green : CuteTheme.honey);
    text(card, 'Time', slot.ready ? '孵化完成' : options.formatDuration(slot.remaining), 0, -82, 150, 24, 13, slot.ready ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
    button(card, 'Accelerate', '加速', -48, -119, 86, 38, () => options.onAccelerate(slot.egg), { fill: CuteTheme.sky, fontSize: 12, radius: 15, disabled: slot.ready });
    button(card, 'Collect', slot.ready ? '领取' : '孵化中', 48, -119, 86, 38, () => options.onCollect(slot.egg), { fill: slot.ready ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 12, radius: 15, disabled: !slot.ready });
}

function renderEggCard(parent: Node, egg: any, index: number, options: HatcheryPageV6Options) {
    const rarity = Math.max(1, Math.min(6, Number(egg?.rarityPotential || 1)));
    const selected = Number(egg?.id || 0) === Number(options.selectedEggId || 0);
    const prefabItem = instantiateDynamicListItem('HatcheryEggItem', parent, {
        name: getEggDisplayName(egg),
        value: `${rarity}★${egg?.isMutant ? ' · 变异' : ''}`,
        meta: `父母 ${parentNames(egg)}`,
        iconPath: getEggArtPath(egg),
    }, () => options.onChooseEgg(egg));
    if (prefabItem) {
        setRect(prefabItem, 0, 0, 150, 132);
        const faceSprite = prefabItem.getChildByName('Button')?.getComponent(Sprite);
        if (faceSprite) {
            faceSprite.enabled = false;
            faceSprite.color = selected
                ? new Color(255, 243, 193, 255)
                : egg?.isMutant
                    ? new Color(255, 236, 226, 255)
                    : new Color(255, 252, 239, 255);
        }
        const outline = panel(
            prefabItem,
            'CardOutline',
            0,
            0,
            150,
            132,
            selected
                ? new Color(255, 243, 193, 255)
                : egg?.isMutant
                    ? new Color(255, 239, 229, 255)
                    : new Color(255, 253, 242, 255),
            20,
            true,
            selected ? CuteTheme.honeyDark : egg?.isMutant ? CuteTheme.peachDark : new Color(211, 171, 116, 230),
            selected ? 4 : egg?.isMutant ? 3 : 2,
        );
        outline.setSiblingIndex(1);
        return prefabItem;
    }

    const card = panel(
        parent,
        `WarehouseEgg_${egg?.id || index}`,
        0,
        0,
        150,
        132,
        selected ? new Color(255, 243, 193, 255) : egg?.isMutant ? new Color(255, 236, 226, 255) : new Color(255, 252, 239, 255),
        20,
        true,
        selected ? CuteTheme.honeyDark : egg?.isMutant ? CuteTheme.peachDark : new Color(211, 171, 116, 230),
        selected ? 4 : egg?.isMutant ? 3 : 2,
    );
    artImage(card, 'EggArt', getEggArtPath(egg), 0, 28, 56, 66);
    text(card, 'Name', getEggDisplayName(egg), 0, -17, 136, 26, 13, CuteTheme.caramel, 'center', true);
    text(card, 'Meta', `${rarity}★${egg?.isMutant ? ' · 变异' : ''}`, 0, -44, 136, 22, 11, egg?.isMutant ? CuteTheme.peachDark : CuteTheme.honeyDark, 'center', true);
    hitArea(card, 'OpenEgg', 0, 0, 150, 132, () => options.onChooseEgg(egg));
}

function renderWarehouseScroll(parent: Node, options: HatcheryPageV6Options, width: number, height: number) {
    const viewport = new Node('HatcheryEggScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, 0, width, height);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const rows = Math.max(1, Math.ceil(options.eggs.length / 4));
    const cardHeight = 132;
    const rowGap = 12;
    const gridPadding = 8;
    const gridHeight = gridPadding * 2 + rows * cardHeight + Math.max(0, rows - 1) * rowGap;
    const footerHeight = 48;
    const contentHeight = Math.max(height, gridHeight + footerHeight + 24);
    const content = new Node('Content');
    viewport.addChild(content);
    const contentTransform = setRect(content, 0, height / 2, width, contentHeight);
    contentTransform.setAnchorPoint(0.5, 1);

    const grid = new Node('EggGrid');
    content.addChild(grid);
    const gridTransform = setRect(grid, 0, 0, width, gridHeight);
    gridTransform.setAnchorPoint(0.5, 1);
    const layout = grid.addComponent(Layout);
    layout.type = Layout.Type.GRID;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.startAxis = Layout.AxisDirection.HORIZONTAL;
    layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.cellSize = new Size(150, cardHeight);
    layout.paddingLeft = gridPadding;
    layout.paddingRight = gridPadding;
    layout.paddingTop = gridPadding;
    layout.paddingBottom = gridPadding;
    layout.spacingX = 8;
    layout.spacingY = rowGap;
    options.eggs.forEach((egg, index) => renderEggCard(grid, egg, index, options));
    layout.updateLayout();

    if (options.eggs.length) {
        text(content, 'ListEnd', '—— 已经到底了 ——', 0, -gridHeight - 22, width - 30, 30, 13, CuteTheme.muted, 'center', true);
    } else {
        const empty = panel(
            content,
            'EmptyState',
            0,
            -height / 2,
            width - 86,
            230,
            new Color(255, 253, 243, 248),
            24,
            false,
            new Color(221, 185, 134, 180),
            2,
        );
        const iconWell = panel(empty, 'IconWell', 0, 64, 76, 76, new Color(237, 247, 222, 255), 26, false, CuteTheme.white, 2);
        drawUiIcon(iconWell, 'Icon', 'hatchery', 0, 0, 48, CuteTheme.mintDark);
        text(empty, 'Title', options.totalStored ? '这个筛选下没有宠物蛋' : '蛋仓库还是空的', 0, 10, width - 150, 36, 19, CuteTheme.caramel, 'center', true);
        text(empty, 'Hint', options.totalStored ? '切回全部，即可查看仓库里的其他宠物蛋' : '可通过好友结婚、生蛋或活动获得', 0, -28, width - 150, 34, 13, CuteTheme.muted, 'center', false);
        if (options.totalStored) {
            button(empty, 'ShowAll', '查看全部', 0, -78, 148, 44, () => options.onFilter('all'), { fill: CuteTheme.honey, fontSize: 13, radius: 18 });
        } else {
            button(empty, 'GoMarriage', '前往好友/结婚', -96, -78, 176, 44, options.onGoMarriage, { fill: CuteTheme.honey, fontSize: 13, radius: 18 });
            button(empty, 'BackHome', '返回首页', 96, -78, 142, 44, options.onBackHome, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 18 });
        }
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
            if (
                !viewport?.isValid
                || !content?.isValid
                || !scroll?.isValid
                || !scroll.content?.isValid
                || scroll.content !== content
            ) return;
            scroll.stopAutoScroll();
            scroll.scrollToOffset(target, 0);
        });
    }
}

export function renderHatcheryPageV6(parent: Node, options: HatcheryPageV6Options) {
    const shell = createV6PageShell(parent, 'HatcheryLayoutV6');
    const page = shell.content;
    const headerHeight = 82;
    const drawerHeight = 96;
    const incubatorHeight = options.warehouseOpen
        ? 320
        : V6_SAFE_CONTENT_HEIGHT - headerHeight - drawerHeight - V6_PANEL_GAP * 2;
    const warehouseHeight = V6_SAFE_CONTENT_HEIGHT - headerHeight - incubatorHeight - V6_PANEL_GAP * 2;
    let cursor = V6_SAFE_CONTENT_HEIGHT / 2;

    const header = panel(
        page,
        'HatcheryInfoBar',
        0,
        cursor - headerHeight / 2,
        V6_PAGE_WIDTH,
        headerHeight,
        new Color(246, 250, 227, 252),
        24,
        true,
        new Color(145, 184, 137, 225),
        2,
    );
    cursor -= headerHeight + V6_PANEL_GAP;
    drawUiIcon(header, 'EggIcon', 'hatchery', -304, 0, 44, CuteTheme.mintDark);
    text(header, 'Title', '魔法育宠温室', -265, 15, 250, 34, 23, CuteTheme.caramel, 'left', true);
    text(header, 'Subtitle', '从蛋仓库选蛋 → 放入育宠窝 → 等待破壳 → 领取宝宝', -265, -18, 520, 26, 13, CuteTheme.muted, 'left', true);

    const incubators = panel(
        page,
        'NurseryScene',
        0,
        cursor - incubatorHeight / 2,
        V6_PAGE_WIDTH,
        incubatorHeight,
        new Color(242, 248, 224, 248),
        24,
        true,
        new Color(145, 184, 137, 225),
        3,
    );
    cursor -= incubatorHeight + V6_PANEL_GAP;
    const nestRow = new Node('NurseryNestRow');
    incubators.addChild(nestRow);
    setRect(nestRow, 0, options.warehouseOpen ? 0 : 72, V6_PAGE_WIDTH, 320);
    options.slots.forEach((slot, index) => renderIncubator(nestRow, slot, options, -220 + index * 220));

    if (!options.warehouseOpen) {
        const activeCount = options.slots.filter((slot) => Boolean(slot.egg)).length;
        const readyCount = options.slots.filter((slot) => slot.ready).length;
        const nurseryStatus = panel(
            incubators,
            'NurseryStatus',
            0,
            -245,
            V6_PAGE_WIDTH - 56,
            150,
            new Color(255, 252, 239, 248),
            24,
            true,
            new Color(218, 179, 121, 205),
            2,
        );
        drawUiIcon(nurseryStatus, 'StatusIcon', readyCount ? 'benefits' : 'hatchery', -270, 8, 42, readyCount ? CuteTheme.honeyDark : CuteTheme.mintDark);
        text(
            nurseryStatus,
            'StatusTitle',
            readyCount ? `${readyCount}只宝宝等待破壳` : activeCount ? `${activeCount}个育宠窝正在孵化` : '温室今天很安静',
            -232,
            24,
            360,
            34,
            20,
            readyCount ? CuteTheme.honeyDark : CuteTheme.caramel,
            'left',
            true,
        );
        text(
            nurseryStatus,
            'StatusHint',
            readyCount
                ? '点击上方已完成的育宠窝领取新宝宝'
                : activeCount
                    ? '回来看看孵化进度，完成后会亮起领取提示'
                    : '从下方蛋仓库挑选一枚宠物蛋开始培育',
            -232,
            -18,
            470,
            40,
            13,
            CuteTheme.muted,
            'left',
            true,
        );

        const drawer = panel(
            page,
            'EggWarehouseDrawer',
            0,
            cursor - drawerHeight / 2,
            V6_PAGE_WIDTH,
            drawerHeight,
            new Color(255, 249, 230, 252),
            24,
            true,
            new Color(190, 137, 78, 235),
            3,
        );
        drawUiIcon(drawer, 'WarehouseIcon', 'inventory', -300, 0, 42, CuteTheme.honeyDark);
        text(drawer, 'Title', `宝宝蛋仓库 ${options.totalStored}/${options.capacity}`, -260, 15, 300, 32, 19, CuteTheme.caramel, 'left', true);
        text(drawer, 'Hint', options.totalStored ? '展开后挑选要培育的宠物蛋' : '还没有宠物蛋，先去结婚或参加活动', -260, -18, 380, 28, 12, CuteTheme.muted, 'left', true);
        button(drawer, 'OpenWarehouse', options.totalStored ? '展开仓库' : '查看仓库', 264, 0, 142, 50, options.onToggleWarehouse, {
            fill: CuteTheme.honey,
            fontSize: 14,
            radius: 20,
        });
        return;
    }

    const warehouse = panel(page, 'EggWarehouse', 0, cursor - warehouseHeight / 2, V6_PAGE_WIDTH, warehouseHeight, new Color(255, 249, 230, 248), 24, true, new Color(190, 137, 78, 235), 3);
    const warehouseHeader = panel(
        warehouse,
        'WarehouseHeader',
        0,
        warehouseHeight / 2 - 58,
        V6_PAGE_WIDTH - 18,
        104,
        new Color(250, 240, 211, 248),
        20,
        true,
        new Color(218, 179, 121, 205),
        2,
    );
    warehouseHeader.setSiblingIndex(0);
    text(warehouse, 'Title', `宝宝蛋仓库 ${options.totalStored}/${options.capacity}`, -306, warehouseHeight / 2 - 32, 300, 34, 19, CuteTheme.caramel, 'left', true);
    button(warehouse, 'CloseWarehouse', '收起仓库', 258, warehouseHeight / 2 - 32, 132, 40, options.onToggleWarehouse, {
        fill: CuteTheme.paperWarm,
        fontSize: 12,
        radius: 16,
    });
    FILTERS.forEach(([key, label], index) => button(warehouse, `Filter_${key}`, label, -258 + index * 86, warehouseHeight / 2 - 78, 78, 40, () => options.onFilter(key), {
        selected: options.filter === key,
        fill: options.filter === key ? CuteTheme.honey : CuteTheme.paperWarm,
        fontSize: 13,
        radius: 16,
    }));
    const sortLabel = options.sort === 'rarity' ? '稀有度优先' : options.sort === 'created' ? '获取时间' : '孵化时间';
    button(warehouse, 'Sort', sortLabel, 258, warehouseHeight / 2 - 78, 132, 40, options.onSort, { fill: CuteTheme.sky, fontSize: 12, radius: 16 });
    const scrollHeight = warehouseHeight - 116;
    const scrollHost = panel(
        warehouse,
        'EggListPanel',
        0,
        -50,
        V6_PAGE_WIDTH - 24,
        scrollHeight,
        new Color(255, 253, 242, 230),
        18,
        true,
        new Color(218, 179, 121, 190),
        2,
    );
    // Four compact cards fit with spare room, preventing a rounding wrap.
    renderWarehouseScroll(scrollHost, options, V6_PAGE_WIDTH - 32, scrollHeight - 12);
}

