import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import ApiClient from '../network/ApiClient';
import { ToastManager } from './ToastManager';
import {
    BREED_PAGE_BG,
    clearChildren,
    createButton,
    createInfoText,
    createLabel,
    createPageBackground,
    createPanel,
    ensureTransform,
    getOrCreateNode,
    normalizeList,
} from './UiKit';

const { ccclass } = _decorator;

const TXT_BREED = '\u7e41\u80b2';
const TXT_MY_PET = '\u6211\u7684\u5ba0\u7269';
const TXT_OTHER_PET = '\u5bf9\u65b9\u5ba0\u7269';
const TXT_BREED_INFO = '\u7e41\u80b2\u4fe1\u606f';
const TXT_EMPTY_PET = '\u6682\u65e0\u5ba0\u7269';

@ccclass('BreedPanel')
export class BreedPanel extends Component {
    private myPetContent: Node | null = null;
    private otherPetContent: Node | null = null;
    private infoContent: Node | null = null;
    private infoLabel: Label | null = null;
    private pets: any[] = [];
    private selectedMyIndex = 0;
    private selectedFriendIndex = 1;

    onLoad() { this.ensureView(); }

    async refreshBreedPage() {
        this.ensureView();

        const result = await ApiClient.get('/pet/my');
        this.pets = normalizeList(result, ['pets']).filter((pet: any) => !pet.isEgg);

        if (this.pets.length < 2) {
            this.selectedMyIndex = 0;
            this.selectedFriendIndex = 0;
        } else if (this.selectedFriendIndex === this.selectedMyIndex) {
            this.selectedFriendIndex = this.selectedMyIndex === 0 ? 1 : 0;
        }

        this.keepSelectionSafe();
        this.renderPetLists();
        this.renderSelectedInfo();
    }

    private ensureView() {
        createPageBackground(this.node, TXT_BREED, BREED_PAGE_BG);

        const myPanel = createPanel(this.node, 'MyPetPanel', -230, 250, 180, 480);
        createLabel(myPanel, 'MyPetTitleLabel', TXT_MY_PET, 0, 210, 150, 30, 15);
        this.myPetContent = this.ensureContent(myPanel, 'MyPetContent', 0, -20, 170, 410);

        const otherPanel = createPanel(this.node, 'FriendPetPanel', 0, 250, 180, 480);
        createLabel(otherPanel, 'FriendPetTitleLabel', TXT_OTHER_PET, 0, 210, 150, 30, 15);
        this.otherPetContent = this.ensureContent(otherPanel, 'FriendPetContent', 0, -20, 170, 410);

        const infoPanel = createPanel(this.node, 'BreedInfoPanel', 230, 250, 180, 480);
        createLabel(infoPanel, 'BreedInfoTitleLabel', TXT_BREED_INFO, 0, 210, 150, 30, 15);
        this.infoContent = this.ensureContent(infoPanel, 'BreedInfoContent', 0, -20, 165, 410);
        this.infoLabel = createInfoText(this.infoContent, 'BreedInfoText', '', -78, 190, 156, 370, 13);

        const rulePanel = createPanel(this.node, 'BreedRulePanel', 0, -320, 660, 220);
        createInfoText(
            rulePanel,
            'BreedRuleLabel',
            '\u89c4\u5219:\n1. \u9009\u62e9\u4e24\u53ea\u4e0d\u540c\u5ba0\u7269\u7ed3\u5a5a\u3002\n2. \u5df2\u5a5a\u5ba0\u7269\u4e0d\u80fd\u91cd\u590d\u7ed3\u5a5a\u3002\n3. \u7ed3\u5a5a\u540e\u53ef\u9886\u53d6\u5ba0\u7269\u86cb\u3002',
            -300,
            62,
            400,
            130,
            13,
        );

        createButton(rulePanel, 'CreateMarriageButton', '\u7ed3\u5a5a', 190, 55, 118, 46, () => {
            void this.createMarriage();
        }, this, false, 15);

        createButton(rulePanel, 'LayEggButton', '\u751f\u86cb', 190, -5, 118, 46, () => {
            void this.layEgg();
        }, this, false, 15);

        createButton(rulePanel, 'RefreshBreedButton', '\u5237\u65b0', 190, -65, 118, 46, () => {
            void this.refreshBreedPage();
        }, this, false, 15);
    }

    private ensureContent(parent: Node, name: string, x: number, y: number, width: number, height: number) {
        const node = getOrCreateNode(parent, name);
        node.setPosition(new Vec3(x, y, 0));
        ensureTransform(node, width, height);
        return node;
    }

