import { Button, Label, Node, UITransform, Vec3 } from 'cc';

export function getOrCreateNode(parent: Node, name: string): Node {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        parent.addChild(node);
    }
    return node;
}

export function getOrCreateLabel(
    parent: Node,
    name: string,
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
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.enableWrapText = true;
    return label;
}

export function getOrCreateButton(
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

    const label = getOrCreateLabel(node, 'Label', 0, 0, width, height, Math.min(22, Math.max(16, Math.floor(height / 2.4))));
    label.string = text;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    button.node.off(Button.EventType.CLICK);
    button.node.on(Button.EventType.CLICK, callback, target);
    return button;
}

export function clearGenerated(parent: Node, prefix = 'Generated') {
    for (const child of [...parent.children]) {
        if (child.name.startsWith(prefix)) {
            child.destroy();
        }
    }
}

export function compactJson(value: any): string {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}
