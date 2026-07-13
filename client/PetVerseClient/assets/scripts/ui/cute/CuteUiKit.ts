import {
    Button,
    Color,
    Graphics,
    Label,
    Node,
    resources,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
} from 'cc';
import CuteFeedback from './CuteFeedback';

export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

export const CuteTheme = {
    cream: new Color(255, 249, 230, 255),
    paper: new Color(255, 252, 239, 255),
    paperWarm: new Color(255, 243, 216, 255),
    mint: new Color(207, 238, 205, 255),
    mintDark: new Color(76, 144, 108, 255),
    peach: new Color(255, 207, 192, 255),
    peachDark: new Color(216, 112, 99, 255),
    honey: new Color(255, 207, 89, 255),
    honeyDark: new Color(190, 126, 34, 255),
    sky: new Color(207, 234, 244, 255),
    lilac: new Color(222, 205, 242, 255),
    pink: new Color(255, 188, 205, 255),
    caramel: new Color(117, 73, 42, 255),
    caramelSoft: new Color(174, 121, 73, 255),
    wood: new Color(194, 134, 77, 255),
    woodDark: new Color(126, 78, 42, 255),
    white: new Color(255, 255, 255, 255),
    // Secondary copy still needs to pass on a small 720-wide phone.  Keep it
    // warm, but darker than the old decorative brown so 12px labels stay clear.
    muted: new Color(111, 82, 61, 255),
    green: new Color(116, 187, 82, 255),
    red: new Color(224, 104, 103, 255),
    shadow: new Color(96, 55, 32, 48),
    transparent: new Color(255, 255, 255, 0),
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
    transform.setAnchorPoint(0.5, 0.5);
    transform.setContentSize(width, height);
    return transform;
}

export function rounded(
    node: Node,
    width: number,
    height: number,
    fill: Color,
    radius = 22,
    border: Color | null = CuteTheme.caramelSoft,
    lineWidth = 2,
) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();
    if (border && lineWidth > 0) {
        graphics.strokeColor = border;
        graphics.lineWidth = lineWidth;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.stroke();
    }
    return graphics;
}

export function circle(
    node: Node,
    radius: number,
    fill: Color,
    border: Color | null = CuteTheme.caramelSoft,
    lineWidth = 2,
) {
    const graphics = node.getComponent(Graphics) || node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fill;
    graphics.circle(0, 0, radius);
    graphics.fill();
    if (border && lineWidth > 0) {
        graphics.strokeColor = border;
        graphics.lineWidth = lineWidth;
        graphics.circle(0, 0, radius);
        graphics.stroke();
    }
    return graphics;
}

export function text(
    parent: Node,
    name: string,
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize = 24,
    color: Color = CuteTheme.caramel,
    align: 'left' | 'center' | 'right' = 'center',
    bold = false,
) {
    const node = getOrCreate(parent, name);
    const fixedX = align === 'left'
        ? x + width / 2
        : align === 'right'
            ? x - width / 2
            : x;
    const transform = setRect(node, fixedX, y, width, height);
    transform.setAnchorPoint(0.5, 0.5);

    const label = node.getComponent(Label) || node.addComponent(Label);
    label.string = String(value ?? '');
    const readableFontSize = Math.max(12, fontSize);
    label.fontSize = readableFontSize;
    label.lineHeight = Math.max(readableFontSize + 4, Math.floor(readableFontSize * 1.25));
    label.color = color;
    label.enableWrapText = true;
    label.overflow = Label.Overflow.SHRINK;
    label.horizontalAlign = align === 'left'
        ? Label.HorizontalAlign.LEFT
        : align === 'right'
            ? Label.HorizontalAlign.RIGHT
            : Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.isBold = bold;
    return label;
}

export function panel(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill: Color = CuteTheme.paper,
    radius = 28,
    shadow = true,
    border = CuteTheme.caramelSoft,
    borderWidth = 2,
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);

    if (shadow) {
        const shadowNode = new Node('Shadow');
        node.addChild(shadowNode);
        setRect(shadowNode, 0, -7, width, height);
        rounded(shadowNode, width, height, CuteTheme.shadow, radius, null, 0);
    }

    const face = new Node('Face');
    node.addChild(face);
    setRect(face, 0, 0, width, height);
    rounded(face, width, height, fill, radius, border, borderWidth);
    return node;
}

