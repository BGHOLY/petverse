export default class PlayerData {
    public static token: string = '';

    public static user: any = null;

    public static setPets(pets: any[]) {
        if (!this.user) {
            return;
        }

        this.user.pets = Array.isArray(pets) ? pets : [];
    }

    public static updatePet(pet: any) {
        if (!this.user || !pet) {
            return;
        }

        if (!Array.isArray(this.user.pets)) {
            this.user.pets = [];
        }

        const index = this.user.pets.findIndex((item: any) => item.id === pet.id);

        if (index >= 0) {
            this.user.pets[index] = pet;
        } else {
            this.user.pets.unshift(pet);
        }
    }
}
