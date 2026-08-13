export type BattlePetFallbackArchetype = 'fox' | 'turtle' | 'deer' | 'guardian';

export type BattlePetVisualProfile = {
    speciesCode: string;
    displayName: string;
    element: 'fire' | 'earth' | 'wood';
    combatRole: 'burst' | 'tank' | 'healer' | 'boss';
    bundleName: string;
    prefabPath: string;
    formalAssetReady: boolean;
    productionRevision: string;
    fallbackArchetype: BattlePetFallbackArchetype;
    battleScale: number;
    requiredAnimations: readonly string[];
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
    },
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
    },
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
    },
};

const DEFAULT_PROFILE = PROFILES.PET001;

export function getBattlePetVisualProfile(speciesCode: unknown): BattlePetVisualProfile {
    return PROFILES[String(speciesCode || '').trim().toUpperCase()] || DEFAULT_PROFILE;
}

export function listBattlePetVisualProfiles() {
    return Object.values(PROFILES);
}
