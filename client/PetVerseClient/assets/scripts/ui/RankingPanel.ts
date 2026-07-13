import { _decorator, Component, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
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
    normalizeList,
} from './UiKit';

const MAX_LEVEL_RANKS = 3;

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
        await GameStore.loadRanking();
        this.render();
    }

    private ensureView() {
        createPageBackground(this.node, '排行', SOFT_BG);
        createPanel(this.node, 'RankingCard', 0, 0, 640, 780, CREAM, CREAM, 28, 0);
        createLabel(this.node, 'RankingTitle', '爬塔排行榜', -220, 360, 180, 42, 24, TEXT_GREEN);
        this.statusLabel = createLabel(this.node, 'RankingStatusLabel', '', 190, 360, 240, 34, 18, TEXT_NAVY);
        this.rankingListLabel = createInfoText(this.node, 'RankingListLabel', '', -300, 305, 600, 600, 18);
        createButton(this.node, 'RefreshRankingButton', '刷新排行', 0, -410, 190, 52, () => this.refreshRanking(), this);
    }

    private render() {
        const result = PlayerData.ranking || {};
        const tower = normalizeList(result, ['towerRanking', 'tower']);
        const power = normalizeList(result, ['powerRanking', 'power']);
        const level = normalizeList(result, ['levelRanking', 'level']);
        const lines = [
            '爬塔榜',
            ...tower.slice(0, 8).map((item: any) => this.formatTowerRank(item)),
            '',
            '战力榜',
            ...power.slice(0, 4).map((item: any) => this.formatPetRank(item)),
            '',
            '等级榜',
            ...level.slice(0, MAX_LEVEL_RANKS).map((item: any) => this.formatPetRank(item)),
        ];

        const total = tower.length + power.length + level.length;
        this.setStatus(`共 ${total} 条`);
        this.setText(lines.filter(Boolean).join('\n').trim() || '暂无排行数据');
    }

    private formatPetRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'} / ${item.petName || '-'}  战力 ${item.power ?? 0}  层 ${item.highestTower ?? item.maxFloor ?? 0}`;
    }

    private formatTowerRank(item: any) {
        return `${item.rank}. ${item.playerName || item.userName || '-'}  最高 ${item.highestTower ?? item.maxFloor ?? item.floor ?? 0} 层`;
    }

    private setStatus(text: string) {
        if (this.statusLabel) this.statusLabel.string = text;
    }

    private setText(text: string) {
        if (this.rankingListLabel) this.rankingListLabel.string = text;
    }
}
