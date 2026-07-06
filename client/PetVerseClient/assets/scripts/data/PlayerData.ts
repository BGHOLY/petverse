export default class PlayerData {
    public static token: string = '';

    public static user: any = null;

    public static updatePet(pet: any) {
        if (!this.user?.pets?.length) {
            return;
        }

        this.user.pets[0] = pet;
    }
}
