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
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

const TXT_ADVENTURE = '\u5192\u9669';

@ccclass('AdventurePanel')
export class AdventurePanel extends Component {
    private rankingLabel: Label | null = null;
    private towerLabel: Label | null = null;

    onLoad() { this.ensureView(); }

    async refreshAdventurePage() {
        this.ensureView();
        await this.loadTowerPreview();
        await this.loadRankingPreview();
    }

    private ensureView() {
        createPageBackground(this.node, TXT_ADVENTURE, ADVENTURE_PAGE_BG);

        const panelW = 200;
        const panelH = 460;
        const y = 180;

        createPanel(this.node, 'BattleEntryPanel', -220, y, panelW, panelH);
        createLabel(this.node, 'BattleEntryTitle', '\u597d\u53cb\u5bf9\u6218', -220, y + 175, panelW - 24, 32, 18);
        createInfoText(this.node, 'BattleEntryDesc', '\u6311\u6218\u597d\u53cb\u5ba0\u7269\u3002\n\u6d4b\u8bd5\u7248\u5148\u4f7f\u7528\u540e\u7aef\u6a21\u62df\u6218\u6597\u3002', -300, y + 78, 160, 130, 13);
        createButton(this.node, 'StartBattleButton', '\u5bf9\u6218', -220, y - 170, 150, 46, () => {
            void this.challengeFriend();
        }, this, false, 15);

        createPanel(this.node, 'TowerEntryPanel', 0, y, panelW, panelH);
        createLabel(this.node, 'TowerEntryTitle', '\u722c\u5854', 0, y + 175, panelW - 24, 32, 18);
        this.towerLabel = createInfoText(this.node, 'TowerEntryDesc', '\u5f53\u524d\u5c42\u6570\u52a0\u8f7d\u4e2d...', -80, y + 78, 160, 130, 13);
        createButton(this.node, 'StartTowerButton', '\u6311\u6218', 0, y - 170, 150, 46, () => {
            void this.challengeTower();
        }, this, false, 15);

        createPanel(this.node, 'RankingEntryPanel', 220, y, panelW, panelH);
        createLabel(this.node, 'RankingEntryTitle', '\u6392\u884c\u699c', 220, y + 175, panelW - 24, 32, 18);
        this.rankingLabel = createInfoText(this.node, 'RankingPreviewLabel', '\u52a0\u8f7d\u4e2d...', 140, y + 78, 160, 130, 13);
        createButton(this.node, 'OpenRankingButton', '\u5237\u65b0', 220, y - 170, 150, 46, () => {
            void this.loadRankingPreview();
        }, this, false, 15);
    }

    private async challengeFriend() {
        const result = await ApiClient.post('/battle/friend', {});
        const success = result?.success !== false;
        ToastManager.show(success ? '\u597d\u53cb\u5bf9\u6218\u5df2\u8fd4\u56de\u6218\u62a5' : `\u5bf9\u6218\u5931\u8d25:${result?.message || ''}`);
    }

    private async challengeTower() {
        const result = await ApiClient.post('/tower/challenge', {});
        const success = result?.success !== false;
        ToastManager.show(success ? '\u722c\u5854\u6311\u6218\u5df2\u5b8c\u6210' : `\u722c\u5854\u5931\u8d25:${result?.message || ''}`);
        await this.loadTowerPreview();
        await this.loadRankingPreview();
    }

    private async loadTowerPreview() {
        const result = await ApiClient.get('/tower/status');
        if (!this.towerLabel) return;

        const floor = result?.currentFloor ?? result?.floor ?? result?.data?.currentFloor ?? 1;
        const best = result?.highestFloor ?? result?.bestFloor ?? result?.data?.highestFloor ?? floor;
        this.towerLabel.string = `\u5f53\u524d\u5c42:${floor}\n\u6700\u9ad8\u5c42:${best}\n\u70b9\u51fb\u6311\u6218\u8fdb\u884c\u722c\u5854`;
    }

    private async loadRankingPreview() {
        const result = await ApiClient.get('/ranking');
        const list = normalizeList(result, ['rankings', 'ranking', 'data', 'items']);

        if (!this.rankingLabel) return;

        if (!list.length) {
            this.rankingLabel.string = '\u6682\u65e0\u6392\u884c\u6570\u636e\n\u5148\u8fdb\u884c\u6218\u6597\u6216\u722c\u5854';
            return;
        }

        this.rankingLabel.string = list.slice(0, 5).map((item: any, index: number) => {
            return `${index + 1}.${item.nickname || item.playerName || '\u73a9\u5bb6'}\n${item.score ?? item.power ?? ''}`;
        }).join('\n');
    }
}
