import { _decorator, Component, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    ADVENTURE_PAGE_BG,
    CREAM,
    GOLD,
    TEXT_GREEN,
    TEXT_NAVY,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    createProgressBar,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('TowerPanel')
export class TowerPanel extends Component {
    private statusLabel: Label | null = null;
    private infoLabel: Label | null = null;
    private logLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    async refreshTower() {
        this.ensureView();
        await Promise.all([
            GameStore.loadTower(),
            GameStore.loadPets(),
        ]);
        this.render();
    }

    async challengeTower() {
        const pet = PlayerData.getCurrentPet();
        const result = await ApiClient.post('/tower/challenge', { petId: pet?.id });

        if (result?.success === false) {
            this.setStatus(`挑战失败: ${result.message || ''}`);
            this.setLog('暂无战斗日志');
            return;
        }

        ToastManager.show(result?.result === 'win' ? '挑战成功' : '挑战失败');
        if (result.user) PlayerData.setUser(result.user);
        if (result.pet) PlayerData.updatePet(result.pet);
        await Promise.all([
            GameStore.loadUser(),
            GameStore.loadPets(),
            GameStore.loadTower(),
        ]);
        this.setLog(this.formatChallengeResult(result));
        this.render();
    }

    private ensureView() {
        createPageBackground(this.node, '爬塔', ADVENTURE_PAGE_BG);
        createPanel(this.node, 'TowerInfoCard', 0, 170, 640, 360, CREAM, CREAM, 28, 0);
        createLabel(this.node, 'TowerTitle', '星塔试炼', -230, 310, 160, 42, 24, TEXT_GREEN);
        this.statusLabel = createLabel(this.node, 'TowerStatusLabel', '', -210, 260, 220, 38, 22, TEXT_NAVY);
        this.infoLabel = createInfoText(this.node, 'TowerInfoLabel', '', -300, 220, 600, 220, 19);
        createProgressBar(this.node, 'TowerPageProgress', -120, 95, 360, 14, 0.2, GOLD);

        createPanel(this.node, 'BattleLogCard', 0, -190, 640, 390, CREAM, CREAM, 24, 0);
        createLabel(this.node, 'BattleLogTitle', '挑战结果', -230, -26, 160, 38, 22, TEXT_GREEN);
        this.logLabel = createInfoText(this.node, 'TowerLogLabel', '', -300, -72, 600, 260, 16);

        createButton(this.node, 'RefreshTowerButton', '刷新状态', -170, -410, 180, 52, () => this.refreshTower(), this);
        createButton(this.node, 'ChallengeTowerButton', '挑战当前层', 170, -410, 200, 52, () => this.challengeTower(), this);
    }

    private render() {
        const tower = PlayerData.tower || {};
        const record = tower.record || {};
        const floor = tower.currentFloor ?? record.currentFloor ?? 1;
        const maxFloor = tower.maxFloor ?? record.maxFloor ?? 0;
        const monster = tower.monster || {};
        const reward = tower.rewardPreview || tower.reward || {};
        const pet = PlayerData.getCurrentPet();
        const petPower = this.calculatePetPower(pet);
        const recommendedPower = this.calculateMonsterPower(monster, floor);

        this.setStatus(`当前第 ${floor} 层`);
        this.setInfo([
            `历史最高：${maxFloor} 层`,
            `推荐战力：${recommendedPower}    当前宠物战力：${petPower}`,
            `当前宠物：${pet?.nickname || '未选择'} Lv.${pet?.level ?? 1}`,
            `守层怪物：${monster.name || '未知'}  HP ${monster.hp ?? monster.maxHp ?? 0}  ATK ${monster.attack ?? 0}`,
            `奖励预览：金币 ${reward.gold ?? 0}  经验 ${reward.exp ?? 0}  钻石 ${reward.diamond ?? 0}`,
        ].join('\n'));
    }

    private formatChallengeResult(result: any) {
        const reward = result?.reward || {};
        const lines = Array.isArray(result?.battleLog) ? result.battleLog.slice(0, 8) : [];
        return [
            `结果：${result?.result === 'win' ? '胜利' : '失败'}  第 ${result?.floor ?? '-'} 层`,
            `奖励：金币 ${reward.gold ?? 0}  经验 ${reward.exp ?? 0}  钻石 ${reward.diamond ?? 0}`,
            '',
            ...lines,
        ].join('\n').trim();
    }

    private calculatePetPower(pet: any) {
        if (!pet) return 0;
        return Math.round(
            Number(pet.hp || 0) +
            Number(pet.attack || 0) * 5 +
            Number(pet.defense || 0) * 3 +
            Number(pet.speed || pet.agility || 0) * 2 +
            Number(pet.rarity || 1) * 100 +
            Number(pet.level || 1) * 20,
        );
    }

    private calculateMonsterPower(monster: any, floor: number) {
        const value = Math.round(
            Number(monster.hp || monster.maxHp || 0) +
            Number(monster.attack || 0) * 5 +
            Number(monster.defense || 0) * 3 +
            Number(monster.speed || 0) * 2,
        );
        return value || Number(floor || 1) * 430;
    }

    private setStatus(text: string) {
        if (this.statusLabel) this.statusLabel.string = text;
    }

    private setInfo(text: string) {
        if (this.infoLabel) this.infoLabel.string = text;
    }

    private setLog(text: string) {
        if (this.logLabel) this.logLabel.string = text;
    }
}
