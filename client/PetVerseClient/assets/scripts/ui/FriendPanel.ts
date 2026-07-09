import { _decorator, Component, Label } from 'cc';
import ApiClient from '../network/ApiClient';
import { clearGenerated, getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('FriendPanel')
export class FriendPanel extends Component {
    private statusLabel: Label | null = null;
    private listLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.refreshFriendPage();
    }

    async refreshFriendPage() {
        this.ensureView();
        const result = await ApiClient.get('/friend');
        const friends = result?.friends || result?.data || [];
        console.log('[FriendPanel] friends:', friends);
        clearGenerated(this.node, 'GeneratedFriendPet');

        const lines: string[] = [];
        let buttonIndex = 0;

        for (const friend of friends) {
            lines.push(`${friend.nickname}`);
            for (const pet of friend.pets || []) {
                lines.push(`  #${pet.id} ${pet.nickname} ${pet.rarityName || pet.rarity} Lv.${pet.level}`);

                if (!pet.married && buttonIndex < 5) {
                    const y = 150 - buttonIndex * 62;
                    getOrCreateButton(
                        this.node,
                        `GeneratedFriendPet${buttonIndex}`,
                        `Marry ${pet.nickname}`,
                        170,
                        y,
                        260,
                        52,
                        () => {
                            void this.marryPet(pet.id);
                        },
                        this,
                    );
                    buttonIndex += 1;
                }
            }
        }

        this.setList(lines.join('\n'));
        this.setStatus(`Friends: ${friends.length}`);
        console.log('[FriendPanel] render result:', lines.length);
    }

    async marryPet(friendPetId: number) {
        const petResult = await ApiClient.get('/pet');
        let ownPet = (petResult?.pets || []).find((pet: any) => !pet.isEgg && !pet.married);

        if (!ownPet) {
            const created = await ApiClient.post('/pet/create', {
                nickname: 'Wedding Pet',
                species: 'Dog',
                rarity: 2,
            });
            ownPet = created?.pet;
        }

        if (!ownPet) {
            this.setStatus('No own pet available.');
            return;
        }

        const result = await ApiClient.post('/marriage/create', {
            petAId: ownPet.id,
            petBId: friendPetId,
        });
        console.log('[FriendPanel] marriage result:', result);
        this.setStatus(result?.success ? `Married pet #${ownPet.id} with #${friendPetId}` : `Marriage failed: ${result?.message || ''}`);
        await this.refreshFriendPage();
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Friends';
        this.statusLabel = getOrCreateLabel(this.node, 'FriendStatusLabel', -300, 308, 600, 34, 18);
        this.listLabel = getOrCreateLabel(this.node, 'FriendListLabel', -300, 250, 360, 560, 18);
        getOrCreateButton(this.node, 'RefreshFriendButton', 'Refresh Friends', 0, -360, 220, 56, () => {
            void this.refreshFriendPage();
        }, this);
    }

    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    }

    private setList(text: string) {
        if (this.listLabel) {
            this.listLabel.string = text || 'No friends';
        }
    }
}
