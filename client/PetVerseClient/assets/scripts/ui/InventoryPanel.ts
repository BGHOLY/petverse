import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { clearGenerated, getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    private statusLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.loadInventory();
    }

    async loadInventory() {
        this.ensureView();
        const result = await ApiClient.get('/inventory');
        const items = result?.inventory || result?.items || result?.data || [];
        console.log('[InventoryPanel] items:', items);
        clearGenerated(this.node, 'GeneratedInventoryItem');

        if (!items.length) {
            this.setStatus('Inventory is empty.');
            console.log('[InventoryPanel] render result: empty');
            return;
        }

        this.setStatus(`Inventory items: ${items.length}`);
        items.slice(0, 8).forEach((item: any, index: number) => {
            const y = 275 - index * 72;
            getOrCreateButton(
                this.node,
                `GeneratedInventoryItem${index}`,
                `${item.name || item.itemCode}  x${item.quantity ?? 0}\n${item.type || '-'}  Use`,
                0,
                y,
                620,
                64,
                () => {
                    void this.useItem(item.itemCode);
                },
                this,
            );
        });
        console.log('[InventoryPanel] render result:', items.length);
    }

    async useItem(itemCode: string) {
        const result = await ApiClient.post('/inventory/use', { itemCode });
        console.log('[InventoryPanel] use result:', result);

        if (result?.pet) {
            PlayerData.updatePet(result.pet);
        }

        this.setStatus(result?.success ? `Used ${itemCode}` : `Use failed: ${result?.message || itemCode}`);
        UIEventCenter.emit('USER_UPDATED');
        await this.loadInventory();
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Inventory';
        this.statusLabel = getOrCreateLabel(this.node, 'InventoryStatusLabel', -300, 308, 600, 34, 18);
        getOrCreateButton(this.node, 'RefreshInventoryButton', 'Refresh Bag', 0, -360, 220, 56, () => {
            void this.loadInventory();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }
}
