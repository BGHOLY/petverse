import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PanelManager')
export class PanelManager extends Component {

    @property(Node)
    inventoryPanel: Node | null = null;

    @property(Node)
    shopPanel: Node | null = null;

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
            this.inventoryPanel.setSiblingIndex(
                Math.max(0, (this.inventoryPanel.parent?.children.length || 1) - 1),
            );
        }
    }

    showShop() {
        this.hideAll();

        if (this.shopPanel) {
            this.shopPanel.active = true;
            this.shopPanel.setSiblingIndex(
                Math.max(0, (this.shopPanel.parent?.children.length || 1) - 1),
            );
        }
    }
}
