import { Color, Node } from 'cc';
import { button, panel, text } from '../cute/CuteUiKit';
import { MORE_ENTRIES, MoreEntryDefinition, PageName } from './AppRoutes';
import { createNotificationDot, drawUiIcon, HandPaintedTheme } from './HandPaintedUi';
import { createV6PageShell } from '../v6/AppShell';
import { V6_PAGE_WIDTH } from '../v6/UiMetrics';

export type MorePageOptions = {
    onOpen: (page: PageName) => void;
    notificationCount?: (page: PageName) => number;
};

type MoreGroup = {
    key: string;
    title: string;
    subtitle: string;
    pages: PageName[];
    columns: number;
};

const GROUPS: MoreGroup[] = [
    {
        key: 'nurture',
        title: '宝宝培养',
        subtitle: '常用养成与阵容功能',
        pages: ['inventory', 'hatchery', 'skills', 'fusion', 'collection', 'formation'],
        columns: 3,
    },
    {
        key: 'social',
        title: '社交互动',
        subtitle: '好友、姻缘与共同成长',
        pages: ['friends', 'marriage', 'guild', 'trade'],
        columns: 2,
    },
    {
        key: 'reward',
        title: '奖励竞争',
        subtitle: '奖励、消息与排行榜',
        pages: ['benefits', 'mail', 'ranking'],
        columns: 3,
    },
    {
        key: 'personal',
        title: '个人设置',
        subtitle: '资料与游戏偏好',
        pages: ['profile', 'settings'],
        columns: 2,
    },
];

function groupEntries(group: MoreGroup) {
    return group.pages
        .map((page) => MORE_ENTRIES.find((entry) => entry.page === page))
        .filter((entry): entry is MoreEntryDefinition => Boolean(entry));
}

function renderGroup(parent: Node, group: MoreGroup, centerY: number, height: number, options: MorePageOptions) {
    const card = panel(
        parent,
        `MoreGroup_${group.key}`,
        0,
        centerY,
        V6_PAGE_WIDTH,
        height,
        new Color(255, 249, 230, 250),
        24,
        true,
        new Color(211, 181, 137, 230),
        2,
    );
    text(card, 'GroupTitle', group.title, -292, height / 2 - 27, 180, 28, 18, HandPaintedTheme.ink, 'left', true);
    text(card, 'GroupSubtitle', group.subtitle, 76, height / 2 - 27, 250, 24, 12, HandPaintedTheme.mutedInk, 'right');

    const entries = groupEntries(group);
    const horizontalGap = 10;
    const cardWidth = Math.floor((608 - horizontalGap * (group.columns - 1)) / group.columns);
    const cardHeight = 76;
    const rowGap = 10;
    const rows = Math.max(1, Math.ceil(entries.length / group.columns));
    const gridHeight = rows * cardHeight + (rows - 1) * rowGap;
    const gridTop = height / 2 - 52;
    entries.forEach((entry, index) => {
        const row = Math.floor(index / group.columns);
        const col = index % group.columns;
        const rowCount = Math.min(group.columns, entries.length - row * group.columns);
        const rowWidth = rowCount * cardWidth + Math.max(0, rowCount - 1) * horizontalGap;
        const x = -rowWidth / 2 + cardWidth / 2 + col * (cardWidth + horizontalGap);
        const y = gridTop - cardHeight / 2 - row * (cardHeight + rowGap);
        const entryCard = button(card, `More_${entry.icon}_${index}`, entry.title, x, y, cardWidth, cardHeight, () => options.onOpen(entry.page), {
            fill: new Color(255, 253, 242, 255),
            textColor: HandPaintedTheme.ink,
            fontSize: 14,
            radius: 16,
            border: new Color(218, 190, 150, 235),
        });
        const face = entryCard.getChildByName('Face');
        const title = face?.getChildByName('Title');
        if (title) title.setPosition(16, -18, 0);
        drawUiIcon(entryCard, 'EntryIcon', entry.icon, -cardWidth / 2 + 30, 11, 30, HandPaintedTheme.honey);
        createNotificationDot(entryCard, options.notificationCount?.(entry.page) || 0, cardWidth / 2 - 15, cardHeight / 2 - 14);
    });
    return gridHeight;
}

export function renderMorePage(parent: Node, options: MorePageOptions) {
    const shell = createV6PageShell(parent, 'MoreLayoutV6');
    const page = shell.content;
    text(page, 'SectionTitle', '按目标选择功能', -304, 440, 220, 34, 18, HandPaintedTheme.ink, 'left', true);
    text(page, 'SectionHint', '常用养成优先，低频设置收在底部', 304, 440, 300, 28, 13, HandPaintedTheme.mutedInk, 'right');

    renderGroup(page, GROUPS[0], 288, 228, options);
    renderGroup(page, GROUPS[1], 44, 228, options);
    renderGroup(page, GROUPS[2], -158, 144, options);
    renderGroup(page, GROUPS[3], -318, 144, options);
}
