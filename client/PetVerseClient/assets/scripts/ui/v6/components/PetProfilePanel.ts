import { Color, Node } from 'cc';
import { CuteTheme, formatNumber, image, panel, tag, text } from '../../cute/CuteUiKit';
import { PetProfileV6 } from './PetTypes';

export function renderPetProfilePanelV6(parent: Node, profile: PetProfileV6) {
    image(parent, 'Portrait', profile.portraitPath, -148, 0, 198, 226, profile.mutant ? CuteTheme.peach : CuteTheme.mint, '宠');
    tag(parent, 'Rarity', profile.rarity, -184, -88, 86, CuteTheme.lilac);
    if (profile.mutant) tag(parent, 'Mutant', '变异', -112, -88, 54, CuteTheme.peach);
    if (profile.locked) tag(parent, 'Locked', '已锁定', -148, 91, 72, new Color(231, 220, 201, 255));

    text(parent, 'Name', profile.name, -30, 83, 280, 40, 25, CuteTheme.caramel, 'left', true);
    text(parent, 'Species', `${profile.speciesName} · Lv.${profile.level}`, -30, 48, 280, 30, 14, CuteTheme.muted, 'left');
    text(parent, 'Power', `战力 ${formatNumber(profile.power)}`, -30, 13, 280, 34, 19, CuteTheme.honeyDark, 'left', true);

    const facts = panel(parent, 'Facts', 113, -57, 288, 98, new Color(255, 252, 239, 170), 18, false, new Color(222, 184, 130, 180), 2);
    text(facts, 'Element', `属性  ${profile.element}`, -132, 27, 128, 24, 13, CuteTheme.caramel, 'left', true);
    text(facts, 'Gender', `性别  ${profile.gender}`, 4, 27, 124, 24, 13, CuteTheme.caramel, 'left', true);
    text(facts, 'Role', `定位  ${profile.role}`, -132, 0, 128, 24, 13, CuteTheme.caramel, 'left', true);
    text(facts, 'Marriage', `婚姻  ${profile.marriage}`, 4, 0, 124, 24, 13, CuteTheme.caramel, 'left', true);
    text(facts, 'Team', `编队  ${profile.team}`, -132, -27, 128, 24, 13, CuteTheme.caramel, 'left', true);
    text(facts, 'Deploy', `状态  ${profile.deployment}`, 4, -27, 124, 24, 13, CuteTheme.caramel, 'left', true);
    if (profile.favorite) tag(parent, 'Favorite', '心仪', 207, 93, 58, CuteTheme.peach);
}
