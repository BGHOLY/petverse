import { Node, tween, UIOpacity, Vec3 } from 'cc';
import { AudioManager } from './AudioManager';

export class UIEffects {
    static bindButtonFeedback(node: Node) {
        if ((node as any).__petverseButtonFeedbackBound) {
            return;
        }

        (node as any).__petverseButtonFeedbackBound = true;
        const baseScale = node.scale.clone();

        node.on(Node.EventType.TOUCH_START, () => {
            tween(node).stop();
            tween(node)
                .to(0.05, {
                    scale: new Vec3(baseScale.x * 0.94, baseScale.y * 0.94, baseScale.z),
                })
                .start();
        });

        node.on(Node.EventType.TOUCH_END, () => {
            tween(node).stop();
            tween(node).to(0.07, { scale: baseScale }).start();
        });

        node.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(node).stop();
            tween(node).to(0.07, { scale: baseScale }).start();
        });
    }

    static playClick() {
        AudioManager.playClick();
    }

    static playPageIn(node: Node) {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }

        const targetPos = node.position.clone();
        node.setPosition(new Vec3(36, 0, targetPos.z));
        opacity.opacity = 0;

        tween(node)
            .to(0.18, { position: new Vec3(0, 0, targetPos.z) }, { easing: 'sineOut' })
            .start();

        tween(opacity)
            .to(0.18, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    }

    static playHomeIn(node: Node) {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }

        opacity.opacity = 0;
        tween(opacity)
            .to(0.16, { opacity: 255 }, { easing: 'sineOut' })
            .start();
    }
}
