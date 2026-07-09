import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { createButton, createInfoText, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('RankingPanel')
export class RankingPanel extends Component {
    private statusLabel: Label | null = null;
    private rankingListLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    async refreshRanking() {
        this.ensureView();
        this.setStatus('加载排行中...');
        this.setText('加载中...');

        const result = await ApiClient.get('/ranking');
        console.log('[RankingPanel] response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setText('\u6682\u65e0\u6570\u636e');
            return;
        }

        const power = normalizeList(result, ['powerRanking', 'power']);
        const level = normalizeList(result, ['levelRanking', 'level']);
        const tower = normalizeList(result, ['towerRanking', 'tower']);
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

        let text = lines.filter((line) => line !== undefined).join('\n').trim();
        const total = power.length + level.length + tower.length;
        if (!text || total === 0) {
            text = this.formatFallbackRanking(result);
        }

        this.setStatus(`\u699c\u5355\u6570\u636e: ${total}`);
        this.setText(text || '\u6682\u65e0\u6570\u636e');
        console.log('[RankingPanel] render result:', text);
    }

    private formatPetRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'} / ${item.petName || '-'}  \u6218\u529b ${item.power ?? 0}  \u5c42 ${item.highestTower ?? item.maxFloor ?? 0}`;
    }

    private formatTowerRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'}  \u5c42 ${item.highestTower ?? item.maxFloor ?? item.floor ?? 0}`;
    }

    private formatFallbackRanking(result: any) {
        const list = normalizeList(result);
        if (list.length) {
            return list.slice(0, 8).map((item: any, index: number) => {
                return `${item.rank ?? index + 1}. ${item.playerName || item.userName || item.name || '-'} / ${item.petName || '-'}  \u6218\u529b ${item.power ?? '-'}  \u5c42 ${item.highestTower ?? item.maxFloor ?? item.floor ?? '-'}`;
            }).join('\n');
        }

        if (!result || typeof result !== 'object') {
            return '';
        }

        return Object.keys(result).slice(0, 8).map((key) => {
            const value = result[key];
            if (Array.isArray(value)) {
                return `${key}: ${value.length}`;
            }
            if (value && typeof value === 'object') {
                return `${key}: ${JSON.stringify(value).slice(0, 80)}`;
            }
            return `${key}: ${value}`;
        }).join('\n');
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
