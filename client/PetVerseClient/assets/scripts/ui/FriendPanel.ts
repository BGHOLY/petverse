import { _decorator, Component, Label } from 'cc';
import GameStore from '../data/GameStore';
import PlayerData from '../data/PlayerData';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    CREAM,
    SOFT_BG,
    TEXT_GREEN,
    clearGenerated,
    createButton,
    createInfoText,
    createLabel,
    createListButton,
    createPageBackground,
    createPanel,
    createStatusLabel,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

@ccclass('FriendPanel')
export class FriendPanel extends Component {
    private statusLabel: Label | null = null;
    private emptyLabel: Label | null = null;
    private lastMessage = '';

    onLoad() {
        this.ensureView();
    }

    async refreshFriendPage() {
        this.ensureView();
        clearGenerated(this.node, 'GeneratedFriendPet');
        this.setStatus('加载好友中...');
        this.setEmpty('加载中...');

        await Promise.all([
            GameStore.loadFriends(),
            GameStore.loadPets(),
        ]);
        const friends = PlayerData.friends || [];
        this.setStatus(this.lastMessage || `好友数量: ${friends.length}`);

        const petRows: any[] = [];
        for (const friend of friends) {
            const pets = normalizeList(friend, ['pets']);
            if (!pets.length) {
                petRows.push({ friend, pet: null });
            } else {
                pets.forEach((pet: any) => petRows.push({ friend, pet }));
            }
        }

        if (!petRows.length) {
            this.setEmpty('暂无好友数据');
            return;
        }

        this.setEmpty('');
        petRows.slice(0, 8).forEach((row, index) => {
            const friendName = row.friend.nickname || row.friend.name || `好友${index + 1}`;
            const petName = row.pet?.nickname || '暂无宠物';
            const text = `${friendName} / ${petName}\nLv.${row.pet?.level ?? '-'}  ${row.pet?.rarityName || row.pet?.rarity || '-'}   结婚`;
            createListButton(this.node, `GeneratedFriendPet${index}`, text, index, () => {
                if (row.pet?.id) void this.marryPet(row.pet.id);
                else ToastManager.show('该好友暂无可婚姻宠物');
            }, this);
        });
    }

    async marryPet(friendPetId: number) {
        const ownPet = PlayerData.pets.find((pet: any) => !pet.isEgg && !pet.marriedPetId && !pet.married);
        if (!ownPet) return ToastManager.show('没有可用于婚姻的本方宠物');

        const result = await ApiClient.post('/marriage/create', {
            petAId: ownPet.id,
            petBId: friendPetId,
        });
        this.lastMessage = result?.success ? '结婚成功，可以去孵化页产蛋' : `结婚失败: ${result?.message || ''}`;
        ToastManager.show(this.lastMessage);
        await this.refreshFriendPage();
    }

    private ensureView() {
        createPageBackground(this.node, '好友', SOFT_BG);
        createPanel(this.node, 'FriendCard', 0, 0, 640, 780, CREAM, CREAM, 28, 0);
        createLabel(this.node, 'FriendTitle', '好友宠物', -225, 360, 180, 40, 24, TEXT_GREEN);
        this.statusLabel = createStatusLabel(this.node, 'FriendStatusLabel');
        this.emptyLabel = createInfoText(this.node, 'FriendEmptyLabel', '', -280, 260, 560, 430, 18);
        createButton(this.node, 'RefreshFriendButton', '刷新好友', 0, -410, 180, 52, () => {
            this.lastMessage = '';
            return this.refreshFriendPage();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) this.statusLabel.string = text;
    }

    private setEmpty(text: string) {
        if (this.emptyLabel) {
            this.emptyLabel.string = text;
            this.emptyLabel.node.active = Boolean(text);
        }
    }
}
