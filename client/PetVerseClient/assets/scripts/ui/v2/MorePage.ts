import { Color, Node } from 'cc';
import { button, text } from '../cute/CuteUiKit';
import { MORE_ENTRIES, PageName } from './AppRoutes';
import { createNotificationDot, createPageTitleBoard, drawUiIcon, HandPaintedTheme } from './HandPaintedUi';

export type MorePageOptions = {
    onOpen: (page: PageName) => void;
    notificationCount?: (page: PageName) => number;
};

export function renderMorePage(parent: Node, options: MorePageOptions) {
    createPageTitleBoard(parent, '更多功能', '养成、社交与账户入口');
    text(parent, 'SectionTitle', '功能手账', -304, 394, 220, 34, 18, HandPaintedTheme.ink, 'left', true);

    MORE_ENTRIES.forEach((entry, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = -214 + col * 214;
        const y = 310 - row * 151;
        const card = button(parent, `More_${entry.icon}_${index}`, entry.title, x, y, 190, 126, () => options.onOpen(entry.page), {
            fill: row % 2 === 0 ? HandPaintedTheme.paper : new Color(250, 244, 224, 255),
            textColor: HandPaintedTheme.ink,
            fontSize: 16,
            radius: 20,
            subtitle: entry.subtitle,
            border: new Color(211, 181, 137, 255),
        });
        const face = card.getChildByName('Face');
        const title = face?.getChildByName('Title');
        const subtitle = face?.getChildByName('Subtitle');
        if (title) title.setPosition(0, -18, 0);
        if (subtitle) subtitle.setPosition(0, -43, 0);
        drawUiIcon(card, 'EntryIcon', entry.icon, 0, 29, 38, col === 0 ? HandPaintedTheme.leaf : col === 1 ? HandPaintedTheme.honey : HandPaintedTheme.peach);
        createNotificationDot(card, options.notificationCount?.(entry.page) || 0, 69, 43);
    });
}
