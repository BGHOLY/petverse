import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { createButton, createInfoText, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('PetPanel')
export class PetPanel extends Component {
    private statusLabel: Label | null = null;
    private petInfoLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    async loadPetsFromServer() {
        this.ensureView();
        this.setStatus('加载宠物中...');
        this.setText('加载中...');
        const result = await ApiClient.get('/pet');
        const pets = this.normalizePets(result);
        console.log('[PetPanel] response:', result);

        if (PlayerData.user) {
            PlayerData.user.pets = pets;
        } else {
            PlayerData.user = { pets };
        }

        this.renderPets(pets, result?.success === false ? result?.message : '');
    }

    private renderPets(pets: any[], errorMessage = '') {
        const pet = pets.find((item: any) => !item.isEgg) || pets[0];

        if (errorMessage) {
            this.setStatus(`加载失败: ${errorMessage}`);
        } else {
            this.setStatus(`宠物数量: ${pets.length}`);
        }

        if (!pet) {
            this.setText('暂无宠物');
            console.log('[PetPanel] render result: empty');
            return;
        }

        const skills = Array.isArray(pet.skills) ? pet.skills.slice(0, 6) : [];
        const skillLines = skills.map((skill: any, index: number) => {
            return `${index + 1}. ${skill.name || skill.skillCode}  ${skill.type || ''}  ${Math.round((skill.triggerRate || 0) * 100)}%`;
        });

        const text = [
            `昵称: ${pet.nickname || '-'}`,
            `物种: ${pet.species || '-'}`,
            `稀有度: ${pet.rarityName || pet.rarity || '-'}`,
            `等级: ${pet.level ?? 1}`,
            `经验: ${pet.exp ?? 0}/${pet.nextExp ?? 100}`,
            `生命: ${pet.hp ?? 0}`,
            `攻击: ${pet.attack ?? 0}`,
            `防御: ${pet.defense ?? 0}`,
            `速度: ${pet.speed ?? pet.agility ?? 0}`,
            `饥饿: ${pet.hunger ?? 0}`,
            `快乐: ${pet.happiness ?? 0}`,
            `清洁: ${pet.cleanliness ?? 0}`,
            `技能格: ${pet.skillSlotCount ?? 0}`,
            '',
            '技能:',
            ...(skillLines.length ? skillLines : ['暂无技能']),
        ].join('\n');

        console.log('[PetPanel] render result:', text);
        this.setText(text);
    }

    private ensureView() {
        createPageTitle(this.node, '宠物');
        this.statusLabel = createStatusLabel(this.node, 'PetStatusLabel');
        this.petInfoLabel = createInfoText(this.node, 'PetInfoLabel');
        createButton(this.node, 'RefreshPetButton', '刷新宠物', 0, -330, 180, 52, () => {
            void this.loadPetsFromServer();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setText(text: string) {
        if (this.petInfoLabel) {
            this.petInfoLabel.string = text;
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
