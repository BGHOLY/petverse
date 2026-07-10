import { _decorator, Component, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    BREED_PAGE_BG,
    CREAM,
    TEXT_GREEN,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('MarriagePanel')
export class MarriagePanel extends Component {
    private infoLabel: Label | null = null;
    private petLabel: Label | null = null;
    private selectedA = 0;
    private selectedB = 1;

    onLoad() {
        this.ensureView();
    }

    async refreshMarriagePage() {
        this.ensureView();
        await Promise.all([
            GameStore.loadPets(),
            GameStore.loadMarriage(),
        ]);
        this.keepSelectionSafe();
        this.renderPets();
        this.renderMarriage();
    }

    private ensureView() {
        createPageBackground(this.node, '婚姻', BREED_PAGE_BG);
        createPanel(this.node, 'MarriagePetPanel', 0, 220, 640, 300, CREAM, CREAM, 24, 0);
        createLabel(this.node, 'MarriagePetTitle', '选择宠物', -230, 350, 160, 40, 22, TEXT_GREEN);
        this.petLabel = createInfoText(this.node, 'MarriagePetInfo', '', -300, 315, 600, 220, 18);
        createButton(this.node, 'NextPetAButton', '切换A', -120, 205, 150, 46, () => this.nextPet('A'), this, false, 16);
        createButton(this.node, 'NextPetBButton', '切换B', 120, 205, 150, 46, () => this.nextPet('B'), this, false, 16);

        createPanel(this.node, 'MarriageInfoPanel', 0, -170, 640, 430, CREAM, CREAM, 24, 0);
        createLabel(this.node, 'MarriageInfoTitle', '婚姻记录', -230, 10, 160, 40, 22, TEXT_GREEN);
        this.infoLabel = createInfoText(this.node, 'MarriageInfo', '', -300, -30, 600, 260, 17);

        createButton(this.node, 'CreateMarriageButton', '创建婚姻', -205, -390, 160, 54, () => this.createMarriage(), this, false, 18);
        createButton(this.node, 'LayEggButton', '产蛋', 0, -390, 160, 54, () => this.layEgg(), this, false, 18);
        createButton(this.node, 'RefreshMarriageButton', '刷新', 205, -390, 160, 54, () => this.refreshMarriagePage(), this, false, 18);
    }

    private renderPets() {
        if (!this.petLabel) return;
        const pets = PlayerData.pets.filter((pet: any) => !pet.isEgg);
        if (!pets.length) {
            this.petLabel.string = '暂无可婚姻宠物';
            return;
        }

        const a = pets[this.selectedA];
        const b = pets[this.selectedB];
        this.petLabel.string = [
            `A：${a?.nickname || '-'}  Lv.${a?.level ?? 1}  ${a?.married ? '已婚' : '未婚'}`,
            `B：${b?.nickname || '-'}  Lv.${b?.level ?? 1}  ${b?.married ? '已婚' : '未婚'}`,
            '',
            '创建婚姻会使用当前 A/B 两只宠物；产蛋会读取后端当前活跃婚姻。',
        ].join('\n');
    }

    private renderMarriage() {
        if (!this.infoLabel) return;
        const marriages = PlayerData.marriage || [];
        if (!marriages.length) {
            this.infoLabel.string = '暂无婚姻记录，可以先选择两只未婚宠物创建婚姻。';
            return;
        }

        this.infoLabel.string = marriages.slice(0, 6).map((item: any) => {
            const seconds = Number(item.cooldownRemainingSeconds || 0);
            return `#${item.id} 宠物 ${item.petAId} + ${item.petBId}  产蛋 ${item.canLayEgg ? '可用' : `${seconds}秒后`}`;
        }).join('\n');
    }

    private async createMarriage() {
        const pets = PlayerData.pets.filter((pet: any) => !pet.isEgg);
        const petA = pets[this.selectedA];
        const petB = pets[this.selectedB];
        if (!petA || !petB || petA.id === petB.id) return ToastManager.show('请选择两只不同宠物');

        const result = await ApiClient.post('/marriage/create', { petAId: petA.id, petBId: petB.id });
        ToastManager.show(result?.success ? '婚姻创建成功' : `婚姻创建失败：${result?.message || ''}`);
        await this.refreshMarriagePage();
    }

    private async layEgg() {
        const marriage = PlayerData.marriage?.[0];
        if (!marriage?.id) return ToastManager.show('暂无可产蛋婚姻');
        const result = await ApiClient.post('/marriage/lay-egg', { marriageId: marriage?.id });
        ToastManager.show(result?.success ? '产蛋成功，已加入孵化室' : `产蛋失败：${result?.message || ''}`);
        await Promise.all([
            GameStore.loadMarriage(),
            GameStore.loadEggs(),
        ]);
        this.renderMarriage();
    }

    private nextPet(slot: 'A' | 'B') {
        const pets = PlayerData.pets.filter((pet: any) => !pet.isEgg);
        if (pets.length < 2) return ToastManager.show('至少需要两只宠物');
        if (slot === 'A') {
            this.selectedA = (this.selectedA + 1) % pets.length;
            if (this.selectedA === this.selectedB) this.selectedA = (this.selectedA + 1) % pets.length;
        } else {
            this.selectedB = (this.selectedB + 1) % pets.length;
            if (this.selectedA === this.selectedB) this.selectedB = (this.selectedB + 1) % pets.length;
        }
        this.renderPets();
    }

    private keepSelectionSafe() {
        const pets = PlayerData.pets.filter((pet: any) => !pet.isEgg);
        if (this.selectedA >= pets.length) this.selectedA = Math.max(0, pets.length - 1);
        if (this.selectedB >= pets.length) this.selectedB = Math.max(0, pets.length - 1);
        if (pets.length > 1 && this.selectedA === this.selectedB) this.selectedB = this.selectedA === 0 ? 1 : 0;
    }
}
