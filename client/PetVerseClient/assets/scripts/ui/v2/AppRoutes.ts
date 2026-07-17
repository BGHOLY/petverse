export type PageName =
    | 'home'
    | 'pet'
    | 'inventory'
    | 'adventure'
    | 'more'
    | 'shop'
    | 'hatchery'
    | 'skills'
    | 'fusion'
    | 'friends'
    | 'ranking'
    | 'marriage'
    | 'mail'
    | 'trade'
    | 'collection'
    | 'profile'
    | 'settings'
    | 'benefits'
    | 'formation'
    | 'guild'
    | 'gold'
    | 'diamond'
    | 'potion'
    | 'hourglass'
    | 'breed-token'
    | 'core'
    | 'food'
    | 'material';

export type MainTab = 'home' | 'pet' | 'adventure' | 'shop' | 'more';

export type UiIconName =
    | 'home'
    | 'pet'
    | 'adventure'
    | 'shop'
    | 'more'
    | 'inventory'
    | 'hatchery'
    | 'skills'
    | 'fusion'
    | 'friends'
    | 'marriage'
    | 'ranking'
    | 'mail'
    | 'trade'
    | 'collection'
    | 'benefits'
    | 'settings'
    | 'profile'
    | 'formation'
    | 'guild';

export type MainTabDefinition = {
    key: MainTab;
    title: string;
    icon: UiIconName;
};

export type MoreEntryDefinition = {
    page: PageName;
    title: string;
    subtitle: string;
    icon: UiIconName;
};

export const MAIN_TABS: MainTabDefinition[] = [
    { key: 'home', title: '家园', icon: 'home' },
    { key: 'pet', title: '宠物', icon: 'pet' },
    { key: 'adventure', title: '冒险', icon: 'adventure' },
    { key: 'shop', title: '商店', icon: 'shop' },
    { key: 'more', title: '更多', icon: 'more' },
];

export const MORE_ENTRIES: MoreEntryDefinition[] = [
    { page: 'inventory', title: '背包', subtitle: '道具与材料', icon: 'inventory' },
    { page: 'hatchery', title: '孵化室', subtitle: '三槽独立孵化', icon: 'hatchery' },
    { page: 'skills', title: '技能', subtitle: '学习与保护', icon: 'skills' },
    { page: 'fusion', title: '炼妖', subtitle: '宠物融合', icon: 'fusion' },
    { page: 'friends', title: '好友', subtitle: '互动与切磋', icon: 'friends' },
    { page: 'marriage', title: '结婚', subtitle: '姻缘与产蛋', icon: 'marriage' },
    { page: 'ranking', title: '排行榜', subtitle: '等级与战力', icon: 'ranking' },
    { page: 'mail', title: '邮件', subtitle: '消息与附件', icon: 'mail' },
    { page: 'trade', title: '交易行', subtitle: '寄售与购买', icon: 'trade' },
    { page: 'collection', title: '图鉴', subtitle: '宠物收藏', icon: 'collection' },
    { page: 'benefits', title: '福利', subtitle: '签到与成长', icon: 'benefits' },
    { page: 'settings', title: '设置', subtitle: '声音与画质', icon: 'settings' },
    { page: 'profile', title: '玩家资料', subtitle: '成就与赛季', icon: 'profile' },
    { page: 'formation', title: '五宠阵法', subtitle: '站位与战术', icon: 'formation' },
    { page: 'guild', title: '萌宠公会', subtitle: '任务与远征', icon: 'guild' },
];

export function isMainPage(page: PageName): page is MainTab {
    return page === 'home' || page === 'pet' || page === 'adventure' || page === 'shop' || page === 'more';
}

export function mainTabForPage(page: PageName): MainTab {
    if (isMainPage(page)) return page;
    if (page === 'formation' || page === 'guild') return 'adventure';
    return 'more';
}
