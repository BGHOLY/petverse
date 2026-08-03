import { EquipmentItem } from '../equipment/equipment.entity';
import { Expedition } from '../expedition/expedition.entity';
import { PetTeam } from '../team/pet-team.entity';

export function petRemovalRestriction(
  petId: number,
  team: Pick<PetTeam, 'petIds'> | null,
  activeExpeditions: Array<Pick<Expedition, 'petIds'>> = [],
  equippedItem: Pick<EquipmentItem, 'equippedPetId'> | null = null,
) {
  const normalizedPetId = Number(petId || 0);
  if ((team?.petIds || []).map(Number).includes(normalizedPetId)) {
    return 'Remove pet from the active team first';
  }
  if (
    activeExpeditions.some((entry) =>
      (entry.petIds || []).map(Number).includes(normalizedPetId),
    )
  ) {
    return 'Claim or finish the active expedition before releasing this pet';
  }
  if (Number(equippedItem?.equippedPetId || 0) === normalizedPetId) {
    return 'Unequip all equipment before releasing this pet';
  }
  return '';
}
