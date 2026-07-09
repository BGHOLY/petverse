import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    BAG_PAGE_BG,
    clearGenerated,
    createButton,
    createGridSlot,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    getPageLayout,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    private petShapeLabel: Label | null = null;
    private petStatsLabel: Label | null = null;

    private pets: any[] = [];
    private items: any[] = [];
    private selectedPetIndex = 0;

    onLoad() { this.ensureView(); }

    async loadInventory() {
        this.ensureView();
        await this.loadPets();
        await this.loadItems();

        this.keepSelectedPetSafe();
        this.renderPetList();
        this.renderSelectedPet();
        this.renderItemGrid();
    }

    private async loadPets() {
        const result = await ApiClient.get('/pet');
        this.pets = normalizeList(result, ['pets']).filter((pet: any) => !pet.isEgg);
        PlayerData.user = { ...(PlayerData.user || {}), pets: this.pets };
    }

    private async loadItems() {
        const result = await ApiClient.get('/inventory');
        this.items = normalizeList(result, ['inventory', 'inventoryItems', 'items', 'data']);
        if (result?.success === false) {
            this.items = [];
            ToastManager.show(`背包加载失败: ${result.message || '未知错误'}`);
        }
    }

    private ensureView() {
        const layout = createPageBackground(this.node, '背包', BAG_PAGE_BG);

        const topY = layout.top - 98;
        createPanel(this.node, 'PetListPanel', layout.left + 65, topY - 124, 110, 260);
        createLabel(this.node, 'PetListTitleLabel', '选择宠物', layout.left + 65, topY - 14, 90, 24, 14);

        createPanel(this.node, 'PetShapePanel', layout.left + 190, topY - 124, 128, 260);
        createLabel(this.node, 'PetShapeTitleLabel', '宠物形态', layout.left + 190, topY - 14, 90, 24, 14);
        this.petShapeLabel = createLabel(this.node, 'PetShapeLabel', '', layout.left + 190, topY - 125, 105, 170, 19);

        createPanel(this.node, 'PetStatsPanel', layout.left + 332, topY - 124, 140, 260);
        createLabel(this.node, 'PetStatsTitleLabel', '宠物属性', layout.left + 332, topY - 14, 90, 24, 14);
        this.petStatsLabel = createInfoText(this.node, 'PetStatsLabel', '', layout.left + 332, topY - 130, 112, 185, 12);

        const gridH = 315;
        createPanel(this.node, 'ItemGridPanel', 0, layout.bottom + 190, layout.pageW - 20, gridH);
        createLabel(this.node, 'ItemGridTitleLabel', '背包道具', 0, layout.bottom + gridH + 22, 120, 26, 16);
    }

    private renderPetList() {
        clearGenerated(this.node, 'GeneratedPetButton');
        const layout = getPageLayout(this.node);
        const topY = layout.top - 98;

        if (!this.pets.length) {
            createLabel(this.node, 'GeneratedPetButtonEmpty', '暂无宠物', layout.left + 65, topY - 125, 80, 40, 12);
            return;
        }

        for (let i = 0; i < Math.min(5, this.pets.length); i++) {
            const pet = this.pets[i];
            createButton(this.node, `GeneratedPetButton${i}`, `${i + 1}.${pet.nickname || '宠物'}`, layout.left + 65, topY - 52 - i * 42, 84, 30, () => {
                this.selectedPetIndex = i;
                this.renderPetList();
                this.renderSelectedPet();
                ToastManager.show(`已选择 ${pet.nickname || '宠物'}`);
            }, this, i === this.selectedPetIndex, 10);
        }
    }

    private renderSelectedPet() {
        const pet = this.getSelectedPet();

        if (!pet) {
            if (this.petShapeLabel) this.petShapeLabel.string = '暂无宠物';
            if (this.petStatsLabel) this.petStatsLabel.string = '-';
            return;
        }

        if (this.petShapeLabel) {
            this.petShapeLabel.string = `${this.getPetEmoji(pet)}\n${pet.nickname || '-'}\nLv.${pet.level ?? 1}\n${pet.rarityName || `稀有${pet.rarity ?? 1}`}`;
        }

        if (this.petStatsLabel) {
            this.petStatsLabel.string = [
                `属性:${pet.species || 'Pet'}`,
                `生命:${pet.hp ?? 0}`,
                `攻击:${pet.attack ?? 0}`,
                `防御:${pet.defense ?? 0}`,
                `速度:${pet.speed ?? pet.agility ?? 0}`,
                `饥饿:${pet.hunger ?? 0}`,
                `快乐:${pet.happiness ?? 0}`,
                `清洁:${pet.cleanliness ?? 0}`,
            ].join('\n');
        }
    }

    private renderItemGrid() {
        clearGenerated(this.node, 'GeneratedItem');
        const layout = getPageLayout(this.node);

        const cols = 5;
        const rows = 3;
        const gridW = layout.pageW - 34;
        const slotW = Math.floor((gridW - 4 * 7) / 5);
        const slotH = 78;
        const gapX = 7;
        const gapY = 12;
        const startX = -gridW / 2 + slotW / 2;
        const startY = layout.bottom + 285;

        for (let i = 0; i < cols * rows; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (slotW + gapX);
            const y = startY - row * (slotH + gapY);

            const item = this.items[i];
            if (!item) {
                createGridSlot(this.node, `GeneratedItemEmptySlot${i}`, x, y, slotW, slotH);
                continue;
            }

            const itemCode = item.itemCode || item.code || item.item?.itemCode || item.id;
            const name = item.name || item.item?.name || itemCode || '道具';
            const quantity = item.quantity ?? item.count ?? 0;
            const type = item.type || item.item?.type || '-';
            const text = `${name}\nx${quantity}\n${type}\n使用`;

            createButton(this.node, `GeneratedItemSlot${i}`, text, x, y, slotW, slotH, () => {
                void this.useItem(itemCode);
            }, this, false, 10);
        }
    }

    async useItem(itemCode: string) {
        const selectedPet = this.getSelectedPet();
        const petId = Number(selectedPet?.id || 0);

        if (!selectedPet) return ToastManager.show('请先选择左侧宠物');
        if (!itemCode) return ToastManager.show('使用失败: 缺少物品编号');

        const result = await ApiClient.post('/inventory/use', { itemCode, quantity: 1, petId });

        if (result?.pet) PlayerData.updatePet(result.pet);

        if (result?.success) {
            ToastManager.show(`已给${selectedPet.nickname || '宠物'}使用${itemCode}`);
        } else {
            ToastManager.show(`使用失败:${result?.message || itemCode}`);
        }

        UIEventCenter.emit('USER_UPDATED');
        await this.loadInventory();
    }

    private getSelectedPet() { return this.pets[this.selectedPetIndex] || this.pets[0] || null; }

    private keepSelectedPetSafe() {
        if (this.selectedPetIndex < 0) this.selectedPetIndex = 0;
        if (this.selectedPetIndex >= this.pets.length) this.selectedPetIndex = Math.max(0, this.pets.length - 1);
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
