import { _decorator, Component, find, Label, Node } from 'cc';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton } from './UiKit';

const { ccclass, property } = _decorator;

@ccclass('MainUI')
export class MainUI extends Component {
    @property(Label)
    nicknameLabel: Label | null = null;

    @property(Label)
    goldLabel: Label | null = null;

    @property(Label)
    diamondLabel: Label | null = null;

    @property(Label)
    petInfoLabel: Label | null = null;

    @property(PanelManager)
    panelManager: PanelManager | null = null;

    private topBar: Node | null = null;
    private pageRoot: Node | null = null;
    private bottomMenu: Node | null = null;

    onLoad() {
        this.bindLayoutNodes();
        this.bindLabels();
        this.ensurePanelManager();
        this.ensureTowerButton();
    }

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onUserUpdated);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onUserUpdated);
    }

    start() {
        this.showMainLayout();
        void this.bootstrap();
    }

    async bootstrap() {
        const seed = await ApiClient.post('/dev/seed-all', {});
        console.log('[MainUI] seed-all result:', seed);
        await this.loadUserAndPets();
        this.panelManager?.showPet();
    }

    async loadUserAndPets() {
        const userResult = await ApiClient.get('/user');
        const petResult = await ApiClient.get('/pet');
        const user = userResult?.user || userResult?.data || userResult;
        const pets = petResult?.pets || petResult?.data || [];

        PlayerData.user = {
            ...(PlayerData.user || {}),
            ...(user || {}),
            pets,
        };

        console.log('[MainUI] render top bar:', PlayerData.user);
        this.refreshUI();
    }

    refreshUI() {
        this.showMainLayout();
        const user = PlayerData.user || {
            nickname: 'PetVerse Tester',
            gold: 0,
            diamond: 0,
            pets: [],
        };

        if (this.nicknameLabel) {
            this.nicknameLabel.string = `Player: ${user.nickname || 'PetVerse Tester'}`;
        }

        if (this.goldLabel) {
            this.goldLabel.string = `Gold: ${user.gold ?? 0}`;
        }

        if (this.diamondLabel) {
            this.diamondLabel.string = `Diamond: ${user.diamond ?? 0}`;
        }

        if (this.petInfoLabel) {
            const pet = user.pets?.find((item: any) => !item.isEgg) || user.pets?.[0];
            this.petInfoLabel.string = pet
                ? `Pet: ${pet.nickname}\nLv.${pet.level}  ${pet.rarityName || pet.rarity}`
                : 'No pet';
        }
    }

    onClickInventory() {
        this.panelManager?.showInventory();
    }

    onClickShop() {
        this.panelManager?.showShop();
    }

    onClickHatchery() {
        this.panelManager?.showHatchery();
    }

    onClickPet() {
        this.panelManager?.showPet();
    }

    onClickSkill() {
        this.panelManager?.showSkill();
    }

    onClickBattle() {
        this.panelManager?.showBattle();
    }

    onClickTower() {
        this.panelManager?.showTower();
    }

    onClickFriend() {
        this.panelManager?.showFriend();
    }

    onClickRanking() {
        this.panelManager?.showRanking();
    }

    private onUserUpdated = () => {
        void this.loadUserAndPets();
    };

    private bindLayoutNodes() {
        this.topBar = find('Canvas/TopBar') || find('TopBar', this.node.parent || this.node);
        this.pageRoot = find('Canvas/PageRoot') || find('PageRoot', this.node.parent || this.node);
        this.bottomMenu = find('Canvas/BottomMenu') || find('BottomMenu', this.node.parent || this.node);
    }

    private bindLabels() {
        this.nicknameLabel = this.nicknameLabel || find('Canvas/TopBar/NicknameLabel')?.getComponent(Label) || null;
        this.goldLabel = this.goldLabel || find('Canvas/TopBar/GoldLabel')?.getComponent(Label) || null;
        this.diamondLabel = this.diamondLabel || find('Canvas/TopBar/DiamondLabel')?.getComponent(Label) || null;
    }

    private showMainLayout() {
        this.bindLayoutNodes();
        if (this.topBar) this.topBar.active = true;
        if (this.pageRoot) this.pageRoot.active = true;
        if (this.bottomMenu) this.bottomMenu.active = true;
    }

    private ensurePanelManager() {
        if (this.panelManager) {
            return;
        }

        const canvas = find('Canvas') || this.node.parent || this.node;
        this.panelManager = canvas.getComponent(PanelManager) || canvas.addComponent(PanelManager);
    }

    private ensureTowerButton() {
        this.bindLayoutNodes();
        if (!this.bottomMenu) {
            return;
        }

        getOrCreateButton(this.bottomMenu, 'TowerButton', 'Tower', 0, -118, 120, 48, () => {
            this.onClickTower();
        }, this);
    }
}
