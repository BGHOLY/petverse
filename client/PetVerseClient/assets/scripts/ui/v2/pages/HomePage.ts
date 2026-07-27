import { Color, Node } from 'cc';
import {
    artImage,
    button,
    circle,
    clearNode,
    CuteTheme,
    hitArea,
    image,
    panel,
    safeName,
    setRect,
    text,
} from '../../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../../pet/PetArtRegistry';
import { createPetArtSprite } from '../../pet/PetArtView';
import { createNotificationDot, drawUiIcon } from '../HandPaintedUi';
import type { UiIconName } from '../AppRoutes';

export type HomeActivity = 'events';
export type HomeShortcut = 'friends' | 'bond' | 'mail';

export type HomePageOptions = {
    pet: any;
    teamPets: any[];
    notificationCounts?: Partial<Record<'events' | HomeShortcut, number>>;
    onSelectPet: () => void;
    onSelectTeamPet: (petId: number) => void;
    onMainQuest: () => void;
    onActivity: (activity: HomeActivity) => void;
    onShortcut: (shortcut: HomeShortcut) => void;
    onAdventure: () => void;
};

function decorativeDot(
    parent: Node,
    name: string,
    x: number,
    y: number,
    radius: number,
    fill: Color,
    border: Color = CuteTheme.white,
) {
    const dot = new Node(name);
    parent.addChild(dot);
    setRect(dot, x, y, radius * 2, radius * 2);
    circle(dot, radius, fill, border, 1);
    return dot;
}

function combatRoleName(pet: any) {
    const explicit = String(
        pet?.combatRoleName
        || pet?.roleName
        || pet?.combatRole
        || pet?.role
        || pet?.position
        || '',
    ).trim();
    if (explicit) {
        const normalized: Record<string, string> = {
            damage: '输出型',
            attacker: '输出型',
            dps: '输出型',
            tank: '防御型',
            defense: '防御型',
            healer: '治疗型',
            heal: '治疗型',
            support: '辅助型',
            control: '控制型',
        };
        return normalized[explicit.toLowerCase()] || explicit;
    }

    const attack = Number(pet?.attack || pet?.finalAttributes?.attack || 0);
    const defense = Number(pet?.defense || pet?.finalAttributes?.defense || 0);
    const hp = Number(pet?.hp || pet?.finalAttributes?.hp || 0);
    if (defense > attack * 1.15 || hp > attack * 5) return '防御型';
    return '输出型';
}

function displayPetName(pet: any) {
    if (!Number(pet?.id || 0)) return '等待主宠数据';
    const species = getPetSpeciesMeta(pet);
    return safeName(pet?.nickname, species.name || '展示主宠');
}

function displayPetMeta(pet: any) {
    if (!Number(pet?.id || 0)) return '连接后显示属性与定位';
    const species = getPetSpeciesMeta(pet);
    const element = String(species?.element || pet?.element || '自然').replace(/系$/, '');
    return `${element}系 · ${combatRoleName(pet)} · Lv.${Number(pet?.level || 1)}`;
}

export function renderHomePetStage(parent: Node, options: HomePageOptions) {
    clearNode(parent);
    const anchor = new Node('HomePetAnchor');
    parent.addChild(anchor);
    setRect(anchor, 0, 24, 410, 410);

    const petArt = createPetArtSprite(
        anchor,
        'PetArtwork2DFallback',
        getPetArtPath(options.pet, 'home'),
        0,
        0,
        390,
        390,
    );
    hitArea(petArt, 'PetTouchArea', 0, 0, 350, 370, options.onSelectPet);
}

function shortcutButton(
    parent: Node,
    name: string,
    title: string,
    icon: UiIconName,
    y: number,
    fill: Color,
    onClick: () => void,
    count = 0,
) {
    const entry = button(parent, name, title, 0, y, 108, 76, onClick, {
        icon: ' ',
        fill,
        fontSize: 14,
        radius: 24,
        border: CuteTheme.white,
    });
    drawUiIcon(entry, 'IllustrationIcon', icon, 0, 14, 30, CuteTheme.caramel);
    createNotificationDot(entry, count, 40, 33);
    return entry;
}

function renderShortcuts(parent: Node, options: HomePageOptions) {
    const left = new Node('LeftEntryColumn');
    parent.addChild(left);
    setRect(left, -294, 168, 112, 190);
    shortcutButton(
        left,
        'MainQuestEntry',
        '主线任务',
        'adventure',
        48,
        CuteTheme.paperWarm,
        options.onMainQuest,
    );
    shortcutButton(
        left,
        'ActivityEntry',
        '活动',
        'benefits',
        -48,
        CuteTheme.peach,
        () => options.onActivity('events'),
        Number(options.notificationCounts?.events || 0),
    );

    const right = new Node('RightEntryColumn');
    parent.addChild(right);
    setRect(right, 294, 122, 112, 286);
    shortcutButton(
        right,
        'FriendEntry',
        '好友',
        'friends',
        96,
        CuteTheme.sky,
        () => options.onShortcut('friends'),
        Number(options.notificationCounts?.friends || 0),
    );
    shortcutButton(
        right,
        'BondEntry',
        '羁绊',
        'marriage',
        0,
        CuteTheme.pink,
        () => options.onShortcut('bond'),
        Number(options.notificationCounts?.bond || 0),
    );
    shortcutButton(
        right,
        'MailEntry',
        '邮件',
        'mail',
        -96,
        CuteTheme.mint,
        () => options.onShortcut('mail'),
        Number(options.notificationCounts?.mail || 0),
    );
}

