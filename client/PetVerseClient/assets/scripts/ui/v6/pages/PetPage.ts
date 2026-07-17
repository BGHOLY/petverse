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
import { V6_CONTENT_HEIGHT, V6_PANEL_GAP, V6_PAGE_WIDTH } from '../UiMetrics';
import { renderPetAptitudePanelV6 } from '../components/PetAptitudePanel';
import { renderPetAttributeGridV6, renderPetLineageV6, renderPetStatAllocationV6 } from '../components/PetAttributeGrid';
import { renderPetEquipmentPanelV6 } from '../components/PetEquipmentPanel';
import { renderPetListItemV6 } from '../components/PetListItem';
import { renderPetProfilePanelV6 } from '../components/PetProfilePanel';
import { renderPetSkillPanelV6 } from '../components/PetSkillPanel';
import { PetPageV6Options, PetTabV6 } from '../components/PetTypes';

const LEFT_WIDTH = 150;
const RIGHT_WIDTH = V6_PAGE_WIDTH - LEFT_WIDTH - V6_PANEL_GAP;
const FOOTER_HEIGHT = 64;
const MAIN_HEIGHT = V6_CONTENT_HEIGHT - FOOTER_HEIGHT - V6_PANEL_GAP;
const LEFT_X = -V6_PAGE_WIDTH / 2 + LEFT_WIDTH / 2;
const RIGHT_X = -V6_PAGE_WIDTH / 2 + LEFT_WIDTH + V6_PANEL_GAP + RIGHT_WIDTH / 2;
const MAIN_Y = (FOOTER_HEIGHT + V6_PANEL_GAP) / 2;
const ROSTER_CARD_HEIGHT = 100;
const ROSTER_CARD_GAP = 8;
const ROSTER_CARD_STEP = ROSTER_CARD_HEIGHT + ROSTER_CARD_GAP;
const ROSTER_PADDING_TOP = 4;

