export type StoreListener = () => void;

export class GameStore {
    static user: any = {
        id: 1,
        nickname: 'PetVerse玩家',
        avatar: '',
        level: 1,
        exp: 0,
        gold: 0,
        diamond: 0,
        vipLevel: 0,
    };

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

    static subscribe(listener: StoreListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    static notify() {
        for (const listener of this.listeners) listener();
    }

    static get currentPet() {
        return this.pets.find((pet) => Number(pet?.id) === Number(this.currentPetId)) || this.pets[0] || null;
    }

    static setProfile(result: any) {
        const profile = result?.data || result || {};
        const user = profile?.user || result?.user || {};
        const pets = this.list(profile?.pets ?? result?.pets);

        this.user = { ...this.user, ...user };
        if (pets.length || Array.isArray(profile?.pets)) this.pets = pets.filter((pet) => !pet?.isEgg);
        this.keepPetSelection();
        this.online = result?.success !== false;
        this.notify();
    }

    static setPets(result: any) {
        const pets = this.list(result?.pets ?? result?.data ?? result);
        if (pets.length || Array.isArray(result?.pets) || Array.isArray(result?.data)) {
            this.pets = pets.filter((pet) => !pet?.isEgg);
        }
        this.keepPetSelection();
        this.notify();
    }

    static updatePet(pet: any) {
        if (!pet) return;
        const index = this.pets.findIndex((item) => Number(item?.id) === Number(pet?.id));
        if (index >= 0) this.pets[index] = { ...this.pets[index], ...pet };
        else this.pets.unshift(pet);
        this.keepPetSelection();
        this.notify();
    }

    static setList(name: 'inventory' | 'shopItems' | 'eggs' | 'marriages' | 'friends' | 'ranking', value: any) {
        const keys: Record<string, string[]> = {
            inventory: ['inventory', 'items', 'data'],
            shopItems: ['shopItems', 'items', 'data'],
            eggs: ['eggs', 'data'],
            marriages: ['marriages', 'data'],
            friends: ['friends', 'data'],
            ranking: ['ranking', 'rankings', 'data', 'list'],
        };
        (this as any)[name] = this.listFrom(value, keys[name]);
        this.notify();
    }

    static setTower(value: any) {
        this.tower = value?.data || value?.record || value?.status || value || {};
        this.notify();
    }

    static selectPet(id: number) {
        if (this.pets.some((pet) => Number(pet?.id) === Number(id))) {
            this.currentPetId = Number(id);
            this.notify();
        }
    }

    static list(value: any): any[] {
        return Array.isArray(value) ? value : [];
    }

    static listFrom(result: any, keys: string[] = []): any[] {
        if (Array.isArray(result)) return result;
        for (const key of keys) {
            if (Array.isArray(result?.[key])) return result[key];
        }
        return [];
    }

    static seedPreview() {
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
        this.notify();
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
}

export default GameStore;
