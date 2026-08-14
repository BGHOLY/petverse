import { describe, expect, it } from '@jest/globals';

import { buildBattleDebrief } from './battle-debrief';

describe('battle debrief', () => {
  it('identifies the first fallen pet and missed boss mechanics', () => {
    const result = buildBattleDebrief(
      {
        bossBattle: true,
        leftTeam: [
          { id: 'left-1', name: '炎尾狐', side: 'left' },
          { id: 'left-2', name: '岩甲龟', side: 'left' },
        ],
        rightTeam: [
          { id: 'right-1', name: '古树守卫', side: 'right' },
          { id: 'right-2', name: '月光猫', side: 'right', healingDone: 880 },
        ],
        battleLog: [
          { round: 3, type: 'boss-telegraph' },
          { round: 4, type: 'boss-skill' },
          { round: 5, type: 'defeat', targetId: 'left-1' },
        ],
      },
      false,
      '生存不足',
    );

    expect(result.firstFallen).toEqual({
      id: 'left-1',
      name: '炎尾狐',
      round: 5,
    });
    expect(result.criticalEvents.join(' ')).toContain('根震');
    expect(result.criticalEvents.join(' ')).toContain('880');
    expect(result.recommendations.join(' ')).toContain('后排');
    expect(result.recommendations.join(' ')).toContain('阵法大招');
  });

  it('returns a compact continuation recommendation after victory', () => {
    const result = buildBattleDebrief(
      {
        leftTeam: [{ id: 'left-1', name: '炎尾狐', side: 'left' }],
        rightTeam: [{ id: 'right-1', name: '月光猫', side: 'right' }],
        battleLog: [
          { round: 2, type: 'command', side: 'left' },
          { round: 3, type: 'ultimate', side: 'left' },
        ],
      },
      true,
    );

    expect(result.firstFallen).toBeNull();
    expect(result.recommendations).toEqual(['保持当前阵容，继续挑战下一关']);
  });
});
