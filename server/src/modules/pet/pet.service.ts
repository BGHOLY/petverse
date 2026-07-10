import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  BreedingMode,
} from '../breeding/config/breeding.config';
import {
  OffspringBlueprint,
  PetAptitudes,
  BreedingService,
} from '../breeding/breeding.service';
import {
  DEFAULT_USER_ID,
  RARITY_NAMES,
} from '../game-data';
import { isSpecialSkill } from '../skill/config/skill.config';
import { SkillService } from '../skill/skill.service';
import {
  findPetSpeciesConfig,
  getAptitudeRange,
  getGrowthRange,
  PET_CONFIG_VERSION,
  PetSpeciesConfig,
} from './config/pet-species.config';
import { Pet } from './pet.entity';
import {
  calculateGeneScore,
  generateGeneCode,
  normalizeGeneCode,
} from './utils/gene.util';

export { OffspringBlueprint };

interface CreatePetData {
  nickname?: string;
  species?: string;
  speciesCode?: string;
  isMutant?: boolean;
  rarity?: number;
  quality?: number;
  geneCode?: string;
  bodyType?: string;
  color?: string;
  pattern?: string;
  fatherId?: number;
  motherId?: number;
  skills?: any[];
  skillSlotCount?: number;
  aptitudes?: Partial<PetAptitudes>;
  growth?: number;
  generation?: number;
  sourceType?: string;
  configVersion?: string;
}

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,

    private readonly skillService: SkillService,
    private readonly breedingService: BreedingService,
  ) {}

  async getAllPets() {
    const pets = await this.petRepository.find({
      order: {
        ownerId: 'ASC',
        isEgg: 'ASC',
        id: 'ASC',
      },
    });

    for (const pet of pets) {
      await this.ensureBetaFields(pet);
    }

    return {
      success: true,
      pets,
      data: pets,
      currentPet:
        pets.find((pet) => pet.ownerId === DEFAULT_USER_ID && !pet.isEgg) || null,
    };
  }

  async getUserPets(userId: number) {
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
      },
      order: {
        isEgg: 'ASC',
        id: 'ASC',
      },
    });

    for (const pet of pets) {
      if (!pet.isEgg) {
        await this.updatePetStatus(pet);
        await this.ensureBetaFields(pet);
      }
    }

    return {
      success: true,
      pets,
      data: pets,
      currentPet: pets.find((pet) => !pet.isEgg) || null,
    };
  }

  async getPetById(id: number) {
    const pet = await this.petRepository.findOne({
      where: { id },
    });

    if (!pet) return null;

    if (!pet.isEgg) {
      await this.updatePetStatus(pet);
      await this.ensureBetaFields(pet);
    }

    return pet;
  }

  async getPetDetail(id: number) {
    const pet = await this.getPetById(id);
    if (!pet) return null;

    const speciesConfig = findPetSpeciesConfig(
      pet.speciesCode || pet.species,
    );

    return {
      ...pet,
      speciesConfig: {
        speciesCode: speciesConfig.speciesCode,
        name: speciesConfig.name,
        element: speciesConfig.element,
        roleTags: speciesConfig.roleTags,
        mainAptitudes: speciesConfig.mainAptitudes,
      },
      aptitudes: this.getPetAptitudes(pet),
      lineage: {
        fatherId: Number(pet.fatherId || 0),
        motherId: Number(pet.motherId || 0),
        generation: Number(pet.generation || 1),
      },
      finalAttributes: this.calculateFinalAttributes(pet),
    };
  }

  calculateFinalAttributes(pet: Pet) {
    const species = findPetSpeciesConfig(pet.speciesCode || pet.species);
    const level = Math.max(1, Number(pet.level || 1));
    const growth = Math.max(0.8, Number(pet.growth || 1.1));
    const aptitudes = this.getPetAptitudes(pet);

    const hasNewAptitudes = Object.values(aptitudes).every((value) => value > 0);
    if (!hasNewAptitudes) {
      const qualityRate = this.clampQuality(Number(pet.quality || 100)) / 100;
      return {
        hp: Math.max(1, Math.round(Number(pet.hp || 100) * qualityRate)),
        attack: Math.max(
          1,
          Math.round(Number(pet.attack || 20) * qualityRate),
        ),
        defense: Math.max(
          1,
          Math.round(Number(pet.defense || 20) * qualityRate),
        ),
        magic: Math.max(
          1,
          Math.round(Number(pet.intelligence || 20) * qualityRate),
        ),
        speed: Math.max(
          1,
          Math.round(
            Number(pet.speed || pet.agility || 20) * qualityRate,
          ),
        ),
      };
    }

    return {
      hp: Math.max(
        1,
        Math.round(
          species.baseStats.hp +
            level * aptitudes.hp * growth * 0.08,
        ),
      ),
      attack: Math.max(
        1,
        Math.round(
          species.baseStats.attack +
            level * aptitudes.attack * growth * 0.012,
        ),
      ),
      defense: Math.max(
        1,
        Math.round(
          species.baseStats.defense +
            level * aptitudes.defense * growth * 0.011,
        ),
      ),
      magic: Math.max(
        1,
        Math.round(
          species.baseStats.magic +
            level * aptitudes.magic * growth * 0.012,
        ),
      ),
      speed: Math.max(
        1,
        Math.round(
          species.baseStats.speed +
            level * aptitudes.speed * growth * 0.01,
        ),
      ),
    };
  }

  async getMainPet(userId: number) {
    const pets = await this.petRepository.find({
      where: {
        ownerId: userId,
        isEgg: false,
      },
      order: {
        id: 'ASC',
      },
    });

    const pet = pets[0] || null;
    if (pet) await this.ensureBetaFields(pet);
    return pet;
  }

  async savePet(pet: Pet) {
    return this.petRepository.save(pet);
  }

  async createPet(userId: number, data: CreatePetData = {}) {
    const speciesConfig = findPetSpeciesConfig(
      data.speciesCode || data.species,
    );
    const rarity = this.clampRarity(
      Number(data.rarity || this.randomRarity()),
    );
    const isMutant = Boolean(data.isMutant);
    const initial = this.breedingService.generateInitialAptitudes(
      speciesConfig.speciesCode,
      isMutant,
    );
    const aptitudes: PetAptitudes = {
      hp: Number(data.aptitudes?.hp || initial.aptitudes.hp),
      attack: Number(data.aptitudes?.attack || initial.aptitudes.attack),
      defense: Number(data.aptitudes?.defense || initial.aptitudes.defense),
      magic: Number(data.aptitudes?.magic || initial.aptitudes.magic),
      speed: Number(data.aptitudes?.speed || initial.aptitudes.speed),
    };
    const growth = this.clampGrowthForSpecies(
      Number(data.growth || initial.growth),
      speciesConfig,
      isMutant,
    );
    const geneCode = normalizeGeneCode(
      data.geneCode || generateGeneCode('AAAA', 'AAAA'),
    );
    const skillSlotCount = this.clampSkillSlotCount(
      Number(data.skillSlotCount || this.randomInt(3, 5)),
    );
    const skills = await this.resolvePetSkills(
      rarity,
      skillSlotCount,
      data.skills,
      speciesConfig.speciesCode,
      isMutant,
    );
    const stats = this.generateLegacyStats(
      speciesConfig,
      rarity,
      aptitudes,
      growth,
    );

    const quality =
      data.quality === undefined
        ? this.calculateQualityFromProfile(
            speciesConfig,
            isMutant,
            aptitudes,
            growth,
          )
        : this.clampQuality(Number(data.quality));

    const pet = this.petRepository.create({
      ownerId: userId,
      nickname:
        data.nickname ||
        `${isMutant ? '变异' : ''}${speciesConfig.name}-${Date.now()
          .toString()
          .slice(-4)}`,
      species: speciesConfig.name,
      speciesCode: speciesConfig.speciesCode,
      isMutant,
      rarity,
      rarityName: RARITY_NAMES[rarity],
      quality,
      level: 1,
      exp: 0,
      nextExp: 100,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      agility: stats.speed,
      speed: stats.speed,
      intelligence: stats.magic,
      hpAptitude: aptitudes.hp,
      attackAptitude: aptitudes.attack,
      defenseAptitude: aptitudes.defense,
      magicAptitude: aptitudes.magic,
      speedAptitude: aptitudes.speed,
      growth,
      generation: Math.max(1, Number(data.generation || 1)),
      specialSkillCount: skills.filter((skill) => isSpecialSkill(skill)).length,
      sourceType: data.sourceType || 'created',
      configVersion: data.configVersion || PET_CONFIG_VERSION,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      stamina: 100,
      geneCode,
      geneScore: calculateGeneScore(geneCode),
      bodyType: data.bodyType || 'normal',
      color: data.color || 'white',
      pattern: data.pattern || 'none',
      fatherId: data.fatherId || 0,
      motherId: data.motherId || 0,
      married: false,
      partnerId: 0,
      marriedPetId: 0,
      skillSlotCount,
      skills,
      isEgg: false,
      hatchTime: null,
      lastStatusUpdate: new Date(),
    });

    return this.petRepository.save(pet);
  }

  buildOffspringBlueprint(
    parentA: Pet,
    parentB: Pet,
    forcedRarity?: number,
    mode: BreedingMode = 'breed',
    seed?: string,
  ): OffspringBlueprint {
    const blueprint = this.breedingService.buildOffspring(
      parentA,
      parentB,
      mode,
      seed,
    );

    if (forcedRarity) {
      blueprint.rarity = this.clampRarity(forcedRarity);
    }

    return blueprint;
  }

  async createPetFromEgg(
    userId: number,
    rarity: number,
    parentA?: Pet | null,
    parentB?: Pet | null,
    storedBlueprint?: Partial<OffspringBlueprint>,
  ) {
    let blueprint: OffspringBlueprint;

    if (
      storedBlueprint?.speciesCode &&
      storedBlueprint?.aptitudes &&
      Array.isArray(storedBlueprint?.inheritedSkills)
    ) {
      blueprint = this.normalizeStoredBlueprint(
        storedBlueprint,
        parentA,
        parentB,
        rarity,
      );
    } else if (parentA && parentB) {
      blueprint = this.buildOffspringBlueprint(
        parentA,
        parentB,
        rarity,
        'breed',
      );
    } else {
      const temporaryA = await this.createUnsavedTemplatePet(
        storedBlueprint?.speciesCode || storedBlueprint?.species,
      );
      const temporaryB = await this.createUnsavedTemplatePet(
        storedBlueprint?.speciesCode || storedBlueprint?.species,
      );
      blueprint = this.buildOffspringBlueprint(
        temporaryA,
        temporaryB,
        rarity,
        'breed',
      );
    }

    return this.createPetFromBlueprint(
      userId,
      blueprint,
      parentA || null,
      parentB || null,
      'hatch',
    );
  }

  async createPetFromBlueprint(
    userId: number,
    blueprint: OffspringBlueprint,
    parentA?: Pet | null,
    parentB?: Pet | null,
    sourceType?: string,
  ) {
    const data = this.buildPetCreateDataFromBlueprint(
      userId,
      blueprint,
      parentA,
      parentB,
      sourceType,
    );
    return this.petRepository.save(this.petRepository.create(data));
  }

  buildPetCreateDataFromBlueprint(
    userId: number,
    blueprint: OffspringBlueprint,
    parentA?: Pet | null,
    parentB?: Pet | null,
    sourceType?: string,
  ): Partial<Pet> {
    const species = findPetSpeciesConfig(
      blueprint.speciesCode || blueprint.species,
    );
    const aptitudes = blueprint.aptitudes;
    const stats = this.generateLegacyStats(
      species,
      blueprint.rarity,
      aptitudes,
      blueprint.growth,
    );

    return {
      ownerId: userId,
      nickname: `${blueprint.isMutant ? '变异' : ''}${
        RARITY_NAMES[this.clampRarity(blueprint.rarity)]
      } ${species.name}`,
      species: species.name,
      speciesCode: species.speciesCode,
      isMutant: Boolean(blueprint.isMutant),
      rarity: this.clampRarity(blueprint.rarity),
      rarityName: RARITY_NAMES[this.clampRarity(blueprint.rarity)],
      quality: this.clampQuality(blueprint.quality),
      level: 1,
      exp: 0,
      nextExp: 100,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      agility: stats.speed,
      speed: stats.speed,
      intelligence: stats.magic,
      hpAptitude: Number(aptitudes.hp),
      attackAptitude: Number(aptitudes.attack),
      defenseAptitude: Number(aptitudes.defense),
      magicAptitude: Number(aptitudes.magic),
      speedAptitude: Number(aptitudes.speed),
      growth: Number(blueprint.growth),
      generation: Number(blueprint.generation || 1),
      specialSkillCount: Number(blueprint.specialSkillCount || 0),
      sourceType: sourceType || blueprint.mode,
      configVersion: blueprint.configVersion || PET_CONFIG_VERSION,
      hunger: 100,
      happiness: 100,
      cleanliness: 100,
      stamina: 100,
      geneCode: normalizeGeneCode(blueprint.geneCode || 'AAAA'),
      geneScore: calculateGeneScore(blueprint.geneCode || 'AAAA'),
      bodyType: blueprint.bodyType || 'normal',
      color: blueprint.color || 'white',
      pattern: blueprint.pattern || 'none',
      fatherId: Number(parentA?.id || 0),
      motherId: Number(parentB?.id || 0),
      married: false,
      partnerId: 0,
      marriedPetId: 0,
      skillSlotCount: this.clampSkillSlotCount(
        blueprint.skillSlotCount,
      ),
      skills: blueprint.inheritedSkills,
      isEgg: false,
      hatchTime: new Date(),
      lastStatusUpdate: new Date(),
    };
  }

  async seedDefaultPet(userId = DEFAULT_USER_ID) {
    const existing = await this.getMainPet(userId);
    if (existing) return existing;

    return this.createPet(userId, {
      nickname: 'Mochi',
      speciesCode: 'PET004',
      rarity: 2,
      sourceType: 'starter',
    });
  }

  async feedPet(userId: number, petId?: number) {
    const pet = petId
      ? await this.getPetById(petId)
      : await this.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }

    pet.hunger = Math.min(100, Number(pet.hunger || 0) + 20);
    pet.happiness = Math.min(100, Number(pet.happiness || 0) + 10);
    pet.cleanliness = Math.min(
      100,
      Number(pet.cleanliness || 0) + 5,
    );

    return {
      success: true,
      message: 'Pet fed',
      pet: await this.petRepository.save(pet),
    };
  }

  async levelUpPet(
    userId: number,
    petId?: number,
    exp = 100,
  ) {
    const pet = petId
      ? await this.getPetById(petId)
      : await this.getMainPet(userId);

    if (!pet || pet.ownerId !== userId || pet.isEgg) {
      return {
        success: false,
        message: 'Pet not found',
      };
    }

    return {
      success: true,
      message: 'Exp added',
      pet: await this.addExp(pet, exp),
    };
  }

  async addExp(pet: Pet, exp: number) {
    pet.exp =
      Number(pet.exp || 0) + Math.max(0, Number(exp || 0));
    pet.nextExp = Number(
      pet.nextExp || pet.level * 100 || 100,
    );

    while (pet.exp >= pet.nextExp) {
      pet.exp -= pet.nextExp;
      pet.level = Number(pet.level || 1) + 1;
      pet.hp = Math.round(Number(pet.hp || 100) * 1.06);
      pet.attack = Math.round(
        Number(pet.attack || 20) * 1.04,
      );
      pet.defense = Math.round(
        Number(pet.defense || 20) * 1.04,
      );
      pet.speed = Math.round(
        Number(pet.speed || pet.agility || 20) * 1.03,
      );
      pet.agility = pet.speed;
      pet.intelligence = Math.round(
        Number(pet.intelligence || 20) * 1.04,
      );
      pet.nextExp = pet.level * 100;
    }

    return this.petRepository.save(pet);
  }

  async updatePetStatus(pet: Pet) {
    const now = new Date();

    if (!pet.lastStatusUpdate) {
      pet.lastStatusUpdate = now;
      return this.petRepository.save(pet);
    }

    const diff =
      now.getTime() -
      new Date(pet.lastStatusUpdate).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours <= 0) return pet;

    pet.hunger = Math.max(
      0,
      Number(pet.hunger || 0) - hours,
    );
    pet.happiness = Math.max(
      0,
      Number(pet.happiness || 0) - hours,
    );
    pet.cleanliness = Math.max(
      0,
      Number(pet.cleanliness || 0) - hours,
    );
    pet.stamina = Math.max(
      0,
      Number(pet.stamina || 0) - hours,
    );
    pet.lastStatusUpdate = now;

    return this.petRepository.save(pet);
  }

  async hatchStarterEgg(userId: number) {
    const pet = await this.createPet(userId, {
      nickname: 'Starter Buddy',
      speciesCode: 'PET004',
      rarity: 1,
      sourceType: 'starter-egg',
    });
    const pets = await this.getUserPets(userId);

    return {
      success: true,
      message: 'Starter pet created',
      pet,
      pets: pets.pets,
      data: pets.pets,
    };
  }

  private normalizeStoredBlueprint(
    stored: Partial<OffspringBlueprint>,
    parentA: Pet | null | undefined,
    parentB: Pet | null | undefined,
    rarity: number,
  ): OffspringBlueprint {
    const species = findPetSpeciesConfig(
      stored.speciesCode || stored.species,
    );
    const initial = this.breedingService.generateInitialAptitudes(
      species.speciesCode,
      Boolean(stored.isMutant),
      stored.seed,
    );

    return {
      mode: stored.mode || 'breed',
      seed: stored.seed || initial.seed,
      configVersion:
        stored.configVersion || PET_CONFIG_VERSION,
      speciesCode: species.speciesCode,
      species: species.name,
      isMutant: Boolean(stored.isMutant),
      rarity: this.clampRarity(
        Number(stored.rarity || rarity || 1),
      ),
      quality: this.clampQuality(
        Number(stored.quality || 100),
      ),
      skillSlotCount: this.clampSkillSlotCount(
        Number(
          stored.skillSlotCount ||
            stored.inheritedSkills?.length ||
            3,
        ),
      ),
      aptitudes: {
        hp: Number(stored.aptitudes?.hp || initial.aptitudes.hp),
        attack: Number(
          stored.aptitudes?.attack || initial.aptitudes.attack,
        ),
        defense: Number(
          stored.aptitudes?.defense ||
            initial.aptitudes.defense,
        ),
        magic: Number(
          stored.aptitudes?.magic || initial.aptitudes.magic,
        ),
        speed: Number(
          stored.aptitudes?.speed || initial.aptitudes.speed,
        ),
      },
      growth: Number(stored.growth || initial.growth),
      generation: Math.max(
        1,
        Number(
          stored.generation ||
            Math.max(
              Number(parentA?.generation || 0),
              Number(parentB?.generation || 0),
            ) +
              1,
        ),
      ),
      specialSkillCount: Number(
        stored.specialSkillCount ||
          stored.inheritedSkills?.filter((skill) =>
            isSpecialSkill(skill),
          ).length ||
          0,
      ),
      inheritedSkills: Array.isArray(
        stored.inheritedSkills,
      )
        ? stored.inheritedSkills
        : [],
      geneCode: normalizeGeneCode(
        stored.geneCode || 'AAAA',
      ),
      geneScore: calculateGeneScore(
        stored.geneCode || 'AAAA',
      ),
      bodyType: stored.bodyType || 'normal',
      color: stored.color || 'white',
      pattern: stored.pattern || 'none',
      mutationData: stored.mutationData || {
        naturalMutation: Boolean(stored.isMutant),
        mutationRate: 0,
        geneMutationCount: 0,
        geneMutationLoci: [],
        mutatedTraits: [],
        inheritedSpecialSkillCodes: [],
        rejectedSpecialSkillCodes: [],
      },
      parentSnapshot: stored.parentSnapshot || {
        parentA: {},
        parentB: {},
      },
    };
  }

  private async createUnsavedTemplatePet(
    speciesValue?: string,
  ): Promise<Pet> {
    const species = findPetSpeciesConfig(speciesValue);
    const initial =
      this.breedingService.generateInitialAptitudes(
        species.speciesCode,
      );
    const template = new Pet();
    Object.assign(template, {
      id: 0,
      ownerId: 0,
      nickname: 'template',
      species: species.name,
      speciesCode: species.speciesCode,
      isMutant: false,
      rarity: 1,
      quality: 100,
      skillSlotCount: 3,
      skills: await this.skillService.generateRandomSkills(
        1,
        3,
        species.speciesCode,
      ),
      hpAptitude: initial.aptitudes.hp,
      attackAptitude: initial.aptitudes.attack,
      defenseAptitude: initial.aptitudes.defense,
      magicAptitude: initial.aptitudes.magic,
      speedAptitude: initial.aptitudes.speed,
      growth: initial.growth,
      generation: 1,
      geneCode: 'AAAA',
      bodyType: 'normal',
      color: 'white',
      pattern: 'none',
    });
    return template;
  }

  private async ensureBetaFields(pet: Pet) {
    let changed = false;
    const rarity = this.clampRarity(Number(pet.rarity || 1));
    const species = findPetSpeciesConfig(
      pet.speciesCode || pet.species,
    );

    if (pet.rarity !== rarity) {
      pet.rarity = rarity;
      changed = true;
    }

    if (pet.rarityName !== RARITY_NAMES[rarity]) {
      pet.rarityName = RARITY_NAMES[rarity];
      changed = true;
    }

    if (pet.speciesCode !== species.speciesCode) {
      pet.speciesCode = species.speciesCode;
      changed = true;
    }

    if (pet.species !== species.name) {
      pet.species = species.name;
      changed = true;
    }

    if (pet.isMutant === undefined || pet.isMutant === null) {
      pet.isMutant = false;
      changed = true;
    }

    if (!pet.nextExp || pet.nextExp < 1) {
      pet.nextExp = Math.max(
        100,
        Number(pet.level || 1) * 100,
      );
      changed = true;
    }

    if (!pet.speed) {
      pet.speed = Number(pet.agility || 20);
      changed = true;
    }

    if (!pet.agility) {
      pet.agility = Number(pet.speed || 20);
      changed = true;
    }

    let slotCount = Number(pet.skillSlotCount || 0);
    if (slotCount < 2 || slotCount > 10) {
      slotCount = this.clampSkillSlotCount(
        Array.isArray(pet.skills) && pet.skills.length
          ? pet.skills.length
          : 3,
      );
      pet.skillSlotCount = slotCount;
      changed = true;
    }

    if (
      !Array.isArray(pet.skills) ||
      pet.skills.length !== slotCount
    ) {
      pet.skills = await this.resolvePetSkills(
        rarity,
        slotCount,
        pet.skills,
        species.speciesCode,
        Boolean(pet.isMutant),
      );
      changed = true;
    }

    const initial =
      this.breedingService.generateInitialAptitudes(
        species.speciesCode,
        Boolean(pet.isMutant),
        `migrate-${pet.id}-${species.speciesCode}`,
      );

    const aptitudeFields: Array<
      [keyof Pet, number]
    > = [
      ['hpAptitude', initial.aptitudes.hp],
      ['attackAptitude', initial.aptitudes.attack],
      ['defenseAptitude', initial.aptitudes.defense],
      ['magicAptitude', initial.aptitudes.magic],
      ['speedAptitude', initial.aptitudes.speed],
    ];

    for (const [field, fallback] of aptitudeFields) {
      if (!Number(pet[field] || 0)) {
        (pet as any)[field] = fallback;
        changed = true;
      }
    }

    if (!Number(pet.growth || 0)) {
      pet.growth = initial.growth;
      changed = true;
    }

    if (!Number(pet.generation || 0)) {
      pet.generation = 1;
      changed = true;
    }

    const specialSkillCount = pet.skills.filter((skill) =>
      isSpecialSkill(skill),
    ).length;
    if (
      Number(pet.specialSkillCount || 0) !==
      specialSkillCount
    ) {
      pet.specialSkillCount = specialSkillCount;
      changed = true;
    }

    if (!pet.sourceType) {
      pet.sourceType = 'legacy';
      changed = true;
    }

    if (!pet.configVersion) {
      pet.configVersion = PET_CONFIG_VERSION;
      changed = true;
    }

    if (
      pet.marriedPetId === undefined ||
      pet.marriedPetId === null
    ) {
      pet.marriedPetId = Number(pet.partnerId || 0);
      changed = true;
    }

    const quality = this.clampQuality(
      Number(pet.quality || 100),
    );
    if (pet.quality !== quality) {
      pet.quality = quality;
      changed = true;
    }

    const geneCode = normalizeGeneCode(
      pet.geneCode || 'AAAA',
    );
    if (pet.geneCode !== geneCode) {
      pet.geneCode = geneCode;
      changed = true;
    }

    const geneScore = calculateGeneScore(geneCode);
    if (pet.geneScore !== geneScore) {
      pet.geneScore = geneScore;
      changed = true;
    }

    if (!pet.bodyType) {
      pet.bodyType = 'normal';
      changed = true;
    }

    if (!pet.color) {
      pet.color = 'white';
      changed = true;
    }

    if (!pet.pattern) {
      pet.pattern = 'none';
      changed = true;
    }

    if (changed) await this.petRepository.save(pet);
    return pet;
  }

  private generateLegacyStats(
    species: PetSpeciesConfig,
    rarity: number,
    aptitudes?: PetAptitudes,
    growth = 1.1,
  ) {
    // 旧战斗模块仍读取 pets 表中的 hp/attack/defense/speed。
    // 因此新宝宝在落库时就写入 1 级资质与成长结算后的面板，
    // 保证在战斗模块完全配置化之前，资质与成长已经真实生效。
    if (
      aptitudes &&
      Object.values(aptitudes).every((value) => Number(value) > 0)
    ) {
      const safeGrowth = Math.max(0.8, Number(growth || 1.1));
      return {
        hp: Math.max(
          1,
          Math.round(
            species.baseStats.hp +
              Number(aptitudes.hp) * safeGrowth * 0.08,
          ),
        ),
        attack: Math.max(
          1,
          Math.round(
            species.baseStats.attack +
              Number(aptitudes.attack) * safeGrowth * 0.012,
          ),
        ),
        defense: Math.max(
          1,
          Math.round(
            species.baseStats.defense +
              Number(aptitudes.defense) * safeGrowth * 0.011,
          ),
        ),
        magic: Math.max(
          1,
          Math.round(
            species.baseStats.magic +
              Number(aptitudes.magic) * safeGrowth * 0.012,
          ),
        ),
        speed: Math.max(
          1,
          Math.round(
            species.baseStats.speed +
              Number(aptitudes.speed) * safeGrowth * 0.01,
          ),
        ),
      };
    }

    const rarityRate =
      0.85 + this.clampRarity(rarity) * 0.15;
    return {
      hp: Math.round(species.baseStats.hp * rarityRate),
      attack: Math.round(
        species.baseStats.attack * rarityRate,
      ),
      defense: Math.round(
        species.baseStats.defense * rarityRate,
      ),
      magic: Math.round(
        species.baseStats.magic * rarityRate,
      ),
      speed: Math.round(
        species.baseStats.speed * rarityRate,
      ),
    };
  }

  private async resolvePetSkills(
    rarity: number,
    slotCount: number,
    inherited?: any[],
    speciesCode = '',
    isMutant = false,
  ) {
    const selected: any[] = [];
    const usedCodes = new Set<string>();
    const usedFamilies = new Set<string>();
    const usedConflictGroups = new Set<string>();

    const tryAdd = (skill: any) => {
      const code = String(skill?.skillCode || '');
      const family = String(
        skill?.familyCode || skill?.skillCode || '',
      );
      const conflictGroup = String(
        skill?.conflictGroup || '',
      );

      if (
        !code ||
        usedCodes.has(code) ||
        selected.length >= slotCount
      ) {
        return false;
      }
      if (family && usedFamilies.has(family)) return false;
      if (
        conflictGroup &&
        usedConflictGroups.has(conflictGroup)
      ) {
        return false;
      }

      selected.push(skill);
      usedCodes.add(code);
      if (family) usedFamilies.add(family);
      if (conflictGroup) {
        usedConflictGroups.add(conflictGroup);
      }
      return true;
    };

    if (isMutant) {
      const specialCode =
        findPetSpeciesConfig(speciesCode)
          .mutationSpecialSkillCode;
      const special =
        await this.skillService.getSkillSnapshot(
          specialCode,
        );
      if (special) tryAdd(special);
    }

    for (const rawSkill of Array.isArray(inherited)
      ? inherited
      : []) {
      const skill =
        (await this.skillService.getSkillSnapshot(
          rawSkill?.skillCode,
        )) || rawSkill;
      tryAdd(skill);
    }

    if (selected.length < slotCount) {
      const generated =
        await this.skillService.generateRandomSkills(
          rarity,
          slotCount * 2,
          speciesCode,
        );
      for (const skill of generated) {
        if (selected.length >= slotCount) break;
        tryAdd(skill);
      }
    }

    return selected.slice(0, slotCount);
  }

  private getPetAptitudes(pet: Pet): PetAptitudes {
    return {
      hp: Number(pet.hpAptitude || 0),
      attack: Number(pet.attackAptitude || 0),
      defense: Number(pet.defenseAptitude || 0),
      magic: Number(pet.magicAptitude || 0),
      speed: Number(pet.speedAptitude || 0),
    };
  }

  private calculateQualityFromProfile(
    species: PetSpeciesConfig,
    isMutant: boolean,
    aptitudes: PetAptitudes,
    growth: number,
  ) {
    const percentileValues = (
      Object.keys(aptitudes) as Array<
        keyof PetAptitudes
      >
    ).map((key) => {
      const range = getAptitudeRange(
        species,
        key,
        isMutant,
      );
      return this.toPercentile(
        aptitudes[key],
        range[0],
        range[1],
      );
    });
    const growthRange = getGrowthRange(
      species,
      isMutant,
    );
    percentileValues.push(
      this.toPercentile(
        growth,
        growthRange[0],
        growthRange[1],
      ),
    );
    const average =
      percentileValues.reduce(
        (sum, value) => sum + value,
        0,
      ) / percentileValues.length;
    return this.clampQuality(
      Math.round(80 + average * 40),
    );
  }

  private clampGrowthForSpecies(
    growth: number,
    species: PetSpeciesConfig,
    isMutant: boolean,
  ) {
    const range = getGrowthRange(species, isMutant);
    const value = Math.max(
      range[0],
      Math.min(range[1], Number(growth || range[0])),
    );
    return Math.round(value * 1000) / 1000;
  }

  private toPercentile(
    value: number,
    min: number,
    max: number,
  ) {
    if (max <= min) return 0.5;
    return Math.max(
      0,
      Math.min(1, (Number(value) - min) / (max - min)),
    );
  }

  private randomRarity() {
    const roll = Math.random();
    if (roll < 0.5) return 1;
    if (roll < 0.75) return 2;
    if (roll < 0.9) return 3;
    if (roll < 0.97) return 4;
    if (roll < 0.995) return 5;
    return 6;
  }

  private clampQuality(quality: number) {
    return Math.max(
      80,
      Math.min(120, Math.round(quality || 100)),
    );
  }

  private clampRarity(rarity: number) {
    return Math.max(
      1,
      Math.min(6, Math.floor(rarity || 1)),
    );
  }

  private clampSkillSlotCount(slotCount: number) {
    return Math.max(
      2,
      Math.min(10, Math.floor(slotCount || 3)),
    );
  }

  private randomInt(min: number, max: number) {
    return (
      min +
      Math.floor(Math.random() * (max - min + 1))
    );
  }
}
