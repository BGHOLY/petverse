import { Color, Graphics, Node } from 'cc';
import {
    CuteTheme,
    artImage,
    button,
    circle,
    clearNode,
    hitArea,
    panel,
    progress,
    setRect,
    text,
} from '../cute/CuteUiKit';
import { MAIN_TABS, MainTab, UiIconName } from './AppRoutes';

export const HandPaintedTheme = {
    canvas: new Color(253, 247, 229, 255),
    paper: new Color(255, 252, 240, 255),
    paperPressed: new Color(244, 231, 202, 255),
    ink: new Color(91, 61, 39, 255),
    mutedInk: new Color(124, 96, 72, 255),
    leaf: new Color(91, 160, 105, 255),
    leafSoft: new Color(207, 233, 198, 255),
    honey: new Color(246, 188, 70, 255),
    peach: new Color(242, 166, 139, 255),
    sky: new Color(157, 207, 221, 255),
    wood: new Color(176, 119, 69, 255),
    woodDark: new Color(116, 76, 45, 255),
    danger: new Color(205, 91, 82, 255),
    disabled: new Color(205, 198, 181, 255),
};

export type UiButtonKind = 'primary' | 'secondary' | 'danger';
export type UiButtonState = 'normal' | 'selected' | 'disabled' | 'loading';

function iconNode(parent: Node, name: string, x: number, y: number, size: number, color: Color) {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        parent.addChild(node);
    }
    clearNode(node);
    setRect(node, x, y, size, size);
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.lineWidth = Math.max(3, Math.round(size / 9));
    graphics.strokeColor = color;
    graphics.fillColor = color;
    return graphics;
}

function strokeRect(graphics: Graphics, x: number, y: number, width: number, height: number, radius = 2) {
    graphics.roundRect(x, y, width, height, radius);
    graphics.stroke();
}

