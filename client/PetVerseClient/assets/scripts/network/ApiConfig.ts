export default class ApiConfig {
    public static LOCAL_BASE_URL = 'http://127.0.0.1:3000/api';
    public static PROD_BASE_URL = '';
    public static REQUEST_TIMEOUT_MS = 8000;

    public static getBaseUrl(editorOverride = '') {
        const runtimeUrl = this.runtimeBaseUrl();
        if (runtimeUrl) return runtimeUrl;

        const explicitUrl = this.normalize(editorOverride);
        if (explicitUrl) return explicitUrl;

        const productionUrl = this.normalize(this.PROD_BASE_URL);
        if (productionUrl) return productionUrl;

        return this.isLocalRuntime() ? this.normalize(this.LOCAL_BASE_URL) : '';
    }

    public static configurationError(editorOverride = '') {
        return this.getBaseUrl(editorOverride)
            ? ''
            : '尚未配置正式服务器地址，请设置 PETVERSE_API_BASE_URL 或微信小游戏 extConfig.apiBaseUrl';
    }

    private static runtimeBaseUrl() {
        const runtime = globalThis as any;
        const wxConfig = this.readWxConfig(runtime.wx);
        const globalConfig = runtime.PETVERSE_CONFIG?.apiBaseUrl
            || runtime.PETVERSE_API_BASE_URL;
        const queryConfig = this.isLocalRuntime()
            ? this.readLocalQueryConfig(runtime.location?.search)
            : '';
        return this.normalize(wxConfig || globalConfig || queryConfig);
    }

    private static readWxConfig(wx: any) {
        if (!wx) return '';
        try {
            const config = wx.getExtConfigSync?.() || {};
            return config.apiBaseUrl || config.petverse?.apiBaseUrl || '';
        } catch {
            return '';
        }
    }

    private static readLocalQueryConfig(search: any) {
        try {
            const match = String(search || '').match(/[?&]apiBaseUrl=([^&]+)/i);
            return match ? decodeURIComponent(match[1]) : '';
        } catch {
            return '';
        }
    }

    private static isLocalRuntime() {
        try {
            const runtime = globalThis as any;
            if (runtime.wx) return false;
            const hostname = String(runtime.location?.hostname || '').toLowerCase();
            return !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
        } catch {
            return true;
        }
    }

    private static normalize(url: any) {
        return String(url || '').trim().replace(/\/+$/, '');
    }
}
