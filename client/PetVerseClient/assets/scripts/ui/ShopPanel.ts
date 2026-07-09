import { _decorator, Component, Node, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    clearChildren,
    createButton,
    createLabel,
    createPageBackground,
    createPanel,
    ensureTransform,
    getOrCreateNode,
    normalizeList,
    SHOP_PAGE_BG,
} from './UiKit';

const { ccclass } = _decorator;

type ShopCategory = {
    key: string;
    label: string;
};

const TXT_SHOP = '\u5546\u5e97';
const TXT_EMPTY_CATEGORY = '\u5f53\u524d\u5206\u7c7b\u6682\u65e0\u5546\u54c1';
const TXT_BUY = '\u8d2d\u4e70';

const CATEGORIES: ShopCategory[] = [
    { key: 'all', label: '\u5168\u90e8' },
    { key: 'food', label: '\u98df\u7269' },
    { key: 'potion', label: '\u836f\u6c34' },
    { key: 'egg', label: '\u5ba0\u7269\u86cb' },
    { key: 'skillbook', label: '\u6280\u80fd\u4e66' },
];

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    private tabPanel: Node | null = null;
    private gridContent: Node | null = null;
    private list: any[] = [];
    private selectedCategory = 'all';

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
        createPageBackground(this.node, TXT_SHOP, SHOP_PAGE_BG);

        this.tabPanel = createPanel(this.node, 'ShopTabPanel', 0, 500, 660, 80);
        this.gridContent = this.ensureGridContent();
        this.renderTabs();
    }

    private ensureGridContent() {
        const gridPanel = createPanel(this.node, 'ShopGridPanel', 0, 50, 660, 760);
        const content = getOrCreateNode(gridPanel, 'ShopGridContent');
        content.setPosition(new Vec3(0, 0, 0));
        ensureTransform(content, 640, 720);
        return content;
    }

    private renderTabs() {
        if (!this.tabPanel) return;

        const tabW = 118;
        const xs = [-264, -132, 0, 132, 264];

        CATEGORIES.forEach((category, index) => {
            createButton(
                this.tabPanel!,
                this.getTabNodeName(category.key),
                category.label,
                xs[index],
                0,
                tabW,
                46,
                () => this.selectCategory(category.key),
                this,
                this.selectedCategory === category.key,
                14,
            );
        });
    }

    private selectCategory(categoryKey: string) {
        this.selectedCategory = categoryKey;
        this.renderTabs();
        this.renderShopGrid();
    }

    private renderShopGrid() {
        if (!this.gridContent) return;

        clearChildren(this.gridContent);

        const displayList = this.getFilteredItems();

        if (!displayList.length) {
            createLabel(this.gridContent, 'ShopGridEmpty', TXT_EMPTY_CATEGORY, 0, 0, 360, 60, 18);
            return;
        }

        const cols = 3;
        const cardW = 194;
        const cardH = 132;
        const gapX = 20;
        const gapY = 22;
        const startX = -214;
        const startY = 280;

        displayList.slice(0, 15).forEach((item: any, index: number) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardW + gapX);
            const y = startY - row * (cardH + gapY);

            const currency = item.currencyType || item.currency || (item.diamondPrice ? 'diamond' : 'gold');
            const priceValue = item.price ?? item.goldPrice ?? item.diamondPrice ?? 0;
            const price = priceValue ? `${priceValue} ${this.getCurrencyText(currency)}` : '\u6d4b\u8bd5';
            const itemCode = item.itemCode || item.code || item.id;
            const name = item.name || item.itemCode || '\u5546\u54c1';
            const type = item.type || item.itemType || '-';
            const text = `${name}\n${type}\n${price}\n${TXT_BUY}`;

            createButton(this.gridContent!, `ShopItem${index}`, text, x, y, cardW, cardH, () => {
                if (itemCode) void this.buyItem(itemCode, name);
            }, this, false, 12);
        });
    }

    async buyItem(itemCode: string, itemName?: string) {
        const result = await ApiClient.post('/shop/buy', { itemCode });

        if (result?.user) {
            PlayerData.user = { ...(PlayerData.user || {}), ...result.user };
            UIEventCenter.emit('USER_UPDATED');
        }

        ToastManager.show(result?.success
            ? `\u8d2d\u4e70\u6210\u529f:${itemName || itemCode}`
            : `\u8d2d\u4e70\u5931\u8d25:${result?.message || itemCode}`);

        await this.loadShop();
    }

    private getFilteredItems() {
        if (this.selectedCategory === 'all') return this.list;

        return this.list.filter((item: any) => {
            const text = `${item.type || ''} ${item.itemType || ''} ${item.name || ''} ${item.itemCode || ''} ${item.description || ''}`.toLowerCase();

            if (this.selectedCategory === 'food') {
                return text.includes('food') || text.includes('\u98df') || text.includes('\u82f9\u679c') || text.includes('\u9c7c');
            }
            if (this.selectedCategory === 'potion') {
                return text.includes('potion') || text.includes('exp') || text.includes('\u836f') || text.includes('\u7ecf\u9a8c');
            }
            if (this.selectedCategory === 'egg') {
                return text.includes('egg') || text.includes('\u86cb');
            }
            if (this.selectedCategory === 'skillbook') {
                return text.includes('skill') || text.includes('book') || text.includes('\u6280\u80fd\u4e66');
            }

            return true;
        });
    }

    private getTabNodeName(key: string) {
        const nameMap: Record<string, string> = {
            all: 'AllTabButton',
            food: 'FoodTabButton',
            potion: 'PotionTabButton',
            egg: 'EggTabButton',
            skillbook: 'SkillBookTabButton',
        };
        return nameMap[key] || `TabButton${key}`;
    }

    private getCurrencyText(currency: string) {
        const value = String(currency || '').toLowerCase();
        if (value.includes('diamond')) return '\u94bb\u77f3';
        return '\u91d1\u5e01';
    }
}
