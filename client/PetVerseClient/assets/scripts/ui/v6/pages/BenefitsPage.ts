import {
    Color,
    Mask,
    Node,
    ScrollView,
    UITransform,
    Vec3,
} from 'cc';

import {
    CuteTheme,
    button,
    headingTag,
    panel,
    progress,
    safeName,
    setRect,
    text,
} from '../../cute/CuteUiKit';

export type BenefitModeV6 =
    | 'sign'
    | 'newcomer'
    | 'tasks'
    | 'activities'
    | 'achievements';

export type TaskCategoryV6 = 'daily' | 'weekly';

export type BenefitsPageV6Options = {
    mode: BenefitModeV6;
    taskCategory: TaskCategoryV6;
    selectedActivityId: string;
    sign: any;
    newcomer: any;
    tasks: any;
    activities: any;
    achievements: any[];
    busy: (key: string) => boolean;
    onMode: (mode: BenefitModeV6) => void;
    onTaskCategory: (category: TaskCategoryV6) => void;
    onActivitySelect: (activityId: string) => void;
    onSign: () => void;
    onClaimNewcomer: (tier: any) => void;
    onClaimTask: (task: any) => void;
    onClaimAllTasks: (category: TaskCategoryV6) => void;
    onClaimActivityChest: (chest: any) => void;
    onClaimActivity: (activity: any, tier: any) => void;
    onClaimAchievement: (achievement: any) => void;
};

const TAB_DATA: Array<[BenefitModeV6, string, string]> = [
    ['sign', '签到', '📅'],
    ['newcomer', '萌新', '🎁'],
    ['tasks', '任务', '✅'],
    ['activities', '活动', '🎉'],
    ['achievements', '成就', '🏅'],
];

function scrollArea(
    parent: Node,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    contentHeight: number,
) {
    const view = new Node(name);
    parent.addChild(view);
    setRect(view, x, y, width, height);
    const mask = view.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;

    const content = new Node(`${name}_Content`);
    view.addChild(content);
    const transform = content.addComponent(UITransform);
    transform.setContentSize(width, Math.max(height + 2, contentHeight));
    transform.setAnchorPoint(0.5, 1);
    content.setPosition(new Vec3(0, height / 2, 0));

    const scroll = view.addComponent(ScrollView);
    scroll.content = content;
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.inertia = true;
    scroll.brake = 0.72;
    scroll.elastic = true;
    scroll.cancelInnerEvents = true;
    return content;
}

function rewardText(reward: any) {
    if (!reward || typeof reward !== 'object') return '成长奖励';
    const parts: string[] = [];
    if (Number(reward.gold || 0)) parts.push(`金币${Number(reward.gold)}`);
    if (Number(reward.diamond || 0)) parts.push(`钻石${Number(reward.diamond)}`);
    if (Number(reward.playerExp || 0)) parts.push(`经验${Number(reward.playerExp)}`);
    const itemNames: Record<string, string> = {
        apple: '苹果',
        exp_potion_small: '初级经验药水',
        exp_potion_medium: '中级经验药水',
        hatch_sandglass_small: '孵化沙漏',
        breeding_token: '繁育凭证',
        boss_core: '首领核心',
    };
    for (const [code, count] of Object.entries(reward.items || {})) {
        parts.push(`${itemNames[code] || safeName(code, '道具')}×${Number(count || 0)}`);
    }
    if (Array.isArray(reward.eggs) && reward.eggs.length) {
        parts.push(`宠物蛋×${reward.eggs.length}`);
    }
    if (Array.isArray(reward.equipment) && reward.equipment.length) {
        parts.push(`装备×${reward.equipment.length}`);
    }
    return parts.join('、') || '成长奖励';
}

