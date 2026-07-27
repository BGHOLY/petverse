import { _decorator, Component, UITransform } from 'cc';
import {
    button,
    clearNode,
    CuteTheme,
    panel,
} from '../cute/CuteUiKit';

const { ccclass, executeInEditMode } = _decorator;

type MainTabKey = 'home' | 'pet' | 'adventure' | 'hatchery' | 'shop';

@ccclass('BottomNavigationView')
@executeInEditMode(true)
export class BottomNavigationView extends Component {
    private selected: MainTabKey = 'home';

    onEnable() {
        this.render();
    }

    render() {
        const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0.5);
        transform.setContentSize(720, 205);
        clearNode(this.node);

        panel(
            this.node,
            'NavigationSurface',
            0,
            -8,
            704,
            174,
            CuteTheme.paperWarm,
            34,
            true,
            CuteTheme.white,
            3,
        );

        const tabs: Array<{
            key: MainTabKey;
            title: string;
            icon: string;
            x: number;
            width: number;
            height: number;
        }> = [
            { key: 'home', title: '首页', icon: '屋', x: -282, width: 108, height: 132 },
            { key: 'pet', title: '宠物', icon: '宠', x: -142, width: 108, height: 132 },
            { key: 'adventure', title: '冒险', icon: '险', x: 0, width: 140, height: 158 },
            { key: 'hatchery', title: '孵化', icon: '孵', x: 142, width: 108, height: 132 },
            { key: 'shop', title: '商店', icon: '店', x: 282, width: 108, height: 132 },
        ];

        tabs.forEach((tab) => {
            button(
                this.node,
                `Tab_${tab.key}`,
                tab.title,
                tab.x,
                tab.key === 'adventure' ? 1 : -9,
                tab.width,
                tab.height,
                () => {
                    this.selected = tab.key;
                    this.render();
                },
                {
                    icon: tab.icon,
                    selected: this.selected === tab.key,
                    fill: tab.key === 'adventure' ? CuteTheme.honey : CuteTheme.paper,
                    fontSize: 17,
                    radius: tab.key === 'adventure' ? 36 : 28,
                    border: CuteTheme.white,
                },
            );
        });
    }
}
