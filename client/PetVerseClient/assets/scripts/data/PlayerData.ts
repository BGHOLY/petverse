export default class PlayerData {
    public static token: string = '';

    public static user: any = null;
    public static pets: any[] = [];
    public static currentPetId: number | string | null = null;
    public static inventory: any[] = [];
    public static shopItems: any[] = [];
    public static eggs: any[] = [];
    public static marriage: any[] = [];
    public static friends: any[] = [];
    public static tower: any = null;
    public static ranking: any = null;
    public static dailyTask: any = null;
    public static loading = false;
    public static lastError = '';

    public static setPets(pets: any[]) {
        this.pets = Array.isArray(pets) ? pets : [];

        if (!this.user) this.user = {};
        this.user.pets = this.pets;

        if (!this.currentPetId && this.pets.length) {
            this.currentPetId = this.pets[0].id;
        }
    }

    public static updatePet(pet: any) {
        if (!pet) {
            return;
        }

        if (!Array.isArray(this.pets)) this.pets = [];

        const index = this.pets.findIndex((item: any) => item.id === pet.id);

        if (index >= 0) {
            this.pets[index] = pet;
        } else {
            this.pets.unshift(pet);
        }

        if (!this.user) this.user = {};
        this.user.pets = this.pets;
        if (!this.currentPetId) this.currentPetId = pet.id;
    }

    public static getCurrentPet() {
        const pets = this.pets.length ? this.pets : (this.user?.pets || []);
        return pets.find((pet: any) => String(pet.id) === String(this.currentPetId)) || pets[0] || null;
    }

    public static setUser(user: any) {
        this.user = {
            ...(this.user || {}),
            ...(user || {}),
        };
    }

    public static setError(message: string) {
        this.lastError = message || '';
    }
}
