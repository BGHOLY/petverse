import {
    _decorator,
    Component,
    find,
    Label,
    Node,
    UITransform,
    Vec3,
} from 'cc';
import PlayerData from '../data/PlayerData';

const { ccclass, property } = _decorator;

type RankingItem = {
    rank?: number;
    nickname?: string;
    username?: string;
    playerName?: string;
    petName?: string;
    level?: number;
    power?: number;
    combatPower?: number;
    score?: number;
};

@ccclass('RankingPanel')
export class RankingPanel extends Component {
    @property(Label)
    titleLabel: Label | null = null;

    @property(Label)
    rankingListLabel: Label | null = null;

    @property(Label)
    emptyLabel: Label | null = null;

    private readonly baseUrl = 'http://127.0.0.1:3000/api';
    private isLoading = false;

    onLoad() {
        this.autoBindOrCreateNodes();
    }

    onEnable() {
        void this.refreshRanking();
    }

    async refreshRanking() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.autoBindOrCreateNodes();

        try {
            const result = await this.apiGet('/ranking');
            const list = this.normalizeRanking(result);

            if (!list.length) {
                this.showEmpty('暂无排行榜数据');
                return;
            }

            this.showRankingList(list, false);
        } catch (error) {
            console.warn('排行榜接口暂未接通，当前显示前端测试数据:', error);
            this.showRankingList(this.createMockRanking(), true);
        } finally {
            this.isLoading = false;
        }
    }

    private autoBindOrCreateNodes() {
        if (!this.titleLabel) {
            const node = find('TitleLabel', this.node);
            this.titleLabel = node?.getComponent(Label) || null;
        }

        if (!this.rankingListLabel) {
            const node = find('RankingListLabel', this.node);
            this.rankingListLabel = node?.getComponent(Label) || null;
        }

        if (!this.emptyLabel) {
            const node = find('EmptyLabel', this.node);
            this.emptyLabel = node?.getComponent(Label) || null;
        }

        if (!this.titleLabel) {
            this.titleLabel = this.createLabel(
                'TitleLabel',
                '排行榜',
                0,
                410,
                600,
                60,
                32,
                42,
            );
        }

        if (!this.rankingListLabel) {
            this.rankingListLabel = this.createLabel(
                'RankingListLabel',
                '',
                0,
                40,
                620,
                620,
                24,
                36,
            );
        }

        if (!this.emptyLabel) {
            this.emptyLabel = this.createLabel(
                'EmptyLabel',
                '暂无排行榜数据',
                0,
                40,
                600,
                200,
                26,
                36,
            );
        }
    }

    private createLabel(
        name: string,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        lineHeight: number,
    ): Label {
        const node = new Node(name);
        node.setPosition(new Vec3(x, y, 0));

        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = lineHeight;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        this.node.addChild(node);
        return label;
    }

    private normalizeRanking(result: any): RankingItem[] {
        if (Array.isArray(result)) {
            return result;
        }

        if (Array.isArray(result?.ranking)) {
            return result.ranking;
        }

        if (Array.isArray(result?.rankings)) {
            return result.rankings;
        }

        if (Array.isArray(result?.list)) {
            return result.list;
        }

        if (Array.isArray(result?.items)) {
            return result.items;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        return [];
    }

    private createMockRanking(): RankingItem[] {
        const user = PlayerData.user;
        const currentName = user?.nickname || user?.openid || 'test004';
        const currentPet = user?.pets?.[0];

        return [
            {
                rank: 1,
                nickname: 'test001',
                petName: 'Storm Cat',
                level: 10,
                power: 1200,
            },
            {
                rank: 2,
                nickname: 'test002',
                petName: 'Lucky Dog',
                level: 8,
                power: 980,
            },
            {
                rank: 3,
                nickname: currentName,
                petName: currentPet?.nickname || currentPet?.name || '暂无宠物',
                level: currentPet?.level ?? 1,
                power: currentPet ? 100 : 0,
            },
        ];
    }

    private showRankingList(list: RankingItem[], isMock: boolean) {
        if (this.emptyLabel) {
            this.emptyLabel.node.active = false;
        }

        if (!this.rankingListLabel) {
            return;
        }

        const lines = list.map((item, index) => {
            const rank = item.rank ?? index + 1;
            const name = item.nickname || item.username || item.playerName || '未知玩家';
            const petName = item.petName || '暂无宠物';
            const level = item.level ?? 1;
            const power = item.power ?? item.combatPower ?? item.score ?? 0;

            return (
                `第 ${rank} 名  ${name}\n` +
                `宠物：${petName}    等级：${level}    战力：${power}`
            );
        });

        const tip = isMock
            ? '当前显示测试排行榜，后续接入后端 GET /api/ranking\n\n'
            : '';

        this.rankingListLabel.string = tip + lines.join('\n\n');
        this.rankingListLabel.node.active = true;
    }

    private showEmpty(message: string) {
        if (this.rankingListLabel) {
            this.rankingListLabel.string = '';
            this.rankingListLabel.node.active = false;
        }

        if (this.emptyLabel) {
            this.emptyLabel.string = message;
            this.emptyLabel.node.active = true;
        }
    }

    private async apiGet(path: string) {
        const response = await fetch(this.baseUrl + path, {
            method: 'GET',
            headers: this.getHeaders(),
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
