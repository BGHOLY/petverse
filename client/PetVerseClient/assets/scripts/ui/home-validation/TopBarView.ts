import { _decorator, Component, Label, UITransform } from 'cc';
import {
    artImage,
    clearNode,
    CuteTheme,
    image,
    text,
} from '../cute/CuteUiKit';

const { ccclass, executeInEditMode } = _decorator;

@ccclass('TopBarView')
@executeInEditMode(true)
export class TopBarView extends Component {
    private goldValue: Label | null = null;
    private diamondValue: Label | null = null;

    onEnable() {
        this.render();
    }

    render() {
        const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0.5);
        transform.setContentSize(720, 140);
        clearNode(this.node);

        artImage(
            this.node,
            'TopBarArtwork',
            'ui/home-v3/top-overlay-v3',
            0,
            0,
            720,
            140,
        );

        image(
            this.node,
            'PlayerAvatar',
            'cute-ui/player_avatar',
            -296,
            1,
            72,
            72,
            CuteTheme.paperWarm,
        );
        text(
            this.node,
            'PlayerName',
            '训练师 · Lv.12',
            -248,
            18,
            160,
            30,
            19,
            CuteTheme.caramel,
            'left',
            true,
        );
        text(
            this.node,
            'PlayerProgress',
            '成长值  12 / 20',
            -248,
            -17,
            160,
            24,
            13,
            CuteTheme.muted,
            'left',
        );

        this.goldValue = text(
            this.node,
            'GoldValue',
            '12,680',
            212,
            24,
            112,
            28,
            17,
            CuteTheme.caramel,
            'center',
            true,
        );
        this.diamondValue = text(
            this.node,
            'DiamondValue',
            '320',
            212,
            -31,
            112,
            28,
            17,
            CuteTheme.caramel,
            'center',
            true,
        );
    }

    setWallet(gold: number, diamond: number) {
        if (this.goldValue) this.goldValue.string = Number(gold || 0).toLocaleString('zh-CN');
        if (this.diamondValue) this.diamondValue.string = Number(diamond || 0).toLocaleString('zh-CN');
    }
}
