export function calculateRarityByScore(score: number) {
  if (score >= 18) return 5;
  if (score >= 14) return 4;
  if (score >= 10) return 3;
  if (score >= 7) return 2;
  return 1;
}

export function getRarityName(rarity: number) {
  const map = {
    1: '普通',
    2: '优秀',
    3: '稀有',
    4: '史诗',
    5: '传说',
  };

  return map[rarity] || '普通';
}