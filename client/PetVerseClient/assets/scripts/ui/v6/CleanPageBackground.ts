import { Color, Graphics, Node } from 'cc';
import { CuteTheme, circle, panel, setRect } from '../cute/CuteUiKit';
import { V6_CANVAS_WIDTH, V6_CONTENT_HEIGHT } from './UiMetrics';

function leaf(parent: Node, name: string, x: number, y: number, size: number, color: Color, rotation: number) {
    const node = new Node(name);
    parent.addChild(node);
    setRect(node, x, y, size, size * 0.56);
    node.angle = rotation;
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.ellipse(0, 0, size / 2, size * 0.28);
    graphics.fill();
}

/**
 * Atmosphere only: warm paper, faint fibres and edge foliage. There are no
 * baked-in title plates, cards, buttons, currency bars or grid slots here.
 */
export function renderCleanPageBackground(parent: Node) {
    const background = panel(
        parent,
        'V6CleanBackground',
        0,
        0,
        V6_CANVAS_WIDTH,
        V6_CONTENT_HEIGHT,
        new Color(250, 239, 210, 255),
        0,
        false,
        CuteTheme.transparent,
        0,
    );

    for (let index = 0; index < 9; index += 1) {
        panel(
            background,
            `PaperFibre_${index}`,
            0,
            V6_CONTENT_HEIGHT / 2 - 76 - index * 112,
            676,
            2,
            new Color(174, 121, 73, index % 2 === 0 ? 18 : 10),
            1,
            false,
            CuteTheme.transparent,
            0,
        );
    }

    panel(background, 'LeftStitch', -349, 0, 8, V6_CONTENT_HEIGHT, new Color(176, 113, 61, 92), 4, false, CuteTheme.transparent, 0);
    panel(background, 'RightStitch', 349, 0, 8, V6_CONTENT_HEIGHT, new Color(176, 113, 61, 92), 4, false, CuteTheme.transparent, 0);

    const foliage = new Node('EdgeFoliage');
    background.addChild(foliage);
    setRect(foliage, 0, 0, V6_CANVAS_WIDTH, V6_CONTENT_HEIGHT);
    leaf(foliage, 'LeafLT1', -326, 474, 46, new Color(109, 157, 86, 175), 34);
    leaf(foliage, 'LeafLT2', -307, 452, 34, new Color(147, 179, 95, 155), -28);
    leaf(foliage, 'LeafRB1', 324, -478, 48, new Color(109, 157, 86, 175), -142);
    leaf(foliage, 'LeafRB2', 303, -454, 34, new Color(147, 179, 95, 155), 152);
    const flowerLT = new Node('FlowerLT');
    foliage.addChild(flowerLT);
    setRect(flowerLT, -330, 444, 18, 18);
    circle(flowerLT, 8, new Color(255, 214, 147, 225), CuteTheme.white, 2);
    const flowerRB = new Node('FlowerRB');
    foliage.addChild(flowerRB);
    setRect(flowerRB, 330, -444, 18, 18);
    circle(flowerRB, 8, new Color(255, 214, 147, 225), CuteTheme.white, 2);
    return background;
}
