import { describe, expect, it } from '@jest/globals';

import {
  decorateBattleEvents,
  nextBattleEventSequence,
} from './battle-presentation';

describe('battle presentation events', () => {
  it('adds stable ordering and presentation cues without removing legacy fields', () => {
    const events = decorateBattleEvents('battle-a', [
      { round: 2, type: 'round', text: '第 2 回合' },
      {
        round: 2,
        type: 'damage',
        actorId: 'left-1',
        targetId: 'right-1',
        value: 128,
        critical: true,
        text: '造成 128 伤害',
      },
      { round: 2, type: 'defeat', targetId: 'right-1', text: '目标倒下' },
    ], 7);

    expect(events.map((event) => event.sequence)).toEqual([7, 8, 9]);
    expect(events.map((event) => event.presentationCue)).toEqual([
      'round.start',
      'damage.hit',
      'unit.death',
    ]);
    expect(events[1]).toMatchObject({
      eventId: 'battle-a:2:8:damage',
      schemaVersion: 1,
      phase: 'impact',
      actorId: 'left-1',
      targetId: 'right-1',
      value: 128,
      critical: true,
    });
  });

  it('preserves existing event identifiers during reconnect upgrades', () => {
    const events = decorateBattleEvents('battle-b', [{
      eventId: 'server-event-42',
      sequence: 42,
      round: 4,
      type: 'heal',
      value: 300,
      text: '恢复生命',
    }]);

    expect(events[0]).toMatchObject({
      eventId: 'server-event-42',
      sequence: 42,
      presentationCue: 'support.heal',
      phase: 'impact',
    });
    expect(nextBattleEventSequence(events)).toBe(43);
  });

  it('uses a safe generic cue for unknown legacy events', () => {
    const [event] = decorateBattleEvents('battle-c', [
      { round: 1, type: 'legacy-custom', text: '旧事件' },
    ]);

    expect(event.presentationCue).toBe('event.generic');
    expect(event.phase).toBe('resolve');
  });
});

