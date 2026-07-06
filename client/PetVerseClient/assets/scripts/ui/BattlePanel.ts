import {
    _decorator,
    Button,
    Component,
    find,
    Label,
    Node,
    UITransform,
} from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('BattlePanel')
export class BattlePanel extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    @property(Label)
    battleInfoLabel: Label | null = null;

    @property(Label)
    battleLogLabel: Label | null = null;

    @property(Button)
    startBattleButton: Button | null = null;

    @property(Button)
    refreshButton: Button | null = null;

    onLoad() {
        this.ensureView();
        this.bindButtons();
    }

    onEnable() {
        this.refreshBattlePage();
    }

    refreshBattlePage() {
        this.ensureView();

        const user = PlayerData.user;

        if (!user) {
            this.setInfo('暂无玩家数据');
            this.setLog('请先登录后再进入对战室。');
            this.setStartButtonActive(false);
            return;
        }

        const pet = user.pets?.[0];

        if (!pet) {
            this.setInfo('暂无出战宠物');
            this.setLog('请先通过孵化室获得宠物，后续才能进入对战。');
            this.setStartButtonActive(false);
            return;
        }

        const petName = pet.nickname || pet.name || '未命名宠物';
        const level = pet.level ?? 1;
        const hunger = pet.hunger ?? 0;
        const happiness = pet.happiness ?? 0;
        const power = this.calculatePetPower(pet);

        this.setInfo(
            `出战宠物：${petName}\n` +
            `等级：${level}\n` +
            `饥饿：${hunger}\n` +
            `快乐：${happiness}\n` +
            `当前战力：${power}`
        );

        this.setLog('点击“开始匹配”可以进行一次前端模拟战斗。\n后续会接入真实后端对战接口。');
        this.setStartButtonActive(true);
    }

    onClickStartBattle() {
        const user = PlayerData.user;
        const pet = user?.pets?.[0];

        if (!pet) {
            this.refreshBattlePage();
            return;
        }

        const petName = pet.nickname || pet.name || '未命名宠物';
        const playerPower = this.calculatePetPower(pet);
        const enemyPower = 80 + Math.floor(Math.random() * 80);
        const isWin = playerPower >= enemyPower;

        const resultText = isWin ? '胜利' : '失败';
        const rewardText = isWin ? '模拟奖励：金币 +20' : '本次没有奖励';

        this.setLog(
            `匹配到对手：野生训练师\n` +
            `${petName} 战力：${playerPower}\n` +
            `对手战力：${enemyPower}\n\n` +
            `战斗结果：${resultText}\n` +
            `${rewardText}\n\n` +
            `当前只是前端模拟，不会真正修改金币或宠物数据。`
        );
    }

    onClickRefresh() {
        this.refreshBattlePage();
    }

    private calculatePetPower(pet: any): number {
        const level = pet.level ?? 1;
        const hunger = pet.hunger ?? 0;
        const happiness = pet.happiness ?? 0;
        const exp = pet.exp ?? pet.experience ?? 0;

        return level * 100 + hunger + happiness + Math.floor(exp / 10);
    }

    private ensureView() {
        this.titleLabel = this.getOrCreateLabel('TitleLabel', '对战室', 0, 330, 32, 600, 60);
        this.battleInfoLabel = this.getOrCreateLabel('BattleInfoLabel', '', 0, 150, 24, 600, 240);
        this.battleLogLabel = this.getOrCreateLabel('BattleLogLabel', '', 0, -130, 22, 620, 300);
        this.startBattleButton = this.getOrCreateButton('StartBattleButton', '开始匹配', -130, -360);
        this.refreshButton = this.getOrCreateButton('RefreshButton', '刷新', 130, -360);
    }

    private bindButtons() {
        if (this.startBattleButton) {
            this.startBattleButton.node.off(Button.EventType.CLICK, this.onClickStartBattle, this);
            this.startBattleButton.node.on(Button.EventType.CLICK, this.onClickStartBattle, this);
        }

        if (this.refreshButton) {
            this.refreshButton.node.off(Button.EventType.CLICK, this.onClickRefresh, this);
            this.refreshButton.node.on(Button.EventType.CLICK, this.onClickRefresh, this);
        }
    }

    private getOrCreateLabel(
        nodeName: string,
        defaultText: string,
        x: number,
        y: number,
        fontSize: number,
        width: number,
        height: number,
    ): Label {
        let labelNode = find(nodeName, this.node);

        if (!labelNode) {
            labelNode = new Node(nodeName);
            this.node.addChild(labelNode);
        }

        let transform = labelNode.getComponent(UITransform);
        if (!transform) {
            transform = labelNode.addComponent(UITransform);
        }
        transform.setContentSize(width, height);
        labelNode.setPosition(x, y);

        let label = labelNode.getComponent(Label);
        if (!label) {
            label = labelNode.addComponent(Label);
        }

        if (!label.string) {
            label.string = defaultText;
        }

        label.fontSize = fontSize;
        label.lineHeight = fontSize + 10;

        return label;
    }

    private getOrCreateButton(nodeName: string, text: string, x: number, y: number): Button {
        let buttonNode = find(nodeName, this.node);

        if (!buttonNode) {
            buttonNode = new Node(nodeName);
            this.node.addChild(buttonNode);
        }

        let transform = buttonNode.getComponent(UITransform);
        if (!transform) {
            transform = buttonNode.addComponent(UITransform);
        }
        transform.setContentSize(220, 60);
        buttonNode.setPosition(x, y);

        let button = buttonNode.getComponent(Button);
        if (!button) {
            button = buttonNode.addComponent(Button);
        }

        let labelNode = find('Label', buttonNode);

        if (!labelNode) {
            labelNode = new Node('Label');
            buttonNode.addChild(labelNode);
        }

        let labelTransform = labelNode.getComponent(UITransform);
        if (!labelTransform) {
            labelTransform = labelNode.addComponent(UITransform);
        }
        labelTransform.setContentSize(220, 60);
        labelNode.setPosition(0, 0);

        let label = labelNode.getComponent(Label);
        if (!label) {
            label = labelNode.addComponent(Label);
        }

        label.string = text;
        label.fontSize = 24;
        label.lineHeight = 32;

        return button;
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

    private setStartButtonActive(active: boolean) {
        if (this.startBattleButton) {
            this.startBattleButton.node.active = active;
        }
    }
}
