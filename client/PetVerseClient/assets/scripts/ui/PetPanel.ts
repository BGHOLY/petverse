import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    clearChildren,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    ensureTransform,
    getOrCreateNode,
    normalizeList,
    PET_PAGE_BG,
} from './UiKit';

const { ccclass } = _decorator;

const TXT_PET = '\u5ba0\u7269';
const TXT_PET_LIST = '\u5ba0\u7269\u5217\u8868';
const TXT_PET_SHAPE = '\u5ba0\u7269\u5f62\u6001';
const TXT_PET_DETAIL = '\u5ba0\u7269\u8be6\u60c5';
const TXT_EMPTY_PET = '\u6682\u65e0\u5ba0\u7269';
const TXT_REFRESH = '\u5237\u65b0';
const TXT_BATTLE = '\u51fa\u6218';
const TXT_SKILL = '\u6280\u80fd';
const TXT_MARRIAGE = '\u5a5a\u59fb';

@ccclass('PetPanel')
export class PetPanel extends Component {
    private petListContent: Node | null = null;
    private petShapeContent: Node | null = null;
    private petDetailContent: Node | null = null;
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
        createPageBackground(this.node, TXT_PET, PET_PAGE_BG);

        const listPanel = createPanel(this.node, 'PetListPanel', -230, 250, 180, 500);
        createLabel(listPanel, 'PetListTitleLabel', TXT_PET_LIST, 0, 220, 150, 30, 16);
        this.petListContent = this.ensureContent(listPanel, 'PetListContent', 0, -20, 170, 430);

        const shapePanel = createPanel(this.node, 'PetShapePanel', 0, 250, 220, 500);
        createLabel(shapePanel, 'PetShapeTitleLabel', TXT_PET_SHAPE, 0, 220, 180, 30, 16);
        this.petShapeContent = this.ensureContent(shapePanel, 'PetShapeContent', 0, -20, 205, 430);
        this.shapeLabel = createLabel(this.petShapeContent, 'PetShapeLabel', '', 0, 0, 190, 370, 24);

        const detailPanel = createPanel(this.node, 'PetDetailPanel', 230, 250, 180, 500);
        createLabel(detailPanel, 'PetDetailTitleLabel', TXT_PET_DETAIL, 0, 220, 150, 30, 16);
        this.petDetailContent = this.ensureContent(detailPanel, 'PetDetailContent', 0, -20, 165, 430);
        this.detailLabel = createInfoText(this.petDetailContent, 'PetDetailLabel', '', -78, 198, 156, 405, 13);

