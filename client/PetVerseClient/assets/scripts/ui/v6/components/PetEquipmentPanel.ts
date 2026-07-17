import { Color, Node } from 'cc';
import { CuteTheme, panel, text } from '../../cute/CuteUiKit';
import { PetEquipmentSlotV6 } from './PetTypes';

export function renderPetEquipmentPanelV6(parent: Node, slots: PetEquipmentSlotV6[]) {
    text(parent, 'Heading', '装备槽位', -232, 224, 464, 34, 19, CuteTheme.caramel, 'left', true);
    text(parent, 'Hint', '装备选择功能尚未接入；槽位仅展示真实状态，不打开空白弹窗。', 0, 187, 470, 28, 13, CuteTheme.muted, 'center');
    slots.forEach((slot, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = -164 + col * 164;
        const y = 76 - row * 168;
        const card = panel(
            parent,
            `Equipment_${slot.key}`,
            x,
            y,
            146,
            148,
            slot.locked ? new Color(235, 229, 216, 255) : new Color(255, 251, 236, 255),
            22,
            false,
            slot.locked ? new Color(193, 184, 167, 230) : new Color(218, 178, 122, 220),
            2,
        );
        const developing = slot.status.includes('开发中');
        text(card, 'Icon', slot.locked ? '锁' : developing ? '…' : '✓', 0, 24, 72, 62, 28, slot.locked ? CuteTheme.muted : CuteTheme.honeyDark, 'center', true);
        text(card, 'Name', slot.name, 0, -20, 124, 28, 15, CuteTheme.caramel, 'center', true);
        text(card, 'Status', slot.status, 0, -50, 126, 34, 12, CuteTheme.muted, 'center');
    });
}
