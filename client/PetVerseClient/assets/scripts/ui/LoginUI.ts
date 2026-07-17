import { _decorator, Component, director, profiler } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';

const { ccclass } = _decorator;

@ccclass('LoginUI')
export class LoginUI extends Component {
    onLoad() {
        try { profiler.hideStats(); } catch {}
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

            if (PlayerData.user) {
                PlayerData.user.pets = res.pets || res.user?.pets || [];
            }

            director.loadScene('MainScene');
        } catch (e) {
            console.error(e);
        }
    }
}
