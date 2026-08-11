import {
    BattlePresentationEvent,
    normalizePresentationEvent,
} from './BattlePresentationTypes';

export interface BattlePresentationAdapter {
    play(event: BattlePresentationEvent, speed: number): Promise<void>;
    applyFinalState?(): void;
    reset?(): void;
}

export default class BattlePresentationDirector {
    private readonly playedEventIds = new Set<string>();
    private playbackChain: Promise<void> = Promise.resolve();
    private speed = 1;
    private disposed = false;

    constructor(private readonly adapter: BattlePresentationAdapter) {}

    setSpeed(value: number) {
        this.speed = Math.max(0.5, Math.min(3, Number(value) || 1));
    }

    play(rawEvents: any[]) {
        const events = (Array.isArray(rawEvents) ? rawEvents : [])
            .map((event, index) => normalizePresentationEvent(event, index))
            .sort((left, right) => left.sequence - right.sequence)
            .filter((event) => !this.playedEventIds.has(event.eventId));

        this.playbackChain = this.playbackChain.then(async () => {
            for (const event of events) {
                if (this.disposed) return;
                this.playedEventIds.add(event.eventId);
                await this.adapter.play(event, this.speed);
            }
        });
        return this.playbackChain;
    }

    markPlayed(rawEvents: any[]) {
        (Array.isArray(rawEvents) ? rawEvents : []).forEach((event, index) => {
            this.playedEventIds.add(normalizePresentationEvent(event, index).eventId);
        });
    }

    skip() {
        this.adapter.applyFinalState?.();
    }

    reset() {
        this.playedEventIds.clear();
        this.playbackChain = Promise.resolve();
        this.adapter.reset?.();
    }

    dispose() {
        this.disposed = true;
        this.playedEventIds.clear();
    }
}

