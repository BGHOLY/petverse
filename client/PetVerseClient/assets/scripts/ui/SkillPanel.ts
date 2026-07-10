import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { createButton, createInfoText, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('SkillPanel')
export class SkillPanel extends Component {
    private statusLabel: Label | null = null;
    private skillListLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    async refreshSkillInfo() {
        this.ensureView();
        this.setStatus('加载技能中...');
        this.setText('加载中...');

        const result = await ApiClient.get('/pet/my');
        const pets = this.normalizePets(result);
        console.log('[SkillPanel] response:', result);

        if (PlayerData.user) {
            PlayerData.user.pets = pets;
        }

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setText('\u6682\u65e0\u6570\u636e');
            return;
        }

        const pet = pets.find((item: any) => !item.isEgg) || pets[0];
        if (!pet) {
            this.setStatus('\u6682\u65e0\u5ba0\u7269');
            this.setText('\u6682\u65e0\u6280\u80fd');
            console.log('[SkillPanel] render result: empty');
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills : [];
        const slotCount = pet.skillSlotCount ?? ((pet.rarity ?? 1) + 1);
        this.setStatus(`${pet.nickname || '\u5ba0\u7269'}  \u6280\u80fd\u683c: ${slotCount}`);

        if (!skills.length) {
            this.setText('\u6682\u65e0\u6280\u80fd');
            console.log('[SkillPanel] render result: no skills');
            return;
        }

        const lines = [
            `\u7a00\u6709\u5ea6: ${pet.rarityName || pet.rarity || '-'}  \u7b49\u7ea7: ${pet.level ?? 1}`,
            `\u89c4\u5219\u6821\u9a8c: ${slotCount === (pet.rarity ?? 1) + 1 ? 'OK' : 'Mismatch'}`,
            '',
            ...skills.slice(0, slotCount).map((skill: any, index: number) => {
                const rate = Math.round((Number(skill.triggerRate) || 0) * 100);
                return `${index + 1}. ${skill.name || skill.skillCode}\n\u7c7b\u578b: ${skill.type || '-'}  \u89e6\u53d1: ${rate}%\n${skill.description || ''}`;
            }),
        ];

        const text = lines.join('\n\n');
        console.log('[SkillPanel] render result:', text);
        this.setText(text);
    }

    private ensureView() {
        createPageTitle(this.node, '\u6280\u80fd');
        this.statusLabel = createStatusLabel(this.node, 'SkillStatusLabel');
        this.skillListLabel = createInfoText(this.node, 'SkillListLabel', '');
        createButton(this.node, 'RefreshSkillButton', '\u5237\u65b0\u6280\u80fd', 0, -330, 180, 52, () => {
            void this.refreshSkillInfo();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setText(text: string) {
        if (this.skillListLabel) {
            this.skillListLabel.string = text;
        }
    }

    private normalizePets(result: any): any[] {
        const pets = normalizeList(result, ['pets']);
        if (pets.length) {
            return pets;
        }

        if (result?.pet) {
            return [result.pet];
        }

        if (result?.currentPet) {
            return [result.currentPet];
        }

        return [];
    }
}
