import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { OffspringBlueprint } from '../breeding/breeding.service';
import {
  findPetSpeciesConfig,
  getAptitudeRange,
  getGrowthRange,
  getRandomPetSpeciesConfig,
  hasPetSpeciesConfig,
  PET_CONFIG_VERSION,
} from '../pet/config/pet-species.config';
import { calculateGeneScore, normalizeGeneCode } from '../pet/utils/gene.util';
import { Egg } from './egg.entity';

export interface CreateEggData {
  ownerId: number;
  parentAId?: number;
  parentBId?: number;
  rarityPotential: number;
  source: string;
  quality?: number;
  species?: string;
  speciesCode?: string;
  isMutant?: boolean;
  skillSlotCount?: number;
  aptitudes?: {
    hp: number;
    attack: number;
    defense: number;
    magic: number;
    speed: number;
  };
  growth?: number;
  generation?: number;
  specialSkillCount?: number;
  geneCode?: string;
  geneScore?: number;
  bodyType?: string;
  color?: string;
  pattern?: string;
  inheritedSkills?: any[];
  mutationData?: any;
  parentSnapshot?: any;
  offspringData?: Partial<OffspringBlueprint>;
  randomSeed?: string;
  configVersion?: string;
  hatchDurationSeconds?: number;
}

@Injectable()
export class EggService {
  constructor(
    @InjectRepository(Egg)
    private readonly eggRepository: Repository<Egg>,
  ) {}

