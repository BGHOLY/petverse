import { _decorator, Button, Component, find, Label } from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

type InventoryItem = {
    itemCode?: string;
    code?: string;
    name?: string;
    quantity?: number;
    count?: number;
};

@ccclass('HatcheryPanel')
export class HatcheryPanel extends Component {
    @property(Label)
    eggInfoLabel: Label | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    @property(Button)
    hatchButton: Button | null = null;

    private readonly baseUrl = 'http://127.0.0.1:3000/api';
    private eggCount = 0;

    onLoad() {
        this.autoBindNodes();
        this.bindHatchButton();
    }

    onEnable() {
        this.refreshEggInfo();
    }

    private autoBindNodes() {
        if (!this.eggInfoLabel) {
            const node = find('EggInfoLabel', this.node);
            this.eggInfoLabel = node?.getComponent(Label) || null;
        }

        if (!this.emptyLabel) {
            const node = find('EmptyLabel', this.node);
            this.emptyLabel = node?.getComponent(Label) || null;
        }

        if (!this.hatchButton) {
            const node = find('HatchButton', this.node);
            this.hatchButton = node?.getComponent(Button) || null;
        }
    }

    private bindHatchButton() {
        if (!this.hatchButton) {
            return;
        }

        this.hatchButton.node.off(Button.EventType.CLICK, this.onClickHatch, this);
        this.hatchButton.node.on(Button.EventType.CLICK, this.onClickHatch, this);
    }

    async refreshEggInfo() {
        try {
            const result = await this.apiGet('/inventory');
            const inventory = this.normalizeInventory(result);

            const eggItem = inventory.find((item) => {
                const code = item.itemCode || item.code;
                return code === 'starter_egg';
            });

            this.eggCount = eggItem?.quantity ?? eggItem?.count ?? 0;

            if (this.eggCount <= 0) {
                this.showEmpty('暂无宠物蛋\n可以后续从商店购买 starter_egg');
                return;
            }

            this.showEggInfo(
                `宠物蛋：starter_egg\n` +
                `数量：${this.eggCount}\n\n` +
                `当前版本暂未开放正式孵化\n` +
                `后续点击开始孵化后会消耗 1 个宠物蛋并生成宠物`
            );
        } catch (error) {
            console.error('加载宠物蛋失败:', error);
            this.showEmpty('宠物蛋信息加载失败');
        }
    }

    onClickHatch() {
        if (this.eggCount <= 0) {
            console.log('没有宠物蛋，无法孵化');
            this.showEmpty('暂无宠物蛋\n请先去商店购买宠物蛋');
            return;
        }

        console.log('点击开始孵化，后续这里会请求后端孵化接口');
        this.showEggInfo(
            `检测到宠物蛋数量：${this.eggCount}\n\n` +
            `孵化功能后续开放\n` +
            `下一阶段会接入真正的孵化接口`
        );
    }

    private normalizeInventory(result: any): InventoryItem[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.inventory)) {
            return result.inventory;
        }

        if (Array.isArray(result?.items)) {
            return result.items;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        return [];
    }

    private showEmpty(message: string) {
        if (this.eggInfoLabel) {
            this.eggInfoLabel.string = '';
            this.eggInfoLabel.node.active = false;
        }

        if (this.emptyLabel) {
            this.emptyLabel.string = message;
            this.emptyLabel.node.active = true;
        }

        if (this.hatchButton) {
            this.hatchButton.node.active = false;
        }
    }

    private showEggInfo(message: string) {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = false;
        }

        if (this.eggInfoLabel) {
            this.eggInfoLabel.string = message;
            this.eggInfoLabel.node.active = true;
        }

        if (this.hatchButton) {
            this.hatchButton.node.active = true;
        }
    }

    private async apiGet(path: string) {
        const response = await fetch(this.baseUrl + path, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        return this.parseResponse(response);
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (PlayerData.token) {
            headers.Authorization = `Bearer ${PlayerData.token}`;
        }

        return headers;
    }

    private async parseResponse(response: Response) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw data || new Error(`HTTP ${response.status}`);
        }

        return data;
    }
}