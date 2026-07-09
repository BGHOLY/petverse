import { AudioClip, AudioSource, find, Node, resources } from 'cc';

export class AudioManager {
    private static source: AudioSource | null = null;
    private static clickClip: AudioClip | null = null;
    private static toastClip: AudioClip | null = null;
    private static loadingClick = false;
    private static loadingToast = false;

    static playClick() {
        this.ensureSource();
        if (this.clickClip) {
            this.source?.playOneShot(this.clickClip, 0.8);
            return;
        }
        this.loadClickClip();
    }

    static playToast() {
        this.ensureSource();
        if (this.toastClip) {
            this.source?.playOneShot(this.toastClip, 0.8);
            return;
        }
        this.loadToastClip();
    }

    private static ensureSource() {
        if (this.source) return;

        const canvas = find('Canvas');
        if (!canvas) return;

        let node = canvas.getChildByName('AudioManager');
        if (!node) {
            node = new Node('AudioManager');
            canvas.addChild(node);
        }

        this.source = node.getComponent(AudioSource) || node.addComponent(AudioSource);
    }

    private static loadClickClip() {
        if (this.loadingClick) return;
        this.loadingClick = true;

        resources.load('audio/click', AudioClip, (err, clip) => {
            this.loadingClick = false;
            if (!err && clip) this.clickClip = clip;
        });
    }

    private static loadToastClip() {
        if (this.loadingToast) return;
        this.loadingToast = true;

        resources.load('audio/toast', AudioClip, (err, clip) => {
            this.loadingToast = false;
            if (!err && clip) this.toastClip = clip;
        });
    }
}
