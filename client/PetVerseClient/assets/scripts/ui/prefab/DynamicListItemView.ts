import { _decorator, Button, Component, Label, Sprite } from 'cc';
import { loadSpriteFrameResource } from '../cute/CuteUiKit';

const { ccclass, property } = _decorator;

export type DynamicListItemData = {
    name: string;
    value?: string;
    meta?: string;
    iconPath?: string;
};

@ccclass('DynamicListItemView')
export class DynamicListItemView extends Component {
    @property(Sprite)
    iconSprite: Sprite | null = null;

    @property(Label)
    nameLabel: Label | null = null;

    @property(Label)
    valueLabel: Label | null = null;

    @property(Label)
    metaLabel: Label | null = null;

    @property(Button)
    actionButton: Button | null = null;

    private clickHandler: (() => void) | null = null;
    private warnedMissingBindings = false;

    onLoad() {
        this.bindCompatibilityNodes();
    }

    onDestroy() {
        this.detachClickHandler();
    }

    setData(data: DynamicListItemData, onClick?: () => void) {
        this.bindCompatibilityNodes();
        if (this.nameLabel) this.nameLabel.string = String(data.name || '');
        if (this.valueLabel) this.valueLabel.string = String(data.value || '');
        if (this.metaLabel) this.metaLabel.string = String(data.meta || '');
        if (this.iconSprite && data.iconPath) {
            const sprite = this.iconSprite;
            loadSpriteFrameResource(data.iconPath, (frame) => {
                if (!frame || !sprite?.node?.isValid) return;
                sprite.spriteFrame = frame;
            });
        }

        this.detachClickHandler();
        this.clickHandler = onClick || null;
        if (this.clickHandler && this.actionButton?.node?.isValid) {
            this.actionButton.node.on(Button.EventType.CLICK, this.clickHandler);
        }
    }

    private bindCompatibilityNodes() {
        this.iconSprite ||= this.node.getChildByName('Icon')?.getComponent(Sprite) || null;
        this.nameLabel ||= this.node.getChildByName('NameLabel')?.getComponent(Label) || null;
        this.valueLabel ||= this.node.getChildByName('CountLabel')?.getComponent(Label)
            || this.node.getChildByName('ValueLabel')?.getComponent(Label)
            || null;
        this.metaLabel ||= this.node.getChildByName('MetaLabel')?.getComponent(Label) || null;
        this.actionButton ||= this.node.getChildByName('Button')?.getComponent(Button)
            || this.node.getComponent(Button)
            || null;
        this.warnAboutMissingBindings();
    }

    private warnAboutMissingBindings() {
        if (this.warnedMissingBindings) return;
        const missing = [
            !this.nameLabel ? 'nameLabel' : '',
            !this.actionButton ? 'actionButton' : '',
        ].filter(Boolean);
        if (!missing.length) return;
        this.warnedMissingBindings = true;
        console.warn(
            `[DynamicListItemView] "${this.node?.name || 'unknown'}" is missing Inspector bindings: ${missing.join(', ')}. `
            + 'The item will remain visible, but the missing fields will be skipped.',
        );
    }

    private detachClickHandler() {
        if (this.clickHandler && this.actionButton?.node?.isValid) {
            this.actionButton.node.off(Button.EventType.CLICK, this.clickHandler);
        }
        this.clickHandler = null;
    }
}

export default DynamicListItemView;
