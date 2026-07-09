import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { createButton, createLabel, createPageTitle, createStatusLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('BattlePanel')
export class BattlePanel extends Component {
    private statusLabel: Label | null = null;
    private battleInfoLabel: Label | null = null;
    private battleLogLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    refreshBattlePage() {
        this.ensureView();
        this.setStatus('加载对战页中...');
        this.setInfo('加载中...');
        this.setLog('');
        this.setStatus('\u9009\u62e9\u4e00\u79cd\u5bf9\u6218');
        this.setInfo('\u666e\u901a\u602a\u7269\u5bf9\u6218\u6216\u597d\u53cb\u5ba0\u7269\u5bf9\u6218');
        this.setLog('\u6218\u6597\u65e5\u5fd7\u4f1a\u663e\u793a\u5728\u8fd9\u91cc');
        console.log('[BattlePanel] render result: ready');
    }

    async onClickPveBattle() {
        this.setStatus('普通怪物对战中...');
        const result = await ApiClient.post('/battle/pve', {});
        console.log('[BattlePanel] pve result:', result);
        this.renderBattleResult(result);
    }

    async onClickFriendBattle() {
        this.setStatus('好友宠物对战中...');
        const result = await ApiClient.post('/battle/friend', {});
        console.log('[BattlePanel] friend result:', result);
        this.renderBattleResult(result);
    }

    private renderBattleResult(result: any) {
        if (result?.success === false) {
            this.setStatus(`\u5bf9\u6218\u5931\u8d25: ${result.message || ''}`);
            this.setInfo('\u6682\u65e0\u6570\u636e');
            this.setLog('');
            return;
        }

        this.setStatus(result?.result || result?.winner || '\u5bf9\u6218\u5b8c\u6210');
        this.setInfo(
            `\u6a21\u5f0f: ${result?.mode || '-'}\n` +
            `\u7ed3\u679c: ${result?.result || '-'}\n` +
            `\u80dc\u8005: ${result?.winner || '-'}`,
        );
        this.setLog(this.formatLog(result?.battleLog));
        console.log('[BattlePanel] render result:', result?.battleLog);
    }

    private ensureView() {
        createPageTitle(this.node, '\u5bf9\u6218');
        this.statusLabel = createStatusLabel(this.node, 'BattleStatusLabel');
        this.battleInfoLabel = createLabel(this.node, 'BattleInfoLabel', '', 0, 225, 620, 110, 22);
        this.battleLogLabel = createLabel(this.node, 'BattleLogLabel', '', 0, -35, 620, 350, 18);
        createButton(this.node, 'PveBattleButton', '\u666e\u901a\u602a\u7269\u5bf9\u6218', -160, -330, 220, 52, () => {
            void this.onClickPveBattle();
        }, this);
        createButton(this.node, 'FriendBattleButton', '\u597d\u53cb\u5ba0\u7269\u5bf9\u6218', 160, -330, 220, 52, () => {
            void this.onClickFriendBattle();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
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
            return '\u6682\u65e0\u6218\u6597\u65e5\u5fd7';
        }

        return log.slice(0, 10).join('\n');
    }
}
