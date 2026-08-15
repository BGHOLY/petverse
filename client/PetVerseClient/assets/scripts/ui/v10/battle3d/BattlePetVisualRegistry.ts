export type BattlePetFallbackArchetype = 'fox' | 'turtle' | 'deer' | 'guardian';

export type BattlePetVisualProfile = {
    speciesCode: string;
    displayName: string;
    element: 'fire' | 'earth' | 'wind' | 'light' | 'thunder' | 'water' | 'dark' | 'wood' | 'star' | 'ice';
    combatRole: 'burst' | 'tank' | 'healer' | 'support' | 'control' | 'boss';
    bundleName: string;
    prefabPath: string;
    formalAssetReady: boolean;
    productionRevision: string;
    fallbackArchetype: BattlePetFallbackArchetype;
    battleScale: number;
    requiredAnimations: readonly string[];
    delivery: 'local' | 'remote';
    maxTriangles: number;
    maxMaterials: number;
    maxNodes: number;
    compressedBudgetBytes: number;
};

const REQUIRED_ANIMATIONS = [
    'enter',
    'idle',
    'basic_attack',
    'active_skill',
    'hit',
    'death',
    'victory',
] as const;

const pendingProfile = (
    speciesCode: string,
    displayName: string,
    element: BattlePetVisualProfile['element'],
    combatRole: BattlePetVisualProfile['combatRole'],
    fallbackArchetype: BattlePetFallbackArchetype,
    battleScale = 0.86,
): BattlePetVisualProfile => ({
    speciesCode,
    displayName,
    element,
    combatRole,
    bundleName: 'pet-pack-02',
    prefabPath: `pets/${speciesCode}/${speciesCode}_Battle`,
    formalAssetReady: false,
    productionRevision: `${speciesCode}-PENDING`,
    fallbackArchetype,
    battleScale,
    requiredAnimations: REQUIRED_ANIMATIONS,
    delivery: 'remote',
    maxTriangles: 12000,
    maxMaterials: 1,
    maxNodes: 120,
    compressedBudgetBytes: 2 * 1024 * 1024,
});

const PROFILES: Record<string, BattlePetVisualProfile> = {
    PET001: {
        speciesCode: 'PET001',
        displayName: '炎尾狐',
        element: 'fire',
        combatRole: 'burst',
        bundleName: 'pet-starter-01',
        prefabPath: 'pets/PET001/PET001_Battle',
        formalAssetReady: false,
        productionRevision: 'PET001-V2',
        fallbackArchetype: 'fox',
        battleScale: 0.86,
        requiredAnimations: REQUIRED_ANIMATIONS,
        delivery: 'remote',
        maxTriangles: 12000,
        maxMaterials: 1,
        maxNodes: 120,
        compressedBudgetBytes: 2 * 1024 * 1024,
    },
    PET002: {
        speciesCode: 'PET002',
        displayName: '岩甲龟',
        element: 'earth',
        combatRole: 'tank',
        bundleName: 'pet-starter-01',
        prefabPath: 'pets/PET002/PET002_Battle',
        formalAssetReady: false,
        productionRevision: 'PET002-V1',
        fallbackArchetype: 'turtle',
        battleScale: 0.9,
        requiredAnimations: REQUIRED_ANIMATIONS,
        delivery: 'remote',
        maxTriangles: 12000,
        maxMaterials: 1,
        maxNodes: 120,
        compressedBudgetBytes: 2 * 1024 * 1024,
    },
    PET003: pendingProfile('PET003', '疾风兔', 'wind', 'burst', 'fox', 0.82),
    PET004: pendingProfile('PET004', '月光猫', 'light', 'healer', 'fox', 0.84),
    PET005: pendingProfile('PET005', '雷角兽', 'thunder', 'burst', 'guardian', 0.86),
    PET006: pendingProfile('PET006', '潮汐獭', 'water', 'support', 'turtle', 0.84),
    PET007: pendingProfile('PET007', '影刃狼', 'dark', 'burst', 'fox', 0.88),
    PET008: {
        speciesCode: 'PET008',
        displayName: '森灵鹿',
        element: 'wood',
        combatRole: 'healer',
        bundleName: 'pet-starter-01',
        prefabPath: 'pets/PET008/PET008_Battle',
        formalAssetReady: false,
        productionRevision: 'PET008-V1',
        fallbackArchetype: 'deer',
        battleScale: 0.88,
        requiredAnimations: REQUIRED_ANIMATIONS,
        delivery: 'remote',
        maxTriangles: 12000,
        maxMaterials: 1,
        maxNodes: 120,
        compressedBudgetBytes: 2 * 1024 * 1024,
    },
    PET009: pendingProfile('PET009', '星辉龙', 'star', 'support', 'guardian', 0.88),
    PET010: pendingProfile('PET010', '霜羽鸮', 'ice', 'control', 'deer', 0.82),
    BOSS001: {
        speciesCode: 'BOSS001',
        displayName: '古树守卫',
        element: 'wood',
        combatRole: 'boss',
        bundleName: 'battle-chapter-01',
        prefabPath: 'bosses/AncientGuardian/AncientGuardian_Battle',
        formalAssetReady: false,
        productionRevision: 'BOSS001-V1',
        fallbackArchetype: 'guardian',
        battleScale: 0.94,
        requiredAnimations: REQUIRED_ANIMATIONS,
        delivery: 'remote',
        maxTriangles: 25000,
        maxMaterials: 2,
        maxNodes: 180,
        compressedBudgetBytes: 4 * 1024 * 1024,
    },
};

const DEFAULT_PROFILE = PROFILES.PET001;

export function getBattlePetVisualProfile(speciesCode: unknown): BattlePetVisualProfile {
    return PROFILES[String(speciesCode || '').trim().toUpperCase()] || DEFAULT_PROFILE;
}

export function listBattlePetVisualProfiles() {
    return Object.values(PROFILES);
}
