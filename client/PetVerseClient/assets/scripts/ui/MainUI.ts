import { _decorator, Button, Color, Component, find, Label, Node, UITransform, Vec3 } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import { PanelManager } from '../manager/PanelManager';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    CREAM,
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    GOLD,
    GOLD_LIGHT,
    MINT,
    MINT_DARK,
    NAVY,
    SOFT_BG,
    SOFT_LINE,
    TEXT_GREEN,
    TEXT_MUTED,
    TEXT_NAVY,
    WHITE,
    clearChildren,
    createButton,
    createCircleCard,
    createLabel,
    createPanel,
    createPill,
    createProgressBar,
    createSoftCard,
    drawCircle,
    ensureTransform,
    getOrCreateNode,
} from './UiKit';

const { ccclass, property } = _decorator;

@ccclass('MainUI')
export class MainUI extends Component {
    @property(Label) nicknameLabel: Label | null = null;
    @property(Label) goldLabel: Label | null = null;
    @property(Label) diamondLabel: Label | null = null;
    @property(Label) vipLabel: Label | null = null;
    @property(PanelManager) panelManager: PanelManager | null = null;

    private canvas: Node | null = null;
    private appRoot: Node | null = null;
    private topBar: Node | null = null;
    private pageViewport: Node | null = null;
    private homePage: Node | null = null;
    private pageRoot: Node | null = null;
    private floatingActions: Node | null = null;
    private bottomNavigation: Node | null = null;
    private loadingLayer: Node | null = null;
    private modalLayer: Node | null = null;

    private levelLabel: Label | null = null;
    private titleFloorLabel: Label | null = null;
    private towerMetaLabel: Label | null = null;
    private petNameLabel: Label | null = null;
    private petLevelLabel: Label | null = null;
    private taskTitleLabel: Label | null = null;
    private taskProgressLabel: Label | null = null;
    private challengeLabel: Label | null = null;
    private powerHintLabel: Label | null = null;
    private loadingText: Label | null = null;
    private navButtons: Record<string, Node> = {};

    onLoad() {
        this.bindSceneRoot();
        this.ensurePanelManager();
        this.rebuildStaticUi();
    }

    onEnable() {
        UIEventCenter.on('USER_UPDATED', this.onDataUpdated);
        UIEventCenter.on('USER_DATA_REFRESH_ONLY', this.onDataUpdated);
        UIEventCenter.on('PETS_UPDATED', this.onDataUpdated);
        UIEventCenter.on('TOWER_UPDATED', this.onDataUpdated);
        UIEventCenter.on('DAILY_TASK_UPDATED', this.onDataUpdated);
        UIEventCenter.on('SHOW_HOME', this.showHomeByEvent);
        UIEventCenter.on('API_ERROR', this.onApiError);
        UIEventCenter.on('LOADING_CHANGED', this.onLoadingChanged);
    }

    onDisable() {
        UIEventCenter.off('USER_UPDATED', this.onDataUpdated);
        UIEventCenter.off('USER_DATA_REFRESH_ONLY', this.onDataUpdated);
        UIEventCenter.off('PETS_UPDATED', this.onDataUpdated);
        UIEventCenter.off('TOWER_UPDATED', this.onDataUpdated);
        UIEventCenter.off('DAILY_TASK_UPDATED', this.onDataUpdated);
        UIEventCenter.off('SHOW_HOME', this.showHomeByEvent);
        UIEventCenter.off('API_ERROR', this.onApiError);
        UIEventCenter.off('LOADING_CHANGED', this.onLoadingChanged);
    }

    start() {
        void this.bootstrap();
    }

    async bootstrap() {
        this.showHome();
        await GameStore.bootstrapHome();
        this.refreshUI();
    }

    refreshUI() {
        this.refreshTopBar();
        this.refreshHome();
    }

    showHome() {
        this.bindSceneRoot();
        if (this.homePage) this.homePage.active = true;
        if (this.pageRoot) {
            this.pageRoot.active = false;
            for (const child of this.pageRoot.children) child.active = false;
        }
        this.setSelectedNav('home');
        this.refreshHome();
    }