  async createEgg(data: CreateEggData, manager?: EntityManager) {
    const eggRepository = manager ? manager.getRepository(Egg) : this.eggRepository;
    const rarity = this.clampRarity(data.rarityPotential);
    const geneCode = normalizeGeneCode(data.geneCode || 'AAAA');
    const randomSeed = data.randomSeed || data.offspringData?.seed ||
      `egg-${data.ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const requestedSpecies = data.speciesCode || data.species;
    const speciesConfig = requestedSpecies && hasPetSpeciesConfig(requestedSpecies)
      ? findPetSpeciesConfig(requestedSpecies)
      : getRandomPetSpeciesConfig(randomSeed);
    const hatchDurationSeconds =
      data.hatchDurationSeconds === undefined
        ? this.getDefaultHatchDurationSeconds(rarity)
        : Math.max(0, Math.floor(Number(data.hatchDurationSeconds || 0)));
    const aptitudes = data.aptitudes || this.generateSpeciesAptitudes(speciesConfig, Boolean(data.isMutant));
    const growthRange = getGrowthRange(speciesConfig, Boolean(data.isMutant));
    const growth = Number(data.growth || this.randomFloat(growthRange[0], growthRange[1], 3));
    const generatedOffspringData = data.offspringData ||
      (!data.parentAId && !data.parentBId
        ? {
            mode: 'breed' as const,
            seed: randomSeed,
            configVersion: PET_CONFIG_VERSION,
            species: speciesConfig.name,
            speciesCode: speciesConfig.speciesCode,
            isMutant: Boolean(data.isMutant),
            rarity,
            quality: this.clampQuality(data.quality ?? 100),
            skillSlotCount: this.clampSkillSlotCount(data.skillSlotCount || 3),
            aptitudes,
            growth,
            generation: Math.max(1, Number(data.generation || 1)),
            specialSkillCount: Math.max(0, Number(data.specialSkillCount || 0)),
            inheritedSkills: Array.isArray(data.inheritedSkills) ? data.inheritedSkills : [],
            geneCode,
            geneScore: Number(data.geneScore || calculateGeneScore(geneCode)),
            bodyType: data.bodyType || 'normal',
            color: data.color || 'white',
            pattern: data.pattern || 'none',
          }
        : null);

    const egg = eggRepository.create({
      ownerId: data.ownerId,
      parentAId: data.parentAId || 0,
      parentBId: data.parentBId || 0,
      rarityPotential: rarity,
      quality: this.clampQuality(data.quality ?? 100),
      species: speciesConfig.name,
      speciesCode: speciesConfig.speciesCode,
      isMutant: Boolean(data.isMutant),
      skillSlotCount: this.clampSkillSlotCount(data.skillSlotCount || 3),
      hpAptitude: Number(aptitudes.hp || 1200),
      attackAptitude: Number(aptitudes.attack || 1200),
      defenseAptitude: Number(aptitudes.defense || 1200),
      magicAptitude: Number(aptitudes.magic || 1200),
      speedAptitude: Number(aptitudes.speed || 1200),
      growth,
      generation: Math.max(1, Number(data.generation || 1)),
      specialSkillCount: Math.max(0, Number(data.specialSkillCount || 0)),
      geneCode,
      geneScore: Number(data.geneScore || calculateGeneScore(geneCode)),
      bodyType: data.bodyType || 'normal',
      color: data.color || 'white',
      pattern: data.pattern || 'none',
      inheritedSkills: Array.isArray(data.inheritedSkills)
        ? data.inheritedSkills
        : [],
      mutationData: data.mutationData || {
        naturalMutation: false,
        mutationRate: 0,
        geneMutationCount: 0,
        geneMutationLoci: [],
        mutatedTraits: [],
        inheritedSpecialSkillCodes: [],
        rejectedSpecialSkillCodes: [],
      },
      parentSnapshot: data.parentSnapshot || null,
      offspringData: generatedOffspringData,
      randomSeed,
      configVersion: data.configVersion || data.offspringData?.configVersion || PET_CONFIG_VERSION,
      source: data.source,
      status: 'stored',
      hatchDurationSeconds,
      hatchReadyAt: null,
      hatchedPetId: 0,
    });

    return eggRepository.save(egg);
  }

  async getUserEggs(userId: number, includeHatched = true) {
    await this.migrateLegacyEggs(userId);
    await this.repairLegacyItemEggSpecies(userId);
    const eggs = await this.eggRepository.find({
      where: { ownerId: userId },
      order: {
        status: 'ASC',
        id: 'ASC',
      },
    });
    return includeHatched
      ? eggs
      : eggs.filter((egg) => egg.status !== 'hatched');
  }

  async getUserEggViews(userId: number, includeHatched = true) {
    const eggs = await this.getUserEggs(userId, includeHatched);
    return eggs.map((egg) => this.toEggView(egg));
  }

  async getEggById(id: number) {
    return this.eggRepository.findOne({ where: { id } });
  }

  async getEggViewById(id: number) {
    const egg = await this.getEggById(id);
    return egg ? this.toEggView(egg) : null;
  }

  async getActiveEgg(userId: number) {
    return this.eggRepository.findOne({
      where: {
        ownerId: userId,
        status: In(['incubating', 'hatching']),
      },
      order: { id: 'ASC' },
    });
  }

  async startIncubation(eggId: number, ownerId: number) {
    const active = await this.getActiveEgg(ownerId);
    if (active) return null;

    const egg = await this.eggRepository.findOne({
      where: { id: eggId, ownerId, status: 'stored' },
    });
    if (!egg) return null;

    egg.status = 'incubating';
    egg.hatchReadyAt = new Date(
      Date.now() + Math.max(0, Number(egg.hatchDurationSeconds || 0)) * 1000,
    );
    return this.eggRepository.save(egg);
  }

  async accelerateIncubation(
    eggId: number,
    ownerId: number,
    seconds: number,
  ) {
    const egg = await this.eggRepository.findOne({
      where: { id: eggId, ownerId, status: 'incubating' },
    });
    if (!egg) return null;

    const currentReadyAt = egg.hatchReadyAt
      ? new Date(egg.hatchReadyAt).getTime()
      : Date.now();
    egg.hatchReadyAt = new Date(
      Math.max(Date.now(), currentReadyAt - Math.max(0, seconds) * 1000),
    );
    return this.eggRepository.save(egg);
  }

  async tryMarkHatching(eggId: number, ownerId: number) {
    const result = await this.eggRepository.update(
      {
        id: eggId,
        ownerId,
        status: 'incubating',
      },
      {
        status: 'hatching',
      },
    );

    if (Number(result.affected || 0) !== 1) return null;
    return this.getEggById(eggId);
  }

  async markUnhatched(egg: Egg) {
    await this.eggRepository.update(
      {
        id: egg.id,
        status: 'hatching',
      },
      {
        status: 'incubating',
      },
    );

    return (await this.getEggById(egg.id)) || egg;
  }

  async markHatched(egg: Egg, petId: number) {
    const result = await this.eggRepository.update(
      {
        id: egg.id,
        status: 'hatching',
      },
      {
        status: 'hatched',
        hatchedPetId: petId,
      },
    );

    if (Number(result.affected || 0) !== 1) {
      throw new Error('Egg hatch state changed unexpectedly');
    }

    const updated = await this.getEggById(egg.id);
    if (!updated) throw new Error('Hatched egg record not found');
    return updated;
  }

  toEggView(egg: Egg) {
    const remainingSeconds = this.getRemainingSeconds(egg);
    const incubating = egg.status === 'incubating' || egg.status === 'hatching';

    return {
      ...egg,
      deviceState: egg.status === 'stored'
        ? 'warehouse'
        : incubating
          ? remainingSeconds <= 0
            ? 'ready'
            : 'incubating'
          : egg.status,
      canStart: egg.status === 'stored',
      canAccelerate: egg.status === 'incubating' && remainingSeconds > 0,
      canHatch: egg.status === 'incubating' && remainingSeconds <= 0,
      remainingSeconds,
      aptitudes: {
        hp: egg.hpAptitude,
        attack: egg.attackAptitude,
        defense: egg.defenseAptitude,
        magic: egg.magicAptitude,
        speed: egg.speedAptitude,
      },
    };
  }

  getRemainingSeconds(egg: Egg) {
    if (egg.status === 'stored') {
      return Math.max(0, Number(egg.hatchDurationSeconds || 0));
    }
    if (!egg.hatchReadyAt) return 0;

    return Math.max(
      0,
      Math.ceil((new Date(egg.hatchReadyAt).getTime() - Date.now()) / 1000),
    );
  }

  private async migrateLegacyEggs(userId: number) {
    await this.eggRepository.update(
      { ownerId: userId, status: 'unhatched' },
      { status: 'stored', hatchReadyAt: null },
    );
  }

  private async repairLegacyItemEggSpecies(userId: number) {
    const eggs = await this.eggRepository.find({ where: { ownerId: userId } });
    for (const egg of eggs) {
      const itemEgg = !Number(egg.parentAId || 0) && !Number(egg.parentBId || 0) &&
        /pet_egg|egg/i.test(String(egg.source || ''));
      const needsRepair = itemEgg && !egg.offspringData &&
        (!hasPetSpeciesConfig(egg.speciesCode || egg.species) || String(egg.speciesCode || '').toUpperCase() === 'PET004');
      if (!needsRepair) continue;

      const seed = `v81-legacy-egg-${userId}-${egg.id}-${egg.source}`;
      const species = getRandomPetSpeciesConfig(seed);
      const aptitudes = this.generateSpeciesAptitudes(species, Boolean(egg.isMutant));
      const growthRange = getGrowthRange(species, Boolean(egg.isMutant));
      const growth = this.randomFloat(growthRange[0], growthRange[1], 3);
      egg.speciesCode = species.speciesCode;
      egg.species = species.name;
      egg.hpAptitude = aptitudes.hp;
      egg.attackAptitude = aptitudes.attack;
      egg.defenseAptitude = aptitudes.defense;
      egg.magicAptitude = aptitudes.magic;
      egg.speedAptitude = aptitudes.speed;
      egg.growth = growth;
      egg.randomSeed = seed;
      egg.configVersion = PET_CONFIG_VERSION;
      egg.offspringData = {
        mode: 'breed',
        seed,
        configVersion: PET_CONFIG_VERSION,
        speciesCode: species.speciesCode,
        species: species.name,
        isMutant: Boolean(egg.isMutant),
        rarity: this.clampRarity(egg.rarityPotential),
        quality: this.clampQuality(egg.quality),
        skillSlotCount: this.clampSkillSlotCount(egg.skillSlotCount || 3),
        aptitudes,
        growth,
        generation: Math.max(1, Number(egg.generation || 1)),
        specialSkillCount: Math.max(0, Number(egg.specialSkillCount || 0)),
        inheritedSkills: Array.isArray(egg.inheritedSkills) ? egg.inheritedSkills : [],
        geneCode: normalizeGeneCode(egg.geneCode || 'AAAA'),
        geneScore: Number(egg.geneScore || calculateGeneScore(egg.geneCode || 'AAAA')),
        bodyType: egg.bodyType || 'normal',
        color: egg.color || 'white',
        pattern: egg.pattern || 'none',
      };
      await this.eggRepository.save(egg);
    }
  }

  private generateSpeciesAptitudes(species: any, isMutant: boolean) {
    return {
      hp: this.randomInt(...getAptitudeRange(species, 'hp', isMutant)),
      attack: this.randomInt(...getAptitudeRange(species, 'attack', isMutant)),
      defense: this.randomInt(...getAptitudeRange(species, 'defense', isMutant)),
      magic: this.randomInt(...getAptitudeRange(species, 'magic', isMutant)),
      speed: this.randomInt(...getAptitudeRange(species, 'speed', isMutant)),
    };
  }

  private randomInt(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  private randomFloat(min: number, max: number, digits = 3) {
    const value = min + Math.random() * (max - min);
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  private getDefaultHatchDurationSeconds(rarity: number) {
    const durations: Record<number, number> = {
      1: 30,
      2: 45,
      3: 60,
      4: 90,
      5: 120,
      6: 180,
    };

    return durations[this.clampRarity(rarity)];
  }

  private clampRarity(rarity: number) {
    return Math.max(1, Math.min(6, Math.floor(Number(rarity || 1))));
  }

  private clampQuality(quality: number) {
    return Math.max(80, Math.min(120, Math.round(Number(quality || 100))));
  }

  private clampSkillSlotCount(value: number) {
    return Math.max(2, Math.min(10, Math.floor(Number(value || 3))));
  }
}
