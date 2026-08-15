import {
    assetManager,
    instantiate,
    Node,
    Prefab,
    SkeletalAnimation,
} from 'cc';

import type { BattlePetVisualProfile } from './BattlePetVisualRegistry';
import { resolveBattleBundleSource } from './BattleAssetRuntime';
import {
    type BattleAssetValidationReport,
    validateBattleAsset,
} from './BattleAssetValidator';

export type LoadedBattlePetVisual = {
    node: Node;
    animation: SkeletalAnimation | null;
    validation: BattleAssetValidationReport;
};

/**
 * Loads production battle prefabs without making combat depend on their availability.
 * Profiles stay disabled until art, animation and device checks have passed.
 */
export default class BattlePetAssetLoader {
    private readonly prefabCache = new Map<string, Prefab>();
    private readonly pendingLoads = new Map<string, Promise<Prefab | null>>();
    private readonly warnedKeys = new Set<string>();
    private readonly releaseEntries = new Map<string, { bundle: any; path: string }>();
    private readonly validationReports = new Map<string, BattleAssetValidationReport>();

    async instantiate(profile: BattlePetVisualProfile): Promise<LoadedBattlePetVisual | null> {
        if (!profile.formalAssetReady) return null;
        const prefab = await this.loadPrefab(profile);
        if (!prefab?.isValid) return null;

        const node = instantiate(prefab);
        node.name = `${profile.speciesCode}_FormalVisual`;
        const animation = node.getComponentsInChildren(SkeletalAnimation)[0] || null;
        const validation = validateBattleAsset(profile, node, animation);
        this.validationReports.set(profile.speciesCode, validation);
        validation.warnings.forEach((warning) =>
            this.warnOnce(`${profile.speciesCode}:${warning}`, warning),
        );
        if (!validation.valid) {
            this.warnOnce(
                profile.speciesCode,
                `正式模型未通过运行时验收：${validation.errors.join('；')}`,
            );
            node.destroy();
            return null;
        }
        return { node, animation, validation };
    }

    clear() {
        for (const entry of this.releaseEntries.values()) {
            try {
                entry.bundle?.release?.(entry.path, Prefab);
            } catch (error) {
                console.warn('[BattlePetAssetLoader] release failed', error);
            }
        }
        this.prefabCache.clear();
        this.pendingLoads.clear();
        this.warnedKeys.clear();
        this.releaseEntries.clear();
        this.validationReports.clear();
    }

    getValidationReports() {
        return [...this.validationReports.values()].map((report) => ({
            ...report,
            animationClips: [...report.animationClips],
            errors: [...report.errors],
            warnings: [...report.warnings],
        }));
    }

    private loadPrefab(profile: BattlePetVisualProfile) {
        const key = `${profile.bundleName}:${profile.prefabPath}`;
        const cached = this.prefabCache.get(key);
        if (cached?.isValid) return Promise.resolve(cached);
        const pending = this.pendingLoads.get(key);
        if (pending) return pending;

        const promise = new Promise<Prefab | null>((resolve) => {
            const loadFromBundle = (bundle: any) => {
                bundle.load(profile.prefabPath, Prefab, (error: Error | null, prefab: Prefab) => {
                    if (error || !prefab?.isValid) {
                        this.warnOnce(key, `正式模型加载失败，继续使用质量样片：${error?.message || 'Prefab 无效'}`);
                        resolve(null);
                        return;
                    }
                    this.prefabCache.set(key, prefab);
                    this.releaseEntries.set(key, { bundle, path: profile.prefabPath });
                    resolve(prefab);
                });
            };
            const existing = assetManager.getBundle(profile.bundleName);
            if (existing) {
                loadFromBundle(existing);
                return;
            }
            const source = resolveBattleBundleSource(profile);
            assetManager.loadBundle(source, (error, bundle) => {
                if (error || !bundle) {
                    this.warnOnce(key, `正式模型分包不可用，继续使用质量样片：${error?.message || 'Bundle 无效'}`);
                    resolve(null);
                    return;
                }
                loadFromBundle(bundle);
            });
        }).finally(() => this.pendingLoads.delete(key));

        this.pendingLoads.set(key, promise);
        return promise;
    }

    private warnOnce(key: string, message: string) {
        if (this.warnedKeys.has(key)) return;
        this.warnedKeys.add(key);
        console.warn(`[BattlePetAssetLoader] ${key} ${message}`);
    }
}
