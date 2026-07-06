import { _decorator, Button, Component, find, Label } from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('PetPanel')
export class PetPanel extends Component {
    @property(Label)
    petInfoLabel: Label | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    @property(Button)
    refreshButton: Button | null = null;

    private readonly baseUrl = 'http://127.0.0.1:3000/api';

    onLoad() {
        this.autoBindNodes();
        this.bindRefreshButton();
    }

    onEnable() {
        this.loadPetsFromServer();
    }

    private autoBindNodes() {
        if (!this.petInfoLabel) {
            const node = find('PetInfoLabel', this.node);
            this.petInfoLabel = node?.getComponent(Label) || null;
        }

        if (!this.emptyLabel) {
            const node = find('EmptyLabel', this.node);
            this.emptyLabel = node?.getComponent(Label) || null;
        }

        if (!this.refreshButton) {
            const node = find('RefreshButton', this.node);
            this.refreshButton = node?.getComponent(Button) || null;
        }
    }

    private bindRefreshButton() {
        if (!this.refreshButton) {
            return;
        }

        this.refreshButton.node.off(Button.EventType.CLICK, this.onClickRefresh, this);
        this.refreshButton.node.on(Button.EventType.CLICK, this.onClickRefresh, this);
    }

    onClickRefresh() {
        console.log('刷新宠物信息');
        this.loadPetsFromServer();
    }

    private async loadPetsFromServer() {
        try {
            const result = await this.apiGet('/pet/my');
            const pets = this.normalizePets(result);

            if (PlayerData.user) {
                PlayerData.user.pets = pets;
            }

            this.refreshPetInfo();
        } catch (error) {
            console.error('加载宠物信息失败:', error);
            this.refreshPetInfo();
        }
    }

    refreshPetInfo() {
        const user = PlayerData.user;

        if (!user) {
            this.showEmpty('暂无玩家数据');
            return;
        }

        const pets = user.pets || [];

        if (!pets.length) {
            this.showEmpty('暂无宠物\n可以去孵化室孵化 starter_egg');
            return;
        }

        const pet = pets.find((item: any) => !item.isEgg) || pets[0];

        const name = pet.nickname || pet.name || '未命名宠物';
        const species = pet.species || pet.type || '未知种类';
        const level = pet.level ?? 1;
        const exp = pet.exp ?? pet.experience ?? 0;
        const hp = pet.hp ?? 100;
        const attack = pet.attack ?? 0;
        const defense = pet.defense ?? 0;
        const hunger = pet.hunger ?? 0;
        const happiness = pet.happiness ?? 0;
        const cleanliness = pet.cleanliness ?? 0;
        const stamina = pet.stamina ?? 0;
        const rarity = pet.rarityName || pet.rarity || '普通';

        const text =
            `宠物名称：${name}\n` +
            `种类：${species}\n` +
            `等级：${level}\n` +
            `经验：${exp}/100\n` +
            `稀有度：${rarity}\n\n` +
            `生命：${hp}\n` +
            `攻击：${attack}\n` +
            `防御：${defense}\n\n` +
            `饥饿：${hunger}\n` +
            `快乐：${happiness}\n` +
            `清洁：${cleanliness}\n` +
            `体力：${stamina}`;

        this.showPetInfo(text);
    }

    private normalizePets(result: any): any[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.pets)) {
            return result.pets;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        return [];
    }

    private showEmpty(message: string) {
        if (this.petInfoLabel) {
            this.petInfoLabel.string = '';
            this.petInfoLabel.node.active = false;
        }

        if (this.emptyLabel) {
            this.emptyLabel.string = message;
            this.emptyLabel.node.active = true;
        }
    }

    private showPetInfo(message: string) {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = false;
        }

        if (this.petInfoLabel) {
            this.petInfoLabel.string = message;
            this.petInfoLabel.node.active = true;
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
