export default class PlayerData {
    public static token = '';
    public static user: any = null;
    public static setPets(pets: any[]) { if (!this.user) this.user = {}; this.user.pets = Array.isArray(pets) ? pets : []; }
    public static updatePet(pet: any) {
        if (!pet) return;
        if (!this.user) this.user = {};
        if (!Array.isArray(this.user.pets)) this.user.pets = [];
        const index = this.user.pets.findIndex((item: any) => item?.id === pet?.id);
        if (index >= 0) this.user.pets[index] = pet; else this.user.pets.unshift(pet);
    }
}
