import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { createButton, createLabel, createPageTitle, createStatusLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('TowerPanel')
export class TowerPanel extends Component {
    private statusLabel: Label | null = null;
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
        console.log('[TowerPanel] status response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setInfo('\u6682\u65e0\u6570\u636e');
            return;
        }

        const monster = result?.monster || {};
        const reward = result?.rewardPreview || result?.reward || {};
        this.setStatus(`\u5f53\u524d\u5c42\u6570: ${result?.currentFloor ?? result?.floor ?? 1}`);
        this.setInfo(
            `\u6700\u9ad8\u5c42: ${result?.highestFloor ?? result?.maxFloor ?? 0}\n` +
            `\u602a\u7269: ${monster.name || '-'}\n` +
            `HP ${monster.hp ?? monster.maxHp ?? 0}  ATK ${monster.attack ?? 0}\n` +
            `DEF ${monster.defense ?? 0}  SPD ${monster.speed ?? 0}\n` +
            `\u5956\u52b1: \u91d1\u5e01 ${reward.gold ?? 0}, \u7ecf\u9a8c ${reward.exp ?? 0}, \u94bb\u77f3 ${reward.diamond ?? 0}`,
        );
        console.log('[TowerPanel] render result:', monster);
    }

    async challengeTower() {
        const result = await ApiClient.post('/tower/challenge', {});
        console.log('[TowerPanel] challenge result:', result);

        if (result?.success === false) {
            this.setStatus(`\u6311\u6218\u5931\u8d25: ${result.message || ''}`);
            this.setLog('\u6682\u65e0\u6218\u6597\u65e5\u5fd7');
            return;
        }

        const reward = result?.reward || {};
        this.setLog(
            `\u7ed3\u679c: ${result?.result || '-'}\n` +
            `\u5956\u52b1: \u91d1\u5e01 ${reward.gold ?? 0}, \u7ecf\u9a8c ${reward.exp ?? 0}, \u94bb\u77f3 ${reward.diamond ?? 0}\n` +
            this.formatLog(result?.battleLog),
        );
        await this.refreshTower();
    }

    private ensureView() {
        createPageTitle(this.node, '\u722c\u5854');
        this.statusLabel = createStatusLabel(this.node, 'TowerStatusLabel');
        this.infoLabel = createLabel(this.node, 'TowerInfoLabel', '', 0, 220, 620, 150, 22);
        this.logLabel = createLabel(this.node, 'TowerLogLabel', '', 0, -65, 620, 320, 18);
        createButton(this.node, 'RefreshTowerButton', '\u5237\u65b0', -160, -330, 180, 52, () => {
            void this.refreshTower();
        }, this);
        createButton(this.node, 'ChallengeTowerButton', '\u6311\u6218', 160, -330, 180, 52, () => {
            void this.challengeTower();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
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
            return '\u6682\u65e0\u6218\u6597\u65e5\u5fd7';
        }

        return log.slice(0, 10).join('\n');
    }
}
