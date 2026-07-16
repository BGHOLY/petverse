import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.resolve(scriptDirectory, '../client/PetVerseClient/build/web-mobile/assets/main/index.js');
const targetPath = path.resolve(process.argv[2] || defaultPath);
const marker = '/* petverse fixed-grid preview sync v5 */';
const flatMarker = '/* petverse flat-control preview sync v5.1 */';
let source = fs.readFileSync(targetPath, 'utf8');

function applyFlatControls() {
    const replaceRange = (start, end, replacement) => {
        const startIndex = source.indexOf(start);
        if (startIndex < 0) throw new Error(`Flat-control start was not found: ${start}`);
        const endIndex = source.indexOf(end, startIndex + start.length);
        if (endIndex < 0) throw new Error(`Flat-control end was not found: ${end}`);
        source = `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
    };

    replaceRange(
        "          var tabs = [['attributes', '属性'], ['skills', '技能'], ['aptitudes', '资质'], ['equipment', '装备']];",
        '          var detailView = this.petDetailTab',
        `          var tabs = [['attributes', '属性'], ['skills', '技能'], ['aptitudes', '资质'], ['equipment', '装备']];
          tabs.forEach(function (_ref, index) {
            var key = _ref[0], label = _ref[1];
            return _this6.flatArtControl(data, 'Tab_' + key, label, -120 + index * 80, 274, 74, 42, function () { _this6.petDetailTab = key; if (key === 'attributes') _this6.petAttributeView = 'overview'; _this6.renderCurrentPage(false); }, _this6.petDetailTab === key, 13);
          });
`,
    );
    replaceRange(
        '          var categories = [[\'all\', \'全部\'], [\'consumable\', \'道具\'], [\'material\', \'材料\'], [\'skill\', \'技能书\']];',
        "          var target = panel(bag, 'UseTarget'",
        `          var categories = [['all', '全部'], ['consumable', '道具'], ['material', '材料'], ['skill', '技能书']];
          categories.forEach(function (_ref4, index) {
            var key = _ref4[0], title = _ref4[1];
            return _this7.flatArtControl(tabs, 'InventoryCategory_' + key, title, -222 + index * 148, 0, 136, 52, function () { _this7.inventoryCategory = key; _this7.inventoryPageIndex = 0; _this7.renderCurrentPage(false); }, _this7.inventoryCategory === key, 14);
          });
`,
    );
    replaceRange(
        "          var categories = [['featured', '精选'], ['nurture', '养成'], ['skills', '技能书'], ['materials', '材料'], ['hatch', '孵化'], ['special', '特殊']];",
        '          var items = this.filteredShopItems();',
        `          var categories = [['featured', '精选'], ['nurture', '养成'], ['skills', '技能书'], ['materials', '材料'], ['hatch', '孵化'], ['special', '特殊']];
          var rail = panel(page, 'ShopCategoryRail', -263, -78, 112, 572, CuteTheme.transparent, 18, false, CuteTheme.transparent, 0);
          categories.forEach(function (_ref5, index) {
            var key = _ref5[0], title = _ref5[1];
            return _this8.flatArtControl(rail, 'ShopCategory_' + key, title, 0, 214 - index * 84, 96, 58, function () { _this8.shopCategory = key; _this8.shopPageIndex = 0; _this8.shopBuyCount = 1; _this8.ensureSelectedShopItem(); _this8.renderCurrentPage(false); }, _this8.shopCategory === key, 13);
          });
`,
    );
    replaceRange(
        "          [['all', '全部'], ['rare', '稀有'], ['mutant', '变异']].forEach(function (_ref9, index) {",
        '          var hatchPageSize = 6;',
        `          [['all', '全部'], ['rare', '稀有'], ['mutant', '变异']].forEach(function (_ref9, index) {
            var key = _ref9[0], title = _ref9[1];
            return _this15.flatArtControl(warehouse, 'EggFilter_' + key, title, -130 + index * 76, 120, 68, 32, function () { _this15.hatchEggFilter = key; _this15.hatchEggPageIndex = 0; _this15.renderCurrentPage(false); }, _this15.hatchEggFilter === key, 11);
          });
          this.flatArtControl(warehouse, 'EggSort', this.hatchEggSort === 'rarity' ? '稀有度' : '孵化时长', 208, 120, 106, 32, function () { _this15.hatchEggSort = _this15.hatchEggSort === 'rarity' ? 'time' : 'rarity'; _this15.hatchEggPageIndex = 0; _this15.renderCurrentPage(false); }, false, 10);
`,
    );
    source += `\n${flatMarker}\n`;
}

if (source.includes(marker)) {
    if (!source.includes(flatMarker)) {
        applyFlatControls();
        fs.writeFileSync(targetPath, source, 'utf8');
        console.log('Synchronized flat preview controls.');
    } else {
        console.log('Paged preview layout is already synchronized.');
    }
    process.exit(0);
}

const replaceRequired = (before, after) => {
    if (!source.includes(before)) throw new Error(`Preview fragment was not found: ${before.slice(0, 100)}`);
    source = source.replace(before, after);
};

const replaceBetween = (start, end, replacement) => {
    const startIndex = source.indexOf(start);
    if (startIndex < 0) throw new Error(`Preview block start was not found: ${start}`);
    const endIndex = source.indexOf(end, startIndex + start.length);
    if (endIndex < 0) throw new Error(`Preview block end was not found: ${end}`);
    source = `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
};

replaceRequired(
    "var PAGE_CONTAINERS = ['HomePage', 'PetPage', 'AdventurePage', 'ShopPage', 'MorePage', 'SecondaryPage'];",
    "var PAGE_CONTAINERS = ['HomePage', 'PetPage', 'InventoryPage', 'AdventurePage', 'ShopPage', 'HatcheryPage', 'MorePage', 'SecondaryPage'];",
);
replaceRequired(
    "if (page === 'pet') return 'PetPage';\n        if (page === 'adventure') return 'AdventurePage';",
    "if (page === 'pet') return 'PetPage';\n        if (page === 'inventory') return 'InventoryPage';\n        if (page === 'adventure') return 'AdventurePage';",
);
replaceRequired(
    "if (page === 'shop') return 'ShopPage';\n        if (page === 'more') return 'MorePage';",
    "if (page === 'shop') return 'ShopPage';\n        if (page === 'hatchery') return 'HatcheryPage';\n        if (page === 'more') return 'MorePage';",
);
replaceRequired(
    '          clearNode(this.pageRoot);\n          switch (this.currentPage) {',
    "          if (!['home', 'pet', 'inventory', 'shop', 'hatchery'].includes(this.currentPage)) clearNode(this.pageRoot);\n          switch (this.currentPage) {",
);
replaceRequired(
    '        _proto.createScrollArea = function createScrollArea(parent, name, x, y, width, height, contentWidth, contentHeight, direction) {\n          var view = new Node(name);',
    "        _proto.createScrollArea = function createScrollArea(parent, name, x, y, width, height, contentWidth, contentHeight, direction) {\n          var previous = parent.getChildByName(name);\n          if (previous) {\n            previous.removeFromParent();\n            previous.destroy();\n          }\n          var view = new Node(name);",
);
replaceRequired(
    '          var key = this.currentScrollScope() + "::" + name;',
    "          var key = name === 'PetSelectorScroll' ? 'pet-roster::PetSelectorScroll' : this.currentScrollScope() + \"::\" + name;",
);
replaceRequired("          if (saved && name !== 'PetSelectorScroll') {", '          if (saved) {');
replaceRequired("            if (!key || scroll.node.name === 'PetSelectorScroll' || !scroll.isValid", '            if (!key || !scroll.isValid');

const helperAnchor = '        _proto.capturePetSelectorOffset = function capturePetSelectorOffset(scroll) {';
const helperIndex = source.indexOf(helperAnchor);
if (helperIndex < 0) throw new Error('Preview helper insertion point was not found.');
const helpers = `        _proto.flatArtControl = function flatArtControl(parent, name, title, x, y, width, height, onClick, selected, fontSize) {
          if (selected === void 0) selected = false;
          if (fontSize === void 0) fontSize = 13;
          var fill = selected ? new Color(255, 207, 89, 92) : CuteTheme.transparent;
          var control = panel(parent, name, x, y, width, height, fill, 14, false, CuteTheme.transparent, 0);
          text(control, 'Title', title, 0, 0, width - 10, height - 6, fontSize, CuteTheme.caramel, 'center', true);
          hitArea(control, 'HitArea', 0, 0, width, height, onClick);
          return control;
        };
        _proto.renderFixedPager = function renderFixedPager(parent, name, pageIndex, pageCount, x, y, onChange) {
          var pager = panel(parent, name, x, y, 176, 42, CuteTheme.transparent, 14, false, CuteTheme.transparent, 0);
          button(pager, 'Previous', '‹', -66, 0, 38, 34, function () { return onChange(Math.max(0, pageIndex - 1)); }, { fill: CuteTheme.paperWarm, fontSize: 20, radius: 13, disabled: pageIndex <= 0 });
          text(pager, 'Page', pageIndex + 1 + ' / ' + pageCount, 0, 0, 78, 30, 12, CuteTheme.caramel, 'center', true);
          button(pager, 'Next', '›', 66, 0, 38, 34, function () { return onChange(Math.min(pageCount - 1, pageIndex + 1)); }, { fill: CuteTheme.honey, fontSize: 20, radius: 13, disabled: pageIndex >= pageCount - 1 });
          return pager;
        };
`;
source = `${source.slice(0, helperIndex)}${helpers}${source.slice(helperIndex)}`;

replaceRequired(
    "          headingTag(book, 'PetListTitle', \"\\u6211\\u7684\\u5BA0\\u7269 \" + pets.length + \"/\" + allPets.length, -287, 408, 124, CuteTheme.honey);\n          var selectorStep = 104;",
    "          var rosterSurface = panel(book, 'PetRosterSurface', -280, 18, 136, 790, new Color(255, 250, 232, 252), 18, false, CuteTheme.transparent, 0);\n          text(rosterSurface, 'Title', \"\\u6211\\u7684\\u5BA0\\u7269 \" + pets.length + \"/\" + allPets.length, 0, 372, 124, 32, 13, CuteTheme.caramel, 'center', true);\n          var selectorStep = 104;",
);
replaceRequired(
    "this.createScrollArea(book, 'PetSelectorScroll', -280, 24, 144, 714, 144, selectorHeight, 'vertical')",
    "this.createScrollArea(rosterSurface, 'PetSelectorScroll', 0, -18, 132, 710, 132, selectorHeight, 'vertical')",
);
replaceRequired("panel(book, 'Profile', -105, 42, 192, 720, new Color(255, 250, 229, 142), 22, false, new Color(209, 154, 94, 68), 1)", "panel(book, 'Profile', -105, 42, 192, 720, CuteTheme.transparent, 22, false, CuteTheme.transparent, 0)");
replaceRequired("panel(profile, 'Identity', 0, -150, 154, 112, new Color(248, 239, 211, 255), 18, false, CuteTheme.white, 1)", "panel(profile, 'Identity', 0, -150, 154, 112, new Color(255, 250, 232, 78), 18, false, CuteTheme.transparent, 0)");
replaceRequired("panel(book, 'ResearchData', 174, 42, 332, 720, new Color(249, 247, 227, 148), 22, false, new Color(192, 130, 67, 64), 1)", "panel(book, 'ResearchData', 174, 42, 332, 720, CuteTheme.transparent, 22, false, CuteTheme.transparent, 0)");
replaceRequired("panel(book, 'Toolbar', 0, -403, 660, 62, new Color(255, 248, 220, 205), 20, false, new Color(177, 112, 57, 96), 2)", "panel(book, 'Toolbar', 0, -403, 660, 62, CuteTheme.transparent, 20, false, CuteTheme.transparent, 0)");
source = source
    .replace("new Color(255, 250, 232, 228), 20, false, CuteTheme.white, 1", "new Color(255, 250, 232, 54), 20, false, CuteTheme.transparent, 0")
    .replace("new Color(255, 245, 238, 228), 20, false, CuteTheme.white, 1", "new Color(255, 245, 238, 54), 20, false, CuteTheme.transparent, 0")
    .replace("new Color(242, 249, 238, 228), 20, false, CuteTheme.white, 1", "new Color(242, 249, 238, 54), 20, false, CuteTheme.transparent, 0");

replaceRequired('              _this7.inventoryCategory = key;\n              _this7.renderCurrentPage(false);', '              _this7.inventoryCategory = key;\n              _this7.inventoryPageIndex = 0;\n              _this7.renderCurrentPage(false);');
replaceBetween(
    '          var rows = Math.ceil(items.length / 4);',
    '          var footer = panel(bag, \'BagFooter\'',
    `          var inventoryPageSize = 16;
          var inventoryPageCount = Math.max(1, Math.ceil(items.length / inventoryPageSize));
          this.inventoryPageIndex = Math.max(0, Math.min(inventoryPageCount - 1, Number(this.inventoryPageIndex || 0)));
          var visibleItems = items.slice(this.inventoryPageIndex * inventoryPageSize, (this.inventoryPageIndex + 1) * inventoryPageSize);
          visibleItems.forEach(function (item, index) {
            var col = index % 4;
            var rowIndex = Math.floor(index / 4);
            var type = categoryOf(item);
            var slot = panel(gridPaper, "Item_" + ((item == null ? void 0 : item.id) || index), -219 + col * 146, 174 - rowIndex * 116, 128, 106, CuteTheme.transparent, 12, false, CuteTheme.transparent, 0);
            if (type === 'skill') artImage(slot, 'ItemArt', _this7.skillBookIconPath(item), 0, 20, 46, 46); else drawUiIcon(slot, 'ItemIcon', type === 'consumable' ? 'inventory' : 'collection', 0, 20, 38, type === 'consumable' ? CuteTheme.mintDark : CuteTheme.honeyDark);
            text(slot, 'Name', safeName((item == null ? void 0 : item.name) || (item == null ? void 0 : item.itemCode), '道具'), 0, -22, 112, 28, 11, CuteTheme.caramel, 'center', true);
            text(slot, 'Quantity', '×' + Number((item == null ? void 0 : item.quantity) || 0), 38, -40, 48, 22, 11, CuteTheme.muted, 'center', true);
            hitArea(slot, 'HitArea', 0, 0, 128, 106, function () { _this7.inventoryDetailItem = item; _this7.renderUtilityModal(); });
          });
          if (!items.length) text(gridPaper, 'Empty', '当前分类暂无物品', 0, 0, 420, 100, 22, CuteTheme.muted, 'center', true);
`,
);
replaceRequired("          text(footer, 'Count', \"\\u5F53\\u524D\\u663E\\u793A \" + items.length + \" \\u79CD\", 6, 0, 160, 26, 12, CuteTheme.muted, 'center');", "          this.renderFixedPager(footer, 'InventoryPager', this.inventoryPageIndex, inventoryPageCount, 8, 0, function (pageIndex) { _this7.inventoryPageIndex = pageIndex; _this7.renderCurrentPage(false); });");
replaceRequired('            _this7.inventorySort = _this7.inventorySort === \'category\' ? \'quantity\' : \'category\';\n            _this7.renderCurrentPage(false);', '            _this7.inventorySort = _this7.inventorySort === \'category\' ? \'quantity\' : \'category\';\n            _this7.inventoryPageIndex = 0;\n            _this7.renderCurrentPage(false);');

replaceRequired('              _this8.shopCategory = key;\n              _this8.shopBuyCount = 1;', '              _this8.shopCategory = key;\n              _this8.shopPageIndex = 0;\n              _this8.shopBuyCount = 1;');
replaceBetween(
    '          var rows = Math.ceil(items.length / 3);',
    '          var selected = this.selectedShopItem();',
    `          var shopPageSize = 9;
          var shopPageCount = Math.max(1, Math.ceil(items.length / shopPageSize));
          this.shopPageIndex = Math.max(0, Math.min(shopPageCount - 1, Number(this.shopPageIndex || 0)));
          var visibleItems = items.slice(this.shopPageIndex * shopPageSize, (this.shopPageIndex + 1) * shopPageSize);
          if (!visibleItems.some(function (item) { return Number((item == null ? void 0 : item.id) || 0) === _this8.selectedShopItemId; })) _this8.selectedShopItemId = Number((visibleItems[0] == null ? void 0 : visibleItems[0].id) || 0);
          var ledger = panel(page, 'ProductLedger', 69, 38, 492, 350, CuteTheme.transparent, 16, false, CuteTheme.transparent, 0);
          visibleItems.forEach(function (item, index) {
            var col = index % 3;
            var rowIndex = Math.floor(index / 3);
            var selectedCard = Number((item == null ? void 0 : item.id) || 0) === _this8.selectedShopItemId;
            var ownedItem = GameStore.inventory.find(function (entry) { return String((entry == null ? void 0 : entry.itemCode) || '') === String((item == null ? void 0 : item.itemCode) || ''); });
            var card = panel(ledger, 'ShopItem_' + ((item == null ? void 0 : item.id) || index), -156 + col * 156, 120 - rowIndex * 108, 138, 96, selectedCard ? new Color(255, 207, 89, 44) : CuteTheme.transparent, 12, false, CuteTheme.transparent, 0);
            drawUiIcon(card, 'ProductIcon', _this8.isSkillBook(item) ? 'skills' : String((item == null ? void 0 : item.type) || '').toLowerCase() === 'egg' ? 'hatchery' : 'shop', 0, 19, 32, selectedCard ? CuteTheme.honeyDark : CuteTheme.caramel);
            text(card, 'Name', safeName(item == null ? void 0 : item.name, (item == null ? void 0 : item.itemCode) || '商品'), 0, -14, 122, 24, 10, CuteTheme.caramel, 'center', true);
            text(card, 'Price', ((item == null ? void 0 : item.currencyType) === 'diamond' ? '钻石 ' : '金币 ') + formatNumber((item == null ? void 0 : item.price) || 0), 0, -36, 116, 22, 10, CuteTheme.caramel, 'center', true);
            text(card, 'Owned', '有 ' + Number((ownedItem == null ? void 0 : ownedItem.quantity) || 0), -41, 34, 52, 20, 10, CuteTheme.mintDark, 'center', true);
            hitArea(card, 'HitArea', 0, 0, 138, 96, function () { _this8.selectedShopItemId = Number((item == null ? void 0 : item.id) || 0); _this8.shopBuyCount = 1; _this8.renderCurrentPage(false); });
          });
          this.renderFixedPager(page, 'ShopPager', this.shopPageIndex, shopPageCount, 69, -164, function (pageIndex) { _this8.shopPageIndex = pageIndex; _this8.selectedShopItemId = Number((items[pageIndex * shopPageSize] == null ? void 0 : items[pageIndex * shopPageSize].id) || 0); _this8.shopBuyCount = 1; _this8.renderCurrentPage(false); });
`,
);

replaceRequired('              _this15.hatchEggFilter = key;\n              _this15.renderCurrentPage(false);', '              _this15.hatchEggFilter = key;\n              _this15.hatchEggPageIndex = 0;\n              _this15.renderCurrentPage(false);');
replaceRequired("            _this15.hatchEggSort = _this15.hatchEggSort === 'rarity' ? 'time' : 'rarity';\n            _this15.renderCurrentPage(false);", "            _this15.hatchEggSort = _this15.hatchEggSort === 'rarity' ? 'time' : 'rarity';\n            _this15.hatchEggPageIndex = 0;\n            _this15.renderCurrentPage(false);");
replaceBetween(
    '          var rows = Math.max(1, Math.ceil(storedEggs.length / 3));',
    '        };\n        _proto.renderSkillLearning',
    `          var hatchPageSize = 6;
          var hatchPageCount = Math.max(1, Math.ceil(storedEggs.length / hatchPageSize));
          this.hatchEggPageIndex = Math.max(0, Math.min(hatchPageCount - 1, Number(this.hatchEggPageIndex || 0)));
          var visibleEggs = storedEggs.slice(this.hatchEggPageIndex * hatchPageSize, (this.hatchEggPageIndex + 1) * hatchPageSize);
          visibleEggs.forEach(function (egg, index) {
            var rarity = Math.max(1, Math.min(6, Number((egg == null ? void 0 : egg.rarityPotential) || 1)));
            var col = index % 3;
            var row = Math.floor(index / 3);
            var card = panel(warehouse, 'Egg_' + ((egg == null ? void 0 : egg.id) || index), -198 + col * 198, 69 - row * 108, 184, 96, CuteTheme.transparent, 12, false, CuteTheme.transparent, 0);
            artImage(card, 'Icon', getEggArtPath(egg), -55, 8, 58, 72);
            text(card, 'Name', getEggDisplayName(egg), 34, 25, 102, 30, 11, CuteTheme.caramel, 'center', false);
            text(card, 'Time', rarity + '★ · ' + _this15.formatEggDuration(egg), 34, 2, 100, 22, 10, egg != null && egg.isMutant ? CuteTheme.peachDark : CuteTheme.muted, 'center', true);
            _this15.flatArtControl(card, 'Put', activeEggs.length >= 3 ? '装置已满' : '放入装置', 34, -25, 100, 28, function () { if (activeEggs.length < 3) _this15.requestIncubation(egg, 0); }, false, 10);
          });
          if (!storedEggs.length) text(warehouse, 'Empty', allStoredEggs.length ? '当前筛选没有宠物蛋' : '暂无宠物蛋\\n可通过区域巢穴、繁育与活动获得', 0, -28, 500, 90, 18, CuteTheme.muted, 'center', false);
          this.renderFixedPager(room, 'EggPager', this.hatchEggPageIndex, hatchPageCount, 0, -420, function (pageIndex) { _this15.hatchEggPageIndex = pageIndex; _this15.renderCurrentPage(false); });
`,
);

source += `\n${marker}\n`;
applyFlatControls();
fs.writeFileSync(targetPath, source, 'utf8');
console.log('Synchronized fixed-grid preview layout.');
