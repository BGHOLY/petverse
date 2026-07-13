import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    find,
    Mask,
    Node,
    ScrollView,
    UIOpacity,
    UITransform,
    Vec2,
    Vec3,
    profiler,
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
import CuteGuideState, { CuteGuideStep } from './cute/CuteGuide';
import { getPetArtPath, getPetSpeciesMeta } from './pet/PetArtRegistry';
import { showBattlePlayback } from './advanced/BattlePlayback';
import { loadHomePetId, loadPetFilter, saveHomePetId, savePetFilter } from './advanced/PetExperienceState';
import { showPetReveal } from './advanced/RevealOverlay';
import AudioDirector from './v10/AudioDirector';
import { showFivePetBattle } from './v10/BattleSceneV10';
import { getEggArtPath, getEggDisplayName, getEggMeta, RARITY_NAMES as EGG_RARITY_NAMES } from './v10/EggArtRegistry';
import { renderFormationPanel, renderGuildPanel } from './v10/V10Panels';
import { AppRouter } from './v2/AppRouter';
import { isMainPage, mainTabForPage, PageName } from './v2/AppRoutes';
import { resolveAppShell, resolvePageContainer } from './v2/AppShell';
import { drawUiIcon, renderBottomNavigation } from './v2/HandPaintedUi';
import { renderMorePage } from './v2/MorePage';
import { HomeActivity, renderHomePage } from './v2/pages/HomePage';

