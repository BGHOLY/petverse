import {
    _decorator,
    Button,
    Component,
    Label,
    Node,
} from 'cc';

import { ExpeditionManager } from '../manager/ExpeditionManager';
import { ExpeditionMapCode } from '../network/ExpeditionApi';
import { ToastManager } from './ToastManager';

const { ccclass, property } = _decorator;

@ccclass('ExpeditionPanel')
export class ExpeditionPanel extends Component {
    @property({ type: Node, displayName: '地图容器' })
    mapContainer: Node | null = null;

    @property({ type: Node, displayName: '时长容器' })
    durationContainer: Node | null = null;

    @property({ type: Node, displayName: '宠物选择容器' })
    petSelectionContainer: Node | null = null;

    @property({ type: Button, displayName: '开始远征按钮' })
    startButton: Button | null = null;

    @property({ type: Node, displayName: '进行中远征容器' })
    activeExpeditionContainer: Node | null = null;

    @property({ type: Label, displayName: '剩余时间' })
    remainingTimeLabel: Label | null = null;

    @property({ type: Button, displayName: '领取按钮' })
    claimButton: Button | null = null;

    @property({ type: Node, displayName: '奖励容器' })
    rewardContainer: Node | null = null;

    @property({ type: Node, displayName: '历史容器' })
    historyContainer: Node | null = null;

    @property({ type: Node, displayName: '加载状态' })
    loadingNode: Node | null = null;

    @property({ type: Node, displayName: '空状态' })
    emptyNode: Node | null = null;

    selectedMap: ExpeditionMapCode = 'forest';
    selectedDurationMinutes = 30;
    selectedPetIds: number[] = [];

    private unsubscribe: (() => void) | null = null;
    private countdownAccumulator = 0;

    onLoad() {
        this.startButton?.node.on(Button.EventType.CLICK, this.onStartClick, this);
        this.claimButton?.node.on(Button.EventType.CLICK, this.onClaimClick, this);
        this.unsubscribe = ExpeditionManager.instance.subscribe(() => this.renderData());
        this.warnMissingBindings();
    }

    onEnable() {
        void ExpeditionManager.instance.refresh();
    }

    onDestroy() {
        this.startButton?.node.off(Button.EventType.CLICK, this.onStartClick, this);
        this.claimButton?.node.off(Button.EventType.CLICK, this.onClaimClick, this);
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    update(deltaTime: number) {
        this.countdownAccumulator += deltaTime;
        if (this.countdownAccumulator < 1) return;
        this.countdownAccumulator = 0;
        this.renderCountdown();
    }

    setSelection(
        mapCode: ExpeditionMapCode,
        durationMinutes: number,
        petIds: number[],
    ) {
        this.selectedMap = mapCode;
        this.selectedDurationMinutes = durationMinutes;
        this.selectedPetIds = [...new Set(petIds.map(Number).filter(Boolean))].slice(0, 5);
        this.renderData();
    }

    private async onStartClick() {
        const result = await ExpeditionManager.instance.start(
            this.selectedMap,
            this.selectedDurationMinutes,
            this.selectedPetIds,
        );
        ToastManager.show(result?.success === false ? result.message || '远征开始失败' : '远征已经开始');
    }

    private async onClaimClick() {
        const ready = ExpeditionManager.instance.active.find((entry) => entry.ready);
        if (!ready) {
            ToastManager.show('当前没有可领取的远征');
            return;
        }
        const result = await ExpeditionManager.instance.claim(ready.id);
        ToastManager.show(result?.success === false ? result.message || '领取失败' : '远征奖励已领取');
    }

    private renderData() {
        const manager = ExpeditionManager.instance;
        if (this.loadingNode) this.loadingNode.active = manager.loading;
        if (this.emptyNode) this.emptyNode.active = !manager.loading && manager.active.length === 0;
        if (this.activeExpeditionContainer) {
            this.activeExpeditionContainer.active = manager.active.length > 0;
        }
        const first = manager.active[0];
        this.renderCountdown();
        if (this.claimButton) this.claimButton.interactable = Boolean(first?.ready);
        const errorMessage = manager.takeErrorMessage();
        if (errorMessage) ToastManager.show(errorMessage);
    }

    private renderCountdown() {
        if (!this.remainingTimeLabel) return;
        const first = ExpeditionManager.instance.active[0];
        if (!first) {
            this.remainingTimeLabel.string = '暂无远征';
            return;
        }
        const remainingSeconds = first.endsAt
            ? Math.max(0, Math.ceil((new Date(first.endsAt).getTime() - Date.now()) / 1000))
            : Math.max(0, Number(first.remainingSeconds || 0));
        const ready = first.ready || remainingSeconds <= 0;
        this.remainingTimeLabel.string = ready ? '可领取' : this.formatDuration(remainingSeconds);
        if (this.claimButton) this.claimButton.interactable = ready;
    }

    private formatDuration(totalSeconds: number) {
        const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remain = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
    }

    private warnMissingBindings() {
        const missing = [
            ['mapContainer', this.mapContainer],
            ['durationContainer', this.durationContainer],
            ['petSelectionContainer', this.petSelectionContainer],
            ['startButton', this.startButton],
            ['activeExpeditionContainer', this.activeExpeditionContainer],
            ['claimButton', this.claimButton],
        ].filter(([, value]) => !value).map(([name]) => name);
        if (missing.length) {
            console.warn(`[ExpeditionPanel] Inspector bindings missing: ${missing.join(', ')}`);
        }
    }
}
