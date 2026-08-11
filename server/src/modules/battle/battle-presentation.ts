export type BattlePresentationPhase =
  | 'round'
  | 'intent'
  | 'action'
  | 'impact'
  | 'reaction'
  | 'resolve';

export type BattlePresentationEvent = Record<string, any> & {
  schemaVersion: 1;
  eventId: string;
  sequence: number;
  round: number;
  type: string;
  phase: BattlePresentationPhase;
  presentationCue: string;
  text: string;
};

type PresentationDescriptor = {
  phase: BattlePresentationPhase;
  cue: string;
};

const DESCRIPTORS: Record<string, PresentationDescriptor> = {
  start: { phase: 'round', cue: 'battle.start' },
  round: { phase: 'round', cue: 'round.start' },
  'action-order': { phase: 'intent', cue: 'unit.intent' },
  command: { phase: 'intent', cue: 'command.focus' },
  'command-shield': { phase: 'impact', cue: 'support.shield' },
  'command-cleanse': { phase: 'impact', cue: 'status.cleanse' },
  'tactic-trigger': { phase: 'intent', cue: 'unit.intent' },
  heal: { phase: 'impact', cue: 'support.heal' },
  shield: { phase: 'impact', cue: 'support.shield' },
  'shield-absorb': { phase: 'impact', cue: 'shield.absorb' },
  damage: { phase: 'impact', cue: 'damage.hit' },
  dot: { phase: 'impact', cue: 'status.tick' },
  status: { phase: 'reaction', cue: 'status.apply' },
  'combat-reaction': { phase: 'reaction', cue: 'reaction.trigger' },
  'formation-passive': { phase: 'intent', cue: 'formation.passive' },
  'formation-passive-trigger': {
    phase: 'reaction',
    cue: 'formation.passive',
  },
  'formation-energy': { phase: 'resolve', cue: 'formation.energy' },
  ultimate: { phase: 'action', cue: 'formation.ultimate' },
  survive: { phase: 'resolve', cue: 'unit.survive' },
  defeat: { phase: 'resolve', cue: 'unit.death' },
  revive: { phase: 'resolve', cue: 'unit.revive' },
  'focus-retarget': { phase: 'resolve', cue: 'command.focus' },
  finish: { phase: 'resolve', cue: 'battle.finish' },
};

const FALLBACK: PresentationDescriptor = {
  phase: 'resolve',
  cue: 'event.generic',
};

export function nextBattleEventSequence(events: any[] | null | undefined) {
  return (Array.isArray(events) ? events : []).reduce((maximum, event, index) => {
    const sequence = Number(event?.sequence);
    return Number.isFinite(sequence)
      ? Math.max(maximum, sequence + 1)
      : Math.max(maximum, index + 1);
  }, 0);
}

export function decorateBattleEvents(
  battleId: string,
  events: any[] | null | undefined,
  startSequence = 0,
): BattlePresentationEvent[] {
  const safeBattleId = String(battleId || 'battle');
  let sequence = Math.max(0, Math.floor(Number(startSequence) || 0));

  return (Array.isArray(events) ? events : []).map((rawEvent) => {
    const event = rawEvent && typeof rawEvent === 'object'
      ? { ...rawEvent }
      : { type: 'event', text: String(rawEvent || '') };
    const type = String(event.type || 'event');
    const descriptor = DESCRIPTORS[type] || FALLBACK;
    const existingSequence = Number(event.sequence);
    const assignedSequence = Number.isFinite(existingSequence)
      ? Math.max(0, Math.floor(existingSequence))
      : sequence;
    const round = Math.max(0, Math.floor(Number(event.round) || 0));
    const eventId = String(
      event.eventId || `${safeBattleId}:${round}:${assignedSequence}:${type}`,
    );

    sequence = Math.max(sequence + 1, assignedSequence + 1);
    return {
      ...event,
      schemaVersion: 1,
      eventId,
      sequence: assignedSequence,
      round,
      type,
      phase: event.phase || descriptor.phase,
      presentationCue: event.presentationCue || descriptor.cue,
      text: String(event.text || ''),
    } as BattlePresentationEvent;
  });
}

