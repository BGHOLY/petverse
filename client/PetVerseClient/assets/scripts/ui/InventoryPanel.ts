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

const { ccclass, property } = _decorator;

type InventoryItem = {
    itemCode?: string;
    code?: string;
    name?: string;
    quantity?: number;
    count?: number;
};

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    @property(Node)
    content: Node | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    private readonly baseUrl = 'http://127.0.0.1:3000/api';

    onEnable() {
        this.loadInventory();
    }

    async loadInventory() {
        try {
            const result = await this.apiGet('/inventory');
            const items = this.normalizeInventory(result);

            this.clearContent();

            if (!items.length) {
                this.setEmptyVisible(true);
                return;
            }

            this.setEmptyVisible(false);

            for (const item of items) {
                this.createItemSlot(item);
            }
        } catch (error) {
            console.error('加载背包失败:', error);
            this.setEmptyVisible(true);
        }
    }

    private normalizeInventory(result: any): InventoryItem[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.inventory)) {
            return result.inventory;
        }

        if (Array.isArray(result?.items)) {
            return result.items;
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

    private createItemSlot(item: InventoryItem) {
        const content = this.getContent();

        const itemCode = item.itemCode || item.code || 'unknown';
        const itemName = item.name || itemCode;
        const quantity = item.quantity ?? item.count ?? 0;

        const slot = new Node('InventoryItemSlot');
        const transform = slot.addComponent(UITransform);
        transform.setContentSize(180, 90);

        const button = slot.addComponent(Button);
        button.transition = Button.Transition.NONE;

        const labelNode = new Node('Label');
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(180, 90);

        const label = labelNode.addComponent(Label);
        label.string = `${itemName}\n数量：${quantity}`;
        label.fontSize = 22;
        label.lineHeight = 30;

        slot.addChild(labelNode);
        content.addChild(slot);

        button.node.on(Button.EventType.CLICK, () => {
            this.useItem(itemCode);
        });
    }

    private async useItem(itemCode: string) {
        try {
            const result = await this.apiPost('/inventory/use', {
                itemCode,
            });

            console.log('使用道具成功:', itemCode, result);

            if (result?.pet) {
                PlayerData.updatePet(result.pet);
            }

            await this.loadInventory();
        } catch (error) {
            console.error('使用道具失败:', error);
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
