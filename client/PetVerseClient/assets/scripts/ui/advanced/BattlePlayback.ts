import {
    BlockInputEvents,
    Color,
    Node,
    UIOpacity,
    Vec3,
    tween,
} from 'cc';
import {
    CuteTheme,
    button,
    clearNode,
    formatNumber,
    headingTag,
    panel,
    progress,
    safeName,
    tag,
    text,
} from '../cute/CuteUiKit';
import { getPetArtPath } from '../pet/PetArtRegistry';
import { createPetArtSprite } from '../pet/PetArtView';

type UnitView = {
    pet: any;
    root: Node;
    art: Node;
    hp: number;
    maxHp: number;
    side: 'left' | 'right';
    index: number;
};

export type BattlePlaybackOptions = {
    title: string;
    result: any;
    playerTeam: any[];
    onClose: () => void;
    onReplay?: () => void;
};

function arrayOf(source: any, keys: string[]) {
    for (const key of keys) {
        const value = source?.[key];
        if (Array.isArray(value)) return value;
    }
    return [];
}

function hpOf(pet: any) {
    return Math.max(1, Number(
        pet?.finalAttributes?.hp ??
        pet?.maxHp ??
        pet?.hp ??
        pet?.health ??
        100,
    ));
}

function powerOf(pet: any) {
    const hp = hpOf(pet);
    const attack = Number(pet?.finalAttributes?.attack ?? pet?.attack ?? 20);
    const magic = Number(pet?.finalAttributes?.magic ?? pet?.magic ?? pet?.intelligence ?? 20);
    const defense = Number(pet?.finalAttributes?.defense ?? pet?.defense ?? 20);
    const speed = Number(pet?.finalAttributes?.speed ?? pet?.speed ?? pet?.agility ?? 20);
    return Math.round(hp * 0.45 + attack * 4 + magic * 4 + defense * 3 + speed * 2);
}

function petName(pet: any, index: number, enemy = false) {
    return safeName(
        pet?.nickname || pet?.name || pet?.species,
        enemy ? `守关宝宝${index + 1}` : `宝宝${index + 1}`,
    );
}

function normalizeLog(line: any) {
    return String(line ?? '').replace(/^\s+/, '');
}

function damageFrom(line: string) {
    const match = line.match(/(?:造成|反弹)\s*(\d+)\s*伤害/);
    return match ? Number(match[1]) : 0;
}

function healFrom(line: string) {
    const match = line.match(/恢复\s*(\d+)\s*生命/);
    return match ? Number(match[1]) : 0;
}

function shieldFrom(line: string) {
    const match = line.match(/获得\s*(\d+)\s*护盾/);
    return match ? Number(match[1]) : 0;
}

function findMentionedUnit(line: string, units: UnitView[]) {
    return units.find((unit) => line.includes(petName(unit.pet, unit.index, unit.side === 'right')));
}

function redrawUnit(unit: UnitView, active = false) {
    const name = petName(unit.pet, unit.index, unit.side === 'right');
    progress(unit.root, 'Hp', 0, -58, 84, 11, unit.hp / unit.maxHp, CuteTheme.green);
    text(unit.root, 'HpText', `${Math.max(0, Math.round(unit.hp))}/${Math.round(unit.maxHp)}`, 0, -75, 96, 20, 9, CuteTheme.muted, 'center', true);
    const badgeText = unit.hp <= 0 ? '倒下' : active ? '行动中' : `战力${formatNumber(powerOf(unit.pet))}`;
    tag(unit.root, 'State', badgeText, 0, 76, 88, unit.hp <= 0 ? CuteTheme.peach : active ? CuteTheme.honey : CuteTheme.paperWarm);
    text(unit.root, 'Name', name, 0, -41, 100, 24, 11, CuteTheme.caramel, 'center', true);
    const opacity = unit.root.getComponent(UIOpacity) || unit.root.addComponent(UIOpacity);
    opacity.opacity = unit.hp <= 0 ? 95 : 255;
}

