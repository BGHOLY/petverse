import { Color, Node, tween, Vec3 } from 'cc';
import { button, image, panel, safeName, tag, text } from '../../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../../pet/PetArtRegistry';
import { createPetArtSprite } from '../../pet/PetArtView';
import { createNotificationDot, drawUiIcon, HandPaintedTheme } from '../HandPaintedUi';

export type HomeActivity = 'sign' | 'newcomer' | 'daily' | 'events';
export type HomeShortcut = 'adventure' | 'hatchery' | 'formation';

export type HomePageOptions = {
    pet: any;
    notificationCount: number;
    onSelectPet: () => void;
    onActivity: (activity: HomeActivity) => void;
    onShortcut: (shortcut: HomeShortcut) => void;
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
    panel(parent, 'ActivityPaper', -292, 4, 126, 672, new Color(255, 248, 225, 224), 26, true, new Color(190, 129, 72, 255), 3);
    tag(parent, 'ActivityTitle', '今日活动', -292, 326, 108, new Color(255, 241, 196, 255), HandPaintedTheme.ink);

    HOME_ACTIVITIES.forEach((activity, index) => {
        const card = button(parent, `Activity_${activity.key}`, activity.title, -292, 220 - index * 146, 108, 120, () => options.onActivity(activity.key), {
            fill: activity.fill,
            textColor: HandPaintedTheme.ink,
            fontSize: 15,
            radius: 28,
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

function renderShortcutRail(parent: Node, options: HomePageOptions) {
    const shortcuts: Array<{
        key: HomeShortcut;
        title: string;
        subtitle: string;
        icon: 'adventure' | 'hatchery' | 'formation';
        fill: Color;
    }> = [
        { key: 'adventure', title: '冒险主线', subtitle: '继续探索', icon: 'adventure', fill: new Color(255, 226, 151, 248) },
        { key: 'hatchery', title: '孵化室', subtitle: '三槽孵化', icon: 'hatchery', fill: new Color(220, 239, 224, 248) },
        { key: 'formation', title: '五宠阵法', subtitle: '调整站位', icon: 'formation', fill: new Color(227, 222, 246, 248) },
    ];

    panel(parent, 'ShortcutRibbon', 292, -25, 126, 540, new Color(255, 249, 231, 218), 30, true, new Color(190, 129, 72, 255), 3);
    shortcuts.forEach((shortcut, index) => {
        const card = button(parent, `Shortcut_${shortcut.key}`, shortcut.title, 292, 145 - index * 166, 108, 138, () => options.onShortcut(shortcut.key), {
            fill: shortcut.fill,
            textColor: HandPaintedTheme.ink,
            fontSize: 15,
            radius: 34,
            subtitle: shortcut.subtitle,
            border: new Color(199, 145, 88, 255),
        });
        const face = card.getChildByName('Face');
        const title = face?.getChildByName('Title');
        const subtitle = face?.getChildByName('Subtitle');
        if (title) title.setPosition(0, -25, 0);
        if (subtitle) subtitle.setPosition(0, -47, 0);
        drawUiIcon(card, 'ShortcutIcon', shortcut.icon, 0, 29, 44, index === 0 ? HandPaintedTheme.woodDark : index === 1 ? HandPaintedTheme.leaf : new Color(118, 91, 160, 255));
    });
}

function renderPetStage(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const species = getPetSpeciesMeta(pet);

    panel(parent, 'PetStageShadow', 0, -78, 390, 112, new Color(102, 75, 45, 38), 56, false, new Color(255, 255, 255, 0), 0);
    panel(parent, 'PetStageRug', 0, -60, 420, 156, new Color(207, 225, 154, 226), 72, true, new Color(255, 245, 205, 255), 7);
    const petArt = createPetArtSprite(parent, 'HomePetArt', getPetArtPath(pet, 'home'), 0, -34, 470, 470);
    petArt.setScale(new Vec3(0.985, 0.985, 1));
    petArt.on(Node.EventType.TOUCH_END, options.onSelectPet);
    tween(petArt)
        .repeatForever(
            tween(petArt)
                .to(1.9, { position: new Vec3(0, -20, 0), scale: new Vec3(1.01, 1.02, 1) }, { easing: 'sineInOut' })
                .to(1.9, { position: new Vec3(0, -34, 0), scale: new Vec3(0.985, 0.985, 1) }, { easing: 'sineInOut' }),
        )
        .start();

    tag(parent, 'FavoriteTag', '心仪宠物', 0, 285, 116, new Color(255, 240, 190, 248), HandPaintedTheme.ink);

    const nameplate = panel(parent, 'PetNameplate', 0, -350, 326, 100, new Color(255, 248, 224, 248), 26, true, new Color(183, 122, 67, 255), 3);
    text(nameplate, 'PetName', safeName(pet?.nickname, species.name), -139, 21, 190, 32, 21, HandPaintedTheme.ink, 'left', true);
    text(nameplate, 'PetMeta', `${species.element}系 · ${rarityName(pet)} · Lv.${Number(pet?.level || 1)}`, -139, -16, 198, 27, 13, HandPaintedTheme.mutedInk, 'left');
    const switchButton = button(nameplate, 'SwitchPet', '切换', 119, 0, 72, 58, options.onSelectPet, {
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
    panel(parent, 'WarmWash', 0, 0, 720, 1010, new Color(255, 226, 170, 24), 0, false, new Color(255, 255, 255, 0), 0);
    panel(parent, 'TopTrim', 0, 463, 720, 18, new Color(178, 116, 62, 218), 5, false, new Color(255, 235, 193, 255), 2);
    tag(parent, 'RoomLabel', '暖心小屋', 0, 420, 152, new Color(255, 246, 218, 245), HandPaintedTheme.ink);
    renderActivityRail(parent, options);
    renderShortcutRail(parent, options);
    renderPetStage(parent, options);
}
