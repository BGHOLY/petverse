import { _decorator, Component, find, Node, UITransform } from 'cc';
import { BattlePanel } from '../ui/BattlePanel';
import { FriendPanel } from '../ui/FriendPanel';
import { RankingPanel } from '../ui/RankingPanel';
import { TowerPanel } from '../ui/TowerPanel';

const { ccclass, property } = _decorator;

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

    start() {
        this.ensurePages();
        this.showPet();
    }

    hideAll() {
        for (const page of this.getPages()) {
            if (page) {
                page.active = false;
            }
        }
    }

    showInventory() {
        this.showPage(this.inventoryPage);
    }

    showShop() {
        this.showPage(this.shopPage);
    }

    showHatchery() {
        this.showPage(this.hatcheryPage);
    }

    showPet() {
        this.showPage(this.petPage);
    }

    showSkill() {
        this.showPage(this.skillPage);
    }

    showBattle() {
        this.showPage(this.battlePage);
        this.ensureComponent(this.battlePage, BattlePanel)?.refreshBattlePage();
    }

    showTower() {
        this.showPage(this.towerPage);
        void this.ensureComponent(this.towerPage, TowerPanel)?.refreshTower();
    }

    showFriend() {
        this.showPage(this.friendPage);
        void this.ensureComponent(this.friendPage, FriendPanel)?.refreshFriendPage();
    }

    showRanking() {
        this.showPage(this.rankingPage);
        void this.ensureComponent(this.rankingPage, RankingPanel)?.refreshRanking();
    }

    private showPage(page: Node | null) {
        this.ensurePages();
        this.hideAll();

        if (!page) {
            console.warn('[PanelManager] page missing');
            return;
        }

        page.active = true;
    }

    private ensurePages() {
        const pageRoot = find('Canvas/PageRoot') || find('PageRoot', this.node.parent || this.node) || this.node;
        this.inventoryPage = this.inventoryPage || this.findOrCreatePage(pageRoot, 'InventoryPage');
        this.shopPage = this.shopPage || this.findOrCreatePage(pageRoot, 'ShopPage');
        this.hatcheryPage = this.hatcheryPage || this.findOrCreatePage(pageRoot, 'HatcheryPage');
        this.petPage = this.petPage || this.findOrCreatePage(pageRoot, 'PetPage');
        this.skillPage = this.skillPage || this.findOrCreatePage(pageRoot, 'SkillPage');
        this.battlePage = this.battlePage || this.findOrCreatePage(pageRoot, 'BattlePage');
        this.towerPage = this.towerPage || this.findOrCreatePage(pageRoot, 'TowerPage');
        this.friendPage = this.friendPage || this.findOrCreatePage(pageRoot, 'FriendPage');
        this.rankingPage = this.rankingPage || this.findOrCreatePage(pageRoot, 'RankingPage');
    }

    private findOrCreatePage(pageRoot: Node, name: string): Node {
        let page = pageRoot.getChildByName(name);
        if (!page) {
            page = new Node(name);
            const transform = page.addComponent(UITransform);
            transform.setContentSize(680, 840);
            pageRoot.addChild(page);
        }
        return page;
    }

    private ensureComponent<T extends Component>(page: Node | null, ctor: new () => T): T | null {
        if (!page) {
            return null;
        }

        let component = page.getComponent(ctor);
        if (!component) {
            component = page.addComponent(ctor);
        }
        return component;
    }

    private getPages() {
        return [
            this.inventoryPage,
            this.shopPage,
            this.hatcheryPage,
            this.petPage,
            this.skillPage,
            this.battlePage,
            this.towerPage,
            this.friendPage,
            this.rankingPage,
        ];
    }
}
