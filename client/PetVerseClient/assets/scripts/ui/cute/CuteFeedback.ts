import {
    AudioClip,
    AudioSource,
    Node,
    resources,
    sys,
    tween,
    Vec3,
} from 'cc';

export type ResolutionPreset = 'high' | 'balanced' | 'saving';

export type CuteFeedbackSettings = {
    soundEnabled: boolean;
    masterVolume: number;
    sfxVolume: number;
    animationEnabled: boolean;
    vibrationEnabled: boolean;
    resolutionPreset: ResolutionPreset;
};

const STORAGE_KEY = 'petverse.cute.settings.v1';
const DEFAULT_SETTINGS: CuteFeedbackSettings = {
    soundEnabled: true,
    masterVolume: 0.8,
    sfxVolume: 0.8,
    animationEnabled: true,
    vibrationEnabled: true,
    resolutionPreset: 'high',
};

type SoundName = 'click' | 'page' | 'drawer' | 'success' | 'hatch';

export class CuteFeedback {
    private static host: Node | null = null;
    private static source: AudioSource | null = null;
    private static clips = new Map<SoundName, AudioClip>();
    private static loading = new Set<SoundName>();
    private static settings: CuteFeedbackSettings = CuteFeedback.loadSettings();

    static initialize(parent: Node) {
        if (this.host?.isValid && this.source) return;
        const host = new Node('CuteFeedbackAudio');
        parent.addChild(host);
        this.host = host;
        this.source = host.addComponent(AudioSource);
        this.preload();
    }

    static getSettings() {
        return { ...this.settings };
    }

    static setSettings(patch: Partial<CuteFeedbackSettings>) {
        this.settings = {
            ...this.settings,
            ...patch,
            masterVolume: this.clamp01(patch.masterVolume ?? this.settings.masterVolume),
            sfxVolume: this.clamp01(patch.sfxVolume ?? this.settings.sfxVolume),
        };
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch {
            // Local storage may be unavailable in some editor previews.
        }
        return this.getSettings();
    }

    static resetSettings() {
        this.settings = { ...DEFAULT_SETTINGS };
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch {
            // Ignore storage failures.
        }
        return this.getSettings();
    }

    static playClick() { this.play('click', 0.9); this.vibrate(); }
    static playPage() { this.play('page', 0.75); }
    static playDrawer() { this.play('drawer', 0.8); }
    static playSuccess() { this.play('success', 0.9); }
    static playHatch() { this.play('hatch', 1); }

    static animationEnabled() {
        return this.settings.animationEnabled;
    }

    static press(node: Node, pressed: boolean) {
        if (!node?.isValid) return;
        if (!this.settings.animationEnabled) {
            node.setScale(Vec3.ONE);
            return;
        }
        if (pressed) {
            node.setScale(new Vec3(0.94, 0.94, 1));
            return;
        }
        tween(node)
            .to(0.10, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
            .to(0.10, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    static resolutionLabel(preset = this.settings.resolutionPreset) {
        if (preset === 'balanced') return '均衡 540×960';
        if (preset === 'saving') return '省电 360×640';
        return '高清 720×1280';
    }

    private static preload() {
        (['click', 'page', 'drawer', 'success', 'hatch'] as SoundName[])
            .forEach((name) => this.loadClip(name));
    }

    private static play(name: SoundName, scale: number) {
        if (!this.settings.soundEnabled || !this.source?.isValid) return;
        const clip = this.clips.get(name);
        if (!clip) {
            this.loadClip(name, true, scale);
            return;
        }
        const volume = this.clamp01(
            this.settings.masterVolume * this.settings.sfxVolume * scale,
        );
        if (volume <= 0) return;
        this.source.playOneShot(clip, volume);
    }

    private static loadClip(name: SoundName, playAfter = false, scale = 1) {
        if (this.clips.has(name) || this.loading.has(name)) return;
        this.loading.add(name);
        resources.load(`audio/ui/${name}`, AudioClip, (error, clip) => {
            this.loading.delete(name);
            if (error || !clip) return;
            this.clips.set(name, clip);
            if (playAfter) this.play(name, scale);
        });
    }

    private static vibrate() {
        if (!this.settings.vibrationEnabled) return;
        const wx = (globalThis as any).wx;
        if (wx?.vibrateShort) {
            try {
                wx.vibrateShort({ type: 'light' });
            } catch {
                // Ignore devices without vibration support.
            }
        }
    }

    private static loadSettings(): CuteFeedbackSettings {
        try {
            const raw = sys.localStorage.getItem(STORAGE_KEY);
            const value = raw ? JSON.parse(raw) : {};
            return {
                ...DEFAULT_SETTINGS,
                ...(value || {}),
                masterVolume: this.clamp01(value?.masterVolume ?? DEFAULT_SETTINGS.masterVolume),
                sfxVolume: this.clamp01(value?.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
            };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    private static clamp01(value: number) {
        return Math.max(0, Math.min(1, Number(value || 0)));
    }
}

export default CuteFeedback;
