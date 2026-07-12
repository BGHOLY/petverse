import { Node, sys, tween, Vec3 } from 'cc';
import AudioDirector from '../v10/AudioDirector';

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

/** Visual feedback + vibration only. All audio is delegated to AudioDirector. */
export class CuteFeedback {
    private static settings: CuteFeedbackSettings = CuteFeedback.loadSettings();

    static initialize(parent: Node) {
        AudioDirector.initialize(parent);
    }

    static getSettings() { return { ...this.settings }; }

    static setSettings(patch: Partial<CuteFeedbackSettings>) {
        this.settings = {
            ...this.settings,
            ...patch,
            masterVolume: this.clamp01(patch.masterVolume ?? this.settings.masterVolume),
            sfxVolume: this.clamp01(patch.sfxVolume ?? this.settings.sfxVolume),
        };
        AudioDirector.setSettings({
            enabled: this.settings.soundEnabled,
            sfxVolume: this.settings.masterVolume * this.settings.sfxVolume,
        });
        try { sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch {}
        return this.getSettings();
    }

    static resetSettings() {
        this.settings = { ...DEFAULT_SETTINGS };
        AudioDirector.setSettings({ enabled: true, sfxVolume: 0.64 });
        try { sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch {}
        return this.getSettings();
    }

    static playClick() { if (this.settings.soundEnabled) AudioDirector.playCuteClick(); this.vibrate(); }
    static playPage() {}
    static playDrawer() {}
    static playSuccess() { if (this.settings.soundEnabled) void AudioDirector.playSfx('confirm'); }
    static playHatch() { if (this.settings.soundEnabled) void AudioDirector.playSfx('magic'); }

    static animationEnabled() { return this.settings.animationEnabled; }

    static press(node: Node, pressed: boolean) {
        if (!node?.isValid) return;
        if (!this.settings.animationEnabled) { node.setScale(Vec3.ONE); return; }
        if (pressed) { node.setScale(new Vec3(0.94, 0.94, 1)); return; }
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

    private static vibrate() {
        if (!this.settings.vibrationEnabled) return;
        const wx = (globalThis as any).wx;
        if (wx?.vibrateShort) {
            try { wx.vibrateShort({ type: 'light' }); } catch {}
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
        } catch { return { ...DEFAULT_SETTINGS }; }
    }

    private static clamp01(value: number) { return Math.max(0, Math.min(1, Number(value || 0))); }
}

export default CuteFeedback;
