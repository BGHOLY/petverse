export const PROPOSAL_EXPIRE_HOURS = 72;
export const FERTILITY_COST = 20;
export const FERTILITY_RECOVERY_PER_HOUR = 5;

export const DEVELOPMENT_MARRIAGE_COOLDOWN_SECONDS = 60;
export const PRODUCTION_MARRIAGE_COOLDOWN_SECONDS = 72 * 60 * 60;

export const HAS_LIFETIME_BREED_LIMIT = false;
export const DEFAULT_BREED_LIMIT = 0;

export function getMarriageCooldownSeconds(
  env: NodeJS.ProcessEnv = process.env,
) {
  const override = Number(env.MARRIAGE_COOLDOWN_SECONDS || 0);
  if (Number.isFinite(override) && override > 0) {
    return Math.max(1, Math.floor(override));
  }

  return env.NODE_ENV === 'production'
    ? PRODUCTION_MARRIAGE_COOLDOWN_SECONDS
    : DEVELOPMENT_MARRIAGE_COOLDOWN_SECONDS;
}

export function getMarriageEggOwnerIds(ownerAId: number, ownerBId: number) {
  return [...new Set([Number(ownerAId), Number(ownerBId)])].filter(
    (ownerId) => Number.isInteger(ownerId) && ownerId > 0,
  );
}
