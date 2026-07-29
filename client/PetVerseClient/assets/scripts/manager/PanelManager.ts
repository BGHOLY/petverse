import { _decorator, Component, Node } from 'cc';
import { PageName } from '../ui/v2/AppRoutes';

const { ccclass, property } = _decorator;

@ccclass('PanelManager')
export class PanelManager extends Component {
    static instance: PanelManager | null = null;

    @property(Node) homePage: Node | null = null;
    @property(Node) petPage: Node | null = null;
    @property(Node) inventoryPage: Node | null = null;
    @property(Node) adventurePage: Node | null = null;
    @property(Node) shopPage: Node | null = null;
    @property(Node) hatcheryPage: Node | null = null;
    @property(Node) morePage: Node | null = null;
    @property(Node) secondaryPage: Node | null = null;

    onLoad() {
        PanelManager.instance = this;
        this.ensurePages();
    }

    onDestroy() {
        if (PanelManager.instance === this) PanelManager.instance = null;
    }

    /**
     * Compatibility lookup for scenes saved before the Inspector properties
     * existed. It binds existing direct children only and never creates nodes.
     */
    ensurePages() {
        const canvas = this.node.name === 'Canvas' ? this.node : this.node.parent;
        const root = canvas?.getChildByName('PetVerseUIRoot');
        const pageRoot = root?.getChildByName('PageRoot');
        this.homePage ||= pageRoot?.getChildByName('HomePage') || null;
        this.petPage ||= pageRoot?.getChildByName('PetPage') || null;
        this.inventoryPage ||= pageRoot?.getChildByName('InventoryPage') || null;
        this.adventurePage ||= pageRoot?.getChildByName('AdventurePage') || null;
        this.shopPage ||= pageRoot?.getChildByName('ShopPage') || null;
        this.hatcheryPage ||= pageRoot?.getChildByName('HatcheryPage') || null;
        this.morePage ||= pageRoot?.getChildByName('MorePage') || null;
        this.secondaryPage ||= pageRoot?.getChildByName('SecondaryPage') || null;
    }

    hideAllPages() {
        for (const page of this.pages()) {
            if (page?.isValid) page.active = false;
        }
    }

    showPageNode(page: PageName) {
        this.ensurePages();
        const target = this.pageFor(page);
        if (!target?.isValid) {
            console.error(`[PanelManager] Missing editor-owned page node for "${page}".`);
            return null;
        }
        for (const node of this.pages()) {
            if (node?.isValid) node.active = node === target;
        }
        return target;
    }

    refreshCurrentPage() { this.mainUi()?.refreshCurrentPage?.(); }
    showHome() { this.mainUi()?.showHome?.(); }
    showPet() { this.mainUi()?.showPet?.(); }
    showInventory() { this.mainUi()?.showInventory?.(); }
    showShop() { this.mainUi()?.showShop?.(); }
    showBreed() { this.mainUi()?.showBreed?.(); }
    showAdventure() { this.mainUi()?.showTower?.(); }
    showHatchery() { this.mainUi()?.showHatchery?.(); }
    showFriend() { this.mainUi()?.showFriend?.(); }
    showSkill() { this.mainUi()?.showSkills?.(); }
    showFusion() { this.mainUi()?.showFusion?.(); }
    showBattle() { this.mainUi()?.showTower?.(); }
    showTower() { this.mainUi()?.showTower?.(); }
    showRanking() { this.mainUi()?.showRanking?.(); }
    showSettings() { this.mainUi()?.showSettings?.(); }

    private mainUi() {
        if (!this.node?.isValid) {
            console.warn('[PanelManager] MainUI lookup skipped because the manager node is no longer valid.');
            return null;
        }
        return this.node.getComponent('MainUI') as any;
    }

    private pages() {
        return [
            this.homePage,
            this.petPage,
            this.inventoryPage,
            this.adventurePage,
            this.shopPage,
            this.hatcheryPage,
            this.morePage,
            this.secondaryPage,
        ];
    }

    private pageFor(page: PageName) {
        if (page === 'home') return this.homePage;
        if (page === 'pet') return this.petPage;
        if (page === 'inventory') return this.inventoryPage;
        if (page === 'adventure') return this.adventurePage;
        if (page === 'shop') return this.shopPage;
        if (page === 'hatchery') return this.hatcheryPage;
        if (page === 'more') return this.morePage;
        return this.secondaryPage;
    }
}

export default PanelManager;