export function showBattlePlayback(layer: Node, options: BattlePlaybackOptions) {
    clearNode(layer);
    layer.active = true;
    if (!layer.getComponent(BlockInputEvents)) layer.addComponent(BlockInputEvents);

    const result = options.result || {};
    const playerTeam = arrayOf(result, ['playerTeam', 'pets']).length
        ? arrayOf(result, ['playerTeam', 'pets'])
        : options.playerTeam;
    const enemyTeam = arrayOf(result, ['enemyTeam', 'friendTeam', 'monsters']).length
        ? arrayOf(result, ['enemyTeam', 'friendTeam', 'monsters'])
        : result?.monster ? [result.monster] : [];
    const logs = Array.isArray(result?.battleLog) ? result.battleLog.map(normalizeLog) : [];
    const won = String(result?.result || '').toLowerCase() === 'win';

    const state = {
        closed: false,
        paused: false,
        speed: 1,
        index: 0,
        reportOpen: false,
        finished: false,
        activeLeft: 0,
        activeRight: 0,
    };

    const dim = panel(layer, 'Dim', 0, 0, 720, 1280, new Color(61, 42, 34, 205), 0, false, CuteTheme.transparent, 0);
    const stage = panel(layer, 'BattleStage', 0, 0, 700, 1230, new Color(245, 250, 232, 255), 38, true, CuteTheme.caramelSoft, 3);
    panel(stage, 'Sky', 0, 254, 660, 430, new Color(213, 238, 246, 255), 28, false, CuteTheme.white, 2);
    panel(stage, 'Ground', 0, -208, 660, 470, new Color(222, 239, 199, 255), 28, false, CuteTheme.white, 2);
    headingTag(stage, 'Title', options.title || '萌宠对战', 0, 556, 230, CuteTheme.paperWarm);
    text(stage, 'Round', '准备战斗', 0, 506, 300, 34, 19, CuteTheme.caramel, 'center', true);

    const leftUnits: UnitView[] = [];
    const rightUnits: UnitView[] = [];

    const createUnit = (pet: any, index: number, side: 'left' | 'right') => {
        const x = -240 + index * 120;
        const y = side === 'right' ? 282 : -258;
        const card = panel(stage, `${side}_${index}`, x, y, 108, 178, side === 'left' ? new Color(255, 249, 231, 248) : new Color(250, 242, 248, 248), 22, true, CuteTheme.white, 3);
        const art = createPetArtSprite(card, 'Art', getPetArtPath(pet, 'portrait'), 0, 8, 76, 76);
        const maxHp = hpOf(pet);
        const unit: UnitView = { pet, root: card, art, hp: maxHp, maxHp, side, index };
        redrawUnit(unit, index === 0);
        return unit;
    };

    playerTeam.slice(0, 5).forEach((pet: any, index: number) => leftUnits.push(createUnit(pet, index, 'left')));
    enemyTeam.slice(0, 5).forEach((pet: any, index: number) => rightUnits.push(createUnit(pet, index, 'right')));

    if (!leftUnits.length) {
        text(stage, 'NoLeft', '我方编队为空', 0, -260, 400, 60, 22, CuteTheme.peachDark, 'center', true);
    }
    if (!rightUnits.length) {
        text(stage, 'NoRight', '敌方阵容信息缺失', 0, 270, 400, 60, 22, CuteTheme.peachDark, 'center', true);
    }

    const actionCard = panel(stage, 'ActionCard', 0, 18, 620, 180, new Color(255, 252, 239, 252), 28, true, CuteTheme.caramelSoft, 2);
    headingTag(actionCard, 'ActionTitle', '战斗信息', 0, 58, 150, CuteTheme.mint);
    text(actionCard, 'ActionText', '双方宝宝正在准备……', 0, -2, 566, 84, 18, CuteTheme.caramel, 'center', true);
    text(actionCard, 'Recent', '', 0, -62, 566, 34, 13, CuteTheme.muted, 'center', false);

    const controls = panel(stage, 'Controls', 0, -526, 646, 86, new Color(255, 248, 229, 255), 24, false, CuteTheme.caramelSoft, 2);
    const pauseButton = button(controls, 'Pause', '暂停', -220, 0, 116, 50, () => {
        state.paused = !state.paused;
        text(pauseButton, 'StateText', state.paused ? '继续' : '暂停', 0, 0, 86, 30, 14, CuteTheme.caramel, 'center', true);
    }, { icon: '⏯', fill: CuteTheme.mint, fontSize: 14, radius: 21 });
    button(controls, 'Speed', '×1', -76, 0, 104, 50, () => {
        state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
        text(controls.getChildByName('Speed')!, 'Title', `×${state.speed}`, 0, -12, 70, 24, 14, CuteTheme.caramel, 'center', true);
    }, { icon: '⏩', fill: CuteTheme.sky, fontSize: 14, radius: 21 });
    button(controls, 'Report', '完整战报', 82, 0, 138, 50, () => {
        state.reportOpen = !state.reportOpen;
        reportLayer.active = state.reportOpen;
    }, { icon: '📜', fill: CuteTheme.paperWarm, fontSize: 14, radius: 21 });
    button(controls, 'Skip', '跳过动画', 238, 0, 132, 50, () => finishPlayback(), { icon: '≫', fill: CuteTheme.lilac, fontSize: 14, radius: 21 });

    const resultCard = panel(stage, 'ResultCard', 0, -410, 620, 150, won ? new Color(255, 246, 207, 255) : new Color(255, 232, 229, 255), 28, true, won ? CuteTheme.honeyDark : CuteTheme.peachDark, 3);
    resultCard.active = false;
    text(resultCard, 'Result', won ? '挑战胜利' : '挑战失败', 0, 40, 300, 46, 30, won ? CuteTheme.honeyDark : CuteTheme.peachDark, 'center', true);
    const reward = result?.reward || {};
    text(resultCard, 'Reward', reward?.gold || reward?.diamond || reward?.exp || reward?.expEach
        ? `金币 ${formatNumber(reward?.gold || 0)}　钻石 ${formatNumber(reward?.diamond || 0)}　经验 ${formatNumber(reward?.exp || reward?.expEach || 0)}`
        : '本场为切磋或训练，不消耗宝宝。', 0, -3, 530, 34, 15, CuteTheme.caramel, 'center', true);
    button(resultCard, 'Close', '返回冒险', -105, -50, 170, 48, () => close(), { icon: '↩', fill: CuteTheme.mint, fontSize: 14, radius: 21 });
    button(resultCard, 'Replay', '再战一次', 105, -50, 170, 48, () => {
        close(false);
        options.onReplay?.();
    }, { icon: '⚔', fill: CuteTheme.honey, fontSize: 14, radius: 21, disabled: !options.onReplay });

    const reportLayer = panel(layer, 'ReportLayer', 0, 0, 670, 1120, new Color(255, 252, 239, 255), 36, true, CuteTheme.caramelSoft, 4);
    reportLayer.active = false;
    headingTag(reportLayer, 'Title', '完整战报', 0, 500, 180, CuteTheme.paperWarm);
    const reportText = logs.length ? logs.map((line: string, index: number) => `${index + 1}. ${line}`).join('\n') : '服务器未返回战斗记录。';
    text(reportLayer, 'Logs', reportText, -292, 0, 584, 900, 14, CuteTheme.caramel, 'left', false);
    button(reportLayer, 'Close', '关闭战报', 0, -506, 180, 52, () => {
        state.reportOpen = false;
        reportLayer.active = false;
    }, { icon: '×', fill: CuteTheme.mint, fontSize: 15, radius: 22 });

    function activeUnit(side: 'left' | 'right') {
        const list = side === 'left' ? leftUnits : rightUnits;
        const index = side === 'left' ? state.activeLeft : state.activeRight;
        return list[Math.max(0, Math.min(list.length - 1, index))] || null;
    }

    function highlightCurrent() {
        leftUnits.forEach((unit, index) => redrawUnit(unit, index === state.activeLeft && unit.hp > 0));
        rightUnits.forEach((unit, index) => redrawUnit(unit, index === state.activeRight && unit.hp > 0));
    }

    function lunge(attacker: UnitView | null, target: UnitView | null, critical = false) {
        if (!attacker || !target || !attacker.art?.isValid || !target.root?.isValid) return;
        const direction = attacker.side === 'left' ? 1 : -1;
        tween(attacker.art)
            .to(0.11 / state.speed, { position: new Vec3(direction * 34, 12, 0), scale: new Vec3(1.08, 1.08, 1) }, { easing: 'quadOut' })
            .to(0.15 / state.speed, { position: new Vec3(0, 5, 0), scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
        tween(target.root)
            .by(0.05 / state.speed, { position: new Vec3(critical ? 9 : 5, 0, 0) })
            .by(0.05 / state.speed, { position: new Vec3(critical ? -18 : -10, 0, 0) })
            .by(0.05 / state.speed, { position: new Vec3(critical ? 9 : 5, 0, 0) })
            .start();
    }

    function applyLine(line: string) {
        text(actionCard, 'ActionText', line, 0, 0, 566, 92, /暴击|特殊|复活/.test(line) ? 21 : 18, /暴击|特殊/.test(line) ? CuteTheme.peachDark : CuteTheme.caramel, 'center', true);
        const recentStart = Math.max(0, state.index - 3);
        text(actionCard, 'Recent', logs.slice(recentStart, state.index).join('　·　'), 0, -63, 566, 32, 12, CuteTheme.muted, 'center', false);

        const round = line.match(/第\s*(\d+)\s*回合/);
        if (round) text(stage, 'Round', `第 ${round[1]} 回合`, 0, 506, 300, 34, 19, CuteTheme.caramel, 'center', true);

        const deploy = line.match(/出战：(.+?)\s+VS\s+(.+?)(?:（|$)/);
        if (deploy) {
            const li = leftUnits.findIndex((unit) => deploy[1].includes(petName(unit.pet, unit.index, false)) || petName(unit.pet, unit.index, false).includes(deploy[1]));
            const ri = rightUnits.findIndex((unit) => deploy[2].includes(petName(unit.pet, unit.index, true)) || petName(unit.pet, unit.index, true).includes(deploy[2]));
            if (li >= 0) state.activeLeft = li;
            if (ri >= 0) state.activeRight = ri;
            highlightCurrent();
            return;
        }

        const mentioned = findMentionedUnit(line, [...leftUnits, ...rightUnits]);
        const attacker = mentioned || activeUnit('left');
        const target = attacker?.side === 'left' ? activeUnit('right') : activeUnit('left');
        const damage = damageFrom(line);
        const heal = healFrom(line);
        const shield = shieldFrom(line);

        if (damage > 0 && target) {
            target.hp = Math.max(0, target.hp - damage);
            lunge(attacker, target, /暴击/.test(line));
            redrawUnit(target, true);
            text(stage, 'Float', `${/暴击/.test(line) ? '暴击 ' : ''}-${damage}`, -240 + target.index * 120, target.side === 'left' ? -145 : 165, 116, 44, /暴击/.test(line) ? 23 : 19, /暴击/.test(line) ? CuteTheme.peachDark : CuteTheme.red, 'center', true);
            if (target.hp <= 0) {
                if (target.side === 'left') state.activeLeft = Math.min(leftUnits.length - 1, state.activeLeft + 1);
                else state.activeRight = Math.min(rightUnits.length - 1, state.activeRight + 1);
            }
        } else if (heal > 0) {
            const unit = mentioned || attacker;
            if (unit) {
                unit.hp = Math.min(unit.maxHp, unit.hp + heal);
                redrawUnit(unit, true);
                tween(unit.art).to(0.15, { scale: new Vec3(1.08, 1.08, 1) }).to(0.18, { scale: Vec3.ONE }).start();
            }
        } else if (shield > 0 && mentioned) {
            tag(mentioned.root, 'Shield', `护盾 +${shield}`, 0, 62, 112, CuteTheme.sky);
        } else if (/闪避/.test(line) && mentioned) {
            tween(mentioned.art).by(0.08, { position: new Vec3(28, 0, 0) }).by(0.1, { position: new Vec3(-28, 0, 0) }).start();
        } else if (/冻结|眩晕|沉默|焚印/.test(line) && mentioned) {
            tag(mentioned.root, 'Status', /冻结/.test(line) ? '❄ 冻结' : /眩晕/.test(line) ? '💫 眩晕' : /沉默/.test(line) ? '🔇 沉默' : '🔥 焚印', 0, 61, 108, CuteTheme.lilac);
        }
        highlightCurrent();
    }

    function scheduleNext() {
        if (state.closed || state.finished || !stage.isValid) return;
        tween(stage).delay(0.72 / state.speed).call(() => {
            if (state.closed || state.finished) return;
            if (state.paused) {
                scheduleNext();
                return;
            }
            if (state.index >= logs.length) {
                finishPlayback();
                return;
            }
            const line = logs[state.index++];
            applyLine(line);
            scheduleNext();
        }).start();
    }

    function finishPlayback() {
        if (state.finished || state.closed) return;
        state.finished = true;
        state.index = logs.length;
        text(stage, 'Round', '战斗结束', 0, 506, 300, 34, 19, CuteTheme.caramel, 'center', true);
        text(actionCard, 'ActionText', won ? '我方队伍赢得了胜利！' : '本次挑战失败，调整培养后再来。', 0, 0, 566, 92, 21, won ? CuteTheme.honeyDark : CuteTheme.peachDark, 'center', true);
        resultCard.active = true;
        resultCard.setScale(new Vec3(0.9, 0.9, 1));
        tween(resultCard).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    function close(notify = true) {
        if (state.closed) return;
        state.closed = true;
        clearNode(layer);
        layer.active = false;
        if (notify) options.onClose();
    }

    dim.on(Node.EventType.TOUCH_END, () => {
        if (state.finished) close();
    });

    stage.setScale(new Vec3(0.96, 0.96, 1));
    tween(stage).to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    scheduleNext();
}