function renderNameplate(parent: Node, options: HomePageOptions) {
    const nameplate = new Node('PetNameplate');
    parent.addChild(nameplate);
    setRect(nameplate, 0, -205, 240, 120);
    artImage(nameplate, 'NameplateArtwork', 'ui/home-v4/pet-nameplate-v4', 0, 0, 240, 120);
    text(
        nameplate,
        'PetName',
        displayPetName(options.pet),
        0,
        14,
        188,
        32,
        22,
        CuteTheme.caramel,
        'center',
        true,
    );
    text(
        nameplate,
        'PetMeta',
        displayPetMeta(options.pet),
        0,
        -15,
        190,
        24,
        13,
        CuteTheme.muted,
    );
    text(
        nameplate,
        'DisplayPetTag',
        Number(options.pet?.id || 0) ? '展示主宠' : '2D占位',
        -12,
        -37,
        104,
        20,
        11,
        CuteTheme.peachDark,
        'center',
        true,
    );
    const rename = button(nameplate, 'RenamePet', '', 91, -34, 30, 30, options.onSelectPet, {
        icon: '✎',
        fill: CuteTheme.paperWarm,
        fontSize: 12,
        radius: 15,
        border: CuteTheme.honey,
    });
    rename.setScale(0.82, 0.82, 1);
    hitArea(nameplate, 'SwitchPet', 0, 0, 240, 112, options.onSelectPet);
}

function renderTeamStrip(parent: Node, options: HomePageOptions) {
    const team = panel(
        parent,
        'TeamStrip',
        0,
        -290,
        520,
        88,
        CuteTheme.paper,
        30,
        true,
        CuteTheme.white,
        3,
    );
    text(team, 'TeamTitle', '出战阵容', -236, 0, 78, 28, 14, CuteTheme.caramel, 'left', true);

    for (let index = 0; index < 5; index += 1) {
        const pet = options.teamPets[index];
        const petId = Number(pet?.id || 0);
        const slotX = -142 + index * 74;
        const selected = petId > 0 && petId === Number(options.pet?.id || 0);
        const slot = pet
            ? image(
                team,
                `PetSlot_${index + 1}`,
                getPetArtPath(pet, 'thumb'),
                slotX,
                0,
                62,
                62,
                selected ? CuteTheme.honey : CuteTheme.paperWarm,
            )
            : panel(
                team,
                `PetSlot_${index + 1}`,
                slotX,
                0,
                62,
                62,
                CuteTheme.paperWarm,
                22,
                false,
                CuteTheme.caramelSoft,
                2,
            );
        if (!pet) {
            drawUiIcon(slot, 'EmptyPetIcon', 'pet', 0, 2, 26, CuteTheme.caramelSoft);
        } else {
            const species = getPetSpeciesMeta(pet);
            decorativeDot(slot, 'ElementDot', 23, 22, 8, selected ? CuteTheme.honeyDark : CuteTheme.mintDark);
            text(slot, 'Element', String(species.element || '').slice(0, 1), 23, 22, 14, 14, 9, CuteTheme.white, 'center', true);
            text(slot, 'Level', `Lv.${Number(pet?.level || 1)}`, 0, -23, 50, 16, 9, CuteTheme.caramel, 'center', true);
        }
        if (petId) {
            hitArea(slot, 'SelectPet', 0, 0, 62, 62, () => options.onSelectTeamPet(petId));
        }
    }
}

function renderAdventureCta(parent: Node, options: HomePageOptions) {
    const cta = button(parent, 'AdventureCTA', '开始冒险', 0, -400, 312, 66, options.onAdventure, {
        icon: ' ',
        fill: new Color(255, 241, 181, 255),
        textColor: CuteTheme.caramel,
        fontSize: 20,
        radius: 30,
        border: CuteTheme.honeyDark,
    });
    drawUiIcon(cta, 'AdventureIllustration', 'adventure', -112, 10, 34, CuteTheme.honeyDark);
    decorativeDot(cta, 'FlowerLeft', -142, 22, 7, CuteTheme.peach);
    decorativeDot(cta, 'FlowerRight', 142, 22, 7, CuteTheme.peach);
    text(cta, 'Subtitle', '踏上新的旅程', 18, -20, 180, 18, 11, CuteTheme.muted, 'center', false);
}

export function renderHomePage(parent: Node, options: HomePageOptions) {
    clearNode(parent);
    renderShortcuts(parent, options);
    renderNameplate(parent, options);
    renderTeamStrip(parent, options);
    renderAdventureCta(parent, options);
}
