import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { clearGenerated, getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    private statusLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.loadShop();
    }

    async loadShop() {
        this.ensureView();
        const result = await ApiClient.get('/shop/items');
        const list = result?.items || result?.shopItems || result?.data || [];
        console.log('[ShopPanel] items:', list);
        clearGenerated(this.node, 'GeneratedShopItem');

        if (!list.length) {
            this.setStatus('No shop items. Tap Refresh after seed-all.');
            console.log('[ShopPanel] render result: empty');
            return;
        }

        this.setStatus(`Shop items: ${list.length}`);
        list.slice(0, 8).forEach((item: any, index: number) => {
            const y = 275 - index * 72;
            const price = `${item.price ?? 0} ${item.currencyType || 'gold'}`;
            getOrCreateButton(
                this.node,
                `GeneratedShopItem${index}`,
                `${item.name || item.itemCode}  ${price}\n${item.type || '-'}  ${item.description || ''}`,
                0,
                y,
                620,
                64,
                () => {
                    void this.buyItem(item.itemCode);
                },
                this,
            );
        });
        console.log('[ShopPanel] render result:', list.length);
    }

    async buyItem(itemCode: string) {
        const result = await ApiClient.post('/shop/buy', { itemCode });
        console.log('[ShopPanel] buy result:', result);

        if (result?.user) {
            PlayerData.user = {
                ...(PlayerData.user || {}),
                ...result.user,
            };
            UIEventCenter.emit('USER_UPDATED');
        }

        this.setStatus(result?.success ? `Bought ${itemCode}` : `Buy failed: ${result?.message || itemCode}`);
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Shop';
        this.statusLabel = getOrCreateLabel(this.node, 'ShopStatusLabel', -300, 308, 600, 34, 18);
        getOrCreateButton(this.node, 'RefreshShopButton', 'Refresh Shop', 0, -360, 220, 56, () => {
            void this.loadShop();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }
}
