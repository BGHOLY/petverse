import {
    _decorator,
    Button,
    Component,
    find,
    Label,
    Node,
    UITransform,
} from 'cc';
import PlayerData from '../data/PlayerData';
import { MainUI } from './MainUI';

const { ccclass, property } = _decorator;

type ShopItem = {
    itemCode?: string;
    code?: string;
    name?: string;
    price?: number;
    goldPrice?: number;
};

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    @property(Node)
    content: Node | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    @property(MainUI)
    mainUI: MainUI | null = null;

    private readonly baseUrl = 'http://127.0.0.1:3000/api';

    onEnable() {
        this.loadShopItems();
    }

    async loadShopItems() {
        try {
            const result = await this.apiGet('/shop/items');
            const items = this.normalizeShopItems(result);

            this.clearContent();

            if (!items.length) {
                this.setEmptyVisible(true);
                return;
            }

            this.setEmptyVisible(false);

            for (const item of items) {
                this.createShopSlot(item);
            }
        } catch (error) {
            console.error('加载商店失败:', error);
            this.setEmptyVisible(true);
        }
    }

    private normalizeShopItems(result: any): ShopItem[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.items)) {
            return result.items;
        }

        if (Array.isArray(result?.shopItems)) {
            return result.shopItems;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        return [];
    }

    private getContent(): Node {
        if (this.content) {
            return this.content;
        }

        const found = find('Content', this.node);
        if (found) {
            this.content = found;
            return found;
        }

        return this.node;
    }

    private clearContent() {
        const content = this.getContent();

        for (const child of [...content.children]) {
            child.destroy();
        }
    }

    private createShopSlot(item: ShopItem) {
        const content = this.getContent();

        const itemCode = item.itemCode || item.code || 'unknown';
        const itemName = item.name || itemCode;
        const price = item.price ?? item.goldPrice ?? 0;

        const slot = new Node('ShopItemSlot');
        const transform = slot.addComponent(UITransform);
        transform.setContentSize(200, 100);

        const button = slot.addComponent(Button);
        button.transition = Button.Transition.NONE;

        const labelNode = new Node('Label');
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(200, 100);

        const label = labelNode.addComponent(Label);
        label.string = `${itemName}\n价格：${price}金币\n点击购买`;
        label.fontSize = 22;
        label.lineHeight = 30;

        slot.addChild(labelNode);
        content.addChild(slot);

        button.node.on(Button.EventType.CLICK, () => {
            this.buyItem(itemCode);
        });
    }

    private async buyItem(itemCode: string) {
        try {
            const result = await this.apiPost('/shop/buy', {
                itemCode,
            });

            console.log('购买成功:', itemCode, result);

            if (result?.user) {
                PlayerData.user = result.user;
            }

            if (typeof result?.gold === 'number' && PlayerData.user) {
                PlayerData.user.gold = result.gold;
            }

            this.mainUI?.refreshUI();

            await this.loadShopItems();
        } catch (error) {
            console.error('购买失败:', error);
        }
    }

    private setEmptyVisible(visible: boolean) {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = visible;
            return;
        }

        const found = find('EmptyLabel', this.node);
        if (found) {
            found.active = visible;
        }
    }

    private async apiGet(path: string) {
        const response = await fetch(this.baseUrl + path, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        return this.parseResponse(response);
    }

    private async apiPost(path: string, body: any) {
        const response = await fetch(this.baseUrl + path, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.parseResponse(response);
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (PlayerData.token) {
            headers.Authorization = `Bearer ${PlayerData.token}`;
        }

        return headers;
    }

    private async parseResponse(response: Response) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw data || new Error(`HTTP ${response.status}`);
        }

        return data;
    }
}