import {
    _decorator,
    Button,
    Component,
    Label,
    Node,
} from 'cc';

import {
    BattleTacticsPreset,
    DEFAULT_BATTLE_TACTICS,
    SkillStrategy,
    SurvivalStrategy,
    TargetStrategy,
} from '../data/BattleTactics';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';

const { ccclass, property } = _decorator;

@ccclass('BattleTacticsPanel')
export class BattleTacticsPanel extends Component {
    @property({ type: Node, displayName: '目标策略容器' })
    targetStrategyContainer: Node | null = null;

    @property({ type: Node, displayName: '技能策略容器' })
    skillStrategyContainer: Node | null = null;

    @property({ type: Node, displayName: '生存策略容器' })
    survivalStrategyContainer: Node | null = null;

    @property({ type: Button, displayName: '保存按钮' })
    saveButton: Button | null = null;

    @property({ type: Button, displayName: '重置按钮' })
    resetButton: Button | null = null;

    @property({ type: Label, displayName: '策略说明' })
    descriptionLabel: Label | null = null;

    @property({ type: Node, displayName: '加载状态' })
    loadingNode: Node | null = null;

    preset: BattleTacticsPreset = { ...DEFAULT_BATTLE_TACTICS };

    onLoad() {
        this.saveButton?.node.on(Button.EventType.CLICK, this.save, this);
        this.resetButton?.node.on(Button.EventType.CLICK, this.reset, this);
        this.warnMissingBindings();
    }

    onEnable() {
        void this.refresh();
    }

    onDestroy() {
        this.saveButton?.node.off(Button.EventType.CLICK, this.save, this);
        this.resetButton?.node.off(Button.EventType.CLICK, this.reset, this);
    }

    setTargetStrategy(value: TargetStrategy) {
        this.preset.targetStrategy = value;
        this.renderDescription();
    }

    setSkillStrategy(value: SkillStrategy) {
        this.preset.skillStrategy = value;
        this.renderDescription();
    }

    setSurvivalStrategy(value: SurvivalStrategy) {
        this.preset.survivalStrategy = value;
        this.renderDescription();
    }

    private async refresh() {
        if (this.loadingNode) this.loadingNode.active = true;
        const result = await ApiClient.get<{ preset: BattleTacticsPreset }>('/battle/tactics/preset');
        if (this.loadingNode) this.loadingNode.active = false;
        if (result.success === false) {
            ToastManager.show(result.message || '战术读取失败');
            return;
        }
        this.preset = { ...DEFAULT_BATTLE_TACTICS, ...(result.preset || {}) };
        this.renderDescription();
    }

    private async save() {
        const result = await ApiClient.put('/battle/tactics/preset', {
            preset: this.preset,
        });
        ToastManager.show(result.success === false ? result.message || '战术保存失败' : '战术已保存');
    }

    private reset() {
        this.preset = { ...DEFAULT_BATTLE_TACTICS };
        this.renderDescription();
    }

    private renderDescription() {
        if (!this.descriptionLabel) return;
        this.descriptionLabel.string = [
            `目标：${this.preset.targetStrategy}`,
            `技能：${this.preset.skillStrategy}`,
            `生存：${this.preset.survivalStrategy}`,
        ].join('\n');
    }

    private warnMissingBindings() {
        const missing = [
            ['targetStrategyContainer', this.targetStrategyContainer],
            ['skillStrategyContainer', this.skillStrategyContainer],
            ['survivalStrategyContainer', this.survivalStrategyContainer],
            ['saveButton', this.saveButton],
            ['resetButton', this.resetButton],
        ].filter(([, value]) => !value).map(([name]) => name);
        if (missing.length) {
            console.warn(`[BattleTacticsPanel] Inspector bindings missing: ${missing.join(', ')}`);
        }
    }
}
