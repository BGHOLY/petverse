import { _decorator, Component, Label } from 'cc';
import NetworkManager from '../network/NetworkManager';

const { ccclass, property } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {

    @property(Label)
    contentLabel: Label | null = null;

    async loadShop() {
        console.log('开始加载商店');

        const res = await NetworkManager.get('/shop/items');

        console.log(
            '商店数据',
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
            this.contentLabel.string = '暂无商品';
            return;
        }

        let text = '商店\n\n';

        for (const item of list) {
            text +=
                item.name +
                '：' +
                item.price +
                '金币\n';
        }

        this.contentLabel.string = text;
    }
}