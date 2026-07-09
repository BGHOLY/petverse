import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { createButton, createInfoText, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('HatcheryPanel')
export class HatcheryPanel extends Component {
    private statusLabel: Label | null = null;
    private eggInfoLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    async refreshEggInfo() {
        this.ensureView();
        this.setStatus('加载蛋列表中...');
        this.setText('加载中...');

        const result = await ApiClient.get('/hatchery/eggs');
        const eggs = normalizeList(result, ['eggs']);
        console.log('[HatcheryPanel] response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setText('\u6682\u65e0\u6570\u636e');
            return;
        }

        this.setStatus(`\u86cb\u6570\u91cf: ${eggs.length}`);

        if (!eggs.length) {
            this.setText('\u6682\u65e0\u6570\u636e\n\u53ef\u4ee5\u5148\u5728\u597d\u53cb\u9875\u7ed3\u5a5a\uff0c\u7136\u540e\u56de\u6765\u751f\u86cb\u3002');
            console.log('[HatcheryPanel] render result: empty');
            return;
        }

        const lines = eggs.slice(-8).map((egg: any) => {
            return `\u86cb #${egg.id}  \u6f5c\u529b ${egg.rarityPotential}  \u72b6\u6001 ${egg.status}`;
        });
        this.setText(lines.join('\n'));
        console.log('[HatcheryPanel] render result:', lines);
    }

    async layEgg() {
        const result = await ApiClient.post('/marriage/lay-egg', {});
        console.log('[HatcheryPanel] lay egg result:', result);
        this.setStatus(result?.success ? `\u751f\u86cb\u6210\u529f: #${result.egg?.id}` : `\u751f\u86cb\u5931\u8d25: ${result?.message || ''}`);
        await this.refreshEggInfo();
    }

    async hatchFirstEgg() {
        const eggResult = await ApiClient.get('/hatchery/eggs');
        const eggs = normalizeList(eggResult, ['eggs']);
        const egg = eggs.find((item: any) => item.status === 'unhatched');

        if (!egg) {
            this.setStatus('\u6682\u65e0\u53ef\u5b75\u5316\u7684\u86cb');
            return;
        }

        const result = await ApiClient.post('/hatchery/hatch', { eggId: egg.id });
        console.log('[HatcheryPanel] hatch result:', result);

        if (result?.pet) {
            PlayerData.updatePet(result.pet);
            UIEventCenter.emit('USER_UPDATED');
        }

        this.setStatus(result?.success ? `\u5b75\u5316\u6210\u529f: ${result.pet?.nickname}` : `\u5b75\u5316\u5931\u8d25: ${result?.message || ''}`);
        await this.refreshEggInfo();
    }

    private ensureView() {
        createPageTitle(this.node, '\u5b75\u5316');
        this.statusLabel = createStatusLabel(this.node, 'HatcheryStatusLabel');
        this.eggInfoLabel = createInfoText(this.node, 'EggInfoLabel', '');
        createButton(this.node, 'LayEggButton', '\u751f\u86cb', -210, -330, 150, 52, () => {
            void this.layEgg();
        }, this);
        createButton(this.node, 'HatchButton', '\u5b75\u5316', 0, -330, 150, 52, () => {
            void this.hatchFirstEgg();
        }, this);
        createButton(this.node, 'RefreshEggButton', '\u5237\u65b0\u86cb\u5217\u8868', 210, -330, 170, 52, () => {
            void this.refreshEggInfo();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setText(text: string) {
        if (this.eggInfoLabel) {
            this.eggInfoLabel.string = text;
        }
    }
}
