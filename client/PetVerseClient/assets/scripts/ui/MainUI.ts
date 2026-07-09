import { _decorator, Component, find, Label, Node, UITransform, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { createButton, createLabel, normalizeList } from './UiKit';

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

    private canvas: Node | null = null;
    private topBar: Node | null = null;
    private pageRoot: Node | null = null;
    private bottomMenu: Node | null = null;

    onLoad() {
        this.ensureLayout();
        this.ensurePanelManager();
        this.createTopBar();
        this.bindBottomMenuButtons();
    }

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onUserUpdated);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onUserUpdated);
    }

    start() {
        this.ensureLayout();
        void this.bootstrap();
    }

    async bootstrap() {
        const seed = await ApiClient.post('/dev/seed-all', {});
        console.log('[MainUI] seed-all result:', seed);
        await this.loadUserAndPets();
        this.panelManager?.showPet();
    }

    async loadUserAndPets() {
        const userResult = await ApiClient.get('/user');
        const petResult = await ApiClient.get('/pet');
        const user = userResult?.user || userResult?.data || userResult || {};
        const pets = this.normalizePets(petResult);

        PlayerData.user = {
            ...(PlayerData.user || {}),
            ...user,
            pets,
        };

        console.log('[MainUI] render top bar:', PlayerData.user);
        this.refreshUI();
    }

    refreshUI() {
        this.ensureLayout();
        const user = PlayerData.user || {
            nickname: 'PetVerse Tester',
            gold: 0,
            diamond: 0,
            pets: [],
        };

        if (this.nicknameLabel) {
            this.nicknameLabel.string = `玩家: ${user.nickname || 'PetVerse Tester'}`;
        }

        if (this.goldLabel) {
            this.goldLabel.string = `金币: ${user.gold ?? 0}`;
        }

        if (this.diamondLabel) {
            this.diamondLabel.string = `钻石: ${user.diamond ?? 0}`;
        }
    }

    onClickPet() {
        this.panelManager?.showPet();
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

    onClickSkill() {
        this.panelManager?.showSkill();
    }

    onClickFriend() {
        this.panelManager?.showFriend();
    }

    onClickBattle() {
        this.panelManager?.showBattle();
    }

    onClickTower() {
        this.panelManager?.showTower();
    }

    onClickRanking() {
        this.panelManager?.showRanking();
    }

    private onUserUpdated = () => {
        void this.loadUserAndPets();
    };

    private ensureLayout() {
        this.canvas = find('Canvas') || this.node.parent || this.node;
        this.topBar = this.findOrCreateChild(this.canvas, 'TopBar', 0, 570, 720, 110);
        this.pageRoot = this.findOrCreateChild(this.canvas, 'PageRoot', 0, 40, 680, 820);
        this.bottomMenu = this.findOrCreateChild(this.canvas, 'BottomMenu', 0, -530, 720, 260);

        this.topBar.active = true;
        this.pageRoot.active = true;
        this.bottomMenu.active = true;
    }

    private findOrCreateChild(parent: Node, name: string, x: number, y: number, width: number, height: number) {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            parent.addChild(node);
        }

        node.setPosition(new Vec3(x, y, 0));
        let transform = node.getComponent(UITransform);
        if (!transform) {
            transform = node.addComponent(UITransform);
        }
        transform.setContentSize(width, height);
        return node;
    }

    private ensurePanelManager() {
        if (!this.canvas) {
            this.ensureLayout();
        }

        const host = this.canvas || this.node;
        this.panelManager = this.panelManager || host.getComponent(PanelManager) || host.addComponent(PanelManager);
        this.panelManager.ensurePages();
    }

    private createTopBar() {
        if (!this.topBar) {
            return;
        }

        this.nicknameLabel = createLabel(this.topBar, 'PlayerLabel', '玩家: -', -220, 0, 220, 60, 22);
        this.goldLabel = createLabel(this.topBar, 'GoldLabel', '金币: 0', 0, 0, 180, 60, 22);
        this.diamondLabel = createLabel(this.topBar, 'DiamondLabel', '钻石: 0', 220, 0, 180, 60, 22);

        for (const label of [this.nicknameLabel, this.goldLabel, this.diamondLabel]) {
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
        }
    }

    private bindBottomMenuButtons() {
        if (!this.bottomMenu) {
            return;
        }

        const items = [
            { name: 'PetButton', text: '宠物', x: -200, y: 80, action: () => this.onClickPet() },
            { name: 'InventoryButton', text: '背包', x: 0, y: 80, action: () => this.onClickInventory() },
            { name: 'ShopButton', text: '商店', x: 200, y: 80, action: () => this.onClickShop() },
            { name: 'HatcheryButton', text: '孵化', x: -200, y: 10, action: () => this.onClickHatchery() },
            { name: 'SkillButton', text: '技能', x: 0, y: 10, action: () => this.onClickSkill() },
            { name: 'FriendButton', text: '好友', x: 200, y: 10, action: () => this.onClickFriend() },
            { name: 'BattleButton', text: '对战', x: -200, y: -60, action: () => this.onClickBattle() },
            { name: 'TowerButton', text: '爬塔', x: 0, y: -60, action: () => this.onClickTower() },
            { name: 'RankingButton', text: '排行', x: 200, y: -60, action: () => this.onClickRanking() },
        ];

        for (const item of items) {
            createButton(this.bottomMenu, item.name, item.text, item.x, item.y, 150, 52, item.action, this);
        }
    }

    private normalizePets(result: any): any[] {
        const pets = normalizeList(result, ['pets']);
        if (pets.length) {
            return pets;
        }

        if (result?.pet) {
            return [result.pet];
        }

        if (result?.currentPet) {
            return [result.currentPet];
        }

        return [];
    }
}
