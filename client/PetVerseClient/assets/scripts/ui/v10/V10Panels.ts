import { Color, Node } from 'cc';
import {
    CuteTheme,
    button,
    formatNumber,
    headingTag,
    panel,
    progress,
    text,
} from '../cute/CuteUiKit';

export type FormationPanelActions = {
    onSelect: (code: string) => void;
    onUpgrade: (code: string) => void;
    onBuyKnowledge: () => void;
    onBuyCore: () => void;
    onEditTeam: () => void;
    onBack: () => void;
};

const FORMATION_ICON: Record<string, string> = {
    dragon: '🐉', turtle: '🐢', crane: '🕊', tiger: '🐯', phoenix: '🔥',
};

export function renderFormationPanel(
    root: Node,
    overview: any,
    selectedCode: string,
    actions: FormationPanelActions,
) {
    const page = panel(root, 'FormationPageV10', 0, 0, 692, 920, new Color(245, 250, 229, 255), 38, true, CuteTheme.caramelSoft, 4);
    headingTag(page, 'Title', '五宠阵法', -235, 400, 150, CuteTheme.paperWarm);
    button(page, 'Back', '返回', 245, 400, 108, 44, actions.onBack, { icon: '↩', fill: CuteTheme.paperWarm, fontSize: 14, radius: 20 });
    const wallet = overview?.wallet || {};
    text(page, 'Wallet', `阵法心得 ${formatNumber(wallet.knowledge || 0)}　阵眼核心 ${formatNumber(wallet.cores || 0)}`, 0, 345, 600, 38, 17, CuteTheme.caramel, 'center', true);
    text(page, 'Rule', '阵法最高10级；升级缓慢积累，不形成竞技场碾压。', -105, 306, 390, 32, 13, CuteTheme.muted, 'left', true);
    button(page, 'EditTeam', '编辑五宠站位', 215, 306, 174, 44, actions.onEditTeam, { icon: '✎', fill: CuteTheme.mint, fontSize: 14, radius: 20 });

    const formations = Array.isArray(overview?.formations) ? overview.formations : [];
    if (!formations.length) {
        text(page, 'Empty', '阵法资料正在加载\n仍可先进入五宠站位编辑', 0, 40, 520, 110, 20, CuteTheme.muted, 'center', false);
    }
    formations.forEach((item: any, index: number) => {
        const selected = String(item?.code) === selectedCode;
        const y = 215 - index * 124;
        const card = panel(page, `Formation_${item?.code}`, 0, y, 624, 110, selected ? new Color(226, 246, 216, 255) : CuteTheme.paper, 25, false, selected ? CuteTheme.mintDark : CuteTheme.caramelSoft, selected ? 4 : 2);
        text(card, 'Icon', FORMATION_ICON[String(item?.code)] || '✦', -270, 10, 54, 54, 34, CuteTheme.caramel, 'center', true);
        text(card, 'Name', `${item?.name || item?.code}　Lv.${item?.level || 1}/10`, -228, 29, 220, 31, 17, CuteTheme.caramel, 'left', true);
        const effects = Array.isArray(item?.positionBonuses) ? item.positionBonuses : Array.isArray(item?.effects) ? item.effects : [];
        const effectSummary = effects.length
            ? effects.slice(0, 5).map((effect: any, effectIndex: number) => `${effectIndex + 1}位${typeof effect === 'string' ? effect : effect?.label || effect?.name || effect?.description || ''}`).join('　')
            : String(item?.description || item?.summary || '不同站位承担不同职责');
        text(card, 'Summary', effectSummary, -228, -10, 340, 52, 13, CuteTheme.muted, 'left', false);
        const next = item?.nextCost;
        text(card, 'Cost', next ? `下级：${next.knowledge}心得${next.cores ? `＋${next.cores}核心` : ''}` : '已满级', 110, 28, 172, 28, 13, CuteTheme.caramel, 'center', true);
        button(card, 'Select', selected ? '使用中' : '选择', 117, -18, 104, 42, () => actions.onSelect(String(item?.code || 'dragon')), { fill: selected ? CuteTheme.mint : CuteTheme.sky, selected, fontSize: 13, radius: 18 });
        button(card, 'Upgrade', Number(item?.level || 1) >= 10 ? '满级' : '升级', 240, -18, 104, 42, () => actions.onUpgrade(String(item?.code || 'dragon')), { fill: CuteTheme.honey, disabled: Number(item?.level || 1) >= 10, fontSize: 13, radius: 18 });
    });

    button(page, 'BuyKnowledge', '钻石补充30心得', -145, -383, 250, 50, actions.onBuyKnowledge, { icon: '💎', fill: CuteTheme.sky, fontSize: 14, radius: 22 });
    button(page, 'BuyCore', '每周购买1核心', 145, -383, 250, 50, actions.onBuyCore, { icon: '🔷', fill: CuteTheme.lilac, fontSize: 14, radius: 22 });
}

