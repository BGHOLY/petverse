import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('BattlePanel')
export class BattlePanel extends Component {
    private battleInfoLabel: Label | null = null;
    private battleLogLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        this.refreshBattlePage();
    }

    refreshBattlePage() {
        this.ensureView();
        this.setInfo('Choose PVE or Friend Battle.');
        this.setLog('Battle log will appear here.');
        console.log('[BattlePanel] render result: ready');
    }

    async onClickPveBattle() {
        const result = await ApiClient.post('/battle/pve', {});
        console.log('[BattlePanel] pve result:', result);
        this.renderBattleResult(result);
    }

    async onClickFriendBattle() {
        const result = await ApiClient.post('/battle/friend', {});
        console.log('[BattlePanel] friend result:', result);
        this.renderBattleResult(result);
    }

    private renderBattleResult(result: any) {
        this.setInfo(
            `Mode: ${result?.mode || '-'}\n` +
            `Result: ${result?.result || '-'}\n` +
            `Winner: ${result?.winner || '-'}`,
        );
        this.setLog(this.formatLog(result?.battleLog));
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Battle';
        this.battleInfoLabel = getOrCreateLabel(this.node, 'BattleInfoLabel', -300, 285, 600, 120, 22);
        this.battleLogLabel = getOrCreateLabel(this.node, 'BattleLogLabel', -300, 120, 600, 430, 18);
        getOrCreateButton(this.node, 'PveBattleButton', 'PVE Battle', -150, -360, 180, 56, () => {
            void this.onClickPveBattle();
        }, this);
        getOrCreateButton(this.node, 'FriendBattleButton', 'Friend Battle', 150, -360, 200, 56, () => {
            void this.onClickFriendBattle();
        }, this);
    }

    private setInfo(text: string) {
        if (this.battleInfoLabel) {
            this.battleInfoLabel.string = text;
        }
    }

    private setLog(text: string) {
        if (this.battleLogLabel) {
            this.battleLogLabel.string = text;
        }
    }

    private formatLog(log: string[] | undefined) {
        if (!Array.isArray(log) || !log.length) {
            return 'No battle log.';
        }

        return log.slice(-15).join('\n');
    }
}
