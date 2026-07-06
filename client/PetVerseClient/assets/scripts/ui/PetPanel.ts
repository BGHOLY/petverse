import { _decorator, Button, Component, Label } from 'cc';
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

    onEnable() {
        this.refreshPetInfo();
    }

    onClickRefresh() {
        this.refreshPetInfo();
    }

    refreshPetInfo() {
        const pet = PlayerData.user?.pets?.[0] || null;

        if (!pet) {
            if (this.petInfoLabel) {
                this.petInfoLabel.string = '';
                this.petInfoLabel.node.active = false;
            }

            if (this.emptyLabel) {
                this.emptyLabel.node.active = true;
            }

            return;
        }

        if (this.emptyLabel) {
            this.emptyLabel.node.active = false;
        }

        if (this.petInfoLabel) {
            this.petInfoLabel.node.active = true;
            this.petInfoLabel.string = [
                `名称：${pet.nickname || pet.name || '未命名'}`,
                `等级：${pet.level ?? 1}`,
                `经验：${pet.exp ?? 0}`,
                `饥饿：${pet.hunger ?? 0}`,
                `快乐：${pet.happiness ?? 0}`,
                `体力：${pet.stamina ?? 0}`,
                `稀有度：${pet.rarityName || pet.rarity || '普通'}`,
            ].join('\n');
        }
    }
}
