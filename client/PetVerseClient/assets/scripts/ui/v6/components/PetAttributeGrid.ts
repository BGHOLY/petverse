import { Color, Node } from 'cc';
import { CuteTheme, button, formatNumber, panel, text } from '../../cute/CuteUiKit';
import { PetAttributesV6, PetStatDraftV6 } from './PetTypes';

function attributeCard(parent: Node, name: string, icon: string, label: string, value: string, x: number, y: number, fill: Color) {
    const card = panel(parent, name, x, y, 232, 102, fill, 20, false, new Color(215, 175, 120, 210), 2);
    text(card, 'Icon', icon, -88, 0, 44, 52, 24, CuteTheme.caramel, 'center', true);
    text(card, 'Label', label, -54, 20, 132, 28, 13, CuteTheme.muted, 'left', true);
    text(card, 'Value', value, -54, -15, 132, 36, 20, CuteTheme.caramel, 'left', true);
}

export function renderPetAttributeGridV6(parent: Node, attributes: PetAttributesV6) {
    text(parent, 'Heading', '核心战斗属性', -232, 224, 464, 34, 19, CuteTheme.caramel, 'left', true);
    const rows: Array<[string, string, string, string, Color]> = [
        ['Hp', '❤', '生命', formatNumber(attributes.hp), new Color(239, 249, 231, 255)],
        ['Defense', '◆', '防御', formatNumber(attributes.defense), new Color(234, 245, 249, 255)],
        ['Attack', '⚔', '物攻', formatNumber(attributes.attack), new Color(255, 240, 231, 255)],
        ['Magic', '✦', '法攻', formatNumber(attributes.magic), new Color(244, 236, 255, 255)],
        ['Speed', '➤', '速度', formatNumber(attributes.speed), new Color(232, 247, 241, 255)],
        ['Growth', '成', '成长', attributes.growth.toFixed(3), new Color(255, 248, 220, 255)],
        ['Quality', '◇', '品质', formatNumber(attributes.quality), new Color(255, 241, 236, 255)],
        ['Skills', '技', '技能数', String(attributes.skillCount), new Color(239, 236, 255, 255)],
    ];
    rows.forEach(([name, icon, label, value, fill], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        attributeCard(parent, name, icon, label, value, col === 0 ? -122 : 122, 151 - row * 112, fill);
    });
}

export function renderPetStatAllocationV6(parent: Node, draft: PetStatDraftV6) {
    text(parent, 'Available', `剩余 ${draft.remaining} 点　·　待确认 ${draft.total} 点`, 0, 222, 474, 36, 18, draft.total > 0 ? CuteTheme.peachDark : CuteTheme.honeyDark, 'center', true);
    draft.rows.forEach((row, index) => {
        const y = 158 - index * 69;
        const item = panel(parent, `Stat_${row.key}`, 0, y, 476, 58, new Color(255, 252, 239, 235), 16, false, new Color(218, 178, 122, 200), 2);
        text(item, 'Name', `${row.icon} ${row.name}`, -222, 10, 92, 28, 14, CuteTheme.caramel, 'left', true);
        text(item, 'Value', `${row.base + row.pending}${row.pending > 0 ? ` (+${row.pending})` : ''}`, -116, 10, 102, 28, 14, CuteTheme.honeyDark, 'left', true);
        text(item, 'Description', row.description, -222, -15, 248, 24, 12, CuteTheme.muted, 'left');
        button(item, 'PlusOne', '+1', 150, 0, 58, 38, () => draft.onAdd(row.key, 1), { fill: CuteTheme.mint, fontSize: 13, radius: 15, disabled: draft.remaining < 1 });
        button(item, 'PlusFive', '+5', 212, 0, 58, 38, () => draft.onAdd(row.key, 5), { fill: CuteTheme.honey, fontSize: 13, radius: 15, disabled: draft.remaining < 5 });
    });
    text(parent, 'DraftHint', '“+”和推荐只生成预览；必须点击确认才会真正生效。', 0, -193, 474, 30, 12, CuteTheme.muted, 'center', true);
    button(parent, 'Recommend', '推荐方案', -183, -235, 106, 42, draft.onRecommend, { fill: CuteTheme.sky, fontSize: 12, radius: 17, disabled: draft.remaining <= 0 });
    button(parent, 'Clear', '清空预览', -62, -235, 106, 42, draft.onClear, { fill: CuteTheme.paperWarm, fontSize: 12, radius: 17, disabled: draft.total <= 0 });
    button(parent, 'Reset', '重置加点', 62, -235, 106, 42, draft.onReset, { fill: CuteTheme.paperWarm, fontSize: 12, radius: 17, disabled: draft.locked });
    button(parent, 'Confirm', '确认生效', 183, -235, 106, 42, draft.onConfirm, { fill: CuteTheme.honey, fontSize: 12, radius: 17, disabled: draft.total <= 0 || draft.locked || draft.confirming });
}

export function renderPetLineageV6(parent: Node, lines: string[]) {
    text(parent, 'Heading', '血脉与繁育信息', 0, 220, 470, 36, 20, CuteTheme.caramel, 'center', true);
    const summary = panel(parent, 'LineageSummary', 0, -3, 474, 388, new Color(255, 251, 236, 235), 22, false, new Color(218, 178, 122, 210), 2);
    lines.forEach((line, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = col === 0 ? -216 : 10;
        const y = 142 - row * 82;
        text(summary, `Line_${index}`, line, x, y, 206, 60, 15, index < 2 ? CuteTheme.muted : CuteTheme.caramel, 'left', true);
    });
    text(parent, 'Hint', '血脉信息仅展示真实数据；繁育操作请前往心愿婚礼。', 0, -228, 470, 32, 13, CuteTheme.muted, 'center');
}
