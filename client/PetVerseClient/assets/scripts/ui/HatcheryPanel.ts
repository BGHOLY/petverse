import { _decorator, Component, Label } from 'cc';
import PlayerData from '../data/PlayerData';
import UIEventCenter from '../manager/UIEventCenter';
import ApiClient from '../network/ApiClient';
import { getOrCreateButton, getOrCreateLabel } from './UiKit';

const { ccclass } = _decorator;

@ccclass('HatcheryPanel')
export class HatcheryPanel extends Component {
    private eggInfoLabel: Label | null = null;

    onLoad() {
        this.ensureView();
    }

    onEnable() {
        void this.refreshEggInfo();
    }

    async refreshEggInfo() {
        this.ensureView();
        const result = await ApiClient.get('/hatchery/eggs');
        const eggs = result?.eggs || result?.data || [];
        console.log('[HatcheryPanel] eggs:', eggs);

        if (!eggs.length) {
            this.setText('No eggs yet.\nMarry a friend pet and tap Lay Egg, or use a pet egg from Inventory.');
            console.log('[HatcheryPanel] render result: empty');
            return;
        }

        const lines = eggs.slice(-8).map((egg: any) => {
            return `Egg #${egg.id}  rarity ${egg.rarityPotential}  ${egg.status}`;
        });
        this.setText(lines.join('\n'));
        console.log('[HatcheryPanel] render result:', lines);
    }

    async layEgg() {
        const result = await ApiClient.post('/marriage/lay-egg', {});
        console.log('[HatcheryPanel] lay egg result:', result);
        this.setText(result?.success ? `New egg #${result.egg?.id}` : `Lay egg failed: ${result?.message || ''}`);
        await this.refreshEggInfo();
    }

    async hatchFirstEgg() {
        const eggResult = await ApiClient.get('/hatchery/eggs');
        const eggs = eggResult?.eggs || eggResult?.data || [];
        const egg = eggs.find((item: any) => item.status === 'unhatched');

        if (!egg) {
            this.setText('No unhatched egg.');
            return;
        }

        const result = await ApiClient.post('/hatchery/hatch', { eggId: egg.id });
        console.log('[HatcheryPanel] hatch result:', result);

        if (result?.pet) {
            PlayerData.updatePet(result.pet);
            UIEventCenter.emit('USER_UPDATED');
        }

        this.setText(
            result?.success
                ? `Hatched: ${result.pet?.nickname}\nRarity ${result.pet?.rarity}\nSlots ${result.pet?.skillSlotCount}`
                : `Hatch failed: ${result?.message || ''}`,
        );
        await this.refreshEggInfo();
    }

    private ensureView() {
        getOrCreateLabel(this.node, 'TitleLabel', -300, 350, 600, 44, 30).string = 'Hatchery';
        this.eggInfoLabel = getOrCreateLabel(this.node, 'EggInfoLabel', -300, 285, 600, 500, 22);
        getOrCreateButton(this.node, 'LayEggButton', 'Lay Egg', -150, -360, 180, 56, () => {
            void this.layEgg();
        }, this);
        getOrCreateButton(this.node, 'HatchButton', 'Hatch', 150, -360, 180, 56, () => {
            void this.hatchFirstEgg();
        }, this);
    }

    private setText(text: string) {
        if (this.eggInfoLabel) {
            this.eggInfoLabel.string = text;
        }
    }
}
