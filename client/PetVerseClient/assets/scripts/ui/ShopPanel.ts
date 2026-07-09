import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { clearGenerated, createButton, createInfoText, createListButton, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    private statusLabel: Label | null = null;
    private infoLabel: Label | null = null;
    private lastMessage = '';

    onLoad() {
        this.ensureView();
    }

    async loadShop() {
        this.ensureView();
        clearGenerated(this.node, 'GeneratedShopItem');
        this.setStatus('加载商品中...');
        this.setInfo('加载中...');

        let result = await ApiClient.get('/item');
        let list = normalizeList(result, ['items', 'shopItems']);

        if (!list.length || result?.success === false) {
            console.log('[ShopPanel] /item empty, fallback to /shop/items:', result);
            result = await ApiClient.get('/shop/items');
            list = normalizeList(result, ['items', 'shopItems']);
        }

        console.log('[ShopPanel] response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setInfo('\u6682\u65e0\u6570\u636e');
            return;
        }

        this.setStatus(this.lastMessage || `\u5546\u54c1\u6570\u91cf: ${list.length}`);

        if (!list.length) {
            this.setInfo('\u6682\u65e0\u6570\u636e');
            console.log('[ShopPanel] render result: empty');
            return;
        }

        this.setInfo('');
        list.slice(0, 8).forEach((item: any, index: number) => {
            const itemCode = item.itemCode || item.code || item.id;
            const name = item.name || item.itemName || itemCode || '-';
            const currency = item.currencyType || item.currency || (item.diamondPrice !== undefined ? 'diamond' : 'gold');
            const rawPrice = item.price ?? item.goldPrice ?? item.diamondPrice;
            const price = rawPrice !== undefined ? `${rawPrice} ${currency}` : '\u6d4b\u8bd5\u5546\u54c1';
            const text = `${name}  ${price}\n\u7c7b\u578b: ${item.type || '-'}   ${item.description || ''}`;
            createListButton(this.node, `GeneratedShopItem${index}`, text, index, () => {
                void this.buyItem(itemCode);
            }, this);
        });
        console.log('[ShopPanel] render result:', list.length);
    }

    async buyItem(itemCode: string) {
        if (!itemCode) {
            this.lastMessage = '购买失败: 缺少商品编号';
            this.setStatus(this.lastMessage);
            return;
        }

        const result = await ApiClient.post('/shop/buy', { itemCode });
        console.log('[ShopPanel] buy result:', result);

        if (result?.user) {
            PlayerData.user = {
                ...(PlayerData.user || {}),
                ...result.user,
            };
        }

        this.lastMessage = result?.success ? `\u8d2d\u4e70\u6210\u529f: ${itemCode}` : `\u8d2d\u4e70\u5931\u8d25: ${result?.message || itemCode}`;
        this.setStatus(this.lastMessage);
        UIEventCenter.emit('USER_UPDATED');
    }

    private ensureView() {
        createPageTitle(this.node, '\u5546\u5e97');
        this.statusLabel = createStatusLabel(this.node, 'ShopStatusLabel');
        this.infoLabel = createInfoText(this.node, 'ShopInfoLabel', '');
        createButton(this.node, 'RefreshShopButton', '\u5237\u65b0\u5546\u5e97', 0, -330, 180, 52, () => {
            this.lastMessage = '';
            void this.loadShop();
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
