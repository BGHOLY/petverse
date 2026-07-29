export type BattleLogPresentation = {
    category: 'tactic' | 'formation' | 'reaction' | 'combat';
    title: string;
    description: string;
};

export function parseBattleLogEvent(event: any): BattleLogPresentation {
    const type = String(event?.type || '');
    if (type === 'tactic-trigger') {
        return {
            category: 'tactic',
            title: '战术触发',
            description: String(event?.reason || event?.text || ''),
        };
    }
    if (type === 'formation-passive' || type === 'formation-passive-trigger') {
        return {
            category: 'formation',
            title: String(event?.passiveRule?.name || '阵法被动'),
            description: String(event?.text || ''),
        };
    }
    if (type === 'ultimate') {
        return {
            category: 'formation',
            title: '阵法大招',
            description: String(event?.text || ''),
        };
    }
    if (type === 'combat-reaction') {
        return {
            category: 'reaction',
            title: String(event?.reactionCode || '技能连携'),
            description: String(event?.text || ''),
        };
    }
    return {
        category: 'combat',
        title: type || '战斗',
        description: String(event?.text || ''),
    };
}
