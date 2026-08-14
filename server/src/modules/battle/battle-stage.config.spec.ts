import { describe, expect, it } from '@jest/globals';

import {
  CHAPTER_ONE_BATTLE_STAGES,
  battleStageViews,
  findBattleStageConfig,
} from './battle-stage.config';

describe('chapter one battle stages', () => {
  it('defines five ordered exploration stages and one boss', () => {
    const normal = battleStageViews('moon-forest', false);
    const boss = battleStageViews('moon-forest', true);

    expect(normal.map((stage) => stage.stageCode)).toEqual([
      'stage-1',
      'stage-2',
      'stage-3',
      'stage-4',
      'stage-5',
    ]);
    expect(boss).toHaveLength(1);
    expect(boss[0].stageCode).toBe('boss');
    expect(CHAPTER_ONE_BATTLE_STAGES).toHaveLength(6);
  });

  it('keeps every encounter as a complete five-unit server config', () => {
    for (const stage of CHAPTER_ONE_BATTLE_STAGES) {
      expect(stage.enemySpeciesCodes).toHaveLength(5);
      expect(stage.objective.length).toBeGreaterThan(4);
      expect(stage.tutorialTip.length).toBeGreaterThan(4);
      expect(stage.recommendedPower).toBeGreaterThan(0);
      expect(stage.maxRounds).toBe(stage.boss ? 35 : 25);
    }
  });

  it('raises difficulty and recommended power through the chapter', () => {
    const difficulties = CHAPTER_ONE_BATTLE_STAGES.map(
      (stage) => stage.difficulty,
    );
    const powers = CHAPTER_ONE_BATTLE_STAGES.map(
      (stage) => stage.recommendedPower,
    );

    expect(
      difficulties.every(
        (value, index) => index === 0 || value > difficulties[index - 1],
      ),
    ).toBe(true);
    expect(
      powers.every((value, index) => index === 0 || value > powers[index - 1]),
    ).toBe(true);
  });

  it('resolves the boss independently from normal stages', () => {
    expect(findBattleStageConfig('moon-forest', 'stage-3', false)?.title).toBe(
      '花鹿清泉',
    );
    expect(findBattleStageConfig('moon-forest', 'boss', true)?.title).toBe(
      '古树守卫',
    );
    expect(findBattleStageConfig('moon-forest', 'boss', false)).toBeUndefined();
  });
});
