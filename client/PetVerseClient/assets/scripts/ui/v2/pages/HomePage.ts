import { Node, tween, Vec3 } from 'cc';
import { artImage, hitArea, safeName, text } from '../../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../../pet/PetArtRegistry';
import { createPetArtSprite } from '../../pet/PetArtView';
import { createNotificationDot, HandPaintedTheme } from '../HandPaintedUi';

export type HomeActivity = 'sign' | 'newcomer' | 'daily' | 'events';
export type HomeShortcut = 'adventure' | 'hatchery' | 'formation';

export type HomePageOptions = {
    pet: any;
    notificationCount: number;
    onSelectPet: () => void;
    onActivity: (activity: HomeActivity) => void;
    onShortcut: (shortcut: HomeShortcut) => void;
};

const ACTIVITY_HIT_AREAS: Array<[HomeActivity, number]> = [
    ['sign', 302],
    ['newcomer', 152],
    ['daily', 4],
    ['events', -144],
];

const SHORTCUT_HIT_AREAS: Array<[HomeShortcut, number]> = [
    ['adventure', 302],
    ['hatchery', 152],
    ['formation', 4],
];

function rarityName(pet: any) {
    const explicit = String(pet?.rarityName || '').split(' ')[0];
    if (explicit) return explicit;
    const rarity = Math.max(1, Math.min(6, Number(pet?.rarity || 1)));
    return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][rarity - 1];
}

function renderPetArt(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const petArt = createPetArtSprite(parent, 'HomePetArt', getPetArtPath(pet, 'home'), 0, -132, 492, 492);
    petArt.setScale(new Vec3(0.985, 0.985, 1));
    petArt.on(Node.EventType.TOUCH_END, options.onSelectPet);
    tween(petArt)
        .repeatForever(
            tween(petArt)
                .to(1.9, { position: new Vec3(0, -118, 0), scale: new Vec3(1.01, 1.02, 1) }, { easing: 'sineInOut' })
                .to(1.9, { position: new Vec3(0, -132, 0), scale: new Vec3(0.985, 0.985, 1) }, { easing: 'sineInOut' }),
        )
        .start();
}

function renderPetDetails(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const species = getPetSpeciesMeta(pet);
    text(parent, 'PetName', safeName(pet?.nickname, species.name), 116, -292, 166, 27, 18, HandPaintedTheme.ink, 'center', true);
    text(parent, 'PetMeta', `${species.element}系 · ${rarityName(pet)} · Lv.${Number(pet?.level || 1)}`, 116, -318, 176, 22, 11, HandPaintedTheme.mutedInk, 'center');
    hitArea(parent, 'SwitchPet', 116, -306, 210, 78, options.onSelectPet);
}

function renderInteractions(parent: Node, options: HomePageOptions) {
    hitArea(parent, 'PetTouchArea', 0, -132, 310, 430, options.onSelectPet);
    ACTIVITY_HIT_AREAS.forEach(([activity, y]) => {
        const area = hitArea(parent, `Activity_${activity}`, -287, y, 118, 132, () => options.onActivity(activity));
        if (activity === 'daily') createNotificationDot(area, options.notificationCount, 42, 44);
    });
    SHORTCUT_HIT_AREAS.forEach(([shortcut, y]) => {
        hitArea(parent, `Shortcut_${shortcut}`, 287, y, 118, 138, () => options.onShortcut(shortcut));
    });
}

export function renderHomePage(parent: Node, options: HomePageOptions) {
    artImage(parent, 'RoomArt', 'ui/home-v3/home-room-v3', 0, 0, 720, 1010);
    renderPetArt(parent, options);
    artImage(parent, 'HomeArtOverlay', 'ui/home-v3/home-overlay-v3', 0, 0, 720, 1010);
    renderPetDetails(parent, options);
    renderInteractions(parent, options);
}
