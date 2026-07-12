import { BlockInputEvents, Color, Node, UIOpacity, UITransform, Vec2, Vec3, tween } from 'cc';
import ApiClient from '../../network/ApiClient';
import { getPetArtPath } from '../pet/PetArtRegistry';
import {
    DESIGN_HEIGHT,
    DESIGN_WIDTH,
    CuteTheme,
    button,
    clearNode,
    formatNumber,
    image,
    panel,
    progress,
    tag,
    text,
} from '../cute/CuteUiKit';
import AudioDirector from './AudioDirector';

export type FivePetBattleOptions = {
    mode: 'pve' | 'tower' | 'boss' | 'arena' | 'guild-boss';
    title?: string;
    formationCode?: string;
    difficulty?: number;
    enemySpeciesCode?: string;
    onClose: () => void;
    onComplete?: (result: any) => void;
};

type DirectiveType = 'auto' | 'focus' | 'guard' | 'shield' | 'cleanse';
type Directive = { type: DirectiveType; targetId?: string; useUltimate?: boolean };

const FORMATION_POSITIONS: Record<string, Array<[number, number]>> = {
    dragon: [[0, 104], [-196, 26], [196, 26], [-104, -92], [104, -92]],
    turtle: [[-146, 88], [146, 88], [0, 2], [-164, -102], [164, -102]],
    crane: [[0, 108], [-174, 18], [174, 18], [-150, -100], [150, -100]],
    tiger: [[-130, 96], [130, 96], [0, 2], [-186, -96], [186, -96]],
    phoenix: [[0, 106], [-180, 24], [180, 24], [-108, -96], [108, -96]],
};

const COMMAND_META: Record<Exclude<DirectiveType, 'auto'>, { title: string; icon: string; side: 'enemy' | 'ally'; fill: Color }> = {
    focus: { title: '集火', icon: '🎯', side: 'enemy', fill: CuteTheme.peach },
    guard: { title: '守护', icon: '🛡', side: 'ally', fill: CuteTheme.sky },
    shield: { title: '套盾', icon: '🔰', side: 'ally', fill: CuteTheme.honey },
    cleanse: { title: '净化', icon: '✨', side: 'ally', fill: CuteTheme.mint },
};

