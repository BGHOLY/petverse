import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import { find } from 'cc';
import { InventoryPanel } from './InventoryPanel';
import { ShopPanel } from './ShopPanel';
import { PanelManager } from '../manager/PanelManager';

const { ccclass, property } = _decorator;

@ccclass('MainUI')
export class MainUI extends Component {

    @property(Label)
    nicknameLabel: Label | null = null;

    @property(Label)
    goldLabel: Label | null = null;

    @property(Label)
    diamondLabel: Label | null = null;

    @property(Label)
    petInfoLabel: Label | null = null;

    start() {
        this.refreshUI();
    }

    refreshUI() {
        const user = PlayerData.user;

        if (!user) {
            console.warn('没有玩家数据');
            return;
        }

        if (this.nicknameLabel) {
            this.nicknameLabel.string = '玩家：' + user.nickname;
        }

        if (this.goldLabel) {
            this.goldLabel.string = '金币：' + user.gold;
        }

        if (this.diamondLabel) {
            this.diamondLabel.string = '钻石：' + user.diamond;
        }

        if (this.petInfoLabel) {
            const pet = user.pets && user.pets.length > 0
                ? user.pets[0]
                : null;

            if (pet) {
                this.petInfoLabel.string =
                    '宠物：' + pet.nickname +
                    '\n等级：' + pet.level +
                    '\n稀有度：' + pet.rarityName +
                    '\n饥饿：' + pet.hunger +
                    '\n快乐：' + pet.happiness;
            } else {
                this.petInfoLabel.string = '暂无宠物';
            }
        }
    }
    onClickInventory() {
    console.log('点击背包');

    const node = find('Canvas/MainManager');

    if (!node) {
        return;
    }

    const panelManager =
        node.getComponent(PanelManager);

    if (!panelManager) {
        return;
    }

    panelManager.showInventory();

    const inventoryNode =
        find('Canvas/InventoryPanelNode');

    if (!inventoryNode) {
        return;
    }

    const panel =
        inventoryNode.getComponent(InventoryPanel);

    if (panel) {
        panel.loadInventory();
    }
}

    onClickShop() {
    console.log('点击商店');

    const node = find('Canvas/MainManager');

    if (!node) {
        return;
    }

    const panelManager =
        node.getComponent(PanelManager);

    if (!panelManager) {
        return;
    }

    panelManager.showShop();

    const shopNode =
        find('Canvas/ShopPanelNode');

    if (!shopNode) {
        return;
    }

    const panel =
        shopNode.getComponent(ShopPanel);

    if (panel) {
        panel.loadShop();
    }
}

    onClickRanking() {
        console.log('点击排行榜');
    }

    onClickTask() {
        console.log('点击每日任务');
    }

}