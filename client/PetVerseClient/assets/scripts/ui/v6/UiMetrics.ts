export const V6_CANVAS_WIDTH = 720;
export const V6_CANVAS_HEIGHT = 1280;

export const V6_TOP_BAR_HEIGHT = 112;
// The hand-painted navigation art is naturally tall. Keeping a 190px tray
// avoids vertically crushing the five illustrated tabs.
export const V6_BOTTOM_NAV_HEIGHT = 190;
export const V6_CONTENT_HEIGHT = V6_CANVAS_HEIGHT - V6_TOP_BAR_HEIGHT - V6_BOTTOM_NAV_HEIGHT;
export const V6_CONTENT_CENTER_Y = (V6_BOTTOM_NAV_HEIGHT - V6_TOP_BAR_HEIGHT) / 2;
export const V6_TOP_BAR_CENTER_Y = V6_CANVAS_HEIGHT / 2 - V6_TOP_BAR_HEIGHT / 2;
export const V6_BOTTOM_NAV_CENTER_Y = -V6_CANVAS_HEIGHT / 2 + V6_BOTTOM_NAV_HEIGHT / 2;

export const V6_SAFE_SIDE = 24;
export const V6_SAFE_VERTICAL = 16;
export const V6_PANEL_GAP = 16;
export const V6_SMALL_GAP = 8;
export const V6_PAGE_WIDTH = V6_CANVAS_WIDTH - V6_SAFE_SIDE * 2;
export const V6_SAFE_CONTENT_HEIGHT = V6_CONTENT_HEIGHT - V6_SAFE_VERTICAL * 2;

export const V6_LARGE_RADIUS = 24;
export const V6_SMALL_RADIUS = 16;
export const V6_PRIMARY_BUTTON_HEIGHT = 72;
export const V6_SECONDARY_BUTTON_HEIGHT = 56;
export const V6_LIST_ITEM_MIN_HEIGHT = 88;
export const V6_LIST_ITEM_MAX_HEIGHT = 104;

