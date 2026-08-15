import AudioDirector from '../AudioDirector';
import type { BattlePresentationEvent } from './BattlePresentationTypes';

type BattleSfx = Parameters<typeof AudioDirector.playSfx>[0];

const CUE_AUDIO: Record<string, BattleSfx> = {
    'damage.hit': 'attack',
    'status.tick': 'magic',
    'support.heal': 'heal',
    'support.shield': 'shield',
    'shield.absorb': 'shield',
    'status.apply': 'magic',
    'status.cleanse': 'heal',
    'reaction.trigger': 'magic',
    'formation.ultimate': 'magic',
    'boss.telegraph': 'shield',
    'boss.skill': 'magic',
    'boss.phase': 'magic',
    'unit.death': 'attack',
};

/** Prevents a large server event batch from stacking the same sound every frame. */
export default class BattleAudioRouter {
    private readonly lastPlayedAt = new Map<string, number>();

    play(event: BattlePresentationEvent | Record<string, any>) {
        const cue = String(event?.presentationCue || '');
        const sound = CUE_AUDIO[cue] || this.legacySound(event);
        if (!sound) return;
        const now = Date.now();
        const cooldown = cue.startsWith('boss.') || cue === 'formation.ultimate' ? 180 : 85;
        const key = `${sound}:${cue}`;
        if (now - Number(this.lastPlayedAt.get(key) || 0) < cooldown) return;
        this.lastPlayedAt.set(key, now);
        void AudioDirector.playSfx(sound);
    }

    reset() {
        this.lastPlayedAt.clear();
    }

    private legacySound(event: Record<string, any>): BattleSfx | null {
        const type = String(event?.type || '');
        if (type === 'damage') return event?.skillName ? 'magic' : 'attack';
        if (type === 'heal') return 'heal';
        if (/shield/.test(type)) return 'shield';
        if (type === 'ultimate' || type.startsWith('boss-')) return 'magic';
        return null;
    }
}
