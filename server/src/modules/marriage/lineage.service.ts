import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { Pet } from '../pet/pet.entity';

export interface LineageCheckResult {
  compatible: boolean;
  reason: string;
  sharedAncestorIds: number[];
}

@Injectable()
export class LineageService {
  private readonly maxDepth = 3;

  async checkCompatibility(
    petA: Pet,
    petB: Pet,
    repositoryOrManager: Repository<Pet> | EntityManager,
  ): Promise<LineageCheckResult> {
    if (!petA || !petB) {
      return {
        compatible: false,
        reason: 'Pet not found',
        sharedAncestorIds: [],
      };
    }

    if (petA.id === petB.id) {
      return {
        compatible: false,
        reason: 'A pet cannot marry itself',
        sharedAncestorIds: [petA.id],
      };
    }

    const [aAncestors, bAncestors] = await Promise.all([
      this.getAncestorDepthMap(petA, repositoryOrManager),
      this.getAncestorDepthMap(petB, repositoryOrManager),
    ]);

    if (aAncestors.has(petB.id) || bAncestors.has(petA.id)) {
      return {
        compatible: false,
        reason: 'Direct parent and child cannot marry',
        sharedAncestorIds: [aAncestors.has(petB.id) ? petB.id : petA.id],
      };
    }

    const shared = [...aAncestors.keys()].filter((id) =>
      bAncestors.has(id),
    );

    if (shared.length) {
      return {
        compatible: false,
        reason: 'Close relatives within three generations cannot marry',
        sharedAncestorIds: shared,
      };
    }

    return {
      compatible: true,
      reason: '',
      sharedAncestorIds: [],
    };
  }

  async getLineage(
    pet: Pet,
    repositoryOrManager: Repository<Pet> | EntityManager,
  ) {
    const ancestors = await this.getAncestorDepthMap(
      pet,
      repositoryOrManager,
    );
    const ids = [...ancestors.keys()];
    const repository = this.getRepository(repositoryOrManager);
    const records: Pet[] = ids.length
      ? await repository.find({
          where: ids.map((id) => ({ id })),
        } as any)
      : [];
    const petMap = new Map<number, Pet>(
      records.map((item: Pet) => [item.id, item]),
    );

    return [...ancestors.entries()]
      .map(([id, depth]) => ({
        depth,
        pet: petMap.get(id) || { id },
      }))
      .sort((a, b) => a.depth - b.depth || Number(a.pet.id) - Number(b.pet.id));
  }

  private async getAncestorDepthMap(
    pet: Pet,
    repositoryOrManager: Repository<Pet> | EntityManager,
  ) {
    const result = new Map<number, number>();
    let frontier = [pet];

    for (let depth = 1; depth <= this.maxDepth; depth += 1) {
      const parentIds = new Set<number>();
      for (const current of frontier) {
        const fatherId = Number(current?.fatherId || 0);
        const motherId = Number(current?.motherId || 0);
        if (fatherId > 0) parentIds.add(fatherId);
        if (motherId > 0) parentIds.add(motherId);
      }

      const ids = [...parentIds].filter((id) => !result.has(id));
      if (!ids.length) break;

      const repository = this.getRepository(repositoryOrManager);
      const parents: Pet[] = await repository.find({
        where: ids.map((id) => ({ id })),
      } as any);

      for (const parent of parents) {
        if (!result.has(parent.id)) {
          result.set(parent.id, depth);
        }
      }
      frontier = parents;
    }

    return result;
  }

  private getRepository(
    source: Repository<Pet> | EntityManager,
  ): Repository<Pet> {
    return source instanceof Repository
      ? source
      : source.getRepository(Pet);
  }
}
