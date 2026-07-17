import { Color, Node } from 'cc';
import { CuteTheme, formatNumber, hitArea, image, panel, tag, text } from '../../cute/CuteUiKit';
import { PetListItemV6 } from './PetTypes';

export function renderPetListItemV6(parent: Node, item: PetListItemV6, onSelect: () => void) {
    const card = panel(
        parent,
        `PetListItem_${item.id}`,
        0,
        0,
        134,
        100,
        item.selected ? new Color(255, 226, 144, 255) : new Color(255, 251, 236, 255),
        18,
        false,
        item.selected ? CuteTheme.honeyDark : new Color(211, 171, 116, 220),
        item.selected ? 4 : 2,
    );
    image(card, 'Thumb', item.artPath, -38, 10, 50, 50, item.isMutant ? CuteTheme.peach : CuteTheme.paperWarm, '宠');
    text(card, 'Name', item.name, -6, 25, 72, 28, 13, CuteTheme.caramel, 'left', true);
    text(card, 'Level', `Lv.${item.level}`, -6, 0, 72, 22, 12, CuteTheme.muted, 'left', true);
    text(card, 'Power', `战力 ${formatNumber(item.power)}`, -6, -24, 72, 22, 12, CuteTheme.honeyDark, 'left', true);

    if (item.teamIndex >= 0) tag(card, 'TeamBadge', `编${item.teamIndex + 1}`, 43, 36, 42, CuteTheme.mint);
    else if (item.isMarried) tag(card, 'MarriedBadge', '已婚', 42, 36, 44, CuteTheme.peach);
    if (item.isLocked) tag(card, 'LockBadge', '锁', -49, 40, 30, new Color(229, 218, 199, 255));
    if (item.isMutant) tag(card, 'MutantBadge', '异', -49, -39, 30, CuteTheme.lilac);
    hitArea(card, 'SelectPet', 0, 0, 134, 100, onSelect);
    return card;
}
