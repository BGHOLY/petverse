import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { createButton, createInfoText, createPageTitle, createStatusLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('RankingPanel')
export class RankingPanel extends Component {
    private statusLabel: Label | null = null;
    private rankingListLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.refreshRanking();
    }

    async refreshRanking() {
        this.ensureView();
        const result = await ApiClient.get('/ranking');
        console.log('[RankingPanel] response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setText('\u6682\u65e0\u6570\u636e');
            return;
        }

        const power = result?.powerRanking || result?.power || result?.list || [];
        const level = result?.levelRanking || result?.level || [];
        const tower = result?.towerRanking || result?.tower || [];
        const lines = [
            '\u6218\u529b\u699c',
            ...power.slice(0, 4).map((item: any) => this.formatPetRank(item)),
            '',
            '\u7b49\u7ea7\u699c',
            ...level.slice(0, 3).map((item: any) => this.formatPetRank(item)),
            '',
            '\u722c\u5854\u699c',
            ...tower.slice(0, 4).map((item: any) => this.formatTowerRank(item)),
        ];

        const text = lines.filter((line) => line !== undefined).join('\n');
        this.setStatus(`\u699c\u5355\u6570\u636e: ${power.length + level.length + tower.length}`);
        this.setText(text.trim() || '\u6682\u65e0\u6570\u636e');
        console.log('[RankingPanel] render result:', text);
    }

    private formatPetRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'} / ${item.petName || '-'}  \u6218\u529b ${item.power ?? 0}  \u5c42 ${item.highestTower ?? item.maxFloor ?? 0}`;
    }

    private formatTowerRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'}  \u5c42 ${item.highestTower ?? item.maxFloor ?? item.floor ?? 0}`;
    }

    private ensureView() {
        createPageTitle(this.node, '\u6392\u884c');
        this.statusLabel = createStatusLabel(this.node, 'RankingStatusLabel');
        this.rankingListLabel = createInfoText(this.node, 'RankingListLabel', '');
        createButton(this.node, 'RefreshRankingButton', '\u5237\u65b0\u6392\u884c', 0, -330, 190, 52, () => {
            void this.refreshRanking();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setText(text: string) {
        if (this.rankingListLabel) {
            this.rankingListLabel.string = text;
        }
    }
}
