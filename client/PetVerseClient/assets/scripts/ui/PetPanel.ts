import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    clearGenerated,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    getPageLayout,
    normalizeList,
    PET_PAGE_BG,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('PetPanel')
export class PetPanel extends Component {
    private shapeLabel: Label | null = null;
    private detailLabel: Label | null = null;
    private pets: any[] = [];
    private selectedIndex = 0;

    onLoad() { this.ensureView(); }

    async loadPetsFromServer() {
        this.ensureView();

        const result = await ApiClient.get('/pet');
        this.pets = this.normalizePets(result).filter((pet: any) => !pet.isEgg);

        PlayerData.user = { ...(PlayerData.user || {}), pets: this.pets };

        this.keepSelectedSafe();
        this.renderPetList();
        this.renderSelectedPet();
    }

    private ensureView() {
        const layout = createPageBackground(this.node, '宠物', PET_PAGE_BG);

        const topY = layout.top - 100;
        const bottomY = layout.bottom + 116;

        createPanel(this.node, 'PetListPanel', layout.left + 72, topY - 150, 118, 320);
        createLabel(this.node, 'PetListTitleLabel', '宠物列表', layout.left + 72, topY - 14, 100, 24, 15);

        createPanel(this.node, 'PetShapePanel', layout.left + 210, topY - 150, 140, 320);
        createLabel(this.node, 'PetShapeTitleLabel', '宠物形态', layout.left + 210, topY - 14, 100, 24, 15);
        this.shapeLabel = createLabel(this.node, 'PetShapeLabel', '', layout.left + 210, topY - 145, 120, 210, 20);

        createPanel(this.node, 'PetDetailPanel', layout.left + 355, topY - 150, 140, 320);
        createLabel(this.node, 'PetDetailTitleLabel', '宠物详情', layout.left + 355, topY - 14, 100, 24, 15);
        this.detailLabel = createInfoText(this.node, 'PetDetailLabel', '', layout.left + 355, topY - 155, 115, 240, 12);

        createPanel(this.node, 'PetActionPanel', 0, bottomY + 44, layout.pageW - 24, 130);
        createButton(this.node, 'SetBattlePetButton', '出战', layout.left + 90, bottomY + 70, 76, 38, () => this.setBattlePet(), this, false, 13);
        createButton(this.node, 'OpenSkillButton', '技能', layout.left + 180, bottomY + 70, 76, 38, () => this.openSkillTips(), this, false, 13);
        createButton(this.node, 'MarriageStatusButton', '婚姻', layout.left + 270, bottomY + 70, 76, 38, () => this.showMarriageStatus(), this, false, 13);
        createButton(this.node, 'RefreshPetButton', '刷新', layout.left + 360, bottomY + 70, 76, 38, () => void this.loadPetsFromServer(), this, false, 13);
    }

    private renderPetList() {
        clearGenerated(this.node, 'GeneratedPetList');
        const layout = getPageLayout(this.node);
        const topY = layout.top - 100;

        if (!this.pets.length) {
            createLabel(this.node, 'GeneratedPetListEmpty', '暂无宠物', layout.left + 72, topY - 155, 90, 45, 13);
            return;
        }

        this.pets.slice(0, 6).forEach((pet: any, index: number) => {
            createButton(this.node, `GeneratedPetList${index}`, `${index + 1}.${pet.nickname || '宠物'}`, layout.left + 72, topY - 55 - index * 44, 92, 32, () => {
                this.selectedIndex = index;
                this.renderPetList();
                this.renderSelectedPet();
            }, this, index === this.selectedIndex, 11);
        });
    }

    private renderSelectedPet() {
        const pet = this.getSelectedPet();

        if (!pet) {
            if (this.shapeLabel) this.shapeLabel.string = '暂无宠物';
            if (this.detailLabel) this.detailLabel.string = '-';
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills : [];
        const skillText = skills.length
            ? skills.slice(0, 4).map((skill: any, index: number) => `${index + 1}.${skill.name || skill.skillCode || '技能'}`).join('\n')
            : '暂无';

        if (this.shapeLabel) {
            this.shapeLabel.string = `${this.getPetEmoji(pet)}\n${pet.nickname || '-'}\nLv.${pet.level ?? 1}\n${pet.rarityName || `稀有${pet.rarity ?? 1}`}`;
        }

        if (this.detailLabel) {
            this.detailLabel.string = [
                `物种:${pet.species || '-'}`,
                `性别:${pet.gender || '未定'}`,
                `婚姻:${pet.married ? '已婚' : '未婚'}`,
                `生命:${pet.hp ?? 0}`,
                `攻击:${pet.attack ?? 0}`,
                `防御:${pet.defense ?? 0}`,
                `速度:${pet.speed ?? pet.agility ?? 0}`,
                `经验:${pet.exp ?? 0}`,
                `技能格:${pet.skillSlotCount ?? 0}`,
                `技能:\n${skillText}`,
            ].join('\n');
        }
    }

    private setBattlePet() {
        const pet = this.getSelectedPet();
        if (!pet) return ToastManager.show('请先选择宠物');
        PlayerData.user = { ...(PlayerData.user || {}), currentPetId: pet.id, currentPet: pet };
        ToastManager.show(`${pet.nickname || '宠物'} 已设为出战`);
    }

    private openSkillTips() {
        ToastManager.show('技能洗炼下一步接入');
    }

    private showMarriageStatus() {
        const pet = this.getSelectedPet();
        if (!pet) return ToastManager.show('请先选择宠物');
        ToastManager.show(pet.married ? '该宠物已婚，不能再次结婚' : '该宠物未婚，可进入繁育页');
    }

    private getSelectedPet() { return this.pets[this.selectedIndex] || this.pets[0] || null; }

    private keepSelectedSafe() {
        if (this.selectedIndex < 0) this.selectedIndex = 0;
        if (this.selectedIndex >= this.pets.length) this.selectedIndex = Math.max(0, this.pets.length - 1);
    }

    private normalizePets(result: any): any[] {
        const pets = normalizeList(result, ['pets']);
        if (pets.length) return pets;
        if (result?.pet) return [result.pet];
        if (result?.currentPet) return [result.currentPet];
        return [];
    }

    private getPetEmoji(pet: any) {
        const species = String(pet?.species || '').toLowerCase();
        if (species.includes('cat')) return '🐱';
        if (species.includes('dog')) return '🐶';
        if (species.includes('dragon')) return '🐲';
        if (species.includes('rabbit')) return '🐰';
        if (species.includes('fox')) return '🦊';
        return '🐾';
    }
}
