import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OffspringBlueprint } from '../breeding/breeding.service';
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

  async createEgg(data: CreateEggData) {
    const rarity = this.clampRarity(data.rarityPotential);
    const geneCode = normalizeGeneCode(data.geneCode || 'AAAA');
    const hatchDurationSeconds =
      data.hatchDurationSeconds === undefined
        ? this.getDefaultHatchDurationSeconds(rarity)
        : Math.max(0, Math.floor(Number(data.hatchDurationSeconds || 0)));
    const hatchReadyAt = new Date(Date.now() + hatchDurationSeconds * 1000);
    const aptitudes = data.aptitudes || {
      hp: 1200,
      attack: 1200,
      defense: 1200,
      magic: 1200,
      speed: 1200,
    };

    const egg = this.eggRepository.create({
      ownerId: data.ownerId,
      parentAId: data.parentAId || 0,
      parentBId: data.parentBId || 0,
      rarityPotential: rarity,
      quality: this.clampQuality(data.quality ?? 100),
      species: data.species || '',
      speciesCode: data.speciesCode || 'PET004',
      isMutant: Boolean(data.isMutant),
      skillSlotCount: this.clampSkillSlotCount(data.skillSlotCount || 3),
      hpAptitude: Number(aptitudes.hp || 1200),
      attackAptitude: Number(aptitudes.attack || 1200),
      defenseAptitude: Number(aptitudes.defense || 1200),
      magicAptitude: Number(aptitudes.magic || 1200),
      speedAptitude: Number(aptitudes.speed || 1200),
      growth: Number(data.growth || 1.1),
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
      offspringData: data.offspringData || null,
      randomSeed: data.randomSeed || data.offspringData?.seed || '',
      configVersion: data.configVersion || data.offspringData?.configVersion || '2.0.0',
      source: data.source,
      status: 'unhatched',
      hatchDurationSeconds,
      hatchReadyAt,
      hatchedPetId: 0,
    });

    return this.eggRepository.save(egg);
  }

  async getUserEggs(userId: number, includeHatched = true) {
    return this.eggRepository.find({
      where: includeHatched
        ? { ownerId: userId }
        : { ownerId: userId, status: 'unhatched' },
      order: {
        status: 'ASC',
        id: 'ASC',
      },
    });
  }

  async getUserEggViews(userId: number, includeHatched = true) {
    const eggs = await this.getUserEggs(userId, includeHatched);
    return eggs.map((egg) => this.toEggView(egg));
  }

  async getEggById(id: number) {
    return this.eggRepository.findOne({
      where: { id },
    });
  }

  async getEggViewById(id: number) {
    const egg = await this.getEggById(id);
    return egg ? this.toEggView(egg) : null;
  }

  async tryMarkHatching(eggId: number, ownerId: number) {
    const result = await this.eggRepository.update(
      {
        id: eggId,
        ownerId,
        status: 'unhatched',
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
        status: 'unhatched',
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

    return {
      ...egg,
      canHatch: egg.status === 'unhatched' && remainingSeconds <= 0,
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
    if (!egg.hatchReadyAt) return 0;

    return Math.max(
      0,
      Math.ceil((new Date(egg.hatchReadyAt).getTime() - Date.now()) / 1000),
    );
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
