import { _decorator, Component } from 'cc';
import MainUI from '../ui/MainUI';

const { ccclass } = _decorator;

/**
 * 兼容旧场景和旧按钮绑定的适配器。
 * 所有页面切换统一转交给新版 MainUI，不再创建旧 PageLayer。
 */
@ccclass('PanelManager')
export class PanelManager extends Component {
    ensurePages() {}
    hideAllPages() {}
    refreshCurrentPage() { MainUI.instance?.refreshCurrentPage(); }
    showHome() { MainUI.instance?.showHome(); }
    showPet() { MainUI.instance?.showPet(); }
    showInventory() { MainUI.instance?.showInventory(); }
    showShop() { MainUI.instance?.showShop(); }
    showBreed() { MainUI.instance?.showBreed(); }
    showAdventure() { MainUI.instance?.showTower(); }
    showHatchery() { MainUI.instance?.showHatchery(); }
    showFriend() { MainUI.instance?.showFriend(); }
    showSkill() { MainUI.instance?.showSkills(); }
    showFusion() { MainUI.instance?.showFusion(); }
    showBattle() { MainUI.instance?.showTower(); }
    showTower() { MainUI.instance?.showTower(); }
    showRanking() { MainUI.instance?.showRanking(); }
    showSettings() { MainUI.instance?.showSettings(); }
}

export default PanelManager;
