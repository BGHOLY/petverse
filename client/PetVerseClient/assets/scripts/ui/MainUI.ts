import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
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

    @property(PanelManager)
    panelManager: PanelManager | null = null;

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
            const pet = user.pets?.[0];
            this.petInfoLabel.string = pet
                ? '宠物：' + (pet.nickname || pet.name) +
                    '\n等级：' + pet.level +
                    '\n稀有度：' + (pet.rarityName || pet.rarity) +
                    '\n饥饿：' + pet.hunger +
                    '\n快乐：' + pet.happiness
                : '暂无宠物';
        }
    }

    onClickInventory() {
        this.panelManager?.showInventory();
    }

    onClickShop() {
        this.panelManager?.showShop();
    }

    onClickRanking() {
        console.log('排行榜功能暂未开放');
    }

    onClickTask() {
        console.log('任务功能暂未开放');
    }
}
