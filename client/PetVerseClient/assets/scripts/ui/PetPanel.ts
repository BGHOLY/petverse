import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('PetPanel')
export class PetPanel extends Component {
    private petInfoLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.loadPetsFromServer();
    }

    async loadPetsFromServer() {
        const result = await ApiClient.get('/pet');
        const pets = result?.pets || result?.data || [];
        console.log('[PetPanel] pets:', pets);

        if (PlayerData.user) {
            PlayerData.user.pets = pets;
        } else {
            PlayerData.user = { pets };
        }

        this.refreshPetInfo(pets);
    }

    refreshPetInfo(pets: any[] = PlayerData.user?.pets || []) {
        this.ensureView();
        const pet = pets.find((item: any) => !item.isEgg) || pets[0];

        if (!pet) {
            this.setText('No pet yet. Run seed-all or hatch an egg.');
            console.log('[PetPanel] render result: empty');
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills : [];
        const skillLines = skills.map((skill: any, index: number) => {
            return `${index + 1}. ${skill.name} (${skill.type}) rate ${Math.round((skill.triggerRate || 0) * 100)}%`;
        });

        const text =
            `Name: ${pet.nickname}\n` +
            `Species: ${pet.species}\n` +
            `Rarity: ${pet.rarityName || pet.rarity}\n` +
            `Level: ${pet.level}  Exp: ${pet.exp}/${pet.nextExp}\n\n` +
            `HP: ${pet.hp}  ATK: ${pet.attack}\n` +
            `DEF: ${pet.defense}  SPD: ${pet.speed ?? pet.agility}\n\n` +
            `Hunger: ${pet.hunger}  Happy: ${pet.happiness}  Clean: ${pet.cleanliness}\n\n` +
            `Skill Slots: ${pet.skillSlotCount}\n` +
            skillLines.join('\n');

        console.log('[PetPanel] render result:', text);
        this.setText(text);
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Pet';
        this.petInfoLabel = getOrCreateLabel(this.node, 'PetInfoLabel', -300, 285, 600, 610, 21);
        getOrCreateButton(this.node, 'RefreshButton', 'Refresh Pet', 0, -360, 220, 56, () => {
            void this.loadPetsFromServer();
        }, this);
    }

    private setText(text: string) {
        if (this.petInfoLabel) {
            this.petInfoLabel.string = text;
        }
    }
}
