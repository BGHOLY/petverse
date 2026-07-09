import { Color, find, Graphics, Label, Node, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { AudioManager } from './AudioManager';
import { getCanvasSize } from './UiKit';

export class ToastManager {
    private static toastNode: Node | null = null;
    private static label: Label | null = null;

    static show(message: string, duration = 1.5) {
        const node = this.ensureToastNode();
        if (!node || !this.label) {
            console.log('[Toast]', message);
            return;
        }

        this.label.string = message;
        node.active = true;
        node.setPosition(new Vec3(0, 20, 0));

        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }

        opacity.opacity = 0;
        tween(node).stop();
        tween(opacity).stop();

        AudioManager.playToast();

        tween(opacity)
            .to(0.1, { opacity: 255 })
            .delay(duration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                node.active = false;
            })
            .start();

        tween(node)
            .delay(0.1 + duration)
            .to(0.3, { position: new Vec3(0, 70, 0) }, { easing: 'sineOut' })
            .start();
    }

    private static ensureToastNode(): Node | null {
        const canvas = find('Canvas');
        if (!canvas) return null;

        let toastLayer = canvas.getChildByName('ToastLayer');
        if (!toastLayer) {
            toastLayer = new Node('ToastLayer');
            canvas.addChild(toastLayer);
            toastLayer.setPosition(new Vec3(0, 0, 0));
            toastLayer.addComponent(UITransform).setContentSize(getCanvasSize());
        }

        toastLayer.active = true;
        toastLayer.setSiblingIndex(999);

        if (this.toastNode && this.label) {
            return this.toastNode;
        }

        const size = getCanvasSize();
        const width = Math.min(size.width - 70, 360);

        let node = toastLayer.getChildByName('ToastMessage');
        if (!node) {
            node = new Node('ToastMessage');
            toastLayer.addChild(node);
            node.setPosition(new Vec3(0, 20, 0));

            const transform = node.addComponent(UITransform);
            transform.setContentSize(width, 64);

            const graphics = node.addComponent(Graphics);
            graphics.fillColor = new Color(45, 32, 24, 225);
            graphics.roundRect(-width / 2, -32, width, 64, 18);
            graphics.fill();

            const labelNode = new Node('Label');
            node.addChild(labelNode);
            labelNode.setPosition(new Vec3(0, 0, 0));
            labelNode.addComponent(UITransform).setContentSize(width - 24, 54);

            const label = labelNode.addComponent(Label);
            label.fontSize = 17;
            label.lineHeight = 23;
            label.color = new Color(255, 244, 220, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.enableWrapText = true;
            label.overflow = Label.Overflow.SHRINK;

            this.label = label;
        } else {
            this.label = node.getChildByName('Label')?.getComponent(Label) || null;
        }

        this.toastNode = node;
        node.active = false;
        return node;
    }
}
