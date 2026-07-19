import { BlockInputEvents, Color, Node, UIOpacity, UITransform, Vec2, Vec3, tween } from 'cc';
import ApiClient from '../../network/ApiClient';
import { getPetArtPath } from '../pet/PetArtRegistry';
import { cleanPetDisplayName } from '../pet/PetNameFormatter';
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

const MAX_VISIBLE_STATUSES = 3;

export type FivePetBattleOptions = {
    mode: 'pve' | 'tower' | 'boss' | 'arena' | 'guild-boss';
    title?: string;
    formationCode?: string;
    difficulty?: number;
    enemySpeciesCode?: string;
    chapterCode?: string;
    regionCode?: string;
    stageCode?: string;
    onClose: () => void;
    onComplete?: (result: any) => void;
    onSettle?: (session: any) => Promise<any>;
    onNext?: (result: any) => void;
};

type DirectiveType = 'auto' | 'focus' | 'guard' | 'shield' | 'cleanse';
type Directive = { type: DirectiveType; targetId?: string; useUltimate?: boolean; requestId?: string };

const DEFAULT_FORMATION_POSITIONS: Array<[number, number]> = [[0, 104], [-196, 26], [196, 26], [-104, -92], [104, -92]];

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
    let settlementProcessing = false;
    let settlementDone = false;
    let closing = false;
    let promptOverride = '';
    let armedDirective: Exclude<DirectiveType, 'auto'> | null = null;
    const unitNodes = new Map<string, { node: Node; enemy: boolean; alive: boolean }>();
    const directiveTargets = new Map<DirectiveType, string>();

    panel(layer, 'BattleV101Dim', 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, new Color(24, 27, 42, 255), 0, false, CuteTheme.transparent, 0);
    const battlefield = panel(layer, 'BattleV101Field', 0, 0, 720, 1280, new Color(224, 242, 226, 255), 0, false, CuteTheme.transparent, 0);

    const close = () => {
        if (closing) return;
        closing = true;
        timerToken += 1;
        if (settlementDone && !completionNotified) {
            completionNotified = true;
            options.onComplete?.(session);
        }
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
        const boss = Boolean(session?.bossBattle || ['boss', 'tower', 'guild-boss'].indexOf(options.mode) >= 0);
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
        const timeline=Array.from({length:Math.min(8,Math.max(1,Number(session?.round||1)))},(_,index)=>index===Math.min(7,Number(session?.round||1)-1)?'●':'○').join(' ');
        text(info,'Timeline',`回合轨迹 ${timeline}`, -310,28,620,24,12,CuteTheme.muted,'left',true);
        const order=(Array.isArray(session?.actionOrder)?session.actionOrder:[]).slice(0,6).map((item:any)=>String(item?.name||'')).filter(Boolean).join(' → ');
        text(info, 'Logs', `${order?`行动：${order}\n`:''}${logs.map((item: any) => `• ${String(item?.text || '').slice(0, 42)}`).join('\n') || '等待本回合战术指令'}`, -310, -13, 620, 58, 11, CuteTheme.caramel, 'left', false);

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

        const prompt = promptOverride || `先点指令，再拖动浮动箭头到目标宝宝（${countdown}秒后自动）`;
        text(command, 'Prompt', prompt, 0, 91, 640, 32, 15, CuteTheme.caramel, 'center', true);
        const cd = session.cooldowns?.left || {};
        const actions: Array<[Exclude<DirectiveType, 'auto'>, number]> = [['focus', -246], ['guard', -82], ['shield', 82], ['cleanse', 246]];
        actions.forEach(([type, x]) => createDragCommand(command, type, x, 28, cd));
        if(armedDirective)createDirectiveArrow(armedDirective);

        const initialCd = Number(session.ultimate?.initialCooldown || 3);
        const ultimateRemaining = Math.max(Number(cd.ultimate || 0), initialCd - Number(session.round || 1));
        const energyCost=Number(session?.commands?.ultimate?.energyCost||session?.ultimate?.energyCost||cd.formationEnergyCost||100);
        const energy=Number(session?.commands?.ultimate?.energy||cd.formationEnergy||0);
        const ultimateReady = ultimateRemaining <= 0&&energy>=energyCost;
        progress(command,'FormationEnergy',-115,-18,250,10,energy/Math.max(1,energyCost),CuteTheme.lilac);
        text(command,'EnergyText',`阵法能量 ${energy}/${energyCost}`,95,-18,180,22,11,CuteTheme.muted,'left',true);
        button(command, 'Ultimate', ultimateReady ? `阵法大招 · ${session.ultimate?.name || '发动'}` : energy<energyCost?`阵法大招 · 能量不足`:`阵法大招 · ${ultimateRemaining}回合后`, -130, -73, 330, 54, () => void send({ type: 'focus', targetId: firstAliveId(true), useUltimate: true }), {
            icon: '✦', fill: CuteTheme.lilac, fontSize: 15, radius: 24, disabled: processing || !ultimateReady,
        });
        button(command, 'Auto', autoMode ? '关闭自动' : '开启自动', 230, -73, 170, 54, () => {
            autoMode = !autoMode;
            armedDirective = null;
            promptOverride = autoMode?'已开启本场自动':'已关闭自动，可继续手动选择指令';
            if(autoMode)void send({ type: 'auto' });else { timerToken+=1; render(); scheduleAuto(); }
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
        text(command, 'Result', settlementProcessing ? '正在结算…' : win ? '胜利！' : session.winnerSide ? '挑战失败' : '战斗结束', 0, 78, 500, 48, 30, win ? CuteTheme.mintDark : CuteTheme.peachDark, 'center', true);
        const summary = session.summary || {};
        const settlement=session?.settlement||{};
        const rewards = settlement?.reward || session?.rewards || {};
        const itemCount=Object.values(rewards?.items||{}).reduce((sum:number,value:any)=>sum+Number(value||0),0);
        const rewardText = win && settlementDone
            ? `奖励 金币${formatNumber(rewards.gold || 0)} · 玩家经验${formatNumber(rewards.playerExp || 0)} · 宠物经验${formatNumber(rewards.petExp || 0)}${itemCount?` · 材料${itemCount}`:''}`
            : (!win&&settlementDone?`失败原因：${String(settlement?.failureReason||'请调整阵容与阵法')}`:'等待服务端确认奖励');
        const exploration=settlement?.exploration;
        text(command, 'Summary', `总伤害 ${formatNumber(summary?.left?.damage || settlement?.statistics?.totalDamage || 0)}　治疗 ${formatNumber(summary?.left?.healing || settlement?.statistics?.totalHealing || 0)}　承伤 ${formatNumber(summary?.left?.taken || settlement?.statistics?.damageTaken || 0)}　回合 ${Math.max(1, Number(session.round || 1))}\n${rewardText}${exploration?`\n探索度 ${Number(exploration.value||0)}%${exploration.nestUnlocked?' · 首领巢穴已解锁':''}`:''}`, 0, 8, 660, 86, 13, CuteTheme.caramel, 'center', false);
        const three=win&&Boolean(options.onNext);
        button(command, 'CloseResult', '返回冒险', three?-218:-120, -82, three?150:190, 52, close, { icon: '↩', fill: CuteTheme.honey, fontSize: 15, radius: 23, disabled:settlementProcessing });
        button(command, 'Replay', '再次挑战', three?0:120, -82, three?150:190, 52, () => restartBattle(), { icon: '⚔', fill: CuteTheme.mint, fontSize: 15, radius: 23, disabled:settlementProcessing });
        if(three)button(command,'Next','下一关',218,-82,150,52,()=>{options.onNext?.(session);close();},{icon:'➜',fill:CuteTheme.sky,fontSize:15,radius:23,disabled:settlementProcessing});
        if (settlementDone) void AudioDirector.playSfx(win ? 'confirm' : 'error');
    };

    const renderTeam = (team: any[], formationCode: string, enemy: boolean) => {
        const formation=enemy?session?.enemyFormation:session?.formation;
        const configured=Array.isArray(formation?.positions)?formation.positions:Array.isArray(formation?.slots)?formation.slots:[];
        const positions:Array<[number,number]>=configured.length===5
            ? configured.map((slot:any)=>[Number(slot?.x||0)*1.25,Number(slot?.y||0)*0.68] as [number,number])
            : DEFAULT_FORMATION_POSITIONS;
        team.slice(0, 5).forEach((unit: any, index: number) => {
            const [px, py] = positions[index] || [0, 0];
            const x = px;
            const y = enemy ? 335 + py * 0.67 : -82 - py * 0.67;
            const alive = unit?.alive !== false && Number(unit?.hp || 0) > 0;
            const card = panel(battlefield, `Unit_${enemy ? 'E' : 'A'}_${unit?.id}`, x, y, 130, 158, alive ? new Color(255, 250, 232, 246) : new Color(118, 118, 118, 185), 22, false, alive ? CuteTheme.caramelSoft : CuteTheme.muted, 2);
            unitNodes.set(String(unit?.id), { node: card, enemy, alive });
            image(card, 'Art', getPetArtPath(unit, 'thumb'), 0, 28, 86, 86, CuteTheme.paperWarm);
            text(card, 'Name', cleanPetDisplayName(unit,'宝宝',9), 0, -25, 118, 24, 12, CuteTheme.caramel, 'center', true);
            progress(card, 'Hp', 0, -49, 104, 11, Number(unit?.maxHp || 1) ? Number(unit?.hp || 0) / Number(unit.maxHp) : 0, CuteTheme.mintDark);
            text(card,'HpText',`${formatNumber(unit?.hp||0)}/${formatNumber(unit?.maxHp||1)}`,0,-49,100,18,8,CuteTheme.white,'center',true);
            if (Number(unit?.shield || 0) > 0){ progress(card, 'Shield', 0, -62, 104, 7, Math.min(1, Number(unit.shield) / Math.max(1, Number(unit.maxHp || 1) * 0.3)), CuteTheme.sky); text(card,'ShieldText',`盾${formatNumber(unit.shield)}`,0,-68,100,16,8,CuteTheme.sky,'center',true); }
            const statusText = Array.isArray(unit?.statuses) ? unit.statuses.slice(0, MAX_VISIBLE_STATUSES).map((s: any) => statusIcon(s?.type)).join('') : '';
            if (statusText) tag(card, 'Status', statusText, 38, 63, 58, CuteTheme.peach);
            const marks = [...directiveTargets.entries()].filter(([, id]) => id === String(unit?.id));
            if (marks.length) tag(card, 'DirectiveMark', marks.map(([type]) => COMMAND_META[type as Exclude<DirectiveType, 'auto'>]?.icon || '').join(''), -39, 63, 56, CuteTheme.honey);
            const focused=String((enemy?session?.cooldowns?.left:session?.cooldowns?.right)?.focusTargetId||'')===String(unit?.id);
            if(focused)tag(card,'FocusMark','🎯 集火',-34,62,66,CuteTheme.peach);
            const chooseTarget=()=>{
                const type=armedDirective;
                if(!type||!alive)return;
                const meta=COMMAND_META[type];
                if((meta.side==='enemy')!==enemy)return;
                commitDirectiveTarget(type,String(unit?.id));
            };
            card.on(Node.EventType.TOUCH_END,chooseTarget);
            card.on(Node.EventType.MOUSE_UP,chooseTarget);
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
        const hasTarget=type!=='cleanse'||(session?.leftTeam||[]).some((unit:any)=>unit?.alive!==false&&(unit?.statuses||[]).some((status:any)=>['stun','freeze','dot','healBlock','slow'].indexOf(String(status?.type))>=0));
        const label = cooling ? `${meta.title}(${Number(cd[type] || 0)})` : !hasTarget?`${meta.title}(无目标)`:meta.title;
        const node = button(parent, `Cmd_${type}`, label, x, y, 146, 62, () => {
            if(cooling||processing||!hasTarget)return;
            armedDirective=armedDirective===type?null:type;
            promptOverride=armedDirective
                ? `已选择“${meta.title}”：拖动中间箭头，或直接点击${meta.side==='enemy'?'敌方':'我方'}宝宝`
                : '已取消目标选择';
            void AudioDirector.playSfx('click_1');
            render();
        }, { icon: meta.icon, fill: meta.fill, selected: armedDirective===type, fontSize: 14, radius: 24, disabled: processing || cooling || !hasTarget });
        return node;
    };

    const createDirectiveArrow = (type: Exclude<DirectiveType, 'auto'>) => {
        const meta=COMMAND_META[type];
        const arrow=panel(battlefield,'DirectiveArrow',0,-258,168,54,new Color(meta.fill.r,meta.fill.g,meta.fill.b,250),24,true,CuteTheme.white,4);
        text(arrow,'Label',`${meta.icon} ${meta.title}　➜`,0,0,150,38,17,CuteTheme.caramel,'center',true);
        const origin=arrow.position.clone();
        let dragging=false;
        const showTargets=(hoveredId='')=>{
            for(const [id,entry] of unitNodes.entries()){
                const valid=entry.alive&&((meta.side==='enemy'&&entry.enemy)||(meta.side==='ally'&&!entry.enemy));
                entry.node.setScale(valid?(id===hoveredId?new Vec3(1.16,1.16,1):new Vec3(1.06,1.06,1)):Vec3.ONE);
            }
        };
        const move=(event:any)=>{
            if(!dragging)return;
            const delta=event?.getUIDelta?.()||event?.getDelta?.();
            if(delta)arrow.setPosition(arrow.position.x+Number(delta.x||0),arrow.position.y+Number(delta.y||0),arrow.position.z);
            showTargets(targetAtTouch(event,meta.side));
        };
        const finish=(event:any)=>{
            if(!dragging)return;
            dragging=false;
            const targetId=targetAtTouch(event,meta.side);
            arrow.setPosition(origin);
            resetTargetScales();
            if(!targetId){
                promptOverride=`箭头没有落在目标上，请重试或直接点击${meta.side==='enemy'?'敌方':'我方'}宝宝`;
                void AudioDirector.playSfx('error');
                render();
                return;
            }
            commitDirectiveTarget(type,targetId);
        };
        const begin=()=>{dragging=true;showTargets();};
        const cancel=()=>{dragging=false;arrow.setPosition(origin);resetTargetScales();promptOverride=`“${meta.title}”仍已选中，请重新拖动箭头`;render();};
        arrow.on(Node.EventType.TOUCH_START,begin);
        arrow.on(Node.EventType.TOUCH_MOVE,move);
        arrow.on(Node.EventType.TOUCH_END,finish);
        arrow.on(Node.EventType.TOUCH_CANCEL,cancel);
        arrow.on(Node.EventType.MOUSE_DOWN,begin);
        arrow.on(Node.EventType.MOUSE_MOVE,move);
        arrow.on(Node.EventType.MOUSE_UP,finish);
        showTargets();
    };

    const resetTargetScales=()=>{
        for(const entry of unitNodes.values())if(entry.node?.isValid)entry.node.setScale(Vec3.ONE);
    };

    const commitDirectiveTarget=(type:Exclude<DirectiveType,'auto'>,targetId:string)=>{
        if(!targetId||processing)return;
        const meta=COMMAND_META[type];
        directiveTargets.set(type,targetId);
        armedDirective=null;
        resetTargetScales();
        promptOverride=`已指定：${meta.title} ${unitName(targetId)}`;
        void AudioDirector.playSfx('confirm');
        void send({type,targetId});
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
        return cleanPetDisplayName(unit,'宝宝',10);
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
            else if (event?.type === 'ultimate') {
                void AudioDirector.playSfx('magic');
                tween(battlefield).to(0.08,{scale:new Vec3(1.02,1.02,1)}).to(0.14,{scale:Vec3.ONE}).start();
            }
            if(target?.isValid&&['damage','heal','shield','shield-absorb','command-shield','command-cleanse'].includes(String(event?.type))){
                const isHeal=event?.type==='heal';
                const isShield=/shield/.test(String(event?.type));
                const label=event?.type==='command-cleanse'?'净化':`${isHeal?'+':isShield?'护盾 ':'-'}${formatNumber(event?.value||0)}${event?.critical?' 暴击':''}`;
                const floating=text(target,`Float_${Date.now()}_${Math.random()}`,label,0,76,118,30,event?.critical?18:15,isHeal?CuteTheme.mintDark:isShield?CuteTheme.sky:CuteTheme.peachDark,'center',true);
                tween(floating.node).by(0.45,{position:new Vec3(0,34,0)}).call(()=>floating?.node?.isValid&&floating.node.destroy()).start();
            }
            await wait(90);
        }
    };

    const settleCurrent = async () => {
        if(settlementDone||settlementProcessing||!session||session.status==='active')return;
        settlementProcessing=true;
        render();
        try{
            const result=options.onSettle
                ? await options.onSettle(session)
                : await ApiClient.post('/battle/v10/settle',{sessionId:Number(session.id||0),battleId:String(session.battleId||''),settlementKey:`client:${session.battleId||session.id}`});
            if(result?.success===false){
                session.battleLog=[...(session.battleLog||[]),{type:'settlement-error',text:result?.message||'结算失败'}];
            }else{
                const next=result?.session||result?.data||session;
                session={...session,...next,settlement:result?.settlement||next?.settlement||session?.settlement||{},rewards:result?.settlement?.reward||next?.rewards||session?.rewards||{}};
                settlementDone=true;
            }
        }catch(error){
            console.error('[BattleSceneV10] settlement failed',error);
            session.battleLog=[...(session.battleLog||[]),{type:'settlement-error',text:'结算请求失败，请稍后重试'}];
        }finally{
            settlementProcessing=false;
            render();
        }
    };

    const send = async (directive: Directive) => {
        if (processing || session?.status !== 'active') return;
        processing = true;
        timerToken += 1;
        render();
        try {
            const requestId=`${session?.battleId||session?.id}:${Number(session?.round||0)}:${Date.now()}`;
            const result = await ApiClient.post('/battle/v10/command', { sessionId: session.id, directive:{...directive,requestId} });
            if (result?.success === false) {
                void AudioDirector.playSfx('error');
                session.battleLog = [...(session.battleLog || []), { text: result?.message || '指令执行失败' }];
            } else {
                session = result?.session || result?.data || session;
                await animateEvents(Array.isArray(result?.roundEvents) ? result.roundEvents : []);
                if(session?.status!=='active')await settleCurrent();
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
            if(armedDirective){
                if(countdown<=0){armedDirective=null;void send({type:'auto'});}
                else setTimeout(tick,1000);
                return;
            }
            render();
            if (autoMode || countdown <= 0) void send({ type: 'auto' });
            else setTimeout(tick, 1000);
        };
        setTimeout(tick, autoMode ? 300 : 1000);
    };

    const restartBattle=()=>{
        timerToken+=1;
        session=null;
        processing=false;
        autoMode=options.mode==='arena';
        countdown=8;
        completionNotified=false;
        settlementProcessing=false;
        settlementDone=false;
        promptOverride='';
        armedDirective=null;
        directiveTargets.clear();
        render();
        void start();
    };

    const start = async () => {
        render();
        const boss = ['boss', 'tower', 'guild-boss'].indexOf(options.mode) >= 0;
        await AudioDirector.playBgm(boss ? 'boss' : 'battle');
        const result = options.mode === 'arena'
            ? await ApiClient.post('/battle/v10/arena', { formationCode: options.formationCode, difficulty: options.difficulty || 1.05 })
            : await ApiClient.post('/battle/v10/start', { mode: options.mode, boss, formationCode: options.formationCode, difficulty: options.difficulty || (boss ? 1.25 : 1), enemySpeciesCode: options.enemySpeciesCode || '', chapterCode:options.chapterCode||'', regionCode:options.regionCode||'', stageCode:options.stageCode||'' });
        if (result?.success === false) {
            session = { status: 'ended', winnerSide: 'right', round: 0, battleLog: [{ text: result?.message || '战斗发起失败' }], leftTeam: [], rightTeam: [] };
            render();
            return;
        }
        session = result?.session || result?.data || result;
        settlementDone=Boolean(session?.rewardStatus==='claimed'||session?.settled);
        render();
        if (options.mode === 'arena') {
            session.status = session.status || 'ended';
            render();
        } else if(session?.status==='active')scheduleAuto();else void settleCurrent();
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
