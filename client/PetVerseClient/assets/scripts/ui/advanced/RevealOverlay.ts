import { BlockInputEvents, Color, Node, UIOpacity, Vec3, tween } from 'cc';
import { CuteTheme, button, clearNode, headingTag, panel, safeName, tag, text } from '../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../pet/PetArtRegistry';
import { createPetArtSprite } from '../pet/PetArtView';

function cleanPetName(pet: any, fallback: string) {
    const raw = safeName(pet?.nickname || pet?.name || pet?.displayName, fallback);
    const cleaned = raw
        .replace(/\b(?:common|uncommon|rare|epic|legendary|mythic)\b/gi, ' ')
        .replace(/(?:普通|优秀|稀有|史诗|传说|神话)/g, ' ')
        .replace(/\bPET[-_\s]*\d+\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[·|\-\s]+|[·|\-\s]+$/g, '')
        .trim();
    return safeName(cleaned, fallback);
}

function cleanRarityName(value: any, fallback: string) {
    const cleaned = safeName(value, fallback)
        .replace(/\b(?:common|uncommon|rare|epic|legendary|mythic)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return safeName(cleaned, fallback);
}

export function showPetReveal(
    layer: Node,
    mode: 'hatch' | 'fusion',
    pet: any,
    onClose: () => void,
    onContinue?: () => void,
) {
    clearNode(layer);
    layer.active = true;
    if (!layer.getComponent(BlockInputEvents)) layer.addComponent(BlockInputEvents);

    const dim = panel(layer, 'Dim', 0, 0, 720, 1280, new Color(65, 43, 34, 205), 0, false, CuteTheme.transparent, 0);
    const card = panel(layer, 'RevealCard', 0, 0, 650, 1040, new Color(255, 250, 232, 255), 42, true, CuteTheme.honeyDark, 4);
    headingTag(card, 'Title', mode === 'hatch' ? '孵化成功' : '炼妖结果', 0, 450, 210, mode === 'hatch' ? CuteTheme.mint : CuteTheme.lilac);

    const species = getPetSpeciesMeta(pet);
    const rarity = cleanRarityName(pet?.rarityName, Number(pet?.rarity || 1) >= 5 ? '传说' : Number(pet?.rarity || 1) >= 4 ? '史诗' : Number(pet?.rarity || 1) >= 3 ? '稀有' : Number(pet?.rarity || 1) >= 2 ? '优秀' : '普通');
    const isRare = Number(pet?.rarity || 1) >= 4 || Boolean(pet?.isMutant) || Number(pet?.specialSkillCount || 0) > 0;
    const skillNames = (Array.isArray(pet?.skills) ? pet.skills : [])
        .map((skill: any) => safeName(skill?.name || skill?.skillName || skill?.skillCode, '技能'))
        .filter(Boolean)
        .slice(0, 4)
        .join('、') || '暂无技能';

    const egg = panel(card, 'Egg', 0, 160, 260, 330, new Color(241, 232, 251, 255), 120, true, CuteTheme.white, 4);
    text(egg, 'EggIcon', mode === 'hatch' ? '🥚' : '🔮', 0, 18, 180, 180, 102, CuteTheme.honeyDark, 'center', true);
    tag(egg, 'Wait', mode === 'hatch' ? '蛋壳正在裂开…' : '血脉正在融合…', 0, -112, 180, CuteTheme.paperWarm);

    const art = createPetArtSprite(card, 'PetArt', getPetArtPath(pet, 'portrait'), 0, 130, 430, 430);
    art.setScale(new Vec3(0.15, 0.15, 1));
    const opacity = art.getComponent(UIOpacity) || art.addComponent(UIOpacity);
    opacity.opacity = 0;

    const details = panel(card, 'Details', 0, -235, 580, 360, new Color(255, 252, 239, 255), 30, false, CuteTheme.caramelSoft, 2);
    text(details, 'Name', cleanPetName(pet, species.name), 0, 116, 500, 50, 29, CuteTheme.caramel, 'center', true);
    tag(details, 'Rarity', `${pet?.isMutant ? '✨ 变异 · ' : ''}${rarity}`, 0, 74, 180, isRare ? CuteTheme.peach : CuteTheme.mint);
    const gender = String(pet?.gender || '') === 'male' ? '公' : String(pet?.gender || '') === 'female' ? '母' : '未生成';
    text(details, 'Species', `${species.name}　${safeName(species.element, '未知属性')}　${gender}　Lv.${Number(pet?.level || 1)}`, 0, 34, 520, 32, 16, CuteTheme.muted, 'center', true);
    text(details, 'Growth', `成长 ${Number(pet?.growth || 0).toFixed(3)}　品质 ${Number(pet?.quality || 100)}　技能 ${Array.isArray(pet?.skills) ? pet.skills.length : Number(pet?.skillSlotCount || 0)}　战力 ${Number(pet?.power || pet?.combatPower || 0)}`, 0, -4, 530, 34, 15, CuteTheme.caramel, 'center', true);
    text(details, 'Aptitudes', `资质　体${Number(pet?.hpAptitude||0)}　攻${Number(pet?.attackAptitude||0)}　防${Number(pet?.defenseAptitude||0)}　法${Number(pet?.magicAptitude||0)}　速${Number(pet?.speedAptitude||0)}`, 0, -40, 540, 32, 13, CuteTheme.muted, 'center', true);
    text(details, 'Skills', `技能　${skillNames}`, 0, -72, 530, 30, 13, CuteTheme.caramel, 'center', true);
    text(details, 'RareMessage', isRare ? '稀有血脉出现！请及时锁定或收藏。' : '新伙伴已加入宝宝列表。', 0, -104, 520, 30, 14, isRare ? CuteTheme.peachDark : CuteTheme.mintDark, 'center', true);
    button(details, 'Close', '查看宝宝', onContinue ? -105 : 0, -150, 180, 50, () => close(onClose), { icon: '🐾', fill: CuteTheme.honey, fontSize: 15, radius: 22 });
    if (onContinue) button(details, 'Continue', '继续孵化', 105, -150, 180, 50, () => close(onContinue), { icon: '🥚', fill: CuteTheme.mint, fontSize: 15, radius: 22 });

    egg.setScale(new Vec3(0.96, 1.02, 1));
    tween(egg)
        .repeat(4, tween(egg).by(0.08, { angle: 7 }).by(0.08, { angle: -14 }).by(0.08, { angle: 7 }))
        .call(() => {
            egg.active = false;
            opacity.opacity = 255;
            tween(art).to(0.35, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
            if (isRare) {
                for (let index = 0; index < 12; index += 1) {
                    text(card, `Star${index}`, index % 3 === 0 ? '✦' : '✨', -250 + (index % 6) * 100, 370 - Math.floor(index / 6) * 470, 46, 46, 26, index % 2 ? CuteTheme.honeyDark : CuteTheme.peachDark, 'center', true);
                    const star = card.getChildByName(`Star${index}`)!;
                    star.setScale(new Vec3(0.2, 0.2, 1));
                    tween(star).delay(index * 0.035).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
                }
            }
        })
        .start();

    function close(action: () => void = onClose) {
        clearNode(layer);
        layer.active = false;
        action();
    }

    dim.on(Node.EventType.TOUCH_END, () => close(onClose));
    card.setScale(new Vec3(0.94, 0.94, 1));
    tween(card).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
}
