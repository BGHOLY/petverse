import type { BattlePetVisualProfile } from './BattlePetVisualRegistry';

export type BattleAssetRuntimeConfig = {
    remoteBaseUrl: string;
};

export function resolveBattleBundleSource(profile: BattlePetVisualProfile) {
    if (profile.delivery !== 'remote') return profile.bundleName;
    const base = loadBattleAssetRuntimeConfig().remoteBaseUrl;
    return base ? `${base}/${profile.bundleName}` : profile.bundleName;
}

export function loadBattleAssetRuntimeConfig(): BattleAssetRuntimeConfig {
    try {
        const globalAny = globalThis as any;
        const extConfig = globalAny?.wx?.getExtConfigSync?.() || {};
        const configured = String(
            extConfig?.battleAssetBaseUrl ||
            globalAny?.PETVERSE_BATTLE_ASSET_BASE_URL ||
            '',
        ).trim();
        return { remoteBaseUrl: configured.replace(/\/+$/, '') };
    } catch {
        return { remoteBaseUrl: '' };
    }
}