function renderSign(parent: Node, options: BenefitsPageV6Options) {
    const info = options.sign || {};
    const record = info.record || {};
    const days = Array.isArray(info.days) ? info.days : [];
    headingTag(parent, 'Title', '七日签到', 0, 302, 160, CuteTheme.peach);
    text(
        parent,
        'Meta',
        `连续 ${Number(record.continuousDays || 0)} 天　累计 ${Number(record.totalDays || 0)} 天`,
        0,
        258,
        560,
        32,
        16,
        CuteTheme.caramel,
        'center',
        true,
    );
    Array.from({ length: 7 }, (_, index) => {
        const item = days[index] || {
            dayIndex: index + 1,
            reward: {},
            claimed: false,
            current: index === 0,
            locked: index > 0,
        };
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = row === 0
            ? -234 + col * 156
            : -156 + col * 156;
        const card = panel(
            parent,
            `SignDay_${index + 1}`,
            x,
            155 - row * 160,
            138,
            134,
            item.claimed
                ? new Color(220, 244, 213, 255)
                : item.current
                  ? new Color(255, 237, 190, 255)
                  : CuteTheme.paper,
            24,
            true,
            item.claimed
                ? CuteTheme.mintDark
                : item.current
                  ? CuteTheme.honeyDark
                  : CuteTheme.white,
            3,
        );
        text(card, 'Icon', item.claimed ? '✓' : item.locked ? '🔒' : '🎁', 0, 30, 70, 54, 30, CuteTheme.honeyDark, 'center', true);
        text(card, 'Day', `第${item.dayIndex || index + 1}天`, 0, -12, 110, 24, 14, CuteTheme.caramel, 'center', true);
        text(card, 'Reward', rewardText(item.reward), 0, -43, 120, 32, 11, CuteTheme.muted, 'center', true);
    });
    button(parent, 'SignButton', info.canSign ? '今日签到' : '今日已签到', 0, -210, 250, 70, options.onSign, {
        icon: info.canSign ? '🎀' : '✓',
        fill: info.canSign ? CuteTheme.honey : CuteTheme.mint,
        fontSize: 20,
        radius: 30,
        disabled: !info.canSign || options.busy('benefit:sign'),
    });
    text(parent, 'Hint', '所有日期与重置均以服务器时间为准。', 0, -286, 600, 34, 14, CuteTheme.muted, 'center', true);
}

function renderNewcomer(parent: Node, options: BenefitsPageV6Options) {
    const tiers = Array.isArray(options.newcomer?.tiers)
        ? options.newcomer.tiers
        : [];
    headingTag(parent, 'Title', '萌新成长礼', 0, 302, 190, CuteTheme.honey);
    text(parent, 'Meta', `已达成 ${tiers.filter((item: any) => item.completed).length}/${tiers.length}　可领取 ${Number(options.newcomer?.claimableCount || 0)}`, 0, 258, 560, 32, 16, CuteTheme.caramel, 'center', true);
    const content = scrollArea(parent, 'NewcomerScroll', 0, -26, 620, 520, tiers.length * 98 + 16);
    tiers.forEach((tier: any, index: number) => {
        const row = panel(content, `Tier_${tier.tierCode || index}`, 0, -46 - index * 98, 608, 84, tier.claimed ? new Color(226, 244, 220, 255) : tier.canClaim ? new Color(255, 242, 200, 255) : CuteTheme.paper, 22, false, tier.canClaim ? CuteTheme.honeyDark : CuteTheme.white, 2);
        text(row, 'Icon', tier.claimed ? '✓' : tier.completed ? '★' : '◇', -266, 0, 48, 48, 27, tier.completed ? CuteTheme.honeyDark : CuteTheme.muted, 'center', true);
        text(row, 'Title', safeName(tier.title, '成长礼包'), -222, 16, 250, 28, 16, CuteTheme.caramel, 'left', true);
        text(row, 'Desc', safeName(tier.description, ''), -222, -14, 290, 24, 12, CuteTheme.muted, 'left', true);
        text(row, 'Reward', rewardText(tier.reward), 76, 0, 170, 38, 12, CuteTheme.peachDark, 'center', true);
        button(row, 'Claim', tier.claimed ? '已领' : tier.canClaim ? '领取' : '未达成', 246, 0, 94, 44, () => options.onClaimNewcomer(tier), {
            fill: tier.claimed ? CuteTheme.mint : tier.canClaim ? CuteTheme.honey : new Color(222, 216, 202, 255),
            fontSize: 12,
            radius: 18,
            disabled: tier.claimed || !tier.canClaim || options.busy(`newcomer:${tier.tierCode}`),
        });
    });
}

