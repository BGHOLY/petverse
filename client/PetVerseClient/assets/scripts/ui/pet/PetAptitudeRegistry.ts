import { resolvePetSpeciesCode } from './PetArtRegistry';

export type PetAptitudeKey = 'hp' | 'attack' | 'defense' | 'magic' | 'speed';
export type PetNumberRange = readonly [number, number];

type PetAptitudeProfile = {
    normal: Record<PetAptitudeKey, PetNumberRange>;
    mutant: Record<PetAptitudeKey, PetNumberRange>;
    normalGrowth: PetNumberRange;
    mutantGrowth: PetNumberRange;
};

const PET_APTITUDE_PROFILES: Record<string, PetAptitudeProfile> = {
    PET001: {
        normal: { hp: [1050, 1350], attack: [850, 1100], defense: [850, 1100], magic: [1250, 1550], speed: [1050, 1350] },
        mutant: { hp: [1120, 1450], attack: [900, 1180], defense: [900, 1180], magic: [1380, 1650], speed: [1120, 1450] },
        normalGrowth: [1.05, 1.22], mutantGrowth: [1.1, 1.28],
    },
    PET002: {
        normal: { hp: [1350, 1650], attack: [850, 1100], defense: [1350, 1650], magic: [850, 1100], speed: [650, 900] },
        mutant: { hp: [1450, 1750], attack: [900, 1180], defense: [1450, 1750], magic: [900, 1180], speed: [700, 980] },
        normalGrowth: [1.03, 1.2], mutantGrowth: [1.08, 1.26],
    },
    PET003: {
        normal: { hp: [950, 1250], attack: [1150, 1450], defense: [800, 1050], magic: [850, 1100], speed: [1350, 1650] },
        mutant: { hp: [1020, 1340], attack: [1250, 1550], defense: [850, 1130], magic: [900, 1180], speed: [1450, 1750] },
        normalGrowth: [1.04, 1.21], mutantGrowth: [1.09, 1.27],
    },
    PET004: {
        normal: { hp: [1050, 1350], attack: [800, 1000], defense: [950, 1200], magic: [1200, 1500], speed: [1100, 1400] },
        mutant: { hp: [1120, 1450], attack: [850, 1080], defense: [1020, 1300], magic: [1320, 1600], speed: [1180, 1500] },
        normalGrowth: [1.05, 1.22], mutantGrowth: [1.1, 1.28],
    },
    PET005: {
        normal: { hp: [1150, 1450], attack: [1300, 1600], defense: [1000, 1250], magic: [800, 1000], speed: [950, 1200] },
        mutant: { hp: [1230, 1550], attack: [1420, 1700], defense: [1080, 1350], magic: [850, 1080], speed: [1020, 1300] },
        normalGrowth: [1.05, 1.22], mutantGrowth: [1.1, 1.28],
    },
    PET006: {
        normal: { hp: [1150, 1450], attack: [850, 1100], defense: [1050, 1300], magic: [1150, 1450], speed: [950, 1250] },
        mutant: { hp: [1230, 1550], attack: [900, 1180], defense: [1130, 1400], magic: [1260, 1550], speed: [1020, 1350] },
        normalGrowth: [1.045, 1.215], mutantGrowth: [1.095, 1.275],
    },
    PET007: {
        normal: { hp: [1000, 1300], attack: [1300, 1600], defense: [850, 1100], magic: [800, 1000], speed: [1250, 1550] },
        mutant: { hp: [1070, 1400], attack: [1420, 1700], defense: [900, 1180], magic: [850, 1080], speed: [1360, 1650] },
        normalGrowth: [1.055, 1.225], mutantGrowth: [1.105, 1.285],
    },
    PET008: {
        normal: { hp: [1200, 1500], attack: [800, 1000], defense: [1050, 1300], magic: [1200, 1500], speed: [900, 1150] },
        mutant: { hp: [1290, 1600], attack: [850, 1080], defense: [1130, 1400], magic: [1320, 1600], speed: [960, 1230] },
        normalGrowth: [1.05, 1.22], mutantGrowth: [1.1, 1.28],
    },
    PET009: {
        normal: { hp: [1250, 1550], attack: [1150, 1450], defense: [1100, 1400], magic: [1150, 1450], speed: [1000, 1300] },
        mutant: { hp: [1340, 1650], attack: [1250, 1550], defense: [1190, 1500], magic: [1250, 1550], speed: [1080, 1400] },
        normalGrowth: [1.08, 1.24], mutantGrowth: [1.13, 1.3],
    },
    PET010: {
        normal: { hp: [1000, 1300], attack: [800, 1000], defense: [900, 1150], magic: [1300, 1600], speed: [1200, 1500] },
        mutant: { hp: [1070, 1400], attack: [850, 1080], defense: [970, 1240], magic: [1420, 1700], speed: [1300, 1600] },
        normalGrowth: [1.05, 1.22], mutantGrowth: [1.1, 1.28],
    },
};

export function getPetAptitudeProfile(source: any, isMutant: boolean) {
    const speciesCode = resolvePetSpeciesCode(source);
    const profile = PET_APTITUDE_PROFILES[speciesCode] || PET_APTITUDE_PROFILES.PET001;
    return {
        speciesCode,
        ranges: isMutant ? profile.mutant : profile.normal,
        growth: isMutant ? profile.mutantGrowth : profile.normalGrowth,
        variantLabel: isMutant ? '变异' : '普通',
    };
}

export function getPetAptitudeGrade(value: number, range: PetNumberRange) {
    const maximum = Math.max(0.0001, Number(range[1] || 0));
    const ratio = Math.max(0, Number(value || 0)) / maximum;
    if (ratio >= 0.92) return '卓越';
    if (ratio >= 0.75) return '优秀';
    if (ratio >= 0.6) return '良好';
    return '普通';
}

export function calculatePetAptitudeScore(values: number[], ranges: PetNumberRange[]) {
    const ratios = values.map((value, index) => {
        const [minimum, maximum] = ranges[index] || [0, 1];
        if (maximum <= minimum) return 0;
        return Math.max(0, Math.min(1, (Number(value || 0) - minimum) / (maximum - minimum)));
    });
    const average = ratios.reduce((sum, value) => sum + value, 0) / Math.max(1, ratios.length);
    return Math.round(80 + average * 40);
}
