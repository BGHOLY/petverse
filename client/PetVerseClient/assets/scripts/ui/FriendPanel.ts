import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { clearGenerated, createButton, createInfoText, createListButton, createPageTitle, createStatusLabel, normalizeList } from './UiKit';

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

        const result = await ApiClient.get('/friend');
        const friends = normalizeList(result, ['friends']);
        console.log('[FriendPanel] response:', result);

        if (result?.success === false) {
            this.setStatus(`\u52a0\u8f7d\u5931\u8d25: ${result.message || '\u672a\u77e5\u9519\u8bef'}`);
            this.setEmpty('\u6682\u65e0\u6570\u636e');
            return;
        }

        this.setStatus(this.lastMessage || `\u597d\u53cb\u6570\u91cf: ${friends.length}`);

        const petRows: any[] = [];
        for (const friend of friends) {
            const pets = normalizeList(friend, ['pets']);
            for (const pet of pets) {
                petRows.push({ friend, pet });
            }
        }

        if (!petRows.length) {
            this.setEmpty('\u6682\u65e0\u6570\u636e');
            console.log('[FriendPanel] render result: empty');
            return;
        }

        this.setEmpty('');
        petRows.slice(0, 8).forEach((row, index) => {
            const friendName = row.friend.nickname || row.friend.name || '\u597d\u53cb';
            const text =
                `${friendName} / ${row.pet.nickname || '\u5ba0\u7269'}\n` +
                `Lv.${row.pet.level ?? 1}  ${row.pet.rarityName || row.pet.rarity || '-'}   \u7ed3\u5a5a`;
            createListButton(this.node, `GeneratedFriendPet${index}`, text, index, () => {
                void this.marryPet(row.pet.id);
            }, this);
        });

        console.log('[FriendPanel] render result:', petRows.length);
    }

    async marryPet(friendPetId: number) {
        const petResult = await ApiClient.get('/pet');
        const pets = normalizeList(petResult, ['pets']);
        let ownPet = pets.find((pet: any) => !pet.isEgg && !pet.marriedPetId && !pet.married);

        if (!ownPet) {
            const created = await ApiClient.post('/pet/create', {
                nickname: 'Wedding Pet',
                species: 'Dog',
                rarity: 2,
            });
            ownPet = created?.pet;
        }

        if (!ownPet) {
            this.lastMessage = '\u7ed3\u5a5a\u5931\u8d25: \u6ca1\u6709\u53ef\u7528\u5ba0\u7269';
            this.setStatus(this.lastMessage);
            return;
        }

        const result = await ApiClient.post('/marriage/create', {
            petAId: ownPet.id,
            petBId: friendPetId,
        });
        console.log('[FriendPanel] marriage result:', result);
        this.lastMessage = result?.success
            ? '\u7ed3\u5a5a\u6210\u529f\uff0c\u53ef\u4ee5\u53bb\u5b75\u5316\u9875\u751f\u86cb'
            : `\u7ed3\u5a5a\u5931\u8d25: ${result?.message || ''}`;
        this.setStatus(this.lastMessage);
        await this.refreshFriendPage();
    }

    private ensureView() {
        createPageTitle(this.node, '\u597d\u53cb');
        this.statusLabel = createStatusLabel(this.node, 'FriendStatusLabel');
        this.emptyLabel = createInfoText(this.node, 'FriendEmptyLabel', '');
        createButton(this.node, 'RefreshFriendButton', '\u5237\u65b0\u597d\u53cb', 0, -330, 180, 52, () => {
            this.lastMessage = '';
            void this.refreshFriendPage();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setEmpty(text: string) {
        if (this.emptyLabel) {
            this.emptyLabel.string = text;
            this.emptyLabel.node.active = Boolean(text);
        }
    }
}
