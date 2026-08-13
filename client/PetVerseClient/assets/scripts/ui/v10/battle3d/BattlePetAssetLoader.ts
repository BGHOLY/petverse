import {
    assetManager,
    instantiate,
    Node,
    Prefab,
    SkeletalAnimation,
} from 'cc';

import type { BattlePetVisualProfile } from './BattlePetVisualRegistry';

export type LoadedBattlePetVisual = {
    node: Node;
    animation: SkeletalAnimation | null;
};

/**
 * Loads production battle prefabs without making combat depend on their availability.
 * Profiles stay disabled until art, animation and device checks have passed.
 */
export default class BattlePetAssetLoader {
    private readonly prefabCache = new Map<string, Prefab>();
    private readonly pendingLoads = new Map<string, Promise<Prefab | null>>();
    private readonly warnedKeys = new Set<string>();

    async instantiate(profile: BattlePetVisualProfile): Promise<LoadedBattlePetVisual | null> {
        if (!profile.formalAssetReady) return null;
        const prefab = await this.loadPrefab(profile);
        if (!prefab?.isValid) return null;

        const node = instantiate(prefab);
        node.name = `${profile.speciesCode}_FormalVisual`;
        const animation = node.getComponentsInChildren(SkeletalAnimation)[0] || null;
        if (!this.validateAnimations(profile, animation)) {
            node.destroy();
            return null;
        }
        return { node, animation };
    }

    clear() {
        this.prefabCache.clear();
        this.pendingLoads.clear();
        this.warnedKeys.clear();
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
                    resolve(prefab);
                });
            };
            const existing = assetManager.getBundle(profile.bundleName);
            if (existing) {
                loadFromBundle(existing);
                return;
            }
            assetManager.loadBundle(profile.bundleName, (error, bundle) => {
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

    private validateAnimations(
        profile: BattlePetVisualProfile,
        animation: SkeletalAnimation | null,
    ) {
        if (!animation) {
            this.warnOnce(profile.speciesCode, '正式模型缺少 SkeletalAnimation，继续使用质量样片。');
            return false;
        }
        const available = new Set(animation.clips.map((clip) => clip?.name).filter(Boolean));
        const missing = profile.requiredAnimations.filter((name) => !available.has(name));
        if (missing.length) {
            this.warnOnce(profile.speciesCode, `正式模型缺少动画：${missing.join(', ')}`);
            return false;
        }
        return true;
    }

    private warnOnce(key: string, message: string) {
        if (this.warnedKeys.has(key)) return;
        this.warnedKeys.add(key);
        console.warn(`[BattlePetAssetLoader] ${key} ${message}`);
    }
}
