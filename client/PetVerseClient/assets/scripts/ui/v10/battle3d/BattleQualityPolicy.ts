export type BattleQualityTier = 'low' | 'balanced' | 'high';
export type BattleQualityPreference = 'auto' | BattleQualityTier;

export type BattleQualityProfile = {
    tier: BattleQualityTier;
    targetFps: 30 | 45 | 60;
    primitiveSegments: number;
    torusSegments: number;
    maxTransientEffects: number;
    maxEventsPerBatch: number;
    cameraShakeScale: number;
    enableSecondaryVfx: boolean;
};

const STORAGE_KEY = 'petverse:battle-quality';

export const BATTLE_QUALITY_PROFILES: Record<BattleQualityTier, BattleQualityProfile> = {
    low: {
        tier: 'low',
        targetFps: 30,
        primitiveSegments: 8,
        torusSegments: 10,
        maxTransientEffects: 3,
        maxEventsPerBatch: 14,
        cameraShakeScale: 0.45,
        enableSecondaryVfx: false,
    },
    balanced: {
        tier: 'balanced',
        targetFps: 45,
        primitiveSegments: 12,
        torusSegments: 16,
        maxTransientEffects: 6,
        maxEventsPerBatch: 20,
        cameraShakeScale: 0.72,
        enableSecondaryVfx: true,
    },
    high: {
        tier: 'high',
        targetFps: 60,
        primitiveSegments: 16,
        torusSegments: 20,
        maxTransientEffects: 10,
        maxEventsPerBatch: 24,
        cameraShakeScale: 1,
        enableSecondaryVfx: true,
    },
};

export function resolveBattleQualityProfile(
    preference: BattleQualityPreference = loadBattleQualityPreference(),
): BattleQualityProfile {
    const tier = preference === 'auto' ? detectAutomaticTier() : preference;
    return { ...BATTLE_QUALITY_PROFILES[tier] };
}

export function loadBattleQualityPreference(): BattleQualityPreference {
    try {
        const globalAny = globalThis as any;
        const raw = globalAny?.wx?.getStorageSync
            ? globalAny.wx.getStorageSync(STORAGE_KEY)
            : globalAny?.localStorage?.getItem?.(STORAGE_KEY);
        return isPreference(raw) ? raw : 'auto';
    } catch {
        return 'auto';
    }
}

export function saveBattleQualityPreference(value: BattleQualityPreference) {
    const normalized = isPreference(value) ? value : 'auto';
    try {
        const globalAny = globalThis as any;
        if (globalAny?.wx?.setStorageSync) globalAny.wx.setStorageSync(STORAGE_KEY, normalized);
        else globalAny?.localStorage?.setItem?.(STORAGE_KEY, normalized);
    } catch {}
}

function detectAutomaticTier(): BattleQualityTier {
    try {
        const wx = (globalThis as any)?.wx;
        const info = wx?.getSystemInfoSync?.() || {};
        const benchmark = Number(info?.benchmarkLevel || 0);
        const memoryMb = Number(info?.memorySize || 0);
        if ((benchmark > 0 && benchmark <= 10) || (memoryMb > 0 && memoryMb <= 3072)) return 'low';
        if (benchmark >= 25 && memoryMb >= 6144) return 'high';
        if (String(info?.platform || '').toLowerCase() === 'devtools') return 'high';
        if (benchmark > 0 || memoryMb > 0) return 'balanced';
    } catch {}
    return 'balanced';
}

function isPreference(value: unknown): value is BattleQualityPreference {
    return ['auto', 'low', 'balanced', 'high'].includes(String(value || ''));
}
