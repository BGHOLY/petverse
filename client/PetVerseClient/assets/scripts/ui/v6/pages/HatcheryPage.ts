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
    panel,
    progress,
    setRect,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { getEggArtPath, getEggDisplayName } from '../../v10/EggArtRegistry';
import { createV6PageShell } from '../AppShell';
import { V6_CONTENT_HEIGHT, V6_PAGE_WIDTH, V6_PANEL_GAP } from '../UiMetrics';

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
        `Incubator_${slot.slot}`,
        x,
        0,
        216,
        320,
        new Color(255, 251, 235, 250),
        28,
        true,
        active ? CuteTheme.honeyDark : new Color(145, 184, 137, 235),
        active ? 3 : 2,
    );
    tag(card, 'SlotNumber', `0${slot.slot}`, 0, 132, 62, active ? CuteTheme.honey : CuteTheme.mint);
    const chamber = panel(card, 'Chamber', 0, 33, 170, 170, active ? new Color(255, 241, 194, 255) : new Color(231, 247, 225, 255), 62, true, new Color(218, 179, 121, 210), 2);

    if (!slot.egg) {
        const selectedEgg = options.eggs.find((egg) => Number(egg?.id || 0) === options.selectedEggId) || null;
        if (selectedEgg) artImage(chamber, 'SelectedEggArt', getEggArtPath(selectedEgg), 0, 22, 76, 94);
        else drawUiIcon(chamber, 'EmptyEgg', 'hatchery', 0, 18, 62, CuteTheme.honeyDark);
        text(chamber, 'EmptyState', selectedEgg ? `${getEggDisplayName(selectedEgg)}\n等待放入` : '空闲\n等待宠物蛋', 0, -47, 142, 52, 14, selectedEgg ? CuteTheme.caramel : CuteTheme.muted, 'center', true);
        text(card, 'Status', selectedEgg ? '已选择宠物蛋' : '可使用', 0, -72, 150, 26, 13, selectedEgg ? CuteTheme.honeyDark : CuteTheme.mintDark, 'center', true);
        button(card, 'ChooseEgg', selectedEgg ? '放入此处' : '先选择宠物蛋', 0, -119, 148, 42, () => options.onChooseEmptySlot(slot.slot), { fill: selectedEgg ? CuteTheme.honey : CuteTheme.mint, fontSize: 13, radius: 17 });
        return;
    }

    artImage(chamber, 'EggArt', getEggArtPath(slot.egg), 0, 20, 86, 106);
    if (slot.egg?.isMutant) tag(chamber, 'Mutant', '变异', 50, 66, 56, CuteTheme.peach);
    text(chamber, 'EggName', getEggDisplayName(slot.egg), 0, -59, 150, 30, 13, CuteTheme.caramel, 'center', true);
    progress(card, 'Progress', 0, -68, 166, 12, slot.ready ? 1 : 1 - slot.remaining / Math.max(1, slot.total), slot.ready ? CuteTheme.green : CuteTheme.honey);
    text(card, 'Time', slot.ready ? '孵化完成' : options.formatDuration(slot.remaining), 0, -91, 150, 24, 13, slot.ready ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
    button(card, 'Accelerate', '加速', -48, -127, 86, 38, () => options.onAccelerate(slot.egg), { fill: CuteTheme.sky, fontSize: 12, radius: 15, disabled: slot.ready });
    button(card, 'Collect', slot.ready ? '领取' : '孵化中', 48, -127, 86, 38, () => options.onCollect(slot.egg), { fill: slot.ready ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 12, radius: 15, disabled: !slot.ready });
}

function renderEggCard(parent: Node, egg: any, index: number, options: HatcheryPageV6Options) {
    const rarity = Math.max(1, Math.min(6, Number(egg?.rarityPotential || 1)));
    const selected = Number(egg?.id || 0) === Number(options.selectedEggId || 0);
    const card = panel(
        parent,
        `WarehouseEgg_${egg?.id || index}`,
        0,
        0,
        320,
        130,
        selected ? new Color(255, 243, 193, 255) : egg?.isMutant ? new Color(255, 236, 226, 255) : new Color(255, 252, 239, 255),
        20,
        true,
        selected ? CuteTheme.honeyDark : egg?.isMutant ? CuteTheme.peachDark : new Color(211, 171, 116, 230),
        selected ? 4 : egg?.isMutant ? 3 : 2,
    );
    artImage(card, 'EggArt', getEggArtPath(egg), -112, 1, 72, 90);
    text(card, 'Name', getEggDisplayName(egg), -66, 40, 190, 28, 15, CuteTheme.caramel, 'left', true);
    text(card, 'Meta', `${rarity}★${egg?.isMutant ? ' · 变异' : ''}`, -66, 14, 170, 24, 12, egg?.isMutant ? CuteTheme.peachDark : CuteTheme.honeyDark, 'left', true);
    text(card, 'Parents', `父母 ${parentNames(egg)}`, -66, -10, 188, 22, 11, CuteTheme.muted, 'left', true);
    text(card, 'Time', `${String(egg?.species || egg?.speciesName || '未知')} · ${options.formatEggDuration(egg)}`, -66, -34, 188, 22, 11, CuteTheme.muted, 'left', true);
    button(card, 'Choose', selected ? '已选择' : '选择', 88, -38, 104, 34, () => options.onChooseEgg(egg), { selected, fill: selected ? CuteTheme.mint : CuteTheme.honey, fontSize: 11, radius: 14 });
    hitArea(card, 'OpenEgg', 0, 0, 320, 130, () => options.onChooseEgg(egg));
}

