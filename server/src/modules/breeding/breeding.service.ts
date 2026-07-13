import { Injectable } from '@nestjs/common';

import {
  ALL_SKILL_CONFIGS,
  getLowSkillConfigs,
  getSkillSeedConfig,
  isSpecialSkill,
  SkillSeedConfig,
} from '../skill/config/skill.config';
import type { Pet } from '../pet/pet.entity';
import {
  AptitudeKey,
  findPetSpeciesConfig,
  getAptitudeRange,
  getGrowthRange,
  PET_CONFIG_VERSION,
  PetSpeciesConfig,
} from '../pet/config/pet-species.config';
import {
  BREAKTHROUGH_CONFIRM_RATE,
  BREEDING_CONFIG_VERSION,
  BreedingMode,
  getModeConfig,
  HIGH_CAPACITY_MODIFIER,
  MAX_SKILL_CAPACITY,
  MIN_NORMAL_SKILL_SLOTS,
  MIN_SKILL_CAPACITY,
  PercentileBucket,
  SPECIAL_ORDER_DECAY,
} from './config/breeding.config';
import { createRandomSeed, SeededRandom } from './utils/seeded-random.util';
import {
  calculateGeneScore,
  inheritGeneCode,
  normalizeGeneCode,
} from '../pet/utils/gene.util';

export interface PetAptitudes {
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
}

export interface SkillSnapshot {
  skillCode: string;
  familyCode: string;
  name: string;
  description: string;
  rarity: number;
  tier: string;
  type: string;
  category: string;
  power: number;
  triggerRate: number;
  effect: string;
  effectData: Record<string, any>;
  conflictGroup: string;
  canLock: boolean;
  canOverwrite: boolean;
  canInherit: boolean;
  speciesCode: string;
}

export interface OffspringBlueprint {
  mode: BreedingMode;
  seed: string;
  configVersion: string;
  speciesCode: string;
  species: string;
  isMutant: boolean;
  rarity: number;
  quality: number;
  skillSlotCount: number;
  aptitudes: PetAptitudes;
  growth: number;
  generation: number;
  specialSkillCount: number;
  inheritedSkills: SkillSnapshot[];
  geneCode: string;
  geneScore: number;
  bodyType: string;
  color: string;
  pattern: string;
  mutationData: {
    naturalMutation: boolean;
    mutationRate: number;
    mutationRateBonus?: number;
    geneMutationCount: number;
    geneMutationLoci: number[];
    mutatedTraits: string[];
    inheritedSpecialSkillCodes: string[];
    rejectedSpecialSkillCodes: string[];
  };
  parentSnapshot: {
    parentA: Record<string, any>;
    parentB: Record<string, any>;
  };
}

const APTITUDE_KEYS: AptitudeKey[] = ['hp', 'attack', 'defense', 'magic', 'speed'];

