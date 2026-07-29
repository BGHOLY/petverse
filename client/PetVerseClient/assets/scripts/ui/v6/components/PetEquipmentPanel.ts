import { Color, Node } from 'cc';
import { CuteTheme, hitArea, panel, text } from '../../cute/CuteUiKit';
import { PetEquipmentSlotV6 } from './PetTypes';

export function renderPetEquipmentPanelV6(parent: Node, slots: PetEquipmentSlotV6[]) {
    text(parent, 'Heading', '装备槽位', -218, 198, 436, 34, 19, CuteTheme.caramel, 'left', true);
    text(parent, 'Hint', '点击已开放槽位选择、替换或卸下装备', 0, 164, 438, 28, 13, CuteTheme.muted, 'center');
    slots.forEach((slot, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = -148 + col * 148;
        const y = 66 - row * 142;
        const card = panel(
            parent,
            `Equipment_${slot.key}`,
            x,
            y,
            132,
            128,
            slot.locked ? new Color(235, 229, 216, 255) : new Color(255, 251, 236, 255),
            22,
            false,
            slot.locked ? new Color(193, 184, 167, 230) : new Color(218, 178, 122, 220),
            2,
        );
        text(card, 'Icon', slot.locked ? '锁' : slot.item ? '✓' : '+', 0, 22, 68, 54, 26, slot.locked ? CuteTheme.muted : CuteTheme.honeyDark, 'center', true);
        text(card, 'Name', slot.name, 0, -17, 116, 26, 14, CuteTheme.caramel, 'center', true);
        text(card, 'Status', slot.status, 0, -45, 116, 30, 12, CuteTheme.muted, 'center');
        if (!slot.locked && slot.onClick) hitArea(card, 'SelectEquipment', 0, 0, 132, 128, slot.onClick);
    });
}
