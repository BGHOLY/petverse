import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PanelManager')
export class PanelManager extends Component {

    @property(Node)
    inventoryPanel: Node | null = null;

    @property(Node)
    shopPanel: Node | null = null;

    start() {
        this.hideAll();
    }

    hideAll() {
        if (this.inventoryPanel) {
            this.inventoryPanel.active = false;
        }

        if (this.shopPanel) {
            this.shopPanel.active = false;
        }
    }

    showInventory() {
        this.hideAll();

        if (this.inventoryPanel) {
            this.inventoryPanel.active = true;
        }
    }

    showShop() {
        this.hideAll();

        if (this.shopPanel) {
            this.shopPanel.active = true;
        }
    }
}