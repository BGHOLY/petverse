export type BattlePresentationPhase =
    | 'round'
    | 'intent'
    | 'action'
    | 'impact'
    | 'reaction'
    | 'resolve';

export type BattlePresentationEvent = {
    schemaVersion?: number;
    eventId: string;
    sequence: number;
    round: number;
    type: string;
    phase: BattlePresentationPhase;
    presentationCue: string;
    actorId?: string;
    targetId?: string;
    targetIds?: string[];
    side?: 'left' | 'right';
    skillCode?: string;
    skillName?: string;
    value?: number;
    critical?: boolean;
    statusCode?: string;
    reactionCode?: string;
    formationCode?: string;
    text: string;
};

export type BattleUnitSnapshot = {
    id: string | number;
    side?: 'left' | 'right';
    slotIndex?: number;
    speciesCode?: string;
    name?: string;
    role?: string;
    hp?: number;
    maxHp?: number;
    shield?: number;
    alive?: boolean;
};

const PHASE_BY_TYPE: Record<string, BattlePresentationPhase> = {
    start: 'round',
    round: 'round',
    'action-order': 'intent',
    command: 'intent',
    damage: 'impact',
    heal: 'impact',
    shield: 'impact',
    'shield-absorb': 'impact',
    status: 'reaction',
    dot: 'impact',
    'combat-reaction': 'reaction',
    ultimate: 'action',
    defeat: 'resolve',
    revive: 'resolve',
    finish: 'resolve',
};

const CUE_BY_TYPE: Record<string, string> = {
    start: 'battle.start',
    round: 'round.start',
    'action-order': 'unit.intent',
    command: 'command.focus',
    'command-shield': 'support.shield',
    'command-cleanse': 'status.cleanse',
    'tactic-trigger': 'unit.intent',
    damage: 'damage.hit',
    heal: 'support.heal',
    shield: 'support.shield',
    'shield-absorb': 'shield.absorb',
    status: 'status.apply',
    dot: 'status.tick',
    'combat-reaction': 'reaction.trigger',
    'formation-passive': 'formation.passive',
    'formation-passive-trigger': 'formation.passive',
    'formation-energy': 'formation.energy',
    ultimate: 'formation.ultimate',
    survive: 'unit.survive',
    defeat: 'unit.death',
    revive: 'unit.revive',
    'focus-retarget': 'command.focus',
    finish: 'battle.finish',
};

export function normalizePresentationEvent(raw: any, fallbackSequence: number): BattlePresentationEvent {
    const type = String(raw?.type || 'event');
    const round = Math.max(0, Math.floor(Number(raw?.round) || 0));
    const sequence = Number.isFinite(Number(raw?.sequence))
        ? Math.max(0, Math.floor(Number(raw.sequence)))
        : Math.max(0, Math.floor(Number(fallbackSequence) || 0));
    return {
        ...(raw || {}),
        eventId: String(raw?.eventId || `legacy:${round}:${sequence}:${type}`),
        sequence,
        round,
        type,
        phase: raw?.phase || PHASE_BY_TYPE[type] || 'resolve',
        presentationCue: String(raw?.presentationCue || CUE_BY_TYPE[type] || 'event.generic'),
        text: String(raw?.text || ''),
    };
}

