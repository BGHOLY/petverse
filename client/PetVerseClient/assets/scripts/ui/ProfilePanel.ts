import { _decorator, Component, find, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import {
    CREAM,
    SOFT_BG,
    TEXT_GREEN,
    TEXT_NAVY,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('ProfilePanel')
export class ProfilePanel extends Component {
    private infoLabel: Label | null = null;
    private router: PanelManager | null = null;

    onLoad() {
        this.ensureView();
    }

    async refreshProfile() {
        this.ensureView();
        await Promise.all([
            GameStore.loadUser(),
            GameStore.loadPets(),
            GameStore.loadInventory(),
            GameStore.loadTower(),
        ]);
        this.renderInfo();
    }

    private ensureView() {
        createPageBackground(this.node, '我的', SOFT_BG);
        const card = createPanel(this.node, 'ProfileCard', 0, 215, 640, 300, CREAM, CREAM, 28, 0);
        createLabel(card, 'ProfileTitle', '玩家资料', -220, 105, 160, 42, 24, TEXT_GREEN);
        this.infoLabel = createInfoText(card, 'ProfileInfo', '', -280, 58, 560, 210, 20);

        const entryPanel = createPanel(this.node, 'ProfileEntryPanel', 0, -185, 640, 420, CREAM, CREAM, 24, 0);
        createLabel(entryPanel, 'EntryTitle', '功能入口', -220, 168, 160, 36, 22, TEXT_NAVY);

        const entries = [
            { name: 'InventoryEntry', text: '背包', x: -205, y: 70, action: () => this.router?.showInventory() },
            { name: 'ShopEntry', text: '商店', x: 0, y: 70, action: () => this.router?.showShop() },
            { name: 'MarriageEntry', text: '婚姻', x: 205, y: 70, action: () => this.router?.showMarriage() },
            { name: 'FriendEntry', text: '好友', x: -205, y: -35, action: () => this.router?.showFriend() },
            { name: 'TowerEntry', text: '爬塔', x: 0, y: -35, action: () => this.router?.showTower() },
            { name: 'RankingEntry', text: '排行', x: 205, y: -35, action: () => this.router?.showRanking() },
        ];

        this.router = this.router || find('Canvas')?.getComponent(PanelManager) || null;
        entries.forEach((entry) => createButton(entryPanel, entry.name, entry.text, entry.x, entry.y, 160, 72, entry.action, this, false, 21));
    }

    private renderInfo() {
        if (!this.infoLabel) return;
        const user = PlayerData.user || {};
        const pet = PlayerData.getCurrentPet();
        const tower = PlayerData.tower || {};
        this.infoLabel.string = [
            `昵称：${user.nickname || 'PetLover'}`,
            `等级：Lv.${user.level ?? 1}    VIP：${user.vipLevel ?? user.vip ?? 0}`,
            `金币：${user.gold ?? 0}    钻石：${user.diamond ?? 0}`,
            `当前宠物：${pet?.nickname || '未选择'}  Lv.${pet?.level ?? 1}`,
            `爬塔：当前 ${tower.currentFloor ?? tower.record?.currentFloor ?? 1} 层，最高 ${tower.maxFloor ?? tower.record?.maxFloor ?? 0} 层`,
        ].join('\n');
    }
}
