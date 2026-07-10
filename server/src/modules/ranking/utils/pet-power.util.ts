
import { Pet } from '../../pet/pet.entity';

export function calculatePetPower(pet: Pet) {
  const level = Math.max(1, Number(pet.level || 1));
  const growth = Math.max(0.8, Number(pet.growth || 1.1));
  const skillCount = Array.isArray(pet.skills)
    ? pet.skills.length
    : Number(pet.skillSlotCount || 0);
  const specialCount = Number(
    pet.specialSkillCount || 0,
  );

  const aptitudeScore =
    Number(pet.hpAptitude || 0) * 0.08 +
    Number(pet.attackAptitude || 0) * 0.14 +
    Number(pet.defenseAptitude || 0) * 0.11 +
    Number(pet.magicAptitude || 0) * 0.14 +
    Number(pet.speedAptitude || 0) * 0.12;

  const legacyScore =
    Number(pet.hp || 0) +
    Number(pet.attack || 0) * 5 +
    Number(pet.defense || 0) * 3 +
    Number(pet.intelligence || 0) * 4 +
    Number(pet.speed || pet.agility || 0) * 2;

  return Math.max(
    1,
    Math.round(
      legacyScore +
        aptitudeScore * growth +
        level * 35 +
        Number(pet.rarity || 1) * 120 +
        skillCount * 80 +
        specialCount * 350 +
        Number(pet.generation || 1) * 10,
    ),
  );
}
