import ApiClient, { ApiResult } from './ApiClient';

export type ExpeditionMapCode = 'forest' | 'volcano' | 'icefield' | 'ruins';

export type ExpeditionView = {
    id: number;
    mapCode: ExpeditionMapCode;
    durationMinutes: number;
    petIds: number[];
    status: string;
    startedAt: string;
    endsAt: string;
    claimedAt?: string;
    remainingSeconds: number;
    ready: boolean;
    rewards?: Record<string, any>;
    modifiers?: Record<string, any>;
};

export type ExpeditionConfigResult = {
    version: string;
    durations: number[];
    maps: Array<{
        code: ExpeditionMapCode;
        name: string;
        description: string;
    }>;
};

export class ExpeditionApi {
    static getConfig(): Promise<ApiResult<ExpeditionConfigResult>> {
        return ApiClient.get('/expedition/config');
    }

    static getActive(): Promise<ApiResult<{ expeditions: ExpeditionView[] }>> {
        return ApiClient.get('/expedition/active');
    }

    static getHistory(): Promise<ApiResult<{ expeditions: ExpeditionView[] }>> {
        return ApiClient.get('/expedition/history');
    }

    static start(data: {
        mapCode: ExpeditionMapCode;
        durationMinutes: number;
        petIds: number[];
        requestId: string;
    }): Promise<ApiResult<{ expedition: ExpeditionView }>> {
        return ApiClient.post('/expedition/start', data);
    }

    static claim(expeditionId: number): Promise<ApiResult<{
        expedition: ExpeditionView;
        rewards: Record<string, any>;
    }>> {
        return ApiClient.post('/expedition/claim', { expeditionId });
    }

    static devComplete(expeditionId: number): Promise<ApiResult<{
        expedition: ExpeditionView;
    }>> {
        return ApiClient.post('/expedition/dev/complete', { expeditionId });
    }
}
