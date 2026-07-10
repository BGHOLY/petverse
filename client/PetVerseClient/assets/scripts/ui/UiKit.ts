import {
    Button,
    Color,
    Graphics,
    Label,
    Node,
    Size,
    UITransform,
    Vec3,
} from 'cc';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

export const Theme = {
    background: new Color(250, 247, 224, 255),
    backgroundMint: new Color(223, 247, 235, 255),
    backgroundBlue: new Color(221, 245, 250, 255),
    card: new Color(255, 255, 250, 255),
    cardSoft: new Color(249, 252, 245, 255),
    navy: new Color(31, 52, 82, 255),
    muted: new Color(102, 117, 137, 255),
    green: new Color(42, 194, 132, 255),
    greenDark: new Color(33, 139, 94, 255),
    mint: new Color(190, 236, 204, 255),
    yellow: new Color(255, 196, 67, 255),
    orange: new Color(244, 154, 42, 255),
    peach: new Color(255, 222, 180, 255),
    blue: new Color(68, 170, 224, 255),
    paleBlue: new Color(225, 245, 255, 255),
    danger: new Color(230, 96, 86, 255),
    border: new Color(224, 226, 215, 255),
    shadow: new Color(38, 54, 70, 32),
    white: new Color(255, 255, 255, 255),
    disabled: new Color(209, 214, 217, 255),
};

export type ClickHandler = () => void;

export function clearNode(parent: Node) {
    const children = [...parent.children];
    parent.removeAllChildren();
    for (const child of children) child.destroy();
}

export function getOrCreate(parent: Node, name: string) {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        parent.addChild(node);
    }
    return node;
}

export function setRect(node: Node, x: number, y: number, width: number, height: number) {
    node.setPosition(new Vec3(x, y, 0));
    const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
    transform.setContentSize(width, height);
    return transform;
}

export function drawRounded(
    node: Node,
    width: number,
    height: number,
    fill: Color,
    radius = 24,
    border: Color | null = null,
    lineWidth = 0,
) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
    if (border && lineWidth > 0) {
        graphics.lineWidth = lineWidth;
        graphics.strokeColor = border;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.stroke();
    }
    return graphics;
}

export function drawCircle(node: Node, radius: number, fill: Color, border: Color | null = null, lineWidth = 0) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.circle(0, 0, radius);
    graphics.fill();
    if (border && lineWidth > 0) {
        graphics.lineWidth = lineWidth;
        graphics.strokeColor = border;
        graphics.circle(0, 0, radius);
        graphics.stroke();
    }
    return graphics;
}

export function panel(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: Color = Theme.card,
    radius = 24,
    shadow = true,
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);
    if (shadow) {
        const shadowNode = new Node('Shadow');
        node.addChild(shadowNode);
        setRect(shadowNode, 0, -7, width, height);
        drawRounded(shadowNode, width, height, Theme.shadow, radius);
    }
    const face = new Node('Face');
    node.addChild(face);
    setRect(face, 0, 0, width, height);
    drawRounded(face, width, height, fill, radius, Theme.border, 1.5);
    return node;
}

export function label(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize = 24,
    color: Color = Theme.navy,
    align: 'left' | 'center' | 'right' = 'center',
    bold = false,
) {
    const node = getOrCreate(parent, name);

    // MainUI passes x as the left edge for left-aligned text and as the
    // right edge for right-aligned text. Cocos positions UI nodes by their
    // centre, so convert the edge coordinate before applying the rect.
    const fixedX = align === 'left'
        ? x + width / 2
        : align === 'right'
            ? x - width / 2
            : x;

    const transform = setRect(node, fixedX, y, width, height);
    transform.setAnchorPoint(0.5, 0.5);

    const comp = node.getComponent(Label) || node.addComponent(Label);
    comp.string = String(text ?? '');
    comp.fontSize = fontSize;
    comp.lineHeight = Math.max(fontSize + 4, Math.floor(fontSize * 1.2));
    comp.color = color;
    comp.enableWrapText = true;
    comp.overflow = Label.Overflow.SHRINK;
    comp.horizontalAlign = align === 'left'
        ? Label.HorizontalAlign.LEFT
        : align === 'right'
            ? Label.HorizontalAlign.RIGHT
            : Label.HorizontalAlign.CENTER;
    comp.verticalAlign = Label.VerticalAlign.CENTER;
    comp.isBold = bold;
    return comp;
}

