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

export const PAGE_BG = new Color(255, 246, 218, 255);
export const PET_PAGE_BG = new Color(245, 238, 255, 255);
export const BAG_PAGE_BG = new Color(255, 247, 224, 255);
export const SHOP_PAGE_BG = new Color(236, 251, 232, 255);
export const BREED_PAGE_BG = new Color(255, 238, 235, 255);
export const ADVENTURE_PAGE_BG = new Color(232, 245, 255, 255);

const PANEL_FILL = new Color(255, 252, 235, 255);
const PANEL_BORDER = new Color(111, 78, 43, 255);
const BUTTON_FILL = new Color(255, 226, 154, 255);
const BUTTON_SELECTED = new Color(255, 192, 92, 255);
const BUTTON_BORDER = new Color(123, 82, 43, 255);
const SLOT_FILL = new Color(255, 253, 240, 255);

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
        pageH: DESIGN_HEIGHT,
        left: LEFT,
        right: RIGHT,
        top: TOP,
        bottom: BOTTOM,
        titleY: 590,
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
    x: number,
    y: number,
    width: number,
    height: number,
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
        UIEffects.playClick();
        callback.call(target);
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
