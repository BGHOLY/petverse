import { _decorator, Component, find, Node, UITransform, Vec3 } from 'cc';
import { BattlePanel } from '../ui/BattlePanel';
import { FriendPanel } from '../ui/FriendPanel';
import { HatcheryPanel } from '../ui/HatcheryPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { PetPanel } from '../ui/PetPanel';
import { RankingPanel } from '../ui/RankingPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { SkillPanel } from '../ui/SkillPanel';
import { TowerPanel } from '../ui/TowerPanel';

const { ccclass, property } = _decorator;

type PageName =
    | 'PetPage'
    | 'InventoryPage'
    | 'ShopPage'
    | 'FriendPage'
    | 'HatcheryPage'
    | 'SkillPage'
    | 'BattlePage'
    | 'TowerPage'
    | 'RankingPage';

const PAGE_NAMES: PageName[] = [
    'PetPage',
    'InventoryPage',
    'ShopPage',
    'FriendPage',
    'HatcheryPage',
    'SkillPage',
    'BattlePage',
    'TowerPage',
    'RankingPage',
];

@ccclass('PanelManager')
export class PanelManager extends Component {
    @property(Node)
    inventoryPage: Node | null = null;

    @property(Node)
    shopPage: Node | null = null;

    @property(Node)
    hatcheryPage: Node | null = null;

    @property(Node)
    petPage: Node | null = null;

    @property(Node)
    skillPage: Node | null = null;

    @property(Node)
    battlePage: Node | null = null;

    @property(Node)
    towerPage: Node | null = null;

    @property(Node)
    friendPage: Node | null = null;

    @property(Node)
    rankingPage: Node | null = null;

    private pageRoot: Node | null = null;
    private normalizedPages = new Set<string>();

    start() {
        this.ensurePages();
    }

    ensurePages() {
        this.pageRoot = this.findOrCreatePageRoot();
        this.petPage = this.findOrCreatePage('PetPage');
        this.inventoryPage = this.findOrCreatePage('InventoryPage');
        this.shopPage = this.findOrCreatePage('ShopPage');
        this.friendPage = this.findOrCreatePage('FriendPage');
        this.hatcheryPage = this.findOrCreatePage('HatcheryPage');
        this.skillPage = this.findOrCreatePage('SkillPage');
        this.battlePage = this.findOrCreatePage('BattlePage');
        this.towerPage = this.findOrCreatePage('TowerPage');
        this.rankingPage = this.findOrCreatePage('RankingPage');
    }

    showPet() {
        this.showPage('PetPage');
    }

    showInventory() {
        this.showPage('InventoryPage');
    }

    showShop() {
        this.showPage('ShopPage');
    }

    showFriend() {
        this.showPage('FriendPage');
    }

    showHatchery() {
        this.showPage('HatcheryPage');
    }

    showSkill() {
        this.showPage('SkillPage');
    }

    showBattle() {
        this.showPage('BattlePage');
    }

    showTower() {
        this.showPage('TowerPage');
    }

    showRanking() {
        this.showPage('RankingPage');
    }

    hideAllPages() {
        this.ensurePages();

        for (const name of PAGE_NAMES) {
            const page = this.pageRoot?.getChildByName(name);
            if (page) {
                page.active = false;
            }
        }

        if (this.pageRoot) {
            this.pageRoot.active = true;
        }

        const topBar = find('Canvas/TopBar');
        const bottomMenu = find('Canvas/BottomMenu');
        if (topBar) topBar.active = true;
        if (bottomMenu) bottomMenu.active = true;
    }

    private showPage(name: PageName) {
        this.ensurePages();
        this.hideAllPages();
        const page = this.pageRoot?.getChildByName(name);

        if (!page) {
            console.warn('[PanelManager] Missing page:', name);
            return;
        }

        page.active = true;
        console.log('[PanelManager] Switch page:', name);
        this.ensureAndRefresh(name, page);
    }

    private findOrCreatePageRoot() {
        const canvas = find('Canvas') || this.node.parent || this.node;
        let pageRoot = find('Canvas/PageRoot') || canvas.getChildByName('PageRoot');

        if (!pageRoot) {
            pageRoot = new Node('PageRoot');
            canvas.addChild(pageRoot);
        }

        pageRoot.setPosition(new Vec3(0, 40, 0));
        let transform = pageRoot.getComponent(UITransform);
        if (!transform) {
            transform = pageRoot.addComponent(UITransform);
        }
        transform.setContentSize(680, 820);
        pageRoot.active = true;

        return pageRoot;
    }

    private findOrCreatePage(name: PageName) {
        if (!this.pageRoot) {
            this.pageRoot = this.findOrCreatePageRoot();
        }

        let page = this.pageRoot.getChildByName(name);
        if (!page) {
            page = new Node(name);
            this.pageRoot.addChild(page);
        }

        page.setPosition(new Vec3(0, 0, 0));
        let transform = page.getComponent(UITransform);
        if (!transform) {
            transform = page.addComponent(UITransform);
        }
        transform.setContentSize(680, 820);

        if (!this.normalizedPages.has(name)) {
            for (const child of [...page.children]) {
                child.destroy();
            }
            this.normalizedPages.add(name);
        }

        return page;
    }

    private ensureAndRefresh(name: PageName, page: Node) {
        switch (name) {
            case 'PetPage':
                void this.ensureComponent(page, PetPanel).loadPetsFromServer();
                break;
            case 'InventoryPage':
                void this.ensureComponent(page, InventoryPanel).loadInventory();
                break;
            case 'ShopPage':
                void this.ensureComponent(page, ShopPanel).loadShop();
                break;
            case 'FriendPage':
                void this.ensureComponent(page, FriendPanel).refreshFriendPage();
                break;
            case 'HatcheryPage':
                void this.ensureComponent(page, HatcheryPanel).refreshEggInfo();
                break;
            case 'SkillPage':
                void this.ensureComponent(page, SkillPanel).refreshSkillInfo();
                break;
            case 'BattlePage':
                this.ensureComponent(page, BattlePanel).refreshBattlePage();
                break;
            case 'TowerPage':
                void this.ensureComponent(page, TowerPanel).refreshTower();
                break;
            case 'RankingPage':
                void this.ensureComponent(page, RankingPanel).refreshRanking();
                break;
        }
    }

    private ensureComponent<T extends Component>(page: Node, ctor: new () => T): T {
        let component = page.getComponent(ctor);
        if (!component) {
            component = page.addComponent(ctor);
        }
        return component;
    }
}
