export default class ApiClient {
    public static BASE_URL = 'http://localhost:3000/api';

    public static async get(path: string): Promise<any> {
        return this.request('GET', path);
    }

    public static async post(path: string, data: any = {}): Promise<any> {
        return this.request('POST', path, data);
    }

    private static async request(method: 'GET' | 'POST', path: string, data?: any): Promise<any> {
        const url = this.BASE_URL + (path.startsWith('/') ? path : '/' + path);
        console.log('[ApiClient] request:', method, url, data || '');

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
            });

            const text = await response.text();
            const json = text ? JSON.parse(text) : null;
            console.log('[ApiClient] response:', url, json);

            if (!response.ok) {
                console.error('[ApiClient] failed:', url, response.status, json);
                return json || {
                    success: false,
                    message: `HTTP ${response.status}`,
                };
            }

            return json;
        } catch (error) {
            console.error('[ApiClient] error:', url, error);
            return {
                success: false,
                message: 'Request failed',
                error,
            };
        }
    }
}