function renderTasks(parent: Node, options: BenefitsPageV6Options) {
    const taskData = options.tasks || {};
    const list = Array.isArray(taskData[options.taskCategory])
        ? taskData[options.taskCategory]
        : [];
    headingTag(parent, 'Title', '每日与每周任务', 0, 302, 210, CuteTheme.mint);
    button(parent, 'DailyTab', '每日', -80, 254, 136, 48, () => options.onTaskCategory('daily'), {
        selected: options.taskCategory === 'daily',
        fill: options.taskCategory === 'daily' ? CuteTheme.honey : CuteTheme.paper,
        radius: 18,
    });
    button(parent, 'WeeklyTab', '每周', 80, 254, 136, 48, () => options.onTaskCategory('weekly'), {
        selected: options.taskCategory === 'weekly',
        fill: options.taskCategory === 'weekly' ? CuteTheme.honey : CuteTheme.paper,
        radius: 18,
    });
    if (options.taskCategory === 'daily') {
        text(parent, 'Activity', `今日活跃度 ${Number(taskData.dailyActivity || 0)}/100`, -255, 207, 260, 30, 14, CuteTheme.caramel, 'left', true);
        progress(parent, 'ActivityBar', -45, 207, 290, 16, Number(taskData.dailyActivity || 0) / 100, CuteTheme.green);
        const chests = Array.isArray(taskData.activityChests) ? taskData.activityChests : [];
        chests.forEach((chest: any, index: number) => {
            button(parent, `Chest_${chest.threshold}`, `${chest.claimed ? '✓' : '🎁'}${chest.threshold}`, 126 + index * 58, 207, 54, 38, () => options.onClaimActivityChest(chest), {
                fill: chest.canClaim ? CuteTheme.honey : chest.claimed ? CuteTheme.mint : CuteTheme.paper,
                fontSize: 11,
                radius: 16,
                disabled: !chest.canClaim || options.busy(`task-chest:${chest.threshold}`),
            });
        });
    }
    const content = scrollArea(parent, 'TaskScroll', 0, -62, 620, options.taskCategory === 'daily' ? 480 : 530, list.length * 88 + 16);
    list.forEach((task: any, index: number) => {
        const complete = Number(task.currentValue || 0) >= Number(task.targetValue || 1);
        const row = panel(content, `Task_${task.id || index}`, 0, -41 - index * 88, 608, 74, complete ? new Color(244, 246, 218, 255) : CuteTheme.paper, 20, false, task.claimed ? CuteTheme.mintDark : complete ? CuteTheme.honeyDark : CuteTheme.white, 2);
        text(row, 'Icon', task.claimed ? '✓' : complete ? '★' : '○', -266, 0, 44, 44, 25, complete ? CuteTheme.honeyDark : CuteTheme.muted, 'center', true);
        text(row, 'Title', safeName(task.title, '成长任务'), -224, 14, 245, 26, 15, CuteTheme.caramel, 'left', true);
        text(row, 'Progress', `${safeName(task.description, '')}　${Math.min(Number(task.currentValue || 0), Number(task.targetValue || 1))}/${Number(task.targetValue || 1)}`, -224, -14, 340, 24, 11, CuteTheme.muted, 'left', true);
        text(row, 'Reward', rewardText(task.reward), 94, 0, 150, 32, 11, CuteTheme.peachDark, 'center', true);
        button(row, 'Claim', task.claimed ? '已领' : complete ? '领取' : '进行中', 248, 0, 90, 42, () => options.onClaimTask(task), {
            fill: task.claimed ? CuteTheme.mint : complete ? CuteTheme.honey : new Color(222, 216, 202, 255),
            fontSize: 11,
            radius: 17,
            disabled: task.claimed || !complete || options.busy(`task:${task.id}`),
        });
    });
    button(parent, 'ClaimAll', '一键领取', 240, -346, 132, 46, () => options.onClaimAllTasks(options.taskCategory), {
        fill: Number(taskData.claimableCount || 0) > 0 ? CuteTheme.honey : new Color(222, 216, 202, 255),
        radius: 18,
        disabled: Number(taskData.claimableCount || 0) <= 0 || options.busy('task:claim-all'),
    });
}

