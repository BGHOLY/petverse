import { Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { loadSpriteFrameResource } from '../cute/CuteUiKit';

export function createPetArtSprite(
    parent: Node,
    name: string,
    resourcePath: string,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    const old = parent.getChildByName(name);
    if (old) old.destroy();

    const node = new Node(name);
    parent.addChild(node);
    node.layer = parent.layer;
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    transform.setAnchorPoint(0.5, 0.5);
    node.setPosition(new Vec3(x, y, 0));

    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const apply = (frame: SpriteFrame | null) => {
        if (!frame || !node.isValid) return;
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        transform.setContentSize(width, height);
    };

    loadSpriteFrameResource(resourcePath, apply);

    return node;
}