export function button(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: ClickHandler,
    options: {
        fill?: Color;
        textColor?: Color;
        fontSize?: number;
        radius?: number;
        selected?: boolean;
        disabled?: boolean;
        subtitle?: string;
    } = {},
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);

    const disabled = Boolean(options.disabled);
    const fill = disabled
        ? Theme.disabled
        : options.selected
            ? Theme.green
            : options.fill || Theme.yellow;
    drawRounded(node, width, height, fill, options.radius ?? Math.min(24, height / 2), Theme.white, 1);

    const title = label(
        node,
        'Title',
        text,
        0,
        options.subtitle ? 9 : 0,
        width - 18,
        options.subtitle ? height * 0.58 : height - 8,
        options.fontSize || Math.max(16, Math.min(26, Math.floor(height * 0.33))),
        options.textColor || (options.selected ? Theme.white : Theme.navy),
        'center',
        true,
    );
    title.enableWrapText = false;

    if (options.subtitle) {
        label(node, 'Subtitle', options.subtitle, 0, -18, width - 18, 22, 12, options.textColor || Theme.muted);
    }

    const buttonComp = node.getComponent(Button) || node.addComponent(Button);
    buttonComp.transition = Button.Transition.SCALE;
    buttonComp.zoomScale = 0.96;
    buttonComp.interactable = !disabled;
    node.off(Button.EventType.CLICK);
    if (!disabled) node.on(Button.EventType.CLICK, onClick);
    return buttonComp;
}

export function pill(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill = Theme.card,
    color = Theme.navy,
    fontSize = 18,
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    drawRounded(node, width, height, fill, height / 2, Theme.white, 1);
    label(node, 'Label', text, 0, 0, width - 12, height - 6, fontSize, color, 'center', true);
    return node;
}

export function progress(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    fill = Theme.yellow,
    track = new Color(225, 232, 220, 255),
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);
    drawRounded(node, width, height, track, height / 2);
    const ratio = Math.max(0, Math.min(1, Number(value || 0)));
    if (ratio > 0) {
        const fillNode = new Node('Fill');
        node.addChild(fillNode);
        const fillWidth = Math.max(height, width * ratio);
        setRect(fillNode, -(width - fillWidth) / 2, 0, fillWidth, height);
        drawRounded(fillNode, fillWidth, height, fill, height / 2);
    }
    return node;
}

export function sectionTitle(parent: Node, text: string, y: number, rightText = '') {
    label(parent, `Title_${y}`, text, -292, y, 420, 46, 28, Theme.navy, 'left', true);
    if (rightText) label(parent, `Right_${y}`, rightText, 210, y, 170, 38, 16, Theme.greenDark, 'right', true);
}

export function smallIcon(parent: Node, name: string, text: string, x: number, y: number, size: number, fill: Color) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, size, size);
    drawCircle(node, size / 2, fill, Theme.white, 2);
    label(node, 'Glyph', text, 0, 0, size - 8, size - 8, Math.floor(size * 0.42), Theme.navy, 'center', true);
    return node;
}

