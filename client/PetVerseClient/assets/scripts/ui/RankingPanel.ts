import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('RankingPanel')
export class RankingPanel extends Component {
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
        console.log('[RankingPanel] ranking:', result);
        const power = result?.powerRanking || result?.list || [];
        const level = result?.levelRanking || [];
        const tower = result?.towerRanking || [];

        const text = [
            'Power Ranking',
            ...power.slice(0, 5).map((item: any) => this.formatPetRank(item)),
            '',
            'Level Ranking',
            ...level.slice(0, 3).map((item: any) => this.formatPetRank(item)),
            '',
            'Tower Ranking',
            ...tower.slice(0, 5).map((item: any) => `${item.rank}. ${item.playerName}  Floor ${item.highestTower ?? item.maxFloor ?? 0}`),
        ].join('\n');

        console.log('[RankingPanel] render result:', text);
        this.setText(text || 'No ranking data.');
    }

    private formatPetRank(item: any) {
        return `${item.rank}. ${item.playerName} / ${item.petName}  Power ${item.power}  Floor ${item.highestTower ?? 0}`;
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Ranking';
        this.rankingListLabel = getOrCreateLabel(this.node, 'RankingListLabel', -300, 285, 600, 610, 19);
        getOrCreateButton(this.node, 'RefreshRankingButton', 'Refresh Ranking', 0, -360, 240, 56, () => {
            void this.refreshRanking();
        }, this);
    }

    private setText(text: string) {
        if (this.rankingListLabel) {
            this.rankingListLabel.string = text;
        }
    }
}
