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

const ACTIVITY_BUTTONS: Array<[HomeActivity, number, string, number]> = [
    ['sign', 258, 'ui/home-v4/activity-sign-v4', 108],
    ['newcomer', 112, 'ui/home-v4/activity-newcomer-v4', 102],
    ['daily', -34, 'ui/home-v4/activity-daily-v4', 104],
    ['events', -180, 'ui/home-v4/activity-events-v4', 104],
];

const SHORTCUT_BUTTONS: Array<[HomeShortcut, number, string, number]> = [
    ['adventure', 258, 'ui/home-v4/shortcut-adventure-v4', 112],
    ['hatchery', 112, 'ui/home-v4/shortcut-hatchery-v4', 102],
    ['formation', -34, 'ui/home-v4/shortcut-formation-v4', 106],
];

function rarityName(pet: any) {
    const explicit = String(pet?.rarityName || '').split(' ')[0];
    if (explicit) return explicit;
    const rarity = Math.max(1, Math.min(6, Number(pet?.rarity || 1)));
    return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][rarity - 1];
}

function renderPetArt(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const petArt = createPetArtSprite(parent, 'HomePetArt', getPetArtPath(pet, 'home'), 0, -116, 408, 408);
    petArt.setScale(new Vec3(0.985, 0.985, 1));
    petArt.on(Node.EventType.TOUCH_END, options.onSelectPet);
    tween(petArt)
        .repeatForever(
            tween(petArt)
                .to(1.9, { position: new Vec3(0, -105, 0), scale: new Vec3(1.01, 1.02, 1) }, { easing: 'sineInOut' })
                .to(1.9, { position: new Vec3(0, -116, 0), scale: new Vec3(0.985, 0.985, 1) }, { easing: 'sineInOut' }),
        )
        .start();
}

function renderPetDetails(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const species = getPetSpeciesMeta(pet);
    artImage(parent, 'PetNameplateArt', 'ui/home-v4/pet-nameplate-v4', 0, -328, 228, 82);
    text(parent, 'PetName', safeName(pet?.nickname, species.name), 0, -316, 174, 27, 18, HandPaintedTheme.ink, 'center', true);
    text(parent, 'PetMeta', `${species.element}系 · ${rarityName(pet)} · Lv.${Number(pet?.level || 1)}`, 0, -341, 184, 22, 11, HandPaintedTheme.mutedInk, 'center');
    hitArea(parent, 'SwitchPet', 0, -328, 228, 82, options.onSelectPet);
}

function renderInteractions(parent: Node, options: HomePageOptions) {
    hitArea(parent, 'PetTouchArea', 0, -116, 300, 372, options.onSelectPet);
    ACTIVITY_BUTTONS.forEach(([activity, y, path, height]) => {
        artImage(parent, `ActivityArt_${activity}`, path, -307, y, 98, height);
        const area = hitArea(parent, `Activity_${activity}`, -307, y, 106, 122, () => options.onActivity(activity));
        if (activity === 'daily') createNotificationDot(area, options.notificationCount, 38, 42);
    });
    SHORTCUT_BUTTONS.forEach(([shortcut, y, path, height]) => {
        artImage(parent, `ShortcutArt_${shortcut}`, path, 307, y, 98, height);
        hitArea(parent, `Shortcut_${shortcut}`, 307, y, 106, 124, () => options.onShortcut(shortcut));
    });
}

export function renderHomePage(parent: Node, options: HomePageOptions) {
    artImage(parent, 'RoomArt', 'ui/home-v3/home-room-v3', 0, 0, 720, 1010);
    renderPetArt(parent, options);
    renderPetDetails(parent, options);
    renderInteractions(parent, options);
}
