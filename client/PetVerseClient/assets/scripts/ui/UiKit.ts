import { Button, Color, find, Graphics, Label, Node, Size, UITransform, Vec3 } from 'cc';
import { UIEffects } from './UIEffects';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;
export const LEFT = -360;
export const RIGHT = 360;
export const TOP = 640;
export const BOTTOM = -640;

export const TEXT_DARK = new Color(76, 49, 26, 255);
export const TEXT_LIGHT = new Color(255, 255, 255, 255);
export const TEXT_NAVY = new Color(28, 42, 74, 255);
export const TEXT_MUTED = new Color(96, 111, 130, 255);
export const TEXT_GREEN = new Color(41, 151, 90, 255);

export const PAGE_BG = new Color(255, 246, 218, 255);
export const PET_PAGE_BG = new Color(245, 238, 255, 255);
export const BAG_PAGE_BG = new Color(255, 247, 224, 255);
export const SHOP_PAGE_BG = new Color(236, 251, 232, 255);
export const BREED_PAGE_BG = new Color(255, 238, 235, 255);
export const ADVENTURE_PAGE_BG = new Color(232, 245, 255, 255);
export const SOFT_BG = new Color(239, 255, 240, 255);
export const CREAM = new Color(255, 252, 241, 255);
export const MINT = new Color(176, 232, 152, 255);
export const MINT_DARK = new Color(105, 193, 118, 255);
export const GOLD = new Color(255, 196, 55, 255);
export const GOLD_LIGHT = new Color(255, 229, 116, 255);
export const NAVY = new Color(28, 42, 74, 255);
export const WHITE = new Color(255, 255, 255, 255);
export const SOFT_LINE = new Color(221, 230, 218, 255);

const PANEL_FILL = new Color(255, 252, 235, 255);
const PANEL_BORDER = new Color(111, 78, 43, 255);
const BUTTON_FILL = new Color(255, 226, 154, 255);
const BUTTON_SELECTED = new Color(255, 192, 92, 255);
const BUTTON_BORDER = new Color(123, 82, 43, 255);
const SLOT_FILL = new Color(255, 253, 240, 255);
const CLICK_LOCK_MS = 450;

export type PageLayout = {
    w: number;
    h: number;
    pageW: number;
    pageH: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    titleY: number;
};

export function getCanvasSize(): Size {
    return new Size(DESIGN_WIDTH, DESIGN_HEIGHT);
}

export function getNodeSize(node: Node): Size {
    const transform = node.getComponent(UITransform);
    const size = transform?.contentSize;
    if (size && size.width > 0 && size.height > 0) {
        return size;
    }

    return getCanvasSize();
}

export function getPageLayout(node?: Node): PageLayout {
    return {
        w: DESIGN_WIDTH,
        h: DESIGN_HEIGHT,
        pageW: DESIGN_WIDTH,
        pageH: 948,
        left: LEFT,
        right: RIGHT,
        top: 474,
        bottom: -474,
        titleY: 420,
    };
}

export function getOrCreateNode(parent: Node, name: string): Node {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        parent.addChild(node);
    }
    return node;
}

export function ensureTransform(node: Node, width: number, height: number): UITransform {
    let transform = node.getComponent(UITransform);
    if (!transform) {
        transform = node.addComponent(UITransform);
    }
    transform.setContentSize(width, height);
    return transform;
}

export function setNodeRect(node: Node, x: number, y: number, width: number, height: number): UITransform {
    node.setPosition(new Vec3(x, y, 0));
    return ensureTransform(node, width, height);
}

export function drawRoundRect(
    node: Node,
    width: number,
    height: number,
    fill: Color,
    border: Color,
    radius = 8,
    lineWidth = 2,
) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();

    if (lineWidth > 0) {
        graphics.lineWidth = lineWidth;
        graphics.strokeColor = border;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.stroke();
    }
}

export function drawCircle(
    node: Node,
    radius: number,
    fill: Color,
    border: Color = WHITE,
    lineWidth = 0,
) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.circle(0, 0, radius);
    graphics.fill();

    if (lineWidth > 0) {
        graphics.lineWidth = lineWidth;
        graphics.strokeColor = border;
        graphics.circle(0, 0, radius);
        graphics.stroke();
    }
}

export function createPanel(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: Color = PANEL_FILL,
    border: Color = PANEL_BORDER,
    radius = 8,
    lineWidth = 2,
): Node {
    const node = getOrCreateNode(parent, name);
    setNodeRect(node, x, y, width, height);
    drawRoundRect(node, width, height, fill, border, radius, lineWidth);
    return node;
}

export function createSoftCard(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: Color = CREAM,
    radius = 28,
): Node {
    return createPanel(parent, name, x, y, width, height, fill, new Color(255, 255, 255, 230), radius, 3);
}

export function createCircleCard(
    parent: Node,
    name: string,
    x: number,
    y: number,
    radius: number,
    fill: Color,
    border: Color = WHITE,
): Node {
    const node = getOrCreateNode(parent, name);
    setNodeRect(node, x, y, radius * 2, radius * 2);
    drawCircle(node, radius, fill, border, 3);
    return node;
}

export function createProgressBar(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    fill: Color = GOLD,
    bg: Color = new Color(224, 226, 221, 255),
): Node {
    const root = getOrCreateNode(parent, name);
    setNodeRect(root, x, y, width, height);

    createPanel(root, 'Track', 0, 0, width, height, bg, bg, height / 2, 0);

    const clamped = Math.max(0, Math.min(1, ratio));
    const fillWidth = Math.max(height, width * clamped);
    const fillNode = createPanel(root, 'Fill', -width / 2 + fillWidth / 2, 0, fillWidth, height, fill, fill, height / 2, 0);
    fillNode.active = clamped > 0;
    return root;
}

