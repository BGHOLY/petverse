import { _decorator, Component, find, Label, Node, UITransform, Vec3 } from 'cc';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    createButton,
    createLabel,
    createPanel,
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    normalizeList,
} from './UiKit';

const { ccclass, property } = _decorator;

const TXT_PLAYER = '\u73a9\u5bb6';
const TXT_GOLD = '\u91d1\u5e01';
const TXT_DIAMOND = '\u94bb\u77f3';
const TXT_PET = '\u5ba0\u7269';
const TXT_BAG = '\u80cc\u5305';
const TXT_SHOP = '\u5546\u5e97';
const TXT_BREED = '\u7e41\u80b2';
const TXT_ADVENTURE = '\u5192\u9669';

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
            nickname: 'PetVerse',
            gold: 0,
            diamond: 0,
            pets: [],
        };

        if (this.vipLabel) this.vipLabel.string = `VIP ${user.vipLevel ?? user.vip ?? 0}`;
        if (this.nicknameLabel) this.nicknameLabel.string = `${TXT_PLAYER}: ${user.nickname || 'PetVerse'}`;
        if (this.goldLabel) this.goldLabel.string = `${TXT_GOLD}: ${user.gold ?? 0}`;
        if (this.diamondLabel) this.diamondLabel.string = `${TXT_DIAMOND}: ${user.diamond ?? 0}`;
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
        this.canvas = find('Canvas') || this.node.parent || this.node;

        this.homeLayer = this.getOrCreateChild(this.canvas, 'HomeLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.pageLayer = this.getOrCreateChild(this.canvas, 'PageLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.toastLayer = this.getOrCreateChild(this.canvas, 'ToastLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.topBar = this.getOrCreateChild(this.homeLayer, 'TopBar', 0, 590, 680, 64);
        this.leftActivity = this.getOrCreateChild(this.homeLayer, 'LeftActivityButtons', -300, 220, 118, 260);
        this.homePetAnchor = this.getOrCreateChild(this.homeLayer, 'HomePetAnchor', 0, -20, 260, 300);
        this.bottomMenu = this.getOrCreateChild(this.homeLayer, 'BottomMenu', 0, -560, 680, 96);

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

        createPanel(this.topBar, 'TopBarBg', 0, 0, 680, 64);
        this.vipLabel = createLabel(this.topBar, 'VipLabel', 'VIP 0', -255, 0, 120, 38, 14);
        this.nicknameLabel = createLabel(this.topBar, 'PlayerLabel', `${TXT_PLAYER}: PetVerse`, -75, 0, 210, 38, 14);
        this.goldLabel = createLabel(this.topBar, 'GoldLabel', `${TXT_GOLD}: 0`, 110, 0, 150, 38, 14);
        this.diamondLabel = createLabel(this.topBar, 'DiamondLabel', `${TXT_DIAMOND}: 0`, 265, 0, 140, 38, 14);
    }

    private bindLeftActivityButtons() {
        if (!this.leftActivity) return;

        const items = [
            { name: 'VipButton', text: 'VIP', y: 75, action: () => ToastManager.show('VIP \u7a0d\u540e\u63a5\u5165') },
            { name: 'SignButton', text: '\u7b7e\u5230', y: 25, action: () => ToastManager.show('\u7b7e\u5230\u7a0d\u540e\u63a5\u5165') },
            { name: 'GiftButton', text: '\u793c\u5305', y: -25, action: () => ToastManager.show('\u793c\u5305\u7a0d\u540e\u63a5\u5165') },
            { name: 'RankButton', text: '\u6392\u884c', y: -75, action: () => this.onClickAdventure() },
        ];

        for (const item of items) {
            createButton(this.leftActivity, item.name, item.text, 0, item.y, 94, 38, item.action, this, false, 13);
        }
    }

    private bindBottomMainMenu() {
        if (!this.bottomMenu) return;

        createPanel(this.bottomMenu, 'BottomMenuBg', 0, 0, 680, 96);

        const items = [
            { name: 'PetButton', text: TXT_PET, x: -272, action: () => this.onClickPet() },
            { name: 'InventoryButton', text: TXT_BAG, x: -136, action: () => this.onClickInventory() },
            { name: 'ShopButton', text: TXT_SHOP, x: 0, action: () => this.onClickShop() },
            { name: 'BreedButton', text: TXT_BREED, x: 136, action: () => this.onClickBreed() },
            { name: 'AdventureButton', text: TXT_ADVENTURE, x: 272, action: () => this.onClickAdventure() },
        ];

        for (const item of items) {
            createButton(this.bottomMenu, item.name, item.text, item.x, 0, 118, 58, item.action, this, false, 16);
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
