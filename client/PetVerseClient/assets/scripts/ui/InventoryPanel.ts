import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    BAG_PAGE_BG,
    clearChildren,
    createButton,
    createGridSlot,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    ensureTransform,
    getOrCreateNode,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

const TXT_BAG = '\u80cc\u5305';
const TXT_SELECT_PET = '\u9009\u62e9\u5ba0\u7269';
const TXT_PET_SHAPE = '\u5ba0\u7269\u5f62\u6001';
const TXT_PET_STATS = '\u5ba0\u7269\u5c5e\u6027';
const TXT_ITEMS = '\u80cc\u5305\u9053\u5177';
const TXT_EMPTY_PET = '\u6682\u65e0\u5ba0\u7269';
const TXT_EMPTY_ITEM = '\u6682\u65e0\u9053\u5177';
const TXT_USE = '\u4f7f\u7528';

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    private petListContent: Node | null = null;
    private petShapeContent: Node | null = null;
    private petStatsContent: Node | null = null;
    private itemGridContent: Node | null = null;
    private petShapeLabel: Label | null = null;
    private petStatsLabel: Label | null = null;

    private pets: any[] = [];
    private items: any[] = [];
    private selectedPetIndex = 0;
    private selectedPetId: string | number | null = null;

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
            ToastManager.show(`\u80cc\u5305\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
        }
    }

    private ensureView() {
        createPageBackground(this.node, TXT_BAG, BAG_PAGE_BG);

        const listPanel = createPanel(this.node, 'PetListPanel', -230, 280, 180, 360);
        createLabel(listPanel, 'PetListTitleLabel', TXT_SELECT_PET, 0, 150, 150, 28, 14);
        this.petListContent = this.ensureContent(listPanel, 'PetListContent', 0, -18, 170, 290);

        const shapePanel = createPanel(this.node, 'PetShapePanel', 0, 280, 240, 360);
        createLabel(shapePanel, 'PetShapeTitleLabel', TXT_PET_SHAPE, 0, 150, 180, 28, 14);
        this.petShapeContent = this.ensureContent(shapePanel, 'PetShapeContent', 0, -18, 220, 290);
        this.petShapeLabel = createLabel(this.petShapeContent, 'PetShapeLabel', '', 0, 0, 200, 250, 21);

        const statsPanel = createPanel(this.node, 'PetStatsPanel', 230, 280, 180, 360);
        createLabel(statsPanel, 'PetStatsTitleLabel', TXT_PET_STATS, 0, 150, 150, 28, 14);
        this.petStatsContent = this.ensureContent(statsPanel, 'PetStatsContent', 0, -18, 165, 290);
        this.petStatsLabel = createInfoText(this.petStatsContent, 'PetStatsLabel', '', -78, 132, 156, 265, 12);

        const gridPanel = createPanel(this.node, 'ItemGridPanel', 0, -210, 660, 520);
        createLabel(gridPanel, 'ItemGridTitleLabel', TXT_ITEMS, 0, 232, 200, 32, 16);
        this.itemGridContent = this.ensureContent(gridPanel, 'ItemGridContent', 0, -10, 640, 460);
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
            createLabel(this.petListContent, 'PetListEmpty', TXT_EMPTY_PET, 0, 0, 140, 45, 12);
            return;
        }

        for (let i = 0; i < Math.min(6, this.pets.length); i++) {
            const pet = this.pets[i];
            createButton(this.petListContent, `PetButton${i}`, `${i + 1}.${pet.nickname || '\u5ba0\u7269'}`, 0, 118 - i * 42, 148, 32, () => {
                this.selectedPetIndex = i;
                this.selectedPetId = pet.id;
                this.renderPetList();
                this.renderSelectedPet();
                ToastManager.show(`\u5df2\u9009\u62e9 ${pet.nickname || '\u5ba0\u7269'}`);
            }, this, i === this.selectedPetIndex, 10);
        }
    }

    private renderSelectedPet() {
        const pet = this.getSelectedPet();

        if (!pet) {
            if (this.petShapeLabel) this.petShapeLabel.string = TXT_EMPTY_PET;
            if (this.petStatsLabel) this.petStatsLabel.string = '-';
            return;
        }

        this.selectedPetId = pet.id;

        if (this.petShapeLabel) {
            this.petShapeLabel.string = [
                this.getSpeciesText(pet),
                pet.nickname || '-',
                `Lv.${pet.level ?? 1}`,
                this.getRarityText(pet),
            ].join('\n');
        }

        if (this.petStatsLabel) {
            this.petStatsLabel.string = [
                `\u7269\u79cd:${pet.species || 'Pet'}`,
                `\u7b49\u7ea7:${pet.level ?? 1}`,
                `\u751f\u547d:${pet.hp ?? 0}`,
                `\u653b\u51fb:${pet.attack ?? 0}`,
                `\u9632\u5fa1:${pet.defense ?? 0}`,
                `\u901f\u5ea6:${pet.speed ?? pet.agility ?? 0}`,
                `\u9965\u997f:${pet.hunger ?? 0}`,
                `\u5feb\u4e50:${pet.happiness ?? 0}`,
                `\u6e05\u6d01:${pet.cleanliness ?? 0}`,
            ].join('\n');
        }
    }

    private renderItemGrid() {
        if (!this.itemGridContent) return;

        clearChildren(this.itemGridContent);

        const cols = 5;
        const rows = 3;
        const slotW = 116;
        const slotH = 118;
        const gapX = 12;
        const gapY = 22;
        const startX = -256;
        const startY = 150;

        if (!this.items.length) {
            createLabel(this.itemGridContent, 'ItemGridEmpty', TXT_EMPTY_ITEM, 0, 0, 250, 50, 16);
        }

        for (let i = 0; i < cols * rows; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (slotW + gapX);
            const y = startY - row * (slotH + gapY);

            const item = this.items[i];
            if (!item) {
                createGridSlot(this.itemGridContent, `ItemEmptySlot${i}`, x, y, slotW, slotH);
                continue;
            }

            const itemCode = item.itemCode || item.code || item.item?.itemCode || item.id;
            const name = item.name || item.item?.name || itemCode || '\u9053\u5177';
            const quantity = item.quantity ?? item.count ?? 0;
            const type = item.type || item.item?.type || '-';
            const text = `${name}\nx${quantity}\n${type}\n${TXT_USE}`;

            createButton(this.itemGridContent, `ItemSlot${i}`, text, x, y, slotW, slotH, () => {
                void this.useItem(itemCode, name);
            }, this, false, 12);
        }
    }

    async useItem(itemCode: string, itemName?: string) {
        const selectedPet = this.getSelectedPet();
        const petId = Number(selectedPet?.id || 0);

        if (!selectedPet) return ToastManager.show('\u8bf7\u5148\u9009\u62e9\u5ba0\u7269');
        if (!itemCode) return ToastManager.show('\u4f7f\u7528\u5931\u8d25\uff1a\u7f3a\u5c11\u7269\u54c1\u7f16\u53f7');

        this.selectedPetId = selectedPet.id;

        const result = await ApiClient.post('/inventory/use', { itemCode, quantity: 1, petId });

        if (result?.pet) PlayerData.updatePet(result.pet);

        if (result?.success) {
            ToastManager.show(`\u5df2\u7ed9 ${selectedPet.nickname || '\u5ba0\u7269'} \u4f7f\u7528 ${itemName || itemCode}`);
        } else {
            ToastManager.show(`\u4f7f\u7528\u5931\u8d25\uff1a${result?.message || itemCode}`);
        }

        UIEventCenter.emit('USER_UPDATED');
        await this.loadInventory();

        if (this.node.parent) this.node.parent.active = true;
        this.node.active = true;
    }

    private getSelectedPet() { return this.pets[this.selectedPetIndex] || this.pets[0] || null; }

    private keepSelectedPetSafe() {
        if (this.selectedPetId !== null && this.selectedPetId !== undefined) {
            const index = this.pets.findIndex((pet: any) => String(pet.id) === String(this.selectedPetId));
            if (index >= 0) {
                this.selectedPetIndex = index;
                return;
            }
        }

        if (this.selectedPetIndex < 0) this.selectedPetIndex = 0;
        if (this.selectedPetIndex >= this.pets.length) this.selectedPetIndex = Math.max(0, this.pets.length - 1);
        this.selectedPetId = this.pets[this.selectedPetIndex]?.id ?? null;
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
