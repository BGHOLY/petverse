import { Color, Layout, Mask, Node, ScrollView, Size } from 'cc';
import { CuteTheme, button, hitArea, image, panel, setRect, tag, text } from '../../cute/CuteUiKit';
import { PetSkillV6 } from './PetTypes';
import { instantiateDynamicListItem } from '../../prefab/DynamicListPrefabRegistry';

export function renderPetSkillPanelV6(parent: Node, skills: PetSkillV6[], skillSlotCount: number, onSkill: (skill: any) => void, onSkillBook: () => void) {
    text(parent, 'Heading', '技能槽与已学习技能', -218, 198, 436, 34, 19, CuteTheme.caramel, 'left', true);
    button(parent, 'GoSkillBook', '前往打书', 166, 198, 112, 40, onSkillBook, { fill: CuteTheme.honey, fontSize: 13, radius: 16 });

    const viewport = new Node('PetSkillScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, -28, 454, 360);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const content = new Node('Content');
    viewport.addChild(content);
    const visibleRows = Math.max(1, Math.floor(skillSlotCount));
    const contentHeight = Math.max(360, visibleRows * 82 + 12);
    const transform = setRect(content, 0, 180, 454, contentHeight);
    transform.setAnchorPoint(0.5, 1);

    const layout = content.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.paddingTop = 6;
    layout.paddingBottom = 6;
    layout.spacingY = 8;
    const rows = visibleRows;
    for (let index = 0; index < rows; index += 1) {
        const skill = skills[index];
        if (skill) {
            const prefabItem = instantiateDynamicListItem('SkillSlotItem', content, {
                name: skill.name,
                value: skill.tierLabel,
                meta: skill.brief,
                iconPath: skill.iconPath,
            }, () => onSkill(skill));
            if (prefabItem) continue;
            const row = panel(content, `Skill_${skill.key}`, 0, 0, 438, 74, new Color(255, 251, 236, 255), 20, false, skill.fill, 3);
            image(row, 'Icon', skill.iconPath, -188, 0, 52, 52, skill.fill, '技');
            text(row, 'Name', skill.name, -150, 17, 204, 26, 15, CuteTheme.caramel, 'left', true);
            text(row, 'Brief', skill.brief, -150, -17, 264, 24, 12, CuteTheme.muted, 'left', true);
            tag(row, 'Tier', skill.tierLabel, 128, 17, 82, skill.fill, skill.textColor);
            if (skill.special) tag(row, 'Special', '特殊', 184, -17, 58, CuteTheme.honey, CuteTheme.caramel);
            else text(row, 'Slot', `槽位 ${skill.slotIndex}`, 128, -17, 82, 22, 12, CuteTheme.muted, 'center', true);
            hitArea(row, 'OpenDetail', 0, 0, 438, 74, () => onSkill(skill));
        } else {
            const empty = panel(content, `EmptySkill_${index}`, 0, 0, 438, 74, new Color(241, 237, 226, 255), 20, false, new Color(204, 191, 169, 210), 2);
            text(empty, 'Icon', '＋', -184, 0, 48, 48, 22, CuteTheme.muted, 'center', true);
            text(empty, 'Text', `技能槽${index + 1}`, -150, 0, 286, 32, 14, CuteTheme.muted, 'left', true);
        }
    }
    layout.updateLayout();

    const scroll = viewport.addComponent(ScrollView);
    scroll.content = content;
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.inertia = true;
    scroll.brake = 0.72;
    scroll.elastic = true;
    scroll.cancelInnerEvents = true;
}
