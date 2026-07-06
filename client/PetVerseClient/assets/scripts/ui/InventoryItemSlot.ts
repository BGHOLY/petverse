import { _decorator, Button, Component, Label, Node, isValid } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';

const { ccclass, property } = _decorator;

type SlotMode = 'inventory' | 'shop';

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
    private mode: SlotMode = 'inventory';
    private isWorking = false;
    private buttonNode: Node | null = null;

    onLoad() {
        this.autoBindNodes();
        this.buttonNode = this.useButton?.node || this.node.getChildByName('Button') || this.node;

        if (this.buttonNode && isValid(this.buttonNode)) {
            this.buttonNode.off(Button.EventType.CLICK, this.onClick, this);
            this.buttonNode.on(Button.EventType.CLICK, this.onClick, this);
        }
    }

    onDestroy() {
        if (this.buttonNode && isValid(this.buttonNode)) {
            this.buttonNode.off(Button.EventType.CLICK, this.onClick, this);
        }

        this.buttonNode = null;
        this.useButton = null;
        this.itemCodeLabel = null;
        this.quantityLabel = null;
        this.itemData = null;
        this.refreshCallback = null;
    }

    setData(item: any, refreshCallback?: () => void) {
        this.mode = 'inventory';
        this.itemData = item;
        this.refreshCallback = refreshCallback || null;
        this.updateInventoryView();
    }

    init(item: any, refreshCallback?: () => void) {
        this.setData(item, refreshCallback);
    }

    setShopData(item: any, refreshCallback?: () => void) {
        this.mode = 'shop';
        this.itemData = item;
        this.refreshCallback = refreshCallback || null;
        this.updateShopView();
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
                this.node.getChildByName('PriceLabel')?.getComponent(Label) ||
                null;
        }

        if (!this.useButton) {
            this.useButton =
                this.node.getComponent(Button) ||
                this.node.getChildByName('Button')?.getComponent(Button) ||
                null;
        }
    }

    private updateInventoryView() {
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

    private updateShopView() {
        this.autoBindNodes();

        const name =
            this.itemData?.name ||
            this.itemData?.itemCode ||
            'unknown';

        const price =
            this.itemData?.price ??
            0;

        if (this.itemCodeLabel) {
            this.itemCodeLabel.string = String(name);
        }

        if (this.quantityLabel) {
            this.quantityLabel.string = String(price) + '金币';
        }
    }

    private getItemCode(): string {
        return String(
            this.itemData?.itemCode ||
            this.itemData?.code ||
            '',
        );
    }

    private async onClick() {
        if (this.mode === 'shop') {
            await this.buyItem();
            return;
        }

        await this.useItem();
    }

    private async useItem() {
        if (this.isWorking) {
            return;
        }

        const itemCode = this.getItemCode();

        if (!itemCode) {
            console.warn('道具缺少 itemCode', this.itemData);
            return;
        }

        this.isWorking = true;

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
            this.refreshCallback?.();
            UIEventCenter.emit('INVENTORY_REFRESH');
        } catch (error) {
            console.error('使用道具失败', error);
        } finally {
            this.isWorking = false;
        }
    }

    private async buyItem() {
        if (this.isWorking) {
            return;
        }

        const itemCode = this.getItemCode();

        if (!itemCode) {
            console.warn('商品缺少 itemCode', this.itemData);
            return;
        }

        this.isWorking = true;

        try {
            const res = await NetworkManager.post(
                '/shop/buy',
                { itemCode },
                PlayerData.token,
            );

            if (res?.success === false) {
                console.warn(res?.message || '购买失败');
                return;
            }

            if (res?.user) {
                PlayerData.user = {
                    ...(PlayerData.user || {}),
                    ...res.user,
                };
            }

            console.log('购买成功:', itemCode);
            this.refreshCallback?.();
            UIEventCenter.emit('USER_UPDATED');
            UIEventCenter.emit('INVENTORY_REFRESH');
            UIEventCenter.emit('SHOP_UPDATED');
        } catch (error) {
            console.error('购买失败', error);
        } finally {
            this.isWorking = false;
        }
    }
}