@Injectable()
export class BreedingService {
  buildOffspring(
    parentA: Pet,
    parentB: Pet,
    mode: BreedingMode = 'breed',
    requestedSeed?: string,
    mutationRateBonus = 0,
  ): OffspringBlueprint {
    const seed = String(requestedSeed || createRandomSeed(mode));
    const rng = new SeededRandom(seed);
    const modeConfig = getModeConfig(mode);

    const speciesA = findPetSpeciesConfig(parentA.speciesCode || parentA.species);
    const speciesB = findPetSpeciesConfig(parentB.speciesCode || parentB.species);
    const childSpecies =
      speciesA.speciesCode === speciesB.speciesCode
        ? speciesA
        : (rng.pick([speciesA, speciesB]) || speciesA);

    const normalizedMutationBonus = Math.max(0, Math.min(0.2, Number(mutationRateBonus || 0)));
    const mutationRate = Math.min(0.2, this.getMutationRate(
      childSpecies,
      parentA,
      parentB,
      modeConfig.mutationBaseRate,
    ) + normalizedMutationBonus);
    const isMutant = rng.chance(mutationRate);
    const skillSlotCount = this.rollSkillCapacity(parentA, parentB, mode, rng);
    const aptitudes = this.rollAptitudes(parentA, parentB, childSpecies, isMutant, mode, rng);
    const growth = this.rollGrowth(parentA, parentB, childSpecies, isMutant, mode, rng);
    const skillResult = this.rollSkills(
      parentA,
      parentB,
      childSpecies,
      isMutant,
      skillSlotCount,
      mode,
      rng,
    );
    const geneResult = inheritGeneCode(
      normalizeGeneCode(parentA.geneCode || 'AAAA'),
      normalizeGeneCode(parentB.geneCode || 'AAAA'),
      0.06,
      () => rng.next(),
    );
    const appearance = this.rollAppearance(parentA, parentB, rng);
    const rarity = this.rollRarity(parentA, parentB, mode, rng);
    const quality = this.calculateQuality(childSpecies, isMutant, aptitudes, growth);

    return {
      mode,
      seed,
      configVersion: `${BREEDING_CONFIG_VERSION}/${PET_CONFIG_VERSION}`,
      speciesCode: childSpecies.speciesCode,
      species: childSpecies.name,
      isMutant,
      rarity,
      quality,
      skillSlotCount,
      aptitudes,
      growth,
      generation:
        Math.max(Number(parentA.generation || 1), Number(parentB.generation || 1)) + 1,
      specialSkillCount: skillResult.specialSkillCount,
      inheritedSkills: skillResult.skills,
      geneCode: geneResult.geneCode,
      geneScore: calculateGeneScore(geneResult.geneCode),
      bodyType: appearance.bodyType.value,
      color: appearance.color.value,
      pattern: appearance.pattern.value,
      mutationData: {
        naturalMutation: isMutant,
        mutationRate,
        mutationRateBonus: normalizedMutationBonus,
        geneMutationCount: geneResult.mutationCount,
        geneMutationLoci: geneResult.mutationLoci,
        mutatedTraits: [
          ...(isMutant ? ['species_mutation'] : []),
          ...(appearance.bodyType.mutated ? ['bodyType'] : []),
          ...(appearance.color.mutated ? ['color'] : []),
          ...(appearance.pattern.mutated ? ['pattern'] : []),
        ],
        inheritedSpecialSkillCodes: skillResult.inheritedSpecialSkillCodes,
        rejectedSpecialSkillCodes: skillResult.rejectedSpecialSkillCodes,
      },
      parentSnapshot: {
        parentA: this.toParentSnapshot(parentA),
        parentB: this.toParentSnapshot(parentB),
      },
    };
  }

  generateInitialAptitudes(
    speciesValue: string,
    isMutant = false,
    requestedSeed?: string,
  ): { aptitudes: PetAptitudes; growth: number; seed: string } {
    const species = findPetSpeciesConfig(speciesValue);
    const seed = String(requestedSeed || createRandomSeed('initial'));
    const rng = new SeededRandom(seed);
    const aptitudes = {} as PetAptitudes;

    for (const key of APTITUDE_KEYS) {
      const range = getAptitudeRange(species, key, isMutant);
      aptitudes[key] = rng.int(range[0], range[1]);
    }

    const growthRange = getGrowthRange(species, isMutant);
    const growth = this.roundGrowth(rng.float(growthRange[0], growthRange[1]));

    return { aptitudes, growth, seed };
  }

  toSkillSnapshot(skill: SkillSeedConfig | any): SkillSnapshot {
    const config = getSkillSeedConfig(skill?.skillCode) || skill;
    return {
      skillCode: String(config?.skillCode || ''),
      familyCode: String(config?.familyCode || config?.skillCode || ''),
      name: String(config?.name || config?.skillCode || ''),
      description: String(config?.description || ''),
      rarity: Number(config?.rarity || 1),
      tier: String(config?.tier || 'low'),
      type: String(config?.type || 'passive'),
      category: String(config?.category || 'legacy'),
      power: Number(config?.power || 0),
      triggerRate: Number(config?.triggerRate ?? 1),
      effect: String(config?.effect || ''),
      effectData: config?.effectData || {},
      conflictGroup: String(config?.conflictGroup || ''),
      canLock: config?.canLock !== false,
      canOverwrite: config?.canOverwrite !== false,
      canInherit: config?.canInherit !== false,
      speciesCode: String(config?.speciesCode || ''),
    };
  }