    onClickPet() { this.openPet(); }
    onClickInventory() { this.panelManager?.showInventory(); this.setSelectedNav('profile'); }
    onClickShop() { this.panelManager?.showShop(); this.setSelectedNav('profile'); }
    onClickBreed() { this.openHatchery(); }
    onClickAdventure() { this.panelManager?.showTower(); this.setSelectedNav('profile'); }

    private bindSceneRoot() {
        this.canvas = find('Canvas') || this.node.parent || this.node;
        ensureTransform(this.canvas, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.canvas.setPosition(new Vec3(360, 640, 0));

        const legacyHome = this.canvas.getChildByName('HomeLayer');
        if (legacyHome) legacyHome.active = false;
        const legacyPage = this.canvas.getChildByName('PageLayer');
        if (legacyPage) legacyPage.active = false;

        const bg = this.getOrCreateChild(this.canvas, 'BackgroundLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        bg.setSiblingIndex(0);
        createPanel(bg, 'SoftGradientBase', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, SOFT_BG, SOFT_BG, 0, 0);
        this.drawDecorations(bg);

        this.appRoot = this.getOrCreateChild(this.canvas, 'AppRoot', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.appRoot.setSiblingIndex(20);

        this.topBar = this.getOrCreateChild(this.appRoot, 'TopBar', 0, 560, DESIGN_WIDTH, 150);
        this.pageViewport = this.getOrCreateChild(this.appRoot, 'PageViewport', 0, -24, DESIGN_WIDTH, 948);
        this.homePage = this.getOrCreateChild(this.pageViewport, 'HomePage', 0, 0, DESIGN_WIDTH, 948);
        this.pageRoot = this.getOrCreateChild(this.pageViewport, 'PageRoot', 0, 0, DESIGN_WIDTH, 948);
        this.floatingActions = this.getOrCreateChild(this.appRoot, 'FloatingActions', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.bottomNavigation = this.getOrCreateChild(this.appRoot, 'BottomNavigation', 0, -578, 670, 118);
        this.loadingLayer = this.getOrCreateChild(this.canvas, 'LoadingLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.modalLayer = this.getOrCreateChild(this.canvas, 'ModalLayer', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.loadingLayer.active = false;
        this.modalLayer.active = false;
    }

    private ensurePanelManager() {
        if (!this.canvas) this.bindSceneRoot();
        const host = this.canvas || this.node;
        this.panelManager = this.panelManager || host.getComponent(PanelManager) || host.addComponent(PanelManager);
        this.panelManager.ensurePages();
    }

    private rebuildStaticUi() {
        if (!this.topBar || !this.homePage || !this.bottomNavigation || !this.loadingLayer) return;
        clearChildren(this.topBar);
        clearChildren(this.homePage);
        clearChildren(this.bottomNavigation);
        clearChildren(this.loadingLayer);

        this.buildTopBar(this.topBar);
        this.buildHomePage(this.homePage);
        this.buildBottomNavigation(this.bottomNavigation);
        this.buildLoadingLayer(this.loadingLayer);
        this.refreshUI();
    }

    private buildTopBar(parent: Node) {
        const playerCard = createSoftCard(parent, 'PlayerCard', -205, 8, 300, 86, CREAM, 34);
        createCircleCard(playerCard, 'Avatar', -115, 0, 49, GOLD_LIGHT, WHITE);
        createLabel(playerCard, 'AvatarFace', '宠', -115, 2, 70, 52, 32, TEXT_NAVY);
        this.nicknameLabel = createLabel(playerCard, 'PlayerName', 'PetLover', 8, 18, 150, 36, 22, TEXT_NAVY);
        createPanel(playerCard, 'LevelBadge', -78, -18, 76, 30, NAVY, NAVY, 15, 0);
        this.levelLabel = createLabel(playerCard, 'PlayerLevel', 'Lv.1', -78, -18, 80, 28, 16, WHITE);
        createProgressBar(playerCard, 'PlayerExpBar', 44, -18, 82, 12, 0.4, GOLD, SOFT_LINE);

        const goldPill = createPill(parent, 'GoldPill', '0', 92, 10, 180, 58, '金', CREAM);
        this.goldLabel = goldPill.getChildByName('Text')?.getComponent(Label) || null;
        createButton(goldPill, 'GoldAdd', '+', 66, 0, 42, 42, () => ToastManager.show('充值入口稍后开放'), this, false, 24);

        const diamondPill = createPill(parent, 'DiamondPill', '0', 280, 10, 150, 58, '钻', CREAM);
        this.diamondLabel = diamondPill.getChildByName('Text')?.getComponent(Label) || null;
        createButton(diamondPill, 'DiamondAdd', '+', 52, 0, 42, 42, () => ToastManager.show('钻石商城稍后开放'), this, false, 24);

        createCircleCard(parent, 'MoreButtonBg', 345, 10, 34, CREAM, WHITE);
        createButton(parent, 'MoreButton', '⋮', 345, 10, 54, 54, () => this.panelManager?.showProfile(), this, false, 28);
    }

    private buildHomePage(parent: Node) {
        const hero = createSoftCard(parent, 'TowerHeroCard', 0, 248, 672, 286, MINT, 50);
        createPill(hero, 'ModeTag', '宠物乐园', -220, 84, 180, 48, '叶', new Color(245, 255, 236, 245));
        this.titleFloorLabel = createLabel(hero, 'TowerFloorTitle', '第 1 层', -146, 5, 390, 100, 64, TEXT_NAVY);
        this.titleFloorLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        createProgressBar(hero, 'TowerProgress', -126, -70, 360, 14, 0.2, GOLD, new Color(220, 239, 202, 255));
        this.towerMetaLabel = createLabel(hero, 'TowerMeta', '最高纪录: 0 层 · 推荐战力 0', -110, -112, 430, 40, 21, TEXT_GREEN);
        this.towerMetaLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        createLabel(hero, 'HeroSparkleA', '✦', 0, 80, 34, 34, 28, GOLD_LIGHT);
        createLabel(hero, 'HeroSparkleB', '✦', 188, 8, 30, 30, 22, WHITE);

        this.buildPetShowcase(parent);
        this.buildQuickActions(parent);
        this.buildDailyTask(parent);
        this.buildMilestones(parent);
        this.buildChallengeButton(parent);
    }

    private buildPetShowcase(parent: Node) {
        const shadow = createPanel(parent, 'PetShadow', -56, -30, 260, 38, new Color(121, 169, 103, 80), new Color(121, 169, 103, 80), 19, 0);
        shadow.setSiblingIndex(3);

        const pet = this.getOrCreateChild(parent, 'PetDisplay', -58, 40, 330, 310);
        pet.setSiblingIndex(4);
        clearChildren(pet);

        createCircleCard(pet, 'EarLeft', -86, 102, 42, new Color(255, 178, 76, 255), WHITE);
        createCircleCard(pet, 'EarRight', 86, 102, 42, new Color(255, 178, 76, 255), WHITE);
        createCircleCard(pet, 'Body', 0, 0, 122, new Color(255, 184, 75, 255), WHITE);
        createCircleCard(pet, 'Muzzle', 0, -36, 58, new Color(255, 244, 212, 255), new Color(255, 244, 212, 255));
        createCircleCard(pet, 'EyeLeft', -42, 22, 13, new Color(35, 37, 46, 255), new Color(35, 37, 46, 255));
        createCircleCard(pet, 'EyeRight', 42, 22, 13, new Color(35, 37, 46, 255), new Color(35, 37, 46, 255));
        createCircleCard(pet, 'BlushLeft', -70, -20, 18, new Color(255, 140, 124, 180), new Color(255, 140, 124, 180));
        createCircleCard(pet, 'BlushRight', 70, -20, 18, new Color(255, 140, 124, 180), new Color(255, 140, 124, 180));
        createCircleCard(pet, 'Nose', 0, -12, 16, new Color(39, 35, 36, 255), new Color(39, 35, 36, 255));
        createPanel(pet, 'Scarf', 0, -92, 170, 42, new Color(74, 184, 94, 255), new Color(74, 184, 94, 255), 20, 0);
        createLabel(pet, 'Paw', '♣', 0, -92, 46, 34, 24, WHITE);
        const hit = this.getOrCreateChild(pet, 'PetHitArea', 0, 0, 300, 280);
        const button = hit.getComponent(Button) || hit.addComponent(Button);
        button.transition = Button.Transition.NONE;
        hit.off(Button.EventType.CLICK);
        hit.on(Button.EventType.CLICK, () => this.openPet());

        this.petLevelLabel = createLabel(parent, 'PetLevelBadgeText', 'Lv.1', -58, -96, 130, 44, 23, WHITE);
        createPanel(parent, 'PetLevelBadge', -58, -96, 132, 48, NAVY, new Color(255, 255, 255, 190), 24, 2).setSiblingIndex(5);
        this.petLevelLabel.node.setSiblingIndex(6);
        this.petNameLabel = createLabel(parent, 'PetName', '伙伴', -58, -126, 220, 30, 17, TEXT_MUTED);
    }

    private buildQuickActions(parent: Node) {
        const items = [
            { name: 'QuickPet', icon: '⚡', text: '宠物', y: 96, action: () => this.openPet(), fill: new Color(255, 245, 188, 255) },
            { name: 'QuickBag', icon: '包', text: '背包', y: -52, action: () => this.panelManager?.showInventory(), fill: new Color(238, 250, 255, 255) },
            { name: 'QuickRank', icon: '🏆', text: '排行', y: -200, action: () => this.panelManager?.showRanking(), fill: CREAM },
        ];

        for (const item of items) {
            const card = createSoftCard(parent, item.name, 252, item.y, 122, 112, item.fill, 24);
            createLabel(card, 'Icon', item.icon, 0, 20, 70, 54, 34, item.name === 'QuickPet' ? GOLD : TEXT_NAVY);
            createButton(card, 'Button', item.text, 0, -28, 86, 40, item.action, this, false, 21);
        }
    }

    private buildDailyTask(parent: Node) {
        const card = createSoftCard(parent, 'DailyTaskCard', 0, -238, 640, 126, CREAM, 24);
        createLabel(card, 'TaskIcon', '☑', -266, 32, 50, 42, 28, TEXT_GREEN);
        createLabel(card, 'TaskTag', '今日任务', -174, 34, 150, 36, 21, TEXT_GREEN).horizontalAlign = Label.HorizontalAlign.LEFT;
        this.taskTitleLabel = createLabel(card, 'TaskTitle', '完成 1 次爬塔挑战', -124, -22, 360, 44, 28, TEXT_NAVY);
        this.taskTitleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        createButton(card, 'ClaimTaskButton', '领取', 244, 22, 126, 62, () => this.claimTaskReward(), this, false, 26);
        this.taskProgressLabel = createLabel(card, 'TaskProgress', '进度: 0/1', 244, -38, 126, 34, 18, TEXT_MUTED);
    }

    private buildMilestones(parent: Node) {
        const panel = createSoftCard(parent, 'TowerMilestones', 0, -378, 640, 112, new Color(250, 255, 239, 245), 22);
        createPanel(panel, 'Line', 0, 16, 500, 8, new Color(198, 215, 195, 255), new Color(198, 215, 195, 255), 4, 0);
        const milestones = [5, 10, 20, 30, 40];
        milestones.forEach((floor, index) => {
            const x = -250 + index * 125;
            const state = index < 2 ? 'done' : index === 2 ? 'current' : 'locked';
            const color = state === 'done' ? new Color(42, 198, 126, 255) : state === 'current' ? GOLD : new Color(250, 250, 250, 255);
            createCircleCard(panel, `Floor${floor}`, x, 18, state === 'current' ? 39 : 32, color, WHITE);
            createLabel(panel, `FloorIcon${floor}`, state === 'done' ? '✓' : state === 'current' ? '★' : '🔒', x, 18, 54, 44, state === 'current' ? 30 : 24, state === 'locked' ? TEXT_MUTED : WHITE);
            createLabel(panel, `FloorLabel${floor}`, `${floor} 层`, x, -38, 72, 32, 17, state === 'current' ? new Color(204, 115, 18, 255) : TEXT_MUTED);
        });
    }

    private buildChallengeButton(parent: Node) {
        const button = createButton(parent, 'ChallengeTowerButton', '挑战第 1 层', 0, -494, 612, 78, () => this.challengeTower(), this, false, 34);
        const glow = createPanel(button.node, 'ButtonGlow', 0, 0, 612, 78, GOLD_LIGHT, new Color(221, 135, 18, 255), 36, 3);
        glow.setSiblingIndex(0);
        this.challengeLabel = button.node.getChildByName('Label')?.getComponent(Label) || null;
        if (this.challengeLabel) {
            this.challengeLabel.color = new Color(80, 50, 16, 255);
            this.challengeLabel.fontSize = 34;
        }
        createLabel(button.node, 'SwordIcon', '⚔', -214, 0, 72, 56, 32, new Color(80, 50, 16, 255));
        this.powerHintLabel = createLabel(parent, 'PowerHint', '推荐战力 0', 0, -552, 260, 28, 18, TEXT_GREEN);
    }

    private buildBottomNavigation(parent: Node) {
        createSoftCard(parent, 'BottomBg', 0, 0, 670, 108, new Color(255, 255, 250, 245), 26);
        const items = [
            { key: 'home', label: '首页', icon: '⌂', x: -250, action: () => this.showHome() },
            { key: 'pet', label: '宠物', icon: '宠', x: -84, action: () => this.openPet() },
            { key: 'hatchery', label: '孵化', icon: '蛋', x: 84, action: () => this.openHatchery() },
            { key: 'profile', label: '我的', icon: '●', x: 250, action: () => this.openProfile() },
        ];
        this.navButtons = {};
        for (const item of items) {
            const card = createSoftCard(parent, `${item.key}NavCard`, item.x, 0, 126, 92, CREAM, 22);
            createButton(card, 'Button', `${item.icon}\n${item.label}`, 0, 0, 108, 78, item.action, this, item.key === 'home', 20);
            this.navButtons[item.key] = card;
        }
        this.setSelectedNav('home');
    }

    private buildLoadingLayer(parent: Node) {
        createPanel(parent, 'Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(15, 26, 40, 90), new Color(15, 26, 40, 90), 0, 0);
        createSoftCard(parent, 'LoadingCard', 0, 0, 260, 96, CREAM, 24);
        this.loadingText = createLabel(parent, 'LoadingText', '加载中...', 0, 0, 220, 54, 22, TEXT_NAVY);
    }

    private refreshTopBar() {
        const user = PlayerData.user || {};
        const level = user.level ?? user.vipLevel ?? 1;
        if (this.nicknameLabel) this.nicknameLabel.string = user.nickname || 'PetLover';
        if (this.levelLabel) this.levelLabel.string = `Lv.${level}`;
        if (this.goldLabel) this.goldLabel.string = `${user.gold ?? 0}`;
        if (this.diamondLabel) this.diamondLabel.string = `${user.diamond ?? 0}`;
    }

    private refreshHome() {
        const pet = PlayerData.getCurrentPet();
        const tower = PlayerData.tower || {};
        const record = tower.record || {};
        const currentFloor = Number(tower.currentFloor ?? record.currentFloor ?? 1);
        const maxFloor = Number(tower.maxFloor ?? record.maxFloor ?? 0);
        const recommendedPower = this.getRecommendedPower(tower, currentFloor);
        const progress = Math.min(1, Math.max(0.12, (currentFloor % 10) / 10));

        if (this.titleFloorLabel) this.titleFloorLabel.string = `第 ${currentFloor} 层`;
        if (this.towerMetaLabel) this.towerMetaLabel.string = `最高纪录: 第 ${maxFloor} 层 · 推荐战力 ${recommendedPower}`;
        if (this.challengeLabel) this.challengeLabel.string = `挑战第 ${currentFloor} 层`;
        if (this.powerHintLabel) this.powerHintLabel.string = `推荐战力 ${recommendedPower}`;
        if (this.petNameLabel) this.petNameLabel.string = pet?.nickname || '当前宠物';
        if (this.petLevelLabel) this.petLevelLabel.string = `Lv.${pet?.level ?? 1}`;
        if (this.taskTitleLabel) this.taskTitleLabel.string = this.getTaskTitle();
        if (this.taskProgressLabel) this.taskProgressLabel.string = this.getTaskProgress();

        const bar = this.homePage?.getChildByName('TowerHeroCard')?.getChildByName('TowerProgress');
        if (bar) createProgressBar(bar.parent!, 'TowerProgress', -126, -70, 360, 14, progress, GOLD, new Color(220, 239, 202, 255));
    }

    private async challengeTower() {
        const pet = PlayerData.getCurrentPet();
        const result = await ApiClient.post('/tower/challenge', { petId: pet?.id });

        if (result?.success) {
            ToastManager.show(result.result === 'win' ? '挑战成功，奖励已到账' : '挑战失败，提升战力再来');
            if (result.user) PlayerData.setUser(result.user);
            if (result.pet) PlayerData.updatePet(result.pet);
            await Promise.all([
                GameStore.loadUser(),
                GameStore.loadPets(),
                GameStore.loadTower(),
            ]);
            this.refreshUI();
        } else {
            ToastManager.show(`挑战失败：${result?.message || '未知错误'}`);
        }
    }

    private async claimTaskReward() {
        const result = await ApiClient.post('/daily-task/reward', {});
        ToastManager.show(result?.success ? '任务奖励已领取' : `领取失败：${result?.message || '任务未完成'}`);
        await GameStore.loadDailyTask();
        this.refreshHome();
    }

    private openPet() {
        this.panelManager?.showPet();
        this.setSelectedNav('pet');
    }

    private openHatchery() {
        this.panelManager?.showHatchery();
        this.setSelectedNav('hatchery');
    }

    private openProfile() {
        this.panelManager?.showProfile();
        this.setSelectedNav('profile');
    }

    private setSelectedNav(key: string) {
        Object.keys(this.navButtons).forEach((navKey) => {
            const node = this.navButtons[navKey];
            createSoftCard(node.parent!, `${navKey}NavCard`, node.position.x, node.position.y, 126, 92, navKey === key ? new Color(230, 255, 239, 255) : CREAM, 22);
        });
    }

    private getTaskTitle() {
        const task = PlayerData.dailyTask || {};
        return task.title || task.name || task.description || '完成 1 次爬塔挑战';
    }

    private getTaskProgress() {
        const task = PlayerData.dailyTask || {};
        const current = task.current ?? task.progress ?? 0;
        const target = task.target ?? task.required ?? 1;
        return `进度: ${current}/${target}`;
    }

    private getRecommendedPower(tower: any, currentFloor: number) {
        const monster = tower?.monster || {};
        const power = Math.round(
            Number(monster.hp || 0) +
            Number(monster.attack || 0) * 5 +
            Number(monster.defense || 0) * 3 +
            Number(monster.speed || 0) * 2,
        );
        return power || currentFloor * 430;
    }

    private drawDecorations(parent: Node) {
        const sun = getOrCreateNode(parent, 'SoftSun');
        sun.setPosition(new Vec3(-250, 360, 0));
        ensureTransform(sun, 260, 260);
        drawCircle(sun, 130, new Color(255, 244, 184, 78), new Color(255, 244, 184, 0), 0);

        const hill = createPanel(parent, 'BottomHill', 0, -520, 820, 250, new Color(218, 244, 181, 255), new Color(218, 244, 181, 255), 120, 0);
        hill.setSiblingIndex(1);
        createCircleCard(parent, 'BushLeft', -250, -314, 50, new Color(173, 221, 132, 180), new Color(173, 221, 132, 0));
        createCircleCard(parent, 'BushRight', 230, -306, 44, new Color(173, 221, 132, 160), new Color(173, 221, 132, 0));
    }

    private getOrCreateChild(parent: Node, name: string, x: number, y: number, width: number, height: number) {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            parent.addChild(node);
        }

        node.setPosition(new Vec3(x, y, 0));
        ensureTransform(node, width, height);
        return node;
    }

    private showHomeByEvent = () => {
        this.showHome();
    };

    private onDataUpdated = () => {
        this.refreshUI();
    };

    private onApiError = (message: string) => {
        if (message) ToastManager.show(message);
    };

    private onLoadingChanged = (loading: boolean) => {
        PlayerData.loading = loading;
        if (this.loadingLayer) this.loadingLayer.active = loading;
        if (this.loadingText) this.loadingText.string = loading ? '加载中...' : '';
    };
}
