import { _decorator, Component, Node, UITransform } from 'cc';
import {
    artImage,
    button,
    clearNode,
    CuteTheme,
    hitArea,
    image,
    panel,
    setRect,
    text,
} from '../cute/CuteUiKit';

const { ccclass, executeInEditMode } = _decorator;

@ccclass('HomePageView')
@executeInEditMode(true)
export class HomePageView extends Component {
    onEnable() {
        this.render();
    }

    render() {
        const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0.5);
        transform.setContentSize(720, 1010);
        clearNode(this.node);

        this.buildShortcuts();
        this.buildNameplate();
        this.buildTeamStrip();

        button(this.node, 'AdventureCTA', '开始冒险', 0, -396, 270, 54, () => undefined, {
            fill: CuteTheme.green,
            textColor: CuteTheme.white,
            fontSize: 20,
            radius: 27,
            border: CuteTheme.white,
        });
    }

    private buildShortcuts() {
        const left = new Node('LeftEntryColumn');
        this.node.addChild(left);
        setRect(left, -294, 168, 112, 190);
        button(left, 'MainQuestEntry', '主线任务', 0, 48, 108, 78, () => undefined, {
            icon: '任',
            fill: CuteTheme.paperWarm,
            fontSize: 15,
            radius: 24,
            border: CuteTheme.white,
        });
        button(left, 'ActivityEntry', '活动', 0, -48, 108, 78, () => undefined, {
            icon: '活',
            fill: CuteTheme.peach,
            fontSize: 16,
            radius: 24,
            border: CuteTheme.white,
        });

        const right = new Node('RightEntryColumn');
        this.node.addChild(right);
        setRect(right, 294, 122, 112, 286);
        button(right, 'FriendEntry', '好友', 0, 96, 108, 76, () => undefined, {
            icon: '友',
            fill: CuteTheme.sky,
            fontSize: 16,
            radius: 24,
            border: CuteTheme.white,
        });
        button(right, 'BondEntry', '羁绊', 0, 0, 108, 76, () => undefined, {
            icon: '缘',
            fill: CuteTheme.pink,
            fontSize: 16,
            radius: 24,
            border: CuteTheme.white,
        });
        button(right, 'MailEntry', '邮件', 0, -96, 108, 76, () => undefined, {
            icon: '邮',
            fill: CuteTheme.mint,
            fontSize: 16,
            radius: 24,
            border: CuteTheme.white,
        });
    }

    private buildNameplate() {
        const nameplate = new Node('PetNameplate');
        this.node.addChild(nameplate);
        setRect(nameplate, 0, -205, 240, 120);
        artImage(
            nameplate,
            'NameplateArtwork',
            'ui/home-v4/pet-nameplate-v4',
            0,
            0,
            240,
            120,
        );
        text(
            nameplate,
            'PetName',
            '焰尾灵狐',
            0,
            14,
            188,
            32,
            22,
            CuteTheme.caramel,
            'center',
            true,
        );
        text(
            nameplate,
            'PetMeta',
            '火系 · 输出型 · Lv.12',
            0,
            -15,
            190,
            24,
            13,
            CuteTheme.muted,
        );
        text(
            nameplate,
            'DisplayPetTag',
            '展示主宠',
            0,
            -37,
            120,
            20,
            11,
            CuteTheme.peachDark,
            'center',
            true,
        );
    }

    private buildTeamStrip() {
        const team = panel(
            this.node,
            'TeamStrip',
            0,
            -290,
            520,
            88,
            CuteTheme.paper,
            30,
            true,
            CuteTheme.white,
            3,
        );
        text(team, 'TeamTitle', '出战阵容', -236, 0, 78, 28, 14, CuteTheme.caramel, 'left', true);

        for (let index = 0; index < 5; index += 1) {
            const petId = `PET${String(index + 1).padStart(3, '0')}`;
            const slot = image(
                team,
                `PetSlot_${index + 1}`,
                `pet-art/${petId}/thumb`,
                -142 + index * 74,
                0,
                62,
                62,
                index === 0 ? CuteTheme.honey : CuteTheme.paperWarm,
            );
            hitArea(slot, 'SelectPet', 0, 0, 62, 62, () => undefined);
        }
    }
}
