import { AudioClip, AudioSource, Node, resources } from 'cc';

export type BgmMode = 'home' | 'battle' | 'boss' | 'none';

type AudioSettings = {
    enabled: boolean;
    bgmVolume: number;
    sfxVolume: number;
};

type SfxName = 'click_1' | 'click_2' | 'click_3' | 'confirm' | 'error' | 'attack' | 'magic' | 'heal' | 'shield';

/**
 * One global audio owner for Cocos preview and WeChat mini game.
 * WeChat/browser autoplay is unlocked by the first real touch before BGM starts.
 */
export default class AudioDirector {
    private static host: Node | null = null;
    private static bgmSource: AudioSource | null = null;
    private static sfxSource: AudioSource | null = null;
    private static mode: BgmMode = 'none';
    private static pendingMode: BgmMode = 'home';
    private static unlocked = false;
    private static corePreloadStarted = false;
    private static clips = new Map<string, AudioClip>();
    private static loading = new Map<string, Promise<AudioClip | null>>();
    private static settings: AudioSettings = AudioDirector.loadSettings();

    static initialize(host: Node) {
        if (this.host?.isValid && this.host === host) return;
        if (this.host?.isValid) {
            this.host.off(Node.EventType.TOUCH_START, this.unlockFromGesture, this);
            this.host.off(Node.EventType.TOUCH_END, this.unlockFromGesture, this);
        }
        this.host = host;
        let audioNode = host.getChildByName('V10AudioDirector');
        if (!audioNode) {
            audioNode = new Node('V10AudioDirector');
            host.addChild(audioNode);
        }
        const sources = audioNode.getComponents(AudioSource);
        this.bgmSource = sources[0] || audioNode.addComponent(AudioSource);
        this.sfxSource = sources[1] || audioNode.addComponent(AudioSource);
        this.bgmSource.loop = true;
        this.bgmSource.volume = this.settings.bgmVolume;
        this.sfxSource.volume = this.settings.sfxVolume;

        // Keep this listener active until a genuine touch unlocks audio.
        host.off(Node.EventType.TOUCH_START, this.unlockFromGesture, this);
        host.off(Node.EventType.TOUCH_END, this.unlockFromGesture, this);
        host.on(Node.EventType.TOUCH_START, this.unlockFromGesture, this);
        host.on(Node.EventType.TOUCH_END, this.unlockFromGesture, this);
    }

    static getSettings() { return { ...this.settings }; }

    static setSettings(patch: Partial<AudioSettings>) {
        this.settings = {
            enabled: patch.enabled ?? this.settings.enabled,
            bgmVolume: Math.max(0, Math.min(1, Number(patch.bgmVolume ?? this.settings.bgmVolume))),
            sfxVolume: Math.max(0, Math.min(1, Number(patch.sfxVolume ?? this.settings.sfxVolume))),
        };
        if (this.bgmSource) this.bgmSource.volume = this.settings.bgmVolume;
        if (this.sfxSource) this.sfxSource.volume = this.settings.sfxVolume;
        if (!this.settings.enabled) this.bgmSource?.stop();
        else if (this.unlocked && this.mode !== 'none') void this.playBgm(this.mode, true);
        this.saveSettings();
    }

    static async playBgm(mode: BgmMode, force = false) {
        const previousMode = this.mode;
        this.pendingMode = mode;
        this.mode = mode;
        if (!this.settings.enabled || mode === 'none' || !this.bgmSource) {
            this.bgmSource?.stop();
            return;
        }
        if (!this.unlocked) return;
        if (!force && this.bgmSource.playing && previousMode === mode) return;

        const clip = await this.load(`audio/${mode === 'home' ? 'home_bgm' : mode === 'boss' ? 'boss_bgm' : 'battle_bgm'}`);
        if (!clip || !this.bgmSource || this.pendingMode !== mode || !this.settings.enabled) return;
        this.bgmSource.stop();
        this.bgmSource.clip = clip;
        this.bgmSource.loop = true;
        this.bgmSource.volume = this.settings.bgmVolume;
        this.bgmSource.play();
    }

    static async playSfx(name: SfxName) {
        if (!this.settings.enabled || !this.sfxSource) return;
        if (!this.unlocked) return;
        const clip = await this.load(`audio/${name}`);
        if (clip && this.sfxSource && this.settings.enabled) {
            this.sfxSource.playOneShot(clip, this.settings.sfxVolume);
        }
    }

    static playCuteClick() {
        this.unlockFromGesture();
        const choices: Array<'click_1' | 'click_2' | 'click_3'> = ['click_1', 'click_2', 'click_3'];
        void this.playSfx(choices[Math.floor(Math.random() * choices.length)]);
    }

    private static unlockFromGesture() {
        if (!this.unlocked) {
            this.unlocked = true;
            try {
                const wx = (globalThis as any)?.wx;
                wx?.setInnerAudioOption?.({ obeyMuteSwitch: true, mixWithOther: true });
            } catch {}
        }
        if (!this.corePreloadStarted) {
            this.corePreloadStarted = true;
            void this.preloadCoreAudio();
        }
        if (this.settings.enabled && this.pendingMode !== 'none' && !this.bgmSource?.playing) {
            void this.playBgm(this.pendingMode, true);
        }
    }

    private static async preloadCoreAudio() {
        await Promise.all([
            this.load('audio/home_bgm'),
            this.load('audio/click_1'),
            this.load('audio/confirm'),
        ]);
    }

    private static load(path: string): Promise<AudioClip | null> {
        const cached = this.clips.get(path);
        if (cached) return Promise.resolve(cached);
        const existing = this.loading.get(path);
        if (existing) return existing;
        const promise = new Promise<AudioClip | null>((resolve) => {
            resources.load<AudioClip>(path, AudioClip, (error, clip) => {
                this.loading.delete(path);
                if (error || !clip || !(clip instanceof AudioClip) || !clip.isValid) {
                    console.warn(`[AudioDirector] failed to load ${path}`, error);
                    resolve(null);
                    return;
                }
                this.clips.set(path, clip);
                resolve(clip);
            });
        });
        this.loading.set(path, promise);
        return promise;
    }

    private static loadSettings(): AudioSettings {
        const fallback = { enabled: true, bgmVolume: 0.38, sfxVolume: 0.55 };
        try {
            const globalAny = globalThis as any;
            const raw = globalAny?.wx?.getStorageSync
                ? globalAny.wx.getStorageSync('petverse:v10:audio')
                : globalAny?.localStorage?.getItem?.('petverse:v10:audio');
            return raw ? { ...fallback, ...(typeof raw === 'string' ? JSON.parse(raw) : raw) } : fallback;
        } catch {
            return fallback;
        }
    }

    private static saveSettings() {
        try {
            const globalAny = globalThis as any;
            if (globalAny?.wx?.setStorageSync) globalAny.wx.setStorageSync('petverse:v10:audio', this.settings);
            else globalAny?.localStorage?.setItem?.('petverse:v10:audio', JSON.stringify(this.settings));
        } catch {}
    }
}
