import {
    _decorator,
    Button,
    Component,
    EditBox,
    Label,
    Node,
    UITransform,
    Vec3,
} from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass } = _decorator;

type FriendUser = {
    id?: number;
    userId?: number;
    nickname?: string;
    openid?: string;
    gold?: number;
};

type FriendRequest = {
    id?: number;
    fromUserId?: number;
    toUserId?: number;
    status?: string;
};

@ccclass('FriendPanel')
export class FriendPanel extends Component {
    private readonly baseUrl = 'http://127.0.0.1:3000/api';

    private titleLabel: Label | null = null;
    private targetInput: EditBox | null = null;
    private statusLabel: Label | null = null;
    private friendListLabel: Label | null = null;
    private requestListLabel: Label | null = null;

    private latestRequests: FriendRequest[] = [];

    onLoad() {
        this.buildUIIfNeeded();
    }

    onEnable() {
        this.refreshFriendPage();
    }

    async refreshFriendPage() {
        this.buildUIIfNeeded();
        this.setStatus('正在加载好友数据...');

        try {
            const [friends, requests] = await Promise.all([
                this.apiGet('/friend/list'),
                this.apiGet('/friend/requests'),
            ]);

            const friendList = this.normalizeList<FriendUser>(friends);
            const requestList = this.normalizeList<FriendRequest>(requests);
            this.latestRequests = requestList;

            this.renderFriends(friendList);
            this.renderRequests(requestList);
            this.setStatus('好友数据加载完成');
        } catch (error) {
            console.error('加载好友系统失败:', error);
            this.setStatus('好友数据加载失败，请确认后端已启动');
            this.renderFriends([]);
            this.renderRequests([]);
        }
    }

    private async onClickSendRequest() {
        const text = this.targetInput?.string?.trim() || '';
        const targetUserId = Number(text);

        if (!targetUserId || Number.isNaN(targetUserId)) {
            this.setStatus('请输入正确的玩家 ID，例如：1');
            return;
        }

        try {
            const result = await this.apiPost('/friend/request', { targetUserId });
            this.setStatus(result?.message || '好友申请已发送');
            await this.refreshFriendPage();
        } catch (error) {
            console.error('发送好友申请失败:', error);
            this.setStatus('发送好友申请失败');
        }
    }

    private async onClickAcceptFirstRequest() {
        const request = this.latestRequests[0];
        if (!request?.id) {
            this.setStatus('当前没有可同意的好友申请');
            return;
        }

        try {
            const result = await this.apiPost('/friend/handle', {
                requestId: request.id,
                accept: true,
            });
            this.setStatus(result?.message || '已同意好友申请');
            await this.refreshFriendPage();
        } catch (error) {
            console.error('同意好友申请失败:', error);
            this.setStatus('同意好友申请失败');
        }
    }

    private async onClickRejectFirstRequest() {
        const request = this.latestRequests[0];
        if (!request?.id) {
            this.setStatus('当前没有可拒绝的好友申请');
            return;
        }

        try {
            const result = await this.apiPost('/friend/handle', {
                requestId: request.id,
                accept: false,
            });
            this.setStatus(result?.message || '已拒绝好友申请');
            await this.refreshFriendPage();
        } catch (error) {
            console.error('拒绝好友申请失败:', error);
            this.setStatus('拒绝好友申请失败');
        }
    }