  private getMutationRate(
    childSpecies: PetSpeciesConfig,
    parentA: Pet,
    parentB: Pet,
    baseRate: number,
  ) {
    const matchingMutants = [parentA, parentB].filter((parent) => {
      const parentSpecies = findPetSpeciesConfig(parent.speciesCode || parent.species);
      return Boolean(parent.isMutant) && parentSpecies.speciesCode === childSpecies.speciesCode;
    }).length;

    const bonus = matchingMutants >= 2 ? 0.04 : matchingMutants === 1 ? 0.02 : 0;
    return Math.min(0.12, baseRate + bonus);
  }

  private rollSkillCapacity(
    parentA: Pet,
    parentB: Pet,
    mode: BreedingMode,
    rng: SeededRandom,
  ) {
    const config = getModeConfig(mode);
    const slotA = this.getParentSkillCapacity(parentA);
    const slotB = this.getParentSkillCapacity(parentB);
    const base = Math.floor((slotA + slotB) / 2);
    const maximumByParents = Math.min(config.maxSkillCapacity, slotA + slotB, MAX_SKILL_CAPACITY);
    const validDeltas = config.capacityDeltas.filter((entry) => {
      const result = base + entry.delta;
      return result >= MIN_SKILL_CAPACITY && result <= maximumByParents;
    });
    const picked = rng.weighted(validDeltas) || { delta: 0, weight: 1 };
    let candidate = this.clamp(base + picked.delta, MIN_SKILL_CAPACITY, maximumByParents);
    const parentHigh = Math.max(slotA, slotB);

    if (candidate > parentHigh) {
      const difference = candidate - parentHigh;
      let confirmRate = BREAKTHROUGH_CONFIRM_RATE[difference] || 0;
      confirmRate *= HIGH_CAPACITY_MODIFIER[candidate] || 1;

      if (!rng.chance(confirmRate)) {
        candidate = rng.chance(0.6) ? parentHigh : Math.max(MIN_SKILL_CAPACITY, parentHigh - 1);
      }
    }

    if (slotA === 10 && slotB === 10 && mode === 'fusion') {
      const specialRoll = rng.next();
      if (specialRoll < 0.12) return 8;
      if (specialRoll < 0.5) return 9;
      return 10;
    }

    return this.clamp(candidate, MIN_SKILL_CAPACITY, maximumByParents);
  }

  private rollAptitudes(
    parentA: Pet,
    parentB: Pet,
    childSpecies: PetSpeciesConfig,
    isMutant: boolean,
    mode: BreedingMode,
    rng: SeededRandom,
  ): PetAptitudes {
    const result = {} as PetAptitudes;
    const config = getModeConfig(mode);

    for (const key of APTITUDE_KEYS) {
      const qA = this.getParentAptitudePercentile(parentA, key);
      const qB = this.getParentAptitudePercentile(parentB, key);
      const qParent = (qA + qB) / 2;
      const qCenter = 0.65 * qParent + 0.35 * 0.5;
      const bucket = this.pickPercentileBucket(
        config.aptitudeBuckets,
        childSpecies.mainAptitudes.includes(key),
        rng,
      );
      const offset = rng.float(bucket.minOffset, bucket.maxOffset);
      const percentile = this.clamp(qCenter + offset, 0, 1);
      const range = getAptitudeRange(childSpecies, key, isMutant);
      result[key] = Math.round(range[0] + percentile * (range[1] - range[0]));
    }

    return result;
  }

  private rollGrowth(
    parentA: Pet,
    parentB: Pet,
    childSpecies: PetSpeciesConfig,
    isMutant: boolean,
    mode: BreedingMode,
    rng: SeededRandom,
  ) {
    const qA = this.getParentGrowthPercentile(parentA);
    const qB = this.getParentGrowthPercentile(parentB);
    const qParent = (qA + qB) / 2;
    const qCenter = 0.65 * qParent + 0.35 * 0.5;
    const bucket = rng.weighted(getModeConfig(mode).growthBuckets) ||
      getModeConfig(mode).growthBuckets[2];
    const percentile = this.clamp(
      qCenter + rng.float(bucket.minOffset, bucket.maxOffset),
      0,
      1,
    );
    const range = getGrowthRange(childSpecies, isMutant);
    return this.roundGrowth(range[0] + percentile * (range[1] - range[0]));
  }