const { ccclass, executeInEditMode, property } = _decorator;

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
    private pageHost: Node | null = null;
    private pageRoot: Node | null = null;
    private bottomNav: Node | null = null;
    private toastLayer: Node | null = null;
    private loadingLayer: Node | null = null;
    private drawerLayer: Node | null = null;
    private modalLayer: Node | null = null;
    private battleLayer: Node | null = null;
    private revealLayer: Node | null = null;
    private utilityLayer: Node | null = null;
    private guideLayer: Node | null = null;

    private currentPage: PageName = 'home';
    private detailSkill: any | null = null;
    private selectedSkillBookCode = '';
    private lockedSkillCodes = new Set<string>();
    private fusionParentAId = 0;
    private fusionParentBId = 0;
    private adventureMode: 'world' | 'tower' | 'pve' | 'friend' = 'world';
    private worldExploration: any = null;
    private selectedRegionCode = 'moon-forest';
    private teamPetIds: number[] = [];
    private teamPets: any[] = [];
    private teamEditing = false;
    private selectedFriendUserId = 0;
    private battleResult: any | null = null;
    private battleTitle = '';
    private eggSyncRunning = false;
    private hatchAcceleratorOpen = false;
    private hatchAcceleratorEggId = 0;
    private hatchEggFilter: 'all' | 'rare' | 'mutant' = 'all';
    private hatchEggSort: 'rarity' | 'time' = 'rarity';
    private homePetPickerOpen = false;
    private pendingHomePetId = 0;
    private fusionPickerSide: 'A' | 'B' | null = null;
    private pendingIncubation: { egg: any; slot: number } | null = null;
    private fusionConfirmOpen = false;
    private formationSlotNodes = new Map<number, Node>();
    private formationCandidateNodes = new Map<number, Node>();
    private homePetId = loadHomePetId();
    private inventoryTargetPetId = 0;
    private inventoryCategory: 'all' | 'consumable' | 'material' | 'skill' = 'all';
    private inventorySort: 'category' | 'quantity' = 'category';
    private inventoryDetailItem: any | null = null;
    private petFilter = loadPetFilter();
    private readonly router = new AppRouter('home');
    private lastBattleMode: 'tower' | 'pve' | 'friend' = 'tower';
    private formationOverview: any = null;
    private guildOverview: any = null;
    private selectedFormationCode = 'dragon';
    private teamSlotAssignments: any[] = [];
    private petDetailTab: 'attributes' | 'aptitudes' | 'skills' | 'equipment' = 'attributes';
    private petAttributeView: 'overview' | 'stats' | 'lineage' = 'overview';
    private petSelectorOffset = 0;
    private petSelectorScrollToken = 0;
    private teamEditSnapshot: { petIds: number[]; slots: number[]; formationCode: string } | null = null;
    private teamDragPetId = 0;
    private teamDragSourceSlot = -1;
    private teamDragMoved = false;
    private formationSelectedCandidateId = 0;

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

    private shopCategory: 'featured' | 'nurture' | 'skills' | 'materials' | 'hatch' | 'special' = 'featured';
    private selectedShopItemId = 0;
    private shopBuyCount = 1;

    private benefitMode: 'sign' | 'daily' | 'achievement' | 'month' | 'pass' = 'sign';
    private signInfo: any = null;
    private dailyTask: any = null;
    private achievements: any[] = [];

    private guideActive = false;
    private guideStepIndex = 0;

    private busy = new Set<string>();
    private scrollOffsets = new Map<string, Vec2>();
    private petStatDraftPetId = 0;
    private petStatDraft: Record<string, number> = {};
    private fusionUseMutationEssence = false;
    private countdownAccumulator = 0;
    private toastToken = 0;
    private unsubscribeStore: (() => void) | null = null;

    onLoad() {
        MainUI.instance = this;
        try { profiler.hideStats(); } catch {}
        ApiClient.setBaseUrl(this.apiBaseUrl);
        ToastManager.bind(this.showToast);

        this.unsubscribeStore?.();
        this.unsubscribeStore = GameStore.subscribe(this.onStoreChanged);

        if (EDITOR && !GameStore.pets.length) GameStore.seedPreview();

        this.buildShell();
        if (this.root) {
            CuteFeedback.initialize(this.root);
            AudioDirector.initialize(this.root);
            this.root.off(Node.EventType.TOUCH_END, this.finishTeamDrag, this);
            this.root.on(Node.EventType.TOUCH_END, this.finishTeamDrag, this);
            void AudioDirector.playBgm('home');
        }
        this.refreshAllVisuals();
    }

    start() {
        if (!EDITOR) void this.bootstrap();
    }

    onDestroy() {
        if (MainUI.instance === this) MainUI.instance = null;
        this.unsubscribeStore?.();
        this.unsubscribeStore = null;
        this.root?.off(Node.EventType.TOUCH_END, this.finishTeamDrag, this);
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
    public showBenefits() { this.showPage('benefits'); }
    public showFormation() { this.showPage('formation'); }
    public showGuild() { this.showPage('guild'); }

    public showPage(page: PageName) {
        const changed = this.currentPage !== page;
        if (changed) this.router.navigate(page);
        this.currentPage = this.router.current;
        this.detailSkill = null;
        this.inventoryDetailItem = null;
        this.hatchAcceleratorOpen = false;
        this.hatchAcceleratorEggId = 0;
        this.homePetPickerOpen = false;
        this.fusionPickerSide = null;
        this.pendingIncubation = null;
        this.fusionConfirmOpen = false;
        if (changed) CuteFeedback.playPage();
        if (page !== 'adventure') void AudioDirector.playBgm('home');
        this.renderCurrentPage(true);
        this.renderTopBar();
        this.renderBottomNav();
        if (!EDITOR) void this.refreshPageData(page);
    }

    private goBackPage() {
        this.currentPage = this.router.back(mainTabForPage(this.currentPage));
        this.detailSkill = null;
        CuteFeedback.playPage();
        this.renderTopBar();
        this.renderBottomNav();
        this.renderCurrentPage(true);
        if (!EDITOR) void this.refreshPageData(this.currentPage);
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
                ApiClient.get('/sign'),
                ApiClient.get('/daily-task'),
                ApiClient.get('/achievement/list'),
                ApiClient.get('/friend/requests'),
                ApiClient.get('/marriage/proposals?direction=incoming'),
                ApiClient.get('/exploration/world'),
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
            this.signInfo = results[11]?.data || results[11] || null;
            this.dailyTask = results[12]?.data || results[12] || null;
            this.achievements = this.resultList(results[13], ['achievements', 'data', 'items', 'list']);
            this.incomingFriendRequests = this.resultList(results[14], ['requests', 'data', 'items', 'list']);
            this.marriageProposals = this.resultList(results[15], ['proposals', 'data', 'items', 'list']);
            this.applyWorldExploration(results[16]);
            this.ensureSelectedShopItem();
            this.ensureSelectedFriend();
            this.ensureMarriageSelection();
            this.ensureTradePet();
            this.ensureExperienceSelections();
            await this.syncEggItemsToHatchery();
        } catch (error) {
            console.error('[CuteMainUI] bootstrap failed:', error);
            this.showToast('数据加载失败，请确认后端已启动');
        } finally {
            this.setLoading(false);
            this.refreshAllVisuals();
            if (CuteGuideState.shouldAutoStart()) this.startGuide(false);
        }
    }

    private async refreshPageData(page: PageName) {
        const key = `refresh:${page}`;
        if (this.busy.has(key)) return;

        this.busy.add(key);
        try {
            switch (page) {
                case 'home': {
                    const [profile, tower, mail, sign, daily, achievements, friendRequests, marriageRequests, eggs] = await Promise.all([
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/tower/status'),
                        ApiClient.get('/mail/list'),
                        ApiClient.get('/sign'),
                        ApiClient.get('/daily-task'),
                        ApiClient.get('/achievement/list'),
                        ApiClient.get('/friend/requests'),
                        ApiClient.get('/marriage/proposals?direction=incoming'),
                        ApiClient.get('/hatchery/eggs'),
                    ]);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    if (tower?.success !== false) GameStore.setTower(tower);
                    if (eggs?.success !== false) GameStore.setList('eggs', eggs);
                    this.applyMailResult(mail);
                    this.signInfo = sign?.data || sign || this.signInfo;
                    this.dailyTask = daily?.data || daily || this.dailyTask;
                    this.achievements = this.resultList(achievements, ['achievements', 'data', 'items', 'list']);
                    this.incomingFriendRequests = this.resultList(friendRequests, ['requests', 'data', 'items', 'list']);
                    this.marriageProposals = this.resultList(marriageRequests, ['proposals', 'data', 'items', 'list']);
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
                    const [shop, profile, inventory] = await Promise.all([
                        ApiClient.get('/shop/items'),
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/inventory'),
                    ]);
                    if (shop?.success !== false) GameStore.setList('shopItems', shop);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    this.ensureSelectedShopItem();
                    break;
                }
                case 'benefits': {
                    const [sign, daily, achievements, profile, inventory, season] = await Promise.all([
                        ApiClient.get('/sign'),
                        ApiClient.get('/daily-task'),
                        ApiClient.get('/achievement/list'),
                        ApiClient.get('/user/profile'),
                        ApiClient.get('/inventory'),
                        ApiClient.get('/season/me'),
                    ]);
                    this.signInfo = sign?.data || sign || this.signInfo;
                    this.dailyTask = daily?.data || daily || this.dailyTask;
                    this.achievements = this.resultList(achievements, ['achievements', 'data', 'items', 'list']);
                    if (profile?.success !== false) GameStore.setProfile(profile);
                    if (inventory?.success !== false) GameStore.setList('inventory', inventory);
                    this.seasonSummary = season?.data || season || this.seasonSummary;
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
                    const [tower, team, pets, friends, world] = await Promise.all([
                        ApiClient.get('/tower/status'),
                        ApiClient.get('/team'),
                        ApiClient.get('/pet/my'),
                        ApiClient.get('/friend/list'),
                        ApiClient.get('/exploration/world'),
                    ]);
                    if (tower?.success !== false) GameStore.setTower(tower);
                    if (pets?.success !== false) GameStore.setPets(pets);
                    if (friends?.success !== false) GameStore.setList('friends', friends);
                    this.applyTeamResult(team);
                    this.applyWorldExploration(world);
                    this.ensureSelectedFriend();
                    break;
                }
                case 'formation': {
                    const [formation, team] = await Promise.all([
                        ApiClient.get('/formation'),
                        ApiClient.get('/team'),
                    ]);
                    this.formationOverview = formation?.data || formation || this.formationOverview;
                    this.applyTeamResult(team);
                    break;
                }
                case 'guild': {
                    this.guildOverview = (await ApiClient.get('/guild/my')) || this.guildOverview;
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
        const canvas = find('Canvas') || this.node.parent || this.node;
        this.canvas = canvas;
        const shell = resolveAppShell(canvas);
        this.root = shell.root;
        this.topBar = shell.topBar;
        this.pageHost = shell.pageRoot;
        this.pageRoot = resolvePageContainer(shell.pageRoot, this.currentPage);
        this.bottomNav = shell.bottomNavigation;
        this.drawerLayer = shell.drawerLayer;
        this.modalLayer = shell.modalLayer;
        this.utilityLayer = shell.utilityLayer;
        this.battleLayer = shell.battleLayer;
        this.revealLayer = shell.revealLayer;
        this.guideLayer = shell.guideLayer;
        this.toastLayer = shell.toastLayer;
        this.loadingLayer = shell.loadingLayer;

        clearNode(shell.globalBackground);
        this.buildBackground(shell.globalBackground);
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
        this.renderSkillModal();
        this.renderUtilityModal();
        this.renderBattleResultModal();
        this.renderGuide();
    }

    private renderTopBar() {
        if (!this.topBar) return;
        clearNode(this.topBar);

        panel(this.topBar, 'CloudBack', 0, -2, 700, 118, new Color(255, 250, 234, 250), 34, true, CuteTheme.white, 3);

        image(this.topBar, 'Avatar', 'cute-ui/player_avatar', -300, 1, 82, 82, CuteTheme.paperWarm);
        text(this.topBar, 'Nickname', safeName(GameStore.user?.nickname, '小桃子'), -244, 20, 176, 32, 22, CuteTheme.caramel, 'left', true);
        text(this.topBar, 'Level', `Lv.${Number(GameStore.user?.level || 1)}`, -244, -13, 76, 24, 14, CuteTheme.honeyDark, 'left', true);
        text(this.topBar, 'Vip', `VIP${Number(GameStore.user?.vipLevel || GameStore.user?.vip || 0)}`, -170, -13, 60, 24, 12, CuteTheme.mintDark, 'left', true);
        const currentExp = Number(GameStore.user?.experience || GameStore.user?.exp || 0);
        const nextExp = Math.max(1, Number(GameStore.user?.nextLevelExp || GameStore.user?.expToNextLevel || 100));
        progress(this.topBar, 'PlayerExp', -188, -39, 120, 9, currentExp / nextExp, CuteTheme.honey);

        const secondary = !isMainPage(this.currentPage);
        const showBack = secondary && this.currentPage !== 'profile';
        if (showBack) {
            button(this.topBar, 'BackPage', '', -92, 3, 48, 48, () => this.goBackPage(), {
                icon: '‹', fill: CuteTheme.paperWarm, fontSize: 18, radius: 21,
            });
        }
        cloudSign(this.topBar, 'SceneTitle', this.titleForPage(this.currentPage), showBack ? 25 : 5, 3, showBack ? 150 : 190, 66);

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

        if (GameStore.online) {
            text(this.topBar, 'Connection', '● 在线', 326, -53, 76, 22, 11, CuteTheme.mintDark, 'right', true);
        } else {
            button(this.topBar, 'Reconnect', '重连', 309, -52, 72, 28, () => void this.bootstrap(), {
                icon: '↻',
                fill: CuteTheme.peach,
                fontSize: 11,
                radius: 14,
            });
        }
    }

    private renderBottomNav() {
        if (!this.bottomNav) return;
        renderBottomNavigation(
            this.bottomNav,
            mainTabForPage(this.currentPage),
            (page) => this.showPage(page),
            this.totalNotificationCount(),
        );
    }

    private renderCurrentPage(animatePage = false) {
        if (!this.pageHost) return;
        this.captureScrollOffsets(this.pageRoot);
        this.pageRoot = resolvePageContainer(this.pageHost, this.currentPage);
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
            case 'shop':
                this.renderShop();
                break;
            case 'benefits':
                this.renderBenefits();
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
            case 'formation':
                this.renderFormation();
                break;
            case 'guild':
                this.renderGuild();
                break;
            default:
                this.renderSecondaryPage(this.currentPage);
                break;
        }

        if (animatePage) this.playPageEnter();
    }

    private renderHome() {
        if (!this.pageRoot) return;
        renderHomePage(this.pageRoot, {
            pet: this.homePet(),
            notificationCount: this.pageNotificationCount('benefits'),
            onSelectPet: () => this.openHomePetPicker(),
            onActivity: (activity: HomeActivity) => {
                const modes: Record<HomeActivity, typeof this.benefitMode> = {
                    sign: 'sign',
                    newcomer: 'month',
                    daily: 'daily',
                    events: 'achievement',
                };
                this.benefitMode = modes[activity];
                this.showPage('benefits');
            },
        });
    }

    private createScrollArea(
        parent: Node,
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
        contentWidth: number,
        contentHeight: number,
        direction: 'horizontal' | 'vertical',
    ) {
        const view = new Node(name);
        parent.addChild(view);
        setRect(view, x, y, width, height);

        const mask = view.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_RECT;

        const content = new Node(`${name}_Content`);
        view.addChild(content);
        const transform = content.addComponent(UITransform);
        const realWidth = Math.max(width + 2, contentWidth);
        const realHeight = Math.max(height + 2, contentHeight);
        transform.setContentSize(realWidth, realHeight);

        if (direction === 'horizontal') {
            transform.setAnchorPoint(0, 0.5);
            content.setPosition(new Vec3(-width / 2, 0, 0));
        } else {
            transform.setAnchorPoint(0.5, 1);
            content.setPosition(new Vec3(0, height / 2, 0));
        }

        const scroll = view.addComponent(ScrollView);
        scroll.content = content;
        scroll.horizontal = direction === 'horizontal';
        scroll.vertical = direction === 'vertical';
        scroll.inertia = true;
        scroll.brake = 0.72;
        scroll.elastic = true;
        scroll.bounceDuration = 0.22;
        scroll.cancelInnerEvents = true;

        const key = `${this.currentScrollScope()}::${name}`;
        (view as any).__petVerseScrollKey = key;
        const saved = this.scrollOffsets.get(key);
        if (saved && name !== 'PetSelectorScroll') {
            const maxX = Math.max(0, realWidth - width);
            const maxY = Math.max(0, realHeight - height);
            const target = new Vec2(
                Math.max(0, Math.min(maxX, Number(saved.x || 0))),
                Math.max(0, Math.min(maxY, Number(saved.y || 0))),
            );
            this.scheduleOnce(() => {
                if (!view.isValid || !content.isValid || !scroll.isValid || scroll.content !== content) return;
                try {
                    scroll.stopAutoScroll();
                    scroll.scrollToOffset(target, 0);
                } catch (error) {
                    console.warn('[CuteMainUI] skipped stale scroll restore', error);
                }
            }, 0);
        }

        return { view, content, scroll };
    }

    private currentScrollScope() {
        const parts: string[] = [this.currentPage];
        if (this.currentPage === 'shop') parts.push(this.shopCategory);
        if (this.currentPage === 'inventory') parts.push(this.inventoryCategory, this.inventorySort);
        if (this.currentPage === 'hatchery') parts.push(this.hatchEggFilter, this.hatchEggSort);
        if (this.currentPage === 'benefits') parts.push(this.benefitMode);
        if (this.currentPage === 'friends') parts.push(this.friendMode);
        if (this.currentPage === 'marriage') parts.push(this.marriageMode);
        if (this.currentPage === 'ranking') parts.push(this.rankingMode);
        if (this.currentPage === 'trade') parts.push(this.tradeMode);
        if (this.currentPage === 'adventure') parts.push(this.adventureMode, this.teamEditing ? 'team-edit' : 'overview');
        if (this.currentPage === 'pet') parts.push(String(GameStore.currentPetId || 0), this.petDetailTab, this.petAttributeView);
        if (this.fusionPickerSide) parts.push(`fusion-picker-${this.fusionPickerSide}`);
        if (this.homePetPickerOpen) parts.push('home-pet-picker');
        return parts.join('|');
    }

    private captureScrollOffsets(root: Node | null) {
        if (!root?.isValid) return;
        for (const scroll of root.getComponentsInChildren(ScrollView)) {
            const key = String((scroll.node as any).__petVerseScrollKey || '');
            if (!key || scroll.node.name === 'PetSelectorScroll' || !scroll.isValid || !scroll.content?.isValid) continue;
            try {
                const offset = scroll.getScrollOffset();
                if (Number.isFinite(offset?.x) && Number.isFinite(offset?.y)) {
                    this.scrollOffsets.set(key, new Vec2(Math.max(0, Number(offset.x)), Math.max(0, Number(offset.y))));
                }
            } catch {}
        }
    }

    private scrollHint(parent: Node, name: string, value: string, x: number, y: number, width = 240) {
        text(parent, name, value, x, y, width, 24, 12, CuteTheme.muted, 'center', true);
    }

    private capturePetSelectorOffset(scroll: ScrollView) {
        if (!scroll?.isValid || !scroll.content?.isValid) return;
        try {
            const offset = scroll.getScrollOffset();
            if (Number.isFinite(offset?.x)) this.petSelectorOffset = Math.max(0, Number(offset.x));
        } catch {}
    }

    private restorePetSelectorOffset(
        selector: { view: Node; content: Node; scroll: ScrollView },
        targetOffset: number,
    ) {
        const token = ++this.petSelectorScrollToken;
        this.petSelectorOffset = targetOffset;
        this.scheduleOnce(() => {
            if (token !== this.petSelectorScrollToken) return;
            const { view, content, scroll } = selector;
            if (!view?.isValid || !content?.isValid || !scroll?.isValid || scroll.content !== content) return;
            try {
                scroll.stopAutoScroll();
                scroll.scrollToOffset(new Vec2(targetOffset, 0), 0);
            } catch (error) {
                console.warn('[CuteMainUI] skipped stale pet selector scroll', error);
            }
        }, 0);
    }

    private renderPetDetail() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        this.ensureExperienceSelections();
        const allPets = GameStore.pets.filter((item) => !item?.isEgg);
        const pets = this.filteredPetList();
        const selected = GameStore.currentPet || allPets[0] || {};

        const selectorStep = 164;
        const selectorWidth = Math.max(680, pets.length * selectorStep + 18);
        const selector = this.createScrollArea(root, 'PetSelectorScroll', 0, 418, 680, 116, selectorWidth, 116, 'horizontal');
        pets.forEach((item, index) => {
            const id = Number(item?.id || 0);
            const card = button(selector.content, `PetTab_${id || index}`, safeName(item?.nickname, `宝宝${index + 1}`), 80 + index * selectorStep, 0, 154, 102, () => {
                this.capturePetSelectorOffset(selector.scroll);
                GameStore.selectPet(id);
                this.petDetailTab = 'attributes';
                this.petAttributeView = 'overview';
                this.renderCurrentPage(false);
            }, {
                iconPath: getPetArtPath(item, 'thumb'), iconSize: 62,
                selected: id === Number(GameStore.currentPetId),
                fill: id === Number(GameStore.currentPetId) ? CuteTheme.honey : CuteTheme.paperWarm,
                fontSize: 14, radius: 22,
                subtitle: `${this.rarityName(item)} · Lv.${Number(item?.level || 1)} · ${formatNumber(this.battleAttributesOf(item).power)}`,
            });
            const teamIndex = this.teamPetIds.indexOf(id);
            if (teamIndex >= 0) tag(card, 'TeamBadge', `编队${teamIndex + 1}`, 46, 38, 60, CuteTheme.mint);
            if (item?.isLocked) tag(card, 'LockBadge', '锁定', -48, 38, 54, CuteTheme.paperWarm);
            if (item?.isMutant) tag(card, 'MutantBadge', '变异', 48, -38, 54, CuteTheme.peach);
        });
        const selectedIndex = Math.max(0, pets.findIndex((pet) => Number(pet?.id) === Number(selected?.id)));
        const maxOffset = Math.max(0, selectorWidth - 680);
        const selectedLeft = selectedIndex * selectorStep;
        const selectedRight = selectedLeft + 154;
        let targetOffset = Math.max(0, Math.min(maxOffset, this.petSelectorOffset));
        if (selectedLeft < targetOffset) targetOffset = selectedLeft;
        else if (selectedRight > targetOffset + 680) targetOffset = selectedRight - 680;
        this.restorePetSelectorOffset(selector, Math.max(0, Math.min(maxOffset, targetOffset)));

        const book = panel(root, 'PetResearchBook', 0, -42, 692, 808, CuteTheme.paper, 34, true, CuteTheme.caramelSoft, 3);
        const profile = panel(book, 'Profile', -214, 72, 244, 620, new Color(255, 248, 226, 255), 28, false, CuteTheme.caramelSoft, 2);
        image(profile, 'Portrait', getPetArtPath(selected, 'portrait'), 0, 176, 216, 226, selected?.isMutant ? CuteTheme.peach : CuteTheme.mint);
        button(profile, 'Lock', selected?.isLocked ? '已锁' : '锁定', 80, 252, 64, 42, () => void this.togglePetLock(selected), {
            fill: selected?.isLocked ? CuteTheme.honey : CuteTheme.paperWarm,
            fontSize: 12, radius: 18,
        });
        text(profile, 'Name', safeName(selected?.nickname, '未命名宝宝'), 0, 44, 214, 38, 24, CuteTheme.caramel, 'center', true);
        text(profile, 'Meta', `${safeName(selected?.species, getPetSpeciesMeta(selected).name)} · Lv.${Number(selected?.level || 1)}`, 0, 9, 214, 28, 15, CuteTheme.muted, 'center', true);
        tag(profile, 'Rarity', this.rarityName(selected), selected?.isMutant ? -42 : 0, -30, 108, CuteTheme.lilac);
        if (selected?.isMutant) tag(profile, 'Mutant', '变异', 62, -30, 90, CuteTheme.peach);
        const attrs = this.battleAttributesOf(selected);
        text(profile, 'Power', `战力 ${formatNumber(attrs.power)}`, 0, -72, 205, 38, 20, CuteTheme.honeyDark, 'center', true);
        const role = (selected?.speciesConfig?.roleTags || [getPetSpeciesMeta(selected).role || '综合']).slice(0, 2).map((value:any)=>this.petRoleLabel(value)).join(' / ');
        const teamIndex = this.teamPetIds.indexOf(Number(selected?.id || 0));
        const identity = panel(profile, 'Identity', 0, -150, 210, 106, new Color(250, 244, 226, 255), 20, false, CuteTheme.white, 1);
        text(identity, 'Role', `◆ 定位：${role}`, -94, 30, 188, 26, 14, CuteTheme.caramel, 'left', true);
        text(identity, 'Marriage', `♥ 婚姻：${selected?.married || selected?.marriedPetId ? '已婚' : '未婚'}　蛋 ${Number(selected?.breedCount || 0)}`, -94, 0, 188, 26, 14, CuteTheme.caramel, 'left', true);
        text(identity, 'Team', `编队：${teamIndex >= 0 ? `${teamIndex + 1}号位 · ${this.formationName(this.selectedFormationCode)}` : '未编队'}`, -94, -30, 188, 26, 14, CuteTheme.caramel, 'left', true);
        button(profile, 'Home', Number(selected?.id || 0) === this.homePetId ? '当前心仪' : '设为心仪', 0, -232, 184, 48, () => this.setHomePet(Number(selected?.id || 0)), {
            fill: CuteTheme.peach, fontSize: 14, radius: 20,
        });
        button(profile, 'StatPoints', '属性加点', -52, -278, 98, 38, () => {
            this.petDetailTab = 'attributes'; this.petAttributeView = 'stats'; this.renderCurrentPage(false);
        }, { selected: this.petAttributeView === 'stats', fill: CuteTheme.sky, fontSize: 12, radius: 16 });
        button(profile, 'Lineage', '血脉', 62, -278, 98, 38, () => {
            this.petDetailTab = 'attributes'; this.petAttributeView = 'lineage'; this.renderCurrentPage(false);
        }, { selected: this.petAttributeView === 'lineage', fill: CuteTheme.lilac, fontSize: 12, radius: 16 });

        const data = panel(book, 'ResearchData', 116, 72, 420, 620, new Color(249, 252, 240, 255), 28, false, CuteTheme.mintDark, 2);
        const tabs: Array<[typeof this.petDetailTab, string]> = [['attributes','属性'],['skills','技能'],['aptitudes','资质'],['equipment','装备']];
        tabs.forEach(([key,label], index) => button(data, `Tab_${key}`, label, -144 + index * 96, 274, 88, 42, () => {
            this.petDetailTab = key;
            if (key === 'attributes') this.petAttributeView = 'overview';
            this.renderCurrentPage(false);
        }, { selected: this.petDetailTab === key, fill: this.petDetailTab === key ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 13, radius: 18 }));

        const detailView = this.petDetailTab === 'attributes' ? this.petAttributeView : this.petDetailTab;
        if (detailView === 'overview') {
            text(data, 'Explain', '核心战斗属性', -180, 226, 360, 34, 19, CuteTheme.caramel, 'left', true);
            const survival = panel(data, 'Survival', 0, 137, 384, 120, new Color(255, 250, 232, 255), 22, false, CuteTheme.white, 1);
            headingTag(survival, 'Title', '生存', -137, 38, 90, CuteTheme.mint);
            this.battleStat(survival, 'Hp', '❤', '生命', attrs.hp, -88, -10);
            this.battleStat(survival, 'Def', '◆', '防御', attrs.defense, 88, -10);
            const output = panel(data, 'Output', 0, -4, 384, 120, new Color(255, 245, 238, 255), 22, false, CuteTheme.white, 1);
            headingTag(output, 'Title', '输出', -137, 38, 90, CuteTheme.peach);
            this.battleStat(output, 'Atk', '⚔', '物攻', attrs.attack, -88, -10);
            this.battleStat(output, 'Magic', '✦', '法攻', attrs.magic, 88, -10);
            const develop = panel(data, 'Develop', 0, -174, 384, 184, new Color(242, 249, 238, 255), 22, false, CuteTheme.white, 1);
            headingTag(develop, 'Title', '速度与培养', -118, 70, 140, CuteTheme.sky);
            this.battleStat(develop, 'Speed', '➤', '速度', attrs.speed, -88, 20);
            this.battleStat(develop, 'Growth', '成', '成长', this.growthValue(selected).toFixed(3), 88, 20);
            this.battleStat(develop, 'Quality', '◇', '品质', Number(selected?.quality || 100), -88, -52);
            this.battleStat(develop, 'Skills', '技', '技能数', Array.isArray(selected?.skills) ? selected.skills.length : 0, 88, -52);
        } else if (detailView === 'aptitudes') {
            const apt=this.aptitudesOf(selected);
            text(data,'Explain','资质决定升级后转化出的实际属性',0,226,380,34,16,CuteTheme.muted,'center',true);
            ([['体力资质',apt.hp,'❤'],['攻击资质',apt.attack,'⚔'],['防御资质',apt.defense,'◆'],['法力资质',apt.magic,'✦'],['速度资质',apt.speed,'➤']] as Array<[string,number,string]>).forEach(([name,value,icon],index)=>this.aptitudeRow(data,`Apt_${index}`,icon,name,value,154-index*75));
            text(data,'Growth',`成长 ${this.growthValue(selected).toFixed(3)}　品质 ${Number(selected?.quality || 100)}`,0,-228,360,36,18,CuteTheme.caramel,'center',true);
        } else if (detailView === 'skills') {
            text(data,'Explain','技能效果、触发条件和目标优先展示',0,226,380,36,15,CuteTheme.muted,'center',true);
            const skills=Array.isArray(selected?.skills)?selected.skills:[];
            const area=this.createScrollArea(data,'SkillResearchScroll',0,-3,392,390,392,Math.max(390,skills.length*88+8),'vertical');
            skills.forEach((skill:any,index:number)=>button(area.content,`Skill_${index}`,this.skillName(skill),0,-40-index*88,364,76,()=>this.showSkillDetail(skill),{
                iconPath:this.skillIconPath(skill),iconSize:54,fill:this.skillColor(skill),textColor:this.skillTier(skill)==='low'?CuteTheme.caramel:CuteTheme.white,fontSize:16,radius:22,
                subtitle:`${this.skillTierLabel(skill)} · ${safeName(skill?.description,'点击查看完整效果').slice(0,30)}`,
            }));
            button(data,'Learn','前往打书',-100,-242,176,48,()=>this.showPage('skills'),{fill:CuteTheme.honey,fontSize:15,radius:21,disabled:Boolean(selected?.isLocked)});
            button(data,'Fusion','前往炼妖',100,-242,176,48,()=>this.showPage('fusion'),{fill:CuteTheme.lilac,fontSize:15,radius:21,disabled:Boolean(selected?.isLocked)});
        } else if (detailView === 'stats') {
            const points=selected?.statPoints || { unspent:Number(selected?.unspentStatPoints||0), constitution:Number(selected?.constitutionPoints||0), strength:Number(selected?.strengthPoints||0), spirit:Number(selected?.spiritPoints||0), endurance:Number(selected?.endurancePoints||0), speed:Number(selected?.speedStatPoints||0) };
            this.ensurePetStatDraft(Number(selected?.id || 0));
            const draftTotal=this.petStatDraftTotal();
            const remaining=Math.max(0,Number(points.unspent||0)-draftTotal);
            text(data,'Available',`剩余 ${remaining} 点　·　待确认 ${draftTotal} 点`,0,222,390,36,18,draftTotal>0?CuteTheme.peachDark:CuteTheme.honeyDark,'center',true);
            const stats:Array<[string,string,string,string]>= [['体质','constitution','生命 +3/点','❤'],['力量','strength','物攻 +0.35/点','⚔'],['灵力','spirit','法攻 +0.35/点，提升治疗','✦'],['耐力','endurance','双防 +0.25/点','◆'],['敏捷','speed','速度 +0.15/点','➤']];
            stats.forEach(([name,key,desc,icon],index)=>{
                const pending=Number(this.petStatDraft[key]||0);
                const y=158-index*70; text(data,`S_${key}`,`${icon} ${name}　${Number(points[key]||0)+pending}${pending>0?` (+${pending})`:''}`,-188,y,155,30,16,CuteTheme.caramel,'left',true); text(data,`D_${key}`,desc,-35,y,190,28,13,CuteTheme.muted,'left',true);
                button(data,`P1_${key}`,'+1',116,y,58,38,()=>this.queuePetStatPoints(key,1,Number(points.unspent||0)),{fill:CuteTheme.mint,fontSize:13,radius:16,disabled:remaining<1});
                button(data,`P5_${key}`,'+5',178,y,58,38,()=>this.queuePetStatPoints(key,5,Number(points.unspent||0)),{fill:CuteTheme.honey,fontSize:13,radius:16,disabled:remaining<5});
            });
            text(data,'DraftHint','所有“+”和一键推荐只生成预览，点击确认后才会真正生效。',0,-174,380,36,13,CuteTheme.muted,'center',true);
            button(data,'Recommend','推荐',-150,-232,88,44,()=>this.recommendPetStats(selected,Number(points.unspent||0)),{fill:CuteTheme.sky,fontSize:12,radius:19,disabled:remaining<=0});
            button(data,'ClearDraft','清空',-50,-232,88,44,()=>this.clearPetStatDraft(),{icon:'↶',fill:CuteTheme.paperWarm,fontSize:12,radius:19,disabled:draftTotal<=0});
            button(data,'Reset','重置',50,-232,88,44,()=>void this.resetPetStats(),{icon:'↻',fill:CuteTheme.paperWarm,fontSize:12,radius:19,disabled:Boolean(selected?.isLocked)});
            button(data,'ConfirmStats','确认',150,-232,88,44,()=>void this.confirmPetStats(),{icon:'✓',fill:CuteTheme.honey,fontSize:12,radius:19,disabled:draftTotal<=0||Boolean(selected?.isLocked)||this.busy.has('pet-stats:confirm')});
        } else if (detailView === 'lineage') {
            const lineage=selected?.lineage||{};
            text(data,'LineageTitle','血脉与繁育信息',0,215,360,38,21,CuteTheme.caramel,'center',true);
            const info=[`父系：${Number(lineage.fatherId||selected?.fatherId||0)||'初代'}`,`母系：${Number(lineage.motherId||selected?.motherId||0)||'初代'}`,`婚姻：${selected?.married||selected?.marriedPetId?'已婚':'未婚'}`,`生蛋：${Number(selected?.breedCount||0)}个`, `代数：${Number(lineage.generation||selected?.generation||1)}`,`基因：${safeName(selected?.geneCode,'AAAA')}`,`生育力：${Number(selected?.fertility||100)}/100`];
            info.forEach((line,index)=>text(data,`L_${index}`,line,-170,156-index*54,340,36,17,index<2?CuteTheme.muted:CuteTheme.caramel,'left',true));
        } else {
            text(data, 'EquipmentTitle', '装备位', 0, 218, 360, 38, 21, CuteTheme.caramel, 'center', true);
            text(data, 'EquipmentHint', '装备系统尚未开放，以下仅保留六个槽位，不提供虚假属性。', 0, 180, 372, 44, 14, CuteTheme.muted, 'center');
            const slotNames = ['头饰', '项圈', '护甲', '饰品', '徽记', '灵石'];
            slotNames.forEach((name, index) => {
                const col = index % 3;
                const row = Math.floor(index / 3);
                const slot = panel(data, `Equipment_${index}`, -126 + col * 126, 70 - row * 150, 108, 126, new Color(236, 230, 216, 255), 20, false, CuteTheme.white, 2);
                text(slot, 'Lock', '锁', 0, 20, 54, 48, 24, CuteTheme.muted, 'center', true);
                text(slot, 'Name', name, 0, -36, 90, 28, 14, CuteTheme.muted, 'center', true);
            });
        }

        const toolbar=panel(book,'Toolbar',0,-320,650,62,new Color(255,252,239,255),22,false,CuteTheme.caramelSoft,2);
        button(toolbar,'Filter',this.petFilter.rarity?`稀有:${this.rarityName({rarity:this.petFilter.rarity})}`:'稀有:全部',-205,0,180,44,()=>this.cyclePetRarityFilter(),{fill:CuteTheme.paperWarm,fontSize:13,radius:18});
        button(toolbar,'Element',`属性:${this.petFilter.element==='all'?'全部':this.petFilter.element}`,0,0,180,44,()=>this.cyclePetElementFilter(),{fill:CuteTheme.mint,fontSize:13,radius:18});
        tag(toolbar,'Sort','编队优先 · 战力降序',205,0,180,CuteTheme.sky);
    }

    private renderInventory() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        this.ensureExperienceSelections();
        const eggItems = GameStore.inventory.filter((item) => this.isEggItem(item));
        const allItems = GameStore.inventory.filter((item) => !this.isEggItem(item));
        const targetPet = this.inventoryTargetPet();

        const categoryOf = (item: any): typeof this.inventoryCategory => {
            if (this.isSkillBook(item)) return 'skill';
            if (Boolean(item?.usable)) return 'consumable';
            return 'material';
        };
        const items = allItems
            .filter((item) => this.inventoryCategory === 'all' || categoryOf(item) === this.inventoryCategory)
            .sort((a, b) => this.inventorySort === 'quantity'
                ? Number(b?.quantity || 0) - Number(a?.quantity || 0)
                : categoryOf(a).localeCompare(categoryOf(b)) || String(a?.name || '').localeCompare(String(b?.name || '')));

        const bag = panel(root, 'Bag', 0, 0, 692, 905, new Color(255, 247, 228, 255), 34, true, CuteTheme.caramelSoft, 3);
        headingTag(bag, 'BagTag', '布艺背包', -244, 398, 150, CuteTheme.mint);
        text(bag, 'Capacity', `容量 ${allItems.length}/${Number(GameStore.user?.inventoryCapacity || 120)}`, 72, 399, 150, 28, 14, CuteTheme.caramel, 'center', true);
        button(bag, 'Sort', this.inventorySort === 'category' ? '按分类' : '按数量', 260, 399, 118, 42, () => {
            this.inventorySort = this.inventorySort === 'category' ? 'quantity' : 'category'; this.renderCurrentPage(false);
        }, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 18 });

        const categories: Array<[typeof this.inventoryCategory, string]> = [['all', '全部'], ['consumable', '消耗品'], ['material', '材料'], ['skill', '技能书']];
        categories.forEach(([key, title], index) => button(bag, `InventoryCategory_${key}`, title, -240 + index * 160, 344, 146, 48, () => {
            this.inventoryCategory = key; this.renderCurrentPage(false);
        }, { selected: this.inventoryCategory === key, fill: this.inventoryCategory === key ? CuteTheme.honey : CuteTheme.paper, fontSize: 14, radius: 19 }));

        text(bag, 'EggNotice', eggItems.length
            ? `${eggItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)} 个宠物蛋已单独存放在孵化室`
            : '宠物蛋单独存放在孵化室，不占普通背包格', -300, 300, 440, 30, 12, CuteTheme.muted, 'left', true);
        button(bag, 'HatcheryShortcut', '查看孵化室', 250, 300, 132, 40, () => this.showPage('hatchery'), { fill: CuteTheme.honey, fontSize: 12, radius: 17 });

        const target = panel(bag, 'UseTarget', 0, 244, 640, 74, new Color(241, 250, 232, 255), 20, false, CuteTheme.mintDark, 2);
        text(target, 'Title', '使用对象', -286, 0, 90, 28, 14, CuteTheme.caramel, 'left', true);
        if (targetPet) {
            image(target, 'Pet', getPetArtPath(targetPet, 'thumb'), -164, 0, 58, 58, CuteTheme.paperWarm);
            text(target, 'PetName', safeName(targetPet?.nickname, '宠物'), -126, 14, 210, 26, 16, CuteTheme.caramel, 'left', true);
            text(target, 'Meta', `${getPetSpeciesMeta(targetPet).name} · Lv.${Number(targetPet?.level || 1)}`, -126, -14, 220, 24, 12, CuteTheme.muted, 'left');
            button(target, 'Prev', '‹', 196, 0, 46, 42, () => this.cycleInventoryTarget(-1), { fill: CuteTheme.paperWarm, fontSize: 22, radius: 17 });
            button(target, 'Next', '›', 252, 0, 46, 42, () => this.cycleInventoryTarget(1), { fill: CuteTheme.honey, fontSize: 22, radius: 17 });
        } else {
            text(target, 'NoPet', '暂无可使用道具的宠物', 0, 0, 430, 36, 16, CuteTheme.peachDark, 'center', true);
        }

        if (!items.length) {
            text(bag, 'Empty', '当前分类暂无物品', 0, -80, 420, 100, 22, CuteTheme.muted, 'center', true);
            return;
        }

        const rows = Math.ceil(items.length / 4);
        const area = this.createScrollArea(bag, 'InventoryScroll', 0, -80, 650, 548, 650, Math.max(548, rows * 148 + 12), 'vertical');
        items.forEach((item, index) => {
            const col = index % 4;
            const rowIndex = Math.floor(index / 4);
            const type = categoryOf(item);
            const card = button(area.content, `Item_${item?.id || index}`, safeName(item?.name || item?.itemCode, '道具'), -240 + col * 160, -68 - rowIndex * 148, 146, 132, () => {
                this.inventoryDetailItem = item; this.renderUtilityModal();
            }, { fill: type === 'skill' ? new Color(244, 229, 211, 255) : type === 'consumable' ? new Color(226, 242, 218, 255) : CuteTheme.paper, fontSize: 13, radius: 20,
                subtitle: `拥有 ×${Number(item?.quantity || 0)}` });
            const face = card.getChildByName('Face');
            const title = face?.getChildByName('Title');
            const subtitle = face?.getChildByName('Subtitle');
            if (title) title.setPosition(0, -22, 0);
            if (subtitle) subtitle.setPosition(0, -45, 0);
            drawUiIcon(card, 'ItemIcon', type === 'skill' ? 'skills' : type === 'consumable' ? 'inventory' : 'collection', 0, 27, 38, type === 'skill' ? CuteTheme.peachDark : type === 'consumable' ? CuteTheme.mintDark : CuteTheme.honeyDark);
        });
        this.scrollHint(bag, 'InventoryHint', `当前显示 ${items.length} 种物品 · 点击物品查看详情`, 0, -412, 560);
    }

    private renderShop() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;

        const page = panel(root, 'ShopPage', 0, -2, 692, 910, new Color(255, 247, 228, 255), 34, true, CuteTheme.caramelSoft, 3);
        headingTag(page, 'ShopSign', '萌宠集市', -244, 398, 150, CuteTheme.honey);
        text(page, 'Wallet', `金币 ${formatNumber(GameStore.user?.gold)}　钻石 ${formatNumber(GameStore.user?.diamond)}`, 42, 402, 300, 30, 14, CuteTheme.caramel, 'center', true);
        text(page, 'RefreshTime', '每日 05:00 刷新', 144, 366, 190, 26, 12, CuteTheme.muted, 'center');
        button(page, 'Refresh', '刷新', 286, 366, 76, 36, () => void this.refreshPageData('shop'), { fill: CuteTheme.mint, fontSize: 12, radius: 15 });

        const categories: Array<[typeof this.shopCategory, string]> = [
            ['featured', '精选'], ['nurture', '养成'], ['skills', '技能书'], ['materials', '材料'], ['hatch', '孵化'], ['special', '特殊'],
        ];
        const rail = panel(page, 'ShopCategoryRail', -270, -24, 126, 744, new Color(248, 238, 213, 255), 24, false, CuteTheme.white, 2);
        categories.forEach(([key, title], index) => button(rail, `ShopCategory_${key}`, title, 0, 306 - index * 112, 108, 78, () => {
            this.shopCategory = key; this.shopBuyCount = 1; this.ensureSelectedShopItem(); this.renderCurrentPage(false);
        }, { selected: this.shopCategory === key, fill: this.shopCategory === key ? CuteTheme.honey : CuteTheme.paper, fontSize: 14, radius: 20 }));

        const items = this.filteredShopItems();
        if (!items.length) { text(page, 'EmptyShop', '当前分类暂时没有商品', 82, 80, 470, 100, 21, CuteTheme.muted, 'center', true); return; }
        this.ensureSelectedShopItem();
        const rows = Math.ceil(items.length / 3);
        const area = this.createScrollArea(page, 'ShopItemsScroll', 72, 86, 500, 476, 500, Math.max(476, rows * 154 + 16), 'vertical');
        items.forEach((item, index) => {
            const col = index % 3;
            const rowIndex = Math.floor(index / 3);
            const selected = Number(item?.id || 0) === this.selectedShopItemId;
            const owned = GameStore.inventory.find((ownedItem) => String(ownedItem?.itemCode || '') === String(item?.itemCode || ''));
            const card = button(area.content, `ShopItem_${item?.id ?? index}`, safeName(item?.name, item?.itemCode || '商品'), -164 + col * 164, -70 - rowIndex * 154, 152, 140, () => {
                this.selectedShopItemId = Number(item?.id || 0); this.shopBuyCount = 1; this.renderCurrentPage(false);
            }, { fill: selected ? new Color(255, 239, 187, 255) : this.shopItemColor(item), fontSize: 13, radius: 20, selected,
                subtitle: `${item?.currencyType === 'diamond' ? '钻石' : '金币'} ${formatNumber(item?.price || 0)} · 有${Number(owned?.quantity || 0)}` });
            const face = card.getChildByName('Face');
            const title = face?.getChildByName('Title');
            const subtitle = face?.getChildByName('Subtitle');
            if (title) title.setPosition(0, -24, 0);
            if (subtitle) subtitle.setPosition(0, -48, 0);
            drawUiIcon(card, 'ProductIcon', this.isSkillBook(item) ? 'skills' : String(item?.type || '').toLowerCase() === 'egg' ? 'hatchery' : 'shop', 0, 28, 40, selected ? CuteTheme.honeyDark : CuteTheme.caramel);
            const limit = Number(item?.purchaseLimit || item?.limit || 0);
            if (limit > 0) tag(card, 'Limit', `限购${limit}`, 45, 49, 56, CuteTheme.peach);
        });

        const selected = this.selectedShopItem();
        const detail = panel(page, 'ShopDetail', 72, -326, 500, 196, new Color(255, 252, 239, 255), 24, false, CuteTheme.caramelSoft, 2);
        if (!selected) { text(detail, 'NoSelection', '请选择商品', 0, 0, 300, 50, 20, CuteTheme.muted, 'center', true); return; }
        drawUiIcon(detail, 'DetailIcon', this.isSkillBook(selected) ? 'skills' : String(selected?.type || '').toLowerCase() === 'egg' ? 'hatchery' : 'shop', -210, 30, 56, CuteTheme.honeyDark);
        text(detail, 'Name', safeName(selected?.name, selected?.itemCode || '商品'), -168, 56, 250, 30, 19, CuteTheme.caramel, 'left', true);
        text(detail, 'Description', safeName(selected?.description, '暂无说明'), -168, 14, 270, 56, 13, CuteTheme.muted, 'left', false);
        const owned = GameStore.inventory.find((item) => String(item?.itemCode || '') === String(selected?.itemCode || ''));
        text(detail, 'Owned', `已拥有 ×${Number(owned?.quantity || 0)}`, -168, -54, 180, 26, 12, CuteTheme.mintDark, 'left', true);
        button(detail, 'Minus', '－', 50, -38, 42, 42, () => this.changeShopBuyCount(-1), { fill: CuteTheme.paperWarm, fontSize: 20, radius: 17 });
        text(detail, 'Count', `×${this.shopBuyCount}`, 102, -38, 58, 32, 16, CuteTheme.caramel, 'center', true);
        button(detail, 'Plus', '＋', 154, -38, 42, 42, () => this.changeShopBuyCount(1), { fill: CuteTheme.mint, fontSize: 20, radius: 17 });
        const total = Number(selected?.price || 0) * this.shopBuyCount;
        const balance = selected?.currencyType === 'diamond' ? Number(GameStore.user?.diamond || 0) : Number(GameStore.user?.gold || 0);
        const soldOut = Boolean(selected?.soldOut) || (selected?.stock !== undefined && Number(selected?.stock || 0) <= 0);
        const insufficient = total > balance;
        button(detail, 'Buy', soldOut ? '已售罄' : insufficient ? '余额不足' : `${selected?.currencyType === 'diamond' ? '钻石' : '金币'} ${formatNumber(total)} 购买`, 144, 48, 190, 56, () => void this.buySelectedShopItem(), {
            fill: selected?.currencyType === 'diamond' ? CuteTheme.sky : CuteTheme.honey, fontSize: 14, radius: 22, disabled: soldOut || insufficient || this.busy.has('shop:buy') });
        text(page, 'ShopHint', '购买后停留当前分类；宠物蛋进入孵化室，技能书进入背包。', 72, -433, 500, 26, 12, CuteTheme.muted, 'center', true);
    }

    private renderBenefits() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;

        const page = panel(root, 'BenefitPage', 0, -2, 692, 910, new Color(255, 248, 228, 255), 40, true, CuteTheme.caramelSoft, 4);

        const tabs: Array<['sign' | 'daily' | 'achievement' | 'month' | 'pass', string, string]> = [
            ['sign', '签到', '📅'],
            ['daily', '每日', '✅'],
            ['achievement', '成就', '🏅'],
            ['month', '月卡', '🌙'],
            ['pass', '战令', '🎖'],
        ];
        tabs.forEach(([mode, title, icon], index) => button(
            page,
            `BenefitTab_${mode}`,
            title,
            -252 + index * 126,
            374,
            116,
            54,
            () => {
                this.benefitMode = mode;
                this.renderCurrentPage(false);
            },
            { icon, selected: this.benefitMode === mode, fill: this.benefitMode === mode ? CuteTheme.honey : CuteTheme.paper, fontSize: 13, radius: 22 },
        ));

        if (this.benefitMode === 'sign') this.renderSignBenefits(page);
        else if (this.benefitMode === 'daily') this.renderDailyBenefits(page);
        else if (this.benefitMode === 'achievement') this.renderAchievementBenefits(page);
        else if (this.benefitMode === 'month') this.renderMonthCard(page);
        else this.renderBattlePass(page);
    }

    private renderSignBenefits(parent: Node) {
        const info = this.signInfo || {};
        const record = info?.record || {};
        headingTag(parent, 'SignTitle', '七日签到', 0, 302, 160, CuteTheme.peach);
        text(parent, 'SignMeta', `连续签到 ${Number(record?.continuousDays || 0)} 天　累计 ${Number(record?.totalDays || 0)} 天`, 0, 258, 560, 32, 16, CuteTheme.caramel, 'center', true);
        const rewards = [
            ['第1天', '金币100', '●'], ['第2天', '金币200', '●'], ['第3天', '金币300', '●'], ['第4天', '金币500', '●'],
            ['第5天', '经验药水×1', '🧪'], ['第6天', '经验药水×3', '🧪'], ['第7天', '宠物蛋×1', '🥚'],
        ];
        const cycleDay = ((Number(record?.continuousDays || 0)) % 7) + 1;
        rewards.forEach(([day, reward, icon], index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = -234 + col * 156;
            const y = 155 - row * 160;
            const reached = index + 1 <= Number(record?.continuousDays || 0);
            const today = index + 1 === cycleDay && Boolean(info?.canSign);
            const card = panel(parent, `SignDay_${index}`, x, y, 138, 134, reached ? new Color(220, 244, 213, 255) : today ? new Color(255, 237, 190, 255) : CuteTheme.paper, 24, true, reached ? CuteTheme.mintDark : today ? CuteTheme.honeyDark : CuteTheme.white, 3);
            text(card, 'Icon', reached ? '✓' : icon, 0, 30, 70, 54, 34, reached ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
            text(card, 'Day', day, 0, -12, 110, 24, 14, CuteTheme.caramel, 'center', true);
            text(card, 'Reward', reward, 0, -42, 118, 30, 12, CuteTheme.muted, 'center', true);
        });
        button(parent, 'SignButton', info?.canSign ? '今日签到' : '今日已签到', 0, -210, 250, 70, () => void this.claimSignToday(), {
            icon: info?.canSign ? '🎀' : '✓',
            fill: info?.canSign ? CuteTheme.honey : CuteTheme.mint,
            fontSize: 20,
            radius: 30,
            disabled: !info?.canSign || this.busy.has('benefit:sign'),
        });
        text(parent, 'SignHint', '签到奖励会直接进入钱包或背包；第7天宠物蛋会转入孵化室仓库。', 0, -286, 600, 38, 14, CuteTheme.muted, 'center', true);
    }

    private renderDailyBenefits(parent: Node) {
        const task = this.dailyTask || {};
        headingTag(parent, 'DailyTitle', '今日任务', 0, 302, 160, CuteTheme.mint);
        text(parent, 'DailyProgress', `今日完成 ${Number(task?.completed || 0)}/${Number(task?.total || 4)}`, 0, 258, 300, 32, 17, CuteTheme.caramel, 'center', true);
        progress(parent, 'DailyBar', 0, 224, 520, 18, Number(task?.completed || 0) / Math.max(1, Number(task?.total || 4)), CuteTheme.green);
        const rows = [
            ['每日签到', 'signCompleted', '📅', '前往签到', () => { this.benefitMode = 'sign'; this.renderCurrentPage(false); }],
            ['喂养一次宝宝', 'feedCompleted', '🍎', '前往宝宝', () => this.showPage('pet')],
            ['完成一次爬塔', 'towerCompleted', '🗼', '前往冒险', () => { this.adventureMode = 'tower'; this.showPage('adventure'); }],
            ['完成一次战斗', 'battleCompleted', '⚔', '前往冒险', () => { this.adventureMode = 'pve'; this.showPage('adventure'); }],
        ] as Array<[string, string, string, string, () => void]>;
        rows.forEach(([title, key, icon, actionTitle, action], index) => {
            const done = Boolean(task?.[key]);
            const row = panel(parent, `DailyTask_${key}`, 0, 148 - index * 104, 610, 88, done ? new Color(224, 246, 218, 255) : CuteTheme.paper, 22, false, done ? CuteTheme.mintDark : CuteTheme.white, 2);
            text(row, 'Icon', done ? '✓' : icon, -264, 0, 52, 52, 30, done ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
            text(row, 'Title', title, -220, 14, 260, 30, 17, CuteTheme.caramel, 'left', true);
            text(row, 'State', done ? '已完成' : '未完成', -220, -17, 160, 26, 13, done ? CuteTheme.mintDark : CuteTheme.muted, 'left', true);
            button(row, 'Action', done ? '完成' : actionTitle, 220, 0, 126, 48, action, { fill: done ? CuteTheme.mint : CuteTheme.paperWarm, fontSize: 13, radius: 20, disabled: done });
        });
        button(parent, 'DailyClaim', task?.rewardClaimed ? '奖励已领取' : '领取今日宝箱', 0, -300, 250, 66, () => void this.claimDailyReward(), {
            icon: task?.rewardClaimed ? '✓' : '🎁',
            fill: task?.allCompleted && !task?.rewardClaimed ? CuteTheme.honey : new Color(222, 216, 202, 255),
            fontSize: 18,
            radius: 28,
            disabled: !task?.allCompleted || Boolean(task?.rewardClaimed) || this.busy.has('benefit:daily'),
        });
        text(parent, 'DailyReward', '宝箱奖励：金币500＋初级经验药水×1', 0, -354, 480, 28, 14, CuteTheme.muted, 'center', true);
    }

    private renderAchievementBenefits(parent: Node) {
        headingTag(parent, 'AchievementTitle', '成长成就', 0, 302, 170, CuteTheme.lilac);
        const claimable = this.achievements.filter((item) => item?.completed && !item?.claimed).length;
        text(parent, 'AchievementMeta', `共 ${this.achievements.length} 项　可领取 ${claimable} 项`, 0, 258, 420, 32, 16, CuteTheme.caramel, 'center', true);
        if (!this.achievements.length) { text(parent, 'AchievementEmpty', '成就正在准备中', 0, 60, 420, 80, 21, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(parent, 'AchievementScroll', 0, -35, 620, 530, 620, this.achievements.length * 92 + 12, 'vertical');
        this.achievements.forEach((item, index) => {
            const complete = Boolean(item?.completed); const claimed = Boolean(item?.claimed);
            const row = panel(area.content, `Achievement_${item?.id ?? index}`, 0, -45 - index * 92, 610, 78,
                complete ? new Color(248, 242, 219, 255) : CuteTheme.paper, 20, false, claimed ? CuteTheme.mintDark : complete ? CuteTheme.honeyDark : CuteTheme.white, 2);
            text(row, 'Icon', claimed ? '✓' : complete ? '★' : '◇', -266, 0, 46, 46, 28, claimed ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
            text(row, 'Title', safeName(item?.title, '成长目标'), -224, 15, 260, 28, 16, CuteTheme.caramel, 'left', true);
            text(row, 'Desc', `${safeName(item?.description, '')}　${Math.min(Number(item?.progress || 0), Number(item?.target || 1))}/${Number(item?.target || 1)}`, -224, -15, 350, 26, 12, CuteTheme.muted, 'left', true);
            text(row, 'Reward', this.achievementRewardText(item), 105, 0, 120, 30, 12, CuteTheme.peachDark, 'center', true);
            button(row, 'Claim', claimed ? '已领' : complete ? '领取' : '未完成', 244, 0, 94, 44, () => void this.claimAchievement(item), {
                fill: claimed ? CuteTheme.mint : complete ? CuteTheme.honey : new Color(222, 216, 202, 255), fontSize: 12, radius: 18,
                disabled: claimed || !complete || this.busy.has(`achievement:${item?.id}`) });
        });
    }

    private renderMonthCard(parent: Node) {
        const card = panel(parent, 'MonthCard', 0, 42, 610, 590, new Color(242, 236, 255, 255), 40, true, CuteTheme.lilac, 4);
        text(card, 'Moon', '🌙', 0, 200, 160, 120, 78, CuteTheme.honeyDark, 'center', true);
        text(card, 'Title', '星月月卡', 0, 116, 320, 50, 32, CuteTheme.caramel, 'center', true);
        text(card, 'Sub', '30天陪伴奖励 · 正式充值系统接入后开放', 0, 72, 470, 32, 15, CuteTheme.muted, 'center', true);
        const benefits = ['购买立即获得钻石300', '每日领取钻石30', '孵化加速时间＋10%', '专属月卡头像框'];
        benefits.forEach((item, index) => {
            const row = panel(card, `MonthBenefit_${index}`, 0, 8 - index * 72, 500, 56, CuteTheme.paper, 18, false, CuteTheme.white, 2);
            text(row, 'Check', '✓', -218, 0, 34, 34, 20, CuteTheme.mintDark, 'center', true);
            text(row, 'Text', item, -180, 0, 380, 30, 16, CuteTheme.caramel, 'left', true);
        });
        button(card, 'MonthBuy', '充值系统接入后开放', 0, -226, 300, 66, () => this.showToast('当前Beta版本不开放真实充值'), { icon: '🔒', fill: new Color(220, 216, 208, 255), fontSize: 16, radius: 28, disabled: true });
        text(parent, 'MonthSafety', 'Beta阶段不产生真实付费，不会扣除钻石或人民币。', 0, -320, 560, 34, 14, CuteTheme.muted, 'center', true);
    }

    private renderBattlePass(parent: Node) {
        const season = this.seasonSummary?.season || this.seasonSummary || {};
        const player = this.seasonSummary?.player || {};
        headingTag(parent, 'PassTitle', '萌宠战令', 0, 302, 170, CuteTheme.honey);
        text(parent, 'PassSeason', `${safeName(season?.name, '当前赛季')}　积分 ${Number(player?.points || 0)}`, 0, 258, 520, 34, 17, CuteTheme.caramel, 'center', true);
        const level = Math.max(1, Math.min(30, Math.floor(Number(player?.points || 0) / 100) + 1));
        progress(parent, 'PassProgress', 0, 220, 520, 18, (Number(player?.points || 0) % 100) / 100, CuteTheme.honey);
        text(parent, 'PassLevel', `战令等级 Lv.${level}　下一级还需 ${100 - (Number(player?.points || 0) % 100)} 积分`, 0, 190, 520, 28, 14, CuteTheme.muted, 'center', true);
        const track = panel(parent, 'PassTrack', 0, -18, 620, 350, new Color(250, 246, 230, 255), 28, false, CuteTheme.caramelSoft, 2);
        text(track, 'FreeTitle', '免费奖励', -260, 138, 110, 30, 15, CuteTheme.mintDark, 'left', true);
        text(track, 'PaidTitle', '高级奖励', -260, -22, 110, 30, 15, CuteTheme.peachDark, 'left', true);
        for (let index = 0; index < 4; index += 1) {
            const lv = level + index;
            const x = -172 + index * 115;
            const unlocked = index === 0;
            const free = panel(track, `Free_${index}`, x, 78, 92, 92, unlocked ? new Color(220, 244, 213, 255) : CuteTheme.paper, 20, true, unlocked ? CuteTheme.mintDark : CuteTheme.white, 2);
            text(free, 'Icon', unlocked ? '✓' : '🎁', 0, 16, 54, 46, 28, CuteTheme.honeyDark, 'center', true);
            text(free, 'Level', `Lv.${lv}`, 0, -25, 70, 24, 12, CuteTheme.caramel, 'center', true);
            const paid = panel(track, `Paid_${index}`, x, -82, 92, 92, new Color(255, 235, 231, 255), 20, true, CuteTheme.peach, 2);
            text(paid, 'Icon', '🔒', 0, 16, 54, 46, 26, CuteTheme.peachDark, 'center', true);
            text(paid, 'Level', `Lv.${lv}`, 0, -25, 70, 24, 12, CuteTheme.caramel, 'center', true);
        }
        button(parent, 'PassTask', '查看每日任务', -126, -290, 220, 62, () => { this.benefitMode = 'daily'; this.renderCurrentPage(false); }, { icon: '✅', fill: CuteTheme.mint, fontSize: 16, radius: 26 });
        button(parent, 'PassPremium', '高级战令待开放', 126, -290, 220, 62, () => this.showToast('当前Beta版本不开放真实付费'), { icon: '🔒', fill: new Color(220, 216, 208, 255), fontSize: 15, radius: 26, disabled: true });
        text(parent, 'PassHint', '完成战斗、爬塔和每日任务会累计赛季进度。正式充值系统接入后再开放高级奖励轨。', 0, -354, 610, 42, 13, CuteTheme.muted, 'center', true);
    }

    private renderHatchery() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const room = panel(root, 'HatcheryResearch', 0, 0, 692, 905, new Color(239, 250, 232, 255), 40, true, CuteTheme.caramelSoft, 4);
        headingTag(room, 'Title', '三槽孵化室', 0, 390, 190, CuteTheme.mint);
        text(room, 'Hint', '点击任意宠物蛋选择空闲装置；确认后才开始计时。上下滑动可查看全部宠物蛋。', 0, 348, 620, 38, 15, CuteTheme.muted, 'center', true);
        const activeEggs = GameStore.eggs
            .filter((egg) => ['incubating', 'hatching'].includes(String(egg?.status || '')))
            .sort((a, b) => Number(a?.incubatorSlot || 0) - Number(b?.incubatorSlot || 0));
        const slotEgg = (slot: number) => activeEggs.find((egg) => Number(egg?.incubatorSlot || 0) === slot)
            || activeEggs.find((egg, index) => !Number(egg?.incubatorSlot || 0) && index === slot - 1)
            || null;

        [-214, 0, 214].forEach((x, index) => {
            const slot = index + 1;
            const egg = slotEgg(slot);
            const device = panel(room, `Device_${slot}`, x, 170, 202, 300, egg ? new Color(255, 247, 219, 255) : new Color(249, 252, 239, 255), 30, true, egg ? CuteTheme.honeyDark : CuteTheme.mintDark, egg?.isMutant ? 5 : 3);
            headingTag(device, 'Title', `${slot}号装置`, 0, 124, 112, egg ? CuteTheme.paperWarm : CuteTheme.mint);
            if (!egg) {
                drawUiIcon(device, 'EggEmpty', 'hatchery', 0, 48, 70, CuteTheme.honeyDark);
                text(device, 'State', '空闲\n等待选择宠物蛋', 0, -40, 150, 58, 17, CuteTheme.muted, 'center', false);
                tag(device, 'Free', '可使用', 0, -108, 92, CuteTheme.mint);
                return;
            }
            const remaining = Math.max(0, Number(egg?.remainingSeconds || 0));
            const total = Math.max(1, Number(egg?.hatchDurationSeconds || remaining || 1));
            const ready = Boolean(egg?.canHatch) || remaining <= 0;
            const eggNode = image(device, 'Egg', getEggArtPath(egg), 0, 48, 104, 132, CuteTheme.paperWarm);
            tween(eggNode).repeatForever(tween(eggNode).by(0.16, { angle: 3 }).by(0.16, { angle: -6 }).by(0.16, { angle: 3 }).delay(1.15)).start();
            if (egg?.isMutant) {
                const glow = panel(device, 'MutantGlow', 0, 48, 132, 160, new Color(255, 222, 112, 55), 72, false, CuteTheme.honey, 5);
                glow.setSiblingIndex(Math.max(0, eggNode.getSiblingIndex() - 1));
                tween(glow).repeatForever(tween(glow).to(.8, { scale: new Vec3(1.09, 1.09, 1) }, { easing: 'sineInOut' }).to(.8, { scale: Vec3.ONE }, { easing: 'sineInOut' })).start();
            }
            text(device, 'EggName', getEggDisplayName(egg), 0, -35, 184, 42, 15, CuteTheme.caramel, 'center', false);
            progress(device, 'Progress', 0, -77, 166, 14, ready ? 1 : 1 - remaining / total, ready ? CuteTheme.green : CuteTheme.honey);
            text(device, 'Time', ready ? '可以孵化' : this.formatSeconds(remaining), 0, -100, 176, 26, 14, ready ? CuteTheme.mintDark : CuteTheme.honeyDark, 'center', true);
            button(device, 'Accelerate', '加速', -48, -128, 84, 38, () => this.openHatchAccelerator(egg), { fill: CuteTheme.sky, fontSize: 12, radius: 17, disabled: ready });
            button(device, 'Hatch', ready ? '领取' : '计时中', 48, -128, 84, 38, () => void this.hatchEgg(egg), { fill: ready ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 12, radius: 17, disabled: !ready || this.busy.has(`hatch:${egg?.id}`) });
        });

        const allStoredEggs = GameStore.eggs.filter((egg) => String(egg?.status || '') === 'stored');
        const storedEggs = allStoredEggs
            .filter((egg) => this.hatchEggFilter === 'all'
                || this.hatchEggFilter === 'mutant' && Boolean(egg?.isMutant)
                || this.hatchEggFilter === 'rare' && Number(egg?.rarityPotential || 1) >= 4)
            .sort((a, b) => this.hatchEggSort === 'rarity'
                ? Number(b?.rarityPotential || 1) - Number(a?.rarityPotential || 1)
                : Number(a?.hatchDurationSeconds || 0) - Number(b?.hatchDurationSeconds || 0));
        const warehouse = panel(room, 'Warehouse', 0, -205, 650, 390, new Color(255, 252, 239, 255), 30, true, CuteTheme.caramelSoft, 3);
        headingTag(warehouse, 'Title', `蛋仓 ${allStoredEggs.length}`, -238, 160, 120, CuteTheme.paperWarm);
        ([['all','全部'],['rare','稀有'],['mutant','变异']] as Array<[typeof this.hatchEggFilter,string]>).forEach(([key,title],index)=>button(warehouse,`EggFilter_${key}`,title,-80+index*88,160,80,38,()=>{this.hatchEggFilter=key;this.renderCurrentPage(false);},{selected:this.hatchEggFilter===key,fill:this.hatchEggFilter===key?CuteTheme.honey:CuteTheme.paper,fontSize:12,radius:15}));
        button(warehouse,'EggSort',this.hatchEggSort==='rarity'?'稀有度':'孵化时长',238,160,118,38,()=>{this.hatchEggSort=this.hatchEggSort==='rarity'?'time':'rarity';this.renderCurrentPage(false);},{fill:CuteTheme.mint,fontSize:11,radius:15});
        const rows = Math.max(1, Math.ceil(storedEggs.length / 2));
        const area = this.createScrollArea(warehouse, 'EggScroll', 0, -20, 616, 284, 616, Math.max(284, rows * 134 + 12), 'vertical');
        storedEggs.forEach((egg, index) => {
            const rarity = Math.max(1, Math.min(6, Number(egg?.rarityPotential || 1)));
            const rarityColor = [CuteTheme.paperWarm, CuteTheme.mint, CuteTheme.sky, CuteTheme.lilac, CuteTheme.honey, CuteTheme.peach][rarity - 1];
            const col = index % 2;
            const row = Math.floor(index / 2);
            const card = panel(area.content, `Egg_${egg?.id || index}`, -151 + col * 302, -62 - row * 134, 286, 120, rarityColor, 22, true, egg?.isMutant ? CuteTheme.honeyDark : CuteTheme.white, egg?.isMutant ? 5 : 3);
            image(card, 'Icon', getEggArtPath(egg), -98, 0, 76, 92, CuteTheme.paperWarm);
            text(card, 'Name', getEggDisplayName(egg), -52, 28, 186, 36, 15, CuteTheme.caramel, 'left', false);
            text(card, 'Time', `孵化 ${this.formatEggDuration(egg)}${egg?.isMutant ? ' · 发光' : ''}`, -52, -8, 180, 28, 13, egg?.isMutant ? CuteTheme.peachDark : CuteTheme.muted, 'left', true);
            button(card, 'Put', '选择装置', 72, -38, 102, 34, () => this.requestIncubation(egg, 0), { fill: CuteTheme.honey, fontSize: 11, radius: 15, disabled: activeEggs.length >= 3 });
            card.on(Node.EventType.TOUCH_END, () => this.requestIncubation(egg, 0));
        });
        if (!storedEggs.length) text(area.content, 'Empty', allStoredEggs.length ? '当前筛选没有宠物蛋' : '暂无宠物蛋\n可通过区域巢穴、繁育与活动获得', 0, -86, 500, 90, 18, CuteTheme.muted, 'center', false);
    }

    private renderSkillLearning() {
        if (!this.pageRoot) return;
        const root=this.pageRoot; const pet=GameStore.currentPet||{}; const pets=GameStore.pets.filter((item)=>!item?.isEgg);
        const selector=this.createScrollArea(root,'SkillPetSelector',0,420,680,102,Math.max(680,pets.length*146+18),102,'horizontal');
        pets.forEach((item,index)=>button(selector.content,`SkillPet_${item?.id||index}`,safeName(item?.nickname,`宝宝${index+1}`),72+index*146,0,136,88,()=>{GameStore.selectPet(Number(item?.id||0));this.lockedSkillCodes.clear();this.renderCurrentPage(false);},{iconPath:getPetArtPath(item,'thumb'),iconSize:56,selected:Number(item?.id)===Number(GameStore.currentPetId),fill:CuteTheme.paperWarm,fontSize:13,radius:21,subtitle:`${this.rarityName(item)} · Lv.${Number(item?.level||1)}`}));
        const page=panel(root,'SkillResearchPage',0,-38,692,810,CuteTheme.paper,34,true,CuteTheme.caramelSoft,3);
        const header=panel(page,'Header',0,306,640,126,new Color(244,252,236,255),25,false,CuteTheme.mintDark,2);
        image(header,'Pet',getPetArtPath(pet,'thumb'),-250,0,90,90,CuteTheme.paperWarm);
        text(header,'Name',`${safeName(pet?.nickname,'宝宝')} · ${safeName(pet?.species,getPetSpeciesMeta(pet).name)}`,-185,24,320,34,21,CuteTheme.caramel,'left',true);
        text(header,'Role',`定位 ${(pet?.speciesConfig?.roleTags||[getPetSpeciesMeta(pet).role||'综合']).map((value:any)=>this.petRoleLabel(value)).join(' / ')}　技能格 ${Array.isArray(pet?.skills)?pet.skills.length:0}/${Number(pet?.skillSlotCount||3)}`,-185,-18,420,32,14,CuteTheme.muted,'left',true);
        text(header,'Rule',pet?.isLocked?'🔒 当前宝宝已锁定，无法打书。':'打书会随机替换未保护的普通技能；特殊技能不可保护。',-185,-50,450,28,13,CuteTheme.peachDark,'left',true);
        const current=panel(page,'Current',-170,38,326,402,new Color(245,252,238,255),26,false,CuteTheme.mintDark,2);
        headingTag(current,'Title','当前技能',0,170,130,CuteTheme.mint);
        const currentSkills=Array.isArray(pet?.skills)?pet.skills:[];
        const cArea=this.createScrollArea(current,'CurrentScroll',0,-10,302,312,302,Math.max(312,currentSkills.length*72+8),'vertical');
        currentSkills.forEach((skill:any,index:number)=>{const code=this.skillCode(skill);const special=this.isSpecialSkill(skill);button(cArea.content,`Skill_${index}`,this.skillName(skill),-35,-34-index*72,226,62,()=>this.showSkillDetail(skill),{iconPath:this.skillIconPath(skill),iconSize:48,fill:this.skillColor(skill),textColor:this.skillTier(skill)==='low'?CuteTheme.caramel:CuteTheme.white,fontSize:14,radius:20,subtitle:`${this.skillTierLabel(skill)} · ${safeName(skill?.description,'查看效果').slice(0,18)}`});button(cArea.content,`Lock_${index}`,this.lockedSkillCodes.has(code)?'已锁':'锁定',112,-34-index*72,58,52,()=>this.toggleSkillLock(skill),{icon:this.lockedSkillCodes.has(code)?'🔒':'🔓',fill:this.lockedSkillCodes.has(code)?CuteTheme.honey:CuteTheme.paperWarm,fontSize:10,radius:18,disabled:special});});
        const books=panel(page,'Books',174,38,326,402,new Color(255,245,240,255),26,false,CuteTheme.peachDark,2);
        headingTag(books,'Title','背包技能书',0,170,150,CuteTheme.peach);
        const items=this.skillBookItems(); if(!this.selectedSkillBookCode&&items.length)this.selectedSkillBookCode=String(items[0]?.itemCode||'');
        const bArea=this.createScrollArea(books,'BookScroll',0,-10,302,312,302,Math.max(312,items.length*72+8),'vertical');
        items.forEach((item,index)=>{const selected=String(item?.itemCode||'')===this.selectedSkillBookCode;button(bArea.content,`Book_${index}`,safeName(item?.name,'技能书'),0,-34-index*72,278,62,()=>{this.selectedSkillBookCode=String(item?.itemCode||'');this.renderCurrentPage(false);},{iconPath:this.skillBookIconPath(item),iconSize:48,fill:this.itemTier(item)==='high'?new Color(232,104,103,255):new Color(116,187,82,255),textColor:CuteTheme.white,fontSize:14,radius:20,selected,subtitle:`${this.itemTier(item)==='high'?'高级':'低级'} · 数量 ${Number(item?.quantity||0)}`});});
        const selectedBook=items.find((item)=>String(item?.itemCode||'')===this.selectedSkillBookCode)||null;
        const desc=panel(page,'Description',0,-257,640,170,new Color(255,252,239,255),25,false,CuteTheme.caramelSoft,2);
        text(desc,'Title',selectedBook?safeName(selectedBook?.name,'技能书'):'请选择技能书',-285,50,410,34,20,CuteTheme.caramel,'left',true);
        text(desc,'Description',selectedBook?safeName(selectedBook?.description,'暂无说明'):'技能效果、触发概率、目标类型与替换风险都会在这里显示。',-285,2,430,70,15,CuteTheme.muted,'left',false);
        text(desc,'Risk',`保护技能 ${this.lockedSkillCodes.size} 个　预计消耗锁印与技能书各1份`,-285,-52,430,30,14,CuteTheme.peachDark,'left',true);
        button(desc,'Learn','确认打书',230,-5,160,70,()=>void this.learnSelectedSkill(),{icon:'📕',fill:CuteTheme.honey,fontSize:17,radius:28,disabled:!selectedBook||!pet?.id||Boolean(pet?.isLocked)||this.busy.has('skill:learn')});
    }

    private renderFusion() {
        if (!this.pageRoot) return;
        this.ensureFusionParents();
        const root = this.pageRoot;
        const page = panel(root, 'FusionPage', 0, 0, 692, 905, new Color(250, 241, 255, 255), 40, true, CuteTheme.caramelSoft, 4);
        headingTag(page, 'Title', '炼妖研究室', 0, 390, 178, CuteTheme.lilac);
        text(page, 'Explain', '精准选择两只宝宝。确认前完整查看成长、资质、技能、稀有度和消耗。', 0, 348, 620, 38, 15, CuteTheme.muted, 'center', true);

        const parentA = GameStore.pets.find((pet) => Number(pet?.id) === this.fusionParentAId) || null;
        const parentB = GameStore.pets.find((pet) => Number(pet?.id) === this.fusionParentBId) || null;
        this.fusionParentCard(page, 'ParentA', '父系宝宝', parentA, -168, 135, 'A');
        this.fusionParentCard(page, 'ParentB', '母系宝宝', parentB, 168, 135, 'B');
        text(page, 'FusionMark', '＋', 0, 148, 58, 58, 42, CuteTheme.honeyDark, 'center', true);

        const preview = panel(page, 'OutcomeRange', 0, -150, 640, 178, CuteTheme.paper, 28, false, CuteTheme.caramelSoft, 2);
        headingTag(preview, 'RangeTitle', '可能结果范围', -220, 63, 190, CuteTheme.paperWarm);
        if (!parentA || !parentB) {
            text(preview, 'RangeEmpty', '分别选择父系和母系宝宝后，这里会自动显示可能出现的物种、稀有度、成长、资质、技能和变异范围。', 0, -4, 560, 92, 16, CuteTheme.muted, 'center', false);
        } else {
            const range = this.fusionOutcomeRange(parentA, parentB);
            text(preview, 'SpeciesRange', `可能物种：${range.species.join(' / ')}　稀有度：${range.rarity}`, -292, 34, 584, 28, 15, CuteTheme.caramel, 'left', true);
            text(preview, 'GrowthRange', `成长 ${range.growth}　品质 ${range.quality}　技能格 ${range.skillSlots}`, -292, 5, 584, 26, 13, CuteTheme.caramel, 'left', true);
            text(preview, 'AptitudeRange', `体 ${range.aptitudes.hp}　攻 ${range.aptitudes.attack}　防 ${range.aptitudes.defense}\n法 ${range.aptitudes.magic}　速 ${range.aptitudes.speed}`, -292, -32, 584, 46, 13, CuteTheme.muted, 'left', true);
            text(preview, 'SkillRange', `技能数 ${range.skillCount}　特殊技能 ${range.specialSkills}　变异概率 ${range.mutation}`, -292, -67, 584, 24, 12, CuteTheme.peachDark, 'left', true);
        }

        const coreCount=this.inventoryQuantity('fusion_core');
        const essenceCount=this.inventoryQuantity('mutation_essence');
        const materials=panel(page,'FusionMaterials',0,-292,640,96,new Color(255,249,232,255),24,false,CuteTheme.honey,2);
        text(materials,'AutoTitle','自动放入炼妖材料',-292,28,180,26,15,CuteTheme.caramel,'left',true);
        tag(materials,'Gold',`金币 1000 / ${formatNumber(Number(GameStore.user?.gold||0))}`,-206,-16,166,Number(GameStore.user?.gold||0)>=1000?CuteTheme.mint:CuteTheme.peach);
        tag(materials,'Core',`合宠核心 1 / ${coreCount}`,-24,-16,166,coreCount>=1?CuteTheme.mint:CuteTheme.peach);
        button(materials,'Essence',this.fusionUseMutationEssence?`✓ 变异精华 1 / ${essenceCount}`:`＋ 变异精华 0 / ${essenceCount}`,205,-4,220,56,()=>this.toggleFusionMutationEssence(),{selected:this.fusionUseMutationEssence,fill:this.fusionUseMutationEssence?CuteTheme.lilac:CuteTheme.paperWarm,fontSize:13,radius:20,subtitle:'可选：变异率 +3%'});

        button(page, 'ExecuteButton', '确认并炼妖', 0, -382, 240, 58, () => void this.confirmFusionExecution(), { icon: '🔮', fill: CuteTheme.honey, fontSize: 17, radius: 26, disabled: !parentA || !parentB || this.busy.has('fusion:execute') });
        text(page, 'Cost', '父母会被消耗；核心自动放入，变异精华由玩家决定是否使用', 0, -424, 620, 26, 13, CuteTheme.peachDark, 'center', true);
    }

    private renderAdventure() {
        if (!this.pageRoot) return;
        const root=this.pageRoot;
        const page=panel(root,'AdventurePage',0,0,692,905,new Color(239,247,221,255),40,true,CuteTheme.caramelSoft,4);
        if(this.teamEditing){this.renderTeamEditor(page);return;}
        const teamCard=panel(page,'TeamCard',0,292,650,220,CuteTheme.paper,28,false,CuteTheme.caramelSoft,2);
        headingTag(teamCard,'TeamTitle','五宠出战编队',-225,84,180,CuteTheme.paperWarm);
        text(teamCard,'Power',`总战力 ${formatNumber(this.teamPower())}`,275,84,180,30,15,CuteTheme.caramel,'right',true);
        for(let index=0;index<5;index+=1)this.adventureTeamSlot(teamCard,`TeamSlot${index}`,this.teamPets[index]||null,-252+index*126,-12,index+1);
        text(teamCard,'Formation',`当前阵法：${this.formationName(this.selectedFormationCode)}`, -225,-91,250,30,14,CuteTheme.caramel,'left',true);
        button(teamCard,'FormationBtn','阵法设置',100,-88,126,44,()=>this.showPage('formation'),{icon:'🐉',fill:CuteTheme.lilac,fontSize:13,radius:19});
        button(teamCard,'EditTeam',this.teamEditing?'取消编辑':'调整编队',245,-88,126,44,()=>this.teamEditing?this.cancelTeamEditing():this.beginTeamEditing(),{icon:this.teamEditing?'↩':'✎',fill:this.teamEditing?CuteTheme.peach:CuteTheme.mint,fontSize:13,radius:19});
        const modes=[
            {key:'world' as const,title:'世界主线',icon:'🗺',fill:CuteTheme.honey},
            {key:'pve' as const,title:'区域危机',icon:'⚔',fill:CuteTheme.mint},
            {key:'tower' as const,title:'无尽遗迹',icon:'🏯',fill:CuteTheme.paperWarm},
            {key:'friend' as const,title:'好友协作',icon:'🤝',fill:CuteTheme.peach},
        ];
        modes.forEach((mode,index)=>button(page,`Mode_${mode.key}`,mode.title,-240+index*160,112,148,64,()=>{this.adventureMode=mode.key;this.renderCurrentPage(false);},{icon:mode.icon,selected:this.adventureMode===mode.key,fill:mode.fill,textColor:this.adventureMode===mode.key?CuteTheme.white:CuteTheme.caramel,fontSize:13,radius:24}));
        const content=panel(page,'ModeContent',0,-170,640,440,CuteTheme.paper,30,false,CuteTheme.caramelSoft,2);
        if(this.adventureMode==='world'){
            this.renderWorldExploration(content);
        } else if(this.adventureMode==='tower'){
            headingTag(content,'Title','高难首领与爬塔',0,170,210,CuteTheme.paperWarm);
            text(content,'Info','五宠同时上场；首次挑战不可跳过。肉盾、治疗、物伤、法伤和辅助站位会受到阵法加成。\n每回合可选择：集火、守护、套盾、净化；阵法大招前置冷却2～3回合。',0,70,560,110,17,CuteTheme.caramel,'center',false);
            text(content,'Power',`当前战力 ${formatNumber(this.teamPower())}　推荐 ${formatNumber(Number(GameStore.tower?.recommendedPower||4200))}`,0,-28,500,36,16,CuteTheme.muted,'center',true);
            button(content,'Start','挑战BOSS',0,-126,250,70,()=>void this.startAdventureBattle('tower'),{icon:'👑',fill:CuteTheme.honey,fontSize:19,radius:29,disabled:this.teamPetIds.length!==5});
        } else if(this.adventureMode==='pve'){
            headingTag(content,'Title','每日区域危机',0,170,200,CuteTheme.mint);
            text(content,'Info','每日1次主题危机，敌方阵容与区域效果轮换。\n使用集火、守护、套盾和净化应对机制；失败不消耗主线体力。',0,72,550,100,17,CuteTheme.caramel,'center',false);
            button(content,'Start','挑战今日危机',0,-126,260,70,()=>void this.startAdventureBattle('pve'),{icon:'⚔',fill:CuteTheme.mint,fontSize:19,radius:29,disabled:this.teamPetIds.length!==5});
        } else {
            headingTag(content,'Title','好友协作首领',0,170,200,CuteTheme.peach);
            text(content,'Info','当前版本以好友阵容镜像进行全自动协作演练。\n正式赛季将按双方五宠、阵法和贡献结算协作首领奖励。',0,65,560,120,17,CuteTheme.caramel,'center',false);
            button(content,'Start','开始协作演练',0,-126,240,70,()=>void this.startAdventureBattle('friend'),{icon:'▶',fill:CuteTheme.peach,fontSize:18,radius:29,disabled:this.teamPetIds.length!==5});
        }
    }

    private renderWorldExploration(parent:Node) {
        const world=this.worldExploration;
        const regions=Array.isArray(world?.regions)?world.regions:[];
        headingTag(parent,'WorldTitle',safeName(world?.title,'PetVerse生态大陆'),0,188,230,CuteTheme.honey);
        text(parent,'WorldLoop','区域探索 → 发现物种 → 100%开放巢穴 → 获得独立物种蛋',0,154,586,28,13,CuteTheme.caramel,'center',true);
        if(!regions.length){text(parent,'WorldLoading','正在同步世界主线进度…',0,15,520,80,19,CuteTheme.muted,'center',true);return;}

        const strip=this.createScrollArea(parent,'RegionStrip',0,101,600,82,Math.max(600,regions.length*132+8),82,'horizontal');
        regions.forEach((region:any,index:number)=>button(strip.content,`Region_${region?.code||index}`,safeName(region?.name,'未知地区'),66+index*132,0,122,72,()=>{
            if(!region?.unlocked){this.showToast('先击败前一区域的巢穴首领');return;}
            this.selectedRegionCode=String(region.code);this.renderCurrentPage(false);
        },{icon:region?.nestUnlocked?'🥚':region?.unlocked?'🧭':'🔒',selected:String(region?.code)===this.selectedRegionCode,fill:region?.unlocked?CuteTheme.paperWarm:new Color(218,216,210,255),fontSize:12,radius:21,disabled:!region?.unlocked,subtitle:region?.unlocked?`探索 ${Number(region?.exploration||0)}%`:'尚未解锁'}));

        const region=regions.find((item:any)=>String(item?.code)===this.selectedRegionCode)||regions.find((item:any)=>item?.unlocked)||regions[0];
        const detail=panel(parent,'RegionDetail',0,-47,604,205,new Color(248,252,238,255),26,false,CuteTheme.mintDark,2);
        text(detail,'Chapter',`${safeName(region?.chapter,'主线')} · ${safeName(region?.name,'区域')}`, -270,72,360,32,20,CuteTheme.caramel,'left',true);
        tag(detail,'Element',`${safeName(region?.element,'生态')}系生态`,222,72,100,CuteTheme.mint);
        text(detail,'Description',safeName(region?.description,'调查区域生态并寻找首领巢穴。'),-270,39,540,30,14,CuteTheme.muted,'left',true);
        text(detail,'ExploreLabel',`探索度 ${Number(region?.exploration||0)}%`,-270,9,130,26,15,CuteTheme.caramel,'left',true);
        progress(detail,'ExploreProgress',-65,9,280,15,Number(region?.exploration||0)/100,region?.nestUnlocked?CuteTheme.honey:CuteTheme.mintDark);
        text(detail,'Species',`可发现：${safeName(region?.speciesName,'目标物种')} / ${safeName(region?.companionSpecies,'伴生物种')}　推荐战力 ${formatNumber(region?.recommendedPower||0)}`,-270,-22,540,28,14,CuteTheme.caramel,'left',true);
        const attempts=world?.attempts||{};
        text(detail,'Attempt',`巢穴奖励次数 ${Number(attempts?.remaining||0)}　累计 ${Number(attempts?.stored||0)}/6　战败不扣次数`,-270,-51,540,26,13,CuteTheme.peachDark,'left',true);
        button(detail,'Explore',Number(region?.exploration||0)>=100?'探索完成':'推进探索',-112,-78,196,48,()=>void this.startRegionBattle('explore',region),{icon:'🧭',fill:CuteTheme.mint,fontSize:15,radius:21,disabled:this.teamPetIds.length!==5||Number(region?.exploration||0)>=100});
        button(detail,'Nest',region?.nestUnlocked?'挑战首领巢穴':'探索100%开放',118,-78,220,48,()=>void this.startRegionBattle('nest',region),{icon:'🥚',fill:CuteTheme.honey,fontSize:15,radius:21,disabled:this.teamPetIds.length!==5||!region?.nestUnlocked||Number(attempts?.remaining||0)<=0});
        const pity=world?.pity||{};
        text(parent,'Pity',`保底：史诗 ${Number(pity?.epic?.remaining||10)}蛋内　传说 ${Number(pity?.legendary?.remaining||40)}蛋内　变异 ${Number(pity?.mutation?.remaining||80)}能量内`,0,-188,588,26,13,CuteTheme.peachDark,'center',true);
    }

    private async startRegionBattle(kind:'explore'|'nest',region:any) {
        if(this.teamPetIds.length!==5){this.showToast('世界主线需要完整五宠编队');return;}
        if(!this.battleLayer||!region?.code)return;
        this.adventureMode='world';
        showFivePetBattle(this.battleLayer,{
            mode:kind==='nest'?'boss':'pve',
            title:kind==='nest'?`${safeName(region?.name,'区域')}·首领巢穴`:`${safeName(region?.name,'区域')}·生态探索`,
            formationCode:this.selectedFormationCode,
            difficulty:Number(region?.difficulty||1),
            enemySpeciesCode:String(region?.speciesCode||''),
            onClose:()=>{this.showPage('adventure');void this.refreshWorldExploration();},
            onComplete:(session:any)=>void this.settleRegionBattle(kind,region,session),
        });
    }

    private async settleRegionBattle(kind:'explore'|'nest',region:any,session:any) {
        const key=`region-settle:${session?.id||0}`;
        if(!session?.id||this.busy.has(key))return;
        this.busy.add(key);
        try{
            const result=await ApiClient.post(kind==='nest'?'/exploration/settle-nest':'/exploration/settle-explore',{regionCode:String(region?.code||''),sessionId:Number(session.id)});
            this.applyWorldExploration(result);
            if(result?.egg){const eggs=await ApiClient.get('/hatchery/eggs');if(eggs?.success!==false)GameStore.setList('eggs',eggs);}
            this.showToast(result?.message||'世界主线进度已更新');
            if(result?.success===false)void AudioDirector.playSfx('error');else void AudioDirector.playSfx('confirm');
            this.renderCurrentPage(false);
        }catch(error){console.error('[CuteMainUI] settle region battle failed:',error);this.showToast('世界主线结算失败，请稍后重试');}
        finally{this.busy.delete(key);}
    }

    private async refreshWorldExploration() {
        const result=await ApiClient.get('/exploration/world');
        this.applyWorldExploration(result);
        if(this.currentPage==='adventure')this.renderCurrentPage(false);
    }

    private renderTeamEditor(page: Node) {
        this.normalizeTeamAssignments();
        const editor = panel(page, 'TeamEditor', 0, 0, 650, 850, new Color(255, 250, 232, 255), 34, false, CuteTheme.caramelSoft, 2);
        editor.on(Node.EventType.TOUCH_END, this.finishTeamDrag, this);
        editor.on(Node.EventType.MOUSE_UP, this.finishTeamDrag, this);
        editor.on(Node.EventType.TOUCH_START, this.beginTeamDragFromEvent, this);
        editor.on(Node.EventType.MOUSE_DOWN, this.beginTeamDragFromEvent, this);
        headingTag(editor, 'Title', '五宠阵法编队', -210, 382, 190, CuteTheme.mint);
        text(editor, 'Hint', '先点候选宝宝，再点上方1～5号阵位完成替换；阵位之间仍可直接拖动交换。', -290, 343, 580, 32, 14, CuteTheme.muted, 'left', true);
        const formationCodes = ['dragon','turtle','crane','tiger','phoenix'];
        formationCodes.forEach((code,index)=>button(editor,`F_${code}`,this.formationName(code),-240+index*120,300,110,42,()=>{this.selectedFormationCode=code;this.renderCurrentPage(false);},{selected:this.selectedFormationCode===code,fill:this.selectedFormationCode===code?CuteTheme.honey:CuteTheme.paperWarm,fontSize:12,radius:18}));

        const field = panel(editor, 'FormationField', 0, 130, 612, 240, new Color(243, 249, 236, 255), 27, false, CuteTheme.mintDark, 2);
        this.formationSlotNodes.clear();
        const positions = this.formationEditorPositions(this.selectedFormationCode);
        const byId = new Map(GameStore.pets.map((pet)=>[Number(pet?.id||0),pet]));
        positions.forEach(([x,y], index) => {
            const petId = Number(this.teamSlotAssignments[index] || 0);
            const pet = byId.get(petId) || null;
            const pending = Number(this.formationSelectedCandidateId || 0) > 0;
            const slot = panel(field, `Slot_${index}`, x, y, 116, 108, pet ? new Color(255, 247, 219, 255) : new Color(239, 242, 232, 255), 21, true, pending ? CuteTheme.mintDark : pet ? CuteTheme.honey : CuteTheme.caramelSoft, pending ? 4 : 2);
            this.formationSlotNodes.set(index, slot);
            text(slot, 'Role', `#${index+1} · ${this.formationSlotRole(this.selectedFormationCode, index)}`, 0, 43, 104, 18, 12, CuteTheme.mintDark, 'center', true);
            if (pet) image(slot, 'Pet', getPetArtPath(pet, 'thumb'), 0, 12, 42, 42, CuteTheme.paperWarm);
            else text(slot, 'Empty', '＋', 0, 12, 42, 42, 26, CuteTheme.muted, 'center', true);
            text(slot, 'Name', pet ? this.compactPetName(pet) : pending ? '点此放入' : '空阵位', 0, -18, 102, 18, 12, CuteTheme.caramel, 'center', true);
            text(slot, 'Bonus', this.formationSlotBonus(this.selectedFormationCode, index), 0, -40, 104, 18, 12, CuteTheme.peachDark, 'center', true);
            const assignSelected = (event:any) => {
                const selectedId=Number(this.formationSelectedCandidateId||0);
                if(selectedId<=0)return;
                if(event)event.propagationStopped=true;
                this.assignPetToFormationSlot(selectedId,index);
            };
            slot.on(Node.EventType.TOUCH_START, () => { this.teamDragSourceSlot=index; this.teamDragPetId=0; this.teamDragMoved=false; });
            slot.on(Node.EventType.TOUCH_MOVE, (event:any) => this.moveTeamDrag(event));
            slot.on(Node.EventType.TOUCH_END, assignSelected);
            slot.on(Node.EventType.MOUSE_DOWN, () => { this.teamDragSourceSlot=index; this.teamDragPetId=0; this.teamDragMoved=false; });
            slot.on(Node.EventType.MOUSE_MOVE, (event:any) => this.moveTeamDrag(event));
            slot.on(Node.EventType.MOUSE_UP, assignSelected);
        });

        const available = GameStore.pets.filter((pet)=>!pet?.isEgg&&pet?.tradeStatus!=='listed'&&!pet?.tradeListingId);
        this.formationCandidateNodes.clear();
        const rows = Math.max(1, Math.ceil(available.length / 2));
        const selectedPet=available.find((pet)=>Number(pet?.id||0)===Number(this.formationSelectedCandidateId||0));
        text(editor,'CandidateTitle',selectedPet?`已选 ${this.compactPetName(selectedPet)}：请点上方阵位`:'候选宝宝（点击选中，可上下滚动）',-285,-10,570,28,15,selectedPet?CuteTheme.mintDark:CuteTheme.caramel,'left',true);
        const choices = this.createScrollArea(editor,'TeamPetScroll',0,-180,610,312,610,Math.max(312,rows*108+8),'vertical');
        available.forEach((pet,index)=>{
            const id=Number(pet?.id||0); const onTeam=this.teamPetIds.includes(id); const pending=id===Number(this.formationSelectedCandidateId||0); const col=index%2,row=Math.floor(index/2);
            const card=panel(choices.content,`Pet_${id}`,-151+col*302,-49-row*108,286,96,pending?new Color(222,246,225,255):onTeam?CuteTheme.honey:CuteTheme.paperWarm,22,true,pending?CuteTheme.mintDark:onTeam?CuteTheme.honeyDark:CuteTheme.white,pending?4:2);
            this.formationCandidateNodes.set(id,card);
            image(card,'Icon',getPetArtPath(pet,'thumb'),-105,2,62,62,CuteTheme.paperWarm);
            text(card,'Name',this.compactPetName(pet,`宝宝${index+1}`),-64,22,178,28,14,CuteTheme.caramel,'left',true);
            text(card,'Meta',`${this.rarityName(pet)} · ${this.petRoleLabel(pet?.role)} · 战力 ${formatNumber(this.battleAttributesOf(pet).power)}`,-64,-15,190,24,11,CuteTheme.muted,'left',true);
            if(pending)tag(card,'Selected','待放入',100,32,64,CuteTheme.mint);
            else if(onTeam)tag(card,'Selected','已上阵',100,32,64,CuteTheme.honey);
            card.on(Node.EventType.TOUCH_START,()=>{this.teamDragPetId=id;this.teamDragSourceSlot=-1;this.teamDragMoved=false;});
            card.on(Node.EventType.TOUCH_MOVE,(event:any)=>this.moveTeamDrag(event));
            card.on(Node.EventType.TOUCH_END,(event:any)=>{event.propagationStopped=true;this.finishTeamDrag(event);});
            card.on(Node.EventType.TOUCH_CANCEL,()=>this.cancelTeamDrag());
            card.on(Node.EventType.MOUSE_DOWN,()=>{this.teamDragPetId=id;this.teamDragSourceSlot=-1;this.teamDragMoved=false;});
            card.on(Node.EventType.MOUSE_MOVE,(event:any)=>this.moveTeamDrag(event));
            card.on(Node.EventType.MOUSE_UP,(event:any)=>{event.propagationStopped=true;this.finishTeamDrag(event);});
        });
        text(editor,'Count',`已上阵 ${this.teamPetIds.length}/5　${this.formationName(this.selectedFormationCode)}`,-285,-382,300,30,15,CuteTheme.caramel,'left',true);
        button(editor,'Cancel','取消修改',105,-382,140,50,()=>this.cancelTeamEditing(),{fill:CuteTheme.paperWarm,fontSize:15,radius:22});
        button(editor,'Save','保存阵容',245,-382,140,50,()=>void this.saveTeam(),{icon:'✓',fill:CuteTheme.honey,fontSize:15,radius:22,disabled:this.teamPetIds.length!==5||this.teamSlotAssignments.filter(Boolean).length!==5||this.busy.has('team:save')});
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
        const rows = Math.ceil(GameStore.friends.length / 2);
        const area = this.createScrollArea(parent, 'FriendAlbumScroll', 0, -18, 626, 590, 626, rows * 250 + 12, 'vertical');
        GameStore.friends.forEach((friend, index) => {
            const col = index % 2; const rowIndex = Math.floor(index / 2);
            const photo = panel(area.content, `FriendPhoto_${friend?.id ?? index}`, -156 + col * 312, -116 - rowIndex * 250, 286, 232, new Color(255, 250, 231, 255), 28, true, CuteTheme.white, 3);
            const coverPet = Array.isArray(friend?.pets) ? friend.pets[0] : null;
            if (coverPet) image(photo, 'PetPhoto', getPetArtPath(coverPet, 'thumb'), -96, 55, 78, 78, CuteTheme.paperWarm);
            else text(photo, 'Avatar', '🐾', -96, 55, 72, 72, 42, CuteTheme.peachDark, 'center', true);
            text(photo, 'Name', safeName(friend?.nickname, `玩家${friend?.id || ''}`), -48, 78, 172, 34, 20, CuteTheme.caramel, 'left', true);
            text(photo, 'Meta', `Lv.${Number(friend?.level || 1)} · 宝宝${Array.isArray(friend?.pets) ? friend.pets.length : 0}只`, -48, 41, 174, 28, 13, CuteTheme.muted, 'left', true);
            const petNames = (Array.isArray(friend?.pets) ? friend.pets : []).slice(0, 2).map((pet: any) => safeName(pet?.nickname, '宝宝')).join('、');
            text(photo, 'Pets', petNames || '暂未展示宝宝', 0, -8, 250, 34, 14, CuteTheme.caramel, 'center', true);
            button(photo, 'Challenge', '切磋', -68, -72, 120, 48, () => { this.selectedFriendUserId = Number(friend?.userId || friend?.id || 0); this.adventureMode = 'friend'; this.showPage('adventure'); }, { icon: '⚔', fill: CuteTheme.sky, fontSize: 14, radius: 20 });
            button(photo, 'Marriage', '结缘', 68, -72, 120, 48, () => { const firstPet = Array.isArray(friend?.pets) ? friend.pets[0] : null; this.marriageTargetPetId = Number(firstPet?.id || 0); this.marriageMode = 'match'; this.showPage('marriage'); },
                { icon: '💞', fill: CuteTheme.pink, fontSize: 14, radius: 20, disabled: !(Array.isArray(friend?.pets) && friend.pets.length) });
        });
    }

    private renderFriendRequests(parent: Node) {
        headingTag(parent, 'RequestTitle', `好友申请 ${this.incomingFriendRequests.filter((r) => r?.status === 'pending').length}`, 0, 306, 200, CuteTheme.peach);
        const rows = [...this.incomingFriendRequests.map((item) => ({ ...item, direction: 'incoming' })), ...this.outgoingFriendRequests.map((item) => ({ ...item, direction: 'outgoing' }))];
        if (!rows.length) { text(parent, 'NoRequests', '没有新的好友申请\n收到的申请和已发送记录都会显示在这里。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(parent, 'FriendRequestScroll', 0, -15, 620, 590, 620, rows.length * 108 + 12, 'vertical');
        rows.forEach((request, index) => {
            const row = panel(area.content, `FriendRequest_${request?.id ?? index}`, 0, -50 - index * 108, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
            const other = request?.otherUser || {};
            text(row, 'Icon', request.direction === 'incoming' ? '📥' : '📤', -260, 0, 44, 44, 25, CuteTheme.honeyDark, 'center', true);
            text(row, 'Name', safeName(other?.nickname, `玩家${other?.id || ''}`), -224, 17, 230, 30, 17, CuteTheme.caramel, 'left', true);
            text(row, 'State', request.direction === 'incoming' ? `收到申请 · ${this.statusLabel(request?.status)}` : `已发送 · ${this.statusLabel(request?.status)}`, -224, -17, 260, 26, 13, CuteTheme.muted, 'left', true);
            if (request.direction === 'incoming' && String(request?.status) === 'pending') {
                button(row, 'Accept', '接受', 177, 0, 90, 44, () => void this.handleFriendRequest(request, true), { fill: CuteTheme.mint, fontSize: 13, radius: 19 });
                button(row, 'Reject', '拒绝', 272, 0, 80, 44, () => void this.handleFriendRequest(request, false), { fill: CuteTheme.peach, fontSize: 13, radius: 19 });
            } else tag(row, 'StatusTag', this.statusLabel(request?.status), 235, 0, 116, CuteTheme.paper, CuteTheme.muted);
        });
    }

    private renderFriendDiscover(parent: Node) {
        headingTag(parent, 'DiscoverTitle', '发现新伙伴', 0, 306, 190, CuteTheme.sky);
        text(parent, 'Tip', 'Beta阶段先用玩家ID快速搜索。正式微信版本会支持昵称和好友推荐。', 0, 250, 560, 46, 14, CuteTheme.muted, 'center', true);
        const keys = ['101', '102', '103', '104'];
        keys.forEach((key, index) => button(parent, `Search_${key}`, `ID ${key}`, -225 + index * 150, 187, 132, 46, () => void this.searchFriend(key), { fill: this.friendSearchKeyword === key ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 14, radius: 19 }));
        button(parent, 'SeedRecommend', '补充测试玩家', 0, 125, 190, 48, () => void this.seedFriends(), { icon: '🐾', fill: CuteTheme.mint, fontSize: 14, radius: 21, disabled: this.busy.has('friends:seed') });
        const rows = this.friendSearchResults;
        if (!rows.length) { text(parent, 'SearchEmpty', '点击上方玩家ID进行搜索\n已经是好友的玩家会标记为“已添加”。', 0, -15, 500, 100, 18, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(parent, 'FriendDiscoverScroll', 0, -135, 610, 360, 610, rows.length * 112 + 10, 'vertical');
        rows.forEach((user, index) => {
            const row = panel(area.content, `SearchUser_${user?.id ?? index}`, 0, -50 - index * 112, 590, 94, CuteTheme.paperWarm, 22, false, CuteTheme.white, 2);
            text(row, 'Avatar', '🐾', -250, 0, 48, 48, 28, CuteTheme.peachDark, 'center', true);
            text(row, 'Name', safeName(user?.nickname, `玩家${user?.id || ''}`), -210, 17, 260, 30, 18, CuteTheme.caramel, 'left', true);
            text(row, 'Meta', `ID ${user?.id || '-'} · Lv.${Number(user?.level || 1)}`, -210, -17, 260, 24, 13, CuteTheme.muted, 'left', true);
            button(row, 'Add', user?.isFriend ? '已添加' : '加好友', 230, 0, 118, 46, () => void this.sendFriendRequest(user), { fill: user?.isFriend ? new Color(220, 218, 208, 255) : CuteTheme.mint, fontSize: 14, radius: 20, disabled: Boolean(user?.isFriend) || this.busy.has(`friend:add:${user?.id}`) });
        });
    }

    private renderMarriage() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;

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
        if (!GameStore.marriages.length) { text(parent, 'NoMarriage', '还没有结缘中的宝宝\n前往“配对”选择自己的宝宝和好友宝宝。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true); button(parent, 'GoMatch', '开始配对', 0, -70, 210, 60, () => { this.marriageMode = 'match'; this.renderCurrentPage(false); }, { icon: '🎀', fill: CuteTheme.pink, fontSize: 17, radius: 26 }); return; }
        const area = this.createScrollArea(parent, 'MarriageListScroll', 0, -15, 620, 590, 620, GameStore.marriages.length * 140 + 12, 'vertical');
        GameStore.marriages.forEach((marriage, index) => {
            const pets = Array.isArray(marriage?.pets) ? marriage.pets : [];
            const petA = pets[0] || { id: marriage?.petAId, nickname: `宝宝${marriage?.petAId || ''}` };
            const petB = pets[1] || { id: marriage?.petBId, nickname: `宝宝${marriage?.petBId || ''}` };
            const row = panel(area.content, `Marriage_${marriage?.id ?? index}`, 0, -65 - index * 140, 602, 122, index % 2 ? CuteTheme.paperWarm : new Color(255, 249, 238, 255), 25, false, CuteTheme.white, 2);
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
        if (!this.marriageProposals.length) { text(parent, 'NoProposal', '没有结婚申请记录\n配对后发出的申请会在这里保留72小时。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(parent, 'MarriageProposalScroll', 0, -15, 620, 590, 620, this.marriageProposals.length * 108 + 12, 'vertical');
        this.marriageProposals.forEach((proposal, index) => {
            const incoming = Number(proposal?.targetUserId || 0) === Number(GameStore.user?.id || 1);
            const row = panel(area.content, `Proposal_${proposal?.id ?? index}`, 0, -50 - index * 108, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
            text(row, 'Icon', incoming ? '📥' : '📤', -260, 0, 44, 44, 25, CuteTheme.peachDark, 'center', true);
            text(row, 'Name', `${incoming ? '收到' : '发出'}：宝宝${proposal?.proposerPetId || '-'} × 宝宝${proposal?.targetPetId || '-'}`, -224, 17, 340, 30, 16, CuteTheme.caramel, 'left', true);
            text(row, 'State', this.statusLabel(proposal?.status), -224, -17, 220, 24, 13, CuteTheme.muted, 'left', true);
            if (String(proposal?.status) === 'pending' && incoming) {
                button(row, 'Accept', '同意', 174, 0, 88, 44, () => void this.respondMarriageProposal(proposal, true), { fill: CuteTheme.mint, fontSize: 13, radius: 19 });
                button(row, 'Reject', '拒绝', 269, 0, 82, 44, () => void this.respondMarriageProposal(proposal, false), { fill: CuteTheme.peach, fontSize: 13, radius: 19 });
            } else if (String(proposal?.status) === 'pending') button(row, 'Cancel', '撤回', 232, 0, 108, 44, () => void this.cancelMarriageProposal(proposal), { fill: CuteTheme.paper, fontSize: 13, radius: 19 });
            else tag(row, 'Status', this.statusLabel(proposal?.status), 230, 0, 116, CuteTheme.paper, CuteTheme.muted);
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
        if (own) image(left, 'PetArt', getPetArtPath(own, 'thumb'), 0, 35, 104, 104, CuteTheme.paperWarm);
        else text(left, 'PetIcon', '🐶', 0, 35, 100, 90, 58, CuteTheme.honeyDark, 'center', true);
        text(left, 'Name', safeName(own?.nickname, '暂无可用宝宝'), 0, -33, 240, 34, 20, CuteTheme.caramel, 'center', true);
        text(left, 'Meta', own ? `Lv.${Number(own?.level || 1)} · ${this.genderText(own)} · 生育力${Number(own?.fertility || 100)}` : '请先获得宝宝', 0, -73, 246, 30, 13, CuteTheme.muted, 'center', true);
        button(left, 'Prev', '上一个', -65, -112, 112, 42, () => this.cycleMarriagePet('own', -1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: ownPets.length < 2 });
        button(left, 'Next', '下一个', 65, -112, 112, 42, () => this.cycleMarriagePet('own', 1), { fill: CuteTheme.paperWarm, fontSize: 12, radius: 18, disabled: ownPets.length < 2 });

        const right = panel(parent, 'TargetPet', 164, 110, 282, 280, new Color(255, 244, 242, 255), 28, true, CuteTheme.white, 3);
        text(right, 'Owner', '好友宝宝', 0, 104, 220, 32, 17, CuteTheme.caramel, 'center', true);
        if (target) image(right, 'PetArt', getPetArtPath(target, 'thumb'), 0, 35, 104, 104, CuteTheme.paperWarm);
        else text(right, 'PetIcon', '🐱', 0, 35, 100, 90, 58, CuteTheme.peachDark, 'center', true);
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

        const toolbar = panel(root, 'MailToolbar', 0, 382, 650, 72, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        text(toolbar, 'Count', `未读 ${this.mailUnreadCount} · 可领取 ${this.mailClaimableCount}`, -285, 0, 260, 34, 16, CuteTheme.caramel, 'left', true);
        button(toolbar, 'ReadAll', '全部已读', 120, 0, 136, 46, () => void this.readAllMail(), { fill: CuteTheme.sky, fontSize: 13, radius: 20, disabled: this.mailUnreadCount <= 0 });
        button(toolbar, 'ClaimAll', '一键领取', 258, 0, 136, 46, () => void this.claimAllMail(), { fill: CuteTheme.honey, fontSize: 13, radius: 20, disabled: this.mailClaimableCount <= 0 });
        const card = panel(root, 'MailBook', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        if (!this.mails.length) { text(card, 'EmptyIcon', '💌', 0, 130, 160, 140, 82, CuteTheme.peachDark, 'center', true); text(card, 'EmptyText', '信箱里暂时没有邮件\nBeta阶段可以创建一封欢迎奖励邮件进行测试。', 0, 15, 520, 100, 19, CuteTheme.muted, 'center', true); button(card, 'SeedMail', '创建欢迎邮件', 0, -120, 220, 62, () => void this.seedWelcomeMail(), { icon: '🎁', fill: CuteTheme.honey, fontSize: 17, radius: 27, disabled: this.busy.has('mail:seed') }); return; }
        const area = this.createScrollArea(card, 'MailListScroll', 0, 60, 620, 430, 620, this.mails.length * 114 + 10, 'vertical');
        this.mails.forEach((mail, index) => {
            const selected = Number(mail?.id || 0) === this.selectedMailId;
            const row = panel(area.content, `Mail_${mail?.id ?? index}`, 0, -52 - index * 114, 602, 98, selected ? new Color(255, 243, 214, 255) : (index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255)), 22, false, CuteTheme.white, 2);
            text(row, 'Icon', mail?.claimed ? '📭' : mail?.readed ? '✉️' : '💌', -260, 0, 46, 46, 27, mail?.readed ? CuteTheme.muted : CuteTheme.peachDark, 'center', true);
            text(row, 'Title', safeName(mail?.title, '系统邮件'), -224, 19, 280, 30, 17, CuteTheme.caramel, 'left', !mail?.readed);
            text(row, 'Attach', this.attachmentSummary(mail), -224, -17, 330, 26, 14, CuteTheme.muted, 'left', true);
            button(row, 'Read', '查看', 150, 0, 86, 44, () => void this.selectMail(mail), { fill: CuteTheme.sky, fontSize: 13, radius: 19 });
            button(row, 'Claim', mail?.claimed ? '已领取' : mail?.canClaim ? '领取' : '无附件', 252, 0, 108, 44, () => void this.claimMail(mail), { fill: mail?.canClaim ? CuteTheme.honey : new Color(220, 218, 208, 255), fontSize: 13, radius: 19, disabled: !mail?.canClaim || this.busy.has(`mail:claim:${mail?.id}`) });
        });
        const selected = this.mails.find((item) => Number(item?.id || 0) === this.selectedMailId);
        if (selected) { const detail = panel(card, 'MailDetail', 0, -286, 602, 120, new Color(244, 238, 221, 255), 20, false, CuteTheme.white, 2); text(detail, 'Content', String(selected?.content || '暂无正文').slice(0, 140), 0, 0, 560, 96, 13, CuteTheme.caramel, 'center', false); }
        else this.scrollHint(card, 'MailHint', '上下滑动查看全部邮件', 0, -286, 240);
    }

    private renderRanking() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;

        const tabs = panel(root, 'RankingTabs', 0, 382, 666, 68, CuteTheme.paper, 25, true, CuteTheme.caramelSoft, 3);
        const modes: Array<['tower' | 'level' | 'power' | 'season', string, string]> = [['tower', '爬塔', '🗼'], ['level', '等级', '⭐'], ['power', '战力', '⚔'], ['season', '赛季', '🏅']];
        modes.forEach(([key, title, icon], index) => button(tabs, `RankTab_${key}`, title, -246 + index * 164, 0, 148, 48, () => void this.changeRankingMode(key), { icon, selected: this.rankingMode === key, fill: this.rankingMode === key ? CuteTheme.honey : CuteTheme.paperWarm, fontSize: 13, radius: 20 }));
        const card = panel(root, 'RankingCard', 0, -24, 660, 730, CuteTheme.paper, 38, true, CuteTheme.caramelSoft, 3);
        const season = this.seasonSummary?.season || this.seasonSummary?.data?.season || {}; const player = this.seasonSummary?.player || this.seasonSummary?.data?.player || {};
        text(card, 'Season', `${safeName(season?.name, '当前赛季')} · 我的积分 ${Number(player?.points || 0)} · 评级 ${Number(player?.rating || 1000)}`, 0, 309, 590, 34, 14, CuteTheme.peachDark, 'center', true);
        if (!this.rankingEntries.length) { text(card, 'Empty', '当前榜单还没有记录\n完成爬塔、培养宝宝或好友切磋后即可上榜。', 0, 80, 520, 110, 19, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(card, 'RankingScroll', 0, -18, 620, 610, 620, this.rankingEntries.length * 93 + 10, 'vertical');
        this.rankingEntries.forEach((item, index) => {
            const rank = Number(item?.rank || index + 1);
            const row = panel(area.content, `Rank_${rank}`, 0, -45 - index * 93, 604, 78, rank <= 3 ? new Color(255, 247, 220, 255) : (index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255)), 21, false, CuteTheme.white, 2);
            text(row, 'Medal', rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank), -270, 0, 50, 48, rank <= 3 ? 26 : 18, CuteTheme.honeyDark, 'center', true);
            if (item?.petName || item?.speciesCode) image(row, 'PetThumb', getPetArtPath(item, 'thumb'), -222, 0, 54, 54, CuteTheme.paperWarm);
            text(row, 'Name', safeName(item?.petName || item?.playerName || item?.nickname, `玩家${item?.userId || ''}`), -184, 14, 226, 30, 17, CuteTheme.caramel, 'left', true);
            text(row, 'Owner', item?.petName ? safeName(item?.playerName, '玩家') : `ID ${item?.userId || '-'}`, -184, -15, 226, 24, 12, CuteTheme.muted, 'left', true);
            text(row, 'Score', this.rankingScoreText(item), 265, 0, 170, 34, 16, CuteTheme.peachDark, 'right', true);
        });
    }

    private renderTrade() {
        if (!this.pageRoot) return;
        const root = this.pageRoot;

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
        if (!this.tradeListings.length) { text(parent, 'MarketEmpty', '市场暂时没有寄售宝宝\n可以先把自己的非出战宝宝上架。', 0, 80, 520, 100, 19, CuteTheme.muted, 'center', true); button(parent, 'GoList', '我要上架', 0, -65, 200, 60, () => { this.tradeMode = 'list'; this.renderCurrentPage(false); }, { icon: '➕', fill: CuteTheme.lilac, fontSize: 17, radius: 26 }); return; }
        const area = this.createScrollArea(parent, 'TradeMarketScroll', 0, -15, 620, 590, 620, this.tradeListings.length * 108 + 12, 'vertical');
        this.tradeListings.forEach((listing, index) => this.renderTradeRow(area.content, listing, index, 'buy', -50 - index * 108));
    }

    private renderMyTrade(parent: Node) {
        headingTag(parent, 'MyTradeTitle', `我的寄售 ${this.myTradeListings.length}`, 0, 306, 200, CuteTheme.sky);
        if (!this.myTradeListings.length) { text(parent, 'MyEmpty', '还没有寄售记录\n上架需要100金币，成交后收取5%手续费。', 0, 80, 520, 100, 19, CuteTheme.muted, 'center', true); return; }
        const area = this.createScrollArea(parent, 'MyTradeScroll', 0, -15, 620, 590, 620, this.myTradeListings.length * 108 + 12, 'vertical');
        this.myTradeListings.forEach((listing, index) => this.renderTradeRow(area.content, listing, index, 'cancel', -50 - index * 108));
    }

    private renderTradeHistory(parent: Node) {
        headingTag(parent, 'HistoryTitle', `交易记录 ${this.tradeHistory.length}`, 0, 306, 200, CuteTheme.paperWarm);
        if (!this.tradeHistory.length) {
            text(parent, 'HistoryIcon', '🏷', 0, 145, 120, 100, 54, CuteTheme.lilac, 'center', true);
            text(parent, 'HistoryEmpty', '暂时没有成交记录\n先逛逛市场，或上架一只非出战宝宝。', 0, 42, 500, 96, 19, CuteTheme.muted, 'center', true);
            button(parent, 'HistoryMarket', '去逛市场', -112, -78, 190, 58, () => { this.tradeMode = 'market'; this.renderCurrentPage(false); }, { icon: '🛒', fill: CuteTheme.sky, fontSize: 16, radius: 25 });
            button(parent, 'HistoryList', '我要上架', 112, -78, 190, 58, () => { this.tradeMode = 'list'; this.renderCurrentPage(false); }, { icon: '➕', fill: CuteTheme.lilac, fontSize: 16, radius: 25 });
            return;
        }
        const area = this.createScrollArea(parent, 'TradeHistoryScroll', 0, -15, 620, 590, 620, this.tradeHistory.length * 92 + 12, 'vertical');
        this.tradeHistory.forEach((record, index) => {
            const row = panel(area.content, `TradeHistory_${record?.id ?? index}`, 0, -42 - index * 92, 602, 76, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 20, false, CuteTheme.white, 2);
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
        image(petCard, 'PetArt', getPetArtPath(pet, 'thumb'), -190, 20, 112, 112, CuteTheme.paperWarm);
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

    private renderTradeRow(parent: Node, listing: any, index: number, action: 'buy' | 'cancel', yOverride?: number) {
        const y = yOverride ?? (230 - index * 108);
        const row = panel(parent, `Trade_${action}_${listing?.id ?? index}`, 0, y, 602, 92, index % 2 ? CuteTheme.paperWarm : new Color(255, 252, 240, 255), 22, false, CuteTheme.white, 2);
        const pet = listing?.pet || listing?.petSnapshot || {};
        image(row, 'PetThumb', getPetArtPath(pet, 'thumb'), -260, 0, 54, 54, pet?.isMutant ? CuteTheme.peach : CuteTheme.paperWarm);
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
        renderMorePage(this.pageRoot, {
            onOpen: (page) => this.showPage(page),
            notificationCount: (page) => this.pageNotificationCount(page),
        });
    }

    private renderFormation() {
        if(!this.pageRoot)return;
        renderFormationPanel(this.pageRoot,this.formationOverview||{},this.selectedFormationCode,{
            onSelect:(code)=>void this.selectFormation(code),
            onUpgrade:(code)=>void this.upgradeFormation(code),
            onBuyKnowledge:()=>void this.buyFormationKnowledge(),
            onBuyCore:()=>void this.buyFormationCore(),
            onEditTeam:()=>{this.beginTeamEditing();this.showPage('adventure');},
            onBack:()=>this.goBackPage(),
        });
    }

    private renderGuild() {
        if(!this.pageRoot)return;
        renderGuildPanel(this.pageRoot,this.guildOverview||{}, {
            onJoin:()=>void this.guildAction('/guild/join-default',{}),
            onSign:()=>void this.guildAction('/guild/sign',{}),
            onDonateGold:()=>void this.guildAction('/guild/donate',{type:'gold',amount:5000}),
            onDonateDiamond:()=>void this.guildAction('/guild/donate',{type:'diamond',amount:10}),
            onBoss:()=>this.startGuildBossBattle(),
            onTask:(id)=>void this.guildAction('/guild/tasks/claim',{taskId:id}),
            onExpedition:()=>void this.guildAction('/guild/expedition/start',{petIds:this.teamPetIds,routeCode:'forest'}),
            onClaimExpedition:(id)=>void this.guildAction('/guild/expedition/claim',{expeditionId:id}),
            onBack:()=>this.goBackPage(),
        });
    }

    private formationName(code: string) {
        const map:Record<string,string>={dragon:'龙阵',turtle:'龟阵',crane:'鹤阵',tiger:'虎阵',phoenix:'凤阵'};
        return map[String(code)]||'龙阵';
    }

    private async selectFormation(code:string) {
        this.selectedFormationCode=code;
        if(this.teamPetIds.length===5) await this.saveTeam();
        else { this.showToast(`已选择${this.formationName(code)}，完成五宠编队后保存`); this.renderCurrentPage(false); }
    }

    private async upgradeFormation(code:string) { await this.formationAction('/formation/upgrade',{formationCode:code}); }
    private async buyFormationKnowledge() { await this.formationAction('/formation/purchase-knowledge',{quantity:30}); }
    private async buyFormationCore() { await this.formationAction('/formation/purchase-core',{}); }
    private async formationAction(path:string,body:any) {
        const result=await ApiClient.post(path,body);this.showToast(result?.message||'阵法操作完成');
        if(result?.success===false)void AudioDirector.playSfx('error');else void AudioDirector.playSfx('confirm');
        this.formationOverview=(await ApiClient.get('/formation'))||this.formationOverview;this.renderCurrentPage(false);
    }

    private async guildAction(path:string,body:any) {
        const result=await ApiClient.post(path,body);this.showToast(result?.message||'公会操作完成');
        if(result?.success===false)void AudioDirector.playSfx('error');else void AudioDirector.playSfx('confirm');
        this.guildOverview=(await ApiClient.get('/guild/my'))||this.guildOverview;this.renderCurrentPage(false);
    }

    private startGuildBossBattle() {
        if(this.teamPetIds.length!==5){this.showToast('公会首领需要完整五宠编队');return;}
        if(!this.battleLayer)return;
        showFivePetBattle(this.battleLayer,{mode:'guild-boss',title:'公会首领战',formationCode:this.selectedFormationCode,onClose:()=>{this.showPage('guild');},onComplete:async()=>{const result=await ApiClient.post('/guild/boss/challenge',{});this.showToast(result?.message||'公会首领结算完成');this.guildOverview=(await ApiClient.get('/guild/my'))||this.guildOverview;}});
    }

    private ensurePetStatDraft(petId:number) {
        if(this.petStatDraftPetId===petId)return;
        this.petStatDraftPetId=petId;
        this.petStatDraft={};
    }
    private petStatDraftTotal() {
        return Object.values(this.petStatDraft).reduce((sum,value)=>sum+Math.max(0,Number(value||0)),0);
    }
    private queuePetStatPoints(key:string,amount:number,available:number) {
        const petId=Number(GameStore.currentPet?.id||0);if(!petId)return;
        this.ensurePetStatDraft(petId);
        const remaining=Math.max(0,Number(available||0)-this.petStatDraftTotal());
        const add=Math.min(Math.max(0,Math.floor(amount)),remaining);if(add<=0)return;
        this.petStatDraft[key]=Number(this.petStatDraft[key]||0)+add;
        this.renderCurrentPage(false);
    }
    private clearPetStatDraft() {
        this.petStatDraft={};
        this.showToast('已清空本次加点预览，宝宝属性没有变化');
        this.renderCurrentPage(false);
    }
    private recommendPetStats(pet:any,available:number) {
        const petId=Number(pet?.id||0);if(!petId)return;
        this.ensurePetStatDraft(petId);
        const remaining=Math.max(0,Number(available||0)-this.petStatDraftTotal());
        if(remaining<=0){this.showToast('没有可分配的属性点');return;}
        const roleValues=[...(pet?.speciesConfig?.roleTags||[]),pet?.role,getPetSpeciesMeta(pet).role].map((value:any)=>String(value||'').toLowerCase()).join(' ');
        const weights:Record<string,number>=roleValues.match(/tank|defense|肉盾|防御/)
            ? {constitution:4,endurance:4,speed:1,strength:1}
            : roleValues.match(/healer|support|cleanse|治疗|辅助|净化/)
                ? {spirit:5,constitution:3,speed:2}
                : roleValues.match(/magic|control|法伤|控制/)
                    ? {spirit:5,speed:3,constitution:2}
                    : roleValues.match(/physical|burst|物伤|爆发/)
                        ? {strength:5,speed:3,constitution:2}
                        : {constitution:2,strength:2,spirit:2,endurance:2,speed:2};
        const order=Object.keys(weights);const weightTotal=Object.values(weights).reduce((sum,value)=>sum+value,0);
        let assigned=0;
        order.forEach((key,index)=>{const value=index===order.length-1?remaining-assigned:Math.floor(remaining*weights[key]/weightTotal);if(value>0){this.petStatDraft[key]=Number(this.petStatDraft[key]||0)+value;assigned+=value;}});
        this.showToast('推荐方案已放入预览，确认前不会修改属性');
        this.renderCurrentPage(false);
    }
    private async confirmPetStats() {
        const petId=Number(GameStore.currentPet?.id||0);if(!petId||this.busy.has('pet-stats:confirm'))return;
        this.ensurePetStatDraft(petId);
        if(this.petStatDraftTotal()<=0){this.showToast('请先添加属性点或使用推荐方案');return;}
        this.busy.add('pet-stats:confirm');
        try{
            const points={...this.petStatDraft};
            const result=await ApiClient.post('/pet/stats/allocate',{petId,points});
            if(result?.success===false){this.showToast(result?.message||'加点失败');void AudioDirector.playSfx('error');return;}
            this.petStatDraft={};
            const detail=await ApiClient.get(`/pet/${petId}`);if(detail?.success!==false){const updated=detail?.data||detail?.pet||detail;GameStore.updatePet(updated);}
            this.showToast('加点已确认并生效');void AudioDirector.playSfx('confirm');
        }finally{this.busy.delete('pet-stats:confirm');this.renderCurrentPage(false);}
    }
    private async resetPetStats() {
        const petId=Number(GameStore.currentPet?.id||0);if(!petId)return;
        this.ensurePetStatDraft(petId);this.petStatDraft={};
        const result=await ApiClient.post('/pet/stats/reset',{petId});this.showToast(result?.message||'加点已重置');if(result?.success!==false)await GameStore.ensureCurrentPetDetail(true);
    }

    private renderSettings() {
        if(!this.pageRoot)return;const root=this.pageRoot;const settings=CuteFeedback.getSettings();const audio=AudioDirector.getSettings();
        const book=panel(root,'SettingsBook',0,0,692,905,new Color(255,250,232,255),40,true,CuteTheme.caramelSoft,4);
        headingTag(book,'Title','游戏设置',-245,390,154,CuteTheme.paperWarm);
        const sound=panel(book,'Sound',0,205,630,280,new Color(238,248,230,255),28,false,CuteTheme.mintDark,2);
        headingTag(sound,'Title','音乐与音效',-210,112,170,CuteTheme.mint);
        this.settingToggle(sound,'AudioToggle','音乐音效',audio.enabled,-90,58,()=>{AudioDirector.setSettings({enabled:!audio.enabled});this.renderCurrentPage(false);});
        this.settingToggle(sound,'Vibrate','轻触震动',settings.vibrationEnabled,165,58,()=>{CuteFeedback.setSettings({vibrationEnabled:!settings.vibrationEnabled});this.renderCurrentPage(false);});
        text(sound,'BgmLabel','背景音乐',-275,2,110,30,15,CuteTheme.caramel,'left',true);button(sound,'BgmMinus','－',-140,2,42,42,()=>{AudioDirector.setSettings({bgmVolume:audio.bgmVolume-.1});this.renderCurrentPage(false);},{fill:CuteTheme.paperWarm,fontSize:20,radius:18});progress(sound,'Bgm',5,2,220,16,audio.bgmVolume,CuteTheme.honey);text(sound,'BgmValue',`${Math.round(audio.bgmVolume*100)}%`,155,2,66,28,14,CuteTheme.caramel,'center',true);button(sound,'BgmPlus','＋',235,2,42,42,()=>{AudioDirector.setSettings({bgmVolume:audio.bgmVolume+.1});this.renderCurrentPage(false);},{fill:CuteTheme.honey,fontSize:20,radius:18});
        text(sound,'SfxLabel','点击音效',-275,-58,110,30,15,CuteTheme.caramel,'left',true);button(sound,'SfxMinus','－',-140,-58,42,42,()=>{AudioDirector.setSettings({sfxVolume:audio.sfxVolume-.1});this.renderCurrentPage(false);},{fill:CuteTheme.paperWarm,fontSize:20,radius:18});progress(sound,'Sfx',5,-58,220,16,audio.sfxVolume,CuteTheme.sky);text(sound,'SfxValue',`${Math.round(audio.sfxVolume*100)}%`,155,-58,66,28,14,CuteTheme.caramel,'center',true);button(sound,'SfxPlus','＋',235,-58,42,42,()=>{AudioDirector.setSettings({sfxVolume:audio.sfxVolume+.1});this.renderCurrentPage(false);},{fill:CuteTheme.sky,fontSize:20,radius:18});
        button(sound,'Test','试听新点击声',0,-112,180,42,()=>AudioDirector.playCuteClick(),{icon:'♪',fill:CuteTheme.paperWarm,fontSize:13,radius:18});
        const visual=panel(book,'Visual',0,-30,630,190,new Color(242,238,255,255),28,false,CuteTheme.lilac,2);headingTag(visual,'Title','画面与反馈',-205,70,170,CuteTheme.lilac);this.settingToggle(visual,'Anim','界面动效',settings.animationEnabled,-90,15,()=>{CuteFeedback.setSettings({animationEnabled:!settings.animationEnabled});this.renderCurrentPage(false);});this.settingToggle(visual,'SoundCompat','旧版反馈声',settings.soundEnabled,165,15,()=>{CuteFeedback.setSettings({soundEnabled:!settings.soundEnabled});this.renderCurrentPage(false);});text(visual,'Hint','战斗、孵化和变异蛋会使用独立动画；低性能设备可关闭界面动效。',0,-58,560,40,14,CuteTheme.muted,'center',false);
        const info=panel(book,'Info',0,-285,630,210,CuteTheme.paperWarm,28,false,CuteTheme.caramelSoft,2);headingTag(info,'Title','本版本音频',-205,78,170,CuteTheme.paperWarm);text(info,'Text','家园：萌系开朗循环音乐\n普通战斗：轻快节奏音乐\nBOSS战：更有压迫感的独立音乐\n新音效：三种随机点击、确认、错误、物理、法术、治疗、护盾',-275,-10,550,140,16,CuteTheme.caramel,'left',false);
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

    private addNotificationBadge(parent: Node, count: number, x: number, y: number) {
        const value = Math.max(0, Math.floor(Number(count || 0)));
        if (!parent?.isValid || value <= 0) return;
        const badge = panel(parent, 'NotificationBadge', x, y, 34, 34, new Color(242, 86, 91, 255), 17, true, CuteTheme.white, 2);
        text(badge, 'Value', value > 99 ? '99+' : String(value), 0, 0, 30, 28, value > 9 ? 11 : 14, CuteTheme.white, 'center', true);
        if (CuteFeedback.animationEnabled()) {
            badge.setScale(new Vec3(0.92, 0.92, 1));
            tween(badge)
                .to(0.22, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
                .to(0.22, { scale: Vec3.ONE }, { easing: 'quadIn' })
                .start();
        }
    }

    private benefitNotificationCount() {
        let count = this.signInfo?.canSign ? 1 : 0;
        const task = this.dailyTask?.data || this.dailyTask || {};
        if (task?.allCompleted && !task?.rewardClaimed) count += 1;
        count += this.achievements.filter((item) => item?.completed && !item?.claimed).length;
        return count;
    }

    private hatchNotificationCount() {
        return GameStore.eggs.filter((egg) => {
            const status = String(egg?.status || '');
            return status !== 'hatched' && (Boolean(egg?.canHatch) || (['incubating', 'hatching', 'unhatched'].includes(status) && Number(egg?.remainingSeconds || 0) <= 0));
        }).length;
    }

    private pageNotificationCount(page: PageName) {
        switch (page) {
            case 'benefits':
                return this.benefitNotificationCount();
            case 'hatchery':
                return this.hatchNotificationCount();
            case 'friends':
                return this.incomingFriendRequests.filter((item) => String(item?.status || 'pending') === 'pending').length;
            case 'marriage': {
                const myId = Number(GameStore.user?.id || 0);
                return this.marriageProposals.filter((item) => {
                    if (String(item?.status || 'pending') !== 'pending') return false;
                    const targetId = Number(item?.targetUserId || 0);
                    return !myId || !targetId || targetId === myId;
                }).length;
            }
            case 'mail':
                return Math.max(this.mailUnreadCount, this.mailClaimableCount);
            default:
                return 0;
        }
    }

    private totalNotificationCount() {
        return Math.min(99, ['benefits', 'hatchery', 'friends', 'marriage', 'mail']
            .reduce((sum, page) => sum + this.pageNotificationCount(page as PageName), 0));
    }

    private startGuide(force: boolean) {
        if (!force && !CuteGuideState.shouldAutoStart()) return;
        this.guideActive = true;
        this.guideStepIndex = 0;
        this.applyGuideStep();
    }

    private applyGuideStep() {
        const step = CuteGuideState.steps[this.guideStepIndex];
        if (!step) {
            this.finishGuide();
            return;
        }
        this.detailSkill = null;
        this.hatchAcceleratorOpen = false;
        this.showPage(step.page as PageName);
        this.renderGuide();
    }

    private nextGuideStep() {
        if (!this.guideActive) return;
        this.guideStepIndex += 1;
        if (this.guideStepIndex >= CuteGuideState.steps.length) {
            this.finishGuide();
            return;
        }
        CuteFeedback.playSuccess();
        this.applyGuideStep();
    }

    private skipGuide() {
        CuteGuideState.markCompleted();
        this.guideActive = false;
        this.renderGuide();
        this.showPage('home');
        this.showToast('可以随时在设置中重播新手引导');
    }

    private finishGuide() {
        CuteGuideState.markCompleted();
        this.guideActive = false;
        this.renderGuide();
        CuteFeedback.playSuccess();
        this.showPage('home');
        this.showToast('欢迎入住萌宠手账屋！');
    }

    private renderGuide() {
        if (!this.guideLayer) return;
        clearNode(this.guideLayer);
        this.guideLayer.active = this.guideActive;
        if (!this.guideActive) return;
        if (!this.guideLayer.getComponent(BlockInputEvents)) this.guideLayer.addComponent(BlockInputEvents);

        const step: CuteGuideStep | undefined = CuteGuideState.steps[this.guideStepIndex];
        if (!step) return;
        panel(this.guideLayer, 'GuideDim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(73, 45, 30, 76), 0, false, CuteTheme.transparent, 0);

        const marker = panel(this.guideLayer, 'FocusMarker', step.focusX, step.focusY, 78, 78, new Color(255, 248, 216, 225), 39, true, CuteTheme.honey, 5);
        text(marker, 'Arrow', step.focusIcon || '👇', 0, 0, 62, 62, 34, CuteTheme.honeyDark, 'center', true);
        if (CuteFeedback.animationEnabled()) {
            tween(marker)
                .repeatForever(
                    tween(marker)
                        .to(0.45, { scale: new Vec3(1.10, 1.10, 1) }, { easing: 'quadOut' })
                        .to(0.45, { scale: Vec3.ONE }, { easing: 'quadIn' }),
                )
                .start();
        }

        const progressText = `第 ${this.guideStepIndex + 1} / ${CuteGuideState.steps.length} 步`;
        const progressCard = panel(this.guideLayer, 'GuideProgress', 0, 520, 220, 48, new Color(255, 250, 232, 245), 22, true, CuteTheme.white, 2);
        text(progressCard, 'Text', progressText, 0, 0, 190, 32, 14, CuteTheme.caramel, 'center', true);

        const card = panel(this.guideLayer, 'GuideCard', 0, -355, 640, 270, new Color(255, 250, 232, 252), 38, true, CuteTheme.caramelSoft, 4);
        text(card, 'Mascot', step.icon, -258, 52, 90, 90, 52, CuteTheme.caramel, 'center', true);
        text(card, 'Title', step.title, -185, 76, 430, 42, 25, CuteTheme.caramel, 'left', true);
        text(card, 'Description', step.description, -185, 5, 430, 100, 16, CuteTheme.muted, 'left', false);
        button(card, 'Skip', '跳过', -195, -91, 150, 52, () => this.skipGuide(), {
            fill: CuteTheme.paperWarm,
            fontSize: 14,
            radius: 22,
        });
        const finalStep = this.guideStepIndex === CuteGuideState.steps.length - 1;
        button(card, 'Next', finalStep ? '开始冒险' : '下一步', 150, -91, 210, 56, () => this.nextGuideStep(), {
            icon: finalStep ? '🎉' : '🐾',
            fill: finalStep ? CuteTheme.honey : CuteTheme.mint,
            fontSize: 15,
            radius: 24,
        });
        if (CuteFeedback.animationEnabled()) {
            card.setScale(new Vec3(0.94, 0.94, 1));
            tween(card).to(0.20, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        }
    }

    private renderSecondaryPage(page: PageName) {
        if (!this.pageRoot) return;
        const root = this.pageRoot;
        const title = this.titleForPage(page);


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
        this.captureScrollOffsets(this.utilityLayer);
        clearNode(this.utilityLayer);
        const active = Boolean(this.inventoryDetailItem) || this.hatchAcceleratorOpen || this.homePetPickerOpen || Boolean(this.fusionPickerSide) || Boolean(this.pendingIncubation) || this.fusionConfirmOpen;
        this.utilityLayer.active = active;
        if (!active) return;
        if (!this.utilityLayer.getComponent(BlockInputEvents)) this.utilityLayer.addComponent(BlockInputEvents);

        const dim = panel(this.utilityLayer, 'Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(73, 45, 30, 118), 0, false, CuteTheme.transparent, 0);
        dim.on(Node.EventType.TOUCH_END, () => this.closeUtilityModal());

        if (this.inventoryDetailItem) {
            const item = this.inventoryDetailItem;
            const skillBook = this.isSkillBook(item);
            const usable = Boolean(item?.usable) && !skillBook;
            const targetPet = this.inventoryTargetPet();
            const card = panel(this.utilityLayer, 'ItemDetailDialog', 0, 0, 560, 560, new Color(255, 250, 235, 255), 34, true, CuteTheme.caramelSoft, 4);
            headingTag(card, 'Title', '物品详情', 0, 232, 160, CuteTheme.mint);
            drawUiIcon(card, 'ItemIcon', skillBook ? 'skills' : usable ? 'inventory' : 'collection', 0, 142, 66, skillBook ? CuteTheme.peachDark : usable ? CuteTheme.mintDark : CuteTheme.honeyDark);
            text(card, 'Name', safeName(item?.name || item?.itemCode, '道具'), 0, 78, 450, 42, 24, CuteTheme.caramel, 'center', true);
            tag(card, 'Count', `拥有 ×${Number(item?.quantity || 0)}`, 0, 34, 120, CuteTheme.paperWarm);
            text(card, 'Description', safeName(item?.description, '暂无详细说明'), 0, -42, 450, 96, 16, CuteTheme.muted, 'center');
            text(card, 'Target', usable
                ? `使用对象：${targetPet ? safeName(targetPet?.nickname, '宠物') : '暂无宠物'}`
                : skillBook ? '该物品需要前往技能页面使用' : '材料类物品不能直接使用', 0, -118, 440, 38, 14, usable ? CuteTheme.mintDark : CuteTheme.muted, 'center', true);
            button(card, 'Cancel', '关闭', -100, -214, 170, 54, () => this.closeUtilityModal(), { fill: CuteTheme.paperWarm, fontSize: 15, radius: 22 });
            button(card, 'Confirm', skillBook ? '前往打书' : usable ? '确认使用' : '暂不可用', 105, -214, 180, 54, () => {
                if (skillBook) {
                    this.selectedSkillBookCode = String(item?.itemCode || '');
                    this.closeUtilityModal();
                    this.showPage('skills');
                } else if (usable) {
                    this.inventoryDetailItem = null;
                    this.renderUtilityModal();
                    void this.useInventoryItem(item);
                }
            }, { fill: skillBook ? CuteTheme.honey : usable ? CuteTheme.mint : new Color(216, 211, 199, 255), fontSize: 15, radius: 22, disabled: !skillBook && (!usable || !targetPet) });
            return;
        }

        if (this.homePetPickerOpen) {
            const card = panel(this.utilityLayer, 'HomePetPicker', 0, 0, 640, 900, new Color(255, 250, 232, 255), 38, true, CuteTheme.caramelSoft, 4);
            headingTag(card, 'Title', '选择心仪宝宝', 0, 388, 210, CuteTheme.peach);
            text(card, 'Hint', '当前出战宝宝优先显示；选择后点击确认才会更换家园宝宝。', 0, 342, 560, 36, 15, CuteTheme.muted, 'center', true);
            const pets = this.filteredPetList();
            const rows = Math.max(1, Math.ceil(pets.length / 3));
            const area = this.createScrollArea(card, 'PickerScroll', 0, 20, 590, 600, 590, Math.max(600, rows * 132 + 10), 'vertical');
            pets.forEach((pet,index)=>{
                const id=Number(pet?.id||0); const col=index%3,row=Math.floor(index/3); const chosen=id===this.pendingHomePetId;
                const item=button(area.content,`Pet_${id}`,safeName(pet?.nickname,`宝宝${index+1}`),-196+col*196,-58-row*132,182,116,()=>{this.pendingHomePetId=id;this.renderUtilityModal();},{iconPath:getPetArtPath(pet,'thumb'),iconSize:64,selected:chosen,fill:chosen?CuteTheme.honey:CuteTheme.paperWarm,fontSize:14,radius:23,subtitle:`${this.rarityName(pet)} · Lv.${Number(pet?.level||1)} · ${formatNumber(this.battleAttributesOf(pet).power)}`});
                const teamIndex=this.teamPetIds.indexOf(id); if(teamIndex>=0)tag(item,'Team',`⚔${teamIndex+1}`,55,45,48,CuteTheme.mint);
                if(pet?.isLocked)tag(item,'Lock','🔒',-56,45,40,CuteTheme.paperWarm);
            });
            button(card,'Cancel','取消',-105,-392,180,58,()=>this.closeUtilityModal(),{fill:CuteTheme.paperWarm,fontSize:16,radius:25});
            button(card,'Confirm','确认更换',105,-392,190,58,()=>{if(this.pendingHomePetId)this.setHomePet(this.pendingHomePetId);this.closeUtilityModal();},{icon:'♥',fill:CuteTheme.peach,fontSize:16,radius:25,disabled:!this.pendingHomePetId});
            return;
        }

        if (this.fusionPickerSide) {
            const side=this.fusionPickerSide;
            const otherId=side==='A'?this.fusionParentBId:this.fusionParentAId;
            const card=panel(this.utilityLayer,'FusionPicker',0,0,650,920,new Color(255,250,232,255),38,true,CuteTheme.caramelSoft,4);
            headingTag(card,'Title',side==='A'?'选择父系宝宝':'选择母系宝宝',0,398,220,side==='A'?CuteTheme.mint:CuteTheme.peach);
            text(card,'Hint','锁定、寄售、已婚或正在出战的宝宝不可用于炼妖。',0,354,570,34,15,CuteTheme.muted,'center',true);
            const teamIds=new Set(this.teamPetIds.map(Number));
            const pets=GameStore.pets.filter((pet)=>!pet?.isEgg);
            const rows=Math.max(1,Math.ceil(pets.length/2));
            const area=this.createScrollArea(card,'FusionPetScroll',0,12,604,650,604,Math.max(650,rows*144+10),'vertical');
            pets.forEach((pet,index)=>{
                const id=Number(pet?.id||0); const invalid=id===otherId||pet?.isLocked||pet?.tradeStatus==='listed'||pet?.tradeListingId||pet?.married||pet?.marriedPetId||teamIds.has(id);
                const reason=id===otherId?'另一侧已选择':pet?.isLocked?'已锁定':(pet?.tradeStatus==='listed'||pet?.tradeListingId)?'寄售中':(pet?.married||pet?.marriedPetId)?'已婚':teamIds.has(id)?'出战中':'';
                const col=index%2,row=Math.floor(index/2);
                const item=panel(area.content,`FusionPet_${id}`,-151+col*302,-66-row*144,286,132,invalid?new Color(228,226,218,255):CuteTheme.paperWarm,23,true,invalid?CuteTheme.caramelSoft:CuteTheme.white,2);
                image(item,'Art',getPetArtPath(pet,'thumb'),-98,18,74,74,CuteTheme.paperWarm);
                text(item,'Name',safeName(pet?.nickname,'宝宝'),-52,40,178,28,16,CuteTheme.caramel,'left',true);
                text(item,'Meta',`${this.rarityName(pet)}${pet?.isMutant?'·变异':''} · 成长${this.growthValue(pet).toFixed(3)}`,-52,8,180,26,13,CuteTheme.muted,'left',true);
                text(item,'Skills',`技能${Array.isArray(pet?.skills)?pet.skills.length:0} 特殊${this.specialSkills(pet).length} · 战力${formatNumber(this.battleAttributesOf(pet).power)}`,-52,-24,190,26,12,CuteTheme.muted,'left',true);
                button(item,'Choose',invalid?reason:'选择',74,-44,100,34,()=>{if(invalid)return;if(side==='A')this.fusionParentAId=id;else this.fusionParentBId=id;this.closeUtilityModal();this.renderCurrentPage(false);},{fill:invalid?new Color(210,208,202,255):(side==='A'?CuteTheme.mint:CuteTheme.peach),fontSize:11,radius:15,disabled:invalid});
            });
            button(card,'Close','关闭',0,-410,170,54,()=>this.closeUtilityModal(),{fill:CuteTheme.paperWarm,fontSize:15,radius:23});
            return;
        }

        if (this.pendingIncubation) {
            const egg=this.pendingIncubation.egg;
            const card=panel(this.utilityLayer,'IncubationConfirm',0,0,570,600,new Color(255,250,232,255),38,true,CuteTheme.caramelSoft,4);
            headingTag(card,'Title','确认孵化',0,246,170,CuteTheme.honey);
            image(card,'Egg',getEggArtPath(egg),0,118,120,150,CuteTheme.paperWarm);
            text(card,'Name',getEggDisplayName(egg),0,32,480,42,22,CuteTheme.caramel,'center',true);
            text(card,'Time',`预计时间：${this.formatEggDuration(egg)}`,0,-10,440,34,17,CuteTheme.muted,'center',true);
            const occupied=new Set(GameStore.eggs.filter((item)=>['incubating','hatching'].includes(String(item?.status||''))).map((item)=>Number(item?.incubatorSlot||0)));
            text(card,'SlotTitle','选择孵化装置',0,-70,420,34,17,CuteTheme.caramel,'center',true);
            [1,2,3].forEach((slot,index)=>button(card,`Slot_${slot}`,`${slot}号`, -140+index*140,-120,110,48,()=>{this.pendingIncubation={egg,slot};this.renderUtilityModal();},{selected:this.pendingIncubation?.slot===slot,fill:occupied.has(slot)?new Color(212,210,204,255):this.pendingIncubation?.slot===slot?CuteTheme.honey:CuteTheme.paperWarm,fontSize:14,radius:20,disabled:occupied.has(slot)}));
            text(card,'Warning','确认后开始计时；变异蛋不会额外延长孵化时间。',0,-178,460,34,14,CuteTheme.peachDark,'center',true);
            button(card,'Cancel','取消',-105,-238,170,54,()=>this.closeUtilityModal(),{fill:CuteTheme.paperWarm,fontSize:15,radius:23});
            button(card,'Confirm','开始孵化',105,-238,180,54,()=>void this.startEggIncubationNow(egg,this.pendingIncubation?.slot||0),{icon:'🥚',fill:CuteTheme.honey,fontSize:15,radius:23,disabled:!this.pendingIncubation?.slot});
            return;
        }

        if (this.fusionConfirmOpen) {
            const a=GameStore.pets.find((pet)=>Number(pet?.id)===this.fusionParentAId); const b=GameStore.pets.find((pet)=>Number(pet?.id)===this.fusionParentBId);
            const coreCount=this.inventoryQuantity('fusion_core');const essenceCount=this.inventoryQuantity('mutation_essence');
            const card=panel(this.utilityLayer,'FusionConfirm',0,0,620,700,new Color(255,250,232,255),38,true,CuteTheme.caramelSoft,4);
            headingTag(card,'Title','最终确认',0,300,160,CuteTheme.peach);
            text(card,'Warning','炼妖会永久消耗以下两只宝宝，且操作不可撤销。',0,252,520,42,17,CuteTheme.peachDark,'center',true);
            [a,b].forEach((pet,index)=>{const x=index===0?-145:145;const box=panel(card,`Parent_${index}`,x,60,250,260,CuteTheme.paperWarm,26,true,CuteTheme.white,2);image(box,'Art',getPetArtPath(pet,'thumb'),0,72,96,96,CuteTheme.paperWarm);text(box,'Name',safeName(pet?.nickname,'宝宝'),0,8,220,34,20,CuteTheme.caramel,'center',true);text(box,'Meta',`${this.rarityName(pet)} · 成长${this.growthValue(pet).toFixed(3)}
技能${Array.isArray(pet?.skills)?pet.skills.length:0} · 特殊${this.specialSkills(pet).length}`,0,-48,220,62,14,CuteTheme.muted,'center',false);});
            const cost=panel(card,'Cost',0,-118,550,90,new Color(248,243,224,255),22,false,CuteTheme.honey,2);
            text(cost,'Auto','系统已自动放入',-252,24,180,26,14,CuteTheme.caramel,'left',true);
            tag(cost,'Gold',`金币 1000`, -168,-18,128,Number(GameStore.user?.gold||0)>=1000?CuteTheme.mint:CuteTheme.peach);
            tag(cost,'Core',`核心 1/${coreCount}`,-30,-18,128,coreCount>=1?CuteTheme.mint:CuteTheme.peach);
            button(cost,'Essence',this.fusionUseMutationEssence?`✓ 精华 1/${essenceCount}`:`＋ 不用精华`,162,-7,190,54,()=>this.toggleFusionMutationEssence(),{selected:this.fusionUseMutationEssence,fill:this.fusionUseMutationEssence?CuteTheme.lilac:CuteTheme.paperWarm,fontSize:13,radius:20,subtitle:'可选 · 变异率+3%'});
            text(card,'EssenceHint',this.fusionUseMutationEssence?'本次会额外消耗1个变异精华':'本次不消耗变异精华',0,-184,500,28,14,this.fusionUseMutationEssence?CuteTheme.peachDark:CuteTheme.muted,'center',true);
            button(card,'Cancel','返回检查',-110,-276,180,56,()=>{this.fusionConfirmOpen=false;this.renderUtilityModal();},{fill:CuteTheme.paperWarm,fontSize:15,radius:24});
            button(card,'Confirm','确认炼妖',110,-276,190,56,()=>{this.fusionConfirmOpen=false;this.renderUtilityModal();void this.executeFusion();},{icon:'🔮',fill:CuteTheme.peach,fontSize:16,radius:24});
            return;
        }

        const activeEgg=GameStore.eggs.find((egg)=>Number(egg?.id||0)===this.hatchAcceleratorEggId)||GameStore.eggs.find((egg)=>['incubating','hatching'].includes(String(egg?.status||'')))||null;
        if(!activeEgg){this.closeUtilityModal();return;}
        const card=panel(this.utilityLayer,'AcceleratorCard',0,0,590,620,new Color(255,250,232,255),38,true,CuteTheme.caramelSoft,4);
        headingTag(card,'Title','孵化加速',0,258,160,CuteTheme.sky);
        text(card,'Egg',`${getEggDisplayName(activeEgg)} · ${Number(activeEgg?.incubatorSlot||1)}号装置`,0,214,500,34,18,CuteTheme.caramel,'center',true);
        text(card,'Hint',`剩余 ${this.formatSeconds(Number(activeEgg?.remainingSeconds||0))}，选择道具立即减少时间。`,0,176,500,34,15,CuteTheme.muted,'center',true);
        const items=this.hatchAcceleratorItems();
        if(!items.length){text(card,'Empty','背包中没有孵化加速道具',0,20,420,80,20,CuteTheme.muted,'center',true);}else items.slice(0,5).forEach((item,index)=>{const y=110-index*72;const seconds=Number(item?.effectValue||item?.effectData?.seconds||0);const row=panel(card,`Accelerator_${item?.itemCode||index}`,0,y,520,62,index%2===0?CuteTheme.paper:CuteTheme.sky,20,false,CuteTheme.white,2);text(row,'Name',safeName(item?.name,'孵化沙漏'),-220,11,250,26,16,CuteTheme.caramel,'left',true);text(row,'Effect',`减少 ${this.formatSeconds(seconds)}`,-220,-14,250,24,12,CuteTheme.muted,'left',true);tag(row,'Count',`×${Number(item?.quantity||0)}`,105,0,64,CuteTheme.paperWarm);button(row,'Use','使用',205,0,78,40,()=>void this.useHatchAccelerator(activeEgg,item),{fill:CuteTheme.honey,fontSize:13,radius:18,disabled:this.busy.has(`hatch-accelerate:${item?.itemCode}`)});});
        button(card,'Close','关闭',0,-258,150,52,()=>this.closeUtilityModal(),{fill:CuteTheme.paperWarm,fontSize:15,radius:22});
    }

    private openHatchAccelerator(egg?: any) {
        const activeEgg=egg||GameStore.eggs.find((item)=>['incubating','hatching'].includes(String(item?.status||'')));
        if(!activeEgg){this.showToast('请先放入一枚宠物蛋');return;}
        this.hatchAcceleratorEggId=Number(activeEgg?.id||0);
        this.hatchAcceleratorOpen=true;
        this.renderUtilityModal();
    }

    private closeUtilityModal() {
        this.hatchAcceleratorOpen=false;
        this.hatchAcceleratorEggId=0;
        this.homePetPickerOpen=false;
        this.inventoryDetailItem=null;
        this.fusionPickerSide=null;
        this.pendingIncubation=null;
        this.fusionConfirmOpen=false;
        this.renderUtilityModal();
    }

    private closeHatchAccelerator() { this.closeUtilityModal(); }

    private openHomePetPicker() {
        this.pendingHomePetId=Number(this.homePetId||GameStore.currentPetId||0);
        this.homePetPickerOpen=true;
        this.renderUtilityModal();
    }

    private openFusionPicker(side:'A'|'B') {
        this.fusionPickerSide=side;
        this.renderUtilityModal();
    }

    private inventoryQuantity(itemCode:string) {
        const item=GameStore.inventory.find((entry)=>String(entry?.itemCode||'').toLowerCase()===String(itemCode||'').toLowerCase());
        return Math.max(0,Number(item?.quantity||0));
    }

    private toggleFusionMutationEssence() {
        if(!this.fusionUseMutationEssence&&this.inventoryQuantity('mutation_essence')<1){
            this.showToast('背包中没有变异精华，本次炼妖不会放入');
            void AudioDirector.playSfx('error');
            return;
        }
        this.fusionUseMutationEssence=!this.fusionUseMutationEssence;
        this.showToast(this.fusionUseMutationEssence?'已放入变异精华：本次变异率 +3%':'已取下变异精华：本次不会消耗');
        this.renderCurrentPage(false);
        this.renderUtilityModal();
    }

    private confirmFusionExecution() {
        const a=GameStore.pets.find((pet)=>Number(pet?.id)===this.fusionParentAId); const b=GameStore.pets.find((pet)=>Number(pet?.id)===this.fusionParentBId);
        if(!a||!b){this.showToast('请先精准选择两只宝宝');return;}
        if(a?.isLocked||b?.isLocked){this.showToast('锁定宝宝不能炼妖');return;}
        if(Number(GameStore.user?.gold||0)<1000){this.showToast('金币不足，需要1000金币');return;}
        if(this.inventoryQuantity('fusion_core')<1){this.showToast('背包中没有合宠核心');return;}
        if(this.fusionUseMutationEssence&&this.inventoryQuantity('mutation_essence')<1){this.fusionUseMutationEssence=false;this.showToast('背包中没有变异精华，已自动取消放入');this.renderCurrentPage(false);return;}
        this.fusionConfirmOpen=true;
        this.renderUtilityModal();
    }

    private requestIncubation(egg:any,slot:number) {
        const active=GameStore.eggs.filter((item)=>['incubating','hatching'].includes(String(item?.status||'')));
        if(active.length>=3){this.showToast('三台孵化装置都在使用中');return;}
        this.pendingIncubation={egg,slot};
        this.renderUtilityModal();
    }

    private async startEggIncubationNow(egg:any,slot:number) {
        const key=`hatch-start:${egg?.id}`;
        if(!egg?.id||!slot||this.busy.has(key))return;
        this.busy.add(key);
        try{
            const result=await ApiClient.post('/hatchery/start',{eggId:Number(egg.id),slot});
            if(result?.success===false){this.showToast(result?.message||'放入孵化装置失败');return;}
            const refreshed=await ApiClient.get('/hatchery/eggs');
            if(refreshed?.success!==false)GameStore.setList('eggs',refreshed);
            this.closeUtilityModal();
            CuteFeedback.playSuccess();
            void AudioDirector.playSfx('confirm');
            this.showToast(`${getEggDisplayName(egg)}已放入${slot}号装置`);
        }catch(error){console.error('[CuteMainUI] start incubation failed:',error);this.showToast('孵化装置连接失败');}
        finally{this.busy.delete(key);this.renderCurrentPage(false);}
    }

    private async useHatchAccelerator(egg:any,item:any) {
        const key=`hatch-accelerate:${item?.itemCode}`;
        if(!egg?.id||!item?.itemCode||this.busy.has(key))return;
        this.busy.add(key);
        try{
            const result=await ApiClient.post('/hatchery/accelerate',{eggId:Number(egg.id),itemCode:String(item.itemCode),quantity:1});
            if(result?.success===false){this.showToast(result?.message||'加速失败');return;}
            const [inventory,eggs]=await Promise.all([ApiClient.get('/inventory'),ApiClient.get('/hatchery/eggs')]);
            if(inventory?.success!==false)GameStore.setList('inventory',inventory);
            if(eggs?.success!==false)GameStore.setList('eggs',eggs);
            this.showToast(`已使用${safeName(item?.name,'孵化加速道具')}`);
            void AudioDirector.playSfx('confirm');
            this.closeUtilityModal();
        }catch(error){console.error('[CuteMainUI] accelerate hatch failed:',error);this.showToast('加速失败，请检查后端');}
        finally{this.busy.delete(key);this.renderCurrentPage(false);}
    }

    private async useInventoryItem(item: any) {
        const key = `inventory:${item?.id || item?.itemCode}`;
        if (!item?.itemCode || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/inventory/use', {
                itemCode: String(item.itemCode),
                quantity: 1,
                petId: Number(this.inventoryTargetPet()?.id || 0) || undefined,
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
            this.showToast(`${safeName(item?.name, '道具')}已对${safeName(this.inventoryTargetPet()?.nickname, '宝宝')}生效`);
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
            const newPet = result?.pet || result?.data?.pet || null;
            if (newPet && this.revealLayer) {
                showPetReveal(this.revealLayer, 'hatch', newPet, () => {
                    GameStore.selectPet(Number(newPet?.id || 0));
                    this.showPage('pet');
                });
            } else {
                this.showToast('孵化成功，新宝宝已加入宝宝列表');
            }
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
        if (pet?.isLocked) { this.showToast('锁定宝宝无法打书，请先解锁'); return; }
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
        const validIds = new Set(GameStore.pets
            .filter((pet) => !pet?.isEgg && pet?.tradeStatus !== 'listed' && !pet?.tradeListingId)
            .map((pet) => Number(pet?.id || 0)));
        if (!validIds.has(this.fusionParentAId)) this.fusionParentAId = 0;
        if (!validIds.has(this.fusionParentBId) || this.fusionParentBId === this.fusionParentAId) this.fusionParentBId = 0;
    }

    private fusionParentCard(parent: Node, name: string, title: string, pet: any, x: number, y: number, side: 'A' | 'B') {
        const card = panel(parent, name, x, y, 310, 374, CuteTheme.paper, 28, true, CuteTheme.white, 3);
        headingTag(card, 'Title', title, 0, 157, 132, side === 'A' ? CuteTheme.mint : CuteTheme.peach);
        if (pet) image(card, 'Portrait', getPetArtPath(pet, 'thumb'), -98, 84, 82, 82, pet?.isMutant ? CuteTheme.peach : CuteTheme.paperWarm);
        else text(card, 'PortraitFallback', '🐾', -98, 84, 82, 70, 46, CuteTheme.honeyDark, 'center', true);
        text(card, 'Name', pet ? safeName(pet?.nickname, '宝宝') : '未选择', -40, 112, 170, 34, 20, CuteTheme.caramel, 'left', true);
        text(card, 'Species', pet ? safeName(pet?.species, getPetSpeciesMeta(pet).name) : '请点击选择', -40, 82, 190, 26, 14, CuteTheme.caramel, 'left', true);
        text(card, 'Meta', pet ? `Lv.${Number(pet?.level||1)} · ${this.rarityName(pet)}${pet?.isMutant?' · 变异':''}` : '不会自动切换父母', -40, 54, 190, 26, 13, CuteTheme.muted, 'left', true);
        if (pet) {
            const apt=this.aptitudesOf(pet);
            text(card,'Growth',`成长 ${this.growthValue(pet).toFixed(3)}　品质 ${Number(pet?.quality||100)}`,-138,21,276,28,15,CuteTheme.caramel,'left',true);
            text(card,'Apt',`体 ${apt.hp}　攻 ${apt.attack}　防 ${apt.defense}
法 ${apt.magic}　速 ${apt.speed}`,-138,-23,276,50,13,CuteTheme.muted,'left',true);
            const skills=(Array.isArray(pet?.skills)?pet.skills:[]).map((skill:any)=>this.skillName(skill)).join('、');
            text(card,'SkillCount',`技能 ${Array.isArray(pet?.skills)?pet.skills.length:0}　特殊 ${this.specialSkills(pet).length}`,-138,-62,276,26,13,CuteTheme.peachDark,'left',true);
            text(card,'Skills',skills||'完整技能：暂无技能',-138,-108,276,64,12,CuteTheme.muted,'left',false);
            if(pet?.isLocked)tag(card,'Locked','🔒 已锁定',70,-145,104,CuteTheme.paperWarm);
        }
        button(card, 'Select', pet ? '重新选择' : '选择宝宝', 0, -164, 142, 44, () => this.openFusionPicker(side), { icon: '🔍', fill: side === 'A' ? CuteTheme.mint : CuteTheme.peach, fontSize: 13, radius: 20 });
    }

    private async executeFusion() {
        if (!this.fusionParentAId || !this.fusionParentBId || this.busy.has('fusion:execute')) return;
        if(this.inventoryQuantity('fusion_core')<1){this.showToast('背包中没有合宠核心');return;}
        if(this.fusionUseMutationEssence&&this.inventoryQuantity('mutation_essence')<1){this.fusionUseMutationEssence=false;this.showToast('背包中没有变异精华，本次炼妖已取消');return;}
        this.busy.add('fusion:execute');
        try {
            const result = await ApiClient.post('/fusion/execute', {
                parentAId: this.fusionParentAId,
                parentBId: this.fusionParentBId,
                requestId: `fusion-${Date.now()}-${this.fusionParentAId}-${this.fusionParentBId}`,
                useMutationEssence: this.fusionUseMutationEssence,
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
            this.fusionParentAId = 0;
            this.fusionParentBId = 0;
            this.fusionUseMutationEssence = false;
            this.ensureFusionParents();
            const fusedPet = result?.pet || result?.resultPet || result?.data?.pet || result?.offspring || null;
            if (fusedPet && this.revealLayer) {
                showPetReveal(this.revealLayer, 'fusion', fusedPet, () => {
                    GameStore.selectPet(Number(fusedPet?.id || 0));
                    this.showPage('pet');
                });
            } else {
                this.showToast('炼妖成功，新宝宝已生成');
            }
        } catch (error) {
            console.error('[CuteMainUI] fusion failed:', error);
            this.showToast('炼妖失败，请检查后端');
        } finally {
            this.busy.delete('fusion:execute');
            this.renderCurrentPage(false);
        }
    }

    private applyWorldExploration(result:any) {
        if(!result||result?.success===false)return;
        this.worldExploration=result?.world||result?.data?.world||result?.data||result;
        const regions=Array.isArray(this.worldExploration?.regions)?this.worldExploration.regions:[];
        const selected=regions.find((region:any)=>String(region?.code)===this.selectedRegionCode&&region?.unlocked)
            ||regions.find((region:any)=>String(region?.code)===String(this.worldExploration?.currentRegionCode)&&region?.unlocked)
            ||regions.find((region:any)=>region?.unlocked);
        if(selected?.code)this.selectedRegionCode=String(selected.code);
    }

    private applyTeamResult(result: any) {
        if(!result||result?.success===false)return;
        const team=result?.team||result?.data?.team||result?.data||result;
        const pets=Array.isArray(result?.pets)?result.pets:Array.isArray(team?.pets)?team.pets:[];
        const ids=Array.isArray(result?.petIds)?result.petIds:Array.isArray(team?.petIds)?team.petIds:pets.map((pet:any)=>pet?.id);
        this.teamPetIds=ids.map((id:any)=>Number(id||0)).filter((id:number)=>id>0).slice(0,5);
        this.selectedFormationCode=String(result?.formationCode||team?.formationCode||this.selectedFormationCode||'dragon');
        const rawSlots=Array.isArray(result?.slotAssignments)?result.slotAssignments:Array.isArray(team?.slotAssignments)?team.slotAssignments:[];
        this.teamSlotAssignments=rawSlots.map((id:any)=>Number(id||0)).filter((id:number)=>id>0).slice(0,5);
        if(this.teamSlotAssignments.length!==5)this.teamSlotAssignments=[...this.teamPetIds];
        const byId=new Map(GameStore.pets.map((pet)=>[Number(pet?.id||0),pet]));
        this.teamPets=this.teamSlotAssignments.map((id)=>pets.find((pet:any)=>Number(pet?.id||0)===id)||byId.get(id)).filter(Boolean);
    }

    private adventureTeamSlot(parent: Node, name: string, pet: any, x: number, y: number, index: number) {
        const slot=panel(parent,name,x,y,116,126,pet?new Color(255,250,232,255):new Color(242,235,218,255),20,false,pet?CuteTheme.honey:CuteTheme.caramelSoft,2);
        tag(slot,'Index',`${index}号`,0,48,62,pet?CuteTheme.mint:CuteTheme.paperWarm);
        if(!pet){text(slot,'Empty','＋',0,0,50,50,30,CuteTheme.muted,'center',true);return;}
        image(slot,'PetIcon',getPetArtPath(pet,'thumb'),0,12,58,58,CuteTheme.paperWarm);
        text(slot,'Name',this.compactPetName(pet),0,-28,106,24,12,CuteTheme.caramel,'center',true);
        text(slot,'Power',`${formatNumber(this.battleAttributesOf(pet).power)}`,0,-50,100,22,11,CuteTheme.muted,'center',true);
    }

    private teamPower() {
        return this.teamPets.reduce((sum, pet) => sum + this.battleAttributesOf(pet).power, 0);
    }

    private toggleTeamPet(petId: number) {
        if (!petId) return;
        if (this.teamPetIds.includes(petId)) {
            this.teamPetIds=this.teamPetIds.filter((id)=>id!==petId);
            this.teamSlotAssignments=this.teamSlotAssignments.map((id)=>Number(id)===petId?0:Number(id||0));
        } else if(this.teamPetIds.length<5) {
            this.teamPetIds.push(petId);
            this.normalizeTeamAssignments();
            const empty=this.teamSlotAssignments.findIndex((id)=>!Number(id));
            if(empty>=0)this.teamSlotAssignments[empty]=petId;
        } else this.showToast('五宠编队最多5只宝宝');
        this.refreshTeamPetsFromSlots();
        this.renderCurrentPage(false);
    }

    private async saveTeam() {
        if (this.teamPetIds.length !== 5 || this.teamSlotAssignments.filter(Boolean).length !== 5 || this.busy.has('team:save')) { this.showToast('请完整选择5只宝宝'); return; }
        this.busy.add('team:save');
        try {
            const result=await ApiClient.post('/team/set',{petIds:this.teamPetIds,formationCode:this.selectedFormationCode,slotAssignments:[...this.teamSlotAssignments],tactics:{focusPriority:'lowestHp',guardTarget:'healer',shieldThreshold:60,cleansePriority:['control','healBlock','dot'],ultimatePolicy:'ready'}});
            if(result?.success===false){this.showToast(result?.message||'编队保存失败');return;}
            this.applyTeamResult(result);this.teamEditing=false;this.teamEditSnapshot=null;this.formationSelectedCandidateId=0;this.showToast('五宠阵法编队已保存');void AudioDirector.playSfx('confirm');
        }catch(error){console.error('[CuteMainUI] save team failed:',error);this.showToast('编队保存失败，请检查后端');}
        finally{this.busy.delete('team:save');this.renderCurrentPage(false);}
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
        if(this.teamPetIds.length!==5){this.showToast('五宠战斗需要完整5只宝宝');return;}
        if(!this.battleLayer)return;
        this.lastBattleMode=mode;
        this.battleResult=null;
        showFivePetBattle(this.battleLayer,{
            mode:mode==='friend'?'arena':mode==='tower'?'tower':'pve',
            title:mode==='tower'?'爬塔首领战':mode==='friend'?'竞技切磋':'区域冒险',
            formationCode:this.selectedFormationCode,
            onClose:()=>{this.showPage('adventure');void this.refreshAfterBattle();},
            onComplete:()=>{void this.refreshAfterBattle();},
        });
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
        if (!this.battleResult) {
            clearNode(this.battleLayer);
            this.battleLayer.active = false;
            return;
        }
        if (this.battleLayer.children.length > 0) return;
        showBattlePlayback(this.battleLayer, {
            title: this.battleTitle || '萌宠对战',
            result: this.battleResult,
            playerTeam: this.teamPets,
            onClose: () => this.closeBattleResult(),
            onReplay: () => void this.startAdventureBattle(this.lastBattleMode),
        });
    }

    private closeBattleResult() {
        this.battleResult = null;
        this.battleTitle = '';
        if (this.battleLayer) { clearNode(this.battleLayer); this.battleLayer.active = false; }
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
        const bubble = panel(this.loadingLayer, 'Bubble', 0, 0, 390, 150, CuteTheme.paper, 38, true, CuteTheme.white, 3);
        text(bubble, 'Message', message, 0, -34, 340, 42, 18, CuteTheme.caramel, 'center', true);
        [-62, 0, 62].forEach((x, index) => {
            text(bubble, `Paw_${index}`, '🐾', x, 34, 56, 52, 27, index === 1 ? CuteTheme.honeyDark : CuteTheme.mintDark, 'center', true);
            const paw = bubble.getChildByName(`Paw_${index}`);
            if (paw && CuteFeedback.animationEnabled()) {
                paw.setScale(new Vec3(0.84, 0.84, 1));
                tween(paw)
                    .delay(index * 0.10)
                    .repeatForever(
                        tween(paw)
                            .to(0.28, { scale: new Vec3(1.10, 1.10, 1) }, { easing: 'quadOut' })
                            .to(0.28, { scale: new Vec3(0.84, 0.84, 1) }, { easing: 'quadIn' }),
                    )
                    .start();
            }
        });
    }

    private showToast = (message: string) => {
        if (!this.toastLayer || !message) return;
        clearNode(this.toastLayer);

        const token = ++this.toastToken;
        const toast = panel(this.toastLayer, 'Toast', 0, 16, 590, 96, new Color(255, 250, 232, 248), 38, true, CuteTheme.white, 4);
        text(toast, 'Paw', '🐾', -252, 0, 48, 48, 27, CuteTheme.honeyDark, 'center', true);
        text(toast, 'Message', message, 20, 0, 492, 68, 20, CuteTheme.caramel, 'center', false);

        const opacity = toast.getComponent(UIOpacity) || toast.addComponent(UIOpacity);
        opacity.opacity = 0;
        toast.setScale(new Vec3(0.92, 0.92, 1));

        tween(opacity).to(0.18, { opacity: 255 }).delay(1.45).to(0.65, { opacity: 0 }, { easing: 'sineIn' }).call(() => {
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
        return attachments.map((item: any) => item?.type === 'gold' ? `金币×${item?.quantity}` : item?.type === 'diamond' ? `钻石×${item?.quantity}` : `${this.itemDisplayName(item?.itemCode)}×${item?.quantity}`).join(' · ');
    }

    private itemDisplayName(itemCode: any) {
        const code = String(itemCode || '').toLowerCase();
        const known: Record<string, string> = {
            pet_capacity_ticket: '宝宝扩容券', season_token: '赛季徽记',
            hatch_accelerator: '孵化沙漏', fusion_stone: '炼妖石',
        };
        return known[code] || safeName(itemCode, '道具');
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


    private filteredShopItems() {
        const items = Array.isArray((GameStore as any).shopItems) ? (GameStore as any).shopItems : [];
        if (this.shopCategory === 'featured') return items;
        if (this.shopCategory === 'skills') return items.filter((item) => this.isSkillBook(item));
        if (this.shopCategory === 'hatch') return items.filter((item) => {
            const value = `${item?.type || ''} ${item?.itemCode || ''} ${item?.effect || ''}`.toLowerCase();
            return /egg|hatch|incubat|accelerat/.test(value);
        });
        if (this.shopCategory === 'special') return items.filter((item) => {
            const value = `${item?.type || ''} ${item?.itemCode || ''}`.toLowerCase();
            return String(item?.currencyType || '') === 'diamond' || /special|limited|vip/.test(value);
        });
        if (this.shopCategory === 'nurture') return items.filter((item) => {
            const type = String(item?.type || '').toLowerCase();
            const effect = String(item?.effect || '').toLowerCase();
            return ['food', 'potion', 'capacity', 'clean'].includes(type) || /hunger|happiness|clean|exp|capacity/.test(effect);
        });
        return items.filter((item) => {
            const type = String(item?.type || '').toLowerCase();
            const value = `${type} ${item?.itemCode || ''} ${item?.effect || ''}`.toLowerCase();
            return !this.isSkillBook(item)
                && !['food', 'potion', 'capacity', 'clean'].includes(type)
                && !/egg|hatch|incubat|accelerat|special|limited|vip/.test(value);
        });
    }

    private ensureSelectedShopItem() {
        const list = this.filteredShopItems();
        if (!list.some((item) => Number(item?.id || 0) === this.selectedShopItemId)) {
            this.selectedShopItemId = Number(list[0]?.id || 0);
        }
    }

    private selectedShopItem() {
        return (Array.isArray((GameStore as any).shopItems) ? (GameStore as any).shopItems : []).find((item) => Number(item?.id || 0) === this.selectedShopItemId) || null;
    }

    private shopItemColor(item: any) {
        if (this.isSkillBook(item)) return this.itemTier(item) === 'high' ? new Color(255, 224, 224, 255) : new Color(225, 246, 219, 255);
        const type = String(item?.type || '').toLowerCase();
        if (type === 'egg') return new Color(255, 239, 198, 255);
        if (type === 'potion') return CuteTheme.sky;
        if (type === 'food') return CuteTheme.mint;
        if (String(item?.currencyType || '') === 'diamond') return CuteTheme.lilac;
        return CuteTheme.paperWarm;
    }

    private changeShopBuyCount(delta: number) {
        this.shopBuyCount = Math.max(1, Math.min(99, this.shopBuyCount + delta));
        this.renderCurrentPage(false);
    }

    private async buySelectedShopItem() {
        const item = this.selectedShopItem();
        if (!item || this.busy.has('shop:buy')) return;
        this.busy.add('shop:buy');
        try {
            const result = await ApiClient.post('/shop/buy', {
                shopItemId: Number(item?.id || 0),
                itemCode: String(item?.itemCode || ''),
                count: this.shopBuyCount,
                requestId: this.requestId(`shop-${item?.id || item?.itemCode}`),
            });
            if (result?.success === false) return this.showToast(result?.message || '购买失败');
            CuteFeedback.playSuccess();
            this.showToast(`购买成功：${safeName(item?.name, '商品')} ×${this.shopBuyCount}`);
            this.shopBuyCount = 1;
            const [profile, inventory, eggs] = await Promise.all([
                ApiClient.get('/user/profile'),
                ApiClient.get('/inventory'),
                ApiClient.get('/hatchery/eggs'),
            ]);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            await this.syncEggItemsToHatchery();
        } finally {
            this.busy.delete('shop:buy');
            this.refreshAllVisuals();
        }
    }

    private async claimSignToday() {
        if (this.busy.has('benefit:sign')) return;
        this.busy.add('benefit:sign');
        try {
            const result = await ApiClient.post('/sign/today-beta', {});
            if (result?.success === false) return this.showToast(result?.message || '签到失败');
            CuteFeedback.playSuccess();
            this.showToast(`签到成功：${this.rewardSummary(result?.reward)}`);
            this.signInfo = await ApiClient.get('/sign');
            this.dailyTask = await ApiClient.get('/daily-task');
            const [profile, inventory, eggs] = await Promise.all([
                ApiClient.get('/user/profile'),
                ApiClient.get('/inventory'),
                ApiClient.get('/hatchery/eggs'),
            ]);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
            if (eggs?.success !== false) GameStore.setList('eggs', eggs);
            await this.syncEggItemsToHatchery();
        } finally {
            this.busy.delete('benefit:sign');
            this.refreshAllVisuals();
        }
    }

    private async claimDailyReward() {
        if (this.busy.has('benefit:daily')) return;
        this.busy.add('benefit:daily');
        try {
            const result = await ApiClient.post('/daily-task/reward', {});
            if (result?.success === false) return this.showToast(result?.message || '领取失败');
            CuteFeedback.playSuccess();
            this.showToast(`今日宝箱：${this.rewardSummary(result?.reward)}`);
            this.dailyTask = await ApiClient.get('/daily-task');
            const [profile, inventory] = await Promise.all([ApiClient.get('/user/profile'), ApiClient.get('/inventory')]);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
        } finally {
            this.busy.delete('benefit:daily');
            this.refreshAllVisuals();
        }
    }

    private async claimAchievement(item: any) {
        const key = `achievement:${item?.id}`;
        if (!item?.id || this.busy.has(key)) return;
        this.busy.add(key);
        try {
            const result = await ApiClient.post('/achievement/claim', { achievementId: Number(item.id) });
            if (result?.success === false) return this.showToast(result?.message || '领取失败');
            CuteFeedback.playSuccess();
            this.showToast(`成就奖励：${this.rewardSummary(result?.reward)}`);
            const [achievements, profile, inventory] = await Promise.all([
                ApiClient.get('/achievement/list'),
                ApiClient.get('/user/profile'),
                ApiClient.get('/inventory'),
            ]);
            this.achievements = this.resultList(achievements, ['achievements', 'data', 'items', 'list']);
            if (profile?.success !== false) GameStore.setProfile(profile);
            if (inventory?.success !== false) GameStore.setList('inventory', inventory);
        } finally {
            this.busy.delete(key);
            this.refreshAllVisuals();
        }
    }

    private achievementRewardText(item: any) {
        const type = String(item?.rewardType || '');
        const value = String(item?.rewardValue || '');
        if (type === 'gold') return `金币${value}`;
        if (type === 'diamond') return `钻石${value}`;
        if (type === 'item') {
            try {
                const parsed = JSON.parse(value || '{}');
                return Object.keys(parsed).map((key) => `${key}×${parsed[key]}`).join('、') || '道具奖励';
            } catch {
                return '道具奖励';
            }
        }
        return '成长奖励';
    }

    private statusLabel(status: any) {
        const labels: Record<string, string> = {
            pending: '待处理', accepted: '已通过', rejected: '已拒绝', cancelled: '已撤回', expired: '已过期', active: '进行中', sold: '已售出', claimed: '已领取', completed: '已完成', none: '无',
        };
        return labels[String(status || '').toLowerCase()] || safeName(status, '未知');
    }

    private ensureExperienceSelections() {
        const pets = GameStore.pets.filter((pet) => !pet?.isEgg);
        if (!pets.length) {
            this.inventoryTargetPetId = 0;
            this.homePetId = 0;
            return;
        }
        if (!pets.some((pet) => Number(pet?.id) === this.homePetId)) {
            this.homePetId = Number(GameStore.currentPet?.id || pets[0]?.id || 0);
            saveHomePetId(this.homePetId);
        }
        if (!pets.some((pet) => Number(pet?.id) === this.inventoryTargetPetId)) {
            this.inventoryTargetPetId = Number(GameStore.currentPet?.id || pets[0]?.id || 0);
        }
    }

    private homePet() {
        this.ensureExperienceSelections();
        return GameStore.pets.find((pet) => !pet?.isEgg && Number(pet?.id) === this.homePetId)
            || GameStore.currentPet
            || GameStore.pets.find((pet) => !pet?.isEgg)
            || {};
    }

    private setHomePet(id: number) {
        if (!id) return;
        this.homePetId = id;
        saveHomePetId(id);
        this.showToast('已设为家园心仪宝宝');
        this.renderCurrentPage(false);
    }

    private cycleHomePet() {
        const pets = GameStore.pets.filter((pet) => !pet?.isEgg);
        if (!pets.length) return;
        const current = pets.findIndex((pet) => Number(pet?.id) === this.homePetId);
        const next = pets[(current + 1 + pets.length) % pets.length];
        this.homePetId = Number(next?.id || 0);
        saveHomePetId(this.homePetId);
        this.renderCurrentPage(false);
    }

    private inventoryTargetPet() {
        this.ensureExperienceSelections();
        return GameStore.pets.find((pet) => !pet?.isEgg && Number(pet?.id) === this.inventoryTargetPetId) || null;
    }

    private cycleInventoryTarget(direction: number) {
        const pets = GameStore.pets.filter((pet) => !pet?.isEgg && String(pet?.tradeStatus || '') !== 'listed');
        if (!pets.length) return;
        const current = pets.findIndex((pet) => Number(pet?.id) === this.inventoryTargetPetId);
        const next = pets[(current + direction + pets.length) % pets.length];
        this.inventoryTargetPetId = Number(next?.id || 0);
        GameStore.selectPet(this.inventoryTargetPetId);
        this.renderCurrentPage(false);
    }

    private filteredPetList() {
        const teamOrder = new Map(this.teamPetIds.map((id, index) => [Number(id), index]));
        const list = GameStore.pets.filter((pet) => !pet?.isEgg).filter((pet) => {
            if (this.petFilter.rarity && Number(pet?.rarity || 1) !== this.petFilter.rarity) return false;
            const element = String(getPetSpeciesMeta(pet)?.element || '未知');
            return this.petFilter.element === 'all' || element === this.petFilter.element;
        });
        return list.sort((a, b) => {
            const ta = teamOrder.has(Number(a?.id)) ? Number(teamOrder.get(Number(a?.id))) : 99;
            const tb = teamOrder.has(Number(b?.id)) ? Number(teamOrder.get(Number(b?.id))) : 99;
            if (ta !== tb) return ta - tb;
            return this.battleAttributesOf(b).power - this.battleAttributesOf(a).power;
        });
    }

    private cyclePetRarityFilter() {
        this.petFilter.rarity = (this.petFilter.rarity + 1) % 7;
        savePetFilter(this.petFilter);
        this.renderCurrentPage(false);
    }

    private cyclePetElementFilter() {
        const elements: string[] = ['all', ...Array.from(new Set<string>(GameStore.pets.filter((pet) => !pet?.isEgg).map((pet) => String(getPetSpeciesMeta(pet)?.element || '未知'))))];
        const current = elements.indexOf(this.petFilter.element);
        this.petFilter.element = elements[(current + 1 + elements.length) % elements.length];
        savePetFilter(this.petFilter);
        this.renderCurrentPage(false);
    }

    private cyclePetSort() {
        const values = ['power', 'level', 'growth', 'skills'] as Array<'power' | 'level' | 'growth' | 'skills'>;
        this.petFilter.sort = values[(values.indexOf(this.petFilter.sort) + 1) % values.length];
        savePetFilter(this.petFilter);
        this.renderCurrentPage(false);
    }

    private petSortLabel() {
        return this.petFilter.sort === 'level' ? '等级' : this.petFilter.sort === 'growth' ? '成长' : this.petFilter.sort === 'skills' ? '技能数' : '战力';
    }

    private async togglePetLock(pet: any) {
        const petId=Number(pet?.id||0);
        if(!petId||this.busy.has(`pet-lock:${petId}`))return;
        this.busy.add(`pet-lock:${petId}`);
        try{
            const result=await ApiClient.post('/pet/lock',{petId,locked:!Boolean(pet?.isLocked)});
            if(result?.success===false){this.showToast(result?.message||'锁定状态修改失败');return;}
            const updated=result?.pet||result?.data||{...pet,isLocked:!Boolean(pet?.isLocked)};
            GameStore.updatePet(updated);
            this.showToast(updated?.isLocked?'宝宝已锁定':'宝宝已解锁');
            void AudioDirector.playSfx('confirm');
        }catch(error){console.error('[CuteMainUI] pet lock failed',error);this.showToast('锁定状态修改失败');}
        finally{this.busy.delete(`pet-lock:${petId}`);this.renderCurrentPage(false);}
    }

    private formatEggDuration(egg:any) {
        const seconds=Math.max(0,Number(egg?.hatchDurationSeconds||0));
        if(seconds<3600)return `${Math.max(1,Math.ceil(seconds/60))}分钟`;
        const hours=Math.ceil(seconds/3600);
        return `${hours}小时`;
    }

    private nodeContainsTouch(node:Node,event:any) {
        try{
            const location=event?.getUILocation?.()||event?.getLocation?.();
            const transform=node?.getComponent(UITransform);
            if(!location||!transform)return false;
            const point=new Vec2(Number(location.x||0),Number(location.y||0));
            if(transform.getBoundingBoxToWorld().contains(point))return true;
            const world=node.worldPosition;
            const scale=node.worldScale;
            const centerX=Number(world.x||0)+DESIGN_WIDTH/2;
            const centerY=Number(world.y||0)+DESIGN_HEIGHT/2;
            return Math.abs(point.x-centerX)<=transform.width*Math.abs(Number(scale.x||1))/2
                && Math.abs(point.y-centerY)<=transform.height*Math.abs(Number(scale.y||1))/2;
        }catch{return false;}
    }

    private formationEditorPositions(code:string):Array<[number,number]> {
        const map:Record<string,Array<[number,number]>>={
            dragon:[[0,52],[-188,10],[188,10],[-96,-55],[96,-55]],
            turtle:[[-160,50],[160,50],[0,8],[-150,-58],[150,-58]],
            crane:[[0,58],[-170,8],[170,8],[-155,-58],[155,-58]],
            tiger:[[-135,52],[135,52],[0,4],[-178,-58],[178,-58]],
            phoenix:[[0,58],[-178,14],[178,14],[-105,-58],[105,-58]],
        };
        return map[String(code)]||map.dragon;
    }

    private formationSlotRole(code:string,index:number) {
        const roles:Record<string,string[]>={
            dragon:['肉盾','物伤','物伤','法伤','治疗'],
            turtle:['肉盾','肉盾','辅助','输出','治疗'],
            crane:['先手','控制','输出','辅助','治疗'],
            tiger:['爆发','爆发','破甲','辅助','治疗'],
            phoenix:['法伤','法伤','控制','辅助','治疗'],
        };
        return (roles[String(code)]||roles.dragon)[index]||`${index+1}号位`;
    }

    private petRoleLabel(value:any) {
        const key=String(value||'').trim().toLowerCase();
        const labels:Record<string,string>={
            tank:'肉盾', healer:'治疗', cleanse:'净化', support:'辅助', control:'控制',
            physical:'物伤', physical_damage:'物伤', magic:'法伤', magic_damage:'法伤',
            burst:'爆发', defense:'防御', speed:'先手', balanced:'综合', hybrid:'综合',
        };
        return labels[key]||String(value||'综合');
    }

    private formationSlotBonus(code:string,index:number) {
        const bonuses:Record<string,string[]>={
            dragon:['减伤+12%','物攻+10%','暴击+8%','法攻+10%','治疗+12%'],
            turtle:['减伤+15%','防御+12%','抗控+10%','伤害+6%','治疗+10%'],
            crane:['速度+12%','命中+10%','伤害+8%','抗控+8%','治疗+8%'],
            tiger:['暴击+12%','伤害+10%','破防+10%','速度+6%','治疗+6%'],
            phoenix:['法攻+12%','暴击+10%','命中+8%','抗控+8%','治疗+10%'],
        };
        return (bonuses[String(code)]||bonuses.dragon)[index]||'属性加成';
    }

    private beginTeamEditing() {
        this.normalizeTeamAssignments();
        this.teamEditSnapshot = {
            petIds: [...this.teamPetIds],
            slots: [...this.teamSlotAssignments],
            formationCode: this.selectedFormationCode,
        };
        this.formationSelectedCandidateId = 0;
        this.teamDragMoved = false;
        this.teamEditing = true;
        this.renderCurrentPage(false);
    }

    private cancelTeamEditing() {
        if (this.teamEditSnapshot) {
            this.teamPetIds = [...this.teamEditSnapshot.petIds];
            this.teamSlotAssignments = [...this.teamEditSnapshot.slots];
            this.selectedFormationCode = this.teamEditSnapshot.formationCode;
            this.refreshTeamPetsFromSlots();
        }
        this.teamEditSnapshot = null;
        this.teamEditing = false;
        this.formationSelectedCandidateId = 0;
        this.teamDragMoved = false;
        this.clearFormationDropHighlight();
        this.renderCurrentPage(false);
    }

    private highlightFormationDropTarget(event:any) {
        const highlighted=this.formationSlotAtEvent(event);
        for (const [index,node] of this.formationSlotNodes.entries()) {
            const hit=index===highlighted;
            node.setScale(hit ? new Vec3(1.08,1.08,1) : Vec3.ONE);
        }
        return highlighted;
    }

    private moveTeamDrag(event:any) {
        if(this.teamDragSourceSlot<0&&this.teamDragPetId<=0)return;
        this.teamDragMoved=true;
        this.highlightFormationDropTarget(event);
    }

    private clearFormationDropHighlight() {
        for (const node of this.formationSlotNodes.values()) {
            if (node?.isValid) node.setScale(Vec3.ONE);
        }
    }

    private beginTeamDragFromEvent(event:any) {
        const directSlot=this.formationSlotAtEvent(event);
        if(directSlot>=0){this.teamDragSourceSlot=directSlot;this.teamDragPetId=0;this.teamDragMoved=false;return;}
        let target=event?.target as Node|null;
        while(target){
            const slotByTarget=[...this.formationSlotNodes.entries()].find(([,node])=>node===target);
            if(slotByTarget){this.teamDragSourceSlot=slotByTarget[0];this.teamDragPetId=0;this.teamDragMoved=false;return;}
            const petByTarget=[...this.formationCandidateNodes.entries()].find(([,node])=>node===target);
            if(petByTarget){this.teamDragPetId=petByTarget[0];this.teamDragSourceSlot=-1;this.teamDragMoved=false;return;}
            target=target.parent;
        }
        const slot=[...this.formationSlotNodes.entries()].find(([,node])=>this.nodeContainsTouch(node,event));
        if(slot){this.teamDragSourceSlot=slot[0];this.teamDragPetId=0;this.teamDragMoved=false;return;}
        const candidate=[...this.formationCandidateNodes.entries()].find(([,node])=>this.nodeContainsTouch(node,event));
        if(candidate){this.teamDragPetId=candidate[0];this.teamDragSourceSlot=-1;this.teamDragMoved=false;}
    }

    private finishTeamDrag(event:any) {
        if (!this.teamEditing) return;
        const petId=this.teamDragPetId;
        const source=this.teamDragSourceSlot;
        const moved=this.teamDragMoved;
        this.teamDragPetId=0;
        this.teamDragSourceSlot=-1;
        this.teamDragMoved=false;
        this.clearFormationDropHighlight();
        if (source>=0) {
            if(!moved)return;
            this.handleTeamSlotDrop(source,event);
            return;
        }
        if (petId>0) {
            if(!moved){
                this.formationSelectedCandidateId=this.formationSelectedCandidateId===petId?0:petId;
                void AudioDirector.playSfx('click_1');
                this.renderCurrentPage(false);
                return;
            }
            const pet=GameStore.pets.find((item)=>Number(item?.id||0)===petId);
            if (pet) this.handleTeamPetDrop(pet,event);
        }
    }

    private cancelTeamDrag() {
        this.teamDragPetId=0;
        this.teamDragSourceSlot=-1;
        this.teamDragMoved=false;
        this.clearFormationDropHighlight();
    }

    private normalizeTeamAssignments() {
        this.teamPetIds=[...new Set(this.teamPetIds.map(Number).filter((id)=>id>0))].slice(0,5);
        const valid=new Set(this.teamPetIds);
        const slots=Array.from({length:5},(_,index)=>Number(this.teamSlotAssignments[index]||0));
        const seen=new Set<number>();
        for(let i=0;i<slots.length;i+=1){
            const id=slots[i];
            if(!valid.has(id)||seen.has(id)){slots[i]=0;continue;}
            seen.add(id);
        }
        for(const id of this.teamPetIds){
            if(seen.has(id))continue;
            const empty=slots.findIndex((value)=>!value);
            if(empty>=0){slots[empty]=id;seen.add(id);}
        }
        this.teamSlotAssignments=slots;
        this.refreshTeamPetsFromSlots();
    }

    private refreshTeamPetsFromSlots() {
        const byId=new Map(GameStore.pets.map((pet)=>[Number(pet?.id||0),pet]));
        this.teamPets=this.teamSlotAssignments.map((id)=>byId.get(Number(id||0))).filter(Boolean);
    }

    private assignPetToFormationSlot(petId:number,target:number) {
        const id=Number(petId||0);
        if(!id||target<0||target>=5)return;
        const next=Array.from({length:5},(_,index)=>Number(this.teamSlotAssignments[index]||0));
        const source=next.findIndex((value)=>value===id);
        const replaced=Number(next[target]||0);
        if(source>=0&&source!==target){
            [next[source],next[target]]=[next[target],next[source]];
        }else if(source<0){
            next[target]=id;
            this.teamPetIds=this.teamPetIds.filter((value)=>Number(value)!==replaced&&Number(value)!==id);
            this.teamPetIds.push(id);
        }
        this.teamSlotAssignments=next;
        this.teamPetIds=[...new Set(next.filter((value)=>value>0))].slice(0,5);
        this.formationSelectedCandidateId=0;
        this.normalizeTeamAssignments();
        void AudioDirector.playSfx('confirm');
        this.showToast(`已放入${target+1}号阵位`);
        this.renderCurrentPage(false);
    }

    private handleTeamPetDrop(pet:any,event:any) {
        const id=Number(pet?.id||0); if(!id)return;
        const target=this.formationSlotAtEvent(event);
        if(target<0){this.toggleTeamPet(id);return;}
        if(!this.teamPetIds.includes(id)){
            if(this.teamPetIds.length>=5){
                const replaced=Number(this.teamSlotAssignments[target]||0);
                if(replaced)this.teamPetIds=this.teamPetIds.filter((value)=>Number(value)!==replaced);
            }
            this.teamPetIds.push(id);
        }
        this.normalizeTeamAssignments();
        const source=this.teamSlotAssignments.findIndex((value)=>Number(value)===id);
        const replaced=Number(this.teamSlotAssignments[target]||0);
        this.teamSlotAssignments[target]=id;
        if(source>=0&&source!==target)this.teamSlotAssignments[source]=replaced;
        this.refreshTeamPetsFromSlots();
        void AudioDirector.playSfx('confirm');
        this.renderCurrentPage(false);
    }

    private handleTeamSlotDrop(source:number,event:any) {
        const target=this.formationSlotAtEvent(event,source);
        if(target<0)return;
        const next=[...this.teamSlotAssignments];
        [next[source],next[target]]=[next[target],next[source]];
        this.teamSlotAssignments=next;
        this.refreshTeamPetsFromSlots();
        void AudioDirector.playSfx('confirm');
        this.renderCurrentPage(false);
    }

    private formationSlotAtEvent(event:any,exclude=-1) {
        const location=event?.getUILocation?.()||event?.getLocation?.();
        if(!location)return -1;
        const point=new Vec2(Number(location.x||0),Number(location.y||0));
        for(const [index,node] of this.formationSlotNodes.entries()){
            if(index===exclude||!node?.isValid)continue;
            const transform=node.getComponent(UITransform);
            if(transform?.hitTest(point)||this.nodeContainsTouch(node,event))return index;
        }
        const positions=this.formationEditorPositions(this.selectedFormationCode);
        return positions.findIndex(([x,y],index)=>index!==exclude
            && Math.abs(point.x-(DESIGN_WIDTH/2+x))<=58
            && Math.abs(point.y-(DESIGN_HEIGHT/2+125+y))<=58);
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
            collection: '宠物图鉴',
            profile: '玩家手账',
            settings: '游戏设置',
            benefits: '福利成长',
            formation: '五宠阵法',
            guild: '萌宠公会',
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
            collection: '📚',
            profile: '📒',
            settings: '⚙',
            benefits: '🎀',
            formation: '🐉',
            guild: '🏰',
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
            collection: '按种族、元素和稀有度浏览已发现与尚未发现的宠物。',
            profile: '玩家头像、等级、成就、容量和赛季记录会整理成一本个人手账。',
            settings: '可调整声音、点击反馈、动效与画质档位。',
            benefits: '签到、每日任务、成长成就、月卡与赛季战令会集中在福利中心。',
            formation: '五只宝宝根据阵型站位获得不同职责和阵法大招。',
            guild: '轻量异步公会，包含签到、捐献、任务、首领、远征和互助。',
        };
        return summaries[page] || '该页面将在后续萌系界面批次中完整接入。';
    }

    private rarityName(pet: any) {
        const name = String(pet?.rarityName || '').split(' ')[0];
        if (name) return name;
        const rarity = Number(pet?.rarity || 1);
        return ['普通', '优秀', '稀有', '史诗', '传说', '神话'][Math.max(0, Math.min(5, rarity - 1))];
    }

    private compactPetName(pet: any, fallback = '宝宝') {
        const value = safeName(pet?.nickname, fallback);
        let width = 0;
        let result = '';
        for (const char of value) {
            const next = /[\u0000-\u00ff]/.test(char) ? 1 : 2;
            if (width + next > 14) return `${result}…`;
            result += char;
            width += next;
        }
        return result;
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

    private fusionOutcomeRange(parentA:any,parentB:any) {
        const aptA=this.aptitudesOf(parentA); const aptB=this.aptitudesOf(parentB);
        const interval=(a:number,b:number,low=.9,high=1.1)=>`${Math.round(Math.min(a,b)*low)}～${Math.round(Math.max(a,b)*high)}`;
        const growthA=this.growthValue(parentA); const growthB=this.growthValue(parentB);
        const rarityA=Math.max(1,Number(parentA?.rarity||1)); const rarityB=Math.max(1,Number(parentB?.rarity||1));
        const rarityMin=Math.max(1,Math.min(rarityA,rarityB)-1); const rarityMax=Math.min(6,Math.max(rarityA,rarityB)+1);
        const skillsA=Array.isArray(parentA?.skills)?parentA.skills.length:0; const skillsB=Array.isArray(parentB?.skills)?parentB.skills.length:0;
        const slotsA=Math.max(2,Number(parentA?.skillSlotCount||skillsA||3)); const slotsB=Math.max(2,Number(parentB?.skillSlotCount||skillsB||3));
        const nameOf=(pet:any)=>safeName(pet?.species,getPetSpeciesMeta(pet).name);
        return {
            species:[...new Set([nameOf(parentA),nameOf(parentB)])],
            rarity:`${this.rarityName({rarity:rarityMin})}～${this.rarityName({rarity:rarityMax})}`,
            growth:`${Math.max(.8,Math.min(growthA,growthB)-.06).toFixed(3)}～${Math.min(1.5,Math.max(growthA,growthB)+.08).toFixed(3)}`,
            quality:interval(Number(parentA?.quality||100),Number(parentB?.quality||100),.92,1.08),
            skillSlots:`${Math.max(2,Math.min(slotsA,slotsB)-1)}～${Math.min(10,Math.max(slotsA,slotsB)+2)}`,
            skillCount:`${Math.max(1,Math.min(skillsA,skillsB)-1)}～${Math.min(10,Math.max(skillsA,skillsB)+2)}`,
            specialSkills:`0～${Math.min(3,this.specialSkills(parentA).length+this.specialSkills(parentB).length+1)}`,
            mutation:parentA?.isMutant||parentB?.isMutant
                ? (this.fusionUseMutationEssence?'8%～15%（含精华+3%）':'5%～12%')
                : (this.fusionUseMutationEssence?'8%（含精华+3%）':'5%'),
            aptitudes:{
                hp:interval(aptA.hp,aptB.hp), attack:interval(aptA.attack,aptB.attack), defense:interval(aptA.defense,aptB.defense),
                magic:interval(aptA.magic,aptB.magic), speed:interval(aptA.speed,aptB.speed),
            },
        };
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