function renderPetRoster(parent: Node, options: PetPageV6Options) {
    const roster = panel(parent, 'PetRoster', LEFT_X, MAIN_Y, LEFT_WIDTH, MAIN_HEIGHT, new Color(255, 249, 230, 248), 22, true, new Color(205, 158, 103, 225), 2);
    text(roster, 'Title', `宝宝 ${options.pets.length}/${options.totalPets}`, 0, MAIN_HEIGHT / 2 - 26, LEFT_WIDTH - 16, 34, 14, CuteTheme.caramel, 'center', true);

    const viewportHeight = MAIN_HEIGHT - 58;
    const viewport = new Node('PetRosterScrollV6');
    roster.addChild(viewport);
    setRect(viewport, 0, -24, LEFT_WIDTH - 10, viewportHeight);
    const mask = viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const content = new Node('Content');
    viewport.addChild(content);
    const contentHeight = Math.max(viewportHeight, options.pets.length * ROSTER_CARD_STEP + 12);
    const transform = setRect(content, 0, viewportHeight / 2, LEFT_WIDTH - 10, contentHeight);
    transform.setAnchorPoint(0.5, 1);
    const layout = content.addComponent(Layout);
    layout.type = Layout.Type.VERTICAL;
    layout.resizeMode = Layout.ResizeMode.NONE;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    layout.paddingTop = ROSTER_PADDING_TOP;
    layout.paddingBottom = 8;
    layout.spacingY = 8;
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
        if (!viewport.isValid || !content.isValid || !scroll.isValid || scroll.content !== content) return;
        try {
            scroll.stopAutoScroll();
            scroll.scrollToOffset(new Vec2(0, restoreOffset), 0);
        } catch (error) {
            console.warn('[PetPageV6] skipped stale roster scroll restore', error);
        }
    });
    viewport.on('scroll-ended', () => {
        if (!viewport.isValid || !scroll.isValid) return;
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
    const tabs = panel(parent, 'PetTabs', RIGHT_X, 224, RIGHT_WIDTH, 58, new Color(255, 249, 230, 248), 18, true, new Color(205, 158, 103, 220), 2);
    const values: Array<[PetTabV6, string]> = [
        ['attributes', '属性'],
        ['skills', '技能'],
        ['aptitudes', '资质'],
        ['equipment', '装备'],
    ];
    values.forEach(([key, label], index) => {
        button(tabs, `Tab_${key}`, label, -195 + index * 130, 0, 120, 42, () => options.onTab(key), {
            selected: options.tab === key,
            fill: options.tab === key ? CuteTheme.honey : CuteTheme.paperWarm,
            fontSize: 14,
            radius: 16,
        });
    });
}

function renderDetails(parent: Node, options: PetPageV6Options) {
    const detail = panel(parent, 'PetDetailContent', RIGHT_X, -92, RIGHT_WIDTH, 550, new Color(255, 249, 230, 248), 22, true, new Color(205, 158, 103, 225), 2);
    if (options.tab === 'attributes') {
        if (options.attributeView === 'stats') renderPetStatAllocationV6(detail, options.statDraft);
        else if (options.attributeView === 'lineage') renderPetLineageV6(detail, options.lineage);
        else renderPetAttributeGridV6(detail, options.attributes);
    } else if (options.tab === 'skills') {
        renderPetSkillPanelV6(detail, options.skills, options.onSkill, options.onSkillBook);
    } else if (options.tab === 'aptitudes') {
        renderPetAptitudePanelV6(detail, options.aptitudes, options.aptitudeScore, options.aptitudeRange, options.attributes.growth);
    } else {
        renderPetEquipmentPanelV6(detail, options.equipment);
    }
}

function renderActions(parent: Node, options: PetPageV6Options) {
    const actions = panel(parent, 'PetActions', RIGHT_X, -412, RIGHT_WIDTH, 66, new Color(255, 249, 230, 248), 20, true, new Color(205, 158, 103, 220), 2);
    const controls: Array<[string, string, () => void, Color, boolean]> = [
        ['Formation', options.profile.formationActionLabel, options.onFormation, CuteTheme.mint, options.profile.deployment === '出战中'],
        ['Favorite', options.profile.favorite ? '取消心仪' : '设为心仪', options.onFavorite, CuteTheme.peach, options.profile.favorite],
        ['Stats', '加点', () => options.onAttributeView('stats'), CuteTheme.sky, options.tab === 'attributes' && options.attributeView === 'stats'],
        ['Lineage', '血脉', () => options.onAttributeView('lineage'), CuteTheme.lilac, options.tab === 'attributes' && options.attributeView === 'lineage'],
        ['Lock', options.profile.locked ? '解锁' : '锁定', options.onLock, CuteTheme.paperWarm, options.profile.locked],
    ];
    controls.forEach(([name, label, onClick, fill, selected], index) => {
        button(actions, name, label, -208 + index * 104, 0, 96, 44, onClick, { fill, selected, fontSize: 12, radius: 16 });
    });
}

/** Pet layout-v6: clean atmosphere background plus a 150/522 two-zone layout. */
export function renderPetPageV6(parent: Node, options: PetPageV6Options) {
    const shell = createV6PageShell(parent, 'PetLayoutV6');
    const page = shell.content;
    renderPetRoster(page, options);

    const profile = panel(page, 'PetProfile', RIGHT_X, 393, RIGHT_WIDTH, 256, new Color(255, 249, 230, 248), 22, true, new Color(205, 158, 103, 225), 2);
    renderPetProfilePanelV6(profile, options.profile);
    renderTabs(page, options);
    renderDetails(page, options);
    renderActions(page, options);

    const footer = panel(page, 'PetFilters', 0, -489, V6_PAGE_WIDTH, FOOTER_HEIGHT, new Color(255, 249, 230, 248), 20, true, new Color(205, 158, 103, 220), 2);
    button(footer, 'RarityFilter', options.rarityFilterLabel, -230, 0, 208, 44, options.onRarityFilter, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 17 });
    button(footer, 'ElementFilter', options.elementFilterLabel, 0, 0, 208, 44, options.onElementFilter, { fill: CuteTheme.mint, fontSize: 13, radius: 17 });
    button(footer, 'Sort', options.sortLabel, 230, 0, 208, 44, options.onSort, { fill: CuteTheme.sky, fontSize: 13, radius: 17 });
}