export function sticker(
    parent: Node,
    name: string,
    icon: string,
    title: string,
    value: string,
    x: number,
    y: number,
    width = 126,
    height = 94,
    fill: Color = CuteTheme.paper,
    accent: Color = CuteTheme.peach,
) {
    const node = panel(parent, name, x, y, width, height, fill, 28, true, CuteTheme.white, 3);
    const dot = new Node('Accent');
    node.addChild(dot);
    setRect(dot, -width / 2 + 15, height / 2 - 15, 20, 20);
    circle(dot, 10, accent, CuteTheme.white, 2);
    text(node, 'Icon', icon, -width / 2 + 25, 7, 42, 46, 28, CuteTheme.caramel, 'left', true);
    text(node, 'Title', title, 2, 18, width - 62, 28, 17, CuteTheme.caramel, 'center', true);
    text(node, 'Value', value, 2, -20, width - 40, 28, 16, CuteTheme.muted, 'center', true);
    return node;
}

export function button(
    parent: Node,
    name: string,
    title: string,
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
        icon?: string;
        iconPath?: string;
        iconSize?: number;
        subtitle?: string;
        border?: Color;
    } = {},
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);

    const disabled = Boolean(options.disabled);
    const fill = disabled
        ? new Color(222, 216, 202, 255)
        : options.selected
            ? CuteTheme.honey
            : options.fill || CuteTheme.paperWarm;

    const shadow = new Node('Shadow');
    node.addChild(shadow);
    setRect(shadow, 0, -5, width, height);
    rounded(shadow, width, height, CuteTheme.shadow, options.radius ?? 22, null, 0);

    const face = new Node('Face');
    node.addChild(face);
    setRect(face, 0, 0, width, height);
    rounded(
        face,
        width,
        height,
        fill,
        options.radius ?? 22,
        options.border || (options.selected ? CuteTheme.honeyDark : CuteTheme.caramelSoft),
        options.selected ? 4 : 2,
    );

    if (options.iconPath) {
        const iconSize = Math.min(options.iconSize || height - 12, height - 8, 64);
        image(face, 'IconImage', options.iconPath, -width / 2 + iconSize / 2 + 8, 0, iconSize, iconSize, fill);
        const textLeft = -width / 2 + iconSize + 18;
        const textWidth = Math.max(40, width - iconSize - 30);
        text(face, 'Title', title, textLeft, options.subtitle ? 9 : 0, textWidth, options.subtitle ? 26 : height - 10, options.fontSize || 16, options.textColor || CuteTheme.caramel, 'left', true);
        if (options.subtitle) {
            text(face, 'Subtitle', options.subtitle, textLeft, -15, textWidth, 22, 11, options.textColor || CuteTheme.muted, 'left', false);
        }
    } else if (options.icon) {
        text(face, 'Icon', options.icon, 0, options.subtitle ? 16 : 8, width - 12, height * 0.55, Math.min(34, height * 0.36), CuteTheme.caramel, 'center', true);
        text(face, 'Title', title, 0, options.subtitle ? -18 : -height * 0.28, width - 12, 28, options.fontSize || 17, options.textColor || CuteTheme.caramel, 'center', true);
        if (options.subtitle) {
            text(face, 'Subtitle', options.subtitle, 0, -height * 0.28, width - 16, 24, 12, CuteTheme.muted, 'center', false);
        }
    } else {
        text(face, 'Title', title, 0, options.subtitle ? 10 : 0, width - 16, options.subtitle ? height * 0.55 : height - 8, options.fontSize || 18, options.textColor || CuteTheme.caramel, 'center', true);
        if (options.subtitle) {
            text(face, 'Subtitle', options.subtitle, 0, -height * 0.28, width - 16, 24, 12, CuteTheme.muted, 'center', false);
        }
    }

    const comp = node.getComponent(Button) || node.addComponent(Button);

    // Do not call node.off(TOUCH_START / TOUCH_END / TOUCH_CANCEL) here.
    // Button registers its own touch listeners on the same node; removing all
    // listeners also removes Button's internal click dispatcher and makes every
    // button appear unresponsive in Cocos preview. Use the built-in SCALE
    // transition for press feedback instead.
    comp.transition = Button.Transition.SCALE;
    comp.zoomScale = 0.96;
    comp.interactable = !disabled;

    // Re-rendering reuses the node, so replace only our public click callback.
    // The Button component's internal touch listeners remain untouched.
    node.off(Button.EventType.CLICK);
    if (!disabled) {
        node.on(Button.EventType.CLICK, () => {
            CuteFeedback.playClick();
            onClick();
        });
    }
    return node;
}

