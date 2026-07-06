import { _decorator, Button, Component, find, Label } from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

type PetSkill = {
    id?: string;
    skillId?: string;
    name?: string;
    level?: number;
    description?: string;
    desc?: string;
    power?: number;
};

@ccclass('SkillPanel')
export class SkillPanel extends Component {
    @property(Label)
    skillListLabel: Label | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    @property(Button)
    refreshButton: Button | null = null;

    onLoad() {
        this.autoBindNodes();
        this.bindRefreshButton();
    }

    onEnable() {
        this.refreshSkillInfo();
    }

    private autoBindNodes() {
        if (!this.skillListLabel) {
            const node = find('SkillListLabel', this.node);
            this.skillListLabel = node?.getComponent(Label) || null;
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
        console.log('刷新宠物技能');
        this.refreshSkillInfo();
    }

    refreshSkillInfo() {
        const user = PlayerData.user;

        if (!user) {
            this.showEmpty('暂无玩家数据');
            return;
        }

        const pets = user.pets || [];

        if (!pets.length) {
            this.showEmpty('暂无宠物\n请先通过孵化室获得宠物');
            return;
        }

        const pet = pets[0];
        const skills: PetSkill[] = pet.skills || [];

        if (!skills.length) {
            this.showEmpty('暂无技能\n后续宠物升级后可解锁技能');
            return;
        }

        const skillText = skills
            .map((skill, index) => {
                const name = skill.name || skill.skillId || skill.id || `技能${index + 1}`;
                const level = skill.level ?? 1;
                const power = skill.power ?? 0;
                const desc = skill.description || skill.desc || '暂无描述';

                return (
                    `${index + 1}. ${name}\n` +
                    `等级：${level}\n` +
                    `威力：${power}\n` +
                    `描述：${desc}`
                );
            })
            .join('\n\n');

        this.showSkillList(skillText);
    }

    private showEmpty(message: string) {
        if (this.skillListLabel) {
            this.skillListLabel.string = '';
            this.skillListLabel.node.active = false;
        }

        if (this.emptyLabel) {
            this.emptyLabel.string = message;
            this.emptyLabel.node.active = true;
        }
    }

    private showSkillList(message: string) {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = false;
        }

        if (this.skillListLabel) {
            this.skillListLabel.string = message;
            this.skillListLabel.node.active = true;
        }
    }
}