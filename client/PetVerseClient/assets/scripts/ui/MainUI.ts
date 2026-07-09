import { _decorator, Component, find, Label, Node, UITransform, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import { createButton, createLabel, createPanel, getCanvasSize, normalizeList } from './UiKit';

const { ccclass, property } = _decorator;

@ccclass('MainUI')
export class MainUI extends Component {
    @property(Label) nicknameLabel: Label | null = null;
    @property(Label) goldLabel: Label | null = null;
    @property(Label) diamondLabel: Label | null = null;
    @property(Label) vipLabel: Label | null = null;
    @property(PanelManager) panelManager: PanelManager | null = null;

    private canvas: Node | null = null;
    private homeLayer: Node | null = null;
    private pageLayer: Node | null = null;
    private toastLayer: Node | null = null;
    private topBar: Node | null = null;
    private leftActivity: Node | null = null;
    private bottomMenu: Node | null = null;
    private homePetAnchor: Node | null = null;

    onLoad() {
        this.bindStaticScene();
        this.ensurePanelManager();
        this.bindHomeTopBar();
        this.bindLeftActivityButtons();
        this.bindBottomMainMenu();
    }

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onUserUpdated);
        UIEventCenter.on('SHOW_HOME', this.showHomeByEvent);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onUserUpdated);
        UIEventCenter.off('SHOW_HOME', this.showHomeByEvent);
    }

    start() {
        this.bindStaticScene();
        void this.bootstrap();
    }

    async bootstrap() {
        await ApiClient.post('/dev/seed-all', {});
        await this.loadUserAndPets();
        this.showHome();
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

        this.refreshUI();
    }

    refreshUI() {
        this.bindStaticScene();

        const user = PlayerData.user || {
            nickname: 'PetVerse玩家',
            gold: 0,
            diamond: 0,
            pets: [],
        };

        if (this.vipLabel) this.vipLabel.string = `VIP ${user.vipLevel ?? user.vip ?? 0}`;
        if (this.nicknameLabel) this.nicknameLabel.string = `玩家: ${user.nickname || 'PetVerse玩家'}`;
        if (this.goldLabel) this.goldLabel.string = `金币: ${user.gold ?? 0}`;
        if (this.diamondLabel) this.diamondLabel.string = `钻石: ${user.diamond ?? 0}`;
    }

    showHome() {
        this.bindStaticScene();

        if (this.pageLayer) this.pageLayer.active = false;
        if (this.homeLayer) this.homeLayer.active = true;
        if (this.toastLayer) this.toastLayer.active = true;
        if (this.homePetAnchor) this.homePetAnchor.active = true;
    }

    onClickPet() { this.panelManager?.showPet(); }
    onClickInventory() { this.panelManager?.showInventory(); }
    onClickShop() { this.panelManager?.showShop(); }
    onClickBreed() { this.panelManager?.showBreed(); }
    onClickAdventure() { this.panelManager?.showAdventure(); }

    private showHomeByEvent = () => {
        this.showHome();
    };

    private onUserUpdated = () => {
        void this.loadUserAndPets();
    };

    private bindStaticScene() {
        const size = getCanvasSize();
        this.canvas = find('Canvas') || this.node.parent || this.node;

        this.homeLayer = this.getOrCreateChild(this.canvas, 'HomeLayer', 0, 0, size.width, size.height);
        this.pageLayer = this.getOrCreateChild(this.canvas, 'PageLayer', 0, 0, size.width, size.height);
        this.toastLayer = this.getOrCreateChild(this.canvas, 'ToastLayer', 0, 0, size.width, size.height);

        this.topBar = this.getOrCreateChild(this.homeLayer, 'TopBar', 0, size.height / 2 - 40, Math.min(size.width - 20, 430), 50);
        this.leftActivity = this.getOrCreateChild(this.homeLayer, 'LeftActivityButtons', -size.width / 2 + 35, 145, 70, 210);
        this.homePetAnchor = this.getOrCreateChild(this.homeLayer, 'HomePetAnchor', 0, -20, 180, 220);
        this.bottomMenu = this.getOrCreateChild(this.homeLayer, 'BottomMenu', 0, -size.height / 2 + 45, Math.min(size.width - 20, 430), 74);

        this.homeLayer.active = true;
        this.pageLayer.active = false;
        this.toastLayer.active = true;
    }

    private ensurePanelManager() {
        if (!this.canvas) this.bindStaticScene();
        const host = this.canvas || this.node;
        this.panelManager = this.panelManager || host.getComponent(PanelManager) || host.addComponent(PanelManager);
        this.panelManager.ensurePages();
    }

    private bindHomeTopBar() {
        if (!this.topBar) return;

        const width = Math.min(getCanvasSize().width - 20, 430);
        const seg = width / 4;

        createPanel(this.topBar, 'TopBarBg', 0, 0, width, 50);
        this.vipLabel = createLabel(this.topBar, 'VipLabel', 'VIP 0', -width / 2 + seg * 0.5, 0, seg - 6, 30, 13);
        this.nicknameLabel = createLabel(this.topBar, 'PlayerLabel', '玩家: PetVerse玩家', -width / 2 + seg * 1.5, 0, seg - 6, 30, 13);
        this.goldLabel = createLabel(this.topBar, 'GoldLabel', '金币: 0', -width / 2 + seg * 2.5, 0, seg - 6, 30, 13);
        this.diamondLabel = createLabel(this.topBar, 'DiamondLabel', '钻石: 0', -width / 2 + seg * 3.5, 0, seg - 6, 30, 13);
    }

    private bindLeftActivityButtons() {
        if (!this.leftActivity) return;

        const items = [
            { name: 'VipButton', text: 'VIP', y: 75, action: () => ToastManager.show('VIP系统稍后接入') },
            { name: 'SignButton', text: '签到', y: 25, action: () => ToastManager.show('每日签到稍后接入') },
            { name: 'GiftButton', text: '礼包', y: -25, action: () => ToastManager.show('礼包系统稍后接入') },
            { name: 'RankButton', text: '排行', y: -75, action: () => this.onClickAdventure() },
        ];

        for (const item of items) {
            createButton(this.leftActivity, item.name, item.text, 0, item.y, 56, 34, item.action, this, false, 12);
        }
    }

    private bindBottomMainMenu() {
        if (!this.bottomMenu) return;

        const width = Math.min(getCanvasSize().width - 20, 430);
        createPanel(this.bottomMenu, 'BottomMenuBg', 0, 0, width, 74);

        const items = [
            { name: 'PetButton', text: '宠物', x: -172, action: () => this.onClickPet() },
            { name: 'InventoryButton', text: '背包', x: -86, action: () => this.onClickInventory() },
            { name: 'ShopButton', text: '商店', x: 0, action: () => this.onClickShop() },
            { name: 'BreedButton', text: '繁育', x: 86, action: () => this.onClickBreed() },
            { name: 'AdventureButton', text: '冒险', x: 172, action: () => this.onClickAdventure() },
        ];

        for (const item of items) {
            createButton(this.bottomMenu, item.name, item.text, item.x, 0, 76, 44, item.action, this, false, 14);
        }
    }

    private getOrCreateChild(parent: Node, name: string, x: number, y: number, width: number, height: number) {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            parent.addChild(node);
        }

        node.setPosition(new Vec3(x, y, 0));
        let transform = node.getComponent(UITransform);
        if (!transform) transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return node;
    }

    private normalizePets(result: any): any[] {
        const pets = normalizeList(result, ['pets']);
        if (pets.length) return pets;
        if (result?.pet) return [result.pet];
        if (result?.currentPet) return [result.currentPet];
        return [];
    }
}