        const actionPanel = createPanel(this.node, 'PetActionPanel', 0, -360, 660, 220);
        createButton(actionPanel, 'SetBattlePetButton', TXT_BATTLE, -240, 55, 118, 48, () => this.setBattlePet(), this, false, 15);
        createButton(actionPanel, 'OpenSkillButton', TXT_SKILL, -80, 55, 118, 48, () => this.openSkillTips(), this, false, 15);
        createButton(actionPanel, 'MarriageStatusButton', TXT_MARRIAGE, 80, 55, 118, 48, () => this.showMarriageStatus(), this, false, 15);
        createButton(actionPanel, 'RefreshPetButton', TXT_REFRESH, 240, 55, 118, 48, () => void this.loadPetsFromServer(), this, false, 15);
        createInfoText(
            actionPanel,
            'PetActionHint',
            '\u70b9\u51fb\u5de6\u4fa7\u5ba0\u7269\u4f1a\u7acb\u5373\u5207\u6362\u5f62\u6001\u548c\u8be6\u60c5',
            -300,
            -30,
            600,
            70,
            13,
        );
    }

    private ensureContent(parent: Node, name: string, x: number, y: number, width: number, height: number) {
        const node = getOrCreateNode(parent, name);
        node.setPosition(new Vec3(x, y, 0));
        ensureTransform(node, width, height);
        return node;
    }

    private renderPetList() {
        if (!this.petListContent) return;

        clearChildren(this.petListContent);

        if (!this.pets.length) {
            createLabel(this.petListContent, 'PetListEmpty', TXT_EMPTY_PET, 0, 0, 140, 45, 13);
            return;
        }

        this.drawPetListButtons();
    }

    private drawPetListButtons() {
        if (!this.petListContent) return;

        this.pets.slice(0, 7).forEach((pet: any, index: number) => {
            createButton(
                this.petListContent!,
                `PetListButton${index}`,
                `${index + 1}.${pet.nickname || TXT_PET}`,
                0,
                184 - index * 52,
                140,
                44,
                () => {
                    this.selectedIndex = index;
                    this.drawPetListButtons();
                    this.renderSelectedPet();
                },
                this,
                index === this.selectedIndex,
                11,
            );
        });
    }

    private renderSelectedPet() {
        const pet = this.getSelectedPet();

        if (!pet) {
            if (this.shapeLabel) this.shapeLabel.string = TXT_EMPTY_PET;
            if (this.detailLabel) this.detailLabel.string = '-';
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills : [];
        const skillText = skills.length
            ? skills.slice(0, 5).map((skill: any, index: number) => `${index + 1}.${skill.name || skill.skillCode || TXT_SKILL}`).join('\n')
            : '\u6682\u65e0';

        if (this.shapeLabel) {
            this.shapeLabel.string = [
                this.getSpeciesText(pet),
                pet.nickname || '-',
                `Lv.${pet.level ?? 1}`,
                this.getRarityText(pet),
            ].join('\n');
        }

        if (this.detailLabel) {
            this.detailLabel.string = [
                `\u7269\u79cd:${pet.species || '-'}`,
                `\u7a00\u6709:${this.getRarityText(pet)}`,
                `\u7b49\u7ea7:${pet.level ?? 1}`,
                `\u7ecf\u9a8c:${pet.exp ?? 0}/${pet.nextExp ?? (pet.level ?? 1) * 100}`,
                `\u751f\u547d:${pet.hp ?? 0}`,
                `\u653b\u51fb:${pet.attack ?? 0}`,
                `\u9632\u5fa1:${pet.defense ?? 0}`,
                `\u901f\u5ea6:${pet.speed ?? pet.agility ?? 0}`,
                `\u9965\u997f:${pet.hunger ?? 0}`,
                `\u5feb\u4e50:${pet.happiness ?? 0}`,
                `\u6e05\u6d01:${pet.cleanliness ?? 0}`,
                `\u6280\u80fd\u683c:${pet.skillSlotCount ?? (Number(pet.rarity || 1) + 1)}`,
                `${TXT_SKILL}:\n${skillText}`,
            ].join('\n');
        }
    }

    private setBattlePet() {
        const pet = this.getSelectedPet();
        if (!pet) return ToastManager.show('\u8bf7\u5148\u9009\u62e9\u5ba0\u7269');
        PlayerData.user = { ...(PlayerData.user || {}), currentPetId: pet.id, currentPet: pet };
        ToastManager.show(`${pet.nickname || TXT_PET} \u5df2\u8bbe\u4e3a\u51fa\u6218`);
    }

    private openSkillTips() {
        ToastManager.show('\u6280\u80fd\u683c\u548c\u6280\u80fd\u5217\u8868\u5df2\u5728\u53f3\u4fa7\u663e\u793a');
    }

    private showMarriageStatus() {
        const pet = this.getSelectedPet();
        if (!pet) return ToastManager.show('\u8bf7\u5148\u9009\u62e9\u5ba0\u7269');
        ToastManager.show(pet.married || pet.marriedPetId
            ? '\u8be5\u5ba0\u7269\u5df2\u5a5a'
            : '\u8be5\u5ba0\u7269\u672a\u5a5a\uff0c\u53ef\u53bb\u7e41\u80b2\u9875');
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

    private getSpeciesText(pet: any) {
        const species = String(pet?.species || 'Pet');
        const map: Record<string, string> = {
            Cat: '\u732b',
            Dog: '\u72d7',
            Rabbit: '\u5154',
            Fox: '\u72d0\u72f8',
            Dragon: '\u9f99',
            Phoenix: '\u51e4\u51f0',
        };
        return map[species] || species;
    }

    private getRarityText(pet: any) {
        if (pet?.rarityName) return String(pet.rarityName);
        const rarity = Number(pet?.rarity || 1);
        const map: Record<number, string> = {
            1: '\u666e\u901a',
            2: '\u4f18\u79c0',
            3: '\u7a00\u6709',
            4: '\u53f2\u8bd7',
            5: '\u4f20\u8bf4',
            6: '\u795e\u8bdd',
        };
        return map[rarity] || `R${rarity}`;
    }
}
