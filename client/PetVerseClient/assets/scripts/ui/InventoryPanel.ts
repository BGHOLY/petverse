import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { clearGenerated, createButton, createInfoText, createListButton, createPageTitle, createStatusLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    private statusLabel: Label | null = null;
    private infoLabel: Label | null = null;
    private lastMessage = '';

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
        console.log('[InventoryPanel] response:', result);
        clearGenerated(this.node, 'GeneratedInventoryItem');

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setInfo('\u6682\u65e0\u6570\u636e');
            return;
        }

        this.setStatus(this.lastMessage || `\u80cc\u5305\u7269\u54c1: ${items.length}`);

        if (!items.length) {
            this.setInfo('\u6682\u65e0\u6570\u636e');
            console.log('[InventoryPanel] render result: empty');
            return;
        }

        this.setInfo('');
        items.slice(0, 8).forEach((item: any, index: number) => {
            const text = `${item.name || item.itemCode}  x${item.quantity ?? 0}\n\u7c7b\u578b: ${item.type || '-'}   \u4f7f\u7528`;
            createListButton(this.node, `GeneratedInventoryItem${index}`, text, index, () => {
                void this.useItem(item.itemCode);
            }, this);
        });
        console.log('[InventoryPanel] render result:', items.length);
    }

    async useItem(itemCode: string) {
        const result = await ApiClient.post('/inventory/use', { itemCode });
        console.log('[InventoryPanel] use result:', result);

        if (result?.pet) {
            PlayerData.updatePet(result.pet);
        }

        this.lastMessage = result?.success ? `\u4f7f\u7528\u6210\u529f: ${itemCode}` : `\u4f7f\u7528\u5931\u8d25: ${result?.message || itemCode}`;
        this.setStatus(this.lastMessage);
        UIEventCenter.emit('USER_UPDATED');
        await this.loadInventory();
    }

    private ensureView() {
        createPageTitle(this.node, '\u80cc\u5305');
        this.statusLabel = createStatusLabel(this.node, 'InventoryStatusLabel');
        this.infoLabel = createInfoText(this.node, 'InventoryInfoLabel', '');
        createButton(this.node, 'RefreshInventoryButton', '\u5237\u65b0\u80cc\u5305', 0, -330, 180, 52, () => {
            this.lastMessage = '';
            void this.loadInventory();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setInfo(text: string) {
        if (this.infoLabel) {
            this.infoLabel.string = text;
            this.infoLabel.node.active = Boolean(text);
        }
    }
}
