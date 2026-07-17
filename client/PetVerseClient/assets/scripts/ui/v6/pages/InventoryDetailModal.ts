import { Color, Node } from 'cc';
import {
    CuteTheme,
    artImage,
    button,
    headingTag,
    panel,
    safeName,
    tag,
    text,
} from '../../cute/CuteUiKit';
import { drawUiIcon } from '../../v2/HandPaintedUi';
import { InventoryItemCategoryV6, InventoryVisualV6 } from './InventoryPage';

export type InventoryDetailModalV6Options = {
    item: any;
    category: InventoryItemCategoryV6;
    visual: InventoryVisualV6;
    targetName?: string;
    useCount: number;
    maxUse: number;
    usable: boolean;
    skillBook: boolean;
    busy: boolean;
    onClose: () => void;
    onUseCount: (count: number) => void;
    onUse: () => void;
    onSkill: () => void;
};

function categoryName(category: InventoryItemCategoryV6) {
    if (category === 'consumable') return '可使用道具';
    if (category === 'skill') return '技能书';
    return '合成材料';
}

function categoryTone(category: InventoryItemCategoryV6) {
    if (category === 'consumable') return CuteTheme.mint;
    if (category === 'skill') return CuteTheme.lilac;
    return new Color(226, 191, 142, 255);
}

function qualityName(value: any) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
        return ['普通', '普通', '优秀', '稀有', '史诗', '传说'][Math.min(5, Math.round(numeric))] || `品质${Math.round(numeric)}`;
    }
    return safeName(value, '普通');
}

export function renderInventoryDetailModalV6(parent: Node, options: InventoryDetailModalV6Options) {
    const item = options.item;
    const card = panel(parent, 'InventoryDetailDialogV6', 0, 0, 590, 700, new Color(255, 250, 235, 255), 36, true, CuteTheme.caramelSoft, 4);
    headingTag(card, 'Title', '物品详情', 0, 304, 170, categoryTone(options.category));
    button(card, 'CloseX', '×', 252, 302, 46, 46, options.onClose, { fill: CuteTheme.paperWarm, fontSize: 23, radius: 20 });

    if (options.visual.kind === 'art') artImage(card, 'ItemArt', options.visual.value, 0, 214, 84, 84);
    else drawUiIcon(card, 'ItemIcon', options.visual.value as any, 0, 214, 72, options.category === 'consumable' ? CuteTheme.mintDark : options.category === 'skill' ? CuteTheme.peachDark : CuteTheme.honeyDark);
    text(card, 'Name', safeName(item?.name || item?.itemCode, '道具'), 0, 136, 480, 42, 25, CuteTheme.caramel, 'center', true);
    tag(card, 'Owned', `拥有 ${Number(item?.quantity || 0)}`, -80, 91, 130, CuteTheme.paperWarm);
    tag(card, 'Category', categoryName(options.category), 82, 91, 138, categoryTone(options.category));

    const quality = qualityName(item?.quality || item?.rarityName || item?.rarity);
    text(card, 'Quality', `品质：${quality}`, 0, 51, 420, 28, 14, CuteTheme.muted, 'center', true);
    text(card, 'Description', safeName(item?.description, '暂无详细说明'), 0, -20, 482, 92, 16, CuteTheme.caramel, 'center', false);
    text(card, 'Target', options.usable
        ? `使用对象：${safeName(options.targetName, '暂无宠物')}`
        : options.skillBook
            ? '该技能书需要前往技能打书页面使用'
            : '该物品为合成材料，不能直接使用', 0, -92, 470, 42, 14, options.usable ? CuteTheme.mintDark : CuteTheme.muted, 'center', true);

    const quantity = Math.max(1, Math.min(Math.max(1, options.maxUse), options.useCount));
    if (options.usable) {
        text(card, 'UseLabel', '使用数量', -112, -154, 110, 30, 15, CuteTheme.caramel, 'center', true);
        button(card, 'Minus', '－', -28, -154, 44, 44, () => options.onUseCount(Math.max(1, quantity - 1)), { fill: CuteTheme.paperWarm, fontSize: 20, radius: 18, disabled: quantity <= 1 || options.busy });
        text(card, 'UseCount', `×${quantity}`, 36, -154, 74, 32, 17, CuteTheme.caramel, 'center', true);
        button(card, 'Plus', '＋', 100, -154, 44, 44, () => options.onUseCount(Math.min(options.maxUse, quantity + 1)), { fill: CuteTheme.mint, fontSize: 20, radius: 18, disabled: quantity >= options.maxUse || options.busy });
    }

    button(card, 'Close', '关闭', -108, -296, 180, 56, options.onClose, { fill: CuteTheme.paperWarm, fontSize: 15, radius: 24, disabled: options.busy });
    button(card, 'Primary', options.skillBook ? '前往打书' : options.usable ? (options.busy ? '使用中…' : '确认使用') : '仅供合成', 112, -296, 194, 56, options.skillBook ? options.onSkill : options.onUse, {
        fill: options.skillBook ? CuteTheme.honey : options.usable ? CuteTheme.mint : new Color(216, 211, 199, 255),
        fontSize: 16,
        radius: 24,
        disabled: (!options.skillBook && !options.usable) || options.busy || (options.usable && !options.targetName),
    });
}
