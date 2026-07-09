import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    BREED_PAGE_BG,
    clearGenerated,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    getPageLayout,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('BreedPanel')
export class BreedPanel extends Component {
    private infoLabel: Label | null = null;
    private pets: any[] = [];
    private selectedMyIndex = 0;
    private selectedFriendIndex = 1;

    onLoad() { this.ensureView(); }

    async refreshBreedPage() {
        this.ensureView();

        const result = await ApiClient.get('/pet');
        this.pets = normalizeList(result, ['pets']).filter((pet: any) => !pet.isEgg);

        if (this.pets.length < 2) {
            this.selectedMyIndex = 0;
            this.selectedFriendIndex = 0;
        } else if (this.selectedFriendIndex === this.selectedMyIndex) {
            this.selectedFriendIndex = this.selectedMyIndex === 0 ? 1 : 0;
        }

        this.renderPetLists();
        this.renderSelectedInfo();
    }

    private ensureView() {
        const layout = createPageBackground(this.node, '繁育', BREED_PAGE_BG);
        const topY = layout.top - 100;

        createPanel(this.node, 'MyPetPanel', layout.left + 72, topY - 165, 118, 350);
        createLabel(this.node, 'MyPetTitleLabel', '我的宠物', layout.left + 72, topY - 18, 90, 24, 14);

        createPanel(this.node, 'FriendPetPanel', layout.left + 205, topY - 165, 118, 350);
        createLabel(this.node, 'FriendPetTitleLabel', '对方宠物', layout.left + 205, topY - 18, 90, 24, 14);

        createPanel(this.node, 'BreedInfoPanel', layout.left + 345, topY - 165, 140, 350);
        createLabel(this.node, 'BreedInfoTitleLabel', '繁育信息', layout.left + 345, topY - 18, 100, 24, 14);
        this.infoLabel = createInfoText(this.node, 'BreedInfoText', '', layout.left + 345, topY - 165, 112, 250, 12);

        createPanel(this.node, 'BreedRulePanel', 0, layout.bottom + 130, layout.pageW - 28, 160);
        createInfoText(
            this.node,
            'BreedRuleLabel',
            '规则：\n1. 宠物性别出生后固定，不能更改。\n2. 每只宠物终生只能结婚一次。\n3. 双方确认后，各获得一个蛋。\n4. 两个蛋的父母相同，但孵化结果各自独立计算。',
            0,
            layout.bottom + 130,
            layout.pageW - 60,
            130,
            12,
        );

        createButton(this.node, 'CreateMarriageButton', '确认结婚', layout.right - 170, layout.bottom + 35, 105, 38, () => {
            void this.createMarriage();
        }, this, false, 13);

        createButton(this.node, 'LayEggButton', '领取蛋', layout.right - 62, layout.bottom + 35, 90, 38, () => {
            void this.layEgg();
        }, this, false, 13);

        createButton(this.node, 'RefreshBreedButton', '刷新', layout.left + 130, layout.bottom + 35, 80, 38, () => {
            void this.refreshBreedPage();
        }, this, false, 13);
    }

    private renderPetLists() {
        clearGenerated(this.node, 'GeneratedBreedMyPet');
        clearGenerated(this.node, 'GeneratedBreedFriendPet');

        const layout = getPageLayout(this.node);
        const topY = layout.top - 100;

        if (!this.pets.length) {
            createLabel(this.node, 'GeneratedBreedMyPetEmpty', '暂无宠物', layout.left + 72, topY - 160, 80, 40, 12);
            return;
        }

        this.pets.slice(0, 6).forEach((pet: any, index: number) => {
            const disabled = pet.married || pet.marriedPetId;
            const text = `${pet.nickname || `宠物${index + 1}`}\n${disabled ? '已婚' : '未婚'}`;

            createButton(this.node, `GeneratedBreedMyPet${index}`, text, layout.left + 72, topY - 58 - index * 47, 88, 36, () => {
                this.selectedMyIndex = index;
                if (this.selectedFriendIndex === index && this.pets.length > 1) this.selectedFriendIndex = index === 0 ? 1 : 0;
                this.renderPetLists();
                this.renderSelectedInfo();
            }, this, index === this.selectedMyIndex, 10);

            createButton(this.node, `GeneratedBreedFriendPet${index}`, text, layout.left + 205, topY - 58 - index * 47, 88, 36, () => {
                this.selectedFriendIndex = index;
                if (this.selectedMyIndex === index && this.pets.length > 1) this.selectedMyIndex = index === 0 ? 1 : 0;
                this.renderPetLists();
                this.renderSelectedInfo();
            }, this, index === this.selectedFriendIndex, 10);
        });
    }

    private renderSelectedInfo() {
        const myPet = this.pets[this.selectedMyIndex];
        const friendPet = this.pets[this.selectedFriendIndex];

        if (!this.infoLabel) return;

        if (!myPet || !friendPet) {
            this.infoLabel.string = '请选择双方宠物';
            return;
        }

        this.infoLabel.string = [
            `我方:${myPet.nickname}`,
            `稀有:${myPet.rarityName || myPet.rarity}`,
            `婚姻:${myPet.married ? '已婚' : '未婚'}`,
            '',
            `对方:${friendPet.nickname}`,
            `稀有:${friendPet.rarityName || friendPet.rarity}`,
            `婚姻:${friendPet.married ? '已婚' : '未婚'}`,
        ].join('\n');
    }

    private async createMarriage() {
        const myPet = this.pets[this.selectedMyIndex];
        const friendPet = this.pets[this.selectedFriendIndex];

        if (!myPet || !friendPet || myPet.id === friendPet.id) return ToastManager.show('请选择两只不同宠物');

        if (myPet.married || friendPet.married || myPet.marriedPetId || friendPet.marriedPetId) {
            return ToastManager.show('已有宠物结婚，不能再次结婚');
        }

        const result = await ApiClient.post('/marriage/create', { petAId: myPet.id, petBId: friendPet.id });
        ToastManager.show(result?.success ? '结婚成功，双方可领取宠物蛋' : `结婚失败:${result?.message || '未知错误'}`);
        await this.refreshBreedPage();
    }

    private async layEgg() {
        const myPet = this.pets[this.selectedMyIndex];
        const result = await ApiClient.post('/marriage/lay-egg', { petId: myPet?.id });
        ToastManager.show(result?.success ? '已获得宠物蛋' : `领取失败:${result?.message || '暂无婚姻'}`);
    }
}
