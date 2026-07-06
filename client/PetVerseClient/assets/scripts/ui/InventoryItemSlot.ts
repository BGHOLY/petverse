import { _decorator, Button, Component, Label, Node, isValid } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('InventoryItemSlot')
export class InventoryItemSlot extends Component {

    @property(Label)
    itemCodeLabel: Label | null = null;

    @property(Label)
    quantityLabel: Label | null = null;

    @property(Button)
    useButton: Button | null = null;

    private itemData: any = null;
    private refreshCallback: (() => void) | null = null;
    private isUsing = false;
    private buttonNode: Node | null = null;

    onLoad() {
        this.autoBindNodes();

        this.buttonNode = this.useButton?.node || this.node.getChildByName('Button') || null;

        if (this.buttonNode && isValid(this.buttonNode)) {
            this.buttonNode.off(Button.EventType.CLICK, this.onUse, this);
            this.buttonNode.on(Button.EventType.CLICK, this.onUse, this);
        }
    }

    onDestroy() {
        if (this.buttonNode && isValid(this.buttonNode)) {
            this.buttonNode.off(Button.EventType.CLICK, this.onUse, this);
        }

        this.buttonNode = null;
        this.useButton = null;
        this.itemCodeLabel = null;
        this.quantityLabel = null;
        this.itemData = null;
        this.refreshCallback = null;
    }

    setData(item: any, refreshCallback?: () => void) {
        this.itemData = item;
        this.refreshCallback = refreshCallback || null;
        this.updateView();
    }

    init(item: any, refreshCallback?: () => void) {
        this.setData(item, refreshCallback);
    }

    private autoBindNodes() {
        if (!this.itemCodeLabel) {
            this.itemCodeLabel =
                this.node.getChildByName('NameLabel')?.getComponent(Label) ||
                this.node.getChildByName('ItemCodeLabel')?.getComponent(Label) ||
                null;
        }

        if (!this.quantityLabel) {
            this.quantityLabel =
                this.node.getChildByName('CountLabel')?.getComponent(Label) ||
                this.node.getChildByName('QuantityLabel')?.getComponent(Label) ||
                null;
        }

        if (!this.useButton) {
            this.useButton =
                this.node.getComponent(Button) ||
                this.node.getChildByName('Button')?.getComponent(Button) ||
                null;
        }
    }

    private updateView() {
        this.autoBindNodes();

        const itemCode =
            this.itemData?.itemCode ||
            this.itemData?.code ||
            this.itemData?.name ||
            'unknown';

        const quantity =
            this.itemData?.quantity ??
            this.itemData?.count ??
            0;

        if (this.itemCodeLabel) {
            this.itemCodeLabel.string = String(itemCode);
        }

        if (this.quantityLabel) {
            this.quantityLabel.string = 'x' + String(quantity);
        }
    }

    private getItemCode(): string {
        return String(
            this.itemData?.itemCode ||
            this.itemData?.code ||
            '',
        );
    }

    async onUse() {
        if (this.isUsing) {
            return;
        }

        const itemCode = this.getItemCode();

        if (!itemCode) {
            console.warn('道具缺少 itemCode', this.itemData);
            return;
        }

        this.isUsing = true;

        try {
            const res = await NetworkManager.post(
                '/inventory/use',
                { itemCode },
                PlayerData.token,
            );

            if (res?.success === false) {
                console.warn(res?.message || '使用道具失败');
                return;
            }

            console.log('使用道具成功:', itemCode);

            if (this.refreshCallback) {
                this.refreshCallback();
            } else {
                this.notifyParentRefresh();
            }
        } catch (error) {
            console.error('使用道具失败', error);
        } finally {
            this.isUsing = false;
        }
    }

    private notifyParentRefresh() {
        let node: Node | null = this.node?.parent || null;

        while (node) {
            node.emit('INVENTORY_REFRESH');
            node = node.parent;
        }
    }
}