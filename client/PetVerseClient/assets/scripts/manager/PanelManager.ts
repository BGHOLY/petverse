import { _decorator, Component, find, Node, UITransform, Vec3 } from 'cc';
import UIEventCenter from './UIEventCenter';
import { AdventurePanel } from '../ui/AdventurePanel';
import { BreedPanel } from '../ui/BreedPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { PetPanel } from '../ui/PetPanel';
import { ShopPanel } from '../ui/ShopPanel';
import { UIEffects } from '../ui/UIEffects';
import { createButton, getCanvasSize } from '../ui/UiKit';

const { ccclass } = _decorator;

export type MainPageName = 'PetPage' | 'InventoryPage' | 'ShopPage' | 'BreedPage' | 'AdventurePage';

const PAGE_NAMES: MainPageName[] = ['PetPage', 'InventoryPage', 'ShopPage', 'BreedPage', 'AdventurePage'];

@ccclass('PanelManager')
export class PanelManager extends Component {
    private pageLayer: Node | null = null;
    private pageMap: Map<MainPageName, Node> = new Map();

    start() {
        this.ensurePages();
    }

    ensurePages() {
        const size = getCanvasSize();
        const canvas = find('Canvas') || this.node.parent || this.node;

        this.pageLayer = this.getOrCreateChild(canvas, 'PageLayer', 0, 0, size.width, size.height);

        for (const name of PAGE_NAMES) {
            const page = this.getOrCreateChild(this.pageLayer, name, 0, 0, size.width, size.height);
            page.active = false;
            this.pageMap.set(name, page);
        }

        this.ensureComponent(this.pageMap.get('PetPage')!, PetPanel);
        this.ensureComponent(this.pageMap.get('InventoryPage')!, InventoryPanel);
        this.ensureComponent(this.pageMap.get('ShopPage')!, ShopPanel);
        this.ensureComponent(this.pageMap.get('BreedPage')!, BreedPanel);
        this.ensureComponent(this.pageMap.get('AdventurePage')!, AdventurePanel);

        this.ensureBackButton();
        this.pageLayer.active = false;
    }

    showPage(name: MainPageName) {
        this.ensurePages();
        this.hideAllPages();

        const homeLayer = find('Canvas/HomeLayer');
        if (homeLayer) homeLayer.active = false;

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
    showBreed() { this.showPage('BreedPage'); }
    showAdventure() { this.showPage('AdventurePage'); }

    showHatchery() { this.showBreed(); }
    showFriend() { this.showBreed(); }
    showSkill() { this.showPet(); }
    showBattle() { this.showAdventure(); }
    showTower() { this.showAdventure(); }
    showRanking() { this.showAdventure(); }

    showHome() {
        if (this.pageLayer) this.pageLayer.active = false;
        const homeLayer = find('Canvas/HomeLayer');
        if (homeLayer) homeLayer.active = true;
    }

    hideAllPages() {
        for (const page of this.pageMap.values()) {
            page.active = false;
        }
    }

    private ensureBackButton() {
        if (!this.pageLayer) return;

        const size = getCanvasSize();
        const x = -size.width / 2 + 45;
        const y = -size.height / 2 + 40;

        const button = createButton(this.pageLayer, 'BackHomeButton', '返回', x, y, 70, 38, () => {
            this.showHome();
            UIEventCenter.emit('SHOW_HOME');
        }, this, false, 14);

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
            case 'BreedPage':
                void this.ensureComponent(page, BreedPanel).refreshBreedPage();
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
