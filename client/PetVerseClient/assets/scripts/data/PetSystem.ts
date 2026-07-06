export interface PetData {
    id: number;
    name: string;
    level: number;
    exp: number;
    hunger: number;
    happiness: number;
    stamina: number;
}

export default class PetSystem {
    public pet: PetData;

    constructor(pet: PetData) {
        this.pet = pet;
    }

    feedPet() {
        this.pet.hunger = Math.min(100, this.pet.hunger + 20);
        this.pet.happiness = Math.min(100, this.pet.happiness + 5);
    }

    cleanPet() {
        this.pet.happiness = Math.min(100, this.pet.happiness + 10);
    }

    trainPet() {
        if (this.pet.stamina < 10) {
            return;
        }

        this.pet.stamina -= 10;
        this.addExp(20);
    }

    addExp(amount: number) {
        this.pet.exp += Math.max(0, amount);
        this.levelUp();
    }

    levelUp() {
        while (this.pet.exp >= 100) {
            this.pet.exp -= 100;
            this.pet.level += 1;
        }
    }
}
