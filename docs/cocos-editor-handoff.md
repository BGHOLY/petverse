# Cocos Creator 编辑器交接说明

适用版本：Cocos Creator 3.8.8，设计分辨率 `720 × 1280`。

## 协作方式

### 用户负责

- 固定 UI 的位置、尺寸、锚点、缩放和层级。
- 图片、字体、字号、颜色、边距和页面排版。
- 页面视觉动画与最终美术验收。

### WORK 负责

- 创建功能节点、脚本和 Inspector 字段。
- 接口、数据展示、按钮事件和页面切换。
- 动态列表 Prefab 的实例化、填充和刷新。
- Loading、Toast、错误处理与自动测试。

## 可以自由调整的节点

在不改名、不删除绑定组件的前提下，可调整：

- `HomePage` 内全部固定视觉节点。
- 顶部昵称、等级、金币、钻石等显示节点。
- `BottomNavigation` 内按钮与选中状态节点。
- 页面背景、标题、返回按钮和固定功能按钮。
- 动态列表的 Item Prefab 内部视觉节点。

修改后保存 Scene/Prefab，再运行预览。脚本不得恢复其 Transform。

## 暂时不要重命名或删除

- `HomePage`
- `PetPage`
- `InventoryPage`
- `AdventurePage`
- `ShopPage`
- `HatcheryPage`
- `MorePage`
- `SecondaryPage`
- `BottomNavigation`
- `RuntimeContent`
- `ModalLayer`
- `ToastLayer`
- `LoadingLayer`
- `Reconnect`
- `V10AudioDirector`

也不要删除这些节点上的 `MainUI`、`PanelManager`、页面 Panel、`Button`、`Label`、`Sprite` 等有效组件。

## Inspector 绑定原则

1. 把脚本挂在所属页面或 Prefab 根节点。
2. 在属性检查器中把对应 Node、Label、Button、Sprite 拖入字段。
3. 保存 Scene/Prefab。
4. 调整视觉节点时不需要修改脚本。
5. 未绑定的可选字段只会输出明确警告，不能令首页崩溃。

新增远征页面可绑定：

- `mapContainer`
- `durationContainer`
- `petSelectionContainer`
- `startButton`
- `activeExpeditionContainer`
- `remainingTimeLabel`
- `claimButton`
- `rewardContainer`
- `historyContainer`
- `loadingNode`
- `emptyNode`

新增战术页面可绑定：

- `targetStrategyContainer`
- `skillStrategyContainer`
- `survivalStrategyContainer`
- `saveButton`
- `resetButton`
- `descriptionLabel`
- `loadingNode`

## 动态列表 Prefab

目录：`assets/prefab/list-items`

- `PetListItem`
- `InventoryItem`
- `ShopItem`
- `HatcheryEggItem`
- `SkillSlotItem`
- `FriendListItem`
- `RankingListItem`

用户可以修改 Prefab 内部的视觉布局。不要改字段节点名称，除非同时更新绑定组件。运行时只实例化并填充数据，不应改 Prefab 内部的视觉位置。

## Widget、Layout 与自由摆放

- 需要自由拖动的区域不要挂会重排子节点的 `Layout`。
- 背包、商店、宠物列表等自动排列区域可以保留 `Layout`。
- `Widget` 只用于安全区或必要贴边，不要同时用代码和 Widget 控制同一位置。
- 发现节点保存后自动移动时，先检查父节点 `Layout`、自身 `Widget` 和 `ContentSizeFitter`。

## 新页面制作步骤

1. 在 `PageRoot` 下创建页面根节点。
2. 用户完成固定背景、标题、返回按钮、容器和视觉布局。
3. WORK创建页面 Panel 脚本并公开 Inspector 字段。
4. 在编辑器绑定字段和按钮。
5. 动态内容使用 Prefab，不在脚本内创建固定页面外壳。
6. 页面切换只控制 `active` 或播放过渡动画。
7. 验证接口刷新、购买、使用道具后仍停留当前页面。
8. 编辑器截图与浏览器预览一致后，才解除该页旧 `RuntimeContent` 依赖。

## 当前 RuntimeContent 状态

`PetPage`、`InventoryPage`、`AdventurePage`、`ShopPage`、`HatcheryPage`、`MorePage`、`SecondaryPage` 目前只有编辑器根节点，没有可供绑定的静态子结构。旧功能仍在各页的 `RuntimeContent` 内动态生成。

因此本轮没有自动删除或替换它们。正确迁移方式是：

1. 用户先搭建一页固定静态结构。
2. WORK接入该页 Inspector 字段和动态 Prefab。
3. 新旧结构并行验证。
4. 验证通过后，只删除该页对应的旧运行时生成逻辑。
5. 每页单独提交，避免影响其他功能。

推荐顺序：背包 → 商店 → 宠物 → 孵化 → 技能/炼妖 → 好友 → 冒险 → 排行。

## 预览验收

- Cocos 控制台 0 Error。
- 无 Missing Script。
- 无 `editor asset was not found`。
- 移动金币、钻石、昵称后，刷新数据位置不变。
- 移动底部按钮后，切页和返回功能正常。
- 商店购买后留在商店页。
- 背包使用道具后留在背包页。
- 页面刷新不重建 `MainScene`。

