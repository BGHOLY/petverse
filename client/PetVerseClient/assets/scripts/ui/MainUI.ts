import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    find,
    Node,
    UIOpacity,
    Vec3,
    tween,
} from 'cc';
import { EDITOR } from 'cc/env';
import GameStore from '../data/GameStore';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    CuteTheme,
    button,
    capsule,
    clearNode,
    cloudSign,
    formatNumber,
    headingTag,
    image,
    panel,
    progress,
    safeName,
    setRect,
    tag,
    text,
} from './cute/CuteUiKit';
import CuteFeedback, { ResolutionPreset } from './cute/CuteFeedback';

const { ccclass, executeInEditMode, property } = _decorator;

type PageName =
    | 'home'
    | 'pet'
    | 'inventory'
    | 'adventure'
    | 'more'
    | 'shop'
    | 'hatchery'
    | 'skills'
    | 'fusion'
    | 'friends'
    | 'ranking'
    | 'marriage'
    | 'mail'
    | 'trade'
    | 'profile'
    | 'settings';

type AptitudeView = {
    hp: number;
    attack: number;
    defense: number;
    magic: number;
    speed: number;
};

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
    private drawerLayer: Node | null = null;
    private modalLayer: Node | null = null;
    private battleLayer: Node | null = null;
    private utilityLayer: Node | null = null;

    private currentPage: PageName = 'home';
    private drawerOpen = false;
    private detailSkill: any | null = null;
    private selectedSkillBookCode = '';
    private lockedSkillCodes = new Set<string>();
    private fusionParentAId = 0;
    private fusionParentBId = 0;
    private fusionPreview: any = null;
    private adventureMode: 'tower' | 'pve' | 'friend' = 'tower';
    private teamPetIds: number[] = [];
    private teamPets: any[] = [];
    private teamEditing = false;
    private selectedFriendUserId = 0;
    private battleResult: any | null = null;
    private battleTitle = '';
    private eggSyncRunning = false;
    private hatchAcceleratorOpen = false;

    private friendMode: 'friends' | 'requests' | 'discover' = 'friends';
    private incomingFriendRequests: any[] = [];
    private outgoingFriendRequests: any[] = [];
    private friendSearchResults: any[] = [];
    private friendSearchKeyword = '101';

    private marriageMode: 'marriages' | 'proposals' | 'match' = 'marriages';
    private marriageProposals: any[] = [];
    private marriageOwnPetId = 0;
    private marriageTargetPetId = 0;

    private mails: any[] = [];
    private selectedMailId = 0;
    private mailUnreadCount = 0;
    private mailClaimableCount = 0;

    private rankingMode: 'tower' | 'level' | 'power' | 'season' = 'tower';
    private rankingEntries: any[] = [];
    private seasonSummary: any = null;

    private tradeMode: 'market' | 'mine' | 'history' | 'list' = 'market';
    private tradeListings: any[] = [];
    private myTradeListings: any[] = [];
    private tradeHistory: any[] = [];
    private tradePetId = 0;
    private tradeCurrency: 'gold' | 'diamond' = 'gold';
    private tradePrice = 5000;

    private capacitySummary: any = null;

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

        if (EDITOR && !GameStore.pets.length) GameStore.seedPreview();

        this.buildShell();
        if (this.root) CuteFeedback.initialize(this.root);
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
            if (['incubating', 'unhatched'].includes(String(egg?.status || '')) && Number(egg?.remainingSeconds || 0) > 0) {
                egg.remainingSeconds = Math.max(0, Number(egg.remainingSeconds) - 1);
                egg.canHatch = egg.remainingSeconds <= 0;
                changed = true;
            }
        }
        if (changed && this.currentPage === 'hatchery') this.renderCurrentPage(false);
    }

    lateUpdate() {
        if (this.root && this.canvas) {
            this.root.setSiblingIndex(Math.max(0, this.canvas.children.length - 1));
        }
    }

    public showHome() { this.showPage('home'); }
    public showPet() { this.showPage('pet'); }
    public showInventory() { this.showPage('inventory'); }
    public showShop() { this.showPage('shop'); }
    public showBreed() { this.showPage('marriage'); }
    public showHatchery() { this.showPage('hatchery'); }
    public showFriend() { this.showPage('friends'); }
    public showBattle() { this.showPage('adventure'); }
    public showTower() { this.showPage('adventure'); }
    public showRanking() { this.showPage('ranking'); }
    public showSkills() { this.showPage('skills'); }
    public showSkill() { this.showPage('skills'); }
    public showFusion() { this.showPage('fusion'); }
    public showProfile() { this.showPage('profile'); }
    public showSettings() { this.showPage('settings'); }

    public showPage(page: PageName) {
        const changed = this.currentPage !== page;
        this.currentPage = page;
        this.drawerOpen = false;
        this.detailSkill = null;
        this.hatchAcceleratorOpen = false;
        if (changed) CuteFeedback.playPage();
        this.renderCurrentPage(true);
        this.renderBottomNav();
        this.renderDrawer();
        if (!EDITOR) void this.refreshPageData(page);
    }

    public refreshCurrentPage() {
        if (EDITOR) {
            this.renderCurrentPage(true);
            return;
        }
        void this.refreshPageData(this.currentPage);
    }

    private onStoreChanged = () => {
        this.refreshAllVisuals();
    };

    private async bootstrap() {
        this.setLoading(true, '正在布置温馨小屋…');
        try {
            const profile = await ApiClient.get('/user/profile');
            if (profile?.success === false) {
                GameStore.markRequestFailure(profile, '玩家资料加载失败');
                this.showToast(profile?.message || '后端暂未连接，显示预览界面');
            } else {
                GameStore.setProfile(profile);
            }

            const results = await Promise.all([
                ApiClient.get('/inventory'),
                ApiClient.get('/shop/items'),
                ApiClient.get('/hatchery/eggs'),
                ApiClient.get('/marriage'),
                ApiClient.get('/friend/list'),
                ApiClient.get('/tower/status'),
                ApiClient.get('/ranking/tower'),
                ApiClient.get('/team'),
                ApiClient.get('/mail/list'),
                ApiClient.get('/season/me'),
                ApiClient.get('/pet-capacity'),
            ]);

            GameStore.setList('inventory', results[0]);
            GameStore.setList('shopItems', results[1]);
            GameStore.setList('eggs', results[2]);
            GameStore.setList('marriages', results[3]);
            GameStore.setList('friends', results[4]);
            GameStore.setTower(results[5]);
            GameStore.setList('ranking', results[6]);
            this.rankingEntries = this.resultList(results[6], ['ranking', 'rankings', 'data', 'list']);
            this.applyTeamResult(results[7]);
            this.applyMailResult(results[8]);
            this.seasonSummary = results[9]?.data || results[9] || null;
            this.capacitySummary = results[10]?.data || results[10] || null;
            this.ensureSelectedFriend();
            this.ensureMarriageSelection();
            this.ensureTradePet();
            await this.syncEggItemsToHatchery();
        } catch (error) {
            console.error('[CuteMainUI] bootstrap failed:', error);
            this.showToast('数据加载失败，请确认后端已启动');
        } finally {
            this.setLoading(false);
            this.refreshAllVisuals();
        }
    }

    private async refreshPageData(page: PageName) {
        const key = `refresh:${page}`;
        if (this.busy.has(key)) return;

        this.busy.add(key);
        try {
            switch (page) {
                case 'home': {
                    const [profile, tower, mail] = await Promise.all([
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/tower/status'),
                        ApiClient.get('/mail/list'),
                    ]);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    if (tower?.success !== false) GameStore.setTower(tower);
                    this.applyMailResult(mail);
                    break;
                }
                case 'profile': {
                    const [profile, capacity, season, mail] = await Promise.all([
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/pet-capacity'),
                        ApiClient.get('/season/me'),
                        ApiClient.get('/mail/list'),
                    ]);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    this.capacitySummary = capacity?.data || capacity || null;
                    this.seasonSummary = season?.data || season || null;
                    this.applyMailResult(mail);
                    break;
                }
                case 'pet': {
                    const pets = await ApiClient.get('/pet/my');
                    if (pets?.success !== false) GameStore.setPets(pets);
                    await GameStore.ensureCurrentPetDetail(true);
                    break;
                }
                case 'skills': {
                    const [pets, inventory] = await Promise.all([
                        ApiClient.get('/pet/my'),
                        ApiClient.get('/inventory'),
                    ]);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    await GameStore.ensureCurrentPetDetail(true);
                    break;
                }
                case 'fusion': {
                    const [pets, inventory] = await Promise.all([
                        ApiClient.get('/pet/my'),
                        ApiClient.get('/inventory'),
                    ]);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    this.ensureFusionParents();
                    break;
                }
                case 'inventory': {
                    const inventory = await ApiClient.get('/inventory');
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    await this.syncEggItemsToHatchery();
                    break;
                }
                case 'shop': {
                    const shop = await ApiClient.get('/shop/items');
                    if (shop?.success !== false) GameStore.setList('shopItems', shop);
                    break;
                }
                case 'hatchery': {
                    const eggs = await ApiClient.get('/hatchery/eggs');
                    if (eggs?.success !== false) GameStore.setList('eggs', eggs);
                    break;
                }
                case 'marriage': {
                    const [marriages, proposals, pets, friends] = await Promise.all([
                        ApiClient.get('/marriage'),
                        ApiClient.get('/marriage/proposals'),
                        ApiClient.get('/pet/my'),
                        ApiClient.get('/friend/list'),
                    ]);
                    if (marriages?.success !== false) GameStore.setList('marriages', marriages);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    if (friends?.success !== false) GameStore.setList('friends', friends);
                    this.marriageProposals = this.resultList(proposals, ['proposals', 'data', 'items', 'list']);
                    this.ensureMarriageSelection();
                    break;
                }
                case 'friends': {
                    const [friends, incoming, outgoing] = await Promise.all([
                        ApiClient.get('/friend/list'),
                        ApiClient.get('/friend/requests'),
                        ApiClient.get('/friend/requests/outgoing'),
                    ]);
                    if (friends?.success !== false) GameStore.setList('friends', friends);
                    this.incomingFriendRequests = this.resultList(incoming, ['requests', 'data', 'items', 'list']);
                    this.outgoingFriendRequests = this.resultList(outgoing, ['requests', 'data', 'items', 'list']);
                    this.ensureSelectedFriend();
                    break;
                }
                case 'mail': {
                    this.applyMailResult(await ApiClient.get('/mail/list'));
                    break;
                }
                case 'trade': {
                    const [market, mine, history, pets] = await Promise.all([
                        ApiClient.get('/trade/listings'),
                        ApiClient.get('/trade/my'),
                        ApiClient.get('/trade/history'),
                        ApiClient.get('/pet/my'),
                    ]);
                    this.tradeListings = this.resultList(market, ['listings', 'data', 'items', 'list']);
                    this.myTradeListings = this.resultList(mine, ['listings', 'data', 'items', 'list']);
                    this.tradeHistory = this.resultList(history, ['records', 'data', 'items', 'list']);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    this.ensureTradePet();
                    break;
                }
                case 'adventure': {
                    const [tower, team, pets, friends] = await Promise.all([
                        ApiClient.get('/tower/status'),
                        ApiClient.get('/team'),
                        ApiClient.get('/pet/my'),
                        ApiClient.get('/friend/list'),
                    ]);
                    if (tower?.success !== false) GameStore.setTower(tower);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    if (friends?.success !== false) GameStore.setList('friends', friends);
                    this.applyTeamResult(team);
                    this.ensureSelectedFriend();
                    break;
                }
                case 'ranking': {
                    const [ranking, season] = await Promise.all([
                        ApiClient.get(`/ranking/${this.rankingMode}`),
                        ApiClient.get('/season/me'),
                    ]);
                    this.rankingEntries = this.resultList(ranking, ['leaderboard', 'ranking', 'rankings', 'data', 'list']);
                    GameStore.ranking = [...this.rankingEntries];
                    this.seasonSummary = season?.data || season || null;
                    break;
                }
            }
        } catch (error) {
            console.error(`[CuteMainUI] refresh ${page} failed:`, error);
        } finally {
            this.busy.delete(key);
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

        this.buildBackground(root);

        this.topBar = new Node('CuteTopBar');
        root.addChild(this.topBar);
        setRect(this.topBar, 0, 570, DESIGN_WIDTH, 130);

        this.pageRoot = new Node('CutePageRoot');
        root.addChild(this.pageRoot);
        setRect(this.pageRoot, 0, -5, DESIGN_WIDTH, 1010);

        this.bottomNav = new Node('CuteBottomNav');
        root.addChild(this.bottomNav);
        setRect(this.bottomNav, 0, -575, DESIGN_WIDTH, 130);

        this.drawerLayer = new Node('CuteDrawerLayer');
        root.addChild(this.drawerLayer);
        setRect(this.drawerLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.modalLayer = new Node('CuteModalLayer');
        root.addChild(this.modalLayer);
        setRect(this.modalLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.utilityLayer = new Node('CuteUtilityLayer');
        root.addChild(this.utilityLayer);
        setRect(this.utilityLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.battleLayer = new Node('CuteBattleResultLayer');
        root.addChild(this.battleLayer);
        setRect(this.battleLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.toastLayer = new Node('CuteToastLayer');
        root.addChild(this.toastLayer);
        setRect(this.toastLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        this.loadingLayer = new Node('CuteLoadingLayer');
        root.addChild(this.loadingLayer);
        setRect(this.loadingLayer, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        this.loadingLayer.active = false;
    }

    private buildBackground(root: Node) {
        const background = panel(root, 'Background', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, CuteTheme.cream, 0, false, CuteTheme.cream, 0);

        const topWood = panel(background, 'TopWood', 0, 575, DESIGN_WIDTH, 130, new Color(222, 171, 111, 255), 0, false, CuteTheme.woodDark, 0);
        for (let i = 0; i < 8; i += 1) {
            panel(topWood, `WoodLine${i}`, -315 + i * 90, 0, 4, 130, new Color(170, 112, 64, 38), 0, false, CuteTheme.transparent, 0);
        }

        panel(background, 'MintPaper', -210, 80, 350, 890, new Color(229, 244, 218, 205), 110, false, CuteTheme.transparent, 0);
        panel(background, 'PeachPaper', 235, -50, 320, 780, new Color(255, 226, 211, 180), 110, false, CuteTheme.transparent, 0);

        for (let i = 0; i < 12; i += 1) {
            const x = -325 + (i % 4) * 220;
            const y = 430 - Math.floor(i / 4) * 380;
            text(background, `BgFlower${i}`, i % 2 === 0 ? '✿' : '✦', x, y, 36, 36, 20, i % 2 === 0 ? CuteTheme.white : CuteTheme.honey, 'center', true);
        }
    }

    private refreshAllVisuals() {
        if (!this.root) return;
        this.renderTopBar();
        this.renderBottomNav();
        this.renderCurrentPage(false);
        this.renderDrawer();
        this.renderSkillModal();
        this.renderUtilityModal();
        this.renderBattleResultModal();
    }

    private renderTopBar() {
        if (!this.topBar) return;
        clearNode(this.topBar);

        panel(this.topBar, 'CloudBack', 0, -2, 700, 118, new Color(255, 250, 234, 250), 34, true, CuteTheme.white, 3);

        image(this.topBar, 'Avatar', 'cute-ui/player_avatar', -300, 1, 82, 82, CuteTheme.paperWarm);
        text(this.topBar, 'Nickname', safeName(GameStore.user?.nickname, '小桃子'), -244, 20, 176, 32, 22, CuteTheme.caramel, 'left', true);
        text(this.topBar, 'Level', `Lv.${Number(GameStore.user?.level || 1)}`, -244, -20, 98, 28, 16, CuteTheme.honeyDark, 'left', true);
        text(this.topBar, 'Paw', '🐾', -135, -18, 34, 28, 18, CuteTheme.mintDark, 'center', true);

        cloudSign(this.topBar, 'SceneTitle', this.titleForPage(this.currentPage), 5, 3, 190, 66);

        capsule(
            this.topBar,
            'Gold',
            '●',
            formatNumber(GameStore.user?.gold),
            242,
            22,
            178,
            CuteTheme.paperWarm,
            () => this.showPage('shop'),
        );
        capsule(
            this.topBar,
            'Diamond',
            '◆',
            formatNumber(GameStore.user?.diamond),
            242,
            -28,
            178,
            new Color(217, 239, 247, 255),
            () => this.showPage('shop'),
        );

        const state = GameStore.online ? '● 在线' : '● 预览';
        text(this.topBar, 'Connection', state, 326, -53, 76, 22, 11, GameStore.online ? CuteTheme.mintDark : CuteTheme.muted, 'right', true);
    }

    private renderBottomNav() {
        if (!this.bottomNav) return;
        clearNode(this.bottomNav);

        panel(this.bottomNav, 'Shelf', 0, 0, 720, 126, new Color(174, 112, 62, 255), 0, true, CuteTheme.woodDark, 3);
        panel(this.bottomNav, 'ShelfTop', 0, 55, 720, 14, new Color(231, 181, 111, 255), 4, false, CuteTheme.woodDark, 2);

        const active = this.drawerOpen ? 'more' : this.mainTabForPage(this.currentPage);
        const tabs = [
            { key: 'home', title: '家园', icon: '🏠', action: () => this.showPage('home') },
            { key: 'pet', title: '宝宝', icon: '🐶', action: () => this.showPage('pet') },
            { key: 'inventory', title: '背包', icon: '🎒', action: () => this.showPage('inventory') },
            { key: 'adventure', title: '冒险', icon: '🧭', action: () => this.showPage('adventure') },
            { key: 'more', title: '更多', icon: '📖', action: () => this.toggleDrawer() },
        ];

        tabs.forEach((item, index) => {
            button(
                this.bottomNav!,
                `Tab_${item.key}`,
                item.title,
                -286 + index * 143,
                1,
                126,
                98,
                item.action,
                {
                    icon: item.icon,
                    selected: active === item.key,
                    fill: active === item.key ? CuteTheme.paperWarm : new Color(225, 181, 125, 255),
                    border: active === item.key ? CuteTheme.honey : CuteTheme.woodDark,
                    fontSize: 18,
                    radius: 25,
                },
            );
        });
    }

    private renderCurrentPage(animatePage = false) {
        if (!this.pageRoot) return;
        clearNode(this.pageRoot);

        switch (this.currentPage) {
            case 'home':
                this.renderHome();
                break;
            case 'pet':
                this.renderPetDetail();
                break;
            case 'inventory':
                this.renderInventory();
                break;
            case 'adventure':
                this.renderAdventure();
                break;
            case 'hatchery':
                this.renderHatchery();
                break;
            case 'skills':
                this.renderSkillLearning();
                break;
            case 'fusion':
                this.renderFusion();
                break;
            case 'friends':
                this.renderFriends();
                break;
            case 'marriage':
                this.renderMarriage();
                break;
            case 'mail':
                this.renderMail();
                break;
            case 'ranking':
                this.renderRanking();
                break;
            case 'trade':
                this.renderTrade();
                break;
            case 'profile':
                this.renderProfile();
                break;
            case 'more':
                this.renderMoreLanding();
                break;
            case 'settings':
                this.renderSettings();
                break;
            default:
                this.renderSecondaryPage(this.currentPage);
                break;
        }

        if (animatePage) this.playPageEnter();
    }

    private renderHome() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const pet = GameStore.currentPet || {};

        const scene = panel(root, 'HomeScene', 0, 8, 692, 920, new Color(255, 246, 224, 255), 42, true, CuteTheme.caramelSoft, 4);
        image(scene, 'RoomArt', 'cute-ui/home_room', 72, 28, 526, 824, CuteTheme.mint);

        headingTag(scene, 'PromoTitle', '限时福利', -274, 365, 118, CuteTheme.paperWarm);
        button(scene, 'ValueMall', '超值商城', -274, 276, 122, 112, () => this.showPage('shop'), {
            icon: '🎁',
            fill: CuteTheme.peach,
            fontSize: 15,
            radius: 26,
            subtitle: '每日特惠',
        });
        button(scene, 'MonthCard', '月卡', -274, 142, 122, 112, () => this.showToast('月卡入口已预留，后续接入充值系统'), {
            icon: '🌙',
            fill: CuteTheme.lilac,
            fontSize: 16,
            radius: 26,
            subtitle: '每日钻石',
        });
        button(scene, 'BattlePass', '战令', -274, 8, 122, 112, () => this.showToast('战令入口已预留，后续接入赛季任务'), {
            icon: '🏅',
            fill: CuteTheme.honey,
            fontSize: 16,
            radius: 26,
            subtitle: '赛季奖励',
        });
        button(scene, 'Welfare', '福利', -274, -126, 122, 112, () => this.showToast('签到、邮件和活动奖励将在福利中心集中展示'), {
            icon: '🎀',
            fill: CuteTheme.mint,
            fontSize: 16,
            radius: 26,
            subtitle: '签到活动',
        });

        const namePlate = panel(scene, 'NamePlate', 72, -356, 480, 96, new Color(255, 252, 239, 242), 28, true, CuteTheme.white, 3);
        text(namePlate, 'Name', safeName(pet?.nickname, '暂无宝宝'), -214, 18, 220, 36, 25, CuteTheme.caramel, 'left', true);
        text(namePlate, 'Meta', `Lv.${Number(pet?.level || 1)}　${safeName(pet?.species, '萌宠')}　${this.rarityName(pet)}`, -214, -20, 280, 30, 15, CuteTheme.muted, 'left', true);
        button(namePlate, 'PetDetail', '查看宝宝', 170, 0, 128, 52, () => this.showPage('pet'), {
            icon: '🐾',
            fill: CuteTheme.honey,
            fontSize: 15,
            radius: 22,
        });

        text(scene, 'HomeHint', '点击宝宝进入详情，培养、打书与炼妖均在宝宝功能中完成。', 72, -421, 500, 30, 14, CuteTheme.muted, 'center', false);
    }

    private renderPetDetail() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const pet = GameStore.currentPet || {};
        const pets = GameStore.pets.slice(0, 5);

        pets.forEach((item, index) => {
            button(
                root,
                `PetTab_${item?.id || index}`,
                safeName(item?.nickname, `宝宝${index + 1}`),
                -260 + index * 130,
                438,
                112,
                70,
                () => GameStore.selectPet(Number(item?.id || 0)),
                {
                    icon: '🐾',
                    selected: Number(item?.id) === Number(GameStore.currentPetId),
                    fill: index % 2 === 0 ? CuteTheme.paperWarm : CuteTheme.paper,
                    fontSize: 13,
                    radius: 20,
                },
            );
        });

        const book = panel(root, 'PetBook', 0, -12, 692, 810, CuteTheme.paper, 34, true, CuteTheme.caramelSoft, 3);
        panel(book, 'Spine', -329, 0, 18, 770, new Color(190, 126, 70, 255), 8, false, CuteTheme.woodDark, 2);
        for (let index = 0; index < 10; index += 1) {
            text(book, `Ring${index}`, '○', -329, 340 - index * 72, 24, 24, 22, CuteTheme.honeyDark, 'center', true);
        }

        const left = panel(book, 'BattleProfile', -171, 0, 320, 760, new Color(255, 248, 226, 255), 28, false, CuteTheme.caramelSoft, 2);
        image(left, 'PetPortrait', 'cute-ui/pet_portrait', 0, 226, 286, 294, CuteTheme.mint);
        text(left, 'Name', safeName(pet?.nickname, '未命名宝宝'), -140, 55, 190, 42, 28, CuteTheme.caramel, 'left', true);
        text(left, 'Gender', this.genderText(pet), 75, 55, 34, 34, 22, this.genderText(pet) === '♀' ? CuteTheme.peachDark : CuteTheme.mintDark, 'center', true);
        tag(left, 'Rarity', this.rarityName(pet), 125, 55, 92, CuteTheme.lilac);
        text(left, 'Meta', `${safeName(pet?.species, '萌宠')}　Lv.${Number(pet?.level || 1)}　${pet?.isMutant ? '变异' : '普通'}`, -140, 16, 270, 30, 15, CuteTheme.muted, 'left', true);

        headingTag(left, 'StatsTitle', '详细属性', 0, -34, 132, CuteTheme.paperWarm);
        const attr = this.battleAttributesOf(pet);
        const statRows = [
            ['生命', attr.hp, '❤'],
            ['物攻', attr.attack, '⚔'],
            ['法攻', attr.magic, '✦'],
            ['防御', attr.defense, '◆'],
            ['速度', attr.speed, '➤'],
            ['战力', attr.power, '★'],
            ['成长', this.growthValue(pet).toFixed(3), '🌱'],
            ['代数', Number(pet?.generation || 1), '◇'],
        ] as Array<[string, string | number, string]>;
        statRows.forEach(([title, value, icon], index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            this.battleStat(left, `Battle_${title}`, icon, title, value, -76 + col * 152, -92 - row * 68);
        });

        text(left, 'BreedInfo', `生育力 ${Number(pet?.fertility || 100)}/100　繁育 ${Number(pet?.breedCount || 0)}/${Number(pet?.maxBreedCount || 20)}`, 0, -340, 280, 30, 14, CuteTheme.muted, 'center', true);

        const aptitudePanel = panel(book, 'AptitudePanel', 170, 195, 322, 370, new Color(247, 255, 240, 255), 28, false, CuteTheme.mintDark, 2);
        headingTag(aptitudePanel, 'Title', '资质', 0, 148, 116, CuteTheme.mint);
        text(aptitudePanel, 'Hint', '资质影响升级后的属性成长', 0, 112, 280, 28, 13, CuteTheme.muted, 'center', false);
        const apt = this.aptitudesOf(pet);
        const aptRows = [
            ['体力资质', apt.hp, '❤'],
            ['攻击资质', apt.attack, '⚔'],
            ['防御资质', apt.defense, '◆'],
            ['法力资质', apt.magic, '✦'],
            ['速度资质', apt.speed, '➤'],
        ] as Array<[string, number, string]>;
        aptRows.forEach(([title, value, icon], index) => {
            this.aptitudeRow(aptitudePanel, `Apt_${index}`, icon, title, value, 72 - index * 52);
        });
        text(aptitudePanel, 'Growth', `成长：${this.growthValue(pet).toFixed(3)}　品质：${Number(pet?.quality || 100)}`, 0, -150, 284, 28, 14, CuteTheme.caramel, 'center', true);

        const skillPanel = panel(book, 'SkillPanel', 170, -205, 322, 390, new Color(255, 244, 240, 255), 28, false, CuteTheme.peachDark, 2);
        headingTag(skillPanel, 'Title', '技能', 0, 158, 116, CuteTheme.peach);
        text(skillPanel, 'Hint', '点击技能图标查看完整描述', 0, 122, 276, 28, 13, CuteTheme.muted, 'center', false);
        const skills = Array.isArray(pet?.skills) ? pet.skills.slice(0, 8) : [];
        if (!skills.length) {
            text(skillPanel, 'Empty', '暂无技能', 0, 25, 220, 50, 20, CuteTheme.muted, 'center', true);
        } else {
            skills.forEach((skill: any, index: number) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                this.skillIconButton(skillPanel, `Skill_${index}`, skill, -76 + col * 152, 74 - row * 72, 138, 62);
            });
        }
        button(skillPanel, 'LearnSkill', '打技能', -76, -158, 138, 52, () => this.showPage('skills'), {
            icon: '📕',
            fill: CuteTheme.honey,
            fontSize: 15,
            radius: 22,
        });
        button(skillPanel, 'Fusion', '炼妖', 76, -158, 138, 52, () => this.showPage('fusion'), {
            icon: '🔮',
            fill: CuteTheme.lilac,
            fontSize: 15,
            radius: 22,
        });
    }

    private renderInventory() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const eggItems = GameStore.inventory.filter((item) => this.isEggItem(item));
        const items = GameStore.inventory.filter((item) => !this.isEggItem(item)).slice(0, 10);

        const bag = panel(root, 'Bag', 0, 0, 692, 905, new Color(255, 244, 220, 255), 40, true, CuteTheme.caramelSoft, 4);
        headingTag(bag, 'BagTag', `背包物品 ${items.length}`, -225, 390, 176, CuteTheme.mint);
        text(bag, 'EggNotice', eggItems.length
            ? `检测到 ${eggItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)} 个宠物蛋，正在转入孵化室…`
            : '宠物蛋统一存放在孵化室，不占用普通背包格。', -305, 345, 480, 34, 14, CuteTheme.muted, 'left', true);
        button(bag, 'HatcheryShortcut', '孵化室', 255, 370, 120, 52, () => this.showPage('hatchery'), {
            icon: '🥚',
            fill: CuteTheme.honey,
            fontSize: 14,
            radius: 22,
        });

        if (!items.length) {
            text(bag, 'Empty', '背包空空的\n宠物蛋请前往孵化室查看', 0, 0, 420, 130, 24, CuteTheme.muted, 'center', true);
            return;
        }

        items.forEach((item, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const card = panel(
                bag,
                `Item_${item?.id || index}`,
                -166 + col * 332,
                260 - row * 145,
                310,
                128,
                this.isSkillBook(item) ? (this.itemTier(item) === 'high' ? new Color(255, 230, 230, 255) : new Color(230, 248, 226, 255)) : (index % 2 === 0 ? CuteTheme.paper : CuteTheme.mint),
                24,
                true,
                CuteTheme.white,
                3,
            );
            text(card, 'Icon', this.itemIcon(item), -132, 20, 54, 50, 30, CuteTheme.caramel, 'left', true);
            text(card, 'Name', safeName(item?.name || item?.itemCode, '道具'), -78, 28, 190, 30, 17, CuteTheme.caramel, 'left', true);
            text(card, 'Description', safeName(item?.description, '暂无描述'), -78, -6, 190, 44, 13, CuteTheme.muted, 'left', false);
            tag(card, 'Count', `×${Number(item?.quantity || 0)}`, 116, 34, 66, CuteTheme.paperWarm);

            const skillBook = this.isSkillBook(item);
            const usable = Boolean(item?.usable) && !skillBook;
            button(card, 'Action', skillBook ? '去打书' : usable ? '使用' : '材料', 98, -38, 96, 42, () => {
                if (skillBook) {
                    this.selectedSkillBookCode = String(item?.itemCode || '');
                    this.showPage('skills');
                } else if (usable) {
                    void this.useInventoryItem(item);
                }
            }, {
                fill: skillBook ? CuteTheme.honey : usable ? CuteTheme.green : new Color(222, 216, 202, 255),
                textColor: usable ? CuteTheme.white : CuteTheme.caramel,
                fontSize: 14,
                radius: 18,
                disabled: !skillBook && !usable,
            });
        });
    }

    private renderHatchery() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const room = panel(
            root,
            'HatcheryRoom',
            0,
            0,
            692,
            905,
            new Color(239, 250, 232, 255),
            40,
            true,
            CuteTheme.caramelSoft,
            4,
        );
        headingTag(room, 'Title', '温室孵化房', -220, 390, 190, CuteTheme.mint);
        text(
            room,
            'Hint',
            '孵化室只有一台装置。先从仓库选择宠物蛋放入，再等待或使用加速道具。',
            -305,
            346,
            580,
            34,
            14,
            CuteTheme.muted,
            'left',
            true,
        );

        const activeEgg = GameStore.eggs.find((egg) =>
            ['incubating', 'hatching', 'unhatched'].includes(String(egg?.status || '')),
        ) || null;
        const storedEggs = GameStore.eggs
            .filter((egg) => String(egg?.status || '') === 'stored')
            .slice(0, 6);

        const device = panel(
            room,
            'IncubatorDevice',
            0,
            142,
            640,
            370,
            new Color(255, 247, 219, 255),
            46,
            true,
            CuteTheme.honeyDark,
            4,
        );
        headingTag(device, 'DeviceTitle', '单槽孵化装置', 0, 154, 190, CuteTheme.paperWarm);
        panel(device, 'Glass', 0, 12, 320, 250, new Color(214, 242, 235, 220), 80, false, CuteTheme.white, 5);
        panel(device, 'Base', 0, -118, 420, 66, new Color(203, 151, 86, 255), 26, true, CuteTheme.woodDark, 3);

        if (!activeEgg) {
            text(device, 'EmptyIcon', '🥚', 0, 45, 140, 140, 72, CuteTheme.honeyDark, 'center', true);
            text(device, 'EmptyText', '装置空闲', 0, -22, 280, 38, 22, CuteTheme.caramel, 'center', true);
            text(device, 'EmptyHint', '请在下方孵化室仓库选择一枚蛋放入', 0, -62, 360, 30, 14, CuteTheme.muted, 'center', false);
            tag(device, 'DeviceState', '等待放入', 0, -122, 126, CuteTheme.mint);
        } else {
            const remaining = Math.max(0, Number(activeEgg?.remainingSeconds || 0));
            const total = Math.max(1, Number(activeEgg?.hatchDurationSeconds || remaining || 1));
            const ready = Boolean(activeEgg?.canHatch) || remaining <= 0;
            text(device, 'EggIcon', '🥚', -70, 40, 150, 150, 78, CuteTheme.honeyDark, 'center', true);
            text(device, 'EggName', `宠物蛋 #${Number(activeEgg?.id || 0)}`, 20, 73, 250, 38, 22, CuteTheme.caramel, 'left', true);
            text(
                device,
                'EggMeta',
                `${safeName(activeEgg?.species, '随机物种')} · 潜力 ${Number(activeEgg?.rarityPotential || 1)}`,
                20,
                34,
                260,
                30,
                14,
                CuteTheme.muted,
                'left',
                true,
            );
            progress(device, 'IncubationProgress', 130, -8, 230, 18, ready ? 1 : 1 - remaining / total, ready ? CuteTheme.green : CuteTheme.honey);
            text(
                device,
                'Remaining',
                ready ? '孵化完成，可以迎接宝宝了' : `剩余 ${this.formatSeconds(remaining)}`,
                20,
                -44,
                260,
                30,
                15,
                ready ? CuteTheme.mintDark : CuteTheme.honeyDark,
                'left',
                true,
            );
            button(device, 'Accelerate', '加速道具', -92, -122, 170, 54, () => this.openHatchAccelerator(), {
                icon: '⏳',
                fill: CuteTheme.sky,
                fontSize: 15,
                radius: 23,
                disabled: ready,
            });
            button(device, 'Hatch', ready ? '立即孵化' : '孵化中', 108, -122, 170, 54, () => void this.hatchEgg(activeEgg), {
                icon: ready ? '✨' : '🕒',
                fill: ready ? CuteTheme.honey : new Color(222, 216, 202, 255),
                fontSize: 15,
                radius: 23,
                disabled: !ready || this.busy.has(`hatch:${activeEgg?.id}`),
            });
        }

        const warehouse = panel(
            room,
            'EggWarehouse',
            0,
            -258,
            650,
            340,
            new Color(255, 252, 239, 255),
            30,
            true,
            CuteTheme.caramelSoft,
            3,
        );
        headingTag(warehouse, 'WarehouseTitle', `孵化室仓库 ${storedEggs.length}`, -220, 138, 190, CuteTheme.paperWarm);
        text(warehouse, 'WarehouseHint', '仓库只存放未开始孵化的宠物蛋', -290, 101, 420, 30, 13, CuteTheme.muted, 'left', true);

        if (!storedEggs.length) {
            text(
                warehouse,
                'EmptyWarehouse',
                '仓库暂时没有宠物蛋\n可前往商城、繁育或炼妖系统获取',
                0,
                -10,
                430,
                90,
                19,
                CuteTheme.muted,
                'center',
                true,
            );
            button(warehouse, 'GoShop', '前往商城', 0, -96, 170, 52, () => this.showPage('shop'), {
                icon: '🛒',
                fill: CuteTheme.honey,
                fontSize: 14,
                radius: 22,
            });
            return;
        }

        storedEggs.forEach((egg, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const card = panel(
                warehouse,
                `StoredEgg_${egg?.id || index}`,
                -212 + col * 212,
                36 - row * 126,
                196,
                112,
                index % 2 === 0 ? CuteTheme.paperWarm : CuteTheme.mint,
                22,
                true,
                CuteTheme.white,
                3,
            );
            text(card, 'EggIcon', '🥚', -78, 14, 48, 54, 34, CuteTheme.honeyDark, 'left', true);
            text(card, 'Name', `蛋 #${Number(egg?.id || 0)}`, -30, 28, 120, 26, 16, CuteTheme.caramel, 'left', true);
            text(card, 'Meta', `潜力 ${Number(egg?.rarityPotential || 1)}`, -30, -2, 120, 24, 12, CuteTheme.muted, 'left', true);
            button(card, 'PutIn', activeEgg ? '使用中' : '放入', 44, -36, 96, 36, () => void this.startEggIncubation(egg), {
                fill: activeEgg ? new Color(222, 216, 202, 255) : CuteTheme.honey,
                fontSize: 12,
                radius: 16,
                disabled: Boolean(activeEgg) || this.busy.has(`hatch-start:${egg?.id}`),
            });
        });

        const totalStored = GameStore.eggs.filter((egg) => String(egg?.status || '') === 'stored').length;
        if (totalStored > storedEggs.length) {
            text(warehouse, 'MoreEggs', `还有 ${totalStored - storedEggs.length} 枚蛋，后续支持翻页查看`, 0, -145, 360, 24, 12, CuteTheme.muted, 'center', true);
        }
    }

    private renderSkillLearning() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const pet = GameStore.currentPet || {};
        const pets = GameStore.pets.slice(0, 5);
        pets.forEach((item, index) => {
            button(root, `SkillPet_${item?.id || index}`, safeName(item?.nickname, `宝宝${index + 1}`), -260 + index * 130, 438, 112, 70, () => {
                GameStore.selectPet(Number(item?.id || 0));
                this.lockedSkillCodes.clear();
            }, {
                icon: '🐾',
                selected: Number(item?.id) === Number(GameStore.currentPetId),
                fill: CuteTheme.paperWarm,
                fontSize: 13,
                radius: 20,
            });
        });

        const page = panel(root, 'SkillBookPage', 0, -12, 692, 810, CuteTheme.paper, 34, true, CuteTheme.caramelSoft, 3);
        const current = panel(page, 'CurrentSkills', -174, 65, 322, 620, new Color(245, 252, 238, 255), 28, false, CuteTheme.mintDark, 2);
        headingTag(current, 'Title', `${safeName(pet?.nickname, '宝宝')}的技能`, 0, 272, 190, CuteTheme.mint);
        text(current, 'Hint', '点击技能查看描述；普通技能右侧可选择保护。', 0, 232, 280, 42, 13, CuteTheme.muted, 'center', false);
        const currentSkills = Array.isArray(pet?.skills) ? pet.skills.slice(0, 8) : [];
        currentSkills.forEach((skill: any, index: number) => {
            const y = 178 - index * 58;
            const code = this.skillCode(skill);
            const special = this.isSpecialSkill(skill);
            button(current, `Current_${index}`, this.skillName(skill), -35, y, 230, 48, () => this.showSkillDetail(skill), {
                iconPath: this.skillIconPath(skill),
                iconSize: 42,
                fill: this.skillColor(skill),
                textColor: this.skillTier(skill) === 'low' ? CuteTheme.caramel : CuteTheme.white,
                fontSize: 13,
                radius: 18,
                subtitle: this.skillTierLabel(skill),
            });
            button(current, `Lock_${index}`, this.lockedSkillCodes.has(code) ? '已锁' : '锁', 112, y, 58, 44, () => this.toggleSkillLock(skill), {
                icon: this.lockedSkillCodes.has(code) ? '🔒' : '🔓',
                fill: this.lockedSkillCodes.has(code) ? CuteTheme.honey : CuteTheme.paperWarm,
                fontSize: 11,
                radius: 18,
                disabled: special,
            });
        });
        if (!currentSkills.length) text(current, 'Empty', '暂无技能', 0, 45, 220, 50, 20, CuteTheme.muted, 'center', true);
        text(current, 'LockCost', `已保护 ${this.lockedSkillCodes.size} 个普通技能`, 0, -276, 250, 28, 14, CuteTheme.caramel, 'center', true);

        const books = panel(page, 'SkillBooks', 174, 65, 322, 620, new Color(255, 245, 240, 255), 28, false, CuteTheme.peachDark, 2);
        headingTag(books, 'Title', '技能书', 0, 272, 130, CuteTheme.peach);
        const bookItems = this.skillBookItems().slice(0, 8);
        if (!this.selectedSkillBookCode && bookItems.length) this.selectedSkillBookCode = String(bookItems[0]?.itemCode || '');
        bookItems.forEach((item, index) => {
            const y = 190 - index * 58;
            const selected = String(item?.itemCode || '') === this.selectedSkillBookCode;
            button(books, `Book_${index}`, safeName(item?.name, '技能书').replace('技能书', ''), -30, y, 236, 48, () => {
                this.selectedSkillBookCode = String(item?.itemCode || '');
                this.renderCurrentPage(false);
            }, {
                iconPath: this.skillBookIconPath(item),
                iconSize: 42,
                fill: this.itemTier(item) === 'high' ? new Color(232, 104, 103, 255) : new Color(116, 187, 82, 255),
                textColor: CuteTheme.white,
                fontSize: 13,
                radius: 18,
                selected,
                subtitle: `${this.itemTier(item) === 'high' ? '高级' : '低级'} ×${Number(item?.quantity || 0)}`,
            });
        });
        if (!bookItems.length) text(books, 'Empty', '背包中没有技能书\n请前往商城购买', 0, 60, 240, 90, 18, CuteTheme.muted, 'center', true);

        const selectedBook = bookItems.find((item) => String(item?.itemCode || '') === this.selectedSkillBookCode) || null;
        const description = selectedBook ? safeName(selectedBook?.description, '暂无描述') : '请选择一本技能书。';
        const desc = panel(page, 'BookDescription', 0, -306, 640, 150, new Color(255, 252, 239, 255), 24, false, CuteTheme.caramelSoft, 2);
        text(desc, 'Title', selectedBook ? safeName(selectedBook?.name, '技能书') : '打书说明', -292, 42, 370, 32, 18, CuteTheme.caramel, 'left', true);
        text(desc, 'Text', description, -292, -6, 420, 70, 14, CuteTheme.muted, 'left', false);
        text(desc, 'Risk', '打书会随机覆盖未保护技能；特殊技能不能保护。', -292, -52, 420, 28, 13, CuteTheme.peachDark, 'left', true);
        button(desc, 'Learn', '确认打书', 238, -2, 142, 66, () => void this.learnSelectedSkill(), {
            icon: '📕',
            fill: CuteTheme.honey,
            fontSize: 16,
            radius: 26,
            disabled: !selectedBook || !pet?.id || this.busy.has('skill:learn'),
        });
    }

    private renderFusion() {
        if (!this.pageRoot) return;
        this.ensureFusionParents();
        const root = this.pageRoot;
        const page = panel(root, 'FusionPage', 0, 0, 692, 905, new Color(250, 241, 255, 255), 40, true, CuteTheme.caramelSoft, 4);
        headingTag(page, 'Title', '炼妖', 0, 390, 128, CuteTheme.lilac);
        text(page, 'Explain', '选择两只宝宝进行合宠。父母会被消耗，结果可能更强，也可能退化。', 0, 348, 610, 44, 15, CuteTheme.muted, 'center', true);

        const parentA = GameStore.pets.find((pet) => Number(pet?.id) === this.fusionParentAId) || null;
        const parentB = GameStore.pets.find((pet) => Number(pet?.id) === this.fusionParentBId) || null;
        this.fusionParentCard(page, 'ParentA', '左侧宝宝', parentA, -174, 176, 'A');
        this.fusionParentCard(page, 'ParentB', '右侧宝宝', parentB, 174, 176, 'B');
        text(page, 'FusionMark', '＋', 0, 184, 70, 70, 48, CuteTheme.honeyDark, 'center', true);

        const preview = panel(page, 'Preview', 0, -145, 640, 285, CuteTheme.paper, 28, false, CuteTheme.caramelSoft, 2);
        headingTag(preview, 'PreviewTitle', '结果预览', 0, 112, 144, CuteTheme.paperWarm);
        if (!this.fusionPreview?.blueprint) {
            text(preview, 'EmptyPreview', '点击“预览结果”查看本次种子下可能获得的宝宝。\n预览不会消耗金币、材料或父母。', 0, 15, 530, 100, 18, CuteTheme.muted, 'center', false);
        } else {
            const bp = this.fusionPreview.blueprint;
            text(preview, 'Species', `物种：${safeName(bp?.species, bp?.speciesCode || '未知')}　${bp?.isMutant ? '变异' : '普通'}`, -284, 64, 310, 30, 16, CuteTheme.caramel, 'left', true);
            text(preview, 'Slots', `技能格：${Number(bp?.skillSlotCount || 0)}　特殊技能：${Number(bp?.specialSkillCount || 0)}`, -284, 25, 310, 30, 16, CuteTheme.caramel, 'left', true);
            text(preview, 'Growth', `成长：${Number(bp?.growth || 0).toFixed(3)}　品质：${Number(bp?.quality || 0)}`, -284, -14, 310, 30, 16, CuteTheme.caramel, 'left', true);
            const apt = bp?.aptitudes || {};
            text(preview, 'Aptitudes', `体 ${Number(apt.hp || 0)}　攻 ${Number(apt.attack || 0)}　防 ${Number(apt.defense || 0)}\n法 ${Number(apt.magic || 0)}　速 ${Number(apt.speed || 0)}`, -284, -66, 400, 58, 15, CuteTheme.muted, 'left', true);
            tag(preview, 'Gene', `基因 ${safeName(bp?.geneCode, 'AAAA')}`, 224, 28, 150, CuteTheme.mint);
            tag(preview, 'Generation', `第 ${Number(bp?.generation || 1)} 代`, 224, -18, 150, CuteTheme.paperWarm);
        }

        button(page, 'PreviewButton', '预览结果', -116, -344, 210, 64, () => void this.previewFusion(), {
            icon: '🔍', fill: CuteTheme.mint, fontSize: 17, radius: 28,
            disabled: !parentA || !parentB || this.busy.has('fusion:preview'),
        });
        button(page, 'ExecuteButton', '开始炼妖', 116, -344, 210, 64, () => void this.executeFusion(), {
            icon: '🔮', fill: CuteTheme.honey, fontSize: 17, radius: 28,
            disabled: !parentA || !parentB || this.busy.has('fusion:execute'),
        });
        text(page, 'Cost', '消耗：1000金币＋合宠核心×1　｜　操作不可撤销', 0, -397, 560, 30, 14, CuteTheme.peachDark, 'center', true);
    }

    private renderAdventure() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'AdventureSign', '冒险营地', 0, 456, 220, 66);

        const page = panel(root, 'AdventurePage', 0, 0, 692, 905, new Color(239, 247, 221, 255), 40, true, CuteTheme.caramelSoft, 4);

        const teamCard = panel(page, 'TeamCard', 0, 286, 640, 230, CuteTheme.paper, 28, false, CuteTheme.caramelSoft, 2);
        headingTag(teamCard, 'TeamTitle', '出战编队', -235, 84, 142, CuteTheme.paperWarm);
        text(teamCard, 'TeamPower', `总战力 ${formatNumber(this.teamPower())}`, 286, 84, 170, 32, 15, CuteTheme.caramel, 'right', true);

        for (let index = 0; index < 3; index += 1) {
            const pet = this.teamPets[index] || null;
            this.adventureTeamSlot(teamCard, `TeamSlot${index}`, pet, -190 + index * 190, -15, index + 1);
        }

        button(teamCard, 'EditTeam', this.teamEditing ? '返回模式' : '调整编队', 248, -82, 126, 46, () => {
            this.teamEditing = !this.teamEditing;
            this.renderCurrentPage(false);
        }, {
            icon: this.teamEditing ? '↩' : '✎',
            fill: this.teamEditing ? CuteTheme.peach : CuteTheme.mint,
            fontSize: 14,
            radius: 21,
        });

        if (this.teamEditing) {
            this.renderTeamEditor(page);
            return;
        }

        const modes = [
            { key: 'tower' as const, title: '爬塔', icon: '🏯', fill: CuteTheme.paperWarm },
            { key: 'pve' as const, title: '日常试炼', icon: '⚔', fill: CuteTheme.mint },
            { key: 'friend' as const, title: '好友切磋', icon: '🤝', fill: CuteTheme.peach },
        ];
        modes.forEach((mode, index) => {
            button(page, `Mode_${mode.key}`, mode.title, -210 + index * 210, 118, 184, 66, () => {
                this.adventureMode = mode.key;
                this.renderCurrentPage(false);
            }, {
                icon: mode.icon,
                selected: this.adventureMode === mode.key,
                fill: mode.fill,
                textColor: this.adventureMode === mode.key ? CuteTheme.white : CuteTheme.caramel,
                fontSize: 15,
                radius: 27,
            });
        });

        const content = panel(page, 'ModeContent', 0, -155, 640, 430, CuteTheme.paper, 30, false, CuteTheme.caramelSoft, 2);
        if (this.adventureMode === 'tower') this.renderTowerMode(content);
        else if (this.adventureMode === 'pve') this.renderPveMode(content);
        else this.renderFriendMode(content);
    }

    private renderTeamEditor(page: Node) {
        const editor = panel(page, 'TeamEditor', 0, -135, 640, 455, new Color(255, 250, 232, 255), 30, false, CuteTheme.caramelSoft, 2);
        headingTag(editor, 'EditorTitle', '选择1～3只宝宝', 0, 186, 210, CuteTheme.mint);
        text(editor, 'EditorHint', '点击宝宝加入或移出编队；寄售中的宝宝不能出战。', 0, 146, 550, 32, 14, CuteTheme.muted, 'center', true);

        const available = GameStore.pets
            .filter((pet) => !pet?.isEgg && pet?.tradeStatus !== 'listed' && !pet?.tradeListingId)
            .slice(0, 6);
        available.forEach((pet, index) => {
            const selected = this.teamPetIds.includes(Number(pet?.id || 0));
            const col = index % 3;
            const row = Math.floor(index / 3);
            button(editor, `PetChoice${pet?.id}`, safeName(pet?.nickname, `宝宝${index + 1}`), -205 + col * 205, 62 - row * 120, 176, 102, () => this.toggleTeamPet(Number(pet?.id || 0)), {
                icon: selected ? '✓' : '🐾',
                selected,
                fill: selected ? CuteTheme.mint : CuteTheme.paperWarm,
                textColor: selected ? CuteTheme.white : CuteTheme.caramel,
                fontSize: 14,
                radius: 24,
                subtitle: `Lv.${Number(pet?.level || 1)} · 战力${formatNumber(this.battleAttributesOf(pet).power)}`,
            });
        });

        if (!available.length) {
            text(editor, 'EmptyPets', '暂无可出战宝宝，请先完成孵化。', 0, 30, 500, 60, 20, CuteTheme.muted, 'center', true);
        }

        text(editor, 'SelectedCount', `已选择 ${this.teamPetIds.length}/3`, -260, -154, 180, 32, 16, CuteTheme.caramel, 'left', true);
        button(editor, 'CancelTeam', '取消', 108, -160, 132, 54, () => {
            this.teamEditing = false;
            this.renderCurrentPage(false);
        }, { fill: CuteTheme.paperWarm, fontSize: 16, radius: 24 });
        button(editor, 'SaveTeam', '保存编队', 248, -160, 150, 54, () => void this.saveTeam(), {
            icon: '✓', fill: CuteTheme.honey, fontSize: 16, radius: 24,
            disabled: !this.teamPetIds.length || this.busy.has('team:save'),
        });
    }

    private renderTowerMode(parent: Node) {
        const tower = GameStore.tower || {};
        const floor = Number(tower?.currentFloor || tower?.record?.currentFloor || 1);
        const maxFloor = Number(tower?.maxFloor || tower?.record?.maxFloor || 0);
        const monster = tower?.monster || {};
        const reward = tower?.rewardPreview || {};

        headingTag(parent, 'TowerHeading', `第 ${floor} 层`, -215, 170, 150, CuteTheme.paperWarm);
        tag(parent, 'TowerRecord', `最高 ${maxFloor} 层`, 225, 170, 150, CuteTheme.mint);
        text(parent, 'MonsterIcon', '👹', -228, 62, 120, 120, 66, CuteTheme.peachDark, 'center', true);
        text(parent, 'MonsterName', safeName(monster?.name, `守关怪物·${floor}`), -120, 104, 300, 38, 22, CuteTheme.caramel, 'left', true);
        text(parent, 'MonsterStats', `生命 ${formatNumber(monster?.maxHp || monster?.hp || floor * 180)}\n攻击 ${formatNumber(monster?.attack || floor * 22)}　防御 ${formatNumber(monster?.defense || floor * 15)}\n速度 ${formatNumber(monster?.speed || floor * 8)}`, -120, 22, 315, 105, 16, CuteTheme.muted, 'left', true);

        const rewardCard = panel(parent, 'RewardCard', 188, -48, 210, 145, new Color(255, 243, 206, 255), 24, false, CuteTheme.honey, 2);
        text(rewardCard, 'Title', '通关奖励', 0, 46, 170, 30, 17, CuteTheme.caramel, 'center', true);
        text(rewardCard, 'Reward', `金币 ${formatNumber(reward?.gold || floor * 100)}\n钻石 ${formatNumber(reward?.diamond || 0)}\n经验 ${formatNumber(reward?.exp || floor * 30)}`, 0, -18, 170, 86, 15, CuteTheme.caramel, 'center', true);

        text(parent, 'TowerTip', '使用当前三宠编队连续迎战守关怪物，胜利后自动进入下一层。', 0, -100, 560, 46, 14, CuteTheme.muted, 'center', true);
        button(parent, 'TowerChallenge', '挑战本层', 0, -164, 240, 66, () => void this.startAdventureBattle('tower'), {
            icon: '🏯', fill: CuteTheme.honey, fontSize: 19, radius: 28,
            disabled: !this.teamPetIds.length || this.busy.has('battle:tower'),
        });
    }

    private renderPveMode(parent: Node) {
        const averageLevel = this.teamPets.length
            ? Math.round(this.teamPets.reduce((sum, pet) => sum + Number(pet?.level || 1), 0) / this.teamPets.length)
            : 1;
        headingTag(parent, 'PveHeading', '日常试炼', 0, 170, 170, CuteTheme.mint);
        text(parent, 'PveDecor', '🌲　⚔　🐾　⚔　🌲', 0, 88, 520, 70, 42, CuteTheme.mintDark, 'center', true);
        text(parent, 'PveTitle', '森林训练场', 0, 28, 420, 46, 26, CuteTheme.caramel, 'center', true);
        text(parent, 'PveInfo', `队伍平均等级 Lv.${averageLevel}\n系统会按队伍等级生成3名训练对手\n该模式用于验证编队、技能与战斗搭配`, 0, -50, 520, 100, 16, CuteTheme.muted, 'center', false);
        button(parent, 'PveChallenge', '开始试炼', 0, -164, 240, 66, () => void this.startAdventureBattle('pve'), {
            icon: '⚔', fill: CuteTheme.mint, fontSize: 19, radius: 28,
            disabled: !this.teamPetIds.length || this.busy.has('battle:pve'),
        });
    }

    private renderFriendMode(parent: Node) {
        this.ensureSelectedFriend();
        const friend = this.selectedFriend();
        headingTag(parent, 'FriendHeading', '好友切磋', 0, 170, 180, CuteTheme.peach);
        if (!friend) {
            text(parent, 'NoFriend', '暂时没有可挑战好友。\n先前往好友相册添加好友吧。', 0, 36, 500, 100, 20, CuteTheme.muted, 'center', true);
            button(parent, 'GoFriend', '前往好友', 0, -140, 210, 62, () => this.showPage('friends'), {
                icon: '📷', fill: CuteTheme.peach, fontSize: 18, radius: 27,
            });
            return;
        }

        text(parent, 'FriendAvatar', '📷', -220, 50, 100, 100, 54, CuteTheme.peachDark, 'center', true);
        text(parent, 'FriendName', safeName(friend?.nickname || friend?.playerName, '好友玩家'), -120, 80, 330, 42, 24, CuteTheme.caramel, 'left', true);
        text(parent, 'FriendMeta', `玩家等级 Lv.${Number(friend?.level || 1)}\n可见宝宝 ${Array.isArray(friend?.pets) ? friend.pets.length : 0} 只`, -120, 22, 300, 64, 16, CuteTheme.muted, 'left', true);
        button(parent, 'PrevFriend', '上一个', -168, -68, 135, 50, () => this.cycleFriend(-1), { fill: CuteTheme.paperWarm, fontSize: 14, radius: 22 });
        button(parent, 'NextFriend', '下一个', 0, -68, 135, 50, () => this.cycleFriend(1), { fill: CuteTheme.paperWarm, fontSize: 14, radius: 22 });
        button(parent, 'FriendChallenge', '发起切磋', 180, -68, 170, 54, () => void this.startAdventureBattle('friend'), {
            icon: '🤝', fill: CuteTheme.peach, fontSize: 16, radius: 24,
            disabled: this.busy.has('battle:friend'),
        });
        text(parent, 'FriendTip', '好友切磋会记录胜负和赛季积分，不消耗宝宝。', 0, -150, 540, 40, 14, CuteTheme.muted, 'center', true);
    }


    private renderFriends() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'FriendSign', '好友相册', 0, 456, 220, 66);

        const tabs = panel(root, 'FriendTabs', 0, 382, 650, 68, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        const items: Array<['friends' | 'requests' | 'discover', string, string]> = [
            ['friends', '好友', '📷'], ['requests', '申请', '💌'], ['discover', '发现', '🔎'],
        ];
        items.forEach(([key, title, icon], index) => button(
            tabs, `FriendTab_${key}`, title, -210 + index * 210, 0, 188, 48,
            () => { this.friendMode = key; this.renderCurrentPage(false); },
            { icon, selected: this.friendMode === key, fill: this.friendMode === key ? CuteTheme.mint : CuteTheme.paperWarm, fontSize: 15, radius: 21 },
        ));

        const card = panel(root, 'FriendBook', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        if (this.friendMode === 'friends') this.renderFriendAlbum(card);
        else if (this.friendMode === 'requests') this.renderFriendRequests(card);
        else this.renderFriendDiscover(card);
    }

    private renderFriendAlbum(parent: Node) {
        headingTag(parent, 'AlbumTitle', `我的好友 ${GameStore.friends.length}`, 0, 306, 190, CuteTheme.mint);
        if (!GameStore.friends.length) {
            text(parent, 'EmptyIcon', '📷', 0, 145, 150, 120, 72, CuteTheme.peachDark, 'center', true);
            text(parent, 'EmptyText', '相册还是空的\n可以先创建Beta测试好友，或去“发现”发送申请。', 0, 30, 520, 100, 19, CuteTheme.muted, 'center', true);
            button(parent, 'SeedFriends', '创建测试好友', 0, -110, 220, 62, () => void this.seedFriends(), { icon: '🐾', fill: CuteTheme.honey, fontSize: 17, radius: 27, disabled: this.busy.has('friends:seed') });
            return;
        }

        GameStore.friends.slice(0, 4).forEach((friend, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = -164 + col * 328;
            const y = 155 - row * 265;
            const photo = panel(parent, `FriendPhoto_${friend?.id ?? index}`, x, y, 292, 232, new Color(255, 250, 231, 255), 28, true, CuteTheme.white, 3);
            text(photo, 'Avatar', '🐾', -96, 55, 72, 72, 42, CuteTheme.peachDark, 'center', true);
            text(photo, 'Name', safeName(friend?.nickname, `玩家${friend?.id || ''}`), -48, 78, 172, 34, 20, CuteTheme.caramel, 'left', true);
            text(photo, 'Meta', `Lv.${Number(friend?.level || 1)} · 宝宝${Array.isArray(friend?.pets) ? friend.pets.length : 0}只`, -48, 41, 174, 28, 13, CuteTheme.muted, 'left', true);
            const petNames = (Array.isArray(friend?.pets) ? friend.pets : []).slice(0, 2).map((pet: any) => safeName(pet?.nickname, '宝宝')).join('、');
            text(photo, 'Pets', petNames || '暂未展示宝宝', 0, -8, 250, 34, 14, CuteTheme.caramel, 'center', true);
            button(photo, 'Challenge', '切磋', -68, -72, 120, 48, () => {
                this.selectedFriendUserId = Number(friend?.userId || friend?.id || 0);
                this.adventureMode = 'friend';
                this.showPage('adventure');
            }, { icon: '⚔', fill: CuteTheme.sky, fontSize: 14, radius: 20 });
            button(photo, 'Marriage', '结缘', 68, -72, 120, 48, () => {
                const firstPet = Array.isArray(friend?.pets) ? friend.pets[0] : null;
                this.marriageTargetPetId = Number(firstPet?.id || 0);
                this.marriageMode = 'match';
                this.showPage('marriage');
            }, { icon: '💞', fill: CuteTheme.pink, fontSize: 14, radius: 20, disabled: !(Array.isArray(friend?.pets) && friend.pets.length) });
        });
        if (GameStore.friends.length > 4) text(parent, 'MoreFriends', `还有 ${GameStore.friends.length - 4} 位好友，后续分页展示`, 0, -313, 420, 28, 13, CuteTheme.muted, 'center', true);
    }

    private renderFriendRequests(parent: Node) {
        headingTag(parent, 'RequestTitle', `好友申请 ${this.incomingFriendRequests.filter((r) => r?.status === 'pending').length}`, 0, 306, 200, CuteTheme.peach);
        const rows = [
            ...this.incomingFriendRequests.map((item) => ({ ...item, direction: 'incoming' })),
            ...this.outgoingFriendRequests.map((item) => ({ ...item, direction: 'outgoing' })),
        ].slice(0, 5);
        if (!rows.length) {
            text(parent, 'NoRequests', '没有新的好友申请\n收到的申请和已发送记录都会显示在这里。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true);
            return;
        }
        rows.forEach((request, index) => {
            const y = 220 - index * 108;
            const row = panel(parent, `FriendRequest_${request?.id ?? index}`, 0, y, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
            const other = request?.otherUser || {};
            text(row, 'Icon', request.direction === 'incoming' ? '📥' : '📤', -260, 0, 44, 44, 25, CuteTheme.honeyDark, 'center', true);
            text(row, 'Name', safeName(other?.nickname, `玩家${other?.id || ''}`), -224, 17, 230, 30, 17, CuteTheme.caramel, 'left', true);
            text(row, 'State', request.direction === 'incoming' ? `收到申请 · ${this.statusLabel(request?.status)}` : `已发送 · ${this.statusLabel(request?.status)}`, -224, -17, 260, 26, 13, CuteTheme.muted, 'left', true);
            if (request.direction === 'incoming' && String(request?.status) === 'pending') {
                button(row, 'Accept', '接受', 177, 0, 90, 44, () => void this.handleFriendRequest(request, true), { fill: CuteTheme.mint, fontSize: 13, radius: 19 });
                button(row, 'Reject', '拒绝', 272, 0, 80, 44, () => void this.handleFriendRequest(request, false), { fill: CuteTheme.peach, fontSize: 13, radius: 19 });
            } else {
                tag(row, 'StatusTag', this.statusLabel(request?.status), 235, 0, 116, CuteTheme.paper, CuteTheme.muted);
            }
        });
    }

    private renderFriendDiscover(parent: Node) {
        headingTag(parent, 'DiscoverTitle', '发现新伙伴', 0, 306, 190, CuteTheme.sky);
        text(parent, 'Tip', 'Beta阶段先用玩家ID快速搜索。正式微信版本会支持昵称、好友推荐与微信好友。', 0, 250, 560, 46, 14, CuteTheme.muted, 'center', true);
        const keys = ['101', '102', '103', '104'];
        keys.forEach((key, index) => button(parent, `Search_${key}`, `ID ${key}`, -225 + index * 150, 187, 132, 46, () => void this.searchFriend(key), { fill: this.friendSearchKeyword === key ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 14, radius: 19 }));
        button(parent, 'SeedRecommend', '补充测试玩家', 0, 125, 190, 48, () => void this.seedFriends(), { icon: '🐾', fill: CuteTheme.mint, fontSize: 14, radius: 21, disabled: this.busy.has('friends:seed') });

        const rows = this.friendSearchResults.slice(0, 4);
        if (!rows.length) {
            text(parent, 'SearchEmpty', '点击上方玩家ID进行搜索\n已经是好友的玩家会标记为“已添加”。', 0, -15, 500, 100, 18, CuteTheme.muted, 'center', true);
            return;
        }
        rows.forEach((user, index) => {
            const y = 55 - index * 112;
            const row = panel(parent, `SearchUser_${user?.id ?? index}`, 0, y, 590, 94, CuteTheme.paperWarm, 22, false, CuteTheme.white, 2);
            text(row, 'Avatar', '🐾', -250, 0, 48, 48, 28, CuteTheme.peachDark, 'center', true);
            text(row, 'Name', safeName(user?.nickname, `玩家${user?.id || ''}`), -210, 17, 260, 30, 18, CuteTheme.caramel, 'left', true);
            text(row, 'Meta', `ID ${user?.id || '-'} · Lv.${Number(user?.level || 1)}`, -210, -17, 260, 24, 13, CuteTheme.muted, 'left', true);
            button(row, 'Add', user?.isFriend ? '已添加' : '加好友', 230, 0, 118, 46, () => void this.sendFriendRequest(user), { fill: user?.isFriend ? new Color(220, 218, 208, 255) : CuteTheme.mint, fontSize: 14, radius: 20, disabled: Boolean(user?.isFriend) || this.busy.has(`friend:add:${user?.id}`) });
        });
    }

    private renderMarriage() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'MarriageSign', '心愿婚礼', 0, 456, 220, 66);
        const tabs = panel(root, 'MarriageTabs', 0, 382, 650, 68, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        const items: Array<['marriages' | 'proposals' | 'match', string, string]> = [
            ['marriages', '已结缘', '💞'], ['proposals', '申请', '💌'], ['match', '配对', '🎀'],
        ];
        items.forEach(([key, title, icon], index) => button(tabs, `MarriageTab_${key}`, title, -210 + index * 210, 0, 188, 48, () => { this.marriageMode = key; this.renderCurrentPage(false); }, { icon, selected: this.marriageMode === key, fill: this.marriageMode === key ? CuteTheme.pink : CuteTheme.paperWarm, fontSize: 15, radius: 21 }));
        const card = panel(root, 'MarriageBook', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        if (this.marriageMode === 'marriages') this.renderMarriageList(card);
        else if (this.marriageMode === 'proposals') this.renderMarriageProposals(card);
        else this.renderMarriageMatch(card);
    }

    private renderMarriageList(parent: Node) {
        headingTag(parent, 'MarriedTitle', `结缘宝宝 ${GameStore.marriages.length}`, 0, 306, 200, CuteTheme.pink);
        if (!GameStore.marriages.length) {
            text(parent, 'NoMarriage', '还没有结缘中的宝宝\n前往“配对”选择自己的宝宝和好友宝宝。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true);
            button(parent, 'GoMatch', '开始配对', 0, -70, 210, 60, () => { this.marriageMode = 'match'; this.renderCurrentPage(false); }, { icon: '🎀', fill: CuteTheme.pink, fontSize: 17, radius: 26 });
            return;
        }
        GameStore.marriages.slice(0, 4).forEach((marriage, index) => {
            const pets = Array.isArray(marriage?.pets) ? marriage.pets : [];
            const petA = pets[0] || { id: marriage?.petAId, nickname: `宝宝${marriage?.petAId || ''}` };
            const petB = pets[1] || { id: marriage?.petBId, nickname: `宝宝${marriage?.petBId || ''}` };
            const y = 210 - index * 140;
            const row = panel(parent, `Marriage_${marriage?.id ?? index}`, 0, y, 602, 122, index % 2 ? CuteTheme.paperWarm : new Color(255, 249, 238, 255), 25, false, CuteTheme.white, 2);
            text(row, 'PetA', safeName(petA?.nickname, '宝宝A'), -210, 28, 180, 30, 17, CuteTheme.caramel, 'center', true);
            text(row, 'Heart', '💞', 0, 27, 60, 44, 28, CuteTheme.peachDark, 'center', true);
            text(row, 'PetB', safeName(petB?.nickname, '宝宝B'), 210, 28, 180, 30, 17, CuteTheme.caramel, 'center', true);
            const remaining = Number(marriage?.cooldownRemainingSeconds || 0);
            const state = marriage?.isMyTurn ? (remaining > 0 ? `我的回合 · ${this.formatSeconds(remaining)}` : '轮到我获得宠物蛋') : '等待对方回合';
            text(row, 'State', state, -190, -27, 360, 28, 13, marriage?.isMyTurn ? CuteTheme.peachDark : CuteTheme.muted, 'left', true);
            button(row, 'LayEgg', '产蛋', 225, -30, 112, 46, () => void this.layMarriageEgg(marriage), { icon: '🥚', fill: CuteTheme.honey, fontSize: 14, radius: 20, disabled: !marriage?.canLayEgg || this.busy.has(`marriage:egg:${marriage?.id}`) });
        });
    }

    private renderMarriageProposals(parent: Node) {
        const pending = this.marriageProposals.filter((item) => String(item?.status) === 'pending');
        headingTag(parent, 'ProposalTitle', `结婚申请 ${pending.length}`, 0, 306, 200, CuteTheme.peach);
        if (!this.marriageProposals.length) {
            text(parent, 'NoProposal', '没有结婚申请记录\n配对后发出的申请会在这里保留72小时。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true);
            return;
        }
        this.marriageProposals.slice(0, 5).forEach((proposal, index) => {
            const incoming = Number(proposal?.targetUserId || 0) === Number(GameStore.user?.id || 1);
            const y = 220 - index * 108;
            const row = panel(parent, `Proposal_${proposal?.id ?? index}`, 0, y, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
            text(row, 'Icon', incoming ? '📥' : '📤', -260, 0, 44, 44, 25, CuteTheme.peachDark, 'center', true);
            text(row, 'Name', `${incoming ? '收到' : '发出'}：宝宝${proposal?.proposerPetId || '-'} × 宝宝${proposal?.targetPetId || '-'}`, -224, 17, 340, 30, 16, CuteTheme.caramel, 'left', true);
            text(row, 'State', this.statusLabel(proposal?.status), -224, -17, 220, 24, 13, CuteTheme.muted, 'left', true);
            if (String(proposal?.status) === 'pending' && incoming) {
                button(row, 'Accept', '同意', 174, 0, 88, 44, () => void this.respondMarriageProposal(proposal, true), { fill: CuteTheme.mint, fontSize: 13, radius: 19 });
                button(row, 'Reject', '拒绝', 269, 0, 82, 44, () => void this.respondMarriageProposal(proposal, false), { fill: CuteTheme.peach, fontSize: 13, radius: 19 });
            } else if (String(proposal?.status) === 'pending') {
                button(row, 'Cancel', '撤回', 232, 0, 108, 44, () => void this.cancelMarriageProposal(proposal), { fill: CuteTheme.paper, fontSize: 13, radius: 19 });
            } else tag(row, 'Status', this.statusLabel(proposal?.status), 230, 0, 116, CuteTheme.paper, CuteTheme.muted);
        });
    }

    private renderMarriageMatch(parent: Node) {
        this.ensureMarriageSelection();
        const ownPets = GameStore.pets.filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed');
        const targetPets = this.friendPets().filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed');
        const own = ownPets.find((pet) => Number(pet?.id) === this.marriageOwnPetId) || ownPets[0];
        const target = targetPets.find((pet) => Number(pet?.id) === this.marriageTargetPetId) || targetPets[0];
        headingTag(parent, 'MatchTitle', '选择结缘对象', 0, 306, 210, CuteTheme.pink);

        const left = panel(parent, 'OwnPet', -164, 110, 282, 280, new Color(255, 249, 235, 255), 28, true, CuteTheme.white, 3);
        text(left, 'Owner', '我的宝宝', 0, 104, 220, 32, 17, CuteTheme.caramel, 'center', true);
        text(left, 'PetIcon', '🐶', 0, 35, 100, 90, 58, CuteTheme.honeyDark, 'center', true);
        text(left, 'Name', safeName(own?.nickname, '暂无可用宝宝'), 0, -33, 240, 34, 20, CuteTheme.caramel, 'center', true);
        text(left, 'Meta', own ? `Lv.${Number(own?.level || 1)} · ${this.genderText(own)} · 生育力${Number(own?.fertility || 100)}` : '请先获得宝宝', 0, -73, 246, 30, 13, CuteTheme.muted, 'center', true);
        button(left, 'Prev', '上一个', -65, -112, 112, 42, () => this.cycleMarriagePet('own', -1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: ownPets.length < 2 });
        button(left, 'Next', '下一个', 65, -112, 112, 42, () => this.cycleMarriagePet('own', 1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: ownPets.length < 2 });

        const right = panel(parent, 'TargetPet', 164, 110, 282, 280, new Color(255, 244, 242, 255), 28, true, CuteTheme.white, 3);
        text(right, 'Owner', '好友宝宝', 0, 104, 220, 32, 17, CuteTheme.caramel, 'center', true);
        text(right, 'PetIcon', '🐱', 0, 35, 100, 90, 58, CuteTheme.peachDark, 'center', true);
        text(right, 'Name', safeName(target?.nickname, '暂无好友宝宝'), 0, -33, 240, 34, 20, CuteTheme.caramel, 'center', true);
        text(right, 'Meta', target ? `Lv.${Number(target?.level || 1)} · ${this.genderText(target)} · 生育力${Number(target?.fertility || 100)}` : '先添加有宝宝的好友', 0, -73, 246, 30, 13, CuteTheme.muted, 'center', true);
        button(right, 'Prev', '上一个', -65, -112, 112, 42, () => this.cycleMarriagePet('target', -1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: targetPets.length < 2 });
        button(right, 'Next', '下一个', 65, -112, 112, 42, () => this.cycleMarriagePet('target', 1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: targetPets.length < 2 });

        text(parent, 'Ribbon', '────── 🎀 三代血缘自动校验 🎀 ──────', 0, -80, 560, 42, 16, CuteTheme.peachDark, 'center', true);
        text(parent, 'Rules', '申请有效期72小时；通过后双方轮流获得宠物蛋。\n每次产蛋消耗500金币、繁育凭证和双方20点生育力。', 0, -145, 570, 70, 15, CuteTheme.muted, 'center', false);
        button(parent, 'Propose', '发送结缘申请', 0, -245, 250, 64, () => void this.proposeMarriage(), { icon: '💌', fill: CuteTheme.pink, fontSize: 18, radius: 28, disabled: !own || !target || this.busy.has('marriage:propose') });
    }

    private renderMail() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'MailSign', '邮差信箱', 0, 456, 220, 66);
        const toolbar = panel(root, 'MailToolbar', 0, 382, 650, 72, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        text(toolbar, 'Count', `未读 ${this.mailUnreadCount} · 可领取 ${this.mailClaimableCount}`, -285, 0, 260, 34, 16, CuteTheme.caramel, 'left', true);
        button(toolbar, 'ReadAll', '全部已读', 120, 0, 136, 46, () => void this.readAllMail(), { fill: CuteTheme.sky, fontSize: 13, radius: 20, disabled: this.mailUnreadCount <= 0 });
        button(toolbar, 'ClaimAll', '一键领取', 258, 0, 136, 46, () => void this.claimAllMail(), { fill: CuteTheme.honey, fontSize: 13, radius: 20, disabled: this.mailClaimableCount <= 0 });

        const card = panel(root, 'MailBook', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        if (!this.mails.length) {
            text(card, 'EmptyIcon', '💌', 0, 130, 160, 140, 82, CuteTheme.peachDark, 'center', true);
            text(card, 'EmptyText', '信箱里暂时没有邮件\nBeta阶段可以创建一封欢迎奖励邮件进行测试。', 0, 15, 520, 100, 19, CuteTheme.muted, 'center', true);
            button(card, 'SeedMail', '创建欢迎邮件', 0, -120, 220, 62, () => void this.seedWelcomeMail(), { icon: '🎁', fill: CuteTheme.honey, fontSize: 17, radius: 27, disabled: this.busy.has('mail:seed') });
            return;
        }

        this.mails.slice(0, 5).forEach((mail, index) => {
            const y = 245 - index * 114;
            const selected = Number(mail?.id || 0) === this.selectedMailId;
            const row = panel(card, `Mail_${mail?.id ?? index}`, 0, y, 602, 98, selected ? new Color(255, 243, 214, 255) : (index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255)), 22, false, CuteTheme.white, 2);
            text(row, 'Icon', mail?.claimed ? '📭' : mail?.readed ? '✉️' : '💌', -260, 0, 46, 46, 27, mail?.readed ? CuteTheme.muted : CuteTheme.peachDark, 'center', true);
            text(row, 'Title', safeName(mail?.title, '系统邮件'), -224, 19, 280, 30, 17, CuteTheme.caramel, 'left', !mail?.readed);
            text(row, 'Attach', this.attachmentSummary(mail), -224, -17, 300, 24, 13, CuteTheme.muted, 'left', true);
            button(row, 'Read', '查看', 150, 0, 86, 44, () => void this.selectMail(mail), { fill: CuteTheme.sky, fontSize: 13, radius: 19 });
            button(row, 'Claim', mail?.claimed ? '已领取' : mail?.canClaim ? '领取' : '无附件', 252, 0, 108, 44, () => void this.claimMail(mail), { fill: mail?.canClaim ? CuteTheme.honey : new Color(220, 218, 208, 255), fontSize: 13, radius: 19, disabled: !mail?.canClaim || this.busy.has(`mail:claim:${mail?.id}`) });
        });

        const selected = this.mails.find((mail) => Number(mail?.id || 0) === this.selectedMailId);
        if (selected) {
            const detail = panel(card, 'MailDetail', 0, -286, 602, 84, new Color(244, 238, 221, 255), 20, false, CuteTheme.white, 2);
            text(detail, 'Content', String(selected?.content || '暂无正文').slice(0, 90), 0, 0, 560, 62, 13, CuteTheme.caramel, 'center', false);
        }
    }

    private renderRanking() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'RankingSign', '森林排行榜', 0, 456, 230, 66);
        const tabs = panel(root, 'RankingTabs', 0, 382, 666, 68, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        const modes: Array<['tower' | 'level' | 'power' | 'season', string, string]> = [
            ['tower', '爬塔', '🗼'], ['level', '等级', '⭐'], ['power', '战力', '⚔'], ['season', '赛季', '🏅'],
        ];
        modes.forEach(([key, title, icon], index) => button(tabs, `RankTab_${key}`, title, -246 + index * 164, 0, 148, 48, () => void this.changeRankingMode(key), { icon, selected: this.rankingMode === key, fill: this.rankingMode === key ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 13, radius: 20 }));

        const card = panel(root, 'RankingCard', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        const season = this.seasonSummary?.season || this.seasonSummary?.data?.season || {};
        const player = this.seasonSummary?.player || this.seasonSummary?.data?.player || {};
        text(card, 'Season', `${safeName(season?.name, '当前赛季')} · 我的积分 ${Number(player?.points || 0)} · 评级 ${Number(player?.rating || 1000)}`, 0, 309, 590, 34, 14, CuteTheme.peachDark, 'center', true);

        if (!this.rankingEntries.length) {
            text(card, 'Empty', '当前榜单还没有记录\n完成爬塔、培养宝宝或好友切磋后即可上榜。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true);
            return;
        }
        this.rankingEntries.slice(0, 6).forEach((item, index) => {
            const rank = Number(item?.rank || index + 1);
            const y = 245 - index * 93;
            const row = panel(card, `Rank_${rank}`, 0, y, 604, 78, rank <= 3 ? new Color(255, 247, 220, 255) : (index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255)), 21, false, CuteTheme.white, 2);
            text(row, 'Medal', rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank), -262, 0, 58, 48, rank <= 3 ? 28 : 20, CuteTheme.honeyDark, 'center', true);
            text(row, 'Name', safeName(item?.petName || item?.playerName || item?.nickname, `玩家${item?.userId || ''}`), -218, 14, 260, 30, 17, CuteTheme.caramel, 'left', true);
            text(row, 'Owner', item?.petName ? safeName(item?.playerName, '玩家') : `ID ${item?.userId || '-'}`, -218, -15, 260, 24, 12, CuteTheme.muted, 'left', true);
            text(row, 'Score', this.rankingScoreText(item), 265, 0, 170, 34, 16, CuteTheme.peachDark, 'right', true);
        });
    }

    private renderTrade() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'TradeSign', '萌宠寄售市场', 0, 456, 250, 66);
        const tabs = panel(root, 'TradeTabs', 0, 382, 666, 68, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        const modes: Array<['market' | 'mine' | 'history' | 'list', string, string]> = [
            ['market', '市场', '🏷'], ['mine', '我的', '📌'], ['history', '记录', '📒'], ['list', '上架', '➕'],
        ];
        modes.forEach(([key, title, icon], index) => button(tabs, `TradeTab_${key}`, title, -246 + index * 164, 0, 148, 48, () => { this.tradeMode = key; this.renderCurrentPage(false); }, { icon, selected: this.tradeMode === key, fill: this.tradeMode === key ? CuteTheme.lilac : CuteTheme.paperWarm, fontSize: 13, radius: 20 }));
        const card = panel(root, 'TradeBook', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        if (this.tradeMode === 'market') this.renderTradeMarket(card);
        else if (this.tradeMode === 'mine') this.renderMyTrade(card);
        else if (this.tradeMode === 'history') this.renderTradeHistory(card);
        else this.renderTradeListForm(card);
    }

    private renderTradeMarket(parent: Node) {
        headingTag(parent, 'MarketTitle', `市场在售 ${this.tradeListings.length}`, 0, 306, 200, CuteTheme.lilac);
        if (!this.tradeListings.length) {
            text(parent, 'MarketEmpty', '市场暂时没有寄售宝宝\n可以先把自己的非出战宝宝上架。', 0, 80, 520, 100, 19, CuteTheme.muted, 'center', true);
            button(parent, 'GoList', '我要上架', 0, -65, 200, 60, () => { this.tradeMode = 'list'; this.renderCurrentPage(false); }, { icon: '➕', fill: CuteTheme.lilac, fontSize: 17, radius: 26 });
            return;
        }
        this.tradeListings.slice(0, 5).forEach((listing, index) => this.renderTradeRow(parent, listing, index, 'buy'));
    }

    private renderMyTrade(parent: Node) {
        headingTag(parent, 'MyTradeTitle', `我的寄售 ${this.myTradeListings.length}`, 0, 306, 200, CuteTheme.sky);
        if (!this.myTradeListings.length) {
            text(parent, 'MyEmpty', '还没有寄售记录\n上架需要100金币，成交后收取5%手续费。', 0, 80, 520, 100, 19, CuteTheme.muted, 'center', true);
            return;
        }
        this.myTradeListings.slice(0, 5).forEach((listing, index) => this.renderTradeRow(parent, listing, index, 'cancel'));
    }

    private renderTradeHistory(parent: Node) {
        headingTag(parent, 'HistoryTitle', `交易记录 ${this.tradeHistory.length}`, 0, 306, 200, CuteTheme.paperWarm);
        if (!this.tradeHistory.length) {
            text(parent, 'HistoryEmpty', '暂无成交记录', 0, 80, 420, 80, 20, CuteTheme.muted, 'center', true);
            return;
        }
        this.tradeHistory.slice(0, 6).forEach((record, index) => {
            const y = 235 - index * 92;
            const row = panel(parent, `TradeHistory_${record?.id ?? index}`, 0, y, 602, 76, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 20, false, CuteTheme.white, 2);
            const soldByMe = Number(record?.sellerUserId || 0) === Number(GameStore.user?.id || 1);
            text(row, 'Icon', soldByMe ? '📤' : '📥', -260, 0, 46, 46, 24, CuteTheme.honeyDark, 'center', true);
            text(row, 'Title', soldByMe ? `售出宝宝 #${record?.petId || '-'}` : `购入宝宝 #${record?.petId || '-'}`, -222, 13, 300, 28, 16, CuteTheme.caramel, 'left', true);
            text(row, 'Meta', `成交价 ${formatNumber(record?.price || 0)} ${record?.currencyType === 'diamond' ? '钻石' : '金币'}`, -222, -14, 330, 24, 13, CuteTheme.muted, 'left', true);
        });
    }

    private renderTradeListForm(parent: Node) {
        this.ensureTradePet();
        const eligible = this.tradeEligiblePets();
        const pet = eligible.find((item) => Number(item?.id) === this.tradePetId) || eligible[0];
        headingTag(parent, 'ListTitle', '上架宝宝', 0, 306, 180, CuteTheme.lilac);
        if (!pet) {
            text(parent, 'NoEligible', '没有可上架的宝宝\n已锁定、收藏、结婚、出战或已经寄售的宝宝不能上架。', 0, 80, 540, 110, 18, CuteTheme.muted, 'center', true);
            return;
        }
        const petCard = panel(parent, 'ListPet', 0, 135, 520, 210, new Color(255, 248, 235, 255), 28, true, CuteTheme.white, 3);
        text(petCard, 'Icon', '🐶', -190, 20, 110, 100, 62, CuteTheme.honeyDark, 'center', true);
        text(petCard, 'Name', safeName(pet?.nickname, '宝宝'), -115, 58, 300, 38, 22, CuteTheme.caramel, 'left', true);
        const attrs = this.battleAttributesOf(pet);
        text(petCard, 'Meta', `Lv.${Number(pet?.level || 1)} · ${this.rarityName(pet)} · 战力 ${formatNumber(attrs.power)}\n成长 ${this.growthValue(pet).toFixed(3)} · 特殊技能 ${this.specialSkills(pet).length}`, -115, -3, 330, 68, 15, CuteTheme.muted, 'left', true);
        button(petCard, 'Prev', '上一个', -75, -76, 128, 42, () => this.cycleTradePet(-1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: eligible.length < 2 });
        button(petCard, 'Next', '下一个', 75, -76, 128, 42, () => this.cycleTradePet(1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: eligible.length < 2 });

        const priceCard = panel(parent, 'PriceCard', 0, -60, 560, 150, CuteTheme.paperWarm, 26, false, CuteTheme.white, 2);
        button(priceCard, 'Currency', this.tradeCurrency === 'gold' ? '金币' : '钻石', -195, 26, 120, 48, () => { this.tradeCurrency = this.tradeCurrency === 'gold' ? 'diamond' : 'gold'; this.tradePrice = this.tradeCurrency === 'gold' ? 5000 : 50; this.renderCurrentPage(false); }, { icon: this.tradeCurrency === 'gold' ? '●' : '◆', fill: this.tradeCurrency === 'gold' ? CuteTheme.honey : CuteTheme.sky, fontSize: 14, radius: 20 });
        button(priceCard, 'Minus', '−', -52, 26, 54, 48, () => this.changeTradePrice(-1), { fill: CuteTheme.paper, fontSize: 24, radius: 20 });
        text(priceCard, 'Price', formatNumber(this.tradePrice), 45, 26, 132, 44, 22, CuteTheme.caramel, 'center', true);
        button(priceCard, 'Plus', '+', 142, 26, 54, 48, () => this.changeTradePrice(1), { fill: CuteTheme.paper, fontSize: 22, radius: 20 });
        text(priceCard, 'Fee', '上架费100金币 · 72小时有效 · 成交税5%', 0, -41, 500, 28, 13, CuteTheme.muted, 'center', true);
        button(parent, 'SubmitList', '确认上架', 0, -238, 230, 64, () => void this.listTradePet(), { icon: '🏷', fill: CuteTheme.lilac, fontSize: 18, radius: 28, disabled: this.busy.has('trade:list') });
    }

    private renderTradeRow(parent: Node, listing: any, index: number, action: 'buy' | 'cancel') {
        const y = 230 - index * 108;
        const row = panel(parent, `Trade_${action}_${listing?.id ?? index}`, 0, y, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
        const pet = listing?.pet || listing?.petSnapshot || {};
        text(row, 'Icon', pet?.isMutant ? '✨' : '🐶', -260, 0, 46, 46, 26, pet?.isMutant ? CuteTheme.peachDark : CuteTheme.honeyDark, 'center', true);
        text(row, 'Name', safeName(pet?.nickname, `宝宝${listing?.petId || ''}`), -224, 18, 230, 30, 17, CuteTheme.caramel, 'left', true);
        text(row, 'Meta', `Lv.${Number(pet?.level || 1)} · 战力${formatNumber(listing?.power || pet?.power || 0)} · ${Number(pet?.specialSkillCount || this.specialSkills(pet).length)}特殊`, -224, -17, 300, 24, 12, CuteTheme.muted, 'left', true);
        text(row, 'Price', `${formatNumber(listing?.price || 0)} ${listing?.currencyType === 'diamond' ? '◆' : '●'}`, 100, 0, 160, 34, 17, CuteTheme.peachDark, 'right', true);
        if (action === 'buy') {
            const mine = Number(listing?.sellerUserId || listing?.seller?.id || 0) === Number(GameStore.user?.id || 1);
            button(row, 'Buy', mine ? '我的' : '购买', 252, 0, 100, 46, () => void this.buyTrade(listing), { fill: mine ? new Color(220, 218, 208, 255) : CuteTheme.honey, fontSize: 14, radius: 20, disabled: mine || this.busy.has(`trade:buy:${listing?.id}`) });
        } else {
            const active = String(listing?.status || '') === 'active';
            button(row, 'Cancel', active ? '取消' : this.statusLabel(listing?.status), 252, 0, 100, 46, () => void this.cancelTrade(listing), { fill: active ? CuteTheme.peach : new Color(220, 218, 208, 255), fontSize: 14, radius: 20, disabled: !active || this.busy.has(`trade:cancel:${listing?.id}`) });
        }
    }

    private renderProfile() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'ProfileSign', '玩家手账', 0, 456, 220, 66);
        const book = panel(root, 'ProfileBook', 0, -24, 660, 810, CuteTheme.paper, 40, true, CuteTheme.caramelSoft, 3);
        const user = GameStore.user || {};
        text(book, 'Avatar', '👧', -245, 265, 112, 112, 58, CuteTheme.peachDark, 'center', true);
        text(book, 'Name', safeName(user?.nickname, 'PetVerse玩家'), -165, 294, 370, 44, 27, CuteTheme.caramel, 'left', true);
        text(book, 'Meta', `玩家ID ${user?.id || 1} · Lv.${Number(user?.level || 1)} · VIP ${Number(user?.vipLevel || 0)}`, -165, 251, 400, 30, 14, CuteTheme.muted, 'left', true);
        capsule(book, 'Gold', '●', formatNumber(user?.gold || 0), -128, 196, 190, CuteTheme.honey);
        capsule(book, 'Diamond', '◆', formatNumber(user?.diamond || 0), 98, 196, 190, CuteTheme.sky);

        const capacity = this.capacitySummary?.data || this.capacitySummary || {};
        const currentPets = Number(capacity?.used ?? capacity?.petCount ?? GameStore.pets.length);
        const maxPets = Number(capacity?.capacity ?? capacity?.petCapacity ?? user?.petCapacity ?? 50);
        const capacityCard = panel(book, 'Capacity', -157, 55, 300, 190, CuteTheme.paperWarm, 28, false, CuteTheme.white, 2);
        headingTag(capacityCard, 'Title', '宝宝仓库', 0, 68, 150, CuteTheme.mint);
        text(capacityCard, 'Value', `${currentPets} / ${maxPets}`, 0, 15, 210, 48, 28, CuteTheme.caramel, 'center', true);
        progress(capacityCard, 'Bar', 0, -27, 220, 16, currentPets / Math.max(1, maxPets), CuteTheme.green);
        button(capacityCard, 'Expand', '扩容10格', 0, -68, 164, 42, () => void this.expandCapacity(), { icon: '🎫', fill: CuteTheme.mint, fontSize: 13, radius: 18, disabled: this.busy.has('capacity:expand') || maxPets >= 200 });

        const seasonData = this.seasonSummary?.data || this.seasonSummary || {};
        const season = seasonData?.season || {};
        const player = seasonData?.player || {};
        const seasonCard = panel(book, 'Season', 157, 55, 300, 190, new Color(255, 245, 231, 255), 28, false, CuteTheme.white, 2);
        headingTag(seasonCard, 'Title', '赛季记录', 0, 68, 150, CuteTheme.honey);
        text(seasonCard, 'Name', safeName(season?.name, '本月赛季'), 0, 28, 250, 30, 16, CuteTheme.caramel, 'center', true);
        text(seasonCard, 'Points', `积分 ${Number(player?.points || 0)} · 评级 ${Number(player?.rating || 1000)}`, 0, -8, 250, 28, 14, CuteTheme.muted, 'center', true);
        text(seasonCard, 'Battle', `${Number(player?.wins || 0)}胜 ${Number(player?.losses || 0)}负 ${Number(player?.draws || 0)}平`, 0, -41, 250, 28, 14, CuteTheme.peachDark, 'center', true);
        button(seasonCard, 'Ranking', '查看赛季榜', 0, -72, 164, 42, () => { this.rankingMode = 'season'; this.showPage('ranking'); }, { icon: '🏅', fill: CuteTheme.honey, fontSize: 13, radius: 18 });

        const shortcuts = panel(book, 'Shortcuts', 0, -167, 616, 190, new Color(249, 245, 231, 255), 30, false, CuteTheme.white, 2);
        text(shortcuts, 'Title', '手账快捷入口', -270, 63, 250, 34, 18, CuteTheme.caramel, 'left', true);
        const entries: Array<[PageName, string, string, number]> = [
            ['mail', `邮件 ${this.mailUnreadCount}`, '💌', -220],
            ['friends', `好友 ${GameStore.friends.length}`, '📷', -74],
            ['trade', '寄售市场', '🏷', 74],
            ['settings', '游戏设置', '⚙', 220],
        ];
        entries.forEach(([page, title, icon, x]) => button(shortcuts, `Shortcut_${page}`, title, x, -23, 130, 104, () => this.showPage(page), { icon, fill: CuteTheme.paper, fontSize: 13, radius: 24 }));
        text(book, 'Hint', 'Beta阶段使用固定玩家ID进行联调；正式微信登录后会自动切换到当前微信用户。', 0, -313, 580, 38, 13, CuteTheme.muted, 'center', true);
    }

    private renderMoreLanding() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        cloudSign(root, 'MoreSign', '更多功能', 0, 456, 220, 66);
        const card = panel(root, 'MoreCard', 0, 10, 650, 790, CuteTheme.paper, 42, true, CuteTheme.caramelSoft, 3);
        text(card, 'Hint', '点击下方“更多”打开玩具柜', 0, 315, 520, 44, 22, CuteTheme.caramel, 'center', true);
        text(card, 'Decor', '🎀　🐾　✦　🌿　✿', 0, 220, 500, 80, 42, CuteTheme.honeyDark, 'center', true);
        button(card, 'OpenDrawer', '打开玩具柜', 0, 90, 240, 72, () => this.toggleDrawer(), {
            icon: '🧸',
            fill: CuteTheme.honey,
            fontSize: 20,
            radius: 30,
        });
        text(card, 'Summary', '集市、孵化、技能、好友、排行、婚姻、邮件和交易\n都会从这里进入。', 0, -80, 520, 110, 20, CuteTheme.muted, 'center', false);
    }

    private renderSettings() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const settings = CuteFeedback.getSettings();
        const book = panel(
            root,
            'SettingsBook',
            0,
            0,
            692,
            905,
            new Color(255, 250, 232, 255),
            40,
            true,
            CuteTheme.caramelSoft,
            4,
        );
        headingTag(book, 'Title', '游戏设置', -245, 390, 154, CuteTheme.paperWarm);
        text(book, 'Hint', '设置保存在本机。声音与点击反馈立即生效，画质档位将在正式构建时应用。', -305, 346, 590, 38, 14, CuteTheme.muted, 'left', true);

        const soundCard = panel(book, 'SoundCard', 0, 205, 630, 250, new Color(238, 248, 230, 255), 28, false, CuteTheme.mintDark, 2);
        headingTag(soundCard, 'SoundTitle', '声音与反馈', -215, 98, 160, CuteTheme.mint);

        this.settingToggle(
            soundCard,
            'SoundToggle',
            '声音开关',
            settings.soundEnabled,
            -78,
            48,
            () => {
                CuteFeedback.setSettings({ soundEnabled: !settings.soundEnabled });
                this.renderCurrentPage(false);
            },
        );
        this.settingToggle(
            soundCard,
            'VibrateToggle',
            '轻触震动',
            settings.vibrationEnabled,
            170,
            48,
            () => {
                CuteFeedback.setSettings({ vibrationEnabled: !settings.vibrationEnabled });
                this.renderCurrentPage(false);
            },
        );

        text(soundCard, 'MasterLabel', '总音量', -275, -12, 100, 30, 15, CuteTheme.caramel, 'left', true);
        button(soundCard, 'MasterMinus', '－', -145, -12, 42, 42, () => this.changeFeedbackVolume('masterVolume', -0.1), {
            fill: CuteTheme.paperWarm, fontSize: 20, radius: 18,
        });
        progress(soundCard, 'MasterProgress', 4, -12, 220, 16, settings.masterVolume, CuteTheme.honey);
        text(soundCard, 'MasterValue', `${Math.round(settings.masterVolume * 100)}%`, 152, -12, 66, 28, 14, CuteTheme.caramel, 'center', true);
        button(soundCard, 'MasterPlus', '＋', 235, -12, 42, 42, () => this.changeFeedbackVolume('masterVolume', 0.1), {
            fill: CuteTheme.honey, fontSize: 20, radius: 18,
        });

        text(soundCard, 'SfxLabel', '点击音效', -275, -72, 100, 30, 15, CuteTheme.caramel, 'left', true);
        button(soundCard, 'SfxMinus', '－', -145, -72, 42, 42, () => this.changeFeedbackVolume('sfxVolume', -0.1), {
            fill: CuteTheme.paperWarm, fontSize: 20, radius: 18,
        });
        progress(soundCard, 'SfxProgress', 4, -72, 220, 16, settings.sfxVolume, CuteTheme.green);
        text(soundCard, 'SfxValue', `${Math.round(settings.sfxVolume * 100)}%`, 152, -72, 66, 28, 14, CuteTheme.caramel, 'center', true);
        button(soundCard, 'SfxPlus', '＋', 235, -72, 42, 42, () => this.changeFeedbackVolume('sfxVolume', 0.1), {
            fill: CuteTheme.mint, fontSize: 20, radius: 18,
        });

        const visualCard = panel(book, 'VisualCard', 0, -55, 630, 220, new Color(242, 239, 253, 255), 28, false, CuteTheme.lilac, 2);
        headingTag(visualCard, 'VisualTitle', '画面与动效', -215, 84, 160, CuteTheme.lilac);
        this.settingToggle(
            visualCard,
            'AnimationToggle',
            '页面动效',
            settings.animationEnabled,
            -78,
            32,
            () => {
                CuteFeedback.setSettings({ animationEnabled: !settings.animationEnabled });
                this.renderCurrentPage(false);
            },
        );
        text(visualCard, 'QualityLabel', '画质档位', -275, -30, 110, 30, 15, CuteTheme.caramel, 'left', true);
        const presets: Array<{ key: ResolutionPreset; title: string }> = [
            { key: 'high', title: '高清\n720×1280' },
            { key: 'balanced', title: '均衡\n540×960' },
            { key: 'saving', title: '省电\n360×640' },
        ];
        presets.forEach((preset, index) => {
            button(
                visualCard,
                `Resolution_${preset.key}`,
                preset.title,
                -95 + index * 150,
                -45,
                132,
                66,
                () => this.setResolutionPreset(preset.key),
                {
                    fill: settings.resolutionPreset === preset.key ? CuteTheme.honey : CuteTheme.paper,
                    selected: settings.resolutionPreset === preset.key,
                    fontSize: 14,
                    radius: 22,
                },
            );
        });
        text(visualCard, 'QualityHint', `当前：${CuteFeedback.resolutionLabel(settings.resolutionPreset)} · 正式小游戏构建时生效`, 0, -92, 520, 26, 12, CuteTheme.muted, 'center', true);

        const info = panel(book, 'InfoCard', 0, -300, 630, 210, new Color(255, 238, 230, 255), 28, false, CuteTheme.peachDark, 2);
        headingTag(info, 'InfoTitle', '操作手感', -215, 78, 142, CuteTheme.peach);
        text(
            info,
            'Description',
            '按钮按下会轻微缩放并回弹；页面切换使用短距离滑入；“更多”抽屉从底部弹出。微信设备开启轻触震动后，还会提供轻微触觉反馈。',
            -275,
            12,
            550,
            90,
            15,
            CuteTheme.caramel,
            'left',
            false,
        );
        button(info, 'TestSound', '测试反馈', -110, -72, 160, 52, () => CuteFeedback.playSuccess(), {
            icon: '🔔', fill: CuteTheme.mint, fontSize: 14, radius: 22,
        });
        button(info, 'Reset', '恢复默认', 110, -72, 160, 52, () => {
            CuteFeedback.resetSettings();
            this.showToast('设置已恢复默认');
            this.renderCurrentPage(false);
        }, {
            icon: '↻', fill: CuteTheme.paperWarm, fontSize: 14, radius: 22,
        });
    }

    private settingToggle(
        parent: Node,
        name: string,
        title: string,
        enabled: boolean,
        x: number,
        y: number,
        onClick: () => void,
    ) {
        button(parent, name, `${enabled ? '✓' : '×'}  ${title}：${enabled ? '开' : '关'}`, x, y, 220, 48, onClick, {
            fill: enabled ? CuteTheme.mint : new Color(222, 216, 202, 255),
            fontSize: 14,
            radius: 20,
        });
    }

    private changeFeedbackVolume(key: 'masterVolume' | 'sfxVolume', delta: number) {
        const settings = CuteFeedback.getSettings();
        CuteFeedback.setSettings({
            [key]: Math.max(0, Math.min(1, Number(settings[key] || 0) + delta)),
        } as any);
        this.renderCurrentPage(false);
    }

    private setResolutionPreset(preset: ResolutionPreset) {
        CuteFeedback.setSettings({ resolutionPreset: preset });
        this.showToast(`已选择${CuteFeedback.resolutionLabel(preset)}，正式构建时应用`);
        this.renderCurrentPage(false);
    }

    private renderSecondaryPage(page: PageName) {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const title = this.titleForPage(page);
        cloudSign(root, 'SecondarySign', title, 0, 456, 220, 66);

        const card = panel(root, 'SecondaryCard', 0, 15, 660, 790, CuteTheme.paper, 40, true, CuteTheme.caramelSoft, 3);
        text(card, 'Icon', this.iconForPage(page), 0, 215, 240, 160, 88, CuteTheme.caramel, 'center', true);
        text(card, 'Title', title, 0, 95, 420, 60, 34, CuteTheme.caramel, 'center', true);

        const summary = this.secondarySummary(page);
        text(card, 'Summary', summary, 0, -25, 520, 150, 20, CuteTheme.muted, 'center', false);

        if (page === 'hatchery') {
            text(card, 'Count', `孵化中的蛋：${GameStore.eggs.filter((egg) => egg?.status !== 'hatched').length}`, 0, -125, 360, 42, 20, CuteTheme.caramel, 'center', true);
        }
        if (page === 'friends') {
            text(card, 'Count', `好友数量：${GameStore.friends.length}`, 0, -125, 360, 42, 20, CuteTheme.caramel, 'center', true);
        }
        if (page === 'ranking') {
            text(card, 'Count', `排行榜记录：${GameStore.ranking.length}`, 0, -125, 360, 42, 20, CuteTheme.caramel, 'center', true);
        }

        button(card, 'BackHome', '返回家园', 0, -270, 210, 64, () => this.showPage('home'), {
            icon: '🏠',
            fill: CuteTheme.mint,
            fontSize: 18,
            radius: 28,
        });
    }

    private renderDrawer() {
        if (!this.drawerLayer) return;
        clearNode(this.drawerLayer);
        this.drawerLayer.active = this.drawerOpen;
        if (!this.drawerOpen) return;

        if (!this.drawerLayer.getComponent(BlockInputEvents)) this.drawerLayer.addComponent(BlockInputEvents);
        const dim = panel(
            this.drawerLayer,
            'Dim',
            0,
            0,
            DESIGN_WIDTH,
            DESIGN_HEIGHT,
            new Color(91, 56, 35, 82),
            0,
            false,
            CuteTheme.transparent,
            0,
        );
        dim.on(Node.EventType.TOUCH_END, () => this.closeDrawer());

        const drawer = panel(
            this.drawerLayer,
            'Drawer',
            0,
            -238,
            704,
            660,
            new Color(255, 246, 224, 255),
            42,
            true,
            CuteTheme.caramelSoft,
            4,
        );
        headingTag(drawer, 'DrawerTitle', '功能柜', 0, 280, 170, CuteTheme.paperWarm);
        button(drawer, 'Close', '×', 310, 280, 46, 46, () => this.closeDrawer(), {
            fill: CuteTheme.peach,
            fontSize: 28,
            radius: 23,
        });

        const entries = [
            ['shop', '商城', '🛒', CuteTheme.honey],
            ['hatchery', '孵化室', '🥚', CuteTheme.mint],
            ['skills', '打技能', '📕', CuteTheme.sky],
            ['fusion', '炼妖', '🔮', CuteTheme.lilac],
            ['friends', '好友', '📷', CuteTheme.peach],
            ['ranking', '排行', '🏆', CuteTheme.paperWarm],
            ['marriage', '婚姻', '💞', CuteTheme.pink],
            ['mail', '邮件', '💌', CuteTheme.mint],
            ['trade', '交易', '🏷', CuteTheme.lilac],
            ['profile', '玩家', '📒', CuteTheme.sky],
            ['settings', '设置', '⚙', new Color(235, 232, 216, 255)],
        ] as Array<[PageName, string, string, Color]>;

        entries.forEach(([page, title, icon, fill], index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            button(
                drawer,
                `Entry_${page}`,
                title,
                -237 + col * 158,
                142 - row * 145,
                138,
                112,
                () => this.showPage(page),
                {
                    icon,
                    fill,
                    fontSize: 14,
                    radius: 26,
                },
            );
        });

        text(
            drawer,
            'Hint',
            '轻点按钮会回弹并播放音效；声音、动效和画质档位可在“设置”中调整。',
            0,
            -277,
            620,
            34,
            14,
            CuteTheme.muted,
            'center',
            true,
        );

        if (CuteFeedback.animationEnabled()) {
            const opacity = drawer.getComponent(UIOpacity) || drawer.addComponent(UIOpacity);
            opacity.opacity = 0;
            drawer.setPosition(new Vec3(0, -470, 0));
            drawer.setScale(new Vec3(0.98, 0.98, 1));
            tween(opacity).to(0.16, { opacity: 255 }).start();
            tween(drawer)
                .to(0.22, { position: new Vec3(0, -238, 0), scale: Vec3.ONE }, { easing: 'backOut' })
                .start();
        }
    }

    private toggleDrawer() {
        if (this.drawerOpen) {
            this.closeDrawer();
            return;
        }
        this.drawerOpen = true;
        CuteFeedback.playDrawer();
        this.renderDrawer();
        this.renderBottomNav();
    }

    private closeDrawer() {
        if (!this.drawerLayer || !this.drawerOpen) return;
        const drawer = this.drawerLayer.getChildByName('Drawer');
        if (drawer?.isValid && CuteFeedback.animationEnabled()) {
            const opacity = drawer.getComponent(UIOpacity) || drawer.addComponent(UIOpacity);
            tween(opacity).to(0.12, { opacity: 0 }).start();
            tween(drawer)
                .to(0.14, { position: new Vec3(0, -500, 0), scale: new Vec3(0.97, 0.97, 1) }, { easing: 'quadIn' })
                .call(() => {
                    this.drawerOpen = false;
                    this.renderDrawer();
                    this.renderBottomNav();
                })
                .start();
            return;
        }
        this.drawerOpen = false;
        this.renderDrawer();
        this.renderBottomNav();
    }

    private renderSkillModal() {
        if (!this.modalLayer) return;
        clearNode(this.modalLayer);
        this.modalLayer.active = Boolean(this.detailSkill);
        if (!this.detailSkill) return;
        if (!this.modalLayer.getComponent(BlockInputEvents)) this.modalLayer.addComponent(BlockInputEvents);

        const dim = panel(this.modalLayer, 'Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(73, 45, 30, 110), 0, false, CuteTheme.transparent, 0);
        dim.on(Node.EventType.TOUCH_END, () => this.closeSkillDetail());
        const skill = this.detailSkill;
        const card = panel(this.modalLayer, 'SkillDetail', 0, 20, 570, 500, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 4);
        image(card, 'Icon', this.skillIconPath(skill), 0, 165, 106, 106, this.skillColor(skill));
        text(card, 'Name', this.skillName(skill), 0, 94, 460, 50, 30, CuteTheme.caramel, 'center', true);
        tag(card, 'Tier', this.skillTierLabel(skill), 0, 47, 120, this.skillColor(skill), this.skillTier(skill) === 'low' ? CuteTheme.caramel : CuteTheme.white);
        headingTag(card, 'DescTitle', '技能描述', -175, -10, 132, CuteTheme.paperWarm);
        text(card, 'Description', this.skillDescription(skill), -235, -82, 470, 150, 18, CuteTheme.caramel, 'left', false);
        text(card, 'Rule', '高级技能会替换同家族低级技能；特殊技能不能使用技能锁保护。', 0, -165, 500, 54, 14, CuteTheme.peachDark, 'center', true);
        button(card, 'Close', '关闭', 0, -218, 150, 54, () => this.closeSkillDetail(), {
            fill: CuteTheme.honey, fontSize: 16, radius: 24,
        });
    }

    private showSkillDetail(skill: any) {
        this.detailSkill = skill;
        this.renderSkillModal();
    }

    private closeSkillDetail() {
        this.detailSkill = null;
        this.renderSkillModal();
    }

    private renderUtilityModal() {
        if (!this.utilityLayer) return;
        clearNode(this.utilityLayer);
        this.utilityLayer.active = this.hatchAcceleratorOpen;
        if (!this.hatchAcceleratorOpen) return;
        if (!this.utilityLayer.getComponent(BlockInputEvents)) {
            this.utilityLayer.addComponent(BlockInputEvents);
        }

        const activeEgg = GameStore.eggs.find((egg) =>
            ['incubating', 'hatching', 'unhatched'].includes(String(egg?.status || '')),
        ) || null;
        if (!activeEgg) {
            this.hatchAcceleratorOpen = false;
            this.utilityLayer.active = false;
            return;
        }

        const dim = panel(
            this.utilityLayer,
            'Dim',
            0,
            0,
            DESIGN_WIDTH,
            DESIGN_HEIGHT,
            new Color(73, 45, 30, 110),
            0,
            false,
            CuteTheme.transparent,
            0,
        );
        dim.on(Node.EventType.TOUCH_END, () => this.closeHatchAccelerator());

        const card = panel(
            this.utilityLayer,
            'AcceleratorCard',
            0,
            0,
            590,
            620,
            new Color(255, 250, 232, 255),
            38,
            true,
            CuteTheme.caramelSoft,
            4,
        );
        headingTag(card, 'Title', '孵化加速', 0, 258, 160, CuteTheme.sky);
        text(
            card,
            'Egg',
            `宠物蛋 #${Number(activeEgg?.id || 0)} · 剩余 ${this.formatSeconds(Number(activeEgg?.remainingSeconds || 0))}`,
            0,
            214,
            500,
            34,
            17,
            CuteTheme.caramel,
            'center',
            true,
        );
        text(
            card,
            'Hint',
            '选择一个加速道具立即减少孵化时间。时间减到0后即可孵化。',
            0,
            176,
            500,
            34,
            14,
            CuteTheme.muted,
            'center',
            false,
        );

        const items = this.hatchAcceleratorItems();
        if (!items.length) {
            text(
                card,
                'Empty',
                '背包中没有孵化加速道具\n可前往商城购买“孵化沙漏”',
                0,
                40,
                420,
                100,
                20,
                CuteTheme.muted,
                'center',
                true,
            );
            button(card, 'GoShop', '前往商城', 0, -62, 180, 56, () => {
                this.closeHatchAccelerator();
                this.showPage('shop');
            }, {
                icon: '🛒',
                fill: CuteTheme.honey,
                fontSize: 15,
                radius: 24,
            });
        } else {
            items.slice(0, 5).forEach((item, index) => {
                const y = 110 - index * 72;
                const seconds = Number(item?.effectValue || item?.effectData?.seconds || 0);
                const row = panel(
                    card,
                    `Accelerator_${item?.itemCode || index}`,
                    0,
                    y,
                    520,
                    62,
                    index % 2 === 0 ? CuteTheme.paper : CuteTheme.sky,
                    20,
                    false,
                    CuteTheme.white,
                    2,
                );
                text(row, 'Icon', '⏳', -228, 0, 42, 42, 24, CuteTheme.honeyDark, 'left', true);
                text(row, 'Name', safeName(item?.name, '孵化沙漏'), -180, 11, 220, 26, 16, CuteTheme.caramel, 'left', true);
                text(row, 'Effect', `减少 ${this.formatSeconds(seconds)}`, -180, -14, 220, 24, 12, CuteTheme.muted, 'left', true);
                tag(row, 'Count', `×${Number(item?.quantity || 0)}`, 105, 0, 64, CuteTheme.paperWarm);
                button(row, 'Use', '使用', 205, 0, 78, 40, () => void this.useHatchAccelerator(activeEgg, item), {
                    fill: CuteTheme.honey,
                    fontSize: 13,
                    radius: 18,
                    disabled: this.busy.has(`hatch-accelerate:${item?.itemCode}`),
                });
            });
        }

        button(card, 'Close', '关闭', 0, -258, 150, 52, () => this.closeHatchAccelerator(), {
            fill: CuteTheme.paperWarm,
            fontSize: 15,
            radius: 22,
        });

        if (CuteFeedback.animationEnabled()) {
            card.setScale(new Vec3(0.90, 0.90, 1));
            tween(card).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        }
    }

    private openHatchAccelerator() {
        const activeEgg = GameStore.eggs.find((egg) =>
            ['incubating', 'hatching', 'unhatched'].includes(String(egg?.status || '')),
        );
        if (!activeEgg) {
            this.showToast('请先从孵化室仓库放入一枚宠物蛋');
            return;
        }
        this.hatchAcceleratorOpen = true;
        CuteFeedback.playDrawer();
        this.renderUtilityModal();
    }

    private closeHatchAccelerator() {
        this.hatchAcceleratorOpen = false;
        this.renderUtilityModal();
    }

    private async startEggIncubation(egg: any) {
        const key = `hatch-start:${egg?.id}`;
        if (!egg?.id || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/hatchery/start', {
                eggId: Number(egg.id),
            });
            if (result?.success === false) {
                this.showToast(result?.message || '放入孵化装置失败');
                return;
            }
            const eggs = result?.eggs || result?.data?.eggs;
            if (Array.isArray(eggs)) {
                GameStore.setList('eggs', { success: true, eggs });
            } else {
                const refreshed = await ApiClient.get('/hatchery/eggs');
                if (refreshed?.success !== false) GameStore.setList('eggs', refreshed);
            }
            CuteFeedback.playSuccess();
            this.showToast('宠物蛋已放入孵化装置');
        } catch (error) {
            console.error('[CuteMainUI] start incubation failed:', error);
            this.showToast('孵化装置连接失败');
        } finally {
            this.busy.delete(key);
            this.renderCurrentPage(false);
        }
    }

    private async useHatchAccelerator(egg: any, item: any) {
        const key = `hatch-accelerate:${item?.itemCode}`;
        if (!egg?.id || !item?.itemCode || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/hatchery/accelerate', {
                eggId: Number(egg.id),
                itemCode: String(item.itemCode),
                quantity: 1,
            });
            if (result?.success === false) {
                this.showToast(result?.message || '加速失败');
                return;
            }
            const [inventory, eggs] = await Promise.all([
                ApiClient.get('/inventory'),
                ApiClient.get('/hatchery/eggs'),
            ]);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            CuteFeedback.playSuccess();
            this.showToast(`已使用${safeName(item?.name, '孵化加速道具')}`);
            this.hatchAcceleratorOpen = false;
        } catch (error) {
            console.error('[CuteMainUI] accelerate hatch failed:', error);
            this.showToast('加速失败，请检查后端');
        } finally {
            this.busy.delete(key);
            this.renderUtilityModal();
            this.renderCurrentPage(false);
        }
    }

    private async useInventoryItem(item: any) {
        const key = `inventory:${item?.id || item?.itemCode}`;
        if (!item?.itemCode || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/inventory/use', {
                itemCode: String(item.itemCode),
                quantity: 1,
                petId: Number(GameStore.currentPet?.id || 0) || undefined,
            });
            if (result?.success === false) {
                this.showToast(result?.message || '道具使用失败');
                return;
            }
            const pet = result?.pet || result?.data?.pet;
            if (pet?.id) GameStore.updatePet(pet);
            const inventory = result?.inventory || result?.data?.inventory;
            if (Array.isArray(inventory)) GameStore.setList('inventory', { success: true, inventory });
            else {
                const refreshed = await ApiClient.get('/inventory');
                if (refreshed?.success !== false) GameStore.setList('inventory', refreshed);
            }
            this.showToast(`${safeName(item?.name, '道具')}使用成功`);
        } catch (error) {
            console.error('[CuteMainUI] use item failed:', error);
            this.showToast('道具使用失败，请检查后端');
        } finally {
            this.busy.delete(key);
            this.renderCurrentPage(false);
        }
    }

    private async syncEggItemsToHatchery() {
        if (EDITOR || this.eggSyncRunning) return;
        const eggItems = GameStore.inventory.filter((item) => this.isEggItem(item));
        if (!eggItems.length) return;
        this.eggSyncRunning = true;
        let moved = 0;
        try {
            for (const item of eggItems) {
                const quantity = Math.max(0, Number(item?.quantity || 0));
                for (let index = 0; index < quantity; index += 1) {
                    const result = await ApiClient.post('/inventory/use', { itemCode: String(item?.itemCode || ''), quantity: 1 });
                    if (result?.success === false) break;
                    moved += 1;
                }
            }
            const [inventory, eggs] = await Promise.all([ApiClient.get('/inventory'), ApiClient.get('/hatchery/eggs')]);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            if (moved > 0) this.showToast(`已将 ${moved} 个宠物蛋转入孵化室`);
        } finally {
            this.eggSyncRunning = false;
        }
    }

    private async hatchEgg(egg: any) {
        const key = `hatch:${egg?.id}`;
        if (!egg?.id || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/hatchery/hatch', { eggId: Number(egg.id) });
            if (result?.success === false) {
                this.showToast(result?.message || '孵化失败');
                return;
            }
            const [eggs, pets] = await Promise.all([ApiClient.get('/hatchery/eggs'), ApiClient.get('/pet/my')]);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            if (pets?.success !== false) GameStore.setPets(pets);
            CuteFeedback.playHatch();
            this.showToast('孵化成功，新宝宝已加入宝宝列表');
        } finally {
            this.busy.delete(key);
            this.renderCurrentPage(false);
        }
    }

    private toggleSkillLock(skill: any) {
        if (this.isSpecialSkill(skill)) return;
        const code = this.skillCode(skill);
        if (!code) return;
        if (this.lockedSkillCodes.has(code)) this.lockedSkillCodes.delete(code);
        else if (this.lockedSkillCodes.size < 4) this.lockedSkillCodes.add(code);
        else this.showToast('最多保护4个普通技能');
        this.renderCurrentPage(false);
    }

    private async learnSelectedSkill() {
        const pet = GameStore.currentPet;
        const item = this.skillBookItems().find((book) => String(book?.itemCode || '') === this.selectedSkillBookCode);
        if (!pet?.id || !item || this.busy.has('skill:learn')) return;
        const skillCode = String(item?.effectData?.skillCode || item?.itemCode || '').replace(/^BOOK_/, '');
        this.busy.add('skill:learn');
        try {
            const result = await ApiClient.post('/skill/learn', {
                petId: Number(pet.id),
                skillCode,
                lockedSkillCodes: [...this.lockedSkillCodes],
                requestId: `skill-${Date.now()}-${pet.id}`,
            });
            if (result?.success === false) {
                this.showToast(result?.message || '打书失败');
                return;
            }
            const updated = result?.pet || result?.data?.pet || result?.resultPet;
            if (updated?.id) GameStore.updatePet(updated);
            const [inventory, pets] = await Promise.all([ApiClient.get('/inventory'), ApiClient.get('/pet/my')]);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (pets?.success !== false) GameStore.setPets(pets);
            this.lockedSkillCodes.clear();
            this.showToast(result?.message || '打书成功');
        } catch (error) {
            console.error('[CuteMainUI] learn skill failed:', error);
            this.showToast('打书失败，请检查后端');
        } finally {
            this.busy.delete('skill:learn');
            this.renderCurrentPage(false);
        }
    }

    private ensureFusionParents() {
        const pets = GameStore.pets.filter((pet) => !pet?.isEgg && pet?.tradeStatus !== 'listed');
        if (!pets.length) {
            this.fusionParentAId = 0;
            this.fusionParentBId = 0;
            return;
        }
        if (!pets.some((pet) => Number(pet?.id) === this.fusionParentAId)) this.fusionParentAId = Number(pets[0]?.id || 0);
        if (!pets.some((pet) => Number(pet?.id) === this.fusionParentBId) || this.fusionParentBId === this.fusionParentAId) {
            this.fusionParentBId = Number(pets.find((pet) => Number(pet?.id) !== this.fusionParentAId)?.id || 0);
        }
    }

    private cycleFusionParent(side: 'A' | 'B') {
        const pets = GameStore.pets.filter((pet) => !pet?.isEgg && pet?.tradeStatus !== 'listed');
        if (pets.length < 2) {
            this.showToast('至少需要2只可用宝宝');
            return;
        }
        const currentId = side === 'A' ? this.fusionParentAId : this.fusionParentBId;
        const otherId = side === 'A' ? this.fusionParentBId : this.fusionParentAId;
        let index = pets.findIndex((pet) => Number(pet?.id) === currentId);
        for (let step = 1; step <= pets.length; step += 1) {
            const candidate = pets[(index + step + pets.length) % pets.length];
            if (Number(candidate?.id) !== otherId) {
                if (side === 'A') this.fusionParentAId = Number(candidate?.id || 0);
                else this.fusionParentBId = Number(candidate?.id || 0);
                this.fusionPreview = null;
                this.renderCurrentPage(false);
                return;
            }
        }
    }

    private fusionParentCard(parent: Node, name: string, title: string, pet: any, x: number, y: number, side: 'A' | 'B') {
        const card = panel(parent, name, x, y, 292, 300, CuteTheme.paper, 28, true, CuteTheme.white, 3);
        headingTag(card, 'Title', title, 0, 118, 132, side === 'A' ? CuteTheme.mint : CuteTheme.peach);
        text(card, 'Portrait', '🐾', 0, 52, 90, 70, 48, CuteTheme.honeyDark, 'center', true);
        text(card, 'Name', pet ? safeName(pet?.nickname, '宝宝') : '未选择', 0, -8, 240, 36, 22, CuteTheme.caramel, 'center', true);
        text(card, 'Meta', pet ? `Lv.${Number(pet?.level || 1)}　${this.rarityName(pet)}　成长 ${this.growthValue(pet).toFixed(3)}` : '请先准备两只宝宝', 0, -45, 260, 30, 14, CuteTheme.muted, 'center', false);
        text(card, 'Skills', pet ? `技能 ${Array.isArray(pet?.skills) ? pet.skills.length : 0}　特殊 ${this.specialSkills(pet).length}` : '', 0, -78, 250, 28, 14, CuteTheme.caramel, 'center', true);
        button(card, 'Switch', '切换宝宝', 0, -120, 126, 44, () => this.cycleFusionParent(side), {
            icon: '↻', fill: CuteTheme.paperWarm, fontSize: 13, radius: 20,
        });
    }

    private async previewFusion() {
        if (!this.fusionParentAId || !this.fusionParentBId || this.busy.has('fusion:preview')) return;
        this.busy.add('fusion:preview');
        try {
            const result = await ApiClient.post('/fusion/preview', {
                parentAId: this.fusionParentAId,
                parentBId: this.fusionParentBId,
            });
            if (result?.success === false) {
                this.showToast(result?.message || '预览失败');
                return;
            }
            this.fusionPreview = result;
            this.showToast('预览已生成，不会消耗任何资源');
        } finally {
            this.busy.delete('fusion:preview');
            this.renderCurrentPage(false);
        }
    }

    private async executeFusion() {
        if (!this.fusionParentAId || !this.fusionParentBId || this.busy.has('fusion:execute')) return;
        this.busy.add('fusion:execute');
        try {
            const result = await ApiClient.post('/fusion/execute', {
                parentAId: this.fusionParentAId,
                parentBId: this.fusionParentBId,
                requestId: `fusion-${Date.now()}-${this.fusionParentAId}-${this.fusionParentBId}`,
            });
            if (result?.success === false) {
                this.showToast(result?.message || '炼妖失败');
                return;
            }
            const [pets, inventory, profile] = await Promise.all([
                ApiClient.get('/pet/my'),
                ApiClient.get('/inventory'),
                ApiClient.get('/user/profile'),
            ]);
            if (pets?.success !== false) GameStore.setPets(pets);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
            this.fusionPreview = null;
            this.fusionParentAId = 0;
            this.fusionParentBId = 0;
            this.ensureFusionParents();
            this.showToast('炼妖成功，新宝宝已生成');
        } catch (error) {
            console.error('[CuteMainUI] fusion failed:', error);
            this.showToast('炼妖失败，请检查后端');
        } finally {
            this.busy.delete('fusion:execute');
            this.renderCurrentPage(false);
        }
    }

    private applyTeamResult(result: any) {
        if (!result || result?.success === false) return;
        const pets = Array.isArray(result?.pets)
            ? result.pets
            : Array.isArray(result?.data?.pets)
                ? result.data.pets
                : [];
        const ids = Array.isArray(result?.petIds)
            ? result.petIds
            : Array.isArray(result?.team?.petIds)
                ? result.team.petIds
                : pets.map((pet: any) => pet?.id);
        this.teamPetIds = ids.map((id: any) => Number(id || 0)).filter((id: number) => id > 0).slice(0, 3);
        const byId = new Map(GameStore.pets.map((pet) => [Number(pet?.id || 0), pet]));
        this.teamPets = this.teamPetIds
            .map((id) => pets.find((pet: any) => Number(pet?.id || 0) === id) || byId.get(id))
            .filter(Boolean);
    }

    private adventureTeamSlot(parent: Node, name: string, pet: any, x: number, y: number, index: number) {
        const slot = panel(parent, name, x, y, 164, 142, pet ? new Color(255, 250, 232, 255) : new Color(242, 235, 218, 255), 24, false, pet ? CuteTheme.honey : CuteTheme.caramelSoft, 2);
        tag(slot, 'Index', `${index}号位`, 0, 50, 82, pet ? CuteTheme.mint : CuteTheme.paperWarm);
        if (!pet) {
            text(slot, 'EmptyIcon', '＋', 0, 4, 60, 60, 36, CuteTheme.muted, 'center', true);
            text(slot, 'EmptyText', '空位', 0, -43, 100, 28, 15, CuteTheme.muted, 'center', true);
            return;
        }
        text(slot, 'PetIcon', '🐾', -53, 4, 48, 48, 27, CuteTheme.honeyDark, 'center', true);
        text(slot, 'PetName', safeName(pet?.nickname, '宝宝'), -22, 15, 104, 30, 15, CuteTheme.caramel, 'left', true);
        text(slot, 'PetMeta', `Lv.${Number(pet?.level || 1)}\n战力 ${formatNumber(this.battleAttributesOf(pet).power)}`, -22, -28, 105, 52, 13, CuteTheme.muted, 'left', true);
    }

    private teamPower() {
        return this.teamPets.reduce((sum, pet) => sum + this.battleAttributesOf(pet).power, 0);
    }

    private toggleTeamPet(petId: number) {
        if (!petId) return;
        if (this.teamPetIds.includes(petId)) {
            this.teamPetIds = this.teamPetIds.filter((id) => id !== petId);
        } else if (this.teamPetIds.length < 3) {
            this.teamPetIds.push(petId);
        } else {
            this.showToast('出战编队最多3只宝宝');
        }
        const byId = new Map(GameStore.pets.map((pet) => [Number(pet?.id || 0), pet]));
        this.teamPets = this.teamPetIds.map((id) => byId.get(id)).filter(Boolean);
        this.renderCurrentPage(false);
    }

    private async saveTeam() {
        if (!this.teamPetIds.length || this.busy.has('team:save')) return;
        this.busy.add('team:save');
        try {
            const result = await ApiClient.post('/team/set', { petIds: this.teamPetIds });
            if (result?.success === false) {
                this.showToast(result?.message || '编队保存失败');
                return;
            }
            this.applyTeamResult(result);
            this.teamEditing = false;
            this.showToast('出战编队已保存');
        } catch (error) {
            console.error('[CuteMainUI] save team failed:', error);
            this.showToast('编队保存失败，请检查后端');
        } finally {
            this.busy.delete('team:save');
            this.renderCurrentPage(false);
        }
    }

    private ensureSelectedFriend() {
        const friends = GameStore.friends || [];
        if (!friends.length) {
            this.selectedFriendUserId = 0;
            return;
        }
        const exists = friends.some((friend) => Number(friend?.userId || friend?.id || 0) === this.selectedFriendUserId);
        if (!exists) this.selectedFriendUserId = Number(friends[0]?.userId || friends[0]?.id || 0);
    }

    private selectedFriend() {
        return GameStore.friends.find((friend) => Number(friend?.userId || friend?.id || 0) === this.selectedFriendUserId) || GameStore.friends[0] || null;
    }

    private cycleFriend(direction: number) {
        const friends = GameStore.friends || [];
        if (!friends.length) return;
        const current = friends.findIndex((friend) => Number(friend?.userId || friend?.id || 0) === this.selectedFriendUserId);
        const next = (current + direction + friends.length) % friends.length;
        this.selectedFriendUserId = Number(friends[next]?.userId || friends[next]?.id || 0);
        this.renderCurrentPage(false);
    }

    private async startAdventureBattle(mode: 'tower' | 'pve' | 'friend') {
        const key = `battle:${mode}`;
        if (this.busy.has(key)) return;
        if (!this.teamPetIds.length) {
            this.showToast('请先设置出战编队');
            return;
        }
        this.busy.add(key);
        this.setLoading(true, mode === 'tower' ? '正在挑战守关怪物…' : mode === 'friend' ? '正在前往好友庭院…' : '正在进入训练场…');
        try {
            const result = mode === 'tower'
                ? await ApiClient.post('/tower/challenge-team', {})
                : mode === 'friend'
                    ? await ApiClient.post('/battle/team-friend', { friendUserId: this.selectedFriendUserId || undefined })
                    : await ApiClient.post('/battle/team-pve', {});
            if (result?.success === false) {
                this.showToast(result?.message || '战斗发起失败');
                return;
            }
            this.battleResult = result;
            this.battleTitle = mode === 'tower' ? '爬塔战报' : mode === 'friend' ? '好友切磋战报' : '日常试炼战报';
            await this.refreshAfterBattle();
        } catch (error) {
            console.error('[CuteMainUI] battle failed:', error);
            this.showToast('战斗失败，请检查后端');
        } finally {
            this.busy.delete(key);
            this.setLoading(false);
            this.refreshAllVisuals();
        }
    }

    private async refreshAfterBattle() {
        const [profile, pets, team, tower, ranking] = await Promise.all([
            ApiClient.get('/user/profile'),
            ApiClient.get('/pet/my'),
            ApiClient.get('/team'),
            ApiClient.get('/tower/status'),
            ApiClient.get('/ranking/tower'),
        ]);
        if (profile?.success !== false) GameStore.setProfile(profile);
        if (pets?.success !== false) GameStore.setPets(pets);
        this.applyTeamResult(team);
        if (tower?.success !== false) GameStore.setTower(tower);
        if (ranking?.success !== false) GameStore.setList('ranking', ranking);
    }

    private renderBattleResultModal() {
        if (!this.battleLayer) return;
        clearNode(this.battleLayer);
        this.battleLayer.active = Boolean(this.battleResult);
        if (!this.battleResult) return;
        if (!this.battleLayer.getComponent(BlockInputEvents)) this.battleLayer.addComponent(BlockInputEvents);

        const result = this.battleResult;
        const won = String(result?.result || '').toLowerCase() === 'win';
        const dim = panel(this.battleLayer, 'Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(73, 45, 30, 128), 0, false, CuteTheme.transparent, 0);
        dim.on(Node.EventType.TOUCH_END, () => this.closeBattleResult());
        const card = panel(this.battleLayer, 'BattleResult', 0, 5, 620, 920, CuteTheme.paper, 40, true, won ? CuteTheme.honey : CuteTheme.peachDark, 4);
        headingTag(card, 'Title', this.battleTitle || '战斗结果', 0, 398, 210, won ? CuteTheme.paperWarm : CuteTheme.peach);
        text(card, 'ResultIcon', won ? '🏆' : '💦', 0, 305, 110, 100, 64, won ? CuteTheme.honeyDark : CuteTheme.caramelSoft, 'center', true);
        text(card, 'ResultText', won ? '挑战胜利' : '挑战失败', 0, 245, 360, 54, 32, won ? CuteTheme.honeyDark : CuteTheme.peachDark, 'center', true);

        const reward = result?.reward || {};
        const season = result?.seasonResult || result?.seasonSync || {};
        const summary = panel(card, 'Summary', 0, 150, 550, 110, new Color(255, 249, 224, 255), 24, false, CuteTheme.caramelSoft, 2);
        text(summary, 'Winner', `胜方：${safeName(result?.winner, won ? '我方队伍' : '对方队伍')}`, -240, 30, 470, 28, 16, CuteTheme.caramel, 'left', true);
        text(summary, 'Reward', reward?.gold || reward?.diamond || reward?.exp
            ? `奖励：金币${formatNumber(reward?.gold || 0)}　钻石${formatNumber(reward?.diamond || 0)}　经验${formatNumber(reward?.exp || reward?.expEach || 0)}`
            : '本场为切磋或训练，不额外消耗宝宝。', -240, -8, 480, 28, 14, CuteTheme.muted, 'left', true);
        const seasonText = season?.player?.points !== undefined
            ? `赛季积分 ${Number(season.player.points || 0)}　评分 ${Number(season.player.rating || 0)}`
            : season?.ratingAfter !== undefined
                ? `赛季评分 ${Number(season.ratingAfter || 0)}（${Number(season.ratingDelta || 0) >= 0 ? '+' : ''}${Number(season.ratingDelta || 0)}）`
                : '';
        if (seasonText) text(summary, 'Season', seasonText, -240, -42, 480, 26, 13, CuteTheme.peachDark, 'left', true);

        headingTag(card, 'LogTitle', '战斗记录', -205, 72, 142, CuteTheme.mint);
        const logs = Array.isArray(result?.battleLog) ? result.battleLog : [];
        const logText = logs.length ? logs.slice(0, 11).map((line: any, index: number) => `${index + 1}. ${String(line)}`).join('\n') : '服务器未返回战斗记录。';
        const logCard = panel(card, 'LogCard', 0, -135, 550, 365, new Color(248, 246, 231, 255), 22, false, CuteTheme.caramelSoft, 2);
        text(logCard, 'Logs', logText, -250, 0, 500, 330, 13, CuteTheme.caramel, 'left', false);
        if (logs.length > 11) text(card, 'MoreLogs', `仅显示前11条，共${logs.length}条`, 0, -335, 360, 26, 12, CuteTheme.muted, 'center', true);

        button(card, 'CloseResult', won ? '继续冒险' : '调整后再战', 0, -400, 220, 60, () => this.closeBattleResult(), {
            icon: won ? '🧭' : '↩', fill: won ? CuteTheme.honey : CuteTheme.mint, fontSize: 17, radius: 27,
        });
        card.setScale(new Vec3(0.92, 0.92, 1));
        tween(card).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private closeBattleResult() {
        this.battleResult = null;
        this.battleTitle = '';
        this.renderBattleResultModal();
        this.renderCurrentPage(false);
    }

    private playPageEnter() {
        if (!this.pageRoot) return;
        const opacity = this.pageRoot.getComponent(UIOpacity) || this.pageRoot.addComponent(UIOpacity);
        if (!CuteFeedback.animationEnabled()) {
            opacity.opacity = 255;
            this.pageRoot.setPosition(Vec3.ZERO);
            this.pageRoot.setScale(Vec3.ONE);
            return;
        }
        opacity.opacity = 0;
        this.pageRoot.setPosition(new Vec3(28, -6, 0));
        this.pageRoot.setScale(new Vec3(0.985, 0.985, 1));
        tween(opacity).to(0.15, { opacity: 255 }, { easing: 'quadOut' }).start();
        tween(this.pageRoot)
            .to(0.22, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    private setLoading(active: boolean, message = '加载中…') {
        if (!this.loadingLayer) return;
        clearNode(this.loadingLayer);
        this.loadingLayer.active = active;
        if (!active) return;

        if (!this.loadingLayer.getComponent(BlockInputEvents)) this.loadingLayer.addComponent(BlockInputEvents);
        panel(this.loadingLayer, 'Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(95, 63, 42, 65), 0, false, CuteTheme.transparent, 0);
        const bubble = panel(this.loadingLayer, 'Bubble', 0, 0, 360, 130, CuteTheme.paper, 38, true, CuteTheme.white, 3);
        text(bubble, 'Icon', '🐾', 0, 28, 70, 50, 30, CuteTheme.honeyDark, 'center', true);
        text(bubble, 'Message', message, 0, -27, 310, 42, 18, CuteTheme.caramel, 'center', true);
    }

    private showToast = (message: string) => {
        if (!this.toastLayer || !message) return;
        clearNode(this.toastLayer);

        const token = ++this.toastToken;
        const toast = panel(this.toastLayer, 'Toast', 0, 458, 520, 68, CuteTheme.paperWarm, 30, true, CuteTheme.white, 3);
        text(toast, 'Paw', '🐾', -220, 0, 42, 42, 22, CuteTheme.honeyDark, 'center', true);
        text(toast, 'Message', message, 18, 0, 430, 46, 17, CuteTheme.caramel, 'center', true);

        const opacity = toast.getComponent(UIOpacity) || toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setScale(new Vec3(0.92, 0.92, 1));

        tween(opacity).to(0.14, { opacity: 255 }).delay(1.8).to(0.2, { opacity: 0 }).call(() => {
            if (token === this.toastToken && toast.isValid) toast.destroy();
        }).start();
        tween(toast).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    };


    private resultList(result: any, keys: string[] = []) {
        if (Array.isArray(result)) return result;
        for (const key of keys) if (Array.isArray(result?.[key])) return result[key];
        for (const key of keys) if (Array.isArray(result?.data?.[key])) return result.data[key];
        if (Array.isArray(result?.data)) return result.data;
        return [];
    }

    private applyMailResult(result: any) {
        if (result?.success === false) return;
        this.mails = this.resultList(result, ['mails', 'data', 'items', 'list']);
        this.mailUnreadCount = Number(result?.unreadCount ?? this.mails.filter((mail) => !mail?.readed).length);
        this.mailClaimableCount = Number(result?.claimableCount ?? this.mails.filter((mail) => mail?.canClaim).length);
        if (!this.selectedMailId || !this.mails.some((mail) => Number(mail?.id) === this.selectedMailId)) {
            this.selectedMailId = Number(this.mails[0]?.id || 0);
        }
    }

    private requestId(prefix: string) {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }

    private async seedFriends() {
        const key = 'friends:seed';
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/friend/seed', {});
            if (result?.success === false) return this.showToast(result?.message || '创建测试好友失败');
            GameStore.setList('friends', result);
            CuteFeedback.playSuccess();
            this.showToast('测试好友已加入相册');
            await this.refreshPageData('friends');
        } finally { this.busy.delete(key); }
    }

    private async searchFriend(keyword: string) {
        this.friendSearchKeyword = keyword;
        const key = `friend:search:${keyword}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/friend/search', { keyword });
            if (result?.success === false) return this.showToast(result?.message || '搜索失败');
            this.friendSearchResults = this.resultList(result, ['users', 'data', 'items', 'list']);
            this.renderCurrentPage(false);
        } finally { this.busy.delete(key); }
    }

    private async sendFriendRequest(user: any) {
        const userId = Number(user?.id || user?.userId || 0);
        const key = `friend:add:${userId}`;
        if (!userId || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/friend/request', { targetUserId: userId, message: '一起在PetVerse养宝宝吧！' });
            if (result?.success === false) return this.showToast(result?.message || '申请发送失败');
            CuteFeedback.playSuccess();
            this.showToast('好友申请已发送');
            await this.refreshPageData('friends');
        } finally { this.busy.delete(key); }
    }

    private async handleFriendRequest(request: any, accept: boolean) {
        const key = `friend:handle:${request?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/friend/handle', { requestId: request?.id, accept });
            if (result?.success === false) return this.showToast(result?.message || '处理申请失败');
            CuteFeedback.playSuccess();
            this.showToast(accept ? '已成为好友' : '已拒绝申请');
            await this.refreshPageData('friends');
        } finally { this.busy.delete(key); }
    }

    private friendPets() {
        const pets: any[] = [];
        for (const friend of GameStore.friends) {
            for (const pet of Array.isArray(friend?.pets) ? friend.pets : []) pets.push({ ...pet, friendUserId: friend?.userId || friend?.id, friendName: friend?.nickname });
        }
        return pets;
    }

    private ensureMarriageSelection() {
        const own = GameStore.pets.filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed');
        const targets = this.friendPets().filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed');
        if (!own.some((pet) => Number(pet?.id) === this.marriageOwnPetId)) this.marriageOwnPetId = Number(own[0]?.id || 0);
        if (!targets.some((pet) => Number(pet?.id) === this.marriageTargetPetId)) this.marriageTargetPetId = Number(targets[0]?.id || 0);
    }

    private cycleMarriagePet(kind: 'own' | 'target', delta: number) {
        const list = kind === 'own'
            ? GameStore.pets.filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed')
            : this.friendPets().filter((pet) => !pet?.isEgg && !pet?.married && String(pet?.tradeStatus || '') !== 'listed');
        if (!list.length) return;
        const current = kind === 'own' ? this.marriageOwnPetId : this.marriageTargetPetId;
        let index = list.findIndex((pet) => Number(pet?.id) === current);
        index = (index + delta + list.length) % list.length;
        if (kind === 'own') this.marriageOwnPetId = Number(list[index]?.id || 0);
        else this.marriageTargetPetId = Number(list[index]?.id || 0);
        this.renderCurrentPage(false);
    }

    private async proposeMarriage() {
        if (!this.marriageOwnPetId || !this.marriageTargetPetId || this.busy.has('marriage:propose')) return;
        this.busy.add('marriage:propose');
        try {
            const result = await ApiClient.post('/marriage/propose', { petAId: this.marriageOwnPetId, petBId: this.marriageTargetPetId, message: '愿两只宝宝一起开启新的血脉故事。' });
            if (result?.success === false) return this.showToast(result?.message || '申请失败');
            CuteFeedback.playSuccess();
            this.showToast(result?.duplicate ? '已有相同申请' : '结缘申请已送达');
            this.marriageMode = result?.marriage ? 'marriages' : 'proposals';
            await this.refreshPageData('marriage');
        } finally { this.busy.delete('marriage:propose'); }
    }

    private async respondMarriageProposal(proposal: any, accept: boolean) {
        const key = `marriage:respond:${proposal?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/marriage/proposal/respond', { proposalId: proposal?.id, accept });
            if (result?.success === false) return this.showToast(result?.message || '处理申请失败');
            CuteFeedback.playSuccess();
            this.showToast(accept ? '结缘成功' : '已拒绝申请');
            await this.refreshPageData('marriage');
        } finally { this.busy.delete(key); }
    }

    private async cancelMarriageProposal(proposal: any) {
        const key = `marriage:cancel:${proposal?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/marriage/proposal/cancel', { proposalId: proposal?.id });
            if (result?.success === false) return this.showToast(result?.message || '撤回失败');
            this.showToast('申请已撤回');
            await this.refreshPageData('marriage');
        } finally { this.busy.delete(key); }
    }

    private async layMarriageEgg(marriage: any) {
        const key = `marriage:egg:${marriage?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/marriage/lay-egg', { marriageId: marriage?.id, requestId: this.requestId('lay-egg') });
            if (result?.success === false) return this.showToast(result?.message || '产蛋失败');
            CuteFeedback.playHatch();
            this.showToast('宠物蛋已送入孵化室仓库');
            const [marriages, eggs, inventory, profile] = await Promise.all([
                ApiClient.get('/marriage'), ApiClient.get('/hatchery/eggs'), ApiClient.get('/inventory'), ApiClient.get('/user/profile'),
            ]);
            if (marriages?.success !== false) GameStore.setList('marriages', marriages);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
        } finally { this.busy.delete(key); }
    }

    private async seedWelcomeMail() {
        if (this.busy.has('mail:seed')) return;
        this.busy.add('mail:seed');
        try {
            const result = await ApiClient.post('/mail/seed-welcome', {});
            if (result?.success === false) return this.showToast(result?.message || '创建邮件失败');
            CuteFeedback.playSuccess();
            this.showToast(result?.duplicate ? '欢迎邮件已经存在' : '欢迎邮件已送达');
            await this.refreshPageData('mail');
        } finally { this.busy.delete('mail:seed'); }
    }

    private async selectMail(mail: any) {
        this.selectedMailId = Number(mail?.id || 0);
        if (!mail?.readed) {
            const result = await ApiClient.post('/mail/read', { mailId: mail?.id });
            if (result?.success !== false) await this.refreshPageData('mail');
            return;
        }
        this.renderCurrentPage(false);
    }

    private async readAllMail() {
        const result = await ApiClient.post('/mail/read-all', {});
        if (result?.success === false) return this.showToast(result?.message || '操作失败');
        this.showToast('全部邮件已标为已读');
        await this.refreshPageData('mail');
    }

    private async claimMail(mail: any) {
        const key = `mail:claim:${mail?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/mail/claim', { mailId: mail?.id, requestId: this.requestId(`mail-${mail?.id}`) });
            if (result?.success === false) return this.showToast(result?.message || '领取失败');
            CuteFeedback.playSuccess();
            this.showToast(`领取成功：${this.rewardSummary(result?.reward)}`);
            const [mailResult, inventory, profile] = await Promise.all([ApiClient.get('/mail/list'), ApiClient.get('/inventory'), ApiClient.get('/user/profile')]);
            this.applyMailResult(mailResult);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
        } finally { this.busy.delete(key); this.refreshAllVisuals(); }
    }

    private async claimAllMail() {
        if (this.busy.has('mail:claim-all')) return;
        this.busy.add('mail:claim-all');
        try {
            const result = await ApiClient.post('/mail/claim-all', { requestId: this.requestId('mail-all') });
            if (result?.success === false) return this.showToast(result?.message || '领取失败');
            CuteFeedback.playSuccess();
            this.showToast(`已领取 ${Number(result?.claimedCount || 0)} 封邮件奖励`);
            const [mailResult, inventory, profile] = await Promise.all([ApiClient.get('/mail/list'), ApiClient.get('/inventory'), ApiClient.get('/user/profile')]);
            this.applyMailResult(mailResult);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
        } finally { this.busy.delete('mail:claim-all'); this.refreshAllVisuals(); }
    }

    private attachmentSummary(mail: any) {
        const attachments = Array.isArray(mail?.attachments) ? mail.attachments : [];
        if (!attachments.length) return mail?.claimed ? '已阅读' : '无附件';
        return attachments.map((item: any) => item?.type === 'gold' ? `金币×${item?.quantity}` : item?.type === 'diamond' ? `钻石×${item?.quantity}` : `${safeName(item?.itemCode, '道具')}×${item?.quantity}`).join(' · ');
    }

    private rewardSummary(reward: any) {
        const parts: string[] = [];
        if (Number(reward?.gold || 0)) parts.push(`金币${reward.gold}`);
        if (Number(reward?.diamond || 0)) parts.push(`钻石${reward.diamond}`);
        const items = reward?.items || {};
        for (const key of Object.keys(items)) if (Number(items[key] || 0)) parts.push(`${key}×${items[key]}`);
        return parts.join('、') || '奖励已到账';
    }

    private async changeRankingMode(mode: 'tower' | 'level' | 'power' | 'season') {
        this.rankingMode = mode;
        this.renderCurrentPage(false);
        await this.refreshPageData('ranking');
    }

    private rankingScoreText(item: any) {
        if (this.rankingMode === 'tower') return `最高 ${Number(item?.maxFloor ?? item?.highestTower ?? 0)}层`;
        if (this.rankingMode === 'level') return `Lv.${Number(item?.level || 0)}`;
        if (this.rankingMode === 'season') return `${Number(item?.points || 0)}分`;
        return `战力 ${formatNumber(item?.power || item?.score || 0)}`;
    }

    private ensureTradePet() {
        const eligible = this.tradeEligiblePets();
        if (!eligible.some((pet) => Number(pet?.id) === this.tradePetId)) this.tradePetId = Number(eligible[0]?.id || 0);
    }

    private tradeEligiblePets() {
        const teamIds = new Set(this.teamPetIds.map(Number));
        return GameStore.pets.filter((pet) => !pet?.isEgg && !pet?.isLocked && !pet?.isFavorite && !pet?.married && !pet?.partnerId && !pet?.marriedPetId && String(pet?.tradeStatus || '') !== 'listed' && !Number(pet?.tradeListingId || 0) && !teamIds.has(Number(pet?.id || 0)));
    }

    private cycleTradePet(delta: number) {
        const list = this.tradeEligiblePets();
        if (!list.length) return;
        let index = list.findIndex((pet) => Number(pet?.id) === this.tradePetId);
        index = (index + delta + list.length) % list.length;
        this.tradePetId = Number(list[index]?.id || 0);
        this.renderCurrentPage(false);
    }

    private changeTradePrice(direction: number) {
        const step = this.tradeCurrency === 'gold' ? 1000 : 10;
        const min = this.tradeCurrency === 'gold' ? 100 : 1;
        const max = this.tradeCurrency === 'gold' ? 10000000 : 100000;
        this.tradePrice = Math.max(min, Math.min(max, this.tradePrice + direction * step));
        this.renderCurrentPage(false);
    }

    private async listTradePet() {
        if (!this.tradePetId || this.busy.has('trade:list')) return;
        this.busy.add('trade:list');
        try {
            const result = await ApiClient.post('/trade/list', { petId: this.tradePetId, currencyType: this.tradeCurrency, price: this.tradePrice, requestId: this.requestId('trade-list') });
            if (result?.success === false) return this.showToast(result?.message || '上架失败');
            CuteFeedback.playSuccess();
            this.showToast('宝宝已上架寄售市场');
            this.tradeMode = 'mine';
            await this.refreshPageData('trade');
        } finally { this.busy.delete('trade:list'); }
    }

    private async buyTrade(listing: any) {
        const key = `trade:buy:${listing?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/trade/buy', { listingId: listing?.id, requestId: this.requestId(`trade-buy-${listing?.id}`) });
            if (result?.success === false) return this.showToast(result?.message || '购买失败');
            CuteFeedback.playSuccess();
            this.showToast('购买成功，宝宝已进入仓库');
            const profile = await ApiClient.get('/user/profile');
            if (profile?.success !== false) GameStore.setProfile(profile);
            await this.refreshPageData('trade');
        } finally { this.busy.delete(key); }
    }

    private async cancelTrade(listing: any) {
        const key = `trade:cancel:${listing?.id}`;
        if (this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/trade/cancel', { listingId: listing?.id });
            if (result?.success === false) return this.showToast(result?.message || '取消失败');
            this.showToast('寄售已取消，宝宝已解锁');
            await this.refreshPageData('trade');
        } finally { this.busy.delete(key); }
    }

    private async expandCapacity() {
        if (this.busy.has('capacity:expand')) return;
        this.busy.add('capacity:expand');
        try {
            const result = await ApiClient.post('/pet-capacity/expand', { requestId: this.requestId('capacity') });
            if (result?.success === false) return this.showToast(result?.message || '扩容失败');
            CuteFeedback.playSuccess();
            this.showToast('宝宝仓库容量增加10格');
            this.capacitySummary = result?.data || result?.status || result;
            const [inventory, profile] = await Promise.all([ApiClient.get('/inventory'), ApiClient.get('/user/profile')]);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (profile?.success !== false) GameStore.setProfile(profile);
        } finally { this.busy.delete('capacity:expand'); this.refreshAllVisuals(); }
    }

    private statusLabel(status: any) {
        const labels: Record<string, string> = {
            pending: '待处理', accepted: '已通过', rejected: '已拒绝', cancelled: '已撤回', expired: '已过期', active: '进行中', sold: '已售出', claimed: '已领取', completed: '已完成', none: '无',
        };
        return labels[String(status || '').toLowerCase()] || safeName(status, '未知');
    }

    private titleForPage(page: PageName) {
        const titles: Record<PageName, string> = {
            home: '温馨小屋',
            pet: '宝宝详情',
            inventory: '布艺背包',
            adventure: '绘本冒险',
            more: '更多功能',
            shop: '萌宠集市',
            hatchery: '孵化室',
            skills: '打技能',
            fusion: '炼妖',
            friends: '好友相册',
            ranking: '森林排行榜',
            marriage: '心愿婚礼',
            mail: '邮差信箱',
            trade: '寄售市场',
            profile: '玩家手账',
            settings: '游戏设置',
        };
        return titles[page];
    }

    private iconForPage(page: PageName) {
        const icons: Partial<Record<PageName, string>> = {
            shop: '🛒',
            hatchery: '🥚',
            skills: '📕',
            fusion: '🔮',
            friends: '📷',
            ranking: '🏆',
            marriage: '💞',
            mail: '💌',
            trade: '🏷',
            profile: '📒',
            settings: '⚙',
        };
        return icons[page] || '🐾';
    }

    private secondarySummary(page: PageName) {
        const summaries: Partial<Record<PageName, string>> = {
            shop: '集市会采用不同萌宠摊位展示食物、技能书、孵化材料和扩容道具。',
            hatchery: '宠物蛋将放在温室软垫中，显示倒计时、品质、血脉与孵化结果。',
            skills: '选择技能书、查看技能描述、保护普通技能并完成打书。',
            fusion: '选择两只宝宝进行炼妖，预览技能格、资质、成长和特殊技能继承结果。',
            friends: '好友列表将做成拍立得照片墙，可查看好友宝宝、申请结婚和发起对战。',
            ranking: '等级、战力、爬塔和赛季排行会使用森林庆典领奖台展示。',
            marriage: '两只宝宝会站在左右两侧，通过心愿丝带展示血缘、生育力和产蛋状态。',
            mail: '系统邮件和奖励附件会放进萌系信封与包裹卡片中。',
            trade: '寄售宝宝会显示技能格、特殊技能、资质、成长和价格。',
            profile: '玩家头像、等级、成就、容量和赛季记录会整理成一本个人手账。',
            settings: '可调整声音、点击反馈、动效与画质档位。',
        };
        return summaries[page] || '该页面将在后续萌系界面批次中完整接入。';
    }

    private mainTabForPage(page: PageName) {
        if (page === 'home') return 'home';
        if (page === 'pet') return 'pet';
        if (page === 'inventory') return 'inventory';
        if (page === 'adventure') return 'adventure';
        return 'more';
    }

    private rarityName(pet: any) {
        const name = String(pet?.rarityName || '').split(' ')[0];
        if (name) return name;
        const rarity = Number(pet?.rarity || 1);
        return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][Math.max(0, Math.min(5, rarity - 1))];
    }

    private aptitudesOf(pet: any): AptitudeView {
        const source = pet?.aptitudes || pet?.aptitude || pet?.qualification || {};
        const quality = Math.round(Number(pet?.quality || 100));

        const pick = (...values: any[]) => {
            for (const value of values) {
                const number = Number(value);
                if (Number.isFinite(number) && number > 0) return Math.round(number);
            }
            return quality;
        };

        return {
            hp: pick(source.hp, source.health, source.stamina, source.vitality, pet?.hpAptitude, pet?.staminaAptitude),
            attack: pick(source.attack, source.physical, source.strength, pet?.attackAptitude),
            defense: pick(source.defense, source.guard, pet?.defenseAptitude),
            magic: pick(source.magic, source.mana, source.intelligence, pet?.magicAptitude, pet?.manaAptitude),
            speed: pick(source.speed, source.agility, pet?.speedAptitude),
        };
    }

    private growthValue(pet: any) {
        const value = Number(pet?.growth || pet?.growthRate || 0);
        if (value > 0) return value;
        return Math.max(0.9, Math.min(1.35, Number(pet?.quality || 100) / 100 + 0.05));
    }

    private specialSkills(pet: any) {
        const skills = Array.isArray(pet?.skills) ? pet.skills : [];
        return skills.filter((skill: any) => this.isSpecialSkill(skill));
    }

    private isSpecialSkill(skill: any) {
        const code = String(skill?.skillCode || skill?.code || '').toUpperCase();
        const tier = String(skill?.tier || skill?.category || skill?.rarityType || '').toLowerCase();
        return Boolean(skill?.isSpecial || tier === 'special' || code.startsWith('SPECIAL_'));
    }

    private skillName(skill: any) {
        return safeName(skill?.name || skill?.skillName || skill?.skillCode, '未知技能');
    }

    private skillDescription(skill: any) {
        const direct = String(skill?.description || skill?.effectDescription || '').trim();
        const effect = String(skill?.effect || '').trim();
        const data = skill?.effectData || {};
        const pct = (value: any) => `${Math.round(Number(value || 0) * 100)}%`;
        const rate = Number(skill?.triggerRate || 0);
        const trigger = rate > 0 && rate < 1 ? `触发概率${pct(rate)}。` : '';

        const descriptions: Record<string, string> = {
            physical_combo: `${trigger}普通攻击后追加1次攻击，追加伤害为原伤害的${pct(data.extraDamageRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            physical_crit: `物理暴击率提高${pct(data.critRateBonus)}，暴击伤害提高${pct(data.critDamageBonus)}。`,
            physical_power: `造成的物理伤害提高${pct(data.physicalDamageBonus)}。`,
            ambush: `本场首次造成伤害时，伤害提高${pct(data.firstDamageBonus)}，并忽略目标${pct(data.defenseIgnore)}防御。`,
            pursuit: `${trigger}攻击生命低于${pct(data.hpThreshold)}的目标后追加一次${pct(data.extraDamageRate)}伤害；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            magic_combo: `${trigger}施放法术后重复施放一次，重复效果为原效果的${pct(data.repeatEffectRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            magic_crit: `法术暴击率提高${pct(data.magicCritRateBonus)}。`,
            magic_variance: `法术最终效果在${pct(data.minRate)}至${pct(data.maxRate)}之间波动。`,
            magic_power: `法力属性提高${pct(data.magicStatBonus)}。`,
            magic_pierce: `法术伤害忽略目标${pct(data.damageReductionIgnore)}减伤。`,
            physical_guard: `受到的物理伤害降低${pct(data.physicalDamageReduction)}。`,
            magic_guard: `受到的法术伤害降低${pct(data.magicDamageReduction)}。`,
            parry: `${trigger}受到直接伤害时，使本次伤害降低${pct(data.damageReduction)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            reflect: `${trigger}受到直接攻击后反弹本次伤害的${pct(data.reflectRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            opening_shield: `战斗开始时获得相当于最大生命${pct(data.maxHpRate)}的护盾，持续${Number(data.durationTurns || 2)}回合。`,
            max_hp: `最大生命提高${pct(data.maxHpBonus)}。`,
            regen: `回合结束恢复最大生命的${pct(data.maxHpRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            lifesteal: `造成物理伤害时，将伤害的${pct(data.damageToHealRate)}转化为自身治疗。`,
            death_save: `${trigger}受到致命伤害时保留${Number(data.remainHp || 1)}点生命；每场最多${Number(data.maxPerBattle || 1)}次。`,
            last_stand: `生命低于${pct(data.hpThreshold)}时，受到的伤害降低${pct(data.damageReduction)}。`,
            speed_up: `速度提高${pct(data.speedBonus)}。`,
            slow_tank: `速度降低${pct(data.speedPenalty)}，但受到的伤害降低${pct(data.damageReduction)}。`,
            accuracy: `命中提高${pct(data.accuracyBonus)}，对护盾造成的伤害提高${pct(data.shieldDamageBonus)}。`,
            control_resist: `控制抵抗提高${pct(data.controlResistBonus)}。`,
            dispel_on_hit: `${trigger}造成直接伤害时移除目标${Number(data.removeBuffCount || 1)}个增益；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            healing_power: `治疗和护盾效果提高${pct(data.healingAndShieldBonus)}。`,
            energy_gain: `每回合开始额外获得${Number(data.energyPerTurn || 0)}点能量。`,
            cleanse: `${trigger}获得负面状态时移除自身${Number(data.removeDebuffCount || 1)}个负面状态；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            guard_ally: `${trigger}生命低于${pct(data.allyHpThreshold)}的友方受到单体攻击时，为其承担伤害，自己承受原伤害的${pct(data.takenDamageRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
            healing_echo: `${trigger}受到治疗时额外恢复最大生命的${pct(data.extraMaxHpHealRate)}；每回合最多${Number(data.maxPerTurn || 1)}次。`,
        };

        if (descriptions[effect]) return descriptions[effect];
        if (direct && direct !== this.skillName(skill)) return direct;
        if (effect.startsWith('special_') && direct) return direct;
        return `${this.skillName(skill)}：该技能的具体战斗效果由服务器配置决定。`;
    }

    private skillIconPath(skill: any) {
        const code = this.skillCode(skill).toUpperCase();
        const tier = this.skillTier(skill);
        if (/^(LOW|HIGH|SPECIAL)_/.test(code)) return `skill-icons/${code}`;
        return `skill-icons/${tier === 'special' ? 'SPECIAL_DEFAULT' : tier === 'high' ? 'HIGH_DEFAULT' : 'LOW_DEFAULT'}`;
    }

    private skillBookIconPath(item: any) {
        const code = String(item?.effectData?.skillCode || item?.itemCode || '')
            .replace(/^BOOK_/, '')
            .toUpperCase();
        if (/^(LOW|HIGH|SPECIAL)_/.test(code)) return `skill-icons/${code}`;
        return this.itemTier(item) === 'high'
            ? 'skill-icons/HIGH_DEFAULT'
            : 'skill-icons/LOW_DEFAULT';
    }

    private battleAttributesOf(pet: any) {
        const final = pet?.finalAttributes || {};
        const hp = Math.round(Number(final?.hp ?? pet?.hp ?? 0));
        const attack = Math.round(Number(final?.attack ?? pet?.attack ?? 0));
        const magic = Math.round(Number(final?.magicAttack ?? final?.magic ?? pet?.magicAttack ?? pet?.intelligence ?? 0));
        const defense = Math.round(Number(final?.defense ?? pet?.defense ?? 0));
        const speed = Math.round(Number(final?.speed ?? pet?.speed ?? pet?.agility ?? 0));
        const power = Math.round(Number(pet?.power || hp + attack * 5 + magic * 5 + defense * 3 + speed * 2 + Number(pet?.level || 1) * 20));
        return { hp, attack, magic, defense, speed, power };
    }

    private battleStat(parent: Node, name: string, icon: string, title: string, value: string | number, x: number, y: number) {
        const card = panel(parent, name, x, y, 142, 56, new Color(255, 252, 239, 255), 18, false, CuteTheme.white, 2);
        text(card, 'Icon', icon, -56, 0, 28, 30, 18, CuteTheme.honeyDark, 'left', true);
        text(card, 'Title', title, -22, 8, 60, 24, 13, CuteTheme.muted, 'left', true);
        text(card, 'Value', String(value), -22, -12, 92, 26, 16, CuteTheme.caramel, 'left', true);
    }

    private aptitudeRow(parent: Node, name: string, icon: string, title: string, value: number, y: number) {
        const cap = Math.max(1800, Math.ceil(value / 100) * 100);
        text(parent, `${name}_Icon`, icon, -136, y, 28, 28, 17, CuteTheme.honeyDark, 'left', true);
        text(parent, `${name}_Title`, title, -104, y, 88, 28, 14, CuteTheme.caramel, 'left', true);
        progress(parent, `${name}_Bar`, 30, y, 128, 12, value / cap, CuteTheme.green);
        text(parent, `${name}_Value`, String(value), 104, y, 58, 28, 14, CuteTheme.caramel, 'right', true);
    }

    private skillIconButton(parent: Node, name: string, skill: any, x: number, y: number, width: number, height: number) {
        const tier = this.skillTier(skill);
        button(parent, name, this.skillName(skill), x, y, width, height, () => this.showSkillDetail(skill), {
            iconPath: this.skillIconPath(skill),
            iconSize: Math.min(58, height - 10),
            fill: this.skillColor(skill),
            textColor: tier === 'low' ? CuteTheme.caramel : CuteTheme.white,
            fontSize: 13,
            radius: 20,
            subtitle: this.skillTierLabel(skill),
            border: tier === 'low' ? CuteTheme.mintDark : CuteTheme.red,
        });
    }

    private skillCode(skill: any) {
        return String(skill?.skillCode || skill?.code || skill?.name || '').trim();
    }

    private skillTier(skill: any): 'low' | 'high' | 'special' {
        if (this.isSpecialSkill(skill)) return 'special';
        const tier = String(skill?.tier || skill?.effectData?.tier || skill?.rarityType || '').toLowerCase();
        const code = this.skillCode(skill).toUpperCase();
        if (tier === 'high' || code.includes('_HIGH') || code.startsWith('HIGH_') || Number(skill?.rarity || 0) >= 4) return 'high';
        return 'low';
    }

    private skillTierLabel(skill: any) {
        const tier = this.skillTier(skill);
        return tier === 'special' ? '特殊技能' : tier === 'high' ? '高级技能' : '低级技能';
    }

    private skillColor(skill: any) {
        return this.skillTier(skill) === 'low' ? new Color(186, 230, 170, 255) : new Color(224, 104, 103, 255);
    }

    private skillBookItems() {
        return GameStore.inventory.filter((item) => this.isSkillBook(item));
    }

    private isSkillBook(item: any) {
        return String(item?.type || '').toLowerCase() === 'skill_book' || String(item?.effect || '').toLowerCase() === 'learn_skill' || String(item?.itemCode || '').toUpperCase().startsWith('BOOK_');
    }

    private itemTier(item: any): 'low' | 'high' {
        const tier = String(item?.effectData?.tier || '').toLowerCase();
        if (tier === 'high' || Number(item?.rarity || 0) >= 4) return 'high';
        return 'low';
    }

    private hatchAcceleratorItems() {
        return GameStore.inventory.filter((item) => {
            const type = String(item?.type || '').toLowerCase();
            const effect = String(item?.effect || '').toLowerCase();
            const code = String(item?.itemCode || '').toLowerCase();
            return effect === 'hatch_acceleration'
                || type === 'hatch_accelerator'
                || code.includes('hatch_sandglass');
        });
    }

    private isEggItem(item: any) {
        const type = String(item?.type || '').toLowerCase();
        const effect = String(item?.effect || '').toLowerCase();
        const code = String(item?.itemCode || '').toLowerCase();
        return type === 'egg' || effect === 'egg' || code.includes('pet_egg') || code.endsWith('_egg');
    }

    private formatSeconds(value: number) {
        const seconds = Math.max(0, Math.floor(Number(value || 0)));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remain = seconds % 60;
        if (hours > 0) return `${hours}时${minutes}分`;
        return `${minutes}分${remain}秒`;
    }

    private genderText(pet: any) {
        const gender = String(pet?.gender || pet?.sex || '').toLowerCase();
        return gender === 'female' || gender === 'f' || gender === '2' || gender === '女' ? '♀' : '♂';
    }

    private itemIcon(item: any) {
        const value = `${item?.type || ''} ${item?.effect || ''} ${item?.itemCode || ''}`.toLowerCase();
        if (/food|hunger|apple/.test(value)) return '🍎';
        if (/hatch_acceleration|hatch_sandglass/.test(value)) return '⏳';
        if (/egg/.test(value)) return '🥚';
        if (/skill|book/.test(value)) return '📘';
        if (/exp|potion/.test(value)) return '🧪';
        if (/clean/.test(value)) return '🛁';
        if (/breed|marriage/.test(value)) return '💞';
        return '🎁';
    }
}

export default MainUI;
