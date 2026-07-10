import { _decorator, Component, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import { createButton, createInfoText, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

const { ccclass } = _decorator;

@ccclass('HatcheryPanel')
export class HatcheryPanel extends Component {
    private statusLabel: Label | null = null;
    private eggInfoLabel: Label | null = null;
    private eggs: any[] = [];
    private hatching = false;

    onLoad() {
        this.ensureView();
    }

    async refreshEggInfo() {
        this.ensureView();
        this.setStatus('加载蛋列表中...');
        this.setText('加载中...');

        const result = await ApiClient.get('/hatchery/eggs');
        const eggs = normalizeList(result, ['eggs']);
        this.eggs = eggs;
        PlayerData.eggs = eggs;

        if (result?.success === false) {
            this.setStatus(`加载失败: ${result.message || '未知错误'}`);
            this.setText('暂无数据');
            return;
        }

        this.setStatus(`蛋数量: ${eggs.length}`);

        if (!eggs.length) {
            this.setText('暂无宠物蛋\n可以先在婚姻页创建婚姻并产蛋。');
            return;
        }

        this.renderEggs();
        this.startCountdown();
    }

    async layEgg() {
        const result = await ApiClient.post('/marriage/lay-egg', {});
        ToastManager.show(result?.success ? `产蛋成功: #${result.egg?.id}` : `产蛋失败: ${result?.message || ''}`);
        await Promise.all([
            GameStore.loadMarriage(),
            this.refreshEggInfo(),
        ]);
    }

    async hatchFirstEgg() {
        if (this.hatching) return;
        this.hatching = true;
        const eggResult = await ApiClient.get('/hatchery/eggs');
        const eggs = normalizeList(eggResult, ['eggs']);
        const egg = eggs.find((item: any) => item.status === 'unhatched' && Number(item.remainingSeconds || 0) <= 0) ||
            eggs.find((item: any) => item.status === 'unhatched');

        if (!egg) {
            this.hatching = false;
            this.setStatus('暂无可孵化的蛋');
            return;
        }

        const result = await ApiClient.post('/hatchery/hatch', { eggId: egg.id });

        if (result?.pet) {
            PlayerData.updatePet(result.pet);
            UIEventCenter.emit('USER_UPDATED');
        }

        ToastManager.show(result?.success ? `孵化成功: ${result.pet?.nickname || '新宠物'}` : `孵化失败: ${result?.message || ''}`);
        this.hatching = false;
        await this.refreshEggInfo();
    }

    private ensureView() {
        createPageTitle(this.node, '孵化');
        this.statusLabel = createStatusLabel(this.node, 'HatcheryStatusLabel');
        this.eggInfoLabel = createInfoText(this.node, 'EggInfoLabel', '', -300, 300, 600, 520, 18);
        createButton(this.node, 'LayEggButton', '产蛋', -210, -390, 150, 52, () => this.layEgg(), this);
        createButton(this.node, 'HatchButton', '孵化', 0, -390, 150, 52, () => this.hatchFirstEgg(), this);
        createButton(this.node, 'RefreshEggButton', '刷新蛋列表', 210, -390, 170, 52, () => this.refreshEggInfo(), this);
    }

    private renderEggs() {
        this.setText(this.eggs.slice(-8).map((egg: any) => this.formatEggLine(egg)).join('\n'));
    }

    private startCountdown() {
        this.unschedule(this.tickCountdown);
        this.schedule(this.tickCountdown, 1);
    }

    private tickCountdown = () => {
        if (!this.eggs.length) return;
        let changed = false;
        this.eggs = this.eggs.map((egg) => {
            const previous = Number(egg.remainingSeconds || 0);
            const remainingSeconds = Math.max(0, previous - 1);
            if (remainingSeconds !== previous) changed = true;
            return {
                ...egg,
                remainingSeconds,
                canHatch: remainingSeconds <= 0 && egg.status === 'unhatched',
            };
        });
        if (changed) this.renderEggs();
    };

    private formatEggLine(egg: any) {
        const seconds = Number(egg.remainingSeconds || 0);
        const status = egg.status === 'hatched' ? '已孵化' : seconds <= 0 ? '可孵化' : `${seconds}秒`;
        return `蛋 #${egg.id}  潜力 ${egg.rarityPotential ?? egg.rarity ?? '-'}  ${status}`;
    }

    private setStatus(text: string) {
        if (this.statusLabel) this.statusLabel.string = text;
    }

    private setText(text: string) {
        if (this.eggInfoLabel) this.eggInfoLabel.string = text;
    }
}