function renderWarehouseScroll(parent: Node, options: HatcheryPageV6Options, width: number, height: number) {
    const viewport = new Node('HatcheryEggScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, 0, width, height);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const rows = Math.max(1, Math.ceil(options.eggs.length / 2));
    const gridHeight = rows * 140 + 10;
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
    layout.cellSize = new Size(320, 130);
    layout.paddingLeft = 8;
    layout.paddingRight = 8;
    layout.paddingTop = 8;
    layout.paddingBottom = 8;
    layout.spacingX = 10;
    layout.spacingY = 10;
    options.eggs.forEach((egg, index) => renderEggCard(grid, egg, index, options));
    layout.updateLayout();

    if (options.eggs.length) {
        text(content, 'ListEnd', '—— 已经到底了 ——', 0, -gridHeight - 22, width - 30, 30, 13, CuteTheme.muted, 'center', true);
    } else {
        text(content, 'Empty', options.totalStored ? '当前筛选没有宠物蛋' : '当前没有宠物蛋\n可通过好友结婚、生蛋或活动获得', 0, -height / 2 + 68, width - 80, 88, 18, CuteTheme.muted, 'center', true);
        if (!options.totalStored) {
            button(content, 'GoMarriage', '前往好友/结婚', -100, -height / 2 - 4, 180, 46, options.onGoMarriage, { fill: CuteTheme.honey, fontSize: 13, radius: 19 });
            button(content, 'BackHome', '返回首页', 100, -height / 2 - 4, 150, 46, options.onBackHome, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 19 });
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
            if (!viewport.isValid || !content.isValid || !scroll.isValid || scroll.content !== content) return;
            scroll.stopAutoScroll();
            scroll.scrollToOffset(target, 0);
        });
    }
}

export function renderHatcheryPageV6(parent: Node, options: HatcheryPageV6Options) {
    const shell = createV6PageShell(parent, 'HatcheryLayoutV6');
    const page = shell.content;
    const headerHeight = 82;
    const incubatorHeight = 344;
    const warehouseHeight = V6_CONTENT_HEIGHT - headerHeight - incubatorHeight - V6_PANEL_GAP * 2;
    let cursor = V6_CONTENT_HEIGHT / 2;

    const header = panel(page, 'HatcheryInfoBar', 0, cursor - headerHeight / 2, V6_PAGE_WIDTH, headerHeight, new Color(255, 249, 229, 252), 24, true, new Color(198, 145, 85, 235), 2);
    cursor -= headerHeight + V6_PANEL_GAP;
    drawUiIcon(header, 'EggIcon', 'hatchery', -304, 0, 44, CuteTheme.honeyDark);
    text(header, 'Title', '三槽孵化装置', -265, 15, 230, 34, 23, CuteTheme.caramel, 'left', true);
    text(header, 'Subtitle', '选择宠物蛋 → 选择装置 → 确认 → 倒计时 → 领取', -265, -18, 470, 26, 13, CuteTheme.muted, 'left', true);

    const incubators = panel(page, 'IncubatorSection', 0, cursor - incubatorHeight / 2, V6_PAGE_WIDTH, incubatorHeight, new Color(255, 249, 230, 246), 24, true, new Color(205, 158, 103, 225), 2);
    cursor -= incubatorHeight + V6_PANEL_GAP;
    options.slots.forEach((slot, index) => renderIncubator(incubators, slot, options, -228 + index * 228));

    const warehouse = panel(page, 'EggWarehouse', 0, cursor - warehouseHeight / 2, V6_PAGE_WIDTH, warehouseHeight, new Color(255, 249, 230, 248), 24, true, new Color(205, 158, 103, 225), 2);
    text(warehouse, 'Title', `宝宝蛋仓库 ${options.totalStored}/${options.capacity}`, -306, warehouseHeight / 2 - 32, 300, 34, 19, CuteTheme.caramel, 'left', true);
    text(warehouse, 'Hint', '选择蛋后再指定空闲装置', 58, warehouseHeight / 2 - 32, 250, 28, 12, CuteTheme.muted, 'right', true);
    FILTERS.forEach(([key, label], index) => button(warehouse, `Filter_${key}`, label, -258 + index * 86, warehouseHeight / 2 - 78, 78, 40, () => options.onFilter(key), {
        selected: options.filter === key,
        fill: options.filter === key ? CuteTheme.honey : CuteTheme.paperWarm,
        fontSize: 13,
        radius: 16,
    }));
    const sortLabel = options.sort === 'rarity' ? '稀有度优先' : options.sort === 'created' ? '获取时间' : '孵化时间';
    button(warehouse, 'Sort', sortLabel, 258, warehouseHeight / 2 - 78, 132, 40, options.onSort, { fill: CuteTheme.sky, fontSize: 12, radius: 16 });
    const scrollHeight = warehouseHeight - 116;
    const scrollHost = panel(warehouse, 'EggListPanel', 0, -50, V6_PAGE_WIDTH - 16, scrollHeight, CuteTheme.transparent, 0, false, CuteTheme.transparent, 0);
    renderWarehouseScroll(scrollHost, options, V6_PAGE_WIDTH - 24, scrollHeight - 4);
}

