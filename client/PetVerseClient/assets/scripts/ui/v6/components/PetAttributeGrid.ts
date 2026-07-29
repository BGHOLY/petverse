import { Color, Node } from 'cc';
import { CuteTheme, button, formatNumber, panel, text } from '../../cute/CuteUiKit';
import { PetAttributesV6, PetStatDraftV6 } from './PetTypes';

function attributeCard(parent: Node, name: string, icon: string, label: string, value: string, x: number, y: number, fill: Color) {
    const card = panel(parent, name, x, y, 218, 88, fill, 18, false, new Color(215, 175, 120, 210), 2);
    text(card, 'Icon', icon, -82, 0, 40, 46, 22, CuteTheme.caramel, 'center', true);
    text(card, 'Label', label, -50, 17, 124, 26, 12, CuteTheme.muted, 'left', true);
    text(card, 'Value', value, -50, -14, 124, 32, 18, CuteTheme.caramel, 'left', true);
}

export function renderPetAttributeGridV6(parent: Node, attributes: PetAttributesV6) {
    text(parent, 'Heading', '核心战斗属性', -218, 198, 436, 34, 19, CuteTheme.caramel, 'left', true);
    const rows: Array<[string, string, string, string, Color]> = [
        ['Hp', '❤', '生命', formatNumber(attributes.hp), new Color(239, 249, 231, 255)],
        ['Defense', '◆', '防御', formatNumber(attributes.defense), new Color(234, 245, 249, 255)],
        ['Attack', '⚔', '物攻', formatNumber(attributes.attack), new Color(255, 240, 231, 255)],
        ['Magic', '✦', '法攻', formatNumber(attributes.magic), new Color(244, 236, 255, 255)],
        ['Speed', '➤', '速度', formatNumber(attributes.speed), new Color(232, 247, 241, 255)],
        ['Quality', '◇', '品质', formatNumber(attributes.quality), new Color(255, 241, 236, 255)],
    ];
    rows.forEach(([name, icon, label, value, fill], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        attributeCard(parent, name, icon, label, value, col === 0 ? -114 : 114, 128 - row * 98, fill);
    });
    const summary = panel(parent, 'GrowthSummary', 0, -171, 446, 58, new Color(255, 248, 220, 255), 18, false, new Color(215, 175, 120, 210), 2);
    text(summary, 'Growth', `成长 ${attributes.growth.toFixed(3)}`, -190, 0, 164, 28, 14, CuteTheme.honeyDark, 'left', true);
    text(summary, 'Skills', `技能 ${attributes.skillCount}`, 16, 0, 164, 28, 14, CuteTheme.caramel, 'left', true);
}

export function renderPetStatAllocationV6(parent: Node, draft: PetStatDraftV6) {
    text(parent, 'Available', `剩余 ${draft.remaining} 点　·　待确认 ${draft.total} 点`, 0, 198, 444, 34, 17, draft.total > 0 ? CuteTheme.peachDark : CuteTheme.honeyDark, 'center', true);
    draft.rows.forEach((row, index) => {
        const y = 139 - index * 60;
        const item = panel(parent, `Stat_${row.key}`, 0, y, 444, 52, new Color(255, 252, 239, 235), 15, false, new Color(218, 178, 122, 200), 2);
        text(item, 'Name', `${row.icon} ${row.name}`, -206, 9, 86, 25, 13, CuteTheme.caramel, 'left', true);
        text(item, 'Value', `${row.base + row.pending}${row.pending > 0 ? ` (+${row.pending})` : ''}`, -108, 9, 96, 25, 13, CuteTheme.honeyDark, 'left', true);
        text(item, 'Description', row.description, -206, -13, 232, 22, 12, CuteTheme.muted, 'left');
        button(item, 'PlusOne', '+1', 140, 0, 54, 36, () => draft.onAdd(row.key, 1), { fill: CuteTheme.mint, fontSize: 13, radius: 14, disabled: draft.remaining < 1 });
        button(item, 'PlusFive', '+5', 198, 0, 54, 36, () => draft.onAdd(row.key, 5), { fill: CuteTheme.honey, fontSize: 13, radius: 14, disabled: draft.remaining < 5 });
    });
    text(parent, 'DraftHint', '“+”和推荐只生成预览；点击确认后才会生效。', 0, -160, 444, 28, 12, CuteTheme.muted, 'center', true);
    button(parent, 'Recommend', '推荐', -168, -199, 94, 40, draft.onRecommend, { fill: CuteTheme.sky, fontSize: 12, radius: 16, disabled: draft.remaining <= 0 });
    button(parent, 'Clear', '清空', -56, -199, 94, 40, draft.onClear, { fill: CuteTheme.paperWarm, fontSize: 12, radius: 16, disabled: draft.total <= 0 });
    button(parent, 'Reset', '重置', 56, -199, 94, 40, draft.onReset, { fill: CuteTheme.paperWarm, fontSize: 12, radius: 16, disabled: draft.locked });
    button(parent, 'Confirm', '确认', 168, -199, 94, 40, draft.onConfirm, { fill: CuteTheme.honey, fontSize: 12, radius: 16, disabled: draft.total <= 0 || draft.locked || draft.confirming });
}

export function renderPetLineageV6(parent: Node, lines: string[]) {
    text(parent, 'Heading', '血脉与繁育信息', 0, 198, 444, 34, 19, CuteTheme.caramel, 'center', true);
    const summary = panel(parent, 'LineageSummary', 0, -2, 444, 344, new Color(255, 251, 236, 235), 22, false, new Color(218, 178, 122, 210), 2);
    lines.forEach((line, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = col === 0 ? -202 : 8;
        const y = 126 - row * 72;
        text(summary, `Line_${index}`, line, x, y, 194, 54, 14, index < 2 ? CuteTheme.muted : CuteTheme.caramel, 'left', true);
    });
    text(parent, 'Hint', '血脉信息仅展示真实数据；繁育操作请前往心愿婚礼。', 0, -202, 444, 30, 13, CuteTheme.muted, 'center');
}
