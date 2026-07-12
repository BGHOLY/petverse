import { sys } from 'cc';

const HOME_KEY = 'petverse.homePetId';
const FILTER_KEY = 'petverse.petFilter';

export type PetFilterState = {
    rarity: number;
    element: string;
    sort: 'power' | 'level' | 'growth' | 'skills';
};

export function loadHomePetId() {
    return Math.max(0, Number(sys.localStorage.getItem(HOME_KEY) || 0));
}

export function saveHomePetId(id: number) {
    sys.localStorage.setItem(HOME_KEY, String(Math.max(0, Number(id || 0))));
}

export function loadPetFilter(): PetFilterState {
    try {
        const value = JSON.parse(sys.localStorage.getItem(FILTER_KEY) || '{}');
        return {
            rarity: Math.max(0, Math.min(6, Number(value?.rarity || 0))),
            element: String(value?.element || 'all'),
            sort: ['power', 'level', 'growth', 'skills'].includes(String(value?.sort))
                ? value.sort
                : 'power',
        };
    } catch {
        return { rarity: 0, element: 'all', sort: 'power' };
    }
}

export function savePetFilter(value: PetFilterState) {
    sys.localStorage.setItem(FILTER_KEY, JSON.stringify(value));
}
