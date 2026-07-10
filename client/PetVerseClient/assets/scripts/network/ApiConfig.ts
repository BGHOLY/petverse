export default class ApiConfig {
    public static LOCAL_BASE_URL = 'http://127.0.0.1:3000/api';
    public static PROD_BASE_URL = '';
    public static REQUEST_TIMEOUT_MS = 8000;

    public static getBaseUrl() {
        return this.PROD_BASE_URL || this.LOCAL_BASE_URL;
    }
}
