import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('SkillPanel')
export class SkillPanel extends Component {
    private skillListLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.refreshSkillInfo();
    }

    async refreshSkillInfo() {
        const result = await ApiClient.get('/pet');
        const pets = result?.pets || result?.data || [];
        if (PlayerData.user) {
            PlayerData.user.pets = pets;
        }
        console.log('[SkillPanel] pets:', pets);

        const pet = pets.find((item: any) => !item.isEgg) || pets[0];
        if (!pet) {
            this.setText('No pet skills yet.');
            console.log('[SkillPanel] render result: empty');
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills : [];
        const lines = [
            `${pet.nickname} Skill Slots: ${pet.skillSlotCount}`,
            `Rule Check: ${pet.skillSlotCount === pet.rarity + 1 ? 'OK' : 'Mismatch'}`,
            '',
            ...skills.map((skill: any, index: number) => {
                return `${index + 1}. ${skill.name}\nRarity ${skill.rarity}  ${skill.type}  Rate ${Math.round((skill.triggerRate || 0) * 100)}%\n${skill.description}`;
            }),
        ];

        const text = lines.join('\n\n');
        console.log('[SkillPanel] render result:', text);
        this.setText(text);
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Skills';
        this.skillListLabel = getOrCreateLabel(this.node, 'SkillListLabel', -300, 285, 600, 610, 20);
        getOrCreateButton(this.node, 'RefreshButton', 'Refresh Skills', 0, -360, 220, 56, () => {
            void this.refreshSkillInfo();
        }, this);
    }

    private setText(text: string) {
        if (this.skillListLabel) {
            this.skillListLabel.string = text;
        }
    }
}
