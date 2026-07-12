import { BlockInputEvents, Color, Node, UIOpacity, Vec3, tween } from 'cc';
import { CuteTheme, button, clearNode, headingTag, panel, safeName, tag, text } from '../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../pet/PetArtRegistry';
import { createPetArtSprite } from '../pet/PetArtView';

export function showPetReveal(
    layer: Node,
    mode: 'hatch' | 'fusion',
    pet: any,
    onClose: () => void,
) {
    clearNode(layer);
    layer.active = true;
    if (!layer.getComponent(BlockInputEvents)) layer.addComponent(BlockInputEvents);

    const dim = panel(layer, 'Dim', 0, 0, 720, 1280, new Color(65, 43, 34, 205), 0, false, CuteTheme.transparent, 0);
    const card = panel(layer, 'RevealCard', 0, 0, 650, 1040, new Color(255, 250, 232, 255), 42, true, CuteTheme.honeyDark, 4);
    headingTag(card, 'Title', mode === 'hatch' ? '孵化成功' : '炼妖结果', 0, 450, 210, mode === 'hatch' ? CuteTheme.mint : CuteTheme.lilac);

    const species = getPetSpeciesMeta(pet);
    const rarity = safeName(pet?.rarityName, Number(pet?.rarity || 1) >= 5 ? '传说' : Number(pet?.rarity || 1) >= 4 ? '史诗' : Number(pet?.rarity || 1) >= 3 ? '稀有' : Number(pet?.rarity || 1) >= 2 ? '优秀' : '普通');
    const isRare = Number(pet?.rarity || 1) >= 4 || Boolean(pet?.isMutant) || Number(pet?.specialSkillCount || 0) > 0;

    const egg = panel(card, 'Egg', 0, 160, 260, 330, new Color(241, 232, 251, 255), 120, true, CuteTheme.white, 4);
    text(egg, 'EggIcon', mode === 'hatch' ? '🥚' : '🔮', 0, 18, 180, 180, 102, CuteTheme.honeyDark, 'center', true);
    tag(egg, 'Wait', mode === 'hatch' ? '蛋壳正在裂开…' : '血脉正在融合…', 0, -112, 180, CuteTheme.paperWarm);

    const art = createPetArtSprite(card, 'PetArt', getPetArtPath(pet, 'portrait'), 0, 130, 430, 430);
    art.setScale(new Vec3(0.15, 0.15, 1));
    const opacity = art.getComponent(UIOpacity) || art.addComponent(UIOpacity);
    opacity.opacity = 0;

    const details = panel(card, 'Details', 0, -245, 560, 300, new Color(255, 252, 239, 255), 30, false, CuteTheme.caramelSoft, 2);
    text(details, 'Name', safeName(pet?.nickname, species.name), 0, 98, 480, 54, 30, CuteTheme.caramel, 'center', true);
    tag(details, 'Rarity', `${pet?.isMutant ? '✨ 变异 · ' : ''}${rarity}`, 0, 52, 170, isRare ? CuteTheme.peach : CuteTheme.mint);
    text(details, 'Species', `${species.name}　${safeName(species.element, '未知属性')}　Lv.${Number(pet?.level || 1)}`, 0, 10, 480, 34, 17, CuteTheme.muted, 'center', true);
    text(details, 'Growth', `成长 ${Number(pet?.growth || 0).toFixed(3)}　品质 ${Number(pet?.quality || 100)}　技能 ${Array.isArray(pet?.skills) ? pet.skills.length : Number(pet?.skillSlotCount || 0)}　特殊 ${Number(pet?.specialSkillCount || 0)}`, 0, -38, 500, 38, 16, CuteTheme.caramel, 'center', true);
    text(details, 'RareMessage', isRare ? '稀有血脉出现！请及时锁定或收藏。' : '新伙伴已加入宝宝列表。', 0, -88, 500, 38, 15, isRare ? CuteTheme.peachDark : CuteTheme.mintDark, 'center', true);
    button(details, 'Close', '查看宝宝', 0, -130, 190, 54, () => close(), { icon: '🐾', fill: CuteTheme.honey, fontSize: 16, radius: 24 });

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

    function close() {
        clearNode(layer);
        layer.active = false;
        onClose();
    }

    dim.on(Node.EventType.TOUCH_END, () => close());
    card.setScale(new Vec3(0.94, 0.94, 1));
    tween(card).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
}
