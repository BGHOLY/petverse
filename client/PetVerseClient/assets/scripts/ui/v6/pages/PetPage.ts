import {
    Color,
    Director,
    Layout,
    Mask,
    Node,
    ScrollView,
    Vec2,
    director,
} from 'cc';
import { CuteTheme, button, panel, setRect, text } from '../../cute/CuteUiKit';
import { createV6PageShell } from '../AppShell';
import { V6_PANEL_GAP, V6_PAGE_WIDTH, V6_SAFE_CONTENT_HEIGHT } from '../UiMetrics';
import { renderPetAptitudePanelV6 } from '../components/PetAptitudePanel';
import { renderPetAttributeGridV6, renderPetLineageV6, renderPetStatAllocationV6 } from '../components/PetAttributeGrid';
import { renderPetEquipmentPanelV6 } from '../components/PetEquipmentPanel';
import { renderPetListItemV6 } from '../components/PetListItem';
import { renderPetProfilePanelV6 } from '../components/PetProfilePanel';
import { renderPetSkillPanelV6 } from '../components/PetSkillPanel';
import { PetPageV6Options, PetTabV6 } from '../components/PetTypes';

const LEFT_WIDTH = 184;
const RIGHT_WIDTH = V6_PAGE_WIDTH - LEFT_WIDTH - V6_PANEL_GAP;
const FOOTER_HEIGHT = 64;
const MAIN_HEIGHT = V6_SAFE_CONTENT_HEIGHT - FOOTER_HEIGHT - V6_PANEL_GAP;
const LEFT_X = -V6_PAGE_WIDTH / 2 + LEFT_WIDTH / 2;
const RIGHT_X = -V6_PAGE_WIDTH / 2 + LEFT_WIDTH + V6_PANEL_GAP + RIGHT_WIDTH / 2;
const MAIN_Y = (FOOTER_HEIGHT + V6_PANEL_GAP) / 2;
const ROSTER_CARD_HEIGHT = 100;
const ROSTER_CARD_GAP = 12;
const ROSTER_CARD_STEP = ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP;
const ROSTER_PADDING_TOP = 4;

function renderPetRoster(parent: Node, options: PetPageV6Options) {
    const roster = panel(
        parent,
        'PetRoster',
        LEFT_X,
        MAIN_Y,
        LEFT_WIDTH,
        MAIN_HEIGHT,
        new Color(250, 242, 219, 252),
        22,
        true,
        new Color(185, 126, 70, 245),
        3,
    );
    text(roster, 'Title', `宝宝 ${options.pets.length}/${options.totalPets}`, 0, MAIN_HEIGHT / 2 - 26, LEFT_WIDTH - 16, 34, 14, CuteTheme.caramel, 'center', true);

    const viewportHeight = MAIN_HEIGHT - 58;
    const viewport = new Node('PetRosterScrollV6');
    roster.addChild(viewport);
    setRect(viewport, 0, -24, LEFT_WIDTH - 16, viewportHeight);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const content = new Node('Content');
    viewport.addChild(content);
    const contentHeight = Math.max(viewportHeight, options.pets.length * ROSTER_CARD_STEP + 12);
    const transform = setRect(content, 0, viewportHeight / 2, LEFT_WIDTH - 16, contentHeight);
    transform.setAnchorPoint(0.5, 1);
    const layout = content.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.paddingTop = ROSTER_PADDING_TOP;
    layout.paddingBottom = 8;
    layout.spacingY = ROSTER_CARD_GAP;
    options.pets.forEach((pet) => renderPetListItemV6(content, pet, () => options.onSelectPet(pet.id)));
    layout.updateLayout();

    if (!options.pets.length) text(content, 'Empty', '当前筛选下\n暂无宝宝', 0, -80, LEFT_WIDTH - 26, 72, 15, CuteTheme.muted, 'center', true);

    const scroll = viewport.addComponent(ScrollView);
    scroll.content = content;
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.inertia = true;
    scroll.brake = 0.72;
    scroll.elastic = true;
    scroll.bounceDuration = 0.22;
    scroll.cancelInnerEvents = true;
    (viewport as any).__petVerseScrollKey = options.scrollKey;

    const maxY = Math.max(0, contentHeight - viewportHeight);
    const snapOffset = (value: number) => Math.max(0, Math.min(maxY, Math.round(Math.max(0, value) / ROSTER_CARD_STEP) * ROSTER_CARD_STEP));
    const keepSelectedVisible = (value: number) => {
        const selectedIndex = options.pets.findIndex((pet) => pet.selected);
        if (selectedIndex < 0) return snapOffset(value);
        const selectedTop = ROSTER_PADDING_TOP + selectedIndex * ROSTER_CARD_STEP;
        const selectedBottom = selectedTop + ROSTER_CARD_HEIGHT;
        let next = snapOffset(value);
        if (selectedTop < next) next = Math.floor(selectedTop / ROSTER_CARD_STEP) * ROSTER_CARD_STEP;
        if (selectedBottom > next + viewportHeight) next = Math.ceil((selectedBottom - viewportHeight) / ROSTER_CARD_STEP) * ROSTER_CARD_STEP;
        return snapOffset(next);
    };
    const restoreOffset = keepSelectedVisible(Number(options.initialOffset?.y || 0));
    director.once(Director.EVENT_AFTER_UPDATE, () => {
        if (
            !viewport?.isValid
            || !content?.isValid
            || !scroll?.isValid
            || !scroll.content?.isValid
            || scroll.content !== content
        ) return;
        try {
            scroll.stopAutoScroll();
            scroll.scrollToOffset(new Vec2(0, restoreOffset), 0);
        } catch (error) {
            console.warn('[PetPageV6] skipped stale roster scroll restore', error);
        }
    });
    viewport.on('scroll-ended', () => {
        if (!viewport?.isValid || !scroll?.isValid || !scroll.content?.isValid) return;
        try {
            const snapped = snapOffset(Number(scroll.getScrollOffset()?.y || 0));
            scroll.stopAutoScroll();
            scroll.scrollToOffset(new Vec2(0, snapped), 0.16);
        } catch (error) {
            console.warn('[PetPageV6] skipped stale roster snap', error);
        }
    });
}

