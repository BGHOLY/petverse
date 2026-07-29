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
    if (!prefab) return null;
    const node = instantiate(prefab);
    node.name = `${kind}_${parent.children.length}`;
    parent.addChild(node);
    const view = node.getComponent(DynamicListItemView) || node.addComponent(DynamicListItemView);
    view.setData(data, onClick);
    return node;
}

export function dynamicListPrefabsReady() {
    return KINDS.every((kind) => cache.has(kind));
}
