import { _decorator, Component } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    clearGenerated,
    createButton,
    createLabel,
    createPageBackground,
    createPanel,
    getPageLayout,
    normalizeList,
    SHOP_PAGE_BG,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    private list: any[] = [];
    private selectedTab = '全部';

    onLoad() { this.ensureView(); }

    async loadShop() {
        this.ensureView();

        let result = await ApiClient.get('/item');
        this.list = normalizeList(result, ['shopItems', 'items', 'data']);

        if (!this.list.length) {
            result = await ApiClient.get('/shop/items');
            this.list = normalizeList(result, ['shopItems', 'items', 'data']);
        }

        this.renderTabs();
        this.renderShopGrid();
    }

    private ensureView() {
        const layout = createPageBackground(this.node, '商店', SHOP_PAGE_BG);
        createPanel(this.node, 'ShopTabPanel', 0, layout.top - 95, layout.pageW - 24, 58);
        createPanel(this.node, 'ShopGridPanel', 0, layout.bottom + 310, layout.pageW - 24, 570);
        this.renderTabs();
    }

    private renderTabs() {
        clearGenerated(this.node, 'GeneratedShopTab');
        const layout = getPageLayout(this.node);
        const tabs = ['全部', '食物', '药水', '宠物蛋', '技能书'];
        const tabW = Math.floor((layout.pageW - 50) / 5);
        const startX = -layout.pageW / 2 + 25 + tabW / 2;

        tabs.forEach((tab, index) => {
            createButton(this.node, `GeneratedShopTab${tab}`, tab, startX + index * tabW, layout.top - 95, tabW - 5, 36, () => {
                this.selectedTab = tab;
                this.renderTabs();
                this.renderShopGrid();
            }, this, this.selectedTab === tab, 12);
        });
    }

    private renderShopGrid() {
        clearGenerated(this.node, 'GeneratedShopItem');

        const layout = getPageLayout(this.node);
        let displayList = this.list;

        if (this.selectedTab !== '全部') {
            displayList = this.list.filter((item: any) => {
                const text = `${item.type || ''}${item.name || ''}${item.itemCode || ''}${item.description || ''}`;
                if (this.selectedTab === '食物') return text.includes('food') || text.includes('食');
                if (this.selectedTab === '药水') return text.includes('potion') || text.includes('药') || text.includes('exp');
                if (this.selectedTab === '宠物蛋') return text.includes('egg') || text.includes('蛋');
                if (this.selectedTab === '技能书') return text.includes('skill') || text.includes('技能');
                return true;
            });
        }

        if (!displayList.length) {
            createLabel(this.node, 'GeneratedShopItemEmpty', '当前分类暂无商品', 0, 0, 200, 50, 16);
            return;
        }

        const cols = 3;
        const cardW = Math.floor((layout.pageW - 64) / 3);
        const cardH = 110;
        const gapX = 12;
        const gapY = 18;
        const startX = -layout.pageW / 2 + 26 + cardW / 2;
        const startY = layout.top - 170;

        displayList.slice(0, 12).forEach((item: any, index: number) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardW + gapX);
            const y = startY - row * (cardH + gapY);

            const currency = item.currencyType || item.currency || 'gold';
            const price = item.price !== undefined ? `${item.price}${currency}` : '测试';
            const itemCode = item.itemCode || item.code || item.id;
            const text = `${item.name || item.itemCode || '商品'}\n${price}\n购买`;

            createButton(this.node, `GeneratedShopItem${index}`, text, x, y, cardW, cardH, () => {
                if (itemCode) void this.buyItem(itemCode);
            }, this, false, 11);
        });
    }

    async buyItem(itemCode: string) {
        const result = await ApiClient.post('/shop/buy', { itemCode });

        if (result?.user) {
            PlayerData.user = { ...(PlayerData.user || {}), ...result.user };
            UIEventCenter.emit('USER_UPDATED');
        }

        ToastManager.show(result?.success ? `购买成功:${itemCode}` : `购买失败:${result?.message || itemCode}`);
        await this.loadShop();
    }
}
