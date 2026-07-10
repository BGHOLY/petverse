import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    find,
    Label,
    Node,
    UITransform,
    Vec3,
} from 'cc';
import { EDITOR } from 'cc/env';
import PlayerData from '../data/PlayerData';
import GameStore from '../data/GameStore';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    Theme,
    button,
    clearNode,
    drawRounded,
    formatNumber,
    getOrCreate,
    itemName,
    label,
    normalizeType,
    panel,
    petPortrait,
    pill,
    progress,
    rarityText,
    sectionTitle,
    setRect,
    smallIcon,
    statChip,
} from './UiKit';

const { ccclass, executeInEditMode, property } = _decorator;

type PageName =
    | 'home'
    | 'pet'
    | 'inventory'
    | 'shop'
    | 'hatchery'
    | 'marriage'
    | 'friends'
    | 'tower'
    | 'ranking'
    | 'profile';

@ccclass('MainUI')
@executeInEditMode(true)
export class MainUI extends Component {
    static instance: MainUI | null = null;

    @property
    apiBaseUrl = 'http://127.0.0.1:3000/api';

    private canvas: Node | null = null;
    private root: Node | null = null;
    private topBar: Node | null = null;
    private pageRoot: Node | null = null;
    private bottomNav: Node | null = null;
    private toastLayer: Node | null = null;
    private loadingLayer: Node | null = null;

    private nicknameLabel: Label | null = null;
    private levelLabel: Label | null = null;
    private goldLabel: Label | null = null;
    private diamondLabel: Label | null = null;
    private onlineLabel: Label | null = null;

    private currentPage: PageName = 'home';
    private inventoryCategory = '全部';
    private shopCategory = '全部';
    private busy = new Set<string>();
    private countdownAccumulator = 0;
    private toastToken = 0;
    private unsubscribeStore: (() => void) | null = null;

    onLoad() {
        MainUI.instance = this;
        ApiClient.setBaseUrl(this.apiBaseUrl);
        ToastManager.bind(this.showToast);
        this.unsubscribeStore?.();
        this.unsubscribeStore = GameStore.subscribe(this.onStoreChanged);

        if (!GameStore.pets.length) GameStore.seedPreview();
        this.buildShell();
        this.refreshAllVisuals();
    }

    start() {
        if (!EDITOR) void this.bootstrap();
    }

    onDestroy() {
        if (MainUI.instance === this) MainUI.instance = null;
        this.unsubscribeStore?.();
        this.unsubscribeStore = null;
        ToastManager.unbind(this.showToast);
    }

    update(dt: number) {
        this.countdownAccumulator += dt;
        if (this.countdownAccumulator < 1) return;
        this.countdownAccumulator = 0;

        let changed = false;
        for (const egg of GameStore.eggs) {
            if (egg?.status === 'unhatched' && Number(egg?.remainingSeconds || 0) > 0) {
                egg.remainingSeconds = Math.max(0, Number(egg.remainingSeconds) - 1);
                egg.canHatch = egg.remainingSeconds <= 0;
                changed = true;
            }
        }
        if (changed && this.currentPage === 'hatchery') this.renderCurrentPage();
    }

    lateUpdate() {
        if (this.root && this.canvas) this.root.setSiblingIndex(Math.max(0, this.canvas.children.length - 1));
    }

    public showHome() { this.showPage('home'); }
    public showPet() { this.showPage('pet'); }
    public showInventory() { this.showPage('inventory'); }
    public showShop() { this.showPage('shop'); }
    public showBreed() { this.showPage('marriage'); }
    public showHatchery() { this.showPage('hatchery'); }
    public showFriend() { this.showPage('friends'); }
    public showBattle() { this.showPage('tower'); }
    public showTower() { this.showPage('tower'); }
    public showRanking() { this.showPage('ranking'); }
    public showProfile() { this.showPage('profile'); }

    public showPage(page: PageName) {
        this.currentPage = page;
        this.renderCurrentPage();
        this.renderBottomNav();
        if (!EDITOR) void this.refreshPageData(page);
    }

    public refreshCurrentPage() {
        if (!EDITOR) void this.refreshPageData(this.currentPage);
        else this.renderCurrentPage();
    }

    private async bootstrap() {
        this.setLoading(true, '正在连接 PetVerse 后端…');
        try {
            const profile = await ApiClient.get('/user/profile');
            if (profile?.success === false) {
                GameStore.online = false;
                GameStore.lastError = profile?.message || '玩家资料加载失败';
                this.showToast(GameStore.lastError);
            } else {
                GameStore.setProfile(profile);
                PlayerData.user = { ...GameStore.user, pets: GameStore.pets };
            }

            const results = await Promise.all([
                ApiClient.get('/inventory'),
                ApiClient.get('/shop/items'),
                ApiClient.get('/hatchery/eggs'),
                ApiClient.get('/marriage'),
                ApiClient.get('/friend/list'),
                ApiClient.get('/tower/status'),
                ApiClient.get('/ranking/tower'),
            ]);

            GameStore.setList('inventory', results[0]);
            GameStore.setList('shopItems', results[1]);
            GameStore.setList('eggs', results[2]);
            GameStore.setList('marriages', results[3]);
            GameStore.setList('friends', results[4]);
            GameStore.setTower(results[5]);
            GameStore.setList('ranking', results[6]);

            GameStore.online = profile?.success !== false;
            GameStore.lastError = GameStore.online ? '' : GameStore.lastError;
        } finally {
            this.setLoading(false);
            this.refreshAllVisuals();
        }
    }

    private async refreshPageData(page: PageName) {
        if (this.busy.has(`refresh:${page}`)) return;
        this.busy.add(`refresh:${page}`);
        try {
            switch (page) {
                case 'home':
                case 'profile': {
                    const [profile, tower] = await Promise.all([
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/tower/status'),
                    ]);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    if (tower?.success !== false) GameStore.setTower(tower);
                    break;
                }
                case 'pet': {
                    const pets = await ApiClient.get('/pet/my');
                    if (pets?.success !== false) GameStore.setPets(pets);
                    break;
                }
                case 'inventory': {
                    const inventory = await ApiClient.get('/inventory');
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    break;
                }
                case 'shop': {
                    const items = await ApiClient.get('/shop/items');
                    if (items?.success !== false) GameStore.setList('shopItems', items);
                    break;
                }
                case 'hatchery': {
                    const eggs = await ApiClient.get('/hatchery/eggs');
                    if (eggs?.success !== false) GameStore.setList('eggs', eggs);
                    break;
                }
                case 'marriage': {
                    const marriages = await ApiClient.get('/marriage');
                    if (marriages?.success !== false) GameStore.setList('marriages', marriages);
                    break;
                }
                case 'friends': {
                    const friends = await ApiClient.get('/friend/list');
                    if (friends?.success !== false) GameStore.setList('friends', friends);
                    break;
                }
                case 'tower': {
                    const tower = await ApiClient.get('/tower/status');
                    if (tower?.success !== false) GameStore.setTower(tower);
                    break;
                }
                case 'ranking': {
                    const ranking = await ApiClient.get('/ranking/tower');
                    if (ranking?.success !== false) GameStore.setList('ranking', ranking);
                    break;
                }
            }
        } finally {
            this.busy.delete(`refresh:${page}`);
            this.refreshAllVisuals();
        }
    }

