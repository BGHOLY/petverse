import { Color, Vec2 } from 'cc';

export type PetTabV6 = 'attributes' | 'skills' | 'aptitudes' | 'equipment';
export type PetAttributeViewV6 = 'overview' | 'stats' | 'lineage';

export type PetListItemV6 = {
    id: number;
    name: string;
    level: number;
    power: number;
    artPath: string;
    selected: boolean;
    teamIndex: number;
    isLocked: boolean;
    isMutant: boolean;
    isMarried: boolean;
};

export type PetProfileV6 = {
    id: number;
    name: string;
    speciesName: string;
    portraitPath: string;
    level: number;
    rarity: string;
    power: number;
    element: string;
    role: string;
    gender: string;
    marriage: string;
    team: string;
    deployment: string;
    favorite: boolean;
    locked: boolean;
    mutant: boolean;
    formationActionLabel: '加入编队' | '设为出战' | '取消出战';
};

export type PetAttributesV6 = {
    hp: number;
    defense: number;
    attack: number;
    magic: number;
    speed: number;
    growth: number;
    quality: number;
    skillCount: number;
};

export type PetSkillV6 = {
    key: string;
    name: string;
    description: string;
    tierLabel: string;
    iconPath: string;
    fill: Color;
    textColor: Color;
    brief: string;
    slotIndex: number;
    special: boolean;
    raw: any;
};

export type PetAptitudeV6 = {
    label: string;
    value: number;
    icon: string;
    minimum: number;
    maximum: number;
    grade: string;
    precision?: number;
};

export type PetEquipmentSlotV6 = {
    key: string;
    name: string;
    status: string;
    locked: boolean;
};

export type PetStatRowV6 = {
    key: string;
    name: string;
    icon: string;
    description: string;
    base: number;
    pending: number;
};

export type PetStatDraftV6 = {
    unspent: number;
    remaining: number;
    total: number;
    locked: boolean;
    confirming: boolean;
    rows: PetStatRowV6[];
    onAdd: (key: string, amount: number) => void;
    onRecommend: () => void;
    onClear: () => void;
    onReset: () => void;
    onConfirm: () => void;
};

export type PetPageV6Options = {
    pets: PetListItemV6[];
    totalPets: number;
    profile: PetProfileV6;
    attributes: PetAttributesV6;
    skills: PetSkillV6[];
    aptitudes: PetAptitudeV6[];
    aptitudeScore: number;
    aptitudeRange: string;
    equipment: PetEquipmentSlotV6[];
    lineage: string[];
    statDraft: PetStatDraftV6;
    tab: PetTabV6;
    attributeView: PetAttributeViewV6;
    rarityFilterLabel: string;
    elementFilterLabel: string;
    sortLabel: string;
    scrollKey: string;
    initialOffset?: Vec2;
    onSelectPet: (id: number) => void;
    onTab: (tab: PetTabV6) => void;
    onAttributeView: (view: PetAttributeViewV6) => void;
    onSkill: (skill: any) => void;
    onSkillBook: () => void;
    onFormation: () => void;
    onFavorite: () => void;
    onLock: () => void;
    onRarityFilter: () => void;
    onElementFilter: () => void;
    onSort: () => void;
};
