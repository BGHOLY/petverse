import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import { FriendPanel } from './FriendPanel';
import UIEventCenter from '../manager/UIEventCenter';

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

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onUserUpdated);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onUserUpdated);
    }

    start() {
        this.refreshUI();
    }

    private onUserUpdated = () => {
        this.refreshUI();
    };

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

    onClickHatchery() {
        this.panelManager?.showHatchery();
    }

    onClickPet() {
        this.panelManager?.showPet();
    }

    onClickSkill() {
        this.panelManager?.showSkill();
    }

    onClickRanking() {
        this.panelManager?.showRanking();
    }

    onClickBattle() {
        this.panelManager?.showBattle();
    }

    onClickFriend() {
        this.panelManager?.showFriend();

        const friendPage = this.panelManager?.friendPage;
        if (!friendPage) {
            console.warn('FriendPage 未绑定');
            return;
        }

        let panel = friendPage.getComponent(FriendPanel);
        if (!panel) {
            panel = friendPage.addComponent(FriendPanel);
        }

        panel.refreshFriendPage();
    }
}
