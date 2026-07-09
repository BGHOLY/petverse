import ApiClient from './ApiClient';

export default class NetworkManager {
    public static async get(url: string, _token = ''): Promise<any> {
        return ApiClient.get(url);
    }

    public static async post(url: string, data: any = {}, _token = ''): Promise<any> {
        return ApiClient.post(url, data);
    }
}
