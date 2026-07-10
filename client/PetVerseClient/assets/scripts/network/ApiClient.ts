export type HttpMethod = 'GET' | 'POST';

export type ApiResult<T = any> = T & {
    success?: boolean;
    message?: string;
    error?: any;
};

export default class ApiClient {
    public static BASE_URL = 'http://127.0.0.1:3000/api';
    public static TIMEOUT_MS = 9000;

    private static pending = new Map<string, Promise<any>>();

    public static setBaseUrl(url: string) {
        this.BASE_URL = String(url || '').replace(/\/+$/, '');
    }

    public static get<T = any>(path: string): Promise<ApiResult<T>> {
        return this.request<T>('GET', path);
    }

    public static post<T = any>(path: string, data: any = {}): Promise<ApiResult<T>> {
        return this.request<T>('POST', path, data);
    }

    public static isPending(method: HttpMethod, path: string, data?: any) {
        return this.pending.has(this.makeKey(method, path, data));
    }

    private static request<T>(method: HttpMethod, path: string, data?: any): Promise<ApiResult<T>> {
        const key = this.makeKey(method, path, data);
        const existing = this.pending.get(key);
        if (existing) return existing;

        const promise = this.performRequest<T>(method, path, data)
            .catch((error) => ({ success: false, message: this.errorMessage(error), error } as ApiResult<T>))
            .finally(() => this.pending.delete(key));

        this.pending.set(key, promise);
        return promise;
    }

    private static async performRequest<T>(method: HttpMethod, path: string, data?: any): Promise<ApiResult<T>> {
        const url = this.BASE_URL + (path.startsWith('/') ? path : `/${path}`);
        const globalAny = globalThis as any;

        if (globalAny.wx?.request) {
            return this.wxRequest<T>(url, method, data);
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => controller?.abort(), this.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
                signal: controller?.signal,
            });

            const text = await response.text();
            let json: any = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch {
                json = { success: false, message: text || `HTTP ${response.status}` };
            }

            if (!response.ok) {
                return {
                    ...(json || {}),
                    success: false,
                    message: json?.message || `HTTP ${response.status}`,
                } as ApiResult<T>;
            }

            return (json || { success: true }) as ApiResult<T>;
        } finally {
            clearTimeout(timer);
        }
    }

    private static wxRequest<T>(url: string, method: HttpMethod, data?: any): Promise<ApiResult<T>> {
        const globalAny = globalThis as any;
        return new Promise((resolve) => {
            globalAny.wx.request({
                url,
                method,
                data: method === 'POST' ? data || {} : undefined,
                timeout: this.TIMEOUT_MS,
                header: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                success: (res: any) => {
                    const payload = res?.data ?? null;
                    if (res?.statusCode >= 200 && res?.statusCode < 300) {
                        resolve((payload || { success: true }) as ApiResult<T>);
                    } else {
                        resolve({
                            ...(payload || {}),
                            success: false,
                            message: payload?.message || `HTTP ${res?.statusCode || 0}`,
                        } as ApiResult<T>);
                    }
                },
                fail: (error: any) => resolve({
                    success: false,
                    message: this.errorMessage(error),
                    error,
                } as ApiResult<T>),
            });
        });
    }

    private static makeKey(method: HttpMethod, path: string, data?: any) {
        let body = '';
        try { body = data === undefined ? '' : JSON.stringify(data); } catch { body = String(data); }
        return `${method}:${path}:${body}`;
    }

    private static errorMessage(error: any) {
        const text = String(error?.message || error?.errMsg || error || '');
        if (/abort|timeout/i.test(text)) return '请求超时，请检查后端服务';
        return '无法连接后端，请确认 localhost:3000 已启动';
    }
}
