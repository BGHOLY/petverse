import { Color, Node } from 'cc';
import { CuteTheme, formatNumber, hitArea, image, panel, tag, text } from '../../cute/CuteUiKit';
import { instantiateDynamicListItem } from '../../prefab/DynamicListPrefabRegistry';
import { PetListItemV6 } from './PetTypes';

export function renderPetListItemV6(parent: Node, item: PetListItemV6, onSelect: () => void) {
    const prefabItem = instantiateDynamicListItem('PetListItem', parent, {
        name: item.name,
        value: `Lv.${item.level}`,
        meta: `战力 ${formatNumber(item.power)}`,
        iconPath: item.artPath,
    }, onSelect);
    if (prefabItem) return prefabItem;

    const card = panel(
        parent,
        `PetListItem_${item.id}`,
        0,
        0,
        152,
        100,
        item.selected ? new Color(255, 226, 144, 255) : new Color(255, 251, 236, 255),
        18,
        false,
        item.selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 220),
        item.selected ? 4 : 2,
    );
    image(card, 'Thumb', item.artPath, -45, 10, 52, 52, item.isMutant ? CuteTheme.peach : CuteTheme.paperWarm, '宠');
    text(card, 'Name', item.name, -12, 25, 82, 28, 13, CuteTheme.caramel, 'left', true);
    text(card, 'Level', `Lv.${item.level}`, -12, 0, 82, 22, 12, CuteTheme.muted, 'left', true);
    text(card, 'Power', `战力 ${formatNumber(item.power)}`, -12, -24, 82, 22, 12, CuteTheme.honeyDark, 'left', true);

    if (item.teamIndex >= 0) tag(card, 'TeamBadge', `编${item.teamIndex + 1}`, 43, 36, 42, CuteTheme.mint);
    else if (item.isMarried) tag(card, 'MarriedBadge', '已婚', 42, 36, 44, CuteTheme.peach);
    if (item.isLocked) tag(card, 'LockBadge', '锁', -49, 40, 30, new Color(229, 218, 199, 255));
    if (item.isMutant) tag(card, 'MutantBadge', '异', -49, -39, 30, CuteTheme.lilac);
    hitArea(card, 'SelectPet', 0, 0, 152, 100, onSelect);
    return card;
}