    private buildUIIfNeeded() {
        if (this.node.getChildByName('FriendPanelAutoRoot')) {
            return;
        }

        const root = new Node('FriendPanelAutoRoot');
        root.addComponent(UITransform).setContentSize(620, 760);
        root.setPosition(new Vec3(0, 0, 0));
        this.node.addChild(root);

        this.titleLabel = this.createLabel(root, 'TitleLabel', '好友系统', 0, 310, 32, 620, 50);

        const inputNode = new Node('TargetUserIdInput');
        inputNode.addComponent(UITransform).setContentSize(260, 60);
        inputNode.setPosition(new Vec3(-120, 240, 0));
        root.addChild(inputNode);

        this.targetInput = inputNode.addComponent(EditBox);
        this.targetInput.placeholder = '输入玩家ID';
        this.targetInput.string = '';
        this.targetInput.fontSize = 24;
        this.targetInput.maxLength = 12;

        this.createButton(root, 'SendRequestButton', '发送申请', 170, 240, 180, 60, () => {
            this.onClickSendRequest();
        });

        this.statusLabel = this.createLabel(root, 'StatusLabel', '好友系统已打开', 0, 180, 22, 620, 60);

        this.friendListLabel = this.createLabel(root, 'FriendListLabel', '好友列表：加载中...', 0, 40, 24, 620, 220);
        this.requestListLabel = this.createLabel(root, 'RequestListLabel', '好友申请：加载中...', 0, -160, 24, 620, 160);

        this.createButton(root, 'RefreshButton', '刷新好友', -210, -310, 170, 60, () => {
            this.refreshFriendPage();
        });

        this.createButton(root, 'AcceptButton', '同意第一条', 0, -310, 180, 60, () => {
            this.onClickAcceptFirstRequest();
        });

        this.createButton(root, 'RejectButton', '拒绝第一条', 220, -310, 180, 60, () => {
            this.onClickRejectFirstRequest();
        });
    }

    private createLabel(
        parent: Node,
        name: string,
        text: string,
        x: number,
        y: number,
        fontSize: number,
        width: number,
        height: number,
    ): Label {
        const node = new Node(name);
        node.addComponent(UITransform).setContentSize(width, height);
        node.setPosition(new Vec3(x, y, 0));
        parent.addChild(node);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 8;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        return label;
    }

    private createButton(
        parent: Node,
        name: string,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        callback: () => void,
    ) {
        const node = new Node(name);
        node.addComponent(UITransform).setContentSize(width, height);
        node.setPosition(new Vec3(x, y, 0));
        parent.addChild(node);

        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;

        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform).setContentSize(width, height);
        node.addChild(labelNode);

        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 22;
        label.lineHeight = 28;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        button.node.on(Button.EventType.CLICK, callback, this);
    }

    private renderFriends(friends: FriendUser[]) {
        if (!this.friendListLabel) {
            return;
        }

        if (!friends.length) {
            this.friendListLabel.string = '好友列表：暂无好友';
            return;
        }

        const text = friends
            .map((friend, index) => {
                const id = friend.id ?? friend.userId ?? 0;
                const name = friend.nickname || friend.openid || '未知玩家';
                return `${index + 1}. ID:${id}  ${name}`;
            })
            .join('\n');

        this.friendListLabel.string = `好友列表：\n${text}`;
    }

    private renderRequests(requests: FriendRequest[]) {
        if (!this.requestListLabel) {
            return;
        }

        if (!requests.length) {
            this.requestListLabel.string = '好友申请：暂无待处理申请';
            return;
        }

        const text = requests
            .map((request, index) => {
                return `${index + 1}. 申请ID:${request.id}  来自玩家ID:${request.fromUserId}`;
            })
            .join('\n');

        this.requestListLabel.string = `好友申请：\n${text}`;
    }

    private setStatus(message: string) {
        if (this.statusLabel) {
            this.statusLabel.string = message;
        }
    }

    private normalizeList<T>(result: any): T[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        if (Array.isArray(result?.items)) {
            return result.items;
        }

        if (Array.isArray(result?.list)) {
            return result.list;
        }

        return [];
    }

    private async apiGet(path: string) {
        const response = await fetch(this.baseUrl + path, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        return this.parseResponse(response);
    }

    private async apiPost(path: string, body: any) {
        const response = await fetch(this.baseUrl + path, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });

        return this.parseResponse(response);
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (PlayerData.token) {
            headers.Authorization = `Bearer ${PlayerData.token}`;
        }

        return headers;
    }

    private async parseResponse(response: Response) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw data || new Error(`HTTP ${response.status}`);
        }

        return data;
    }
}
