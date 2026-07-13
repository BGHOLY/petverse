import { Color, Node, tween, Vec3 } from 'cc';
import { button, image, panel, safeName, tag, text } from '../../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../../pet/PetArtRegistry';
import { createPetArtSprite } from '../../pet/PetArtView';
import { createNotificationDot, drawUiIcon, HandPaintedTheme } from '../HandPaintedUi';

export type HomeActivity = 'sign' | 'newcomer' | 'daily' | 'events';

export type HomePageOptions = {
    pet: any;
    notificationCount: number;
    onSelectPet: () => void;
    onActivity: (activity: HomeActivity) => void;
};

const HOME_ACTIVITIES: Array<{
    key: HomeActivity;
    title: string;
    subtitle: string;
    icon: 'benefits' | 'inventory' | 'skills' | 'adventure';
    fill: Color;
}> = [
    { key: 'sign', title: '七日签到', subtitle: '每日好礼', icon: 'benefits', fill: new Color(255, 239, 206, 248) },
    { key: 'newcomer', title: '萌新礼包', subtitle: '成长补给', icon: 'inventory', fill: new Color(244, 224, 210, 248) },
    { key: 'daily', title: '每日任务', subtitle: '今日进度', icon: 'skills', fill: new Color(224, 239, 214, 248) },
    { key: 'events', title: '精彩活动', subtitle: '限时开放', icon: 'adventure', fill: new Color(220, 237, 242, 248) },
];

function rarityName(pet: any) {
    const explicit = String(pet?.rarityName || '').split(' ')[0];
    if (explicit) return explicit;
    const rarity = Math.max(1, Math.min(6, Number(pet?.rarity || 1)));
    return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][rarity - 1];
}

function renderActivityRail(parent: Node, options: HomePageOptions) {
    panel(parent, 'ActivityPaper', -286, 12, 134, 666, new Color(255, 250, 235, 198), 30, false, new Color(255, 255, 255, 175), 2);
    tag(parent, 'ActivityTitle', '今日活动', -286, 326, 112, new Color(255, 248, 226, 245), HandPaintedTheme.ink);

    HOME_ACTIVITIES.forEach((activity, index) => {
        const card = button(parent, `Activity_${activity.key}`, activity.title, -286, 220 - index * 146, 116, 122, () => options.onActivity(activity.key), {
            fill: activity.fill,
            textColor: HandPaintedTheme.ink,
            fontSize: 15,
            radius: 22,
            subtitle: activity.subtitle,
            border: new Color(214, 181, 135, 255),
        });
        const face = card.getChildByName('Face');
        const title = face?.getChildByName('Title');
        const subtitle = face?.getChildByName('Subtitle');
        if (title) title.setPosition(0, -22, 0);
        if (subtitle) subtitle.setPosition(0, -43, 0);
        drawUiIcon(card, 'ActivityIcon', activity.icon, 0, 28, 38, index % 2 === 0 ? HandPaintedTheme.peach : HandPaintedTheme.leaf);
        if (activity.key === 'daily') createNotificationDot(card, options.notificationCount, 40, 42);
    });
}

function renderPetStage(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const species = getPetSpeciesMeta(pet);

    const petArt = createPetArtSprite(parent, 'HomePetArt', getPetArtPath(pet, 'home'), 92, -78, 430, 430);
    petArt.setScale(new Vec3(0.985, 0.985, 1));
    petArt.on(Node.EventType.TOUCH_END, options.onSelectPet);
    tween(petArt)
        .repeatForever(
            tween(petArt)
                .to(1.9, { position: new Vec3(92, -65, 0), scale: new Vec3(1.01, 1.02, 1) }, { easing: 'sineInOut' })
                .to(1.9, { position: new Vec3(92, -78, 0), scale: new Vec3(0.985, 0.985, 1) }, { easing: 'sineInOut' }),
        )
        .start();

    tag(parent, 'FavoriteTag', '心仪宠物', 90, 263, 112, new Color(255, 248, 226, 235), HandPaintedTheme.ink);

    const nameplate = panel(parent, 'PetNameplate', 92, -345, 348, 98, new Color(255, 250, 235, 242), 22, true, new Color(218, 181, 130, 255), 2);
    text(nameplate, 'PetName', safeName(pet?.nickname, species.name), -150, 21, 205, 32, 20, HandPaintedTheme.ink, 'left', true);
    text(nameplate, 'PetMeta', `${species.element}系 · ${rarityName(pet)} · Lv.${Number(pet?.level || 1)}`, -150, -16, 214, 27, 13, HandPaintedTheme.mutedInk, 'left');
    const switchButton = button(nameplate, 'SwitchPet', '切换', 126, 0, 74, 54, options.onSelectPet, {
        fill: HandPaintedTheme.leafSoft,
        textColor: HandPaintedTheme.ink,
        fontSize: 14,
        radius: 18,
        border: HandPaintedTheme.leaf,
    });
    drawUiIcon(switchButton, 'SwitchIcon', 'pet', 0, 13, 22, HandPaintedTheme.leaf);
    const title = switchButton.getChildByName('Face')?.getChildByName('Title');
    if (title) title.setPosition(0, -14, 0);
}

export function renderHomePage(parent: Node, options: HomePageOptions) {
    image(parent, 'RoomArt', 'pet-art/home_empty_room', 0, 0, 720, 1010, HandPaintedTheme.canvas);
    panel(parent, 'TopWash', 0, 438, 720, 136, new Color(255, 250, 235, 118), 0, false, new Color(255, 255, 255, 0), 0);
    text(parent, 'RoomLabel', '窗边小屋', 292, 414, 116, 30, 16, HandPaintedTheme.mutedInk, 'right', true);
    renderActivityRail(parent, options);
    renderPetStage(parent, options);
}
