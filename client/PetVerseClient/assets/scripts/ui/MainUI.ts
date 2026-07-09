import { _decorator, Component, find, Label, Node } from 'cc';
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

    private topBar: Node | null = null;
    private pageRoot: Node | null = null;
    private bottomMenu: Node | null = null;

    onLoad() {
        this.bindLayoutNodes();
        this.bindLabels();
    }

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onUserUpdated);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onUserUpdated);
    }

    start() {
        this.showMainLayout();
        this.panelManager?.showPet();
        this.refreshUI();
    }

    private onUserUpdated = () => {
        this.showMainLayout();
        this.refreshUI();
    };

    private bindLayoutNodes() {
        this.topBar = find('Canvas/TopBar') || find('TopBar', this.node.parent || this.node);
        this.pageRoot = find('Canvas/PageRoot') || find('PageRoot', this.node.parent || this.node);
        this.bottomMenu = find('Canvas/BottomMenu') || find('BottomMenu', this.node.parent || this.node);
    }

    private bindLabels() {
        if (!this.nicknameLabel) {
            this.nicknameLabel = find('Canvas/TopBar/NicknameLabel')?.getComponent(Label) || null;
        }

        if (!this.goldLabel) {
            this.goldLabel = find('Canvas/TopBar/GoldLabel')?.getComponent(Label) || null;
        }

        if (!this.diamondLabel) {
            this.diamondLabel = find('Canvas/TopBar/DiamondLabel')?.getComponent(Label) || null;
        }
    }

    private showMainLayout() {
        if (!this.topBar || !this.pageRoot || !this.bottomMenu) {
            this.bindLayoutNodes();
        }

        if (this.topBar) {
            this.topBar.active = true;
        }

        if (this.pageRoot) {
            this.pageRoot.active = true;
        }

        if (this.bottomMenu) {
            this.bottomMenu.active = true;
        }
    }

    refreshUI() {
        this.showMainLayout();

        const user = PlayerData.user || {
            nickname: '游客玩家',
            gold: 0,
            diamond: 0,
            pets: [],
        };

        if (this.nicknameLabel) {
            this.nicknameLabel.string = '玩家：' + (user.nickname || '游客玩家');
        }

        if (this.goldLabel) {
            this.goldLabel.string = '金币：' + (user.gold ?? 0);
        }

        if (this.diamondLabel) {
            this.diamondLabel.string = '钻石：' + (user.diamond ?? 0);
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
        this.showMainLayout();
        this.panelManager?.showInventory();
    }

    onClickShop() {
        this.showMainLayout();
        this.panelManager?.showShop();
    }

    onClickHatchery() {
        this.showMainLayout();
        this.panelManager?.showHatchery();
    }

    onClickPet() {
        this.showMainLayout();
        this.panelManager?.showPet();
    }

    onClickSkill() {
        this.showMainLayout();
        this.panelManager?.showSkill();
    }

    onClickRanking() {
        this.showMainLayout();
        this.panelManager?.showRanking();
    }

    onClickBattle() {
        this.showMainLayout();
        this.panelManager?.showBattle();
    }

    onClickFriend() {
        this.showMainLayout();
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
