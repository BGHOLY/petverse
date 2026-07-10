import UIEventCenter from '../manager/UIEventCenter';
import ApiConfig from './ApiConfig';

type RequestMethod = 'GET' | 'POST';

export type ApiResponse<T = any> = T & {
    success?: boolean;
    message?: string;
    error?: any;
};

export default class ApiClient {
    public static BASE_URL = ApiConfig.getBaseUrl();
    private static readonly inFlight = new Map<string, Promise<any>>();

    public static async get(path: string): Promise<any> {
        return this.request('GET', path);
    }

    public static async post(path: string, data: any = {}): Promise<any> {
        return this.request('POST', path, data);
    }

    private static async request(method: RequestMethod, path: string, data?: any): Promise<ApiResponse> {
        const url = this.resolveUrl(path);
        const key = `${method}:${url}:${method === 'POST' ? JSON.stringify(data || {}) : ''}`;

        if (method === 'POST' && this.inFlight.has(key)) {
            return this.inFlight.get(key)!;
        }

        const task = this.performRequest(method, url, data);
        if (method === 'POST') {
            this.inFlight.set(key, task);
        }

        try {
            return await task;
        } finally {
            if (method === 'POST') {
                this.inFlight.delete(key);
            }
        }
    }

    private static async performRequest(method: RequestMethod, url: string, data?: any): Promise<ApiResponse> {
        console.log('[ApiClient] request:', method, url, data || '');
        UIEventCenter.emit('LOADING_CHANGED', true);

        try {
            const response = await this.withTimeout(fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
            }), ApiConfig.REQUEST_TIMEOUT_MS);

            const text = await response.text();
            const json = text ? this.safeParse(text) : null;
            console.log('[ApiClient] response:', url, json);

            if (!response.ok) {
                const result = json || {
                    success: false,
                    message: this.getHttpMessage(response.status),
                };
                console.error('[ApiClient] failed:', url, response.status, result);
                UIEventCenter.emit('API_ERROR', result.message);
                return result;
            }

            if (json?.success === false) {
                UIEventCenter.emit('API_ERROR', json.message || '操作失败');
            }

            return json || { success: true };
        } catch (error) {
            console.error('[ApiClient] error:', url, error);
            const result = {
                success: false,
                message: '后端连接失败，请确认服务已启动',
                error,
            };
            UIEventCenter.emit('API_ERROR', result.message);
            return result;
        } finally {
            UIEventCenter.emit('LOADING_CHANGED', false);
        }
    }

    private static resolveUrl(path: string) {
        const base = this.BASE_URL || ApiConfig.getBaseUrl();
        return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
    }

    private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timer = 0;
        const timeout = new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Request timeout')), timeoutMs) as unknown as number;
        });

        try {
            return await Promise.race([promise, timeout]);
        } finally {
            clearTimeout(timer);
        }
    }

    private static safeParse(text: string) {
        try {
            return JSON.parse(text);
        } catch {
            return {
                success: false,
                message: text || '响应解析失败',
            };
        }
    }

    private static getHttpMessage(status: number) {
        if (status === 401 || status === 403) return '登录状态不可用或权限不足';
        if (status === 404) return '接口不存在';
        if (status >= 500) return '后端服务异常';
        return `请求失败 HTTP ${status}`;
    }
}
