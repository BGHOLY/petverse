import {
    _decorator,
    Component,
    instantiate,
    Label,
    Node,
    Prefab,
    UITransform,
    isValid,
} from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';
import { InventoryItemSlot } from './InventoryItemSlot';

const { ccclass, property } = _decorator;

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {

    @property(Prefab)
    itemSlotPrefab: Prefab | null = null;

    @property(Node)
    content: Node | null = null;

    private templateSlot: Node | null = null;
    private loading = false;
    private refreshPending = false;

    onLoad() {
        this.resolveReferences();
    }

    onEnable() {
        this.resolveReferences();
        this.node.on('INVENTORY_REFRESH', this.onInventoryRefresh, this);
        void this.loadInventory();
    }

    onDisable() {
        this.node.off('INVENTORY_REFRESH', this.onInventoryRefresh, this);
    }

    private onInventoryRefresh() {
        void this.refreshInventory();
    }

    async loadInventory() {
        if (this.loading) {
            this.refreshPending = true;
            return;
        }

        this.loading = true;

        try {
            this.resolveReferences();

            const res = await NetworkManager.get('/inventory', PlayerData.token);
            const list = this.normalizeList(res);

            this.clearContent();

            if (!this.content) {
                console.warn('InventoryPanel 缺少 Content 节点');
                return;
            }

            if (list.length === 0) {
                this.showEmptyText();
                return;
            }

            for (const item of list) {
                const node = this.createItemNode();

                if (!node) {
                    this.createTextItem(item);
                    continue;
                }

                node.name = 'GeneratedItemSlot';
                node.active = true;

                const slot = node.getComponent(InventoryItemSlot);

                if (slot) {
                    slot.setData(item, () => {
                        void this.refreshInventory();
                    });
                } else {
                    this.fillLabelNode(node, item);
                }

                this.content.addChild(node);
            }
        } catch (error) {
            console.error('加载背包失败', error);
        } finally {
            this.loading = false;

            if (this.refreshPending) {
                this.refreshPending = false;
                void this.loadInventory();
            }
        }
    }

    async refreshInventory() {
        await this.loadInventory();
    }

    private resolveReferences() {
        if (!this.content) {
            this.content =
                this.node.getChildByName('Content') ||
                this.node.getChildByName('InventoryContent') ||
                this.node;
        }

        if (!this.templateSlot) {
            this.templateSlot = this.node.getChildByName('ItemSlot') || null;
        }

        if (this.templateSlot && isValid(this.templateSlot)) {
            this.templateSlot.active = false;
        }
    }

    private normalizeList(res: any): any[] {
        const list =
            res?.items ||
            res?.data ||
            res?.inventory ||
            (Array.isArray(res) ? res : []);

        return Array.isArray(list) ? list : [];
    }

    private clearContent() {
        this.resolveReferences();

        if (!this.content || !isValid(this.content)) {
            return;
        }

        const children = [...this.content.children];

        for (const child of children) {
            if (!child || !isValid(child)) {
                continue;
            }

            if (
                child === this.templateSlot ||
                child.name === 'ItemSlot' ||
                child.name === 'InventoryContentLabel'
            ) {
                continue;
            }

            child.removeFromParent();

            if (isValid(child)) {
                child.destroy();
            }
        }
    }

    private createItemNode(): Node | null {
        if (this.itemSlotPrefab) {
            return instantiate(this.itemSlotPrefab);
        }

        if (this.templateSlot && isValid(this.templateSlot)) {
            return instantiate(this.templateSlot);
        }

        return null;
    }

    private createTextItem(item: any) {
        if (!this.content || !isValid(this.content)) {
            return;
        }

        const node = new Node('GeneratedItemSlot');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(160, 40);

        const label = node.addComponent(Label);
        label.string = this.getItemText(item);
        label.fontSize = 20;
        label.lineHeight = 32;

        this.content.addChild(node);
    }

    private fillLabelNode(node: Node, item: any) {
        const nameLabel =
            node.getChildByName('NameLabel')?.getComponent(Label) ||
            node.getChildByName('ItemCodeLabel')?.getComponent(Label) ||
            null;

        const countLabel =
            node.getChildByName('CountLabel')?.getComponent(Label) ||
            node.getChildByName('QuantityLabel')?.getComponent(Label) ||
            null;

        if (nameLabel) {
            nameLabel.string = String(item?.itemCode || item?.name || 'unknown');
        }

        if (countLabel) {
            countLabel.string = 'x' + String(item?.quantity ?? item?.count ?? 0);
        }
    }

    private showEmptyText() {
        if (!this.content || !isValid(this.content)) {
            return;
        }

        const node = new Node('GeneratedItemSlot');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(200, 40);

        const label = node.addComponent(Label);
        label.string = '背包为空';
        label.fontSize = 22;
        label.lineHeight = 36;

        this.content.addChild(node);
    }

    private getItemText(item: any): string {
        const itemCode = item?.itemCode || item?.name || 'unknown';
        const quantity = item?.quantity ?? item?.count ?? 0;
        return `${itemCode} x${quantity}`;
    }
}