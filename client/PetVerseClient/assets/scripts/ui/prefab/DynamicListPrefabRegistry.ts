import { instantiate, Node, Prefab, resources } from 'cc';
import DynamicListItemView, { DynamicListItemData } from './DynamicListItemView';

export type DynamicListPrefabKind =
    | 'PetListItem'
    | 'InventoryItem'
    | 'ShopItem'
    | 'HatcheryEggItem'
    | 'SkillSlotItem'
    | 'FriendListItem'
    | 'RankingListItem';

const KINDS: DynamicListPrefabKind[] = [
    'PetListItem',
    'InventoryItem',
    'ShopItem',
    'HatcheryEggItem',
    'SkillSlotItem',
    'FriendListItem',
    'RankingListItem',
];

const cache = new Map<DynamicListPrefabKind, Prefab>();
let preloadPromise: Promise<void> | null = null;

function resourcePath(kind: DynamicListPrefabKind) {
    return `ui/list-items/${kind}`;
}

export function preloadDynamicListPrefabs() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = Promise.all(KINDS.map((kind) => new Promise<void>((resolve) => {
        resources.load(resourcePath(kind), Prefab, (error, prefab) => {
            if (error || !prefab) {
                console.error(`[DynamicListPrefabRegistry] Failed to load ${kind}.`, error);
                resolve();
                return;
            }
            cache.set(kind, prefab);
            resolve();
        });
    }))).then(() => undefined);
    return preloadPromise;
}

export function instantiateDynamicListItem(
    kind: DynamicListPrefabKind,
    parent: Node,
    data: DynamicListItemData,
    onClick?: () => void,
) {
    const prefab = cache.get(kind);
    if (!parent?.isValid) {
        console.warn(`[DynamicListPrefabRegistry] Skipped ${kind}: the list container is missing or no longer valid.`);
        return null;
    }
    if (!prefab?.isValid) {
        console.warn(`[DynamicListPrefabRegistry] Skipped ${kind}: the Prefab is not loaded or no longer valid.`);
        return null;
    }
    const node = instantiate(prefab);
    if (!node?.isValid) {
        console.warn(`[DynamicListPrefabRegistry] Skipped ${kind}: Cocos returned an invalid item node.`);
        return null;
    }
    node.name = `${kind}_${parent.children.length}`;
    parent.addChild(node);
    const view = node.getComponent(DynamicListItemView) || node.addComponent(DynamicListItemView);
    if (!view?.node?.isValid) {
        console.warn(`[DynamicListPrefabRegistry] Skipped ${kind}: DynamicListItemView could not be attached.`);
        if (node.isValid) node.destroy();
        return null;
    }
    view.setData(data, onClick);
    return node;
}

export function dynamicListPrefabsReady() {
    return KINDS.every((kind) => cache.has(kind));
}
