import { Node, Widget } from 'cc';
import { clearNode, getOrCreate, setRect } from '../cute/CuteUiKit';
import { renderCleanPageBackground } from './CleanPageBackground';
import { V6_CANVAS_WIDTH, V6_CONTENT_HEIGHT, V6_PAGE_WIDTH, V6_SAFE_SIDE } from './UiMetrics';

export type V6PageShell = {
    root: Node;
    content: Node;
};

/** Reusable phase-v6 page viewport. Future pages migrate into this same shell. */
export function createV6PageShell(parent: Node, name: string): V6PageShell {
    const root = getOrCreate(parent, name);
    setRect(root, 0, 0, V6_CANVAS_WIDTH, V6_CONTENT_HEIGHT);
    clearNode(root);
    renderCleanPageBackground(root);

    const content = getOrCreate(root, 'SafeContent');
    setRect(content, 0, 0, V6_PAGE_WIDTH, V6_CONTENT_HEIGHT);
    const widget = content.getComponent(Widget) || content.addComponent(Widget);
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.left = V6_SAFE_SIDE;
    widget.right = V6_SAFE_SIDE;
    widget.top = 0;
    widget.bottom = 0;
    widget.updateAlignment();
    return { root, content };
}

