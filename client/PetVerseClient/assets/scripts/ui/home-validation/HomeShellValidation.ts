import { _decorator, Component, Graphics, Node, UITransform } from 'cc';
import {
    artImage,
    clearNode,
    getOrCreate,
    setRect,
} from '../cute/CuteUiKit';
import { BottomNavigationView } from './BottomNavigationView';
import { HomePageView } from './HomePageView';
import { TopBarView } from './TopBarView';

const { ccclass, executeInEditMode } = _decorator;

const LAYERS = [
    'BackgroundLayer',
    'Pet3DLayer',
    'MainHudLayer',
    'PageLayer',
    'PopupLayer',
    'ToastLayer',
    'GuideLayer',
    'LoadingLayer',
] as const;

@ccclass('HomeShellValidation')
@executeInEditMode(true)
export class HomeShellValidation extends Component {
    onEnable() {
        this.buildOnce();
    }

    private buildOnce() {
        setRect(this.node, 0, 0, 720, 1280);
        const transform = this.node.getComponent(UITransform);
        transform?.setAnchorPoint(0.5, 0.5);

        const layers = new Map<string, Node>();
        LAYERS.forEach((name, index) => {
            const layer = getOrCreate(this.node, name);
            setRect(layer, 0, 0, 720, 1280);
            layer.setSiblingIndex(index);
            layers.set(name, layer);
        });

        this.buildBackground(layers.get('BackgroundLayer')!);
        this.buildPetStage(layers.get('Pet3DLayer')!);
        this.buildHud(layers.get('MainHudLayer')!);
        this.buildPage(layers.get('PageLayer')!);
    }

    private buildBackground(layer: Node) {
        clearNode(layer);
        layer.getComponent(Graphics)?.clear();

        // The room artwork is the only page background. It deliberately runs
        // underneath the fixed HUD so no second page panel is required.
        artImage(
            layer,
            'HomeRoomBackground',
            'ui/home-v3/home-room-v3',
            0,
            -5,
            720,
            1010,
        );
    }

    private buildPetStage(layer: Node) {
        clearNode(layer);
        const stage = getOrCreate(layer, 'HomePetAnchor');
        setRect(stage, 0, 24, 410, 410);

        // This is a real project asset, not a fake 3D treatment. Pet3DLayer and
        // HomePetAnchor remain stable so a future model can replace only this node.
        artImage(
            stage,
            'PetArtwork2DFallback',
            'pet-art/PET001/home',
            0,
            0,
            390,
            390,
        );
    }

    private buildHud(layer: Node) {
        const topBar = getOrCreate(layer, 'TopBar');
        setRect(topBar, 0, 570, 720, 140);
        const topBarView = topBar.getComponent(TopBarView) || topBar.addComponent(TopBarView);
        topBarView.render();

        const bottomNavigation = getOrCreate(layer, 'BottomNavigation');
        setRect(bottomNavigation, 0, -537.5, 720, 205);
        const bottomNavigationView = bottomNavigation.getComponent(BottomNavigationView)
            || bottomNavigation.addComponent(BottomNavigationView);
        bottomNavigationView.render();
    }

    private buildPage(layer: Node) {
        const homePage = getOrCreate(layer, 'HomePage');
        setRect(homePage, 0, -5, 720, 1010);
        const homePageView = homePage.getComponent(HomePageView) || homePage.addComponent(HomePageView);
        homePageView.render();
    }
}