  private rollSkills(
    parentA: Pet,
    parentB: Pet,
    childSpecies: PetSpeciesConfig,
    isMutant: boolean,
    skillSlotCount: number,
    mode: BreedingMode,
    rng: SeededRandom,
  ) {
    const config = getModeConfig(mode);
    const parentSkillsA = this.normalizeParentSkills(parentA.skills);
    const parentSkillsB = this.normalizeParentSkills(parentB.skills);
    const allParentSkills = [...parentSkillsA, ...parentSkillsB];

    const specialCounts = new Map<string, number>();
    for (const skill of allParentSkills.filter((item) => isSpecialSkill(item))) {
      specialCounts.set(skill.skillCode, (specialCounts.get(skill.skillCode) || 0) + 1);
    }

    const shuffledSpecialCodes = rng.shuffle([...specialCounts.keys()]);
    const inheritedSpecials: SkillSnapshot[] = [];
    const rejectedSpecialSkillCodes: string[] = [];

    shuffledSpecialCodes.forEach((skillCode, index) => {
      const decay = SPECIAL_ORDER_DECAY[Math.min(index, SPECIAL_ORDER_DECAY.length - 1)];
      const duplicateBonus = (specialCounts.get(skillCode) || 0) >= 2 ? 0.15 : 0;
      const rate = Math.min(0.8, config.specialBaseRate * decay + duplicateBonus);
      const skill = getSkillSeedConfig(skillCode);

      if (skill && rng.chance(rate)) {
        inheritedSpecials.push(this.toSkillSnapshot(skill));
      } else {
        rejectedSpecialSkillCodes.push(skillCode);
      }
    });

    const naturalSpecial = isMutant
      ? getSkillSeedConfig(childSpecies.mutationSpecialSkillCode)
      : null;
    const specialLimit = Math.max(0, skillSlotCount - MIN_NORMAL_SKILL_SLOTS);
    const selectedSpecials: SkillSnapshot[] = [];

    if (naturalSpecial && specialLimit > 0) {
      selectedSpecials.push(this.toSkillSnapshot(naturalSpecial));
    }

    for (const skill of rng.shuffle(inheritedSpecials)) {
      if (selectedSpecials.length >= specialLimit) {
        rejectedSpecialSkillCodes.push(skill.skillCode);
        continue;
      }
      if (!selectedSpecials.some((existing) => existing.skillCode === skill.skillCode)) {
        selectedSpecials.push(skill);
      }
    }

    const ordinaryCapacity = skillSlotCount - selectedSpecials.length;
    const ordinaryParentCandidates = this.reduceByFamily(
      allParentSkills.filter((item) => !isSpecialSkill(item) && item.canInherit !== false),
    );
    const ordinarySkills: SkillSnapshot[] = [];

    for (const skill of rng.shuffle(ordinaryParentCandidates)) {
      if (ordinarySkills.length >= ordinaryCapacity) break;
      if (!rng.chance(config.normalSkillInheritRate)) continue;
      this.tryAddOrdinarySkill(ordinarySkills, skill, ordinaryCapacity);
    }

    const fillCodes = rng.shuffle(childSpecies.fillSkillCodes);
    for (const skillCode of fillCodes) {
      if (ordinarySkills.length >= ordinaryCapacity) break;
      const skill = getSkillSeedConfig(skillCode);
      if (skill) this.tryAddOrdinarySkill(ordinarySkills, this.toSkillSnapshot(skill), ordinaryCapacity);
    }

    const globalLowSkills = rng.shuffle(getLowSkillConfigs());
    for (const skill of globalLowSkills) {
      if (ordinarySkills.length >= ordinaryCapacity) break;
      this.tryAddOrdinarySkill(ordinarySkills, this.toSkillSnapshot(skill), ordinaryCapacity);
    }

    const skills = [...selectedSpecials, ...ordinarySkills].slice(0, skillSlotCount);
    return {
      skills,
      specialSkillCount: selectedSpecials.length,
      inheritedSpecialSkillCodes: selectedSpecials
        .filter((skill) => !naturalSpecial || skill.skillCode !== naturalSpecial.skillCode)
        .map((skill) => skill.skillCode),
      rejectedSpecialSkillCodes: [...new Set(rejectedSpecialSkillCodes)],
    };
  }

