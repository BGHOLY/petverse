import ApiClient from './ApiClient';

export default class NetworkManager {
    public static async get(url: string, token = ''): Promise<any> {
        if (token) ApiClient.setToken(token);
        return ApiClient.get(url);
    }

    public static async post(url: string, data: any = {}, token = ''): Promise<any> {
        if (token) ApiClient.setToken(token);
        return ApiClient.post(url, data);
    }
}