function renderActivities(parent: Node, options: BenefitsPageV6Options) {
    const activities = Array.isArray(options.activities?.activities)
        ? options.activities.activities
        : [];
    const selected = activities.find((item: any) => item.activityId === options.selectedActivityId) || activities[0];
    headingTag(parent, 'Title', '精彩活动', 0, 302, 170, CuteTheme.peach);
    if (!activities.length) {
        text(parent, 'Empty', '暂时没有开放中的活动', 0, 40, 520, 80, 20, CuteTheme.muted, 'center', true);
        return;
    }
    activities.forEach((activity: any, index: number) => {
        button(parent, `Activity_${activity.activityId}`, safeName(activity.title, '活动'), -236 + index * 118, 252, 108, 48, () => options.onActivitySelect(activity.activityId), {
            selected: activity.activityId === selected?.activityId,
            fill: activity.activityId === selected?.activityId ? CuteTheme.honey : CuteTheme.paper,
            fontSize: 11,
            radius: 18,
        });
    });
    text(parent, 'ActivityTitle', safeName(selected?.title, '精彩活动'), -282, 200, 340, 34, 20, CuteTheme.caramel, 'left', true);
    text(parent, 'ActivityStatus', selected?.status === 'active' ? '进行中' : selected?.status === 'scheduled' ? '未开始' : '已结束', 214, 202, 120, 30, 14, selected?.status === 'active' ? CuteTheme.mintDark : CuteTheme.muted, 'center', true);
    text(parent, 'ActivityDesc', safeName(selected?.description, ''), 0, 156, 570, 54, 14, CuteTheme.muted, 'center', true);
    text(parent, 'ActivityProgress', `活动进度 ${Number(selected?.progress || 0)}`, 0, 112, 420, 30, 16, CuteTheme.caramel, 'center', true);
    const tiers = Array.isArray(selected?.rewardTiers) ? selected.rewardTiers : [];
    if (!tiers.length) {
        const multiplier = Number(selected?.bonuses?.battleGoldMultiplier || selected?.bonuses?.petExpMultiplier || 1);
        text(parent, 'Bonus', multiplier > 1 ? `当前加成 ×${multiplier.toFixed(1)}` : '活动加成已生效', 0, 20, 420, 70, 25, CuteTheme.honeyDark, 'center', true);
        text(parent, 'BonusHint', '活动加成由服务器在战斗结算时自动应用。', 0, -54, 520, 34, 14, CuteTheme.muted, 'center', true);
        return;
    }
    const content = scrollArea(parent, 'ActivityTierScroll', 0, -100, 620, 370, tiers.length * 98 + 16);
    tiers.forEach((tier: any, index: number) => {
        const row = panel(content, `Tier_${tier.tierCode || index}`, 0, -46 - index * 98, 608, 84, tier.canClaim ? new Color(255, 242, 200, 255) : CuteTheme.paper, 22, false, tier.canClaim ? CuteTheme.honeyDark : CuteTheme.white, 2);
        text(row, 'Target', `${Number(selected?.progress || 0)}/${Number(tier.target || 1)}`, -248, 0, 100, 34, 17, CuteTheme.caramel, 'center', true);
        text(row, 'Reward', rewardText(tier.reward), -126, 0, 280, 38, 13, CuteTheme.peachDark, 'left', true);
        button(row, 'Claim', tier.claimed ? '已领' : tier.canClaim ? '领取' : selected?.status === 'ended' ? '已结束' : '未达成', 242, 0, 100, 44, () => options.onClaimActivity(selected, tier), {
            fill: tier.claimed ? CuteTheme.mint : tier.canClaim ? CuteTheme.honey : new Color(222, 216, 202, 255),
            fontSize: 12,
            radius: 18,
            disabled: tier.claimed || !tier.canClaim || options.busy(`activity:${selected?.activityId}:${tier.tierCode}`),
        });
    });
}