  private tryAddOrdinarySkill(
    selected: SkillSnapshot[],
    candidate: SkillSnapshot,
    limit: number,
  ) {
    if (!candidate.skillCode || selected.length >= limit) return false;
    if (selected.some((skill) => skill.skillCode === candidate.skillCode)) return false;
    if (
      candidate.conflictGroup &&
      selected.some((skill) => skill.conflictGroup === candidate.conflictGroup)
    ) {
      return false;
    }

    const familyIndex = selected.findIndex(
      (skill) => skill.familyCode && skill.familyCode === candidate.familyCode,
    );
    if (familyIndex >= 0) {
      const existing = selected[familyIndex];
      if (candidate.tier === 'high' && existing.tier !== 'high') {
        selected[familyIndex] = candidate;
        return true;
      }
      return false;
    }

    selected.push(candidate);
    return true;
  }

  private reduceByFamily(skills: SkillSnapshot[]) {
    const byFamily = new Map<string, SkillSnapshot>();
    for (const skill of skills) {
      const key = skill.familyCode || skill.skillCode;
      const existing = byFamily.get(key);
      if (!existing || (skill.tier === 'high' && existing.tier !== 'high')) {
        byFamily.set(key, skill);
      }
    }
    return [...byFamily.values()];
  }

  private normalizeParentSkills(skills: any[]) {
    const result: SkillSnapshot[] = [];
    for (const skill of Array.isArray(skills) ? skills : []) {
      const config = getSkillSeedConfig(skill?.skillCode);
      const normalized = this.toSkillSnapshot(config || skill);
      if (normalized.skillCode) result.push(normalized);
    }
    return result;
  }

  private rollRarity(
    parentA: Pet,
    parentB: Pet,
    mode: BreedingMode,
    rng: SeededRandom,
  ) {
    const average = Math.round(
      (this.clamp(Number(parentA.rarity || 1), 1, 6) +
        this.clamp(Number(parentB.rarity || 1), 1, 6)) /
        2,
    );
    const entries =
      mode === 'fusion'
        ? [
            { delta: -1, weight: 0.18 },
            { delta: 0, weight: 0.5 },
            { delta: 1, weight: 0.27 },
            { delta: 2, weight: 0.05 },
          ]
        : [
            { delta: -1, weight: 0.22 },
            { delta: 0, weight: 0.58 },
            { delta: 1, weight: 0.18 },
            { delta: 2, weight: 0.02 },
          ];
    return this.clamp(average + (rng.weighted(entries)?.delta || 0), 1, 6);
  }

  private calculateQuality(
    species: PetSpeciesConfig,
    isMutant: boolean,
    aptitudes: PetAptitudes,
    growth: number,
  ) {
    const values = APTITUDE_KEYS.map((key) => {
      const range = getAptitudeRange(species, key, isMutant);
      return this.toPercentile(aptitudes[key], range[0], range[1]);
    });
    const growthRange = getGrowthRange(species, isMutant);
    values.push(this.toPercentile(growth, growthRange[0], growthRange[1]));
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return this.clamp(Math.round(80 + average * 40), 80, 120);
  }

  private getParentAptitudePercentile(parent: Pet, key: AptitudeKey) {
    const species = findPetSpeciesConfig(parent.speciesCode || parent.species);
    const range = getAptitudeRange(species, key, Boolean(parent.isMutant));
    const fieldName = `${key}Aptitude` as keyof Pet;
    const value = Number((parent as any)[fieldName] || 0);
    return value > 0 ? this.toPercentile(value, range[0], range[1]) : 0.5;
  }

