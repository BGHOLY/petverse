import { _decorator, Component, instantiate, Label, Node, Prefab, UITransform } from 'cc';
import NetworkManager from '../network/NetworkManager';

const { ccclass, property } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {

    @property(Node)
    content: Node | null = null;

    @property(Prefab)
    itemPrefab: Prefab | null = null;

    private templateSlot: Node | null = null;
    private loading = false;

    onLoad() {
        this.resolveReferences();
    }

    onEnable() {
        this.resolveReferences();
        void this.loadShop();
    }

    async loadShop() {
        if (this.loading) {
            return;
        }

        this.loading = true;

        try {
            this.resolveReferences();

            const res = await NetworkManager.get('/shop/items');
            const list = this.normalizeList(res);

            this.clearContent();

            if (!this.content) {
                console.warn('ShopPanel 缺少 Content 节点');
                return;
            }

            if (list.length === 0) {
                this.showEmptyText();
                return;
            }

            for (const item of list) {
                const node = this.createItemNode();

                if (node) {
                    node.name = 'GeneratedShopItem';
                    node.active = true;
                    this.fillShopItem(node, item);
                    this.content.addChild(node);
                } else {
                    this.createTextItem(item);
                }
            }
        } catch (error) {
            console.error('加载商店失败', error);
        } finally {
            this.loading = false;
        }
    }

    refreshShop() {
        void this.loadShop();
    }

    private resolveReferences() {
        if (!this.content) {
            this.content =
                this.node.getChildByName('Content') ||
                this.node.getChildByName('ShopContent') ||
                this.node;
        }

        if (!this.templateSlot) {
            this.templateSlot =
                this.node.getChildByName('ItemSlot') ||
                this.node.parent?.getChildByName('ItemSlot') ||
                null;
        }

        if (this.templateSlot) {
            this.templateSlot.active = false;
        }
    }

    private normalizeList(res: any): any[] {
        const list =
            res?.items ||
            res?.data ||
            res?.shopItems ||
            (Array.isArray(res) ? res : []);

        return Array.isArray(list) ? list : [];
    }

    private clearContent() {
        this.resolveReferences();

        if (!this.content) {
            return;
        }

        for (const child of [...this.content.children]) {
            if (
                child === this.templateSlot ||
                child.name === 'ItemSlot' ||
                child.name === 'ShopContentLabel'
            ) {
                continue;
            }

            child.destroy();
        }
    }

    private createItemNode(): Node | null {
        if (this.itemPrefab) {
            return instantiate(this.itemPrefab);
        }

        if (this.templateSlot) {
            return instantiate(this.templateSlot);
        }

        return null;
    }

    private fillShopItem(node: Node, item: any) {
        const nameLabel =
            node.getChildByName('NameLabel')?.getComponent(Label) ||
            node.getChildByName('ItemCodeLabel')?.getComponent(Label) ||
            null;

        const countLabel =
            node.getChildByName('CountLabel')?.getComponent(Label) ||
            node.getChildByName('PriceLabel')?.getComponent(Label) ||
            node.getChildByName('QuantityLabel')?.getComponent(Label) ||
            null;

        if (nameLabel) {
            nameLabel.string = String(item?.name || item?.itemCode || 'unknown');
        }

        if (countLabel) {
            countLabel.string = String(item?.price ?? 0) + '金币';
        }
    }

    private createTextItem(item: any) {
        if (!this.content) {
            return;
        }

        const node = new Node('GeneratedShopItem');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(240, 40);

        const label = node.addComponent(Label);
        label.string = `${item?.name || item?.itemCode || 'unknown'}：${item?.price ?? 0}金币`;
        label.fontSize = 20;
        label.lineHeight = 32;

        this.content.addChild(node);
    }

    private showEmptyText() {
        if (!this.content) {
            return;
        }

        const node = new Node('GeneratedShopItem');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(200, 40);

        const label = node.addComponent(Label);
        label.string = '暂无商品';
        label.fontSize = 22;
        label.lineHeight = 36;

        this.content.addChild(node);
    }
}