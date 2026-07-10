import { _decorator, Component, find, Node, UITransform, Vec3 } from 'cc';
import UIEventCenter from './UIEventCenter';
import { AdventurePanel } from '../ui/AdventurePanel';
import { FriendPanel } from '../ui/FriendPanel';
import { HatcheryPanel } from '../ui/HatcheryPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { MarriagePanel } from '../ui/MarriagePanel';
import { PetPanel } from '../ui/PetPanel';
import { ProfilePanel } from '../ui/ProfilePanel';
import { RankingPanel } from '../ui/RankingPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { TowerPanel } from '../ui/TowerPanel';
import { UIEffects } from '../ui/UIEffects';
import { createButton, DESIGN_HEIGHT, DESIGN_WIDTH } from '../ui/UiKit';

const { ccclass } = _decorator;

export type MainPageName =
    | 'PetPage'
    | 'InventoryPage'
    | 'ShopPage'
    | 'HatcheryPage'
    | 'MarriagePage'
    | 'FriendPage'
    | 'TowerPage'
    | 'RankingPage'
    | 'ProfilePage'
    | 'AdventurePage';

const PAGE_NAMES: MainPageName[] = [
    'PetPage',
    'InventoryPage',
    'ShopPage',
    'HatcheryPage',
    'MarriagePage',
    'FriendPage',
    'TowerPage',
    'RankingPage',
    'ProfilePage',
    'AdventurePage',
];

@ccclass('PanelManager')
export class PanelManager extends Component {
    private pageLayer: Node | null = null;
    private pageMap: Map<MainPageName, Node> = new Map();
    private currentPageName: MainPageName | null = null;

    start() {
        this.ensurePages();
    }

    ensurePages() {
        const canvas = find('Canvas') || this.node.parent || this.node;

        const appRoot = this.getOrCreateChild(canvas, 'AppRoot', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        const pageViewport = this.getOrCreateChild(appRoot, 'PageViewport', 0, -24, DESIGN_WIDTH, 948);
        this.pageLayer = this.getOrCreateChild(pageViewport, 'PageRoot', 0, 0, DESIGN_WIDTH, 948);

        const keepCurrentState = !!this.currentPageName;

        for (const name of PAGE_NAMES) {
            const page = this.getOrCreateChild(this.pageLayer, name, 0, 0, DESIGN_WIDTH, 948);
            if (!keepCurrentState) page.active = false;
            this.pageMap.set(name, page);
        }

        this.ensureComponent(this.pageMap.get('PetPage')!, PetPanel);
        this.ensureComponent(this.pageMap.get('InventoryPage')!, InventoryPanel);
        this.ensureComponent(this.pageMap.get('ShopPage')!, ShopPanel);
        this.ensureComponent(this.pageMap.get('HatcheryPage')!, HatcheryPanel);
        this.ensureComponent(this.pageMap.get('MarriagePage')!, MarriagePanel);
        this.ensureComponent(this.pageMap.get('FriendPage')!, FriendPanel);
        this.ensureComponent(this.pageMap.get('TowerPage')!, TowerPanel);
        this.ensureComponent(this.pageMap.get('RankingPage')!, RankingPanel);
        this.ensureComponent(this.pageMap.get('ProfilePage')!, ProfilePanel);
        this.ensureComponent(this.pageMap.get('AdventurePage')!, AdventurePanel);

        this.ensureBackButton();
        if (!keepCurrentState) this.pageLayer.active = false;
    }

    showPage(name: MainPageName) {
        this.ensurePages();
        this.hideAllPages();

        const homePage = find('Canvas/AppRoot/PageViewport/HomePage');
        if (homePage) homePage.active = false;

        if (this.pageLayer) {
            this.pageLayer.active = true;
            this.pageLayer.setSiblingIndex(80);
        }

        const page = this.pageMap.get(name);
        if (!page) {
            console.warn('[PanelManager] Missing page:', name);
            return;
        }

        page.active = true;
        page.setSiblingIndex(1);
        this.currentPageName = name;
        this.ensureBackButton();
        UIEffects.playPageIn(page);
        console.log('[PanelManager] Switch page:', name);

        this.scheduleOnce(() => {
            console.log('[PanelManager] Refresh page:', name);
            this.refreshPage(name, page);
        }, 0);
    }

    showPet() { this.showPage('PetPage'); }
    showInventory() { this.showPage('InventoryPage'); }
    showShop() { this.showPage('ShopPage'); }
    showBreed() { this.showMarriage(); }
    showAdventure() { this.showPage('AdventurePage'); }

    showHatchery() { this.showPage('HatcheryPage'); }
    showMarriage() { this.showPage('MarriagePage'); }
    showFriend() { this.showPage('FriendPage'); }
    showSkill() { this.showPet(); }
    showBattle() { this.showAdventure(); }
    showTower() { this.showPage('TowerPage'); }
    showRanking() { this.showPage('RankingPage'); }
    showProfile() { this.showPage('ProfilePage'); }

    showHome() {
        this.currentPageName = null;
        if (this.pageLayer) this.pageLayer.active = false;
        const homePage = find('Canvas/AppRoot/PageViewport/HomePage');
        if (homePage) homePage.active = true;
    }

    refreshCurrentPage() {
        if (!this.currentPageName) return;
        const page = this.pageMap.get(this.currentPageName);
        if (!page || !page.active) return;
        this.refreshPage(this.currentPageName, page);
    }

    hideAllPages() {
        for (const page of this.pageMap.values()) {
            page.active = false;
        }
    }

    private ensureBackButton() {
        if (!this.pageLayer) return;

        const button = createButton(this.pageLayer, 'BackHomeButton', '\u8fd4\u56de', -292, -414, 90, 44, () => {
            this.showHome();
            UIEventCenter.emit('SHOW_HOME');
        }, this, false, 15);

        button.node.setSiblingIndex(99);
    }

    private refreshPage(name: MainPageName, page: Node) {
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
            case 'HatcheryPage':
                void this.ensureComponent(page, HatcheryPanel).refreshEggInfo();
                break;
            case 'MarriagePage':
                void this.ensureComponent(page, MarriagePanel).refreshMarriagePage();
                break;
            case 'FriendPage':
                void this.ensureComponent(page, FriendPanel).refreshFriendPage();
                break;
            case 'TowerPage':
                void this.ensureComponent(page, TowerPanel).refreshTower();
                break;
            case 'RankingPage':
                void this.ensureComponent(page, RankingPanel).refreshRanking();
                break;
            case 'ProfilePage':
                void this.ensureComponent(page, ProfilePanel).refreshProfile();
                break;
            case 'AdventurePage':
                void this.ensureComponent(page, AdventurePanel).refreshAdventurePage();
                break;
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

    private ensureComponent<T extends Component>(page: Node, ctor: new () => T): T {
        let component = page.getComponent(ctor);
        if (!component) component = page.addComponent(ctor);
        return component;
    }
}
