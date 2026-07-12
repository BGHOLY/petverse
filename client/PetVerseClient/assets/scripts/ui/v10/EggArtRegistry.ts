export type EggSpeciesMeta = {
    speciesCode: string;
    name: string;
    eggName: string;
    iconPath: string;
    patternName: string;
};

const EGG_SPECIES: EggSpeciesMeta[] = [
    { speciesCode: 'PET001', name: '炎尾狐', eggName: '炎尾狐蛋', iconPath: 'egg-art/PET001', patternName: '红橙火焰斑点' },
    { speciesCode: 'PET002', name: '岩甲龟', eggName: '岩甲龟蛋', iconPath: 'egg-art/PET002', patternName: '绿色岩层波浪纹' },
    { speciesCode: 'PET003', name: '疾风兔', eggName: '疾风兔蛋', iconPath: 'egg-art/PET003', patternName: '蓝色旋风纹' },
    { speciesCode: 'PET004', name: '月光猫', eggName: '月光猫蛋', iconPath: 'egg-art/PET004', patternName: '金色月牙星点' },
    { speciesCode: 'PET005', name: '雷角兽', eggName: '雷角兽蛋', iconPath: 'egg-art/PET005', patternName: '黑蓝闪电纹' },
    { speciesCode: 'PET006', name: '潮汐獭', eggName: '潮汐獭蛋', iconPath: 'egg-art/PET006', patternName: '海浪水滴纹' },
    { speciesCode: 'PET007', name: '影刃狼', eggName: '影刃狼蛋', iconPath: 'egg-art/PET007', patternName: '银灰刀痕纹' },
    { speciesCode: 'PET008', name: '森灵鹿', eggName: '森灵鹿蛋', iconPath: 'egg-art/PET008', patternName: '绿色藤蔓叶纹' },
    { speciesCode: 'PET009', name: '星辉龙', eggName: '星辉龙蛋', iconPath: 'egg-art/PET009', patternName: '星晶龙鳞纹' },
    { speciesCode: 'PET010', name: '霜羽鸮', eggName: '霜羽鸮蛋', iconPath: 'egg-art/PET010', patternName: '冰晶羽毛纹' },
];

export const RARITY_NAMES: Record<number, string> = {
    1: '普通', 2: '优秀', 3: '稀有', 4: '史诗', 5: '传说', 6: '神话',
};

export function getEggMeta(egg: any): EggSpeciesMeta {
    const code = String(egg?.speciesCode || egg?.offspringData?.speciesCode || 'PET004').toUpperCase();
    const name = String(egg?.species || egg?.offspringData?.species || '');
    return EGG_SPECIES.find((item) => item.speciesCode === code || item.name === name) || EGG_SPECIES[3];
}

export function getEggDisplayName(egg: any) {
    const meta = getEggMeta(egg);
    const rarity = RARITY_NAMES[Math.max(1, Math.min(6, Number(egg?.rarityPotential || egg?.rarity || 1)))] || '普通';
    return `${rarity}${egg?.isMutant ? '·变异' : ''} ${meta.eggName}`;
}

export function getEggArtPath(egg: any) {
    return getEggMeta(egg).iconPath;
}
