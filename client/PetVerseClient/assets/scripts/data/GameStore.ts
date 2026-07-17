import { EDITOR } from 'cc/env';
import ApiClient from '../network/ApiClient';

export type StoreListener = () => void;

type ListName = 'inventory' | 'shopItems' | 'eggs' | 'marriages' | 'friends' | 'ranking';

export class GameStore {
    static user: any = GameStore.createEmptyUser();
    static pets: any[] = [];
    static currentPetId = 0;
    static inventory: any[] = [];
    static shopItems: any[] = [];
    static eggs: any[] = [];
    static marriages: any[] = [];
    static friends: any[] = [];
    static tower: any = {};
    static ranking: any[] = [];
    static lastError = '';
    static online = false;

    private static listeners = new Set<StoreListener>();
    private static detailPending = new Set<number>();

    static subscribe(listener: StoreListener) {
        if (typeof listener !== 'function') return () => false;
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    static notify() {
        for (const listener of [...this.listeners]) {
            if (typeof listener !== 'function') {
                this.listeners.delete(listener);
                continue;
            }
            try {
                listener();
            } catch (error) {
                console.error('[GameStore] listener failed:', error);
            }
        }
    }

    static get currentPet() {
        return this.pets.find((pet) => Number(pet?.id) === Number(this.currentPetId)) || this.pets[0] || null;
    }

    static setProfile(result: any) {
        if (!this.acceptResult(result, '玩家资料加载失败')) return false;

        const profile = result?.data || result || {};
        const user = profile?.user || result?.user || (profile?.id ? profile : {});
        const pets = this.findList(profile?.pets ?? result?.pets, []);

        this.user = {
            ...this.user,
            ...(user || {}),
        };

        if (pets !== null) {
            this.pets = this.mergePetList(pets.filter((pet) => !pet?.isEgg));
        }

        this.keepPetSelection();
        this.markSuccess();
        this.notify();
        void this.ensureCurrentPetDetail(false);
        return true;
    }

    static setPets(result: any) {
        if (!this.acceptResult(result, '宠物列表加载失败')) return false;

        const pets = this.findList(result, ['pets', 'data', 'items', 'list']);
        if (pets === null) return false;

        this.pets = this.mergePetList(pets.filter((pet) => !pet?.isEgg));
        this.keepPetSelection();
        this.markSuccess();
        this.notify();
        void this.ensureCurrentPetDetail(false);
        return true;
    }

    static updatePet(pet: any) {
        if (!pet || !Number(pet?.id)) return;

        const index = this.pets.findIndex((item) => Number(item?.id) === Number(pet?.id));
        if (index >= 0) {
            this.pets[index] = {
                ...this.pets[index],
                ...pet,
            };
        } else {
            this.pets.unshift(pet);
        }

        this.keepPetSelection();
        this.notify();
    }

    static setList(name: ListName, value: any) {
        if (!this.acceptResult(value, `${this.listTitle(name)}加载失败`)) return false;

        const keys: Record<ListName, string[]> = {
            inventory: ['inventory', 'inventoryItems', 'items', 'data', 'list'],
            shopItems: ['shopItems', 'items', 'data', 'list'],
            eggs: ['eggs', 'data', 'items', 'list'],
            marriages: ['marriages', 'data', 'items', 'list'],
            friends: ['friends', 'data', 'items', 'list'],
            ranking: ['ranking', 'rankings', 'data', 'items', 'list'],
        };

        const list = this.findList(value, keys[name]);
        if (list === null) return false;

        (this as any)[name] = list;
        this.markSuccess();
        this.notify();
        return true;
    }

    static setTower(value: any) {
        if (!this.acceptResult(value, '爬塔数据加载失败')) return false;

        const candidate = value?.data || value?.record || value?.status || value || {};
        this.tower = {
            ...(this.tower || {}),
            ...(candidate || {}),
        };
        this.markSuccess();
        this.notify();
        return true;
    }

    static selectPet(id: number) {
        const petId = Number(id || 0);
        if (!petId || !this.pets.some((pet) => Number(pet?.id) === petId)) return;

        this.currentPetId = petId;
        this.notify();
        void this.ensureCurrentPetDetail(true);
    }

    static async ensureCurrentPetDetail(force = false) {
        const pet = this.currentPet;
        const petId = Number(pet?.id || 0);
        if (!petId) return null;

        if (!force && this.isDetailComplete(pet)) return pet;
        if (this.detailPending.has(petId)) return pet;

        this.detailPending.add(petId);
        try {
            const result = await ApiClient.get(`/pet/${petId}`);
            if (!this.acceptResult(result, '宠物详情加载失败', false)) return pet;

            const detail = result?.data || result?.pet || result;
            if (detail && Number(detail?.id) === petId) {
                this.updatePet(detail);
                this.markSuccess();
                return this.currentPet;
            }

            return pet;
        } finally {
            this.detailPending.delete(petId);
        }
    }

    static list(value: any): any[] {
        return Array.isArray(value) ? value : [];
    }

    static listFrom(result: any, keys: string[] = []): any[] {
        return this.findList(result, keys) || [];
    }

    static markRequestFailure(result: any, fallback = '请求失败') {
        this.acceptResult(result, fallback);
    }

    static seedPreview() {
        if (!EDITOR) {
            this.resetRuntimeDefaults();
            return;
        }

        this.user = {
            id: 1,
            nickname: 'PetLover',
            avatar: '',
            level: 18,
            exp: 64,
            gold: 12840,
            diamond: 86,
            vipLevel: 2,
        };
        this.pets = [{
            id: 1,
            nickname: 'Mochi',
            species: 'Dog',
            rarity: 3,
            rarityName: '稀有 Rare',
            quality: 106,
            level: 18,
            exp: 40,
            nextExp: 1800,
            hp: 238,
            attack: 62,
            defense: 48,
            speed: 51,
            hunger: 92,
            happiness: 96,
            cleanliness: 88,
            stamina: 80,
            geneCode: 'ABCA',
            bodyType: 'normal',
            color: 'gold',
            pattern: 'stripe',
            finalAttributes: {
                hp: 238,
                attack: 62,
                defense: 48,
                speed: 51,
            },
            skills: [{ name: '爪击' }, { name: '快乐恢复' }, { name: '烈焰冲击' }],
        }];
        this.currentPetId = 1;
        this.inventory = [
            { id: 1, itemCode: 'food_apple', name: '苹果', type: 'food', quantity: 8, description: '恢复饥饿值' },
            { id: 2, itemCode: 'exp_small', name: '经验药水', type: 'exp', quantity: 3, description: '增加宠物经验' },
            { id: 3, itemCode: 'clean_kit', name: '清洁套装', type: 'utility', quantity: 2, description: '恢复清洁值' },
        ];
        this.shopItems = [
            { id: 1, shopItemId: 1, itemCode: 'food_apple', name: '苹果', type: 'food', price: 100, currency: 'gold' },
            { id: 2, shopItemId: 2, itemCode: 'exp_small', name: '经验药水', type: 'exp', price: 300, currency: 'gold' },
            { id: 3, shopItemId: 3, itemCode: 'egg_basic', name: '基础宠物蛋', type: 'egg', price: 20, currency: 'diamond' },
        ];
        this.eggs = [{ id: 1, rarityPotential: 3, quality: 103, species: 'Cat', geneCode: 'ABCA', remainingSeconds: 38, canHatch: false, status: 'unhatched', color: 'gold', pattern: 'stripe' }];
        this.marriages = [{ id: 1, petAId: 1, petBId: 2, status: 'active', layEggCooldownSeconds: 0 }];
        this.friends = [{ id: 2, nickname: '星海玩家', level: 12 }, { id: 3, nickname: '橘子汽水', level: 9 }];
        this.tower = { currentFloor: 20, maxFloor: 27, recommendedPower: 8600, power: 9050 };
        this.ranking = [
            { rank: 1, nickname: '塔顶之星', floor: 42 },
            { rank: 2, nickname: '宠物大师', floor: 36 },
            { rank: 3, nickname: 'PetLover', floor: 27 },
        ];
        this.online = false;
        this.lastError = '';
        this.notify();
    }

    private static resetRuntimeDefaults() {
        this.user = this.createEmptyUser();
        this.pets = [];
        this.currentPetId = 0;
        this.inventory = [];
        this.shopItems = [];
        this.eggs = [];
        this.marriages = [];
        this.friends = [];
        this.tower = {};
        this.ranking = [];
        this.online = false;
        this.lastError = '';
        this.notify();
    }

    private static createEmptyUser() {
        return {
            id: 0,
            nickname: 'PetVerse玩家',
            avatar: '',
            level: 1,
            exp: 0,
            gold: 0,
            diamond: 0,
            vipLevel: 0,
        };
    }

    private static mergePetList(incoming: any[]) {
        const oldById = new Map<number, any>();
        for (const pet of this.pets) {
            const id = Number(pet?.id || 0);
            if (id) oldById.set(id, pet);
        }

        return incoming.map((pet) => {
            const id = Number(pet?.id || 0);
            const oldPet = id ? oldById.get(id) : null;
            return oldPet ? { ...oldPet, ...pet } : pet;
        });
    }

    private static keepPetSelection() {
        if (!this.pets.length) {
            this.currentPetId = 0;
            return;
        }

        if (!this.pets.some((pet) => Number(pet?.id) === Number(this.currentPetId))) {
            this.currentPetId = Number(this.pets[0]?.id || 0);
        }
    }

    private static isDetailComplete(pet: any) {
        return Boolean(
            pet
            && pet?.id
            && (pet?.finalAttributes || pet?.geneCode || Array.isArray(pet?.skills))
            && pet?.nickname,
        );
    }

    private static findList(result: any, keys: string[] = []): any[] | null {
        if (Array.isArray(result)) return result;

        for (const key of keys) {
            if (Array.isArray(result?.[key])) return result[key];
        }

        if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
            for (const key of keys) {
                if (Array.isArray(result.data?.[key])) return result.data[key];
            }
        }

        return null;
    }

    private static acceptResult(result: any, fallback: string, notify = true) {
        if (result?.success !== false) return true;

        const message = String(result?.message || fallback);
        this.lastError = message;
        if (result?.error || /无法连接|请求超时|network|failed to fetch|timeout/i.test(message)) {
            this.online = false;
        }
        if (notify) this.notify();
        return false;
    }

    private static markSuccess() {
        this.online = true;
        this.lastError = '';
    }

    private static listTitle(name: ListName) {
        const titles: Record<ListName, string> = {
            inventory: '背包',
            shopItems: '商店',
            eggs: '孵化列表',
            marriages: '婚姻记录',
            friends: '好友列表',
            ranking: '排行榜',
        };
        return titles[name];
    }
}

export default GameStore;
