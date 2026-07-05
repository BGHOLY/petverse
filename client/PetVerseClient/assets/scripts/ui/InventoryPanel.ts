import { _decorator, Component, Label } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('InventoryPanel')
export class InventoryPanel extends Component {

    @property(Label)
    contentLabel: Label | null = null;

    async loadInventory() {
        console.log('开始加载背包');

        const res = await NetworkManager.get(
            '/inventory',
            PlayerData.token,
        );

        console.log(
            '背包数据',
            JSON.stringify(res)
        );

        if (!this.contentLabel) {
            return;
        }

        const list =
            res.items ||
            res.data ||
            res ||
            [];

        if (!Array.isArray(list) || list.length === 0) {
            this.contentLabel.string = '背包为空';
            return;
        }

        let text = '我的背包\n\n';

        for (const item of list) {
            text +=
                item.itemCode +
                ' × ' +
                item.quantity +
                '\n';
        }

        this.contentLabel.string = text;
    }
}