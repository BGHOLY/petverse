import ApiClient, { ApiResult } from './ApiClient';

export type FormationOverview = {
    wallet?: {
        knowledge?: number;
        cores?: number;
    };
    formations: Array<{
        code: string;
        name: string;
        description?: string;
        level: number;
        maxLevel: number;
        positions?: unknown[];
        passiveRule?: unknown;
        ultimateSkill?: unknown;
        ultimateEnergyRequired?: number;
        ultimateTrigger?: string;
    }>;
    purchaseLimits?: Record<string, number>;
};

export class FormationApi {
    static getOverview(): Promise<ApiResult<FormationOverview>> {
        return ApiClient.get('/formation');
    }

    static upgrade(formationCode: string): Promise<ApiResult> {
        return ApiClient.post('/formation/upgrade', { formationCode });
    }
}