export function drawUiIcon(
    parent: Node,
    name: string,
    icon: UiIconName,
    x: number,
    y: number,
    size = 34,
    color: Color = HandPaintedTheme.ink,
) {
    const g = iconNode(parent, name, x, y, size, color);
    const s = size / 2;

    switch (icon) {
        case 'home':
            g.moveTo(-s * 0.72, -s * 0.05); g.lineTo(0, s * 0.68); g.lineTo(s * 0.72, -s * 0.05); g.stroke();
            strokeRect(g, -s * 0.5, -s * 0.68, s, s * 0.75, 2);
            g.moveTo(0, -s * 0.68); g.lineTo(0, -s * 0.2); g.stroke();
            break;
        case 'pet':
            g.circle(0, -s * 0.08, s * 0.52); g.stroke();
            g.moveTo(-s * 0.45, s * 0.28); g.lineTo(-s * 0.66, s * 0.68); g.lineTo(-s * 0.14, s * 0.45); g.stroke();
            g.moveTo(s * 0.45, s * 0.28); g.lineTo(s * 0.66, s * 0.68); g.lineTo(s * 0.14, s * 0.45); g.stroke();
            g.circle(-s * 0.2, 0, s * 0.06); g.circle(s * 0.2, 0, s * 0.06); g.fill();
            break;
        case 'adventure':
            g.circle(0, 0, s * 0.72); g.stroke();
            g.moveTo(-s * 0.18, -s * 0.2); g.lineTo(s * 0.25, s * 0.35); g.lineTo(s * 0.12, -s * 0.1); g.close(); g.stroke();
            break;
        case 'shop':
            strokeRect(g, -s * 0.62, -s * 0.55, s * 1.24, s * 0.95, 4);
            g.moveTo(-s * 0.36, s * 0.4); g.lineTo(-s * 0.2, s * 0.68); g.lineTo(s * 0.2, s * 0.68); g.lineTo(s * 0.36, s * 0.4); g.stroke();
            break;
        case 'more':
            [-0.46, 0, 0.46].forEach((offset) => { g.circle(offset * s, 0, s * 0.1); g.fill(); });
            break;
        case 'inventory':
            strokeRect(g, -s * 0.66, -s * 0.55, s * 1.32, s, 5);
            g.moveTo(-s * 0.32, s * 0.45); g.lineTo(-s * 0.18, s * 0.68); g.lineTo(s * 0.18, s * 0.68); g.lineTo(s * 0.32, s * 0.45); g.stroke();
            break;
        case 'hatchery':
            g.moveTo(0, s * 0.72); g.bezierCurveTo(s * 0.54, s * 0.44, s * 0.68, -s * 0.58, 0, -s * 0.72);
            g.bezierCurveTo(-s * 0.68, -s * 0.58, -s * 0.54, s * 0.44, 0, s * 0.72); g.stroke();
            break;
        case 'skills':
        case 'collection':
            strokeRect(g, -s * 0.68, -s * 0.66, s * 1.36, s * 1.3, 3);
            g.moveTo(0, -s * 0.66); g.lineTo(0, s * 0.64); g.stroke();
            break;
        case 'fusion':
            g.circle(-s * 0.3, 0, s * 0.32); g.circle(s * 0.3, 0, s * 0.32); g.stroke();
            g.moveTo(-s * 0.1, s * 0.56); g.lineTo(s * 0.38, s * 0.56); g.lineTo(s * 0.22, s * 0.7); g.stroke();
            break;
        case 'friends':
            g.circle(-s * 0.28, s * 0.28, s * 0.24); g.circle(s * 0.3, s * 0.2, s * 0.2); g.stroke();
            g.arc(-s * 0.25, -s * 0.42, s * 0.48, 0.15, Math.PI - 0.15, false); g.stroke();
            break;
        case 'marriage':
            g.circle(-s * 0.25, s * 0.18, s * 0.28); g.circle(s * 0.25, s * 0.18, s * 0.28); g.stroke();
            g.moveTo(-s * 0.48, 0); g.lineTo(0, -s * 0.66); g.lineTo(s * 0.48, 0); g.stroke();
            break;
        case 'ranking':
            g.moveTo(-s * 0.48, s * 0.55); g.lineTo(-s * 0.35, 0); g.bezierCurveTo(-s * 0.2, -s * 0.34, s * 0.2, -s * 0.34, s * 0.35, 0); g.lineTo(s * 0.48, s * 0.55); g.stroke();
            g.moveTo(0, -s * 0.3); g.lineTo(0, -s * 0.58); g.moveTo(-s * 0.35, -s * 0.65); g.lineTo(s * 0.35, -s * 0.65); g.stroke();
            break;
        case 'mail':
            strokeRect(g, -s * 0.7, -s * 0.48, s * 1.4, s * 0.96, 3);
            g.moveTo(-s * 0.66, s * 0.42); g.lineTo(0, -s * 0.05); g.lineTo(s * 0.66, s * 0.42); g.stroke();
            break;
        case 'trade':
            g.moveTo(-s * 0.68, s * 0.28); g.lineTo(s * 0.5, s * 0.28); g.lineTo(s * 0.3, s * 0.5); g.stroke();
            g.moveTo(s * 0.68, -s * 0.28); g.lineTo(-s * 0.5, -s * 0.28); g.lineTo(-s * 0.3, -s * 0.5); g.stroke();
            break;
        case 'benefits':
            strokeRect(g, -s * 0.64, -s * 0.55, s * 1.28, s * 0.92, 3);
            g.moveTo(-s * 0.76, s * 0.38); g.lineTo(s * 0.76, s * 0.38); g.moveTo(0, -s * 0.55); g.lineTo(0, s * 0.62); g.stroke();
            break;
        case 'settings':
            g.circle(0, 0, s * 0.28); g.circle(0, 0, s * 0.62); g.stroke();
            for (let i = 0; i < 8; i += 1) {
                const angle = i * Math.PI / 4;
                g.moveTo(Math.cos(angle) * s * 0.62, Math.sin(angle) * s * 0.62);
                g.lineTo(Math.cos(angle) * s * 0.78, Math.sin(angle) * s * 0.78);
            }
            g.stroke();
            break;
        case 'profile':
            g.circle(0, s * 0.32, s * 0.28); g.stroke();
            g.arc(0, -s * 0.58, s * 0.62, 0.18, Math.PI - 0.18, false); g.stroke();
            break;
        case 'formation':
            [[0, s * 0.58], [-s * 0.5, 0], [s * 0.5, 0], [-s * 0.3, -s * 0.52], [s * 0.3, -s * 0.52]].forEach(([cx, cy]) => {
                g.circle(cx, cy, s * 0.13); g.fill();
            });
            break;
        case 'guild':
            strokeRect(g, -s * 0.56, -s * 0.62, s * 1.12, s * 0.92, 2);
            g.moveTo(-s * 0.7, s * 0.3); g.lineTo(0, s * 0.72); g.lineTo(s * 0.7, s * 0.3); g.stroke();
            break;
    }
    return g.node;
}

export function createActionButton(
    parent: Node,
    name: string,
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
    kind: UiButtonKind = 'primary',
    state: UiButtonState = 'normal',
) {
    const fills = {
        primary: HandPaintedTheme.honey,
        secondary: HandPaintedTheme.paper,
        danger: new Color(245, 199, 190, 255),
    };
    return button(parent, name, state === 'loading' ? '处理中' : title, x, y, width, height, onClick, {
        fill: fills[kind],
        textColor: kind === 'danger' ? HandPaintedTheme.danger : HandPaintedTheme.ink,
        selected: state === 'selected',
        disabled: state === 'disabled' || state === 'loading',
        radius: Math.min(22, height / 2),
        border: kind === 'danger' ? HandPaintedTheme.danger : HandPaintedTheme.woodDark,
    });
}

