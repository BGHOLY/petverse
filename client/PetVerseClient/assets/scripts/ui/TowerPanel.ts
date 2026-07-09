import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('TowerPanel')
export class TowerPanel extends Component {
    private infoLabel: Label | null = null;
    private logLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.refreshTower();
    }

    async refreshTower() {
        this.ensureView();
        const result = await ApiClient.get('/tower/status');
        console.log('[TowerPanel] render status:', result);
        const monster = result?.monster || {};
        const reward = result?.rewardPreview || {};
        this.setInfo(
            `Tower Floor: ${result?.currentFloor ?? 1}\n` +
            `Highest: ${result?.maxFloor ?? 0}\n\n` +
            `Monster: ${monster.name || '-'}\n` +
            `HP ${monster.hp ?? monster.maxHp ?? 0}  ATK ${monster.attack ?? 0}\n` +
            `DEF ${monster.defense ?? 0}  SPD ${monster.speed ?? 0}\n\n` +
            `Reward: Gold ${reward.gold ?? 0}, Exp ${reward.exp ?? 0}, Diamond ${reward.diamond ?? 0}`,
        );
    }

    async challengeTower() {
        const result = await ApiClient.post('/tower/challenge', {});
        console.log('[TowerPanel] challenge result:', result);
        const reward = result?.reward || {};
        this.setLog(
            `Result: ${result?.result || '-'}\n` +
            `Reward: Gold ${reward.gold ?? 0}, Exp ${reward.exp ?? 0}, Diamond ${reward.diamond ?? 0}\n\n` +
            this.formatLog(result?.battleLog),
        );
        await this.refreshTower();
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Tower';
        this.infoLabel = getOrCreateLabel(this.node, 'TowerInfoLabel', -300, 280, 600, 260, 22);
        this.logLabel = getOrCreateLabel(this.node, 'TowerLogLabel', -300, -90, 600, 330, 18);
        getOrCreateButton(this.node, 'RefreshTowerButton', 'Refresh', -150, -360, 180, 56, () => {
            void this.refreshTower();
        }, this);
        getOrCreateButton(this.node, 'ChallengeTowerButton', 'Challenge', 150, -360, 180, 56, () => {
            void this.challengeTower();
        }, this);
    }

    private setInfo(text: string) {
        if (this.infoLabel) {
            this.infoLabel.string = text;
        }
    }

    private setLog(text: string) {
        if (this.logLabel) {
            this.logLabel.string = text;
        }
    }

    private formatLog(log: string[] | undefined) {
        if (!Array.isArray(log) || !log.length) {
            return 'No battle log yet.';
        }

        return log.slice(-12).join('\n');
    }
}
