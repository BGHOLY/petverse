export type PetArtUsage = 'home' | 'portrait' | 'thumb';

export type PetSpeciesArtConfig = {
    speciesCode: string;
    name: string;
    element: string;
    role: string;
    aliases: string[];
};

export const PET_SPECIES_ART: Record<string, PetSpeciesArtConfig> = {
    PET001: {
        speciesCode: 'PET001',
        name: '炎尾狐',
        element: '火',
        role: '法术爆发',
        aliases: ['炎尾狐', 'fire fox', 'flame fox', 'fox', '狐狸', '火狐'],
    },
    PET002: {
        speciesCode: 'PET002',
        name: '岩甲龟',
        element: '土',
        role: '主坦援护',
        aliases: ['岩甲龟', 'rock turtle', 'stone turtle', 'turtle', '龟', '乌龟'],
    },
    PET003: {
        speciesCode: 'PET003',
        name: '疾风兔',
        element: '风',
        role: '先手物理',
        aliases: ['疾风兔', 'wind rabbit', 'rabbit', 'bunny', '兔', '兔子'],
    },
    PET004: {
        speciesCode: 'PET004',
        name: '月光猫',
        element: '光',
        role: '治疗净化',
        aliases: ['月光猫', 'moon cat', 'cat', '猫', '月猫'],
    },
    PET005: {
        speciesCode: 'PET005',
        name: '雷角兽',
        element: '雷',
        role: '物理爆发',
        aliases: ['雷角兽', 'thunder beast', 'lightning beast', '雷兽', '电兽'],
    },
    PET006: {
        speciesCode: 'PET006',
        name: '潮汐獭',
        element: '水',
        role: '反速辅助',
        aliases: ['潮汐獭', 'tide otter', 'water otter', 'otter', '水獭', '海獭', '獭'],
    },
    PET007: {
        speciesCode: 'PET007',
        name: '影刃狼',
        element: '暗',
        role: '收割刺客',
        aliases: ['影刃狼', 'shadow wolf', 'dark wolf', 'wolf', '狼', '影狼'],
    },
    PET008: {
        speciesCode: 'PET008',
        name: '森灵鹿',
        element: '木',
        role: '持续治疗',
        aliases: ['森灵鹿', 'forest deer', 'spirit deer', 'deer', '鹿', '灵鹿'],
    },
    PET009: {
        speciesCode: 'PET009',
        name: '星辉龙',
        element: '星',
        role: '均衡核心',
        aliases: ['星辉龙', 'star dragon', 'astral dragon', 'dragon', '龙', '星龙'],
    },
    PET010: {
        speciesCode: 'PET010',
        name: '霜羽鸮',
        element: '冰',
        role: '先手控制',
        aliases: ['霜羽鸮', 'frost owl', 'ice owl', 'owl', '猫头鹰', '鸮', '冰鸮'],
    },
};

const DEFAULT_SPECIES_CODE = 'PET001';
const SPECIES_CODES = Object.keys(PET_SPECIES_ART).sort();

function normalizeText(value: unknown) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]+/g, ' ');
}

function codeCandidate(source: any) {
    const raw = String(
        source?.speciesCode ??
        source?.species_code ??
        source?.petSpeciesCode ??
        source?.code ??
        '',
    ).trim().toUpperCase();
    const match = raw.match(/PET\s*0*(\d{1,3})/i);
    if (!match) return '';
    return `PET${String(Number(match[1])).padStart(3, '0')}`;
}

export function resolvePetSpeciesCode(source: any): string {
    const direct = codeCandidate(source);
    if (PET_SPECIES_ART[direct]) return direct;

    const haystack = normalizeText([
        source?.species,
        source?.speciesName,
        source?.name,
        source?.nickname,
        source?.displayName,
        source?.type,
    ].filter(Boolean).join(' '));

    for (const config of Object.values(PET_SPECIES_ART)) {
        if (config.aliases.some((alias) => haystack.includes(normalizeText(alias)))) {
            return config.speciesCode;
        }
    }

    const numericId = Number(source?.id ?? source?.petId ?? source?.eggId ?? source?.hatchedPetId ?? 0);
    if (Number.isFinite(numericId) && numericId > 0) {
        return SPECIES_CODES[(Math.floor(numericId) - 1) % SPECIES_CODES.length];
    }

    return DEFAULT_SPECIES_CODE;
}

export function getPetSpeciesMeta(source: any): PetSpeciesArtConfig {
    return PET_SPECIES_ART[resolvePetSpeciesCode(source)] || PET_SPECIES_ART[DEFAULT_SPECIES_CODE];
}

export function getPetArtPath(source: any, usage: PetArtUsage = 'portrait') {
    const code = resolvePetSpeciesCode(source);
    return `pet-art/${code}/${usage}`;
}

export function getPetArtDebugInfo(source: any) {
    const meta = getPetSpeciesMeta(source);
    return {
        speciesCode: meta.speciesCode,
        name: meta.name,
        portrait: getPetArtPath(source, 'portrait'),
        home: getPetArtPath(source, 'home'),
        thumb: getPetArtPath(source, 'thumb'),
    };
}
