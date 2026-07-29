import { Button, Label, Node, Sprite } from 'cc';
import { loadSpriteFrameResource, safeName } from '../../cute/CuteUiKit';
import { getPetArtPath, getPetSpeciesMeta } from '../../pet/PetArtRegistry';

export type HomeActivity = 'sign' | 'newcomer' | 'daily' | 'events';
export type HomeShortcut = 'adventure' | 'hatchery' | 'formation';

export type HomePageOptions = {
    pet: any;
    notificationCount: number;
    notificationCounts?: Partial<Record<HomeActivity, number>>;
    onSelectPet: () => void;
    onActivity: (activity: HomeActivity) => void;
    onShortcut: (shortcut: HomeShortcut) => void;
};

function bindClick(node: Node | null, owner: Node, callback: () => void) {
    const button = node?.getComponent(Button);
    if (!button) return;
    button.node.off(Button.EventType.CLICK, callback, owner);
    button.node.on(Button.EventType.CLICK, callback, owner);
}

function rarityName(pet: any) {
    const explicit = String(pet?.rarityName || '').split(' ')[0];
    if (explicit) return explicit;
    const rarity = Math.max(1, Math.min(6, Number(pet?.rarity || 1)));
    return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][rarity - 1];
}

/**
 * Updates the editor-authored HomePage only. It deliberately never creates,
 * removes, sizes, anchors, scales, or positions fixed UI nodes.
 */
export function renderHomePage(parent: Node, options: HomePageOptions) {
    const pet = options.pet;
    const species = getPetSpeciesMeta(pet);
    const petSprite = parent.getChildByName('HomePetArt')?.getComponent(Sprite);
    const petName = parent.getChildByName('PetName')?.getComponent(Label);
    const petMeta = parent.getChildByName('PetMeta')?.getComponent(Label);

    if (petName) petName.string = safeName(pet?.nickname, species.name);
    if (petMeta) petMeta.string = `${species.element}系 · ${rarityName(pet)} · Lv.${Number(pet?.level || 1)}`;
    if (petSprite) {
        loadSpriteFrameResource(getPetArtPath(pet, 'home'), (frame) => {
            if (!frame || !petSprite?.node?.isValid) return;
            petSprite.spriteFrame = frame;
        });
    }

    bindClick(parent.getChildByName('SwitchPet'), parent, options.onSelectPet);
    bindClick(parent.getChildByName('PetTouchArea'), parent, options.onSelectPet);

    const activities: HomeActivity[] = ['sign', 'newcomer', 'daily', 'events'];
    for (const activity of activities) {
        bindClick(parent.getChildByName(`Activity_${activity}`), parent, () => options.onActivity(activity));
        const dot = parent.getChildByName(`Activity_${activity}`)?.getChildByName('NotificationDot');
        if (dot) dot.active = Number(options.notificationCounts?.[activity] || 0) > 0;
    }

    const shortcuts: HomeShortcut[] = ['adventure', 'hatchery', 'formation'];
    for (const shortcut of shortcuts) {
        bindClick(parent.getChildByName(`Shortcut_${shortcut}`), parent, () => options.onShortcut(shortcut));
    }
}