function renderTabs(parent: Node, options: PetPageV6Options) {
    const tabs = panel(parent, 'PetTabs', RIGHT_X, 209, RIGHT_WIDTH, 56, new Color(255, 249, 230, 248), 18, true, new Color(205, 158, 103, 220), 2);
    const values: Array<[PetTabV6, string]> = [
        ['attributes', '属性'],
        ['skills', '技能'],
        ['aptitudes', '资质'],
        ['equipment', '装备'],
    ];
    values.forEach(([key, label], index) => {
        button(tabs, `Tab_${key}`, label, -174 + index * 116, 0, 108, 42, () => options.onTab(key), {
            selected: options.tab === key,
            fill: options.tab === key ? CuteTheme.honey : CuteTheme.paperWarm,
            fontSize: 14,
            radius: 16,
        });
    });
}

function renderDetails(parent: Node, options: PetPageV6Options) {
    const detail = panel(parent, 'PetDetailContent', RIGHT_X, -50, RIGHT_WIDTH, 430, new Color(255, 249, 230, 248), 22, true, new Color(205, 158, 103, 225), 2);
    if (options.tab === 'attributes') {
        if (options.attributeView === 'stats') renderPetStatAllocationV6(detail, options.statDraft);
        else if (options.attributeView === 'lineage') renderPetLineageV6(detail, options.lineage);
        else renderPetAttributeGridV6(detail, options.attributes);
    } else if (options.tab === 'skills') {
        renderPetSkillPanelV6(detail, options.skills, options.skillSlotCount, options.onSkill, options.onSkillBook);
    } else if (options.tab === 'aptitudes') {
        renderPetAptitudePanelV6(detail, options.aptitudes, options.aptitudeScore, options.aptitudeRange, options.attributes.growth);
    } else {
        renderPetEquipmentPanelV6(detail, options.equipment);
    }
}

function renderActions(parent: Node, options: PetPageV6Options) {
    const actions = panel(parent, 'PetActions', RIGHT_X, -337, RIGHT_WIDTH, 112, new Color(255, 249, 230, 248), 20, true, new Color(205, 158, 103, 220), 2);
    button(actions, 'Formation', options.profile.formationActionLabel, -116, 25, 208, 50, options.onFormation, {
        fill: CuteTheme.mint,
        selected: options.profile.deployment === '出战中',
        fontSize: 14,
        radius: 18,
    });
    button(actions, 'Cultivate', '培养加点', 116, 25, 208, 50, () => options.onAttributeView('stats'), {
        fill: CuteTheme.honey,
        selected: options.tab === 'attributes' && options.attributeView === 'stats',
        fontSize: 14,
        radius: 18,
    });
    const controls: Array<[string, string, () => void, Color, boolean]> = [
        ['Favorite', options.profile.favorite ? '取消心仪' : '设为心仪', options.onFavorite, CuteTheme.peach, options.profile.favorite],
        ['Lineage', '血脉', () => options.onAttributeView('lineage'), CuteTheme.lilac, options.tab === 'attributes' && options.attributeView === 'lineage'],
        ['Lock', options.profile.locked ? '解锁' : '锁定', options.onLock, CuteTheme.paperWarm, options.profile.locked],
    ];
    controls.forEach(([name, label, onClick, fill, selected], index) => {
        button(actions, name, label, -150 + index * 150, -29, 136, 38, onClick, {
            fill,
            selected,
            fontSize: 12,
            radius: 15,
        });
    });
}

/** Pet layout-v6: clean atmosphere background plus a 150/522 two-zone layout. */
export function renderPetPageV6(parent: Node, options: PetPageV6Options) {
    const shell = createV6PageShell(parent, 'PetLayoutV6');
    const page = shell.content;
    renderPetRoster(page, options);

    const profile = panel(page, 'PetProfile', RIGHT_X, 363, RIGHT_WIDTH, 220, new Color(255, 249, 230, 248), 22, true, new Color(205, 158, 103, 225), 2);
    renderPetProfilePanelV6(profile, options.profile);
    renderTabs(page, options);
    renderDetails(page, options);
    renderActions(page, options);

    const footerY = -V6_SAFE_CONTENT_HEIGHT / 2 + FOOTER_HEIGHT / 2;
    const footer = panel(page, 'PetFilters', 0, footerY, V6_PAGE_WIDTH, FOOTER_HEIGHT, new Color(255, 249, 230, 248), 20, true, new Color(205, 158, 103, 220), 2);
    button(footer, 'RarityFilter', options.rarityFilterLabel, -230, 0, 208, 44, options.onRarityFilter, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 17 });
    button(footer, 'ElementFilter', options.elementFilterLabel, 0, 0, 208, 44, options.onElementFilter, { fill: CuteTheme.mint, fontSize: 13, radius: 17 });
    button(footer, 'Sort', options.sortLabel, 230, 0, 208, 44, options.onSort, { fill: CuteTheme.sky, fontSize: 13, radius: 17 });
}
