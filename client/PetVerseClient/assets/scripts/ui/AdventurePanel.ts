import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    ADVENTURE_PAGE_BG,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    getPageLayout,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('AdventurePanel')
export class AdventurePanel extends Component {
    private rankingLabel: Label | null = null;

    onLoad() { this.ensureView(); }

    async refreshAdventurePage() {
        this.ensureView();
        await this.loadRankingPreview();
    }

    private ensureView() {
        const layout = createPageBackground(this.node, '冒险', ADVENTURE_PAGE_BG);

        const cardW = Math.floor((layout.pageW - 58) / 3);
        const topY = layout.top - 260;
        const x1 = layout.left + 24 + cardW / 2;
        const x2 = x1 + cardW + 12;
        const x3 = x2 + cardW + 12;

        createPanel(this.node, 'BattleEntryPanel', x1, topY, cardW, 430);
        createLabel(this.node, 'BattleEntryTitle', '好友对战', x1, topY + 160, cardW - 20, 28, 18);
        createInfoText(this.node, 'BattleEntryDesc', '挑战好友宠物。\n获得金币和积分。\n后续接入战斗动画。', x1, topY + 35, cardW - 26, 160, 12);
        createButton(this.node, 'StartBattleButton', '开始', x1, topY - 160, cardW - 28, 38, () => {
            ToastManager.show('好友对战下一步接入');
        }, this, false, 13);

        createPanel(this.node, 'TowerEntryPanel', x2, topY, cardW, 430);
        createLabel(this.node, 'TowerEntryTitle', '爬塔', x2, topY + 160, cardW - 20, 28, 18);
        createInfoText(this.node, 'TowerEntryDesc', '挑战更高层数。\n获得药水、金币、技能书。', x2, topY + 35, cardW - 26, 160, 12);
        createButton(this.node, 'StartTowerButton', '挑战', x2, topY - 160, cardW - 28, 38, () => {
            ToastManager.show('爬塔战斗下一步接入');
        }, this, false, 13);

        createPanel(this.node, 'RankingEntryPanel', x3, topY, cardW, 430);
        createLabel(this.node, 'RankingEntryTitle', '排行榜', x3, topY + 160, cardW - 20, 28, 18);
        this.rankingLabel = createInfoText(this.node, 'RankingPreviewLabel', '加载中...', x3, topY + 35, cardW - 26, 160, 12);
        createButton(this.node, 'OpenRankingButton', '查看', x3, topY - 160, cardW - 28, 38, () => {
            ToastManager.show('排行榜完整页下一步接入');
        }, this, false, 13);
    }

    private async loadRankingPreview() {
        const result = await ApiClient.get('/ranking');
        const list = normalizeList(result, ['rankings', 'ranking', 'data', 'items']);

        if (!this.rankingLabel) return;

        if (!list.length) {
            this.rankingLabel.string = '暂无排行数据\n先进行战斗或爬塔';
            return;
        }

        this.rankingLabel.string = list.slice(0, 5).map((item: any, index: number) => {
            return `${index + 1}.${item.nickname || item.playerName || '玩家'}\n${item.score ?? item.power ?? ''}`;
        }).join('\n');
    }
}
