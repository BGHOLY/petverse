import { getPetSpeciesMeta } from './PetArtRegistry';

const LEGACY_SPECIES_NAMES: Record<string, string> = {
    dog: '灵犬', cat: '月光猫', rabbit: '疾风兔', bunny: '疾风兔', fox: '炎尾狐',
    wolf: '影刃狼', bear: '森灵熊', dragon: '星辉龙', phoenix: '焰羽凤', turtle: '岩甲龟',
    otter: '潮汐獭', deer: '森灵鹿', owl: '霜羽鸮',
};

export function cleanPetDisplayName(pet: any, fallback = '宝宝', maxLength = 10) {
    const speciesMeta = getPetSpeciesMeta(pet);
    const speciesFallback = cleanText(speciesMeta?.name || fallback) || fallback;
    const raw = cleanText(pet?.nickname || pet?.name || pet?.displayName || pet?.species || speciesFallback);
    const cleaned = raw
        .replace(/\b(?:common|uncommon|rare|epic|legendary|mythic)\b/gi, ' ')
        .replace(/普通|优秀|稀有|史诗|传说|神话/g, ' ')
        .replace(/\bPET[-_\s]*\d+\b/gi, ' ')
        .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, ' ')
        .replace(/(?:^|[\s_#-])(?:[A-Z]{0,3}-?)?\d{6,}(?=$|[\s_#-])/gi, ' ')
        .replace(/[-_\s]?[A-Z]?-?\d{6,}$/i, '')
        .replace(/[|｜/\\·]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalized = normalize(cleaned);
    const aliases = [speciesMeta?.name, ...(speciesMeta?.aliases || [])].filter(Boolean).map((value) => normalize(String(value)));
    const legacy = LEGACY_SPECIES_NAMES[normalized];
    const speciesOnly = aliases.includes(normalized) || Boolean(legacy) || /(?:\.{2,}|…)$/.test(cleaned);
    const value = cleaned && !/^\d+$/.test(cleaned) && !speciesOnly ? cleaned : (legacy || speciesFallback);
    return value.length > maxLength ? `${value.slice(0, Math.max(1, maxLength - 1))}…` : value;
}

function cleanText(value: any) {
    return String(value ?? '').trim();
}

function normalize(value: string) {
    return value.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}