export function showFivePetBattle(layer: Node, options: FivePetBattleOptions) {
    clearNode(layer);
    layer.active = true;
    if (!layer.getComponent(BlockInputEvents)) layer.addComponent(BlockInputEvents);

    let session: any = null;
    let processing = false;
    let autoMode = options.mode === 'arena';
    let timerToken = 0;
    let countdown = 8;
    let completionNotified = false;
    let closing = false;
    let promptOverride = '';
    const unitNodes = new Map<string, { node: Node; enemy: boolean; alive: boolean }>();
    const directiveTargets = new Map<DirectiveType, string>();

    panel(layer, 'BattleV101Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(24, 27, 42, 255), 0, false, CuteTheme.transparent, 0);
    const battlefield = panel(layer, 'BattleV101Field', 0, 0, 720, 1280, new Color(224, 242, 226, 255), 0, false, CuteTheme.transparent, 0);

    const close = () => {
        if (closing) return;
        closing = true;
        timerToken += 1;
        AudioDirector.playBgm('home');
        // Keep the input-blocking layer alive until the current pointer sequence
        // finishes, otherwise the release event can hit a button behind the battle.
        setTimeout(() => {
            if (!layer?.isValid) return;
            clearNode(layer);
            layer.active = false;
            options.onClose();
        }, 80);
    };

    const render = () => {
        clearNode(battlefield);
        unitNodes.clear();
        const boss = Boolean(session?.bossBattle || ['boss', 'tower', 'guild-boss'].includes(options.mode));
        panel(battlefield, 'Sky', 0, 222, 720, 840, boss ? new Color(83, 70, 112, 255) : new Color(164, 216, 236, 255), 0, false, CuteTheme.transparent, 0);
        panel(battlefield, 'Ground', 0, -392, 720, 420, boss ? new Color(77, 65, 58, 255) : new Color(180, 218, 157, 255), 0, false, CuteTheme.transparent, 0);

        const top = panel(battlefield, 'TopBar', 0, 590, 700, 82, new Color(255, 250, 232, 246), 26, false, CuteTheme.caramelSoft, 2);
        text(top, 'Title', options.title || (boss ? '首领战' : options.mode === 'arena' ? '竞技切磋' : '区域冒险'), 0, 14, 300, 36, 22, CuteTheme.caramel, 'center', true);
        text(top, 'Round', `第 ${Math.max(1, Number(session?.round || 1))} 回合`, -275, -20, 160, 30, 14, CuteTheme.caramel, 'left', true);
        text(top, 'Formation', `${session?.formationName || session?.formationCode || '阵法'}  VS  ${session?.enemyFormationName || session?.enemyFormationCode || '敌阵'}`, 0, -21, 330, 30, 13, CuteTheme.muted, 'center', true);
        button(top, 'Report', '战报', 230, 0, 76, 42, () => showBattleReport(), { fill: CuteTheme.sky, fontSize: 13, radius: 18 });
        button(top, 'Close', '退出', 310, 0, 70, 42, close, { fill: CuteTheme.paperWarm, fontSize: 13, radius: 18 });

        if (!session) {
            text(battlefield, 'Loading', '正在布置五宠阵法…', 0, 30, 560, 80, 26, CuteTheme.paper, 'center', true);
            return;
        }

        renderTeam(session.rightTeam || [], session.enemyFormationCode, true);
        renderTeam(session.leftTeam || [], session.formationCode, false);

        const info = panel(battlefield, 'RoundInfo', 0, -336, 672, 92, new Color(255, 250, 232, 238), 20, false, CuteTheme.caramelSoft, 2);
        const logs = Array.isArray(session.battleLog) ? session.battleLog.slice(-3) : [];
        text(info, 'Logs', logs.map((item: any) => `• ${String(item?.text || '').slice(0, 42)}`).join('\n') || '等待本回合战术指令', -310, 0, 620, 72, 13, CuteTheme.caramel, 'left', false);

        const command = panel(battlefield, 'CommandBar', 0, -506, 700, 244, new Color(255, 246, 224, 252), 30, true, CuteTheme.caramelSoft, 4);
        if (session.status !== 'active') {
            renderResult(command);
            return;
        }

        if (options.mode === 'arena') {
            text(command, 'ArenaRule', '竞技场为全自动战斗\n阵法等级、站位与宝宝搭配决定胜负', 0, 34, 620, 88, 21, CuteTheme.caramel, 'center', true);
            button(command, 'ArenaAuto', '全自动进行中', 0, -64, 260, 58, () => {}, { icon: '▶', selected: true, fill: CuteTheme.mint, fontSize: 16, radius: 24, disabled: true });
            return;
        }

        const prompt = promptOverride || `拖动下方指令到目标宝宝（${countdown}秒后自动）`;
        text(command, 'Prompt', prompt, 0, 91, 640, 32, 15, CuteTheme.caramel, 'center', true);
        const cd = session.cooldowns?.left || {};
        const actions: Array<[Exclude<DirectiveType, 'auto'>, number]> = [['focus', -246], ['guard', -82], ['shield', 82], ['cleanse', 246]];
        actions.forEach(([type, x]) => createDragCommand(command, type, x, 28, cd));

        const initialCd = Number(session.ultimate?.initialCooldown || 3);
        const ultimateRemaining = Math.max(Number(cd.ultimate || 0), initialCd - Number(session.round || 1));
        const ultimateReady = ultimateRemaining <= 0;
        button(command, 'Ultimate', ultimateReady ? `阵法大招 · ${session.ultimate?.name || '发动'}` : `阵法大招 · ${ultimateRemaining}回合后`, -130, -68, 330, 58, () => void send({ type: 'focus', targetId: firstAliveId(true), useUltimate: true }), {
            icon: '✦', fill: CuteTheme.lilac, fontSize: 15, radius: 24, disabled: processing || !ultimateReady,
        });
        button(command, 'Auto', autoMode ? '本场自动中' : '开启本场自动', 230, -68, 170, 58, () => {
            autoMode = true;
            promptOverride = '已开启本场自动';
            void send({ type: 'auto' });
        }, { icon: '▶', selected: autoMode, fill: CuteTheme.paperWarm, fontSize: 14, radius: 24, disabled: processing });
    };


    const showBattleReport = () => {
        battlefield.getChildByName('BattleReportOverlay')?.destroy();
        const overlay = panel(battlefield, 'BattleReportOverlay', 0, 0, 720, 1280, new Color(42, 34, 39, 145), 0, false, CuteTheme.transparent, 0);
        const sheet = panel(overlay, 'Sheet', 0, 0, 650, 960, new Color(255, 250, 232, 255), 36, true, CuteTheme.caramelSoft, 4);
        text(sheet, 'Title', '完整战报', 0, 410, 320, 48, 26, CuteTheme.caramel, 'center', true);
        const logs = Array.isArray(session?.battleLog) ? session.battleLog : [];
        const report = logs.slice(-28).map((item: any, index: number) => `${Math.max(1, logs.length - 27 + index)}. ${String(item?.text || '')}`).join('\n');
        text(sheet, 'Body', report || '暂无战斗记录', -285, 0, 570, 760, 15, CuteTheme.caramel, 'left', false);
        button(sheet, 'Close', '关闭战报', 0, -420, 180, 54, () => overlay.destroy(), { fill: CuteTheme.honey, fontSize: 16, radius: 23 });
    };

    const renderResult = (command: Node) => {
        const win = session.winnerSide === 'left';
        text(command, 'Result', win ? '胜利！' : session.winnerSide ? '挑战失败' : '战斗结束', 0, 67, 500, 58, 34, win ? CuteTheme.mintDark : CuteTheme.peachDark, 'center', true);
        const summary = session.summary || {};
        const rewards = session?.rewards || {};
        const rewardText = win && (rewards.gold || rewards.diamond || rewards.exp)
            ? `\n奖励：金币 ${formatNumber(rewards.gold || 0)}　钻石 ${formatNumber(rewards.diamond || 0)}　经验 ${formatNumber(rewards.exp || 0)}` : '';
        text(command, 'Summary', `总伤害 ${formatNumber(summary?.left?.damage || 0)}　治疗 ${formatNumber(summary?.left?.healing || 0)}　回合 ${Math.max(1, Number(session.round || 1))}${rewardText}`, 0, 5, 640, 70, 15, CuteTheme.caramel, 'center', false);
        button(command, 'CloseResult', '返回冒险', 0, -76, 220, 58, close, { icon: '↩', fill: CuteTheme.honey, fontSize: 18, radius: 25 });
        if (!completionNotified) {
            completionNotified = true;
            options.onComplete?.(session);
            void AudioDirector.playSfx(win ? 'confirm' : 'error');
        }
    };

    const renderTeam = (team: any[], formationCode: string, enemy: boolean) => {
        const positions = FORMATION_POSITIONS[String(formationCode)] || FORMATION_POSITIONS.dragon;
        team.slice(0, 5).forEach((unit: any, index: number) => {
            const [px, py] = positions[index] || [0, 0];
            const x = px;
            const y = enemy ? 335 + py * 0.67 : -82 - py * 0.67;
            const alive = unit?.alive !== false && Number(unit?.hp || 0) > 0;
            const card = panel(battlefield, `Unit_${enemy ? 'E' : 'A'}_${unit?.id}`, x, y, 130, 158, alive ? new Color(255, 250, 232, 246) : new Color(118, 118, 118, 185), 22, false, alive ? CuteTheme.caramelSoft : CuteTheme.muted, 2);
            unitNodes.set(String(unit?.id), { node: card, enemy, alive });
            image(card, 'Art', getPetArtPath(unit, 'thumb'), 0, 28, 86, 86, CuteTheme.paperWarm);
            text(card, 'Name', String(unit?.name || unit?.nickname || '宝宝').slice(0, 9), 0, -25, 118, 24, 12, CuteTheme.caramel, 'center', true);
            progress(card, 'Hp', 0, -49, 104, 11, Number(unit?.maxHp || 1) ? Number(unit?.hp || 0) / Number(unit.maxHp) : 0, CuteTheme.mintDark);
            if (Number(unit?.shield || 0) > 0) progress(card, 'Shield', 0, -62, 104, 7, Math.min(1, Number(unit.shield) / Math.max(1, Number(unit.maxHp || 1) * 0.3)), CuteTheme.sky);
            const statusText = Array.isArray(unit?.statuses) ? unit.statuses.slice(0, 3).map((s: any) => statusIcon(s?.type)).join('') : '';
            if (statusText) tag(card, 'Status', statusText, 38, 63, 58, CuteTheme.peach);
            const marks = [...directiveTargets.entries()].filter(([, id]) => id === String(unit?.id));
            if (marks.length) tag(card, 'DirectiveMark', marks.map(([type]) => COMMAND_META[type as Exclude<DirectiveType, 'auto'>]?.icon || '').join(''), -39, 63, 56, CuteTheme.honey);
            if (!alive) {
                const opacity = card.getComponent(UIOpacity) || card.addComponent(UIOpacity);
                opacity.opacity = 120;
                text(card, 'Dead', '已退场', 0, 7, 110, 34, 15, CuteTheme.white, 'center', true);
            }
        });
    };

    const createDragCommand = (parent: Node, type: Exclude<DirectiveType, 'auto'>, x: number, y: number, cd: any) => {
        const meta = COMMAND_META[type];
        const cooling = type !== 'focus' && Number(cd[type] || 0) > 0;
        const label = cooling ? `${meta.title}(${Number(cd[type] || 0)})` : meta.title;
        const node = button(parent, `Cmd_${type}`, label, x, y, 146, 62, () => {
            if (!cooling && !processing) promptOverride = `请把“${meta.title}”拖到${meta.side === 'enemy' ? '敌方' : '我方'}宝宝`;
        }, { icon: meta.icon, fill: meta.fill, fontSize: 14, radius: 24, disabled: processing || cooling });
        if (processing || cooling) return;
        const origin = node.position.clone();
        node.on(Node.EventType.TOUCH_START, () => {
            promptOverride = `拖到${meta.side === 'enemy' ? '敌方' : '我方'}存活宝宝后松手`;
            for (const entry of unitNodes.values()) {
                const valid = entry.alive && ((meta.side === 'enemy' && entry.enemy) || (meta.side === 'ally' && !entry.enemy));
                if (valid) tween(entry.node).to(0.10, { scale: new Vec3(1.07, 1.07, 1) }).start();
            }
        });
        node.on(Node.EventType.TOUCH_MOVE, (event: any) => {
            const delta = event?.getUIDelta?.() || event?.getDelta?.();
            if (delta) node.setPosition(node.position.x + Number(delta.x || 0), node.position.y + Number(delta.y || 0), node.position.z);
            const hoveredId = targetAtTouch(event, meta.side);
            for (const [id, entry] of unitNodes.entries()) {
                const valid = entry.alive && ((meta.side === 'enemy' && entry.enemy) || (meta.side === 'ally' && !entry.enemy));
                entry.node.setScale(valid ? (id === hoveredId ? new Vec3(1.14, 1.14, 1) : new Vec3(1.04, 1.04, 1)) : Vec3.ONE);
            }
        });
        node.on(Node.EventType.TOUCH_CANCEL, () => { node.setPosition(origin); render(); });
        node.on(Node.EventType.TOUCH_END, (event: any) => {
            const targetId = targetAtTouch(event, meta.side);
            node.setPosition(origin);
            if (!targetId) {
                promptOverride = `没有选中目标，请拖到${meta.side === 'enemy' ? '敌方' : '我方'}宝宝卡片`;
                render();
                void AudioDirector.playSfx('error');
                return;
            }
            directiveTargets.set(type, targetId);
            const targetName = unitName(targetId);
            promptOverride = `已指定：${meta.title} ${targetName}`;
            render();
            void AudioDirector.playSfx('confirm');
            void send({ type, targetId });
        });
    };

    const targetAtTouch = (event: any, side: 'enemy' | 'ally') => {
        const location = event?.getUILocation?.() || event?.getLocation?.();
        if (!location) return '';
        const point = new Vec2(Number(location.x || 0), Number(location.y || 0));
        for (const [id, entry] of unitNodes.entries()) {
            if (!entry.alive || (side === 'enemy') !== entry.enemy) continue;
            const transform = entry.node.getComponent(UITransform);
            if (transform?.hitTest(point)) return id;
            // The preview may report screen-scaled UI coordinates while hitTest
            // expects design coordinates. Formation cards have stable design-space
            // centers, so use that as a safe fallback for touch and mouse drags.
            const centerX = DESIGN_WIDTH / 2 + Number(entry.node.position.x || 0);
            const centerY = DESIGN_HEIGHT / 2 + Number(entry.node.position.y || 0);
            if (Math.abs(point.x - centerX) <= 78 && Math.abs(point.y - centerY) <= 94) return id;
        }
        return '';
    };

    const unitName = (id: string) => {
        const all = [...(session?.leftTeam || []), ...(session?.rightTeam || [])];
        const unit = all.find((item: any) => String(item?.id) === String(id));
        return String(unit?.name || unit?.nickname || '宝宝');
    };

    const firstAliveId = (enemy: boolean) => {
        const team = enemy ? session?.rightTeam : session?.leftTeam;
        return String((team || []).find((unit: any) => unit?.alive !== false && Number(unit?.hp || 0) > 0)?.id || '');
    };

    const animateEvents = async (events: any[]) => {
        for (const event of events.slice(0, 14)) {
            const target = unitNodes.get(String(event?.targetId || ''))?.node;
            const actor = unitNodes.get(String(event?.actorId || ''))?.node;
            if (event?.type === 'damage') {
                void AudioDirector.playSfx(event?.skillName ? 'magic' : 'attack');
                if (actor?.isValid) {
                    const direction = (target?.position.x || 0) > actor.position.x ? 18 : -18;
                    tween(actor).by(0.08, { position: new Vec3(direction, 0, 0) }).by(0.10, { position: new Vec3(-direction, 0, 0) }).start();
                }
                if (target?.isValid) tween(target).by(0.05, { position: new Vec3(7, 0, 0) }).by(0.05, { position: new Vec3(-14, 0, 0) }).by(0.05, { position: new Vec3(7, 0, 0) }).start();
            } else if (event?.type === 'heal') void AudioDirector.playSfx('heal');
            else if (/shield/.test(String(event?.type))) void AudioDirector.playSfx('shield');
            await wait(90);
        }
    };

    const send = async (directive: Directive) => {
        if (processing || session?.status !== 'active') return;
        processing = true;
        timerToken += 1;
        render();
        try {
            const result = await ApiClient.post('/battle/v10/command', { sessionId: session.id, directive });
            if (result?.success === false) {
                void AudioDirector.playSfx('error');
                session.battleLog = [...(session.battleLog || []), { text: result?.message || '指令执行失败' }];
            } else {
                session = result?.session || result?.data || session;
                await animateEvents(Array.isArray(result?.roundEvents) ? result.roundEvents : []);
            }
        } catch (error) {
            console.error('[BattleSceneV10] command failed', error);
            promptOverride = '指令发送失败，请检查后端连接';
        } finally {
            processing = false;
            countdown = 8;
            render();
            if (session?.status === 'active') scheduleAuto();
        }
    };

    const scheduleAuto = () => {
        const token = ++timerToken;
        countdown = 8;
        const tick = () => {
            if (token !== timerToken || session?.status !== 'active' || processing) return;
            countdown -= 1;
            render();
            if (autoMode || countdown <= 0) void send({ type: 'auto' });
            else setTimeout(tick, 1000);
        };
        setTimeout(tick, autoMode ? 300 : 1000);
    };

    const start = async () => {
        render();
        const boss = ['boss', 'tower', 'guild-boss'].includes(options.mode);
        await AudioDirector.playBgm(boss ? 'boss' : 'battle');
        const result = options.mode === 'arena'
            ? await ApiClient.post('/battle/v10/arena', { formationCode: options.formationCode, difficulty: options.difficulty || 1.05 })
            : await ApiClient.post('/battle/v10/start', { mode: options.mode, boss, formationCode: options.formationCode, difficulty: options.difficulty || (boss ? 1.25 : 1), enemySpeciesCode: options.enemySpeciesCode || '' });
        if (result?.success === false) {
            session = { status: 'ended', winnerSide: 'right', round: 0, battleLog: [{ text: result?.message || '战斗发起失败' }], leftTeam: [], rightTeam: [] };
            render();
            return;
        }
        session = result?.session || result?.data || result;
        render();
        if (options.mode === 'arena') {
            session.status = session.status || 'ended';
            render();
        } else scheduleAuto();
    };

    void start();
}

function statusIcon(type: string) {
    const map: Record<string, string> = { stun: '💫', freeze: '❄', dot: '🔥', slow: '🐌', healBlock: '🚫', huntMark: '🎯', taunt: '🛡' };
    return map[String(type)] || '•';
}

function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
