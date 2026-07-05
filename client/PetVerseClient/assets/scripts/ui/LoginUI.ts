import { _decorator, Component, director } from 'cc';
import NetworkManager from '../network/NetworkManager';
import PlayerData from '../data/PlayerData';

const { ccclass } = _decorator;

@ccclass('LoginUI')
export class LoginUI extends Component {

    async onClickLogin() {

        console.log('点击登录');

        try {

            const res = await NetworkManager.post(
                '/auth/login',
                {
                    openid: 'wx_test_004',
                },
            );

            console.log(
                '登录成功',
                JSON.stringify(res),
            );

            PlayerData.token =
                res.token;

            PlayerData.user =
                res.user;

            director.loadScene(
                'MainScene',
            );

        } catch (e) {
            console.error(e);
        }
    }
}

