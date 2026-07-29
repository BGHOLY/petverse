import { Color, Node } from 'cc';
import { CuteTheme, formatNumber, image, panel, tag, text } from '../../cute/CuteUiKit';
import { PetProfileV6 } from './PetTypes';

export function renderPetProfilePanelV6(parent: Node, profile: PetProfileV6) {
    image(parent, 'Portrait', profile.portraitPath, -145, 0, 166, 190, profile.mutant ? CuteTheme.peach : CuteTheme.mint, '宠');
    tag(parent, 'Rarity', profile.rarity, -174, -76, 78, CuteTheme.lilac);
    if (profile.mutant) tag(parent, 'Mutant', '变异', -110, -76, 50, CuteTheme.peach);
    if (profile.locked) tag(parent, 'Locked', '已锁定', -145, 74, 68, new Color(231, 220, 201, 255));

    text(parent, 'Name', profile.name, -42, 74, 282, 36, 23, CuteTheme.caramel, 'left', true);
    text(parent, 'Species', `${profile.speciesName} · Lv.${profile.level}`, -42, 42, 282, 28, 14, CuteTheme.muted, 'left');
    text(parent, 'Power', `战力 ${formatNumber(profile.power)}`, -42, 11, 282, 30, 18, CuteTheme.honeyDark, 'left', true);

    const facts = panel(parent, 'Facts', 105, -57, 278, 84, new Color(255, 252, 239, 170), 18, false, new Color(222, 184, 130, 180), 2);
    text(facts, 'Element', `属性 ${profile.element}`, -126, 22, 120, 22, 12, CuteTheme.caramel, 'left', true);
    text(facts, 'Gender', `性别 ${profile.gender}`, 4, 22, 116, 22, 12, CuteTheme.caramel, 'left', true);
    text(facts, 'Role', `定位 ${profile.role}`, -126, 0, 120, 22, 12, CuteTheme.caramel, 'left', true);
    text(facts, 'Marriage', `婚姻 ${profile.marriage}`, 4, 0, 116, 22, 12, CuteTheme.caramel, 'left', true);
    text(facts, 'Team', `编队 ${profile.team}`, -126, -22, 120, 22, 12, CuteTheme.caramel, 'left', true);
    text(facts, 'Deploy', `状态 ${profile.deployment}`, 4, -22, 116, 22, 12, CuteTheme.caramel, 'left', true);
    if (profile.favorite) tag(parent, 'Favorite', '心仪', 197, 78, 54, CuteTheme.peach);
}
