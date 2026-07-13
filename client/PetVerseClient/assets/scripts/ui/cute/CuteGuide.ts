import { sys } from 'cc';

export type CuteGuideStep = {
    page: string;
    title: string;
    description: string;
    icon: string;
    focusX: number;
    focusY: number;
    focusIcon?: string;
};

const STORAGE_KEY = 'petverse.cute.guide.v1';

export class CuteGuideState {
    static readonly steps: CuteGuideStep[] = [
        {
            page: 'home',
            title: '欢迎来到萌宠手账屋',
            description: '家园是每天回来的地方。这里会展示当前宝宝形象，也能快速进入商城、福利、月卡和战令。',
            icon: '🏡',
            focusX: 105,
            focusY: 115,
            focusIcon: '🐶',
        },
        {
            page: 'pet',
            title: '查看宝宝完整档案',
            description: '宝宝页会展示生命、攻击、防御、速度、成长与资质。点击技能图标可查看完整技能说明。',
            icon: '📒',
            focusX: 135,
            focusY: 60,
            focusIcon: '📊',
        },
        {
            page: 'inventory',
            title: '整理背包与养成材料',
            description: '普通道具可以直接使用；技能书会引导到打技能页面；宠物蛋统一存放在孵化室仓库。',
            icon: '🎒',
            focusX: 0,
            focusY: 80,
            focusIcon: '🧪',
        },
        {
            page: 'adventure',
            title: '组建五宠阵法队伍',
            description: '选择五只宝宝并安排1至5号阵位，可挑战爬塔、主线、首领和好友切磋。',
            icon: '🧭',
            focusX: 0,
            focusY: 120,
            focusIcon: '⚔',
        },
        {
            page: 'hatchery',
            title: '使用单槽孵化装置',
            description: '先从孵化室仓库选择一枚蛋放入装置。孵化过程中可以使用沙漏道具减少等待时间。',
            icon: '🥚',
            focusX: 0,
            focusY: 145,
            focusIcon: '⏳',
        },
        {
            page: 'home',
            title: '留意红点与更多功能',
            description: '邮件、好友申请、结缘申请、可领取福利和孵化完成都会出现红点。点击底部“更多”即可统一查看。',
            icon: '🎀',
            focusX: 286,
            focusY: -565,
            focusIcon: '📖',
        },
    ];

    static shouldAutoStart() {
        try {
            return sys.localStorage.getItem(STORAGE_KEY) !== 'completed';
        } catch {
            return true;
        }
    }

    static markCompleted() {
        try {
            sys.localStorage.setItem(STORAGE_KEY, 'completed');
        } catch {
            // Some editor previews do not provide persistent storage.
        }
    }

    static reset() {
        try {
            sys.localStorage.setItem(STORAGE_KEY, 'pending');
        } catch {
            // Ignore storage failures.
        }
    }
}

export default CuteGuideState;