export function createTabButton(
    parent: Node,
    name: string,
    title: string,
    x: number,
    y: number,
    width: number,
    selected: boolean,
    onClick: () => void,
) {
    return button(parent, name, title, x, y, width, 46, onClick, {
        fill: selected ? HandPaintedTheme.leafSoft : HandPaintedTheme.paper,
        selected,
        fontSize: 15,
        radius: 20,
        border: selected ? HandPaintedTheme.leaf : new Color(196, 166, 124, 255),
    });
}

export function createFilterButton(parent: Node, name: string, title: string, x: number, y: number, width: number, onClick: () => void) {
    const node = button(parent, name, title, x, y, width, 42, onClick, {
        fill: HandPaintedTheme.paper,
        fontSize: 14,
        radius: 18,
        border: new Color(196, 166, 124, 255),
    });
    const mark = text(node, 'FilterMark', '≡', width / 2 - 24, 0, 24, 28, 16, HandPaintedTheme.mutedInk, 'center', true);
    mark.spacingX = 0;
    return node;
}

export function createPageTitleBoard(parent: Node, title: string, subtitle = '') {
    const board = panel(parent, 'PageTitleBoard', 0, 448, 330, subtitle ? 74 : 58, HandPaintedTheme.paper, 24, true, new Color(215, 182, 132, 255), 2);
    text(board, 'Title', title, 0, subtitle ? 12 : 0, 292, 32, 22, HandPaintedTheme.ink, 'center', true);
    if (subtitle) text(board, 'Subtitle', subtitle, 0, -20, 292, 22, 12, HandPaintedTheme.mutedInk, 'center');
    return board;
}

export function createNotificationDot(parent: Node, count: number, x: number, y: number) {
    const safeCount = Math.max(0, Math.floor(Number(count || 0)));
    let node = parent.getChildByName('NotificationDot');
    if (!safeCount) {
        if (node) node.active = false;
        return node;
    }
    if (!node) {
        node = new Node('NotificationDot');
        parent.addChild(node);
    }
    node.active = true;
    setRect(node, x, y, 30, 30);
    circle(node, 15, HandPaintedTheme.danger, Color.WHITE, 2);
    text(node, 'Count', safeCount > 99 ? '99+' : String(safeCount), 0, 0, 27, 22, safeCount > 99 ? 10 : 12, Color.WHITE, 'center', true);
    return node;
}

export function createProgressBar(parent: Node, name: string, x: number, y: number, width: number, value: number) {
    return progress(parent, name, x, y, width, 16, value, HandPaintedTheme.leaf);
}

export function createEmptyState(parent: Node, title: string, subtitle: string) {
    const state = panel(parent, 'EmptyState', 0, 0, 430, 230, HandPaintedTheme.paper, 26, false, new Color(213, 188, 151, 255), 2);
    drawUiIcon(state, 'EmptyIcon', 'collection', 0, 48, 54, HandPaintedTheme.mutedInk);
    text(state, 'Title', title, 0, -18, 360, 34, 20, HandPaintedTheme.ink, 'center', true);
    text(state, 'Subtitle', subtitle, 0, -58, 360, 42, 14, HandPaintedTheme.mutedInk, 'center');
    return state;
}

export function createLoadingOverlay(parent: Node, message = '正在整理手账') {
    clearNode(parent);
    const dim = panel(parent, 'LoadingDim', 0, 0, 720, 1280, new Color(64, 46, 31, 80), 0, false, CuteTheme.transparent, 0);
    const card = panel(dim, 'LoadingCard', 0, 0, 270, 130, HandPaintedTheme.paper, 24, true, Color.WHITE, 2);
    text(card, 'Message', message, 0, -24, 230, 34, 16, HandPaintedTheme.ink, 'center', true);
    drawUiIcon(card, 'Spinner', 'more', 0, 24, 38, HandPaintedTheme.leaf);
    return dim;
}

export function renderBottomNavigation(
    parent: Node,
    active: MainTab,
    onNavigate: (page: MainTab) => void,
    notificationCount = 0,
) {
    clearNode(parent);
    artImage(parent, 'NavigationArt', 'ui/home-v3/bottom-navigation-v3', 0, 75, 720, 280);

    MAIN_TABS.forEach((item, index) => {
        const selected = item.key === active;
        const x = -286 + index * 143;
        const isAdventure = item.key === 'adventure';
        if (selected) {
            panel(parent, `Selected_${item.key}`, x, isAdventure ? 48 : 10, isAdventure ? 158 : 126, isAdventure ? 182 : 116, new Color(255, 245, 184, 18), isAdventure ? 54 : 24, true, isAdventure ? new Color(255, 225, 118, 255) : new Color(104, 166, 103, 255), 3);
        }
        const tab = hitArea(parent, `Tab_${item.key}`, x, isAdventure ? 48 : 10, isAdventure ? 152 : 122, isAdventure ? 178 : 112, () => onNavigate(item.key));
        if (item.key === 'more') createNotificationDot(tab, notificationCount, 44, 42);
    });
}