export function createPill(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    iconText = '',
    fill: Color = CREAM,
) {
    const node = createSoftCard(parent, name, x, y, width, height, fill, height / 2);
    if (iconText) {
        createCircleCard(node, 'Icon', -width / 2 + height / 2, 0, Math.max(14, height / 2 - 8), GOLD_LIGHT, WHITE);
        createLabel(node, 'IconText', iconText, -width / 2 + height / 2, 0, height - 10, height - 10, Math.max(16, height / 3), TEXT_NAVY);
    }
    const label = createLabel(node, 'Text', text, iconText ? 16 : 0, 0, iconText ? width - height - 18 : width - 16, height - 6, Math.max(18, height / 2.4), TEXT_NAVY);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    return node;
}

export function createPageBackground(parent: Node, title: string, fill: Color = PAGE_BG) {
    const layout = getPageLayout(parent);
    const bg = createPanel(parent, 'PageOpaqueBackground', 0, 0, layout.pageW, layout.pageH, fill, PANEL_BORDER, 0, 0);
    bg.setSiblingIndex(0);

    createPanel(parent, 'PageHeaderBar', 0, layout.titleY, layout.pageW, 60, new Color(255, 250, 230, 255), PANEL_BORDER, 0, 0);
    createLabel(parent, 'PageTitle', title, 0, layout.titleY, 200, 50, 30, TEXT_DARK);
    return layout;
}

export function createGridSlot(parent: Node, name: string, x: number, y: number, width: number, height: number): Node {
    return createPanel(parent, name, x, y, width, height, SLOT_FILL, PANEL_BORDER, 5, 2);
}

export function createLabel(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize = 18,
    color: Color = TEXT_DARK,
): Label {
    const node = getOrCreateNode(parent, name);
    setNodeRect(node, x, y, width, height);

    const label = node.getComponent(Label) || node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.floor(fontSize + 4);
    label.color = color;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return label;
}

export function createInfoText(
    parent: Node,
    name: string,
    text: string,
    x = -300,
    y = 300,
    width = 600,
    height = 560,
    fontSize = 14,
): Label {
    const label = createLabel(parent, name, text, x, y, width, height, fontSize, TEXT_DARK);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    return label;
}

export function createButton(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    callback: () => void,
    target?: any,
    selected = false,
    fontSize?: number,
): Button {
    const node = getOrCreateNode(parent, name);
    setNodeRect(node, x, y, width, height);
    drawRoundRect(node, width, height, selected ? BUTTON_SELECTED : BUTTON_FILL, BUTTON_BORDER, 8, 2);

    const button = node.getComponent(Button) || node.addComponent(Button);
    button.transition = Button.Transition.NONE;

    const autoFont = Math.max(10, Math.min(16, Math.floor(height / 3.5)));
    const label = createLabel(
        node,
        'Label',
        text,
        0,
        0,
        width - 8,
        height - 6,
        fontSize || autoFont,
        TEXT_DARK,
    );
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;

    UIEffects.bindButtonFeedback(node);

    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, () => {
        const lockedNode = node as any;
        if (lockedNode.__petverseClickLocked) return;
        lockedNode.__petverseClickLocked = true;
        UIEffects.playClick();
        const release = () => {
            lockedNode.__petverseClickLocked = false;
        };

        try {
            const result = callback.call(target);
            if (result && typeof result.then === 'function') {
                result.then(release).catch(release);
            } else {
                setTimeout(release, CLICK_LOCK_MS);
            }
        } catch (error) {
            release();
            throw error;
        }
    });

    return button;
}

export function clearGenerated(parent: Node, prefix = 'Generated') {
    for (const child of [...parent.children]) {
        if (child.name.startsWith(prefix)) {
            child.destroy();
        }
    }
}

export function clearChildren(parent: Node) {
    for (const child of [...parent.children]) {
        child.destroy();
    }
}

export function normalizeList(result: any, keys: string[] = []): any[] {
    if (Array.isArray(result)) return result;

    for (const key of keys) {
        if (Array.isArray(result?.[key])) return result[key];
    }

    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.inventory)) return result.inventory;
    if (Array.isArray(result?.shopItems)) return result.shopItems;
    if (Array.isArray(result?.pets)) return result.pets;
    if (Array.isArray(result?.rankings)) return result.rankings;
    if (Array.isArray(result?.list)) return result.list;

    return [];
}

export function compactJson(value: any): string {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export const getOrCreateButton = createButton;
export const getOrCreateLabel = createLabel;
export function createPageTitle(parent: Node, title: string): Label {
    const layout = getPageLayout(parent);
    return createLabel(parent, 'PageTitle', title, 0, layout.titleY, 200, 50, 30, TEXT_DARK);
}
export function createStatusLabel(parent: Node, name = 'StatusLabel'): Label {
    const layout = getPageLayout(parent);
    return createLabel(parent, name, '', 0, layout.titleY - 44, layout.pageW - 80, 28, 13, TEXT_DARK);
}
export function createListButton(
    parent: Node,
    name: string,
    text: string,
    index: number,
    callback: () => void,
    target?: any,
): Button {
    return createButton(parent, name, text, 0, 190 - index * 56, 300, 42, callback, target);
}