export function petPortrait(parent: Node, name: string, x: number, y: number, size: number, pet: any) {
    const root = getOrCreate(parent, name);
    setRect(root, x, y, size, size);
    clearNode(root);

    const halo = new Node('Halo');
    root.addChild(halo);
    setRect(halo, 0, 0, size, size);
    drawCircle(halo, size * 0.48, new Color(255, 243, 190, 255), Theme.white, 4);

    const earLeft = new Node('EarLeft');
    root.addChild(earLeft);
    setRect(earLeft, -size * 0.24, size * 0.28, size * 0.26, size * 0.30);
    drawRounded(earLeft, size * 0.26, size * 0.30, new Color(245, 168, 81, 255), 16);
    earLeft.angle = -18;

    const earRight = new Node('EarRight');
    root.addChild(earRight);
    setRect(earRight, size * 0.24, size * 0.28, size * 0.26, size * 0.30);
    drawRounded(earRight, size * 0.26, size * 0.30, new Color(245, 168, 81, 255), 16);
    earRight.angle = 18;

    const face = new Node('Face');
    root.addChild(face);
    setRect(face, 0, 0, size * 0.78, size * 0.68);
    drawRounded(face, size * 0.78, size * 0.68, new Color(247, 181, 92, 255), size * 0.24);

    const muzzle = new Node('Muzzle');
    root.addChild(muzzle);
    setRect(muzzle, 0, -size * 0.10, size * 0.48, size * 0.28);
    drawRounded(muzzle, size * 0.48, size * 0.28, new Color(255, 245, 219, 255), size * 0.13);

    smallIcon(root, 'EyeLeft', '', -size * 0.15, size * 0.05, size * 0.08, Theme.navy);
    smallIcon(root, 'EyeRight', '', size * 0.15, size * 0.05, size * 0.08, Theme.navy);
    smallIcon(root, 'Nose', '', 0, -size * 0.08, size * 0.09, new Color(55, 49, 42, 255));

    const scarf = new Node('Scarf');
    root.addChild(scarf);
    setRect(scarf, 0, -size * 0.30, size * 0.54, size * 0.13);
    drawRounded(scarf, size * 0.54, size * 0.13, Theme.green, size * 0.06);
    label(scarf, 'Paw', '●', 0, 0, size * 0.15, size * 0.12, Math.floor(size * 0.09), Theme.white);

    const badgeText = pet?.rarityName || `R${pet?.rarity || 1}`;
    pill(root, 'RarityBadge', badgeText, 0, -size * 0.47, Math.min(size * 0.72, 150), 30, Theme.navy, Theme.white, 13);
    return root;
}

export function statChip(parent: Node, name: string, labelText: string, value: any, x: number, y: number, width = 145) {
    const node = panel(parent, name, x, y, width, 54, Theme.cardSoft, 16, false);
    label(node, 'Label', labelText, -width * 0.27, 0, width * 0.45, 36, 14, Theme.muted, 'left');
    label(node, 'Value', String(value ?? 0), width * 0.25, 0, width * 0.42, 36, 18, Theme.navy, 'right', true);
    return node;
}

export function formatNumber(value: any) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString() : '0';
}

export function rarityText(pet: any) {
    if (pet?.rarityName) return String(pet.rarityName);
    const names: Record<number, string> = {
        1: '普通',
        2: '优秀',
        3: '稀有',
        4: '史诗',
        5: '传说',
        6: '神话',
    };
    return names[Number(pet?.rarity || 1)] || `R${pet?.rarity || 1}`;
}

export function normalizeType(item: any) {
    return String(item?.type || item?.itemType || item?.category || item?.item?.type || 'other').toLowerCase();
}

export function itemName(item: any) {
    return String(item?.name || item?.itemName || item?.item?.name || item?.itemCode || item?.code || '未知物品');
}


// -----------------------------------------------------------------------------
// 旧页面兼容导出：保留原有脚本的编译能力。新版界面由 MainUI 统一渲染。
// -----------------------------------------------------------------------------
export const TEXT_DARK = Theme.navy;
export const TEXT_LIGHT = Theme.white;
export const PAGE_BG = Theme.background;
export const PET_PAGE_BG = new Color(245, 238, 255, 255);
export const BAG_PAGE_BG = new Color(255, 247, 224, 255);
export const SHOP_PAGE_BG = new Color(236, 251, 232, 255);
export const BREED_PAGE_BG = new Color(255, 238, 235, 255);
export const ADVENTURE_PAGE_BG = new Color(232, 245, 255, 255);
export const LEFT = -360;
export const RIGHT = 360;
export const TOP = 640;
export const BOTTOM = -640;

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

