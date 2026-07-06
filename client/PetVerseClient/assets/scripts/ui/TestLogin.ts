import { _decorator, Component } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';

const { ccclass } = _decorator;

@ccclass('TestLogin')
export class TestLogin extends Component {

    async start() {

        console.log('开始登录测试');

        try {

            const res = await NetworkManager.post(
                '/auth/login',
                {
                    openid: 'wx_test_004',
                },
            );

            console.log('登录结果', res);

            if (res && res.success !== false) {

                PlayerData.token =
                    res.access_token || res.token;

                PlayerData.user =
                    res.user;

                console.log(
                    'Token:',
                    PlayerData.token,
                );

                console.log(
                    'User:',
                    PlayerData.user,
                );
            }

        } catch (e) {
            console.error(e);
        }
    }
}
