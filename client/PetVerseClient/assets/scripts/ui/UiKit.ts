import { Button, Color, Label, Node, UITransform, Vec3 } from 'cc';

const WHITE = new Color(255, 255, 255, 255);
const SOFT_WHITE = new Color(230, 238, 255, 255);

export function getOrCreateNode(parent: Node, name: string): Node {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        parent.addChild(node);
    }
    return node;
}

export function clearChildren(parent: Node) {
    for (const child of [...parent.children]) {
        child.destroy();
    }
}

export function clearGenerated(parent: Node, prefix = 'Generated') {
    for (const child of [...parent.children]) {
        if (child.name.startsWith(prefix)) {
            child.destroy();
        }
    }
}

export function createLabel(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize = 22,
): Label {
    const node = getOrCreateNode(parent, name);
    let transform = node.getComponent(UITransform);
    if (!transform) {
        transform = node.addComponent(UITransform);
    }

    transform.setContentSize(width, height);
    node.setPosition(new Vec3(x, y, 0));

    let label = node.getComponent(Label);
    if (!label) {
        label = node.addComponent(Label);
    }

    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.color = WHITE;

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
): Button {
    const node = getOrCreateNode(parent, name);
    let transform = node.getComponent(UITransform);
    if (!transform) {
        transform = node.addComponent(UITransform);
    }

    transform.setContentSize(width, height);
    node.setPosition(new Vec3(x, y, 0));

    let button = node.getComponent(Button);
    if (!button) {
        button = node.addComponent(Button);
    }
    button.transition = Button.Transition.SCALE;
    (button as any).clickEvents = [];

    const label = createLabel(node, 'Label', text, 0, 0, width, height, Math.min(22, Math.max(16, Math.floor(height / 2.6))));
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = SOFT_WHITE;

    button.node.off(Button.EventType.CLICK);
    button.node.on(Button.EventType.CLICK, callback, target);

    return button;
}

export function createPageTitle(parent: Node, title: string): Label {
    const label = createLabel(parent, 'PageTitle', title, 0, 360, 640, 46, 30);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
}

export function createStatusLabel(parent: Node, name = 'StatusLabel'): Label {
    const label = createLabel(parent, name, '', 0, 315, 640, 42, 18);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    return label;
}

export function createInfoText(parent: Node, name: string, text = ''): Label {
    return createLabel(parent, name, text, 0, 80, 620, 430, 20);
}

export function createListButton(
    parent: Node,
    name: string,
    text: string,
    index: number,
    callback: () => void,
    target?: any,
): Button {
    const y = 250 - index * 70;
    return createButton(parent, name, text, 0, y, 620, 62, callback, target);
}

export const getOrCreateLabel = createLabel;
export const getOrCreateButton = createButton;

export function normalizeList(result: any, keys: string[] = []): any[] {
    if (Array.isArray(result)) {
        return result;
    }

    for (const key of keys) {
        if (Array.isArray(result?.[key])) {
            return result[key];
        }
    }

    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (Array.isArray(result?.items)) {
        return result.items;
    }

    if (Array.isArray(result?.list)) {
        return result.list;
    }

    return [];
}