    private buildShell() {
        this.canvas = find('Canvas') || this.node.parent || this.node;
        let root = this.canvas.getChildByName('PetVerseUIRoot');
        if (!root) {
            root = new Node('PetVerseUIRoot');
            this.canvas.addChild(root);
        }
        this.root = root;
        clearNode(root);
        setRect(root, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        if (!root.getComponent(BlockInputEvents)) root.addComponent(BlockInputEvents);

        const background = new Node('BackgroundLayer');
        root.addChild(background);
        setRect(background, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        drawRounded(background, DESIGN_WIDTH, DESIGN_HEIGHT, Theme.background, 0);

        const mintGlow = new Node('MintGlow');
        background.addChild(mintGlow);
        setRect(mintGlow, 0, 365, 760, 560);
        drawRounded(mintGlow, 760, 560, Theme.backgroundMint, 160);

        const blueGlow = new Node('BlueGlow');
        background.addChild(blueGlow);
        setRect(blueGlow, 285, 515, 280, 320);
        drawRounded(blueGlow, 280, 320, Theme.backgroundBlue, 140);

        this.topBar = new Node('TopBar');
        root.addChild(this.topBar);
        setRect(this.topBar, 0, 574, 684, 112);

        this.pageRoot = new Node('PageRoot');
        root.addChild(this.pageRoot);
        setRect(this.pageRoot, 0, 0, DESIGN_WIDTH, 1020);

        this.bottomNav = new Node('BottomNavigation');
        root.addChild(this.bottomNav);
        setRect(this.bottomNav, 0, -578, 684, 104);

        this.toastLayer = new Node('ToastLayer');
        root.addChild(this.toastLayer);
        setRect(this.toastLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.loadingLayer = new Node('LoadingLayer');
        root.addChild(this.loadingLayer);
        setRect(this.loadingLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.loadingLayer.active = false;

        this.renderTopBar();
        this.renderBottomNav();
        this.renderCurrentPage();
    }

    private refreshAllVisuals() {
        if (!this.root) return;
        this.renderTopBar();
        this.renderBottomNav();
        this.renderCurrentPage();
    }

    private renderTopBar() {
        if (!this.topBar) return;
        clearNode(this.topBar);

        panel(this.topBar, 'TopBarCard', 0, 0, 684, 104, new Color(255, 255, 251, 248), 34, true);
        smallIcon(this.topBar, 'Avatar', '宠', -305, 0, 72, new Color(255, 224, 151, 255));

        this.nicknameLabel = label(this.topBar, 'Nickname', GameStore.user?.nickname || 'PetVerse玩家', -245, 20, 190, 34, 22, Theme.navy, 'left', true);
        this.levelLabel = label(this.topBar, 'Level', `Lv.${GameStore.user?.level ?? 1}`, -245, -20, 88, 28, 15, Theme.muted, 'left', true);
        const exp = Number(GameStore.user?.exp || 0);
        const expMax = Math.max(100, Number(GameStore.user?.nextExp || (GameStore.user?.level || 1) * 100));
        progress(this.topBar, 'PlayerExp', -115, -20, 90, 12, exp / expMax, Theme.yellow);

        const goldCard = pill(this.topBar, 'GoldCard', `● ${formatNumber(GameStore.user?.gold)}`, 90, 15, 148, 44, Theme.card, Theme.navy, 17);
        goldCard.getChildByName('Label')?.setPosition(new Vec3(0, 0, 0));
        button(this.topBar, 'GoldPlus', '+', 174, 15, 38, 38, () => this.showPage('shop'), { fill: Theme.navy, textColor: Theme.white, fontSize: 22 });

        pill(this.topBar, 'DiamondCard', `◆ ${formatNumber(GameStore.user?.diamond)}`, 260, 15, 118, 44, Theme.card, Theme.navy, 17);
        button(this.topBar, 'MenuButton', '⋮', 318, -28, 42, 42, () => this.showPage('profile'), { fill: Theme.paleBlue, fontSize: 24 });

        this.onlineLabel = label(
            this.topBar,
            'OnlineState',
            GameStore.online ? '● 后端已连接' : '● 预览/离线数据',
            200,
            -31,
            190,
            26,
            12,
            GameStore.online ? Theme.greenDark : Theme.muted,
            'right',
            true,
        );
    }

    private renderBottomNav() {
        if (!this.bottomNav) return;
        clearNode(this.bottomNav);
        panel(this.bottomNav, 'NavCard', 0, 0, 684, 100, new Color(255, 255, 252, 250), 30, true);

        const nav: Array<{ page: PageName; icon: string; text: string; x: number }> = [
            { page: 'home', icon: '首', text: '首页', x: -252 },
            { page: 'pet', icon: '宠', text: '宠物', x: -84 },
            { page: 'hatchery', icon: '蛋', text: '孵化', x: 84 },
            { page: 'profile', icon: '我', text: '我的', x: 252 },
        ];

        for (const item of nav) {
            const selected = this.currentPage === item.page;
            button(this.bottomNav, `Nav_${item.page}`, `${item.icon}\n${item.text}`, item.x, 0, 142, 76, () => this.showPage(item.page), {
                fill: selected ? new Color(231, 250, 238, 255) : new Color(255, 255, 255, 0),
                textColor: selected ? Theme.greenDark : Theme.muted,
                fontSize: 18,
                selected,
                radius: 23,
            });
        }
    }

    private renderCurrentPage() {
        if (!this.pageRoot) return;
        clearNode(this.pageRoot);
        switch (this.currentPage) {
            case 'home': this.renderHomePage(); break;
            case 'pet': this.renderPetPage(); break;
            case 'inventory': this.renderInventoryPage(); break;
            case 'shop': this.renderShopPage(); break;
            case 'hatchery': this.renderHatcheryPage(); break;
            case 'marriage': this.renderMarriagePage(); break;
            case 'friends': this.renderFriendsPage(); break;
            case 'tower': this.renderTowerPage(); break;
            case 'ranking': this.renderRankingPage(); break;
            case 'profile': this.renderProfilePage(); break;
        }
    }

    private renderHomePage() {
        const root = this.pageRoot!;
        const pet = GameStore.currentPet;
        const tower = GameStore.tower || {};
        const currentFloor = Number(tower.currentFloor ?? tower.floor ?? tower.current ?? 1);
        const maxFloor = Number(tower.maxFloor ?? tower.highestFloor ?? tower.bestFloor ?? currentFloor);
        const recommended = Number(tower.recommendedPower ?? tower.enemyPower ?? Math.max(1000, currentFloor * 430));

        const hero = panel(root, 'HeroCard', 0, 298, 660, 330, new Color(181, 232, 183, 255), 56, true);
        pill(hero, 'HeroTag', '叶  宠物乐园', -225, 124, 176, 42, new Color(246, 255, 242, 240), Theme.greenDark, 17);
        label(hero, 'FloorTitle', `第 ${currentFloor} 层`, -290, 38, 470, 100, 54, Theme.navy, 'left', true);
        progress(hero, 'TowerProgress', -85, -35, 410, 18, Math.min(1, currentFloor / Math.max(1, maxFloor)), Theme.yellow);
        label(hero, 'TowerInfo', `最高纪录 第 ${maxFloor} 层 · 推荐战力 ${formatNumber(recommended)}`, -290, -88, 500, 40, 17, Theme.greenDark, 'left', true);

        petPortrait(root, 'HomePet', -55, 30, 300, pet);
        pill(root, 'PetLevel', `Lv.${pet?.level ?? 1}`, -55, -138, 116, 42, Theme.navy, Theme.white, 18);
        label(root, 'PetName', pet?.nickname || '暂无宠物', -55, -174, 220, 34, 20, Theme.navy, 'center', true);

        this.quickAction(root, 'QuickPet', '宠', '宠物', 245, 104, Theme.yellow, () => this.showPage('pet'));
        this.quickAction(root, 'QuickBag', '包', '背包', 245, 4, Theme.paleBlue, () => this.showPage('inventory'));
        this.quickAction(root, 'QuickRank', '榜', '排行', 245, -96, new Color(255, 239, 202, 255), () => this.showPage('ranking'));

        const task = panel(root, 'DailyTaskCard', 0, -264, 660, 112, Theme.card, 24, true);
        smallIcon(task, 'TaskIcon', '✓', -285, 15, 42, new Color(223, 250, 234, 255));
        label(task, 'TaskTitle', '今日任务', -244, 27, 200, 30, 17, Theme.greenDark, 'left', true);
        label(task, 'TaskText', '完成 1 次爬塔挑战', -244, -17, 340, 38, 22, Theme.navy, 'left', true);
        button(task, 'ClaimButton', '领取', 264, 0, 104, 58, () => this.showToast('任务奖励接口将在任务模块完成后接入'), { fill: Theme.navy, textColor: Theme.white, fontSize: 20 });

        const milestones = panel(root, 'Milestones', 0, -390, 660, 108, new Color(247, 250, 238, 255), 25, true);
        const points = [5, 10, 20, 30, 40];
        points.forEach((floor, index) => {
            const x = -260 + index * 130;
            const done = maxFloor >= floor;
            const current = currentFloor === floor || (currentFloor >= floor && currentFloor < (points[index + 1] || 999));
            smallIcon(milestones, `Milestone${floor}`, done ? '✓' : current ? '★' : '锁', x, 13, current ? 60 : 48, current ? Theme.yellow : done ? Theme.green : Theme.disabled);
            label(milestones, `MilestoneLabel${floor}`, `${floor}层`, x, -35, 86, 28, 14, current ? Theme.orange : Theme.muted, 'center', current);
        });

        button(root, 'ChallengeHomeButton', `剑  挑战第 ${currentFloor} 层`, 0, -496, 620, 78, () => void this.challengeTower(), {
            fill: Theme.yellow,
            fontSize: 30,
            subtitle: `推荐战力 ${formatNumber(recommended)}`,
            disabled: this.busy.has('tower:challenge'),
        });
    }

    private renderPetPage() {
        const root = this.pageRoot!;
        this.pageHeading('我的宠物', `${GameStore.pets.length} 只`);

        const pets = GameStore.pets.slice(0, 5);
        const tab = panel(root, 'PetTabs', 0, 416, 660, 80, Theme.card, 22, true);
        if (!pets.length) {
            label(tab, 'EmptyPets', '暂无宠物，请先孵化宠物蛋', 0, 0, 560, 40, 18, Theme.muted);
        } else {
            pets.forEach((pet, index) => {
                const selected = Number(pet?.id) === Number(GameStore.currentPetId);
                button(tab, `PetTab${pet?.id}`, pet?.nickname || `宠物${index + 1}`, -260 + index * 130, 0, 116, 52, () => {
                    GameStore.selectPet(Number(pet?.id));
                }, { selected, fill: Theme.cardSoft, textColor: selected ? Theme.white : Theme.navy, fontSize: 15 });
            });
        }

        const pet = GameStore.currentPet;
        const identity = panel(root, 'PetIdentity', -176, 120, 308, 500, new Color(250, 247, 225, 255), 34, true);
        petPortrait(identity, 'Portrait', 0, 92, 245, pet);
        label(identity, 'Name', pet?.nickname || '暂无宠物', 0, -66, 260, 40, 25, Theme.navy, 'center', true);
        pill(identity, 'Rarity', rarityText(pet), 0, -112, 150, 36, Theme.peach, Theme.navy, 14);
        label(identity, 'IdentityMeta', `${pet?.species || '-'} · 资质 ${pet?.quality ?? 100}`, 0, -154, 260, 30, 14, Theme.muted);
        progress(identity, 'PetExp', 0, -196, 240, 16, Number(pet?.exp || 0) / Math.max(1, Number(pet?.nextExp || 100)), Theme.green);
        label(identity, 'PetExpText', `经验 ${pet?.exp ?? 0}/${pet?.nextExp ?? 100}`, 0, -222, 240, 24, 13, Theme.muted);

        const detail = panel(root, 'PetDetails', 176, 120, 308, 500, Theme.card, 34, true);
        label(detail, 'DetailTitle', '属性与基因', -126, 214, 250, 36, 21, Theme.navy, 'left', true);
        statChip(detail, 'HP', '生命', pet?.finalAttributes?.hp ?? pet?.hp ?? 0, -78, 158, 138);
        statChip(detail, 'ATK', '攻击', pet?.finalAttributes?.attack ?? pet?.attack ?? 0, 78, 158, 138);
        statChip(detail, 'DEF', '防御', pet?.finalAttributes?.defense ?? pet?.defense ?? 0, -78, 94, 138);
        statChip(detail, 'SPD', '速度', pet?.finalAttributes?.speed ?? pet?.speed ?? pet?.agility ?? 0, 78, 94, 138);
        statChip(detail, 'Hunger', '饥饿', pet?.hunger ?? 0, -78, 30, 138);
        statChip(detail, 'Happy', '快乐', pet?.happiness ?? 0, 78, 30, 138);
        statChip(detail, 'Clean', '清洁', pet?.cleanliness ?? 0, -78, -34, 138);
        statChip(detail, 'Stamina', '体力', pet?.stamina ?? 0, 78, -34, 138);
        label(detail, 'Gene', `基因 ${pet?.geneCode || 'AAAA'} · ${pet?.bodyType || 'normal'} / ${pet?.color || 'white'} / ${pet?.pattern || 'none'}`, -126, -104, 252, 52, 14, Theme.muted, 'left');
        const skills = Array.isArray(pet?.skills) ? pet.skills.slice(0, 3).map((skill: any) => skill?.name || skill?.skillCode).filter(Boolean).join(' · ') : '';
        label(detail, 'Skills', `技能：${skills || '暂无'}`, -126, -166, 252, 54, 14, Theme.navy, 'left');

        button(root, 'FeedButton', '喂食', -176, -246, 210, 64, () => void this.feedPet(), { fill: Theme.green, textColor: Theme.white, fontSize: 23, disabled: !pet || this.busy.has('pet:feed') });
        button(root, 'LevelButton', '使用经验药水', 70, -246, 270, 64, () => void this.levelPet(), { fill: Theme.yellow, fontSize: 22, disabled: !pet || this.busy.has('pet:level') });
        button(root, 'MarriageButton', '婚姻', 276, -246, 110, 64, () => this.showPage('marriage'), { fill: Theme.peach, fontSize: 20 });

        const hint = panel(root, 'PetHint', 0, -360, 660, 86, new Color(236, 249, 244, 255), 22, false);
        label(hint, 'Text', '切换宠物时详情会立即更新；喂食和升级后停留在当前页面。', 0, 0, 600, 42, 16, Theme.greenDark, 'center', true);
    }

    private renderInventoryPage() {
        const root = this.pageRoot!;
        this.pageHeading('我的背包', `${GameStore.inventory.length} 种物品`);
        this.categoryBar(root, 'InventoryCategories', this.inventoryCategory, (category) => {
            this.inventoryCategory = category;
            this.renderCurrentPage();
        }, 414);

        const filtered = this.filterItems(GameStore.inventory, this.inventoryCategory).slice(0, 5);
        if (!filtered.length) {
            this.emptyState(root, '当前分类没有物品', '去商店购买一些道具吧', () => this.showPage('shop'));
            return;
        }

        filtered.forEach((item, index) => {
            const y = 320 - index * 135;
            const card = panel(root, `InventoryItem${item?.id ?? index}`, 0, y, 650, 118, Theme.card, 24, true);
            smallIcon(card, 'Icon', this.itemGlyph(item), -270, 0, 64, this.itemColor(item));
            label(card, 'Name', itemName(item), -220, 22, 240, 36, 21, Theme.navy, 'left', true);
            label(card, 'Description', item?.description || item?.item?.description || this.typeText(item), -220, -22, 310, 32, 14, Theme.muted, 'left');
            pill(card, 'Quantity', `×${item?.quantity ?? item?.count ?? 0}`, 112, 0, 82, 38, Theme.cardSoft, Theme.navy, 16);
            button(card, 'UseButton', '使用', 254, 0, 108, 52, () => void this.useInventoryItem(item), {
                fill: Theme.green,
                textColor: Theme.white,
                fontSize: 19,
                disabled: this.busy.has(`inventory:${item?.id ?? item?.itemCode}`),
            });
        });
    }

    private renderShopPage() {
        const root = this.pageRoot!;
        this.pageHeading('宠物商店', `金币 ${formatNumber(GameStore.user?.gold)} · 钻石 ${formatNumber(GameStore.user?.diamond)}`);
        this.categoryBar(root, 'ShopCategories', this.shopCategory, (category) => {
            this.shopCategory = category;
            this.renderCurrentPage();
        }, 414);

        const filtered = this.filterItems(GameStore.shopItems, this.shopCategory).slice(0, 5);
        if (!filtered.length) {
            this.emptyState(root, '当前分类暂无商品', '稍后刷新商店再看看', () => this.refreshCurrentPage());
            return;
        }

        filtered.forEach((item, index) => {
            const y = 320 - index * 135;
            const card = panel(root, `ShopItem${item?.id ?? index}`, 0, y, 650, 118, Theme.card, 24, true);
            smallIcon(card, 'Icon', this.itemGlyph(item), -270, 0, 64, this.itemColor(item));
            label(card, 'Name', itemName(item), -220, 22, 250, 36, 21, Theme.navy, 'left', true);
            label(card, 'Description', item?.description || this.typeText(item), -220, -22, 290, 32, 14, Theme.muted, 'left');
            const currency = String(item?.currency || item?.currencyType || 'gold').toLowerCase();
            const price = item?.price ?? item?.goldPrice ?? item?.diamondPrice ?? 0;
            pill(card, 'Price', `${currency.includes('diamond') ? '◆' : '●'} ${formatNumber(price)}`, 105, 0, 118, 40, currency.includes('diamond') ? Theme.paleBlue : new Color(255, 245, 211, 255), Theme.navy, 16);
            button(card, 'BuyButton', '购买', 254, 0, 108, 52, () => void this.buyShopItem(item), {
                fill: Theme.yellow,
                fontSize: 19,
                disabled: this.busy.has(`shop:${item?.id ?? item?.itemCode}`),
            });
        });
    }

    private renderHatcheryPage() {
        const root = this.pageRoot!;
        this.pageHeading('宠物孵化室', `${GameStore.eggs.filter((egg) => egg?.status !== 'hatched').length} 枚待孵化`);

        const eggs = GameStore.eggs.slice(0, 4);
        if (!eggs.length) {
            this.emptyState(root, '还没有宠物蛋', '可以通过婚姻产蛋或在商店获取', () => this.showPage('marriage'));
            return;
        }

        eggs.forEach((egg, index) => {
            const y = 340 - index * 190;
            const card = panel(root, `EggCard${egg?.id ?? index}`, 0, y, 650, 170, new Color(252, 251, 240, 255), 30, true);
            smallIcon(card, 'EggIcon', '蛋', -270, 15, 88, new Color(236, 244, 202, 255));
            label(card, 'Title', `${this.rarityName(egg?.rarityPotential)}宠物蛋`, -205, 45, 280, 38, 23, Theme.navy, 'left', true);
            label(card, 'Meta', `潜力 R${egg?.rarityPotential ?? 1} · 资质 ${egg?.quality ?? 100} · 基因 ${egg?.geneCode || 'AAAA'}`, -205, 2, 380, 30, 14, Theme.muted, 'left');
            label(card, 'Parents', `父母 ${egg?.parentAId || '-'} / ${egg?.parentBId || '-'} · ${egg?.color || 'white'} / ${egg?.pattern || 'none'}`, -205, -34, 390, 30, 14, Theme.muted, 'left');

            const remaining = Math.max(0, Number(egg?.remainingSeconds || 0));
            const canHatch = egg?.canHatch || (egg?.status === 'unhatched' && remaining <= 0);
            pill(card, 'Timer', egg?.status === 'hatched' ? '已孵化' : canHatch ? '可以孵化' : this.timeText(remaining), 130, 28, 138, 40, canHatch ? new Color(224, 249, 231, 255) : Theme.cardSoft, canHatch ? Theme.greenDark : Theme.muted, 15);
            button(card, 'HatchButton', egg?.status === 'hatched' ? '已完成' : canHatch ? '孵化' : '等待', 255, -28, 110, 58, () => void this.hatchEgg(egg), {
                fill: canHatch ? Theme.yellow : Theme.disabled,
                fontSize: 19,
                disabled: !canHatch || egg?.status === 'hatched' || this.busy.has(`hatch:${egg?.id}`),
            });
        });

        button(root, 'OpenMarriage', '去婚姻页面产蛋', 0, -472, 310, 58, () => this.showPage('marriage'), { fill: Theme.peach, fontSize: 20 });
    }

    private renderMarriagePage() {
        const root = this.pageRoot!;
        this.pageHeading('宠物婚姻', `${GameStore.marriages.length} 条记录`);

        const current = GameStore.marriages[0] || null;
        const main = panel(root, 'MarriageMain', 0, 242, 650, 350, new Color(255, 240, 233, 255), 38, true);
        smallIcon(main, 'PetA', '宠', -190, 65, 112, new Color(255, 223, 169, 255));
        smallIcon(main, 'Heart', '❤', 0, 65, 80, new Color(255, 215, 217, 255));
        smallIcon(main, 'PetB', '友', 190, 65, 112, new Color(218, 242, 255, 255));
        label(main, 'State', current ? '当前婚姻关系正常' : '当前宠物尚未建立婚姻', 0, -38, 540, 44, 24, Theme.navy, 'center', true);
        label(main, 'Ids', current ? `婚姻 #${current?.id} · 宠物 ${current?.petAId ?? current?.myPetId ?? '-'} × ${current?.petBId ?? current?.friendPetId ?? '-'}` : '选择自己的宠物和好友宠物后创建婚姻', 0, -84, 560, 34, 15, Theme.muted);
        const cooldown = Number(current?.layEggCooldownSeconds ?? current?.remainingCooldownSeconds ?? 0);
        label(main, 'Cooldown', current ? (cooldown > 0 ? `产蛋冷却 ${this.timeText(cooldown)}` : '现在可以产蛋') : '婚姻建立后即可产蛋', 0, -128, 420, 32, 16, cooldown > 0 ? Theme.muted : Theme.greenDark, 'center', true);

        button(root, 'CreateMarriage', current ? '婚姻已建立' : '自动匹配并结婚', -170, -4, 290, 68, () => void this.createMarriage(), {
            fill: current ? Theme.disabled : Theme.peach,
            fontSize: 22,
            disabled: Boolean(current) || this.busy.has('marriage:create'),
        });
        button(root, 'LayEgg', '产下宠物蛋', 170, -4, 290, 68, () => void this.layEgg(current), {
            fill: Theme.yellow,
            fontSize: 22,
            disabled: !current || cooldown > 0 || this.busy.has('marriage:egg'),
        });

        const info = panel(root, 'MarriageInfo', 0, -210, 650, 280, Theme.card, 28, true);
        sectionTitle(info, '后代继承规则', 102);
        const lines = [
            '• 稀有度综合父母稀有度、资质和基因分数',
            '• 资质、物种、体型、颜色和花纹会继承或突变',
            '• 部分技能来自父母，其余技能槽自动补齐',
            '• 蛋生成时固定后代数据，孵化时不会再次随机',
        ];
        lines.forEach((text, index) => label(info, `Rule${index}`, text, -285, 48 - index * 48, 570, 40, 15, Theme.muted, 'left'));

        button(root, 'ViewEggs', '查看孵化室', 0, -430, 260, 58, () => this.showPage('hatchery'), { fill: Theme.green, textColor: Theme.white, fontSize: 20 });
    }

    private renderFriendsPage() {
        const root = this.pageRoot!;
        this.pageHeading('好友列表', `${GameStore.friends.length} 位好友`);
        const friends = GameStore.friends.slice(0, 6);
        if (!friends.length) {
            this.emptyState(root, '暂无好友数据', '可以先调用好友种子接口创建测试好友', () => void this.seedFriends());
            return;
        }
        friends.forEach((friend, index) => {
            const y = 360 - index * 132;
            const card = panel(root, `Friend${friend?.id ?? index}`, 0, y, 650, 112, Theme.card, 24, true);
            smallIcon(card, 'Avatar', '友', -272, 0, 64, new Color(220, 244, 255, 255));
            label(card, 'Name', friend?.nickname || friend?.name || `好友${index + 1}`, -220, 20, 280, 36, 21, Theme.navy, 'left', true);
            label(card, 'Meta', `Lv.${friend?.level ?? 1} · 玩家ID ${friend?.userId ?? friend?.id ?? '-'}`, -220, -22, 300, 30, 14, Theme.muted, 'left');
            button(card, 'ViewPets', '好友宠物', 245, 0, 128, 52, () => this.showToast('好友宠物将用于婚姻匹配'), { fill: Theme.paleBlue, fontSize: 17 });
        });
    }

    private renderTowerPage() {
        const root = this.pageRoot!;
        this.pageHeading('爬塔挑战', '挑战、记录与奖励');
        const tower = GameStore.tower || {};
        const currentFloor = Number(tower.currentFloor ?? tower.floor ?? 1);
        const maxFloor = Number(tower.maxFloor ?? tower.highestFloor ?? currentFloor);
        const power = Number(tower.power ?? tower.petPower ?? this.petPower(GameStore.currentPet));
        const recommended = Number(tower.recommendedPower ?? tower.enemyPower ?? currentFloor * 430);

        const hero = panel(root, 'TowerHero', 0, 248, 650, 380, new Color(188, 231, 195, 255), 44, true);
        label(hero, 'Floor', `第 ${currentFloor} 层`, -270, 82, 520, 100, 58, Theme.navy, 'left', true);
        label(hero, 'Record', `最高纪录 第 ${maxFloor} 层`, -270, 15, 420, 40, 20, Theme.greenDark, 'left', true);
        progress(hero, 'PowerProgress', -30, -48, 480, 22, power / Math.max(1, recommended), power >= recommended ? Theme.green : Theme.yellow);
        label(hero, 'Power', `当前战力 ${formatNumber(power)} / 推荐 ${formatNumber(recommended)}`, -270, -91, 540, 36, 17, Theme.navy, 'left', true);
        petPortrait(hero, 'TowerPet', 220, 40, 180, GameStore.currentPet);

        const result = panel(root, 'TowerResult', 0, -18, 650, 116, Theme.card, 24, true);
        label(result, 'ResultTitle', tower?.lastResult?.win === true ? '最近挑战：胜利' : tower?.lastResult?.win === false ? '最近挑战：失败' : '准备好后开始挑战', -280, 22, 410, 38, 22, Theme.navy, 'left', true);
        label(result, 'Reward', `奖励：金币 ${tower?.rewardGold ?? currentFloor * 50} · 宠物经验 ${tower?.rewardExp ?? currentFloor * 10}`, -280, -22, 480, 34, 15, Theme.muted, 'left');

        button(root, 'TowerChallenge', `挑战第 ${currentFloor} 层`, 0, -150, 590, 78, () => void this.challengeTower(), {
            fill: Theme.yellow,
            fontSize: 28,
            disabled: this.busy.has('tower:challenge'),
        });
        button(root, 'TowerRanking', '查看爬塔排行榜', 0, -255, 300, 58, () => this.showPage('ranking'), { fill: Theme.paleBlue, fontSize: 20 });

        const tips = panel(root, 'TowerTips', 0, -390, 650, 130, new Color(244, 250, 240, 255), 24, false);
        label(tips, 'Tip', power >= recommended ? '战力已达到推荐值，可以放心挑战。' : '当前战力低于推荐值，建议先升级或使用道具。', 0, 18, 580, 42, 18, power >= recommended ? Theme.greenDark : Theme.orange, 'center', true);
        label(tips, 'Pet', `出战宠物：${GameStore.currentPet?.nickname || '暂无'}`, 0, -28, 580, 30, 15, Theme.muted);
    }

    private renderRankingPage() {
        const root = this.pageRoot!;
        this.pageHeading('爬塔排行榜', '全服前列玩家');
        const ranking = GameStore.ranking.slice(0, 7);
        if (!ranking.length) {
            this.emptyState(root, '暂无排行数据', '完成一次爬塔挑战后再刷新', () => this.refreshCurrentPage());
            return;
        }
        ranking.forEach((row, index) => {
            const y = 388 - index * 112;
            const currentUser = String(row?.nickname || row?.name || '').includes(String(GameStore.user?.nickname || '___'));
            const card = panel(root, `Rank${index}`, 0, y, 650, 94, currentUser ? new Color(234, 250, 239, 255) : Theme.card, 22, true);
            smallIcon(card, 'RankIcon', String(row?.rank ?? index + 1), -276, 0, 54, index < 3 ? Theme.yellow : Theme.cardSoft);
            label(card, 'Name', row?.nickname || row?.name || `玩家${index + 1}`, -225, 0, 300, 38, 20, Theme.navy, 'left', true);
            label(card, 'Score', `第 ${row?.floor ?? row?.maxFloor ?? row?.score ?? 0} 层`, 180, 0, 160, 38, 18, currentUser ? Theme.greenDark : Theme.muted, 'right', true);
        });
    }

    private renderProfilePage() {
        const root = this.pageRoot!;
        this.pageHeading('玩家中心', '账户与更多功能');
        const user = GameStore.user || {};

        const profile = panel(root, 'ProfileCard', 0, 310, 650, 250, new Color(236, 248, 241, 255), 38, true);
        smallIcon(profile, 'Avatar', '宠', -245, 25, 130, new Color(255, 223, 159, 255));
        label(profile, 'Name', user?.nickname || 'PetVerse玩家', -155, 63, 330, 48, 30, Theme.navy, 'left', true);
        label(profile, 'Level', `Lv.${user?.level ?? 1} · VIP ${user?.vipLevel ?? 0}`, -155, 15, 280, 34, 17, Theme.muted, 'left', true);
        progress(profile, 'Exp', -20, -36, 300, 16, Number(user?.exp || 0) / Math.max(100, Number(user?.level || 1) * 100), Theme.green);
        label(profile, 'Currencies', `金币 ${formatNumber(user?.gold)}   钻石 ${formatNumber(user?.diamond)}`, -155, -78, 360, 34, 18, Theme.navy, 'left', true);
        pill(profile, 'Connection', GameStore.online ? '后端已连接' : '当前为离线预览', 220, -70, 160, 38, GameStore.online ? new Color(220, 250, 230, 255) : Theme.cardSoft, GameStore.online ? Theme.greenDark : Theme.muted, 14);

        sectionTitle(root, '功能入口', 124);
        const entries: Array<{ page: PageName; icon: string; text: string; x: number; y: number; fill: Color }> = [
            { page: 'inventory', icon: '包', text: '背包', x: -220, y: 45, fill: Theme.paleBlue },
            { page: 'shop', icon: '店', text: '商店', x: 0, y: 45, fill: new Color(237, 250, 228, 255) },
            { page: 'marriage', icon: '婚', text: '婚姻', x: 220, y: 45, fill: new Color(255, 232, 229, 255) },
            { page: 'friends', icon: '友', text: '好友', x: -220, y: -100, fill: new Color(225, 244, 255, 255) },
            { page: 'tower', icon: '塔', text: '爬塔', x: 0, y: -100, fill: new Color(232, 247, 232, 255) },
            { page: 'ranking', icon: '榜', text: '排行', x: 220, y: -100, fill: new Color(255, 244, 215, 255) },
        ];
        entries.forEach((entry) => {
            const card = panel(root, `Entry${entry.page}`, entry.x, entry.y, 188, 118, entry.fill, 26, true);
            button(card, 'Open', `${entry.icon}\n${entry.text}`, 0, 0, 170, 94, () => this.showPage(entry.page), { fill: new Color(255, 255, 255, 0), fontSize: 20 });
        });

        const status = panel(root, 'StatusCard', 0, -275, 650, 130, Theme.card, 24, true);
        label(status, 'PetCount', `宠物 ${GameStore.pets.length} 只`, -250, 28, 190, 32, 18, Theme.navy, 'left', true);
        label(status, 'EggCount', `宠物蛋 ${GameStore.eggs.filter((egg) => egg?.status !== 'hatched').length} 枚`, -20, 28, 190, 32, 18, Theme.navy, 'left', true);
        label(status, 'FriendCount', `好友 ${GameStore.friends.length} 位`, 210, 28, 190, 32, 18, Theme.navy, 'left', true);
        button(status, 'RefreshAll', '刷新全部数据', 0, -28, 240, 52, () => void this.bootstrap(), { fill: Theme.green, textColor: Theme.white, fontSize: 19, disabled: this.busy.size > 0 });
    }

    private pageHeading(title: string, subtitle: string) {
        const root = this.pageRoot!;
        label(root, 'PageTitle', title, -310, 478, 430, 58, 34, Theme.navy, 'left', true);
        label(root, 'PageSubtitle', subtitle, 130, 478, 180, 40, 15, Theme.greenDark, 'right', true);
        button(root, 'PageBack', '返回', 284, 478, 92, 44, () => this.showPage('home'), { fill: Theme.card, fontSize: 16 });
    }

    private categoryBar(parent: Node, name: string, selected: string, onSelect: (category: string) => void, y: number) {
        const bar = panel(parent, name, 0, y, 650, 76, Theme.card, 22, true);
        const categories = ['全部', '食物', '经验', '功能'];
        categories.forEach((category, index) => {
            button(bar, `Category${category}`, category, -234 + index * 156, 0, 136, 48, () => onSelect(category), {
                selected: selected === category,
                fill: Theme.cardSoft,
                textColor: selected === category ? Theme.white : Theme.navy,
                fontSize: 17,
            });
        });
    }

    private quickAction(parent: Node, name: string, icon: string, text: string, x: number, y: number, fill: Color, action: () => void) {
        const card = panel(parent, name, x, y, 130, 88, fill, 25, true);
        button(card, 'Button', `${icon}\n${text}`, 0, 0, 116, 74, action, { fill: new Color(255, 255, 255, 0), fontSize: 18 });
    }

    private emptyState(parent: Node, title: string, subtitle: string, action: () => void) {
        const card = panel(parent, 'EmptyState', 0, 40, 620, 360, Theme.card, 36, true);
        smallIcon(card, 'Icon', '宠', 0, 82, 116, new Color(236, 248, 230, 255));
        label(card, 'Title', title, 0, -15, 520, 48, 25, Theme.navy, 'center', true);
        label(card, 'Subtitle', subtitle, 0, -62, 520, 40, 16, Theme.muted);
        button(card, 'Action', '立即处理', 0, -125, 220, 58, action, { fill: Theme.yellow, fontSize: 20 });
    }

    private setLoading(visible: boolean, message = '加载中…') {
        if (!this.loadingLayer) return;
        this.loadingLayer.active = visible;
        if (!visible) {
            clearNode(this.loadingLayer);
            return;
        }
        clearNode(this.loadingLayer);
        const mask = panel(this.loadingLayer, 'Mask', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(30, 48, 66, 95), 0, false);
        const card = panel(mask, 'LoadingCard', 0, 0, 340, 150, Theme.card, 30, true);
        smallIcon(card, 'Spinner', '…', 0, 30, 56, Theme.yellow);
        label(card, 'Message', message, 0, -34, 290, 38, 17, Theme.navy, 'center', true);
    }

    private showToast = (message: string) => {
        if (!this.toastLayer) return;
        this.toastToken += 1;
        const token = this.toastToken;
        clearNode(this.toastLayer);
        const card = panel(this.toastLayer, 'ToastCard', 0, -430, 520, 72, new Color(31, 52, 82, 245), 26, true);
        label(card, 'Message', message, 0, 0, 474, 48, 17, Theme.white, 'center', true);
        this.scheduleOnce(() => {
            if (token === this.toastToken && this.toastLayer) clearNode(this.toastLayer);
        }, 2.2);
    };

    private onStoreChanged = () => {
        PlayerData.user = { ...GameStore.user, pets: GameStore.pets, currentPet: GameStore.currentPet };
        this.refreshAllVisuals();
    };

    private async feedPet() {
        const pet = GameStore.currentPet;
        if (!pet || !this.beginBusy('pet:feed')) return;
        try {
            const result = await ApiClient.post('/pet/feed', { petId: pet.id });
            if (result?.success === false) return this.showToast(result?.message || '喂食失败');
            GameStore.updatePet(result?.pet || result?.data?.pet || result?.data);
            this.showToast('喂食成功，饥饿和快乐已恢复');
            await this.refreshProfileAndPets();
        } finally {
            this.endBusy('pet:feed');
        }
    }

    private async levelPet() {
        const pet = GameStore.currentPet;
        if (!pet || !this.beginBusy('pet:level')) return;
        try {
            const result = await ApiClient.post('/pet/level-up', { petId: pet.id, exp: 100 });
            if (result?.success === false) return this.showToast(result?.message || '升级失败');
            GameStore.updatePet(result?.pet || result?.data?.pet || result?.data);
            this.showToast('宠物经验已增加');
            await this.refreshProfileAndPets();
        } finally {
            this.endBusy('pet:level');
        }
    }

    private async useInventoryItem(item: any) {
        const key = `inventory:${item?.id ?? item?.itemCode}`;
        if (!this.beginBusy(key)) return;
        try {
            const code = item?.itemCode || item?.code || item?.item?.itemCode || item?.item?.code;
            const result = await ApiClient.post('/inventory/use', {
                itemCode: code,
                quantity: 1,
                petId: GameStore.currentPet?.id,
            });
            if (result?.success === false) return this.showToast(result?.message || '使用物品失败');
            this.showToast(`${itemName(item)} 使用成功`);
            const [inventory, profile, pets] = await Promise.all([
                ApiClient.get('/inventory'),
                ApiClient.get('/user/profile'),
                ApiClient.get('/pet/my'),
            ]);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (pets?.success !== false) GameStore.setPets(pets);
            this.currentPage = 'inventory';
        } finally {
            this.endBusy(key);
        }
    }

    private async buyShopItem(item: any) {
        const key = `shop:${item?.id ?? item?.itemCode}`;
        if (!this.beginBusy(key)) return;
        try {
            const result = await ApiClient.post('/shop/buy', {
                shopItemId: item?.shopItemId ?? item?.id,
                itemCode: item?.itemCode || item?.code,
            });
            if (result?.success === false) return this.showToast(result?.message || '购买失败');
            this.showToast(`${itemName(item)} 购买成功`);
            const [profile, inventory, shop] = await Promise.all([
                ApiClient.get('/user/profile'),
                ApiClient.get('/inventory'),
                ApiClient.get('/shop/items'),
            ]);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (shop?.success !== false) GameStore.setList('shopItems', shop);
            this.currentPage = 'shop';
        } finally {
            this.endBusy(key);
        }
    }

    private async hatchEgg(egg: any) {
        const key = `hatch:${egg?.id}`;
        if (!this.beginBusy(key)) return;
        try {
            const result = await ApiClient.post('/hatchery/hatch', { eggId: egg?.id });
            if (result?.success === false) return this.showToast(result?.message || '孵化失败');
            this.showToast(`孵化成功：${result?.pet?.nickname || '新宠物'}`);
            const [eggs, profile, pets] = await Promise.all([
                ApiClient.get('/hatchery/eggs'),
                ApiClient.get('/user/profile'),
                ApiClient.get('/pet/my'),
            ]);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (pets?.success !== false) GameStore.setPets(pets);
            this.currentPage = 'hatchery';
        } finally {
            this.endBusy(key);
        }
    }

    private async createMarriage() {
        if (!this.beginBusy('marriage:create')) return;
        try {
            const ownPet = GameStore.currentPet;
            const otherPet = GameStore.pets.find((pet) => Number(pet?.id) !== Number(ownPet?.id));
            if (!ownPet || !otherPet) return this.showToast('至少需要两只可用宠物进行测试婚姻');
            const result = await ApiClient.post('/marriage/create', { petAId: ownPet.id, petBId: otherPet.id });
            if (result?.success === false) return this.showToast(result?.message || '创建婚姻失败');
            this.showToast('婚姻创建成功');
            const marriages = await ApiClient.get('/marriage');
            if (marriages?.success !== false) GameStore.setList('marriages', marriages);
        } finally {
            this.endBusy('marriage:create');
        }
    }

    private async layEgg(marriage: any) {
        if (!marriage || !this.beginBusy('marriage:egg')) return;
        try {
            const result = await ApiClient.post('/marriage/lay-egg', { marriageId: marriage?.id });
            if (result?.success === false) return this.showToast(result?.message || '产蛋失败');
            this.showToast('成功产下一枚宠物蛋');
            const [marriages, eggs] = await Promise.all([
                ApiClient.get('/marriage'),
                ApiClient.get('/hatchery/eggs'),
            ]);
            if (marriages?.success !== false) GameStore.setList('marriages', marriages);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
        } finally {
            this.endBusy('marriage:egg');
        }
    }

    private async challengeTower() {
        if (!this.beginBusy('tower:challenge')) return;
        try {
            const pet = GameStore.currentPet;
            if (!pet) return this.showToast('请先选择出战宠物');
            const result = await ApiClient.post('/tower/challenge', { petId: pet.id });
            if (result?.success === false) return this.showToast(result?.message || '挑战失败');
            const win = result?.win ?? result?.data?.win ?? result?.result?.win;
            this.showToast(win === false ? '挑战失败，继续提升宠物吧' : '挑战成功，已获得奖励');
            const [tower, ranking, profile] = await Promise.all([
                ApiClient.get('/tower/status'),
                ApiClient.get('/ranking/tower'),
                ApiClient.get('/user/profile'),
            ]);
            if (tower?.success !== false) GameStore.setTower(tower);
            if (ranking?.success !== false) GameStore.setList('ranking', ranking);
            if (profile?.success !== false) GameStore.setProfile(profile);
        } finally {
            this.endBusy('tower:challenge');
        }
    }

    private async seedFriends() {
        if (!this.beginBusy('friends:seed')) return;
        try {
            const result = await ApiClient.post('/friend/seed', {});
            if (result?.success === false) return this.showToast(result?.message || '创建好友数据失败');
            const friends = await ApiClient.get('/friend/list');
            if (friends?.success !== false) GameStore.setList('friends', friends);
            this.showToast('测试好友已创建');
        } finally {
            this.endBusy('friends:seed');
        }
    }

    private async refreshProfileAndPets() {
        const [profile, pets] = await Promise.all([
            ApiClient.get('/user/profile'),
            ApiClient.get('/pet/my'),
        ]);
        if (profile?.success !== false) GameStore.setProfile(profile);
        if (pets?.success !== false) GameStore.setPets(pets);
    }

    private beginBusy(key: string) {
        if (this.busy.has(key)) return false;
        this.busy.add(key);
        this.refreshAllVisuals();
        return true;
    }

    private endBusy(key: string) {
        this.busy.delete(key);
        this.refreshAllVisuals();
    }

    private filterItems(items: any[], category: string) {
        if (category === '全部') return items;
        return items.filter((item) => {
            const type = normalizeType(item);
            if (category === '食物') return /food|feed|apple|meal/.test(type) || /苹果|食物|饲料/.test(itemName(item));
            if (category === '经验') return /exp|experience|potion/.test(type) || /经验/.test(itemName(item));
            return !(/food|feed|exp|experience/.test(type));
        });
    }

    private itemGlyph(item: any) {
        const type = normalizeType(item);
        if (/food|feed/.test(type)) return '食';
        if (/exp|experience/.test(type)) return '经';
        if (/egg/.test(type)) return '蛋';
        return '物';
    }

    private itemColor(item: any) {
        const type = normalizeType(item);
        if (/food|feed/.test(type)) return new Color(235, 249, 224, 255);
        if (/exp|experience/.test(type)) return new Color(230, 239, 255, 255);
        if (/egg/.test(type)) return new Color(248, 244, 213, 255);
        return new Color(245, 235, 250, 255);
    }

    private typeText(item: any) {
        const type = normalizeType(item);
        if (/food|feed/.test(type)) return '食物道具';
        if (/exp|experience/.test(type)) return '经验道具';
        if (/egg/.test(type)) return '宠物蛋';
        return '功能道具';
    }

    private rarityName(rarity: any) {
        const names: Record<number, string> = { 1: '普通', 2: '优秀', 3: '稀有', 4: '史诗', 5: '传说', 6: '神话' };
        return names[Number(rarity || 1)] || `R${rarity || 1}`;
    }

    private timeText(seconds: number) {
        const safe = Math.max(0, Math.floor(Number(seconds || 0)));
        const minutes = Math.floor(safe / 60);
        const remain = safe % 60;
        return minutes > 0 ? `${minutes}:${String(remain).padStart(2, '0')}` : `${remain}秒`;
    }

    private petPower(pet: any) {
        if (!pet) return 0;
        return Math.round(
            Number(pet?.hp || 0) * 4
            + Number(pet?.attack || 0) * 45
            + Number(pet?.defense || 0) * 35
            + Number(pet?.speed || pet?.agility || 0) * 28,
        );
    }
}

export default MainUI;
