type BattleUnitSnapshot = {
  id?: string;
  name?: string;
  side?: string;
  role?: string;
  alive?: boolean;
  hp?: number;
  maxHp?: number;
  healingDone?: number;
};

type BattleDebriefSession = {
  battleLog?: any[];
  leftTeam?: BattleUnitSnapshot[];
  rightTeam?: BattleUnitSnapshot[];
  cooldowns?: Record<string, any>;
  bossBattle?: boolean;
};

export type BattleDebrief = {
  firstFallen: null | {
    id: string;
    name: string;
    round: number;
  };
  criticalEvents: string[];
  recommendations: string[];
};

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

export function buildBattleDebrief(
  session: BattleDebriefSession,
  won: boolean,
  failureReason = '',
): BattleDebrief {
  const logs = Array.isArray(session?.battleLog) ? session.battleLog : [];
  const allies = Array.isArray(session?.leftTeam) ? session.leftTeam : [];
  const enemies = Array.isArray(session?.rightTeam) ? session.rightTeam : [];
  const allyIds = new Set(allies.map((unit) => String(unit?.id || '')));
  const firstDefeat = logs.find(
    (event) =>
      event?.type === 'defeat' &&
      allyIds.has(String(event?.targetId || '')),
  );
  const firstFallenUnit = firstDefeat
    ? allies.find(
        (unit) => String(unit?.id || '') === String(firstDefeat?.targetId || ''),
      )
    : undefined;

  const bossTelegraphs = logs.filter(
    (event) => event?.type === 'boss-telegraph',
  ).length;
  const bossSkills = logs.filter((event) => event?.type === 'boss-skill').length;
  const enemyHealing = enemies.reduce(
    (sum, unit) => sum + Math.max(0, Number(unit?.healingDone || 0)),
    0,
  );
  const playerUltimates = logs.filter(
    (event) => event?.type === 'ultimate' && event?.side === 'left',
  ).length;
  const focusCommands = logs.filter(
    (event) =>
      (event?.type === 'command' || event?.type === 'focus-retarget') &&
      (!event?.side || event?.side === 'left'),
  ).length;

  const criticalEvents: string[] = [];
  if (bossTelegraphs > 0) {
    criticalEvents.push(
      bossSkills > 0
        ? `首领预警 ${bossTelegraphs} 次，其中 ${bossSkills} 次根震完成释放`
        : `首领预警 ${bossTelegraphs} 次，均在释放前结束战斗`,
    );
  }
  if (enemyHealing > 0) {
    criticalEvents.push(`敌方治疗累计恢复 ${Math.round(enemyHealing)} 生命`);
  }
  if (playerUltimates === 0) {
    criticalEvents.push('本场没有释放我方阵法大招');
  }
  if (focusCommands === 0) {
    criticalEvents.push('本场没有主动设置集火目标');
  }
  if (!criticalEvents.length) {
    criticalEvents.push(won ? '关键战术均已正常执行' : '未发现单一机制失误');
  }

  const recommendations: string[] = [];
  if (!won) {
    if (/战力/.test(failureReason)) {
      recommendations.push('先培养出战五宠，再挑战当前关卡');
    }
    if (/输出/.test(failureReason) || enemyHealing > 0) {
      recommendations.push('优先集火治疗单位，减少敌方恢复');
    }
    if (/生存/.test(failureReason) || firstFallenUnit) {
      recommendations.push('把最先倒下的宠物移到后排或改用龟阵');
    }
    if (bossSkills > 0) {
      recommendations.push('首领预警后保留阵法大招，争取击倒或撑过根震');
    }
    if (playerUltimates === 0) {
      recommendations.push('阵法能量满后及时释放大招');
    }
    if (focusCommands === 0) {
      recommendations.push('点击敌方头像设置集火目标');
    }
  } else {
    recommendations.push('保持当前阵容，继续挑战下一关');
  }

  return {
    firstFallen: firstDefeat
      ? {
          id: String(firstDefeat?.targetId || ''),
          name: String(firstFallenUnit?.name || '未知宠物'),
          round: Math.max(1, Number(firstDefeat?.round || 1)),
        }
      : null,
    criticalEvents: unique(criticalEvents).slice(0, 3),
    recommendations: unique(recommendations).slice(0, 3),
  };
}