export type GuildPanelActions = {
    onJoin: () => void;
    onSign: () => void;
    onDonateGold: () => void;
    onDonateDiamond: () => void;
    onBoss: () => void;
    onTask: (id: number) => void;
    onExpedition: () => void;
    onClaimExpedition: (id: number) => void;
    onBack: () => void;
};

export function renderGuildPanel(root: Node, data: any, actions: GuildPanelActions) {
    const page = panel(root, 'GuildPageV10', 0, 0, 692, 920, new Color(248, 241, 226, 255), 38, true, CuteTheme.caramelSoft, 4);
    headingTag(page, 'Title', '萌宠公会', -235, 400, 150, CuteTheme.paperWarm);
    button(page, 'Back', '返回', 245, 400, 108, 44, actions.onBack, { icon: '↩', fill: CuteTheme.paperWarm, fontSize: 14, radius: 20 });
    if (!data?.joined) {
        const card = panel(page, 'JoinCard', 0, 80, 610, 580, CuteTheme.paper, 34, true, CuteTheme.caramelSoft, 3);
        text(card, 'Icon', '🏰🐾', 0, 155, 300, 100, 60, CuteTheme.caramel, 'center', true);
        text(card, 'Name', data?.recommended?.name || '萌宠探险团', 0, 55, 450, 50, 28, CuteTheme.caramel, 'center', true);
        text(card, 'Info', '公会采用异步轻量玩法，不强迫固定时间上线。\n签到、捐献、任务、协作远征与公会首领都能获得阵法资源。', 0, -35, 500, 110, 18, CuteTheme.muted, 'center', false);
        button(card, 'Join', '加入推荐公会', 0, -155, 250, 64, actions.onJoin, { icon: '🤝', fill: CuteTheme.honey, fontSize: 18, radius: 27 });
        return;
    }
    const guild = data?.guild || {};
    const member = data?.member || {};
    text(page, 'Name', `${guild.name || '公会'}　Lv.${guild.level || 1}`, 0, 348, 460, 38, 22, CuteTheme.caramel, 'center', true);
    text(page, 'Notice', guild.notice || '一起培养宝宝，轻松参与公会玩法。', 0, 310, 590, 34, 14, CuteTheme.muted, 'center', true);

    const summary = panel(page, 'Summary', 0, 218, 620, 132, new Color(237, 248, 224, 255), 26, false, CuteTheme.mintDark, 2);
    text(summary, 'Contribution', `我的贡献 ${formatNumber(member.contribution || 0)}`, -205, 30, 180, 34, 16, CuteTheme.caramel, 'center', true);
    text(summary, 'Members', `成员 ${data?.memberCount || 1}/${guild.memberLimit || 30}`, 0, 30, 180, 34, 16, CuteTheme.caramel, 'center', true);
    text(summary, 'Funds', `公会资金 ${formatNumber(guild.funds || 0)}`, 205, 30, 190, 34, 16, CuteTheme.caramel, 'center', true);
    button(summary, 'Sign', '每日签到', -190, -30, 150, 46, actions.onSign, { icon: '✓', fill: CuteTheme.honey, fontSize: 14, radius: 20 });
    button(summary, 'DonateGold', '金币捐献', 0, -30, 150, 46, actions.onDonateGold, { icon: '🪙', fill: CuteTheme.paperWarm, fontSize: 14, radius: 20 });
    button(summary, 'DonateDiamond', '钻石捐献', 190, -30, 150, 46, actions.onDonateDiamond, { icon: '💎', fill: CuteTheme.sky, fontSize: 14, radius: 20 });

    const boss = data?.boss || {};
    const bossCard = panel(page, 'Boss', 0, 42, 620, 190, new Color(255, 232, 219, 255), 28, false, CuteTheme.peachDark, 2);
    headingTag(bossCard, 'BossTitle', `公会首领 · ${boss.name || '古树巢穴守卫'}`, -168, 68, 270, CuteTheme.peach);
    text(bossCard, 'Phase', `阶段 ${boss.phase || 1}　${boss.mechanic || '护盾阶段'}`, -275, 20, 300, 30, 15, CuteTheme.caramel, 'left', true);
    progress(bossCard, 'Hp', -5, -15, 520, 18, Number(boss.hpRate || 0), CuteTheme.peachDark);
    text(bossCard, 'HpText', `${formatNumber(boss.hp || 0)}/${formatNumber(boss.maxHp || 0)}`, 0, -47, 400, 28, 13, CuteTheme.muted, 'center', true);
    text(bossCard, 'Attempts', `今日可挑战 ${boss.attemptsAvailable || 0} 次`, -215, -76, 190, 28, 14, CuteTheme.caramel, 'left', true);
    button(bossCard, 'Challenge', '五宠挑战', 205, -72, 170, 50, actions.onBoss, { icon: '⚔', fill: CuteTheme.honey, fontSize: 15, radius: 22, disabled: Number(boss.attemptsAvailable || 0) <= 0 });

    const taskCard = panel(page, 'Tasks', 0, -190, 620, 244, CuteTheme.paper, 28, false, CuteTheme.caramelSoft, 2);
    headingTag(taskCard, 'TaskTitle', '每周任务（三选二）', -182, 92, 250, CuteTheme.mint);
    const tasks = Array.isArray(data?.tasks) ? data.tasks.slice(0, 3) : [];
    tasks.forEach((task: any, index: number) => {
        const y = 42 - index * 58;
        text(taskCard, `T${index}`, `${task.title}　${task.progress}/${task.target}`, -275, y, 330, 30, 14, CuteTheme.caramel, 'left', true);
        button(taskCard, `C${index}`, task.claimed ? '已领取' : '领取', 238, y, 110, 38, () => actions.onTask(Number(task.id || 0)), { fill: task.claimed ? CuteTheme.paperWarm : CuteTheme.mint, disabled: task.claimed || Number(task.progress || 0) < Number(task.target || 1), fontSize: 13, radius: 17 });
    });

    const expedition = data?.expedition;
    const expCard = panel(page, 'Expedition', 0, -365, 620, 82, new Color(231, 241, 255, 255), 24, false, CuteTheme.sky, 2);
    text(expCard, 'Info', expedition ? `协作远征进行中　剩余 ${Math.ceil(Number(expedition.remainingSeconds || 0) / 60)} 分钟` : '协作远征：派出3～5只宝宝，离线也可完成', -275, 0, 390, 44, 14, CuteTheme.caramel, 'left', false);
    button(expCard, 'Action', expedition ? (expedition.canClaim ? '领取' : '进行中') : '开始远征', 230, 0, 130, 44, expedition ? () => actions.onClaimExpedition(Number(expedition.id || 0)) : actions.onExpedition, { fill: CuteTheme.sky, disabled: Boolean(expedition && !expedition.canClaim), fontSize: 14, radius: 20 });
}
