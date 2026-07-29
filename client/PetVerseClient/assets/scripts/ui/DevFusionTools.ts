import {
    _decorator,
    Button,
    Component,
    Label,
    Node,
} from 'cc';
import { DEV } from 'cc/env';

import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';

const { ccclass, property } = _decorator;

@ccclass('DevFusionTools')
export class DevFusionTools extends Component {
    @property({ type: Node, displayName: '开发工具根节点' })
    devRoot: Node | null = null;

    @property({ type: Button, displayName: '生成炼妖测试宠物按钮' })
    seedButton: Button | null = null;

    @property({ type: Label, displayName: '验证结果' })
    resultLabel: Label | null = null;

    onLoad() {
        const visible = Boolean(DEV);
        if (this.devRoot) this.devRoot.active = visible;
        this.seedButton?.node.on(Button.EventType.CLICK, this.seedFusionPets, this);
        if (!this.seedButton) {
            console.warn('[DevFusionTools] Inspector binding missing: seedButton');
        }
    }

    onDestroy() {
        this.seedButton?.node.off(Button.EventType.CLICK, this.seedFusionPets, this);
    }

    private async seedFusionPets() {
        if (!DEV) {
            ToastManager.show('该功能仅在开发环境可用');
            return;
        }
        if (this.seedButton) this.seedButton.interactable = false;
        const result = await ApiClient.post<any>('/dev/seed-fusion-pets');
        if (this.seedButton) this.seedButton.interactable = true;
        if (result.success === false) {
            ToastManager.show(result.message || '炼妖测试宠物生成失败');
            return;
        }
        const validation = result.validation || result.summary || {};
        if (this.resultLabel) {
            this.resultLabel.string = [
                `变异：${Number(validation.mutantCount ?? result.mutantCount ?? 0)}`,
                `普通：${Number(validation.normalCount ?? result.normalCount ?? 0)}`,
                `物种：${Number(validation.speciesCount ?? result.speciesCount ?? 0)}`,
            ].join('　');
        }
        ToastManager.show(result.message || '炼妖测试宠物已准备完成');
    }
}