    private renderPetLists() {
        if (!this.myPetContent || !this.otherPetContent) return;

        clearChildren(this.myPetContent);
        clearChildren(this.otherPetContent);

        if (!this.pets.length) {
            createLabel(this.myPetContent, 'MyPetEmpty', TXT_EMPTY_PET, 0, 0, 140, 45, 12);
            createLabel(this.otherPetContent, 'OtherPetEmpty', TXT_EMPTY_PET, 0, 0, 140, 45, 12);
            return;
        }

        this.pets.slice(0, 7).forEach((pet: any, index: number) => {
            const disabled = pet.married || pet.marriedPetId;
            const text = `${pet.nickname || `Pet${index + 1}`}\n${disabled ? '\u5df2\u5a5a' : '\u672a\u5a5a'}`;

            createButton(this.myPetContent!, `MyPetButton${index}`, text, 0, 168 - index * 50, 140, 42, () => {
                this.selectedMyIndex = index;
                if (this.selectedFriendIndex === index && this.pets.length > 1) this.selectedFriendIndex = index === 0 ? 1 : 0;
                this.renderPetLists();
                this.renderSelectedInfo();
            }, this, index === this.selectedMyIndex, 10);

            createButton(this.otherPetContent!, `FriendPetButton${index}`, text, 0, 168 - index * 50, 140, 42, () => {
                this.selectedFriendIndex = index;
                if (this.selectedMyIndex === index && this.pets.length > 1) this.selectedMyIndex = index === 0 ? 1 : 0;
                this.renderPetLists();
                this.renderSelectedInfo();
            }, this, index === this.selectedFriendIndex, 10);
        });
    }

    private renderSelectedInfo() {
        const myPet = this.pets[this.selectedMyIndex];
        const friendPet = this.pets[this.selectedFriendIndex];

        if (!this.infoLabel) return;

        if (!myPet || !friendPet) {
            this.infoLabel.string = '\u8bf7\u9009\u62e9\u53cc\u65b9\u5ba0\u7269';
            return;
        }

        this.infoLabel.string = [
            `\u6211\u65b9:${myPet.nickname || '-'}`,
            `\u7a00\u6709:${myPet.rarityName || myPet.rarity || '-'}`,
            `\u72b6\u6001:${myPet.married || myPet.marriedPetId ? '\u5df2\u5a5a' : '\u672a\u5a5a'}`,
            '',
            `\u5bf9\u65b9:${friendPet.nickname || '-'}`,
            `\u7a00\u6709:${friendPet.rarityName || friendPet.rarity || '-'}`,
            `\u72b6\u6001:${friendPet.married || friendPet.marriedPetId ? '\u5df2\u5a5a' : '\u672a\u5a5a'}`,
        ].join('\n');
    }

    private async createMarriage() {
        const myPet = this.pets[this.selectedMyIndex];
        const friendPet = this.pets[this.selectedFriendIndex];

        if (!myPet || !friendPet || myPet.id === friendPet.id) {
            return ToastManager.show('\u8bf7\u9009\u62e9\u4e24\u53ea\u4e0d\u540c\u5ba0\u7269');
        }

        if (myPet.married || friendPet.married || myPet.marriedPetId || friendPet.marriedPetId) {
            return ToastManager.show('\u5df2\u6709\u5ba0\u7269\u7ed3\u5a5a\uff0c\u4e0d\u80fd\u91cd\u590d\u7ed3\u5a5a');
        }

        const result = await ApiClient.post('/marriage/create', { petAId: myPet.id, petBId: friendPet.id });
        ToastManager.show(result?.success
            ? '\u7ed3\u5a5a\u6210\u529f\uff0c\u53ef\u751f\u86cb'
            : `\u7ed3\u5a5a\u5931\u8d25:${result?.message || '\u672a\u77e5\u9519\u8bef'}`);
        await this.refreshBreedPage();
    }

    private async layEgg() {
        const myPet = this.pets[this.selectedMyIndex];
        const result = await ApiClient.post('/marriage/lay-egg', { petId: myPet?.id });
        ToastManager.show(result?.success
            ? '\u5df2\u83b7\u5f97\u5ba0\u7269\u86cb'
            : `\u751f\u86cb\u5931\u8d25:${result?.message || '\u6682\u65e0\u5a5a\u59fb'}`);
    }

    private keepSelectionSafe() {
        if (this.selectedMyIndex >= this.pets.length) this.selectedMyIndex = Math.max(0, this.pets.length - 1);
        if (this.selectedFriendIndex >= this.pets.length) this.selectedFriendIndex = Math.max(0, this.pets.length - 1);
        if (this.selectedMyIndex < 0) this.selectedMyIndex = 0;
        if (this.selectedFriendIndex < 0) this.selectedFriendIndex = 0;
    }
}