function renderAchievements(parent: Node, options: BenefitsPageV6Options) {
    const achievements = options.achievements || [];
    headingTag(parent, 'Title', '成长成就', 0, 302, 170, CuteTheme.lilac);
    text(parent, 'Meta', `共 ${achievements.length} 项　可领取 ${achievements.filter((item) => item.completed && !item.claimed).length} 项`, 0, 258, 520, 32, 16, CuteTheme.caramel, 'center', true);
    const content = scrollArea(parent, 'AchievementScroll', 0, -35, 620, 530, achievements.length * 92 + 16);
    achievements.forEach((item, index) => {
        const complete = Boolean(item.completed);
        const row = panel(content, `Achievement_${item.id || index}`, 0, -43 - index * 92, 608, 78, complete ? new Color(248, 242, 219, 255) : CuteTheme.paper, 20, false, item.claimed ? CuteTheme.mintDark : complete ? CuteTheme.honeyDark : CuteTheme.white, 2);
        text(row, 'Icon', item.claimed ? '✓' : complete ? '★' : '◇', -266, 0, 46, 46, 27, complete ? CuteTheme.honeyDark : CuteTheme.muted, 'center', true);
        text(row, 'Title', safeName(item.title, '成长目标'), -224, 15, 250, 28, 15, CuteTheme.caramel, 'left', true);
        text(row, 'Desc', `${safeName(item.description, '')}　${Math.min(Number(item.progress || 0), Number(item.target || 1))}/${Number(item.target || 1)}`, -224, -15, 340, 26, 11, CuteTheme.muted, 'left', true);
        text(row, 'Reward', rewardText(item.reward || { [item.rewardType || 'gold']: Number(item.rewardValue || 0) }), 95, 0, 150, 34, 11, CuteTheme.peachDark, 'center', true);
        button(row, 'Claim', item.claimed ? '已领' : complete ? '领取' : '未完成', 246, 0, 94, 44, () => options.onClaimAchievement(item), {
            fill: item.claimed ? CuteTheme.mint : complete ? CuteTheme.honey : new Color(222, 216, 202, 255),
            fontSize: 12,
            radius: 18,
            disabled: item.claimed || !complete || options.busy(`achievement:${item.id}`),
        });
    });
}

export function renderBenefitsPageV6(parent: Node, options: BenefitsPageV6Options) {
    const page = panel(parent, 'BenefitPageV6', 0, -2, 672, 910, new Color(255, 248, 228, 255), 40, true, CuteTheme.caramelSoft, 4);
    TAB_DATA.forEach(([mode, title, icon], index) => {
        button(page, `BenefitTab_${mode}`, title, -252 + index * 126, 374, 116, 54, () => options.onMode(mode), {
            icon,
            selected: options.mode === mode,
            fill: options.mode === mode ? CuteTheme.honey : CuteTheme.paper,
            fontSize: 13,
            radius: 22,
        });
    });
    if (options.mode === 'sign') renderSign(page, options);
    else if (options.mode === 'newcomer') renderNewcomer(page, options);
    else if (options.mode === 'tasks') renderTasks(page, options);
    else if (options.mode === 'activities') renderActivities(page, options);
    else renderAchievements(page, options);
}
