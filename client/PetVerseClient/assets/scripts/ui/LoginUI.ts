import { _decorator, Button, Component, director, Label, profiler } from 'cc';
import NetworkManager from '../network/NetworkManager';
import ApiClient from '../network/ApiClient';
import ApiConfig from '../network/ApiConfig';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('LoginUI')
export class LoginUI extends Component {
    @property(Button)
    loginButton: Button | null = null;

    @property(Label)
    statusLabel: Label | null = null;

    private loggingIn = false;

    onLoad() {
        try { profiler.hideStats(); } catch {}
        ApiClient.setBaseUrl(ApiConfig.getBaseUrl());
    }

    async onClickLogin() {
        if (this.loggingIn) return;
        this.loggingIn = true;
        if (this.loginButton) this.loginButton.interactable = false;
        this.setStatus('正在登录…');

        try {
            const payload = await this.loginPayload();
            const res = await NetworkManager.post(
                '/auth/login',
                payload,
            );

            if (!res || res.success === false) {
                this.setStatus(String(res?.message || '登录失败，请稍后重试'));
                return;
            }

            PlayerData.token = res.token || res.access_token;
            PlayerData.user = res.user;
            ApiClient.setToken(PlayerData.token);
            ApiClient.setUserId(Number(PlayerData.user?.id || 0));

            if (PlayerData.user) {
                PlayerData.user.pets = res.pets || res.user?.pets || [];
            }

            director.loadScene('MainScene');
        } catch (e) {
            console.error(e);
            this.setStatus(this.readableError(e));
        } finally {
            this.loggingIn = false;
            if (this.loginButton?.isValid) this.loginButton.interactable = true;
        }
    }

    private async loginPayload() {
        const runtime = globalThis as any;
        if (runtime.wx?.login) {
            const result = await new Promise<any>((resolve, reject) => {
                runtime.wx.login({ success: resolve, fail: reject });
            });
            const code = String(result?.code || '').trim();
            if (!code) throw new Error('微信登录凭证获取失败，请重新进入游戏');
            return { code };
        }

        const hostname = String(runtime.location?.hostname || '').toLowerCase();
        if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
            return { openid: 'wx_test_004' };
        }
        throw new Error('请在微信小游戏中打开 PetVerse');
    }

    private setStatus(message: string) {
        if (this.statusLabel?.isValid) this.statusLabel.string = message;
    }

    private readableError(error: any) {
        const message = String(error?.message || error || '登录失败，请稍后重试');
        if (/server address|api address|配置/i.test(message)) {
            return '服务器正在维护，请稍后再试';
        }
        return message.length > 36 ? '登录失败，请检查网络后重试' : message;
    }
}
