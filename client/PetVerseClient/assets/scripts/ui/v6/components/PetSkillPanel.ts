import { Color, Layout, Mask, Node, ScrollView, Size } from 'cc';
import { CuteTheme, button, hitArea, image, panel, setRect, tag, text } from '../../cute/CuteUiKit';
import { PetSkillV6 } from './PetTypes';

export function renderPetSkillPanelV6(parent: Node, skills: PetSkillV6[], onSkill: (skill: any) => void, onSkillBook: () => void) {
    text(parent, 'Heading', '技能槽与已学习技能', -232, 224, 464, 34, 19, CuteTheme.caramel, 'left', true);
    button(parent, 'GoSkillBook', '前往打书', 177, 224, 116, 40, onSkillBook, { fill: CuteTheme.honey, fontSize: 13, radius: 16 });

    const viewport = new Node('PetSkillScrollV6');
    parent.addChild(viewport);
    setRect(viewport, 0, -20, 486, 438);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const content = new Node('Content');
    viewport.addChild(content);
    const visibleRows = Math.max(6, skills.length);
    const contentHeight = Math.max(438, visibleRows * 82 + 12);
    const transform = setRect(content, 0, 219, 486, contentHeight);
    transform.setAnchorPoint(0.5, 1);

    const layout = content.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.paddingTop = 6;
    layout.paddingBottom = 6;
    layout.spacingY = 8;
    const rows = Math.max(6, skills.length);
    for (let index = 0; index < rows; index += 1) {
        const skill = skills[index];
        if (skill) {
            const row = panel(content, `Skill_${skill.key}`, 0, 0, 470, 74, new Color(255, 251, 236, 255), 20, false, skill.fill, 3);
            image(row, 'Icon', skill.iconPath, -202, 0, 54, 54, skill.fill, '技');
            text(row, 'Name', skill.name, -164, 17, 216, 26, 15, CuteTheme.caramel, 'left', true);
            text(row, 'Brief', skill.brief, -164, -17, 284, 24, 12, CuteTheme.muted, 'left', true);
            tag(row, 'Tier', skill.tierLabel, 142, 17, 86, skill.fill, skill.textColor);
            if (skill.special) tag(row, 'Special', '特殊', 202, -17, 62, CuteTheme.honey, CuteTheme.caramel);
            else text(row, 'Slot', `槽位 ${skill.slotIndex}`, 142, -17, 86, 22, 12, CuteTheme.muted, 'center', true);
            hitArea(row, 'OpenDetail', 0, 0, 470, 74, () => onSkill(skill));
        } else {
            const empty = panel(content, `EmptySkill_${index}`, 0, 0, 470, 74, new Color(241, 237, 226, 255), 20, false, new Color(204, 191, 169, 210), 2);
            text(empty, 'Icon', '＋', -198, 0, 48, 48, 22, CuteTheme.muted, 'center', true);
            text(empty, 'Text', `技能槽${index + 1}`, -164, 0, 300, 32, 14, CuteTheme.muted, 'left', true);
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