export function getCanvasSize() { return new Size(DESIGN_WIDTH, DESIGN_HEIGHT); }
export function getNodeSize(node: Node) {
    const size = node.getComponent(UITransform)?.contentSize;
    return size && size.width > 0 && size.height > 0 ? size : getCanvasSize();
}
export function getPageLayout(_node?: Node): PageLayout {
    return { w: DESIGN_WIDTH, h: DESIGN_HEIGHT, pageW: DESIGN_WIDTH, pageH: DESIGN_HEIGHT, left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM, titleY: 590 };
}
export const getOrCreateNode = getOrCreate;
export function ensureTransform(node: Node, width: number, height: number) { return setRect(node, node.position.x, node.position.y, width, height); }
export const setNodeRect = setRect;
export function drawRoundRect(node: Node, width: number, height: number, fill: Color, border: Color, radius = 8, lineWidth = 2) { return drawRounded(node, width, height, fill, radius, border, lineWidth); }
export function createPanel(parent: Node, name: string, x: number, y: number, width: number, height: number, fill: Color = Theme.card, _border: Color = Theme.border, radius = 8, _lineWidth = 2) {
    return panel(parent, name, x, y, width, height, fill, radius, false);
}
export function createPageBackground(parent: Node, title: string, fill: Color = PAGE_BG) {
    const layout = getPageLayout(parent);
    createPanel(parent, 'PageOpaqueBackground', 0, 0, layout.pageW, layout.pageH, fill, Theme.border, 0, 0).setSiblingIndex(0);
    createPanel(parent, 'PageHeaderBar', 0, layout.titleY, layout.pageW, 60, Theme.card, Theme.border, 0, 0);
    createLabel(parent, 'PageTitle', title, 0, layout.titleY, 260, 50, 30, Theme.navy);
    return layout;
}
export function createGridSlot(parent: Node, name: string, x: number, y: number, width: number, height: number) {
    return createPanel(parent, name, x, y, width, height, Theme.cardSoft, Theme.border, 8, 1);
}
export function createLabel(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, fontSize = 18, color: Color = Theme.navy) {
    return label(parent, name, text, x, y, width, height, fontSize, color);
}
export function createInfoText(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, fontSize = 14) {
    const result = label(parent, name, text, x, y, width, height, fontSize, Theme.navy, 'left');
    result.verticalAlign = Label.VerticalAlign.TOP;
    return result;
}
export function createButton(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, callback: () => void, target?: any, selected = false, fontSize?: number) {
    return button(parent, name, text, x, y, width, height, () => callback.call(target), { selected, fontSize });
}
export function clearGenerated(parent: Node, prefix = 'Generated') {
    for (const child of [...parent.children]) if (child.name.startsWith(prefix)) child.destroy();
}
export const clearChildren = clearNode;
export function normalizeList(result: any, keys: string[] = []): any[] {
    if (Array.isArray(result)) return result;
    for (const key of keys) if (Array.isArray(result?.[key])) return result[key];
    for (const key of ['data', 'items', 'inventory', 'shopItems', 'pets', 'rankings', 'list', 'eggs', 'friends', 'marriages']) {
        if (Array.isArray(result?.[key])) return result[key];
    }
    return [];
}
export function compactJson(value: any) { try { return JSON.stringify(value); } catch { return String(value); } }
export const getOrCreateButton = createButton;
export const getOrCreateLabel = createLabel;
export function createPageTitle(parent: Node, title: string) { return createLabel(parent, 'PageTitle', title, 0, getPageLayout(parent).titleY, 260, 50, 30, Theme.navy); }
export function createStatusLabel(parent: Node, name = 'StatusLabel') { return createLabel(parent, name, '', 0, getPageLayout(parent).titleY - 44, DESIGN_WIDTH - 80, 28, 13, Theme.navy); }
export function createListButton(parent: Node, name: string, text: string, index: number, callback: () => void, target?: any) {
    return createButton(parent, name, text, 0, 190 - index * 56, 300, 42, callback, target);
}
