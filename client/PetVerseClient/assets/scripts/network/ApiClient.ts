export type HttpMethod = 'GET' | 'POST';

export type ApiResult<T = any> = T & {
    success?: boolean;
    message?: string;
    error?: any;
    statusCode?: number;
};

export default class ApiClient {
    public static BASE_URL = 'http://127.0.0.1:3000/api';
    public static TIMEOUT_MS = 9000;

    private static pending = new Map<string, Promise<any>>();
    private static token = '';

    public static setBaseUrl(url: string) {
        const normalized = String(url || '').trim().replace(/\/+$/, '');
        if (normalized) this.BASE_URL = normalized;
    }

    public static setToken(token: string) {
        this.token = String(token || '').trim();
    }

    public static clearPending() {
        this.pending.clear();
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
            .catch((error) => ({
                success: false,
                message: this.errorMessage(error),
                error,
            } as ApiResult<T>))
            .finally(() => this.pending.delete(key));

        this.pending.set(key, promise);
        return promise;
    }

    private static async performRequest<T>(method: HttpMethod, path: string, data?: any): Promise<ApiResult<T>> {
        const url = this.buildUrl(path);
        const globalAny = globalThis as any;

        if (globalAny.wx?.request) {
            return this.wxRequest<T>(url, method, data);
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => controller?.abort(), this.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method,
                headers: this.buildHeaders(),
                body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
                signal: controller?.signal,
                cache: 'no-store',
            });

            const json = await this.readJson(response);
            if (!response.ok) {
                return {
                    ...(json || {}),
                    success: false,
                    statusCode: response.status,
                    message: json?.message || `HTTP ${response.status}`,
                } as ApiResult<T>;
            }

            if (json && typeof json === 'object') {
                return {
                    ...json,
                    statusCode: response.status,
                } as ApiResult<T>;
            }

            return {
                success: true,
                statusCode: response.status,
                data: json,
            } as ApiResult<T>;
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
                header: this.buildHeaders(),
                success: (res: any) => {
                    const payload = res?.data ?? null;
                    const statusCode = Number(res?.statusCode || 0);
                    if (statusCode >= 200 && statusCode < 300) {
                        if (payload && typeof payload === 'object') {
                            resolve({ ...payload, statusCode } as ApiResult<T>);
                        } else {
                            resolve({ success: true, statusCode, data: payload } as ApiResult<T>);
                        }
                    } else {
                        resolve({
                            ...(payload && typeof payload === 'object' ? payload : {}),
                            success: false,
                            statusCode,
                            message: payload?.message || `HTTP ${statusCode}`,
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

    private static buildUrl(path: string) {
        const cleanPath = String(path || '').trim();
        return this.BASE_URL + (cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`);
    }

    private static buildHeaders() {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        return headers;
    }

    private static async readJson(response: Response) {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            return {
                success: false,
                message: text || `HTTP ${response.status}`,
            };
        }
    }

    private static makeKey(method: HttpMethod, path: string, data?: any) {
        let body = '';
        try {
            body = data === undefined ? '' : JSON.stringify(data);
        } catch {
            body = String(data);
        }
        return `${method}:${path}:${body}`;
    }

    private static errorMessage(error: any) {
        const text = String(error?.message || error?.errMsg || error || '');
        if (/abort|timeout/i.test(text)) return '请求超时，请检查后端服务';
        return `无法连接后端，请确认 ${this.BASE_URL} 已启动`;
    }
}
