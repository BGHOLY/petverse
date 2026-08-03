import { _decorator, Component, director, profiler } from 'cc';
import NetworkManager from '../network/NetworkManager';
import ApiClient from '../network/ApiClient';
import ApiConfig from '../network/ApiConfig';
import PlayerData from '../data/PlayerData';

const { ccclass } = _decorator;

@ccclass('LoginUI')
export class LoginUI extends Component {
    onLoad() {
        try { profiler.hideStats(); } catch {}
        ApiClient.setBaseUrl(ApiConfig.getBaseUrl());
    }

    async onClickLogin() {
        console.log('点击登录');

        try {
            const res = await NetworkManager.post(
                '/auth/login',
                {
                    openid: 'wx_test_004',
                },
            );

            if (!res || res.success === false) {
                console.warn('登录失败');
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
        }
    }
}