  private getParentGrowthPercentile(parent: Pet) {
    const species = findPetSpeciesConfig(parent.speciesCode || parent.species);
    const range = getGrowthRange(species, Boolean(parent.isMutant));
    const value = Number(parent.growth || 0);
    return value > 0 ? this.toPercentile(value, range[0], range[1]) : 0.5;
  }

  private pickPercentileBucket(
    buckets: PercentileBucket[],
    isMainAptitude: boolean,
    rng: SeededRandom,
  ) {
    if (!isMainAptitude) return rng.weighted(buckets) || buckets[2];

    const adjusted = buckets.map((bucket) => {
      if (bucket.name === 'major_down') {
        return { ...bucket, weight: bucket.weight * 0.8 };
      }
      if (bucket.name === 'minor_down') {
        return { ...bucket, weight: bucket.weight + buckets[0].weight * 0.2 };
      }
      return bucket;
    });
    return rng.weighted(adjusted) || adjusted[2];
  }

  private rollAppearance(parentA: Pet, parentB: Pet, rng: SeededRandom) {
    return {
      bodyType: this.inheritTrait(
        parentA.bodyType,
        parentB.bodyType,
        ['normal', 'small', 'large'],
        'normal',
        0.05,
        rng,
      ),
      color: this.inheritTrait(
        parentA.color,
        parentB.color,
        ['white', 'black', 'brown', 'gold', 'gray', 'cream'],
        'white',
        0.06,
        rng,
      ),
      pattern: this.inheritTrait(
        parentA.pattern,
        parentB.pattern,
        ['none', 'stripe', 'spot', 'gradient', 'mask'],
        'none',
        0.06,
        rng,
      ),
    };
  }

  private inheritTrait(
    valueA: string,
    valueB: string,
    pool: string[],
    fallback: string,
    mutationRate: number,
    rng: SeededRandom,
  ) {
    const parentValues = [valueA, valueB].filter(Boolean);
    const inherited = rng.pick(parentValues) || fallback;
    if (!rng.chance(mutationRate)) return { value: inherited, mutated: false };

    const candidates = pool.filter((value) => value !== inherited);
    const value = rng.pick(candidates) || inherited;
    return { value, mutated: value !== inherited };
  }

  private getParentSkillCapacity(parent: Pet) {
    const explicit = Number(parent.skillSlotCount || 0);
    if (explicit >= MIN_SKILL_CAPACITY) {
      return this.clamp(explicit, MIN_SKILL_CAPACITY, MAX_SKILL_CAPACITY);
    }
    const skillLength = Array.isArray(parent.skills) ? parent.skills.length : 0;
    return this.clamp(skillLength || Number(parent.rarity || 1) + 1, 2, 10);
  }

  private toParentSnapshot(parent: Pet) {
    return {
      id: parent.id,
      ownerId: parent.ownerId,
      nickname: parent.nickname,
      speciesCode: findPetSpeciesConfig(parent.speciesCode || parent.species).speciesCode,
      species: parent.species,
      isMutant: Boolean(parent.isMutant),
      rarity: parent.rarity,
      quality: parent.quality,
      skillSlotCount: this.getParentSkillCapacity(parent),
      aptitudes: {
        hp: Number(parent.hpAptitude || 0),
        attack: Number(parent.attackAptitude || 0),
        defense: Number(parent.defenseAptitude || 0),
        magic: Number(parent.magicAptitude || 0),
        speed: Number(parent.speedAptitude || 0),
      },
      growth: Number(parent.growth || 0),
      generation: Number(parent.generation || 1),
      specialSkillCount: Number(parent.specialSkillCount || 0),
      geneCode: parent.geneCode,
      geneScore: parent.geneScore,
      skills: Array.isArray(parent.skills)
        ? parent.skills.map((skill) => String(skill?.skillCode || '')).filter(Boolean)
        : [],
    };
  }

  private toPercentile(value: number, min: number, max: number) {
    if (max <= min) return 0.5;
    return this.clamp((Number(value) - min) / (max - min), 0, 1);
  }

  private roundGrowth(value: number) {
    return Math.round(Number(value || 1) * 1000) / 1000;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Number(value)));
  }
}
