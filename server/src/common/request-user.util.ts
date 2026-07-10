import { DEFAULT_USER_ID } from '../modules/game-data';

export function resolveRequestUserId(
  rawUserId?: string | number | null,
  fallback = DEFAULT_USER_ID,
) {
  const value = Number(rawUserId || 0);
  return Number.isInteger(value) && value > 0
    ? value
    : fallback;
}
