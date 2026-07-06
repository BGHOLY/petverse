import { _decorator, Component, Node } from 'cc';
import { RankingPanel } from '../ui/RankingPanel';
import { BattlePanel } from '../ui/BattlePanel';

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
    rankingPage: Node | null = null;

    @property(Node)
    battlePage: Node | null = null;

    @property(Node)
    friendPage: Node | null = null;

    start() {
        this.showPet();
    }

    hideAll() {
        const pages: Array<Node | null> = [
            this.inventoryPage,
            this.shopPage,
            this.hatcheryPage,
            this.petPage,
            this.skillPage,
            this.rankingPage,
            this.battlePage,
            this.friendPage,
        ];

        for (const page of pages) {
            if (page) {
                page.active = false;
            }
        }
    }

    private showPage(page: Node | null) {
        this.hideAll();

        if (!page) {
            console.warn('页面节点没有绑定');
            return;
        }

        page.active = true;
    }

    private ensureRankingPanel() {
        if (!this.rankingPage) {
            console.warn('RankingPage 页面节点没有绑定');
            return;
        }

        let rankingPanel = this.rankingPage.getComponent(RankingPanel);

        if (!rankingPanel) {
            rankingPanel = this.rankingPage.addComponent(RankingPanel);
        }

        rankingPanel.refreshRanking();
    }

    private ensureBattlePanel() {
        if (!this.battlePage) {
            console.warn('BattlePage 页面节点没有绑定');
            return;
        }

        let battlePanel = this.battlePage.getComponent(BattlePanel);

        if (!battlePanel) {
            battlePanel = this.battlePage.addComponent(BattlePanel);
        }

        battlePanel.refreshBattlePage();
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

    showRanking() {
        this.showPage(this.rankingPage);
        this.ensureRankingPanel();
    }

    showBattle() {
        this.showPage(this.battlePage);
        this.ensureBattlePanel();
    }

    showFriend() {
        this.showPage(this.friendPage);
    }
}
