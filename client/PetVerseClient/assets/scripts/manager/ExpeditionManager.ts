import {
    ExpeditionApi,
    ExpeditionConfigResult,
    ExpeditionMapCode,
    ExpeditionView,
} from '../network/ExpeditionApi';

type ExpeditionListener = () => void;

export class ExpeditionManager {
    static readonly instance = new ExpeditionManager();

    config: ExpeditionConfigResult | null = null;
    active: ExpeditionView[] = [];
    history: ExpeditionView[] = [];
    loading = false;
    errorMessage = '';

    private readonly listeners = new Set<ExpeditionListener>();

    subscribe(listener: ExpeditionListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    takeErrorMessage() {
        const message = this.errorMessage;
        this.errorMessage = '';
        return message;
    }

    async refresh() {
        this.loading = true;
        this.errorMessage = '';
        this.emit();
        const [config, active, history] = await Promise.all([
            ExpeditionApi.getConfig(),
            ExpeditionApi.getActive(),
            ExpeditionApi.getHistory(),
        ]);
        this.loading = false;
        if (config.success === false || active.success === false || history.success === false) {
            this.errorMessage = config.message || active.message || history.message || '远征数据加载失败';
        } else {
            this.config = {
                version: String(config.version || ''),
                durations: Array.isArray(config.durations) ? config.durations : [],
                maps: Array.isArray(config.maps) ? config.maps : [],
            };
            this.active = Array.isArray(active.expeditions) ? active.expeditions : [];
            this.history = Array.isArray(history.expeditions) ? history.expeditions : [];
        }
        this.emit();
    }

    async start(
        mapCode: ExpeditionMapCode,
        durationMinutes: number,
        petIds: number[],
    ) {
        const result = await ExpeditionApi.start({
            mapCode,
            durationMinutes,
            petIds,
            requestId: `expedition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        if (result.success === false) {
            this.errorMessage = result.message || '远征开始失败';
            this.emit();
            return result;
        }
        await this.refresh();
        return result;
    }

    async claim(expeditionId: number) {
        const result = await ExpeditionApi.claim(expeditionId);
        if (result.success === false) {
            this.errorMessage = result.message || '远征领取失败';
            this.emit();
            return result;
        }
        await this.refresh();
        return result;
    }

    private emit() {
        for (const listener of this.listeners) listener();
    }
}