export function capsule(
    parent: Node,
    name: string,
    icon: string,
    value: string,
    x: number,
    y: number,
    width: number,
    fill: Color,
    onPlus?: ClickHandler,
) {
    const node = panel(parent, name, x, y, width, 42, fill, 21, true, CuteTheme.white, 2);
    text(node, 'Icon', icon, -width / 2 + 16, 0, 34, 34, 22, CuteTheme.caramel, 'left', true);
    text(node, 'Value', value, -width / 2 + 52, 0, width - 86, 34, 17, CuteTheme.caramel, 'left', true);
    if (onPlus) {
        button(node, 'Plus', '+', width / 2 - 19, 0, 34, 34, onPlus, {
            fill: CuteTheme.green,
            textColor: CuteTheme.white,
            fontSize: 24,
            radius: 17,
            border: CuteTheme.white,
        });
    }
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
    fill = CuteTheme.green,
    track = new Color(226, 215, 190, 255),
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);
    rounded(node, width, height, track, height / 2, CuteTheme.white, 1);
    const ratio = Math.max(0, Math.min(1, Number(value || 0)));
    if (ratio > 0) {
        const fillNode = new Node('Fill');
        node.addChild(fillNode);
        const fillWidth = Math.max(height, width * ratio);
        setRect(fillNode, -(width - fillWidth) / 2, 0, fillWidth, height);
        rounded(fillNode, fillWidth, height, fill, height / 2, null, 0);
    }
    return node;
}

export function tag(
    parent: Node,
    name: string,
    title: string,
    x: number,
    y: number,
    width: number,
    fill: Color = CuteTheme.mint,
    color: Color = CuteTheme.caramel,
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, 34);
    clearNode(node);
    rounded(node, width, 34, fill, 17, CuteTheme.white, 2);
    text(node, 'Text', title, 0, 0, width - 10, 28, 15, color, 'center', true);
    return node;
}

export function pawSlot(parent: Node, name: string, index: number, x: number, y: number, locked = false) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, 50, 50);
    clearNode(node);
    circle(node, 24, locked ? new Color(226, 214, 196, 255) : CuteTheme.paperWarm, CuteTheme.caramelSoft, 2);
    text(node, 'Paw', locked ? '🔒' : '🐾', 0, 5, 44, 30, locked ? 18 : 20, CuteTheme.caramel, 'center', true);
    if (!locked) text(node, 'No', String(index), 0, -12, 30, 22, 12, CuteTheme.caramel, 'center', true);
    return node;
}

export function headingTag(parent: Node, name: string, title: string, x: number, y: number, width = 150, fill = CuteTheme.paperWarm) {
    const node = panel(parent, name, x, y, width, 48, fill, 22, false, CuteTheme.white, 2);
    text(node, 'Text', title, 0, 0, width - 16, 40, 22, CuteTheme.caramel, 'center', true);
    return node;
}

export function cloudSign(parent: Node, name: string, title: string, x: number, y: number, width = 210, height = 64) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);

    const body = new Node('Body');
    node.addChild(body);
    setRect(body, 0, 0, width - 36, height - 14);
    rounded(body, width - 36, height - 14, CuteTheme.paper, 24, CuteTheme.caramelSoft, 2);

    const positions = [
        [-width / 2 + 25, 0, 24],
        [width / 2 - 25, 0, 24],
        [-width / 2 + 42, height / 2 - 10, 18],
        [width / 2 - 42, height / 2 - 10, 18],
    ] as Array<[number, number, number]>;
    positions.forEach(([px, py, radius], index) => {
        const puff = new Node(`Puff${index}`);
        node.addChild(puff);
        setRect(puff, px, py, radius * 2, radius * 2);
        circle(puff, radius, CuteTheme.paper, CuteTheme.caramelSoft, 2);
    });

    text(node, 'Title', title, 0, -1, width - 42, height - 14, 24, CuteTheme.caramel, 'center', true);
    return node;
}

export function image(
    parent: Node,
    name: string,
    resourcePath: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fallback: Color = CuteTheme.paperWarm,
) {
    const node = getOrCreate(parent, name);
    setRect(node, x, y, width, height);
    clearNode(node);
    rounded(node, width, height, fallback, 20, CuteTheme.white, 3);

    const spriteNode = new Node('Sprite');
    node.addChild(spriteNode);
    setRect(spriteNode, 0, 0, width - 8, height - 8);
    const sprite = spriteNode.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const apply = (asset: SpriteFrame | null) => {
        if (!asset || !spriteNode.isValid) return;
        sprite.spriteFrame = asset;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        setRect(spriteNode, 0, 0, width - 8, height - 8);
    };

    resources.load(`${resourcePath}/spriteFrame`, SpriteFrame, (error, asset) => {
        if (!error && asset) {
            apply(asset);
            return;
        }
        resources.load(resourcePath, SpriteFrame, (fallbackError, fallbackAsset) => {
            if (!fallbackError && fallbackAsset) apply(fallbackAsset);
        });
    });

    return node;
}

export function formatNumber(value: any) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return '0';
    return number.toLocaleString('zh-CN');
}

export function clamp01(value: any) {
    return Math.max(0, Math.min(1, Number(value || 0)));
}

export function safeName(value: any, fallback = '未命名') {
    const textValue = String(value ?? '').trim();
    return textValue || fallback;
}
