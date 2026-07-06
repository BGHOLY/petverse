import ApiConfig from './ApiConfig';

export default class NetworkManager {

    public static async get(url: string, token: string = ''): Promise<any> {
        return this.request('GET', url, undefined, token);
    }

    public static async post(url: string, data: any = {}, token: string = ''): Promise<any> {
        return this.request('POST', url, data, token);
    }

    private static async request(
        method: 'GET' | 'POST',
        url: string,
        data?: any,
        token: string = '',
    ): Promise<any> {
        const fallback = {
            success: false,
            data: [],
            message: '网络请求失败',
        };

        try {
            const headers: Record<string, string> = {
                Accept: 'application/json',
            };

            if (method === 'POST') {
                headers['Content-Type'] = 'application/json';
            }

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(
                ApiConfig.BASE_URL + url,
                {
                    method,
                    headers,
                    body: method === 'POST' ? JSON.stringify(data || {}) : undefined,
                },
            );

            const text = await response.text();

            let json: any = null;

            if (text) {
                try {
                    json = JSON.parse(text);
                } catch {
                    json = {
                        success: false,
                        data: [],
                        message: text,
                    };
                }
            }

            if (!response.ok) {
                return json || {
                    ...fallback,
                    message: `HTTP ${response.status}`,
                };
            }

            return json ?? {
                success: true,
                data: [],
            };
        } catch (error) {
            console.error('Network request error:', method, url, error);
            return fallback;
        }
    }
}